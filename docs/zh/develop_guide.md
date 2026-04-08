# 开发指南

## 核心流程

OneAgent最核心的流程是Chat，以下是一次对话过程（SSE API）中的不同阶段，详细解释一下相关的过程和原理。

### ReAct Agent Loop

结合Agentscope的ReAct Agent原理，描述其单次运行的流程。

```mermaid
graph TD
START[开始]
END[结束]
OUTPUT["输出成功结果"]
SUMMARIZE["总结失败输出"]

INPUT["组织输入(Messages)"]
REASONING["Reasoning<br/>(Call Model)"]
JUDGE{"是否有ACTING?<br/>(ToolUse)"}
ACTING["Acting<br/>(Call tools)"]
OBVERSING["Obversing<br/>(Tool results)"]
LIMIT{"是否超出\n最大循环次数?\n(maxIters)"}


subgraph AGENTLOOP["Agent Loop"]
INPUT --> REASONING
REASONING --> JUDGE
JUDGE -- 是 --> ACTING
ACTING --> OBVERSING
OBVERSING --> LIMIT
LIMIT -- 否 --> INPUT
end

START --> INPUT
JUDGE -- 否 --> OUTPUT
LIMIT -- 是 --> SUMMARIZE
SUMMARIZE --> END
OUTPUT --> END

style OUTPUT fill:#ccffcc,stroke:#00ff00,stroke-width:2px
style SUMMARIZE fill:#ffcccc,stroke:#ff0000,stroke-width:2px

```

注: 单次Agent调用可能会涉及到多轮循环，最终输出一个成功/失败的结果，OneAgent将其中Reasoning、Acting和Obersving的过程也通过异步事件的形式流式返回。

### Agent 初始化

```mermaid
sequenceDiagram
    participant Frontend as Frontend
    participant SessionController as SessionController
    participant AgentRegistry as AgentRegistry
    participant AgentBuilder as AgentBuilder
    participant AgentHandler as AgentHandler
    participant Mysql as Mysql

    Frontend ->> SessionController: /chat<br/>agentId<br/>userId<br/>sessionId
    SessionController ->> AgentRegistry: getAgent
    AgentRegistry ->> AgentRegistry: getAgentConfigById
    AgentRegistry ->> AgentBuilder: getAgentConfig
    AgentBuilder ->> Mysql: load dynamic configuration if exists
    AgentBuilder ->> AgentBuilder: merge dynamic and default configuration
    AgentBuilder -->> AgentRegistry: agent configuration
    AgentRegistry ->> AgentBuilder: build
    AgentBuilder ->> AgentBuilder: build chat model
    AgentBuilder ->> AgentBuilder: build knowledge bases
    AgentBuilder ->> AgentBuilder: build toolkit with code tools
    AgentBuilder ->> AgentBuilder: register & initialize MCP clients
    AgentBuilder ->> AgentBuilder: build skills and its execution environment
    AgentBuilder ->> AgentBuilder: load and assemble system prompts
    AgentBuilder ->> AgentBuilder: build long-term memory integrations
    AgentBuilder ->> AgentBuilder: build sub-agents
    AgentBuilder -->> AgentRegistry: AgentHandler and cache it
    AgentRegistry -->> SessionController: AgentHandler
    SessionController ->> AgentHandler: load state
    AgentHandler ->> Mysql: load state
    SessionController ->> Mysql: get existing or create new user session
    SessionController ->> SessionController: prepare input contents
    SessionController ->> AgentHandler: handle
    AgentHandler -->> Frontend: generate events and result
```

- SessionController: 负责提供 /chat API，处理输入内容，驱动对话流程，返回响应(SSE)
- AgentRegistry: Agent注册表，负责管理并初始化应用内所有的Agent
- AgentBuilder：Agent构造器，负责加载Agent的配置，以及初始化AgentHandler
- AgentHandler：Agent实例，根据用户输入和智能体配置，产生流式输出和最终结果


### 异步事件流

OneAgent具备丰富的输入和输出内容支持，并且通过最多三层嵌套结构以灵活的支持不同的场景。

