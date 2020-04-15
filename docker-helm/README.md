# Description

This docker image is used for a custom pipeline step in Drone CI server to install helm chart on k8s cluster, it is platform-dependent. Currently it depends on Digital Ocean's doctl.

# To build docker image run:

## Deprecated

    DOCKER_BUILDKIT=1 docker build -t docker-helm . --secret id=dotoken,src=dotoken.txt --progress=plain --build-arg CLUSTER_NAME=ft-k8s-cluster

## Current

    docker build -t ftwilson/docker-helm . --secret id=dotoken,src=dotoken.txt --progress=pl
    ain --build-arg CLUSTER_NAME=ft-k8s-cluster

# To push docker image

    docker tag <image id> ftwilson/docker-helm:<version>

    docker push ftwilson/docker-helm:<version>
