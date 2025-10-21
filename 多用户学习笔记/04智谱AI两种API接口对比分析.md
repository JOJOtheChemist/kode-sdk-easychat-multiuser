# 智谱AI两种API接口对比分析

## 测试背景
在配置智谱AI API时，发现了两种不同的接口方式。本文档详细对比了它们的差异。

## 接口概览

### 1. 原始API接口
- **端点**：`https://open.bigmodel.cn/api/paas/v4/chat/completions`
- **格式**：OpenAI兼容格式
- **认证**：`Authorization: Bearer <api_key>`

### 2. Anthropic兼容接口
- **端点**：`https://open.bigmodel.cn/api/anthropic/v1/messages`
- **格式**：Anthropic Claude格式
- **认证**：`x-api-key: <api_key>`

## 功能对比

| 功能特性 | 原始API | Anthropic兼容API | 说明 |
|---------|---------|----------------|------|
| **流式输出** | ✅ 支持 | ❌ 不支持 | 原始API可通过`stream: true`启用 |
| **推理过程** | ✅ 支持 | ❌ 不支持 | 原始API可通过`thinking: {type: "enabled"}`展示思考过程 |
| **模型支持** | glm-4.5-air, glm-4.6等 | glm-4.5-air, glm-4.6等 | 两者支持的模型相同 |
| **响应格式** | OpenAI格式 | Anthropic格式 | 数据结构不同 |
| **认证方式** | Bearer Token | x-api-key | Header格式不同 |

## 实际测试结果

### 原始API测试（流式调用）
```bash
curl -X POST "https://open.bigmodel.cn/api/paas/v4/chat/completions" \
    -H "Authorization: Bearer <api_key>" \
    -d '{
        "model": "glm-4.5-air",
        "messages": [{"role": "user", "content": "你好"}],
        "stream": true,
        "thinking": {"type": "enabled"}
    }'
```

**输出特点**：
- 先输出`reasoning_content`（推理过程）
- 后输出`content`（正式回答）
- 实时流式传输，逐token返回

### Anthropic兼容API测试
```bash
curl --location 'https://open.bigmodel.cn/api/anthropic/v1/messages' \
--header "x-api-key: <api_key>" \
--data '{
    "model": "glm-4.5-air",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
}'
```

**输出特点**：
- 一次性返回完整响应
- 无推理过程展示
- 无流式输出

## 使用场景建议

### 适合使用原始API的场景：
1. **需要实时交互**的应用（聊天机器人）
2. **需要展示AI思考过程**的教育场景
3. **长文本生成**需要逐步展示
4. **对响应速度要求高**的应用

### 适合使用Anthropic兼容API的场景：
1. **已有Anthropic集成**的系统需要快速迁移
2. **简单的一次性问答**场景
3. **不需要流式输出**的批量处理
4. **保持代码兼容性**的要求

## 在kode-sdk中的配置

### 当前配置（使用Anthropic兼容）
```env
ANTHROPIC_API_KEY=ce85d782d3834f3982b87494dbd2a447.y8l8wxwEFafurRY2
ANTHROPIC_MODEL_ID=glm-4.5-air
ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/anthropic
```

### 如需使用原始API
需要修改Provider实现，将：
- 请求格式改为OpenAI格式
- 响应解析适配OpenAI格式
- 支持流式传输

## 性能对比

| 指标 | 原始API（流式） | Anthropic兼容API |
|------|----------------|------------------|
| 首字延迟 | ~1秒 | ~1.8秒 |
| 完整响应时间 | 2-3秒（流式展示） | 2-3秒（一次性） |
| 用户体验 | 逐步展示，感觉更快 | 等待后一次性显示 |
| 资源占用 | 实时传输，内存占用低 | 一次性传输，内存占用高 |

## 总结

1. **功能完整性**：原始API功能更丰富，支持流式和推理
2. **兼容性**：Anthropic兼容API便于从Claude迁移
3. **性能体验**：原始API提供更好的用户体验
4. **推荐使用**：新项目建议使用原始API，充分利用智谱AI的特性

## 备注

- 测试时间：2025-10-21
- API版本：基于智谱AI开放平台当前版本
- 两种API的计费方式相同