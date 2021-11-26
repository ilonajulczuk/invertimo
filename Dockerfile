# Run from the root project directory:
# docker build -t invertimo:v0 -f deployment/app/Dockerfile .
# To run on localhost (expects postgres running):
# docker run -d --net=host invertimo:v0
FROM ubuntu:20.04

RUN apt-get update
RUN apt-get -y install pip tmux htop python3.8-venv curl

# Libpq is necessary for python PostgreSQL drivers.
RUN apt-get install -y libpq-dev

WORKDIR /usr/src/app

COPY requirements.txt ./
RUN python3.8 -m venv /usr/src/venv
RUN ls .
RUN /usr/src/venv/bin/pip3.8 install --no-cache-dir -r requirements.txt

RUN echo "Installing nodejs"
RUN curl -sL https://deb.nodesource.com/setup_17.x | bash -
RUN apt-get install -y nodejs
COPY package.json .
COPY package-lock.json .
RUN npm install

COPY . .
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm run build
CMD [ "./deployment/app/docker_entrypoint.sh" ]