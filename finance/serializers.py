from rest_framework import serializers

from finance import models
from finance.models import (
    Account,
    CurrencyExchangeRate,
    Exchange,
    Position,
    PriceHistory,
    Security,
    Transaction,
)
import datetime
from typing import Any


class ExchangeSerializer(serializers.ModelSerializer[Exchange]):
    class Meta:
        model = Exchange
        fields = ["id", "name"]


class CurrencyField(serializers.IntegerField):
    def to_representation(self, value):
        return models.currency_string_from_enum(value)


class SecuritySerializer(serializers.ModelSerializer[Security]):
    exchange = ExchangeSerializer()
    currency = CurrencyField()

    class Meta:
        model = Security
        fields = ["id", "isin", "symbol", "name", "exchange", "currency", "country"]


class PositionSerializer(serializers.ModelSerializer[Position]):
    security = SecuritySerializer()
    latest_price = serializers.DecimalField(max_digits=20, decimal_places=2)
    latest_exchange_rate = serializers.DecimalField(max_digits=20, decimal_places=8)
    latest_price_date = serializers.DateField()

    class Meta:
        model = Position
        fields = [
            "id",
            "account",
            "security",
            "quantity",
            "latest_price",
            "latest_price_date",
            "latest_exchange_rate",
        ]


class EmbeddedPositionSerializer(serializers.ModelSerializer[Position]):
    security = SecuritySerializer()

    class Meta:
        model = Position
        fields = [
            "id",
            "account",
            "security",
            "quantity",
        ]


class EmbeddedTransactionSerializer(serializers.ModelSerializer[Transaction]):
    quantity = serializers.DecimalField(max_digits=20, decimal_places=2)
    price = serializers.DecimalField(max_digits=20, decimal_places=2)
    transaction_costs = serializers.DecimalField(max_digits=20, decimal_places=2)
    local_value = serializers.DecimalField(max_digits=20, decimal_places=2)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "executed_at",
            "quantity",
            "price",
            "transaction_costs",
            "order_id",
            "local_value",
        ]


class TransactionSerializer(serializers.ModelSerializer[Transaction]):
    quantity = serializers.DecimalField(max_digits=20, decimal_places=2)
    price = serializers.DecimalField(max_digits=20, decimal_places=2)
    position = EmbeddedPositionSerializer()
    transaction_costs = serializers.DecimalField(max_digits=20, decimal_places=2)
    local_value = serializers.DecimalField(max_digits=20, decimal_places=2)
    value_in_account_currency = serializers.DecimalField(
        max_digits=20, decimal_places=2
    )
    total_in_account_currency = serializers.DecimalField(
        max_digits=20, decimal_places=2
    )

    class Meta:
        model = Transaction
        fields = [
            "id",
            "executed_at",
            "last_modified",
            "position",
            "quantity",
            "price",
            "transaction_costs",
            "local_value",
            "value_in_account_currency",
            "total_in_account_currency",
            "order_id",
        ]


class PositionWithQuantitiesSerializer(serializers.ModelSerializer[Position]):
    security = SecuritySerializer()
    quantities = serializers.SerializerMethodField()
    values = serializers.SerializerMethodField()
    values_account_currency = serializers.SerializerMethodField()
    transactions = EmbeddedTransactionSerializer(many=True)

    class Meta:
        model = Position
        fields = [
            "id",
            "account",
            "security",
            "quantity",
            "quantities",
            "transactions",
            "values",
            "values_account_currency",
        ]

    def get_quantities(self, obj):
        from_date = self.context["from_date"]
        to_date = self.context["to_date"]
        return obj.quantity_history(
            from_date=from_date,
            to_date=to_date,
            output_period=datetime.timedelta(days=1),
        )

    def get_values(self, obj):
        from_date = self.context["from_date"]
        to_date = self.context["to_date"]
        return obj.value_history(
            from_date, to_date, output_period=datetime.timedelta(days=1)
        )

    def get_values_account_currency(self, obj):
        from_date = self.context["from_date"]
        to_date = self.context["to_date"]
        return obj.value_history_in_account_currency(from_date, to_date)


class CurrencyExchangeRateSerializer(serializers.ModelSerializer[CurrencyExchangeRate]):
    class Meta:
        model = CurrencyExchangeRate
        fields = ["date", "value"]


class SecurityPriceHistorySerializer(serializers.ModelSerializer[PriceHistory]):
    class Meta:
        model = PriceHistory
        fields = ["date", "value"]


class FromToDatesSerializer(serializers.Serializer[Any]):
    from_date = serializers.DateField(required=False)
    to_date = serializers.DateField(required=False)


class CurrencyQuerySerializer(FromToDatesSerializer):
    from_currency = serializers.CharField()
    to_currency = serializers.CharField()

    def validate_from_currency(self, value):
        try:
            return models.currency_enum_from_string(value)
        except ValueError:
            raise serializers.ValidationError(f"{value} is not a valid currency symbol")

    def validate_to_currency(self, value):
        try:
            return models.currency_enum_from_string(value)
        except ValueError:
            raise serializers.ValidationError(f"{value} is not a valid currency symbol")


class AccountSerializer(serializers.ModelSerializer[Account]):

    positions_count = serializers.IntegerField()
    transactions_count = serializers.IntegerField()
    currency = CurrencyField()

    class Meta:
        model = Account
        fields = [
            "id",
            "currency",
            "nickname",
            "description",
            "balance",
            "last_modified",
            "positions_count",
            "transactions_count",
        ]


class AccountWithValuesSerializer(serializers.ModelSerializer[Account]):

    positions_count = serializers.IntegerField()
    transactions_count = serializers.IntegerField()
    currency = CurrencyField()
    values = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            "id",
            "currency",
            "nickname",
            "description",
            "balance",
            "last_modified",
            "positions_count",
            "transactions_count",
            "values",
        ]

    def get_values(self, obj):
        from_date = self.context["from_date"]
        to_date = self.context["to_date"]

        return obj.value_history_per_position(from_date, to_date)