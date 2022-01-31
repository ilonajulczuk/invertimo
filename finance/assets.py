from finance import models, prices


class AssetRepository:
    def __init__(self, exchange : models.Exchange):
        self.exchange = exchange

    def get(self, isin: str):
        assets = models.Asset.objects.filter(isin=isin, exchange=self.exchange)
        if assets:
            return assets[0]

    def add(
        self, isin: str, symbol: str, currency: models.Currency, country: str, name: str, tracked: bool
    ):
        asset, _ = models.Asset.objects.get_or_create(
            exchange=self.exchange,
            isin=isin,
            symbol=symbol,
            currency=currency,
            country=country,
            name=name,
            tracked=tracked,
        )
        return asset

    def add_crypto(self, symbol):
        # The exchange here should be Other / NA exchange as crypto assets are not tied to
        # particular exchanges.
        tracked = prices.are_crypto_prices_available(symbol)
        asset, created = models.Asset.objects.get_or_create(
            symbol=symbol,
            name=symbol,
            tracked=tracked,
            exchange=self.exchange,
            asset_type=models.AssetType.CRYPTO,
            currency=models.Currency.USD,
        )
        if tracked and created:
            prices.collect_prices(asset)
        return asset

    def get_crypto(self, symbol):
        assets = models.Asset.objects.filter(symbol=symbol, exchange=self.exchange)
        if assets:
            return assets[0]