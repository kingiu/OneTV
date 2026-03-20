const https = require('https');

// 测试视频URL
const videoUrl = 'https://ghfast.top/hls/010c37f9502a99b803f902a3a2726d60/010c37f9502a99b803f902a3a2726d60.m3u8';

console.log('Testing video URL:', videoUrl);

const options = {
  method: 'HEAD',
  timeout: 10000
};

const req = https.request(videoUrl, options, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
  res.on('data', (data) => {
    console.log('Response data:', data.toString());
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.on('timeout', () => {
  console.error('Request timed out');
  req.destroy();
});

req.end();
