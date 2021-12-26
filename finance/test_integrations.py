from django.test import TestCase

from finance import models
from finance import testing_utils


def _add_dummy_account_and_asset(user, isin):
    account = models.Account.objects.create(
        user=user, currency=models.Currency.EUR, nickname="test account"
    )
    exchange = models.Exchange.objects.create(name="USA stocks", country="USA")
    asset = models.Asset.objects.create(
        isin=isin,
        symbol="MOONIES",
        name="a stock",
        currency=models.Currency.USD,
        exchange=exchange,
        tracked=True,
    )

    return account, exchange, asset



class TestDegiroTransactionImportView(testing_utils.ViewTestBase, TestCase):
    URL = "/api/integrations/degiro/transactions/"
    VIEW_NAME = "degiro-transaction-upload-list"
    DETAIL_VIEW = False
    QUERY_PARAMS = "?"
    UNAUTHENTICATED_CODE = 403

    # This fixture provides data about 65 different exchanges,
    # and sets up a single account for testing.
    fixtures = ["exchanges_postgres.json"]

    def setUp(self):
        super().setUp()

        self.isin = "USA123"
        self.account, self.exchange, self.asset = _add_dummy_account_and_asset(
            self.user, isin=self.isin
        )

    def test_cannot_upload_to_wrong_account(self):
        pass

    def test_can_upload_to_owned_account(self):
        response = self.client.get(self.get_url())
        self.assertEqual(response.status_code, 200)

        self.assertEqual(models.Transaction.objects.count(), 0)
        with open('./finance//transactions_example_latest.csv', 'rb') as fp:
            response = self.client.post(self.URL, {
                'account': self.account.id,
                'transaction_file': fp})

        self.assertEqual(response.status_code, 201)
        self.assertEqual(models.Transaction.objects.count(), 6)

    def test_can_upload_to_owned_account_currency_mismatch(self):
        pass

    def test_some_assets_not_found_by_isin(self):
        pass

    def test_invalid_data_format(self):
        pass

    def test_something_not_uploaded_for_random_reason(self):
        pass

    def test_transactions_latest_to_oldest_uploads_correctly(self):
        # This makes sure that the transactions from the file are sorted correctly
        # before being ingested.
        pass

    def test_incomplete_transaction_list_prevents_uploading(self):
        # This is a scenario when you upload the transactions out of
        # order, e.g. later transactions of selling assets you haven't bought.
        pass