# ChatBox 组件库

ChatBox 是一个功能丰富的聊天界面组件库，提供了完整的聊天会话功能，包括消息展示、事件处理、状态管理等。该组件库支持多种事件源（WebSocket、SSE、轮询）和灵活的扩展机制。作为 Tron Agent 项目的一部分，chatbox 提供了标准化的聊天界面组件，支持 Agent 与用户的实时交互。

## 目录结构

```
chatbox/
├── components/           # 基础组件
│   ├── ActionContent/    # 动作内容组件
│   ├── MessageItem/      # 消息项组件
│   ├── MessageList/      # 消息列表组件
│   ├── TaskContent/      # 任务内容组件
│   └── TextContent/      # 文本内容组件
├── eventBuffer/          # 事件缓冲区
├── eventSource/          # 事件源实现
│   ├── EventSource.ts    # 事件源基础接口
│   ├── PollingEventSource.ts  # 轮询事件源
│   ├── SseEventSource.ts      # SSE事件源
│   └── WebSocketEventSource.ts # WebSocket事件源
├── extends/              # 扩展组件
│   ├── ChatBox/          # 完整聊天框组件
│   └── service/          # API服务封装
├── hooks/                # React Hooks
│   ├── useChatModel.ts   # 聊天模型Hook
│   └── useEventSource.ts # 事件源Hook
├── types/                # 类型定义
├── utils/                # 工具函数
├── index.ts              # 导出入口
└── README.md             # 本文件
```

## 功能特性

### 1. 消息管理
- 支持用户消息和代理消息的展示
- 提供消息状态管理（待发送、执行中、已完成等）
- 支持消息内容的多样化展示（文本、任务、动作等）
- 完整的 Message/Task/Action 三层嵌套结构支持

### 2. 事件处理
- 支持多种事件源类型：
  - WebSocket：实时双向通信
  - Server-Sent Events (SSE)：服务器推送
  - HTTP轮询：兼容性更好的轮询方式
- 事件缓冲机制：批量处理事件，提升性能
- 事件去重：避免重复事件的处理
- 完整的 Agent 事件溯源支持

### 3. 状态管理
- 使用 React 的 useReducer 进行状态管理
- 提供完整的会话状态管理
- 支持消息历史、会话名称、运行状态等
- 与后端状态保持同步

### 4. 组件化设计
- 提供基础组件用于构建自定义界面
- 预设的 ChatBox 组件用于快速集成
- 支持自定义渲染函数，灵活定制界面
- 高度可扩展的架构设计

## 快速开始

### 安装

```bash
# 作为工作区包的一部分安装
yarn install
```

### 基础使用

```jsx
import React from 'react';
import { ChatBox } from 'chatbox/extends';

const MyChatApp = () => {
  return (
    <ChatBox
      sessionName="新会话"
      messages={[]}
      running={false}
      handleSendMessage={async (message) => {
        // 处理发送消息逻辑
        return true;
      }}
      onCreateSessionClick={() => console.log('创建新会话')}
    />
  );
};
```

## 核心API

### useChatModel Hook

聊天界面的核心状态管理Hook。

```typescript
import { useChatModel } from 'chatbox';

const { 
  data,           // 当前聊天数据
  running,        // 是否正在运行
  run,            // 开始运行
  stop,           // 停止运行
  update,         // 更新状态
  reset,          // 重置状态
  sendUserMessageShawde,  // 发送用户消息
  updateUserMessageShawdeStatus  // 更新消息状态
} = useChatModel(config);
```

**配置参数:**
- `initialData`: 初始数据
- `eventSource`: 事件源服务

### 事件源服务

提供多种事件源实现：

```typescript
import { 
  WebSocketEventSource, 
  SseEventSource, 
  PollingEventSource 
} from 'chatbox';

// WebSocket 事件源
const wsEventSource = new WebSocketEventSource(url);

// SSE 事件源
const sseEventSource = new SseEventSource(url);

// 轮询事件源
const pollingEventSource = new PollingEventSource(requestProcessor);
```

### ChatBox 组件

完整的聊天界面组件。

```typescript
import { ChatBox } from 'chatbox/extends';

<ChatBox
  sessionName="会话名称"
  messages={messages}
  running={running}
  handleSendMessage={handleSendMessage}
  onCreateSessionClick={onCreateSessionClick}
  headerRender={() => <CustomHeader />}
  userInputRender={() => <CustomInput />}
/>
```

## 扩展机制

ChatBox 提供了灵活的扩展机制，用户可以根据需要进行扩展：

