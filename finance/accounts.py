import datetime
import decimal
from typing import Optional, Tuple, Union
from collections import defaultdict
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Count

from django.utils.dateparse import parse_datetime
from finance import models, prices, gains, stock_exchanges, assets


class CantDeleteNonEmptyAccount(ValueError):
    pass


class CantUpdateNonEmptyAccount(ValueError):
    pass


class CantModifyTransactionWithEvent(ValueError):
    pass


class AccountRepository:
    def __init__(self, recompute_lots=True, batch_related_changes=False):
        self.recompute_lots = recompute_lots
        self.batch_related_changes = batch_related_changes
        self.updated_positions = set()
        self.position_to_quantity_change = defaultdict(int)
        self.account_to_quantity_change = defaultdict(int)

    def get(self, user: User, id: int) -> models.Account:
        return models.Account.objects.get(user=user, id=id)

    def create(
        self, nickname: str, currency: models.Currency, description: str, user: User
    ) -> models.Account:
        return models.Account.objects.create(
            user=user, nickname=nickname, description=description, currency=currency
        )

    def delete(self, account):
        if (
            account.positions.annotate(transactions_count=Count("transactions"))
            .filter(transactions_count__gt=0)
            .count()
            > 0
        ):
            raise CantDeleteNonEmptyAccount()
        if account.events.count() > 0:
            raise CantDeleteNonEmptyAccount()

        account.delete()

    def update(self, serializer):
        account = serializer.instance
        if serializer.validated_data["currency"] == account.currency:
            serializer.save()
            return
        if (
            account.positions.annotate(transactions_count=Count("transactions"))
            .filter(transactions_count__gt=0)
            .count()
            > 0
        ):
            raise CantUpdateNonEmptyAccount()
        if account.events.count() > 0:
            raise CantUpdateNonEmptyAccount()

        serializer.save()

    def update_lots(self):
        for position in self.updated_positions:
            gains.update_lots(position)

    @transaction.atomic
    def _add_transaction(
        self,
        account,
        position,
        executed_at: datetime.datetime,
        quantity,
        price,
        transaction_costs,
        local_value,
        value_in_account_currency,
        total_in_account_currency,
        order_id,
        custom_asset=False,
    ) -> Tuple[models.Transaction, bool]:
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
            if custom_asset:
                models.PriceHistory.objects.create(
                    asset=position.asset, value=price, date=executed_at.date()
                )
            if self.recompute_lots:
                gains.update_lots(position, transaction)
            self.updated_positions.add(position)

        return transaction, created

    @transaction.atomic
    def add_transaction(
        self,
        account,
        isin,
        exchange,
        executed_at: Union[str, datetime.datetime],
        quantity,
        price,
        transaction_costs,
        local_value,
        value_in_account_currency,
        total_in_account_currency,
        order_id,
        asset_defaults,
        import_all_assets,
    ) -> Tuple[models.Transaction, bool]:
        position = self._get_or_create_position(
            account, isin, exchange, asset_defaults, import_all_assets
        )
        if not position:
            raise ValueError(
                f"Failed to create a position from a transaction record, isin: {isin}, exchange ref: {exchange}"
            )
        if isinstance(executed_at, str):
            executed_at_date = parse_datetime(executed_at)
            if executed_at_date is None:
                raise ValueError(f"executed_at in a wrong format: {executed_at}")
        elif isinstance(executed_at, datetime.datetime):
            executed_at_date = executed_at
        else:
            raise ValueError(f"executed_at in a wrong format (type): {executed_at}")

        return self._add_transaction(
            account,
            position,
            executed_at_date,
            quantity,
            price,
            transaction_costs,
            local_value,
            value_in_account_currency,
            total_in_account_currency,
            order_id,
        )

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

        transaction, _ = self._add_transaction(
            account,
            position,
            executed_at,
            quantity,
            price,
            transaction_costs,
            local_value,
            value_in_account_currency,
            total_in_account_currency,
            order_id,
        )
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

        exchange_entity = stock_exchanges.ExchangeRepository().get_by_name(exchange)
        tracked = False
        if asset_type == models.AssetType.CRYPTO:
            tracked = prices.are_crypto_prices_available(symbol)
        asset, created = models.Asset.objects.get_or_create(
            symbol=symbol,
            exchange=exchange_entity,
            currency=currency,
            asset_type=asset_type,
            tracked=tracked,
            added_by=account.user if not tracked else None,
        )
        if tracked and created:
            prices.collect_prices(asset)

        position = self._get_or_create_position_for_asset(account, asset.pk)

        transaction, _ = self._add_transaction(
            account,
            position,
            executed_at,
            quantity,
            price,
            transaction_costs,
            local_value,
            value_in_account_currency,
            total_in_account_currency,
            order_id,
            custom_asset=not tracked,
        )
        return transaction

    @transaction.atomic
    def add_transaction_crypto_asset(
        self,
        account: models.Account,
        symbol: str,
        executed_at: datetime.datetime,
        quantity: decimal.Decimal,
        price: decimal.Decimal,
        local_value: decimal.Decimal,
        value_in_account_currency: decimal.Decimal,
        total_in_account_currency: decimal.Decimal,
        transaction_costs: Optional[decimal.Decimal] = None,
        order_id: Optional[str] = None,
    ):

        na_exchange = stock_exchanges.ExchangeRepository().get_by_name(
            stock_exchanges.OTHER_OR_NA_EXCHANGE_NAME
        )
        asset_repository = assets.AssetRepository(exchange=na_exchange)
        user = account.user
        asset = asset_repository.add_crypto(
            symbol=symbol,
            user=user,
        )
        position = self._get_or_create_position_for_asset(account, asset.pk)

        return self._add_transaction(
            account,
            position,
            executed_at,
            quantity,
            price,
            transaction_costs,
            local_value,
            value_in_account_currency,
            total_in_account_currency,
            order_id,
            custom_asset=not asset.tracked,
        )

    @transaction.atomic
    def add_event(
        self,
        account: models.Account,
        amount: decimal.Decimal,
        executed_at: datetime.datetime,
        event_type: models.EventType,
        position: Optional[models.Position] = None,
        withheld_taxes: Optional[decimal.Decimal] = None,
    ) -> Tuple[models.AccountEvent, bool]:

        if (
            event_type == models.EventType.DEPOSIT
            or event_type == models.EventType.DIVIDEND
        ):
            assert amount > 0
        if event_type == models.EventType.WITHDRAWAL:
            assert amount < 0

        event, created = models.AccountEvent.objects.get_or_create(
            account=account,
            amount=amount,
            executed_at=executed_at,
            event_type=event_type,
            position=position,
            withheld_taxes=withheld_taxes or 0,
        )
        if created:
            balance_change = amount
            if withheld_taxes:
                balance_change -= withheld_taxes

            if event_type == models.EventType.DIVIDEND and position:
                position_currency = position.asset.currency
                account_currency = account.currency
                if position_currency != account_currency:
                    exchange_rate = prices.get_closest_exchange_rate(
                        date=executed_at.date(),
                        from_currency=position_currency,
                        to_currency=account_currency,
                    )
                    if exchange_rate is None:
                        raise ValueError(
                            f"Can't convert between currencies: "
                            f"{position_currency} and {account_currency}"
                        )
                    balance_change *= exchange_rate.value

            account.balance += balance_change
        account.save()
        return event, created

    @transaction.atomic
    def delete_event(self, event: models.AccountEvent) -> None:
        account = event.account
        # This makes sense for all currently supported events,
        # but might not in the future.

        balance_change = event.amount
        if event.withheld_taxes:
            balance_change -= event.withheld_taxes

        if event.event_type == models.EventType.DIVIDEND and event.position:
            position_currency = event.position.asset.currency
            account_currency = account.currency
            if position_currency != account_currency:
                exchange_rate = prices.get_closest_exchange_rate(
                    date=event.executed_at.date(),
                    from_currency=position_currency,
                    to_currency=account_currency,
                )
                if exchange_rate is None:
                    raise ValueError(
                        f"Can't convert between currencies: "
                        f"{position_currency} and {account_currency}"
                    )
                balance_change *= exchange_rate.value

        if not self.batch_related_changes:
            account.balance -= balance_change
            account.save()
        else:
            self.account_to_quantity_change[account] -= balance_change
        transaction = event.transaction

        event.delete()

        if transaction:
            self.delete_transaction(transaction)

    def _get_or_create_position(
        self,
        account: models.Account,
        isin: str,
        exchange: models.Exchange,
        asset_defaults,
        import_all_assets: bool,
    ):
        positions = models.Position.objects.filter(
            account=account, asset__isin=isin, asset__exchange=exchange
        )
        if positions:
            return positions[0]
        asset = stock_exchanges.get_or_create_asset(
            isin,
            exchange,
            asset_defaults,
            add_untracked_if_not_found=import_all_assets,
            user=account.user,
        )
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
    def delete_transaction(
        self, transaction: models.Transaction, skip_events_check=False
    ) -> None:

        if not skip_events_check and transaction.events.count():
            raise CantModifyTransactionWithEvent(
                "Can't delete a transaction associated with an event, without deleting the event first."
            )

        position = transaction.position
        account = position.account
        # This assumes no splits and merges support.
        if not self.batch_related_changes:
            position.quantity -= transaction.quantity
            position.save()
        else:
            self.position_to_quantity_change[
                transaction.position
            ] -= transaction.quantity

        if not self.batch_related_changes:
            account.balance -= transaction.total_in_account_currency
            account.save()
        else:
            self.account_to_quantity_change[
                position.account
            ] -= transaction.total_in_account_currency

        transaction.delete()
        if self.recompute_lots:
            gains.update_lots(position)
        self.updated_positions.add(position)
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
        if self.recompute_lots:
            gains.update_lots(position)
        self.updated_positions.add(position)
        position.quantity_history.cache_clear()
        position.value_history.cache_clear()

    @transaction.atomic
    def add_crypto_income_event(
        self,
        account: models.Account,
        symbol: str,
        executed_at: datetime.datetime,
        quantity: decimal.Decimal,
        price: decimal.Decimal,
        local_value: decimal.Decimal,
        value_in_account_currency: decimal.Decimal,
        event_type: models.EventType,
    ) -> Tuple[models.AccountEvent, bool]:

        (transaction, _,) = self.add_transaction_crypto_asset(
            account,
            symbol,
            executed_at,
            quantity,
            price,
            # Local value.
            local_value,
            value_in_account_currency,
            value_in_account_currency,
        )

        position = transaction.position

        event, created = models.AccountEvent.objects.get_or_create(
            account=account,
            amount=-value_in_account_currency,
            executed_at=executed_at,
            event_type=event_type,
            position=position,
            transaction=transaction,
            withheld_taxes=0,
        )

        if created:
            account.balance += -value_in_account_currency
        account.save()

        return event, created

    @transaction.atomic
    def delete_transaction_import(self, transaction_import: models.TransactionImport):

        for event_record in (
            transaction_import.event_records.order_by("-transaction__executed_at")
            .filter(created_new=True)
            .select_related("event")
            .filter(transaction=None)
        ):
            self.delete_event(event_record.event)

        position_ids_to_updates = defaultdict(int)
        events_to_delete = []
        transactions_to_delete = []
        account_total_change = 0

        for event_record in (
            transaction_import.event_records.order_by("-transaction__executed_at")
            .filter(created_new=True)
            .select_related("event")
            .exclude(transaction=None)
            .select_related("transaction")
            .select_related("event__transaction")
            .values(
                "event__id",
                "transaction__id",
                "transaction__position__id",
                "transaction__quantity",
            )
        ):
            events_to_delete.append(event_record["event__id"])
            transactions_to_delete.append(event_record["transaction__id"])
            position_ids_to_updates[
                event_record["transaction__position__id"]
            ] -= event_record["transaction__quantity"]

        for transaction_record in (
            transaction_import.records.annotate(
                event_count=Count("transaction__events")
            )
            .filter(event_count__gte=0)
            .order_by("-transaction__executed_at")
            .filter(created_new=True)
            .values(
                "transaction__id",
                "transaction__position__id",
                "transaction__quantity",
                "transaction__total_in_account_currency",
            )
        ):
            transactions_to_delete.append(transaction_record["transaction__id"])
            position_ids_to_updates[
                transaction_record["transaction__position__id"]
            ] -= transaction_record["transaction__quantity"]
            account_total_change -= transaction_record[
                "transaction__total_in_account_currency"
            ]

        transaction_import.account.balance += account_total_change
        transaction_import.account.save()
        transaction_import.delete()
        models.Transaction.objects.filter(id__in=transactions_to_delete).delete()
        models.AccountEvent.objects.filter(id__in=events_to_delete).delete()

        positions = models.Position.objects.filter(
            id__in=position_ids_to_updates.keys()
        )
        updated_positions = []
        for position in positions:
            position.quantity += position_ids_to_updates[position.id]
            updated_positions.append(position)
        models.Position.objects.bulk_update(updated_positions, ["quantity"])
