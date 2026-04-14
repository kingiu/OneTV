# AI 代码生成规范

## ESLint 遵守
- 生成的所有代码必须遵守 `.eslintrc.js` 定义的规则
- 生成代码后必须运行 ESLint 验证，确保无新增错误
- 常见规则：
  - 使用 2 空格缩进
  - 必须使用分号
  - 禁止使用 `any`，使用 `unknown` + 类型守卫
  - 数组类型使用 `T[]` 而非 `Array<T>`
  - 类型导入使用 `import type`
  - 行长度不超过 100 字符
  - 导入必须按顺序分组

## 生成后验证
```bash
npx eslint <生成的文件路径>
```

如有报错，必须立即修复。

## 代码风格规范
- 变量/函数：`camelCase`
- 类/接口/类型：`PascalCase`
- 常量（全局/模块级）：`UPPER_SNAKE_CASE`
- 私有属性：前缀 `_`（如 `_cache`）
- React 组件文件：`PascalCase.tsx`
- 工具函数文件：`kebab-case.ts`

## 注释规则
- 所有 `TODO` / `FIXME` / `HACK` 必须附带作者 GitHub ID 和日期：`// TODO(@username 2025-01-01): 描述`
- 禁止无意义的注释（如 `i++ // 增加 i`）
- 复杂业务逻辑必须加注释解释“为什么这么做”，而非“做了什么”

## 导入顺序
1. Node.js 内置模块 (`node:fs`)
2. 第三方 npm 包 (`react`, `lodash`)
3. 项目内部模块 (`@/utils`, `@/components`)
4. 相对路径模块 (`./local`)

## 安全规范
- 所有用户输入必须经过验证和清理
- SQL 查询：使用 ORM 参数化或查询构建器，禁止字符串拼接
- Shell 命令：使用 `child_process.execFile` 而非 `exec`，避免注入
- HTML 输出：使用 `textContent` 而非 `innerHTML`

## 异步操作
- 统一使用 `async/await`
- 处理顶层 Promise 拒绝（`try/catch` 或 `.catch`）
- 事件发射器必须监听 `error` 事件

## 测试规范
- 每个业务模块至少包含一个单元测试文件
- 测试描述使用中文：`it('当输入为负数时，应该返回 0')`
- Mock 外部服务使用 `vi.mock` 或 `jest.mock`