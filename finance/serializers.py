from typing_extensions import Required
from rest_framework import serializers
from rest_framework.request import Request

from django.db.models import QuerySet
import datetime
from typing import Any, TypeVar
from django.contrib.auth.models import User

from finance import models, stock_exchanges
from finance import gains
from finance.models import (
    Account,
    AccountEvent,
    AssetType,
    Currency,
    CurrencyExchangeRate,
    EventType,
    Exchange,
    ImportStatus,
    Position,
    PriceHistory,
    Asset,
    Transaction,
    Lot,
    TransactionImport,
    TransactionImportRecord,
    ImportIssueType,
    IntegrationType,
    EventImportRecord,
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


class ChoicesToStringField(serializers.CharField):
    choices_class = None
    name = ""

    def to_representation(self, value) -> str:
        return self.choices_class(value).label

    def to_internal_value(self, value: str):
        try:
            return self.choices_class[value.upper()]
        except KeyError:
            raise serializers.ValidationError(f"Invalid value to represent {self.name}")


class CurrencyField(ChoicesToStringField):
    choices_class = Currency
    name = "currency"


class AssetTypeField(ChoicesToStringField):
    choices_class = AssetType
    name = "asset type"


class EventTypeField(ChoicesToStringField):
    choices_class = EventType
    name = "event type"


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
            "tracked",
        ]


class ImportStatusField(ChoicesToStringField):
    choices_class = ImportStatus
    name = "import status"


class ImportIssueTypeField(ChoicesToStringField):
    choices_class = ImportIssueType
    name = "import issue type"


class IntegrationTypeField(ChoicesToStringField):
    choices_class = IntegrationType
    name = "integration type"


class TransactionImportRecordSerializer(
    serializers.ModelSerializer[TransactionImportRecord]
):
    issue_type = ImportIssueTypeField(required=False)

    class Meta:
        model = TransactionImportRecord
        fields = [
            "id",
            "transaction",
            "raw_record",
            "created_new",
            "successful",
            "issue_type",
            "raw_issue",
        ]


class TransactionImportEventRecordSerializer(
    serializers.ModelSerializer[EventImportRecord]
):
    issue_type = ImportIssueTypeField(required=False)
    event_type = serializers.SerializerMethodField()

    class Meta:
        model = EventImportRecord
        fields = [
            "id",
            "event",
            "event_type",
            "transaction",
            "raw_record",
            "created_new",
            "successful",
            "issue_type",
            "raw_issue",
        ]

    def get_event_type(self, obj):
        if obj.event:
            value = obj.event.event_type
            return EventType(value).label
        else:
            return ""


class EmbeddedTransactionImportRecordSerializer(
    serializers.ModelSerializer[TransactionImportRecord]
):
    issue_type = ImportIssueTypeField(required=False)

    integration = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()

    class Meta:
        model = TransactionImportRecord
        fields = [
            "id",
            "transaction",
            "raw_record",
            "created_new",
            "successful",
            "issue_type",
            "raw_issue",
            "transaction_import",
            "created_at",
            "integration",
        ]

    def get_integration(self, obj):
        value = obj.transaction_import.integration
        return IntegrationType(value).label

    def get_created_at(self, obj):
        return obj.transaction_import.created_at


class EmbeddedEventImportRecordSerializer(
    serializers.ModelSerializer[TransactionImportRecord]
):
    issue_type = ImportIssueTypeField(required=False)

    integration = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()
    event_type = serializers.SerializerMethodField()

    class Meta:
        model = EventImportRecord
        fields = [
            "id",
            "transaction",
            "event",
            "event_type",
            "raw_record",
            "created_new",
            "successful",
            "issue_type",
            "raw_issue",
            "transaction_import",
            "created_at",
            "integration",
        ]

    def get_integration(self, obj):
        value = obj.transaction_import.integration
        return IntegrationType(value).label

    def get_created_at(self, obj):
        return obj.transaction_import.created_at

    def get_event_type(self, obj):
        if obj.event:
            value = obj.event.event_type
            return EventType(value).label
        return ""


