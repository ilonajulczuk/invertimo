import requests
from django.conf import settings
from finance import models

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

        r = requests.get(
            f"https://eodhistoricaldata.com/api/eod/{symbol}.FOREX?api_token={settings.EOD_APIKEY}&order=d&fmt=json&from={from_date}"
        )
        records = r.json()
        for record in records:
            models.CurrencyExchangeRate.objects.get_or_create(
                date=record["date"],
                value=record["close"],
                from_currency=from_currency,
                to_currency=to_currency,
            )


def collect_prices(security):
    symbol = security.symbol
    exchange_code = security.exchange.identifiers.get(id_type=models.ExchangeIDType.CODE).value
    from_date = "2020-01-01"
    last_record = (
        models.PriceHistory.objects.filter(security=security)
        .order_by("date")
        .last()
    )
    if last_record:
        from_date = str(last_record.date)

    r = requests.get(
            f"https://eodhistoricaldata.com/api/eod/{symbol}.{exchange_code}?api_token={settings.EOD_APIKEY}&order=d&fmt=json&from={from_date}"
        )
    records = r.json()
    prices = []
    for record in records:
        price, _ = models.PriceHistory.objects.get_or_create(
            date=record["date"],
            value=record["close"],
            security=security,
        )
        prices.append(price)
    return prices