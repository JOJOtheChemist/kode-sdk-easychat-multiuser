// 并发测试脚本1
const https = require('https');
const http = require('http');

const startTime = Date.now();
console.log(`[${new Date().toISOString()}] 测试1开始 - 创建日程`);

const data = JSON.stringify({
  userId: 'user1',
  agentId: 'schedule-assistant',
  sessionId: 'concurrent_test_1',
  message: '创建今天下午4点开会的日程'
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
  console.log(`[${new Date().toISOString()}] 测试1响应状态: ${res.statusCode}`);
  
  let responseBody = '';
  res.on('data', (chunk) => {
    responseBody += chunk;
  });
  
  res.on('end', () => {
    const endTime = Date.now();
    console.log(`[${new Date().toISOString()}] 测试1完成`);
    console.log(`总耗时: ${endTime - startTime}ms`);
    console.log('响应长度:', responseBody.length);
    if (responseBody) {
      console.log('\n响应内容:');
      console.log(responseBody);
    }
  });
});

req.on('error', (e) => {
  console.error(`[${new Date().toISOString()}] 测试1错误:`, e.message);
});

req.write(data);
req.end();