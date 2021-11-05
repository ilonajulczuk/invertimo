from rest_framework import serializers
from rest_framework.request import Request

from django.db.models import QuerySet
import datetime
from typing import Any
from django.contrib.auth.models import User

from finance import models
from finance import exchanges, gains
from finance.models import (
    Account,
    AccountEvent,
    CurrencyExchangeRate,
    Exchange,
    Position,
    PriceHistory,
    Asset,
    Transaction,
)


class ExchangeSerializer(serializers.ModelSerializer[Exchange]):
    class Meta:
        model = Exchange
        fields = ["id", "name"]


class RelatedPkField(serializers.IntegerField):
    def __init__(self, model, **kwargs):
        self._model = model
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        if data:
            try:
                return self._model.objects.get(pk=data)
            except (self._model.DoesNotExist, TypeError):
                raise serializers.ValidationError(
                    f"User doesn't have a account with id: '{data}'"
                )

    def to_representation(self, value):
        if value:
            return value.pk


class CurrencyField(serializers.CharField):
    def to_representation(self, value):
        return models.currency_string_from_enum(value)

    def to_internal_value(self, value):
        try:
            return models.currency_enum_from_string(value)
        except ValueError:
            raise serializers.ValidationError(f"Invalid value to represent currency")


class AssetTypeField(serializers.IntegerField):
    def to_representation(self, value):
        return models.asset_type_string_from_enum(value)

    def to_internal_value(self, value):
        try:
            return models.asset_type_enum_from_string(value)
        except ValueError:
            raise serializers.ValidationError(f"Invalid value to represent asset type")


class EventTypeField(serializers.CharField):
    def to_representation(self, value):
        return models.event_type_string_from_enum(value)

    def to_internal_value(self, value):
        try:
            return models.event_type_enum_from_string(value)
        except ValueError:
            raise serializers.ValidationError(f"Invalid value to represent event type")


class AssetSerializer(serializers.ModelSerializer[Asset]):
    exchange = ExchangeSerializer()
    currency = CurrencyField()
    asset_type = AssetTypeField()

    class Meta:
        model = Asset
        fields = [
            "id",
            "isin",
            "symbol",
            "name",
            "exchange",
            "currency",
            "country",
            "asset_type",
        ]


class PositionSerializer(serializers.ModelSerializer[Position]):
    asset = AssetSerializer()
    latest_price = serializers.DecimalField(max_digits=20, decimal_places=2)
    latest_exchange_rate = serializers.DecimalField(max_digits=20, decimal_places=8)
    latest_price_date = serializers.DateField()

    class Meta:
        model = Position
        fields = [
            "id",
            "account",
            "asset",
            "quantity",
            "latest_price",
            "latest_price_date",
            "latest_exchange_rate",
            "realized_gain",
            "cost_basis",
        ]


class EmbeddedPositionSerializer(serializers.ModelSerializer[Position]):
    asset = AssetSerializer()

    class Meta:
        model = Position
        fields = [
            "id",
            "account",
            "asset",
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
            "value_in_account_currency",
        ]


class EmbeddedAccountEventSerializer(serializers.ModelSerializer[AccountEvent]):
    event_type = EventTypeField()

    class Meta:
        model = AccountEvent
        fields = [
            "id",
            "event_type",
            "executed_at",
            "amount",
            "withheld_taxes",
            "account",
        ]


class TransactionSerializer(serializers.ModelSerializer[Transaction]):
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2)
    price = serializers.DecimalField(max_digits=12, decimal_places=5)
    position = EmbeddedPositionSerializer()
    transaction_costs = serializers.DecimalField(max_digits=12, decimal_places=5)
    local_value = serializers.DecimalField(max_digits=12, decimal_places=5)
    value_in_account_currency = serializers.DecimalField(
        max_digits=12, decimal_places=5
    )
    total_in_account_currency = serializers.DecimalField(
        max_digits=12, decimal_places=5
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


class AddTransactionKnownAssetSerializer(serializers.ModelSerializer[Transaction]):
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2)
    price = serializers.DecimalField(max_digits=12, decimal_places=5)

    transaction_costs = serializers.DecimalField(max_digits=12, decimal_places=5)
    local_value = serializers.DecimalField(max_digits=12, decimal_places=5)
    value_in_account_currency = serializers.DecimalField(
        max_digits=12, decimal_places=5
    )
    total_in_account_currency = serializers.DecimalField(
        max_digits=12, decimal_places=5
    )
    account = serializers.IntegerField()
    asset = serializers.IntegerField()

    def validate_account(self, value):
        if not models.Account.objects.filter(
            user=self.context["request"].user, pk=value
        ).exists():
            raise serializers.ValidationError(
                f"User doesn't have account with id: '{value}'"
            )
        return value

    def validate_asset(self, value):
        if not models.Asset.objects.filter(pk=value).exists():
            raise serializers.ValidationError(f"There is no asset with id: '{value}'")
        return value

    class Meta:
        model = Transaction
        fields = [
            "id",
            "executed_at",
            "account",
            "asset",
            "quantity",
            "price",
            "transaction_costs",
            "local_value",
            "value_in_account_currency",
            "total_in_account_currency",
            "order_id",
        ]


