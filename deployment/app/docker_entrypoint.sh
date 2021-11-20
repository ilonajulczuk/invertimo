#!/bin/bash
/usr/src/venv/bin/python3.8 manage.py migrate --noinput
/usr/src/venv/bin/python3.8 manage.py collectstatic --noinput
/usr/src/venv/bin/gunicorn --workers 4 invertimo.wsgi