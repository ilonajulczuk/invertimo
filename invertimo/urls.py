"""invertimo URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
import debug_toolbar
from django.contrib import admin
from django.urls import include, path
from invertimo import views
from finance.views import (
    AccountsViewSet,
    PositionView,
    PositionsView,
    TransactionsViewSet,
    CurrencyExchangeRateView,
    AssetPricesView,
    AccountEventViewSet,
    AssetViewSet,
    LotViewSet,
    DegiroUploadViewSet,
)
from rest_framework import routers

from django.contrib.staticfiles.urls import staticfiles_urlpatterns

router = routers.DefaultRouter()
router.register(r"transactions", TransactionsViewSet, basename="transaction")
router.register(r"accounts", AccountsViewSet, basename="account")
router.register(r"account-events", AccountEventViewSet, basename="account-event")
router.register(r"assets", AssetViewSet, basename="asset")
router.register(r"lots", LotViewSet, basename="lot")
router.register(r"integrations", DegiroUploadViewSet, basename="tranaction-upload")

urlpatterns = [
    path("", views.index_view, name="index"),
    path("admin/", admin.site.urls),
    path("login/", views.login_view, name="login"),
    path("signup/", views.signup_view, name="signup"),
    path("privacy_policy/", views.privacy_policy_view, name="privacy_policy"),
    path("logout/", views.logout_view, name="logout"),
    path("__debug__/", include(debug_toolbar.urls)),
    path("api/", include(router.urls)),
    path("api-auth/", include("rest_framework.urls", namespace="rest_framework")),
    path("api/positions/", PositionsView.as_view(), name="api-positions"),
    path("api/positions/<int:pk>/", PositionView.as_view(), name="api-position"),
    path("api/currencies/", CurrencyExchangeRateView.as_view(), name="api-currencies"),
    path(
        "api/assets/<int:asset_pk>/prices/",
        AssetPricesView.as_view(),
        name="api-assets",
    ),
    path("", include("social_django.urls", namespace="social")),
]


urlpatterns += staticfiles_urlpatterns()