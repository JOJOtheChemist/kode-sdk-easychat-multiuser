# Kode-SDK 核心架构分析

## 1. 整体架构概览

Kode-SDK 是一个基于事件驱动的 Agent 框架，采用三层架构：

```
┌─────────────────────────────────────────────────────┐
│                   Agent Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ MessageQueue │  │  EventBus    │  │ToolRunner │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│              Infrastructure Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Store      │  │ModelProvider │  │  Sandbox  │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│                  Tool Registry                       │
│  ┌──────────────────────────────────────────────┐  │
│  │  fs_read, fs_write, bash_run, todo_*, mcp... │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 2. 核心组件详解

### 2.1 Agent 类
**位置**: `Kode-sdk/src/core/agent.ts`

Agent 是整个系统的核心控制器，负责：
- **消息管理**: 维护 `messages: Message[]` 数组
- **状态管理**: `state: AgentRuntimeState = 'READY' | 'WORKING' | 'PAUSED'`
- **工具调度**: 通过 `ToolRunner` 并发执行工具
- **事件发布**: 通过 `EventBus` 发布三种类型的事件

```typescript
// Agent 核心属性
private messages: Message[] = [];
private state: AgentRuntimeState = 'READY';
private toolRecords = new Map<string, ToolCallRecord>();
private readonly events = new EventBus();
private readonly messageQueue: MessageQueue;
private readonly toolRunner: ToolRunner;
```

### 2.2 消息类型定义
**位置**: `Kode-sdk/src/core/types.ts`

```typescript
export type MessageRole = 'user' | 'assistant' | 'system';

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: any }
  | { type: 'tool_result'; tool_use_id: string; content: any; is_error?: boolean };

export interface Message {
  role: MessageRole;
  content: ContentBlock[];
}
```

**关键设计**:
- 消息采用 `ContentBlock` 数组，支持文本和工具调用混合
- `tool_use` 和 `tool_result` 成对出现，通过 `id` 和 `tool_use_id` 关联
- 与 Anthropic Claude API 格式兼容

### 2.3 MessageQueue（消息队列）
**位置**: `Kode-sdk/src/core/agent/message-queue.ts`

负责消息的排队和持久化：

```typescript
export class MessageQueue {
  private pending: PendingMessage[] = [];
  
  send(text: string, opts: SendOptions = {}): string {
    const kind: PendingKind = opts.kind ?? 'user';
    const payload = kind === 'reminder' ? 
      this.options.wrapReminder(text, opts.reminder) : text;
    
    this.pending.push({
      message: {
        role: 'user',
        content: [{ type: 'text', text: payload }],
      },
      kind,
      metadata: { id, ...(opts.metadata || {}) },
    });
    
    if (kind === 'user') {
      this.options.ensureProcessing(); // 触发处理
    }
    return id;
  }

  async flush(): Promise<void> {
    // 批量持久化到 Store
    for (const entry of this.pending) {
      this.options.addMessage(entry.message, entry.kind);
    }
    await this.options.persist();
    this.pending = [];
  }
}
```

**特点**:
- 支持多种消息类型：`user`、`reminder`、`system`
- 先入队，后批量持久化（提高性能）
- 自动触发 Agent 处理流程

### 2.4 EventBus（事件总线）
**位置**: `Kode-sdk/src/core/events.ts`

核心事件分发系统，支持三个独立通道：

```typescript
export class EventBus {
  private cursor = 0;
  private seq = 0;
  private timeline: Timeline[] = [];
  
  // 三个发射器
  emitProgress(event: ProgressEvent): AgentEventEnvelope<ProgressEvent>
  emitControl(event: ControlEvent): AgentEventEnvelope<ControlEvent>
  emitMonitor(event: MonitorEvent): AgentEventEnvelope<MonitorEvent>
  
  // 订阅方式
  subscribeProgress(opts?: { since?: Bookmark; kinds?: Array<...> }): AsyncIterable
  subscribe(channels: ['progress'|'control'|'monitor']): AsyncIterable
  
  // 回调式监听
  onControl<T>(type: T, handler: (evt: T) => void): () => void
  onMonitor<T>(type: T, handler: (evt: T) => void): () => void
}
```

**关键设计**:
- **Cursor/Bookmark**: 每个事件有唯一序号，支持断点续播
- **Timeline**: 内存保留最近 10000 条事件
- **持久化**: 关键事件（`tool:end`、`done`、`error` 等）会写入 Store
- **失败重试**: 持久化失败的关键事件会缓存并自动重试

### 2.5 ToolRunner（工具执行器）
**位置**: `Kode-sdk/src/core/agent/tool-runner.ts`

简单而高效的并发控制器：

```typescript
export class ToolRunner {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly concurrency: number) {}

  run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const execute = () => {
        this.active += 1;
        task()
          .then(resolve, reject)
          .finally(() => {
            this.active -= 1;
            this.flush(); // 执行队列中的下一个
          });
      };

      if (this.active < this.concurrency) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }
}
```

**特点**:
- 控制并发数（默认 3）
- 自动排队和调度
- 支持超时控制（通过 AbortController）

## 3. 工具系统架构

### 3.1 工具定义（Tool Definition）
**位置**: `Kode-sdk/src/tools/tool.ts`

提供两种定义方式：

```typescript
// 方式1: 简洁模式
tool('my_tool', async (args, ctx) => {
  return { result: 'success' };
});

