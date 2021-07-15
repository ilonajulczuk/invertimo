from django.contrib.auth import logout
from django.shortcuts import redirect, render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpRequest
from typing import Dict, Any


def index_view(request: HttpRequest) -> HttpResponse:
    if not request.user.is_authenticated:
        return render(request, "landing.html", {})
    return render(request, "index.html", {})


def login_view(request: HttpRequest):
    context : Dict[str, Any] = {}
    return render(request, "login.html", context)

def signup_view(request: HttpRequest):
    context : Dict[str, Any] = {}
    return render(request, "login.html", context)

def privacy_policy_view(request: HttpRequest)-> HttpResponse:
    context : Dict[str, Any] = {}
    return render(request, "privacy_policy.html", context)


def logout_view(request: HttpRequest)-> HttpResponse:
    logout(request)
    return redirect("/")
