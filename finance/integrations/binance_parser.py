import datetime
import decimal
from typing import Tuple

import pandas as pd
from django.conf import settings
from django.db import transaction

from finance import accounts, exchanges, models
from finance.gains import SoldBeforeBought



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

def import_transactions_from_file(account, filename_or_file, import_all_assets):
    try:
        return _import_transactions_from_file(account, filename_or_file, import_all_assets)
    except Exception as e:
        models.TransactionImport.objects.create(
            integration=models.IntegrationType.BINANCE_CSV,
            status=models.ImportStatus.FAILURE,
            account=account,
        )
        raise e

@transaction.atomic()
def _import_transactions_from_file(account, filename_or_file, import_all_assets):
    failed_records = []
    successful_records = []
    try:
        transactions_data = pd.read_csv(filename_or_file)
        for column in REQUIRED_TRANSACTION_COLUMNS:
            if column not in transactions_data.columns:
                raise InvalidFormat(f"Column: '{column}' missing in the csv file")
        transactions_data_clean = transactions_data.sort_values(by="UTC_Time")
    except pd.errors.ParserError as e:
        raise InvalidFormat("Failed to parse csv", e)

    for x in range(0, len(transactions_data_clean)):
        try:
            transaction_record = transactions_data_clean.iloc[x]
            transaction, created = import_transaction(account, transaction_record, import_all_assets)
            successful_records.append(
                {
                    "record": transaction_record,
                    "transaction": transaction,
                    "created": created,
                }
            )
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


def import_transaction(
    account: models.Account, transaction_record: pd.Series, import_all_assets,
) -> Tuple[models.Transaction, bool]:
    executed_at = transaction_record["UTC_Time"]
    coin = transaction_record["Coin"]
    operation = transaction_record["Operation"]
    print(executed_at, coin, operation)
    # TODO: actually create transactions and other records here :).
    return None, False