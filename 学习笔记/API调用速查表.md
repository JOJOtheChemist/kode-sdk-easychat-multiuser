# Kode-SDK API 调用速查表

## 📋 目录

- [核心概念](#核心概念)
- [快速开始](#快速开始)
- [多用户场景](#多用户场景)
- [API 端点示例](#api-端点示例)
- [事件订阅](#事件订阅)
- [常见问题](#常见问题)

---

## 核心概念

### 架构模式

```
单个 Runtime（依赖容器）
        ↓
多个 Agent 实例（每个用户/会话）
        ↓
按 agentId 隔离数据
```

### 关键原则

✅ **单 Runtime，多 Agent**
- Runtime（依赖容器）全局只创建一次
- 每个用户/会话有独立的 Agent 实例
- 通过 agentId 实现数据隔离

✅ **Resume or Create 模式**
```typescript
const exists = await deps.store.exists(agentId);
if (exists) {
  return Agent.resumeFromStore(agentId, deps);
}
return Agent.create(config, deps);
```

---

## 快速开始

### 1. 创建 Runtime（应用启动时）

```typescript
import { createRuntime, GLMProvider } from '@kode/sdk';

// ✅ 全局单例
const deps = createRuntime(({ templates, registerBuiltin }) => {
  registerBuiltin('fs', 'bash', 'todo');

  templates.register({
    id: 'chat-assistant',
    systemPrompt: '你是一个有帮助的助手',
    tools: ['fs_read', 'todo_read', 'todo_write'],
    model: 'glm-4-air',
  });
}, {
  storeDir: './.kode',
});

// 配置 GLM 模型
deps.modelFactory = (config) => new GLMProvider(
  'your-api-key',
  'glm-4-air',
  'https://open.bigmodel.cn/api/paas/v4'
);
```

### 2. Resume or Create Helper

```typescript
import { Agent } from '@kode/sdk';

async function resumeOrCreate(agentId: string) {
  const exists = await deps.store.exists(agentId);
  
  if (exists) {
    return Agent.resumeFromStore(agentId, deps);
  }
  
  return Agent.create({
    agentId,
    templateId: 'chat-assistant',
    sandbox: { 
      kind: 'local', 
      workDir: `./workspace/${agentId}` 
    },
  }, deps);
}
```

### 3. 监控和审批绑定

```typescript
function bindMonitoring(agent: Agent) {
  // 工具执行监控
  agent.on('tool_executed', (event) => {
    console.log('Tool:', event.call.name, event.call.durationMs);
  });
  
  // 错误监控
  agent.on('error', (event) => {
    console.error('Error:', event.phase, event.message);
  });
  
  // 审批请求
  agent.on('permission_required', (event) => {
    // 推送到审批系统
    console.log('Approval needed:', event.call.name);
  });
}
```

---

## 多用户场景

### agentId 命名策略

```typescript
// 策略 1: 用户级
const agentId = `user:${userId}`;

// 策略 2: 会话级
const agentId = `session:${sessionId}`;

// 策略 3: 用户+会话
const agentId = `user:${userId}:session:${sessionId}`;

// 策略 4: 业务场景
const agentId = `project:${projectId}:task:${taskId}`;
```

### 数据隔离

```
.kode/
├── user:123/          # 用户 123 的数据
│   ├── messages.json
│   ├── tools.json
│   └── todos.json
├── user:456/          # 用户 456 的数据
└── session:abc/       # 会话 abc 的数据

workspace/
├── user:123/          # 用户 123 的文件
├── user:456/          # 用户 456 的文件
└── session:abc/       # 会话 abc 的文件
```

---

## API 端点示例

### Express API

```typescript
import express from 'express';

const app = express();
app.use(express.json());

// 1. 发送消息
app.post('/api/agents/:agentId/messages', async (req, res) => {
  const { agentId } = req.params;
  const { text } = req.body;
  
  const agent = await resumeOrCreate(agentId);
  await agent.send(text);
  
  res.status(202).json({ status: 'queued' });
});

// 2. SSE 流式响应
app.get('/api/agents/:agentId/stream', async (req, res) => {
  const { agentId } = req.params;
  const agent = await resumeOrCreate(agentId);
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders();
  
  for await (const envelope of agent.subscribe(['progress'])) {
    res.write(`data: ${JSON.stringify(envelope)}\n\n`);
    if (envelope.event.type === 'done') break;
  }
  
  res.end();
});

// 3. 获取状态
app.get('/api/agents/:agentId/status', async (req, res) => {
  const { agentId } = req.params;
  const agent = await resumeOrCreate(agentId);
  
  const status = await agent.status();
  const todos = await agent.getTodos();
  
  res.json({ status, todos });
});

// 4. 审批决策
app.post('/api/agents/:agentId/approve', async (req, res) => {
  const { agentId } = req.params;
  const { callId, decision, note } = req.body;
  
  const agent = await resumeOrCreate(agentId);
  await agent.decide(callId, decision, note);
  
  res.status(204).end();
});
```

### Next.js API Route

```typescript
// pages/api/agents/[agentId]/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req, res) {
  const agentId = req.query.agentId as string;
  const agent = await resumeOrCreate(agentId);
  
  if (req.method === 'POST') {
    await agent.send(req.body.message);
    res.json({ status: 'queued' });
  } else if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/event-stream');
    for await (const event of agent.subscribe(['progress'])) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    res.end();
  }
}
```

---

## 事件订阅

### Progress 事件（数据面）

```typescript
for await (const envelope of agent.subscribe(['progress'])) {
  switch (envelope.event.type) {
    case 'text_chunk_start':
      console.log('开始回复');
      break;
    case 'text_chunk':
      process.stdout.write(envelope.event.delta);
      break;
    case 'text_chunk_end':
      console.log('\n回复结束');
      break;
    case 'tool:start':
      console.log('工具开始:', envelope.event.call.name);
      break;
    case 'tool:end':
      console.log('工具完成:', envelope.event.call.name);
      break;
    case 'done':
      console.log('对话完成');
      break;
  }
}
```

### Monitor 事件（治理面）

```typescript
agent.on('tool_executed', (event) => {
  // 工具执行完成
  console.log({
    tool: event.call.name,
    duration: event.call.durationMs,
    success: !event.call.isError,
  });
});

agent.on('error', (event) => {
  // 错误发生
  console.error({
    phase: event.phase,
    message: event.message,
    severity: event.severity,
  });
});

agent.on('token_usage', (event) => {
  // Token 使用统计
  console.log({
    input: event.inputTokens,
    output: event.outputTokens,
  });
});
```

### Control 事件（审批面）

```typescript
agent.on('permission_required', async (event) => {
  // 需要审批
  console.log('需要审批:', event.call.name);
  
  // 方式1: 直接响应
  await event.respond('allow', '自动批准');
  
  // 方式2: 推送到审批系统
  await pushToApprovalSystem({
    agentId: agent.agentId,
    callId: event.call.id,
    toolName: event.call.name,
    input: event.call.inputPreview,
  });
});

// 稍后审批
await agent.decide(callId, 'allow', '批准执行');
```

---

## Agent 核心 API

### 消息操作

```typescript
// 发送消息
await agent.send('你好');

// 发送提醒
await agent.send('请总结进度', { kind: 'reminder' });

// 阻塞式对话
const result = await agent.chat('帮我写代码');
console.log(result.text);

// 流式对话
for await (const event of agent.chatStream('解释这段代码')) {
  if (event.type === 'text_chunk') {
    console.log(event.delta);
  }
}
```

### 状态查询

```typescript
// 获取状态
const status = await agent.status();
console.log({
  agentId: status.agentId,
  state: status.state,  // READY | WORKING | PAUSED
  stepCount: status.stepCount,
  breakpoint: status.breakpoint,
});

// 获取详细信息
const info = await agent.info();
console.log(info);
```

### Todo 管理

```typescript
// 获取 Todo
const todos = await agent.getTodos();

// 设置 Todo
await agent.setTodos([
  { id: '1', content: '学习 SDK', status: 'pending' },
  { id: '2', content: '写代码', status: 'in_progress' },
]);

// 更新单个 Todo
await agent.updateTodo('1', { status: 'completed' });

// 删除 Todo
await agent.deleteTodo('1');
```

### 快照和分叉

```typescript
// 创建快照
const snapshotId = await agent.snapshot('重要节点');

// 基于快照分叉
const forkedAgent = await agent.fork(snapshotId);

// 分叉的 Agent 继承：
// - 工具配置
// - 权限设置
// - 历史消息（副本）
// - Lineage 记录
```

### 中断和审批

```typescript
// 中断当前工具
await agent.interrupt({ reason: '用户取消' });

// 审批决策
await agent.decide(callId, 'allow', '批准');
await agent.decide(callId, 'deny', '拒绝');
```

### 调度器

```typescript
// 获取调度器
const scheduler = agent.schedule();

// 每 N 步触发
scheduler.everySteps(5, ({ stepCount }) => {
  console.log('步数:', stepCount);
  agent.send('请总结进度', { kind: 'reminder' });
});

// 外部触发
scheduler.notifyExternalTrigger({
  kind: 'cron',
  taskId: 'daily-report',
  spec: '0 9 * * *',
});
```

---

## 常见问题

### Q: 多用户需要多个 Runtime 吗？

**A: 不需要！** 只需要一个 Runtime（全局单例），每个用户通过独立的 Agent 实例隔离。

```typescript
// ✅ 正确：单 Runtime
const deps = createRuntime(/* ... */);  // 全局一次

// ✅ 每个用户独立 Agent
const alice = await resumeOrCreate('user:alice');
const bob = await resumeOrCreate('user:bob');

// ❌ 错误：多个 Runtime
const deps1 = createRuntime(/* ... */);  // 用户 1
const deps2 = createRuntime(/* ... */);  // 用户 2  // 错误！
```

### Q: 如何处理并发请求？

**A: Agent 实例是线程安全的**，可以并发处理多个用户的请求。

```typescript
// ✅ 并发处理
const [alice, bob, charlie] = await Promise.all([
  resumeOrCreate('user:alice'),
  resumeOrCreate('user:bob'),
  resumeOrCreate('user:charlie'),
]);

// 同时发送消息
await Promise.all([
  alice.send('消息1'),
  bob.send('消息2'),
  charlie.send('消息3'),
]);
```

### Q: Resume 后需要重新绑定事件吗？

**A: 是的！** Control 和 Monitor 回调不会持久化，需要重新绑定。

```typescript
async function resumeOrCreate(agentId: string) {
  const agent = await /* ... */;
  
  // ✅ 每次都重新绑定
  agent.on('permission_required', handleApproval);
  agent.on('tool_executed', logTool);
  agent.on('error', logError);
  
  return agent;
}
```

### Q: 如何实现用户隔离？

**A: 通过 agentId 和 Sandbox 实现完全隔离**。

```typescript
// 1. agentId 隔离数据
const agentId = `user:${userId}`;

// 2. Sandbox 隔离文件
sandbox: {
  kind: 'local',
  workDir: `./workspace/${userId}`,
  enforceBoundary: true,  // 强制边界
}

// 3. Store 自动按 agentId 分目录
.kode/user:alice/
.kode/user:bob/
```

### Q: 如何优化性能？

**A: 使用 Agent 缓存和池管理**。

```typescript
// 缓存活跃的 Agent
const agentCache = new Map<string, Agent>();

async function getAgent(agentId: string) {
  let agent = agentCache.get(agentId);
  if (!agent) {
    agent = await resumeOrCreate(agentId);
    agentCache.set(agentId, agent);
  }
  return agent;
}

// 或使用 AgentPool
import { AgentPool } from '@kode/sdk';

const pool = new AgentPool({
  dependencies: deps,
  maxAgents: 100,
});

const agent = await pool.create({
  agentId: `user:${userId}`,
  /* ... */
});
```

### Q: 如何处理 SSE 断线重连？

**A: 使用 bookmark 实现断点续播**。

```typescript
// 客户端携带 since 参数
app.get('/api/stream', async (req, res) => {
  const since = req.query.since 
    ? { seq: Number(req.query.since), timestamp: Date.now() }
    : undefined;
  
  for await (const envelope of agent.subscribe(['progress'], { since })) {
    res.write(`data: ${JSON.stringify(envelope)}\n\n`);
    
    // 返回 bookmark 给客户端保存
    if (envelope.event.type === 'done' && envelope.bookmark) {
      // 客户端下次请求携带 ?since=${envelope.bookmark.seq}
    }
  }
});
```

---

## 运行示例

### 测试多用户场景

```bash
cd /Users/yeya/FlutterProjects/kode-sdk/Kode-sdk
npm run example:multi-user
```

### 查看其他示例

```bash
npm run example:getting-started  # 基础示例
npm run example:agent-inbox      # 事件驱动收件箱
npm run example:approval         # 审批工作流
npm run example:room             # 多 Agent 协作
npm run example:scheduler        # 调度和提醒
npm run example:nextjs           # Next.js API
```

---

## 完整示例代码

见以下文件：
- `多用户架构说明.md` - 详细架构说明
- `examples/multi-user-demo.ts` - 完整演示代码
- `examples/nextjs-api-route.ts` - Next.js 集成
- `docs/quickstart.md` - 快速开始指南
- `docs/api.md` - 完整 API 参考

---

## 快速参考卡片

### 初始化
```typescript
const deps = createRuntime(/* ... */);  // 1次
deps.modelFactory = (config) => new GLMProvider(/* ... */);
```

### 获取 Agent
```typescript
const agent = await resumeOrCreate(`user:${userId}`);
```

### 发送消息
```typescript
await agent.send(text);
```

### 订阅事件
```typescript
for await (const e of agent.subscribe(['progress'])) {
  // 处理事件
}
```

### 绑定监控
```typescript
agent.on('tool_executed', handler);
agent.on('error', handler);
agent.on('permission_required', handler);
```

---

**核心要点**：单 Runtime，多 Agent，Resume or Create ✨

