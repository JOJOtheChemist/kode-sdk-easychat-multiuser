# GLM-4.5-air 模型配置说明

## 概述

本文档说明如何在 Kode-SDK 中配置和使用智谱 AI 的 GLM-4.5-air 模型。

## 已完成的配置

### 1. 创建 GLM Provider

创建了 `src/infra/glm-provider.ts` 文件，实现了与智谱 AI API 的对接：

- **API 端点**: `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- **模型名称**: `glm-4.5-air`
- **API Key**: `ef22d69d218e4cad8ae3c15bcc77d30d.eULl6aqOo8YEDKzG`

### 2. 功能特性

GLMProvider 支持以下功能：

- ✅ 流式和非流式响应
- ✅ 工具调用（Function Calling）
- ✅ 系统提示词
- ✅ Token 使用统计
- ✅ 温度和最大 Token 配置

### 3. API 格式转换

GLMProvider 自动处理以下转换：

- **OpenAI 格式 → Anthropic 格式**: 将智谱 AI 的 OpenAI 兼容格式转换为 Kode-SDK 使用的 Anthropic 格式
- **工具调用**: 支持 Function Calling，自动转换为 Anthropic 的 `tool_use` 格式
- **流式输出**: SSE 事件流解析和转换

## 测试文件

### 基础测试 (`examples/test-glm.ts`)

最简单的测试，验证基本对话功能：

```bash
npx ts-node examples/test-glm.ts
```

### 高级测试 (`examples/test-glm-advanced.ts`)

包含多个测试场景：
- 基本对话
- 工具调用（待办事项管理）
- 复杂推理

```bash
npx ts-node examples/test-glm-advanced.ts
```

## 使用示例

### 最小示例

```typescript
import { Agent, GLMProvider, /* 其他依赖 */ } from '@shareai-lab/kode-sdk';

// 创建模型工厂
const modelFactory = (config) => {
  return new GLMProvider(
    'ef22d69d218e4cad8ae3c15bcc77d30d.eULl6aqOo8YEDKzG',
    'glm-4.5-air',
    'https://open.bigmodel.cn/api/paas/v4'
  );
};

// 创建 Agent
const agent = await Agent.create(
  {
    templateId: 'my-template',
    sandbox: { kind: 'local', workDir: './workspace' },
  },
  { /* 依赖配置 */ modelFactory, /* ... */ }
);

// 订阅事件
for await (const envelope of agent.subscribe(['progress'])) {
  if (envelope.event.type === 'text_chunk') {
    process.stdout.write(envelope.event.delta);
  }
}

// 发送消息
await agent.send('你好！');
```

### 配置选项

```typescript
new GLMProvider(
  apiKey,        // API 密钥
  model,         // 模型名称，默认 'glm-4.5-air'
  baseUrl        // API 基础 URL，默认 'https://open.bigmodel.cn/api/paas/v4'
)
```

## 测试结果

✅ **基础对话测试**: 成功
```
你好，我是一个能够帮助你管理任务清单的人工智能助手。
```

✅ **工具调用测试**: 成功
- 能够正确调用 `todo_write` 工具
- 工具参数解析正确

✅ **流式输出**: 正常
- 实时接收响应
- 无延迟和卡顿

## 技术细节

### API 兼容性

智谱 AI 使用 OpenAI 兼容的 API 格式：

```json
{
  "model": "glm-4.5-air",
  "messages": [
    { "role": "system", "content": "系统提示" },
    { "role": "user", "content": "用户消息" }
  ],
  "stream": true,
  "tools": [...]
}
```

GLMProvider 将响应转换为 Anthropic 格式：

```typescript
{
  role: 'assistant',
  content: [
    { type: 'text', text: '响应文本' },
    { type: 'tool_use', id: '...', name: '工具名', input: {...} }
  ],
  usage: {
    input_tokens: 100,
    output_tokens: 200
  }
}
```

### 模型参数

- **最大上下文窗口**: 128,000 tokens
- **最大输出**: 4,096 tokens
- **默认温度**: 0.7

## 文件结构

```
Kode-sdk/
├── src/
│   └── infra/
│       └── glm-provider.ts          # GLM Provider 实现
├── examples/
│   ├── test-glm.ts                  # 基础测试
│   └── test-glm-advanced.ts         # 高级测试
└── GLM-配置说明.md                   # 本文档
```

## 注意事项

1. **模型名称**: API 中使用 `glm-4.5-air`
2. **API 格式**: 智谱 AI 使用 OpenAI 兼容格式，需要格式转换
3. **认证方式**: 使用 `Authorization: Bearer {API_KEY}` 而不是 `x-api-key`
4. **工具调用**: 支持 Function Calling，但格式需要转换

## 下一步

可以进一步扩展的功能：

- [ ] 添加错误重试机制
- [ ] 支持更多模型参数（如 top_p）
- [ ] 添加请求日志
- [ ] 实现速率限制处理
- [ ] 支持其他智谱 AI 模型

## 相关链接

- 智谱 AI 官网: https://open.bigmodel.cn/
- Kode-SDK 文档: [README.md](./README.md)
- API 文档: https://open.bigmodel.cn/dev/api


