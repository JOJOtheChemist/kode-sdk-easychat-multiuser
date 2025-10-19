# API 层设计方案

## 1. 整体架构

### 1.1 架构图

```
┌──────────────────────────────────────────────────┐
│              Frontend (React/Vue)                 │
│  - HTTP Client (发送消息、管理会话)                │
│  - EventSource/WebSocket (接收事件流)             │
└──────────────────────────────────────────────────┘
                       ↓ ↑
              HTTP / SSE / WebSocket
                       ↓ ↑
┌──────────────────────────────────────────────────┐
│              API Gateway / Adapter                │
│  - 路由管理                                        │
│  - 身份认证                                        │
│  - 会话管理                                        │
│  - 事件转换                                        │
└──────────────────────────────────────────────────┘
                       ↓ ↑
┌──────────────────────────────────────────────────┐
│              Kode-SDK Agent Layer                 │
│  - Agent Pool                                     │
│  - Message Queue                                  │
│  - Event Bus                                      │
│  - Tool Registry                                  │
└──────────────────────────────────────────────────┘
```

### 1.2 技术选型

**推荐方案1: Express + SSE**
```typescript
// 优点: 简单、轻量、单向流
// 适用: 只读事件流、无需双向通信
import express from 'express';
import { Agent } from 'kode-sdk';
```

**推荐方案2: Socket.IO + WebSocket**
```typescript
// 优点: 双向通信、自动重连、房间管理
// 适用: 实时协作、复杂交互
import { Server } from 'socket.io';
import { Agent } from 'kode-sdk';
```

**推荐方案3: tRPC + SSE**
```typescript
// 优点: 类型安全、端到端、现代化
// 适用: TypeScript 全栈项目
import { initTRPC } from '@trpc/server';
```

## 2. RESTful API 设计

### 2.1 会话管理

#### POST /api/conversations
创建新会话

```typescript
// Request
{
  "templateId": "my-assistant",
  "config": {
    "sandbox": { "kind": "local", "workDir": "./workspace" },
    "tools": ["fs_read", "fs_write", "bash_run"]
  },
  "metadata": {
    "userId": "user123",
    "source": "web"
  }
}

// Response
{
  "conversationId": "conv_abc123",
  "agentId": "agt_xyz789",
  "templateId": "my-assistant",
  "createdAt": "2024-01-01T00:00:00Z",
  "status": "ready"
}
```

#### GET /api/conversations/:conversationId
获取会话信息

```typescript
// Response
{
  "conversationId": "conv_abc123",
  "agentId": "agt_xyz789",
  "templateId": "my-assistant",
  "state": "READY",           // READY | WORKING | PAUSED
  "stepCount": 5,
  "messageCount": 12,
  "lastActivity": "2024-01-01T00:10:00Z",
  "metadata": { ... }
}
```

#### DELETE /api/conversations/:conversationId
删除会话（可选：只是暂停，不删除数据）

```typescript
// Response
{
  "success": true,
  "message": "Conversation paused"
}
```

### 2.2 消息操作

#### POST /api/conversations/:conversationId/messages
发送用户消息

```typescript
// Request
{
  "content": "帮我读取 README.md",
  "attachments": [
    { "type": "image", "url": "https://..." },
    { "type": "file", "path": "/path/to/file" }
  ]
}

// Response（立即返回）
{
  "messageId": "msg_123",
  "status": "queued",
  "queuePosition": 1
}
```

#### GET /api/conversations/:conversationId/messages
获取消息历史

```typescript
// Query Parameters
{
  "limit": 50,
  "before": "msg_100",  // cursor-based pagination
  "after": "msg_50"
}

// Response
{
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": [
        { "type": "text", "text": "你好" }
      ],
      "timestamp": "2024-01-01T00:00:00Z"
    },
    {
      "id": "msg_2",
      "role": "assistant",
      "content": [
        { "type": "text", "text": "你好！我是AI助手" }
      ],
      "timestamp": "2024-01-01T00:00:05Z"
    }
  ],
  "hasMore": true,
  "nextCursor": "msg_51"
}
```

### 2.3 工具审批

#### GET /api/conversations/:conversationId/approvals
获取待审批的工具调用

```typescript
// Response
{
  "pending": [
    {
      "callId": "tool_abc",
      "toolName": "bash_run",
      "input": { "command": "rm -rf /tmp/*" },
      "requestedAt": "2024-01-01T00:05:00Z",
      "approval": {
        "required": true,
        "meta": { "risk": "high" }
      }
    }
  ]
}
```

#### POST /api/conversations/:conversationId/approvals/:callId
提交审批决策