// 方式2: 完整配置
tool({
  name: 'my_tool',
  description: '...',
  parameters: z.object({ ... }), // Zod schema
  execute: async (args, ctx) => { ... },
  metadata: {
    timeout: 30000,
    concurrent: true,
    readonly: true,
  },
  hooks: { preToolUse, postToolUse }
});
```

### 3.2 工具执行流程

```typescript
// Agent 中的工具调用流程
private async processToolCall(toolUse: { id: string; name: string; input: any }) {
  const tool = this.tools.get(toolUse.name);
  const record = this.registerToolRecord(toolUse); // 创建记录
  
  // 1. 发送 tool:start 事件
  this.events.emitProgress({ 
    type: 'tool:start', 
    call: this.snapshotToolRecord(record.id) 
  });
  
  // 2. 权限检查
  const policyDecision = this.permissions.evaluate(toolUse.name);
  if (policyDecision === 'deny') { ... }
  
  // 3. Pre-hook
  const preResult = await this.hooks.executePreToolUse(...);
  if (preResult?.decision === 'ask') {
    // 需要人工审批
    await this.requestPermission(record);
  }
  
  // 4. 执行工具（带超时和取消控制）
  const context: ToolContext = {
    agentId: this.agentId,
    sandbox: this.sandbox,
    agent: this,
    signal: controller.signal
  };
  
  const rawResult = await this.toolRunner.run(() => 
    Promise.race([
      tool.exec(toolUse.input, context),
      timeoutPromise
    ])
  );
  
  // 5. Post-hook
  const postResult = await this.hooks.executePostToolUse(...);
  
  // 6. 发送 tool:end 事件
  this.events.emitProgress({ 
    type: 'tool:end', 
    call: this.snapshotToolRecord(record.id) 
  });
  
  // 7. 返回 tool_result ContentBlock
  return {
    type: 'tool_result',
    tool_use_id: toolUse.id,
    content: finalResult
  };
}
```

### 3.3 工具调用记录（ToolCallRecord）

```typescript
export interface ToolCallRecord {
  id: string;
  name: string;
  input: any;
  state: ToolCallState; // PENDING/EXECUTING/COMPLETED/FAILED/DENIED
  approval: ToolCallApproval;
  result?: any;
  error?: string;
  isError?: boolean;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  auditTrail: ToolCallAuditEntry[]; // 状态变化历史
}
```

## 4. 持久化架构

### 4.1 Store 接口
**位置**: `Kode-sdk/src/infra/store.ts`

```typescript
export interface Store {
  // 消息持久化
  loadMessages(agentId: string): Promise<Message[]>
  saveMessages(agentId: string, messages: Message[]): Promise<void>
  
  // 工具调用记录
  loadToolCallRecords(agentId: string): Promise<ToolCallRecord[]>
  saveToolCallRecords(agentId: string, records: ToolCallRecord[]): Promise<void>
  
  // 事件持久化
  appendEvent(agentId: string, event: Timeline): Promise<void>
  readEvents(agentId: string, opts?): AsyncIterable<Timeline>
  
  // Agent 元信息
  saveAgentInfo(info: AgentInfo): Promise<void>
  loadAgentInfo(agentId: string): Promise<AgentInfo | null>
}
```

### 4.2 默认实现：JSONStore

基于文件系统的 JSON 存储：
```
.kode-{template}/
  {agentId}/
    messages.json      # 消息历史
    tools.json         # 工具调用记录
    events.jsonl       # 事件流（追加写入）
    info.json          # Agent 元信息
```

## 5. 关键执行流程

### 5.1 用户发送消息流程

```
1. agent.send(text) 
   ↓
2. MessageQueue.send(text, { kind: 'user' })
   ↓
3. enqueueMessage() → messages.push(...)
   ↓
4. ensureProcessing() → startProcessing()
   ↓
5. processLoop()
   ├─ messageQueue.flush() # 持久化
   ├─ buildMessages() # 构建模型输入
   ├─ model.chat(messages) # 调用 LLM
   ├─ 流式处理
   │  ├─ text → emitProgress('text_chunk')
   │  └─ tool_use → executeTools()
   ├─ 发送 'done' 事件
   └─ 更新状态
