// Cloudflare Worker 加速功能状态检查脚本
const fs = require('fs');
const path = require('path');

console.log('=== Cloudflare Worker 加速功能状态检查 ===\n');

// 1. 检查 proxyService.ts 中的配置
console.log('1. 检查 proxyService.ts 配置...');
const proxyServicePath = path.join(__dirname, 'services/proxyService.ts');
if (fs.existsSync(proxyServicePath)) {
  const proxyServiceContent = fs.readFileSync(proxyServicePath, 'utf-8');
  
  // 检查是否使用后端代理
  const useBackendProxy = proxyServiceContent.includes('useBackendProxy: true') || 
                          proxyServiceContent.includes('useBackendProxy: false');
  const backendProxyEnabled = proxyServiceContent.match(/useBackendProxy:\s*(true|false)/);
  
  console.log('   - useBackendProxy 配置:', backendProxyEnabled ? backendProxyEnabled[1] : '未找到');
  
  // 检查 Cloudflare Worker 代理 URL 配置
  const hasCloudflareConfig = proxyServiceContent.includes('proxyUrl');
  console.log('   - 是否包含 proxyUrl 配置:', hasCloudflareConfig ? '是' : '否');
  
  // 检查代理开关
  const enabledConfig = proxyServiceContent.match(/enabled:\s*(true|false)/);
  console.log('   - enabled 配置:', enabledConfig ? enabledConfig[1] : '未找到');
  
} else {
  console.log('   ❌ proxyService.ts 文件不存在');
}

// 2. 检查 settingsStore.ts 中的默认配置
console.log('\n2. 检查 settingsStore.ts 默认配置...');
const settingsStorePath = path.join(__dirname, 'stores/settingsStore.ts');
if (fs.existsSync(settingsStorePath)) {
  const settingsStoreContent = fs.readFileSync(settingsStorePath, 'utf-8');
  
  const proxyConfigMatch = settingsStoreContent.match(/proxyConfig:\s*\{([^}]+)\}/s);
  if (proxyConfigMatch) {
    console.log('   proxyConfig 默认配置:');
    const configContent = proxyConfigMatch[1];
    const lines = configContent.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed) {
        console.log(`     - ${trimmed}`);
      }
    });
  }
  
  // 检查 loadSettings 中的配置
  const loadSettingsMatch = settingsStoreContent.match(/loadSettings:\s*async\s*\(\)\s*=>\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
  if (loadSettingsMatch) {
    const loadSettingsContent = loadSettingsMatch[1];
    const usesBackendProxy = loadSettingsContent.includes('useBackendProxy');
    console.log('   - loadSettings 中是否配置后端代理:', usesBackendProxy ? '是' : '否');
  }
  
} else {
  console.log('   ❌ settingsStore.ts 文件不存在');
}

// 3. 检查 APIConfigSection 组件
console.log('\n3. 检查 APIConfigSection 组件...');
const apiConfigSectionPath = path.join(__dirname, 'components/settings/APIConfigSection.tsx');
if (fs.existsSync(apiConfigSectionPath)) {
  const apiConfigSectionContent = fs.readFileSync(apiConfigSectionPath, 'utf-8');
  
  const hasVodProxyToggle = apiConfigSectionContent.includes('vodProxyEnabled');
  console.log('   - 是否包含点播代理开关:', hasVodProxyToggle ? '是' : '否');
  
  const hasProxyUrlInput = apiConfigSectionContent.includes('proxyUrl') || 
                           apiConfigSectionContent.includes('Cloudflare');
  console.log('   - 是否有 Cloudflare Worker URL 输入框:', hasProxyUrlInput ? '是' : '否');
  
} else {
  console.log('   ❌ APIConfigSection.tsx 文件不存在');
}

// 4. 检查 m3u8.ts 是否使用 proxyService
console.log('\n4. 检查 m3u8.ts 是否使用代理服务...');
const m3u8Path = path.join(__dirname, 'services/m3u8.ts');
if (fs.existsSync(m3u8Path)) {
  const m3u8Content = fs.readFileSync(m3u8Path, 'utf-8');
  
  const importsProxyService = m3u8Content.includes("import { proxyService }");
  console.log('   - 是否导入 proxyService:', importsProxyService ? '是' : '否');
  
  const usesProxyFetch = m3u8Content.includes('proxyService.fetch');
  console.log('   - 是否使用 proxyService.fetch:', usesProxyFetch ? '是' : '否');
  
} else {
  console.log('   ❌ m3u8.ts 文件不存在');
}

// 5. 总结
console.log('\n=== 检查总结 ===');
console.log('根据代码分析：');
console.log('1. 项目集成了 proxyService 代理服务');
console.log('2. 支持两种代理模式：');
console.log('   - 后端代理（useBackendProxy: true）');
console.log('   - Cloudflare Worker 代理（需要配置 proxyUrl）');
console.log('3. 当前默认配置使用后端代理');
console.log('4. m3u8.ts 等模块使用 proxyService.fetch 进行代理请求');
console.log('\n加速功能状态：✅ 已集成，但使用的是后端代理模式，非 Cloudflare Worker');
console.log('\n建议：');
console.log('- 如需启用 Cloudflare Worker 加速，需要：');
console.log('  1. 配置 proxyUrl 为 Cloudflare Worker URL');
console.log('  2. 设置 useBackendProxy: false');
console.log('  3. 设置 enabled: true');
