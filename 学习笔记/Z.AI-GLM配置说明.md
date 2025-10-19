# Z.AI GLM 模型配置说明

## 概述

根据 [Z.AI 官方文档](https://docs.z.ai/scenario-example/develop-tools/claude)，GLM 模型可以通过 **Anthropic API 兼容接口**使用。这意味着我们可以使用现有的 Anthropic Provider，只需修改 Base URL 和 API Key 即可。

## 核心优势

✅ **无需修改代码** - 使用 Anthropic 兼容接口，直接替换端点  
✅ **成本更低** - GLM Coding Plan 从 $3/月起，成本仅为原来的 1/7  
✅ **性能更好** - GLM-4.6 系列模型，3× 使用量  
✅ **完全兼容** - 支持所有 Anthropic API 功能  

## 配置方法

### 方式一：环境变量配置（推荐）

创建 `.env` 文件或设置环境变量：

```bash
# Z.AI API Key
export ANTHROPIC_API_KEY="ef22d69d218e4cad8ae3c15bcc77d30d.eULl6aqOo8YEDKzG"

# Z.AI Anthropic 兼容端点
export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"

# 使用 GLM-4.5-Air 模型
export ANTHROPIC_MODEL_ID="glm-4.5-air"

# 超时设置（可选）
export API_TIMEOUT_MS="300000"
```

### 方式二：使用配置文件

创建 `/Users/yeya/FlutterProjects/kode-sdk/kode-sdk/.env` 文件：

```bash
# Z.AI GLM 模型配置
ANTHROPIC_API_KEY=ef22d69d218e4cad8ae3c15bcc77d30d.eULl6aqOo8YEDKzG
ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
ANTHROPIC_MODEL_ID=glm-4.5-air
API_TIMEOUT_MS=300000
```

### 方式三：在代码中直接配置

```typescript
import { Agent, AnthropicProvider } from '@kode/sdk';

const agent = await Agent.create(
  {
    templateId: 'your-template',
    model: new AnthropicProvider(
      'ef22d69d218e4cad8ae3c15bcc77d30d.eULl6aqOo8YEDKzG',  // API Key
      'glm-4.5-air',                                          // Model
      'https://api.z.ai/api/anthropic'                        // Base URL
    ),
    // ... 其他配置
  },
  deps
);
```

## 模型选择

Z.AI 提供的模型映射（通过 Anthropic 兼容接口）：

| Claude Code 模型 | Z.AI GLM 模型 | 说明 |
|-----------------|---------------|------|
| `claude-opus` | `GLM-4.6` | 最强模型，复杂任务 |
| `claude-sonnet` | `GLM-4.6` | 平衡性能，日常使用 |
| `claude-haiku` | `GLM-4.5-Air` | 快速响应，简单任务 |

**推荐配置**：
- 日常开发：`glm-4.5-air` - 快速、经济
- 复杂任务：`glm-4.6` - 强大、准确
- 高频调用：`glm-4.5-air` - 成本最优

## 快速开始

### 1. 运行 Z.AI GLM 演示

```bash
# 方法 1: 使用启动脚本（推荐）
cd /Users/yeya/FlutterProjects/kode-sdk/kode-sdk
./examples/run-glm-zai.sh

# 方法 2: 直接运行
export ANTHROPIC_API_KEY="ef22d69d218e4cad8ae3c15bcc77d30d.eULl6aqOo8YEDKzG"
export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"
export ANTHROPIC_MODEL_ID="glm-4.5-air"
npx ts-node examples/06-glm-zai-demo.ts
```

### 2. 修改现有示例

任何使用 Anthropic 的示例都可以通过设置环境变量切换到 Z.AI GLM：

```bash
# 运行多轮工具调用示例（使用 GLM）
export ANTHROPIC_API_KEY="ef22d69d218e4cad8ae3c15bcc77d30d.eULl6aqOo8YEDKzG"
export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"
export ANTHROPIC_MODEL_ID="glm-4.5-air"
./examples/run-multi-turn.sh
```

## Z.AI GLM 专用示例

新创建的示例：`examples/06-glm-zai-demo.ts`

### 功能特点

✅ **三个实用工具**：
- `get_weather` - 天气查询
- `calculator` - 数学计算
- `get_time` - 时间查询

✅ **三个测试场景**：
1. 天气查询 + 温度计算
2. 多城市天气对比
3. 时间查询 + 计算

✅ **完整的监控**：
- 工具执行统计
- 事件流可视化
- 错误处理

### 示例输出

```
═══════════════════════════════════════════════════════════
  Z.AI GLM 模型演示 - 多轮工具调用
═══════════════════════════════════════════════════════════

✓ 配置信息:
  API Key: ef22d69d218e4cad8a...
  Base URL: https://api.z.ai/api/anthropic
  Model: glm-4.5-air

✓ Agent 创建成功

═══════════════════════════════════════════════════════════
  测试场景 1: 天气查询 + 温度计算
═══════════════════════════════════════════════════════════

⚙️  [工具] get_weather 开始执行
🌤️  [天气查询] 正在查询 北京 的天气...
✅ [天气查询] 北京: 18°C, 晴转多云
✅ [工具] get_weather 执行完成 (812ms)

⚙️  [工具] calculator 开始执行
🧮 [计算器] 计算: 18 + 10
✅ [计算器] 18 + 10 = 28
✅ [工具] calculator 执行完成 (15ms)

🤖 [GLM 回复]
北京今天的天气是晴转多云，温度18°C。如果温度加上10度，就是28°C。

────────────────────────────────────────────────────────────
✓ 对话完成 (原因: completed)
────────────────────────────────────────────────────────────
```

## API 参考

### Z.AI Anthropic 兼容端点

```
Base URL: https://api.z.ai/api/anthropic
```

### 请求格式

与标准 Anthropic API 完全相同：

```typescript
POST https://api.z.ai/api/anthropic/v1/messages
Headers:
  x-api-key: your-zai-api-key
  anthropic-version: 2023-06-01
  content-type: application/json

Body:
{
  "model": "glm-4.5-air",
  "max_tokens": 1024,
  "messages": [
    { "role": "user", "content": "Hello!" }
  ]
}
```

### 响应格式

标准 Anthropic 响应格式，完全兼容。

## 与原生 GLM API 的区别

| 特性 | 原生 GLM API | Z.AI Anthropic 兼容 |
|-----|-------------|-------------------|
| API 格式 | GLM 专用格式 | Anthropic 兼容格式 |
| 端点 | `https://open.bigmodel.cn/api/paas/v4` | `https://api.z.ai/api/anthropic` |
| 代码修改 | 需要使用 GLMProvider | 直接使用 AnthropicProvider |
| 工具调用 | GLM 格式 | Anthropic 格式 |
| 兼容性 | 仅 GLM | 兼容所有 Anthropic 工具 |

## 价格对比

### Z.AI GLM Coding Plan

根据 [Z.AI 文档](https://docs.z.ai/scenario-example/develop-tools/claude)：

- **起步价**: $3/月
- **使用量**: 3× Claude Code 使用量
- **成本**: 1/7 原价
- **模型**: GLM-4.5-Air, GLM-4.6
- **额外功能**:
  - Vision Understanding MCP Server
  - Web Search MCP Server

### Anthropic 原价

- Claude Sonnet: 约 $15-20/月
- Claude Opus: 约 $30+/月

## 常见问题

### Q1: 为什么使用 Anthropic 兼容接口？

**A**: 
- ✅ 无需修改代码，直接替换端点
- ✅ 兼容所有 Anthropic 工具和生态
- ✅ 更容易从 Claude 迁移到 GLM
- ✅ 统一的 API 格式，减少学习成本

### Q2: 如何在现有项目中使用？

**A**: 只需设置环境变量即可：
```bash
export ANTHROPIC_API_KEY="your-zai-key"
export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"
export ANTHROPIC_MODEL_ID="glm-4.5-air"
```

### Q3: 支持哪些功能？

**A**: 
- ✅ 文本生成
- ✅ 流式响应
- ✅ 工具调用 (Function Calling)
- ✅ 多轮对话
- ✅ Vision Understanding (PRO+)
- ✅ Web Search (PRO+)

### Q4: 性能如何？

**A**: 
- GLM-4.5-Air: 快速响应，适合高频调用
- GLM-4.6: 与 Claude Sonnet 相当
- 延迟: 通常 < 2秒首token

### Q5: 如何获取 API Key？

**A**: 
1. 访问 [Z.AI Open Platform](https://z.ai)
2. 注册或登录
3. 在 API Keys 管理页面创建
4. 订阅 GLM Coding Plan

### Q6: 可以混用多个模型吗？

**A**: 可以！通过环境变量切换：
```bash
# 使用 GLM-4.5-Air（快速）
export ANTHROPIC_MODEL_ID="glm-4.5-air"

# 使用 GLM-4.6（强大）
export ANTHROPIC_MODEL_ID="glm-4.6"
```

## 最佳实践

### 1. 开发环境配置

```bash
# .env.development
ANTHROPIC_API_KEY=your-zai-api-key
ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
ANTHROPIC_MODEL_ID=glm-4.5-air
```

### 2. 生产环境配置

```bash
# .env.production
ANTHROPIC_API_KEY=${ZAI_API_KEY_SECRET}
ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
ANTHROPIC_MODEL_ID=glm-4.6  # 生产用更强模型
API_TIMEOUT_MS=600000  # 更长的超时
```

### 3. 错误处理

```typescript
try {
  const response = await agent.send('Your message');
} catch (error) {
  if (error.message.includes('401')) {
    console.error('API Key 无效或已过期');
  } else if (error.message.includes('429')) {
    console.error('请求频率超限，请稍后重试');
  } else {
    console.error('请求失败:', error);
  }
}
```

### 4. 模型选择策略

```typescript
const modelMap = {
  'simple': 'glm-4.5-air',      // 简单任务
  'normal': 'glm-4.5-air',      // 日常任务
  'complex': 'glm-4.6',         // 复杂任务
  'critical': 'glm-4.6',        // 关键任务
};

const model = modelMap[taskComplexity] || 'glm-4.5-air';
```

## 迁移指南

### 从原生 GLM 迁移

**原代码**（使用 GLMProvider）：
```typescript
import { GLMProvider } from '../src/infra/glm-provider';

const model = new GLMProvider(
  process.env.GLM_API_KEY,
  'glm-4-plus',
  'https://open.bigmodel.cn/api/paas/v4'
);
```

**新代码**（使用 Anthropic 兼容接口）：
```typescript
import { AnthropicProvider } from '../src';

const model = new AnthropicProvider(
  process.env.ANTHROPIC_API_KEY,  // Z.AI API Key
  'glm-4.5-air',                  // 或 glm-4.6
  'https://api.z.ai/api/anthropic'
);
```

或者直接设置环境变量，代码无需修改！

### 从 Claude 迁移

只需替换环境变量：

```bash
# 原 Claude 配置
ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_BASE_URL 不设置（使用默认）

# 改为 Z.AI GLM
ANTHROPIC_API_KEY=ef22d69d218e4cad8ae3c15bcc77d30d.eULl6aqOo8YEDKzG
ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
ANTHROPIC_MODEL_ID=glm-4.5-air
```

代码完全不变！

## 相关资源

### 官方文档
- [Z.AI 开发者文档](https://docs.z.ai/)
- [Claude Code 集成指南](https://docs.z.ai/scenario-example/develop-tools/claude)
- [Z.AI API 参考](https://docs.z.ai/api-reference)

### 示例代码
- `examples/06-glm-zai-demo.ts` - Z.AI GLM 专用示例
- `examples/05-multi-turn-tools.ts` - 通用多轮工具示例
- `examples/run-glm-zai.sh` - 快速启动脚本

### 学习资源
- [工具执行与事件流.md](./01工具执行与事件流.md) - 核心机制
- [多轮工具调用示例说明.md](./多轮工具调用示例说明.md) - 详细教程
- [API调用速查表.md](./API调用速查表.md) - 快速参考

## 总结

### 核心优势

1. **成本低** - 1/7 价格，$3/月起
2. **兼容好** - Anthropic 格式，无需改代码
3. **性能强** - GLM-4.6 系列，3× 使用量
4. **易上手** - 设置环境变量即可

### 快速命令

```bash
# 设置环境变量
export ANTHROPIC_API_KEY="ef22d69d218e4cad8ae3c15bcc77d30d.eULl6aqOo8YEDKzG"
export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"
export ANTHROPIC_MODEL_ID="glm-4.5-air"

# 运行 Z.AI GLM 演示
cd /Users/yeya/FlutterProjects/kode-sdk/kode-sdk
./examples/run-glm-zai.sh

# 运行多轮工具调用（使用 GLM）
./examples/run-multi-turn.sh
```

---

**创建时间**: 2025-10-16  
**适用版本**: Kode SDK v2.7+  
**API Key**: `ef22d69d218e4cad8ae3c15bcc77d30d.eULl6aqOo8YEDKzG`  
**推荐模型**: `glm-4.5-air`  

✨ **开始使用 Z.AI GLM，享受 1/7 成本的 AI 编码体验！**

