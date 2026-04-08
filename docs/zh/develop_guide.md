# 开发指南

## 核心流程

OneAgent最核心的流程是Chat，以下是一次对话过程（SSE API）中的不同阶段，详细解释一下相关的过程和原理。

### ReAct Agent Loop

结合Agentscope的ReAct Agent原理，描述其单次运行的流程。

```mermaid
graph TD
START((开始))
END((结束))
OUTPUT["输出成功结果"]
SUMMARIZE["总结失败输出"]

INPUT["构造上下文(Context)"]
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

OneAgent 提供运行时 API 用于会话管理和对话交互。

**基础路径**: `/api/agents/{agent_id}`（由 `server.servlet.context-path` 配置为 `/api`）

---

### 运行时 API

运行时 API 用于会话管理和对话交互，路径前缀：`/agents/{agent_id}`

#### 1. 创建会话

**Path**: `POST /agents/{agent_id}/sessions`

**用途**: 为指定 Agent 创建新会话

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agent_id | string | 是 | Agent ID |

**请求头**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| X-User-Id | string | 是 | 用户 ID |

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 会话名称 |

**返回值**: 会话 ID（字符串）

**示例**:

```bash
curl -X POST http://localhost:8080/api/agents/one_agent/sessions \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test_user" \
  -d '{"name":"测试会话"}'
```

```json
"b6aa5fad7ff84271b59a897baa159d26"
```

#### 2. 获取会话列表

**Path**: `GET /agents/{agent_id}/sessions`

**用途**: 分页获取用户的会话列表

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agent_id | string | 是 | Agent ID |

**请求头**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| X-User-Id | string | 是 | 用户 ID |

**查询参数**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| pageNo | int | 否 | 1 | 页码（从 1 开始） |
| pageSize | int | 否 | 10 | 每页数量（1-100） |

**返回值**:

| 字段 | 类型 | 说明 |
|------|------|------|
| totalRecords | int | 总记录数 |
| records | array | 会话列表 |
| pageNum | int | 当前页码 |
| pageSize | int | 每页数量 |
| totalPages | int | 总页数 |

**示例**:

```bash
curl http://localhost:8080/api/agents/one_agent/sessions \
  -H "X-User-Id: test_user"
