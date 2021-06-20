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

## Mypy type checking

Blog post I used for setup:

[https://sobolevn.me/2019/08/typechecking-django-and-drf](https://sobolevn.me/2019/08/typechecking-django-and-drf)

To call it, use

```bash
mypy invertimo
```

Setup in `setup.cfg`.