# Backend Architecture

<cite>
**Referenced Files in This Document**
- [Bootstrap.java](file://backend_java/bootstrap/src/main/java/com/aliyun/tam/x/tron/Bootstrap.java)
- [application.yaml](file://backend_java/bootstrap/src/main/resources/application.yaml)
- [pom.xml](file://backend_java/pom.xml)
- [AgentRegistry.java](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentRegistry.java)
- [AgentBuilder.java](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentBuilder.java)
- [AgentHandler.java](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentHandler.java)
- [ReActAgentHandler.java](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/ReActAgentHandler.java)
- [AgentConfig.java](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/config/AgentConfig.java)
- [A2AController.java](file://backend_java/api/src/main/java/com/aliyun/tam/x/tron/api/A2AController.java)
- [README.MD](file://backend_java/README.MD)
- [develop_guide.md](file://docs/en/develop_guide.md)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document describes the backend architecture of the Tron OneAgent system, a Spring Boot 3.5.9-based AI agent platform. The system is designed around a modular structure with clear separation of concerns across API, core, infrastructure, and utility layers. It integrates Alibaba AgentScope Java framework to enable ReAct agent capabilities and supports dynamic configuration, event sourcing, streaming protocols, and real-time communication. The backend interacts with external services including DashScope, Bailian, and OSS, and is designed for scalability and observability.

## Project Structure
The backend is organized as a Maven multi-module project with the following modules:
- bootstrap: Spring Boot application entrypoint and configuration
- api: REST and WebSocket endpoints for sessions, configuration, debugging, and A2A integration
- core: Agent lifecycle, builders, handlers, configuration, domain models, repositories, tools, RAG, MCP, and utilities
- infra: persistence layer (MyBatis-Plus), data access objects, storage providers, and tracing helpers
- utils: shared utilities (encryption, JSON helpers)

```mermaid
graph TB
subgraph "Modules"
BOOT["bootstrap"]
API["api"]
CORE["core"]
INFRA["infra"]
UTILS["utils"]
end
BOOT --> API
BOOT --> CORE
BOOT --> INFRA
BOOT --> UTILS
API --> CORE
CORE --> INFRA
CORE --> UTILS
INFRA --> UTILS
```

**Diagram sources**
- [pom.xml:11-16](file://backend_java/pom.xml#L11-L16)

**Section sources**
- [pom.xml:11-16](file://backend_java/pom.xml#L11-L16)
- [README.MD:40-52](file://backend_java/README.MD#L40-L52)

## Core Components
This section outlines the primary building blocks of the backend and their responsibilities:
- Bootstrap: Application entrypoint enabling async and scheduling, wiring the Spring Boot application
- AgentRegistry: Central registry for agent builders and cached agent handlers
- AgentBuilder: Contract for constructing agent configurations and handlers
- AgentHandler: Interface for handling user input, emitting events, and managing state
- ReActAgentHandler: Implementation of ReAct agent with streaming, tool use, and HITL support
- AgentConfig: Dynamic configuration model for agents, tools, MCP clients, knowledge bases, and skills
- A2AController: JSON-RPC transport and orchestration for Agent-to-Agent communication

```mermaid
classDiagram
class Bootstrap {
+main(args)
}
class AgentRegistry {
+getAgent(agentId, agentConfig, userId, sessionId) AgentHandler
+getAgentConfigById(agentId) AgentConfig
+getAgentConfigs() AgentConfig[]
}
class AgentBuilder {
+getAgentId() String
+getAgentConfig() AgentConfig
+build(agentId, config, userId, sessionId) AgentHandler
}
class AgentHandler {
+getId() String
+handleInput(input) AgentResult
+cancel(message) void
}
class ReActAgentHandler {
+handleInput(input) AgentResult
+saveTo(session, key) void
+loadFrom(session, key) void
+cancel(message) void
}
class AgentConfig {
+id : String
+name : String
+type : LocalAgentType
+chatModel : ChatModelConfig
+tools : AgentToolConfig[]
+mcpClients : AgentMcpConfig[]
+knowledgeBases : AgentKnowledgeBaseConfig[]
+skills : AgentSkillConfig[]
+supportInputTypes : ContentType[]
}
class A2AController {
+getAgentCard(agent_id) ResponseEntity
+jsonRpc(agent_id, headers, requestBody) ResponseEntity
}
Bootstrap --> AgentRegistry : "auto-wired"
AgentRegistry --> AgentBuilder : "manages"
AgentBuilder --> AgentHandler : "builds"
AgentHandler <|.. ReActAgentHandler : "implements"
A2AController --> AgentRegistry : "uses"
A2AController --> AgentHandler : "executes"
```

**Diagram sources**
- [Bootstrap.java:25-32](file://backend_java/bootstrap/src/main/java/com/aliyun/tam/x/tron/Bootstrap.java#L25-L32)
- [AgentRegistry.java:39-98](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentRegistry.java#L39-L98)
- [AgentBuilder.java:23-33](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentBuilder.java#L23-L33)
- [AgentHandler.java:35-46](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentHandler.java#L35-L46)
- [ReActAgentHandler.java:41-51](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/ReActAgentHandler.java#L41-L51)
- [AgentConfig.java:39-132](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/config/AgentConfig.java#L39-L132)
- [A2AController.java:67-240](file://backend_java/api/src/main/java/com/aliyun/tam/x/tron/api/A2AController.java#L67-240)

**Section sources**
- [Bootstrap.java:25-32](file://backend_java/bootstrap/src/main/java/com/aliyun/tam/x/tron/Bootstrap.java#L25-L32)
- [AgentRegistry.java:39-98](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentRegistry.java#L39-L98)
- [AgentBuilder.java:23-33](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentBuilder.java#L23-L33)
- [AgentHandler.java:35-46](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentHandler.java#L35-L46)
- [ReActAgentHandler.java:41-51](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/ReActAgentHandler.java#L41-L51)
- [AgentConfig.java:39-132](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/config/AgentConfig.java#L39-L132)
- [A2AController.java:67-240](file://backend_java/api/src/main/java/com/aliyun/tam/x/tron/api/A2AController.java#L67-240)

## Architecture Overview
The backend follows a layered architecture:
- Presentation Layer: REST endpoints and WebSocket JSON-RPC handlers
- Application Layer: Controllers and orchestrators (e.g., A2AController)
- Domain Layer: Agent lifecycle, configuration, and event-driven models
- Infrastructure Layer: Persistence, storage, and external service integrations

```mermaid
graph TB
subgraph "External Services"
DASH["DashScope"]
BAILIAN["Bailian"]
OSS["OSS"]
end
subgraph "Presentation"
REST["REST Controllers"]
WS["WebSocket JSON-RPC"]
end
subgraph "Application"
A2AC["A2AController"]
REG["AgentRegistry"]
end
subgraph "Domain"
CFG["AgentConfig"]
HANDLER["AgentHandler / ReActAgentHandler"]
end
subgraph "Infrastructure"
MYSQL["MySQL (MyBatis-Plus)"]
STORE["Storage Provider (OSS)"]
end
REST --> REG
WS --> REG
A2AC --> REG
REG --> HANDLER
HANDLER --> MYSQL
HANDLER --> STORE
HANDLER --> DASH
HANDLER --> BAILIAN
STORE --> OSS
```

**Diagram sources**
- [A2AController.java:67-240](file://backend_java/api/src/main/java/com/aliyun/tam/x/tron/api/A2AController.java#L67-240)
- [AgentRegistry.java:39-98](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentRegistry.java#L39-L98)
- [AgentHandler.java:35-46](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentHandler.java#L35-L46)
- [application.yaml:33-49](file://backend_java/bootstrap/src/main/resources/application.yaml#L33-L49)

**Section sources**
- [README.MD:54-87](file://backend_java/README.MD#L54-L87)
- [develop_guide.md:82-126](file://docs/en/develop_guide.md#L82-L126)
- [application.yaml:33-49](file://backend_java/bootstrap/src/main/resources/application.yaml#L33-L49)

## Detailed Component Analysis

### Bootstrap Application
- Purpose: Initializes the Spring Boot application with async and scheduling enabled
- Responsibilities: Application startup, auto-configuration, and module wiring
- Configuration: Port, context path, datasource, Jackson, multipart limits, and management endpoints

```mermaid
sequenceDiagram
participant JVM as JVM
participant Spring as SpringApplication
participant Cfg as application.yaml
participant Beans as Auto-configured Beans
JVM->>Spring : Bootstrap.main()
Spring->>Cfg : Load properties
Spring->>Beans : Initialize components
Beans-->>Spring : Ready
Spring-->>JVM : Application started
```

**Diagram sources**
- [Bootstrap.java:25-32](file://backend_java/bootstrap/src/main/java/com/aliyun/tam/x/tron/Bootstrap.java#L25-L32)
- [application.yaml:1-63](file://backend_java/bootstrap/src/main/resources/application.yaml#L1-L63)

**Section sources**
- [Bootstrap.java:25-32](file://backend_java/bootstrap/src/main/java/com/aliyun/tam/x/tron/Bootstrap.java#L25-L32)
- [application.yaml:1-63](file://backend_java/bootstrap/src/main/resources/application.yaml#L1-L63)

### AgentRegistry and AgentBuilder
- AgentRegistry: Manages agent builders, caches agent handlers keyed by agent config, user ID, and session ID, and wraps handlers with logging and tracing
- AgentBuilder: Defines the contract for building agent configurations and handlers; A2A publishing capability exposed via AgentCard

```mermaid
flowchart TD
Start(["Get Agent"]) --> CheckCfg["Resolve AgentConfig by agentId"]
CheckCfg --> BuildKey["Build Cache Key(userId, sessionId)"]
BuildKey --> CacheLookup["Lookup in LoadingCache"]
CacheLookup --> Found{"Found?"}
Found --> |Yes| ReturnHandler["Return cached AgentHandler"]
Found --> |No| BuildHandler["Instantiate AgentHandler via AgentBuilder"]
BuildHandler --> Wrap["Wrap with Logging/Tracing"]
Wrap --> Store["Store in Cache"]
Store --> ReturnHandler
```

**Diagram sources**
- [AgentRegistry.java:74-93](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentRegistry.java#L74-L93)
- [AgentBuilder.java:23-33](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentBuilder.java#L23-L33)

**Section sources**
- [AgentRegistry.java:39-98](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentRegistry.java#L39-L98)
- [AgentBuilder.java:23-33](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentBuilder.java#L23-L33)

### AgentHandler and ReActAgentHandler
- AgentHandler: Interface for handling inputs, supporting input type checks, cancellation, and state persistence via AgentScope’s Session mechanism
- ReActAgentHandler: Implements ReAct loop with streaming, tool use, reasoning, observation, and HITL; emits structured events to EventSink; tracks usage and timings

```mermaid
sequenceDiagram
participant Client as Client
participant Handler as ReActAgentHandler
participant Sink as EventSink
participant DB as MySQL
Client->>Handler : handleInput(userMessage, eventSink)
Handler->>Sink : newAgentMessage()
Handler->>Handler : stream(reasoning)
Handler->>Sink : appendContent(reasoning/thought)
Handler->>Sink : newAction(toolUse)
Handler->>Sink : appendContent(toolResult)
Handler->>Sink : changeAgentMessageStatus(SUCCEED/FAILED)
Handler->>DB : onComplete() -> batch write events
Handler-->>Client : result + usage
```

**Diagram sources**
- [AgentHandler.java:35-46](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentHandler.java#L35-L46)
- [ReActAgentHandler.java:64-239](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/ReActAgentHandler.java#L64-239)

**Section sources**
- [AgentHandler.java:35-46](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentHandler.java#L35-L46)
- [ReActAgentHandler.java:41-256](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/ReActAgentHandler.java#L41-L256)

### A2AController and Agent-to-Agent Integration
- A2AController: Exposes A2A endpoints, resolves AgentBuilder, constructs JsonRpcTransportWrapper, and executes requests via TronAgentExecutor
- TronAgentExecutor: Builds sessions/messages, creates EventSink, loads agent state, invokes AgentHandler, and enqueues JSON-RPC notifications

```mermaid
sequenceDiagram
participant Client as A2A Client
participant Ctrl as A2AController
participant Reg as AgentRegistry
participant Exec as TronAgentExecutor
participant Handler as AgentHandler
participant Sink as EventSink
participant DB as MySQL
Client->>Ctrl : GET /.well-known/agent-card.json
Ctrl->>Reg : getAgentBuilders()
Reg-->>Ctrl : AgentCard
Client->>Ctrl : POST /{agent_id}/ (JSON-RPC)
Ctrl->>Reg : getAgentBuilder(agent_id)
Ctrl->>Ctrl : getJsonRpcTransportWrapper()
Ctrl->>Exec : execute(requestContext, eventQueue)
Exec->>DB : newSession()/getSession()
Exec->>Sink : createEventSink()
Exec->>Handler : loadFrom(session)
Exec->>Handler : handleInput(AgentInput)
Handler->>Sink : emit events
Exec->>DB : onComplete() -> batch write
Exec-->>Ctrl : enqueue JSON-RPC notification
Ctrl-->>Client : JSON-RPC response
```

**Diagram sources**
- [A2AController.java:67-240](file://backend_java/api/src/main/java/com/aliyun/tam/x/tron/api/A2AController.java#L67-240)
- [AgentRegistry.java:74-93](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentRegistry.java#L74-L93)

**Section sources**
- [A2AController.java:67-240](file://backend_java/api/src/main/java/com/aliyun/tam/x/tron/api/A2AController.java#L67-240)
- [AgentRegistry.java:74-93](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/agents/AgentRegistry.java#L74-L93)

### Configuration and External Integrations
- AgentConfig: Centralized configuration for models, tools, MCP clients, knowledge bases, skills, and input types
- External services: DashScope API key, Bailian credentials, OSS bucket/region/endpoint, and encryption key configured via application.yaml

```mermaid
flowchart TD
Cfg["AgentConfig"] --> Model["ChatModelConfig"]
Cfg --> Tools["AgentToolConfig[]"]
Cfg --> MCP["AgentMcpConfig[]"]
Cfg --> KB["AgentKnowledgeBaseConfig[]"]
Cfg --> Skills["AgentSkillConfig[]"]
Model --> D["DashScope"]
MCP --> B["Bailian"]
KB --> B
Sink["EventSink"] --> O["OSS"]
```

**Diagram sources**
- [AgentConfig.java:39-132](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/config/AgentConfig.java#L39-L132)
- [application.yaml:33-49](file://backend_java/bootstrap/src/main/resources/application.yaml#L33-L49)

**Section sources**
- [AgentConfig.java:39-132](file://backend_java/core/src/main/java/com/aliyun/tam/x/tron/core/config/AgentConfig.java#L39-L132)
- [application.yaml:33-49](file://backend_java/bootstrap/src/main/resources/application.yaml#L33-L49)

## Dependency Analysis
The backend leverages Spring Boot 3.5.9 and AgentScope for agent orchestration, with external SDKs for DashScope, Bailian, and OSS. Dependencies are managed centrally in the root POM.

```mermaid
graph TB
ROOT["tron-java (POM)"]
SB["Spring Boot Dependencies"]
AGS["AgentScope (agentscope)"]
DSK["DashScope SDK"]
BAL["Bailian SDK"]
OSSSDK["Aliyun OSS SDK"]
MP["MyBatis-Plus"]
ROOT --> SB
ROOT --> AGS
ROOT --> DSK
ROOT --> BAL
ROOT --> OSSSDK
ROOT --> MP
```

**Diagram sources**
- [pom.xml:35-191](file://backend_java/pom.xml#L35-L191)

**Section sources**
- [pom.xml:19-33](file://backend_java/pom.xml#L19-L33)
- [pom.xml:35-191](file://backend_java/pom.xml#L35-L191)

## Performance Considerations
- Streaming and latency: ReActAgentHandler streams reasoning, tool use, and observations; WebSocket mode offers lower latency and richer events compared to SSE
- Metrics and tracing: AgentHandlerLoggingWrapper records timers and distributions for end-to-end latency and time-to-first-token metrics; OpenTelemetry tracing is integrated
- Concurrency: A2AController uses a bounded thread pool executor for JSON-RPC request handling
- Persistence batching: EventSink performs transactional batch writes to reduce DB overhead

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Missing agent card or 404: Verify AgentBuilder.publishAsA2AAgent returns a valid AgentCard and agent_id matches registered builders
- JSON-RPC errors: Inspect A2AController’s request handling and TronAgentExecutor for invalid requests or missing sessions
- SSE vs WebSocket: SSE does not support active cancellation or follow-up suggestions; use WebSocket for interactive features
- Environment variables: Ensure DB credentials, DashScope API key, Bailian keys, OSS bucket/region/endpoint, and encryption key are set

**Section sources**
- [A2AController.java:91-128](file://backend_java/api/src/main/java/com/aliyun/tam/x/tron/api/A2AController.java#L91-128)
- [develop_guide.md:645-754](file://docs/en/develop_guide.md#L645-L754)
- [application.yaml:33-51](file://backend_java/bootstrap/src/main/resources/application.yaml#L33-L51)

## Conclusion
The Tron OneAgent backend is a modular, event-sourced, and streaming-first system built on Spring Boot and AgentScope. It provides robust ReAct agent capabilities, dynamic configuration, and real-time communication via WebSocket while integrating external services like DashScope, Bailian, and OSS. The architecture emphasizes observability, scalability, and extensibility, enabling production-grade AI agent applications.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### System Context Diagram
```mermaid
graph TB
subgraph "Client Apps"
FE["Frontend Web/Desktop"]
Mobile["Mobile Clients"]
end
subgraph "Backend"
API["REST + WebSocket"]
A2A["A2A JSON-RPC"]
Core["Agent Core (ReAct/One)"]
Infra["Persistence + Storage"]
end
subgraph "External Services"
DS["DashScope"]
BL["Bailian"]
OS["OSS"]
end
FE --> API
Mobile --> API
FE --> A2A
API --> Core
A2A --> Core
Core --> Infra
Core --> DS
Core --> BL
Infra --> OS
```

**Diagram sources**
- [develop_guide.md:300-355](file://docs/en/develop_guide.md#L300-L355)
- [application.yaml:33-49](file://backend_java/bootstrap/src/main/resources/application.yaml#L33-L49)

### Data Flow and Event Sourcing
- Event sourcing captures user input, agent messages, content append, status changes, tasks, and actions
- SSE and WebSocket modes support real-time delivery; batch writes persist events and update message snapshots

**Section sources**
- [README.MD:54-87](file://backend_java/README.MD#L54-L87)
- [develop_guide.md:170-298](file://docs/en/develop_guide.md#L170-L298)