```

```json
{
  "totalRecords": 1,
  "records": [
    {
      "id": "b6aa5fad7ff84271b59a897baa159d26",
      "name": "测试会话",
      "lastAppliedEventId": 0,
      "gmtCreated": "2026-04-08 11:24:54",
      "gmtModified": "2026-04-08 11:24:54"
    }
  ],
  "pageNum": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

#### 3. 获取会话详情

**Path**: `GET /agents/{agent_id}/sessions/{session_id}`

**用途**: 获取指定会话的详细信息（包含消息列表）

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agent_id | string | 是 | Agent ID |
| session_id | string | 是 | 会话 ID |

**请求头**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| X-User-Id | string | 是 | 用户 ID |

**返回值**: 会话详情（包含 messages 字段）

**示例**:

```bash
curl http://localhost:8080/api/agents/one_agent/sessions/b6aa5fad7ff84271b59a897baa159d26 \
  -H "X-User-Id: test_user"
```

```json
{
  "id": "b6aa5fad7ff84271b59a897baa159d26",
  "userId": "test_user",
  "agentId": "one_agent",
  "name": "测试会话",
  "lastAppliedEventId": 0,
  "gmtCreated": "2026-04-08 11:24:54",
  "gmtModified": "2026-04-08 11:24:54",
  "messages": {
    "totalRecords": 0,
    "records": [],
    "pageNum": 1,
    "pageSize": 10,
    "totalPages": 0
  }
}
```

#### 4. 删除会话

**Path**: `DELETE /agents/{agent_id}/sessions/{session_id}`

**用途**: 删除指定会话

**路径参数**: 同上

**请求头**: 同上

#### 5. 获取会话消息列表

**Path**: `GET /agents/{agent_id}/sessions/{session_id}/messages`

**用途**: 分页获取会话的消息列表

**查询参数**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| pageNo | int | 否 | 1 | 页码 |
| pageSize | int | 否 | 10 | 每页数量 |

**返回值**: 分页消息列表

#### 6. 获取会话事件列表

**Path**: `GET /agents/{agent_id}/sessions/{session_id}/events`

**用途**: 分页获取会话的事件列表（Event Sourcing 模式）

**查询参数**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| offset | long | 否 | 0 | 偏移量 |
| size | int | 否 | 10 | 获取数量（1-100） |

**返回值**: 事件列表（SessionEvent 数组）

#### 7. 发起对话（核心 API）

**Path**: `POST /agents/{agent_id}/sessions/{session_id}/chat`

**用途**: 向 Agent 发送消息并获取响应

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agent_id | string | 是 | Agent ID |
| session_id | string | 是 | 会话 ID |

**请求头**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| X-User-Id | string | 是 | 用户 ID |
| X-User-Name | string | 否 | 用户名称 |
| Accept | string | 否 | 响应格式：`text/event-stream`（SSE 流式）或省略（异步） |

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| input | array | 是 | 输入内容列表 |

**input 数组元素**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | int | 是 | 内容类型：1=文本，3=图片，4=视频，5=音频 |
| text | string | 条件 | 文本内容（type=1 时必填） |
| url | string | 条件 | 媒体 URL（type=3/4/5 时必填） |
| base64Data | string | 条件 | 媒体 Base64 数据（type=3/4/5 时可选） |

**响应模式**:

1. **SSE 流式模式**（推荐）: 设置 `Accept: text/event-stream`，返回 Server-Sent Events 流
2. **异步模式**: 不设置 Accept 头，立即返回 "success"，后台处理

**SSE 事件类型**:

- `NEW_USER_INPUT` (10): 用户输入事件
- `NEW_AGENT_MESSAGE` (20): 新 Agent 消息事件
- `AGENT_MESSAGE_APPEND_CONTENT` (21): Agent 消息内容追加
- `AGENT_MESSAGE_STATUS_CHANGED` (22): Agent 消息状态变更
- `TASK_APPEND_CONTENT` (30): 任务内容追加
- `TASK_STATUS_CHANGED` (31): 任务状态变更
- `ACTION_APPEND_CONTENT` (40): 动作内容追加
- `ACTION_STATUS_CHANGED` (41): 动作状态变更

**示例（SSE 模式）**:

```bash
curl -N -X POST http://localhost:8080/api/agents/one_agent/sessions/b6aa5fad7ff84271b59a897baa159d26/chat \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test_user" \
  -H "Accept: text/event-stream" \
  -d '{"input":[{"type":1,"text":"你好"}]}'
```

**SSE 流输出示例**:

```
event:NEW_AGENT_MESSAGE
data:{"id":2,"agentId":"one_agent","userId":"test_user","sessionId":"b6aa5fad7ff84271b59a897baa159d26","msg":{"id":2,"status":"EXECUTING","gmtCreate":"2026-04-08 11:30:00"},"type":20}

event:AGENT_MESSAGE_APPEND_CONTENT
data:{"id":3,"agentId":"one_agent","userId":"test_user","sessionId":"b6aa5fad7ff84271b59a897baa159d26","messageId":2,"newContents":[{"id":1,"type":1,"text":"你好！"}],"type":21}

event:AGENT_MESSAGE_STATUS_CHANGED
data:{"id":4,"agentId":"one_agent","userId":"test_user","sessionId":"b6aa5fad7ff84271b59a897baa159d26","messageId":2,"newStatus":"SUCCEED","gmtFinished":"2026-04-08 11:30:05","type":22}
```

---

## 数据库表结构

OneAgent 使用 MySQL 数据库，采用 **Event Sourcing** 模式存储会话和事件数据。以下是所有表的详细说明。

---

### 1. sequences（序列号表）

**作用**: 全局唯一 ID 生成器，为事件、消息、任务等提供自增序列号

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT UNSIGNED | 主键，自增 |
| name | SMALLINT | 序列名称（枚举值：EVENT=1, MESSAGE=2, TASK=3, ACTION=4） |
| current_value | BIGINT UNSIGNED | 当前序列值 |
| gmt_modified | TIMESTAMP | 修改时间 |
| gmt_created | TIMESTAMP | 创建时间 |

---

### 2. agents（Agent 配置表）

**作用**: 存储 Agent 的动态配置，支持运行时修改配置并持久化

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT UNSIGNED | 主键，自增 |
| agent_id | VARCHAR(32) | Agent 唯一标识（如：one_agent） |
| name | VARCHAR(128) | Agent 显示名称 |
| enabled | TINYINT | 是否启用（1=启用，0=禁用） |
| type | SMALLINT | Agent 类型（1=普通 Agent，2=主 Agent） |
| config | MEDIUMTEXT | Agent 完整配置（JSON 格式，包含模型、工具、知识库等） |
| gmt_modified | TIMESTAMP | 修改时间 |
| gmt_created | TIMESTAMP | 创建时间 |

**样例数据**:

```json
{
  "id": 1,
  "agent_id": "one_agent",
  "name": "小AI",
  "enabled": 1,
  "type": 2,
  "config": "{\"chatModel\":{\"type\":2,\"modelName\":\"qwen3.6-plus\"},\"systemPrompt\":\"You are a helpful assistant.\",\"maxIters\":10,\"tools\":[],\"mcpClients\":[]}",
  "gmt_created": "2026-04-01 10:00:00"
}
```

---

### 3. agent_states（Agent 状态表）

**作用**: 存储 Agent 的会话状态，支持上下文持久化和恢复

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT UNSIGNED | 主键，自增 |
| agent_id | VARCHAR(32) | Agent ID |
| user_id | VARCHAR(64) | 用户 ID |
| session_id | VARCHAR(64) | 会话 ID |
| data | MEDIUMTEXT | Agent 状态数据（JSON 格式，包含对话历史等） |
| gmt_modified | TIMESTAMP | 修改时间 |
| gmt_created | TIMESTAMP | 创建时间 |

**索引**: `uk_session_agent` (session_id, agent_id) - 唯一索引

**样例数据**:

```json
{
  "id": 1,
  "agent_id": "one_agent",
  "user_id": "user_001",
  "session_id": "sess_abc123",
  "data": "{\"messages\":[{\"role\":\"user\",\"content\":\"你好\"},{\"role\":\"assistant\",\"content\":\"你好！有什么可以帮助你的？\"}]}",
  "gmt_modified": "2026-04-08 11:30:00"
}
```

---

### 4. sessions（会话表）

**作用**: 存储会话基本信息，追踪会话的事件应用进度

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT UNSIGNED | 主键，自增 |
| agent_id | VARCHAR(32) | Agent ID |
| user_id | VARCHAR(64) | 用户 ID |
| session_id | VARCHAR(64) | 会话唯一标识 |
| name | VARCHAR(128) | 会话名称（默认空字符串） |
| last_applied_event_id | BIGINT UNSIGNED | 最后应用的事件 ID（用于事件回放） |
| gmt_modified | TIMESTAMP | 修改时间 |
| gmt_created | TIMESTAMP | 创建时间 |

**索引**:
- `uk_session` (session_id, agent_id) - 唯一索引
- `idx_agent_user` (agent_id, user_id) - 普通索引，用于查询用户的会话列表

**样例数据**:

```json
{
  "id": 1,
  "agent_id": "one_agent",
  "user_id": "user_001",
  "session_id": "b6aa5fad7ff84271b59a897baa159d26",
  "name": "测试会话",
  "last_applied_event_id": 15,
  "gmt_created": "2026-04-08 11:24:54"
}
```

---

### 5. messages（消息表）

**作用**: 存储用户消息和 Agent 消息的快照（最终状态）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT UNSIGNED | 主键（从序列号表获取） |
| agent_id | VARCHAR(32) | Agent ID |
| user_id | VARCHAR(64) | 用户 ID |
| session_id | VARCHAR(64) | 会话 ID |
| type | SMALLINT | 消息类型（1=用户消息，2=Agent 消息） |
| status | SMALLINT | 消息状态（10=执行中，20=成功，30=失败） |
| data | MEDIUMTEXT | 消息完整内容（JSON 格式） |
| gmt_modified | TIMESTAMP | 修改时间 |
| gmt_created | TIMESTAMP | 创建时间 |

**索引**: `idx_session_id` (session_id, agent_id)

**样例数据**:

```json
{
  "id": 100,
  "agent_id": "one_agent",
  "user_id": "user_001",
  "session_id": "sess_abc123",
  "type": 1,
  "status": 20,
  "data": "{\"id\":100,\"contents\":[{\"type\":1,\"text\":\"你好\"}]}",
  "gmt_created": "2026-04-08 11:25:00"
}
```

---

### 6. session_events（会话事件表）

**作用**: Event Sourcing 核心表，存储所有会话事件的完整历史，支持事件回放和状态重建

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT UNSIGNED | 主键（从序列号表获取） |
| agent_id | VARCHAR(32) | Agent ID |
| user_id | VARCHAR(64) | 用户 ID |
| session_id | VARCHAR(64) | 会话 ID |
| message_id | BIGINT UNSIGNED | 关联的消息 ID（可为 NULL） |
| type | SMALLINT | 事件类型（10=新用户输入，20=新 Agent 消息，21=消息内容追加，22=消息状态变更，30=任务内容追加，31=任务状态变更，40=动作内容追加，41=动作状态变更） |
| status | SMALLINT | 事件状态（仅状态变更事件使用） |
| data | MEDIUMTEXT | 事件完整数据（JSON 格式，包含事件的所有字段） |
| gmt_modified | TIMESTAMP | 修改时间 |
| gmt_created | TIMESTAMP | 创建时间 |

**索引**: `idx_session_id` (session_id, agent_id)

**样例数据**:

```json
{
  "id": 1,
  "agent_id": "one_agent",
  "user_id": "user_001",
  "session_id": "sess_abc123",
  "message_id": 100,
  "type": 20,
  "status": null,
  "data": "{\"id\":1,\"agentId\":\"one_agent\",\"userId\":\"user_001\",\"sessionId\":\"sess_abc123\",\"msg\":{\"id\":100,\"status\":\"EXECUTING\"},\"type\":20}",
  "gmt_created": "2026-04-08 11:25:00"
}
```

**事件类型说明**:

| 事件类型值 | 事件名称 | 说明 |
|-----------|---------|------|
| 10 | NEW_USER_INPUT | 用户输入事件 |
| 20 | NEW_AGENT_MESSAGE | 新 Agent 消息事件 |
| 21 | AGENT_MESSAGE_APPEND_CONTENT | Agent 消息内容追加（流式输出） |
| 22 | AGENT_MESSAGE_STATUS_CHANGED | Agent 消息状态变更 |
| 30 | TASK_APPEND_CONTENT | 子任务内容追加 |
| 31 | TASK_STATUS_CHANGED | 子任务状态变更 |
| 40 | ACTION_APPEND_CONTENT | 工具调用内容追加 |
| 41 | ACTION_STATUS_CHANGED | 工具调用状态变更 |

---

### 7. mcp_clients（MCP 客户端配置表）

**作用**: 存储 MCP（Model Context Protocol）客户端配置，支持动态添加外部工具服务

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT UNSIGNED | 主键，自增 |
| mcp_id | VARCHAR(32) | MCP 客户端唯一标识 |
| name | VARCHAR(128) | MCP 客户端名称 |
| enabled | TINYINT | 是否启用（1=启用，0=禁用） |
| config | MEDIUMTEXT | MCP 配置（JSON 格式，包含传输方式、URL、超时等） |
| gmt_modified | TIMESTAMP | 修改时间 |
| gmt_created | TIMESTAMP | 创建时间 |

**样例数据**:

```json
{
  "id": 1,
  "mcp_id": "WebSearch",
  "name": "互联网搜索",
  "enabled": 1,
  "config": "{\"transport\":\"SSE\",\"url\":\"https://mcp.example.com/sse\",\"timeout\":30000}",
  "gmt_created": "2026-04-01 10:00:00"
}
```

---

### 8. knowledge_base_configs（知识库配置表）

**作用**: 存储知识库配置，支持 RAG（检索增强生成）功能

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT UNSIGNED | 主键，自增 |
| knowledge_base_id | VARCHAR(32) | 知识库唯一标识 |
| name | VARCHAR(128) | 知识库名称 |
| enabled | TINYINT | 是否启用（1=启用，0=禁用） |
| config | MEDIUMTEXT | 知识库配置（JSON 格式，包含类型、索引 ID 等） |
| gmt_modified | TIMESTAMP | 修改时间 |
| gmt_created | TIMESTAMP | 创建时间 |

**样例数据**:

```json
{
  "id": 1,
  "knowledge_base_id": "kb_001",
  "name": "产品文档库",
  "enabled": 1,
  "config": "{\"type\":\"bailian\",\"workspaceId\":\"ws_123\",\"indexId\":\"idx_456\"}",
  "gmt_created": "2026-04-01 10:00:00"
}
```

---

### 9. skill_configs（技能配置表）

**作用**: 存储 Skill 配置，Skill 是可插拔的功能模块（如天气查询、代码执行等）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT UNSIGNED | 主键，自增 |
| name | VARCHAR(32) | 技能名称 |
| enabled | TINYINT | 是否启用（1=启用，0=禁用） |
| description | VARCHAR(1024) | 技能描述 |
| instruction | MEDIUMTEXT | 技能指令（Agent 使用技能的提示词） |
| base_dir | VARCHAR(1024) | 技能基础目录 |
| files | MEDIUMTEXT | 技能文件列表（JSON 格式） |
| file_id | BIGINT UNSIGNED | 关联的文件 ID（skills 表的 ZIP 包） |
| checksum | VARCHAR(1024) | 文件校验和 |
| gmt_modified | TIMESTAMP | 修改时间 |
| gmt_created | TIMESTAMP | 创建时间 |

**样例数据**:

```json
{
  "id": 1,
  "name": "weather",
  "enabled": 1,
  "description": "查询天气信息",
  "instruction": "当用户询问天气时，使用 weather 技能查询",
  "base_dir": "/skills/weather",
  "files": "[\"SKILL.md\", \"scripts/weather.py\"]",
  "file_id": 10,
  "checksum": "sha256:abc123...",
  "gmt_created": "2026-04-01 10:00:00"
}
```

---

### 10. files（文件表）

**作用**: 存储上传的文件内容（本地文件存储模式）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT UNSIGNED | 主键，自增 |
| name | VARCHAR(1024) | 文件名 |
| size | BIGINT | 文件大小（字节） |
| content | LONGBLOB | 文件二进制内容 |
| gmt_modified | TIMESTAMP | 修改时间 |
| gmt_created | TIMESTAMP | 创建时间 |

**索引**: `idx_name` (name(512))

**使用场景**: 存储 Skill 的 ZIP 包等小文件

---

### 11. oss_files（OSS 文件映射表）

**作用**: 存储阿里云 OSS 文件映射关系（云端文件存储模式）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT UNSIGNED | 主键（非自增，由应用生成） |
| user_id | VARCHAR(64) | 用户 ID |
| oss_region | VARCHAR(32) | OSS 区域（如：oss-cn-hangzhou） |
| oss_bucket | VARCHAR(32) | OSS Bucket 名称 |
| oss_file_key | VARCHAR(1024) | OSS 文件 Key（路径） |
| gmt_modified | TIMESTAMP | 修改时间 |
| gmt_created | TIMESTAMP | 创建时间 |

**索引**:
- `idx_user` (user_id) - 查询用户上传的文件
- `uk_oss_bucket_file_key` (oss_region, oss_bucket, oss_file_key) - 唯一索引，防止重复上传

**样例数据**:

```json
{
  "id": 1001,
  "user_id": "user_001",
  "oss_region": "oss-cn-hangzhou",
  "oss_bucket": "tron-agent-files",
  "oss_file_key": "users/user_001/skills/weather_v1.zip",
  "gmt_created": "2026-04-08 10:00:00"
}
```

---

### Event Sourcing 数据流 

OneAgent 采用 Event Sourcing 架构，核心数据流：

1. **事件写入**: 对话过程中，所有变化都以事件形式追加到内存缓存中，并在在 `onComplete` 时将事件批量写入 `session_events` 表
2. **消息快照**: 事件完成后，在 `onComplete` 时将消息最终状态写入 `messages` 表
3. **状态重建**: 通过回放 `session_events` 表中的事件，可以重建任意时刻的会话状态
4. **进度追踪**: `sessions.last_applied_event_id` 记录已应用的事件 ID，支持断点续传


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
