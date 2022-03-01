from django.contrib.auth.models import User
from django.urls import reverse
from unittest import mock


class ViewTestBase:
    """ViewTestVase is meant to be used as a base class with the django.test.TestCase

    It offers basic tests for views, so that they don't have to be reimplemented each time.
    It doesn't inherit from TestCase because we don't want those tests to run, we only want them
    to be run in the child classes.
    """

    URL = None
    VIEW_NAME = None
    DETAIL_VIEW = False
    QUERY_PARAMS = "?"
    # Change to None if the view is fine to access while not authenticated.
    UNAUTHENTICATED_CODE = 302  # Redirect by default.

    def setUp(self):
        self.user = User.objects.create(username="testuser", email="test@example.com")
        self.client.force_login(self.user)

        patcher = mock.patch("finance.tasks.collect_prices")
        self.addCleanup(patcher.stop)
        self.collect_prices_mock = patcher.start()

    def get_url(self):
        return self.URL

    def get_reversed_url(self):
        return reverse(self.VIEW_NAME)

    def test_url_exists(self):
        response = self.client.get(self.get_url() + self.QUERY_PARAMS)
        self.assertEqual(response.status_code, 200)

    def test_view_accessible_by_name(self):
        response = self.client.get(self.get_reversed_url() + self.QUERY_PARAMS)
        self.assertEqual(response.status_code, 200)

    def test_cant_access_without_logging_in(self):
        self.client.logout()
        response = self.client.get(self.get_reversed_url() + self.QUERY_PARAMS)
        # If UNAUTHENTICATE_CODE is overridden to None, it means that it shouldn't
        # be disallowed.
        if self.UNAUTHENTICATED_CODE:
            self.assertEquals(response.status_code, self.UNAUTHENTICATED_CODE)

    def test_cant_access_objects_of_other_users(self):
        if self.DETAIL_VIEW:
            user2 = User.objects.create(
                username="anotheruser", email="test2@example.com"
            )
            self.client.force_login(user2)
            response = self.client.get(self.get_reversed_url() + self.QUERY_PARAMS)
            self.assertEquals(response.status_code, 404)
