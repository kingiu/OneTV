// 详细API测试脚本
// 目的：模拟实际API调用过程，添加详细日志以诊断虚拟机中测试失败的原因

console.log('\n=============================================');
console.log('详细API调用测试与诊断');
console.log('=============================================\n');

// 模拟API类中的主要方法
class MockAPI {
  constructor() {
    this.baseURL = 'https://example.com';
    // 模拟AsyncStorage
    this.mockStorage = {};
  }

  // 模拟_extractMembershipTier方法 - 使用我们优化后的实现
  _extractMembershipTier(data) {
    if (!data) return '';
    
    console.log('🔍 开始提取会员等级，数据结构:', JSON.stringify(data, null, 2));
    
    // 定义可能的等级字段名（同时支持驼峰和下划线命名）
    const possibleTierFields = [
      'tierId', 'tier', 'level', 'memberLevel', 'userLevel', 'vipLevel',
      'member_type', 'user_type', 'account_level', 'subscription_level',
      'member_level', 'user_level', 'vip_level', 'accountLevel', 'subscriptionLevel',
      'membership_level', 'membershipType', 'membership_type', 'memberType'
    ];
    
    // 尝试从各种可能的字段中提取等级信息
    for (const field of possibleTierFields) {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        console.log(`✅ 从${field}字段提取会员等级:`, data[field]);
        return String(data[field]); // 转换为字符串以确保一致性
      }
    }
    
    // 如果直接在data中找不到，检查是否有membership子对象
    if (data.membership) {
      console.log('🔄 检查membership子对象:', JSON.stringify(data.membership, null, 2));
      for (const field of possibleTierFields) {
        if (data.membership[field] !== undefined && data.membership[field] !== null && data.membership[field] !== '') {
          console.log(`✅ 从membership.${field}字段提取会员等级:`, data.membership[field]);
          return String(data.membership[field]);
        }
      }
    }
    
    // 也检查data.data.membership格式
    if (data.data && data.data.membership) {
      console.log('🔄 检查data.data.membership子对象:', JSON.stringify(data.data.membership, null, 2));
      for (const field of possibleTierFields) {
        if (data.data.membership[field] !== undefined && data.data.membership[field] !== null && data.data.membership[field] !== '') {
          console.log(`✅ 从data.data.membership.${field}字段提取会员等级:`, data.data.membership[field]);
          return String(data.data.membership[field]);
        }
      }
    }
    
