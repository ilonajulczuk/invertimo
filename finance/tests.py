from django.contrib.auth.models import User
from django.test import TestCase
from django.db.models import Sum
from finance import degiro_parser, exchanges, models
import decimal


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
        account = models.Account.objects.all()[0]
        self.assertAlmostEqual(account.balance, decimal.Decimal("-15237.26"))

        for position in models.Position.objects.all():
            print(position.quantity)

        total_value = models.Transaction.objects.aggregate(
            Sum("value_in_account_currency"))["value_in_account_currency__sum"]
        self.assertAlmostEqual(total_value, decimal.Decimal("-15232.65"))

        # Import the same transactions again and make
        # sure that they aren't double recorded.
        degiro_parser.import_transactions_from_file(
            account, "./finance/transactions_example_short.csv"
        )
        self.assertEqual(models.Transaction.objects.count(), 6)
        account = models.Account.objects.all()[0]
        total_value = models.Transaction.objects.aggregate(
            Sum("value_in_account_currency"))["value_in_account_currency__sum"]

        self.assertAlmostEqual(account.balance, decimal.Decimal("-15237.26"))
        self.assertAlmostEqual(total_value, decimal.Decimal("-15232.65"))



class TestPosition(TestCase):

    def test_quantity_history_based_on_transactions(self):
        pass