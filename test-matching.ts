import { resourceMatcher } from './services/resourceMatcher';

interface MockResource {
  title: string;
  year?: string;
  source: string;
  episodes: string[];
}

function testMatching() {
  console.log('=== 测试匹配引擎 ===\n');

  const query = '危险关系 2026';
  console.log(`查询: "${query}"\n`);

  const mockResults: MockResource[] = [
    { title: '危险关系 2026', year: '2026', source: 'jsm3u8', episodes: ['ep1', 'ep2'] },
    { title: '危险关系', year: '2024', source: 'ffzy', episodes: ['ep1'] },
    { title: '危险关系2026', year: '2026', source: 'bilibili', episodes: ['ep1'] },
    { title: '危险关系 2025', year: '2025', source: 'tencent', episodes: ['ep1'] },
    { title: '危险关系(2026)', year: '2026', source: 'iqiyi', episodes: ['ep1'] },
  ];

  console.log('模拟搜索结果:');
  mockResults.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.title} (${r.source}) - 年份: ${r.year}`);
  });
  console.log('');

  const processed = resourceMatcher.processSearchResults(query, mockResults as any);

  console.log(`匹配结果数量: ${processed.matches.length}`);
  console.log('\n匹配结果:');
  processed.matches.forEach((match, i) => {
    const metadata = match.metadata || { title: '', year: '' };
    console.log(`  ${i + 1}. ${metadata.title} - 分数: ${match.score} - 年份: ${metadata.year}`);
    console.log(`     匹配字段: ${match.matchedFields.join(', ')}`);
  });

  console.log(`\n匹配质量: ${processed.quality.averageScore.toFixed(2)}`);
}

testMatching();
