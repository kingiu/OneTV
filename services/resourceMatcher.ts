// 简化的繁简转换实现
const SIMPLIFIED_TO_TRADITIONAL: Record<string, string> = {
  '汉': '漢', '国': '國', '爱': '愛', '人': '人', '大': '大',
  '小': '小', '中': '中', '日': '日', '月': '月', '星': '星',
  '风': '風', '雨': '雨', '云': '雲', '山': '山', '水': '水',
  '危险': '危險', '关系': '關係', '地球': '地球', '联盟': '聯盟',
  '中国': '中國', '奇谭': '奇譚', '第一季': '第一季'
};

const TRADITIONAL_TO_SIMPLIFIED: Record<string, string> = Object.fromEntries(
  Object.entries(SIMPLIFIED_TO_TRADITIONAL).map(([s, t]) => [t, s])
);

// 简化的转换器实现
const converter = {
  simplized: (text: string): string => {
    return text.split('').map(char => TRADITIONAL_TO_SIMPLIFIED[char] || char).join('');
  },
  traditionalized: (text: string): string => {
    return text.split('').map(char => SIMPLIFIED_TO_TRADITIONAL[char] || char).join('');
  },
  detect: (text: string): number => {
    // 简单检测：如果包含繁体字，返回1，否则返回0
    for (const char of text) {
      if (TRADITIONAL_TO_SIMPLIFIED[char]) {
        return 1; // 繁体
      }
    }
    return 0; // 简体
  }
};

// 模拟ChineseType枚举
const ChineseType = {
  SIMPLIFIED: 0,
  TRADITIONAL: 1
};

// 影视资源元数据接口
export interface VideoMetadata {
  title: string;
  year?: string;
  actors?: string[];
  directors?: string[];
  genres?: string[];
  description?: string;
  doubanId?: string;
  source?: string;
}

// 搜索结果接口
export interface SearchResult {
  id: string;
  title: string;
  poster: string;
  cover?: string;
  type?: string;
  episodes: string[];
  episodes_titles: string[];
  source: string;
  source_name: string;
  class?: string;
  year: string;
  desc?: string;
  type_name?: string;
  douban_id?: number;
  doubanId?: string;
  remarks?: string;
  lines?: Array<{ name: string; episodes: string[]; episodes_titles: string[] }>;
  currentLineIndex?: number;
  play_sources?: Array<{ name: string; episodes: string[]; episodes_titles: string[] }>;
}

// 匹配结果接口
export interface MatchResult {
  result: SearchResult;
  score: number;
  matchedFields: string[];
  metadata?: VideoMetadata;
}

// 同义词映射
export const SYNONYMS: Record<string, string[]> = {
  // 类型同义词
  '电影': ['影片', '电影片', ' motion picture', 'film', 'movie'],
  '电视剧': ['剧集', '电视连续剧', 'tv series', 'tv show', 'series'],
  '动漫': ['动画', '卡通', 'anime', 'animation', 'cartoon'],
  '综艺': ['真人秀', 'variety show', 'variety'],
  '纪录片': ['纪实片', 'documentary', 'doc'],
  // 常见前缀/后缀
  '第': ['Season ', 'season ', 'S'],
  '季': ['Season', 'season', 'S'],
  '集': ['Episode', 'episode', 'E'],
  // 其他常见同义词
  '美国': ['USA', 'U.S.A.', 'America'],
  '英国': ['UK', 'U.K.', 'Britain'],
  '中国': ['China', 'CN'],
  '日本': ['Japan', 'JP'],
  '韩国': ['Korea', 'KR'],
};

// 中文数字映射表
const CHINESE_TO_ARABIC: { [key: string]: string } = {
  '一': '1', '二': '2', '三': '3', '四': '4', '五': '5',
  '六': '6', '七': '7', '八': '8', '九': '9', '十': '10',
};
const ARABIC_TO_CHINESE = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

/**
 * 影视资源匹配引擎
 */
export class ResourceMatcher {
  /**
   * 提取并标准化影视资源元数据
   */
  extractMetadata(result: SearchResult): VideoMetadata {
    // 处理极速资源的标题格式
    const processedTitle = result.title || '';
    // 不再移除标题中的年份信息，因为这会影响匹配准确性

    const metadata: VideoMetadata = {
      title: this.normalizeTitle(processedTitle),
      year: result.year || this.extractYearFromTitle(result.title),
      description: result.desc,
      doubanId: result.douban_id?.toString() || result.doubanId,
      source: result.source,
    };

    // 从描述或标题中提取演员和导演信息
    if (result.desc) {
      const actors = this.extractActors(result.desc);
      const directors = this.extractDirectors(result.desc);
      if (actors.length > 0) metadata.actors = actors;
      if (directors.length > 0) metadata.directors = directors;
    }

    // 提取类型信息
    if (result.type_name || result.class) {
      metadata.genres = this.extractGenres(result.type_name || result.class || '');
    }

    return metadata;
  }

