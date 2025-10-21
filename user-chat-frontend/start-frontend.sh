#!/bin/bash

# 启动前端开发服务器 - 端口 8888
echo "🚀 启动用户多对话管理前端..."
echo "📍 前端地址: http://localhost:8888"
echo "📍 后端地址: http://localhost:2500"
echo "👤 用户: user1"
echo ""
echo "提示: 请确保后端服务在 2500 端口运行"
echo ""

cd "$(dirname "$0")"
npm run dev

