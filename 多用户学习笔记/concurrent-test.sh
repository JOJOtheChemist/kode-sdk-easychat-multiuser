#!/bin/bash

echo "=== 并发测试开始 ==="
echo "时间: $(date)"

# 同时发送两个请求
(curl -s -w "\n测试1完成，耗时: %{time_total}s\n" -X POST http://localhost:2500/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1","agentId":"schedule-assistant","sessionId":"test1","message":"创建日程"}' &) &

(curl -s -w "\n测试2完成，耗时: %{time_total}s\n" -X POST http://localhost:2500/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"user2","agentId":"schedule-assistant","sessionId":"test2","message":"查询日程"}' &) &

# 等待所有请求完成
wait

echo "=== 并发测试结束 ==="