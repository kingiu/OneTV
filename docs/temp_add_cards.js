
      const fs = require('fs');
      const path = require('path');
      
      // 直接操作本地存储文件添加测试卡券
      function addTestCards() {
        const localStoragePath = path.join(__dirname, '.localStorage.json');
        let storageData = {};
        
        try {
          if (fs.existsSync(localStoragePath)) {
            const content = fs.readFileSync(localStoragePath, 'utf8');
            storageData = JSON.parse(content);
          }
          
          // 添加测试卡券
          const testCards = ['TESTREAL001', 'TESTREAL002', 'TESTREAL003'];
          const now = Date.now();
          const expireTime = now + 30 * 24 * 60 * 60 * 1000;
          
          testCards.forEach(cardCode => {
            const cardKey = `card:${cardCode}`;
            storageData[cardKey] = JSON.stringify({
              code: cardCode,
              type: 'premium',
              value: 30,
              batchId: 'test_batch_manual',
              status: 'unused',
              createdAt: now,
              expireAt: expireTime,
              updatedAt: now
            });
          });
          
          // 保存回存储文件
          fs.writeFileSync(localStoragePath, JSON.stringify(storageData, null, 2));
          console.log('✅ 测试卡券已成功添加到本地存储');
          return true;
        } catch (error) {
          console.error('❌ 添加测试卡券失败:', error.message);
          return false;
        }
      }
      
      addTestCards();
    