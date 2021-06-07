import requests

from finance import models
from typing import Any, Dict
from django.conf import settings

_REFERENCE_TO_OPERATING_MIC_SIMPLIFIED_MAPPING : Dict[str, str] = {
    "NSY": "XNYS",
    "NDQ": "XNAS",
    "XET": "XETR",
    "LSE": "XLON",
    "MIL": "XMIL",  # Milan.
}


class ExchangeRepository:
    def get(self, exchange_mic, exchange_reference):
        try:
            return models.Exchange.objects.get(
                identifiers__value=exchange_mic,
                identifiers__id_type=models.ExchangeIDType.MIC,
            )
        except Exception as e:
            print(e)
            # Try mapping by exchange reference (relevant to degiro).
            simplified_mic = _REFERENCE_TO_OPERATING_MIC_SIMPLIFIED_MAPPING[
                exchange_reference
            ]
            return models.Exchange.objects.get(
                identifiers__value=simplified_mic,
                identifiers__id_type=models.ExchangeIDType.MIC,
            )

    def add(self, exchange_record) -> None:
        mics = exchange_record["OperatingMIC"]
        if mics is None:
            return
        mics = mics.split(",")
        mics = [x.strip() for x in mics]
        for mic in mics:
            exchange, _ = models.Exchange.objects.get_or_create(
                name=exchange_record["Name"], country=exchange_record["Country"]
            )
            models.ExchangeIdentifier.objects.get_or_create(
                exchange=exchange,
                id_type=models.ExchangeIDType.CODE,
                value=exchange_record["Code"],
            )
            models.ExchangeIdentifier.objects.get_or_create(
                exchange=exchange,
                id_type=models.ExchangeIDType.MIC,
                value=mic,
            )


def add_initial_set_of_exchanges() -> None:
    exchanges = ExchangeRepository()

    exchange_data = query_exchanges()
    for exchange_record in exchange_data:
        exchanges.add(exchange_record)
    print("Exchanges now: ", models.Exchange.objects.count())


def query_exchanges() -> Any:
    URL = f"https://eodhistoricaldata.com/api/exchanges-list/?api_token={settings.EOD_APIKEY}"
    response = requests.get(URL)
    return response.json()


class SecurityRepository:
    def __init__(self, exchange: models.Exchange):
        self.exchange = exchange

    def get(self, isin: str):
        securities = models.Security.objects.filter(isin=isin, exchange=self.exchange)
        if securities:
            return securities[0]

    def add(
        self, isin: str, symbol: str, currency: models.Currency, country: str, name: str
    ):
        security = models.Security(
            exchange=self.exchange,
            isin=isin,
            symbol=symbol,
            currency=currency,
            country=country,
            name=name,
        )
        security.save()
        return security


def get_or_create_security(isin: str, exchange: models.Exchange):
    repository = SecurityRepository(exchange)
    security = repository.get(isin)
    if security:
        return security
    exchange_code = exchange.identifiers.get(id_type=models.ExchangeIDType.CODE).value
    security_records = query_security(isin)
    for record in security_records:

        if record["Exchange"] == exchange_code:

            currency = models.currency_enum_from_string(record["Currency"])
            security = repository.add(
                isin=isin,
                symbol=record["Code"],
                currency=currency,
                country=record["Country"],
                name=record["Name"],
            )
            print("created security")
            return security
    else:
        print(f"failed to find stock data for isin: {isin}, exchange: {exchange}")


def query_security(isin : str):
    URL = f"https://eodhistoricaldata.com/api/search/{isin}?api_token={settings.EOD_APIKEY}"
    response = requests.get(URL)
    return response.json()