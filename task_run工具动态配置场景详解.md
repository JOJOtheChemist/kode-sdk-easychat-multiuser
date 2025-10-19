# task_run 工具动态配置场景详解

## 核心问题

**为什么同一个 task_run 工具，需要不同配置来创建不同能力的子 Agent？**

---

## 1. 现实世界类比 👔

### 场景：公司项目经理

你是一个项目经理（主 Agent），需要把任务委托给不同的员工（子 Agent）：

#### 情况 A：软件开发项目

```
项目经理（主 Agent）
  ├─ 需要的员工类型：
  │   ├─ 前端工程师（能用：React, CSS, HTML）
  │   ├─ 后端工程师（能用：Node.js, Database, API）
  │   └─ 测试工程师（能用：Jest, Selenium, 测试工具）
  │
  └─ 不需要的员工：
      ✗ 会计（不需要财务工具）
      ✗ 设计师（不需要设计工具）
```

#### 情况 B：财务审计项目

```
项目经理（主 Agent）
  ├─ 需要的员工类型：
  │   ├─ 会计师（能用：Excel, 财务软件, 报表工具）
  │   ├─ 审计员（能用：审计工具, 数据分析）
  │   └─ 税务专家（能用：税务系统, 法规查询）
  │
  └─ 不需要的员工：
      ✗ 前端工程师（不需要写代码）
      ✗ 测试工程师（不需要测试软件）
```

**关键问题**：同一个"委派任务"的能力，但在不同项目中能委派的员工类型完全不同！

这就是为什么需要动态配置。

---

## 2. Kode SDK 实际场景

### 场景 1：代码重构项目 💻

#### 业务需求

用户说："帮我重构这个 Node.js 项目，改进代码质量"

#### 主 Agent 的工作流程

```typescript
主 Agent 接收任务："重构 Node.js 项目"
  ↓
分析：这是个大任务，需要委派给子 Agent
  ↓
调用 task_run 创建子 Agent
  ↓
问题：子 Agent 应该有什么能力？
  ↓
需要的能力：
  ✅ fs_read  - 读取代码文件
  ✅ fs_write - 写入重构后的代码
  ✅ fs_edit  - 编辑代码
  ✅ grep     - 搜索代码模式
  ✅ run_test - 运行测试确保重构正确
  
不需要的能力：
  ❌ sql_query      - 不需要查询数据库
  ❌ send_email     - 不需要发邮件
  ❌ create_chart   - 不需要做图表
  ❌ web_scraping   - 不需要爬网页
```

#### 配置

```typescript
const codeProjectTaskRun = createTaskRunTool({
  templates: [
    {
      id: 'code-refactor',
      tools: ['fs_read', 'fs_write', 'fs_edit', 'grep', 'run_test'],
      whenToUse: '当需要重构或修改代码时使用',
    },
    {
      id: 'code-review',
      tools: ['fs_read', 'grep', 'lint'],
      whenToUse: '当需要审查代码质量时使用',
    },
  ],
});

// 主 Agent 使用
const codeAgent = new Agent({
  tools: [codeProjectTaskRun, 'fs_read', 'terminal'],
});

await codeAgent.run('重构 user.ts 文件');

// 内部执行：
// 1. 主 Agent 理解任务
// 2. 调用 task_run({
//      agentTemplateId: 'code-refactor',  // 选择代码重构专家
//      prompt: '重构 user.ts，改进代码质量'
//    })
// 3. 创建子 Agent，只有文件操作能力
// 4. 子 Agent 完成重构
// 5. 返回结果给主 Agent
```

---

### 场景 2：数据分析项目 📊

#### 业务需求

用户说："分析最近 30 天的用户行为数据，生成可视化报告"

#### 主 Agent 的工作流程

```typescript
主 Agent 接收任务："分析用户行为数据"
  ↓
分析：需要处理数据库和生成图表
  ↓
调用 task_run 创建子 Agent
  ↓
问题：子 Agent 应该有什么能力？
  ↓
需要的能力：
  ✅ sql_query      - 查询用户数据
  ✅ data_analysis  - 统计分析
  ✅ create_chart   - 生成图表
  ✅ export_pdf     - 导出报告
  
不需要的能力：
  ❌ fs_write       - 不需要写代码文件
  ❌ fs_edit        - 不需要编辑代码
  ❌ run_test       - 不需要运行测试
  ❌ grep           - 不需要搜索代码
```

#### 配置

```typescript
const dataProjectTaskRun = createTaskRunTool({
  templates: [
    {
      id: 'data-analyst',
      tools: ['sql_query', 'data_analysis', 'create_chart', 'export_pdf'],
      whenToUse: '当需要分析数据并生成报告时使用',
    },
    {
      id: 'ml-engineer',
      tools: ['sql_query', 'train_model', 'predict', 'evaluate'],
      whenToUse: '当需要训练机器学习模型时使用',
    },
  ],
});

// 主 Agent 使用
const dataAgent = new Agent({
  tools: [dataProjectTaskRun, 'sql_query'],
});

await dataAgent.run('分析用户行为并生成报告');

// 内部执行：
// 1. 主 Agent 理解任务
// 2. 调用 task_run({
//      agentTemplateId: 'data-analyst',  // 选择数据分析专家
//      prompt: '分析最近30天用户行为，生成可视化报告'
//    })
// 3. 创建子 Agent，只有数据分析能力
// 4. 子 Agent 查询数据库、分析、生成图表
// 5. 返回报告给主 Agent
```

