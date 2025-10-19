# Schema 参数校验与自动纠错机制

## 概述

KODE SDK 提供了完善的参数校验机制，当工具调用参数不符合 Schema 时，会自动返回错误信息给模型，让模型能够根据错误提示自动修正参数并重试。本文档详细说明校验机制的实现原理和工作流程。

---

## 一、参数校验的两种方式

### 1.1 Zod Schema 校验（推荐）

**位置：** `src/tools/tool.ts` 第 84-94 行

```typescript
// 参数验证
if (def.parameters) {
  const parseResult = def.parameters.safeParse(args);
  if (!parseResult.success) {
    return {
      ok: false,
      error: `Invalid parameters: ${parseResult.error.message}`,
      _validationError: true,  // 🔑 标记为校验错误
    };
  }
  args = parseResult.data;
}
```

**特点：**
- 使用 Zod 进行类型安全的参数校验
- 自动类型推断和转换
- 错误信息清晰易懂
- 返回 `_validationError: true` 标记

**示例：**
```typescript
import { z } from 'zod';
import { tool } from './tools/tool';

const FsMultiEdit = tool({
  name: 'fs_multi_edit',
  description: 'Edit multiple files',
  parameters: z.object({
    edits: z.array(z.object({
      path: z.string().describe('File path'),
      find: z.string().describe('Existing text to replace'),
      replace: z.string().describe('Replacement text'),
      replace_all: z.boolean().optional(),
    })),
  }),
  async execute(args, ctx) {
    // args 已经过校验，类型安全
    const { edits } = args;
    // ...
  },
});
```

### 1.2 JSON Schema 校验（AJV）

**位置：** `src/core/agent.ts` 第 1477-1498 行

```typescript
private validateToolArgs(tool: ToolInstance, args: any): { ok: boolean; error?: string } {
  if (!tool.input_schema) {
    return { ok: true };
  }

  // 缓存编译后的校验器
  const key = JSON.stringify(tool.input_schema);
  let validator = this.validatorCache.get(key);
  if (!validator) {
    validator = this.ajv.compile(tool.input_schema);
    this.validatorCache.set(key, validator);
  }

  const valid = validator(args);
  if (!valid) {
    return {
      ok: false,
      error: this.ajv.errorsText(validator.errors, { separator: '\n' }),
    };
  }

  return { ok: true };
}
```

**特点：**
- 使用 AJV (Another JSON Schema Validator)
- 支持标准 JSON Schema 规范
- 校验器自动缓存，提高性能
- 错误信息使用 `\n` 分隔多个错误

**AJV 配置：**
```typescript
// agent.ts 第 156 行
private readonly ajv = new Ajv({ 
  allErrors: true,     // 返回所有错误，而不是第一个
  strict: false        // 不严格模式
});
```

---

## 二、错误处理与返回机制

### 2.1 错误类型识别

**位置：** `src/core/agent.ts` 第 1204-1208 行

```typescript
const errorContent = outcome.content as any;
const errorMessage = errorContent?.error || 'Tool returned failure';
const errorType = errorContent?._validationError ? 'validation' :
                  errorContent?._thrownError ? 'runtime' : 'logical';
const isRetryable = errorType !== 'validation';  // 🔑 校验错误不可重试
```

**三种错误类型：**

| 错误类型 | 标记字段 | 含义 | 是否可重试 |
|---------|---------|------|-----------|
| `validation` | `_validationError: true` | Schema 校验失败 | ❌ 否（参数格式错误） |
| `runtime` | `_thrownError: true` | 执行过程抛出异常 | ✅ 是 |
| `logical` | 无特殊标记 | 业务逻辑错误 | ✅ 是 |

### 2.2 错误建议生成

**位置：** `src/core/agent.ts` 第 1239 行

```typescript
const recommendations = errorContent?.recommendations 
  || this.getErrorRecommendations(errorType, toolUse.name);
```

系统会自动为不同类型的错误生成建议，或使用工具返回的自定义建议。

### 2.3 构建返回结果

**位置：** `src/core/agent.ts` 第 1241-1248 行

