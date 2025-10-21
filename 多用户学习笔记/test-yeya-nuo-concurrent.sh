#!/bin/bash

echo "=== 多用户并发创建日程测试 ==="
echo "时间: $(date)"
echo "会话1: yeya创建会议日程"
echo "会话2: nuo创建学习日程"
echo ""

# 清理之前的测试数据
echo "清理之前的测试数据..."
rm -rf ./.kode/yeya-session:schedule-assistant 2>/dev/null
rm -rf ./.kode/nuo-session:schedule-assistant 2>/dev/null

# 同时发送两个创建日程的请求
(curl -s -w "\n[yeya] 会话完成，耗时: %{time_total}s\n" -X POST http://localhost:2500/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"yeya","agentId":"schedule-assistant","sessionId":"yeya-session","message":"帮我记录：今天下午2点到3点开会讨论项目进展，感觉很有收获"}' &) &

(curl -s -w "\n[nuo] 会话完成，耗时: %{time_total}s\n" -X POST http://localhost:2500/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"nuo","agentId":"schedule-assistant","sessionId":"nuo-session","message":"今天上午9点到11点在写代码，实现了新功能，心情不错"}' &) &

# 等待所有请求完成
wait

echo ""
echo "=== 测试结果 ==="
echo ""
echo "检查创建的存储目录："
ls -la ./.kode/ | grep -E "(yeya-session|nuo-session)"

echo ""
echo "=== 数据隔离验证 ==="
echo "yeya的会话数据:"
ls -la ./.kode/yeya-session:schedule-assistant/ 2>/dev/null || echo "  ❌ 未找到yeya的会话目录"

echo ""
echo "nuo的会话数据:"
ls -la ./.kode/nuo-session:schedule-assistant/ 2>/dev/null || echo "  ❌ 未找到nuo的会话目录"

echo ""
echo "=== 工具调用日志 ==="
echo "检查是否有create_schedule工具调用成功:"
grep -r "日程记录创建成功" ./.kode/yeya-session:schedule-assistant/ 2>/dev/null | head -3 || echo "  yeya: 未找到成功日志"
grep -r "日程记录创建成功" ./.kode/nuo-session:schedule-assistant/ 2>/dev/null | head -3 || echo "  nuo: 未找到成功日志"

echo ""
echo "=== 并发测试结束 ==="