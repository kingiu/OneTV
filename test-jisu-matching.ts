import { resourceMatcher } from './services/resourceMatcher';

interface MockSearchResult {
  title: string;
  year?: string;
  source: string;
  id: string;
  episodes: string[];
  source_name?: string;
  play_sources?: any[];
  doubanId?: string;
}

function testJisuMatching() {
  console.log('=== 测试极速资源匹配逻辑 ===\n');

  const query = '危险关系 2026';
  const doubanId = '35065840'; // 危险关系 (2026) 的豆瓣ID
  console.log(`查询: "${query}"`);
  console.log(`豆瓣ID: ${doubanId}`);
  console.log('');

  // 模拟极速资源返回的结果
  const jisuResults: MockSearchResult[] = [
    // 极速资源 - 2026年版本
    { 
      title: '危险关系', 
      year: '2026', 
      source: 'jsm3u8', 
      id: '1', 
      episodes: ['ep1', 'ep2', 'ep3', 'ep4', 'ep5'], 
      source_name: '极速资源',
      doubanId: '35065840' // 精确匹配
    },
    // 极速资源 - 2024年版本
    { 
      title: '危险关系', 
      year: '2024', 
      source: 'jsm3u8', 
      id: '2', 
      episodes: ['ep1', 'ep2', 'ep3'], 
      source_name: '极速资源',
      doubanId: '34967821' // 不同的豆瓣ID
    },
    // 极速资源 - 无年份信息
    { 
      title: '危险关系', 
      source: 'jsm3u8', 
      id: '3', 
      episodes: ['ep1', 'ep2'], 
      source_name: '极速资源'
    },
    // 其他来源 - 2026年版本
    { 
      title: '危险关系 2026', 
      year: '2026', 
      source: 'bilibili', 
      id: '4', 
      episodes: [],
      source_name: '哔哩哔哩',
      doubanId: '35065840',
      play_sources: [{
        name: '哔哩哔哩',
        episodes: ['ep1', 'ep2']
      }]
    },
  ];

  console.log('模拟搜索结果:');
  jisuResults.forEach((r, i) => {
    const hasEpisodes = r.episodes.length > 0 || (r.play_sources && r.play_sources.some(ps => ps.episodes && ps.episodes.length > 0));
    console.log(`  ${i + 1}. ${r.title} (${r.source_name}) - 年份: ${r.year} - 豆瓣ID: ${r.doubanId} - 剧集: ${r.episodes.length} - 有播放源: ${hasEpisodes}`);
  });
  console.log('');

  // 测试匹配引擎
  const processed = resourceMatcher.processSearchResults(query, jisuResults as any, doubanId);
  console.log(`匹配结果: ${processed.matches.length} 个`);
  console.log(`匹配质量: ${JSON.stringify(processed.quality)}`);
  console.log('');

  console.log('匹配详细结果:');
  processed.matches.forEach((match, i) => {
    const metadata = match.metadata || { title: '', year: '', doubanId: '' };
    const result = match.result;
    const hasEpisodes = result.episodes.length > 0 || (result.play_sources && result.play_sources.some((ps: any) => ps.episodes && ps.episodes.length > 0));
    console.log(`  ${i + 1}. ${metadata.title} - 分数: ${match.score} - 年份: ${metadata.year} - 豆瓣ID: ${metadata.doubanId}`);
    console.log(`     来源: ${result.source_name || result.source}`);
    console.log(`     剧集数量: ${result.episodes.length}`);
    console.log(`     有播放源: ${hasEpisodes}`);
    console.log('');
  });

  // 分析极速资源的匹配情况
  const jisuMatches = processed.matches.filter(match => match.result.source === 'jsm3u8' || match.result.source_name === '极速资源');
  console.log(`极速资源匹配结果: ${jisuMatches.length} 个`);
  
  if (jisuMatches.length > 0) {
    console.log('极速资源匹配详情:');
    jisuMatches.forEach((match, i) => {
      const metadata = match.metadata || { title: '', year: '', doubanId: '' };
      console.log(`  ${i + 1}. ${metadata.title} - 分数: ${match.score} - 年份: ${metadata.year} - 豆瓣ID: ${metadata.doubanId}`);
    });
  }

  // 检查是否匹配到了2026年版本
  const jisu2026Match = jisuMatches.find(match => match.metadata?.year === '2026');
  if (jisu2026Match) {
    console.log('\n✅ 成功匹配到极速资源的2026年版本!');
    console.log(`   分数: ${jisu2026Match.score}`);
    console.log(`   豆瓣ID: ${jisu2026Match.metadata?.doubanId}`);
  } else {
    console.log('\n❌ 未匹配到极速资源的2026年版本!');
  }

  console.log('\n=== 测试完成 ===');
}

testJisuMatching();
