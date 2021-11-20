# Building and running docker containers

Run from the root project directory:

```shell
docker build -t invertimo:v0 -f deployment/app/Dockerfile .
```

To run on localhost (expects postgres running):

```shell
docker run  --env-file deployment/secrets/invertimo.dev.env -v "`pwd`:/usr/src/app" --net=host invertimo:v0 /usr/src/venv/bin/python3.8 manage.py runserver


To run with docker compose:

```
docker compose up
```

This needs to be run to initialize db:

```
docker exec invertimo_web_1 sh -c "/usr/src/venv/bin/python3.8 manage.py migrate"

docker exec invertimo_web_1 sh -c "/usr/src/venv/bin/python3.8 manage.py loaddata finance/fixtures/exchanges.json"
```

This will mount the local directory and will automatically reload python code.
TODO(justyna): add an dev_entry point that will also reload the JS code, etc.

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