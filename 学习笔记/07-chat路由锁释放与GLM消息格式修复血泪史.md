# chat路由锁释放与GLM消息格式修复血泪史

## 📋 问题背景

在使用 `schedule-assistant` 进行前后端联调时，遇到了三重叠加的严重问题：

```
用户发送消息："帮我查看所有项目"
→ 前端发送请求到后端
→ ❌ 工具执行完后，无法再发送新消息（输入框锁死）
→ ❌ GLM API 返回 400 错误：messages[5].content[1].type type error
→ ❌ 日志显示注册了 time-agent 而不是 schedule-assistant
```

**用户心情**：真的很烦躁！😤 到九点半一直在测试tools，总是出现api问题、注册问题、锁问题。

---

## 🔍 问题1：锁释放时机错误 - 无法连续对话

### 问题现象

```
第一次对话：
  用户: "帮我查看所有项目"
  → 工具执行成功 ✅
  → 前端收到 complete 事件 ✅
  → 前端解锁输入框 ✅
  
第二次对话（立即发送）：
  用户: "创建明天的日程"
  → ❌ 被服务器拒绝！
  → 返回 429 错误："上一个请求还在处理中，请稍后再试"
```

### 根本原因

**后端的锁释放时机不对！**

```typescript
// server/routes/chat.ts - 修复前

case 'done':
  console.log(`[对话完成]`);
  emitter.sendComplete({...});
  isCompleted = true;
  emitter.end();
  return;  // ← 函数返回，但还没释放锁！

// ... 代码继续执行 ...

} finally {
  agentManager.setProcessing(agentId, false);  // ← 锁在这里才释放！
}
```

#### 时序问题

```
时刻 T0: 收到 done 事件
时刻 T1: 发送 complete 给前端（SSE流）
时刻 T2: 前端收到 complete → 解锁输入框 ✅ 用户可以输入了
时刻 T3: 用户立即输入新消息 → 发送到服务器
时刻 T4: finally 块执行 → 锁才被释放 ❌ 但已经太晚了！
时刻 T5: 新请求到达 → 检查锁 → 仍被锁定 → 返回 429 错误
```

**核心矛盾**：前端（T2）比后端（T4）更早解锁，导致竞态条件。

### 解决方案

**在 done 事件处理时立即释放锁！**

```typescript
// server/routes/chat.ts - 修复后

case 'done':
  console.log(
    `[对话完成] 工具调用次数: ${toolCount}, 原因: ${event.reason}`
  );
  emitter.sendComplete({
    reason: event.reason,
    toolCount,
    bookmark: envelope.bookmark,
  });
  isCompleted = true;
  if (statusCheck) clearInterval(statusCheck);
  
  // 🔥 关键修复：立即释放锁，允许新消息进入
  // 参考：学习笔记/03-Progress事件流与历史持久化完整指南.md
  agentManager.setProcessing(agentId, false);
  console.log('[锁已释放] ✅ 可以接收新消息了');
  
  emitter.end();
  return;
```

#### 修复后的时序

```
时刻 T0: 收到 done 事件
时刻 T1: 立即释放锁 ✅
时刻 T2: 发送 complete 给前端
时刻 T3: 前端收到 complete → 解锁输入框
时刻 T4: 用户输入新消息 → 发送到服务器
时刻 T5: 新请求到达 → 检查锁 → 已释放 ✅ → 处理请求
```

### 完整修复（包含错误处理）

```typescript
// 1. done 事件时释放
case 'done':
  agentManager.setProcessing(agentId, false);
  console.log('[锁已释放] ✅ 可以接收新消息了');
  emitter.end();
  return;

// 2. 订阅流错误时释放
} catch (error: any) {
  if (!isCompleted) {
    emitter.sendError(error.message);
    agentManager.setProcessing(agentId, false);
    console.log('[锁已释放] ❌ 因错误释放');
    emitter.end();
  }
}

// 3. 订阅异常时释放
progressSubscription.catch((error) => {
  if (!isCompleted) {
    emitter.sendError(error.message || '订阅流异常');
    agentManager.setProcessing(agentId, false);
    console.log('[锁已释放] ⚠️ 因异常释放');
    emitter.end();
  }
});

// 4. 外层错误时释放
} catch (error: any) {
  if (!res.headersSent) {
    emitter.sendError(error.message);
    agentManager.setProcessing(agentId, false);
    console.log('[锁已释放] ❌ 因外层错误释放');
    emitter.end();
  }
} finally {
  // 5. finally 保底释放（防御性编程）
  agentManager.setProcessing(agentId, false);
}
```

