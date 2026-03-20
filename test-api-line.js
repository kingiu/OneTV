const https = require('https');

const options = {
  hostname: 'cloudtv.aisxuexi.com',
  port: 443,
  path: '/api.php?act=search&q=' + encodeURIComponent('复仇之渊'),
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  if (res.statusCode === 302) {
    console.log('重定向到:', res.headers.location);
    return;
  }
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('API返回的数据结构:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('解析JSON失败:', error);
      console.log('原始数据:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('请求失败:', error);
});

req.end();