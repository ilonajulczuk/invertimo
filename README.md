# invertimo

Keep your investment financial records in one place. Make your gains, income and dividend easy to understand even if you use many different brokers, exchanges and different currencies are involved!

The app is as good as the data you feed it. For now it's integrated with Degiro, biggest EU stock broker.

- [Live version](https://invertimo.com)
- [Indie Hackers entry](https://www.indiehackers.com/product/invertimo)

## Setting up the db

```
python manage.py migrate
python manage.py loaddata finance/fixtures/exchanges.json
```

Data dump was created with:

```
python manage.py dumpdata --natural-primary > finance/fixtures/exchanges.json
```

## Mypy type checking

Blog post I used for setup:

[https://sobolevn.me/2019/08/typechecking-django-and-drf](https://sobolevn.me/2019/08/typechecking-django-and-drf)

To call it, use

```bash
mypy invertimo
```

Setup in `setup.cfg`.

## Running without docker

To run python:

```
# Load environment variables:
source deployment/secrets/local.env
# Activate the virtualenv:
source venv2/bin/activate
# Run the sever:
python3.8 manage.py runserver

```

To run and compile JS:

```
npx webpack --mode=development --watch
```

For bundle optimization use the bundle opmtimizer, e.g. like this:

```
npx webpack --json > stats.json
npx webpack-bundle-analyzer stats.json static
```

## Running locally with docker

See deployment/Readme.md for more info.


## Updating python dependencies

This project uses [pip-compile](https://github.com/jazzband/pip-tools#example-usage-for-pip-compile). Example workflow, e.g. adding a new package `celery`.

```shell
$ pip install celery
...
$ pip freeze | grep celery
celery==5.2.3
```

Add the celery to the `requirements.in` and then recompile `requirements.txt`.

```shell
$ pip-compile > requirements.txt
```