```mermaid
classDiagram
    class Content {
        <<abstract>>
        +Long id
        +getType() ContentType
        +merge(Content c) boolean
    }
    
    class TextContent {
        +ContentType type
        +String text
        +merge(Content c) boolean
    }
    
    class MediaContent {
        +ContentType type
        +String url
        +String base64Data
        +String mediaType
    }
    
    class TaskContent {
        +String agentId
        +TaskStatus status
        +String title
        +String description
        +String result
        +List~Content~ contents
        +LocalDateTime gmtCreated
        +LocalDateTime gmtModified
        +LocalDateTime gmtFinished
        +findAction(Long actionId) ActionContent
        +append(List~Content~ newContents) void
    }
    
    class ActionContent {
        +ActionStatus status
        +Long taskId
        +String title
        +List~Content~ contents
        +LocalDateTime gmtCreated
        +LocalDateTime gmtModified
        +LocalDateTime gmtFinished
        +append(List~Content~ newContents) void
    }
    
    class SessionEvent {
        <<abstract>>
        +Long id
        +String agentId
        +String userId
        +String sessionId
        +LocalDateTime gmtCreated
        +getType() SessionEventType
    }
    
    class NewUserInputEvent {
        +UserSessionMessage msg
    }
    
    class NewAgentMessageEvent {
        +AgentSessionMessage msg
    }
    
    class AgentMessageAppendContentEvent {
        +Long messageId
        +List~Content~ newContents
    }
    
    class AgentMessageStatusChangedEvent {
        +Long messageId
        +SessionMessageStatus newStatus
        +LocalDateTime gmtFinished
    }
    
    class TaskAppendContentEvent {
        +Long messageId
        +Long taskId
        +List~Content~ newContents
    }
    
    class TaskStatusChangeEvent {
        +Long messageId
        +Long taskId
        +TaskStatus newStatus
        +String result
        +LocalDateTime gmtFinished
    }
    
    class ActionAppendContentEvent {
        +Long messageId
        +Long actionId
        +List~Content~ newContents
    }
    
    class ActionStatusChangeEvent {
        +Long messageId
        +Long actionId
        +ActionStatus newStatus
        +LocalDateTime gmtFinished
    }
    
    Content <|-- TextContent
    Content <|-- MediaContent
    Content <|-- TaskContent
    Content <|-- ActionContent
    TaskContent *-- Content : contains
    ActionContent *-- Content : contains
    
    SessionEvent <|-- NewUserInputEvent
    SessionEvent <|-- NewAgentMessageEvent
    SessionEvent <|-- AgentMessageAppendContentEvent
    SessionEvent <|-- AgentMessageStatusChangedEvent
    SessionEvent <|-- TaskAppendContentEvent
    SessionEvent <|-- TaskStatusChangeEvent
    SessionEvent <|-- ActionAppendContentEvent
    SessionEvent <|-- ActionStatusChangeEvent
    
    AgentMessageAppendContentEvent o-- Content : newContents
    TaskAppendContentEvent o-- Content : newContents
    ActionAppendContentEvent o-- Content : newContents
    TaskStatusChangeEvent --> TaskStatus
    ActionStatusChangeEvent --> ActionStatus
```

### Chat 完整流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant Frontend as 前端
    participant Controller as SessionController
    participant Registry as AgentRegistry
    participant Agent as AgentHandler
    participant EventSink as EventSink
    participant Mysql as MySQL
    participant SSE as SSE Stream

    Note over User,SSE: 1. Agent 初始化（按需加载，带缓存）
    Frontend ->> Controller: /chat (agentId, sessionId, userId, contents)
    Controller ->> Registry: getAgent(agentId)
    Registry -->> Controller: AgentHandler (缓存命中或新建)
    
    Note over Controller,Agent: 2. 会话与消息初始化
    Controller ->> Mysql: getOrCreateSession(sessionId)
    Mysql -->> Controller: Session
    Controller ->> Mysql: lastMessage(sessionId)
    Mysql -->> Controller: SessionMessage
    
    Note over Controller,SSE: 3. 创建事件流通道
    Controller ->> Controller: 创建 UserSessionMessage
    Controller ->> Controller: 创建 AgentSessionMessage
    Controller ->> EventSink: createEventSink(agentMessage.id)
    
    alt SSE 模式 (accept: text/event-stream)
        Controller ->> SSE: 返回 SseEmitter
        Controller ->> EventSink: 包装为 SSE EventSink
    else 异步模式
        Controller ->> Controller: 返回 "success"
    end
    
    Note over Agent,SSE: 4. Agent 处理与事件推送
    EventSink ->> EventSink: 缓存 newUserMessage 事件
    EventSink ->> EventSink: 缓存 newAgentMessage 事件
    Agent ->> Agent: loadFrom(session)
    Agent ->> Agent: handleInput(userMessage, eventSink)
    
    loop 流式处理
        Agent ->> EventSink: newEvent(SessionEvent)
        EventSink ->> EventSink: 缓存事件到内存列表
        EventSink ->> SSE: send(event) (SSE 模式)
    end
    
    Note over EventSink,Mysql: 5. 完成时批量写入
    Agent ->> EventSink: onComplete()
    EventSink ->> Mysql: 事务批量写入所有事件 (每批64条)
    EventSink ->> Mysql: 保存 SessionMessage
    EventSink ->> Mysql: 更新 Session lastAppliedEventId
    EventSink ->> SSE: complete() (SSE 模式)
    Agent ->> Agent: saveTo(session)
```

## API

## Tables

## 模型配置

## Tool开发&注册

## 知识库集成

## 长期记忆集成

## MCP Server集成

## 添加 Skills

## 多模态集成

### 图片输入

### 语音转文字（ASR）

### 文字转语音（TTS）
