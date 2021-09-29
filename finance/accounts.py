import datetime
import decimal
from typing import Optional

from django.contrib.auth.models import User

from finance import exchanges, models

from django.db import transaction


class AccountRepository:
    def get(self, user: User, id: int) -> models.Account:
        return models.Account.objects.get(user=user, id=id)

    def create(
        self, nickname: str, currency: models.Currency, description: str, user: User
    ) -> models.Account:
        return models.Account.objects.create(
            user=user, nickname=nickname, description=description, currency=currency
        )

    @transaction.atomic
    def add_transaction(
        self,
        account,
        isin,
        exchange,
        executed_at,
        quantity,
        price,
        transaction_costs,
        local_value,
        value_in_account_currency,
        total_in_account_currency,
        order_id,
    ):
        position = self._get_or_create_position(account, isin, exchange)
        if not position:
            raise ValueError(
                f"Failed to create a position from a transaction record, isin: {isin}, exchange ref: {exchange}"
            )
        position.quantity_history.cache_clear()
        position.value_history.cache_clear()

        transaction, created = models.Transaction.objects.get_or_create(
            executed_at=executed_at,
            position=position,
            quantity=quantity,
            price=price,
            transaction_costs=transaction_costs,
            local_value=local_value,
            value_in_account_currency=value_in_account_currency,
            total_in_account_currency=total_in_account_currency,
            order_id=order_id,
        )
        if created:
            position.quantity += quantity
            position.save()
            account.balance += total_in_account_currency
            account.save()

        return transaction

    @transaction.atomic
    def add_transaction_known_asset(
        self,
        account,
        asset_id,
        executed_at,
        quantity,
        price,
        transaction_costs,
        local_value,
        value_in_account_currency,
        total_in_account_currency,
        order_id=None,
    ) -> models.Transaction:

        position = self._get_or_create_position_for_asset(account, asset_id)
        position.quantity_history.cache_clear()
        position.value_history.cache_clear()

        transaction, created = models.Transaction.objects.get_or_create(
            executed_at=executed_at,
            position=position,
            quantity=quantity,
            price=price,
            transaction_costs=transaction_costs,
            local_value=local_value,
            value_in_account_currency=value_in_account_currency,
            total_in_account_currency=total_in_account_currency,
            order_id=order_id,
        )
        if created:
            position.quantity += quantity
            position.save()
            account.balance += total_in_account_currency
            account.save()

        return transaction

    @transaction.atomic
    def add_transaction_custom_asset(
        self,
        account: models.Account,
        symbol: str,
        currency: models.Currency,
        exchange: str,
        asset_type: models.AssetType,
        executed_at: datetime.datetime,
        quantity: decimal.Decimal,
        price: decimal.Decimal,
        transaction_costs: decimal.Decimal,
        local_value: decimal.Decimal,
        value_in_account_currency: decimal.Decimal,
        total_in_account_currency: decimal.Decimal,
        order_id: Optional[str] = None,
    ) -> models.Transaction:

        exchange_entity = exchanges.ExchangeRepository().get_by_name(exchange)
        asset, _ = models.Asset.objects.get_or_create(
            symbol=symbol,
            exchange=exchange_entity,
            currency=currency,
            asset_type=asset_type,
            tracked=False,
            added_by=account.user,
        )
        position = self._get_or_create_position_for_asset(account, asset.pk)
        transaction, created = models.Transaction.objects.get_or_create(
            executed_at=executed_at,
            position=position,
            quantity=quantity,
            price=price,
            transaction_costs=transaction_costs,
            local_value=local_value,
            value_in_account_currency=value_in_account_currency,
            total_in_account_currency=total_in_account_currency,
            order_id=order_id,
        )

        if created:
            position.quantity += quantity
            position.save()
            account.balance += total_in_account_currency
            account.save()

        position.quantity_history.cache_clear()
        position.value_history.cache_clear()

        return transaction

    @transaction.atomic
    def add_event(self, account, amount, executed_at, event_type, position):

        if event_type == models.EventType.DEPOSIT or event_type == models.EventType.DIVIDEND:
            assert amount > 0
        if event_type == models.EventType.WITHDRAWAL:
            assert amount < 0

        event, created = models.AccountEvent.objects.get_or_create(
            account=account,
            amount=amount,
            executed_at=executed_at,
            event_type=event_type,
            position=position,
        )
        if created:
            account.balance += amount
        account.save()

    @transaction.atomic
    def delete_event(self, event: models.AccountEvent) -> None:
        account = event.account
        # This makes sense for all currently supported events,
        # but might not in the future.
        account.balance -= event.amount
        account.save()
        event.delete()


    def _get_or_create_position(
        self, account: models.Account, isin: str, exchange: models.Exchange
    ):
        positions = models.Position.objects.filter(
            account=account, asset__isin=isin, asset__exchange=exchange
        )
        if positions:
            return positions[0]
        asset = exchanges.get_or_create_asset(isin, exchange)
        if asset:
            return models.Position.objects.create(account=account, asset=asset)
        else:
            return None

    def _get_or_create_position_for_asset(self, account: models.Account, asset_id: int):
        positions = models.Position.objects.filter(account=account, asset__pk=asset_id)
        if positions:
            return positions[0]
        asset = models.Asset.objects.get(pk=asset_id)
        return models.Position.objects.create(account=account, asset=asset)

    @transaction.atomic
    def delete_transaction(self, transaction: models.Transaction) -> None:

        position = transaction.position

        account = position.account

        # This assume no splits and merges support.
        position.quantity -= transaction.quantity
        position.save()
        account.balance -= transaction.total_in_account_currency
        account.save()
        transaction.delete()
        position.quantity_history.cache_clear()
        position.value_history.cache_clear()

    @transaction.atomic
    def correct_transaction(self, transaction, update) -> None:
        FIELDS_ALLOWED_FOR_UPDATE = set(
            [
                "executed_at",
                "quantity",
                "price",
                "local_value",
                "transaction_costs",
                "value_in_account_currency",
                "total_in_account_currency",
            ]
        )
        for field in update.keys():
            if field not in FIELDS_ALLOWED_FOR_UPDATE:
                raise ValueError(
                    f"Correcting transaction with incorrect arguments,"
                    f"field: '{field}' not allowed "
                )
        position = transaction.position
        account = position.account

        position.quantity -= transaction.quantity
        account.balance -= transaction.total_in_account_currency

        for attr, value in update.items():
            setattr(transaction, attr, value)

        position.quantity += transaction.quantity
        account.balance += transaction.total_in_account_currency
        position.save()
        account.save()
        transaction.save()
        position.quantity_history.cache_clear()
        position.value_history.cache_clear()