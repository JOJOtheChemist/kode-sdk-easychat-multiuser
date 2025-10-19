# Progress事件流与历史持久化完整指南

## 📋 问题背景

在实际使用 Kode-SDK 时遇到三个核心问题：

1. **任务完成判断**：如何知道 Agent 完成了任务？
2. **历史记忆丢失**：重启服务器后，Agent 不记得之前的对话
3. **前后端连接失败**：端口配置不匹配导致无法通信

本文档详细记录了问题分析和完整解决方案。

---

## 🔍 问题1：done事件 vs tool:end - 任务完成的关键信号

### 问题现象

```
用户发送消息 → 工具执行 → tool:end触发 → 然后呢？❓
```

很多人误以为 `tool:end` 就代表任务完成，实际上**这是错误的**！

### 核心概念区分

| 事件类型 | 通道 | 含义 | 触发时机 |
|---------|------|------|---------|
| `tool:start` | Progress | 单个工具开始执行 | 工具调用前 |
| `tool:end` | Progress | 单个工具执行完成 | 工具返回结果后 |
| `tool_executed` | Monitor | 工具执行完成（审计） | 工具执行后（事后记录） |
| **`done`** | **Progress** | **整个任务轮次完成** | **所有处理结束** |

### 关键理解

```typescript
// 一个完整的任务轮次可能包含：
[text_chunk_start]
[text_chunk] "我来帮你计算..."
[text_chunk_end]
[tool:start] calculator(add, 10, 20)
[tool:end]   → 结果: 30
[text_chunk_start]
[text_chunk] "计算结果是 30"
[text_chunk_end]
[done] ← ⭐ 只有这里才表示任务真正完成！
```

### 错误示例（03-room-collab.ts）

```typescript
// ❌ 只监听 Monitor 通道
agent.on('tool_executed', (event) => {
  console.log(`工具执行完成: ${event.call.name}`);
  // 问题：工具完成 ≠ 任务完成
  // 缺少 done 事件，无法知道任务何时结束
});
```

### 正确示例（demo-server.ts）

```typescript
// ✅ 监听 Progress 通道
for await (const envelope of agent.subscribe(['progress'])) {
  const event = envelope.event;
  
  switch (event.type) {
    case 'tool:start':
      console.log(`🔧 工具开始: ${event.call.name}`);
      break;
      
    case 'tool:end':
      console.log(`✅ 工具完成: ${event.call.name}`);
      // 注意：这里不能结束！可能还有其他工具或文本
      break;
      
    case 'done':
      console.log(`🎉 任务完成: ${event.reason}`);
      res.end();  // ← 只有这里才能结束响应
      return;
  }
}
```

### 实测验证

运行测试：
```bash
npx tsx examples/03-test-event-differences.ts
```

结果：
```
Progress 通道:
  ├─ tool:start: 3 次   (3个工具调用)
  ├─ tool:end: 3 次     (3个工具完成)
  └─ done: 1 次 ⭐      (整个任务完成)

结论：tool:end 触发了 3 次，done 只触发 1 次
     必须等到 done 事件，才能确认任务真正完成！
```

---

## 🔍 问题2：Agent历史记忆丢失

### 问题现象

```
第一轮对话:
  用户: "我是小美，帮我计算 10+20"
  Agent: "你好小美！结果是 30"

[重启服务器]

第二轮对话:
  用户: "我是谁？"
  Agent: "我不知道你是谁" ❌  ← 忘记了"小美"！
```

### 根本原因

#### 问题代码（demo-server.ts 修复前）

```typescript
// ❌ 每次创建时没有指定 agentId
globalAgent = await Agent.create({
  templateId: 'calculator-demo',
  // agentId 缺失！会生成随机ID
  sandbox: { kind: 'local', workDir: './workspace' },
}, deps);
```

#### Agent ID 生成机制

```typescript
// src/core/agent.ts 第307-310行
static async create(config: AgentConfig, deps: AgentDependencies) {
  if (!config.agentId) {
    // ❌ 生成随机ID：agt:01K7P18T4BDP7FBJ1B9YCZG4TW
    config.agentId = Agent.generateAgentId();
  }
  // ...
}
```

#### 后果链条

```
1. 第一次启动 → agentId = agt:01K7P18T4BDP...
   对话保存到 .kode/agt:01K7P18T4BDP.../

2. 重启服务器 → agentId = agt:01K7P1ERT9XG... (新ID！)
   从 .kode/agt:01K7P1ERT9XG.../ 加载（空的！）

3. 旧对话在 agt:01K7P18T4BDP.../
   新Agent找不到 → 历史丢失！
```

