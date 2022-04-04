from django.contrib import admin

from .models import (
    Account,
    AccountEvent,
    Exchange,
    ExchangeIdentifier,
    Position,
    Asset,
    Transaction,
    TransactionImport,
    TransactionImportRecord,
    EventImportRecord,
)

admin.site.register(Account)
admin.site.register(AccountEvent)
admin.site.register(Exchange)
admin.site.register(ExchangeIdentifier)
admin.site.register(Position)
admin.site.register(Asset)
admin.site.register(Transaction)
admin.site.register(TransactionImport)
admin.site.register(TransactionImportRecord)
admin.site.register(EventImportRecord)