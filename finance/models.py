from django.contrib.auth.models import User
from django.db import models

from django.utils.translation import gettext_lazy as _


class Currency(models.IntegerChoices):
    EURO = 1, _("EUR")
    GBP = 2, _("GBP")
    USD = 3, _("USD")


class Account(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    currency = models.IntegerField(choices=Currency.choices, default=Currency.EURO)
    nickname = models.CharField(max_length=200)
    description = models.TextField()


class Exchange(models.Model):
    name = models.CharField(max_length=200)


class ExchangeIDType(models.IntegerChoices):
    CODE = 1, _("CODE")
    # Operating MIC vs Segment MIC.
    # https://www.tradinghours.com/mic
    MIC = 2, _("MIC")
    SEGMENT_MIC = 3, _("SEGMENT MIC")

    # https://www.iso20022.org/market-identifier-codes


class ExchangeIdentifier(models.Model):
    exchange = models.ForeignKey(
        Exchange, on_delete=models.CASCADE, related_name="identifiers"
    )
    id_type = models.IntegerField(
        choices=ExchangeIDType.choices,
    )
    value = models.CharField(max_length=20)


class Security(models.Model):
    isin = models.CharField(max_length=30)
    symbol = models.CharField(max_length=30)
    exchange = models.ForeignKey(
        Exchange, on_delete=models.CASCADE, related_name="securities"
    )
    currency = models.IntegerField(choices=Currency.choices, default=Currency.USD)
    country = models.CharField(max_length=200, null=True)
    # TODO: add securites type.


class Position(models.Model):
    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="positions"
    )
    security = models.ForeignKey(
        Security, on_delete=models.CASCADE, related_name="positions"
    )


class Transaction(models.Model):
    executed_at = models.DateTimeField()
    position = models.ForeignKey(
        Position, related_name="transactions", on_delete=models.CASCADE
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    price = models.DecimalField(max_digits=12, decimal_places=5)
    transaction_costs = models.DecimalField(max_digits=12, decimal_places=5)

    # The currency is stored with the security.
    local_value = models.DecimalField(max_digits=12, decimal_places=5)
    # The main currency is stored within the account.
    value_in_account_currency = models.DecimalField(max_digits=12, decimal_places=5)

    # value_in_account_currency + transaction cost == total cost.

    order_id = models.CharField(max_length=200, null=True)

    last_modified = models.DateTimeField(auto_now=True)


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
