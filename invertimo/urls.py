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
from finance.views import PositionView, PositionsView, CurrencyExchangeRateView, SecurityPricesView
from rest_framework import routers

router = routers.DefaultRouter()

urlpatterns = [
    path("", views.index_view, name="index"),
    path("admin/", admin.site.urls),
    path("login/", views.login_view, name="login"),
    path("privacy_policy/", views.privacy_policy_view, name="privacy_policy"),
    path("logout/", views.logout_view, name="logout"),
    path("__debug__/", include(debug_toolbar.urls)),
    path("api/", include(router.urls)),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path("api/positions/", PositionsView.as_view(), name="api-positions"),
    path("api/positions/<int:pk>/", PositionView.as_view(), name="api-position"),
    path("api/currencies/", CurrencyExchangeRateView.as_view(), name="api-currencies"),
    path("api/securities/<int:security_pk>/prices/", SecurityPricesView.as_view(), name="api-securities"),
]
