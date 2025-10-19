# Kode-SDK 与前端对话界面集成方案

## 📚 文档导航

本方案提供了 Kode-SDK 后端 AI Agent 框架与前端 React 对话界面的完整集成指南。

### 核心文档

| 序号 | 文档名称 | 说明 | 适合读者 |
|-----|---------|------|---------|
| 0️⃣ | [**完整集成方案总览**](./00-完整集成方案总览.md) | 🌟 **从这里开始**<br/>整体架构、快速开始、实施步骤 | 所有人 |
| 1️⃣ | [Kode-SDK核心架构分析](./01-Kode-SDK核心架构分析.md) | Agent、EventBus、MessageQueue、工具系统 | 后端开发者 |
| 2️⃣ | [事件流系统详解](./02-事件流系统详解.md) | Progress/Control/Monitor 三通道、事件订阅 | 后端开发者 |
| 3️⃣ | [工具调用机制详解](./03-工具调用机制详解.md) | 工具定义、执行流程、Hook 系统、权限管理 | 后端开发者 |
| 4️⃣ | [API层设计](./04-API层设计.md) | RESTful API、SSE/WebSocket、认证授权 | 全栈开发者 |
| 5️⃣ | [前端对话界面对接方案](./05-前端对话界面对接方案.md) | 事件映射、组件集成、状态管理 | 前端开发者 |
| 6️⃣ | [事件和消息映射对照表](./06-事件和消息映射对照表.md) | 所有映射关系速查、转换函数、实现检查清单 | 全栈开发者 |
| 7️⃣ | [Frontend对话界面组件分析](./07-Frontend对话界面组件分析.md) | 前端组件详解、结构分析、实现细节 | 前端开发者 |

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd kode-sdk
```

### 2. 安装依赖

```bash
# 后端
npm install

# 前端
cd frontend
npm install
```

### 3. 启动后端 API 服务器

```bash
# 创建 server.ts (参考 04-API层设计.md)
npx tsx server.ts
```

### 4. 启动前端开发服务器

```bash
cd frontend
npm run dev
```

### 5. 测试集成

访问 `http://localhost:5173`，开始对话！

## 📖 阅读指南

### 场景 1: 我是后端开发者

**目标**: 理解 Kode-SDK 并搭建 API 服务器

```
1. 📄 01-Kode-SDK核心架构分析.md
   → 理解 Agent、EventBus、MessageQueue
   
2. 📄 02-事件流系统详解.md
   → 掌握三通道事件系统
   
3. 📄 03-工具调用机制详解.md
   → 学习工具定义和执行
   
4. 📄 04-API层设计.md
   → 实现 RESTful + SSE 接口
   
5. 📄 00-完整集成方案总览.md
   → 查看完整实施步骤
```

### 场景 2: 我是前端开发者

**目标**: 集成现有对话界面

```
1. 📄 07-Frontend对话界面组件分析.md
   → 了解现有前端组件结构
   
2. 📄 00-完整集成方案总览.md
   → 了解整体架构和数据流
   
3. 📄 02-事件流系统详解.md (快速浏览)
   → 理解后端事件格式
   
4. 📄 05-前端对话界面对接方案.md
   → 实现事件订阅和 UI 更新
   
5. 📄 06-事件和消息映射对照表.md
   → 查看详细的事件映射关系
```

### 场景 3: 我是全栈开发者

**目标**: 完整实现端到端集成

```
1. 📄 00-完整集成方案总览.md
   → 整体把握架构和流程
   
2. 📄 01/02/03 (后端篇)
   → 深入理解后端机制
   
3. 📄 04-API层设计.md
   → 实现 API 网关
   
4. 📄 05-前端对话界面对接方案.md
   → 完成前端集成
   
5. 📄 00-完整集成方案总览.md (回顾)
   → 检查实施步骤和验收标准
```

### 场景 4: 我是架构师/技术负责人

**目标**: 评估方案可行性

```
1. 📄 00-完整集成方案总览.md
   → 快速了解整体方案
   
2. 📄 07-Frontend对话界面组件分析.md
   → 评估前端现有能力
   
3. 📄 04-API层设计.md
   → 评估 API 设计和性能
   
4. 📄 02-事件流系统详解.md
   → 理解事件驱动架构
   
5. 📄 00-完整集成方案总览.md (第 7-9 节)
   → 查看部署、性能、安全方案
```

## 🏗️ 核心概念速查

### 后端核心