```typescript
// Request
{
  "decision": "allow",  // "allow" | "deny"
  "note": "Reviewed and approved"
}

// Response
{
  "success": true,
  "callId": "tool_abc",
  "decision": "allow",
  "decidedBy": "user123",
  "decidedAt": "2024-01-01T00:05:30Z"
}
```

## 3. Server-Sent Events (SSE) 设计

### 3.1 事件流端点

#### GET /api/conversations/:conversationId/events
订阅事件流

```typescript
// Query Parameters
{
  "since": "42",           // bookmark.seq 或 cursor
  "channels": "progress,monitor",  // 可选，默认 "progress"
  "types": "text_chunk,tool:start,tool:end,done"  // 可选事件过滤
}

// Headers
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

// SSE Format
event: text_chunk
data: {"cursor":10,"bookmark":{"seq":10,"timestamp":1234567890},"event":{"channel":"progress","type":"text_chunk","step":1,"delta":"你好"}}

event: tool:start
data: {"cursor":15,"bookmark":{"seq":15,"timestamp":1234567895},"event":{"channel":"progress","type":"tool:start","call":{"id":"tool_1","name":"fs_read","state":"EXECUTING","inputPreview":{"path":"README.md"}}}}

event: tool:end
data: {"cursor":16,"bookmark":{"seq":16,"timestamp":1234567900},"event":{"channel":"progress","type":"tool:end","call":{"id":"tool_1","name":"fs_read","state":"COMPLETED","result":"# My Project...","durationMs":50}}}

event: done
data: {"cursor":20,"bookmark":{"seq":20,"timestamp":1234567910},"event":{"channel":"progress","type":"done","step":1,"reason":"completed"}}

event: error
data: {"error":"Internal server error","message":"..."}
```

### 3.2 Express 实现示例

```typescript
import express from 'express';
import { Agent } from 'kode-sdk';

app.get('/api/conversations/:conversationId/events', async (req, res) => {
  const { conversationId } = req.params;
  const { since, channels = 'progress', types } = req.query;
  
  // 设置 SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx
  res.flushHeaders();
  
  try {
    // 获取或恢复 Agent
    const agent = await getOrResumeAgent(conversationId);
    
    // 解析参数
    const bookmark = since ? { seq: Number(since), timestamp: Date.now() } : undefined;
    const channelList = channels.split(',') as any[];
    const typeList = types ? types.split(',') : undefined;
    
    // 订阅事件
    const iterator = agent.subscribe(channelList, { 
      since: bookmark,
      kinds: typeList 
    })[Symbol.asyncIterator]();
    
    // 流式推送
    for await (const envelope of { [Symbol.asyncIterator]: () => iterator }) {
      const { event } = envelope;
      
      // 发送 SSE 事件
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(envelope)}\n\n`);
      
      // 刷新缓冲区
      if ((res as any).flush) (res as any).flush();
      
      // 检查结束条件
      if (event.type === 'done') {
        res.end();
        break;
      }
    }
  } catch (error) {
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
  
  // 客户端断开连接时清理
  req.on('close', () => {
    iterator.return?.();
    console.log('SSE connection closed');
  });
});
```

### 3.3 前端 SSE 订阅示例

```typescript
// React Hook 示例
function useConversationEvents(conversationId: string, lastBookmark?: number) {
  const [events, setEvents] = useState<any[]>([]);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const params = new URLSearchParams({
      channels: 'progress,monitor',
      ...(lastBookmark && { since: String(lastBookmark) })
    });
    
    const eventSource = new EventSource(
      `/api/conversations/${conversationId}/events?${params}`
    );
    
    // 监听各类事件
    eventSource.addEventListener('text_chunk', (e) => {
      const envelope = JSON.parse(e.data);
      setEvents(prev => [...prev, envelope]);
    });
    
    eventSource.addEventListener('tool:start', (e) => {
      const envelope = JSON.parse(e.data);
      setEvents(prev => [...prev, envelope]);
    });
    
    eventSource.addEventListener('tool:end', (e) => {
      const envelope = JSON.parse(e.data);
      setEvents(prev => [...prev, envelope]);
    });
    
    eventSource.addEventListener('done', (e) => {
      const envelope = JSON.parse(e.data);
      setEvents(prev => [...prev, envelope]);
      eventSource.close();
    });
    
    eventSource.addEventListener('error', (e) => {
      const data = JSON.parse((e as any).data || '{}');
      setError(new Error(data.error || 'Unknown error'));
      eventSource.close();
    });
    
    eventSource.onerror = () => {
      setError(new Error('SSE connection failed'));
    };
    
    return () => {
      eventSource.close();
    };
  }, [conversationId, lastBookmark]);
  
  return { events, error };
}
```

## 4. WebSocket 设计

### 4.1 Socket.IO 实现

```typescript
import { Server } from 'socket.io';
import { Agent } from 'kode-sdk';