```typescript
return this.makeToolResult(toolUse.id, {
  ok: false,
  error: errorMessage,           // 错误信息
  errorType,                      // 错误类型
  retryable: isRetryable,         // 是否可重试
  data: outcome.content,          // 原始数据
  recommendations,                // 🔥 修正建议
});
```

### 2.4 makeToolResult 实现

**位置：** `src/core/agent.ts` 第 1500-1526 行

```typescript
private makeToolResult(
  toolUseId: string,
  payload: {
    ok: boolean;
    data?: any;
    error?: string;
    errorType?: string;
    retryable?: boolean;
    note?: string;
    recommendations?: string[];
  }
): ContentBlock {
  return {
    type: 'tool_result',
    tool_use_id: toolUseId,
    content: {
      ok: payload.ok,
      data: payload.data,
      error: payload.error,
      errorType: payload.errorType,
      retryable: payload.retryable,
      note: payload.note,
      recommendations: payload.recommendations,  // 🔥 建议列表
    },
    is_error: payload.ok ? false : true,
  };
}
```

**返回格式示例：**
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_xxx",
  "content": {
    "ok": false,
    "error": "Invalid parameters: edits.0.path: Required",
    "errorType": "validation",
    "retryable": false,
    "recommendations": [
      "Check the required fields in the tool schema",
      "Ensure all required parameters are provided"
    ]
  },
  "is_error": true
}
```

---

## 三、完整工作流程

### 3.1 流程图

```
模型调用工具（参数可能错误）
  ↓
① 工具执行前：Schema 校验
  → Zod.safeParse(args) 或 AJV.validate(args)
  ↓
② 校验失败
  → 返回 { ok: false, error: "...", _validationError: true }
  ↓
③ Agent 识别错误类型
  → errorType = 'validation'
  → retryable = false
  ↓
④ 生成错误建议
  → recommendations = getErrorRecommendations(...)
  ↓
⑤ 格式化返回结果
  → makeToolResult(toolUseId, { ok: false, error, errorType, recommendations })
  ↓
⑥ 追加到 messages
  → this.messages.push({ role: 'user', content: [tool_result] })
  ↓
⑦ 触发下一轮处理
  → this.ensureProcessing()
  ↓
⑧ 模型收到错误信息和建议
  → 根据 error 和 recommendations 重新生成正确参数
  ↓
⑨ 重新调用工具（参数已修正）
  → 校验通过，执行成功
```

### 3.2 实际示例

**错误调用：**
```typescript
// 模型第一次调用（缺少必需参数）
{
  "name": "fs_multi_edit",
  "input": {
    "edits": [
      {
        "find": "old text",
        "replace": "new text"
        // ❌ 缺少必需的 path 字段
      }
    ]
  }
}
```

**校验错误返回：**
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_123",
  "content": {
    "ok": false,
    "error": "Invalid parameters: edits.0.path: Required",
    "errorType": "validation",
    "retryable": false,
    "recommendations": [
      "Check the required fields: path is required",
      "Ensure the file path is provided for each edit"
    ]
  },
  "is_error": true
}
```

**模型自动修正：**
```typescript
// 模型第二次调用（参数已修正）
{
  "name": "fs_multi_edit",
  "input": {
    "edits": [
      {
        "path": "./config.json",  // ✅ 添加了必需字段
        "find": "old text",
        "replace": "new text"
      }
    ]
  }
}
```

---

## 四、工具异常捕获

### 4.1 统一异常处理

**位置：** `src/tools/tool.ts` 第 120-127 行

```typescript
} catch (error: any) {
  // 捕获工具执行中的所有错误，统一返回格式
  return {
    ok: false,
    error: error?.message || String(error),
    _thrownError: true,  // 🔑 标记为运行时错误
  };
}
```

### 4.2 错误传播

所有工具执行错误都会被捕获并格式化，然后通过相同的机制返回给模型：

```typescript
// 工具抛出异常
throw new Error('File not found: config.json');

// 被捕获并转换为
{
  ok: false,
  error: 'File not found: config.json',
  _thrownError: true
}

// Agent 识别为 runtime 错误
errorType = 'runtime'
retryable = true  // 运行时错误可以重试
```

