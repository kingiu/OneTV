import { resourceMatcher } from './services/resourceMatcher';

interface MockSearchResult {
  title: string;
  year?: string;
  source: string;
  id: string;
  episodes: string[];
  source_name?: string;
}

function testMatcher() {
  console.log('=== 测试匹配引擎调试 ===\n');

  const query = '危险关系 2026';
  console.log(`查询: "${query}"`);
  console.log('');

  // 模拟从 /api/search 返回的结果
  const mockResults: MockSearchResult[] = [
    // 2026 年版本
    { title: '危险关系 2026', year: '2026', source: 'jsm3u8', id: '1', episodes: ['ep1', 'ep2'], source_name: '极速资源' },
    { title: '危险关系2026', year: '2026', source: 'bilibili', id: '2', episodes: ['ep1', 'ep2'], source_name: '哔哩哔哩' },
    { title: '危险关系 (2026)', year: '2026', source: 'tencent', id: '3', episodes: ['ep1', 'ep2'], source_name: '腾讯视频' },
    { title: '危险关系 2026 剧集', year: '2026', source: 'iqiyi', id: '4', episodes: ['ep1', 'ep2'], source_name: '爱奇艺' },
    
    // 2024 年版本
    { title: '危险关系', year: '2024', source: 'jsm3u8', id: '5', episodes: ['ep1'], source_name: '极速资源' },
    { title: '危险关系 2024', year: '2024', source: 'ffzy', id: '6', episodes: ['ep1'], source_name: '非凡资源' },
    
    // 其他版本
    { title: '危险关系 第二季', year: '2025', source: 'youku', id: '7', episodes: ['ep1', 'ep2'], source_name: '优酷' },
    { title: '危险关系 2023', year: '2023', source: 'mgtv', id: '8', episodes: ['ep1'], source_name: '芒果TV' },
    
    // 相似标题
    { title: '危险的关系', year: '2026', source: 'jsm3u8', id: '9', episodes: ['ep1'], source_name: '极速资源' },
    { title: '危险关系之情迷', year: '2026', source: 'bilibili', id: '10', episodes: ['ep1'], source_name: '哔哩哔哩' },
  ];

  console.log('模拟 API 返回结果 (10个):');
  mockResults.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.title} (${r.source_name}) - 年份: ${r.year} - 剧集: ${r.episodes.length}`);
  });
  console.log('');

  // 测试匹配引擎
  const processed = resourceMatcher.processSearchResults(query, mockResults as any);

  console.log(`匹配引擎处理后:`);
  console.log(`  输入结果: ${mockResults.length} 个`);
  console.log(`  匹配结果: ${processed.matches.length} 个`);
  console.log(`  匹配质量: ${processed.quality.averageScore.toFixed(2)}`);
  console.log('');

  console.log('匹配详细结果:');
  processed.matches.forEach((match, i) => {
    const metadata = match.metadata || { title: '', year: '' };
    console.log(`  ${i + 1}. ${metadata.title} - 分数: ${match.score} - 年份: ${metadata.year}`);
    console.log(`     来源: ${match.result.source_name || match.result.source}`);
    console.log(`     匹配字段: ${match.matchedFields.join(', ')}`);
    console.log('');
  });

  // 检查被过滤的结果
  const filteredCount = mockResults.length - processed.matches.length;
  if (filteredCount > 0) {
    console.log(`被过滤的结果 (${filteredCount}个):`);
    const matchedIds = new Set(processed.matches.map(m => m.result.id));
    mockResults.forEach((r, i) => {
      if (!matchedIds.has(r.id)) {
        console.log(`  ${i + 1}. ${r.title} (${r.source_name}) - 年份: ${r.year}`);
      }
    });
  }
}

testMatcher();