    // 如果都找不到，记录警告
    console.warn('❌ 无法从数据中提取会员等级:', JSON.stringify(data, null, 2));
    return '';
  }

  // 模拟_determineMembershipTier方法 - 使用我们优化后的实现
  _determineMembershipTier(tierIdentifier) {
    // 模拟MembershipTier枚举
    const MembershipTier = {
      VIP: 'vip',
      PREMIUM: 'premium',
      STANDARD: 'standard'
    };
    
    // 确保是字符串类型
    const tierStr = String(tierIdentifier || '').toLowerCase();
    console.log(`🔍 开始确定会员等级，原始值: '${tierIdentifier}'，转换后: '${tierStr}'`);
    
    // 尝试直接匹配枚举值
    if ([MembershipTier.VIP, MembershipTier.PREMIUM, MembershipTier.STANDARD].includes(tierStr)) {
      console.log(`✅ 直接匹配枚举值: ${tierStr}`);
      return tierStr;
    }
    
    // 高级会员关键词检测 - 测试验证的关键词列表
    const premiumKeywords = ['premium', '高级', '黄金', '1', 'vip1', 'plus', 'pro', 'gold', 'silver'];
    const hasPremiumKeyword = premiumKeywords.some(keyword => 
      tierStr.includes(keyword.toLowerCase())
    );
    
    // 尊享会员关键词检测
    const vipKeywords = ['vip', '尊享'];
    const hasVipKeyword = vipKeywords.some(keyword => 
      tierStr.includes(keyword.toLowerCase())
    );
    
    // 普通会员关键词检测
    const standardKeywords = ['standard', 'default', '普通', '2'];
    const hasStandardKeyword = standardKeywords.some(keyword => 
      tierStr.includes(keyword.toLowerCase())
    );
    
    // 应用映射规则，确保高级会员关键词优先
    if (hasPremiumKeyword) {
      console.log(`✅ 检测到高级会员关键词: '${tierStr}'，匹配的关键词: ${premiumKeywords.filter(k => tierStr.includes(k)).join(', ')}`);
      return MembershipTier.PREMIUM;
    } else if (hasVipKeyword) {
      console.log(`✅ 检测到尊享会员关键词: '${tierStr}'，匹配的关键词: ${vipKeywords.filter(k => tierStr.includes(k)).join(', ')}`);
      return MembershipTier.VIP;
    } else if (hasStandardKeyword || tierStr === '') {
      console.log(`✅ 检测到普通会员关键词或空值: '${tierStr}'，匹配的关键词: ${standardKeywords.filter(k => tierStr.includes(k)).join(', ')}`);
      return MembershipTier.STANDARD;
    }
    
    // 如果没有明确的关键词匹配，根据测试结果默认使用STANDARD
    console.log(`⚠️  未匹配到明确的会员关键词，使用默认值: '${tierStr}'`);
    return MembershipTier.STANDARD;
  }

  // 模拟_mapLunaTVMembership方法
  _mapLunaTVMembership(lunaMembership) {
    console.log('📋 开始映射LunaTV会员数据:', JSON.stringify(lunaMembership, null, 2));
    
    try {
      // 使用增强的会员等级提取函数
      const tierId = this._extractMembershipTier(lunaMembership);
      console.log(`📋 提取到的会员等级: '${tierId}'`);
      
      // 使用增强的会员等级判断逻辑
      let mappedTier = this._determineMembershipTier(tierId);
      console.log(`📋 映射后的会员等级: '${mappedTier}'`);
      
      // 模拟计算剩余天数
      const endDate = lunaMembership.endDate;
      const daysRemaining = endDate ? this._calculateDaysRemaining(endDate) : 0;
      
      // 映射LunaTV的UserMembership到OneTV的MembershipInfo格式
      const mappedMembership = {
        userName: lunaMembership.userName || '',
        tier: mappedTier,
        isActive: this._determineMembershipStatus(lunaMembership),
        status: lunaMembership.status || (this._determineMembershipStatus(lunaMembership) ? 'active' : 'inactive'),
        createdAt: this._parseTimestamp(lunaMembership.startDate),
        expireTime: this._parseTimestamp(lunaMembership.endDate),
        lastRenewTime: this._parseTimestamp(lunaMembership.renewInfo?.nextRenewalDate),
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        couponHistory: lunaMembership.couponHistory || []
      };
      
      console.log('📋 映射完成的会员信息:', JSON.stringify(mappedMembership, null, 2));
      
      return { membership: mappedMembership };
    } catch (error) {
      console.error('❌ 映射LunaTV会员数据失败:', error);
      return { membership: null };
    }
  }

  // 模拟_determineMembershipStatus方法
  _determineMembershipStatus(membership) {
    console.log(`🔍 检查会员激活状态:`, JSON.stringify(membership, null, 2));
    
    // 优先检查status字段
    if (membership.status === 'active') {
      console.log(`✅ 状态字段显示会员激活: status='active'`);
      return true;
    }
    if (membership.status === 'expired' || membership.status === 'inactive') {
      console.log(`✅ 状态字段显示会员未激活: status='${membership.status}'`);
      return false;
    }
    
    // 检查endDate是否在未来
    if (membership.endDate) {
      const endDate = this._parseTimestamp(membership.endDate);
      const isFuture = endDate > Date.now();
      console.log(`🔄 检查结束日期是否在未来: endDate=${endDate}, now=${Date.now()}, 结果=${isFuture}`);
      if (isFuture) {
        return true;
      }
    }
    
    // 检查是否有明确的激活标志
    if (typeof membership.isActive === 'boolean') {
      console.log(`✅ 直接检查激活标志: isActive=${membership.isActive}`);
      return membership.isActive;
    }
    
    console.log(`⚠️  无法确定会员状态，默认返回未激活`);
    return false;
  }

  // 模拟_parseTimestamp方法
  _parseTimestamp(value) {
    console.log(`🔄 解析时间戳: '${value}'`);
    
    if (!value) {
      console.log(`⚠️  时间戳值为空，返回当前时间`);
      return Date.now();
    }
    
    // 如果已经是数字，直接返回
    if (typeof value === 'number') {
      console.log(`✅ 时间戳已是数字: ${value}`);
      return value;
    }
    
    // 如果是字符串，尝试解析
    if (typeof value === 'string') {
      // 尝试解析ISO字符串
      const parsed = Date.parse(value);
      if (!isNaN(parsed)) {
        console.log(`✅ 成功解析ISO字符串为时间戳: ${parsed}`);
        return parsed;
      }
      
      // 尝试解析为数字字符串
      const num = parseInt(value);
      if (!isNaN(num)) {
        console.log(`✅ 成功解析数字字符串为时间戳: ${num}`);
        return num;
      }
    }
    
    console.log(`⚠️  无法解析时间戳，返回当前时间`);
    return Date.now();
  }

  // 模拟_calculateDaysRemaining方法
  _calculateDaysRemaining(endDate) {
    console.log(`🔄 计算剩余天数: endDate=${endDate}`);
    
    const now = Date.now();
    const diff = endDate - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    console.log(`✅ 计算结果: ${days}天 (当前时间: ${now}, 结束时间: ${endDate}, 差值: ${diff})`);
    return days;
  }

  // 模拟getMembershipInfo方法
  async getMembershipInfo(apiResponse) {
    console.log('\n=============================================');
    console.log('模拟API调用: getMembershipInfo');
    console.log('=============================================');
    
    try {
      console.log('📥 模拟接收API响应:', JSON.stringify(apiResponse, null, 2));
      
      // 适配LunaTV返回的数据结构 {success: true, data: {membership, config}}
      if (apiResponse.success && apiResponse.data) {
        console.log('✅ 检测到成功响应格式 {success: true, data: {...}}');
        // 获取LunaTV的UserMembership对象
        const lunaMembership = apiResponse.data.membership;
        console.log('📋 LunaTV会员数据:', JSON.stringify(lunaMembership, null, 2));
        
        // 如果存在LunaTV会员数据，进行类型映射
        if (lunaMembership) {
          return this._mapLunaTVMembership(lunaMembership);
        }
        
        console.warn('⚠️  LunaTV响应中没有会员数据');
        return { membership: null };
      }
      
      // 直接处理LunaTV返回的对象（如果它不是包装在success/data中的）
      if (apiResponse.tierId || apiResponse.tier) {
        console.log('✅ 检测到直接会员数据格式');
        return this._mapLunaTVMembership(apiResponse);
      }
      
      // 兼容旧的数据结构或处理错误
      console.log('🔄 使用默认数据结构', { membership: apiResponse.membership });
      
      // 如果apiResponse.membership存在且不是null，则返回它
      if (apiResponse.hasOwnProperty('membership')) {
        const membership = apiResponse.membership || null;
        if (membership) {
          // 检查会员信息是否完整
          const isComplete = !!(membership.tier && membership.status);
          console.log(`🔄 默认结构会员信息完整性检查: isComplete=${isComplete}`);
          return { membership: isComplete ? membership : null };
        }
        return { membership: null };
      }
      
      // 尝试查找其他可能包含会员信息的字段
      if (apiResponse.userName || apiResponse.tier || apiResponse.tierId) {
        console.log(`✅ 检测到可能的会员信息: userName=${apiResponse.userName}, tier=${apiResponse.tier}, tierId=${apiResponse.tierId}`);
        return this._mapLunaTVMembership(apiResponse);
      }
      
      // 如果没有任何可识别的格式，记录警告并返回null
      console.warn('❌ 无法识别的会员信息格式', apiResponse);
      return { membership: null };
    } catch (error) {
      console.error('❌ 获取会员信息时出错:', error);
      return { membership: null };
    }
  }
}