const io = new Server(httpServer, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  let currentAgent: Agent | null = null;
  let eventIterator: AsyncIterator<any> | null = null;
  let unsubscribers: Array<() => void> = [];
  
  // 加入会话房间
  socket.on('join', async ({ conversationId, since }) => {
    try {
      // 获取或恢复 Agent
      currentAgent = await getOrResumeAgent(conversationId);
      
      // 加入房间
      socket.join(conversationId);
      
      // 订阅 Progress 事件
      const bookmark = since ? { seq: since, timestamp: Date.now() } : undefined;
      eventIterator = currentAgent.subscribe(['progress', 'monitor'], { 
        since: bookmark 
      })[Symbol.asyncIterator]();
      
      // 推送事件
      (async () => {
        for await (const envelope of { [Symbol.asyncIterator]: () => eventIterator! }) {
          socket.emit('event', envelope);
          
          if (envelope.event.type === 'done') {
            break;
          }
        }
      })();
      
      // 监听 Control 事件（审批）
      const unsub1 = currentAgent.on('permission_required', (event) => {
        socket.emit('approval_required', {
          callId: event.call.id,
          toolName: event.call.name,
          input: event.call.inputPreview,
          approval: event.call.approval
        });
      });
      
      const unsub2 = currentAgent.on('permission_decided', (event) => {
        socket.emit('approval_decided', {
          callId: event.callId,
          decision: event.decision,
          decidedBy: event.decidedBy,
          note: event.note
        });
      });
      
      unsubscribers.push(unsub1, unsub2);
      
      socket.emit('joined', { 
        conversationId, 
        agentId: currentAgent.agentId,
        status: currentAgent.status()
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // 发送消息
  socket.on('send_message', async ({ conversationId, content }) => {
    if (!currentAgent) {
      socket.emit('error', { message: 'Not joined to any conversation' });
      return;
    }
    
    try {
      const messageId = await currentAgent.send(content);
      socket.emit('message_sent', { messageId });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // 审批决策
  socket.on('approve', async ({ callId, decision, note }) => {
    if (!currentAgent) {
      socket.emit('error', { message: 'Not joined to any conversation' });
      return;
    }
    
    try {
      await currentAgent.decide(callId, decision, { note });
      socket.emit('approval_submitted', { callId, decision });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // 中断执行
  socket.on('interrupt', async () => {
    if (!currentAgent) return;
    
    try {
      await currentAgent.interrupt();
      socket.emit('interrupted');
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // 离开会话
  socket.on('leave', () => {
    cleanup();
    socket.emit('left');
  });
  
  // 断开连接
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    cleanup();
  });
  
  function cleanup() {
    eventIterator?.return?.();
    unsubscribers.forEach(fn => fn());
    unsubscribers = [];
    currentAgent = null;
  }
});
```

### 4.2 前端 Socket.IO 客户端

```typescript
import { io } from 'socket.io-client';

class ConversationClient {
  private socket: Socket;
  
  constructor(conversationId: string, lastBookmark?: number) {
    this.socket = io('http://localhost:3000');
    
    this.socket.on('connect', () => {
      this.socket.emit('join', { conversationId, since: lastBookmark });
    });
    
    this.socket.on('joined', (data) => {
      console.log('Joined conversation:', data);
    });
    
    this.socket.on('event', (envelope) => {
      this.handleEvent(envelope);
    });
    
    this.socket.on('approval_required', (data) => {
      this.handleApprovalRequest(data);
    });
    
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }
  
  sendMessage(content: string) {
    this.socket.emit('send_message', { content });
  }
  
  approve(callId: string, decision: 'allow' | 'deny', note?: string) {
    this.socket.emit('approve', { callId, decision, note });
  }
  
  interrupt() {
    this.socket.emit('interrupt');
  }
  
  disconnect() {
    this.socket.emit('leave');
    this.socket.disconnect();
  }
  
  private handleEvent(envelope: any) {
    const { event } = envelope;
    
    switch (event.type) {
      case 'text_chunk':
        // 更新 UI
        break;
      case 'tool:start':
        // 显示工具执行
        break;
      case 'tool:end':
        // 显示工具结果
        break;
      case 'done':
        // 完成处理
        break;
    }
  }
  
  private handleApprovalRequest(data: any) {
    // 弹出审批 UI
    const approved = confirm(`Approve ${data.toolName}?`);
    this.approve(data.callId, approved ? 'allow' : 'deny');
  }
}
```

## 5. Agent 池管理

### 5.1 Agent Pool 实现

```typescript
import { Agent, AgentPool } from 'kode-sdk';

class ConversationManager {
  private agents = new Map<string, Agent>();
  private pool: AgentPool;
  
  constructor(deps: AgentDependencies) {
    this.pool = new AgentPool(deps);
  }
  
  async getOrCreate(conversationId: string, config?: AgentConfig): Promise<Agent> {
    // 检查缓存
    if (this.agents.has(conversationId)) {
      return this.agents.get(conversationId)!;
    }
    
    // 尝试从 Store 恢复
    const agentId = await this.getAgentId(conversationId);
    
    if (agentId) {
      const exists = await this.deps.store.exists(agentId);
      if (exists) {
        const agent = await Agent.resumeFromStore(agentId, this.deps);
        this.agents.set(conversationId, agent);
        return agent;
      }
    }
    
    // 创建新 Agent
    const agent = await Agent.create({
      agentId: agentId || `agt_${conversationId}`,
      ...config
    }, this.deps);
    
    this.agents.set(conversationId, agent);
    await this.saveMapping(conversationId, agent.agentId);
    
    return agent;
  }
  
  async release(conversationId: string) {
    const agent = this.agents.get(conversationId);
    if (agent) {
      // 可选：持久化状态
      await agent.persist?.();
      this.agents.delete(conversationId);
    }
  }
  
  private async getAgentId(conversationId: string): Promise<string | null> {
    // 从数据库或缓存获取映射关系
    return await db.get(`conversation:${conversationId}:agentId`);
  }
  
  private async saveMapping(conversationId: string, agentId: string) {
    await db.set(`conversation:${conversationId}:agentId`, agentId);
  }
}
```

## 6. 错误处理

### 6.1 错误类型定义

```typescript
export enum ApiErrorCode {
  // 客户端错误 (4xx)
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  CONVERSATION_NOT_FOUND = 'CONVERSATION_NOT_FOUND',
  MESSAGE_TOO_LARGE = 'MESSAGE_TOO_LARGE',
  
  // 服务端错误 (5xx)
  AGENT_ERROR = 'AGENT_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  MODEL_ERROR = 'MODEL_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  detail?: any;
  timestamp: string;
}
```

### 6.2 错误处理中间件

```typescript
// Express 错误处理
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', err);
  
  const statusCode = err.statusCode || 500;
  const errorResponse: ApiError = {
    code: err.code || ApiErrorCode.INTERNAL_ERROR,
    message: err.message || 'Internal server error',
    detail: err.detail,
    timestamp: new Date().toISOString()
  };
  
  res.status(statusCode).json(errorResponse);
});

// 自定义错误类
export class ApiException extends Error {
  constructor(
    public code: ApiErrorCode,
    public statusCode: number,
    message: string,
    public detail?: any
  ) {
    super(message);
  }
}

// 使用示例
if (!conversationId) {
  throw new ApiException(
    ApiErrorCode.INVALID_REQUEST,
    400,
    'conversationId is required'
  );
}
```

## 7. 认证和授权

### 7.1 JWT 认证

```typescript
import jwt from 'jsonwebtoken';

// 认证中间件
function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new ApiException(
      ApiErrorCode.UNAUTHORIZED,
      401,
      'Authentication required'
    );
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    throw new ApiException(
      ApiErrorCode.UNAUTHORIZED,
      401,
      'Invalid token'
    );
  }
}

// 应用到路由
app.use('/api/conversations', authenticate);
```

### 7.2 权限检查

```typescript
// 检查用户是否有权访问会话
async function authorize(req: Request, res: Response, next: NextFunction) {
  const { conversationId } = req.params;
  const userId = req.user.id;
  
  const conversation = await db.getConversation(conversationId);
  
  if (!conversation) {
    throw new ApiException(
      ApiErrorCode.CONVERSATION_NOT_FOUND,
      404,
      'Conversation not found'
    );
  }
  
  if (conversation.userId !== userId) {
    throw new ApiException(
      ApiErrorCode.UNAUTHORIZED,
      403,
      'Access denied'
    );
  }
  
  next();
}

// 应用到特定路由
app.get('/api/conversations/:conversationId', authenticate, authorize, handler);
```

## 8. 性能优化

### 8.1 连接池

```typescript
// Agent 池配置
const agentPool = new AgentPool(deps, {
  maxSize: 100,           // 最大 Agent 数
  idleTimeout: 300000,    // 5分钟无活动自动释放
  checkInterval: 60000    // 每分钟检查一次
});

// 自动清理
setInterval(() => {
  agentPool.cleanup();
}, 60000);
```

### 8.2 缓存策略

```typescript
import Redis from 'ioredis';

const redis = new Redis();

// 缓存消息历史
async function getMessages(conversationId: string) {
  const cacheKey = `messages:${conversationId}`;
  
  // 尝试从缓存获取
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // 从数据库加载
  const messages = await db.getMessages(conversationId);
  
  // 缓存 5 分钟
  await redis.setex(cacheKey, 300, JSON.stringify(messages));
  
  return messages;
}

// 缓存失效
async function invalidateCache(conversationId: string) {
  await redis.del(`messages:${conversationId}`);
}
```

### 8.3 限流

```typescript
import rateLimit from 'express-rate-limit';

// API 限流
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1分钟
  max: 100,             // 最多 100 个请求
  message: 'Too many requests, please try again later'
});

app.use('/api/', apiLimiter);

// 消息发送限流
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many messages, please slow down'
});

app.use('/api/conversations/:conversationId/messages', messageLimiter);
```

## 9. 监控和日志

### 9.1 请求日志

```typescript
import morgan from 'morgan';

// HTTP 请求日志
app.use(morgan('combined'));

// 自定义日志
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      userId: req.user?.id,
      conversationId: req.params.conversationId
    });
  });
  
  next();
});
```

### 9.2 指标收集

```typescript
import { Counter, Histogram } from 'prom-client';

