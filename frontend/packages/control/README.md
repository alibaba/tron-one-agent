# Control 控制台

Control 控制台是 Tron Agent 项目的管理控制台，为开发者和管理员提供 Agent 配置、调试和管理功能。该应用利用 chatbox 组件库构建了专业的管理界面，支持对 AI Agent 的全方位管理。

## 简介

Control 控制台是一个面向开发者的管理平台，提供对 AI Agent 的全面配置和调试能力。它允许用户动态修改 Agent 配置、测试工具和知识库功能，以及监控 Agent 执行过程。

### 核心功能

- **Agent 管理**: 查看、编辑和管理所有 Agent 配置
- **动态配置**: 运行时修改 Agent 参数，无需重启服务
- **工具调试**: 独立测试工具函数的执行效果
- **MCP 管理**: 管理 Model Context Protocol 客户端
- **知识库管理**: 配置和测试知识库检索功能
- **事件监控**: 实时监控 Agent 执行事件流

## 目录结构

```
control/
├── src/                    # 源代码目录
│   ├── components/         # React 组件
│   ├── views/              # 视图组件
│   ├── pages/              # 页面组件
│   ├── hooks/              # 自定义 Hook
│   ├── api/                # API 接口定义
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
# 在 frontend 目录下启动 control 开发服务器
yarn dev:control

# 或在 control 目录下运行
cd packages/control
yarn dev
```

开发服务器将在 `http://localhost:3001` 启动（端口可能根据配置有所不同）。

### 构建生产版本

```bash
# 在frontend 目录下构建 control 应用
yarn build:control

# 或在 control 目录下运行
cd packages/control
yarn build
```

## 配置

### 环境变量

Control 应用支持以下环境变量：

- `REACT_APP_API_BASE_URL`: 后端 API 基础 URL，默认为 `/api`
- `REACT_APP_ADMIN_MODE`: 是否启用管理员模式

### API 集成

Control 应用与后端 API 进行深度集成，主要使用以下接口：

- **Config API**: Agent 配置管理
- **Debug API**: 调试功能接口
- **MCP API**: MCP 客户端管理
- **Knowledge Base API**: 知识库管理

通过 chatbox 组件库提供的服务进行 API 调用：

```typescript
import { setServiceConfig } from 'chatbox/extends/service';

// 配置 API 服务
setServiceConfig({
  apiPrefix: '/api',
  origin: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080',
  authorizationHeader: {
    'X-User-Id': 'admin'  // 管理员用户ID
  }
});
```

## 主要功能模块

### Agent 配置管理

- **Agent 列表**: 查看所有可用的 Agent
- **配置编辑器**: YAML/JSON 格式的配置编辑器
- **实时预览**: 配置修改的实时效果预览
- **版本管理**: 配置版本历史和回滚

### 工具调试中心

- **工具列表**: 显示所有可用的工具
- **参数测试**: 在线编辑和测试工具参数
- **执行日志**: 工具执行的详细日志
- **性能分析**: 工具执行时间和资源消耗

### MCP 客户端管理

- **MCP 列表**: 管理所有 MCP 客户端
- **连接测试**: 测试 MCP 服务连接
- **函数发现**: 自动发现 MCP 服务提供的函数
- **调用测试**: 在线测试 MCP 函数调用

### 知识库管理

- **知识库列表**: 管理所有知识库配置
- **文档上传**: 上传和管理知识库文档
- **检索测试**: 测试知识库检索效果
- **性能监控**: 知识库查询性能监控

### 事件监控面板

- **实时事件流**: 实时显示 Agent 执行事件
- **事件过滤**: 按类型、时间等条件过滤事件
- **事件回放**: 回放历史事件流
- **统计分析**: 事件统计和趋势分析

## 与 Tron Agent 集成

Control 控制台与 Tron Agent 后端紧密集成：

- 使用后端的 Config API 管理 Agent 配置
- 通过 Debug API 提供调试功能
- 支持动态配置更新和热加载
- 与事件溯源架构无缝集成

### API 操作示例

#### 获取所有 Agent 配置

```typescript
// 获取所有 Agent 配置
const agents = await fetch('/api/control/agents').then(r => r.json());
```

#### 更新 Agent 配置

```typescript
// 更新特定 Agent 配置
const response = await fetch(`/api/control/agents/${agentId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: '新名称',
    enabled: true,
    systemPrompt: '新的系统提示词',
    tools: [...],
    mcpClients: [...]
  })
});
```

#### 调试工具执行

```typescript
// 调试工具执行
const result = await fetch(`/api/debug/tools/${toolName}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ param1: 'value1' })
});
```

## 开发指南

### 添加新功能

#### 1. 添加新的管理页面

1. 在 `src/views/` 目录下创建新页面组件
2. 在路由配置中添加新路径
3. 更新侧边导航菜单

#### 2. 扩展 API 功能

1. 在 `src/api/` 目录下定义新的 API 接口
2. 在后端实现对应的控制器
3. 在前端组件中调用新 API

#### 3. 自定义数据可视化

1. 使用图表库（如 ECharts 或 Chart.js）创建可视化组件
2. 从后端 API 获取数据
3. 集成到现有的监控面板中

### 代码规范

- 使用 TypeScript 定义所有接口和类型
- 遵循 React Hooks 最佳实践
- 组件职责单一，保持简洁
- 错误处理和加载状态处理完善

### 权限管理

Control 控制台应实现适当的权限管理：

```typescript
// 示例权限检查
const checkPermission = (action: string, resource: string): boolean => {
  const userRole = getUserRole();
  return permissionMatrix[userRole][action]?.includes(resource) || false;
};
```

## 部署

### 构建

```bash
# 构建生产版本
yarn workspace control build
```

构建后的文件位于 `dist/` 目录。

### Docker 部署

Control 应用已集成到前端主 Dockerfile 中，构建整个前端项目：

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

#### 1. 无法连接到后端 API

检查后端服务是否正常运行，确认 API 地址配置正确，检查跨域设置。

#### 2. 配置更新不生效

确认后端支持动态配置更新，检查权限设置，查看后端日志。

#### 3. 调试功能无法使用

确认后端调试 API 已启用，检查调试相关的配置选项。

#### 4. 构建失败

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
- 查看后端日志以排查 API 问题

## 安全注意事项

- 限制对 Control 控制台的访问权限
- 使用身份验证和授权机制
- 对敏感操作进行二次确认
- 记录重要的管理操作日志

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
| Monaco Editor | * | 代码编辑器 |

## 贡献

### 开发规范

- 提交代码前运行 `yarn lint` 检查代码质量
- 提交代码前运行 `yarn test` 确保测试通过
- 遵循团队约定的 Git 提交信息格式
- 为新功能编写单元测试

### 代码审查

- 确保代码符合项目编码标准
- 验证新功能的测试覆盖率
- 检查安全性问题
- 确认新功能不会破坏现有功能

## 许可证

MIT License