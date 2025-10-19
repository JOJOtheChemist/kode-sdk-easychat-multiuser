# ChatKit 前端 + Kode-SDK 后端对接方案

> 完整的技术方案文档，将 OpenAI ChatKit 前端与 Kode-SDK 后端集成

## 📚 文档目录

1. **[前端架构分析](./01-前端架构分析.md)**
   - ChatKit React 组件分析
   - API 通信机制
   - 客户端工具系统
   - 数据流和状态管理

2. **[当前后端架构分析](./02-当前后端架构分析.md)**
   - OpenAI ChatKit Server 实现
   - FastAPI + Python 架构
   - Agent 和工具系统
   - ChatKit 协议要点

3. **[Kode-SDK 后端能力分析](./03-kode-sdk后端能力分析.md)**
   - Kode-SDK 核心特性
   - Agent 系统和事件机制
   - 内置工具和自定义工具
   - 与 ChatKit 的对比分析

4. **[对接方案设计](./04-对接方案设计.md)**
   - 整体架构设计
   - 适配层设计
   - 技术栈选择
   - 实现步骤规划

5. **[TypeScript 实现方案](./05-TypeScript实现方案.md)** ⭐ 推荐
   - 完整代码实现
   - 项目结构
   - 核心组件详解
   - 部署和测试指南

## 🎯 方案概述

### 核心目标

将 **OpenAI ChatKit 前端**（React + ChatKit 协议）与 **Kode-SDK 后端**（TypeScript Agent 框架）无缝集成，实现：

✅ **前端零修改**：保持 ChatKit React 组件不变
✅ **协议适配**：转换 ChatKit 协议 ↔ Kode-SDK 事件
✅ **功能增强**：利用 Kode-SDK 的文件系统、代码编辑等高级功能
✅ **企业级存储**：使用 Kode-SDK 的持久化和检查点机制

### 架构图

```
┌─────────────────────────────────────┐
│   React 前端（@openai/chatkit-react）│
│   - 对话界面                          │
│   - 主题切换                          │
│   - Facts 展示                        │
└───────────────┬─────────────────────┘
                │
                │ ChatKit 协议（SSE）
                │
┌───────────────▼─────────────────────┐
│   Node.js + TypeScript 适配层        │
│                                     │
│   ┌─────────────────────────────┐  │
│   │ ChatKit Protocol Adapter     │  │
│   │ - 解析 ChatKit 请求          │  │
│   │ - SSE 事件流转换             │  │
│   │ - 客户端工具调用处理         │  │
│   └─────────────────────────────┘  │
│                                     │
└───────────────┬─────────────────────┘
                │
                │ Kode-SDK API
                │
┌───────────────▼─────────────────────┐
│   Kode-SDK Agent 层                  │
│                                     │
│   ┌─────────────────────────────┐  │
│   │ Agent 管理                   │  │
│   │ - 多会话管理                 │  │
│   │ - 自动状态恢复               │  │
│   └─────────────────────────────┘  │
│                                     │
│   ┌─────────────────────────────┐  │
│   │ 工具系统                     │  │
│   │ - save_fact                  │  │
│   │ - switch_theme               │  │
│   │ - 文件系统工具（可选）       │  │
│   └─────────────────────────────┘  │
│                                     │
│   ┌─────────────────────────────┐  │
│   │ 持久化存储                   │  │
│   │ - JSONStore（会话历史）      │  │
│   │ - Facts 存储                 │  │
│   └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 🚀 快速开始

### 前置要求

- Node.js 18+
- GLM API Key（或其他兼容的 LLM API）
- Git

### 步骤 1: 创建后端项目

```bash
# 创建项目目录
mkdir chatkit-kode-backend
cd chatkit-kode-backend

# 初始化项目
npm init -y

# 安装依赖
npm install @shareai-lab/kode-sdk fastify @fastify/cors dotenv

# 安装开发依赖
npm install -D typescript @types/node tsx
```

### 步骤 2: 创建项目文件

按照 **[TypeScript 实现方案](./05-TypeScript实现方案.md)** 中的代码创建以下文件：

```
src/
├── server.ts              # 服务器入口
├── chatkit/
│   ├── adapter.ts         # ChatKit 适配器
│   └── converter.ts       # 事件转换器
├── kode/
│   ├── config.ts          # Kode-SDK 配置
│   ├── agent-manager.ts   # Agent 管理器
│   └── tools.ts           # 自定义工具
└── storage/
    └── facts-store.ts     # Facts 存储