// 请求计数
const requestCounter = new Counter({
  name: 'api_requests_total',
  help: 'Total API requests',
  labelNames: ['method', 'path', 'status']
});

// 响应时间
const responseTime = new Histogram({
  name: 'api_response_duration_seconds',
  help: 'API response duration',
  labelNames: ['method', 'path']
});

// 中间件
app.use((req, res, next) => {
  const end = responseTime.startTimer({
    method: req.method,
    path: req.route?.path || req.path
  });
  
  res.on('finish', () => {
    requestCounter.inc({
      method: req.method,
      path: req.route?.path || req.path,
      status: res.statusCode
    });
    
    end();
  });
  
  next();
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## 10. 完整示例

### 10.1 Express + SSE 完整实现

```typescript
// server.ts
import express from 'express';
import cors from 'cors';
import { Agent, AgentDependencies } from 'kode-sdk';
import { createRuntime } from './runtime';

const app = express();
app.use(cors());
app.use(express.json());

const deps = createRuntime();
const agents = new Map<string, Agent>();

// 创建会话
app.post('/api/conversations', async (req, res) => {
  const { templateId, config, metadata } = req.body;
  const conversationId = `conv_${Date.now()}`;
  
  const agent = await Agent.create({
    agentId: `agt_${conversationId}`,
    templateId,
    ...config
  }, deps);
  
  agents.set(conversationId, agent);
  
  res.json({
    conversationId,
    agentId: agent.agentId,
    templateId,
    createdAt: new Date().toISOString(),
    status: 'ready'
  });
});

// 发送消息
app.post('/api/conversations/:conversationId/messages', async (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;
  
  const agent = agents.get(conversationId);
  if (!agent) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  const messageId = await agent.send(content);
  
  res.json({
    messageId,
    status: 'queued'
  });
});

// 事件流
app.get('/api/conversations/:conversationId/events', async (req, res) => {
  const { conversationId } = req.params;
  const { since } = req.query;
  
  const agent = agents.get(conversationId);
  if (!agent) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  const bookmark = since ? { seq: Number(since), timestamp: Date.now() } : undefined;
  const iterator = agent.subscribe(['progress'], { since: bookmark })[Symbol.asyncIterator]();
  
  for await (const envelope of { [Symbol.asyncIterator]: () => iterator }) {
    res.write(`event: ${envelope.event.type}\n`);
    res.write(`data: ${JSON.stringify(envelope)}\n\n`);
    
    if (envelope.event.type === 'done') {
      res.end();
      break;
    }
  }
  
  req.on('close', () => iterator.return?.());
});

app.listen(3000, () => {
  console.log('API server running on port 3000');
});
```

## 总结

API 层设计要点：

1. **清晰的 RESTful 接口**: 会话、消息、审批分离
2. **实时事件推送**: SSE 或 WebSocket，支持断点续播
3. **Agent 池管理**: 自动创建、恢复、释放
4. **完善的错误处理**: 统一错误格式和处理流程
5. **安全认证**: JWT + 权限检查
6. **性能优化**: 连接池、缓存、限流
7. **监控日志**: 请求日志、指标收集

推荐使用 **Express + SSE** 作为起点，后续可根据需求升级到 WebSocket 或 tRPC。