  /**
   * 标准化标题
   */
  normalizeTitle(title: string): string {
    if (!title) return '';

    // 移除特殊字符和多余空格
    let normalized = title.trim()
      .replace(/\s+/g, ' ')
      .replace(/[\s\u00A0]+/g, ' ') // 移除所有空格类型字符
      .replace(/[\[\](){}<>《》【】（）]/g, ' ') // 移除括号
      .replace(/\s*\d{4}\s*/g, ' ') // 移除年份
      .replace(/[\s\u00A0]+/g, ' ') // 再次移除多余空格
      .trim();

    // 繁简转换为简体
    const detectedType = converter.detect(normalized);
    if (detectedType !== ChineseType.SIMPLIFIED) {
      normalized = converter.simplized(normalized);
    }

    return normalized;
  }

  /**
   * 从标题中提取年份
   */
  extractYearFromTitle(title: string): string {
    const yearMatch = title.match(/(19|20)\d{2}/);
    return yearMatch ? yearMatch[0] : '';
  }

  /**
   * 从描述中提取演员信息
   */
  extractActors(desc: string): string[] {
    const actorMatches = desc.match(/演员[:：]\s*([^。；;]+)/);
    if (actorMatches) {
      return actorMatches[1].split(/[,，]/).map(actor => actor.trim()).filter(Boolean);
    }
    return [];
  }

  /**
   * 从描述中提取导演信息
   */
  extractDirectors(desc: string): string[] {
    const directorMatches = desc.match(/导演[:：]\s*([^。；;]+)/);
    if (directorMatches) {
      return directorMatches[1].split(/[,，]/).map(director => director.trim()).filter(Boolean);
    }
    return [];
  }

  /**
   * 提取类型信息
   */
  extractGenres(typeStr: string): string[] {
    return typeStr.split(/[,，]/).map(genre => genre.trim()).filter(Boolean);
  }

  /**
   * 智能生成搜索变体（参考LunaTV实现）
   */
  generateSearchVariants(query: string): string[] {
    const trimmed = query.trim();
    const variants: string[] = [trimmed];

    // 1. 智能检测：数字变体（最高优先级的变体）
    const numberVariant = this.generateNumberVariant(trimmed);
    if (numberVariant && numberVariant !== trimmed) {
      variants.push(numberVariant);
    }

    // 2. 智能检测：中文标点变体（冒号等）
    const punctuationVariant = this.generatePunctuationVariant(trimmed);
    if (punctuationVariant && punctuationVariant !== trimmed) {
      variants.push(punctuationVariant);
    }

    // 3. 智能检测：空格变体（多词搜索）
    if (trimmed.includes(' ')) {
      const keywords = trimmed.split(/\s+/);
      if (keywords.length >= 2) {
        const lastKeyword = keywords[keywords.length - 1];
        // 如果最后一个词是季/集相关，组合主关键词
        if (/第|季|集|部|篇|章/.test(lastKeyword)) {
          const combined = keywords[0] + lastKeyword;
          if (combined !== trimmed) variants.push(combined);
        }
        // 否则去除空格
        const noSpaces = trimmed.replace(/\s+/g, '');
        if (noSpaces !== trimmed) variants.push(noSpaces);

        // 剧集特定：尝试不同的空格组合
        if (keywords.length >= 3) {
          // 组合前两个关键词作为主标题
          const mainTitle = keywords.slice(0, 2).join('');
          const rest = keywords.slice(2).join(' ');
          const combinedMainTitle = rest ? `${mainTitle} ${rest}` : mainTitle;
          if (combinedMainTitle !== trimmed) variants.push(combinedMainTitle);
        }
      }
    }

    // 4. 剧集特定：添加常见剧集后缀变体
    const episodeSuffixes = ['剧集', '电视剧', '连续剧', '剧'];
    episodeSuffixes.forEach(suffix => {
      if (!trimmed.includes(suffix)) {
        variants.push(`${trimmed} ${suffix}`);
      }
    });

    // 5. 繁体检测：如果是繁体输入，添加简体变体
    const detectedType = converter.detect(trimmed);
    if (detectedType !== ChineseType.SIMPLIFIED) {
      const simplified = converter.simplized(trimmed);
      if (simplified !== trimmed) {
        variants.push(simplified);
      }
    }

    // 6. 年份处理：如果查询包含年份，添加不含年份的变体
    const yearMatch = trimmed.match(/\s*(19|20)\d{2}\s*$/);
    if (yearMatch) {
      const withoutYear = trimmed.replace(/\s*(19|20)\d{2}\s*$/, '').trim();
      if (withoutYear && withoutYear !== trimmed) {
        variants.push(withoutYear);
      }
    }

    // 7. 年份处理：如果查询不含年份，尝试添加常见年份变体（最近5年）
    if (!yearMatch) {
      const currentYear = new Date().getFullYear();
      for (let i = 0; i < 5; i++) {
        const year = currentYear - i;
        const withYear = `${trimmed} ${year}`;
        variants.push(withYear);
      }
    }

    // 8. 剧集特定：尝试不同的季数格式
    if (/第.*季/.test(trimmed)) {
      // 尝试去除"第"字
      const withoutDi = trimmed.replace(/第([0-9一二三四五六七八九十]+)季/, '$1季');
      if (withoutDi !== trimmed) variants.push(withoutDi);
      // 尝试英文格式
      const seasonMatch = trimmed.match(/第([0-9一二三四五六七八九十]+)季/);
      if (seasonMatch) {
        const seasonNum = seasonMatch[1];
        const arabicNum = /\d+/.test(seasonNum) ? seasonNum : this.chineseToArabic(seasonNum);
        if (arabicNum) {
          const englishFormat = trimmed.replace(/第([0-9一二三四五六七八九十]+)季/, `Season ${arabicNum}`);
          if (englishFormat !== trimmed) variants.push(englishFormat);
        }
      }
    }

    // 9. 移除重复变体
    return Array.from(new Set(variants));
  }

