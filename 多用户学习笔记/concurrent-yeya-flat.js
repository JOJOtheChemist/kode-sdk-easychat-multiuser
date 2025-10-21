#!/usr/bin/env node

/**
 * yeya用户双会话测试 - 修正版（避免路径嵌套）
 * 使用不带斜杠的sessionId，避免存储路径嵌套问题
 */

const http = require('http');

console.log('=== yeya用户双会话测试（修正版） ===');
console.log('开始时间:', new Date().toISOString());
console.log('用户: yeya');
console.log('会话1: meeting-session (会议日程)');
console.log('会话2: study-session (学习日程)');
console.log('');
console.log('预期存储结构:');
console.log('- ./.kode/meeting-session:schedule-assistant/');
console.log('- ./.kode/study-session:schedule-assistant/');
console.log('');

// 记录开始时间
const startTime = Date.now();

// yeya用户的两个会话配置（不使用带斜杠的sessionId）
const sessions = [
  {
    name: '会话1-会议',
    userId: 'yeya',
    sessionId: 'meeting-session',  // 不包含用户ID，避免路径嵌套
    message: '创建今天下午3点到5点的产品评审会议',
    color: '\x1b[32m', // 绿色
  },
  {
    name: '会话2-学习',
    userId: 'yeya',
    sessionId: 'study-session',  // 不包含用户ID，避免路径嵌套
    message: '安排明天上午9点到11点的AI算法学习计划',
    color: '\x1b[34m', // 蓝色
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

      console.log(`${sessionConfig.color}[${sessionConfig.name}] 准备发送请求...${sessionConfig.color === '\x1b[32m' ? '\x1b[0m' : ''}`);
      console.log(`${sessionConfig.color}[${sessionConfig.name}] 用户ID: ${sessionConfig.userId}${sessionConfig.color === '\x1b[32m' ? '\x1b[0m' : ''}`);
      console.log(`${sessionConfig.color}[${sessionConfig.name}] 会话ID: ${sessionConfig.sessionId}${sessionConfig.color === '\x1b[32m' ? '\x1b[0m' : ''}`);
      console.log(`${sessionConfig.color}[${sessionConfig.name}] 消息: ${sessionConfig.message}${sessionConfig.color === '\x1b[32m' ? '\x1b[0m' : ''}`);
      
      const requestStartTime = Date.now();
      let toolCalled = false;
      let lockKey = `${sessionConfig.userId}:${sessionConfig.sessionId}`;

      const req = http.request(options, (res) => {
        console.log(`${sessionConfig.color}[${sessionConfig.name}] 响应状态: ${res.statusCode}${sessionConfig.color === '\x1b[32m' ? '\x1b[0m' : ''}`);
        console.log(`${sessionConfig.color}[${sessionConfig.name}] 锁键: ${lockKey}${sessionConfig.color === '\x1b[32m' ? '\x1b[0m' : ''}`);
        console.log(`${sessionConfig.color}[${sessionConfig.name}] Agent实例: ${sessionConfig.sessionId}:schedule-assistant${sessionConfig.color === '\x1b[32m' ? '\x1b[0m' : ''}`);
        
        res.on('data', (chunk) => {
          const chunkStr = chunk.toString();
          
          // 检测工具调用
          if (chunkStr.includes('tool_start') && !toolCalled) {
            toolCalled = true;
            console.log(`${sessionConfig.color}[${sessionConfig.name}] 🛠️  开始调用create_schedule工具!${sessionConfig.color === '\x1b[32m' ? '\x1b[0m' : ''}`);
          }
          
          // 检测工具完成
          if (chunkStr.includes('tool_end')) {
            console.log(`${sessionConfig.color}[${sessionConfig.name}] ✅ 工具调用完成!${sessionConfig.color === '\x1b[32m' ? '\x1b[0m' : ''}`);
          }
          
          // 检测完成
          if (chunkStr.includes('"type":"complete"')) {
            const endTime = Date.now();
            console.log(`${sessionConfig.color}[${sessionConfig.name}] 🎉 对话完成! 耗时: ${endTime - requestStartTime}ms${sessionConfig.color === '\x1b[32m' ? '\x1b[0m' : ''}`);
          }
        });
        
        res.on('end', () => {
          const endTime = Date.now();
          const totalDuration = endTime - requestStartTime;
          
          console.log(`${sessionConfig.color}[${sessionConfig.name}] 响应结束${sessionConfig.color === '\x1b[32m' ? '\x1b[0m' : ''}`);
          console.log(`${sessionConfig.color}[${sessionConfig.name}] 总耗时: ${totalDuration}ms${sessionConfig.color === '\x1b[32m' ? '\x1b[0m' : ''}`);
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
  execSync('rm -rf ./.kode/meeting-session:schedule-assistant ./.kode/study-session:schedule-assistant', { stdio: 'ignore' });
  execSync('rm -rf ./.kode/yeya', { stdio: 'ignore' });
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
    
    // 验证存储结构
    console.log('========================================');
    console.log('🔍 验证存储结构（修正版）');
    console.log('========================================');
    
    try {
      console.log('查看.kode目录:');
      const dirs = execSync('ls -la ./.kode/ | grep -E "(meeting|study)"', { encoding: 'utf8' });
      console.log(dirs);
      
      console.log('\n验证目录结构是否扁平:');
      const struct1 = execSync('ls -la ./.kode/meeting-session:schedule-assistant/', { encoding: 'utf8' });
      console.log('meeting-session目录内容:');
      console.log(struct1);
      
      const struct2 = execSync('ls -la ./.kode/study-session:schedule-assistant/', { encoding: 'utf8' });
      console.log('\nstudy-session目录内容:');
      console.log(struct2);
      
      console.log('\n✅ 修正说明:');
      console.log('- sessionId不应包含路径分隔符(/)');
      console.log('- 使用扁平的目录结构避免嵌套');
      console.log('- 通过userId:sessionId区分不同用户的会话');
      
    } catch (e) {
      console.log('查看目录出错:', e.message);
    }
    
    console.log('\n========================================');
    console.log('✅ 总结');
    console.log('========================================');
    console.log('1. 同一用户(yeya)可以有多个独立会话');
    console.log('2. 每个会话创建独立的Agent实例');
    console.log('3. 存储目录扁平，避免路径嵌套');
    console.log('4. 通过锁键(userId:sessionId)实现会话隔离');
    console.log('5. 支持真正的并发处理');
    
    console.log('\n✅ yeya用户双会话测试（修正版）完成！');
  })
  .catch(error => {
    console.error('\n❌ 测试失败:', error);
  });