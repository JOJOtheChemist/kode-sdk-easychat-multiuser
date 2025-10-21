#!/usr/bin/env node

/**
 * yeya用户双会话测试 - 明确的会话归属结构
 * 测试同一个用户(yeya)的多个会话，在存储中体现用户归属
 */

const http = require('http');

console.log('=== yeya用户双会话测试（带用户归属） ===');
console.log('开始时间:', new Date().toISOString());
console.log('用户: yeya');
console.log('会话1: yeya/meeting-session (会议日程)');
console.log('会话2: yeya/study-session (学习日程)');
console.log('');
console.log('预期存储结构:');
console.log('- ./.kode/yeya/meeting-session:schedule-assistant/');
console.log('- ./.kode/yeya/study-session:schedule-assistant/');
console.log('');

// 记录开始时间
const startTime = Date.now();

// yeya用户的两个会话配置
const sessions = [
  {
    name: '会话1-会议',
    userId: 'yeya',
    sessionId: 'yeya/meeting-session',  // 包含用户ID前缀
    message: '创建今天下午3点到5点的产品评审会议',
    color: '\x1b[33m', // 黄色
  },
  {
    name: '会话2-学习',
    userId: 'yeya',
    sessionId: 'yeya/study-session',  // 包含用户ID前缀
    message: '安排明天上午9点到11点的AI算法学习计划',
    color: '\x1b[36m', // 青色
  }
];

