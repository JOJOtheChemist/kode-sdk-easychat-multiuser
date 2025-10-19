# demo-server.ts 配置详解

## 📋 概述

`demo-server.ts` 是一个完整的生产级示例服务器，集成了：
- ✅ Agent 历史持久化（Resume or Create模式）
- ✅ Progress 事件流处理（done事件）
- ✅ 工具定义和注册
- ✅ SSE 流式响应
- ✅ 静态文件服务

本文档详细说明所有关键配置位置。

---

## 🎯 快速定位表

| 配置项 | 行号 | 代码位置 | 说明 |
|--------|------|---------|------|
| **工具定义** | 214-248 | `const calculatorTool = defineTool({...})` | 定义工具逻辑 |
| **工具注册** | 260 | `tools.register('calculator', ...)` | 注册到SDK |
| **工具列表** | 292 | `tools: ['calculator']` | Agent可用工具 |
| **Agent ID** | 256 | `const AGENT_ID = 'demo-agent-persistent'` | 固定ID持久化 |
| **系统提示** | 263-291 | `systemPrompt: '...'` | Agent行为定义 |
| **模型配置** | 293 | `model: 'glm-4.5-air'` | 使用的LLM |
| **端口配置** | 322 | `const PORT = 2500` | 服务器端口 |
| **启动服务器** | 324 | `app.listen(PORT, ...)` | Express启动 |

---

## 1️⃣ 工具配置详解

### 位置：第 214-248 行

#### 定义工具

```typescript
// demo-server.ts:214-248
const calculatorTool = defineTool({
  // 工具名称（必须唯一）
  name: 'calculator',
  
  // 工具描述（LLM根据这个决定何时使用）
  description: '执行数学计算，支持加减乘除',
  
  // 参数定义
  params: {
    operation: {
      type: 'string',
      enum: ['add', 'subtract', 'multiply', 'divide'],
      description: '运算类型: add(加), subtract(减), multiply(乘), divide(除)',
    },
    a: { type: 'number', description: '第一个数字' },
    b: { type: 'number', description: '第二个数字' },
  },
  
  // 工具属性
  attributes: { 
    readonly: true,    // 只读操作
    noEffect: true     // 无副作用
  },
  
  // 执行逻辑
  async exec(args: { operation: string; a: number; b: number }) {
    console.log(`[工具] calculator(${args.operation}, ${args.a}, ${args.b})`);
    
    // 业务逻辑
    let result: number;
    switch (args.operation) {
      case 'add': result = args.a + args.b; break;
      case 'subtract': result = args.a - args.b; break;
      case 'multiply': result = args.a * args.b; break;
      case 'divide':
        if (args.b === 0) return { ok: false, error: '除数不能为0' };
        result = args.a / args.b;
        break;
      default:
        return { ok: false, error: `不支持的运算: ${args.operation}` };
    }
    
    // 返回结果（会自动传递给LLM）
    return { 
      ok: true, 
      operation: args.operation, 
      operands: { a: args.a, b: args.b }, 
      result 
    };
  }
});
```

#### 注册工具到SDK

```typescript
// demo-server.ts:260
const deps = createRuntime(({ templates, tools }) => {
  // 注册工具
  tools.register('calculator', () => calculatorTool);
  // 可以注册多个工具
  // tools.register('weather', () => weatherTool);
  // tools.register('database', () => dbTool);
});
```

#### 配置Agent可用工具

```typescript
// demo-server.ts:261-294
templates.register({
  id: 'calculator-demo',
  systemPrompt: `你是一个专业的数学计算助手...`,
  
  // 指定这个Agent可以使用哪些工具
  tools: ['calculator'],  // ← 工具名称数组
  
  model: process.env.ANTHROPIC_MODEL_ID || 'glm-4.5-air',
});
```

---

## 2️⃣ Agent 配置详解

### Agent ID 配置（历史持久化关键）

