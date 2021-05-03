from finance.models import Position, Security, Exchange
from rest_framework import serializers


class ExchangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exchange
        fields = ["id", "name"]


class SecuritySerializer(serializers.ModelSerializer):
    exchange = ExchangeSerializer()

    class Meta:
        model = Security
        fields = ["id", "isin", "symbol", "name", "exchange", "currency", "country"]


class PositionSerializer(serializers.ModelSerializer):
    security = SecuritySerializer()

    class Meta:
        model = Position
        fields = ["id", "account", "security", "quantity"]
