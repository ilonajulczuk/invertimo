from django.contrib.auth.models import User
from django.db import models

from django.utils.translation import gettext_lazy as _


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

    def __str__(self):
        return (
            f"<Position account: {self.account}, "
            f"security: {self.security}>"
        )

class Transaction(models.Model):
    executed_at = models.DateTimeField()
    position = models.ForeignKey(
        Position, related_name="transactions", on_delete=models.CASCADE
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    price = models.DecimalField(max_digits=12, decimal_places=5)
    transaction_costs = models.DecimalField(
        max_digits=12, decimal_places=5, null=True)

    # The currency is stored with the security.
    local_value = models.DecimalField(max_digits=12, decimal_places=5)
    # The main currency is stored within the account.
    value_in_account_currency = models.DecimalField(max_digits=12, decimal_places=5)

    # value_in_account_currency + transaction cost == total cost.

    order_id = models.CharField(max_length=200, null=True)

    last_modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return (
            f"<Transaction executed_at: {self.executed_at}, position: {self.position}>"
        )


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
