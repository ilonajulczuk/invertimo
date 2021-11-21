#!/bin/bash
/usr/src/venv/bin/python3.8 manage.py migrate --noinput
/usr/src/venv/bin/python3.8 manage.py collectstatic --noinput
npx webpack --mode=development --watch &
/usr/src/venv/bin/python3.8 manage.py runserver 0.0.0.0:8000