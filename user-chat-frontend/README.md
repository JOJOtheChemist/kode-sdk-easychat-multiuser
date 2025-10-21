# 用户多对话管理前端

这是一个用于管理 user1 多个对话会话的前端界面。

## 功能特性

- ✅ 显示用户的多个对话会话
- ✅ 支持创建新对话
- ✅ 实时 SSE 流式消息渲染
- ✅ 美观的对话界面
- ✅ 工具调用显示

## 技术栈

- React 18
- TypeScript
- Vite
- SSE (Server-Sent Events)

## 端口配置

- **前端端口**: 8888
- **后端端口**: 2500

## 快速开始

### 1. 安装依赖

```bash
cd user-chat-frontend
npm install
```

### 2. 启动前端

```bash
npm run dev
```

前端将在 http://localhost:8888 启动

### 3. 确保后端运行

确保后端服务在 http://localhost:2500 运行

## 使用说明

### 对话管理

1. **选择对话**: 点击左侧会话列表中的对话
2. **创建对话**: 点击"＋ 新建对话"按钮
3. **发送消息**: 在底部输入框输入消息并点击发送

### 默认会话

系统预设了两个会话：
- `morning_work` - 上午工作
- `afternoon_meeting` - 下午会议

### API 请求格式

请求会按照以下格式发送到后端：

```json
{
  "userId": "user1",
  "agentId": "schedule-assistant",
  "sessionId": "morning_work",
  "message": "用户输入的消息"
}
```

### SSE 事件处理

前端支持以下 SSE 事件：
- `message` - 消息内容
- `progress` - 进度更新
- `tool` - 工具调用
- `complete` - 完成
- `error` - 错误

## 项目结构

```
user-chat-frontend/
├── src/
│   ├── components/
│   │   ├── SessionList.tsx      # 会话列表组件
│   │   ├── SessionList.css
│   │   ├── ChatArea.tsx         # 聊天区域组件
│   │   ├── ChatArea.css
│   │   ├── MessageItem.tsx      # 消息项组件
│   │   └── MessageItem.css
│   ├── types.ts                 # TypeScript 类型定义
│   ├── App.tsx                  # 主应用组件
│   ├── App.css
│   ├── main.tsx                 # 入口文件
│   └── index.css
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 开发说明

### 代理配置

Vite 配置了代理，所有 `/api` 请求会被转发到 `http://localhost:2500`

### 样式设计

- 左侧边栏：深色主题 (#2c3e50)
- 聊天区域：浅色主题
- 用户消息：蓝色背景
- 助手消息：灰色背景

## 测试

可以配合 `test-single-user-dual-sessions.js` 测试脚本验证后端功能。

