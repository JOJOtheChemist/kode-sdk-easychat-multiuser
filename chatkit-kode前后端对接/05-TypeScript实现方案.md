# ChatKit + Kode-SDK 全 TypeScript 实现方案

## 方案选择

使用 **Node.js + TypeScript + Fastify** 实现完整的后端适配层，直接集成 Kode-SDK。

## 项目结构

```
chatkit-kode-backend/
├── src/
│   ├── server.ts              # Fastify 服务器入口
│   ├── chatkit/
│   │   ├── adapter.ts         # ChatKit 协议适配器
│   │   ├── converter.ts       # 事件格式转换
│   │   └── types.ts           # ChatKit 类型定义
│   ├── kode/
│   │   ├── agent-manager.ts   # Agent 管理器
│   │   ├── tools.ts           # 自定义工具定义
│   │   └── config.ts          # Kode-SDK 配置
│   ├── storage/
│   │   └── facts-store.ts     # Facts 存储
│   └── utils/
│       └── logger.ts          # 日志工具
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 核心文件实现

### 1. package.json

```json
{
  "name": "chatkit-kode-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@shareai-lab/kode-sdk": "^2.7.0",
    "fastify": "^4.25.0",
    "@fastify/cors": "^8.5.0",
    "dotenv": "^16.3.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

### 2. src/server.ts - 服务器入口

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { chatkitAdapter } from './chatkit/adapter.js';
import { initKodeSDK } from './kode/config.js';
import { AgentManager } from './kode/agent-manager.js';

dotenv.config();

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// 启用 CORS
await server.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});

// 初始化 Kode-SDK
const kodeDeps = initKodeSDK();
const agentManager = new AgentManager(kodeDeps);

// ChatKit 端点
server.post('/chatkit', async (request, reply) => {
  return chatkitAdapter(request, reply, agentManager);
});

// Facts API（可选）
server.get('/facts', async (request, reply) => {
  const facts = await agentManager.getAllFacts();
  return { facts };
});

// 健康检查
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// 启动服务器
const PORT = parseInt(process.env.PORT || '8001', 10);
const HOST = process.env.HOST || '0.0.0.0';