class AddTransactionNewAssetSerializer(serializers.ModelSerializer[Transaction]):
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2)
    price = serializers.DecimalField(max_digits=12, decimal_places=5)

    transaction_costs = serializers.DecimalField(max_digits=12, decimal_places=5)
    local_value = serializers.DecimalField(max_digits=12, decimal_places=5)
    value_in_account_currency = serializers.DecimalField(
        max_digits=12, decimal_places=5
    )
    total_in_account_currency = serializers.DecimalField(
        max_digits=12, decimal_places=5
    )
    account = serializers.IntegerField()

    symbol = serializers.CharField()
    currency = CurrencyField()

    # Name of existing exchange or a special name for NA.
    exchange = serializers.CharField()
    asset_type = AssetTypeField()

    def validate_account(self, value):
        if not models.Account.objects.filter(
            user=self.context["request"].user, pk=value
        ).exists():
            raise serializers.ValidationError(
                f"User doesn't have account with id: '{value}'"
            )
        return value

    def validate_exchange(self, value):
        if value == exchanges.OTHER_OR_NA_EXCHANGE_NAME:
            return value
        if not models.Exchange.objects.filter(name=value).exists():
            raise serializers.ValidationError(
                f"There is no exchange with name: '{value}'"
            )
        return value

    class Meta:
        model = Transaction
        fields = [
            "id",
            "executed_at",
            "account",
            "symbol",
            "currency",
            "exchange",
            "asset_type",
            "quantity",
            "price",
            "transaction_costs",
            "local_value",
            "value_in_account_currency",
            "total_in_account_currency",
            "order_id",
        ]


class CorrectTransactionSerializer(serializers.ModelSerializer[Transaction]):
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2)
    price = serializers.DecimalField(max_digits=12, decimal_places=5)

    transaction_costs = serializers.DecimalField(max_digits=12, decimal_places=5)
    local_value = serializers.DecimalField(max_digits=12, decimal_places=5)
    value_in_account_currency = serializers.DecimalField(
        max_digits=12, decimal_places=5
    )
    total_in_account_currency = serializers.DecimalField(
        max_digits=12, decimal_places=5
    )

    class Meta:
        model = Transaction
        fields = [
            "id",
            "executed_at",
            "quantity",
            "price",
            "transaction_costs",
            "local_value",
            "value_in_account_currency",
            "total_in_account_currency",
        ]


class PositionWithQuantitiesSerializer(serializers.ModelSerializer[Position]):
    asset = AssetSerializer()
    quantities = serializers.SerializerMethodField()
    values = serializers.SerializerMethodField()
    values_account_currency = serializers.SerializerMethodField()
    transactions = EmbeddedTransactionSerializer(many=True)
    events = EmbeddedAccountEventSerializer(many=True)

    class Meta:
        model = Position
        fields = [
            "id",
            "account",
            "asset",
            "quantity",
            "quantities",
            "transactions",
            "events",
            "values",
            "values_account_currency",
            "realized_gain",
            "cost_basis",
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


class AssetPriceHistorySerializer(serializers.ModelSerializer[PriceHistory]):
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


class AccountEditSerializer(serializers.ModelSerializer[Account]):

    # Currency needs to be changed from string to enum.
    currency = CurrencyField()

    class Meta:
        model = Account
        fields = [
            "id",
            "currency",
            "nickname",
            "description",
        ]

    def validate_nickname(self, value):
        # If user was also included in the serializer then unique_together
        # constraint would be automatically evaluated, but
        # since user is not included in the serializer the validation is
        # done manually.
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            user = request.user
            if Account.objects.filter(user=user, nickname=value).count() > 0:
                if request.method == "POST":
                    # It's fine to have the name that already exists for update
                    # requests, e.g. with PUT method.
                    raise serializers.ValidationError(
                        f"User already has an account with name: '{value}'"
                    )
        return value


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


class AccountEventSerializer(serializers.ModelSerializer[AccountEvent]):
    event_type = EventTypeField()
    account = RelatedPkField(model=models.Account)
    position = RelatedPkField(model=models.Position)

    class Meta:
        model = AccountEvent
        fields = [
            "id",
            "event_type",
            "executed_at",
            "amount",
            "withheld_taxes",
            "account",
            "position",
        ]

    def get_extra_kwargs(self):
        kwargs = super().get_extra_kwargs()
        kwargs["account"] = kwargs.get("account", {})
        kwargs["account"]["queryset"] = self.get_account_queryset()
        return kwargs

    def get_account_queryset(self) -> QuerySet[models.Account]:
        request = self.context.get("request")
        assert isinstance(request, Request)
        assert isinstance(request.user, User)
        return models.Account.objects.filter(user=request.user)

    def get_position_queryset(self) -> QuerySet[models.Position]:
        request = self.context.get("request")
        assert isinstance(request, Request)
        assert isinstance(request.user, User)
        return models.Position.objects.filter(account__user=request.user)

    def validate_position(self, value):
        if value is None:
            return value
        if not models.Position.objects.filter(
            account__user=self.context["request"].user, pk=value.pk
        ).exists():
            raise serializers.ValidationError(
                f"User doesn't have a position with id: '{value.pk}'"
            )
        return value

    def validate_account(self, value):
        if value is None:
            raise serializers.ValidationError(f"Account can't be empty")
        if not models.Account.objects.filter(
            user=self.context["request"].user, pk=value.pk
        ).exists():
            raise serializers.ValidationError(
                f"User doesn't have a account with id: '{value.pk}'"
            )
        return value

    def validate(self, data):
        if data["event_type"] == models.EventType.WITHDRAWAL:
            if data["amount"] >= 0:
                raise serializers.ValidationError(
                    {"amount": "For withdrawal the amount needs to be negative"}
                )
        else:
            if data["amount"] < 0:
                raise serializers.ValidationError(
                    {"amount": "Amount can't be negative unless it's a withdrawal"}
                )
        if data["event_type"] == models.EventType.DIVIDEND:
            if data["position"] is None:
                raise serializers.ValidationError(
                    {"position": "Position can't be empty for dividend event"}
                )
        else:
            if data["position"] is not None:
                raise serializers.ValidationError(
                    {"position": "Position can't be set for this type of event"}
                )
        return data