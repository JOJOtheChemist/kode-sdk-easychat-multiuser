# KODE SDK API调用方式详解 - 笔记 #2

## 1. KODE SDK架构理解

KODE SDK是一个**事件驱动的Agent运行时框架**，具有以下核心特性：

### 1.1 核心组件
- **Agent** - 智能代理实例，负责对话和工具调用
- **EventBus** - 事件总线，处理三通道事件流
- **ToolRegistry** - 工具注册表，管理可用工具
- **Store** - 持久化存储（JSONStore）
- **Sandbox** - 沙箱环境，控制文件系统访问

### 1.2 核心API调用方式

#### Agent创建
```typescript
const agent = await Agent.create({
  templateId: 'html-creator',
  sandbox: { 
    kind: 'local', 
    workDir: './html-workspace', 
    enforceBoundary: true 
  },
}, deps);
```

#### 消息发送（多轮对话）
```typescript
await agent.send('建立一个html文件，里面写上点加号能增加数字');
```

#### 事件订阅
```typescript
for await (const envelope of agent.subscribe(['progress'])) {
  if (envelope.event.type === 'text_chunk') {
    process.stdout.write(envelope.event.delta);
  }
}
```

### 1.3 依赖注入系统
```typescript
const deps: AgentDependencies = {
  store: new JSONStore('./.kode-html-test'),
  templateRegistry: templates,
  sandboxFactory: new SandboxFactory(),
  toolRegistry: tools,
  modelFactory: (config: ModelConfig) => new GLMProvider(apiKey, model),
};
```

## 2. 工具系统

### 2.1 内置工具分类
- **文件系统工具**：fs_read, fs_write, fs_edit, fs_glob, fs_grep, fs_multi_edit
- **Bash工具**：bash_run, bash_kill, bash_logs
- **Todo工具**：todo_read, todo_write
- **任务工具**：task_run

### 2.2 工具注册
```typescript
for (const tool of [...builtin.fs(), ...builtin.todo()]) {
  tools.register(tool.name, () => tool);
}
```

### 2.3 模板配置
```typescript
templates.register({
  id: 'html-creator',
  systemPrompt: '你是一个前端开发助手，能够创建HTML文件并响应用户的需求。',
  tools: ['fs_read', 'fs_write', 'fs_edit', 'todo_read', 'todo_write'],
  model: glmModel,
  runtime: { todo: { enabled: true, reminderOnStart: false } },
});
```

## 3. 事件驱动架构

### 3.1 三通道事件系统
- **Progress通道**：数据面，文本流和工具生命周期
- **Monitor通道**：治理面，审计日志和状态变更
- **Control通道**：审批面，权限请求和决策

### 3.2 主要事件类型
- `text_chunk_start/text_chunk/text_chunk_end` - 文本流
- `tool:start/tool:end/tool:error` - 工具生命周期
- `state_changed` - Agent状态变更
- `tool_executed` - 工具执行完成
- `file_changed` - 文件变更监控

---
*创建时间：2025-10-14*
*测试状态：架构分析完成*