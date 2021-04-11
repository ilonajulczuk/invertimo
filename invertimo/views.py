from django.contrib.auth import logout
from django.shortcuts import redirect, render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse


def index_view(request):
    if not  request.user.is_authenticated:
        return render(request, 'landing.html', {})
    return render(request, 'index.html', {})


def login_view(request):
    context = {}
    return render(request, 'login.html', context)


def privacy_policy_view(request):
    context = {}
    return render(request, 'privacy_policy.html', context)


def logout_view(request):
    logout(request)
    return redirect('/')
