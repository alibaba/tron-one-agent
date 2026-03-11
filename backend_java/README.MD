# Tron Agent 脚手架

一个基于 Spring Boot 和 AgentScope 的企业级 AI Agent 开发框架，提供了完整的 Agent 生命周期管理、事件溯源、动态配置和调试能力，帮助开发者快速构建生产级
AI Agent 应用。

## 简介

Tron OneAgent AI Agent 开发脚手架，基于 [Alibaba AgentScope](https://java.agentscope.io/zh/intro.html) 和 SpringBoot3
之上，进行了以下扩展:

- 开箱即用的分层脚手架，涵盖了从 HTTP API、Agent构建、MySQL持久化、动态配置调试等全栈集成
- 支持 Message/Task/Action 三层结构的数据交互协议，支持丰富可定制的用户交互
- 实现了事件溯源（Event Sourcing ）的前后端异步事件驱动传输协议，支持SSE和轮询模式
- 内置了 OneAgent 的多智能体架构，以 Handoffs 模式集成编排本地和远程（A2A协议）的智能体
- 除了硬性编码以外，还提供基于数据库的动态配置和调试的能力，提升开发效率

### Why - 为什么需要它？

在构建生产级 AI Agent 应用时，开发者面临诸多挑战：

- 需要管理复杂的对话状态和会话历史
- 需要支持多种 LLM 提供商和工具集成
- 需要可追溯的事件记录和调试能力
- 需要动态配置和热更新能力
- 需要可扩展的架构支持企业级应用

Tron Agent 脚手架通过提供完整的基础设施，让开发者专注于 Agent 的业务逻辑实现。

### 适用场景

- **企业智能助手**：构建支持工具调用、知识库检索的企业级 AI 助手  
- **多 Agent 协作系统**：需要多个专业 Agent 协同完成复杂任务  
- **对话机器人**：需要管理用户会话、支持长期记忆的对话系统  
- **AI 工作流编排**：需要将 AI 能力与业务系统深度集成

## 核心特性

### 模块化设计

```
├── api          # REST API 层，提供 Session、Config、Debug 接口
├── core         # 核心业务逻辑
│   ├── agents   # Agent 实现和示例，包括 OneAgent（多智能体）和 ReActAgent （单智能体）
│   ├── config   # 动态配置
│   ├── mcp      # MCP 客户端集成
│   ├── rag      # 知识库集成
│   ├── tools    # 工具注册与管理
│   └── domain   # 领域驱动，包含模型，仓储、服务等逻辑
├── infra        # 基础设施层，数据持久化
├── utils        # 工具类
└── bootstrap    # SpringBoot 应用启动模块和配置
```

### Event Sourcing 事件溯源

所有的会话交互都以事件流方式持久化存储，包括：

- 用户输入事件（`NewUserInputEvent`）
- Agent 消息事件（`NewAgentMessageEvent`）
- 内容追加事件（`AgentMessageAppendContentEvent`）
- 状态变更事件（`AgentMessageStatusChangedEvent`）
- 任务事件（`TaskStatusChangeEvent`、`TaskAppendContentEvent`）
- 动作事件 (`ActionStatusChangedEvent`, `ActionAppendContentEvent`)
- 会话名称变更（`SessionNameChangedEvent`）

对于 Message/Task/Action 三层嵌套结构：
- Message: 对应着用户输入和Agent回复的消息，可以包含以下内容：
    - TextContent：文本内容
    - MediaContent：多媒体内容，包括图片、视频、音频等，支持URL或Base64编码的二进制数据
    - Action：嵌套一个动作（通常对应一次 ToolUse），包括标题、状态以及内容等
    - Task：嵌套一个任务（通常对应一次子Agent调用），包括标题、状态以及内容等
- Task：任务执行（通常对应一次子Agent调用），包括标题、任务描述、状态以及内容等
    - TextContent：文本内容
    - MediaContent：多媒体内容，包括图片、视频、音频等，支持URL或Base64编码的二进制数据
    - Action：嵌套一个动作（通常对应一次 ToolUse），包括标题、状态以及内容等
- Action: 动作执行（通常对应一次 ToolUse），包括标题、状态以及内容等
    - TextContent：文本内容
    - MediaContent：多媒体内容，包括图片、视频、音频等，支持URL或Base64编码的二进制数据

**优势**：

- 完整的对话历史可追溯
- 支持事件回放和状态重建
- 实时流式推送（SSE）
- 便于调试和审计
- 丰富且流落的三层嵌套结构

### 动态配置能力

支持运行时动态修改 Agent 配置，无需重启服务：

- **Agent 配置**：模型、Prompt、工具、知识库、技能（Skill）、子 Agent
- **MCP 客户端配置**：动态添加/修改/删除 MCP 服务端点
- **知识库配置**：动态管理知识库接入
- **Skill 配置**：动态上传/更新/删除技能包，支持 zip 格式的技能资源管理

配置持久化到 MySQL

### 强大的调试能力

提供完整的调试 API：

- 工具调试：独立测试工具函数执行
- MCP 调试：测试 MCP 客户端连接和函数调用
- 知识库调试：测试知识检索效果
- 事件流调试：实时观察事件流

### Skill 技能系统

内置技能（Skill）系统，让 Agent 通过结构化的指令和资源文件执行复杂任务：

- **Skill 包格式**：以 zip 格式上传，包含 `SKILL.md` 指令文件和相关资源文件（如脚本、数据等）
- **SKILL.md 规范**：使用 YAML Front Matter 定义技能元数据（name、description），正文为 Agent 的执行指令
- **动态管理**：通过 API 上传、更新、启用/禁用、删除技能，无需重启服务
- **自动同步**：后台定时同步技能资源文件，确保 Agent 使用最新版本

### 灵活的扩展能力

- **多模型支持**：支持阿里云百炼（DashScope）、OpenAI 兼容协议
- **工具集成**：内置计算器示例，支持自定义工具注册
- **MCP 协议**：支持 Model Context Protocol，对接外部服务
- **知识库**：支持阿里云百炼知识库
- **Skill 技能**：支持上传技能包，让 Agent 通过指令和资源文件自主执行代码完成任务
- **A2A 协议**：支持 Agent-to-Agent 通信协议

## 快速开始

### 环境要求

- **JDK 17** 或更高版本
- **Maven 3.6+**
- **MySQL 5.7+** 或 **MySQL 8.0+**

### 1. 数据库初始化

创建数据库并执行初始化脚本：

```bash
mysql -u root -p -e "CREATE DATABASE tron_agent_java DEFAULT CHARACTER SET utf8mb4;"
mysql -u root -p tron_agent_java < bootstrap/src/main/resources/schema/init.sql
```

### 2. 配置环境变量

```bash
# 数据库配置
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=tron_agent_java
export DB_USER=root
export DB_PASS=your_password

# 阿里云百炼 API Key（可选，如需使用 DashScope 模型）
export DASHSCOPE_API_KEY=your_dashscope_api_key

# 阿里云OSS配置，用于支持多模态场景图片视频等资源存储
# 需注意：使用的access_key要开启对应模型服务出口IP的访问权限，否则签名后的图片视频等资源链接将无法被模型访问
export ALIBABA_CLOUD_ACCESS_KEY_ID=your_aliyun_oss_access_key_id
export ALIBABA_CLOUD_ACCESS_KEY_SECRET=your_aliyun_oss_access_key_secret
export OSS_BUCKET=your_aliyun_oss_bucket_name
export OSS_REGION=your_aliyun_oss_region
export OSS_ENDPOINT=your_aliyun_oss_endpoint
```

### 3. 编译构建

```bash
mvn clean package -DskipTests
```

### 4. 启动服务

```bash
java -jar bootstrap/target/tron-java-bootstrap-1.0-SNAPSHOT.jar
```

服务将在 `http://localhost:8080` 启动。

### 5. 测试 API

```bash
# 创建会话
curl -X POST http://localhost:8080/api/agents/simple_agent/sessions \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user123" \
  -d '{"name": "测试会话"}'

# 发送消息（返回 session_id 后替换）
curl -X POST http://localhost:8080/api/agents/simple_agent/sessions/{session_id}/chat \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user123" \
  -H "Accept: text/event-stream" \
  -d '{"input": [{"type": 1, "text": "你好，帮我计算 123 + 456"}]}'
```

## 开发指南

### 新建一个 ReAct Agent

ReAct Agent 适合需要自主调用工具和检索知识库的场景。

#### 1. 创建 AgentBuilder

在 `core/src/main/java/com/aliyun/tam/x/tron/core/agents/examples/` 下创建：

```java
package com.aliyun.tam.x.tron.core.agents.examples;

import com.aliyun.tam.x.tron.core.agents.BaseAgentBuilder;
import com.google.common.collect.Lists;
import org.springframework.stereotype.Component;

@Component
public class MyAgentBuilder extends BaseAgentBuilder {
  public static final String AGENT_ID = "my_agent";

  protected MyAgentBuilder() {
    super(AGENT_ID);
  }

  @Override
  protected AgentConfig defaultConfig() {
    return AgentConfig.builder()
            .name("我的智能助手")
            .enabled(true)
            .type(LocalAgentType.REACT)
            .chatModel(
                    ChatModelConfig.builder()
                            .type(ChatModelType.DASHSCOPE)
                            .apiKey(System.getenv("DASHSCOPE_API_KEY"))
                            .modelName("qwen-plus")
                            .build()
            )
            .systemPrompt("你是一个友好的智能助手。")
            .maxIters(10)
            .tools(Lists.newArrayList(
                    AgentToolConfig.builder()
                            .enabled(true)
                            .name("calculator")
                            .build()
            ))
            .mcpClients(Lists.newArrayList(
                    AgentMcpConfig.builder()
                            .clientId("WebSearch")
                            .enabled(true)
                            .build()
            ))
            .build();
  }
}
```

#### 2. 配置说明

- `AGENT_ID`：唯一标识，用于 API 路径和配置存储
- `name`：Agent 显示名称
- `type`：`REACT` 表示 ReAct Agent
- `chatModel`：配置 LLM 模型
- `systemPrompt`：系统提示词（可选）
- `maxIters`：最大推理迭代次数（可选）
- `tools`：注册的工具列表（可选）
- `mcpClients`：MCP 客户端配置（可选）
- `knowledgeBases`：知识库配置（可选）
- `skills`：技能配置（可选）

#### 3. 添加自定义工具

在 `core/src/main/java/com/aliyun/tam/x/tron/core/tools/` 下创建：

```java
package com.aliyun.tam.x.tron.core.tools;

import io.agentscope.core.tool.Tool;
import io.agentscope.core.tool.ToolParam;
import org.springframework.expression.EvaluationContext;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.SimpleEvaluationContext;
import org.springframework.stereotype.Component;

@Component("my_tool")
public class MyTool {
    @Tool(description = "xxx")
    public String xxx(
            @ToolParam(name = "aaa", description = "xxx") String aaa) {
        try {
            return "aaa";
        } catch (Exception e) {
            return "运行错误: " + e.getMessage();
        }
    }
}

```

工具会自动注册到 `ToolRegistry`。

### 新建一个 One Agent

One Agent 适合需要编排多个子 Agent 协同完成复杂任务的场景。

#### 1. 创建 One Agent Builder

```java
package com.aliyun.tam.x.tron.core.agents.examples;

import com.aliyun.tam.x.tron.core.agents.BaseAgentBuilder;
import com.google.common.collect.Lists;
import org.springframework.stereotype.Component;

@Component
public class MyOneAgentBuilder extends BaseAgentBuilder {
  private static final String AGENT_ID = "my_one_agent";

  protected MyOneAgentBuilder() {
    super(AGENT_ID);
  }

  @Override
  protected AgentConfig defaultConfig() {
    return AgentConfig.builder()
            .name("智能编排助手")
            .enabled(true)
            .type(LocalAgentType.ONE)
            .chatModel(
                    ChatModelConfig.builder()
                            .type(ChatModelType.DASHSCOPE)
                            .apiKey(System.getenv("DASHSCOPE_API_KEY"))
                            .modelName("qwen-max")
                            .build()
            )
            .systemPrompt("你是一个智能编排助手，可以调度多个专业助手完成任务。")
            .subAgents(Lists.newArrayList(
                    // Local 子 Agent
                    LocalSubAgentConfig.builder()
                            .agentId("simple_agent")
                            .enabled(true)
                            .capacities("回答通用问题，搜索互联网信息")
                            .build(),
                    // A2A 协议子 Agent
                    A2ASubAgentConfig.builder()
                            .agentId("xx_agent_a2a")
                            .agentCard(remoteAgentCard) // 需要配置 AgentCard
                            .enabled(true)
                            .build()
            ))
            .build();
  }
}
```

#### 2. 子 Agent 类型

- **LocalSubAgentConfig**：本地 Agent，直接引用其他 AgentBuilder
    - `agentId`：引用的 Agent ID
    - `capacities`：描述子 Agent 的能力，用于 One Agent 决策

- **A2ASubAgentConfig**：远程 Agent，通过 A2A 协议通信
    - `agentCard`：Agent 能力描述卡片
    - 支持跨服务、跨语言的 Agent 协作

### 为 Agent 配置 Skill 技能

Skill 技能让 Agent 能够通过结构化指令和资源文件自主执行代码完成复杂任务（如运行脚本、处理数据等）。

#### 1. 准备 Skill 包

创建一个 zip 文件，包含以下结构：

```
my_skill/
├── SKILL.md          # 必须，技能指令文件
└── scripts/          # 可选，资源文件
    └── my_script.py
```

`SKILL.md` 文件格式：

```markdown
---
name: weather_skill
description: 用于查询某地的当前天气
---

# 天气查询技能

用python3 运行 weather_skill_custom/scripts/weather.py 以获取某个城市的天气信息，其中 <<city>> 为城市名称

```shell
python3 weather_skill_custom/scripts/weather.py <<city>>
```
```

- YAML Front Matter（`---` 之间）必须包含 `name` 和 `description` 字段
- 正文为 Agent 的执行指令，描述如何使用技能中的资源文件

#### 2. 上传 Skill

通过 Config API 上传技能包：

```bash
curl -X POST http://localhost:8080/api/control/skills \
  -F "file=@weather_skill.zip"
```

#### 3. 在 Agent 中引用 Skill

在 AgentBuilder 的配置中添加 `skills`：

```java
@Override
protected AgentConfig defaultConfig() {
    return AgentConfig.builder()
            .name("旅行助手")
            .enabled(true)
            .chatModel(
                    ChatModelConfig.builder()
                            .type(ChatModelType.DASHSCOPE)
                            .apiKey(System.getenv("DASHSCOPE_API_KEY"))
                            .modelName("qwen-vl-plus")
                            .build()
            )
            .skills(Lists.newArrayList(
                    AgentSkillConfig.builder()
                            .name("weather_skill")
                            .enabled(true)
                            .build()
            ))
            .type(LocalAgentType.REACT)
            .build();
}
```

#### 4. 配置说明

- `AgentSkillConfig.name`：引用的 Skill 名称，对应 `SKILL.md` 中的 `name` 字段
- `AgentSkillConfig.enabled`：是否启用该技能
- Skill 运行在 `SkillBox` 沙箱中，支持 Shell 命令执行、文件读写
- 也可以通过 Config API 动态修改 Agent 的 `skills` 配置

### 执行流程

#### 1. 会话创建与消息处理流程

```
用户请求
  ↓
SessionController.chat()
  ↓
AgentRegistry.getAgent() → 获取/构建 Agent
  ↓
AgentHandler.handleInput() → Agent 处理输入
  ↓
EventSink → 生成事件流
  ↓
MysqlEventRepository → 持久化事件
  ↓
SSE Stream / HTTP Response → 返回结果
```

#### 2. Event Sourcing 流程

每次对话交互产生的所有事件都会：

1. 写入 `session_events` 表（事件流）
2. 聚合后更新 `messages` 表（消息快照）
3. 更新 `sessions` 表的 `last_applied_event_id`

通过事件流可以完整还原对话历史和 Agent 状态。

#### 3. Agent 状态管理

- Agent 的对话历史存储在 `agent_states` 表
- 使用 AgentScope 的 Session 机制管理 Agent 状态
- 支持跨请求的状态恢复

## API 文档

### Session APIs

会话通过一个sessionId进行标识，在agent和user下唯一

#### 创建会话

```http
POST /api/agents/{agent_id}/sessions
Headers:
  X-User-Id: {user_id}
Body:
{
  "name": "会话名称"
}

Response: session_id
```

#### 获取会话列表

获取用户（userId）在此agent下的会话列表（分页）

```http
GET /api/agents/{agent_id}/sessions?pageNo=1&pageSize=10
Headers:
  X-User-Id: {user_id}

Response:
{
  "items": [
    {
      "id": "session_id",
      "name": "会话名称",
      "lastAppliedEventId": 123,
      "gmtCreated": "2024-01-01T00:00:00",
      "gmtModified": "2024-01-01T00:00:00"
    }
  ],
  "total": 100,
  "pageNo": 1,
  "pageSize": 10
}
```

#### 获取会话详情

会返回此会话下最近的消息列表，以及已应用到消息中的最后一条事件ID（可此ID开始拉取之后的事件）

```http
GET /api/agents/{agent_id}/sessions/{session_id}
Headers:
  X-User-Id: {user_id}

Response:
{
  "id": "session_id",
  "name": "会话名称",
  "lastAppliedEventId": 123,
  "gmtCreated": "2024-01-01T00:00:00",
  "gmtModified": "2024-01-01T00:00:00,
  "messages": { ... }
}
```

#### 删除会话

```http
DELETE /api/agents/{agent_id}/sessions/{session_id}
Headers:
  X-User-Id: {user_id}
```

#### 获取会话消息列表

获取会话中更久远的对话消息

```http
GET /api/agents/{agent_id}/sessions/{session_id}/messages?pageNo=1&pageSize=10
Headers:
  X-User-Id: {user_id}
```

#### 获取会话事件流

* 如果 offset 从 0 开始，可以从头完整的复现整个会话的对话过程
* 如果 offset 从 session 的 lastAppliedEventId 开始，则可获取在已有的messages之后的新事件，可用于处理用户新输入和刷新网页之后的继续展示
* 同时也可以分享实施会话，多个用户或多个窗口可以获取到相同的message快照和事件流

事件拉取支持2种模式，以请求的accept header为准：

- application/json: 轮询模式，一次性返回 JSON 格式的事件列表
- text/event-stream: SSE模式，持续返回 SSE 格式的事件流

```http
GET /api/agents/{agent_id}/sessions/{session_id}/events?offset=0&size=10
Headers:
  X-User-Id: {user_id}
  Accept: application/json  # 或 text/event-stream 获取 SSE 流
```

#### 发送消息（对话）

发起一轮新的对话：

- 如果sessionId不存在，会自动创建
- 建议 accept 使用 application/json，再配合 获取会话事件流 接口，简化处理逻辑和异常恢复
- accept 使用 text/event-stream 可以用于开发测试场景

```http
POST /api/agents/{agent_id}/sessions/{session_id}/chat
Headers:
  X-User-Id: {user_id}
  X-User-Name: {user_name}  # 可选
  Accept: application/json  # 或 text/event-stream 获取流式响应
Body:
{
  "input": [
    {
      "type": "text",
      "text": "用户消息内容"
    }
  ]
}

Response:
- application/json: "success"
- text/event-stream: 流式返回事件
```

### Config APIs

#### 获取所有 Agent 配置

```http
GET /api/control/agents

Response:
{
  "code": 200,
  "success": true,
  "message": "success",
  "data": [ ... ]
}
```

#### 获取指定 Agent 配置

```http
GET /api/control/agents/{agent_id}
```

#### 更新 Agent 配置

```http
PATCH /api/control/agents/{agent_id}
Body:
{
  "name": "新名称",
  "enabled": true,
  "systemPrompt": "新的系统提示词",
  "tools": [...],
  "mcpClients": [...]
}
```

#### 获取所有工具列表

```http
GET /api/control/tools
```

#### MCP 客户端管理

```http
# 列表
GET /api/control/mcps

# 详情
GET /api/control/mcps/{mcp_id}

# 创建
POST /api/control/mcps
Body: { MCP 配置 }

# 更新
PATCH /api/control/mcps/{mcp_id}
Body: { 部分字段 }

# 删除
DELETE /api/control/mcps/{mcp_id}
```

#### 知识库管理

```http
# 列表
GET /api/control/kb

# 详情
GET /api/control/kb/{kb_id}

# 创建
POST /api/control/kb
Body: { 知识库配置 }

# 更新
PATCH /api/control/kb/{kb_id}
Body: { 部分字段 }

# 删除
DELETE /api/control/kb/{kb_id}
```

#### Skill 技能管理

```http
# 列表
GET /api/control/skills

# 详情
GET /api/control/skills/{skill_id}

# 上传（创建或更新）
# id 参数可选，不传则创建，传入则更新对应 skill
POST /api/control/skills
Content-Type: multipart/form-data
Body: file={zip文件}, id={可选，skill_id}

# 下载 Skill 包
GET /api/control/skills/{skill_id}/download
Response: application/octet-stream（zip 文件）

# 启用/禁用
PATCH /api/control/skills/{skill_id}
Body: { "enabled": true }

# 删除
DELETE /api/control/skills/{skill_id}
```

### Debug APIs

#### 获取工具 Schema

```http
GET /api/debug/tools/{tool_name}/schema
```

#### 调试工具执行

```http
POST /api/debug/tools/{tool_name}
Body: {"param1": "value1"}
```

#### 调试 MCP 工具

```http
# 获取 MCP 工具列表
POST /api/debug/mcp/{client_id}/tools

# 调用 MCP 工具
POST /api/debug/mcp/{client_id}/tools/{func_name}
Body: {"param1": "value1"}
```

#### 调试知识库检索

```http
POST /api/debug/knowledge_base/{knowledge_base_id}
Body: {"query": "检索内容"}
```

## 数据库表结构

### 核心表

#### `agents` - Agent 配置表

存储 Agent 的配置信息。

| 字段       | 类型           | 说明                       |
|----------|--------------|--------------------------|
| id       | BIGINT       | 主键                       |
| agent_id | VARCHAR(32)  | Agent 唯一标识               |
| name     | VARCHAR(128) | Agent 名称                 |
| enabled  | TINYINT      | 是否启用                     |
| type     | SMALLINT     | Agent 类型（1=REACT, 2=ONE） |
| config   | MEDIUMTEXT   | JSON 配置                  |

#### `agent_states` - Agent 状态表

存储 Agent 的工作记忆和其它状态。

| 字段         | 类型          | 说明             |
|------------|-------------|----------------|
| id         | BIGINT      | 主键             |
| agent_id   | VARCHAR(32) | Agent ID       |
| user_id    | VARCHAR(32) | 用户 ID          |
| session_id | VARCHAR(64) | 会话 ID          |
| data       | MEDIUMTEXT  | Agent 状态（JSON） |

#### `sessions` - 会话表

存储用户与 Agent 的会话信息。

| 字段                    | 类型           | 说明         |
|-----------------------|--------------|------------|
| id                    | BIGINT       | 主键         |
| agent_id              | VARCHAR(32)  | Agent ID   |
| user_id               | VARCHAR(32)  | 用户 ID      |
| session_id            | VARCHAR(64)  | 会话 ID      |
| name                  | VARCHAR(128) | 会话名称       |
| last_applied_event_id | BIGINT       | 最后应用的事件 ID |

#### `messages` - 消息表

存储会话中的消息快照（聚合视图）。

| 字段         | 类型          | 说明                      |
|------------|-------------|-------------------------|
| id         | BIGINT      | 消息 ID                   |
| agent_id   | VARCHAR(32) | Agent ID                |
| user_id    | VARCHAR(32) | 用户 ID                   |
| session_id | VARCHAR(64) | 会话 ID                   |
| type       | SMALLINT    | 消息类型（1=用户消息, 2=Agent消息） |
| status     | SMALLINT    | 消息状态                    |
| data       | MEDIUMTEXT  | 消息内容（JSON）              |

#### `session_events` - 事件流表

存储所有会话事件，支持事件溯源。

| 字段         | 类型          | 说明         |
|------------|-------------|------------|
| id         | BIGINT      | 事件 ID（自增）  |
| agent_id   | VARCHAR(32) | Agent ID   |
| user_id    | VARCHAR(32) | 用户 ID      |
| session_id | VARCHAR(64) | 会话 ID      |
| message_id | BIGINT      | 关联消息 ID    |
| type       | SMALLINT    | 事件类型       |
| status     | SMALLINT    | 事件状态       |
| data       | MEDIUMTEXT  | 事件数据（JSON） |



### 配置表

#### `dynamic_mcp_clients` - MCP 客户端配置表

| 字段      | 类型           | 说明         |
|---------|--------------|------------|
| id      | BIGINT       | 主键         |
| mcp_id  | VARCHAR(32)  | MCP 客户端 ID |
| name    | VARCHAR(128) | 客户端名称      |
| enabled | TINYINT      | 是否启用       |
| config  | MEDIUMTEXT   | 配置（JSON）   |

#### `knowledge_base_configs` - 知识库配置表

| 字段                | 类型           | 说明       |
|-------------------|--------------|----------|
| id                | BIGINT       | 主键       |
| knowledge_base_id | VARCHAR(32)  | 知识库 ID   |
| name              | VARCHAR(128) | 知识库名称    |
| enabled           | TINYINT      | 是否启用     |
| config            | MEDIUMTEXT   | 配置（JSON） |

#### `skill_configs` - 技能配置表

存储 Skill 技能的配置和指令信息。

| 字段          | 类型             | 说明                         |
|-------------|----------------|----------------------------|
| id          | BIGINT         | 主键                         |
| name        | VARCHAR(32)    | 技能名称（唯一）                   |
| enabled     | TINYINT        | 是否启用                       |
| description | VARCHAR(1024)  | 技能描述                       |
| instruction | MEDIUMTEXT     | 技能指令（SKILL.md 完整内容）       |
| base_dir    | VARCHAR(1024)  | zip 包内的基础目录                |
| files       | MEDIUMTEXT     | 技能包含的文件列表（换行分隔）            |
| file_id     | BIGINT         | 关联的 zip 文件 ID（files 表）     |
| checksum    | VARCHAR(1024)  | zip 文件的 SHA-256 校验和        |

#### `files` - 文件存储表

存储上传的二进制文件（如 Skill zip 包）。

| 字段      | 类型             | 说明       |
|---------|----------------|----------|
| id      | BIGINT         | 主键       |
| name    | VARCHAR(1024)  | 文件名      |
| size    | BIGINT         | 文件大小（字节） |
| content | LONGBLOB       | 文件二进制内容  |

#### `sequences` - 序列号表

用于生成分布式唯一 ID。

| 字段            | 类型       | 说明   |
|---------------|----------|------|
| id            | BIGINT   | 主键   |
| name          | SMALLINT | 序列名称 |
| current_value | BIGINT   | 当前值  |

## 技术栈

| 组件              | 版本          | 说明                |
|-----------------|-------------|-------------------|
| Spring Boot     | 3.5.9       | Web 框架            |
| JDK             | 17          | Java 运行环境         |
| Maven           | 3.6+        | 构建工具              |
| AgentScope      | 1.0.8       | AI Agent 框架       |
| MyBatis-Plus    | 3.5.15      | ORM 框架            |
| MySQL           | 5.7+ / 8.0+ | 数据库               |
| Fastjson2       | 2.0.59      | JSON 序列化          |
| Lombok          | -           | 代码简化              |
| MapStruct       | 1.6.3       | 对象映射              |
| Guava           | 33.5.0      | 工具库               |
| A2A SDK         | 0.3.2       | Agent-to-Agent 协议 |
| 阿里云百炼 SDK       | 2.6.2       | 阿里云 AI 服务         |
| OpenAI Java SDK | 4.13.0      | OpenAI 集成         |

## Docker 部署

### 构建镜像

```bash
# 1. 编译项目
mvn clean package -DskipTests

# 2. 构建 Docker 镜像
docker build -t tron-agent-java:latest .
```

### 运行容器

```bash
docker run -d \
  --name tron-agent \
  -p 8080:8080 \
  -e DB_HOST=mysql_host \
  -e DB_PORT=3306 \
  -e DB_NAME=tron_agent_java \
  -e DB_USER=root \
  -e DB_PASS=password \
  -e DASHSCOPE_API_KEY=your_api_key \
  tron-agent:latest
```

## 常见问题

### 1. 如何切换 LLM 模型？

修改 Agent 配置中的 `chatModel`：

```java
ChatModelConfig.builder()
    .type(ChatModelType.OPENAI_COMPATIBLE)  // 或 DASHSCOPE
    .baseUrl("https://api.openai.com/v1")
    .apiKey(System.getenv("OPENAI_API_KEY"))  // 使用环境变量
    .modelName("gpt-4")
    .build()
```

### 2. 如何添加百炼知识库？

可以通过 Config API 动态添加百炼知识库配置：

```bash
curl -X POST http://localhost:8080/api/control/kb \
  -H "Content-Type: application/json" \
  -d '{
    "knowledgeBaseId": "my_kb",
    "name": "我的知识库",
    "enabled": true,
    "type": 1,
    "config": {
      "workspaceId": "your_workspace_id",
      "indexId": "your_index_id"
    }
  }'
```

然后在 Agent 配置中引用：
```java
.knowledgeBases(Lists.newArrayList(
    AgentKnowledgeBaseConfig.builder()
        .enabled(true)
        .knowledgeId("my_kb")
        .build()
))
```

### 3. 如何接入自定义 MCP 服务？

也可以通过编码添加自定义 MCP 配置：
```java
@Component
@Slf4j
public class WebSearchMcpConfigBuilder implements McpConfigBuilder {
    @Override
    public String getId() {
        return "WebSearch";
    }

    @Override
    public McpClientConfig getConfig() {
        return McpClientConfig.builder()
                .id(getId())
                .name("Web Search")
                .description("互联网搜索 MCP 服务")
                .url("https://example.com/mcps/websearch/sse")
                .timeout(30)
                .build();
    }
}
```

也可以通过 Control 使用 Config API 动态添加：

```bash
curl -X POST http://localhost:8080/api/control/mcps \
  -H "Content-Type: application/json" \
  -d '{
    "id": "custom_mcp",
    "name": "自定义 MCP",
    "enabled": true,
    "transport": "sse",
    "url": "https://your-mcp-server/sse",
    "timeout": 30
  }'
```

### 4. 如何实现 Agent 的流式输出？

在对话请求中设置 `Accept: text/event-stream`：

```bash
curl -N -X POST http://localhost:8080/api/agents/{agent_id}/sessions/{session_id}/chat \
  -H "Accept: text/event-stream" \
  -H "X-User-Id: user123" \
  -d '{"input": [{"type": "text", "text": "你好"}]}'
```

### 5. 如何调试 Agent 执行过程？

查看事件流：

```bash
curl -N http://localhost:8080/api/agents/{agent_id}/sessions/{session_id}/events?offset=0 \
  -H "Accept: text/event-stream" \
  -H "X-User-Id: user123"
```