---

## 3. 完整对话流程示例

### 场景：全栈开发项目 🚀

用户："帮我开发一个用户管理系统，包括前端界面、后端 API 和数据库"

#### 第一步：主 Agent 分析任务

```typescript
主 Agent 思考：
"这是一个复杂的全栈项目，需要分成多个子任务：
1. 设计数据库表结构
2. 开发后端 API
3. 开发前端界面
4. 编写测试
我需要委派给不同的专家子 Agent"
```

#### 第二步：主 Agent 配置了不同的子 Agent 模板

```typescript
const fullStackTaskRun = createTaskRunTool({
  templates: [
    {
      id: 'database-designer',
      tools: ['sql_query', 'create_table', 'create_migration'],
      whenToUse: '设计数据库架构时使用',
    },
    {
      id: 'backend-developer',
      tools: ['fs_read', 'fs_write', 'fs_edit', 'run_test'],
      whenToUse: '开发后端 API 时使用',
    },
    {
      id: 'frontend-developer',
      tools: ['fs_read', 'fs_write', 'fs_edit', 'browser_preview'],
      whenToUse: '开发前端界面时使用',
    },
    {
      id: 'tester',
      tools: ['run_test', 'integration_test', 'performance_test'],
      whenToUse: '编写和运行测试时使用',
    },
  ],
});
```

#### 第三步：主 Agent 依次委派任务

```typescript
// 任务 1: 设计数据库
await taskRun({
  agentTemplateId: 'database-designer',  // 数据库专家
  prompt: '设计用户管理系统的数据库表结构，包括用户表、角色表、权限表'
});
// → 创建的子 Agent 只能用 sql_query, create_table, create_migration
// → 子 Agent 设计并创建数据库表

// 任务 2: 开发后端 API
await taskRun({
  agentTemplateId: 'backend-developer',  // 后端开发专家
  prompt: '基于数据库表结构，开发 RESTful API，包括用户 CRUD、认证、权限控制'
});
// → 创建的子 Agent 只能用 fs_read, fs_write, fs_edit, run_test
// → 子 Agent 编写后端代码和单元测试

// 任务 3: 开发前端界面
await taskRun({
  agentTemplateId: 'frontend-developer',  // 前端开发专家
  prompt: '开发用户管理的前端界面，包括登录页、用户列表、用户详情、权限设置'
});
// → 创建的子 Agent 只能用 fs_read, fs_write, fs_edit, browser_preview
// → 子 Agent 编写前端代码并预览

// 任务 4: 集成测试
await taskRun({
  agentTemplateId: 'tester',  // 测试专家
  prompt: '编写集成测试，测试前后端完整流程'
});
// → 创建的子 Agent 只能用 run_test, integration_test, performance_test
// → 子 Agent 编写并运行测试
```

---

## 4. 为什么不能所有子 Agent 都有全部工具？

### 问题：如果所有子 Agent 都能用所有工具

```typescript
// 错误做法：所有子 Agent 都有全部工具
const badTaskRun = createTaskRunTool({
  templates: [
    {
      id: 'all-powerful',
      tools: [
        'fs_read', 'fs_write', 'fs_edit',      // 文件操作
        'sql_query', 'create_table',           // 数据库
        'send_email', 'web_scraping',          // 网络操作
        'train_model', 'predict',              // 机器学习
        'create_chart', 'export_pdf',          // 数据可视化
        // ... 还有几十个工具
      ],
      whenToUse: '任何时候都用这个',
    },
  ],
});
```

#### 导致的问题：

**1. 安全风险 🚨**

```typescript
// 场景：只是想分析数据
await taskRun({
  agentTemplateId: 'all-powerful',
  prompt: '分析用户数据'
});

// 危险：子 Agent 有所有权限
// - 可以删除文件（fs_write）
// - 可以修改数据库（create_table）
// - 可以发送邮件（send_email）
// - 可以爬取网页（web_scraping）
// 
// 如果 Agent 犯错或被攻击，后果严重！
```

**2. 效率低下 🐌**

```typescript
// 问题：Agent 需要在几十个工具中选择
主 Agent: "帮我读取 user.ts 文件"

子 Agent 思考：
"我有 50 个工具可以用：
- fs_read？
- fs_write？
- sql_query？
- send_email？
- ... 还是什么？"

// 工具太多，选择困难，效率低
// 就像给一个只需要锤子的人一个装满工具的工具箱
```

**3. 成本高 💰**

