# SSE 事件类型说明

## 问题修复记录

### 问题描述
前端无法接收到流式回复，消息发送后没有响应。

### 原因分析
1. **SSE 格式解析错误**: 后端使用标准 SSE 格式（`event:` + `data:`），前端之前只解析 `data:` 行
2. **事件类型不匹配**: 前端期望 `message`/`progress`，但后端发送 `text`/`thinking`

### 修复方案
修改前端 SSE 解析逻辑，正确处理标准 SSE 格式。

---

## 后端 SSE 事件类型

后端使用标准 SSE 格式发送事件：

```
event: <事件类型>
data: <JSON数据>

```

### 事件类型列表

| 事件类型 | 数据格式 | 说明 |
|---------|---------|------|
| `think_start` | `{}` | 思考开始 |
| `thinking` | `{ delta: string }` | 思考内容（流式） |
| `think_end` | `{}` | 思考结束 |
| `start` | `{}` | 正式回复开始 |
| `text` | `{ delta: string }` | 文本内容（流式） |
| `end` | `{}` | 正式回复结束 |
| `tool_start` | `{ name: string, input: any }` | 工具调用开始 |
| `tool_end` | `{ name: string, duration: number }` | 工具调用结束 |
| `tool_error` | `{ error: string }` | 工具调用错误 |
| `complete` | `{}` | 对话完成 |
| `error` | `{ message: string }` | 错误信息 |

---

## 前端处理逻辑

### SSE 解析代码

```typescript
let currentEvent = '';

for (const line of lines) {
  // 解析 event: 行
  if (line.startsWith('event: ')) {
    currentEvent = line.slice(7).trim();
  }
  // 解析 data: 行
  else if (line.startsWith('data: ')) {
    const data = JSON.parse(line.slice(6));
    
    // 根据事件类型处理
    if (currentEvent === 'text' || currentEvent === 'thinking') {
      // 追加文本内容
      accumulatedContent += data.delta;
    }
    else if (currentEvent === 'tool_start') {
      // 显示工具调用开始
      accumulatedContent += `\n\n🔧 [工具调用] ${data.name}\n`;
    }
    // ... 其他事件处理
  }
}
```

### 前端显示效果

- **思考内容** (`thinking`): 实时流式显示 AI 的思考过程
- **文本内容** (`text`): 实时流式显示 AI 的回复
- **工具调用** (`tool_start`/`tool_end`): 显示工具名称和执行时间
- **完成状态** (`complete`): 停止流式指示器

---

## 实际 SSE 数据示例

### 示例 1: 简单对话

```
event: think_start
data: {"sessionId":"morning_work"}

event: thinking
data: {"delta":"用户","sessionId":"morning_work"}

event: thinking
data: {"delta":"打招呼","sessionId":"morning_work"}

event: think_end
data: {"sessionId":"morning_work"}

event: start
data: {"sessionId":"morning_work"}

event: text
data: {"delta":"你好","sessionId":"morning_work"}

event: text
data: {"delta":"！","sessionId":"morning_work"}

event: end
data: {"sessionId":"morning_work"}

event: complete
data: {"sessionId":"morning_work"}

```

### 示例 2: 带工具调用

```
event: think_start
data: {"sessionId":"morning_work"}

event: thinking
data: {"delta":"需要","sessionId":"morning_work"}

event: thinking
data: {"delta":"记录","sessionId":"morning_work"}

event: think_end
data: {"sessionId":"morning_work"}

event: tool_start
data: {"name":"create_schedule","input":{"user_input":"..."},"sessionId":"morning_work"}

event: tool_end
data: {"name":"create_schedule","duration":4838,"sessionId":"morning_work"}

event: start
data: {"sessionId":"morning_work"}

event: text
data: {"delta":"已经","sessionId":"morning_work"}

event: text
data: {"delta":"记录","sessionId":"morning_work"}

event: end
data: {"sessionId":"morning_work"}

event: complete
data: {"sessionId":"morning_work"}

```

---

## 调试技巧

### 1. 浏览器控制台查看

打开浏览器控制台（F12），查看 `[SSE]` 日志：

```
[SSE] thinking { delta: '用户', sessionId: 'morning_work' }
[SSE] text { delta: '你好', sessionId: 'morning_work' }
[SSE] tool_start { name: 'create_schedule', input: {...} }
```

### 2. Network 面板查看

1. 打开 Network 标签
2. 找到 `/api/chat` 请求
3. 点击查看 EventStream
4. 实时查看 SSE 事件流

### 3. 后端日志查看

```bash
tail -f /Users/yeya/FlutterProjects/kode-sdk/kode-sdk/server.log
```

查看后端发送的事件：
```
[think_chunk] 发送思考内容，长度: 9
[text_chunk_start] 正式回复开始
[工具开始] create_schedule
[工具结束] create_schedule (4838ms)
```

---

## 常见问题

### Q: 为什么看不到流式响应？

**A:** 检查以下几点：
1. 浏览器控制台是否有 `[SSE]` 日志？
2. Network 面板中 `/api/chat` 请求状态是否为 `200`？
3. 后端日志是否显示发送了事件？

### Q: 为什么只显示工具调用，没有文本？

**A:** 可能是：
1. AI 只调用了工具，没有返回文本
2. `text` 事件没有被正确处理
3. 检查 `accumulatedContent` 是否正确累积

### Q: 为什么思考内容不显示？

**A:** 
- 前端目前将 `thinking` 和 `text` 都追加到同一个内容中
- 如需区分显示，可以在前端添加特殊标记

---

## 技术要点

### 1. SSE 标准格式

标准 SSE 格式包含三部分：
```
event: <事件名称>
data: <数据>
<空行>
```

### 2. 流式处理

- 使用 `ReadableStream` 读取响应
- 使用 `TextDecoder` 解码二进制数据
- 按行分割处理，保留未完整的行在 buffer 中

### 3. 状态管理

- 使用 `currentEvent` 变量保存当前事件类型
- 使用 `accumulatedContent` 累积所有文本内容
- 使用 `isStreaming` 标志显示流式指示器

---

**修复后，前端现在可以正确接收和显示所有类型的 SSE 事件！** ✅

