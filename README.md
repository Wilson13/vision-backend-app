# CI/CD Pipeline Build Requirements

### 1. Helm installed (not required anymore)

### 2. Helm push installed (not required anymore)

    `helm plugin install https://github.com/chartmuseum/helm-push`

### 3. ChartMuseum repo added (must be named chartmeseum, not required anymore)

    `helm repo add chartmuseum http://chartmuseum.freshturfengineering.com`

### 4. Ftcli installed (npm i -g ftctl, optional)

### 5. Git set up and configured

# Connecting to MongoDB Replicaset deployed in k8s cluster (stable/mongodb-replicaset)

Each pod in a StatefulSet backed by a Headless Service will have a stable DNS name. The template follows this format: `<pod-name>`.`<service-name>`

This means the DNS names for the MongoDB replica set are:

    auth-release-mongodb-replicaset-0.auth-release-mongodb-replicaset
    auth-release-mongodb-replicaset-1.auth-release-mongodb-replicaset
    auth-release-mongodb-replicaset-2.auth-release-mongodb-replicaset

You can use these names directly in the connection string URI of your app.

In this case, the connection string URI would be:

    "mongodb://auth-release-mongodb-replicaset-0.auth-release-mongodb-replicaset,auth-release-mongodb-replicaset-1.auth-release-mongodb-replicaset,auth-release-mongodb-replicaset-2.auth-release-mongodb-replicaset:27017/<dbname>?replicaSet=rs0"

Source: https://codelabs.developers.google.com/codelabs/cloud-mongodb-statefulset/index.html?index=..%2F..index#0

# Connecting to MongoDB Replicaset deployed in k8s cluster (stable/mongodb with replicaset enabled)

Currently no way to change the MONGODB_ADVERTISED_HOSTNAME for Bitnami MongoDB docker image, so stick with the defaults.

This means the DNS names for the MongoDB replica set are:

    {{.Release.Name}}-mongodb-primary-0.{{.Release.Name}}-mongodb-headless.{{ .Release.Namespace }}.svc.cluster.local

    {{.Release.Name}}-mongodb-secondary-0.{{.Release.Name}}-mongodb-headless.{{ .Release.Namespace }}.svc.cluster.local

    {{.Release.Name}}-mongodb-arbiter-0.{{.Release.Name}}
    -mongodb-headless.{{ .Release.Namespace }}.svc.cluster.local:27017/

In this case, the connection string URI would be:

    mongodb://dbuser:password@{{.Release.Name}}-mongodb-primary-0.{{.Release.Name}}-mongodb-headless.{{ .Release.Namespace }}.svc.cluster.local,{{.Release.Name}}-mongodb-secondary-0.{{.Release.Name}}-mongodb-headless.{{ .Release.Namespace }}.svc.cluster.local,{{.Release.Name}}-mongodb-arbiter-0.{{.Release.Name}}-mongodb-headless.{{ .Release.Namespace }}.svc.cluster.local:27017/

# Commands

## To run in dev environment (ensure local mongodb process is running)

    npm run start

## To run in production (this connects to a hosted MongoDB Atlas)

    npm run start

## To Test

    npm run test

## To Test and View Coverage Report

    npm run test-coverage

## To deploy to Development environment

1. Run

   `ftctl release -v 0.1.0-beta.1 -p <path-to-chart> -f <values.yaml filename> -d .`

   Example

   `ftctl release -v 0.1.0-alpha.3 -p ./auth-chart -f dev-values.yaml -d .`

2. Perform git commit & git push.
3. Auto sync will be performed on staging argo, which is used for syncing dev and staging environment.

## To deploy to Staging environment

1. Perform PR and merge on VCS platform in staging branch.
2. Manual sync on staging argo.

## To deploy to Production environment

1. Perform PR and merge on VCS platform in master branch.
2. Create a tag.
3. Perform manual sync on production argo, which is used for syncing to only production environment and is not exposed.

> Note:
>
> This will trigger CI/CD pipeline and eventually new code would be released into k8s cluster, which connects to the MongoDB replicaset in the cluster. For more information, read Deployment Guidelines.