| 概念 | 说明 | 文档 |
|-----|------|------|
| **Agent** | AI 智能体，管理对话和工具调用 | 01 |
| **EventBus** | 事件总线，三通道发布订阅 | 02 |
| **MessageQueue** | 消息队列，排队和持久化 | 01 |
| **Progress 事件** | UI 更新事件（文本、工具） | 02 |
| **Control 事件** | 审批控制事件 | 02 |
| **Monitor 事件** | 监控审计事件 | 02 |
| **ToolRunner** | 工具并发执行器 | 03 |
| **Hook 系统** | preToolUse / postToolUse | 03 |

### 前端核心

| 概念 | 说明 | 文档 |
|-----|------|------|
| **ChatInterface** | 主对话组件 | 05 |
| **EventMessage** | 事件消息分发器 | 05 |
| **useEventStore** | 事件状态管理 | 05 |
| **SSE Stream** | Server-Sent Events 订阅 | 04, 05 |
| **TextAccumulator** | 流式文本累加器 | 05 |
| **MCPObservationContent** | MCP 工具结果显示 | 05 |

### API 核心

| 端点 | 方法 | 说明 | 文档 |
|-----|------|------|------|
| `/api/conversations` | POST | 创建会话 | 04 |
| `/api/conversations/:id/messages` | POST | 发送消息 | 04 |
| `/api/conversations/:id/messages` | GET | 获取历史 | 04 |
| `/api/conversations/:id/events` | GET | SSE 事件流 | 04 |
| `/api/conversations/:id/approvals/:callId` | POST | 审批决策 | 04 |

## 🎯 关键流程图

### 用户发送消息流程

```
User Input → ChatInterface → POST /messages 
  ↓
MessageQueue → Agent → Model (LLM)
  ↓
Streaming Response → Progress Events
  ↓
SSE Stream → Event Handler → Update UI
```

### 工具调用流程

```
Model Returns tool_use → processToolCall()
  ↓
Emit tool:start → Frontend 显示执行中
  ↓
Execute Tool → ToolRunner
  ↓
Emit tool:end → Frontend 显示结果
```

### 审批流程

```
Pre-hook → decision: 'ask' → permission_required
  ↓
Frontend 弹出审批框
  ↓
User Decision → POST /approvals/:callId
  ↓
agent.decide() → Continue/Deny Execution
```

## 📦 代码示例

### 后端示例

```typescript
// 创建 Agent
const agent = await Agent.create({
  agentId: 'agt_demo',
  templateId: 'chat-assistant',
  sandbox: { kind: 'local', workDir: './workspace' }
}, deps);

// 发送消息
await agent.send('你好');

// 订阅事件
for await (const envelope of agent.subscribe(['progress'])) {
  console.log(envelope.event);
  if (envelope.event.type === 'done') break;
}
```

### 前端示例

```typescript
// 订阅事件流
const es = new EventSource('/api/conversations/conv_1/events');

es.addEventListener('text_chunk', (e) => {
  const { event } = JSON.parse(e.data);
  appendText(event.delta);
});

es.addEventListener('tool:end', (e) => {
  const { event } = JSON.parse(e.data);
  showToolResult(event.call);
});
```

## 🔧 技术栈

### 后端

- **Kode-SDK**: AI Agent 框架
- **Express/Fastify**: HTTP 服务器
- **SSE/Socket.IO**: 实时通信
- **PostgreSQL/SQLite**: 数据持久化
- **Redis**: 缓存 (可选)

### 前端

- **React**: UI 框架
- **Zustand**: 状态管理
- **EventSource**: SSE 客户端
- **React Router**: 路由

## 📈 性能指标

| 指标 | 目标值 | 说明 |
|-----|--------|------|
| 消息延迟 | < 200ms | 从发送到开始接收响应 |
| 工具执行 | < 5s | 平均工具执行时间 |
| 并发用户 | 100+ | 单实例支持并发数 |
| 可用性 | 99.9% | 年度可用性目标 |
| 事件丢失率 | < 0.01% | 断线重连后恢复 |

## 🛡️ 安全措施

- ✅ JWT 认证
- ✅ 用户隔离
- ✅ 危险工具审批
- ✅ 输入验证
- ✅ 速率限制
- ✅ 错误日志脱敏

## 📝 许可证

本方案基于 Kode-SDK 和 Frontend 项目，遵循各自的许可证。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系方式

- 技术支持: [Issue Tracker]
- 文档反馈: [GitHub Discussions]

---

**开始你的集成之旅**: 从 [00-完整集成方案总览.md](./00-完整集成方案总览.md) 开始！ 🚀

