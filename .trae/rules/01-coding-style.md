# 代码风格规范

## 基础格式
- 缩进：**2 空格**（禁止 Tab）
- 行尾分号：**必须**
- 最大行长度：**100 字符**
- 文件末尾：保留一个空行

## 命名约定
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

## 导入顺序（自动修复可用 `eslint-plugin-import`）
1. Node.js 内置模块 (`node:fs`)
2. 第三方 npm 包 (`react`, `lodash`)
3. 项目内部模块 (`@/utils`, `@/components`)
4. 相对路径模块 (`./local`)