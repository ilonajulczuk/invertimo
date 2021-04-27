# invertimo


## Setting up the db

```
python manage.py migrate
python manage.py loaddata finance/fixtures/exchanges.json
```

Data dump was created with:

```
python manage.py dumpdata --natural-primary > finance/fixtures/exchanges.json
```