  /**
   * 生成数字变体
   */
  private generateNumberVariant(query: string): string {
    // 模式1: "第X季/部/集/期" 格式（中文数字 → 阿拉伯数字）
    const chinesePattern = /第([一二三四五六七八九十])(季|部|集|期)/;
    const chineseMatch = chinesePattern.exec(query);
    if (chineseMatch) {
      const chineseNum = chineseMatch[1];
      const arabicNum = CHINESE_TO_ARABIC[chineseNum];
      if (arabicNum) {
        return query.replace(chineseMatch[0], `第${arabicNum}${chineseMatch[2]}`);
      }
    }

    // 模式2: "第X季/部/集/期" 格式（阿拉伯数字 → 中文数字）
    const arabicPattern = /第(\d+)(季|部|集|期)/;
    const arabicMatch = arabicPattern.exec(query);
    if (arabicMatch) {
      const num = parseInt(arabicMatch[1]);
      const suffix = arabicMatch[2];
      if (num >= 1 && num <= 10) {
        const chineseNum = ARABIC_TO_CHINESE[num];
        return query.replace(arabicMatch[0], `第${chineseNum}${suffix}`);
      }
    }

    // 模式3: 末尾纯数字（如 "中国奇谭2" → "中国奇谭第二季"）
    const endNumberMatch = query.match(/^(.+?)(\d+)$/);
    if (endNumberMatch) {
      const base = endNumberMatch[1].trim();
      const num = parseInt(endNumberMatch[2]);
      if (num >= 1 && num <= 10 && base) {
        const chineseNum = ARABIC_TO_CHINESE[num];
        return `${base}第${chineseNum}季`;
      }
    }

    return query;
  }

  /**
   * 生成标点变体
   */
  private generatePunctuationVariant(query: string): string {
    let variant = query;

    // 中文冒号 → 空格
    if (variant.includes('：')) {
      variant = variant.replace(/：/g, ' ');
    }

    // 英文冒号 → 空格
    if (variant.includes(':')) {
      variant = variant.replace(/:/g, ' ');
    }

    // 中文书名号 → 去除
    if (variant.includes('《') || variant.includes('》')) {
      variant = variant.replace(/[《》]/g, '');
    }

    // 多余空格 → 单个空格
    variant = variant.replace(/\s+/g, ' ').trim();

    return variant;
  }

  /**
   * 生成同义词变体
   */
  private chineseToArabic(chineseNum: string): string | null {
    const map: Record<string, string> = {
      '一': '1', '二': '2', '三': '3', '四': '4', '五': '5',
      '六': '6', '七': '7', '八': '8', '九': '9', '十': '10'
    };
    return map[chineseNum] || null;
  }

