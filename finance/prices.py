from typing import Optional
from django.db.models.base import ModelState
import requests
import logging
import datetime
import decimal


from django.conf import settings
from finance import models

logger = logging.getLogger(__name__)


class PriceNotAvailable(ValueError):
    pass


symbol_to_currency_pair = {
    "USDEUR": {
        "from_currency": models.Currency.USD,
        "to_currency": models.Currency.EUR,
    },
    "EURUSD": {
        "from_currency": models.Currency.EUR,
        "to_currency": models.Currency.USD,
    },
    "GBPUSD": {
        "from_currency": models.Currency.GBP,
        "to_currency": models.Currency.USD,
    },
    "USDGBP": {
        "from_currency": models.Currency.USD,
        "to_currency": models.Currency.GBP,
    },
    "EURGBP": {
        "from_currency": models.Currency.EUR,
        "to_currency": models.Currency.GBP,
    },
    "GBPEUR": {
        "from_currency": models.Currency.GBP,
        "to_currency": models.Currency.EUR,
    },
    "GBXEUR": {
        "from_currency": models.Currency.GBX,
        "to_currency": models.Currency.EUR,
    },
    "GBXUSD": {
        "from_currency": models.Currency.GBX,
        "to_currency": models.Currency.USD,
    },
    "GBXGBP": {
        "from_currency": models.Currency.GBX,
        "to_currency": models.Currency.GBP,
    },
}


def get_closest_exchange_rate(
    date: datetime.date, from_currency: models.Currency, to_currency: models.Currency
):
    rates = models.CurrencyExchangeRate.objects.filter(
        from_currency=from_currency, to_currency=to_currency
    )
    rate = rates.filter(date__lte=date).order_by("-date").first()
    if rate is None:
        rate = rates.filter(date__gte=date).order_by("date").first()
    return rate


def collect_exchange_rates():
    for symbol, pair in symbol_to_currency_pair.items():
        from_currency = pair["from_currency"]
        to_currency = pair["to_currency"]
        from_date = "2020-01-01"
        last_record = (
            models.CurrencyExchangeRate.objects.filter(
                from_currency=from_currency, to_currency=to_currency
            )
            .order_by("date")
            .last()
        )
        if last_record:
            from_date = str(last_record.date)

        divide_by_hundred = False
        if symbol.startswith("GBX"):
            divide_by_hundred = True
            symbol = symbol.replace("GBX", "GBP")

        r = requests.get(
            f"https://eodhistoricaldata.com/api/eod/{symbol}.FOREX?api_token={settings.EOD_APIKEY}&order=d&fmt=json&from={from_date}"
        )
        records = []
        try:
            records = r.json()
        except Exception as e:
            logger.error("failed fetching %s, because of %s", symbol, e)

        for record in records:
            if divide_by_hundred:
                value = record["close"] / 100
            else:
                value = record["close"]
            models.CurrencyExchangeRate.objects.get_or_create(
                date=record["date"],
                value=value,
                from_currency=from_currency,
                to_currency=to_currency,
            )


def collect_prices(asset):
    symbol = asset.symbol

    from_date = "2020-01-01"
    last_record = (
        models.PriceHistory.objects.filter(asset=asset).order_by("date").last()
    )
    if last_record:
        from_date = str(last_record.date)

    if asset.asset_type == models.AssetType.CRYPTO:
        url = f"https://eodhistoricaldata.com/api/eod/{symbol}-USD.CC?api_token={settings.EOD_APIKEY}&order=d&fmt=json&from={from_date}"
    else:
        exchange_code = asset.exchange.identifiers.get(
            id_type=models.ExchangeIDType.CODE
        ).value
        url = f"https://eodhistoricaldata.com/api/eod/{symbol}.{exchange_code}?api_token={settings.EOD_APIKEY}&order=d&fmt=json&from={from_date}"

    r = requests.get(url)
    records = []
    try:
        records = r.json()
    except Exception as e:
        logger.error("failed fetching %s, because of %s", symbol, e)
    prices = []
    logger.info("Number of new price records: %s", len(records))
    for record in records:
        price, _ = models.PriceHistory.objects.get_or_create(
            date=record["date"],
            value=record["close"],
            asset=asset,
        )
        prices.append(price)
    return prices


def are_crypto_prices_available(symbol):
    try:
        url = f"https://eodhistoricaldata.com/api/eod/{symbol}-USD.CC?api_token={settings.EOD_APIKEY}&order=d&fmt=json"
        r = requests.get(url)
        records = r.json()
        if records:
            return True
    except Exception as e:
        logging.warn(e)
        return False
    return False


def get_crypto_usd_price_at_date(symbol, date) -> Optional[decimal.Decimal]:
    try:
        prices = models.PriceHistory.objects.filter(asset__symbol=symbol, date=date)
        if prices:
            return prices[0].value

        date_string = date.isoformat()
        url = (
            f"https://eodhistoricaldata.com/api/eod/{symbol}-USD.CC?"
            f"api_token={settings.EOD_APIKEY}&order=d&fmt=json&"
            f"from={date_string}&to={date_string}")
        r = requests.get(url)
        records = r.json()
        if records:
            return decimal.Decimal(str(records[0]["close"]))
        else:
            raise PriceNotAvailable(f"Unable to find price for '{symbol} at {date}")
    except Exception as e:
        logging.warn(e)
        raise PriceNotAvailable(f"Unable to find price for '{symbol} at {date}")