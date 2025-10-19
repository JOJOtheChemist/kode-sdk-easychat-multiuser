# "动态" vs "模板" - 终极澄清

## 核心问题 🎯

1. **"动态"和"模板"到底什么区别？**
2. **变化的参数是谁创建的？人类还是 Agent？**
3. **模板一直存在，那动态的是什么？**

---

## 答案

### 关键理解：三个不同的"动态"

```
动态 1：开发者可以写不同配置的代码（开发时）
动态 2：Agent 可以选择不同的模板（运行时）
动态 3：每次调用创建新的子 Agent（运行时）
```

让我逐个解释：

---

## 动态 1：开发者的灵活配置（开发时）

### 这个"动态"指的是什么？

**`defineTool()` 允许开发者根据不同项目需求，写不同的配置代码**

#### 场景 A：代码项目

```typescript
// 文件：code-project/agent-setup.ts
// 开发者为代码项目写的配置

const codeProjectTaskRun = createTaskRunTool({
  templates: [  // ← 开发者写死的配置
    {
      id: 'code-expert',
      tools: ['fs_read', 'fs_write', 'fs_edit'],
    },
    {
      id: 'test-expert',
      tools: ['run_test', 'coverage'],
    },
  ],
});

const codeAgent = new Agent({
  tools: [codeProjectTaskRun],
});
```

#### 场景 B：数据项目

```typescript
// 文件：data-project/agent-setup.ts
// 开发者为数据项目写的不同配置

const dataProjectTaskRun = createTaskRunTool({
  templates: [  // ← 开发者写了不同的配置
    {
      id: 'data-analyst',
      tools: ['sql_query', 'data_analysis', 'create_chart'],
    },
    {
      id: 'ml-engineer',
      tools: ['train_model', 'predict'],
    },
  ],
});

const dataAgent = new Agent({
  tools: [dataProjectTaskRun],
});
```

**关键点**：
- ✅ 开发者写代码时，可以根据项目需求配置不同的模板
- ✅ 这个"灵活配置能力"就是 `defineTool()` 的"动态"
- ❌ Agent 运行时不能修改这些配置

---

## 动态 2：Agent 的选择（运行时）

### 模板一直存在，Agent 只能选择

```typescript
// 开发者配置（固定，不可变）
const taskRun = createTaskRunTool({
  templates: [
    { id: 'database-designer', tools: ['sql_query', 'create_table'] },
    { id: 'backend-developer', tools: ['fs_read', 'fs_write'] },
    { id: 'frontend-developer', tools: ['fs_read', 'browser_preview'] },
  ],
});

// Agent 运行
await agent.run('开发用户管理系统');

// -------- Agent 的决策过程 --------
/*
Agent 思考：
"我需要：
1. 设计数据库 → 应该用 database-designer 模板
2. 开发后端 → 应该用 backend-developer 模板
3. 开发前端 → 应该用 frontend-developer 模板"
*/

// Agent 的决策（从现有模板中选择）
await taskRun.exec({
  agentTemplateId: 'database-designer',  // ← Agent 选择了这个
  prompt: '设计用户表'
});

await taskRun.exec({
  agentTemplateId: 'backend-developer',  // ← Agent 选择了这个
  prompt: '开发 CRUD API'
});
```

**关键点**：
- ✅ 模板列表是固定的（开发者写的）
- ✅ Agent 只能从列表中选择
- ❌ Agent 不能创建新模板
- ❌ Agent 不能修改模板配置

---

## 动态 3：工具创建子 Agent（运行时）

```typescript
// 每次调用 task_run，都创建新的子 Agent

// 第一次调用
await taskRun.exec({
  agentTemplateId: 'backend-developer',
  prompt: '创建 user.ts'
});
// → 创建子 Agent A，完成后销毁

// 第二次调用
await taskRun.exec({
  agentTemplateId: 'backend-developer',  // 同一个模板
  prompt: '创建 order.ts'
});
// → 创建子 Agent B（新的），完成后销毁
```

**关键点**：
- ✅ 每次调用都创建新的 Agent 实例
- ✅ 这些 Agent 是临时的
- ✅ 但用的是同一个模板配置

---

## 完整流程图解

