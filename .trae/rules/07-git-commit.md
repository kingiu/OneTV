# Git 规范（Conventional Commits）

## 提交信息格式
<type>(<scope>): <subject>

<body>

<footer>

## Type 类型
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档修改
- `style`: 代码格式（不影响运行）
- `refactor`: 重构（既不是新功能也不是修复）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具变动

## 示例
feat(auth): add OAuth2 login flow

- implement Google and GitHub strategies
- store refresh token in httpOnly cookie

Closes #42