### 解决方案：固定ID + Resume模式

#### 第一步：固定 Agent ID

```typescript
const AGENT_ID = 'demo-agent-persistent';  // ← 固定ID，不再随机

globalAgent = await Agent.create({
  agentId: AGENT_ID,  // ← 指定固定ID
  templateId: 'calculator-demo',
  sandbox: { kind: 'local', workDir: './workspace' },
}, deps);
```

#### 第二步：Resume or Create 模式

```typescript
async function getOrCreateAgent() {
  if (!globalAgent) {
    const AGENT_ID = 'demo-agent-persistent';
    const deps = createRuntime(/* ... */);
    
    // ✅ 检查Store中是否已存在
    const exists = await deps.store.exists(AGENT_ID);
    
    if (exists) {
      // 📂 恢复历史对话
      console.log(`恢复Agent: ${AGENT_ID}`);
      globalAgent = await Agent.resumeFromStore(AGENT_ID, deps);
      console.log(`消息历史已加载`);
    } else {
      // 🆕 首次创建
      console.log(`创建新Agent: ${AGENT_ID}`);
      globalAgent = await Agent.create({
        agentId: AGENT_ID,
        templateId: 'calculator-demo',
        sandbox: { kind: 'local', workDir: './workspace' },
      }, deps);
    }
  }
  return globalAgent;
}
```

### Store 数据结构

```
.kode/
├── demo-agent-persistent/          ← ✅ 固定ID目录
│   ├── checkpoint.json             ← 最新状态快照
│   ├── messages.jsonl              ← 消息历史（追加式）
│   ├── metadata.json               ← Agent元数据
│   └── wal/                        ← Write-Ahead Log
│
├── agt:01K7P18T4BDP.../            ← ❌ 旧的随机ID（已废弃）
├── agt:01K7P1ERT9XG.../            ← ❌ 旧的随机ID（已废弃）
└── ...
```

### 实测验证

#### 第一次对话
```bash
curl -X POST http://localhost:2500/api/chat \
  -d '{"message":"我是小美，请记住我"}'
  
# 输出：你好小美！我已经记住你的名字了
# Store: 保存到 .kode/demo-agent-persistent/
```

#### 重启服务器
```bash
pkill -f demo-server && npx ts-node demo-server.ts

# 日志：
# [初始化] 获取或创建 Agent...
# 📂 [恢复] 从Store恢复Agent: demo-agent-persistent
# ✅ [恢复] Agent恢复成功，消息历史已加载
```

#### 第二次对话（重启后）
```bash
curl -X POST http://localhost:2500/api/chat \
  -d '{"message":"我是谁？"}'
  
# 输出：你是小美！我记得你告诉过我你的名字
# ✅ 成功恢复历史！
```

---

## 🔍 问题3：前后端端口配置不匹配

### 问题现象

浏览器控制台错误：
```
[Error] Failed to load resource: 无法连接服务器 (health, line 0)
[Error] Fetch API cannot load http://localhost:1500/api/chat 
        due to access control checks.
```

### 问题分析

```
前端配置:  http://localhost:1500  ← public/index.html
后端运行:  http://localhost:2500  ← demo-server.ts

结果: 端口不匹配，连接失败！
```

### 查看配置

```bash
# 1. 查看前端配置
grep "localhost:" public/index.html
# 输出：http://localhost:1500/api/health
#       http://localhost:1500/api/chat

# 2. 查看后端端口
grep "PORT" demo-server.ts
# 输出：const PORT = process.env.PORT || 2500;

# 3. 检查实际运行端口
ps aux | grep demo-server
curl http://localhost:2500/api/health  # ✅ 成功
curl http://localhost:1500/api/health  # ❌ 失败
```

### 解决方案

#### 方案A：修改前端配置（推荐，快速）

```typescript
// public/index.html

// ❌ 修复前
const response = await fetch('http://localhost:1500/api/health');

// ✅ 修复后
const response = await fetch('http://localhost:2500/api/health');
```

#### 方案B：启动1500端口服务器

```bash
# 需要先修复 server/index.ts 的编译错误
npx ts-node server/index.ts  # 端口1500
```

### 服务架构图

```
┌─────────────────────────────────────────┐
│          浏览器访问                       │
│     http://localhost:2500               │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│         前端静态服务                      │
│    public/index.html (端口2500)         │
└─────────────────────────────────────────┘
                   ↓
         JavaScript Fetch API
                   ↓
┌─────────────────────────────────────────┐
│           后端API服务                    │
│    demo-server.ts (端口2500)            │
│    - POST /api/chat  (SSE流式)          │
│    - GET  /api/health                   │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│            Kode Agent                   │
│  agentId: demo-agent-persistent         │
│  - 消息队列                              │
│  - Progress事件流                        │
│  - Store持久化                           │
└─────────────────────────────────────────┐
                   ↓
┌─────────────────────────────────────────┐
│           GLM-4.5-air                   │
│    智谱AI大语言模型                       │
└─────────────────────────────────────────┘
```