```

### 5.2 工具调用流程

```
1. 模型返回 tool_use ContentBlock
   ↓
2. executeTools([toolUse1, toolUse2, ...])
   ↓
3. 并发执行 (ToolRunner 控制并发数)
   ├─ processToolCall(toolUse1)
   │  ├─ emitProgress('tool:start')
   │  ├─ 权限检查
   │  ├─ Pre-hook
   │  ├─ tool.exec(input, context)
   │  ├─ Post-hook
   │  └─ emitProgress('tool:end')
   │
   └─ processToolCall(toolUse2)
      └─ ...
   ↓
4. 收集所有 tool_result
   ↓
5. 将 tool_result 添加到 messages
   ↓
6. 继续下一轮模型调用
```

## 6. 断点恢复机制

### 6.1 Resume 流程

```typescript
static async resumeFromStore(
  agentId: string, 
  deps: AgentDependencies
): Promise<Agent> {
  // 1. 加载 Agent 元信息
  const info = await deps.store.loadAgentInfo(agentId);
  
  // 2. 恢复模板和配置
  const template = deps.templateRegistry.get(info.templateId);
  
  // 3. 恢复 Sandbox
  const sandbox = deps.sandboxFactory.create(info.sandboxConfig);
  
  // 4. 创建 Agent 实例
  const agent = new Agent(config, deps, runtime);
  
  // 5. 恢复消息历史
  agent.messages = await deps.store.loadMessages(agentId);
  
  // 6. 恢复工具调用记录
  const records = await deps.store.loadToolCallRecords(agentId);
  agent.toolRecords = new Map(records.map(r => [r.id, r]));
  
  // 7. 处理未完成的工具调用（自动封口）
  const pending = records.filter(r => 
    r.state === 'PENDING' || r.state === 'EXECUTING'
  );
  
  for (const record of pending) {
    agent.sealToolCall(record.id, 'Agent resumed, call sealed');
  }
  
  return agent;
}
```

### 6.2 自动封口（Seal）机制

对于未完成的工具调用，Resume 时会：
1. 将状态改为 `SEALED`
2. 添加 `tool_result` (is_error=true)
3. 发送 `agent_resumed` Monitor 事件
4. 继续执行后续逻辑

## 7. 与前端对接的关键点

### 7.1 事件订阅接口

```typescript
// 订阅 Progress 事件（前端 UI 更新）
for await (const envelope of agent.subscribe(['progress'])) {
  switch (envelope.event.type) {
    case 'text_chunk':
      // 文本流式输出
      ui.appendText(envelope.event.delta);
      break;
    case 'tool:start':
      // 显示工具执行中
      ui.showToolExecution(envelope.event.call);
      break;
    case 'tool:end':
      // 显示工具结果
      ui.showToolResult(envelope.event.call);
      break;
    case 'done':
      // 完成一轮对话
      lastBookmark = envelope.bookmark;
      break;
  }
}
```

### 7.2 消息格式转换

Kode-SDK 的 Message 结构与 OpenAI/Anthropic 兼容，可以直接映射：

```typescript
// Kode Message
{
  role: 'assistant',
  content: [
    { type: 'text', text: '我来帮你分析...' },
    { type: 'tool_use', id: 'tool_1', name: 'fs_read', input: { path: '...' } }
  ]
}

// 前端需要的格式（可以保持一致）
{
  role: 'assistant',
  content: [
    { type: 'text', text: '我来帮你分析...' },
    { type: 'tool_use', id: 'tool_1', name: 'fs_read', input: { path: '...' } }
  ]
}
```

## 8. 性能和扩展性考虑

### 8.1 事件缓冲机制
- 内存保留最近 10000 条事件
- 超过后自动截断为 5000 条
- 关键事件持久化到 Store

### 8.2 工具并发控制
- 默认并发数: 3
- 可通过配置调整: `maxToolConcurrency`
- 队列排队，自动调度

### 8.3 消息压缩
- ContextManager 负责上下文管理
- 支持消息摘要和压缩
- 发送 `context_compression` Monitor 事件

## 总结

Kode-SDK 的核心优势：
1. **事件驱动**: 三通道设计（Progress/Control/Monitor）清晰分离关注点
2. **持久化友好**: 所有状态可序列化，支持断点恢复
3. **工具系统**: 灵活的工具定义和执行机制，支持并发和超时控制
4. **可扩展**: Hook 系统允许自定义业务逻辑
5. **类型安全**: TypeScript 全栈，Zod schema 验证

这些特性使其非常适合构建长时间运行、需要人机协作的 AI Agent 应用。

