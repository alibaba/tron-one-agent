# Tron One-Agent K8S 部署指南

本文档介绍如何在 Kubernetes 环境中部署 Tron One-Agent 系统，包括后端服务和前端应用。

## 目录

- [环境准备](#环境准备)
- [配置项](#配置项)
  - [后端环境变量](#后端环境变量)
  - [前端环境变量](#前端环境变量)
- [镜像构建&发布](#镜像构建发布)
  - [后端镜像构建](#后端镜像构建)
  - [前端镜像构建](#前端镜像构建)
  - [推送镜像到仓库](#推送镜像到仓库)
- [K8S部署](#k8s部署)
  - [数据库准备](#数据库准备)
  - [创建 ConfigMap](#创建-configmap)
  - [创建 Secret](#创建-secret)
  - [部署后端服务](#部署后端服务)
  - [部署前端服务](#部署前端服务)
  - [验证部署](#验证部署)

## 环境准备

在开始部署之前，请确保您已准备好以下资源：

- **Kubernetes 集群**: 1.20 或更高版本，推荐使用阿里云的ACS或ACK
- **镜像仓库**: 用于存储构建的 Docker 镜像，推荐使用阿里云ACR
- **Docker**: 用于构建镜像（可选，如使用 CI/CD 流水线）
- **MySQL**:  >=8.0。独立的数据库服务，推荐使用阿里云RDS
- **阿里云AK/SK**: 用于访问百炼知识库、记忆库、OSS 等云服务
- **百炼API KEY**: 用于访问阿里云百炼的模型API、TTS/ASR API、MCP Server等

## 配置项

Tron One-Agent 的配置主要通过环境变量实现，分为后端和前端两部分。

### 后端环境变量

后端服务基于 Spring Boot，支持通过环境变量覆盖默认配置。

| 环境变量 | 说明 | 示例值 | 必需 |
|---------|------|--------|------|
| `DB_HOST` | MySQL 数据库地址 | `mysql-service.default.svc.cluster.local` | 是 |
| `DB_PORT` | MySQL 数据库端口 | `3306` | 否（默认3306） |
| `DB_NAME` | 数据库名称 | `tron_agent_java` | 否（默认tron_agent_java） |
| `DB_USER` | 数据库用户名 | `root` | 是 |
| `DB_PASS` | 数据库密码 | `your_password` | 是 |
| `DASHSCOPE_API_KEY` | 阿里云 DashScope API Key | `sk-xxx` | 是 |
| `ALIBABA_CLOUD_ACCESS_KEY_ID` | 阿里云 AccessKey ID | `LTAI5t...` | 否 |
| `ALIBABA_CLOUD_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret | `xxx` | 否 |
| `FILE_SERVER_BASE_URL` | 文件服务基础 URL | `https://your-domain.com/api/files` | 否 |
| `OSS_BUCKET` | OSS Bucket 名称 | `your-bucket-name` | 否 |
| `OSS_REGION` | OSS 区域 | `cn-hangzhou` | 否 |
| `OSS_ENDPOINT` | OSS Endpoint | `oss-cn-hangzhou.aliyuncs.com` | 否 |


### 前端环境变量

前端应用通过 nginx 的 `envsubst` 在容器启动时注入环境变量。

| 环境变量 | 说明 | 示例值 | 必需 |
|---------|------|--------|------|
| `END_POINT` | 后端服务地址（不含协议） | `backend-service.default.svc.cluster.local:8080` | 是 |


## 镜像构建&发布

### 后端镜像构建

1. **编译打包后端项目**

```bash
cd backend_java
mvn clean package -DskipTests
```

构建成功后，jar 包位于：`bootstrap/target/tron-java-bootstrap-1.0-SNAPSHOT.jar`

2. **构建 Docker 镜像**

```bash
cd backend_java
docker build -t one-agent-backend:1.0.0 .
```

**可选：自定义镜像标签**

```bash
docker build -t your-registry.com/your-namespace/one-agent-backend:v1.0.0 .
```

### 前端镜像构建

1. **构建前端项目并打包镜像**

使用提供的构建脚本：

```bash
cd frontend

# 使用版本号作为标签
./build.sh -prod

# 或使用自定义标签
./build.sh -tag v1.0.0
```

该脚本会自动：
- 安装依赖（yarn install）
- 构建 control 应用（yarn build:control）
- 打包 Docker 镜像（one-agent-frontend:<version>）

2. **手动构建（可选）**

如果需要手动构建：

```bash
cd frontend

# 安装依赖
yarn install

# 构建前端应用
yarn build:control

# 构建 Docker 镜像
docker build -t one-agent-frontend:1.0.0 .
```

### 推送镜像到仓库

构建完成后，将镜像推送到您的镜像仓库：

```bash
# 登录到镜像仓库
docker login your-registry.com

# 标记镜像
docker tag one-agent-backend:1.0.0 your-registry.com/your-namespace/one-agent-backend:v1.0.0
docker tag one-agent-frontend:1.0.0 your-registry.com/your-namespace/one-agent-frontend:v1.0.0

# 推送镜像
docker push your-registry.com/your-namespace/one-agent-backend:v1.0.0
docker push your-registry.com/your-namespace/one-agent-frontend:v1.0.0
```

## K8S部署

### 数据库准备

在部署应用之前，需要确保 MySQL 数据库已就绪。

**初始化数据库表**

在数据库实例中，执行初始化脚本 `backend_java/bootstrap/src/main/resources/schema/init.sql` 用于初始化数据表。


### 创建 ConfigMap

创建包含非敏感配置的 ConfigMap：

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

应用配置：

```bash
kubectl apply -f one-agent-configmap.yaml
```

### 创建 Secret

创建包含敏感信息的 Secret（如数据库密码、API Key 等）：

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

**注意**：请将上述占位符替换为实际值。

应用配置：

```bash
kubectl apply -f one-agent-secret.yaml
```

### 部署后端服务

创建后端部署配置 `one-agent-backend-deployment.yaml`：

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

应用配置：

```bash
kubectl apply -f one-agent-backend-deployment.yaml
```

### 部署前端服务

创建前端部署配置 `one-agent-frontend-deployment.yaml`：

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

应用配置：

```bash
kubectl apply -f one-agent-frontend-deployment.yaml
```


### 使用 Ingress 代理服务

推荐使用阿里云 ALB 或 API Gateway 作为Ingress路由前后端服务，支持以下两种方式：

- **（推荐）** 配置两个路由规则，将 /control 开头的流量路由到 one-agent-frontend-service，将 /api 开头的流量路由到 one-agent-backend-service
- 所有流量都代理到 one-agent-frontend-service，它会根据路径前缀进行流量分发。

（可选）在 ALB 或 API Gateway 中配置自定义域名和SSL卸载等能力。

### 验证部署

1. **检查 Pod 状态**

```bash
kubectl get pods -n default
```

确保所有 Pod 状态为 `Running`：

```
NAME                        READY   STATUS    RESTARTS   AGE
one-agent-backend-xxxxx-xxxxx         1/1     Running   0          5m
one-agent-backend-xxxxx-xxxxx         1/1     Running   0          5m
one-agent-frontend-xxxxx-xxxxx        1/1     Running   0          5m
one-agent-frontend-xxxxx-xxxxx        1/1     Running   0          5m
```

2. **检查 Service**

```bash
kubectl get svc -n default
```

3. **访问应用**

使用 Ingress 直接访问对应的服务

```
http://your-domain.com/control/     # Control 控制台
```

## 常见问题

### 1. Pod 启动失败

- 检查日志：`kubectl logs <pod-name> -n default`
- 确认镜像名称和标签正确
- 确认 ConfigMap 和 Secret 已正确创建

### 2. 数据库连接失败

- 确认数据库服务可访问
- 检查数据库用户名和密码是否正确
- 确认数据库已初始化

### 3. 前端无法连接后端

- 确认 `END_POINT` 环境变量配置正确
- 检查网络策略是否允许前端访问后端
- 确认后端服务正常运行

### 4. SSE 连接断开

- 确认 nginx 配置中 `proxy_buffering off` 已生效
- 检查 Ingress 的超时配置
- 确认后端服务支持长连接

## 升级部署

### 滚动更新

更新镜像版本实现零停机升级：

```bash
# 更新后端
kubectl set image deployment/one-agent-backend one-agent-backend=your-registry.com/your-namespace/one-agent-backend:v1.0.1 -n default

# 更新前端
kubectl set image deployment/one-agent-frontend one-agent-frontend=your-registry.com/your-namespace/one-agent-frontend:v1.0.1 -n default
```

### 回滚

如果更新后出现问题，可以快速回滚：

```bash
# 查看历史版本
kubectl rollout history deployment/one-agent-backend -n default

# 回滚到上一个版本
kubectl rollout undo deployment/one-agent-backend -n default
kubectl rollout undo deployment/one-agent-frontend -n default
```

## 监控和日志

### 查看日志

```bash
# 查看后端日志
kubectl logs -f deployment/one-agent-backend -n default

# 查看前端日志
kubectl logs -f deployment/one-agent-frontend -n default

# 查看特定 Pod 日志
kubectl logs -f <pod-name> -n default
```