---

## 📚 完整工作流程

### 1. 首次启动（创建Agent）

```typescript
// demo-server.ts 启动
const AGENT_ID = 'demo-agent-persistent';

// 检查Store
const exists = await deps.store.exists(AGENT_ID);  // false

// 创建新Agent
globalAgent = await Agent.create({
  agentId: AGENT_ID,  // 固定ID
  templateId: 'calculator-demo',
  sandbox: { kind: 'local', workDir: './workspace' },
}, deps);

// 保存到 .kode/demo-agent-persistent/
```

### 2. 第一次对话

```typescript
// 用户发送消息
await agent.send("我是小美，计算 10+20");

// Progress事件流
[text_chunk_start]
[text_chunk] "你好小美！我来帮你计算..."
[text_chunk_end]
[tool:start] calculator(add, 10, 20)
[tool_executed] ← Monitor通道（审计）
[tool:end]   result: 30
[text_chunk_start]
[text_chunk] "计算结果是 30"
[text_chunk_end]
[done] reason: completed, step: 1 ← ⭐ 任务完成信号

// Store自动保存
messages.jsonl ← 追加消息记录
checkpoint.json ← 更新状态快照
```

### 3. 重启服务器

```bash
pkill -f demo-server
npx ts-node demo-server.ts

# 日志输出：
# [初始化] 获取或创建 Agent...
# 📂 [恢复] 从Store恢复Agent: demo-agent-persistent
# ✅ [恢复] Agent恢复成功，消息历史已加载
```

### 4. 第二次对话（恢复历史）

```typescript
// Agent已从Store恢复，包含历史：
// messages[0]: user: "我是小美，计算 10+20"
// messages[1]: assistant: "你好小美！结果是30"
// messages[2]: user: tool_result

// 新消息
await agent.send("我是谁？");

// Agent上下文包含完整历史
// → 模型能够回答："你是小美"
```

---

## 🎯 最佳实践总结

### ✅ 必须做的

1. **监听Progress通道的done事件**
   ```typescript
   for await (const envelope of agent.subscribe(['progress'])) {
     if (envelope.event.type === 'done') {
       // 任务完成处理
       res.end();
       break;
     }
   }
   ```

2. **使用固定的Agent ID**
   ```typescript
   const AGENT_ID = 'my-app-agent-v1';
   await Agent.create({ agentId: AGENT_ID, ... }, deps);
   ```

3. **实现Resume or Create模式**
   ```typescript
   const exists = await deps.store.exists(AGENT_ID);
   const agent = exists 
     ? await Agent.resumeFromStore(AGENT_ID, deps)
     : await Agent.create({ agentId: AGENT_ID, ... }, deps);
   ```

4. **前后端端口配置一致**
   ```typescript
   // 前端: fetch('http://localhost:2500/api/chat')
   // 后端: app.listen(2500)
   ```

### ❌ 避免的错误

1. **不要用tool:end判断任务完成**
   ```typescript
   // ❌ 错误
   if (event.type === 'tool:end') {
     res.end(); // 可能还有其他工具或文本！
   }
   
   // ✅ 正确
   if (event.type === 'done') {
     res.end();
   }
   ```

2. **不要依赖随机Agent ID**
   ```typescript
   // ❌ 错误
   await Agent.create({
     // agentId 缺失，每次重启生成新ID
     templateId: 'my-template',
   }, deps);
   
   // ✅ 正确
   await Agent.create({
     agentId: 'fixed-agent-id',  // 固定ID
     templateId: 'my-template',
   }, deps);
   ```

3. **不要只监听Monitor通道**
   ```typescript
   // ❌ 错误 - 无法知道任务何时完成
   agent.on('tool_executed', handler);
   
   // ✅ 正确 - 监听Progress通道
   for await (const envelope of agent.subscribe(['progress'])) {
     // 处理所有Progress事件
   }
   ```

---

## 🧪 测试验证清单

### 1. done事件测试
```bash
# 运行测试
npx tsx examples/03-test-event-differences.ts

# 验证点
✓ tool:end 触发次数 > 0
✓ done 触发次数 = 1
✓ done 是最后一个事件
```