class TransactionImportSerializer(serializers.ModelSerializer[TransactionImport]):

    records = TransactionImportRecordSerializer(many=True)
    event_records = TransactionImportEventRecordSerializer(many=True)
    status = ImportStatusField()
    integration = IntegrationTypeField()

    class Meta:
        model = TransactionImport
        fields = [
            "id",
            "account",
            "created_at",
            "status",
            "integration",
            "records",
            "event_records",
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


class SimpleTransactionImportSerializer(serializers.ModelSerializer[TransactionImport]):
    status = ImportStatusField()
    integration = IntegrationTypeField()

    class Meta:
        model = TransactionImport
        fields = [
            "id",
            "account",
            "created_at",
            "status",
            "integration",
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


class PositionSerializer(serializers.ModelSerializer[Position]):
    asset = AssetSerializer()
    latest_price = serializers.DecimalField(max_digits=20, decimal_places=10)
    latest_exchange_rate = serializers.DecimalField(max_digits=20, decimal_places=10)
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
    quantity = serializers.DecimalField(max_digits=20, decimal_places=10)
    price = serializers.DecimalField(max_digits=20, decimal_places=10)
    transaction_costs = serializers.DecimalField(max_digits=20, decimal_places=10)
    local_value = serializers.DecimalField(max_digits=20, decimal_places=10)

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
            "transaction",
        ]


class TransactionSerializer(serializers.ModelSerializer[Transaction]):
    quantity = serializers.DecimalField(max_digits=20, decimal_places=10)
    price = serializers.DecimalField(max_digits=20, decimal_places=10)
    position = EmbeddedPositionSerializer()
    transaction_costs = serializers.DecimalField(max_digits=20, decimal_places=10)
    local_value = serializers.DecimalField(max_digits=20, decimal_places=10)
    value_in_account_currency = serializers.DecimalField(
        max_digits=20, decimal_places=10
    )
    total_in_account_currency = serializers.DecimalField(
        max_digits=20, decimal_places=10
    )
    records = EmbeddedTransactionImportRecordSerializer(many=True)
    event_records = EmbeddedEventImportRecordSerializer(many=True)

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
            "records",
            "event_records",
            "events",
        ]


