# TypeScript 严格模式规则

## 编译器选项强制要求
- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUncheckedIndexedAccess: true`

## 编码约束
- 禁止使用 `any`，若必须使用则用 `unknown` + 类型守卫。
- 所有函数参数和返回值必须显式类型标注（即使能推断）。
- 使用 `interface` 描述对象形状，`type` 用于联合/元组/工具类型。
- 禁止使用 `as` 断言，除非先进行运行时检查（如 `isMyType` 守卫）。
- 枚举（`enum`）优先使用 `const enum` 或联合类型 `type Status = 'idle' | 'loading'`。

## 泛型规范
- 泛型参数名：单个大写字母（`T`）或有意义的名称（`TData`）。
- 泛型约束优先使用 `extends keyof` 或特定接口。