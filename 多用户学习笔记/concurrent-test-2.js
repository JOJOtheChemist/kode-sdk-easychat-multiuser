// 并发测试脚本2
const https = require('https');
const http = require('http');

const startTime = Date.now();
console.log(`[${new Date().toISOString()}] 测试2开始 - 查询日程`);

const data = JSON.stringify({
  userId: 'user2',
  agentId: 'schedule-assistant',
  sessionId: 'concurrent_test_2',
  message: '查看明天的日程安排'
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
  console.log(`[${new Date().toISOString()}] 测试2响应状态: ${res.statusCode}`);
  
  let responseBody = '';
  res.on('data', (chunk) => {
    responseBody += chunk;
  });
  
  res.on('end', () => {
    const endTime = Date.now();
    console.log(`[${new Date().toISOString()}] 测试2完成`);
    console.log(`总耗时: ${endTime - startTime}ms`);
    console.log('响应长度:', responseBody.length);
    if (responseBody) {
      console.log('\n响应内容:');
      console.log(responseBody);
    }
  });
});

req.on('error', (e) => {
  console.error(`[${new Date().toISOString()}] 测试2错误:`, e.message);
});

req.write(data);
req.end();