try {
  await server.listen({ port: PORT, host: HOST });
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
  console.log(`📡 ChatKit endpoint: http://${HOST}:${PORT}/chatkit`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
```

### 3. src/kode/config.ts - Kode-SDK 配置

```typescript
import {
  JSONStore,
  AgentTemplateRegistry,
  ToolRegistry,
  SandboxFactory,
  GLMProvider,
  type AgentDependencies,
  type ModelConfig,
} from '@shareai-lab/kode-sdk';
import { createSaveFactTool, createSwitchThemeTool } from './tools.js';

export function initKodeSDK(): AgentDependencies {
  const store = new JSONStore('./.kode');
  const templates = new AgentTemplateRegistry();
  const tools = new ToolRegistry();
  const sandboxFactory = new SandboxFactory();

  // 注册自定义工具
  const saveFactTool = createSaveFactTool();
  const switchThemeTool = createSwitchThemeTool();
  
  tools.register(saveFactTool.name, () => saveFactTool);
  tools.register(switchThemeTool.name, () => switchThemeTool);

  // 注册模板
  templates.register({
    id: 'chatkit-assistant',
    systemPrompt: `你是 ChatKit Guide，一个友好的助手。

主要功能：
1. 帮助用户了解 ChatKit 的使用方法
2. 记录用户分享的事实信息
3. 切换界面主题

重要规则：
- 在每个新对话开始时，问候用户并问"Tell me about yourself."
- 每当用户分享一个具体的事实时（如姓名、职业、位置等），立即调用 save_fact 工具保存
- 当用户要求切换主题（light/dark）时，调用 switch_theme 工具
- 保持回答简洁友好`,
    tools: [saveFactTool.name, switchThemeTool.name],
    model: 'glm-4.5-air',
  });

  // 模型工厂
  const modelFactory = (config: ModelConfig) => {
    const apiKey = process.env.GLM_API_KEY;
    if (!apiKey) {
      throw new Error('GLM_API_KEY is required');
    }
    
    const baseUrl = process.env.GLM_BASE_URL || 
                   'https://open.bigmodel.cn/api/paas/v4';
    
    return new GLMProvider(apiKey, config.model, baseUrl);
  };

  return {
    store,
    templateRegistry: templates,
    toolRegistry: tools,
    sandboxFactory,
    modelFactory,
  };
}
```

### 4. src/kode/tools.ts - 自定义工具

```typescript
import { defineTool } from '@shareai-lab/kode-sdk';
import { factsStore } from '../storage/facts-store.js';
import { z } from 'zod';

// 客户端工具调用的全局队列
// 注意：这是一个简化实现，生产环境应该使用更健壮的机制
export const clientToolCallQueue = new Map<string, Array<{
  name: string;
  arguments: any;
}>>();

export function createSaveFactTool() {
  return defineTool({
    name: 'save_fact',
    description: '记录用户分享的事实信息，如姓名、职业、爱好、位置等',
    parameters: {
      fact: {
        type: 'string',
        description: '用户分享的事实内容，应该是简短的陈述句',
      },
    },
    handler: async (params: { fact: string }, context) => {
      try {
        // 保存 fact
        const fact = await factsStore.create(params.fact);
        
        // 触发客户端工具调用
        const threadId = context.agentId; // 使用 agentId 作为 threadId
        if (!clientToolCallQueue.has(threadId)) {
          clientToolCallQueue.set(threadId, []);
        }
        clientToolCallQueue.get(threadId)!.push({
          name: 'record_fact',
          arguments: {
            fact_id: fact.id,
            fact_text: fact.text,
          },
        });
        
        console.log(`[save_fact] Fact saved: ${fact.id}`);
        
        return {
          success: true,
          fact_id: fact.id,
          message: 'Fact recorded successfully',
        };
      } catch (error) {
        console.error('[save_fact] Error:', error);
        return {
          success: false,
          error: 'Failed to save fact',
        };
      }
    },
  });
}

export function createSwitchThemeTool() {
  return defineTool({
    name: 'switch_theme',
    description: '切换聊天界面的主题（亮色或暗色模式）',
    parameters: {
      theme: {
        type: 'string',
        enum: ['light', 'dark'],
        description: '要切换到的主题类型',
      },
    },
    handler: async (params: { theme: 'light' | 'dark' }, context) => {
      try {
        // 触发客户端工具调用
        const threadId = context.agentId;
        if (!clientToolCallQueue.has(threadId)) {
          clientToolCallQueue.set(threadId, []);
        }
        clientToolCallQueue.get(threadId)!.push({
          name: 'switch_theme',
          arguments: {
            theme: params.theme,
          },
        });
        
        console.log(`[switch_theme] Theme switched to: ${params.theme}`);
        
        return {
          success: true,
          theme: params.theme,
          message: `Theme switched to ${params.theme} mode`,
        };
      } catch (error) {
        console.error('[switch_theme] Error:', error);
        return {
          success: false,
          error: 'Failed to switch theme',
        };
      }
    },
  });
}
```

### 5. src/kode/agent-manager.ts - Agent 管理器

```typescript
import type { Agent, AgentDependencies, AgentConfig } from '@shareai-lab/kode-sdk';
import { Agent as KodeAgent } from '@shareai-lab/kode-sdk';

export class AgentManager {
  private agents = new Map<string, Agent>();
  private deps: AgentDependencies;

  constructor(deps: AgentDependencies) {
    this.deps = deps;
  }

  async getOrCreate(threadId: string): Promise<Agent> {
    if (!this.agents.has(threadId)) {
      const config: AgentConfig = {
        templateId: 'chatkit-assistant',
        sandbox: {
          kind: 'local',
          workDir: `./workspace/${threadId}`,
          enforceBoundary: true,
        },
      };
      
      const agent = await KodeAgent.create(config, this.deps);
      this.agents.set(threadId, agent);
      
      console.log(`[AgentManager] Created new agent for thread: ${threadId}`);
    }
    
    return this.agents.get(threadId)!;
  }

  async getAllFacts() {
    // 这里可以从所有 agent 收集 facts
    // 或者从独立的 facts store 获取
    return [];
  }

  async cleanup(threadId: string) {
    const agent = this.agents.get(threadId);
    if (agent) {
      // 可以在这里清理 agent 资源
      this.agents.delete(threadId);
      console.log(`[AgentManager] Cleaned up agent: ${threadId}`);
    }
  }
}
```

### 6. src/chatkit/adapter.ts - ChatKit 适配器

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AgentManager } from '../kode/agent-manager.js';
import { convertKodeEventsToSSE } from './converter.js';

interface ChatKitRequest {
  thread_id?: string;
  messages?: Array<{
    role: string;
    content: string;
  }>;
}

export async function chatkitAdapter(
  request: FastifyRequest,
  reply: FastifyReply,
  agentManager: AgentManager
) {
  try {
    const body = request.body as ChatKitRequest;
    const threadId = body.thread_id || generateThreadId();
    const messages = body.messages || [];
    
    // 获取最新的用户消息
    const userMessage = getUserMessage(messages);
    if (!userMessage) {
      return reply.code(400).send({ error: 'No user message found' });
    }
    
    // 获取或创建 Agent
    const agent = await agentManager.getOrCreate(threadId);
    
    // 设置 SSE 响应头
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    
    // 调用 Kode-SDK 流式对话
    const eventStream = agent.chatStream(userMessage);
    
    // 转换并发送 SSE 事件
    for await (const sseEvent of convertKodeEventsToSSE(eventStream, threadId, agent.id)) {
      reply.raw.write(sseEvent);
    }
    
    // 结束响应
    reply.raw.end();
  } catch (error) {
    console.error('[chatkit-adapter] Error:', error);
    
    if (!reply.sent) {
      reply.code(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

function getUserMessage(messages: Array<{ role: string; content: string }>): string | null {
  // 从后往前找第一条用户消息
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return messages[i].content;
    }
  }
  return null;
}

function generateThreadId(): string {
  return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### 7. src/chatkit/converter.ts - 事件转换器

```typescript
import type { Agent } from '@shareai-lab/kode-sdk';
import { clientToolCallQueue } from '../kode/tools.js';

export async function* convertKodeEventsToSSE(
  kodeEvents: AsyncIterable<any>,
  threadId: string,
  agentId: string
): AsyncGenerator<string> {
  let messageContent = '';
  
  for await (const envelope of kodeEvents) {
    const event = envelope.event;
    
    // 处理文本流
    if (event.type === 'text_chunk') {
      messageContent += event.delta;
      
      yield formatSSE({
        type: 'text.delta',
        delta: event.delta,
        thread_id: threadId,
      });
    }
    
    // 处理工具调用（转发到客户端）
    else if (event.type === 'tool_call') {
      console.log(`[converter] Tool call: ${event.tool}`);
    }
    
    // 处理工具结果后，检查客户端工具调用队列
    else if (event.type === 'tool_result') {
      const queue = clientToolCallQueue.get(agentId) || [];
      for (const call of queue) {
        yield formatSSE({
          type: 'client_tool_call',
          name: call.name,
          arguments: call.arguments,
          thread_id: threadId,
        });
      }
      // 清空队列
      clientToolCallQueue.delete(agentId);
    }
    
    // 处理错误
    else if (event.type === 'error') {
      console.error('[converter] Error:', event.error);
      yield formatSSE({
        type: 'error',
        error: {
          message: event.error?.message || 'Unknown error',
        },
        thread_id: threadId,
      });
    }
  }
  
  // 发送消息完成事件
  yield formatSSE({
    type: 'thread_item.done',
    thread_id: threadId,
    item: {
      id: generateId(),
      thread_id: threadId,
      type: 'assistant_message',
      content: messageContent,
      created_at: new Date().toISOString(),
    },
  });
}

function formatSSE(data: any): string {
  return `event: thread.stream\ndata: ${JSON.dumps(data)}\n\n`;
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### 8. src/storage/facts-store.ts - Facts 存储

```typescript
import fs from 'fs/promises';
import path from 'path';

export interface Fact {
  id: string;
  text: string;
  status: 'saved' | 'pending' | 'discarded';
  createdAt: string;
}

class FactsStore {
  private facts: Map<string, Fact> = new Map();
  private storePath = './.kode/facts.json';

  constructor() {
    this.load();
  }

  async create(text: string): Promise<Fact> {
    const fact: Fact = {
      id: `fact_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      text,
      status: 'saved',
      createdAt: new Date().toISOString(),
    };
    
    this.facts.set(fact.id, fact);
    await this.save();
    
    return fact;
  }

  async get(id: string): Promise<Fact | null> {
    return this.facts.get(id) || null;
  }

  async getAll(): Promise<Fact[]> {
    return Array.from(this.facts.values());
  }

  async update(id: string, updates: Partial<Fact>): Promise<Fact | null> {
    const fact = this.facts.get(id);
    if (!fact) return null;
    
    Object.assign(fact, updates);
    await this.save();
    
    return fact;
  }

  private async load() {
    try {
      const data = await fs.readFile(this.storePath, 'utf-8');
      const facts = JSON.parse(data) as Fact[];
      this.facts = new Map(facts.map(f => [f.id, f]));
      console.log(`[FactsStore] Loaded ${this.facts.size} facts`);
    } catch {
      // 文件不存在或格式错误，使用空 Map
      console.log('[FactsStore] No existing facts found, starting fresh');
    }
  }

  private async save() {
    try {
      const dir = path.dirname(this.storePath);
      await fs.mkdir(dir, { recursive: true });
      
      const facts = Array.from(this.facts.values());
      await fs.writeFile(
        this.storePath,
        JSON.stringify(facts, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('[FactsStore] Failed to save:', error);
    }
  }
}

export const factsStore = new FactsStore();
```

### 9. .env.example

```bash
# Server
PORT=8001
HOST=0.0.0.0
LOG_LEVEL=info

# Frontend
FRONTEND_URL=http://localhost:5173

# GLM API
GLM_API_KEY=your-glm-api-key-here
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
GLM_MODEL_ID=glm-4.5-air
```

### 10. tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 启动和测试

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入真实的 GLM_API_KEY
```

### 3. 启动开发服务器

```bash
npm run dev
```

### 4. 测试端点

```bash
# 健康检查
curl http://localhost:8001/health

# 测试 ChatKit 端点（需要前端或 curl SSE）
curl -X POST http://localhost:8001/chatkit \
  -H "Content-Type: application/json" \
  -d '{
    "thread_id": "test-thread",
    "messages": [
      {"role": "user", "content": "Hello, my name is John"}
    ]
  }'
```

### 5. 前端配置

在前端的 `.env` 文件中设置：

```bash
VITE_CHATKIT_API_URL=http://localhost:8001/chatkit
VITE_CHATKIT_API_DOMAIN_KEY=domain_pk_localhost_dev
```

## 优化建议

### 1. 生产环境改进

- 使用 Redis 替代内存队列管理客户端工具调用
- 添加请求限流和认证
- 使用更健壮的错误处理
- 添加性能监控和日志聚合

### 2. 扩展功能

- 支持文件上传和附件
- 支持更多工具（天气、搜索等）
- 多用户隔离和权限管理
- Agent 池管理和负载均衡

### 3. 测试

- 单元测试（Jest/Vitest）
- 集成测试
- E2E 测试（Playwright）

