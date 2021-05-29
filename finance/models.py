import datetime

import pytz
from django.contrib.auth.models import User
from django.db import models
from django.utils.translation import gettext_lazy as _
from typing import Optional
from finance import utils


def currency_enum_from_string(currency: str) -> "Currency":
    if currency == "USD":
        return Currency.USD
    elif currency == "EUR":
        return Currency.EURO
    elif currency == "GBX":
        return Currency.GBX
    else:
        raise ValueError("Unsupported currency")


def currency_string_from_enum(currency: "Currency") -> str:
    if currency == Currency.USD:
        return "USD"
    elif currency == Currency.EURO:
        return "EUR"
    elif currency == Currency.GBX:
        return "GBX"
    else:
        raise ValueError("Unsupported currency")


class Currency(models.IntegerChoices):
    EURO = 1, _("EUR")
    GBP = 2, _("GBP")
    USD = 3, _("USD")
    GBX = 4, _("GBX")


class Account(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    currency = models.IntegerField(choices=Currency.choices, default=Currency.EURO)
    nickname = models.CharField(max_length=200)
    description = models.TextField()

    balance = models.DecimalField(max_digits=12, decimal_places=5, default=0)
    last_modified = models.DateTimeField(auto_now=True, null=True)

    def __str__(self):
        return (
            f"<Account user: {self.user}, nickname: '{self.nickname}', "
            f"currency: {self.get_currency_display()}>"
        )


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


class Security(models.Model):
    isin = models.CharField(max_length=30)
    symbol = models.CharField(max_length=30)
    name = models.CharField(max_length=200)
    exchange = models.ForeignKey(
        Exchange, on_delete=models.CASCADE, related_name="securities"
    )
    currency = models.IntegerField(choices=Currency.choices, default=Currency.USD)
    country = models.CharField(max_length=200, null=True)
    # TODO: add securites type.

    class Meta:
        unique_together = [["isin", "exchange"]]

    def __str__(self):
        return (
            f"<Security exchange: {self.exchange.name}, isin: "
            f"{self.isin}, symbol: {self.symbol}, name: {self.name}, "
            f"currency: {self.get_currency_display()}, country: {self.country}>"
        )


class Position(models.Model):
    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="positions"
    )
    security = models.ForeignKey(
        Security, on_delete=models.CASCADE, related_name="positions"
    )

    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    last_modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"<Position account: {self.account}, " f"security: {self.security}>"

    def quantity_history(
        self, from_date: datetime.date, to_date : Optional[datetime.date]=None, output_period=datetime.timedelta(days=1)
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
    def value_history(
        self,
        quantity_history,
        from_date,
        to_date=None,
        output_period=datetime.timedelta(days=1),
    ):
        prices = self.security.pricehistory_set.order_by("-date").filter(
            date__gte=from_date, date__lte=to_date
        )
        price_tuples = [(price.date, price.value) for price in prices]
        print(price_tuples[0][0], quantity_history[0][0])
        value_history_records = []
        for price, quantity in zip(price_tuples, quantity_history):
            if price[0] != quantity[0]:
                print(price, quantity)

    def value_history_in_account_currency(
        self,
        value_history,
        from_date,
        to_date=None,
        output_period=datetime.timedelta(days=1),
    ):
        pass


class Transaction(models.Model):
    executed_at = models.DateTimeField()
    position = models.ForeignKey(
        Position, related_name="transactions", on_delete=models.CASCADE
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    price = models.DecimalField(max_digits=12, decimal_places=5)
    transaction_costs = models.DecimalField(max_digits=12, decimal_places=5, null=True)

    # The currency is stored with the security.
    local_value = models.DecimalField(max_digits=12, decimal_places=5)
    # The main currency is stored within the account.
    value_in_account_currency = models.DecimalField(max_digits=12, decimal_places=5)

    # This is value + transaction_costs + other costs, e.g. taxes on some exchanges.
    total_in_account_currency = models.DecimalField(max_digits=12, decimal_places=5)
    # value_in_account_currency + transaction cost == total cost.

    order_id = models.CharField(max_length=200, null=True)

    last_modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return (
            f"<Transaction executed_at: {self.executed_at}, position: {self.position}>"
        )

    class Meta:
        ordering = ["-executed_at"]


class AccountEvent(models.Model):
    account = models.ForeignKey(
        Account, related_name="events", on_delete=models.CASCADE
    )
    executed_at = models.DateTimeField()

    last_modified = models.DateTimeField(auto_now=True)
    position = models.ForeignKey(
        Position,
        on_delete=models.SET_NULL,
        related_name="events",
        null=True,
        blank=True,
    )


class CurrencyExchangeRate(models.Model):
    from_currency = models.IntegerField(choices=Currency.choices)
    to_currency = models.IntegerField(choices=Currency.choices)
    date = models.DateField()
    value = models.DecimalField(max_digits=12, decimal_places=5)

    class Meta:
        ordering = ["-date"]


class PriceHistory(models.Model):
    security = models.ForeignKey(Security, on_delete=models.CASCADE)
    value = models.DecimalField(max_digits=12, decimal_places=5)
    date = models.DateField()

    class Meta:
        ordering = ["-date"]