// 模拟虚拟机中可能遇到的API响应
const mockApiResponses = [
  // 场景1: 标准格式，使用tierId
  {
    name: "场景1: 标准格式，使用tierId",
    response: {
      success: true,
      data: {
        membership: {
          userName: "guozhi",
          tierId: "premium",
          status: "active",
          startDate: "2023-01-01T00:00:00Z",
          endDate: "2023-12-31T00:00:00Z"
        }
      }
    }
  },
  
  // 场景2: 使用自定义字段memberLevel
  {
    name: "场景2: 使用自定义字段memberLevel",
    response: {
      success: true,
      data: {
        membership: {
          userName: "guozhi",
          memberLevel: "premium",
          status: "active",
          startDate: "2023-01-01T00:00:00Z",
          endDate: "2023-12-31T00:00:00Z"
        }
      }
    }
  },
  
  // 场景3: 使用数字标识高级会员
  {
    name: "场景3: 使用数字标识高级会员",
    response: {
      success: true,
      data: {
        membership: {
          userName: "guozhi",
          tierId: "1",
          status: "active",
          startDate: "2023-01-01T00:00:00Z",
          endDate: "2023-12-31T00:00:00Z"
        }
      }
    }
  },
  
  // 场景4: 数据结构不同，使用membershipType
  {
    name: "场景4: 数据结构不同，使用membershipType",
    response: {
      success: true,
      data: {
        membership: {
          userName: "guozhi",
          membershipType: "高级会员",
          status: "active",
          startDate: "2023-01-01T00:00:00Z",
          endDate: "2023-12-31T00:00:00Z"
        }
      }
    }
  },
  
  // 场景5: 多层嵌套数据结构
  {
    name: "场景5: 多层嵌套数据结构",
    response: {
      success: true,
      data: {
        membership: {
          info: {
            userName: "guozhi",
            tier: "premium"
          },
          status: "active",
          startDate: "2023-01-01T00:00:00Z",
          endDate: "2023-12-31T00:00:00Z"
        }
      }
    }
  },
  
  // 场景6: 直接数据格式
  {
    name: "场景6: 直接数据格式",
    response: {
      userName: "guozhi",
      tier: "高级会员",
      status: "active",
      startDate: "2023-01-01T00:00:00Z",
      endDate: "2023-12-31T00:00:00Z"
    }
  }
];

