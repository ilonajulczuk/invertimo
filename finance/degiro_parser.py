import pandas as pd
import requests
from django.conf import settings
import decimal
from finance import models
from finance import exchanges
from django.db import transaction
from finance import accounts
import datetime


def import_transaction(account, transaction_record):
    date = transaction_record["Date"]
    day, month, year = date.split("-")
    time = transaction_record["Time"]
    datestr = f"{year}-{month}-{day} {time}Z"

    date_format = "%Y-%m-%d %H:%M%z"
    executed_at = datetime.datetime.strptime(datestr, date_format)
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
    local_currency = transaction_record["Local value currency"]
    # TODO: validate that the account currency is the same as the account.
    exchange_mic = transaction_record["Venue"]
    exchange_ref = transaction_record["Reference"]
    exchange = exchanges.ExchangeRepository().get(exchange_mic, exchange_ref)

    def to_decimal(pd_f):
        return decimal.Decimal(pd_f.astype(str))

    transaction_costs = decimal.Decimal(transaction_costs)
    if transaction_costs.is_nan():
        transaction_costs = None
    accounts.AccountRepository().add_transaction(
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


@transaction.atomic()
def import_transactions_from_file(account, filename):
    transactions_data = pd.read_csv(filename)
    transactions_data["Price currency"] = transactions_data["Unnamed: 8"]
    transactions_data["Local value currency"] = transactions_data["Unnamed: 10"]
    transactions_data["Value currency"] = transactions_data["Unnamed: 12"]
    transactions_data["Transaction costs currency"] = transactions_data["Unnamed: 15"]
    transactions_data["Transaction costs currency"] = transactions_data["Unnamed: 15"]
    transactions_data["Total currency"] = transactions_data["Unnamed: 17"]
    transactions_data_clean = transactions_data.drop(
        ["Unnamed: 8", "Unnamed: 10", "Unnamed: 12", "Unnamed: 15", "Unnamed: 17"],
        axis=1,
    )
    failed_records = []
    for x in range(0, len(transactions_data_clean)):
        try:
            transaction_record = transactions_data_clean.iloc[x]
            import_transaction(account, transaction_record)
        except Exception as e:
            print("Import exception", e)
            failed_records.append(transaction_record)
    print("Failed records", len(failed_records))
    return failed_records