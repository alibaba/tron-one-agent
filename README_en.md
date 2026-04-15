<div align="center">

# Tron OneAgent

[![GitHub Repo](https://img.shields.io/badge/GitHub-Repo-black.svg?logo=github)](https://github.com/alibaba/tron-one-agent)
[![Jdk](https://img.shields.io/badge/JDK-17%2B-green)]()
[![Node](https://img.shields.io/badge/Node-18%2B-green)]()
[![License](https://img.shields.io/badge/license-Apache%202.0-red.svg?logo=apache&label=License)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/alibaba/tron-one-agent?style=flat&logo=github&color=yellow&label=Stars)](https://github.com/alibaba/tron-one-agent/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/alibaba/tron-one-agent?style=flat&logo=github&color=purple&label=Forks)](https://github.com/alibaba/tron-one-agent/network)


<p align="center">
  <a href="README.md">中文</a>
</p>

</div>

## Overview

Tron OneAgent is an enterprise-grade AI Agent high-code development framework that provides out-of-the-box backend services and frontend interaction capabilities, covering the complete workflow of Agent construction.

### Core Features

- **Multi-Agent Architecture**: Business-oriented multi-agent architecture with support for local and remote sub-agent integration
- **Dual Protocol Support**: Supports both SSE and WebSocket protocols to meet different scenario needs, with WebSocket providing lower latency for real-time interaction
- **Asynchronous Event-Driven**: Asynchronous event-driven interaction protocol enabling pure async streaming output
- **Session-Level Persistence**: Three-layer isolation (Agent → User → Session) with complete session lifecycle management
- **Agent Control**: Built-in Cancel functionality allowing users to interrupt ongoing Agent tasks at any time
- **Smart Suggestions**: Integrated Follow-up Suggestion feature that automatically generates conversation suggestions for users
- **Dynamic Configuration**: Dynamically adjust configurations, tools, MCP, knowledge base, long-term memory, and skills without service restart
- **Modern Frontend**: Out-of-the-box modern UI interface with rich interactive components
- **Multimodal Support**: In addition to multimodal LLMs, also supports external TTS and ASR capabilities
- **Evaluation Framework**: Integrated Dokimos evaluation framework for Agent capability assessment and testing

Tron OneAgent is built on [Alibaba AgentScope Java](https://java.agentscope.io/zh/intro.html) and is fully compatible with its ecosystem.

## Why Tron OneAgent

- **Out-of-the-Box Enterprise Features**: Developers don't need to build agents from scratch, significantly lowering the development barrier and improving efficiency
- **Flexible Communication Protocols**: Supports both SSE and WebSocket protocols, with WebSocket mode providing lower latency and better real-time performance
- **Multi-Agent Collaboration**: Supports both ReAct single-agent mode and local/remote (A2A protocol) multi-agent orchestration for complex enterprise multi-department collaboration scenarios
- **Robust Session State Management**: Provides complete session lifecycle management and pure async streaming output
- **Powerful Interaction Control**: Built-in Cancel functionality for interrupting Agent execution; integrated Follow-up Suggestion for intelligent next-question recommendations
- **Dynamic Configuration & Debugging**: Supports hot configuration updates for convenient development debugging and production emergency handling
- **Rich Frontend Interactions**: Provides out-of-the-box modern UI interface with rich interactive components
- **Multimodal Capabilities**: Supports voice interaction (TTS/ASR), expanding Agent application scenarios
- **Evaluation & Testing**: Integrated Dokimos evaluation framework for convenient Agent capability assessment and continuous optimization

## Use Cases

- **Enterprise AI Assistant**: Enterprise-grade AI assistant supporting multi-agent collaboration, tool invocation, and knowledge base retrieval
- **Intelligent Customer Service System**: Smart customer service solution supporting user session isolation, long-term memory, and business system API integration

## Architecture

```mermaid
graph TB
  EndUser((End User))
  subgraph Client["Client (Node)"]
    Session[Session]
    Chat[Chat]
  end

  Developer((Developer))
  subgraph Control["Control (Node)"]
    Config[Configuration]
    Debugger[Debug]
  end

  subgraph Backend["Backend (Java)"]
    AgentScope[AgentScope]
  end

  subgraph Infrastructure
    Mysql[(MySQL)]
    OSS[("File Storage")]
    RAG[("Knowledge Base")]
    LongTermMemory[("Long-term Memory")]
    ModelAPI["Model API"]
    McpServer["MCP Server"]
  end

  RemoteSubAgent[Remote Sub-Agent]

  EndUser --> Client
  Developer --> Control

  Config --> Backend
  Debugger --> Backend
  Session --> Backend
  Chat --> Backend

  Backend --> Mysql
  Backend --> OSS
  Backend --> ModelAPI
  Backend --> RAG
  Backend --> LongTermMemory
  Backend --> McpServer
  Backend --> RemoteSubAgent
```

## Tech Stack

### Backend Technologies

| Component | Version | Description |
|-----------|---------|-------------|
| Spring Boot | 3.5.9 | Web Framework |
| JDK | 17 | Java Runtime Environment |
| AgentScope | 1.0.11 | AI Agent Framework |
| MyBatis-Plus | 3.5.15 | ORM Framework |
| MySQL | 5.7+ / 8.0+ | Database |
| A2A SDK | 0.3.2 | Agent-to-Agent Protocol |
| Alibaba Bailian SDK | 2.6.2 | Alibaba Cloud AI Services |

### Frontend Technologies

| Component | Version | Description |
|-----------|---------|-------------|
| React | 18.x | Frontend Framework |
| TypeScript | 5.x | Type Checking |
| Ant Design | 5.x | UI Component Library |
| Webpack | 5.x | Module Bundler |
| Yarn | 1.x/2.x | Package Manager |

## Quick Start (Local Deployment)

### Start Backend Service

```bash
cd backend_java

# 1. Database Initialization
mysql -u root -p -e "CREATE DATABASE tron_agent_java DEFAULT CHARACTER SET utf8mb4;"
mysql -u root -p tron_agent_java < bootstrap/src/main/resources/schema/init.sql

# 2. Configure Environment Variables
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=tron_agent_java
export DB_USER=root
export DB_PASS=your_password
export DASHSCOPE_API_KEY=your_dashscope_api_key

# 3. Compile and Start
mvn clean package -DskipTests
java -jar bootstrap/target/tron-java-bootstrap-1.0-SNAPSHOT.jar
```

Service will be available at: `http://localhost:8080`

### Start Frontend Application

```bash
cd frontend

# 1. Install Dependencies
yarn install

# 2. Start Development Server
yarn dev:client    # Start client application
yarn dev:control   # Start control panel application
```

Client will be available at: `http://localhost:3000`

## Documentation

| Topic | Description |
|-------|-------------|
| [Development Guide](docs/en/develop_guide.md) | Frontend and backend customization for enterprise-specific business needs |
| [Deployment Guide](docs/en/deploy_guide.md) | Deploy to production via VM or K8S |

## License

This project is licensed under the [Apache 2.0 License](LICENSE).

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
