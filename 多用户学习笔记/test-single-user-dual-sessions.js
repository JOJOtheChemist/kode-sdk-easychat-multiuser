/**
 * 单用户双会话测试
 * 测试同一个用户下两个独立的会话（runtime）
 */

const http = require('http');

const userId = 'user1';
const sessions = [
  {
    sessionId: 'morning_work',
    message: '今天上午9点到12点写代码，完成了新功能'
  },
  {
    sessionId: 'afternoon_meeting',
    message: '下午2点到4点开会讨论项目进展'
  }
];

console.log('='.repeat(70));
console.log('🧪 单用户双会话测试');
console.log('='.repeat(70));
console.log(`用户: ${userId}`);
console.log(`会话1: ${sessions[0].sessionId}`);
console.log(`会话2: ${sessions[1].sessionId}`);
console.log('='.repeat(70));
console.log('');

/**
 * 发送消息到指定会话
 */
function sendMessage(session, index) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 会话${index} 开始 - ${session.sessionId}`);
    
    const data = JSON.stringify({
      userId: userId,
      agentId: 'schedule-assistant',
      sessionId: session.sessionId,
      message: session.message
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

    const req = http.request(options, (res) => {
      console.log(`[${new Date().toISOString()}] 会话${index} 响应状态: ${res.statusCode}`);
      
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`[${new Date().toISOString()}] 会话${index} 完成`);
        console.log(`  耗时: ${duration}ms (${(duration/1000).toFixed(1)}秒)`);
        console.log(`  响应长度: ${responseBody.length} 字节`);
        
        // 提取关键信息
        const lines = responseBody.split('\n');
        const toolCalls = lines.filter(line => line.includes('event: tool')).length;
        const completed = lines.some(line => line.includes('event: complete'));
        
        console.log(`  工具调用: ${toolCalls > 0 ? '✅' : '❌'} (${toolCalls}次)`);
        console.log(`  完成状态: ${completed ? '✅' : '❌'}`);
        console.log('');
        
        resolve({
          session: session.sessionId,
          duration,
          statusCode: res.statusCode,
          responseLength: responseBody.length,
          toolCalls,
          completed
        });
      });
    });

    req.on('error', (e) => {
      console.error(`[${new Date().toISOString()}] 会话${index} 错误:`, e.message);
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

/**
 * 顺序执行测试
 */
async function runSequential() {
  console.log('📝 顺序执行测试（先会话1，后会话2）');
  console.log('-'.repeat(70));
  console.log('');
  
  const results = [];
  
  for (let i = 0; i < sessions.length; i++) {
    const result = await sendMessage(sessions[i], i + 1);
    results.push(result);
    
    if (i < sessions.length - 1) {
      console.log('⏳ 等待 2 秒后继续下一个会话...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

/**
 * 并发执行测试
 */
async function runConcurrent() {
  console.log('⚡ 并发执行测试（同时发送两个会话请求）');
  console.log('-'.repeat(70));
  console.log('');
  
  const promises = sessions.map((session, index) => 
    sendMessage(session, index + 1)
  );
  
  const results = await Promise.all(promises);
  return results;
}

/**
 * 验证存储结构
 */
async function verifyStorage() {
  const { execSync } = require('child_process');
  
  console.log('='.repeat(70));
  console.log('📂 验证存储结构');
  console.log('='.repeat(70));
  console.log('');
  
  try {
    console.log('查找 user1 的会话目录：');
    const dirs = execSync(
      'find /Users/yeya/FlutterProjects/kode-sdk/kode-sdk/.kode/user1 -type d -maxdepth 1 2>/dev/null || echo "未找到"',
      { encoding: 'utf-8' }
    );
    console.log(dirs);
    
    console.log('\n检查会话1的文件：');
    const session1Files = execSync(
      `find /Users/yeya/FlutterProjects/kode-sdk/kode-sdk/.kode/user1/${sessions[0].sessionId} -type f 2>/dev/null || echo "未找到"`,
      { encoding: 'utf-8' }
    );
    console.log(session1Files);
    
    console.log('\n检查会话2的文件：');
    const session2Files = execSync(
      `find /Users/yeya/FlutterProjects/kode-sdk/kode-sdk/.kode/user1/${sessions[1].sessionId} -type f 2>/dev/null || echo "未找到"`,
      { encoding: 'utf-8' }
    );
    console.log(session2Files);
    
  } catch (error) {
    console.error('验证存储时出错:', error.message);
  }
}

/**
 * 打印测试结果摘要
 */
function printSummary(results, testType) {
  console.log('='.repeat(70));
  console.log(`📊 ${testType} - 测试结果摘要`);
  console.log('='.repeat(70));
  console.log('');
  
  console.log('| 会话 | 状态 | 耗时 | 工具调用 | 完成 |');
  console.log('|------|------|------|----------|------|');
  
  results.forEach((result, index) => {
    const status = result.statusCode === 200 ? '✅' : '❌';
    const duration = `${(result.duration / 1000).toFixed(1)}s`;
    const tools = result.toolCalls > 0 ? `✅ ${result.toolCalls}次` : '❌';
    const completed = result.completed ? '✅' : '❌';
    
    console.log(`| 会话${index + 1} | ${status} | ${duration} | ${tools} | ${completed} |`);
  });
  
  console.log('');
  
  // 总结
  const allSuccess = results.every(r => r.statusCode === 200 && r.completed);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const avgDuration = totalDuration / results.length;
  
  console.log(`总体结果: ${allSuccess ? '✅ 全部成功' : '❌ 部分失败'}`);
  console.log(`总耗时: ${(totalDuration / 1000).toFixed(1)}秒`);
  console.log(`平均耗时: ${(avgDuration / 1000).toFixed(1)}秒`);
  console.log('');
}

/**
 * 主函数
 */
async function main() {
  const testMode = process.argv[2] || 'sequential'; // 默认顺序执行
  
  try {
    let results;
    
    if (testMode === 'concurrent') {
      results = await runConcurrent();
      printSummary(results, '并发测试');
    } else {
      results = await runSequential();
      printSummary(results, '顺序测试');
    }
    
    // 验证存储结构
    await verifyStorage();
    
    console.log('='.repeat(70));
    console.log('✅ 测试完成！');
    console.log('='.repeat(70));
    console.log('');
    console.log('💡 提示：');
    console.log('  - 顺序测试: node test-single-user-dual-sessions.js sequential');
    console.log('  - 并发测试: node test-single-user-dual-sessions.js concurrent');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
main();
