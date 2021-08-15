import requests
from django.conf import settings
from finance import models
import logging

logger = logging.getLogger(__name__)

symbol_to_currency_pair = {
    "USDEUR": {
        "from_currency": models.Currency.USD,
        "to_currency": models.Currency.EURO,
    },
    "EURUSD": {
        "from_currency": models.Currency.EURO,
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
        "from_currency": models.Currency.EURO,
        "to_currency": models.Currency.GBP,
    },
    "GBPEUR": {
        "from_currency": models.Currency.GBP,
        "to_currency": models.Currency.EURO,
    },
    "GBXEUR": {
        "from_currency": models.Currency.GBX,
        "to_currency": models.Currency.EURO,
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
    exchange_code = asset.exchange.identifiers.get(id_type=models.ExchangeIDType.CODE).value
    from_date = "2020-01-01"
    last_record = (
        models.PriceHistory.objects.filter(asset=asset)
        .order_by("date")
        .last()
    )
    if last_record:
        from_date = str(last_record.date)

    r = requests.get(
            f"https://eodhistoricaldata.com/api/eod/{symbol}.{exchange_code}?api_token={settings.EOD_APIKEY}&order=d&fmt=json&from={from_date}"
        )
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