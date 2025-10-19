# Kode-SDK 后端能力分析

## 概述
Kode-SDK 是一个事件驱动、长运行的 AI Agent 开发框架，提供企业级的持久化和上下文管理能力。

## 核心特性

### 1. Agent 系统

**Agent 创建：**

```typescript
const agent = await Agent.create(config, deps);

interface AgentConfig {
  templateId: string;              // 模板 ID
  modelConfig?: ModelConfig;       // 可选，覆盖模板模型配置
  sandbox?: SandboxConfig;         // 沙箱配置
}

interface AgentDependencies {
  store: Store;                    // 持久化存储
  templateRegistry: AgentTemplateRegistry;
  sandboxFactory: SandboxFactory;
  toolRegistry: ToolRegistry;
  modelFactory: (config: ModelConfig) => ModelProvider;
}
```

**模板定义：**

```typescript
templates.register({
  id: 'assistant',
  systemPrompt: '你是一个助手...',
  tools: ['fs_read', 'fs_write', 'bash_run'],
  model: 'glm-4.5-air',
  runtime: {
    todo: { enabled: true }
  }
});
```

### 2. 对话 API

**发送消息（等待完成）：**

```typescript
const result = await agent.send('用户消息');
// 返回: CompleteResult
```

**流式对话：**

```typescript
for await (const event of agent.chatStream('用户消息')) {
  if (event.event.type === 'text_chunk') {
    process.stdout.write(event.event.delta);
  }
}
```

**订阅事件：**

```typescript
agent.subscribe((event) => {
  if (event.event.type === 'text_chunk') {
    // 处理文本流
  } else if (event.event.type === 'tool_call') {
    // 处理工具调用
  }
});
```

### 3. 事件系统

**事件类型：**

```typescript
type AgentEvent = 
  | { type: 'text_chunk'; delta: string }          // 文本流
  | { type: 'tool_call'; tool: string; args: any } // 工具调用
  | { type: 'tool_result'; result: any }           // 工具结果
  | { type: 'message_complete'; message: any }     // 消息完成
  | { type: 'error'; error: Error }                // 错误事件
  // ... 更多事件类型
```

**事件通道：**

```typescript
{
  channel: 'chat' | 'monitor' | 'control',
  event: AgentEvent,
  bookmark: { seq: number; timestamp: number }
}
```

### 4. 内置工具（builtin tools）

**文件系统工具：**
- `fs_read`: 读取文件
- `fs_write`: 写入文件
- `fs_edit`: 编辑文件（搜索替换）
- `fs_glob`: 文件模式匹配
- `fs_grep`: 文件内容搜索
- `fs_multi_edit`: 批量编辑

**Bash 工具：**
- `bash_run`: 执行命令
- `bash_logs`: 查看日志
- `bash_kill`: 终止进程

**Todo 工具：**
- `todo_read`: 读取任务列表
- `todo_write`: 更新任务列表

### 5. 自定义工具

**函数式定义：**

```typescript
import { defineTool } from 'kode-sdk';

const weatherTool = defineTool({
  name: 'get_weather',
  description: '获取天气信息',
  parameters: {
    location: { type: 'string', description: '城市名称' },
    unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
  },
  handler: async (params, context) => {
    // 实现天气查询逻辑
    return { temperature: 25, condition: 'sunny' };
  }
});

tools.register('get_weather', () => weatherTool);
```

**类式定义（ToolKit）：**

```typescript
import { ToolKit, toolMethod } from 'kode-sdk';

class WeatherToolKit extends ToolKit {
  @toolMethod({
    description: '获取天气信息',
    params: { location: 'string', unit: 'string?' }
  })
  async getWeather(location: string, unit?: string) {
    // 实现逻辑
    return { temperature: 25 };
  }
}
```

### 6. 存储系统

**JSONStore（文件存储）：**

```typescript
const store = new JSONStore('./.kode');
// 自动持久化 Agent 状态、对话历史
```

**支持的存储：**
- ✅ JSONStore: 本地 JSON 文件
- ✅ FileCheckpointer: 文件检查点
- ✅ RedisCheckpointer: Redis 存储
- ✅ MemoryCheckpointer: 内存存储

### 7. 沙箱系统

**LocalSandbox：**

```typescript
sandbox: {
  kind: 'local',
  workDir: './workspace',
  enforceBoundary: true  // 限制文件访问范围
}
```

**支持的操作：**
- 文件读写（受限于 workDir）
- 命令执行
- 环境隔离

### 8. 模型支持

**支持的 Provider：**

