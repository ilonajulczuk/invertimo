import datetime
import decimal
import functools
from typing import List, Optional, Tuple, Sequence
from django.core.exceptions import ValidationError

import pytz
from django.contrib.auth.models import User
from django.db import models
from django.utils.translation import gettext_lazy as _

from finance import utils
import functools


class Currency(models.IntegerChoices):
    EUR = 1, _("EUR")
    GBP = 2, _("GBP")
    USD = 3, _("USD")
    GBX = 4, _("GBX")


def currency_enum_from_string(currency: str) -> Currency:
    try:
        return Currency[currency]
    except KeyError:
        raise ValueError("Unsupported currency '%s'" % currency)


def currency_string_from_enum(currency: Currency) -> str:
    return Currency(currency).label


class Account(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    currency = models.IntegerField(choices=Currency.choices, default=Currency.EUR)
    nickname = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    balance = models.DecimalField(max_digits=12, decimal_places=5, default=0)
    last_modified = models.DateTimeField(auto_now=True, null=True)

    def __str__(self):
        return (
            f"<Account user: {self.user}, nickname: '{self.nickname}', "
            f"currency: {self.get_currency_display()}>"
        )

    def value_history_per_position(self, from_date, to_date):
        results = []
        for position in self.positions.all():
            results.append(
                (
                    position.pk,
                    position.value_history_in_account_currency(from_date, to_date),
                )
            )
        return results

    class Meta:
        unique_together = [["user", "nickname"]]
        ordering = ["-id"]


class Exchange(models.Model):
    name = models.CharField(max_length=200)
    country = models.CharField(max_length=200)

    def __str__(self):
        codes = ""
        for identifer in self.identifiers.all():
            codes += str(identifer) + ", "
        return (
            f"<Exchange name: {self.name}, country: {self.country} "
            f"codes: <{codes}> >"
        )


class ExchangeIDType(models.IntegerChoices):
    CODE = 1, _("CODE")
    # Operating MIC vs Segment MIC.
    # https://www.tradinghours.com/mic
    # https://www.iso20022.org/market-identifier-codes
    MIC = 2, _("MIC")
    SEGMENT_MIC = 3, _("SEGMENT MIC")


class ExchangeIdentifier(models.Model):
    exchange = models.ForeignKey(
        Exchange, on_delete=models.CASCADE, related_name="identifiers"
    )
    id_type = models.IntegerField(
        choices=ExchangeIDType.choices,
    )
    value = models.CharField(max_length=20)

    def __str__(self):
        return (
            f"<Exchange ID exchange: {self.exchange.name}, id_type: "
            f"{self.get_id_type_display()}, value: {self.value}>"
        )


class AssetType(models.IntegerChoices):
    STOCK = 1, _("Stock")
    BOND = 2, _("Bond")
    FUND = 3, _("Fund")


def asset_type_enum_from_string(asset_type: str) -> AssetType:
    try:
        return AssetType[asset_type.upper()]
    except KeyError:
        raise ValueError("Unsupported asset type '%s'" % asset_type)


def asset_type_string_from_enum(asset_type: AssetType) -> str:
    return AssetType(asset_type).label


class Asset(models.Model):
    isin = models.CharField(max_length=30)
    symbol = models.CharField(max_length=30)
    name = models.CharField(max_length=200)
    exchange = models.ForeignKey(
        # Null is for not exchange traded assets or if the exchange is NA/Other.
        Exchange,
        on_delete=models.CASCADE,
        related_name="assets",
        null=True,
        blank=True,
    )
    currency = models.IntegerField(choices=Currency.choices, default=Currency.USD)
    country = models.CharField(max_length=200, null=True)

    asset_type = models.IntegerField(choices=AssetType.choices, default=AssetType.STOCK)

    tracked = models.BooleanField(default=True)

    # Only relevant if not tracked and added by a specific user.
    added_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="custom_assets",
    )

    # TODO:
    # Add constraint that ISIN / NAME and exchange are unique for given added_by.
    # Multiple users can add an asset "My house" for no exchange. Or "AAAPL" on USA stocks
    # and its fine.
    # Used to be:
    # class Meta:
    #     unique_together = [["isin", "exchange"]]

    def __str__(self):
        exchange_name = self.exchange.name if self.exchange else "Other / NA"
        return (
            f"<Asset exchange: {exchange_name}, isin: "
            f"{self.isin}, symbol: {self.symbol}, name: {self.name}, "
            f"currency: {self.get_currency_display()}, country: {self.country}>"
        )


