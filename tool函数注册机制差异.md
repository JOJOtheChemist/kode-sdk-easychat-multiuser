# tool() vs defineTool() 注册机制差异

## 核心问题

**问题**：为什么 `tool()` 可以事后添加 prompt 属性，而 `defineTool()` 不行？

**答案**：两者向 `globalToolRegistry` 注册工厂函数的方式不同。

---

## 1. tool() 的注册机制

### 源码分析

```typescript
// src/tools/tool.ts:54-153
export function tool<TArgs = any, TResult = any>(
  nameOrDef: string | ToolDefinition<TArgs, TResult>,
  executeFn?: (args: TArgs, ctx?: EnhancedToolContext) => Promise<TResult> | TResult
): ToolInstance {
  
  // 解析参数，创建工具定义
  const def: ToolDefinition<TArgs, TResult> = /* ... */;
  
  // 创建工具实例
  const toolInstance: ToolInstance = {
    name: def.name,
    description: def.description || `Execute ${def.name}`,
    input_schema,
    hooks: def.hooks,
    async exec(args: any, ctx: ToolContext): Promise<any> { /* ... */ },
    toDescriptor(): ToolDescriptor { /* ... */ },
  };

  // 注册到全局 registry
  globalToolRegistry.register(def.name, () => toolInstance);  // ← 关键：闭包捕获 toolInstance
  
  return toolInstance;
}
```

### 关键点

```typescript
globalToolRegistry.register(def.name, () => toolInstance);
```

**工厂函数返回的是 `toolInstance` 的引用**：
- 这是一个闭包
- `toolInstance` 是外层函数作用域的变量
- 每次调用工厂函数，返回的是**同一个对象引用**

### 执行流程

```typescript
// 1. 创建工具
export const FsWrite = tool({ name: 'fs_write', /* ... */ });
// toolInstance 被创建，工厂函数闭包捕获了它

// 2. 事后添加 prompt
FsWrite.prompt = PROMPT;
// 直接修改 toolInstance 对象的属性

// 3. Agent 调用 registry.create('fs_write')
const tool = globalToolRegistry.create('fs_write');
// → 调用工厂函数：() => toolInstance
// → 返回的是被闭包捕获的 toolInstance（同一个对象）
// → tool === FsWrite  （同一个引用）
// → tool.prompt === PROMPT  ✅
```

**结果**：事后添加的属性在原对象上，Agent 获取的也是原对象，所以能看到。

---

## 2. defineTool() 的注册机制

### 源码分析

```typescript
// src/tools/define.ts:144-217
export function defineTool<TArgs = any, TResult = any>(
  def: SimpleToolDef<TArgs, TResult>,
  options?: { autoRegister?: boolean }
): ToolInstance {
  
  const input_schema = def.input_schema || generateSchema(def.params);

  // 创建工具实例
  const toolInstance: ToolInstance = {
    name: def.name,
    description: def.description,
    input_schema,
    prompt: def.prompt,  // ← 注意：从 def 中读取 prompt
    async exec(args: any, ctx: ToolContext): Promise<any> { /* ... */ },
    toDescriptor(): ToolDescriptor { /* ... */ },
  };

  // 注册到全局 registry
  if (options?.autoRegister !== false) {
    globalToolRegistry.register(def.name, (_config) => {
      // 工厂函数：每次都重新调用 defineTool
      return defineTool(def, { autoRegister: false });  // ← 关键：递归调用，重新创建
    });
  }

  return toolInstance;
}
```

### 关键点

```typescript
globalToolRegistry.register(def.name, (_config) => {
  return defineTool(def, { autoRegister: false });  // ← 每次都重新创建
});
```

**工厂函数返回的是重新创建的新实例**：
- 闭包捕获的是 `def`（定义对象）而不是 `toolInstance`
- 每次调用工厂函数，都会**重新执行** `defineTool(def, ...)`
- 重新创建的实例基于 `def`，不包含事后添加的属性

### 执行流程

```typescript
// 1. 创建工具
export const createSchedulesBatchTool = defineTool({
  name: 'create_schedules_batch',
  description: DESCRIPTION,
  // 注意：这里没有 prompt 字段
});
// 返回 toolInstance1
// 工厂函数闭包捕获的是 def（定义对象）

// 2. 事后添加 prompt
(createSchedulesBatchTool as any).prompt = PROMPT;
// 修改的是 toolInstance1.prompt

// 3. Agent 调用 registry.create('create_schedules_batch')
const tool = globalToolRegistry.create('create_schedules_batch');
// → 调用工厂函数：(_config) => defineTool(def, { autoRegister: false })
// → 重新执行 defineTool()，创建 toolInstance2
// → toolInstance2 基于 def 创建，def 里没有 prompt 字段
// → toolInstance2.prompt === undefined  ❌
```

