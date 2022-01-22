import decimal
from typing import Tuple


import pandas as pd
from django.db import transaction
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from collections import defaultdict

from finance import accounts, models
from finance.gains import SoldBeforeBought
from finance.integrations.degiro_parser import CurrencyMismatch
from finance import prices


BINANCE_SUPPORTED_OPERATIONS = [
    "POS savings interest",
    "Savings Interest",
    "ETH 2.0 Staking Rewards",
    "POS savings redemption",
    "POS savings purchase",
    "Savings Principal redemption",
    "Savings purchase",
    "Deposit",
    "Transaction Related",
    "ETH 2.0 Staking",
    # Here are the ones I haven't actually seen, so naming assumed.
    "Withdrawal",
]


class InvalidFormat(ValueError):
    pass


REQUIRED_TRANSACTION_COLUMNS = (
    "User_ID",
    "UTC_Time",
    "Account",
    "Operation",
    "Coin",
    "Change",
    "Remark",
)


SUPPORTED_FIAT = (
    "EUR",
    "USD",
    "GBP",
)


def import_transactions_from_file(account, filename_or_file, import_all_assets):
    try:
        return _import_transactions_from_file(account, filename_or_file)
    except Exception as e:
        models.TransactionImport.objects.create(
            integration=models.IntegrationType.BINANCE_CSV,
            status=models.ImportStatus.FAILURE,
            account=account,
        )
        raise e


def _to_raw_record(half_records):
    output = ""
    for half_record in half_records:
        output += half_record.to_csv()
    return output


@transaction.atomic()
def _import_transactions_from_file(account, filename_or_file):
    failed_records = []
    successful_records = []

    try:
        transactions_data = pd.read_csv(filename_or_file)
        for column in REQUIRED_TRANSACTION_COLUMNS:
            if column not in transactions_data.columns:
                raise InvalidFormat(f"Column: '{column}' missing in the csv file")
        transactions_data_clean = transactions_data.sort_values(by="UTC_Time")

        transaction_half_records = transactions_data_clean[
            transactions_data_clean["Operation"] == "Transaction Related"
        ]

        transaction_half_record_pairs = defaultdict(list)
        for half_record in transaction_half_records.iloc:
            transaction_half_record_pairs[half_record["UTC_Time"]].append(half_record)

        for half_records in transaction_half_record_pairs.values():

            try:
                fiat_record, token_record = pairs_to_fiat_and_token(half_records)
                transaction, created, raw_record = import_transaction(
                    account, fiat_record, token_record
                )
                successful_records.append(
                    {
                        "record": raw_record,
                        "transaction": transaction,
                        "created": created,
                    }
                )
            except SoldBeforeBought as e:
                failed_records.append(
                    {
                        "record": _to_raw_record(half_records),
                        "issue": str(e),
                        "issue_type": models.ImportIssueType.SOLD_BEFORE_BOUGHT,
                    }
                )
            except Exception as e:
                print(e)
                failed_records.append(
                    {
                        "record": _to_raw_record(half_records),
                        "issue": str(e),
                        "issue_type": models.ImportIssueType.UNKNOWN_FAILURE,
                    }
                )
        transfer_records = transactions_data_clean[
            (transactions_data_clean["Operation"] == "Deposit") |
            (transactions_data_clean["Operation"] == "Withdrawal")
        ]
        import_fiat_transfers(account, transfer_records)

    except pd.errors.ParserError as e:
        raise InvalidFormat("Failed to parse csv", e)

    status = models.ImportStatus.SUCCESS
    if failed_records:
        if successful_records:
            status = models.ImportStatus.PARTIAL_SUCCESS
        else:
            status = models.ImportStatus.FAILURE

    transaction_import = models.TransactionImport.objects.create(
        integration=models.IntegrationType.BINANCE_CSV,
        status=status,
        account=account,
    )
    for entry in failed_records:
        models.TransactionImportRecord.objects.create(
            transaction_import=transaction_import,
            raw_record=entry["record"],
            successful=False,
            issue_type=entry["issue_type"],
            raw_issue=entry["issue"],
        )

    for entry in successful_records:
        models.TransactionImportRecord.objects.create(
            transaction_import=transaction_import,
            raw_record=entry["record"],
            successful=True,
            transaction=entry["transaction"],
            created_new=entry["created"],
        )
    return transaction_import