### API服务封装
`extends/service` 目录提供了常用的API服务封装：
- `createSession`: 创建会话服务
- `createChat`: 创建聊天服务
- `getSessionEvents`: 获取会话事件服务
- `setServiceConfig`: 全局服务配置设置

这些服务封装了常用的API调用逻辑，并支持全局配置（如API前缀、认证头等）。

### 自定义渲染
- `headerRender`: 自定义头部渲染
- `userInputRender`: 自定义输入区域渲染
- `markdownComponents`: 自定义Markdown组件

### 组件扩展
用户可以在 `extends` 目录下添加自定义组件，例如：
- 自定义消息项组件
- 自定义输入框组件
- 自定义事件处理器

### 服务扩展
可以通过 `setServiceConfig` 函数配置全局服务参数：

```typescript
import { setServiceConfig } from 'chatbox/extends/service';

setServiceConfig({
  apiPrefix: '/api',
  origin: 'http://localhost:8080',
  authorizationHeader: {
    'X-User-Id': 'user123'  // 设置用户ID头
  }
});
```

### 事件源扩展
可以实现自定义的事件源，遵循 `EventSourceService` 接口即可。

## 与 Tron Agent 集成

chatbox 组件库专为 Tron Agent 项目设计，完全支持后端的事件溯源架构：

- 与 Session API 无缝集成
- 支持实时事件流（SSE）
- 完整的消息状态管理
- 与 Agent 生命周期同步

### API 集成示例

```typescript
import { createSession, createChat, getSessionEvents } from 'chatbox/extends/service';

// 创建会话
const session = await createSession('agent_id', { name: '新会话' });

// 发送消息
await createChat('agent_id', session.id, { input: [{ type: 'text', text: '你好' }] });

// 获取事件流
const events = await getSessionEvents('agent_id', session.id, { offset: 0 });
```

## 使用示例

### 基础用法

```jsx
import React from 'react';
import { useChatModel, SseEventSource, ChatBox } from 'chatbox';

const MyChatComponent = () => {
  // 使用 SSE 事件源连接到后端
  const eventSource = new SseEventSource('/api/agents/my_agent/sessions/session_id/events?offset=0');
  
  const chatModel = useChatModel({
    eventSource,
    initialData: {
      sessionName: '新会话',
      sessionId: '',
      lastEventId: 0,
      messages: []
    }
  });

  const handleSendMessage = async (message) => {
    // 发送消息到后端 API
    return true;
  };

  return (
    <ChatBox
      sessionName={chatModel.data.sessionName}
      messages={chatModel.data.messages}
      running={chatModel.running}
      handleSendMessage={handleSendMessage}
      onCreateSessionClick={() => chatModel.reset()}
    />
  );
};
```

### 自定义扩展

```jsx
import { ChatBox } from 'chatbox/extends';

// 自定义头部
const CustomHeader = () => (
  <div className="custom-header">
    <h2>自定义聊天界面</h2>
  </div>
);

// 自定义输入框
const CustomInput = ({ onSend }) => (
  <div className="custom-input">
    <input 
      type="text" 
      placeholder="输入消息..."
      onKeyPress={(e) => e.key === 'Enter' && onSend(e.target.value)}
    />
  </div>
);

<ChatBox
  sessionName="自定义会话"
  headerRender={() => <CustomHeader />}
  userInputRender={({ onSend }) => <CustomInput onSend={onSend} />}
  // ... 其他属性
/>
```

## 类型定义

ChatBox 提供了完整的 TypeScript 类型支持：

- `Session`: 会话类型
- `UserSessionMessage` / `AgentSessionMessage`: 用户/代理消息类型
- `EventItem`: 事件项类型
- `UseChatConfig` / `UseChatReturn`: useChatModel 的配置和返回类型
- 各种枚举类型（消息类型、事件类型、状态等）

## 工具函数

- `updateMessageListByEvents`: 根据事件更新消息列表
- `EventBuff`: 事件缓冲区，用于批量处理事件

## 开发指南

### 添加新功能

1. 在 `components/` 目录下创建新的 UI 组件
2. 在 `hooks/` 目录下创建新的 React Hook
3. 在 `types/` 目录下添加新的类型定义
4. 更新 `index.ts` 导出新功能

### 测试

```bash
# 在 chatbox 包目录下运行测试
yarn test
```

## 注意事项

1. 在使用WebSocket事件源时，确保服务器支持WebSocket连接
2. 事件缓冲区的批处理大小和超时时间可根据实际需求调整
3. 消息状态管理需要与后端状态保持同步
4. 自定义组件时，注意保持与基础组件的接口兼容性
5. 与后端 API 集成时，确保正确传递认证头信息

## 许可证

MIT License