```typescript
// demo-server.ts:256
const AGENT_ID = 'demo-agent-persistent';  // ← 固定ID，不会随机生成

// 检查Store中是否存在
const exists = await deps.store.exists(AGENT_ID);

if (exists) {
  // 恢复历史对话
  globalAgent = await Agent.resumeFromStore(AGENT_ID, deps);
} else {
  // 首次创建
  globalAgent = await Agent.create({
    agentId: AGENT_ID,  // ← 指定固定ID
    templateId: 'calculator-demo',
    sandbox: { kind: 'local', workDir: './workspace' },
  }, deps);
}
```

**为什么重要？**
- ✅ 固定ID确保重启服务器后能恢复历史
- ✅ Store路径：`.kode/demo-agent-persistent/`
- ❌ 如果不指定，每次重启生成新ID，历史丢失

### 系统提示配置

```typescript
// demo-server.ts:263-291
systemPrompt: `你是一个专业的数学计算助手。

【核心规则】
1. 绝对不能心算，任何数学计算都必须使用 calculator 工具
2. 工具返回结果后，可以继续进行下一步计算
3. 支持多步骤复杂计算：先分解问题，然后逐步调用工具
4. 每次工具调用都会获得结果，基于结果继续下一步

【工作流程】
1. 分析用户的计算需求
2. 分解成多个基础运算步骤
3. 依次调用 calculator 工具
4. 基于工具结果继续计算或给出最终答案

【多步计算示例】
用户："计算 (5+3)×2-4"
步骤：
- 第1步：calculator(add, 5, 3) → 得到 8
- 第2步：calculator(multiply, 8, 2) → 得到 16  
- 第3步：calculator(subtract, 16, 4) → 得到 12
- 回答："(5+3)×2-4 = 12"

记住：你是计算工具的指挥官，不是计算器本身！`
```

---

## 3️⃣ 服务器配置详解

### 端口配置

```typescript
// demo-server.ts:322
const PORT = process.env.PORT || 2500;
```

**修改方式：**

**方法1：代码直接修改**
```typescript
const PORT = 3000;  // 固定端口
```

**方法2：环境变量**
```bash
# 启动时指定
PORT=3000 npx ts-node demo-server.ts

# 或在 .env 文件
PORT=3000
```

**方法3：使用配置文件**
```typescript
import config from './config.json';
const PORT = config.port || 2500;
```

### 启动服务器

```typescript
// demo-server.ts:324-333
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('  多步工具调用演示服务器');
  console.log('='.repeat(60));
  console.log(`\n✓ 服务器启动成功: http://localhost:${PORT}`);
  console.log(`✓ API Key: ${process.env.ANTHROPIC_API_KEY ? '已配置' : '⚠️  未配置'}`);
  console.log(`✓ 模型: ${process.env.ANTHROPIC_MODEL_ID || 'glm-4.5-air'}`);
  console.log('\n打开浏览器访问: http://localhost:' + PORT);
  console.log('='.repeat(60) + '\n');
});
```

---

## 4️⃣ API 路由配置

### 健康检查端点

```typescript
// demo-server.ts:26-32
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    model: process.env.ANTHROPIC_MODEL_ID || 'glm-4.5-air',
    apiKey: process.env.ANTHROPIC_API_KEY ? '已配置' : '未配置',
  });
});
```

### 聊天端点（SSE流式）

```typescript
// demo-server.ts:35-209
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  
  // 设置SSE响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // 获取Agent
  const agent = await getOrCreateAgent();
  
  // 订阅Progress事件流
  for await (const envelope of agent.subscribe(['progress'])) {
    const event = envelope.event;
    
    switch (event.type) {
      case 'text_chunk':
        sendEvent('text', { delta: event.delta });
        break;
      
      case 'tool:start':
        sendEvent('tool_start', { name: event.call.name, ... });
        break;
      
      case 'tool:end':
        sendEvent('tool_end', { name: event.call.name, ... });
        break;
      
      case 'done':
        // ⭐ 任务完成信号
        sendEvent('complete', { reason: event.reason, ... });
        res.end();
        return;
    }
  }
});
```

### 静态文件服务

```typescript
// demo-server.ts:212
app.use(express.static('public'));
```

这行代码提供：
- `http://localhost:2500/` → `public/index.html`
- `http://localhost:2500/style.css` → `public/style.css`
- 等等...

