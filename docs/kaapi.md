# 卡券登录API接口说明文档

## 1. 接口概述

卡券登录API用于实现用户通过卡券码进行自动注册、登录和卡券兑换的功能。该接口支持测试模式，便于开发和测试。

### 1.1 功能特性
- 卡券格式验证
- 卡券有效性检查
- 自动用户注册
- 自动用户登录
- 卡券自动兑换
- 认证Cookie生成
- 测试模式支持

### 1.2 应用场景
- 用户通过卡券码快速注册/登录系统
- 会员激活
- 礼品卡兑换
- 活动推广

## 2. 接口信息

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/login/card` |
| 请求方法 | `POST` |
| 内容类型 | `application/json` |
| 认证方式 | 无需认证（开放接口） |
| 响应格式 | `application/json` |

## 3. 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
|--------|------|------|--------|------|
| `code` | `string` | 是 | - | 卡券码，12位大写字母和数字组合 |
| `testMode` | `boolean` | 否 | `false` | 测试模式开关，开启后跳过实际卡券验证 |

### 3.1 卡券码格式要求
- 必须为12位字符
- 只允许大写字母和数字
- 支持带分隔符的格式，会自动清理（如：`ABC-123-456-7890` → `ABC1234567890`）

## 4. 响应参数

| 参数名 | 类型 | 描述 |
|--------|------|------|
| `success` | `boolean` | 登录是否成功 |
| `message` | `string` | 响应消息 |
| `username` | `string` | 生成的用户名（与卡券码相同） |
| `redeemSuccess` | `boolean` | 卡券兑换是否成功 |
| `redeemMessage` | `string` | 卡券兑换消息 |
| `data` | `object` | 附加数据，包含会员信息等 |
| `cardStatus` | `string` | 卡券状态 |
| `testMode` | `boolean` | 是否为测试模式 |

### 4.1 data对象结构

| 参数名 | 类型 | 描述 |
|--------|------|------|
| `membership` | `object` | 会员信息（如果兑换成功） |

## 5. 请求示例

### 5.1 正常请求

```bash
curl -X POST http://localhost:3000/api/login/card \
  -H "Content-Type: application/json" \
  -d '{"code":"GWF2XH6E24ZF"}'
```

### 5.2 测试模式请求

```bash
curl -X POST http://localhost:3000/api/login/card \
  -H "Content-Type: application/json" \
  -d '{"code":"TEST12345678","testMode":true}'
