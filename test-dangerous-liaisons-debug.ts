import { resourceMatcher, SearchResult } from './services/resourceMatcher';

const mockResults: SearchResult[] = [
  {
    id: '123',
    title: '危险关系',
    poster: 'https://example.com/poster.jpg',
    episodes: ['https://example.com/episode1.m3u8', 'https://example.com/episode2.m3u8'],
    episodes_titles: ['第1集', '第2集'],
    source: 'jszyapi.com',
    source_name: '极速资源',
    year: '2024',
    douban_id: 36755276,
    doubanId: '36755276',
    play_sources: [
      { name: '线路1', episodes: ['https://example.com/line1-ep1.m3u8'], episodes_titles: ['第1集'] },
      { name: '线路2', episodes: ['https://example.com/line2-ep1.m3u8'], episodes_titles: ['第1集'] },
      { name: '线路3', episodes: ['https://example.com/line3-ep1.m3u8'], episodes_titles: ['第1集'] }
    ]
  },
  {
    id: '123',
    title: '危险关系',
    poster: 'https://example.com/poster.jpg',
    episodes: ['https://example.com/episode1.m3u8', 'https://example.com/episode2.m3u8'],
    episodes_titles: ['第1集', '第2集'],
    source: 'jszyapi.com',
    source_name: '极速资源',
    year: '2024',
    douban_id: 36755276,
    doubanId: '36755276',
    play_sources: [
      { name: '线路1', episodes: ['https://example.com/line1-ep1.m3u8'], episodes_titles: ['第1集'] },
      { name: '线路2', episodes: ['https://example.com/line2-ep1.m3u8'], episodes_titles: ['第1集'] },
      { name: '线路3', episodes: ['https://example.com/line3-ep1.m3u8'], episodes_titles: ['第1集'] }
    ]
  },
  {
    id: '456',
    title: '危险关系',
    poster: 'https://example.com/poster2.jpg',
    episodes: ['https://example.com/episode1.m3u8'],
    episodes_titles: ['第1集'],
    source: 'ffzy',
    source_name: '非凡资源',
    year: '2024',
    douban_id: 36755276,
    doubanId: '36755276',
    play_sources: [
      { name: '线路1', episodes: ['https://example.com/line1-ep1.m3u8'], episodes_titles: ['第1集'] }
    ]
  }
];

console.log('=== 测试"危险关系"剧集视频源重复问题 ===\n');

console.log('原始搜索结果数量:', mockResults.length);
console.log('');

mockResults.forEach((result, index) => {
  console.log(`[${index}] 来源: ${result.source_name} (ID: ${result.id})`);
  console.log(`    标题: ${result.title}`);
  console.log(`    年份: ${result.year}`);
  console.log(`    剧集数: ${result.episodes.length}`);
  console.log(`    播放源数量: ${result.play_sources?.length || 0}`);
  
  if (result.play_sources) {
    result.play_sources.forEach((source, sIndex) => {
      console.log(`      - 线路${sIndex + 1}: ${source.name} (${source.episodes.length} 集)`);
    });
  }
  console.log('');
});

console.log('=== 问题分析 ===\n');

const uniqueKeys = new Set<string>();
const duplicates = [];

mockResults.forEach((result, index) => {
  const key = `${result.source}_${result.id}_${result.title}_${result.year}`;
  
  if (uniqueKeys.has(key)) {
    duplicates.push({ index, key });
    console.log(`[重复] 索引 ${index} 与之前项重复: ${key}`);
  } else {
    uniqueKeys.add(key);
    console.log(`[唯一] 索引 ${index}: ${key}`);
  }
});

console.log(`\n重复项总数: ${duplicates.length}`);

console.log('\n=== 资源匹配引擎测试 ===');
const query = '危险关系';
const matched = resourceMatcher.matchResources(query, mockResults, '36755276');

console.log(`匹配结果数量: ${matched.length}`);
matched.forEach((match, index) => {
  console.log(`[${index}] ${match.result.source_name} - ${match.result.title} (分数: ${match.score})`);
});

console.log('\n=== 去重逻辑测试 ===');
const seen = new Set<string>();
const deduplicated = mockResults.filter(r => {
  const key = `${r.source}_${r.id}_${r.title}_${r.year}`;
  if (seen.has(key)) {
    return false;
  }
  seen.add(key);
  return true;
});

console.log(`去重前: ${mockResults.length} 个结果`);
console.log(`去重后: ${deduplicated.length} 个结果`);
