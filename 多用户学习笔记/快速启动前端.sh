#!/bin/bash

echo "=========================================="
echo "🚀 启动前端多会话界面"
echo "=========================================="
echo ""

# 检查后端服务
echo "1️⃣ 检查后端服务..."
if lsof -i :2500 | grep -q LISTEN; then
    echo "   ✅ 后端服务运行正常 (2500端口)"
else
    echo "   ❌ 后端服务未运行"
    echo "   💡 请先启动后端: cd ../kode-sdk && bash restart-backend.sh"
    exit 1
fi

echo ""

# 检查前端是否已运行
echo "2️⃣ 检查前端服务..."
if lsof -i :8888 | grep -q LISTEN; then
    echo "   ✅ 前端服务已运行"
    echo "   📍 http://localhost:8888"
else
    echo "   ⚠️  前端服务未运行，正在启动..."
    
    cd /Users/yeya/FlutterProjects/kode-sdk/user-chat-frontend
    
    # 检查依赖
    if [ ! -d "node_modules" ]; then
        echo "   📦 安装依赖..."
        npm install
    fi
    
    # 启动前端
    echo "   🚀 启动前端服务..."
    npm run dev > frontend.log 2>&1 &
    
    # 等待启动
    sleep 3
    
    if lsof -i :8888 | grep -q LISTEN; then
        echo "   ✅ 前端服务启动成功"
        echo "   📍 http://localhost:8888"
    else
        echo "   ❌ 前端服务启动失败"
        echo "   查看日志: tail -f user-chat-frontend/frontend.log"
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo "✨ 前端界面已就绪！"
echo "=========================================="
echo ""
echo "🌐 访问地址: http://localhost:8888"
echo ""
echo "📚 功能说明:"
echo "  • 左侧: 会话列表（可切换和新建）"
echo "  • 右侧: 对话界面（SSE 流式渲染）"
echo "  • 预设会话: morning_work, afternoon_meeting"
echo ""
echo "🧪 测试建议:"
echo "  1. 发送简单消息: 你好啊"
echo "  2. 测试工具调用: 今天下午3点开会"
echo "  3. 切换会话验证消息隔离"
echo ""
echo "📖 详细文档:"
echo "  cat ../user-chat-frontend/使用指南.md"
echo ""