```
┌─────────────────────────────────────────────────────────┐
│ 阶段 1：开发时（人类写代码）                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  // 代码项目的开发者写的代码                             │
│  const codeTaskRun = createTaskRunTool({                │
│    templates: [                                         │
│      { id: 'code-expert', tools: ['fs_read', 'fs_write'] }  │
│    ]                                                    │
│  });                                                    │
│                                                         │
│  // 数据项目的开发者写的代码                             │
│  const dataTaskRun = createTaskRunTool({                │
│    templates: [                                         │
│      { id: 'data-analyst', tools: ['sql_query'] }      │
│    ]                                                    │
│  });                                                    │
│                                                         │
│  ✓ 不同项目，开发者写不同配置                           │
│  ✓ 这是 defineTool() 的"动态"灵活性                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          │
                          │ 代码写好后，模板固定
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 阶段 2：运行时（Agent 选择）                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  用户："帮我重构代码"                                   │
│    ↓                                                    │
│  Agent 分析任务                                         │
│    ↓                                                    │
│  Agent 决策："应该用 code-expert 模板"                  │
│    ↓                                                    │
│  Agent 调用：task_run({ agentTemplateId: 'code-expert' })  │
│                                                         │
│  ✓ Agent 从预设模板中选择                               │
│  ✗ Agent 不能创建新模板                                 │
│  ✗ Agent 不能修改模板配置                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          │
                          │ 调用工具
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 阶段 3：工具执行（自动创建子 Agent）                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  task_run 工具：                                        │
│    1. 读取 'code-expert' 模板配置                       │
│    2. 创建子 Agent，给它 ['fs_read', 'fs_write']        │
│    3. 子 Agent 执行任务                                 │
│    4. 任务完成，销毁子 Agent                            │
│                                                         │
│  ✓ 每次调用都创建新的子 Agent（临时）                   │
│  ✓ 但模板配置是固定的                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 对比：tool() vs defineTool()

### tool() - 所有项目用同一配置

```typescript
// ========== 开发者只能写一种配置 ==========

// 所有项目都必须用这个配置
const fixedTaskRun = tool({
  name: 'task_run',
  templates: [
    { id: 'code-expert', tools: ['fs_read'] }  // 写死
  ],
  // ...
});

// 代码项目
const codeAgent = new Agent({
  tools: [fixedTaskRun]  // 被迫用这个配置
});

// 数据项目
const dataAgent = new Agent({
  tools: [fixedTaskRun]  // 还是这个配置，无法改变
});

// ❌ 问题：数据项目也只能创建 code-expert 子 Agent
//    但 code-expert 只有文件操作工具，不能查数据库
```

### defineTool() - 不同项目可以不同配置

```typescript
// ========== 开发者可以为不同项目写不同配置 ==========

// 代码项目的配置
const codeTaskRun = createTaskRunTool({
  templates: [
    { id: 'code-expert', tools: ['fs_read', 'fs_write'] }
  ]
});

const codeAgent = new Agent({
  tools: [codeTaskRun]
});

// 数据项目的配置（不同！）
const dataTaskRun = createTaskRunTool({
  templates: [
    { id: 'data-analyst', tools: ['sql_query', 'create_chart'] }
  ]
});

const dataAgent = new Agent({
  tools: [dataTaskRun]
});

// ✓ 代码项目：只能创建 code-expert 子 Agent（文件操作）
// ✓ 数据项目：只能创建 data-analyst 子 Agent（数据分析）
// ✓ 各得其所！
```

---

## 回答你的问题

### Q1: "动态"和"模板"的区别是什么？

**答**：

- **模板 = 固定配置**（开发者写死的）
  ```
  { id: 'code-expert', tools: ['fs_read', 'fs_write'] }
  ```

- **动态 = 开发者可以灵活配置不同模板**
  ```
  代码项目 → 配置 code-expert 模板
  数据项目 → 配置 data-analyst 模板
  ```

### Q2: 变化的参数是谁创建的？

**答**：**人类（开发者）创建的，不是 Agent**

```typescript
// 开发者写代码
const taskRun = createTaskRunTool({
  templates: [  // ← 开发者写的参数
    { id: 'xxx', tools: ['aaa', 'bbb'] }
  ]
});