---

## 五、最佳实践

### 5.1 定义清晰的 Schema

```typescript
// ✅ 好的做法：详细的描述和类型约束
parameters: z.object({
  path: z.string()
    .min(1)
    .describe('File path, must be relative to workspace'),
  content: z.string()
    .describe('File content to write'),
  create_dirs: z.boolean()
    .optional()
    .default(false)
    .describe('Create parent directories if they don\'t exist'),
}),
```

### 5.2 提供自定义建议

```typescript
// 工具可以返回自定义的错误建议
if (!isValidPath(args.path)) {
  return {
    ok: false,
    error: 'Invalid file path',
    recommendations: [
      'Use relative paths starting from workspace root',
      'Avoid using absolute paths or paths with ".."',
      'Example: ./src/config.json'
    ]
  };
}
```

### 5.3 区分错误类型

```typescript
// 校验错误（Schema 不匹配）
{ ok: false, error: '...', _validationError: true }

// 运行时错误（执行时异常）
{ ok: false, error: '...', _thrownError: true }

// 业务逻辑错误（执行成功但结果为失败）
{ ok: false, error: '...', /* 无特殊标记 */ }
```

---

## 六、调试技巧

### 6.1 查看校验错误

监听 `error` 事件查看校验失败：

```typescript
agent.on('error', (event: MonitorErrorEvent) => {
  if (event.phase === 'tool' && event.detail?.errorType === 'validation') {
    console.error('Schema validation failed:', event.message);
    console.log('Recommendations:', event.detail.recommendations);
  }
});
```

### 6.2 追踪工具执行

```typescript
agent.on('tool_executed', (event) => {
  const record = event.call;
  if (record.state === 'FAILED' && record.error) {
    console.log('Tool failed:', record.name);
    console.log('Error:', record.error);
    console.log('Result:', record.result);
  }
});
```

### 6.3 检查 messages 历史

```typescript
// 查看完整的对话历史，包括错误返回
const messages = await agent.getMessages();
messages.forEach(msg => {
  if (msg.role === 'user' && Array.isArray(msg.content)) {
    msg.content.forEach(block => {
      if (block.type === 'tool_result' && block.is_error) {
        console.log('Tool error result:', block.content);
      }
    });
  }
});
```

---

## 七、相关代码位置速查

| 功能 | 文件 | 行号 | 说明 |
|-----|------|------|------|
| Zod 校验 | `src/tools/tool.ts` | 84-94 | 参数校验入口 |
| AJV 校验 | `src/core/agent.ts` | 1477-1498 | JSON Schema 校验 |
| 错误类型识别 | `src/core/agent.ts` | 1204-1208 | 识别 validation/runtime/logical |
| 错误建议生成 | `src/core/agent.ts` | 1239 | 生成或获取建议 |
| 构建返回结果 | `src/core/agent.ts` | 1241-1248 | 包含建议的错误返回 |
| makeToolResult | `src/core/agent.ts` | 1500-1526 | 格式化工具结果 |
| 异常捕获 | `src/tools/tool.ts` | 120-127 | 统一异常处理 |
| AJV 配置 | `src/core/agent.ts` | 156 | AJV 实例配置 |
| 校验器缓存 | `src/core/agent.ts` | 157 | 性能优化缓存 |

---

## 八、总结

**Schema 校验机制的核心价值：**

1. ✅ **自动纠错**：模型收到错误信息后能自动修正参数
2. ✅ **类型安全**：Zod 提供完整的 TypeScript 类型支持
3. ✅ **性能优化**：校验器自动缓存，避免重复编译
4. ✅ **清晰反馈**：详细的错误信息和修正建议
5. ✅ **统一处理**：所有错误都通过相同机制返回给模型

**工作流程总结：**
```
参数错误 → Schema 校验失败 → 标记错误类型 → 生成建议 
→ 返回给模型 → 模型修正 → 重新调用 → 成功执行
```

这个机制让 AI Agent 具备了"从错误中学习"的能力，大大提高了工具调用的成功率和用户体验。

