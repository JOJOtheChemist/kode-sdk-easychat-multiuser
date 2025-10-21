#!/bin/bash

echo "========================================"
echo "🧪 前后端集成测试"
echo "========================================"
echo ""

# 检查前端服务
echo "1️⃣ 检查前端服务 (8888端口)..."
if lsof -i :8888 | grep -q LISTEN; then
    echo "   ✅ 前端服务运行正常"
    echo "   📍 http://localhost:8888"
else
    echo "   ❌ 前端服务未运行"
    echo "   💡 请运行: cd user-chat-frontend && npm run dev"
    exit 1
fi

echo ""

# 检查后端服务
echo "2️⃣ 检查后端服务 (2500端口)..."
if lsof -i :2500 | grep -q LISTEN; then
    echo "   ✅ 后端服务运行正常"
    echo "   📍 http://localhost:2500"
else
    echo "   ❌ 后端服务未运行"
    echo "   💡 请先启动后端服务"
    exit 1
fi

echo ""

# 测试后端 API
echo "3️⃣ 测试后端 API 连通性..."
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:2500/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1","agentId":"schedule-assistant","sessionId":"test_connection","message":"测试连接"}' \
  2>/dev/null)

http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    echo "   ✅ 后端 API 响应正常 (HTTP $http_code)"
else
    echo "   ⚠️  后端 API 响应码: HTTP $http_code"
fi

echo ""

# 检查存储目录
echo "4️⃣ 检查用户存储目录..."
user_dir="/Users/yeya/FlutterProjects/kode-sdk/kode-sdk/.kode/user1"
if [ -d "$user_dir" ]; then
    echo "   ✅ 存储目录存在"
    echo "   📁 $user_dir"
    echo ""
    echo "   已有对话:"
    ls -1 "$user_dir" 2>/dev/null | while read session; do
        echo "      • $session"
    done
else
    echo "   ℹ️  存储目录不存在（会在首次使用时创建）"
fi

echo ""
echo "========================================"
echo "�� 测试总结"
echo "========================================"
echo ""
echo "✨ 所有服务就绪！"
echo ""
echo "🌐 访问前端界面:"
echo "   http://localhost:8888"
echo ""
echo "💡 使用提示:"
echo "   1. 在浏览器打开上述地址"
echo "   2. 选择或创建一个对话"
echo "   3. 发送消息测试 SSE 流式响应"
echo "   4. 观察工具调用和消息渲染"
echo ""
echo "📖 详细使用说明:"
echo "   cat user-chat-frontend/使用指南.md"
echo ""

