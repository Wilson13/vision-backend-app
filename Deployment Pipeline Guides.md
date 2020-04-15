# Deployment (CI/CD) Pipeline Setup

## Requirements

- Kubernetes
- Drone CI
- Argo CD
- Sealed Secrets

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

      export $(cat .drone.env)

- Set up docker to run against server

      docker-machine env drone-ci-droplet
      eval $(docker-machine env drone-ci-droplet)

- Run docker-compose up

      docker-compose -f docker-compose-drone-ci.yaml up -d

### THEN

### 2. Set up OAuth access on version control system

### 3. Set up secrets for private docker image repo (docker hub):

- Set up a secret call dockerconfigjson and paste ~/.docker/config.json values
- Used in pipeline as:

      image_pull_secrets:
      - dockerconfigjson

> Notes:
>
> 1. To logout from Drone CI UI, logout from the VCS that granted OAuth access.
>
> 2. If Drone CI is stuck in a build for too long or is not responding, consider SSH into VM (Droplet in DO) and check dockers containers. There could be some dangling containers causing this issue, or, consider increasing RAM for VM (currently using 8GB).

---

## Argo CD

### Installing

For production

    helm upgrade -i argo-release argo/argo-cd

For dev and staging (exposing the service)

    helm upgrade -i argo-release -f argo-values.yaml argo/argo-cd

argo-values.yaml

    installCRDs: false
    server:
    ingress:
    enabled: true
    annotations:
        kubernetes.io/ingress.class: nginx
        kubernetes.io/tls-acme: "true"
        nginx.ingress.kubernetes.io/ssl-passthrough: "true"
        cert-manager.io/cluster-issuer: letsencrypt-prod
        # If you encounter a redirect loop or are getting a 307 response code
        # then you need to force the nginx ingress to connect to the backend using HTTPS.
        #
        nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
        hosts:
        - staging.argo.freshturfengineering.com
        tls:
        - secretName: argocd-secret
            hosts:
            - staging.argo.freshturfengineering.com

### Application Level Setup

https://argoproj.github.io/argo-cd/getting_started/

---

## Sealed Secrets

### Cluster Side Installation

Install SealedSecret CRD, server-side controller into kube-system namespace.

    kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.9.7/controller.yaml

Source: https://github.com/bitnami-labs/sealed-secrets/releases

> Note: Chose not to use Helm Chart because it's stated that
>
> "Since the helm chart is currently maintained elsewhere (see https://github.com/helm/charts/tree/master/stable/sealed-secrets) the update of the helm chart might not happen in sync with releases here."

### Client Side Installation

    brew install kubeseal

### Usage

1.  First have a secret.yaml or secrets.json file with the secrets stored in it.

2.  Run below command to generate a file called sealed-secrets.yaml that can be applied into k8s. "<>" are mandatory for secrets file name.

        kubeseal <secrets.yaml file name> <sealed secrets file name> --format yaml

> Notes: 
>
> Always remember to encode secrets values before using kubesecrets, if not it might result in error.
>
> When using base64 command in terminal for "data" (base64 encoding) values instead of "stringData" (plain text) in secrets , be careful not to inlucde new lines.
>
> Command used is as below, notice the "-n" that means "do not print the trailing newline.":
>

> echo -n "password" | base64

---

<!-- ## Deploying latest app

### 1. git commit & git push

### 2. Trigger Drone CI pipeline via ftctl

    `ftctl release -v 1.0.0-beta.9 -p ../staging-auth-chart/`

This command will trigger Drone CI to pull latest commit (based on tag), build and push docker image.

It will also update helm chart values followed by pushing latest helm chart to chartmuseum.

#### ** Notes **: Always remember to update chart repo before installing/upgrading helm chart

#### In the CD part of the build pipeline, run the following commands:

1.  Update chart repo to fetch latest chart version

        helm repo update

2.  Upgrade chart

        helm upgrade --install -name auth-server-release --namespace auth-server chartmuseum/auth-chart -->
