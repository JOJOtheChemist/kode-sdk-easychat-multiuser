# KODE Frontend - AI 对话系统前端

基于 React + TypeScript + Material-UI 构建的现代化 AI 对话界面，完美对接 KODE SDK 后端。

## 🚀 核心功能

### 💬 多轮对话
- **实时流式响应**：打字机效果显示 AI 回复
- **上下文管理**：自动维护对话历史和上下文
- **断点续传**：支持网络重连后恢复对话
- **消息序号**：显示对话轮次和书签信息

### 🔧 工具调用可视化
- **实时状态显示**：工具执行状态和进度
- **输入输出展示**：详细的工具参数和结果
- **执行时间统计**：工具调用耗时分析
- **中断控制**：支持中断正在执行的工具

### 📊 Agent 状态监控
- **实时状态**：READY/WORKING/PAUSED 状态显示
- **对话统计**：消息数量、步数、光标位置
- **系统信息**：Agent ID、模板、创建时间
- **元数据展示**：自定义配置和标签

### 🎨 现代化 UI
- **响应式设计**：适配桌面和移动设备
- **Material Design**：遵循 Material Design 规范
- **主题定制**：支持亮色/暗色主题切换
- **无障碍访问**：完整的可访问性支持

## 🏗️ 项目结构

```
kode-frontend/
├── src/
│   ├── components/          # UI 组件
│   │   ├── MessageBubble.tsx    # 消息气泡组件
│   │   ├── ChatInput.tsx        # 对话输入组件
│   │   ├── ChatContainer.tsx    # 对话容器组件
│   │   ├── ToolCallDisplay.tsx  # 工具调用展示组件
│   │   └── AgentStatusDisplay.tsx # Agent状态显示组件
│   ├── services/           # API 服务
│   │   └── api.ts              # KODE SDK API 封装
│   ├── types/              # TypeScript 类型定义
│   │   └── kode.ts             # KODE SDK 相关类型
│   ├── hooks/              # React Hooks
│   │   └── useChat.ts          # 对话状态管理
│   ├── utils/              # 工具函数
│   ├── App.tsx             # 主应用组件
│   └── main.tsx            # 应用入口
├── public/                 # 静态资源
├── package.json            # 项目配置
├── vite.config.ts          # Vite 配置
└── tsconfig.json           # TypeScript 配置
```

## 🔌 API 对接设计

### 核心 API 接口

```typescript
// Agent 管理
POST   /api/agents                    // 创建 Agent
POST   /api/agents/:id/resume         // 恢复 Agent
GET    /api/agents/:id/status         // 获取 Agent 状态
GET    /api/agents/:id/info           // 获取 Agent 信息

// 消息交互
GET    /api/agents/:id/chat          // 发送消息 (SSE流式响应)
POST   /api/agents/:id/interrupt     // 中断执行
POST   /api/agents/:id/snapshot      // 创建快照

// 工具和模板
GET    /api/templates                 // 获取可用模板
```

### 事件流处理

```typescript
// Server-Sent Events 事件类型
interface ProgressEvent {
  type: 'text_chunk' | 'think_chunk' | 'tool:start' | 'tool:end' | 'done';
  data: any;
  bookmark?: Bookmark;
}
```

## 🎯 特色功能

### 📝 对话管理
- [x] **消息气泡**：用户/AI/系统/工具消息区分显示
- [x] **打字机效果**：逐字显示 AI 回复
- [x] **思考过程**：显示 AI 推理过程
- [x] **消息操作**：复制、重新生成、停止
- [ ] **对话导出**：支持 Markdown/JSON 格式导出
- [ ] **搜索功能**：对话历史内容搜索
- [ ] **标签系统**：对话分类和标记

### 🔧 工具系统
- [x] **工具调用监控**：实时显示工具执行状态
- [x] **参数展示**：格式化显示工具输入输出
- [x] **错误处理**：详细的错误信息和建议
- [x] **中断控制**：支持中断长时间运行的工具
- [ ] **自定义工具**：用户自定义工具注册界面
- [ ] **工具统计**：工具使用频率和效率分析

### 📊 状态监控
- [x] **Agent 状态**：实时显示运行状态
- [x] **对话统计**：消息数量、轮次统计
- [x] **性能监控**：步数、时间戳记录
- [x] **元数据展示**：自定义配置信息
- [ ] **性能图表**：对话质量、响应时间趋势图
- [ ] **告警系统**：异常状态自动通知

### 🎨 用户界面
- [x] **响应式布局**：适配各种屏幕尺寸
- [x] **侧边栏**：Agent 状态和工具记录
- [x] **滚动控制**：自动滚动和回到顶部
- [x] **状态指示器**：清晰的状态反馈
- [ ] **主题切换**：亮色/暗色主题
- [ ] **国际化**：多语言支持
- [ ] **快捷键**：键盘快捷操作

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 预览生产版本
```bash
npm run preview
```

## ⚙️ 配置说明

### 环境变量
```bash
# API 基础地址
VITE_API_BASE_URL=http://localhost:8080

# 可选：主题配置
VITE_DEFAULT_THEME=light
```

### 代理配置
开发环境已配置 Vite 代理，自动转发 `/api` 请求到后端服务器。

## 🔧 技术栈

- **React 18** - 现代化 React 框架
- **TypeScript** - 类型安全的 JavaScript
- **Material-UI v5** - Google Material Design UI 库
- **Vite** - 快速的构建工具
- **Axios** - HTTP 客户端
- **EventSource** - Server-Sent Events 支持

## 🎨 设计理念

1. **用户体验优先**：流畅的交互和清晰的反馈
2. **实时响应**：充分利用 KODE SDK 的流式响应能力
3. **状态透明**：清晰显示 AI 和工具的执行状态
4. **可扩展性**：模块化设计，易于添加新功能
5. **无障碍访问**：遵循 WCAG 可访问性标准

## 📱 移动端适配

- 响应式布局自动适配移动设备
- 触摸友好的交互设计
- 优化的虚拟键盘处理
- 移动端专用的手势操作

## 🔮 未来规划

### 短期目标
- [ ] 对话历史持久化
- [ ] 工具使用统计图表
- [ ] 快捷键支持
- [ ] 主题切换功能

### 中期目标
- [ ] 多 Agent 管理
- [ ] 自定义工具编辑器
- [ ] 插件系统
- [ ] 团队协作功能

### 长期目标
- [ ] AI 辅助代码生成
- [ ] 可视化工作流编辑器
- [ ] 语音输入/输出支持
- [ ] 知识库集成

---

**🚀 KODE Frontend - 让 AI 对话更智能、更直观！**