def multiply_at_matching_dates(
    first_sequence: Sequence[Tuple[datetime.date, decimal.Decimal]],
    second_sequence: Sequence[Tuple[datetime.date, decimal.Decimal]],
):

    multiplied_records = []
    max_first = len(first_sequence)
    max_second = len(second_sequence)

    i = 0
    j = 0
    while i < max_first and j < max_second:
        if first_sequence[i][0] > second_sequence[j][0]:
            i += 1
        elif first_sequence[i][0] < second_sequence[j][0]:
            j += 1
        else:
            multiplied_records.append(
                (second_sequence[j][0], second_sequence[j][1] * first_sequence[i][1])
            )
            j += 1
            i += 1
    return multiplied_records


class Position(models.Model):
    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="positions"
    )
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="positions")

    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    last_modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"<Position account: {self.account}, " f"asset: {self.asset}>"

    @functools.lru_cache(maxsize=None)
    def quantity_history(
        self,
        from_date: datetime.date,
        to_date: Optional[datetime.date] = None,
        output_period=datetime.timedelta(days=1),
    ):
        if to_date is None:
            to_date = datetime.date.today()

        dates = utils.generate_date_intervals(
            from_date, to_date, output_period, start_with_end=True
        )

        quantity = self.quantity
        transactions = self.transactions.order_by("-executed_at")
        if not transactions:
            return [(date, quantity) for date in dates]

        dates_with_quantities = []
        if transactions[0].executed_at.date() > to_date:
            # TODO: add support for this if necessary.
            raise ValueError("history ending before last transaction not supported")

        last_relevant_transaction = 0
        for date in dates:
            relevant_transactions = transactions[last_relevant_transaction:]
            for i, transaction in enumerate(relevant_transactions):
                if transaction.executed_at.date() < date:
                    # Since we are going from later to earlier and undoing each
                    # transaction, this transaction doesn't happen yet, so it couldn't
                    # affect the current interval. Since transactions are sorted, we
                    # know that all potentially relevant transactions were already applied.
                    break
                else:
                    last_relevant_transaction += 1
                    quantity -= transaction.quantity
            dates_with_quantities.append((date, quantity))

        return dates_with_quantities

    # This seems pretty ugly and will have to be refactored.
    # I might also want to use caching so it's not a performance nightmare.
    @functools.lru_cache(maxsize=None)
    def value_history(
        self,
        from_date: datetime.date,
        to_date=Optional[datetime.date],
        output_period=datetime.timedelta(days=1),
    ):
        quantity_history = self.quantity_history(from_date, to_date, output_period)

        if to_date is None:
            to_date = datetime.date.today()
        prices = self.asset.pricehistory_set.order_by("-date").filter(
            date__gte=from_date, date__lte=to_date
        )
        price_tuples = [(price.date, price.value) for price in prices]

        def to_datetime(date: datetime.date) -> datetime.datetime:
            dt = datetime.datetime.fromisoformat(date.isoformat())
            dt = dt.replace(tzinfo=pytz.UTC)
            return dt

        # Transactions also record price history, so add their data points.
        transactions = self.transactions.filter(
            executed_at__gte=to_datetime(from_date),
            executed_at__lte=to_datetime(to_date),
        )
        price_tuples_from_transactions = [
            (
                # The date is rounded up to the next day.
                # Alternative solution: use the last price and extend it further
                # to the future.
                transaction.executed_at.date() + datetime.timedelta(days=1),
                transaction.price,
            )
            for transaction in transactions
        ]
        price_tuples.extend(price_tuples_from_transactions)
        first_price = prices.last()
        if isinstance(first_price, PriceHistory):
            if first_price.date > from_date:
                day_before_first_date = first_price.date - datetime.timedelta(days=1)
                additional_dates = utils.generate_date_intervals(
                    from_date, day_before_first_date, output_period=output_period
                )
                price_tuples.extend(
                    [(date, decimal.Decimal("0")) for date in additional_dates]
                )

        price_tuples.sort(key=lambda x: x[0], reverse=True)
        return multiply_at_matching_dates(price_tuples, quantity_history)

    def value_history_in_account_currency(
        self,
        from_date: datetime.date,
        to_date: Optional[datetime.date] = None,
        output_period: datetime.timedelta = datetime.timedelta(days=1),
    ):
        to_currency = self.account.currency
        from_currency = self.asset.currency
        if to_date is None:
            to_date = datetime.date.today()

        value_history = self.value_history(from_date, to_date, output_period)
        if to_currency == from_currency:
            return value_history

        exchange_rate_tuples = get_exchange_rates(
            from_date, to_date, from_currency, to_currency
        )

        # If no latest exchange rate, reuse the last one.
        if len(exchange_rate_tuples) > 0 and exchange_rate_tuples[0][0] < to_date:
            last_day = exchange_rate_tuples[0][0] + datetime.timedelta(days=1)

            additional_dates = utils.generate_date_intervals(
                last_day, to_date, output_period=output_period
            )
            exchange_rate_tuples.extend(
                [(date, exchange_rate_tuples[0][1]) for date in additional_dates]
            )
        exchange_rate_tuples.sort(key=lambda x: x[0], reverse=True)
        return multiply_at_matching_dates(value_history, exchange_rate_tuples)