---

## 5️⃣ 模型配置

### 当前配置

```typescript
// demo-server.ts:293
model: process.env.ANTHROPIC_MODEL_ID || 'glm-4.5-air'
```

### 支持的模型

| 模型 | 环境变量值 | 说明 |
|------|-----------|------|
| GLM-4.5-air | `glm-4.5-air` | 轻量快速（默认） |
### 修改模型

**方法1：环境变量**
```bash
export ANTHROPIC_MODEL_ID="glm-4-plus"
npx ts-node demo-server.ts
```

**方法2：代码修改**
```typescript
model: 'glm-4-plus'  // 直接指定
```

---

## 6️⃣ 完整配置流程图

```
┌─────────────────────────────────────────────────────┐
│  1. 定义工具 (第214-248行)                            │
│     const calculatorTool = defineTool({             │
│       name: 'calculator',                           │
│       description: '...',                           │
│       params: { ... },                              │
│       async exec(args) { ... }                      │
│     })                                              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  2. 创建Runtime并注册工具 (第259-260行)              │
│     const deps = createRuntime(({ templates, tools }) => {│
│       tools.register('calculator', () => calculatorTool)  │
│     })                                              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  3. 配置Agent模板 (第261-294行)                       │
│     templates.register({                            │
│       id: 'calculator-demo',                        │
│       systemPrompt: '...',                          │
│       tools: ['calculator'],  ← 指定可用工具         │
│       model: 'glm-4.5-air'                          │
│     })                                              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  4. Resume or Create Agent (第298-316行)            │
│     const exists = await deps.store.exists(AGENT_ID)│
│     if (exists) {                                   │
│       agent = await Agent.resumeFromStore(...)  ← 恢复│
│     } else {                                        │
│       agent = await Agent.create({              ← 创建│
│         agentId: AGENT_ID,  ← 固定ID               │
│         templateId: 'calculator-demo',              │
│       })                                            │
│     }                                               │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  5. 配置Express路由 (第26-212行)                      │
│     app.get('/api/health', ...)                     │
│     app.post('/api/chat', ...)                      │
│     app.use(express.static('public'))               │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  6. 启动服务器 (第322-333行)                          │
│     const PORT = 2500                               │
│     app.listen(PORT, () => { ... })                 │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ 常见修改场景

### 场景1：添加新工具

```typescript
// 1. 定义工具 (在第214行附近)
const weatherTool = defineTool({
  name: 'get_weather',
  description: '获取指定城市的天气信息',
  params: {
    city: { type: 'string', description: '城市名称' }
  },
  async exec(args: { city: string }) {
    // 模拟天气API调用
    const weatherData = {
      '北京': { temp: 18, condition: '晴' },
      '上海': { temp: 22, condition: '多云' },
    };
    return weatherData[args.city] || { temp: 20, condition: '未知' };
  }
});

// 2. 注册工具 (修改第260行)
const deps = createRuntime(({ templates, tools }) => {
  tools.register('calculator', () => calculatorTool);
  tools.register('weather', () => weatherTool);  // ← 添加
});

// 3. 添加到模板 (修改第292行)
templates.register({
  id: 'calculator-demo',
  tools: ['calculator', 'weather'],  // ← 添加 'weather'
  systemPrompt: `你是一个助手，可以进行计算和查询天气...`,
});
```

### 场景2：修改端口

```typescript
// 方案A: 直接修改代码 (第322行)
const PORT = 3000;

// 方案B: 使用环境变量
PORT=3000 npx ts-node demo-server.ts

// 方案C: .env 文件
echo "PORT=3000" >> .env
npx ts-node demo-server.ts
```

### 场景3：修改Agent行为

```typescript
// 修改第263-291行的systemPrompt
systemPrompt: `你是一个友好的助手。

【你的能力】
- 数学计算（使用 calculator 工具）
- 天气查询（使用 weather 工具）

【你的风格】
- 友好、耐心
- 解释清楚每一步
- 用表情符号增加亲和力 😊

【重要规则】
- 必须使用工具，不能心算
- 回复要简洁明了
`
```

### 场景4：更换模型

```typescript
// 第293行
model: 'glm-4-plus'  // 使用GLM-4-Plus

