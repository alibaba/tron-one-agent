# Tron OneAgent

Tron OneAgent 是一个企业级 AI Agent 开发平台，提供完整的后端服务框架和前端交互界面，帮助开发者快速构建生产级 AI Agent 应用。

## 项目简介

Tron OneAgent 基于 [Alibaba AgentScope](https://java.agentscope.io/zh/intro.html) 和 Spring Boot 3 构建，采用前后端分离架构，提供了从 Agent 构建、事件溯源、动态配置到可视化交互的一站式解决方案。

### 主要解决的问题

- **复杂的会话状态管理**：提供完整的会话生命周期管理和历史记录追溯
- **多模型集成困难**：支持阿里云百炼、OpenAI 等多种 LLM 模型的统一接入
- **调试和监控挑战**：基于事件溯源的全流程可观测性，支持实时事件流监控
- **动态配置需求**：无需重启服务即可动态调整 Agent 配置、工具、知识库等
- **前端交互复杂**：提供开箱即用的现代化 UI 界面和丰富的交互组件
- **多 Agent 协作**：支持本地和远程（A2A 协议）多智能体编排与协作

## 核心特性

### 🏗️ 后端能力

- **模块化分层架构**：API 层、核心业务层、基础设施层清晰分离
- **Event Sourcing 事件溯源**：完整的对话历史可追溯，支持事件回放和状态重建
- **动态配置系统**：支持运行时动态修改 Agent、MCP、知识库、Skill 配置
- **强大的调试能力**：提供工具、MCP、知识库、事件流等多维度调试接口
- **Skill 技能系统**：支持 zip 格式技能包，让 Agent 自主执行代码完成任务
- **灵活的扩展能力**：支持多模型、多工具、MCP 协议、A2A 协议等

### 🎨 前端能力

- **React + TypeScript**：现代化的前端技术栈，类型安全
- **Yarn Workspaces**：多包管理模式，包含 client、control、chatbox 三个子包
- **可复用组件库**：chatbox 提供完整的聊天界面组件库
- **响应式设计**：适配不同设备尺寸，流畅的用户体验
- **实时事件监控**：通过 SSE 实时展示 Agent 执行过程
- **可视化管理后台**：提供 Agent 配置、调试和管理的完整界面

## 技术栈

### 后端技术

| 组件 | 版本 | 说明 |
|------|------|------|
| Spring Boot | 3.5.9 | Web 框架 |
| JDK | 17 | Java 运行环境 |
| AgentScope | 1.0.8 | AI Agent 框架 |
| MyBatis-Plus | 3.5.15 | ORM 框架 |
| MySQL | 5.7+ / 8.0+ | 数据库 |
| A2A SDK | 0.3.2 | Agent-to-Agent 协议 |
| 阿里云百炼 SDK | 2.6.2 | 阿里云 AI 服务 |

### 前端技术

| 组件 | 版本 | 说明 |
|------|------|------|
| React | 18.x | 前端框架 |
| TypeScript | 5.x | 类型检查 |
| Ant Design | 5.x | UI 组件库 |
| Webpack | 5.x | 模块打包器 |
| Yarn | 1.x/2.x | 包管理器 |

## 项目结构

```
tron-one-agent/
├── backend_java/          # 后端服务
│   ├── api/              # REST API 层
│   ├── core/             # 核心业务逻辑
│   ├── infra/            # 基础设施层（数据持久化）
│   ├── bootstrap/        # 启动配置
│   └── utils/            # 工具类
├── frontend/             # 前端应用
│   ├── packages/
│   │   ├── chatbox/     # 通用聊天组件库
│   │   ├── client/      # 客户端应用
│   │   └── control/     # 控制台应用
│   └── ...
├── LICENSE               # Apache 2.0 许可证
└── README.md            # 本文件
```

## 快速开始

### 后端启动

```bash
cd backend_java

# 1. 数据库初始化
mysql -u root -p -e "CREATE DATABASE tron_agent_java DEFAULT CHARACTER SET utf8mb4;"
mysql -u root -p tron_agent_java < bootstrap/src/main/resources/schema/init.sql

# 2. 配置环境变量
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=tron_agent_java
export DB_USER=root
export DB_PASS=your_password
export DASHSCOPE_API_KEY=your_dashscope_api_key

# 3. 编译并启动
mvn clean package -DskipTests
java -jar bootstrap/target/tron-java-bootstrap-1.0-SNAPSHOT.jar
```

服务将在 `http://localhost:8080` 启动。

### 前端启动

```bash
cd frontend

# 1. 安装依赖
yarn install

# 2. 启动开发服务器
yarn dev:client    # 启动客户端应用
yarn dev:control   # 启动控制台应用
```

客户端将在 `http://localhost:3000` 启动。

## 适用场景

- **企业智能助手**：构建支持工具调用、知识库检索的企业级 AI 助手
- **多 Agent 协作系统**：需要多个专业 Agent 协同完成复杂任务
- **对话机器人**：需要管理用户会话、支持长期记忆的对话系统
- **AI 工作流编排**：需要将 AI 能力与业务系统深度集成
- **智能客服系统**：需要可视化配置和监控的客服解决方案

## 详细文档

- **[后端详细文档](backend_java/README.MD)**
  - 完整的 API 文档
  - 开发指南和最佳实践
  - 数据库表结构说明
  - 常见问题解答

- **[前端详细文档](frontend/README.md)**
  - 组件库使用指南
  - 开发和构建说明
  - 部署和配置指南
  - 常见问题解答

## Docker 部署

### 后端 Docker 部署

```bash
# 构建镜像
docker build -f backend_java/Dockerfile -t tron-agent-java:latest .

# 运行容器
docker run -d \
  --name tron-agent \
  -p 8080:8080 \
  -e DB_HOST=mysql_host \
  -e DB_PORT=3306 \
  -e DB_NAME=tron_agent_java \
  -e DB_USER=root \
  -e DB_PASS=password \
  -e DASHSCOPE_API_KEY=your_api_key \
  tron-agent-java:latest
```

### 前端 Docker 部署

```bash
# 构建镜像
docker build -f frontend/Dockerfile -t tron-agent-frontend:latest .

# 运行容器
docker run -d \
  --name tron-frontend \
  -p 80:80 \
  tron-agent-frontend:latest
```

## 开源许可

本项目采用 [Apache 2.0 许可证](LICENSE)。

```
Copyright 2026 the original author or authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## 社区与支持

- **问题反馈**：请通过 Issue 提交问题和建议
- **贡献代码**：欢迎提交 Pull Request
- **技术咨询**：请通过 Issue 联系

## 相关资源

- [Alibaba AgentScope 官方文档](https://java.agentscope.io/zh/intro.html)
- [Spring Boot 官方文档](https://spring.io/projects/spring-boot)
- [React 官方文档](https://react.dev/)
- [Ant Design 官方文档](https://ant.design/)