```typescript
// Anthropic Claude
const provider = new AnthropicProvider(apiKey, model, baseUrl);

// 智谱 GLM
const provider = new GLMProvider(apiKey, model, baseUrl);
```

**配置示例：**

```typescript
modelConfig: {
  provider: 'glm',
  model: 'glm-4.5-air',
  apiKey: process.env.GLM_API_KEY,
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4'
}
```

### 9. 多 Agent 协作

**AgentPool：**

```typescript
const pool = new AgentPool(deps);
const agentId = await pool.create(config);
await pool.send(agentId, '消息');
```

**Room（会议室）：**

```typescript
const room = new Room('room-id', deps);
await room.addAgent(agentId);
await room.broadcast('消息');
```

**Scheduler（定时任务）：**

```typescript
const scheduler = new Scheduler(deps);
await scheduler.schedule(agentId, {
  pattern: '0 9 * * *',  // cron 表达式
  message: '每日提醒'
});
```

### 10. 权限控制

**审批模式：**

```typescript
templates.register({
  id: 'assistant',
  permissions: {
    mode: 'approval',  // 需要人工审批
    allowedTools: ['fs_read', 'fs_write']
  }
});

// 监听审批请求
agent.events.on('control', (event) => {
  if (event.event.type === 'permission_required') {
    // 人工审批逻辑
    agent.approve(event.event.callId);
    // 或拒绝
    agent.reject(event.event.callId, '原因');
  }
});
```

### 11. Checkpoint（检查点）

**自动保存状态：**

```typescript
// 自动在关键点保存
- 每次消息后
- 每次工具调用后
- 可配置保存策略
```

**恢复 Agent：**

```typescript
const agent = await Agent.create(config, deps);
// 自动从最后的检查点恢复
```

### 12. 错误处理

**监听错误：**

```typescript
agent.events.on('monitor', (event) => {
  if (event.event.type === 'error') {
    console.error('Agent 错误:', event.event.detail);
  }
});
```

## Kode-SDK 的优势

### ✅ 强大的工具系统
- 内置文件系统、Bash、Todo 工具
- 灵活的自定义工具 API
- 工具注册和管理机制

### ✅ 企业级持久化
- WAL（Write-Ahead Logging）
- 自动状态恢复
- 多种存储后端

### ✅ 事件驱动架构
- 完整的事件系统
- 支持流式响应
- 灵活的订阅机制

### ✅ 多 Agent 协作
- AgentPool、Room、Scheduler
- 支持复杂的多 Agent 场景

### ✅ 沙箱隔离
- 安全的代码执行环境
- 文件访问控制

### ✅ 模型灵活性
- 支持多种 LLM Provider
- 易于扩展新模型

## Kode-SDK 与 ChatKit Server 的对比

| 特性 | Kode-SDK | ChatKit Server |
|------|----------|----------------|
| 协议 | 自定义事件协议 | ChatKit 协议 |
| 前端库 | 需要自定义 | @openai/chatkit-react |
| 工具系统 | ✅ 强大（文件/代码/bash） | ⚠️ 基础（需自定义） |
| 持久化 | ✅ 企业级 | ⚠️ 内存存储 |
| 流式响应 | ✅ 事件流 | ✅ SSE 流 |
| 客户端工具 | ❌ 不直接支持 | ✅ 原生支持 |
| 多 Agent | ✅ 原生支持 | ❌ 不支持 |
| 文件操作 | ✅ 完整支持 | ❌ 不支持 |
| 代码编辑 | ✅ 支持 | ❌ 不支持 |

## 关键差异和挑战

### ❌ 不兼容的部分

1. **协议不同**：
   - Kode-SDK: 自定义事件协议
   - ChatKit: ChatKit 协议（OpenAI 定义）

2. **客户端工具机制**：
   - Kode-SDK: 无原生客户端工具支持
   - ChatKit: 通过 `client_tool_call` 事件实现

3. **事件格式**：
   - Kode-SDK: `{ channel, event, bookmark }`
   - ChatKit: SSE 事件流格式

### ✅ 可以实现的部分

1. **流式响应**: Kode-SDK 的 `chatStream` 可以转换为 SSE
2. **工具调用**: Kode-SDK 工具系统更强大
3. **会话管理**: Kode-SDK 的持久化更可靠
4. **模型支持**: 都支持 GLM 等国产模型

## 结论

Kode-SDK 功能强大但协议不兼容。需要开发一个**适配层**，将 Kode-SDK 的事件协议转换为 ChatKit 协议，使前端无需修改即可使用 Kode-SDK 后端。

