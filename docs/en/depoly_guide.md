# Tron One-Agent K8S Deployment Guide

This document describes how to deploy the Tron One-Agent system in a Kubernetes environment, including backend services and frontend applications.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
  - [Backend Environment Variables](#backend-environment-variables)
  - [Frontend Environment Variables](#frontend-environment-variables)
- [Image Build & Push](#image-build--push)
  - [Backend Image Build](#backend-image-build)
  - [Frontend Image Build](#frontend-image-build)
  - [Push Images to Registry](#push-images-to-registry)
- [K8S Deployment](#k8s-deployment)
  - [Database Preparation](#database-preparation)
  - [Create ConfigMap](#create-configmap)
  - [Create Secret](#create-secret)
  - [Deploy Backend Service](#deploy-backend-service)
  - [Deploy Frontend Service](#deploy-frontend-service)
  - [Verify Deployment](#verify-deployment)

## Prerequisites

Before starting the deployment, ensure you have the following resources ready:

- **Kubernetes Cluster**: Version 1.20 or higher, Alibaba Cloud ACS or ACK recommended
- **Image Registry**: For storing built Docker images, Alibaba Cloud ACR recommended
- **Docker**: For building images (optional, if using CI/CD pipeline)
- **MySQL**: >= 8.0. Independent database service, Alibaba Cloud RDS recommended
- **Alibaba Cloud AK/SK**: For accessing Bailian knowledge base, memory store, OSS and other cloud services
- **Bailian API KEY**: For accessing Alibaba Cloud Bailian model API, TTS/ASR API, MCP Server, etc.

## Configuration

Tron One-Agent configuration is primarily implemented through environment variables, divided into backend and frontend parts.

### Backend Environment Variables

The backend service is based on Spring Boot and supports overriding default configurations through environment variables.

| Environment Variable | Description | Example Value | Required |
|---------|------|--------|------|
| `DB_HOST` | MySQL database address | `mysql-service.default.svc.cluster.local` | Yes |
| `DB_PORT` | MySQL database port | `3306` | No (default: 3306) |
| `DB_NAME` | Database name | `tron_agent_java` | No (default: tron_agent_java) |
| `DB_USER` | Database username | `root` | Yes |
| `DB_PASS` | Database password | `your_password` | Yes |
| `DASHSCOPE_API_KEY` | Alibaba Cloud DashScope API Key | `sk-xxx` | Yes |
| `ALIBABA_CLOUD_ACCESS_KEY_ID` | Alibaba Cloud AccessKey ID | `LTAI5t...` | No |
| `ALIBABA_CLOUD_ACCESS_KEY_SECRET` | Alibaba Cloud AccessKey Secret | `xxx` | No |
| `FILE_SERVER_BASE_URL` | File service base URL | `https://your-domain.com/api/files` | No |
| `OSS_BUCKET` | OSS Bucket name | `your-bucket-name` | No |
| `OSS_REGION` | OSS region | `cn-hangzhou` | No |
| `OSS_ENDPOINT` | OSS Endpoint | `oss-cn-hangzhou.aliyuncs.com` | No |


### Frontend Environment Variables

The frontend application injects environment variables at container startup using nginx's `envsubst`.

| Environment Variable | Description | Example Value | Required |
|---------|------|--------|------|
| `END_POINT` | Backend service address (without protocol) | `backend-service.default.svc.cluster.local:8080` | Yes |


## Image Build & Push

### Backend Image Build

1. **Compile and package the backend project**

```bash
cd backend_java
mvn clean package -DskipTests
```

After a successful build, the jar file is located at: `bootstrap/target/tron-java-bootstrap-1.0-SNAPSHOT.jar`

2. **Build Docker image**

```bash
cd backend_java
docker build -t one-agent-backend:1.0.0 .
```

**Optional: Custom image tag**

```bash
docker build -t your-registry.com/your-namespace/one-agent-backend:v1.0.0 .
```

### Frontend Image Build

1. **Build frontend project and package image**

Use the provided build script:

```bash
cd frontend

# Use version number as tag
./build.sh -prod

# Or use custom tag
./build.sh -tag v1.0.0
```

The script will automatically:
- Install dependencies (yarn install)
- Build control application (yarn build:control)
- Package Docker image (one-agent-frontend:<version>)

2. **Manual build (optional)**

If you need to build manually:

```bash
cd frontend

# Install dependencies
yarn install

# Build frontend applications
yarn build:control

# Build Docker image
docker build -t one-agent-frontend:1.0.0 .
```

### Push Images to Registry

After building, push the images to your registry:

```bash
# Login to registry
docker login your-registry.com

# Tag images
docker tag one-agent-backend:1.0.0 your-registry.com/your-namespace/one-agent-backend:v1.0.0
docker tag one-agent-frontend:1.0.0 your-registry.com/your-namespace/one-agent-frontend:v1.0.0

# Push images
docker push your-registry.com/your-namespace/one-agent-backend:v1.0.0
docker push your-registry.com/your-namespace/one-agent-frontend:v1.0.0
```

## K8S Deployment

### Database Preparation

Before deploying the application, ensure the MySQL database is ready.

**Initialize database tables**

In your database instance, execute the initialization script `backend_java/bootstrap/src/main/resources/schema/init.sql` to initialize the database tables.


### Create ConfigMap

Create a ConfigMap containing non-sensitive configurations:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: one-agent-config
  namespace: default
data:
  DB_HOST: "mysql-service.default.svc.cluster.local"
  DB_PORT: "3306"
  DB_NAME: "tron_agent_java"
  FILE_SERVER_BASE_URL: "https://your-domain.com/api/files"
  OSS_BUCKET: "your-bucket-name"
  OSS_REGION: "cn-hangzhou"
  OSS_ENDPOINT: "oss-cn-hangzhou.aliyuncs.com"
```

Apply the configuration:

```bash
kubectl apply -f one-agent-configmap.yaml
```

### Create Secret

Create a Secret containing sensitive information (such as database passwords, API Keys, etc.):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: one-agent-secret
  namespace: default
type: Opaque
stringData:
  DB_USER: "root"
  DB_PASS: "your_database_password"
  DASHSCOPE_API_KEY: "sk-your-api-key"
  ALIBABA_CLOUD_ACCESS_KEY_ID: "your-access-key-id"
  ALIBABA_CLOUD_ACCESS_KEY_SECRET: "your-access-key-secret"
```

**Note**: Replace the placeholders above with actual values.

Apply the configuration:

```bash
kubectl apply -f one-agent-secret.yaml
```

### Deploy Backend Service

Create the backend deployment configuration `one-agent-backend-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: one-agent-backend
  namespace: default
  labels:
    app: one-agent-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: one-agent-backend
  template:
    metadata:
      labels:
        app: one-agent-backend
    spec:
      containers:
      - name: one-agent-backend
        image: your-registry.com/your-namespace/one-agent-backend:v1.0.0
        ports:
        - containerPort: 8080
        envFrom:
        - configMapRef:
            name: one-agent-config
        - secretRef:
            name: one-agent-secret
        resources:
          requests:
            memory: "8Gi"
            cpu: "4"
          limits:
            memory: "8Gi"
            cpu: "4"
        livenessProbe:
          httpGet:
            path: /api/health/check
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 10
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            path: /api/health/check
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 5
          timeoutSeconds: 3
---
apiVersion: v1
kind: Service
metadata:
  name: one-agent-backend-service
  namespace: default
spec:
  selector:
    app: one-agent-backend
  ports:
  - port: 8080
    targetPort: 8080
  type: ClusterIP
```

Apply the configuration:

```bash
kubectl apply -f one-agent-backend-deployment.yaml
```

### Deploy Frontend Service

Create the frontend deployment configuration `one-agent-frontend-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: one-agent-frontend
  namespace: default
  labels:
    app: one-agent-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: one-agent-frontend
  template:
    metadata:
      labels:
        app: one-agent-frontend
    spec:
      containers:
      - name: one-agent-frontend
        image: your-registry.com/your-namespace/one-agent-frontend:v1.0.0
        ports:
        - containerPort: 80
        env:
        - name: END_POINT
          value: one-agent-backend-service.default.svc.cluster.local:8080
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: one-agent-frontend-service
  namespace: default
spec:
  selector:
    app: one-agent-frontend
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

Apply the configuration:

```bash
kubectl apply -f one-agent-frontend-deployment.yaml
```


### Use Ingress to Proxy Services

It is recommended to use Alibaba Cloud ALB or API Gateway as an Ingress router for frontend and backend services, supporting the following two approaches:

- **(Recommended)** Configure two routing rules: route traffic starting with /control to one-agent-frontend-service, and route traffic starting with /api to one-agent-backend-service
- Proxy all traffic to one-agent-frontend-service, which will distribute traffic based on path prefixes.

(Optional) Configure custom domains and SSL termination capabilities in ALB or API Gateway.

### Verify Deployment

1. **Check Pod Status**

```bash
kubectl get pods -n default
```

Ensure all Pods are in `Running` status:

```
NAME                        READY   STATUS    RESTARTS   AGE
one-agent-backend-xxxxx-xxxxx         1/1     Running   0          5m
one-agent-backend-xxxxx-xxxxx         1/1     Running   0          5m
one-agent-frontend-xxxxx-xxxxx        1/1     Running   0          5m
one-agent-frontend-xxxxx-xxxxx        1/1     Running   0          5m
```

2. **Check Services**

```bash
kubectl get svc -n default
```

3. **Access the Application**

Use Ingress to directly access the corresponding services:

```
http://your-domain.com/control/     # Control Console
```

## Troubleshooting

### 1. Pod Failed to Start

- Check logs: `kubectl logs <pod-name> -n default`
- Confirm image name and tag are correct
- Confirm ConfigMap and Secret are correctly created

### 2. Database Connection Failed

- Confirm database service is accessible
- Check if database username and password are correct
- Confirm database has been initialized

### 3. Frontend Cannot Connect to Backend

- Confirm `END_POINT` environment variable is configured correctly
- Check if network policies allow frontend to access backend
- Confirm backend service is running normally

### 4. SSE Connection Dropped

- Confirm `proxy_buffering off` is effective in nginx configuration
- Check Ingress timeout configuration
- Confirm backend service supports long connections

## Upgrade Deployment

### Rolling Update

Update image version to achieve zero-downtime upgrade:

```bash
# Update backend
kubectl set image deployment/one-agent-backend one-agent-backend=your-registry.com/your-namespace/one-agent-backend:v1.0.1 -n default

# Update frontend
kubectl set image deployment/one-agent-frontend one-agent-frontend=your-registry.com/your-namespace/one-agent-frontend:v1.0.1 -n default
```

### Rollback

If problems occur after update, you can quickly rollback:

```bash
# View history
kubectl rollout history deployment/one-agent-backend -n default

# Rollback to previous version
kubectl rollout undo deployment/one-agent-backend -n default
kubectl rollout undo deployment/one-agent-frontend -n default
```

## Monitoring and Logging

### View Logs

```bash
# View backend logs
kubectl logs -f deployment/one-agent-backend -n default

# View frontend logs
kubectl logs -f deployment/one-agent-frontend -n default

# View specific Pod logs
kubectl logs -f <pod-name> -n default
```