@functools.lru_cache(maxsize=10)
def get_exchange_rates(from_date, to_date, from_currency, to_currency):
    exchange_rates = CurrencyExchangeRate.objects.order_by("-date").filter(
        date__gte=from_date,
        date__lte=to_date,
        from_currency=from_currency,
        to_currency=to_currency,
    )
    exchange_rate_tuples = [(rate.date, rate.value) for rate in exchange_rates]
    return exchange_rate_tuples


class Transaction(models.Model):
    executed_at = models.DateTimeField()
    position = models.ForeignKey(
        Position, related_name="transactions", on_delete=models.CASCADE
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    price = models.DecimalField(max_digits=12, decimal_places=5)

    transaction_costs = models.DecimalField(max_digits=12, decimal_places=5, null=True)

    # The currency is stored with the asset.
    local_value = models.DecimalField(max_digits=12, decimal_places=5)
    # The main currency is stored within the account.
    value_in_account_currency = models.DecimalField(max_digits=12, decimal_places=5)

    # This is value + transaction_costs + other costs, e.g. taxes on some exchanges.
    total_in_account_currency = models.DecimalField(max_digits=12, decimal_places=5)
    # value_in_account_currency + transaction cost == total cost.

    order_id = models.CharField(max_length=200, null=True, blank=True)

    last_modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"<Transaction id: {self.pk} executed_at: {self.executed_at}, position: {self.position}>"

    class Meta:
        ordering = ["-executed_at"]


class EventType(models.IntegerChoices):
    DEPOSIT = 1, _("DEPOSIT")
    WITHDRAWAL = 2, _("WITHDRAWAL")
    DIVIDEND = 3, _("DIVIDEND")
    # TODO: add some cool crypto related ones :).
    # Another could be split or merge.


_POSITION_REQUIRED_EVENT_TYPES = (EventType.DIVIDEND,)


class AccountEvent(models.Model):
    account = models.ForeignKey(
        Account, related_name="events", on_delete=models.CASCADE
    )
    executed_at = models.DateTimeField()

    event_type = models.IntegerField(choices=EventType.choices)

    last_modified = models.DateTimeField(auto_now=True)
    position = models.ForeignKey(
        Position,
        on_delete=models.SET_NULL,
        related_name="events",
        null=True,
        blank=True,
    )

    amount = models.DecimalField(max_digits=18, decimal_places=6)

    def clean(self):
        if self.event_type in _POSITION_REQUIRED_EVENT_TYPES:
            if not self.position:
                raise ValidationError(f"Position is required for: {self.event_type}")
        else:
            if self.position:
                raise ValidationError(f"Position can't be set for: {self.event_type}")

    class Meta:
        ordering = ["-executed_at"]


class CurrencyExchangeRate(models.Model):
    from_currency = models.IntegerField(choices=Currency.choices)
    to_currency = models.IntegerField(choices=Currency.choices)
    date = models.DateField()
    value = models.DecimalField(max_digits=12, decimal_places=5)

    class Meta:
        ordering = ["-date"]


class PriceHistory(models.Model):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)
    value = models.DecimalField(max_digits=12, decimal_places=5)
    date = models.DateField()

    class Meta:
        ordering = ["-date"]