def to_decimal(pd_f, precision=10) -> decimal.Decimal:
    with decimal.localcontext() as c:
        c.prec = precision
        return decimal.Decimal(pd_f.astype(str)) + 0


def _parse_utc_datetime(datetime_raw):
    parsed = parse_datetime(datetime_raw)
    parsed = parsed.astimezone(timezone.utc)
    return parsed


def import_fiat_transfers(account, records):
    account_repository = accounts.AccountRepository()
    for record in records.iloc:
        event_type = models.EventType.DEPOSIT
        if record["Operation"] == "Withdrawal":
            event_type = models.EventType.WITHDRAWAL
        executed_at = _parse_utc_datetime(record["UTC_Time"])

        fiat_currency = record["Coin"]
        fiat_value = to_decimal(record["Change"])

        if fiat_currency != models.Currency(account.currency).label:
            from_currency = models.currency_enum_from_string(fiat_currency)
            to_currency = account.currency
            exchange_rate = prices.get_closest_exchange_rate(
                executed_at.date(), from_currency, to_currency
            )
            if exchange_rate is None:
                raise CurrencyMismatch(
                    "Couldn't convert the fiat to account currency, missing exchange rate"
                )
            else:
                fiat_value *= exchange_rate.value

        account_repository.add_event(account,
                                     amount=fiat_value, executed_at=executed_at,
                                     event_type=event_type,
                                     )

def import_transaction(
    account: models.Account,
    fiat_record: pd.Series,
    token_record: pd.Series,
) -> Tuple[models.Transaction, bool]:

    raw_record = _to_raw_record((fiat_record, token_record))

    executed_at = _parse_utc_datetime(fiat_record["UTC_Time"])
    symbol = token_record["Coin"]
    fiat_currency = fiat_record["Coin"]
    fiat_value = to_decimal(fiat_record["Change"])

    if fiat_currency != models.Currency(account.currency).label:
        from_currency = models.currency_enum_from_string(fiat_currency)
        to_currency = account.currency
        exchange_rate = prices.get_closest_exchange_rate(
            executed_at.date(), from_currency, to_currency
        )
        if exchange_rate is None:
            raise CurrencyMismatch(
                "Couldn't convert the fiat to account currency, missing exchange rate"
            )
        else:
            fiat_value *= exchange_rate.value
            raw_record += f" exchange rate: {exchange_rate.value}"

    quantity = to_decimal(token_record["Change"])
    with decimal.localcontext() as c:
        c.prec = 10
        price = decimal.Decimal(-fiat_value / quantity) + 0


    return *accounts.AccountRepository().add_transaction_crypto_asset(
        account,
        symbol,
        executed_at,
        quantity,
        price,
        fiat_value,
        fiat_value,
        fiat_value,
    ), raw_record


def pairs_to_fiat_and_token(half_records):
    if len(half_records) != 2:
        raise ValueError(
            f"Expected 2 assets to change in result of transaction, got: {len(half_records)}"
        )
    fiat_record = None
    token_record = None
    if half_records[0]["Coin"] in SUPPORTED_FIAT:
        fiat_record = half_records[0]
        token_record = half_records[1]
    elif half_records[1]["Coin"] in SUPPORTED_FIAT:
        fiat_record = half_records[1]
        token_record = half_records[0]
    else:
        raise ValueError(
            f"Only transactions from or too fiat currency are supported for now"
        )
    return fiat_record, token_record
