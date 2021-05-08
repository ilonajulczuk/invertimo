from rest_framework import serializers

from finance import models
from finance.models import (Account, CurrencyExchangeRate, Exchange, Position,
                            PriceHistory, Security)


class ExchangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exchange
        fields = ["id", "name"]


class CurrencyField(serializers.IntegerField):
    def to_representation(self, value):
        return models.currency_string_from_enum(value)


class SecuritySerializer(serializers.ModelSerializer):
    exchange = ExchangeSerializer()
    currency = CurrencyField()

    class Meta:
        model = Security
        fields = ["id", "isin", "symbol", "name", "exchange", "currency", "country"]


class PositionSerializer(serializers.ModelSerializer):
    security = SecuritySerializer()

    class Meta:
        model = Position
        fields = ["id", "account", "security", "quantity"]


class PositionWithQuantitiesSerializer(serializers.ModelSerializer):
    security = SecuritySerializer()

    quantities = serializers.SerializerMethodField()

    class Meta:
        model = Position
        fields = ["id", "account", "security", "quantity", "quantities"]

    def get_quantities(self, obj):
        from_date = self.context["from_date"]
        to_date = self.context["to_date"]
        return obj.quantity_history(from_date=from_date, to_date=to_date)


class CurrencyExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CurrencyExchangeRate
        fields = ["date", "value"]


class SecurityPriceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceHistory
        fields = ["date", "value"]


class FromToDatesSerializer(serializers.Serializer):
    from_date = serializers.DateTimeField(required=False)
    to_date = serializers.DateTimeField(required=False)


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


class AccountSerializer(serializers.ModelSerializer):

    positions_count = serializers.IntegerField()
    transactions_count = serializers.IntegerField()
    currency = CurrencyField()
    class Meta:
        model = Account
        fields = ["id", "currency", "nickname", "description",
                  "balance", "last_modified", "positions_count", "transactions_count"]