### 核心原则

> **done 事件 = 任务完成 = 立即释放所有资源（包括锁）**
> 
> 参考：`学习笔记/03-Progress事件流与历史持久化完整指南.md`
> - `tool:end` ≠ 任务完成（可能还有其他工具或文本）
> - `done` = 整个任务轮次完成 ⭐ 唯一可靠的完成信号

---

## 🔍 问题2：GLM API 消息格式错误

### 问题现象

```
[Agent 错误] phase=model, message=GLM API error: 400 
{"error":{"code":"1214","message":"messages[5].content[1].type type error"}}
```

工具调用成功后，Agent 再次调用模型时报错。

### 根本原因

**GLM API 的消息格式与 Anthropic 不同！**

#### Anthropic 格式（KODE SDK 内部使用）

```json
{
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "让我来查询..."
    },
    {
      "type": "tool_use",
      "id": "toolu_123",
      "name": "get_projects",
      "input": {}
    }
  ]
}
```

#### GLM API 要求的格式

```json
{
  "role": "assistant",
  "content": "让我来查询...",
  "tool_calls": [
    {
      "id": "toolu_123",
      "type": "function",
      "function": {
        "name": "get_projects",
        "arguments": "{}"
      }
    }
  ]
}
```

**关键区别**：
1. ❌ GLM **不支持** `content` 数组中的 `tool_use` 对象
2. ✅ GLM 要求 `tool_calls` 在**消息顶层**，不在 content 中
3. ✅ `tool_result` 必须是独立的 `tool` 角色消息

### 错误的实现（修复前）

```typescript
// src/infra/glm-provider.ts - 修复前

private convertContent(content: ContentBlock[]): any {
  const parts: any[] = [];
  for (const block of content) {
    if (block.type === 'text') {
      parts.push({ type: 'text', text: block.text });
    } else if (block.type === 'tool_use') {
      // ❌ 错误：GLM 不支持这种格式
      parts.push({
        type: 'tool_call',  // ← GLM API 会报错
        id: block.id,
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input),
        },
      });
    } else if (block.type === 'tool_result') {
      // ❌ 错误：GLM 不支持 content 数组中的 tool_result
      parts.push({
        type: 'tool_result',
        tool_call_id: block.tool_use_id,
        content: block.content,
      });
    }
  }
  return parts;
}
```

### 正确的实现（修复后）

```typescript
// src/infra/glm-provider.ts - 修复后

private formatMessages(messages: Message[], system?: string): any[] {
  const formatted: any[] = [];
  
  if (system) {
    formatted.push({
      role: 'system',
      content: system,
    });
  }

  for (const msg of messages) {
    if (msg.role === 'system') {
      formatted.push({
        role: 'system',
        content: this.extractTextContent(msg.content),
      });
    } else if (msg.role === 'assistant' || msg.role === 'user') {
      // 🔥 关键修复：分离 tool_use 和 tool_result
      const { toolUses, toolResults, textContent } = 
        this.separateContentBlocks(msg.content);
      
      // 1. 添加主消息（文本内容 + tool_calls）
      if (textContent.length > 0 || toolUses.length > 0) {
        const message: any = {
          role: msg.role,
          content: textContent.length > 0 
            ? this.extractTextContent(textContent) 
            : '',
        };
        
        // ✅ 如果有 tool_use，添加到顶层的 tool_calls
        if (toolUses.length > 0) {
          message.tool_calls = toolUses.map(tu => ({
            id: tu.id,
            type: 'function',
            function: {
              name: tu.name,
              arguments: JSON.stringify(tu.input),
            },
          }));
        }
        
        formatted.push(message);
      }
      
      // 2. ✅ 添加 tool 结果消息（独立的 tool 角色消息）
      for (const toolResult of toolResults) {
        formatted.push({
          role: 'tool',
          content: typeof toolResult.content === 'string' 
            ? toolResult.content 
            : JSON.stringify(toolResult.content),
          tool_call_id: toolResult.tool_use_id,
        });
      }
    }
  }

  return formatted;
}

private separateContentBlocks(content: ContentBlock[]): { 
  toolUses: Array<{id: string; name: string; input: any}>; 
  toolResults: Array<{tool_use_id: string; content: any}>; 
  textContent: ContentBlock[];
} {
  const toolUses: Array<{id: string; name: string; input: any}> = [];
  const toolResults: Array<{tool_use_id: string; content: any}> = [];
  const textContent: ContentBlock[] = [];
  
  for (const block of content) {
    if (block.type === 'tool_use') {
      toolUses.push({
        id: block.id,
        name: block.name,
        input: block.input,
      });
    } else if (block.type === 'tool_result') {
      toolResults.push({
        tool_use_id: block.tool_use_id,
        content: block.content,
      });
    } else if (block.type === 'text') {
      textContent.push(block);
    }
  }
  
  return { toolUses, toolResults, textContent };
}
```