```typescript
// 每次调用 AI 模型都要传所有工具的定义
系统提示（system prompt）：
"你可以使用以下 50 个工具：
1. fs_read: ...（200 字说明）
2. fs_write: ...（200 字说明）
3. sql_query: ...（200 字说明）
...
50. export_pdf: ...（200 字说明）"

总计：50 × 200 = 10,000 字的工具说明
每次调用都要传这么多 tokens，成本高！
```

**4. 容易出错 ❌**

```typescript
// 场景：让子 Agent 分析数据
await taskRun({
  agentTemplateId: 'all-powerful',
  prompt: '分析销售数据并生成报告'
});

// 预期：
// - 查询数据库
// - 分析数据
// - 生成图表
// - 导出 PDF

// 实际可能发生：
// - 查询数据库 ✓
// - 分析数据 ✓
// - 生成图表 ✓
// - 然后突然开始修改代码文件（因为它也能用 fs_edit）❌
// - 或者发送邮件（因为它也能用 send_email）❌
// 
// 工具太多，容易误用！
```

---

### 正确做法：按需分配工具 ✅

```typescript
const smartTaskRun = createTaskRunTool({
  templates: [
    {
      id: 'data-analyst',
      tools: ['sql_query', 'data_analysis', 'create_chart', 'export_pdf'],
      whenToUse: '分析数据时使用',
    },
    {
      id: 'code-developer',
      tools: ['fs_read', 'fs_write', 'fs_edit', 'run_test'],
      whenToUse: '开发代码时使用',
    },
  ],
});

// 场景：分析数据
await taskRun({
  agentTemplateId: 'data-analyst',
  prompt: '分析销售数据'
});
// ✅ 子 Agent 只有 4 个工具，专注于数据分析
// ✅ 不会误操作文件系统
// ✅ 系统提示更短，成本更低
// ✅ 选择更简单，效率更高
```

---

## 5. 真实业务场景对比

### 场景：电商网站维护

#### 任务 A：修复商品详情页 bug

```typescript
// 需要的能力：
- 阅读代码
- 编辑代码
- 运行测试

// 不需要的能力：
- 查询数据库
- 发送邮件
- 生成报表

// 配置
const bugFixAgent = createTaskRunTool({
  templates: [{
    id: 'bug-fixer',
    tools: ['fs_read', 'fs_edit', 'run_test'],
  }],
});
```

#### 任务 B：分析用户购买行为

```typescript
// 需要的能力：
- 查询数据库
- 数据分析
- 生成图表

// 不需要的能力：
- 编辑代码
- 运行测试
- 修改文件

// 配置
const dataAnalysisAgent = createTaskRunTool({
  templates: [{
    id: 'data-analyst',
    tools: ['sql_query', 'data_analysis', 'create_chart'],
  }],
});
```

#### 任务 C：发送营销邮件

```typescript
// 需要的能力：
- 查询用户列表
- 发送邮件
- 记录日志

// 不需要的能力：
- 编辑代码
- 数据分析
- 生成图表

// 配置
const marketingAgent = createTaskRunTool({
  templates: [{
    id: 'email-marketer',
    tools: ['sql_query', 'send_email', 'log'],
  }],
});
```

**关键点**：
- 同一个网站项目
- 不同的任务
- 需要不同能力的 Agent
- 如果都给全部工具，既不安全也不高效

---

## 6. 类比总结 🎓

### 就像学校里的老师

```
校长（主 Agent）需要安排老师（子 Agent）上课

数学课：
  ✅ 需要：数学老师（能用数学工具）
  ❌ 不给：体育器材、化学实验室、画笔

体育课：
  ✅ 需要：体育老师（能用体育器材）
  ❌ 不给：数学公式、化学药品、画笔

美术课：
  ✅ 需要：美术老师（能用画笔、颜料）
  ❌ 不给：数学公式、体育器材、化学药品
```

**为什么不能每个老师都有所有工具？**
- ❌ 浪费资源
- ❌ 不安全（化学老师不需要体育器材）
- ❌ 效率低（选择困难）
- ✅ 按需分配，专业的人做专业的事

---

## 7. 核心要点

### 为什么需要动态配置？

```
同一个项目，不同阶段，需要不同能力的子 Agent

开发阶段 → 子 Agent 需要：代码编辑工具
测试阶段 → 子 Agent 需要：测试工具
部署阶段 → 子 Agent 需要：部署工具
监控阶段 → 子 Agent 需要：监控工具
```

### 好处

1. **安全性** 🔒：最小权限原则
2. **效率** ⚡：工具少，选择快
3. **成本** 💰：tokens 少，费用低
4. **准确性** 🎯：专注任务，不易出错
5. **可维护** 🔧：配置清晰，易于管理

---

## 总结

**为什么同一个 task_run 工具需要不同配置？**

因为：
- ✅ 不同任务需要不同能力
- ✅ 不同项目需要不同工具集
- ✅ 安全、效率、成本的考虑
- ✅ 专业的 Agent 做专业的事

**就像**：
- 项目经理根据项目类型配置不同的团队成员
- 校长根据课程类型安排不同的老师
- 厨师长根据菜品类型配置不同的厨师

**核心思想**：按需分配，专业化，避免"大而全"带来的问题。

