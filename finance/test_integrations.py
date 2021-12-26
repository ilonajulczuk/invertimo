from django.test import TestCase

from finance import models
from finance import testing_utils
from unittest.mock import patch

# from finance import exchanges

asset_response = [
    {
        "Code": "NKE",
        "Exchange": "US",
        "Name": "NIKE Inc",
        "Type": "Common Stock",
        "Country": "USA",
        "Currency": "USD",
        "ISIN": "US6541061031",
        "previousClose": 165.67,
        "previousCloseDate": "2021-12-23",
    },
    {
        "Code": "NKE",
        "Exchange": "XETRA",
        "Name": "NIKE Inc",
        "Type": "Common Stock",
        "Country": "Germany",
        "Currency": "EUR",
        "ISIN": "US6541061031",
        "previousClose": 147.26,
        "previousCloseDate": "2021-12-23",
    },
    {
        "Code": "NKE",
        "Exchange": "F",
        "Name": "NIKE Inc",
        "Type": "Common Stock",
        "Country": "Germany",
        "Currency": "EUR",
        "ISIN": "US6541061031",
        "previousClose": 147.16,
        "previousCloseDate": "2021-12-23",
    },
    {
        "Code": "NKE",
        "Exchange": "SN",
        "Name": "NIKE Inc",
        "Type": "Common Stock",
        "Country": "Chile",
        "Currency": "USD",
        "ISIN": "US6541061031",
        "previousClose": 169.8,
        "previousCloseDate": "2021-12-06",
    },
]


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

        self.account = models.Account.objects.create(
            user=self.user, currency=models.Currency.EUR, nickname="test account"
        )

    def test_cannot_upload_to_wrong_account(self):
        pass

    @patch('finance.exchanges.query_asset')
    def test_can_upload_to_owned_account(self , query_asset_mock):

        def assets_with_isin(isin):
            response = []
            for entry in asset_response:
                cp = entry.copy()
                cp["ISIN"] = isin
                response.append(cp)
            return asset_response

        query_asset_mock.side_effect = assets_with_isin
        response = self.client.get(self.get_url())
        self.assertEqual(response.status_code, 200)

        self.assertEqual(models.Transaction.objects.count(), 0)
        with open("./finance/transactions_example_latest.csv", "rb") as fp:
            response = self.client.post(
                self.URL, {"account": self.account.id, "transaction_file": fp}
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(models.Transaction.objects.count(), 6)

    def test_can_upload_to_owned_account_currency_mismatch(self):
        another_account = models.Account.objects.create(
            user=self.user,
            currency=models.Currency.USD,
            nickname="other currency account",
        )
        with open("./finance/transactions_example_latest.csv", "rb") as fp:
            response = self.client.post(
                self.URL, {"account": another_account.id, "transaction_file": fp}
            )
        self.assertEqual(response.status_code, 400)

    @patch('finance.exchanges.query_asset')
    def test_some_assets_not_found_by_isin(self, query_asset_mock):
        # If asset is not found then the empty value is returned.
        calls = 0
        def assets_or_empty(_):
            nonlocal calls
            calls +=1
            if calls < 5:
                return asset_response
            else:
                return []
        query_asset_mock.side_effect = assets_or_empty
        response = self.client.get(self.get_url())
        self.assertEqual(response.status_code, 200)

        self.assertEqual(models.Transaction.objects.count(), 0)
        with open("./finance/transactions_example_latest.csv", "rb") as fp:
            response = self.client.post(
                self.URL, {"account": self.account.id, "transaction_file": fp}
            )

        self.assertEqual(response.status_code, 201)

        # TODO: instead of ignoring these assets, consider adding them as untracked?
        self.assertEqual(models.Transaction.objects.count(), 4)

    def test_invalid_data_format(self):
        with open("./finance/test_integrations.py", "rb") as fp:
            response = self.client.post(
                self.URL, {"account": self.account.id, "transaction_file": fp}
            )
        self.assertEqual(response.status_code, 400)

    def test_invalid_data_format_bad_columns(self):
        with open("./finance/transactions_example_latest_bad_columns.csv", "rb") as fp:
            response = self.client.post(
                self.URL, {"account": self.account.id, "transaction_file": fp}
            )
        self.assertEqual(response.status_code, 400)

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