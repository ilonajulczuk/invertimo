from django.contrib.auth.models import User
from django.test import TestCase

from finance import degiro_parser, exchanges, models


class TestDegiroParser(TestCase):

    # This fixture provides data about 65 different exchanges,
    # and sets up a single account for testing.
    fixtures = ["exchanges.json"]

    def test_importing_single_transaction(self):
        # TODO: mock out the API call, don't call the official API
        # every time the test runs.
        account = models.Account.objects.all()[0]
        degiro_parser.import_transactions_from_file(
            account, "./finance/transactions_example_short.csv"
        )
        self.assertEqual(models.Transaction.objects.count(), 6)
