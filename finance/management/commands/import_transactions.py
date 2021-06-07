from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from finance import accounts, degiro_parser


class Command(BaseCommand):
    help = 'Import degiro transactions from a file.'

    def add_arguments(self, parser):
        parser.add_argument('--filename',  type=str, help="file to read transactions from")
        parser.add_argument('--username',  type=str, help="username of the account owner")
        parser.add_argument('--account_id',  type=str, help="account nickname")

    def handle(self, *args, **options):
        account_id = options['account_id']
        username = options['username']
        user = User.objects.get(username=username)
        account = accounts.AccountRepository().get(user, account_id)
        filename = options['filename']
        failed_rows = degiro_parser.import_transactions_from_file(account, filename)

        self.stdout.write(self.style.SUCCESS('Finished the import'))
        if failed_rows:
            self.stderr.write(
                        'Failed rows:')
            for row in failed_rows:
                self.stderr.write(
                    f"Failed to import ISIN: {row['ISIN']}, exchange: {row['Reference']} {row['Venue']}")