// Agent 运行时
await agent.run('做任务');
// Agent 只能：选择 'xxx' 模板
// Agent 不能：创建新模板、修改 tools 列表
```

### Q3: 模板一直存在，那动态的是什么？

**答**：有两层"动态"

1. **开发时动态**：开发者可以为不同项目写不同配置
   ```typescript
   // 项目 A
   createTaskRunTool({ templates: [模板A, 模板B] })
   
   // 项目 B
   createTaskRunTool({ templates: [模板C, 模板D] })
   ```

2. **运行时动态**：Agent 从预设模板中选择
   ```typescript
   Agent 选择：模板 A 还是模板 B？
   ```

---

## 实际代码示例

### 完整流程

```typescript
// ==========================================
// 第一步：开发者写配置代码（静态，人类写的）
// ==========================================

// 开发者决定：这个项目的 task_run 有哪些模板
const taskRun = createTaskRunTool({
  templates: [
    {
      id: 'database-designer',
      tools: ['sql_query', 'create_table'],
      whenToUse: '设计数据库时',
    },
    {
      id: 'backend-developer',
      tools: ['fs_read', 'fs_write', 'run_test'],
      whenToUse: '开发代码时',
    },
  ],
});

// 开发者创建 Agent
const agent = new Agent({
  tools: [taskRun],
});

// ==========================================
// 第二步：Agent 运行（动态，AI 决策）
// ==========================================

await agent.run('开发用户管理系统');

// Agent 的内部思考过程
/*
"用户要开发用户管理系统，需要：
1. 设计数据库 → 我看到有 database-designer 模板
2. 开发代码 → 我看到有 backend-developer 模板

决策：
步骤 1 用 database-designer
步骤 2 用 backend-developer"
*/

// Agent 执行决策
const result1 = await taskRun.exec({
  agentTemplateId: 'database-designer',  // ← Agent 选择（从预设中选）
  prompt: '设计用户、角色、权限表',     // ← Agent 决定任务描述
});

const result2 = await taskRun.exec({
  agentTemplateId: 'backend-developer',  // ← Agent 选择（从预设中选）
  prompt: '开发用户 CRUD API',           // ← Agent 决定任务描述
});

// ==========================================
// 第三步：工具自动执行
// ==========================================

// taskRun.exec() 内部：
// 1. 读取指定模板的配置
// 2. 根据配置创建子 Agent
// 3. 子 Agent 完成任务
// 4. 返回结果
```

---

## 关键总结

### 谁做什么？

| 角色 | 能做的 | 不能做的 |
|------|--------|---------|
| **开发者** | ✅ 为不同项目写不同配置代码 | - |
| | ✅ 定义模板列表 | - |
| | ✅ 配置每个模板的工具 | - |
| **Agent** | ✅ 从预设模板中选择 | ❌ 创建新模板 |
| | ✅ 决定任务描述（prompt）| ❌ 修改模板配置 |
| | ✅ 决定调用顺序 | ❌ 改变工具列表 |
| **工具** | ✅ 根据模板创建子 Agent | - |
| | ✅ 管理子 Agent 生命周期 | - |

### 什么是固定的，什么是变化的？

**固定（静态）**：
- ✅ 模板列表（开发者写死）
- ✅ 每个模板的工具列表（开发者写死）
- ✅ Agent 可用的工具（开发者分配）

**变化（动态）**：
- ✅ 开发者为不同项目写不同配置（开发时）
- ✅ Agent 选择哪个模板（运行时）
- ✅ Agent 决定任务描述（运行时）
- ✅ 每次调用创建新的子 Agent（运行时）

---

## 最终类比

### 餐厅点餐

```
老板（开发者）：
  - 设计菜单（定义模板）
  - 每道菜的食材固定（tools 列表）
  ✓ 不同餐厅可以有不同菜单（动态配置）

顾客（Agent）：
  - 看菜单点菜（从模板中选择）
  - 告诉服务员要什么（prompt）
  ✗ 不能自己设计新菜
  ✗ 不能改变食材

厨房（工具）：
  - 按照菜单做菜（创建子 Agent）
  - 用固定的食材（tools）
  - 做完上菜，收盘子（销毁 Agent）
```

---

## 核心答案

**"动态"指的是**：
1. 开发者可以为不同项目写不同配置代码（开发时灵活）
2. Agent 可以从预设模板中选择（运行时选择）

**"模板"指的是**：
- 开发者预定义的配置，固定不变

**变化的参数**：
- ✅ 人类（开发者）创建的
- ❌ 不是 Agent 创建的

**Agent 唯一的动态能力**：
- 从开发者预设的模板中选择
- 决定任务描述

**Agent 做不到的**：
- 创建新模板
- 修改模板配置
- 改变工具列表

