#!/bin/bash
./bin/python3.8 manage.py migrate --noinput
./bin/python3.8 manage.py collectstatic --noinput
./bin/gunicorn --workers 4 invertimo.wsgi