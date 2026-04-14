import { resourceMatcher } from './services/resourceMatcher';

interface MockSearchResult {
  title: string;
  year?: string;
  source: string;
  id: string;
  episodes: string[];
  source_name?: string;
  play_sources?: any[];
}

function testEpisodesFilter() {
  console.log('=== 测试剧集过滤逻辑 ===\n');

  const query = '危险关系 2026';
  console.log(`查询: "${query}"`);
  console.log('');

  // 模拟从 /api/search 返回的结果
  const mockResults: MockSearchResult[] = [
    // 有剧集的结果
    { title: '危险关系 2026', year: '2026', source: 'jsm3u8', id: '1', episodes: ['ep1', 'ep2'], source_name: '极速资源' },
    { title: '危险关系2026', year: '2026', source: 'bilibili', id: '2', episodes: ['ep1', 'ep2'], source_name: '哔哩哔哩' },
    
    // 无剧集但有 play_sources 的结果
    { 
      title: '危险关系 2026', 
      year: '2026', 
      source: 'tencent', 
      id: '3', 
      episodes: [], // 无剧集
      source_name: '腾讯视频',
      play_sources: [{
        name: '腾讯视频',
        episodes: ['ep1', 'ep2']
      }]
    },
    
    // 无剧集且无 play_sources 的结果
    { title: '危险关系 2026', year: '2026', source: 'iqiyi', id: '4', episodes: [], source_name: '爱奇艺' },
    
    // 2024 年版本
    { title: '危险关系', year: '2024', source: 'jsm3u8', id: '5', episodes: ['ep1'], source_name: '极速资源' },
  ];

  console.log('模拟 API 返回结果 (5个):');
  mockResults.forEach((r, i) => {
    const hasEpisodes = r.episodes.length > 0 || (r.play_sources && r.play_sources.some(ps => ps.episodes && ps.episodes.length > 0));
    console.log(`  ${i + 1}. ${r.title} (${r.source_name}) - 年份: ${r.year} - 剧集: ${r.episodes.length} - 有播放源: ${hasEpisodes}`);
  });
  console.log('');

  // 测试匹配引擎
  const processed = resourceMatcher.processSearchResults(query, mockResults as any);

  console.log(`匹配引擎处理后:`);
  console.log(`  输入结果: ${mockResults.length} 个`);
  console.log(`  匹配结果: ${processed.matches.length} 个`);
  console.log('');

  console.log('匹配详细结果:');
  processed.matches.forEach((match, i) => {
    const metadata = match.metadata || { title: '', year: '' };
    const result = match.result;
    const hasEpisodes = result.episodes.length > 0 || (result.play_sources && result.play_sources.some((ps: any) => ps.episodes && ps.episodes.length > 0));
    console.log(`  ${i + 1}. ${metadata.title} - 分数: ${match.score} - 年份: ${metadata.year}`);
    console.log(`     来源: ${result.source_name || result.source}`);
    console.log(`     剧集数量: ${result.episodes.length}`);
    console.log(`     有播放源: ${hasEpisodes}`);
    console.log('');
  });

  // 检查被过滤的结果
  const filteredCount = mockResults.length - processed.matches.length;
  if (filteredCount > 0) {
    console.log(`被过滤的结果 (${filteredCount}个):`);
    const matchedIds = new Set(processed.matches.map(m => m.result.id));
    mockResults.forEach((r, i) => {
      if (!matchedIds.has(r.id)) {
        const hasEpisodes = r.episodes.length > 0 || (r.play_sources && r.play_sources.some(ps => ps.episodes && ps.episodes.length > 0));
        console.log(`  ${i + 1}. ${r.title} (${r.source_name}) - 年份: ${r.year} - 剧集: ${r.episodes.length} - 有播放源: ${hasEpisodes}`);
      }
    });
  }
}

testEpisodesFilter();
