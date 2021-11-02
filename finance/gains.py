from finance import models
from django.db import transaction


class SoldBeforeBought(ValueError):
    pass


EPSILON = 0.00000000000001


@transaction.atomic
def update_lots(position, transaction=None):
    """Updates lots of stocks unit bought or sold at the same price.

    If the transactions are added out of order,
    we recreate the lots for simplicity.
    """
    # We can either recreate all the lots or just add new ones
    # and update the sold ones.
    if (
        transaction is None
        # There is just one transaction, it shouldn't matter.
        or position.transactions.count() == 1
        # It's a complicated case where the transaction is earlier than
        # other transactions.
        or transaction.executed_at
        < position.transactions.exclude(id=transaction.id)
        .order_by("-executed_at")
        .first()
        .executed_at
    ):
        transactions = position.transactions.order_by("executed_at")
        position.lots.all().delete()
    else:
        # This is the easy case, we will only consider the latest transaction.
        if transaction.position != position:
            raise ValueError("Transaction has to be for passed position")
        transactions = [transaction]

    for transaction in transactions:
        date = transaction.executed_at.date()
        if transaction.quantity > 0:
            models.Lot.objects.create(
                quantity=transaction.quantity,
                buy_date=date,
                buy_price=transaction.price,
                cost_basis_account_currency=transaction.total_in_account_currency,
                position=position,
                buy_transaction=transaction,
            )
        else:
            lots = models.Lot.objects.filter(
                position=position, sell_date=None
            ).order_by("buy_date")
            outstanding_quantity = -transaction.quantity
            for lot in lots:
                if abs(outstanding_quantity) < EPSILON:
                    break
                if outstanding_quantity >= lot.quantity:
                    # Sell the lot in full.
                    lot.sell_date = date
                    lot.sell_transaction = transaction
                    lot.sell_price = transaction.price
                    # This is proportional to how much was sold within this lot.
                    lot.sell_basis_account_currency = -(
                        transaction.total_in_account_currency
                        * lot.quantity
                        / transaction.quantity
                    )
                    # Sell is positive, and buy is negative, so adding is fine.
                    lot.realized_gain_account_currency = (
                        lot.sell_basis_account_currency
                        + lot.cost_basis_account_currency
                    )
                    lot.save()
                    outstanding_quantity -= lot.quantity
                else:
                    # Split the lot in two and sell the first one.
                    remaining_quantity = lot.quantity - outstanding_quantity
                    models.Lot.objects.create(
                        quantity=remaining_quantity,
                        buy_date=lot.buy_date,
                        buy_price=lot.buy_price,
                        cost_basis_account_currency=lot.cost_basis_account_currency
                        * remaining_quantity
                        / lot.quantity,
                        position=lot.position,
                        buy_transaction=lot.buy_transaction,
                    )

                    lot.cost_basis_account_currency = (
                        lot.cost_basis_account_currency
                        * outstanding_quantity
                        / lot.quantity
                    )
                    lot.quantity = outstanding_quantity
                    lot.sell_date = date
                    lot.sell_transaction = transaction
                    lot.sell_price = transaction.price
                    # This is proportional to how much was sold within this lot.
                    # Since the transaction.quantity is negative, multiply by -1.
                    lot.sell_basis_account_currency = (
                        transaction.total_in_account_currency
                        * lot.quantity
                        / (-transaction.quantity)
                    )
                    # Sell is positive, and buy is negative, so adding is fine.
                    lot.realized_gain_account_currency = (
                        lot.sell_basis_account_currency
                        + lot.cost_basis_account_currency
                    )
                    lot.save()
                    outstanding_quantity -= outstanding_quantity

            if abs(outstanding_quantity) > EPSILON:
                # TODO: add handling of that in the API and frontend.
                raise SoldBeforeBought(
                    f"Invalid transactions for position: {position}, selling more than owned (potentially transactions added with wrong dates)."
                )

