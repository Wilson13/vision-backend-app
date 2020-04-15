# CI/CD Pipeline Setup

## Requirements

### 1. Helm installed

### 2. Helm push installed

    `helm plugin install https://github.com/chartmuseum/helm-push`

### 3. ChartMuseum repo added (must be named chartmeseum)

    `helm repo add chartmuseum http://chartmuseum.freshturfengineering.com`

### 4. Ftcli installed (npm i -g ftctl)

### 5. Git set up and configured

---

## Test Helm Chart Install

    helm upgrade --install -name auth-server-release --namespace auth-server staging-auth-chart

Note: Add --dry-run for checking yaml content

---

## Setting up Kubernetes

### 1. Exposing K8s Services

- Install Nginx Ingress Controller

        helm install nginx-ingress stable/nginx-ingress --set controller.publishService.enabled=true

- Point A (, AAAA, and CNAME) records on DNS server towards Nginx Ingress Controller's (LoadBalancer) external IP address.

- Setup ingress.yaml

Source:

https://www.digitalocean.com/community/tutorials/how-to-set-up-an-nginx-ingress-on-digitalocean-kubernetes-using-helm

### 2. Create ConfigMap (Should be replaced with a helm chart configmap.yaml, secrets should be stored in VCS only)

    kubectl create configmap auth-env-config --from-env-file=.env

Source:

https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/#create-configmaps-from-files

### 3. Set up TLS by installing cert manager

Source:

- https://cert-manager.io/docs/installation/kubernetes/#installing-with-helm
- https://docs.bitnami.com/kubernetes/how-to/secure-kubernetes-services-with-ingress-tls-letsencrypt/

---

## Setting up Chart Museum

### 1. Persistent Volume Claim (DO)

    kubectl create -f do-pvc.yaml

### 2. Install ChartMuseum

    docker run \
    -d \
    -p 8080:8080 \
    -v $(pwd)/charts:/charts \
    -e STORAGE=local \
    -e STORAGE_LOCAL_ROOTDIR=/charts \
    chartmuseum/chartmuseum:latest

OR

    helm install <release-name> -f chartmuseum-values.yaml stable/chartmuseum

    Notes: Basic auth enabled and secrets are stored in k8s cluster via command below:

    `kubectl create secret generic chartmuseum-secret --from-literal="basic-auth-user=<user>" --from-literal="basic-auth-pass=<password>`

---

## Setting Up Drone CI

### 1. Install Drone CI Server

- Download

  docker pull drone/drone:1

- Start Drone CI Server

      docker run \
      --volume=/var/lib/drone:/data \
      --env=DRONE_AGENTS_ENABLED=true \
      --env=DRONE_BITBUCKET_CLIENT_ID=${DRONE_BITBUCKET_CLIENT_ID} \
      --env=DRONE_BITBUCKET_CLIENT_SECRET=${DRONE_BITBUCKET_CLIENT_SECRET} \
      --env=DRONE_RPC_SECRET=${DRONE_RPC_SECRET} \
      --env=DRONE_SERVER_HOST=${DRONE_SERVER_HOST} \
      --env=DRONE_SERVER_PROTO=${DRONE_SERVER_PROTO} \
      --env=DRONE_COOKIE_TIMEOUT=48h \
      --publish=80:80 \
      --publish=443:443 \
      --restart=always \
      --detach=true \
      --name=drone-server \
      drone/drone:1

- Install Drone CI Runner

      docker run -d \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -e DRONE_RPC_PROTO=${DRONE_SERVER_PROTO} \
        -e DRONE_RPC_HOST=${DRONE_SERVER_HOST} \
        -e DRONE_RPC_SECRET=${DRONE_BITBUCKET_CLIENT_SECRET} \
        -e DRONE_RUNNER_CAPACITY=2 \
        -e DRONE_RUNNER_NAME=drone-runner \
        -p 3000:3000 \
        --restart always \
        --name drone-server \
        drone/drone-runner-docker:1

### OR

- Load environment variables

      export \$(cat .drone.env)

- Set up docker to run against server

      docker-machine env drone-ci-droplet
      eval \$(docker-machine env drone-ci-droplet)

- Run docker-compose up

      docker-compose -f docker-compose-drone-ci.yaml up -d

### THEN

### 2. Set up OAuth access on version control system

### 3. Set up secrets for private docker image repo (docker hub):

- Set up a secret call dockerconfigjson and paste ~/.docker/config.json values
- Used in pipeline as:

      image_pull_secrets:
      - dockerconfigjson

#### Notes: To logout from Drone CI UI, logout from the VCS that granted OAuth access.

---

## Deploying latest app

### 1. git commit & git push

### 2. Trigger Drone CI pipeline via ftctl

    `ftctl release-stage -v 1.0.0-beta.9 -p ../staging-auth-chart/`

This command will trigger Drone CI to pull latest commit (based on tag), build and push docker image.

It will also update helm chart values followed by pushing latest helm chart to chartmuseum.

#### ** Notes **: Always remember to update chart repo before installing/upgrading helm chart

#### In the CD part of the build pipeline, run the following commands:

1.  Update chart repo to fetch latest chart version

        helm repo update

2.  Upgrade chart

        helm upgrade --install -name auth-server-release --namespace auth-server chartmuseum/auth-chart
