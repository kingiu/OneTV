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

function testActualSearchFlow() {
  console.log('=== 测试实际搜索流程 ===\n');

  const query = '危险关系 2026';
  const doubanId = '35065840'; // 危险关系 (2026) 的豆瓣ID
  console.log(`查询: "${query}"`);
  console.log(`豆瓣ID: ${doubanId}`);
  console.log('');

  // 模拟从 /api/search 返回的20个结果
  const mockResults: MockSearchResult[] = [
    // 极速资源 - 2026年版本
    { title: '危险关系', year: '2026', source: 'jsm3u8', id: '1', episodes: ['ep1', 'ep2'], source_name: '极速资源', doubanId: '35065840' },
    
    // 哔哩哔哩 - 2026年版本
    { title: '危险关系', year: '2026', source: 'bilibili', id: '2', episodes: [], source_name: '哔哩哔哩', doubanId: '35065840', play_sources: [{ name: '哔哩哔哩', episodes: ['ep1', 'ep2'] }] },
    
    // 腾讯视频 - 2026年版本
    { title: '危险关系 2026', year: '2026', source: 'tencent', id: '3', episodes: ['ep1', 'ep2'], source_name: '腾讯视频' },
    
    // 爱奇艺 - 2026年版本
    { title: '危险关系', year: '2026', source: 'iqiyi', id: '4', episodes: [], source_name: '爱奇艺', doubanId: '35065840', play_sources: [{ name: '爱奇艺', episodes: ['ep1', 'ep2'] }] },
    
    // 优酷 - 2026年版本
    { title: '危险关系 2026', year: '2026', source: 'youku', id: '5', episodes: ['ep1', 'ep2'], source_name: '优酷' },
    
    // 芒果TV - 2026年版本
    { title: '危险关系', year: '2026', source: 'mgtv', id: '6', episodes: [], source_name: '芒果TV', doubanId: '35065840', play_sources: [{ name: '芒果TV', episodes: ['ep1', 'ep2'] }] },
    
    // 乐视视频 - 2026年版本
    { title: '危险关系 2026', year: '2026', source: 'le.com', id: '7', episodes: ['ep1', 'ep2'], source_name: '乐视视频' },
    
    // PPTV - 2026年版本
    { title: '危险关系', year: '2026', source: 'pptv', id: '8', episodes: [], source_name: 'PPTV', doubanId: '35065840', play_sources: [{ name: 'PPTV', episodes: ['ep1', 'ep2'] }] },
    
    // 1905电影网 - 2026年版本
    { title: '危险关系 2026', year: '2026', source: '1905', id: '9', episodes: ['ep1', 'ep2'], source_name: '1905电影网' },
    
    // 搜狐视频 - 2026年版本
    { title: '危险关系', year: '2026', source: 'sohu', id: '10', episodes: [], source_name: '搜狐视频', doubanId: '35065840', play_sources: [{ name: '搜狐视频', episodes: ['ep1', 'ep2'] }] },
    
    // 风行网 - 2026年版本
    { title: '危险关系 2026', year: '2026', source: 'funshion', id: '11', episodes: ['ep1', 'ep2'], source_name: '风行网' },
    
    // 暴风影音 - 2026年版本
    { title: '危险关系', year: '2026', source: 'baofeng', id: '12', episodes: [], source_name: '暴风影音', doubanId: '35065840', play_sources: [{ name: '暴风影音', episodes: ['ep1', 'ep2'] }] },
    
    // 华数TV - 2026年版本
    { title: '危险关系 2026', year: '2026', source: 'wasu', id: '13', episodes: ['ep1', 'ep2'], source_name: '华数TV' },
    
    // 咪咕视频 - 2026年版本
    { title: '危险关系', year: '2026', source: 'migu', id: '14', episodes: [], source_name: '咪咕视频', doubanId: '35065840', play_sources: [{ name: '咪咕视频', episodes: ['ep1', 'ep2'] }] },
    
    // 西瓜视频 - 2026年版本
    { title: '危险关系 2026', year: '2026', source: 'ixigua', id: '15', episodes: ['ep1', 'ep2'], source_name: '西瓜视频' },
    
    // 韩剧TV - 2026年版本
    { title: '危险关系', year: '2026', source: 'hanjutv', id: '16', episodes: [], source_name: '韩剧TV', doubanId: '35065840', play_sources: [{ name: '韩剧TV', episodes: ['ep1', 'ep2'] }] },
    
    // 人人影视 - 2026年版本
    { title: '危险关系 2026', year: '2026', source: 'yyets', id: '17', episodes: ['ep1', 'ep2'], source_name: '人人影视' },
    
    // 天天美剧 - 2026年版本
    { title: '危险关系', year: '2026', source: 'ttmeiju', id: '18', episodes: [], source_name: '天天美剧', doubanId: '35065840', play_sources: [{ name: '天天美剧', episodes: ['ep1', 'ep2'] }] },
    
    // 迅雷看看 - 2026年版本
    { title: '危险关系 2026', year: '2026', source: 'xunlei', id: '19', episodes: ['ep1', 'ep2'], source_name: '迅雷看看' },
    
    // 百度视频 - 2026年版本
    { title: '危险关系', year: '2026', source: 'baidu', id: '20', episodes: [], source_name: '百度视频', doubanId: '35065840', play_sources: [{ name: '百度视频', episodes: ['ep1', 'ep2'] }] },
  ];

  console.log(`模拟 API 返回结果: ${mockResults.length} 个`);
  console.log('');

  // 步骤1: 去重逻辑
  console.log('=== 步骤1: 去重逻辑 ===');
  const seenIds = new Set<string>();
  const deduplicatedResults = mockResults.filter((r) => {
    const uniqueKey = `${r.source}_${r.id}`;
    if (seenIds.has(uniqueKey)) {
      return false;
    }
    seenIds.add(uniqueKey);
    return true;
  });
  console.log(`去重前: ${mockResults.length} 个`);
  console.log(`去重后: ${deduplicatedResults.length} 个`);
  console.log('');

  // 步骤2: 匹配引擎处理
  console.log('=== 步骤2: 匹配引擎处理 ===');
  const processed = resourceMatcher.processSearchResults(query, deduplicatedResults as any, doubanId);
  console.log(`匹配前: ${deduplicatedResults.length} 个`);
  console.log(`匹配后: ${processed.matches.length} 个`);
  console.log(`匹配质量: ${JSON.stringify(processed.quality)}`);
  console.log('');

  // 步骤3: 分析过滤掉的结果
  console.log('=== 步骤3: 分析过滤掉的结果 ===');
  const matchedIds = new Set(processed.matches.map(m => m.result.id));
  const filteredResults = deduplicatedResults.filter(r => !matchedIds.has(r.id));
  console.log(`被过滤的结果: ${filteredResults.length} 个`);
  
  if (filteredResults.length > 0) {
    console.log('被过滤的结果详情:');
    filteredResults.forEach((r, i) => {
      const hasEpisodes = r.episodes.length > 0 || (r.play_sources && r.play_sources.some(ps => ps.episodes && ps.episodes.length > 0));
      console.log(`  ${i + 1}. ${r.title} (${r.source_name}) - 年份: ${r.year} - 剧集: ${r.episodes.length} - 有播放源: ${hasEpisodes}`);
    });
  }
  console.log('');

  // 步骤4: 显示最终结果
  console.log('=== 步骤4: 最终结果 ===');
  console.log(`最终显示的视频源数量: ${processed.matches.length} 个`);
  console.log('');
  
  console.log('最终结果详情:');
  processed.matches.forEach((match, i) => {
    const metadata = match.metadata || { title: '', year: '', doubanId: '' };
    const result = match.result;
    const hasEpisodes = result.episodes.length > 0 || (result.play_sources && result.play_sources.some((ps: any) => ps.episodes && ps.episodes.length > 0));
    console.log(`  ${i + 1}. ${metadata.title} (${result.source_name}) - 分数: ${match.score} - 年份: ${metadata.year} - 豆瓣ID: ${metadata.doubanId} - 剧集: ${result.episodes.length} - 有播放源: ${hasEpisodes}`);
  });

  console.log('\n=== 测试完成 ===');
  
  if (processed.matches.length < 20) {
    console.log(`\n⚠️  警告: 最终结果只有 ${processed.matches.length} 个，少于预期的 20 个！`);
    console.log('可能的原因:');
    console.log('1. 匹配引擎过滤条件太严格');
    console.log('2. 搜索结果数据不完整');
    console.log('3. 去重逻辑有问题');
  } else {
    console.log(`\n✅ 成功: 最终结果有 ${processed.matches.length} 个，符合预期！`);
  }
}

testActualSearchFlow();
