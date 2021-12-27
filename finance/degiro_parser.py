import datetime
import decimal
from typing import Tuple

import pandas as pd
from django.conf import settings
from django.db import transaction

from finance import accounts, exchanges, models
from finance.gains import SoldBeforeBought


class CurrencyMismatch(ValueError):
    pass


class InvalidFormat(ValueError):
    pass


REQUIRED_TRANSACTION_COLUMNS = (
    "Date",
    "Time",
    "ISIN",
    "Local value",
    "Total",
    "Value",
    "Transaction costs",
    "Order ID",
    "Quantity",
    "Price",
    "Value currency",
    "Venue",
    "Reference",
)


_DATE_FORMAT = "%Y-%m-%d %H:%M%z"


def import_transaction(
    account: models.Account, transaction_record: pd.Series
) -> Tuple[models.Transaction, bool]:
    executed_at = transaction_record["Datetime"]
    isin = transaction_record["ISIN"]
    local_value = transaction_record["Local value"]
    total_in_account_currency = transaction_record["Total"]
    value_in_account_currency = transaction_record["Value"]
    if "Transaction costs" in transaction_record:
        transaction_costs = transaction_record["Transaction costs"].astype(str)
    else:
        transaction_costs = transaction_record["Transaction and/or third"].astype(str)
    order_id = transaction_record["Order ID"]
    quantity = transaction_record["Quantity"]
    price = transaction_record["Price"]
    account_currency = transaction_record["Value currency"]

    if models.currency_enum_from_string(account_currency) != account.currency:
        raise CurrencyMismatch("Currency of import didn't match the account")
    exchange_mic = transaction_record["Venue"]
    exchange_ref = transaction_record["Reference"]
    exchange = exchanges.ExchangeRepository().get(exchange_mic, exchange_ref)

    def to_decimal(pd_f):
        return decimal.Decimal(pd_f.astype(str))

    transaction_costs = decimal.Decimal(transaction_costs)
    if transaction_costs.is_nan():
        transaction_costs = None
    return accounts.AccountRepository().add_transaction(
        account,
        isin=isin,
        exchange=exchange,
        executed_at=executed_at,
        quantity=to_decimal(quantity),
        price=to_decimal(price),
        transaction_costs=transaction_costs,
        local_value=to_decimal(local_value),
        value_in_account_currency=to_decimal(value_in_account_currency),
        total_in_account_currency=to_decimal(total_in_account_currency),
        order_id=order_id,
    )


def import_transactions_from_file(account, filename_or_file):
    try:
        return _import_transactions_from_file(account, filename_or_file)
    except Exception as e:
        models.TransactionImport.objects.create(
            integration=models.IntegrationType.DEGIRO,
            status=models.ImportStatus.FAILURE,
            account=account,
        )
        raise e


def _transform_to_datetime(transaction_record):
    date = transaction_record["Date"]
    try:
        day, month, year = date.split("-")
        time = transaction_record["Time"]
        return datetime.datetime.strptime(f"{year}-{month}-{day} {time}Z", _DATE_FORMAT)
    except:
        return None


@transaction.atomic()
def _import_transactions_from_file(account, filename_or_file):
    failed_records = []
    successful_records = []
    try:
        transactions_data = pd.read_csv(filename_or_file)
        transactions_data["Price currency"] = transactions_data["Unnamed: 8"]
        transactions_data["Local value currency"] = transactions_data["Unnamed: 10"]
        transactions_data["Value currency"] = transactions_data["Unnamed: 12"]
        transactions_data["Transaction costs currency"] = transactions_data[
            "Unnamed: 15"
        ]
        transactions_data["Transaction costs currency"] = transactions_data[
            "Unnamed: 15"
        ]
        transactions_data["Total currency"] = transactions_data["Unnamed: 17"]

        if "Transaction and/or third" in transactions_data.columns:
            transactions_data["Transaction costs"] = transactions_data[
                "Transaction and/or third"
            ]
        transactions_data_clean = transactions_data.drop(
            ["Unnamed: 8", "Unnamed: 10", "Unnamed: 12", "Unnamed: 15", "Unnamed: 17"],
            axis=1,
        )
        for column in REQUIRED_TRANSACTION_COLUMNS:
            if column not in transactions_data_clean.columns:
                raise InvalidFormat(f"Column: '{column}' missing in the csv file")

        transactions_data_clean["Datetime"] = transactions_data_clean[
            ["Date", "Time"]
        ].apply(_transform_to_datetime, axis=1)
        transactions_data_clean = transactions_data_clean.sort_values(by="Datetime")
    except pd.errors.ParserError as e:
        raise InvalidFormat("Failed to parse csv", e)

    for x in range(0, len(transactions_data_clean)):
        try:
            transaction_record = transactions_data_clean.iloc[x]
            transaction, created = import_transaction(account, transaction_record)
            successful_records.append(
                {
                    "record": transaction_record,
                    "transaction": transaction,
                    "created": created,
                }
            )
        except CurrencyMismatch as e:
            raise e
        except SoldBeforeBought as e:
            failed_records.append(
                {
                    "record": transaction_record,
                    "issue": str(e),
                    "issue_type": models.ImportIssueType.SOLD_BEFORE_BOUGHT,
                }
            )
        except Exception as e:
            failed_records.append(
                {
                    "record": transaction_record,
                    "issue": str(e),
                    "issue_type": models.ImportIssueType.UNKNOWN_FAILURE,
                }
            )

    status = models.ImportStatus.SUCCESS
    if failed_records and not successful_records:
        status = models.ImportStatus.FAILURE
    else:
        status = models.ImportStatus.PARTIAL_SUCCESS

    transaction_import = models.TransactionImport.objects.create(
        integration=models.IntegrationType.DEGIRO,
        status=status,
        account=account,
    )
    for entry in failed_records:
        models.TransactionImportRecord.objects.create(
            transaction_import=transaction_import,
            raw_record=entry["record"].to_csv(),
            successful=False,
            issue_type=entry["issue_type"],
            raw_issue=entry["issue"],
        )

    for entry in successful_records:
        models.TransactionImportRecord.objects.create(
            transaction_import=transaction_import,
            raw_record=entry["record"].to_csv(),
            successful=True,
            transaction=entry["transaction"],
            created_new=entry["created"],
        )
    return transaction_import