# Kode-SDK 学习笔记

欢迎来到 Kode-SDK 学习笔记！这里整理了关于 Kode-SDK 的核心概念、使用指南和实战示例。

## 📖 目录

### 🚀 快速入门
- **[快速开始.md](./快速开始.md)** - Kode-SDK 入门指南，10分钟上手
- **[GLM-配置说明.md](./GLM-配置说明.md)** - GLM 模型配置和使用
- **[API调用速查表.md](./API调用速查表.md)** - 常用 API 快速查询

### ⭐ 核心概念（必读）
- **[01-工具执行与事件流.md](./01工具执行与事件流.md)** ⭐
  - 工具结果如何自动传递给 LLM
  - 事件系统的三通道设计（Progress/Control/Monitor）
  - 工具执行状态机
  - 完整的流程图和示例

- **[02-工具调用完成后自动继续处理-重大Bug修复.md](./02工具调用完成后自动继续处理-重大Bug修复.md)** ⭐
  - 工具调用后卡住问题的完整分析
  - setImmediate 修复方案
  - 多轮对话自动化机制
  - 事件驱动架构深度解析

- **[03-Progress事件流与历史持久化完整指南.md](./03-Progress事件流与历史持久化完整指南.md)** ⭐⭐⭐
  - **done事件 vs tool:end 的区别** - 任务完成的关键信号
  - **Agent历史持久化方案** - Resume or Create模式
  - **前后端端口配置** - 完整的连接配置
  - **最佳实践总结** - 避坑指南
  - **测试验证清单** - 确保系统正常

- **[03-快速问题排查手册.md](./03-快速问题排查手册.md)** 🔧
  - 5大常见问题速查
  - 调试工具箱
  - 健康检查清单
  - 一键启动脚本

- **[07-chat路由锁释放与GLM消息格式修复血泪史.md](./07-chat路由锁释放与GLM消息格式修复血泪史.md)** 🩸⭐⭐⭐
  - **锁释放时机错误** - 无法连续对话的根本原因
  - **GLM消息格式转换** - tool_use和tool_result的正确格式
  - **Agent注册混淆** - schedule-assistant vs time-agent
  - **完整修复方案** - 从问题定位到最终解决
  - **三重叠加问题** - API、注册、锁的综合调试
  - **血泪教训总结** - 真实的debugging经历

- **[04-demo-server配置详解.md](./04-demo-server配置详解.md)** 🔧
  - **工具定义位置** - 第214-248行
  - **工具注册位置** - 第260行
  - **端口配置位置** - 第322行
  - **所有关键配置快速定位表**
  - **常见修改场景示例**

- **[多轮工具调用示例说明.md](./多轮工具调用示例说明.md)** ⭐
  - 完整的多轮工具调用示例代码
  - 三个测试场景（天气+计算、多次计算+分析、复杂组合）
  - 详细的输出解析
  - 扩展建议和常见问题

### 🏗️ 架构设计
- **[项目总览.md](./项目总览.md)** - Kode-SDK + ChatKit-JS 项目架构
- **[多用户架构说明.md](./多用户架构说明.md)** - 多用户系统设计
- **[沙箱资源占用说明.md](./沙箱资源占用说明.md)** - 资源管理说明

## 🎯 学习路径

### 第一步：理解基础概念
1. 阅读 [快速开始.md](./快速开始.md) 了解基本用法
2. 阅读 [工具执行与事件流.md](./工具执行与事件流.md) 理解核心机制

### 第二步：运行示例
1. 查看 [多轮工具调用示例说明.md](./多轮工具调用示例说明.md)
2. 运行示例代码：
   ```bash
   cd /Users/yeya/FlutterProjects/kode-sdk/kode-sdk
   ./examples/run-multi-turn.sh
   ```

### 第三步：深入学习
1. 阅读官方文档：`../kode-sdk/docs/`
2. 查看其他示例：`../kode-sdk/examples/`
3. 参考 [API调用速查表.md](./API调用速查表.md)

## 🔥 重点推荐

### 必看文档（按优先级）
1. ⭐⭐⭐ **[03-Progress事件流与历史持久化完整指南.md](./03-Progress事件流与历史持久化完整指南.md)** - **最重要！** 
   - 解决任务完成判断、历史记忆、前后端连接三大核心问题
   
2. 🩸⭐⭐⭐ **[07-chat路由锁释放与GLM消息格式修复血泪史.md](./07-chat路由锁释放与GLM消息格式修复血泪史.md)** - **真实血泪教训！**
   - 连续对话被锁住的完整修复过程
   - GLM API 格式转换的正确方式
   - 三重问题叠加的综合调试经验
   
