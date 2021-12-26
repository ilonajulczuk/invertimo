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

OTHER_OR_NA_EXCHANGE_NAME = "Other / NA"


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

    def get_by_name(self, exchange_name: str) -> models.Exchange:
        if exchange_name == OTHER_OR_NA_EXCHANGE_NAME:
            # If it doesn't exist, create it and later reuse it.
            exchange, _ = models.Exchange.objects.get_or_create(name=OTHER_OR_NA_EXCHANGE_NAME)
            return exchange
        return models.Exchange.objects.get(
            name=exchange_name,
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


class AssetRepository:
    def __init__(self, exchange: models.Exchange):
        self.exchange = exchange

    def get(self, isin: str):
        assets = models.Asset.objects.filter(isin=isin, exchange=self.exchange)
        if assets:
            return assets[0]

    def add(
        self, isin: str, symbol: str, currency: models.Currency, country: str, name: str, tracked: bool
    ):
        asset = models.Asset(
            exchange=self.exchange,
            isin=isin,
            symbol=symbol,
            currency=currency,
            country=country,
            name=name,
            tracked=tracked,
        )
        asset.save()
        return asset


def get_or_create_asset(isin: str, exchange: models.Exchange):
    repository = AssetRepository(exchange)
    asset = repository.get(isin)
    if asset:
        return asset
    exchange_code = exchange.identifiers.get(id_type=models.ExchangeIDType.CODE).value
    asset_records = query_asset(isin)
    for record in asset_records:
        if record["Exchange"] == exchange_code:

            currency = models.currency_enum_from_string(record["Currency"])
            asset = repository.add(
                isin=isin,
                symbol=record["Code"],
                currency=currency,
                country=record["Country"],
                name=record["Name"],
                tracked=True,
            )
            print("created asset")
            return asset
    else:
        print(f"failed to find stock data for isin: {isin}, exchange: {exchange}")


def query_asset(isin : str):
    URL = f"https://eodhistoricaldata.com/api/search/{isin}?api_token={settings.EOD_APIKEY}"
    response = requests.get(URL)
    return response.json()