import requests

from finance import models
from finance.assets import AssetRepository

import logging

from typing import Any, Dict, Optional
from django.conf import settings


logger = logging.getLogger(__name__)

_REFERENCE_TO_OPERATING_MIC_SIMPLIFIED_MAPPING: Dict[str, str] = {
    "NSY": "XNYS",
    "NDQ": "XNAS",
    "XET": "XETR",
    "LSE": "XLON",
    "MIL": "XMIL",  # Milan.
    "MAD": "BMEX",  # Madrid.
    "EAM": "XAMS",  # Amsterdam.
    "FRA": "XFRA",  # Frankfurt.
}

OTHER_OR_NA_EXCHANGE_NAME = "Other / NA"

SUPPORTED_EXCHANGE_CODES = [
    "US",
    "XETRA",
    "MI",
    "LSE",
    "MC",
    "PA",
    "AS",
    "F",
    "HK",
    "SG",
    "CN",
    "WAR",
]


class ExchangeRepository:
    def get(self, exchange_mic, exchange_reference):
        try:
            if exchange_reference == "DEG":
                exchange, _ = models.Exchange.objects.get_or_create(
                    name=OTHER_OR_NA_EXCHANGE_NAME
                )
                return exchange
            return models.Exchange.objects.get(
                identifiers__value=exchange_mic,
                identifiers__id_type=models.ExchangeIDType.MIC,
            )
        except Exception as e:
            # Try mapping by exchange reference (relevant to degiro).
            simplified_mic = _REFERENCE_TO_OPERATING_MIC_SIMPLIFIED_MAPPING.get(
                exchange_reference, None
            )
            try:
                return models.Exchange.objects.get(
                    identifiers__value=simplified_mic,
                    identifiers__id_type=models.ExchangeIDType.MIC,
                )
            except:
                raise ValueError(
                    f"Couldn't map exchange {exchange_mic} {exchange_reference} to known exchanges."
                )

    def get_by_name(self, exchange_name: str) -> models.Exchange:
        if exchange_name == OTHER_OR_NA_EXCHANGE_NAME:
            # If it doesn't exist, create it and later reuse it.
            exchange, _ = models.Exchange.objects.get_or_create(
                name=OTHER_OR_NA_EXCHANGE_NAME
            )
            return exchange
        return models.Exchange.objects.get(
            name=exchange_name,
        )

    def get_by_code(self, exchange_code):
        return models.Exchange.objects.get(
            identifiers__value=exchange_code,
            identifiers__id_type=models.ExchangeIDType.CODE,
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


def get_or_create_asset(
    isin: str,
    exchange: models.Exchange,
    asset_defaults,
    add_untracked_if_not_found,
    user,
):
    repository = AssetRepository(exchange)
    asset = repository.get(isin)
    if asset:
        return asset
    if exchange.name != OTHER_OR_NA_EXCHANGE_NAME:
        exchange_code = exchange.identifiers.get(
            id_type=models.ExchangeIDType.CODE
        ).value
    else:
        exchange_code = ""
    asset_records = query_asset(isin)
    for record in asset_records:
        if record["Exchange"] == exchange_code:
            asset_type_raw = record["Type"]
            if asset_defaults["local_currency"] != record["Currency"]:
                # There could be multiple assets registered with the same ISIN, but different currencies.
                continue
            currency = models.currency_enum_from_string(record["Currency"])
            asset = repository.add(
                isin=isin,
                symbol=record["Code"],
                currency=currency,
                country=record["Country"],
                name=record["Name"],
                tracked=True,
                user=user,
                asset_type=_to_asset_type(asset_type_raw),
            )
            print("created asset")
            return asset
    else:
        if len(asset_records):
            record = asset_records[0]
            asset_type_raw = record["Type"]
            currency = models.currency_enum_from_string(
                asset_defaults["local_currency"]
            )
            if add_untracked_if_not_found:
                asset = repository.add(
                    isin=isin,
                    symbol=record["Code"],
                    currency=currency,
                    country=record["Country"],
                    name=record["Name"],
                    tracked=False,
                    user=user,
                    asset_type=_to_asset_type(asset_type_raw),
                )

                return asset
            logging.warn(
                f"failed to find stock data for isin: {isin}, exchange: {exchange}, exchange_code: {exchange_code}"
            )
        else:
            if add_untracked_if_not_found:
                currency = models.currency_enum_from_string(
                    asset_defaults["local_currency"]
                )
                asset = repository.add(
                    isin=isin,
                    symbol=isin,
                    currency=currency,
                    country="Unknown",
                    name=asset_defaults["name"],
                    tracked=False,
                    user=user,
                    asset_type=models.AssetType.STOCK,
                )
                return asset
            logging.warn(
                f"failed to find stock data (there were assets but no exchange match) for isin: {isin}, exchange: {exchange}, exchange_code: {exchange_code}"
            )


def query_asset(isin: str):
    URL = f"https://eodhistoricaldata.com/api/search/{isin}?api_token={settings.EOD_APIKEY}"
    response = requests.get(URL)
    return response.json()


def _to_asset_type(asset_type_raw: str) -> Optional[models.AssetType]:
    asset_type_raw = asset_type_raw.lower()
    if "stock" in asset_type_raw:
        return models.AssetType.STOCK
    elif "fund" in asset_type_raw:
        return models.AssetType.FUND
    elif asset_type_raw == "etf":
        return models.AssetType.FUND


def _to_currency(currency_raw: str) -> Optional[models.Currency]:
    try:
        return models.currency_enum_from_string(currency_raw)
    except ValueError:
        return


def search_and_create_assets(
    identifier: str,
):
    asset_records = query_asset(identifier)
    assets = []
    identifier_lower = identifier.lower()
    for record in asset_records:
        if record["Exchange"] == "CC" and record["Type"] == "Currency":
            exchange = ExchangeRepository().get_by_name(OTHER_OR_NA_EXCHANGE_NAME)
            repository = AssetRepository(exchange)
            # CRYPTO token assets are represented as e.g. 'BTC-USD'.
            split_name = record["Code"].split("-")
            if len(split_name) == 2:
                symbol = split_name[0]
                # There are too many random coins, only add if the symbol matches.
                if symbol.lower() == identifier_lower:
                    name = record["Name"]
                    asset = repository.add_crypto_from_search(symbol, name)
                    assets.append(asset)
        if record["Exchange"] in SUPPORTED_EXCHANGE_CODES:
            exchange = ExchangeRepository().get_by_code(record["Exchange"])

            repository = AssetRepository(exchange)

            isin = record["ISIN"]
            asset_type_raw = record["Type"]
            currency_raw = record["Currency"]
            country = record["Country"]
            name = record["Name"]
            name_words = name.lower().split()
            symbol = record["Code"]

            asset_type = _to_asset_type(asset_type_raw)
            if asset_type is None:
                continue
            currency = _to_currency(currency_raw)
            if currency is None:
                continue
            if isin is None:
                continue
            if (
                identifier_lower == symbol.lower()
                or identifier_lower == isin.lower()
                or identifier_lower in name_words
            ):
                asset = repository.add(
                    isin=isin,
                    symbol=symbol,
                    currency=currency,
                    country=country,
                    name=name,
                    asset_type=asset_type,
                    tracked=True,
                    user=None,
                )
                assets.append(asset)

    return assets