### 转换示例

#### 输入（KODE SDK 内部格式）

```typescript
{
  role: 'assistant',
  content: [
    { type: 'text', text: '让我查询项目列表' },
    { type: 'tool_use', id: 'toolu_123', name: 'get_projects', input: {} }
  ]
}

// 用户消息（包含工具结果）
{
  role: 'user',
  content: [
    { type: 'tool_result', tool_use_id: 'toolu_123', content: '{...}' }
  ]
}
```

#### 输出（GLM API 格式）

```typescript
// 助手消息
{
  role: 'assistant',
  content: '让我查询项目列表',
  tool_calls: [
    {
      id: 'toolu_123',
      type: 'function',
      function: {
        name: 'get_projects',
        arguments: '{}'
      }
    }
  ]
}

// 工具结果消息（独立的 tool 角色）
{
  role: 'tool',
  content: '{...}',
  tool_call_id: 'toolu_123'
}
```

---

## 🔍 问题3：Agent 注册混淆

### 问题现象

```
前端发送: agentId: 'schedule-assistant'
日志显示: ✓ 注册 Agent 配置: 时间管理助手 (time-agent)
结果：   找不到 schedule-assistant，请求失败
```

### 原因

服务器启动时注册的是旧的 `time-agent`，但代码已改为 `schedule-assistant`。

### 解决方案

```bash
# 1. 杀掉旧服务器
pkill -9 -f "ts-node server/index.ts"

# 2. 清空旧的 Agent 历史（避免格式错误的历史消息）
rm -rf .kode/schedule-assistant

# 3. 重启服务器
npx ts-node server/index.ts > server.log 2>&1 &

# 4. 验证注册
tail -20 server.log | grep "注册 Agent"
# 应该看到：
# ✓ 注册 Agent 配置: 日程助手 (schedule-assistant)
```

### 防止重复问题

```typescript
// server/agents/index.ts - 已有防护

export function registerAgentConfig(config: AgentConfig): void {
  if (agentConfigRegistry.has(config.id)) {
    console.warn(`⚠️  Agent 配置 ${config.id} 已存在，将被覆盖`);
  }
  
  agentConfigRegistry.set(config.id, config);
  console.log(`✓ 注册 Agent 配置: ${config.name} (${config.id})`);
}
```

---

## 🎯 完整工作流程验证

### 1. 启动服务器

```bash
cd /Users/yeya/FlutterProjects/kode-sdk/kode-sdk
npx ts-node server/index.ts > server.log 2>&1 &
```

### 2. 检查日志

```bash
tail -30 server.log | grep -E "schedule-assistant|服务器已启动"

# 应该看到：
# ✓ 注册 Agent 配置: 日程助手 (schedule-assistant)
# 服务器已启动
# ✓ 服务器地址: http://localhost:2500
```

### 3. 测试连续对话

```bash
# 第一条消息
curl -X POST http://localhost:2500/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"帮我查看所有项目","agentId":"schedule-assistant"}' \
  --no-buffer

# 立即发送第二条消息（不等待）
curl -X POST http://localhost:2500/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"创建明天的日程","agentId":"schedule-assistant"}' \
  --no-buffer
```

### 4. 验证成功

```bash
tail -50 server.log | grep -E "锁已释放|done"

# 第一次对话：
# [对话完成] 工具调用次数: 1, 原因: completed
# [锁已释放] ✅ 可以接收新消息了

# 第二次对话：
# [用户 → 日程助手] 创建明天的日程  ← 成功接收！
# [对话完成] 工具调用次数: 1, 原因: completed
# [锁已释放] ✅ 可以接收新消息了
```

---

## 📊 性能对比

### 修复前

