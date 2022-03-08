from finance import models, prices, tasks
from django.contrib.auth.models import User


class AssetRepository:
    def __init__(self, exchange : models.Exchange):
        self.exchange = exchange

    def get(self, isin: str):
        assets = models.Asset.objects.filter(isin=isin, exchange=self.exchange)
        if assets:
            return assets[0]

    def add(
        self, isin: str, symbol: str, currency: models.Currency, country: str, name: str, tracked: bool, user: User
    ) -> models.Asset:
        asset, _ = models.Asset.objects.get_or_create(
            exchange=self.exchange,
            isin=isin,
            symbol=symbol,
            currency=currency,
            country=country,
            name=name,
            tracked=tracked,
            added_by=user,
        )
        asset.full_clean()
        return asset

    def add_crypto(self, symbol : str, user: User) -> models.Asset:
        # The exchange here should be Other / NA exchange as crypto assets are not tied to
        # particular exchanges.
        tracked = prices.are_crypto_prices_available(symbol)
        asset, _ = models.Asset.objects.get_or_create(
            symbol=symbol,
            name=symbol,
            tracked=tracked,
            exchange=self.exchange,
            asset_type=models.AssetType.CRYPTO,
            currency=models.Currency.USD,
            added_by=user if not tracked else None,
        )
        asset.full_clean()
        return asset

    def add_crypto_from_search(self, symbol, name) -> models.Asset:
        asset, _ = models.Asset.objects.get_or_create(
            symbol=symbol,
            name=name,
            tracked=True,
            exchange=self.exchange,
            asset_type=models.AssetType.CRYPTO,
            currency=models.Currency.USD,
        )
        asset.full_clean()
        return asset

    def get_crypto(self, symbol):
        assets = models.Asset.objects.filter(symbol=symbol, exchange=self.exchange)
        if assets:
            return assets[0]