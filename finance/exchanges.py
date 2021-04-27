import requests

from finance import models

from django.conf import settings

_REFERENCE_TO_OPERATING_MIC_SIMPLIFIED_MAPPING = {
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

    def add(self, exchange_record):
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


def add_initial_set_of_exchanges():
    exchanges = ExchangeRepository()

    exchange_data = query_exchanges()
    for exchange_record in exchange_data:
        exchanges.add(exchange_record)
    print("Exchanges now: ", models.Exchange.objects.count())


def query_exchanges():
    URL = f"https://eodhistoricaldata.com/api/exchanges-list/?api_token={settings.EOD_APIKEY}"
    response = requests.get(URL)
    return response.json()