class AddTransactionKnownAssetSerializer(serializers.ModelSerializer[Transaction]):
    quantity = serializers.DecimalField(max_digits=20, decimal_places=10)
    price = serializers.DecimalField(max_digits=20, decimal_places=10, required=False)

    transaction_costs = serializers.DecimalField(max_digits=20, decimal_places=10)
    local_value = serializers.DecimalField(max_digits=20, decimal_places=10, required=False)
    value_in_account_currency = serializers.DecimalField(
        max_digits=20, decimal_places=10
    )
    total_in_account_currency = serializers.DecimalField(
        max_digits=20, decimal_places=10
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
    quantity = serializers.DecimalField(max_digits=20, decimal_places=10)
    price = serializers.DecimalField(max_digits=20, decimal_places=10, required=False)

    transaction_costs = serializers.DecimalField(max_digits=20, decimal_places=10)
    local_value = serializers.DecimalField(max_digits=20, decimal_places=10, required=False)
    value_in_account_currency = serializers.DecimalField(
        max_digits=20, decimal_places=10
    )
    total_in_account_currency = serializers.DecimalField(
        max_digits=20, decimal_places=10
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
        if value == stock_exchanges.OTHER_OR_NA_EXCHANGE_NAME:
            return value
        if not models.Exchange.objects.filter(name=value).exists():
            raise serializers.ValidationError(
                f"There is no exchange with name: '{value}'"
            )
        return value

    def validate(self, data):
        errors = {}
        if data["asset_type"] == models.AssetType.CRYPTO:
            if data["currency"] != models.Currency.USD:
                errors[
                    "currency"
                ] = "Invalid currency for a crypto asset, only 'USD' is supported."
            if data["exchange"] != stock_exchanges.OTHER_OR_NA_EXCHANGE_NAME:
                errors[
                    "exchange"
                ] = "Invalid exchange for a crypto asset, only 'Other / NA' is supported."
        if errors:
            raise serializers.ValidationError(errors)
        return data

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
    quantity = serializers.DecimalField(max_digits=20, decimal_places=10)
    price = serializers.DecimalField(max_digits=20, decimal_places=10)

    transaction_costs = serializers.DecimalField(max_digits=20, decimal_places=10)
    local_value = serializers.DecimalField(max_digits=20, decimal_places=10)
    value_in_account_currency = serializers.DecimalField(
        max_digits=20, decimal_places=10
    )
    total_in_account_currency = serializers.DecimalField(
        max_digits=20, decimal_places=10
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
    events_count = serializers.IntegerField()
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
            "events_count",
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
    events_count = serializers.IntegerField()
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
            "events_count",
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
    transaction = RelatedPkField(model=models.Transaction, required=False)
    event_records = EmbeddedEventImportRecordSerializer(many=True, required=False)
    transaction_quantity = serializers.DecimalField(
        max_digits=20, decimal_places=10, required=False
    )

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
            "transaction",
            "event_records",
            "transaction_quantity",
        ]

    def get_extra_kwargs(self):
        kwargs = super().get_extra_kwargs()
        kwargs["account"] = kwargs.get("account", {})
        kwargs["account"]["queryset"] = self.get_account_queryset()
        kwargs["position"] = kwargs.get("position", {})
        kwargs["position"]["queryset"] = self.get_position_queryset()
        kwargs["transaction"] = kwargs.get("transaction", {})
        kwargs["transaction"]["queryset"] = self.get_transaction_queryset()
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

    def get_transaction_queryset(self) -> QuerySet[models.Transaction]:
        request = self.context.get("request")
        assert isinstance(request, Request)
        assert isinstance(request.user, User)
        return models.Transaction.objects.filter(position__account__user=request.user)

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

    def validate_transaction(self, value):
        if value is None:
            return value
        if not models.Transaction.objects.filter(
            position__account__user=self.context["request"].user, pk=value.pk
        ).exists():
            raise serializers.ValidationError(
                f"User doesn't have a transaction with id: '{value.pk}'"
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
        if data["event_type"] in models.EVENT_TYPES_WITH_POSITION:
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


class AddCryptoIncomeEventSerializer(serializers.ModelSerializer[AccountEvent]):
    event_type = EventTypeField()
    account = RelatedPkField(model=models.Account)

    quantity = serializers.DecimalField(max_digits=20, decimal_places=10, min_value=0)
    price = serializers.DecimalField(max_digits=20, decimal_places=10, min_value=0)

    local_value = serializers.DecimalField(max_digits=20, decimal_places=10, min_value=0)
    value_in_account_currency = serializers.DecimalField(
        max_digits=20, decimal_places=10, min_value=0
    )
    symbol = serializers.CharField()

    class Meta:
        model = AccountEvent
        fields = [
            "id",
            "event_type",
            "account",
            "quantity",
            "price",
            "local_value",
            "value_in_account_currency",
            "symbol",
            "executed_at",
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
        if data["event_type"] not in models.EVENT_TYPES_FOR_CRYPTO_INCOME:
            raise serializers.ValidationError(
                {"event_type": "Unsupported event_type specified."}
            )

        return data


class LotSerializer(serializers.ModelSerializer[Lot]):
    class Meta:
        model = Lot
        fields = "__all__"


class DegiroUploadSerializer(serializers.Serializer[Any]):
    account = serializers.IntegerField()
    transaction_file = serializers.FileField()
    import_all_assets = serializers.BooleanField(default=True)


class BinanceUploadSerializer(serializers.Serializer[Any]):
    account = serializers.IntegerField()
    transaction_file = serializers.FileField()


class AssetSearchSerializer(serializers.Serializer[Any]):
    identifier = serializers.CharField(required=True)