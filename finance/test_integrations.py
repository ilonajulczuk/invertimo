import decimal
import datetime
from django.test import TestCase

from django.contrib.auth.models import User
from finance.integrations import degiro_parser
from finance.integrations import binance_parser

from django.db.models import Sum
from finance import models, utils
from finance import testing_utils
from unittest.mock import patch


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
    # Items below are so that I will have more supported exchanges.
    {
        "Code": "NKE",
        "Exchange": "LSE",
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
        "Exchange": "MI",
        "Name": "NIKE Inc",
        "Type": "Common Stock",
        "Country": "Germany",
        "Currency": "EUR",
        "ISIN": "US6541061031",
        "previousClose": 147.26,
        "previousCloseDate": "2021-12-23",
    },
]


def _assets_with_isin_side_effect(isin):
    response = []
    for entry in asset_response:
        cp = entry.copy()
        cp["ISIN"] = isin
        response.append(cp)
    return asset_response


class TestDegiroParser(TestCase):

    # This fixture provides data about 65 different exchanges,
    # and sets up a single account for testing.
    fixtures = ["exchanges_postgres.json"]

    @patch("finance.stock_exchanges.query_asset")
    def test_importing_transactions_from_file(self, query_asset_mock):
        query_asset_mock.side_effect = _assets_with_isin_side_effect

        account_balance = decimal.Decimal("-15237.26000")
        base_num_of_transactions = 6
        account = models.Account.objects.create(
            user=User.objects.all()[0], nickname="test"
        )
        transaction_import = degiro_parser.import_transactions_from_file(
            account, "./finance/transactions_example_short.csv", True
        )
        failed_records = transaction_import.records.filter(successful=False)
        self.assertEqual(len(failed_records), 0)
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        account = models.Account.objects.get(nickname="test")
        self.assertAlmostEqual(account.balance, account_balance)

        # 6 in the new account, 30 from the old fixture.
        self.assertEqual(models.Position.objects.count(), 36)

        total_value = models.Transaction.objects.aggregate(
            Sum("total_in_account_currency")
        )["total_in_account_currency__sum"]
        self.assertAlmostEqual(total_value, account_balance)

        # Import the same transactions again and make
        # sure that they aren't double recorded.
        degiro_parser.import_transactions_from_file(
            account, "./finance/transactions_example_short.csv", True
        )
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        self.assertEqual(models.Position.objects.count(), 36)
        account = models.Account.objects.get(nickname="test")
        total_value = models.Transaction.objects.aggregate(
            Sum("total_in_account_currency")
        )["total_in_account_currency__sum"]

        self.assertAlmostEqual(account.balance, account_balance)
        self.assertAlmostEqual(total_value, account_balance)


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

    @patch("finance.stock_exchanges.query_asset")
    def test_can_upload_to_owned_account(self, query_asset_mock):
        query_asset_mock.side_effect = _assets_with_isin_side_effect
        response = self.client.get(self.get_url())
        self.assertEqual(response.status_code, 200)

        self.assertEqual(models.Transaction.objects.count(), 0)
        with open("./finance/transactions_example_latest.csv", "rb") as fp:
            response = self.client.post(
                self.URL, {"account": self.account.id, "transaction_file": fp}
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(models.Transaction.objects.count(), 6)

        response = self.client.get("/api/transaction-imports/")
        self.assertEqual(response.status_code, 200)

        transaction_import_id = models.TransactionImport.objects.first().id
        response = self.client.get(f"/api/transaction-imports/{transaction_import_id}/")
        self.assertEqual(response.status_code, 200)

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
        data = response.json()
        self.assertTrue("account" in data)

        response = self.client.get(self.URL)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(len(data[0]["records"]), 0)
        self.assertEqual(data[0]["status"], models.ImportStatus.FAILURE.label)

    @patch("finance.stock_exchanges.query_asset")
    def test_some_assets_not_found_by_isin(self, query_asset_mock):
        # If asset is not found then the empty value is returned.
        calls = 0

        def assets_or_empty(_):
            nonlocal calls
            calls += 1
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
                self.URL,
                {
                    "account": self.account.id,
                    "transaction_file": fp,
                    "import_all_assets": False,
                },
            )

        self.assertEqual(response.status_code, 201)

        data = response.json()
        self.assertEqual(data["status"], models.ImportStatus.PARTIAL_SUCCESS.label)
        self.assertEqual(len(data["records"]), 6)

        # TODO: instead of ignoring these assets, consider adding them as untracked?
        self.assertEqual(models.Transaction.objects.count(), 4)

    @patch("finance.stock_exchanges.query_asset")
    def test_some_assets_not_found_by_isin_but_still_imported(self, query_asset_mock):
        # If asset is not found then the empty value is returned.
        calls = 0

        def assets_or_empty(_):
            nonlocal calls
            calls += 1
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
                self.URL,
                {
                    "account": self.account.id,
                    "transaction_file": fp,
                    "import_all_assets": True,
                },
            )

        self.assertEqual(response.status_code, 201)

        data = response.json()
        self.assertEqual(data["status"], models.ImportStatus.SUCCESS.label)
        self.assertEqual(len(data["records"]), 6)

        self.assertEqual(models.Transaction.objects.count(), 6)

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

        response = self.client.get(self.URL)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(len(data[0]["records"]), 0)
        self.assertEqual(data[0]["status"], models.ImportStatus.FAILURE.label)

    @patch("finance.stock_exchanges.query_asset")
    def test_transactions_latest_to_oldest_uploads_correctly(self, query_asset_mock):
        # This makes sure that the transactions from the file are sorted correctly
        # before being ingested.
        query_asset_mock.side_effect = _assets_with_isin_side_effect
        response = self.client.get(self.get_url())
        self.assertEqual(response.status_code, 200)

        self.assertEqual(models.Transaction.objects.count(), 0)
        with open("./finance/transactions_many_latest_first.csv", "rb") as fp:
            response = self.client.post(
                self.URL, {"account": self.account.id, "transaction_file": fp}
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(models.Transaction.objects.count(), 184)
        data = response.json()
        self.assertEqual(data["status"], models.ImportStatus.SUCCESS.label)
        self.assertEqual(len(data["records"]), 184)

    @patch("finance.stock_exchanges.query_asset")
    def test_incomplete_transaction_list_prevents_uploading(self, query_asset_mock):
        # This is a scenario when you upload the transactions out of
        # order, e.g. later transactions of selling assets you haven't bought.
        query_asset_mock.side_effect = _assets_with_isin_side_effect
        response = self.client.get(self.get_url())
        self.assertEqual(response.status_code, 200)

        self.assertEqual(models.Transaction.objects.count(), 0)
        with open("./finance/transactions_many_buying_trimmed.csv", "rb") as fp:
            response = self.client.post(
                self.URL, {"account": self.account.id, "transaction_file": fp}
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(models.Transaction.objects.count(), 122)


class TestBinanceParser(TestCase):

    # This fixture provides data about 65 different exchanges,
    # and sets up a single account for testing.
    fixtures = ["exchanges_postgres.json"]

    @patch("finance.prices.are_crypto_prices_available")
    def test_importing_binance_data(self, mock):
        mock.return_value = False
        account_balance = decimal.Decimal("299.16000")
        base_num_of_transactions = 8
        account = models.Account.objects.create(
            user=User.objects.all()[0], nickname="test"
        )
        account = models.Account.objects.get(nickname="test")
        transaction_import = binance_parser.import_transactions_from_file(
            account, "./finance/binance_transaction_sample.csv", True
        )
        failed_records = transaction_import.records.filter(successful=False)
        self.assertEqual(len(failed_records), 0)
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        account = models.Account.objects.get(nickname="test")
        self.assertAlmostEqual(account.balance, account_balance)

        # 2 in the new account, 30 from the old fixture.
        self.assertEqual(models.Position.objects.count(), 32)

        eth = models.Asset.objects.get(name="ETH")
        self.assertEqual(eth.exchange.name, "Other / NA")
        self.assertEqual(eth.isin, "")
        self.assertEqual(eth.currency, models.Currency.USD)
        self.assertIsNone(eth.country)
        eth_position = models.Position.objects.get(asset=eth, account=account)
        self.assertEqual(eth_position.quantity, decimal.Decimal("0.18"))

        # total_value here doesn't include value of transfers.
        expected_total_value = decimal.Decimal('-992.6400000000')
        total_value = models.Transaction.objects.aggregate(
            Sum("total_in_account_currency")
        )["total_in_account_currency__sum"]
        self.assertAlmostEqual(total_value, expected_total_value)

        # Import the same transactions again and make
        # sure that they aren't double recorded.
        account = models.Account.objects.get(nickname="test")
        transaction_import = binance_parser.import_transactions_from_file(
            account, "./finance/binance_transaction_sample.csv", True
        )
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        self.assertEqual(models.Position.objects.count(), 32)
        account = models.Account.objects.get(nickname="test")
        total_value = models.Transaction.objects.aggregate(
            Sum("total_in_account_currency")
        )["total_in_account_currency__sum"]

        self.assertAlmostEqual(account.balance, account_balance)
        self.assertAlmostEqual(total_value, expected_total_value)

    @patch("finance.prices.are_crypto_prices_available")
    def test_importing_binance_data_fiat_doesnt_match_account_currency(self, mock):
        mock.return_value = False
        from_date = datetime.date.fromisoformat("2021-10-14")
        to_date = datetime.date.fromisoformat("2022-01-15")

        dates = utils.generate_date_intervals(from_date, to_date)
        for i, date in enumerate(dates):
            models.CurrencyExchangeRate.objects.create(
                date=date,
                value=1.1,
                from_currency=models.Currency.EUR,
                to_currency=models.Currency.USD,
            )

        account_balance = decimal.Decimal('329.07600')
        base_num_of_transactions = 8
        account = models.Account.objects.create(
            user=User.objects.all()[0],
            nickname="test",
            currency=models.Currency.USD,
        )
        transaction_import = binance_parser.import_transactions_from_file(
            account, "./finance/binance_transaction_sample.csv", True
        )
        failed_records = transaction_import.records.filter(successful=False)
        self.assertEqual(len(failed_records), 0)
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        account = models.Account.objects.get(nickname="test")
        self.assertAlmostEqual(account.balance, account_balance)

        # 2 in the new account, 30 from the old fixture.
        self.assertEqual(models.Position.objects.count(), 32)

        eth = models.Asset.objects.get(name="ETH")
        self.assertEqual(eth.exchange.name, "Other / NA")
        self.assertEqual(eth.isin, "")
        self.assertEqual(eth.currency, models.Currency.USD)
        self.assertIsNone(eth.country)
        eth_position = models.Position.objects.get(asset=eth, account=account)
        self.assertEqual(eth_position.quantity, decimal.Decimal("0.18"))

        # total_value here doesn't include value of transfers.
        expected_total_value = decimal.Decimal('-1091.9040000000')
        total_value = models.Transaction.objects.aggregate(
            Sum("total_in_account_currency")
        )["total_in_account_currency__sum"]
        self.assertAlmostEqual(total_value, expected_total_value)

        # Import the same transactions again and make
        # sure that they aren't double recorded.
        transaction_import = binance_parser.import_transactions_from_file(
            account, "./finance/binance_transaction_sample.csv", True
        )
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        self.assertEqual(models.Position.objects.count(), 32)
        account = models.Account.objects.get(nickname="test")
        total_value = models.Transaction.objects.aggregate(
            Sum("total_in_account_currency")
        )["total_in_account_currency__sum"]

        self.assertAlmostEqual(account.balance, account_balance)
        self.assertAlmostEqual(total_value, expected_total_value)
