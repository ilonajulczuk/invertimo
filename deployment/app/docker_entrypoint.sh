#!/bin/bash
/usr/src/venv/bin/python3.8 manage.py migrate --noinput
/usr/src/venv/bin/python3.8 manage.py collectstatic --noinput
/usr/src/venv/bin/gunicorn -b 0.0.0.0:8000 --workers 4 --timeout 300 invertimo.wsgi