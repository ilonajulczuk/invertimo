from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from finance import accounts, prices, models
from django.db.models import Count


class Command(BaseCommand):
    help = "Fetch prices from eod historical data."

    def add_arguments(self, parser):
        pass

    def handle(self, *args, **options):
        assets = (
            models.Asset.objects.filter(tracked=True)
            .annotate(positions_count=Count("positions"))
            .filter(positions_count__gte=1)
        )
        self.stdout.write(f"Will fetch currency exchange rates")
        prices.collect_exchange_rates()
        self.stdout.write(self.style.SUCCESS(f"Collected exchange rates"))
        self.stdout.write(f"Will fetch prices for {assets.count()} securities")

        for asset in assets:
            price_records = prices.collect_prices(asset)
            self.stdout.write(
                self.style.SUCCESS(f"Collected {len(price_records)} prices for {asset}")
            )