  private generateSynonymVariant(query: string): string {
    let variant = query;

    // 替换常见同义词
    Object.entries(SYNONYMS).forEach(([key, synonyms]) => {
      synonyms.forEach(synonym => {
        if (variant.includes(synonym)) {
          variant = variant.replace(new RegExp(synonym, 'gi'), key);
        }
      });
    });

    return variant;
  }

  /**
   * 计算字符串相似度（Levenshtein距离）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLength = Math.max(len1, len2);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  /**
   * 检查标题中是否包含关键词的所有字符（按顺序，但可以有间隔）
   * 例如："后浪" 可以匹配 "后来的浪潮"
   */
  private containsCharsInOrder(title: string, keyword: string): boolean {
    let keywordIndex = 0;
    for (let i = 0; i < title.length && keywordIndex < keyword.length; i++) {
      if (title[i] === keyword[keywordIndex]) {
        keywordIndex++;
      }
    }
    return keywordIndex === keyword.length;
  }

  /**
   * 多条件组合匹配（参考LunaTV优化）
   */
  matchResources(query: string, resources: SearchResult[], doubanId?: string): MatchResult[] {
    const normalizedQuery = this.normalizeTitle(query);
    const queryNoSpace = normalizedQuery.replace(/\s+/g, '');
    const queryYear = this.extractYearFromTitle(query);
    // 提取查询的主体部分（不含年份）
    const queryWithoutYear = normalizedQuery.replace(/\s*\d{4}\s*$/, '').trim();
    const queryWithoutYearNoSpace = queryWithoutYear.replace(/\s+/g, '');

    return resources.map(resource => {
      const metadata = this.extractMetadata(resource);
      let score = 0;
      const matchedFields: string[] = [];

      // 0. 豆瓣ID精确匹配（最高优先级，参考LunaTV实现）
      if (doubanId && metadata.doubanId && metadata.doubanId === doubanId) {
        score = 200; // 豆瓣ID精确匹配给予最高分数
        matchedFields.push('doubanId');
        return {
          result: resource,
          score,
          matchedFields,
          metadata
        };
      }

      const title = metadata.title;
      const titleNoSpace = title.replace(/\s+/g, '');

      // 1. 标题匹配（参考LunaTV的评分机制）
      if (title === normalizedQuery || titleNoSpace === queryNoSpace) {
        // 完全匹配（最高优先级）
        score = 100;
        matchedFields.push('title');
      } else if (title.startsWith(normalizedQuery) || titleNoSpace.startsWith(queryNoSpace)) {
        // 开头匹配
        score = 80;
        matchedFields.push('title');
      } else if (title.includes(normalizedQuery) || titleNoSpace.includes(queryNoSpace)) {
        // 包含完整关键词
        score = 60;
        matchedFields.push('title');
      } else if (queryWithoutYear && (title === queryWithoutYear || titleNoSpace === queryWithoutYearNoSpace)) {
        // 当查询包含年份时，检查标题是否与查询主体完全匹配
        score = 90;
        matchedFields.push('title');
      } else if (queryWithoutYear && (title.startsWith(queryWithoutYear) || titleNoSpace.startsWith(queryWithoutYearNoSpace))) {
        // 当查询包含年份时，检查标题是否以查询主体开头
        score = 70;
        matchedFields.push('title');
      } else if (queryWithoutYear && (title.includes(queryWithoutYear) || titleNoSpace.includes(queryWithoutYearNoSpace))) {
        // 当查询包含年份时，检查标题是否包含查询主体
        score = 50;
        matchedFields.push('title');
      } else if (this.containsCharsInOrder(titleNoSpace, queryNoSpace)) {
        // 包含关键词的所有字符（按顺序）
        const similarity = this.calculateSimilarity(titleNoSpace, queryNoSpace);
        score = 20 + similarity * 20; // 20-40分
        matchedFields.push('title');
      } else {
        // 低匹配度
        const matchedChars = queryNoSpace
          .split('')
          .filter(char => titleNoSpace.includes(char)).length;
        const matchRatio = matchedChars / queryNoSpace.length;
        score = matchRatio * 15; // 0-15分
      }

      // 2. 年份匹配（关键匹配条件）
      if (queryYear && metadata.year === queryYear) {
        score += 50; // 年份精确匹配，大幅加分
        matchedFields.push('year');
      } else if (queryYear && metadata.year && metadata.year !== queryYear) {
        // 年份不匹配时给予重惩罚
        score -= 40;
      }

      // 3. 结果质量加分
      if (resource.episodes && resource.episodes.length > 0) {
        score += Math.min(resource.episodes.length, 10); // 最多加10分
      }

      // 4. 豆瓣信息加分
      if (metadata.doubanId) {
        score += 5; // 有豆瓣信息的作品加5分
      }

      // 5. 年份奖励：较新的作品加分
      if (metadata.year && metadata.year !== 'unknown') {
        const year = parseInt(metadata.year);
        const currentYear = new Date().getFullYear();
        const yearDiff = currentYear - year;
        if (yearDiff >= 0) {
          if (yearDiff <= 5) {
            score += 10 - yearDiff; // 5-10分
          } else if (yearDiff <= 10) {
            score += 5; // 5分
          } else if (yearDiff <= 20) {
            score += 2; // 2分
          }
        }
      }

      // 6. 来源可靠性加分
      score += this.getSourceScore(metadata.source || '');

      return {
        result: resource,
        score,
        matchedFields,
        metadata
      };
    }).filter(result => result.score > 10) // 降低阈值，获取更多相关结果
      .filter(result => {
        // 检查是否有剧集或播放源 - 宽松的检查，只要有play_sources就保留，即使是空的
        interface PlaySource {
          episodes?: string[];
          [key: string]: unknown;
        }

        const hasEpisodes = result.result.episodes && result.result.episodes.length > 0;
        const hasPlaySources = result.result.play_sources && result.result.play_sources.length > 0;
        const hasAnyPlaySourceWithEpisodes = result.result.play_sources && result.result.play_sources.some((ps: PlaySource) =>
          ps.episodes && ps.episodes.length > 0
        );
        // 只要有播放源数组就保留，哪怕暂时没有剧集
        return hasEpisodes || hasPlaySources;
      }) // 宽松过滤：有play_sources数组就保留
      .sort((a, b) => {
        // 首先按分数排序
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        // 分数相同时，按年份倒序（新的在前）
        const yearA = parseInt(a.metadata.year || '0');
        const yearB = parseInt(b.metadata.year || '0');
        if (yearB !== yearA) {
          return yearB - yearA;
        }

        // 年份也相同时，按来源可靠性排序
        const sourceScoreA = this.getSourceScore(a.metadata.source || '');
        const sourceScoreB = this.getSourceScore(b.metadata.source || '');
        if (sourceScoreB !== sourceScoreA) {
          return sourceScoreB - sourceScoreA;
        }

        // 最后按标题长度排序（短的在前，更精确）
        return a.metadata.title.length - b.metadata.title.length;
      });
  }