// 运行详细测试
async function runDetailedTests() {
  console.log('开始运行详细API测试...\n');
  
  const mockApi = new MockAPI();
  let testResults = [];
  
  for (const testCase of mockApiResponses) {
    console.log(`\n📊 测试场景: ${testCase.name}`);
    console.log('=============================================');
    
    try {
      const result = await mockApi.getMembershipInfo(testCase.response);
      
      console.log('\n📋 测试结果摘要:');
      console.log(`✅ 测试完成: ${testCase.name}`);
      console.log(`📋 会员是否存在: ${result.membership ? '是' : '否'}`);
      
      if (result.membership) {
        console.log(`📋 会员等级: ${result.membership.tier}`);
        console.log(`📋 是否激活: ${result.membership.isActive}`);
        console.log(`📋 剩余天数: ${result.membership.daysRemaining}`);
        
        // 记录测试结果
        testResults.push({
          name: testCase.name,
          success: true,
          tier: result.membership.tier,
          isActive: result.membership.isActive
        });
      } else {
        console.log(`❌ 未成功提取会员信息`);
        testResults.push({
          name: testCase.name,
          success: false
        });
      }
    } catch (error) {
      console.error(`❌ 测试失败: ${error.message}`);
      testResults.push({
        name: testCase.name,
        success: false,
        error: error.message
      });
    }
    
    console.log('\n=============================================');
  }
  
  // 生成测试总结
  console.log('\n📊 测试总结');
  console.log('=============================================');
  console.log(`总测试场景: ${testResults.length}`);
  console.log(`成功: ${testResults.filter(r => r.success).length}`);
  console.log(`失败: ${testResults.filter(r => !r.success).length}`);
  
  // 显示详细结果
  console.log('\n详细结果:');
  testResults.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${result.name} ${status}`);
    if (result.success) {
      console.log(`   会员等级: ${result.tier}`);
      console.log(`   激活状态: ${result.isActive}`);
    } else if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
  });
  
  // 分析可能的虚拟机测试失败原因
  console.log('\n🔍 虚拟机测试失败可能原因分析');
  console.log('=============================================');
  console.log('1. 实际API返回的数据结构可能与预期不同');
  console.log('2. 可能存在缓存问题，没有使用最新的代码');
  console.log('3. 可能存在认证或权限问题，导致API返回不完整数据');
  console.log('4. 运行时环境差异导致的兼容性问题');
  console.log('5. 代码修改后没有正确重新编译或打包');
  console.log('\n建议解决方案:');
  console.log('1. 增加实际API调用的详细日志记录');
  console.log('2. 检查AsyncStorage中是否有缓存数据影响测试');
  console.log('3. 确保API调用使用正确的认证信息');
  console.log('4. 清除缓存后重新测试');
  console.log('5. 验证代码修改是否正确应用到运行环境');
}

// 运行测试
runDetailedTests().catch(console.error);