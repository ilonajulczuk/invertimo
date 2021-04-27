import pandas as pd
import requests
from django.conf import settings
import decimal
from finance import models
from finance import exchanges
from django.db import transaction


def import_transaction(account, transaction_record):
    date = transaction_record["Date"]
    day, month, year = date.split("-")
    time = transaction_record["Time"]
    datetime = f"{year}-{month}-{day} {time}Z"
    isin = transaction_record["ISIN"]
    local_value = transaction_record["Local value"]
    value_in_account_currency = transaction_record["Value"]
    transaction_costs = transaction_record["Transaction costs"]
    order_id = transaction_record["Order ID"]
    quantity = transaction_record["Quantity"]
    price = transaction_record["Price"]
    local_currency = transaction_record["Local value currency"]
    exchange_mic = transaction_record["Venue"]
    exchange_ref = transaction_record["Reference"]
    exchange = exchanges.ExchangeRepository().get(exchange_mic, exchange_ref)
    # Find or create a position.
    position = get_or_create_position(account, isin, exchange)
    if position:
        # TODO some sanity checking for currencies, etc.
        transaction = models.Transaction(
            executed_at=datetime,
            position=position,
            quantity=quantity.astype(decimal.Decimal),
            price=decimal.Decimal(price),
            transaction_costs=decimal.Decimal(transaction_costs),
            local_value=decimal.Decimal(local_value),
            value_in_account_currency=decimal.Decimal(value_in_account_currency),
            order_id=order_id,
        )
        transaction.save()
    else:
        raise ValueError(f"Failed to create a position from a transaction record, isin: {isin}, exchange ref: {exchange_ref}")


def currency_enum_from_string(currency):
    if currency == "USD":
        return models.Currency.USD
    elif currency == "EUR":
        return models.Currency.EURO
    elif currency == "GBX":
        return models.Currency.GBX
    else:
        raise ValueError("Unsupported currency")


def get_or_create_security(isin, exchange):
    securities = models.Security.objects.filter(isin=isin, exchange=exchange)
    if securities:
        return securities[0]
    security_records = query_security(isin)
    for record in security_records:
        exchange_code = exchange.identifiers.get(
            id_type=models.ExchangeIDType.CODE
        ).value
        if record["Exchange"] == exchange_code:

            currency = currency_enum_from_string(record["Currency"])
            security = models.Security(
                exchange=exchange,
                isin=isin,
                symbol=record["Code"],
                currency=currency,
                country=record["Country"],
                name=record["Name"],
            )
            security.save()
            print("created security")
            return security
    else:
        print(f"failed to find stock data for isin: {isin}, exchange: {exchange}")

def query_security(isin):
    URL = f"https://eodhistoricaldata.com/api/search/{isin}?api_token={settings.EOD_APIKEY}"
    response = requests.get(URL)
    return response.json()


def get_or_create_position(account, isin, exchange):
    positions = models.Position.objects.filter(
        account=account, security__isin=isin, security__exchange=exchange
    )
    if positions:
        return positions[0]
    security = get_or_create_security(isin, exchange)
    if security:
        return models.Position.objects.create(account=account, security=security)
    else:
        return None


@transaction.atomic()
def import_transactions_from_file(account, filename):
    transactions_data = pd.read_csv(filename)
    transactions_data["Price currency"] = transactions_data["Unnamed: 8"]
    transactions_data["Local value currency"] = transactions_data["Unnamed: 10"]
    transactions_data["Value currency"] = transactions_data["Unnamed: 12"]
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
            print(e)
            failed_records.append(transaction_record)
    print("Failed records", len(failed_records))
    return failed_records