3. ⭐⭐ **[03-快速问题排查手册.md](./03-快速问题排查手册.md)** - **遇到问题先看这个！**
   - 5大常见问题的快速解决方案
   
4. ⭐ **[02-工具调用完成后自动继续处理-重大Bug修复.md](./02工具调用完成后自动继续处理-重大Bug修复.md)**
   - 理解工具调用的自动化机制
   
5. ⭐ **[01-工具执行与事件流.md](./01工具执行与事件流.md)** 
   - 理解 Kode-SDK 的核心设计

### 必跑示例
- 🔥 **`examples/03-test-event-differences.ts`** - 验证 done vs tool:end
- 🔥 **`demo-server.ts`** - 完整的生产级服务器（含历史持久化）
- 📊 **`examples/01-agent-inbox.ts`** - 事件驱动基础
- ✅ **`examples/02-approval-control.ts`** - 审批控制

## 📂 文件结构

```
学习笔记/
├── README.md                                              # 本文件 - 导航索引
├── 快速开始.md                                             # 入门指南
├── GLM-配置说明.md                                         # GLM 模型配置
├── API调用速查表.md                                        # API 快速查询
│
├── 01-工具执行与事件流.md ⭐                                 # 核心机制详解
├── 02-工具调用完成后自动继续处理-重大Bug修复.md ⭐            # setImmediate修复
├── 03-Progress事件流与历史持久化完整指南.md ⭐⭐⭐           # 完整解决方案（最重要！）
├── 03-快速问题排查手册.md 🔧                                # 问题速查（必备！）
├── 04-demo-server配置详解.md 🔧                            # 配置位置速查
├── 07-chat路由锁释放与GLM消息格式修复血泪史.md 🩸⭐⭐⭐      # 真实调试血泪史
├── 多轮工具调用示例说明.md ⭐                                # 完整示例教程
│
├── 项目总览.md                                             # 项目架构
├── 多用户架构说明.md                                        # 多用户设计
└── 沙箱资源占用说明.md                                      # 资源管理
```

## 🎓 核心概念速查

### 1. 工具结果自动传递
```typescript
// 核心流程（agent.ts:950-962）
const outcomes = await this.executeTools(toolBlocks);
if (outcomes.length > 0) {
  // 工具结果以 user 角色追加到对话历史
  this.messages.push({ role: 'user', content: outcomes });
  // 触发下一轮 LLM 调用
  this.ensureProcessing();
}
```

### 2. 事件系统三通道
- **Progress** (数据面) → UI 渲染
  - `text_chunk` - 文本增量
  - `tool:start/end` - 工具生命周期
  - `done` - 完成信号

- **Control** (审批面) → 人工决策
  - `permission_required` - 需要审批
  - `permission_decided` - 审批结果

- **Monitor** (治理面) → 审计/告警
  - `tool_executed` - 工具执行审计
  - `error` - 错误分类
  - `state_changed` - 状态变化

### 3. Agent 生命周期
```typescript
// 创建
const agent = await Agent.create(config, deps);

// 发送消息
await agent.send('你的任务');

// 订阅事件
for await (const event of agent.subscribe(['progress'])) {
  // 处理事件
}

// 查看状态
const status = await agent.status();

// 恢复
const agent = await Agent.resumeFromStore('agent-id', deps);
```

## 📝 快速命令

### 运行示例
```bash
# 多轮工具调用示例
cd /Users/yeya/FlutterProjects/kode-sdk/kode-sdk
./examples/run-multi-turn.sh

# 或使用 ts-node
npx ts-node examples/05-multi-turn-tools.ts
```

### 查看文档
```bash
# 打开学习笔记目录
cd /Users/yeya/FlutterProjects/kode-sdk/学习笔记
ls -la

# 阅读特定文档
cat 工具执行与事件流.md
```

## 🔗 相关资源

