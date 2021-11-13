# Run from the root project directory:
# docker build -t invertimo:v0 -f deployment/app/Dockerfile .
# To run on localhost (expects postgres running):
# docker run -d -p 8080:8081 --net=host invertimo:v0
FROM ubuntu:20.04

RUN apt-get update
RUN apt-get -y install pip tmux htop python3.8-venv

# Libpq is necessary for python PostgreSQL drivers.
RUN apt-get install -y libpq-dev

WORKDIR /usr/src/app


COPY requirements.txt ./
RUN python3.8 -m venv .
RUN ls .
RUN ./bin/pip3.8 install --no-cache-dir -r requirements.txt

COPY . .

CMD [ "./bin/gunicorn", "invertimo.wsgi" ]
