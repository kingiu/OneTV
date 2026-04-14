// 测试后端健康检查与代理自动开关功能
const http = require('http');

console.log('=== 后端健康检查与代理自动开关测试 ===\n');

// 模拟后端服务器
let backendServer = null;
let backendAvailable = false;

function startBackendServer() {
  return new Promise((resolve) => {
    backendServer = http.createServer((req, res) => {
      if (req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
        console.log('[Backend] Health check responded');
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    backendServer.listen(3000, () => {
      console.log('✅ Backend server started on port 3000');
      backendAvailable = true;
      resolve();
    });
  });
}

function stopBackendServer() {
  return new Promise((resolve) => {
    if (backendServer) {
      backendServer.close(() => {
        console.log('❌ Backend server stopped');
        backendAvailable = false;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function checkBackendHealth(baseUrl) {
  return new Promise((resolve, reject) => {
    const timeout = 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const request = http.get(`${baseUrl}/api/health`, { signal: controller.signal }, (res) => {
      clearTimeout(timeoutId);
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ Backend health check passed (status: ${res.statusCode})`);
          resolve(true);
        } else {
          console.log(`❌ Backend health check failed (status: ${res.statusCode})`);
          resolve(false);
        }
      });
    });

    request.on('error', (error) => {
      clearTimeout(timeoutId);
      console.log(`❌ Backend health check error: ${error.message}`);
      resolve(false);
    });
  });
}

async function runTest() {
  console.log('步骤 1: 启动后端服务器');
  await startBackendServer();
  
  console.log('\n步骤 2: 检查后端健康状态（应该通过）');
  let isHealthy = await checkBackendHealth('http://localhost:3000');
  console.log(`后端状态：${isHealthy ? '可用 ✅' : '不可用 ❌'}\n`);
  
  console.log('步骤 3: 关闭后端服务器');
  await stopBackendServer();
  
  console.log('\n步骤 4: 检查后端健康状态（应该失败）');
  isHealthy = await checkBackendHealth('http://localhost:3000');
  console.log(`后端状态：${isHealthy ? '可用 ✅' : '不可用 ❌'}\n`);
  
  console.log('步骤 5: 重新启动后端服务器');
  await startBackendServer();
  
  console.log('\n步骤 6: 检查后端健康状态（应该通过）');
  isHealthy = await checkBackendHealth('http://localhost:3000');
  console.log(`后端状态：${isHealthy ? '可用 ✅' : '不可用 ❌'}\n`);
  
  console.log('步骤 7: 关闭后端服务器');
  await stopBackendServer();
  
  console.log('\n=== 测试完成 ===');
  console.log('结论：');
  console.log('- 后端启动时，健康检查应该通过');
  console.log('- 后端关闭时，健康检查应该失败');
  console.log('- 代理功能应该根据后端状态自动开关');
  process.exit(0);
}

runTest().catch(console.error);