```

### 步骤 3: 配置环境变量

```bash
# 创建 .env 文件
cat > .env << EOF
PORT=8001
HOST=0.0.0.0
FRONTEND_URL=http://localhost:5173
GLM_API_KEY=your-glm-api-key-here
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
EOF
```

### 步骤 4: 启动后端

```bash
npm run dev
```

### 步骤 5: 配置前端

在前端项目的 `.env` 文件中：

```bash
VITE_CHATKIT_API_URL=http://localhost:8001/chatkit
VITE_CHATKIT_API_DOMAIN_KEY=domain_pk_localhost_dev
```

### 步骤 6: 启动前端

```bash
cd /path/to/frontend
npm run dev
```

访问 http://localhost:5173 即可使用！

## 📊 功能对比

| 功能 | 原 ChatKit 后端 | Kode-SDK 后端 |
|------|----------------|---------------|
| 流式对话 | ✅ | ✅ |
| 客户端工具（主题切换） | ✅ | ✅ |
| 客户端工具（保存 facts） | ✅ | ✅ |
| 会话持久化 | ⚠️ 内存 | ✅ 文件/Redis |
| 文件操作 | ❌ | ✅ 完整支持 |
| 代码编辑 | ❌ | ✅ 支持 |
| Bash 命令 | ❌ | ✅ 支持 |
| 多 Agent 协作 | ❌ | ✅ 支持 |
| 自动状态恢复 | ❌ | ✅ 支持 |
| 工具扩展性 | ⚠️ 需要自定义 | ✅ 丰富的 API |

## 🔑 关键技术点

### 1. 协议转换

```
ChatKit SSE 事件 ←→ Kode-SDK 事件

text.delta          ←→ text_chunk
client_tool_call    ←→ 工具调用 + 客户端队列
thread_item.done    ←→ message_complete
```

### 2. 客户端工具机制

Kode-SDK 不原生支持客户端工具，通过**工具调用队列**实现：

```typescript
// 在工具 handler 中
clientToolCallQueue.get(agentId).push({
  name: 'record_fact',
  arguments: { fact_id, fact_text }
});

// 在事件转换时发送
yield formatSSE({
  type: 'client_tool_call',
  name: 'record_fact',
  arguments: { ... }
});
```

### 3. 会话管理

```
thread_id (ChatKit) → Agent ID (Kode-SDK)
- AgentManager 维护映射
- 自动创建/恢复 Agent
- 每个 thread 独立的沙箱环境
```

## 🛠️ 开发路线图

### Phase 1: MVP（1-2 周）

- [x] 基础架构搭建
- [x] ChatKit 适配器实现
- [x] save_fact 工具
- [x] switch_theme 工具
- [x] 流式响应
- [ ] 基础测试

### Phase 2: 增强功能（2-3 周）

- [ ] Facts REST API
- [ ] 错误处理优化
- [ ] 日志系统
- [ ] 性能监控
- [ ] 单元测试
- [ ] 集成测试

### Phase 3: 生产就绪（2-3 周）

- [ ] Redis 存储后端
- [ ] 认证和授权
- [ ] 请求限流
- [ ] Docker 容器化
- [ ] CI/CD 流程
- [ ] 文档完善

### Phase 4: 高级特性（长期）

- [ ] 文件上传支持
- [ ] 天气查询工具
- [ ] 代码执行沙箱
- [ ] 多 Agent 协作
- [ ] 实时协作编辑

## 📝 注意事项

### 安全性

⚠️ **生产环境必须：**
- 启用 HTTPS
- 添加认证机制
- 实现请求限流
- 沙箱严格隔离
- API Key 安全存储
- CORS 策略配置

### 性能

⚠️ **优化建议：**
- 使用 Redis 缓存
- Agent 池化管理
- 连接复用
- 事件流优化
- 定期清理过期会话

### 扩展性

✅ **易于扩展：**
- 新增自定义工具
- 接入不同 LLM
- 添加中间件
- 自定义存储后端

## 🤝 贡献指南

欢迎提交 Issue 和 PR！

## 📄 许可证

MIT

## 🔗 相关链接

- [Kode-SDK GitHub](https://github.com/your-org/kode-sdk)
- [OpenAI ChatKit 文档](https://platform.openai.com/docs/chatkit)
- [GLM API 文档](https://open.bigmodel.cn/dev/api)

---

**最后更新**: 2025-01-15

**维护者**: Your Team

**问题反馈**: [GitHub Issues](https://github.com/your-org/chatkit-kode-adapter/issues)

