# Building and running docker containers

Run from the root project directory:

```shell
docker build -t invertimo:v0 .
```

To run on localhost (expects postgres running):

```shell
source venv2/bin/activate
source deployment/secrets/local.env
python3.8 manage.py runserver
```

To run with docker compose:

```
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

```
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --force-recreate
```

This needs to be run to initialize db:

```
docker exec invertimo_web_1 sh -c "/usr/src/venv/bin/python3.8 manage.py migrate"

docker exec invertimo_web_1 sh -c "/usr/src/venv/bin/python3.8 manage.py loaddata finance/fixtures/exchanges.json"

docker exec staginginvertimocom_web_1 sh -c "/usr/src/venv/bin/python3.8 manage.py import_transactions --username=justyna --account_id=1 --filename=finance/transactions_example.csv"

docker exec staginginvertimocom_web_1 sh -c "/usr/src/venv/bin/python3.8 manage.py fetch_prices"
```


## Secrets (passwords, API keys, etc)

Are stored in a private repository.

It is included as a submodule:

```
git submodule add git@github.com:ilonajulczuk/invertimoenv.git secrets
```

To make changes, go into the directory `secrets`, edit files. Commit and push them.
Then in the outer repository `git add` the changes (without the trailing slash):

```
git add deployment/secrets
```

and commit that :).

To get submodules working after cloning the initial repo:

```
git submodule init
git submodule update
```