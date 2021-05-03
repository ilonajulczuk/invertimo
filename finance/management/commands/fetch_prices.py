from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from finance import accounts, prices, models


class Command(BaseCommand):
    help = 'Import degiro transactions from a file.'

    def add_arguments(self, parser):
        pass

    def handle(self, *args, **options):
        securities = models.Security.objects.all()
        self.stdout.write(f'Will fetch currency exchange rates')
        prices.collect_exchange_rates()
        self.stdout.write(self.style.SUCCESS(f'Collected exchange rates'))
        self.stdout.write(f'Will fetch prices for {securities.count()} securities')

        for security in securities:
            prices.collect_prices(security)
            self.stdout.write(self.style.SUCCESS(f'Collected prices for {security}'))