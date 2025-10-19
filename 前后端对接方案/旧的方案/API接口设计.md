# API 接口设计

> 以下接口以 Node.js (Express/Koa) Adapter 为例，完全兼容 ChatKit `CustomApiConfig` 所期望的协议：前端始终向 `POST /chatkit` 发送指令，服务器以 JSON 或 SSE 返回响应。若要拆分成 RESTful 多端点也可，但需在 `api.fetch` 中自行路由。

## 1. 统一入口

### `POST /chatkit`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | ChatKit 生成的请求 ID，用于幂等重试。需在响应头 `chatkit-request-id` 返回。 |
| `type` | `string` | 指令类型，详见下表。 |
| `payload` | `object` | 各指令的具体参数。 |
| `domain_key` | `string` | 前端 `api.domainKey`，用于校验来源域。 |

Adapter 需根据 `type` 分发：

| `type` | 含义 | 响应形式 | Kode 调用 |
| --- | --- | --- | --- |
| `thread.list` | 列出线程摘要 | `application/json` | 自建线程表，返回 `threads: ThreadMetadata[]` |
| `thread.retrieve` | 获取线程详情（含最新消息） | `application/json` | 读取 `Store.loadMessages(agentId)` |
| `thread.create` | 创建新线程 | `application/json` | `Agent.create`，生成 `agentId` 并保存映射 |
| `thread.delete` | 删除线程 | `application/json` | `Store.deleteMessages(agentId)` + 清理映射 |
| `thread.message.create` | 写入用户消息 | **SSE** 或 JSON | `MessageQueue.send`，仅排队 |
| `response.create` | 请求助手响应（可与 `thread.message.create` 合并） | **SSE** | 订阅 `agent.subscribe(['progress'])` 并流式转发 |
| `response.cancel` | 取消当前响应 | JSON | `agent.interrupt()` |
| `response.list` / `response.retrieve` | 历史响应（可选） | JSON | 从 `Store` 中拼装 |

大多数情况下 ChatKit 会在一次请求中同时发送 `thread.message.create` + `response.create`，Adapter 可识别 `payload.multistep` 将两个意图合并执行。

### SSE 响应格式

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: thread.message.created
data: {...}

event: thread.message.delta
data: {...}

event: thread.run.step.created
data: {...}
```

发送完成后务必推送：

```text
event: thread.message.completed
data: {...}

event: thread.run.completed
data: {...}

event: response.completed
data: { id: "resp_..." }
```

并在最后追加 `data: [DONE]` 或直接关闭连接。

## 2. 线程与 Agent 映射

建议维护表 `chatkit_threads`：

| 字段 | 说明 |
| --- | --- |
| `thread_id` | ChatKit 线程 ID（`thr_...`） |
| `agent_id` | Kode Agent ID（`agt:...`） |
| `template_id` | 使用的模板（可选） |
| `metadata` | 额外属性，如 `owner`, `projectId`, `tags` |
| `created_at/updated_at` | 时间戳 |

操作流程：
1. **thread.create**：生成 `agentId = generateAgentId()`，调用 `Agent.create` 并保存映射。
2. **thread.retrieve/list**：根据 `thread_id` 找到 `agentId`，使用 `store.loadMessages(agentId)` → 转换为 ChatKit `ThreadItem` 列表。
3. **thread.delete**：`agent.persistentStore.delete(agentId)`（若实现），同时清理映射行。

## 3. 消息写入

`thread.message.create` 的 `payload`：

```json
{
  "thread_id": "thr_01J0....",
  "content": [
    { "type": "text", "text": { "value": "在 repo 里查 weather 工具" } }
  ],
  "attachments": [],
  "metadata": { "locale": "zh-CN" }
}
```

处理步骤：
1. 找到 `agentId`，调用 `messageId = agent.send(text, { metadata })`。
2. 立即将消息写入 Store：`MessageQueue.flush()` 会在下一次 `agent.process()` 前自动执行；若需要强一致，可手动执行一次 `flush()`。
3. 回传 JSON：`{ "item": ThreadItem, "message_id": messageId }`。

## 4. 响应流

`response.create` 的典型 `payload`：

```json
{
  "response": {
    "metadata": { "requester": "user_123" },
    "instructions": "请按简体中文回答"
  },
  "thread": { "id": "thr_01J0..." }
}
```

处理：
1. 调用 `agent.subscribe(['progress', 'monitor'])`，并在子任务中消费。
2. 对照《消息映射与事件流.md》逐个转换事件。
3. 在首个事件前推送 `event: response.created`，在末尾推送 `response.completed`。
4. 若需要支撑 `fetchUpdates()`，缓存最新游标（Kode `Progress` 里附带 `bookmark`），以便下次从断点恢复。

取消响应时（`response.cancel`）：
1. 调用 `agent.interrupt()`。
2. 推送 `thread.run.cancelled` + `response.cancelled`。

## 5. 认证与安全
- 验证 `domain_key` 是否在允许列表，可结合业务租户信息。
- 为每个请求附加用户身份（AuthZ），映射到 Agent `metadata`，用于隔离存储。
- 对 SSE 连接设置超时/心跳，防止僵尸连接。

## 6. 错误处理
- 返回 JSON 错误结构：

```json
{
  "error": {
    "type": "bad_request",
    "message": "Thread not found",
    "code": "THREAD_NOT_FOUND"
  }
}
```

- 同步发送 `event: error` SSE，当错误发生在流式过程中时应先推送 `thread.run.failed`。

## 7. 扩展：工具与 Widget
- 如需在前端触发客户端工具（`onClientTool`），在 `thread.run.requires_action` 中包含 `required_action.submit_tool_outputs.tool_calls`，并在客户端回传 `tool_outputs` 调用 `Agent.decide` 或直接注入合成消息。
- Widget 输出：在 `thread.message.completed` 的 `content` 中携带符合 `WidgetRoot` 的 JSON，如：

```json
{
  "type": "Card",
  "id": "weather-forecast",
  "children": [
    { "type": "Title", "value": "巴黎天气" },
    { "type": "Markdown", "value": "**22°C**，晴" }
  ]
}
```

ChatKit 将自动渲染。

## 8. 观测与日志
- 为关键事件记录：
  - `request_id` / `thread_id` / `agent_id`
  - `latency_ms`（消息生成耗时、工具执行耗时）
  - `token_usage`（来自 Kode `ContextManager.analyze`）
  - 错误堆栈与 `progress` 事件序列，方便追踪 UI 异常。
