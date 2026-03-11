# Client 应用

Client 应用是 Tron Agent 项目的前端客户端，为用户提供与 AI Agent 交互的主要界面。该应用利用 chatbox 组件库构建了一个功能丰富的聊天界面，支持实时消息交互和事件流展示。

## 简介

Client 应用是一个现代化的 React 应用程序，提供用户与各种 AI Agent 进行交互的界面。它具有响应式设计，能够在不同设备上提供良好的用户体验。

### 核心功能

- **会话管理**: 创建、查看和管理与 AI Agent 的对话会话
- **实时聊天**: 支持与 Agent 的实时对话交互
- **事件流展示**: 实时显示 Agent 执行过程中的事件流
- **消息历史**: 完整保留对话历史记录
- **用户友好界面**: 直观易用的聊天界面设计

## 目录结构

```
client/
├── src/                    # 源代码目录
│   ├── components/         # React 组件
│   ├── pages/              # 页面组件
│   ├── hooks/              # 自定义 Hook
│   ├── services/           # API 服务
│   ├── utils/              # 工具函数
│   ├── styles/             # 样式文件
│   └── types/              # 类型定义
├── public/                 # 静态资源
├── webpack.config.js       # Webpack 配置
├── tsconfig.json           # TypeScript 配置
├── package.json            # 包配置
└── README.md               # 本文件
```

## 快速开始

### 环境要求

- **Node.js**: 16.x 或更高版本
- **Yarn**: 1.22+ 或 Yarn 2+

### 安装依赖

```bash
# 在项目根目录运行
yarn install
```

### 启动开发服务器

```bash
# 在 frontend 目录下启动 client 开发服务器
yarn dev:client

# 或在 client 目录下运行
cd packages/client
yarn dev
```

开发服务器将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
# 在frontend 目录下构建 client 应用
yarn build:client

# 或在 client 目录下运行
cd packages/client
yarn build
```

## 配置

### 环境变量

Client 应用支持以下环境变量：

- `REACT_APP_API_BASE_URL`: 后端 API 基础 URL，默认为 `/api`
- `REACT_APP_WS_URL`: WebSocket 服务器 URL（如果使用）

### API 集成

Client 应用与后端 API 进行集成，主要使用以下接口：

- **Session API**: 会话管理
- **Chat API**: 消息交互
- **Event API**: 事件流获取

通过 chatbox 组件库提供的服务进行 API 调用：

```typescript
import { setServiceConfig } from 'chatbox/extends/service';

// 配置 API 服务
setServiceConfig({
  apiPrefix: '/api',
  origin: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080',
  authorizationHeader: {
    'X-User-Id': localStorage.getItem('userId') || 'default-user'
  }
});
```

## 主要组件

### 会话管理组件

- **SessionList**: 会话列表展示
- **SessionItem**: 单个会话项
- **NewSessionModal**: 新建会话模态框

### 聊天界面组件

- **ChatContainer**: 聊天界面容器
- **MessagePanel**: 消息面板
- **InputArea**: 输入区域

### 事件流组件

- **EventStreamViewer**: 事件流查看器
- **EventItem**: 单个事件项展示

## 与 Tron Agent 集成

Client 应用与 Tron Agent 后端紧密集成：

- 使用后端的 Session API 管理会话
- 通过 Chat API 发送用户消息
- 利用 Event API 获取实时事件流
- 支持 Message/Task/Action 三层嵌套结构

### 事件处理

应用支持多种事件源：

- **SSE (Server-Sent Events)**: 实时事件推送
- **Polling**: 轮询模式（兼容性更好）
- **WebSocket**: 双向实时通信（可选）

## 开发指南

### 添加新页面

1. 在 `src/pages/` 目录下创建新页面组件
2. 在路由配置中添加新路由
3. 更新导航菜单（如需要）

### 添加新组件

1. 在 `src/components/` 目录下创建新组件
2. 使用 TypeScript 定义组件的 props 类型
3. 遵循项目的设计规范

### API 调用最佳实践

```typescript
import { useState, useEffect } from 'react';
import { createChat, createSession } from 'chatbox/extends/service';

const useChatApi = () => {
  const [loading, setLoading] = useState(false);
  
  const sendMessage = async (agentId, sessionId, message) => {
    setLoading(true);
    try {
      const response = await createChat(agentId, sessionId, message);
      return response;
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  return { sendMessage, loading };
};
```

### 样式规范

- 使用 CSS Modules 或 Styled Components
- 遵循 BEM 命名规范
- 使用项目定义的主题颜色

## 部署

### 构建

```bash
# 构建生产版本
yarn workspace client build
```

构建后的文件位于 `dist/` 目录。

### Docker 部署

Client 应用已集成到前端主 Dockerfile 中，构建整个前端项目：

```bash
# 在项目根目录构建前端镜像
docker build -t tron-agent-frontend:latest .
```

### 手动部署

1. 构建应用: `yarn build`
2. 将 `dist/` 目录下的文件部署到 Web 服务器
3. 确保服务器配置支持 SPA（单页应用）路由

## 故障排除

### 常见问题

#### 1. API 请求失败

检查后端服务是否正常运行，确认 API 地址配置正确。

#### 2. 事件流无法接收

确认后端 SSE 端点可访问，检查网络连接和防火墙设置。

#### 3. 构建失败

清除缓存并重新安装依赖：

```bash
# 清除 yarn 缓存
yarn cache clean

# 删除 node_modules 并重新安装
rm -rf node_modules
yarn install
```

### 调试方法

- 使用浏览器开发者工具查看网络请求
- 检查控制台错误日志
- 使用 React Developer Tools 分析组件状态

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | 前端框架 |
| TypeScript | 5.x | 类型检查 |
| Ant Design | 5.x | UI 组件库 |
| Webpack | 5.x | 模块打包器 |
| chatbox | * | 聊天组件库 |
| React Router | 6.x | 路由管理 |
| Axios | 1.x | HTTP 客户端 |

## 贡献

### 开发规范

- 提交代码前运行 `yarn lint` 检查代码质量
- 提交代码前运行 `yarn test` 确保测试通过
- 遵循团队约定的 Git 提交信息格式

### 代码审查

- 确保代码符合项目编码标准
- 验证新功能的测试覆盖率
- 检查性能影响

## 许可证

MIT License