```

## 6. 响应示例

### 6.1 成功响应

```json
{
  "success": true,
  "message": "卡券登录成功",
  "username": "GWF2XH6E24ZF",
  "redeemSuccess": true,
  "redeemMessage": "卡券自动兑换成功",
  "data": {},
  "cardStatus": "active",
  "testMode": false
}
```

### 6.2 测试模式成功响应

```json
{
  "success": true,
  "message": "卡券登录成功",
  "username": "TEST12345678",
  "redeemSuccess": true,
  "redeemMessage": "卡券兑换成功",
  "cardStatus": "active",
  "testMode": true
}
```

### 6.3 失败响应

```json
{
  "error": "卡券无效",
  "message": "卡券已被使用"
}
```

## 7. 错误码说明

| 错误码 | 错误信息 | 描述 |
|--------|----------|------|
| 400 | 卡券码不能为空 | 未提供卡券码 |
| 400 | 卡券码格式不正确，请输入12位格式 | 卡券码长度不符合要求 |
| 400 | 卡券码格式不正确，请输入12位大写字母和数字 | 卡券码包含非法字符 |
| 400 | 卡券无效 | 卡券不存在或已失效 |
| 400 | 卡券已被使用 | 卡券状态为已使用 |
| 400 | 卡券已过期 | 卡券已超过有效期 |
| 500 | 注册失败 | 用户注册过程中出现错误 |
| 500 | 登录失败 | 卡券登录过程中出现错误 |

## 8. 业务流程

```
客户端请求 → 验证卡券格式 → 测试模式检查 → 卡券有效性验证 → 用户注册/登录 → 生成认证Cookie → 自动卡券兑换 → 返回响应
```

### 8.1 详细流程说明

1. **卡券格式验证**：
   - 检查卡券码是否为空
   - 清理卡券码（移除分隔符，转为大写）
   - 验证卡券码长度是否为12位
   - 验证卡券码是否只包含大写字母和数字

2. **测试模式检查**：
   - 如果testMode为true，跳过实际卡券验证
   - 使用模拟数据进行后续流程

3. **卡券有效性验证**：
   - 检查卡券是否存在
   - 检查卡券状态是否为"unused"（未使用）
   - 检查卡券是否未过期

4. **用户注册/登录**：
   - 使用卡券码作为用户名和密码
   - 检查用户是否已存在
   - 不存在则自动注册
   - 更新用户配置，添加到系统用户列表

5. **生成认证Cookie**：
   - 生成包含用户角色、用户名、签名、时间戳的认证信息
   - 使用密码作为密钥对用户名进行签名
   - 设置Cookie过期时间为7天

6. **自动卡券兑换**：
   - 更新卡券状态为"used"（已使用）
   - 记录兑换用户ID和时间
   - 更新批次的已使用数量

7. **返回响应**：
   - 返回登录状态
   - 返回卡券兑换结果
   - 返回用户信息

## 9. 认证Cookie说明

### 9.1 Cookie结构

| 字段 | 类型 | 描述 |
|------|------|------|
| `role` | `string` | 用户角色（owner/admin/user） |
| `username` | `string` | 用户名 |
| `signature` | `string` | 用户名签名（防止篡改） |
| `timestamp` | `number` | 时间戳（防重放攻击） |
| `loginTime` | `number` | 登录时间 |

### 9.2 Cookie属性

| 属性 | 值 | 描述 |
|------|-----|------|
| `name` | `user_auth` | Cookie名称 |
| `path` | `/` | 作用路径 |
| `expires` | 7天后 | 过期时间 |
| `sameSite` | `lax` | 跨站策略 |
| `httpOnly` | `false` | 允许前端访问 |
| `secure` | `false` | 开发环境设为false，生产环境应设为true |

## 10. 卡券数据结构

### 10.1 卡券对象

```typescript
{
  code: string;          // 卡券代码
  batchId: string;       // 所属批次ID
  createDate: number;    // 创建时间
  status: string;        // 状态：unused/used/expired
  type: string;          // 类型：membership
  level: string;         // 会员等级
  tier: string;          // 会员等级
  value: string;         // 会员等级
  validityDays: number;  // 有效期天数
  expireDays: number;    // 有效期天数
  durationDays: number;  // 有效期天数
  userId?: string;       // 兑换用户ID
  redeemTime?: string;   // 兑换时间
}
```

### 10.2 批次对象

```typescript
{
  id: string;            // 批次ID
  batchId: string;       // 批次ID
  name: string;          // 批次名称
  count: number;         // 卡券数量
  totalCount: number;    // 总数量
  usedCount: number;     // 已使用数量
  createDate: number;    // 创建时间
  tier: string;          // 会员等级
  level: string;         // 会员等级
  durationDays: number;  // 有效期天数
  coupons: string[];     // 卡券代码列表
}
```

## 11. 测试模式说明

### 11.1 功能
- 跳过实际卡券验证
- 使用模拟数据进行用户注册和登录
- 模拟卡券兑换结果
- 便于开发和测试

### 11.2 使用场景
- 开发环境测试
- 功能演示
- 集成测试

### 11.3 注意事项
- 测试模式下生成的用户为真实用户
- 测试模式下不会影响真实卡券数据
- 生产环境中应禁用测试模式

## 12. 安全机制

### 12.1 卡券安全性
- 卡券码使用12位随机字符，降低猜测风险
- 卡券状态严格管理，防止重复使用
- 卡券过期自动失效

### 12.2 认证安全性
- 认证Cookie包含签名，防止篡改
- 签名使用密码作为密钥，增强安全性
- 包含时间戳，防止重放攻击
- Cookie设置合理的过期时间

### 12.3 数据安全性
- 敏感数据加密存储
- 访问权限严格控制
- 详细的日志记录

## 13. 性能优化

### 13.1 响应时间
- 平均响应时间：< 500ms
- 99%响应时间：< 1000ms

### 13.2 并发处理
- 支持高并发请求
- 合理的缓存策略
- 异步处理非关键流程

## 14. 部署说明

### 14.1 环境要求
- Node.js 18+
- Next.js 14+
- Redis/Kvrocks/Upstash（存储卡券数据）

### 14.2 配置项

| 配置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `NEXT_PUBLIC_STORAGE_TYPE` | `string` | `localstorage` | 存储类型（localstorage/redis/upstash/kvrocks） |
| `PASSWORD` | `string` | - | 用于生成签名的密钥 |

## 15. 监控与日志

### 15.1 日志记录
- 详细的请求日志
- 卡券验证日志
- 用户注册/登录日志
- 卡券兑换日志
- 错误日志

### 15.2 监控指标
- 请求量
- 成功率
- 响应时间
- 错误率
- 卡券使用率

## 16. 版本历史

| 版本 | 日期 | 描述 |
|------|------|------|
| v1.0 | 2025-11-30 | 初始版本，实现基本功能 |

## 17. 注意事项

1. 卡券码一旦使用，不可重复使用
2. 卡券有有效期限制，请在有效期内使用
3. 每个卡券只能兑换一次
4. 测试模式下生成的用户为真实用户，如需清理请手动删除
5. 生产环境中请确保设置了安全的PASSWORD
6. 建议定期备份卡券数据
7. 请合理设置卡券有效期，避免过长或过短

## 18. 联系方式

如有问题或建议，请联系技术支持：
- 邮箱：support@example.com
- 电话：400-123-4567
- 文档：https://example.com/api-docs

---

**文档更新时间**：2025-11-30  
**文档版本**：v1.0  
**版权所有**：© 2025 LunaTV