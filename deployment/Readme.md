# Building and running docker containers

Run from the root project directory:

```shell
docker build -t invertimo:v0 -f deployment/app/Dockerfile .
```

To run on localhost (expects postgres running):

```shell
docker run -d --net=host invertimo:v0
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