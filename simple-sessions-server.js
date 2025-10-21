const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 2500;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.text());

// 获取会话列表的API
app.get('/api/sessions', (req, res) => {
  try {
    const userId = req.query.userId || 'yeya';
    const userDir = path.join(__dirname, 'kode-sdk', '.kode', userId);
    
    console.log(`[API] 查找用户 ${userId} 的会话，路径: ${userDir}`);
    
    if (!fs.existsSync(userDir)) {
      console.log(`[API] 用户目录不存在: ${userDir}`);
      return res.json({
        ok: true,
        sessions: [],
        total: 0,
        userId,
        message: `用户目录不存在: ${userDir}`
      });
    }

    const sessionIds = fs.readdirSync(userDir)
      .filter(item => {
        const itemPath = path.join(userDir, item);
        return fs.statSync(itemPath).isDirectory();
      });
    
    console.log(`[API] 找到 ${sessionIds.length} 个会话:`, sessionIds);
    
    const sessions = sessionIds.map(sessionId => {
      const sessionPath = path.join(userDir, sessionId);
      const metaPath = path.join(sessionPath, 'meta.json');
      
      let meta = {};
      if (fs.existsSync(metaPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        } catch (e) {
          console.error(`读取meta.json失败 (${sessionId}):`, e);
        }
      }
      
      return {
        id: sessionId,
        name: meta.customName || sessionId,
        agentId: sessionId,
        description: `${sessionId} - 会话`,
        type: 'backend',
        messagesCount: 0,
        createdAt: meta.created || new Date().toISOString(),
        updatedAt: meta.updated || new Date().toISOString(),
        isOnline: true,
        category: 'agent',
        userId: meta.userId || userId
      };
    });
    
    res.json({
      ok: true,
      sessions,
      total: sessions.length,
      userId,
      message: `成功读取 ${sessions.length} 个会话 (用户: ${userId})`
    });
  } catch (error) {
    console.error('[API] 获取会话列表失败:', error);
    res.status(500).json({
      ok: false,
      error: error.message || '获取会话列表失败'
    });
  }
});

// 聊天API - 模拟响应
app.post('/api/chat', (req, res) => {
  try {
    const { userId, agentId, sessionId, message } = req.body;
    
    console.log(`[Chat API] 收到聊天请求:`, { userId, agentId, sessionId, message });
    
    // 设置SSE响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // 模拟AI思考过程
    setTimeout(() => {
      res.write('event: thinking\n');
      res.write('data: {"delta": "正在思考..."}\n\n');
    }, 100);

    // 模拟AI回复 - 清空thinking内容，开始正式回复
    setTimeout(() => {
      res.write('event: text\n');
      res.write('data: {"delta": "你好！我收到了你的消息："}\n\n');
    }, 500);

    setTimeout(() => {
      res.write('event: text\n');
      res.write(`data: {"delta": "${message}"}\n\n`);
    }, 1000);

    setTimeout(() => {
      res.write('event: text\n');
      res.write('data: {"delta": "。这是一个模拟回复，因为后端聊天服务还没有完全配置。"}\n\n');
    }, 1500);

    // 模拟工具调用
    setTimeout(() => {
      res.write('event: tool_start\n');
      res.write('data: {"name": "echo", "input": {"message": "模拟工具调用"}}\n\n');
    }, 2000);

    setTimeout(() => {
      res.write('event: tool_end\n');
      res.write('data: {"name": "echo", "output": "工具执行完成", "duration": 100}\n\n');
    }, 2500);

    // 完成响应
    setTimeout(() => {
      res.write('event: complete\n');
      res.write('data: {}\n\n');
      res.end();
    }, 3000);

  } catch (error) {
    console.error('[Chat API] 处理聊天请求失败:', error);
    res.status(500).json({
      ok: false,
      error: error.message || '聊天处理失败'
    });
  }
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 简单会话服务器启动成功!`);
  console.log(`📡 端口: ${PORT}`);
  console.log(`🌐 公网访问: http://0.0.0.0:${PORT}`);
  console.log(`🔗 API地址: http://localhost:${PORT}/api/sessions`);
  console.log(`👤 支持用户: yeya, user2`);
  console.log(`\n测试命令:`);
  console.log(`curl "http://localhost:${PORT}/api/sessions?userId=yeya"`);
  console.log(`curl "http://localhost:${PORT}/api/sessions?userId=user2"`);
  console.log(`\n按 Ctrl+C 停止服务器\n`);
});
