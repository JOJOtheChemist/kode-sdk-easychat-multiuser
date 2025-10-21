#!/usr/bin/env node

/**
 * yeya和yue双用户并发创建日程测试
 * 确保两个请求同时发起，并且都调用create_schedule工具
 */

const http = require('http');
const https = require('https');

console.log('=== yeya和yue并发创建日程测试 ===');
console.log('开始时间:', new Date().toISOString());
console.log('');

// 记录开始时间
const startTime = Date.now();

// 用户请求配置
const requests = [
  {
    name: 'yeya',
    userId: 'yeya',
    sessionId: 'yeya-session',
    message: '帮我创建今天下午3点到4点的产品会议日程，主题是讨论新功能开发',
    color: '\x1b[31m', // 红色
  },
  {
    name: 'yue',
    userId: 'yue',
    sessionId: 'yue-session',
    message: '创建明天上午10点到11点的学习计划，学习Python编程',
    color: '\x1b[34m', // 蓝色
  }
];

// 创建并发请求函数
function createConcurrentRequests() {
  const promises = [];
  
  requests.forEach((reqConfig, index) => {
    const promise = new Promise((resolve, reject) => {
      const data = JSON.stringify({
        userId: reqConfig.userId,
        agentId: 'schedule-assistant',
        sessionId: reqConfig.sessionId,
        message: reqConfig.message
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

      console.log(`${reqConfig.color}[${reqConfig.name}] 准备发送请求...${reqConfig.color === '\x1b[31m' ? '\x1b[0m' : ''}`);
      console.log(`${reqConfig.color}[${reqConfig.name}] 消息: ${reqConfig.message}${reqConfig.color === '\x1b[31m' ? '\x1b[0m' : ''}`);
      
      const requestStartTime = Date.now();
      let toolCalled = false;
      let responseChunks = [];

      const req = http.request(options, (res) => {
        console.log(`${reqConfig.color}[${reqConfig.name}] 响应状态: ${res.statusCode}${reqConfig.color === '\x1b[31m' ? '\x1b[0m' : ''}`);
        
        res.on('data', (chunk) => {
          responseChunks.push(chunk);
          const chunkStr = chunk.toString();
          
          // 检测工具调用
          if (chunkStr.includes('tool_start') && !toolCalled) {
            toolCalled = true;
            console.log(`${reqConfig.color}[${reqConfig.name}] 🛠️  开始调用create_schedule工具!${reqConfig.color === '\x1b[31m' ? '\x1b[0m' : ''}`);
          }
          
          // 检测工具完成
          if (chunkStr.includes('tool_end')) {
            console.log(`${reqConfig.color}[${reqConfig.name}] ✅ 工具调用完成!${reqConfig.color === '\x1b[31m' ? '\x1b[0m' : ''}`);
          }
          
          // 检测完成
          if (chunkStr.includes('"type":"complete"')) {
            const endTime = Date.now();
            console.log(`${reqConfig.color}[${reqConfig.name}] 🎉 对话完成! 耗时: ${endTime - requestStartTime}ms${reqConfig.color === '\x1b[31m' ? '\x1b[0m' : ''}`);
          }
        });
        
        res.on('end', () => {
          const endTime = Date.now();
          const totalDuration = endTime - requestStartTime;
          
          console.log(`${reqConfig.color}[${reqConfig.name}] 响应结束${reqConfig.color === '\x1b[31m' ? '\x1b[0m' : ''}`);
          console.log(`${reqConfig.color}[${reqConfig.name}] 总耗时: ${totalDuration}ms${reqConfig.color === '\x1b[31m' ? '\x1b[0m' : ''}`);
          console.log(`${reqConfig.color}[${reqConfig.name}] 收到数据块: ${responseChunks.length}${reqConfig.color === '\x1b[31m' ? '\x1b[0m' : ''}`);
          console.log('');
          
          resolve({
            name: reqConfig.name,
            userId: reqConfig.userId,
            duration: totalDuration,
            toolCalled,
            chunks: responseChunks.length
          });
        });
      });

      req.on('error', (error) => {
        console.error(`${reqConfig.color}[${reqConfig.name}] 请求错误:`, error.message);
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
  execSync('rm -rf ./.kode/yeya-session:schedule-assistant ./.kode/yue-session:schedule-assistant', { stdio: 'ignore' });
} catch (e) {
  // 忽略错误
}

// 同时发起所有请求
console.log('⚡ 同时发起请求...');
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
      console.log(`  - 耗时: ${result.duration}ms`);
      console.log(`  - 工具调用: ${result.toolCalled ? '✅ 成功' : '❌ 失败'}`);
      console.log(`  - 数据块数: ${result.chunks}`);
      console.log('');
    });
    
    // 验证数据隔离
    console.log('========================================');
    console.log('🔍 验证数据隔离');
    console.log('========================================');
    
    try {
      const dirs = execSync('ls -la ./.kode/ | grep -E "(yeya-session|yue-session)"', { encoding: 'utf8' });
      console.log(dirs);
      
      // 检查工具调用日志
      console.log('\n工具调用成功日志:');
      try {
        const yeyaLogs = execSync('grep -c "日程记录创建成功" ./.kode/yeya-session:schedule-assistant/runtime/messages.json 2>/dev/null || echo "0"', { encoding: 'utf8' });
        const yueLogs = execSync('grep -c "日程记录创建成功" ./.kode/yue-session:schedule-assistant/runtime/messages.json 2>/dev/null || echo "0"', { encoding: 'utf8' });
        console.log(`yeya 成功创建次数: ${yeyaLogs.trim()}`);
        console.log(`yue 成功创建次数: ${yueLogs.trim()}`);
      } catch (e) {
        console.log('未找到成功日志（可能数据还在写入）');
      }
    } catch (e) {
      console.log('未找到存储目录');
    }
    
    console.log('\n✅ 并发测试完成！');
  })
  .catch(error => {
    console.error('\n❌ 测试失败:', error);
  });