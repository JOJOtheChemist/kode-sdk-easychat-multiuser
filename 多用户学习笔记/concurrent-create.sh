#!/bin/bash

echo "=== 并发创建日程测试 ==="
echo "时间: $(date)"
echo "会话1: 用户1创建下午会议"
echo "会话2: 用户2创建上午学习"
echo ""

# 同时发送两个创建日程的请求
(curl -s -w "\n会话1完成，耗时: %{time_total}s\n" -X POST http://localhost:2500/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1","agentId":"schedule-assistant","sessionId":"concurrent_create_1","message":"帮我创建今天下午2点到3点开会的日程"}' &) &

(curl -s -w "\n会话2完成，耗时: %{time_total}s\n" -X POST http://localhost:2500/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"user2","agentId":"schedule-assistant","sessionId":"concurrent_create_2","message":"创建明天上午9点到11点学习Python的日程"}' &) &

# 等待所有请求完成
wait

echo ""
echo "=== 并发测试结束 ==="
echo ""
echo "检查创建的存储目录："
ls -la ./.kode/ | grep concurrent