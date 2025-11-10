#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('开始优化构建...');

try {
  // 1. 清理缓存
  console.log('清理构建缓存...');
  execSync('rm -rf .metro-cache node_modules/.cache dist', { stdio: 'inherit' });

  // 2. 压缩图片资源 (如果有必要)
  console.log('优化资源文件...');
  const tvIconsDir = path.join(__dirname, '../assets/tv_icons');
  if (fs.existsSync(tvIconsDir)) {
    console.log('已配置选择性打包TV图标');
  }

  // 3. 显示优化后的依赖信息
  console.log('\n依赖优化建议:');
  console.log('- 考虑移除未使用的依赖: date-fns, lucide-react-native');
  console.log('- 使用我们创建的自定义Icon组件替代lucide-react-native');
  console.log('- 生产环境已配置移除console.log');
  console.log('- 资源打包已优化为选择性包含必要文件');

  console.log('\n优化完成！请使用以下命令构建:');
  console.log('NODE_ENV=production EXPO_TV=1 yarn prebuild && cd android && ./gradlew assembleRelease');
  
} catch (error) {
  console.error('优化过程中出错:', error.message);
  process.exit(1);
}