**结果**：事后添加的属性在 `toolInstance1` 上，但 Agent 获取的是 `toolInstance2`（新对象），所以看不到。

---

## 3. 对象引用对比

### tool() - 单例模式

```
创建阶段：
  toolInstance (0x1000) ← 创建对象
  工厂函数闭包 → 引用 0x1000

修改阶段：
  FsWrite (0x1000).prompt = PROMPT ← 修改对象

Agent 使用阶段：
  registry.create() → 工厂函数() → 返回 0x1000 ← 同一个对象
```

**关系**：`FsWrite === registry.create('fs_write')`（同一个引用）

### defineTool() - 工厂模式

```
创建阶段：
  toolInstance1 (0x1000) ← 创建对象
  工厂函数闭包 → 引用 def（定义对象）

修改阶段：
  createSchedulesBatchTool (0x1000).prompt = PROMPT ← 修改 0x1000

Agent 使用阶段：
  registry.create() → 工厂函数() → defineTool(def) → toolInstance2 (0x2000) ← 新对象
```

**关系**：`createSchedulesBatchTool !== registry.create('create_schedules_batch')`（不同引用）

---

## 4. 为什么要这样设计？

### tool() 设计意图

- **简单场景**：工具配置固定，不需要动态参数
- **性能优化**：复用同一个实例，避免重复创建
- **内存效率**：只有一个实例存在

### defineTool() 设计意图

- **灵活配置**：支持 `config` 参数，可以根据不同配置创建不同实例
- **动态工具**：例如 `task_run` 需要传入 `templates` 配置
- **隔离性**：每次创建新实例，避免状态污染

### 实际案例：task_run 工具

```typescript
// src/tools/task_run/index.ts
export function createTaskRunTool(templates: AgentTemplate[]) {
  const TaskRun = tool({
    name: 'task_run',
    description: DESCRIPTION,
    // ...
  });

  TaskRun.prompt = generatePrompt(templates);  // 根据 templates 生成 prompt
  
  return TaskRun;
}

// 使用时可能需要不同的 templates 配置
const tool1 = registry.create('task_run', { templates: [template1, template2] });
const tool2 = registry.create('task_run', { templates: [template3, template4] });
```

这种场景下，需要能够根据 config 动态创建实例。

---

## 5. 解决方案

### 方案 1：在定义时传入 prompt（推荐）

```typescript
export const createSchedulesBatchTool = defineTool({
  name: 'create_schedules_batch',
  description: DESCRIPTION,
  prompt: PROMPT,  // ← 在这里传入
  params: { /* ... */ },
  attributes: { readonly: false },
  async exec(args, ctx) { /* ... */ },
});
```

**原理**：`prompt` 在 `def` 对象中，每次 `defineTool(def)` 都会包含它。

### 方案 2：改用 tool() 函数

如果不需要动态配置，可以使用 `tool()`：

```typescript
import { tool } from '../../../src';
import { z } from 'zod';

export const createSchedulesBatchTool = tool({
  name: 'create_schedules_batch',
  description: DESCRIPTION,
  parameters: z.object({
    date: z.string(),
    natural_language: z.string(),
    slot_interval: z.number().optional(),
  }),
  async execute(args, ctx) { /* ... */ },
});

createSchedulesBatchTool.prompt = PROMPT;  // 这样可以
```

**原理**：`tool()` 注册的工厂函数返回单例，事后修改有效。

---

## 6. 检查方法

### 代码检查

```bash
# 查找使用 defineTool 但事后添加 prompt 的文件
grep -r "defineTool" kode-sdk/server --include="*.ts" -A 30 | grep -B 30 "\.prompt = "
```

### 运行时验证

```typescript
// 在 agent 初始化后，检查工具是否有 prompt
const tools = agent.tools;  // 获取所有工具
for (const [name, tool] of tools) {
  if (!tool.prompt) {
    console.warn(`⚠️  工具 ${name} 没有 prompt`);
  }
}
```

---

## 总结

| 维度 | tool() | defineTool() |
|------|--------|--------------|
| **工厂函数返回** | `() => toolInstance` | `(config) => defineTool(def, config)` |
| **闭包捕获** | toolInstance（实例） | def（定义） |
| **每次调用** | 返回同一个对象 | 创建新对象 |
| **事后修改** | 有效（修改原对象） | 无效（新对象不包含修改） |
| **适用场景** | 静态配置 | 动态配置 |

**根本原因**：
- `tool()` 是**单例模式**，工厂函数返回同一个实例引用
- `defineTool()` 是**工厂模式**，工厂函数每次创建新实例

**解决办法**：
- 对于 `defineTool()`，必须在定义对象（`def`）中包含 `prompt` 字段
- 事后添加的属性不会被闭包捕获的 `def` 对象包含，因此不会出现在新创建的实例中

