# Building and running docker containers

Run from the root project directory:

```shell
docker build -t invertimo:v0 -f deployment/app/Dockerfile .
```

To run on localhost (expects postgres running):

```shell
docker run -d --net=host invertimo:v0
```