  /**
   * 获取来源可靠性分数
   */
  private getSourceScore(source: string): number {
    // 这里可以根据实际情况设置不同来源的可靠性分数
    const sourceScores: Record<string, number> = {
      'aixuexi.com': 100, // 官方高清站 - 最高优先级（与后端保持一致）
      'jszyapi.com': 50, // 极速资源（与后端保持一致）
      'jsm3u8': 50, // 备用key，兼容其他配置
      'ffzy': 30,
      'ffzyapi.com': 30, // 备用key，兼容其他配置
      'bilibili': 25,
      'tencent': 25,
      'iqiyi': 20,
      'iqiyizyapi.com': 20, // 备用key，兼容其他配置
      'youku': 20,
    };
    return sourceScores[source] || 10;
  }

  /**
   * 评估匹配质量
   */
  evaluateMatchQuality(matches: MatchResult[]): {
    averageScore: number;
    topMatchScore: number;
    matchCount: number;
    coverage: number;
  } {
    if (matches.length === 0) {
      return {
        averageScore: 0,
        topMatchScore: 0,
        matchCount: 0,
        coverage: 0
      };
    }

    const totalScore = matches.reduce((sum, match) => sum + match.score, 0);
    const averageScore = totalScore / matches.length;
    const topMatchScore = matches[0].score;
    const matchCount = matches.length;
    const coverage = matches.length > 0 ? 1 : 0; // 简化的覆盖率计算

    return {
      averageScore,
      topMatchScore,
      matchCount,
      coverage
    };
  }

  /**
   * 批量处理搜索结果
   */
  processSearchResults(query: string, results: SearchResult[], doubanId?: string): {
    matches: MatchResult[];
    quality: {
      averageScore: number;
      topMatchScore: number;
      matchCount: number;
      coverage: number;
    };
  } {
    const matches = this.matchResources(query, results, doubanId);
    const quality = this.evaluateMatchQuality(matches);

    return {
      matches,
      quality
    };
  }
}

// 导出单例
export const resourceMatcher = new ResourceMatcher();