### 2. 历史持久化测试
```bash
# Step 1: 第一次对话
curl -X POST http://localhost:2500/api/chat \
  -d '{"message":"我是小明"}'

# Step 2: 重启服务器
pkill -f demo-server && npx ts-node demo-server.ts

# Step 3: 验证记忆
curl -X POST http://localhost:2500/api/chat \
  -d '{"message":"我是谁？"}'

# 验证点
✓ 响应包含 "小明"
✓ .kode/demo-agent-persistent/ 存在
✓ 日志显示 "恢复Agent"
```

### 3. 端口配置测试
```bash
# 检查前端配置
grep "localhost:" public/index.html

# 检查后端端口
curl http://localhost:2500/api/health

# 验证点
✓ 前端URL端口 = 后端监听端口
✓ health检查返回成功
```

---

## 📁 相关文件清单

### 核心文件

| 文件 | 作用 | 关键内容 |
|------|------|---------|
| `demo-server.ts` | 主后端服务器 | ✅ Progress事件流监听<br>✅ Resume or Create模式<br>✅ done事件处理 |
| `public/index.html` | 前端界面 | ✅ SSE事件流接收<br>✅ 端口配置（2500） |
| `src/core/agent.ts` | Agent核心逻辑 | ✅ generateAgentId()<br>✅ resumeFromStore()<br>✅ done事件发送 |
| `server/events/event-stream-manager.ts` | 事件流管理器 | ✅ Progress订阅<br>✅ done事件处理 |

### 测试文件

| 文件 | 用途 |
|------|------|
| `examples/03-test-event-differences.ts` | 验证 done vs tool:end |
| `examples/03-room-collab-enhanced.ts` | Progress事件完整示例 |
| `examples/test-tool-continue.ts` | 多轮工具调用测试 |

### 文档

| 文件 | 内容 |
|------|------|
| `docs/events.md` | 事件系统完整文档 |
| `学习笔记/02工具调用完成后自动继续处理-重大Bug修复.md` | setImmediate bug修复 |
| `学习笔记/多用户架构说明.md` | Resume or Create模式 |

---

## 🚀 快速启动指南

### 1. 环境准备
```bash
cd /Users/yeya/FlutterProjects/kode-sdk/kode-sdk

# 检查环境变量
cat .env | grep -E "(API_KEY|MODEL)"
```

### 2. 启动后端
```bash
# 使用demo-server（推荐）
npx ts-node demo-server.ts

# 或使用正式服务器
npx ts-node server/index.ts
```

### 3. 访问前端
```
打开浏览器: http://localhost:2500
```

### 4. 测试对话
```
消息1: "我是小美，请记住我"
→ 响应: "你好小美！我已经记住你的名字了"

[重启服务器]

消息2: "我是谁？"
→ 响应: "你是小美！" ✅
```

---

## 💡 调试技巧

### 查看Agent状态
```typescript
const status = await agent.status();
console.log({
  state: status.state,           // READY/WORKING/PAUSED
  stepCount: status.stepCount,   // 已执行步数
  messageCount: status.lastSfpIndex + 1,  // 消息数量
  breakpoint: status.breakpoint,  // 当前断点
});
```

### 查看消息历史
```typescript
const messages = (agent as any).messages;
console.log('消息历史:', messages);
```

### 查看Store内容
```bash
# 查看所有Agent
ls -la .kode/

# 查看特定Agent的消息
cat .kode/demo-agent-persistent/messages.jsonl | jq .

# 查看元数据
cat .kode/demo-agent-persistent/metadata.json | jq .
```

### 监控事件流
```typescript
// 同时监听三个通道
for await (const envelope of agent.subscribe(['progress', 'control', 'monitor'])) {
  console.log(`[${envelope.event.channel}] ${envelope.event.type}`, envelope.event);
}
```

---

## 🎉 成功标准

当你看到以下现象时，说明配置正确：

1. ✅ **done事件正常触发**
   - 每次对话结束都能收到 `done` 事件
   - SSE流正常关闭
   - 前端显示"完成"状态

2. ✅ **历史记忆保持**
   - 重启服务器后仍记得之前的对话
   - `.kode/demo-agent-persistent/` 目录存在
   - 启动日志显示 "恢复Agent"

3. ✅ **前后端通信正常**
   - 浏览器无CORS错误
   - health检查显示模型名称
   - 消息能正常发送和接收

4. ✅ **工具调用正常**
   - 工具执行结果返回给模型
   - 基于工具结果生成最终回复
   - 支持多步骤工具调用

---

**日期**: 2024-10-16  
**验证环境**: Kode-SDK v2.7+, GLM-4.5-air  
**核心发现**: done事件是任务完成的唯一可靠信号，固定Agent ID是历史持久化的关键