// 创建并发请求函数
function createConcurrentRequests() {
  const promises = [];
  
  sessions.forEach((sessionConfig, index) => {
    const promise = new Promise((resolve, reject) => {
      const data = JSON.stringify({
        userId: sessionConfig.userId,
        agentId: 'schedule-assistant',
        sessionId: sessionConfig.sessionId,
        message: sessionConfig.message
      });

      const options = {
        hostname: 'localhost',
        port: 2500,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      console.log(`${sessionConfig.color}[${sessionConfig.name}] 准备发送请求...${sessionConfig.color === '\x1b[33m' ? '\x1b[0m' : ''}`);
      console.log(`${sessionConfig.color}[${sessionConfig.name}] 用户ID: ${sessionConfig.userId}${sessionConfig.color === '\x1b[33m' ? '\x1b[0m' : ''}`);
      console.log(`${sessionConfig.color}[${sessionConfig.name}] 会话ID: ${sessionConfig.sessionId}${sessionConfig.color === '\x1b[33m' ? '\x1b[0m' : ''}`);
      console.log(`${sessionConfig.color}[${sessionConfig.name}] 消息: ${sessionConfig.message}${sessionConfig.color === '\x1b[33m' ? '\x1b[0m' : ''}`);
      
      const requestStartTime = Date.now();
      let toolCalled = false;
      let responseChunks = [];
      let lockKey = `${sessionConfig.userId}:${sessionConfig.sessionId}`;

      const req = http.request(options, (res) => {
        console.log(`${sessionConfig.color}[${sessionConfig.name}] 响应状态: ${res.statusCode}${sessionConfig.color === '\x1b[33m' ? '\x1b[0m' : ''}`);
        console.log(`${sessionConfig.color}[${sessionConfig.name}] 锁键: ${lockKey}${sessionConfig.color === '\x1b[33m' ? '\x1b[0m' : ''}`);
        console.log(`${sessionConfig.color}[${sessionConfig.name}] Agent实例: ${sessionConfig.sessionId}:schedule-assistant${sessionConfig.color === '\x1b[33m' ? '\x1b[0m' : ''}`);
        
        res.on('data', (chunk) => {
          responseChunks.push(chunk);
          const chunkStr = chunk.toString();
          
          // 检测工具调用
          if (chunkStr.includes('tool_start') && !toolCalled) {
            toolCalled = true;
            console.log(`${sessionConfig.color}[${sessionConfig.name}] 🛠️  开始调用create_schedule工具!${sessionConfig.color === '\x1b[33m' ? '\x1b[0m' : ''}`);
          }
          
          // 检测工具完成
          if (chunkStr.includes('tool_end')) {
            console.log(`${sessionConfig.color}[${sessionConfig.name}] ✅ 工具调用完成!${sessionConfig.color === '\x1b[33m' ? '\x1b[0m' : ''}`);
          }
          
          // 检测完成
          if (chunkStr.includes('"type":"complete"')) {
            const endTime = Date.now();
            console.log(`${sessionConfig.color}[${sessionConfig.name}] 🎉 对话完成! 耗时: ${endTime - requestStartTime}ms${sessionConfig.color === '\x1b[33m' ? '\x1b[0m' : ''}`);
          }
        });
        
        res.on('end', () => {
          const endTime = Date.now();
          const totalDuration = endTime - requestStartTime;
          
          console.log(`${sessionConfig.color}[${sessionConfig.name}] 响应结束${sessionConfig.color === '\x1b[33m' ? '\x1b[0m' : ''}`);
          console.log(`${sessionConfig.color}[${sessionConfig.name}] 总耗时: ${totalDuration}ms${sessionConfig.color === '\x1b[33m' ? '\x1b[0m' : ''}`);
          console.log('');
          
          resolve({
            name: sessionConfig.name,
            userId: sessionConfig.userId,
            sessionId: sessionConfig.sessionId,
            lockKey,
            duration: totalDuration,
            toolCalled,
            agentId: `${sessionConfig.sessionId}:schedule-assistant`,
            storagePath: `./.kode/${sessionConfig.sessionId}:schedule-assistant`
          });
        });
      });

      req.on('error', (error) => {
        console.error(`${sessionConfig.color}[${sessionConfig.name}] 请求错误:`, error.message);
        reject(error);
      });

      // 立即发送请求
      req.write(data);
      req.end();
    });
    
    promises.push(promise);
  });
  
  return Promise.all(promises);
}

// 清理之前的测试数据
const { execSync } = require('child_process');
try {
  console.log('清理之前的测试数据...');
  execSync('rm -rf ./.kode/yeva/*', { stdio: 'ignore' });
  execSync('rm -rf ./.kode/yeya/meeting-session:schedule-assistant ./.kode/yeya/study-session:schedule-assistant', { stdio: 'ignore' });
  execSync('rm -rf ./.kode/yeya-meeting-session:schedule-assistant ./.kode/yeya-study-session:schedule-assistant', { stdio: 'ignore' });
  execSync('mkdir -p ./.kode/yeya 2>/dev/null || true', { stdio: 'ignore' });
} catch (e) {
  // 忽略错误
}

// 同时发起所有请求
console.log('⚡ 同时发起两个会话请求...');
console.log('');

createConcurrentRequests()
  .then(results => {
    const totalTime = Date.now() - startTime;
    
    console.log('========================================');
    console.log('📊 测试结果汇总');
    console.log('========================================');
    console.log(`总耗时: ${totalTime}ms`);
    console.log('');
    
    results.forEach(result => {
      console.log(`${result.name}:`);
      console.log(`  - 用户ID: ${result.userId}`);
      console.log(`  - 会话ID: ${result.sessionId}`);
      console.log(`  - 锁键: ${result.lockKey}`);
      console.log(`  - Agent实例: ${result.agentId}`);
      console.log(`  - 存储路径: ${result.storagePath}`);
      console.log(`  - 耗时: ${result.duration}ms`);
      console.log(`  - 工具调用: ${result.toolCalled ? '✅ 成功' : '❌ 失败'}`);
      console.log('');
    });
    
    // 验证数据隔离
    console.log('========================================');
    console.log('🔍 验证存储结构');
    console.log('========================================');
    
    try {
      // 使用tree命令查看目录结构
      console.log('执行: ls -la ./.kode/yeya/');
      const dirs = execSync('ls -la ./.kode/yeya/ 2>/dev/null || echo "yeya目录不存在，查看.kode目录"', { encoding: 'utf8' });
      console.log(dirs);
      
      // 查找所有yeya相关的目录
      console.log('\n查找所有yeya相关的存储目录:');
      const allDirs = execSync('find ./.kode -name "*yeya*" -type d 2>/dev/null', { encoding: 'utf8' });
      if (allDirs.trim()) {
        console.log(allDirs);
      } else {
        console.log('未找到yeya相关目录，查看.kode目录内容:');
        const kodeDirs = execSync('ls -la ./.kode/ | grep -E "(yeya|meeting|study)"', { encoding: 'utf8' });
        console.log(kodeDirs || '没有找到相关目录');
      }
      
      console.log('\n存储结构说明:');
      console.log('当前实现中，sessionId直接作为Agent ID的一部分');
      console.log('所以存储路径格式为: ./.kode/{sessionId}:schedule-assistant/');
      console.log('如果sessionId包含用户前缀，可以体现归属关系');
      
    } catch (e) {
      console.log('查看目录出错:', e.message);
    }
    
    console.log('\n========================================');
    console.log('✅ 多会话架构分析');
    console.log('========================================');
    console.log('1. 每个会话创建独立的Agent实例');
    console.log('2. 通过sessionId区分不同会话');
    console.log('3. 锁键格式: userId:sessionId');
    console.log('4. 不同sessionId可以并发处理');
    console.log('5. 每个会话有独立的runtime存储');
    
    console.log('\n✅ yeya用户双会话测试完成！');
  })
  .catch(error => {
    console.error('\n❌ 测试失败:', error);
  });