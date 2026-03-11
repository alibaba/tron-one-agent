# Tron Agent 前端

Tron Agent 前端项目，基于 React 和 TypeScript 构建，采用 Yarn Workspaces 多包管理模式。项目包含多个独立的子包，每个子包都有特定的功能职责，共享通用的 UI 组件库。

## 简介

Tron Agent 前端提供了一套完整的 AI Agent 交互界面，包括：

- **client**: 客户端应用，提供用户与 Agent 交互的主要界面
- **control**: 控制台应用，提供 Agent 配置、调试和管理功能
- **chatbox**: 通用聊天组件库，提供可复用的聊天界面组件

### 适用场景

- **AI Agent 交互界面**: 为各种 AI Agent 提供标准化的聊天界面
- **多 Agent 管理**: 支持管理和配置多个不同的 Agent
- **实时事件监控**: 通过 SSE 实时展示 Agent 执行过程
- **动态配置调试**: 提供可视化界面进行 Agent 配置和调试

## 核心特性

### 模块化设计

```
├── packages/
│   ├── chatbox/      # 通用聊天组件库
│   ├── client/       # 客户端应用
│   └── control/      # 控制台应用
├── package.json      # 工作空间配置
└── yarn.lock
```

### 可复用组件库

- **chatbox**: 提供完整的聊天界面组件库
  - 支持多种事件源（WebSocket、SSE、轮询）
  - 事件缓冲机制，提升性能
  - 灵活的扩展机制
  - 完整的 TypeScript 类型支持

### 响应式设计

- 适配不同设备尺寸
- 现代化的 UI 设计
- 流畅的用户体验

## 快速开始

### 环境要求

- **Node.js**: 16.x 或更高版本
- **Yarn**: 1.22+ 或 Yarn 2+

### 1. 安装依赖

```bash
# 安装根目录依赖
yarn install

# 或者为所有工作区安装依赖
yarn workspaces install
```

### 2. 启动开发服务器

```bash
# 启动 client 应用
yarn dev:client

# 启动 control 应用
yarn dev:control
```

### 3. 构建生产版本

```bash
# 构建所有包
yarn build

# 或分别构建
yarn workspace client build
yarn workspace control build
```

## 开发指南

### 添加新功能

#### 1. 在现有包中添加功能

在相应的包目录中添加新组件或功能：

```bash
# 在 client 包中添加新组件
cd packages/client
# 添加你的组件代码
```

#### 2. 创建新包

在 `packages` 目录下创建新包：

```bash
mkdir packages/new-package
cd packages/new-package
yarn init
# 配置新包的 package.json
```

然后在根目录的 `package.json` 中添加新包到 workspaces。

#### 3. 使用 chatbox 组件库

在其他包中使用 chatbox 组件：

```typescript
import { ChatBox } from 'chatbox/extends';
import { useChatModel } from 'chatbox';

const MyComponent = () => {
  const chatModel = useChatModel({ /* 配置 */ });
  
  return (
    <ChatBox
      sessionName={chatModel.data.sessionName}
      messages={chatModel.data.messages}
      running={chatModel.running}
      handleSendMessage={(message) => { /* 处理消息 */ }}
    />
  );
};
```

### 项目结构说明

#### client

客户端应用，提供用户与 Agent 交互的主要界面：

- **src/**: 源代码目录
- **components/**: React 组件
- **pages/**: 页面组件
- **utils/**: 工具函数
- **services/**: API 服务

#### control

控制台应用，提供 Agent 配置、调试和管理功能：

- **src/**: 源代码目录
- **components/**: React 组件
- **views/**: 视图组件
- **hooks/**: 自定义 Hook
- **api/**: API 接口定义

#### chatbox

通用聊天组件库，提供可复用的聊天界面组件：

- **components/**: 基础组件
- **eventSource/**: 事件源实现
- **hooks/**: React Hooks
- **types/**: 类型定义
- **utils/**: 工具函数
- **extends/**: 扩展组件和服务

## API 集成

前端应用与后端 API 进行交互，主要 API 包括：

- **Session APIs**: 会话管理
- **Config APIs**: 配置管理
- **Debug APIs**: 调试接口

### 服务配置

通过 `chatbox/extends/service` 提供统一的服务配置：

```typescript
import { setServiceConfig } from 'chatbox/extends/service';

setServiceConfig({
  apiPrefix: '/api',
  origin: 'http://localhost:8080',
  authorizationHeader: {
    'X-User-Id': 'user123'
  }
});
```

## 构建与部署

### 本地构建

```bash
# 构建所有包
yarn build

# 检查构建结果
ls packages/*/dist/
```

### Docker 部署

#### 构建镜像

```bash
# 构建前端镜像
docker build -t tron-agent-frontend:latest .
```

#### 运行容器

```bash
docker run -d \
  --name tron-frontend \
  -p 80:80 \
  tron-agent-frontend:latest
```

### Nginx 配置

默认的 Nginx 配置位于 `nginx.conf`，可根据需要进行调整。

## 技术栈

| 组件 | 版本 | 说明 |
|------|------|------|
| React | 18.x | 前端框架 |
| TypeScript | 5.x | 类型检查 |
| Ant Design | 5.x | UI 组件库 |
| Webpack | 5.x | 模块打包器 |
| Yarn | 1.x/2.x | 包管理器 |
| React Router | 6.x | 路由管理 |
| Axios | 1.x | HTTP 客户端 |
| chatbox | * | 自定义聊天组件库 |

## 常见问题

### 1. 如何添加新的依赖？

```bash
# 为特定包添加依赖
yarn workspace client add new-package

# 为所有包添加开发依赖
yarn add -W -D new-dev-package
```

### 2. 如何调试事件流？

使用 control 应用中的调试功能：

- 查看实时事件流
- 测试工具函数
- 调试 MCP 客户端
- 验证知识库检索

### 3. 如何自定义聊天界面？

通过 chatbox 组件库提供的扩展机制：

```typescript
<ChatBox
  headerRender={() => <CustomHeader />}
  userInputRender={() => <CustomInput />}
  markdownComponents={{ /* 自定义 Markdown 渲染 */ }}
/>
```

### 4. 如何处理跨域问题？

在开发环境中，通过 Webpack DevServer 的代理功能处理跨域：

```javascript
// webpack.config.js
module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
};
```

### 5. 如何进行国际化？

聊天组件库支持国际化，可通过配置实现：

```typescript
import { setLocale } from 'chatbox/utils/i18n';

setLocale('zh-CN'); // 或 'en-US'
```