// 或使用环境变量
export ANTHROPIC_MODEL_ID="claude-sonnet-4.5-20250929"
```

### 场景5：添加新API端点

```typescript
// 在第212行之前添加
app.get('/api/status', async (req, res) => {
  const agent = await getOrCreateAgent();
  const status = await agent.status();
  res.json({
    agentId: agent.agentId,
    state: status.state,
    stepCount: status.stepCount,
    messageCount: status.lastSfpIndex + 1,
  });
});
```

---

## 📝 环境变量配置

创建 `.env` 文件：

```bash
# 模型配置
ANTHROPIC_MODEL_ID=glm-4.5-air
ANTHROPIC_API_KEY=your-api-key-here

# 服务器配置
PORT=2500

# GLM配置（如果使用智谱AI）
GLM_API_KEY=your-glm-api-key
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

---

## 🔍 调试技巧

### 查看Agent状态

```typescript
const status = await agent.status();
console.log({
  agentId: agent.agentId,
  state: status.state,           // READY/WORKING/PAUSED
  stepCount: status.stepCount,   // 已执行步数
  messageCount: status.lastSfpIndex + 1,
  lastBookmark: status.lastBookmark,
});
```

### 查看消息历史

```typescript
const messages = (agent as any).messages;
console.log('消息历史:', JSON.stringify(messages, null, 2));
```

### 查看Store数据

```bash
# 查看Agent目录
ls -la .kode/demo-agent-persistent/

# 查看消息历史
cat .kode/demo-agent-persistent/messages.jsonl | jq .

# 查看元数据
cat .kode/demo-agent-persistent/metadata.json | jq .
```

### 启用详细日志

```typescript
// 在 createRuntime 之前
process.env.DEBUG = 'kode:*';
```

---

## 🚀 快速启动命令

```bash
# 开发模式（自动重启）
npx nodemon --exec "npx ts-node demo-server.ts"

# 生产模式
npx ts-node demo-server.ts

# 指定端口
PORT=3000 npx ts-node demo-server.ts

# 后台运行
nohup npx ts-node demo-server.ts > server.log 2>&1 &

# 停止服务
pkill -f "demo-server.ts"
```

---

## 📚 相关文档

- [03-Progress事件流与历史持久化完整指南.md](./03-Progress事件流与历史持久化完整指南.md)
- [03-快速问题排查手册.md](./03-快速问题排查手册.md)
- [02-工具调用完成后自动继续处理-重大Bug修复.md](./02工具调用完成后自动继续处理-重大Bug修复.md)
- [API调用速查表.md](./API调用速查表.md)

---

## 💡 最佳实践

1. ✅ **使用固定Agent ID**
   ```typescript
   const AGENT_ID = 'my-app-agent-v1';  // 固定ID
   ```

2. ✅ **实现Resume or Create模式**
   ```typescript
   const exists = await deps.store.exists(AGENT_ID);
   const agent = exists 
     ? await Agent.resumeFromStore(AGENT_ID, deps)
     : await Agent.create({ agentId: AGENT_ID, ... }, deps);
   ```

3. ✅ **正确处理done事件**
   ```typescript
   if (event.type === 'done') {
     res.end();
     return;  // 必须return结束循环
   }
   ```

4. ✅ **使用环境变量管理配置**
   ```typescript
   const PORT = process.env.PORT || 2500;
   const MODEL = process.env.ANTHROPIC_MODEL_ID || 'glm-4.5-air';
   ```

5. ✅ **添加错误处理**
   ```typescript
   try {
     // 业务逻辑
   } catch (error) {
     console.error('Error:', error);
     res.status(500).json({ error: error.message });
   }
   ```

---

**文档版本**: v1.0  
**最后更新**: 2024-10-16  
**适用于**: demo-server.ts (Kode-SDK v2.7+)

