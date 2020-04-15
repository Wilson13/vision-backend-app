FROM alpine/helm

ARG CLUSTER_NAME
ENV K8S_CLUSTER_NAME=${CLUSTER_NAME}

# Install curl & bash
RUN apk --no-cache add curl
RUN apk --no-cache add bash

# Install latest kubectl
# RUN mkdir -p /usr/local/bin/kubectl \ this will cause permission issue
RUN curl -LO https://storage.googleapis.com/kubernetes-release/release/`curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt`/bin/linux/amd64/kubectl
# && make -C /usr/local/bin/kubectl/ all
# | tar -xJC /usr/local/bin/kubectl/ \

ENV HOME=/config
RUN mv ./kubectl /usr/local/bin/kubectl \ 
    && set -x && \
    apk add --no-cache curl ca-certificates && \
    chmod +x /usr/local/bin/kubectl && \
    \
    # Create non-root user (with a randomly chosen UID/GUI).
    # adduser kubectl -Du 2342 -h /config && \
    \
    # Basic check it works.
    /usr/local/bin/kubectl version --client

# Install doctl
RUN curl -OL https://github.com/digitalocean/doctl/releases/download/v1.36.0/doctl-1.36.0-linux-amd64.tar.gz \
    && tar xf doctl-1.36.0-linux-amd64.tar.gz \
    && mv doctl /usr/local/bin/doctl \
    && chmod +x /usr/local/bin/doctl

# THIS DID NOT WORK AS RUNNING THE IMAGE STILL HAS DOCTL NOT SET UP
# /run/secrets/dotoken is the default secret location
# Run doctl to grab kubeconfig (kubernetes cluster list for grabbing cluster info)
# RUN --mount=type=secret,id=dotoken export DIGITALOCEAN_ACCESS_TOKEN=$(cat /run/secrets/dotoken) \
#   && /usr/local/bin/doctl kubernetes cluster kubeconfig save ${K8S_CLUSTER_NAME}

# Run doctl to grab kubeconfig (kubernetes cluster list for grabbing cluster info)
ENV DIGITALOCEAN_ACCESS_TOKEN=45dbf37b1f25ae4d67f78e008e12797610ef7d6240d444849f0e7e59c3f40b9e
RUN /usr/local/bin/doctl kubernetes cluster kubeconfig save ${K8S_CLUSTER_NAME}

# Update permission
# RUN chmod ugo+rwx /config/.kube/config

# Install helm
# RUN curl https://raw.githubusercontent.com/kubernetes/helm/master/scripts/get > install-helm.sh \
#   && chmod u+x install-helm.sh \
#   && ./install-helm.sh

# Add chart repo
RUN helm repo add chartmuseum https://ft-chart:vL49lXH6CEQV@chartmuseum.freshturfengineering.com

# Refresh charts
RUN helm repo update
# RUN ls "/usr/bin/"
# USER kubectl

# ENTRYPOINT ["/usr/local/bin/kubectl"]
ENTRYPOINT ["/usr/bin/helm"]