### 官方文档
- [Kode-SDK GitHub](https://github.com/JOJOtheChemist/Kode-sdk)
- [API 文档](../kode-sdk/docs/)
- [示例代码](../kode-sdk/examples/)

### 外部资源
- [GLM API 文档](https://open.bigmodel.cn/dev/api)
- [Anthropic API](https://docs.anthropic.com/)

## 🆘 常见问题

### Q: 从哪里开始学习？
**A**: 
1. 先读 [快速开始.md](./快速开始.md) 了解基础
2. **必读** [03-Progress事件流与历史持久化完整指南.md](./03-Progress事件流与历史持久化完整指南.md)
3. 遇到问题查 [03-快速问题排查手册.md](./03-快速问题排查手册.md)

### Q: 任务看起来"卡住"了，没有最终回复？
**A**: 查看 [03-快速问题排查手册.md](./03-快速问题排查手册.md) 的"问题1"
- 原因：没有监听 `done` 事件
- 解决：使用 `agent.subscribe(['progress'])` 并处理 `done` 事件

### Q: 重启服务器后忘记了历史对话？
**A**: 查看 [03-快速问题排查手册.md](./03-快速问题排查手册.md) 的"问题2"
- 原因：Agent ID 随机生成
- 解决：使用固定ID + Resume模式

### Q: 前端无法连接后端？
**A**: 查看 [03-快速问题排查手册.md](./03-快速问题排查手册.md) 的"问题3"
- 原因：端口配置不匹配
- 解决：确保前后端端口一致

### Q: 如何理解工具调用流程？
**A**: 查看 [多轮工具调用示例说明.md](./多轮工具调用示例说明.md)，并运行示例代码

### Q: 如何自定义工具？
**A**: 查看 [04-demo-server配置详解.md](./04-demo-server配置详解.md)
- 工具定义：第214-248行
- 工具注册：第260行
- 参考 [API调用速查表.md](./API调用速查表.md)

### Q: 事件系统如何使用？
**A**: 阅读 [01-工具执行与事件流.md](./01工具执行与事件流.md) 的"事件系统三通道"部分

## 📊 学习进度追踪

- [ ] 阅读快速开始指南
- [ ] 理解工具执行与事件流
- [ ] 运行多轮工具调用示例
- [ ] 学会自定义工具
- [ ] 掌握事件系统使用
- [ ] 了解多用户架构
- [ ] 实现自己的 Agent 应用

## 💡 提示

- 📌 标记 ⭐ 的文档是核心必读内容
- 🔥 推荐先运行示例再阅读文档
- 💬 遇到问题可以查看 [常见问题] 章节
- 📖 建议按照 [学习路径] 顺序学习

## 📅 更新记录

### 2025-10-19 v1.4 🩸
- ✅ **新增血泪史文档**：
  - [07-chat路由锁释放与GLM消息格式修复血泪史.md](./07-chat路由锁释放与GLM消息格式修复血泪史.md) 🩸⭐⭐⭐
  - **锁释放时机** - done事件时立即释放锁的完整修复
  - **GLM消息格式** - tool_use和tool_result的正确转换
  - **真实调试经历** - 从烦躁到成功的1.5小时血泪史
  - **三重问题叠加** - API、注册、锁的综合解决方案
- 🔧 **修复关键问题**：
  - server/routes/chat.ts - 锁释放时机修复
  - src/infra/glm-provider.ts - 消息格式完全重构
  - 实现真正的连续对话能力

### 2024-10-16 v1.3 🎉
- ✅ **新增配置文档**：
  - [04-demo-server配置详解.md](./04-demo-server配置详解.md) 🔧
  - 所有配置位置快速定位表
  - 工具/端口/模型配置详解
  - 5大常见修改场景示例

### 2024-10-16 v1.2
- ✅ **新增重要文档**：
  - [03-Progress事件流与历史持久化完整指南.md](./03-Progress事件流与历史持久化完整指南.md) ⭐⭐⭐
  - [03-快速问题排查手册.md](./03-快速问题排查手册.md) 🔧
- ✅ **核心问题解决**：
  - done事件 vs tool:end 的本质区别
  - Agent历史持久化（Resume or Create模式）
  - 前后端端口配置方案
- ✅ **修复 demo-server.ts**：
  - 固定Agent ID实现历史记忆
  - 完整的Progress事件流处理
  - 生产级配置示例

### 2024-10-16 v1.1
- ✅ 新增 [01-工具执行与事件流.md](./01工具执行与事件流.md)
- ✅ 新增 [02-工具调用完成后自动继续处理-重大Bug修复.md](./02工具调用完成后自动继续处理-重大Bug修复.md)
- ✅ 新增 [多轮工具调用示例说明.md](./多轮工具调用示例说明.md)
- ✅ 新增示例代码和启动脚本
- ✅ 更新 [项目总览.md](./项目总览.md)

### 2024-10-13 v1.0
- 初始化学习笔记目录
- 基础文档：快速开始、GLM配置、API速查表

---

**维护者**: AI Assistant & yeya  
**最后更新**: 2025-10-19  
**文档版本**: v1.4

> "我到九点半一直在测试tools，总是出现api问题、注册问题、锁问题，我真的很烦躁"
> 
> 但最终，我们一个一个攻克了所有问题！💪🩸

欢迎贡献和反馈！🎉

