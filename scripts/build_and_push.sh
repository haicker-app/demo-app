#!/bin/sh

sudo docker build . -f ./dockerfiles/nginx.Dockerfile --platform linux/amd64 -t docker.registry.haicker.app/demo-app-nginx:latest
sudo docker build . -f ./dockerfiles/app.Dockerfile --platform linux/amd64 -t docker.registry.haicker.app/demo-app-app:latest

sudo docker push docker.registry.haicker.app/demo-app-nginx:latest
sudo docker push docker.registry.haicker.app/demo-app-app:latest