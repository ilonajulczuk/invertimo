import datetime
import decimal
from django.test import TestCase

from finance import prices
from finance import models
from finance import utils


class TestPrices(TestCase):
    def setUp(self):
        super().setUp()

        self.from_currency = models.Currency.EUR
        self.to_currency = models.Currency.USD
        other_currency = models.Currency.GBP

        dates = utils.generate_date_intervals(
            from_date=datetime.date.fromisoformat("2021-03-01"), to_date=datetime.date.fromisoformat("2021-05-01")
        )
        for i, date in enumerate(dates):
            models.CurrencyExchangeRate.objects.create(
                from_currency=self.from_currency,
                to_currency=self.to_currency,
                date=date,
                value=0.8 + 0.1 * (i % 5),
            )
            models.CurrencyExchangeRate.objects.create(
                from_currency=self.from_currency,
                to_currency=other_currency,
                date=date,
                value=0.9 + 0.1 * (i % 5),
            )

        other_sparse_dates = utils.generate_date_intervals(
            from_date=datetime.date.fromisoformat("2020-03-01"),
            to_date=datetime.date.fromisoformat("2020-05-01"),
            output_period=datetime.timedelta(days=3),
        )

        for i, date in enumerate(other_sparse_dates):
            models.CurrencyExchangeRate.objects.create(
                from_currency=self.from_currency,
                to_currency=self.to_currency,
                date=date,
                value=1.8 + 0.1 * (i % 5),
            )

    def test_exchange_rate_present(self):

        rate = prices.get_closest_exchange_rate(
            date=datetime.date.fromisoformat("2021-04-03"),
            from_currency=self.from_currency,
            to_currency=self.to_currency,
        )
        self.assertEqual(rate.date, datetime.date.fromisoformat("2021-04-03"))
        self.assertEqual(rate.from_currency, self.from_currency)
        self.assertEqual(rate.to_currency, self.to_currency)
        self.assertEqual(rate.value, decimal.Decimal("1.1"))

    def test_exchange_rate_sparse_range(self):
        rate = prices.get_closest_exchange_rate(
            date=datetime.date.fromisoformat("2020-04-03"),
            from_currency=self.from_currency,
            to_currency=self.to_currency,
        )
        # Should use first date before it.
        self.assertEqual(rate.date, datetime.date.fromisoformat("2020-04-01"))
        self.assertEqual(rate.from_currency, self.from_currency)
        self.assertEqual(rate.to_currency, self.to_currency)
        self.assertEqual(rate.value, decimal.Decimal("1.8"))


    def test_exchange_too_early(self):
        rate = prices.get_closest_exchange_rate(
            date=datetime.date.fromisoformat("2000-04-03"),
            from_currency=self.from_currency,
            to_currency=self.to_currency,
        )
        # Will use first date available.
        self.assertEqual(rate.date, datetime.date.fromisoformat("2020-03-02"))
        self.assertEqual(rate.from_currency, self.from_currency)
        self.assertEqual(rate.to_currency, self.to_currency)
        self.assertEqual(rate.value, decimal.Decimal("1.8"))

    def test_exchange_too_late(self):
        rate = prices.get_closest_exchange_rate(
            date=datetime.date.fromisoformat("2021-11-03"),
            from_currency=self.from_currency,
            to_currency=self.to_currency,
        )
        # Will use last date available.
        self.assertEqual(rate.date, datetime.date.fromisoformat("2021-05-01"))
        self.assertEqual(rate.from_currency, self.from_currency)
        self.assertEqual(rate.to_currency, self.to_currency)
        self.assertEqual(rate.value, decimal.Decimal("0.8"))