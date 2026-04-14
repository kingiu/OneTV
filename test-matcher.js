// 测试影视资源匹配功能
const { resourceMatcher } = require('./services/resourceMatcher.ts');

// 模拟搜索结果数据（包含"危险关系"的不同版本）
const mockResults = [
  {
    id: '1',
    title: '危险关系',
    poster: 'https://example.com/poster1.jpg',
    episodes: ['https://example.com/ep1.m3u8', 'https://example.com/ep2.m3u8'],
    episodes_titles: ['第1集', '第2集'],
    source: 'jsm3u8',
    source_name: '极速资源',
    year: '2024',
    desc: '导演: 张艺谋\n演员: 章子怡, 梁朝伟\n类型: 剧情, 爱情',
    type_name: '剧情',
    douban_id: 123456
  },
  {
    id: '2',
    title: '危险关系 2024',
    poster: 'https://example.com/poster2.jpg',
    episodes: ['https://example.com/ep1.m3u8'],
    episodes_titles: ['第1集'],
    source: 'jsm3u8',
    source_name: '极速资源',
    year: '2024',
    desc: '导演: 张艺谋\n演员: 章子怡, 梁朝伟\n类型: 剧情, 爱情',
    type_name: '剧情',
    douban_id: 123456
  },
  {
    id: '3',
    title: 'Dangerous Liaisons',
    poster: 'https://example.com/poster3.jpg',
    episodes: ['https://example.com/ep1.m3u8'],
    episodes_titles: ['Episode 1'],
    source: 'jsm3u8',
    source_name: '极速资源',
    year: '2024',
    desc: 'Director: Zhang Yimou\nActors: Zhang Ziyi, Tony Leung\nGenre: Drama, Romance',
    type_name: 'Drama',
    douban_id: 123456
  },
  {
    id: '4',
    title: '危险关系 2012',
    poster: 'https://example.com/poster4.jpg',
    episodes: ['https://example.com/ep1.m3u8'],
    episodes_titles: ['第1集'],
    source: 'jsm3u8',
    source_name: '极速资源',
    year: '2012',
    desc: '导演: 许秦豪\n演员: 章子怡, 张东健\n类型: 剧情, 爱情',
    type_name: '剧情',
    douban_id: 789012
  },
  {
    id: '5',
    title: '其他电影',
    poster: 'https://example.com/poster5.jpg',
    episodes: ['https://example.com/ep1.m3u8'],
    episodes_titles: ['第1集'],
    source: 'other',
    source_name: '其他资源',
    year: '2024',
    desc: '导演: 未知\n演员: 未知\n类型: 动作',
    type_name: '动作',
    douban_id: 345678
  }
];

// 测试函数
async function testMatcher() {
  console.log('=== 测试影视资源匹配功能 ===\n');
  
  // 测试查询
  const query = '危险关系';
  console.log(`测试查询: "${query}"`);
  
  // 处理搜索结果
  const processed = resourceMatcher.processSearchResults(query, mockResults);
  
  console.log(`\n匹配结果数量: ${processed.matches.length}`);
  console.log(`匹配质量评估:`);
  console.log(`- 平均分数: ${processed.quality.averageScore.toFixed(2)}`);
  console.log(`- 最高分数: ${processed.quality.topMatchScore.toFixed(2)}`);
  console.log(`- 匹配数量: ${processed.quality.matchCount}`);
  console.log(`- 覆盖率: ${processed.quality.coverage}`);
  
  console.log('\n=== 匹配结果详情 ===');
  processed.matches.forEach((match, index) => {
    console.log(`\n${index + 1}. ${match.result.title}`);
    console.log(`   分数: ${match.score.toFixed(2)}`);
    console.log(`   来源: ${match.result.source_name} (${match.result.source})`);
    console.log(`   年份: ${match.result.year}`);
    console.log(`   类型: ${match.result.type_name}`);
    console.log(`   剧集数: ${match.result.episodes.length}`);
    console.log(`   匹配字段: ${match.matchedFields.join(', ')}`);
  });
  
  // 测试其他查询
  console.log('\n=== 测试其他查询 ===');
  const otherQueries = ['流浪地球2', '复仇者联盟4', '中国奇谭第一季'];
  
  for (const q of otherQueries) {
    console.log(`\n测试查询: "${q}"`);
    const variants = resourceMatcher.generateSearchVariants(q);
    console.log(`生成的搜索变体: ${JSON.stringify(variants)}`);
  }
}

// 运行测试
testMatcher().catch(console.error);