```
第一次对话：成功 ✅
等待 3-5 秒（让 finally 执行）
第二次对话：成功 ✅

连续对话（快速点击）：
第一次：成功 ✅
第二次：429 错误 ❌ "上一个请求还在处理中"
```

### 修复后

```
第一次对话：成功 ✅
立即发送第二次：成功 ✅
立即发送第三次：成功 ✅
连续对话（快速点击 10 次）：全部成功 ✅
```

---

## 🎓 核心经验总结

### 1. 事件驱动的资源释放原则

```typescript
// ❌ 错误：依赖函数结束或 finally 块释放资源
async function handleRequest() {
  acquire_lock();
  try {
    await process();
    return;  // ← 锁还没释放
  } finally {
    release_lock();  // ← 可能很晚才执行
  }
}

// ✅ 正确：在完成事件时立即释放资源
async function handleRequest() {
  acquire_lock();
  
  for await (const event of subscribe()) {
    if (event.type === 'done') {
      release_lock();  // ← 立即释放
      return;
    }
  }
}
```

### 2. API 适配层的格式转换

不同的 LLM API 有不同的消息格式：

| API | tool_use 位置 | tool_result 格式 |
|-----|--------------|-----------------|
| **Anthropic** | content 数组中 | content 数组中 |
| **OpenAI** | 顶层 tool_calls | 独立 tool 消息 |
| **GLM** | 顶层 tool_calls | 独立 tool 消息 |

**教训**：必须根据目标 API 正确转换格式，不能假设所有 API 都一样。

### 3. 前后端同步的重要性

```
前端解锁时机 ≤ 后端释放锁时机
```

如果前端更早解锁，用户会感觉"可以输入"，但实际请求会被拒绝。
**最佳实践**：后端在发送完成事件前就释放锁。

### 4. 调试技巧

```bash
# 1. 实时监控日志
tail -f server.log | grep -E "锁|done|工具"

# 2. 查看 Agent 注册
grep "注册 Agent" server.log

# 3. 检查 API 错误
grep "GLM API error" server.log | tail -5

# 4. 验证消息格式（添加调试日志）
console.log('发送给GLM的消息:', JSON.stringify(formattedMessages, null, 2));
```

---

## 🚀 快速修复指南

如果遇到类似问题，按以下顺序排查：

### 1. 锁问题（无法连续对话）

**症状**：第二次请求返回 429 错误

**检查**：
```bash
grep "锁已释放" server.log
# 应该在每次 done 事件后都有
```

**修复**：在 `case 'done':` 中添加 `agentManager.setProcessing(agentId, false);`

### 2. API 格式问题

**症状**：`GLM API error: 400` 或 `type error`

**检查**：
```bash
grep "GLM API error" server.log
# 查看具体的错误信息
```

**修复**：检查 `glm-provider.ts` 的 `formatMessages` 方法

### 3. Agent 注册问题

**症状**：404 错误或 "Agent 不存在"

**检查**：
```bash
grep "注册 Agent" server.log
# 确认目标 Agent 已注册
```

**修复**：重启服务器并检查注册日志

---

## 📚 相关文档

- `学习笔记/03-Progress事件流与历史持久化完整指南.md` - done 事件详解
- `学习笔记/01工具执行与事件流.md` - 事件系统原理
- `学习笔记/Z.AI-GLM配置说明.md` - GLM API 配置
- `server/routes/chat.ts` - 聊天路由实现
- `src/infra/glm-provider.ts` - GLM Provider 实现

---

## 🎉 测试成功标准

当你看到以下现象时，说明修复成功：

1. ✅ **连续对话流畅**
   - 快速点击发送按钮，所有请求都能成功
   - 没有 429 错误
   - 日志显示每次都有 `[锁已释放] ✅`

2. ✅ **工具调用正常**
   - 工具执行成功
   - 没有 GLM API 错误
   - 基于工具结果生成最终回复

3. ✅ **前端体验良好**
   - 完成后立即可以输入新消息
   - 没有"卡顿"或"等待"的感觉
   - 思考内容、工具调用、最终回复都正常显示

---

**日期**: 2025-10-19  
**修复人**: AI Assistant & yeya  
**总耗时**: 约 1.5 小时（从发现问题到完全修复）  
**核心发现**: done事件 = 立即释放所有资源，GLM API 格式转换必须精确

**血泪教训** 😤：
> "我到九点半一直在测试tools，总是出现api问题、注册问题、锁问题，我真的很烦躁"
> 
> 但最终，我们一个一个攻克了所有问题！💪


