// https://docs.expo.dev/guides/using-eslint/
// 根据项目规则 (.trae/rules/) 优化的 ESLint 配置
module.exports = {
  extends: [
    'expo',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'import',
  ],
  root: true,
  rules: {
    // ===== 基础格式规则 =====
    'indent': ['error', 2], // 2 空格缩进
    'semi': ['error', 'always'], // 必须分号
    'max-len': ['warn', { 
      code: 100, // 最大行长度 100 字符
      ignoreComments: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
    }],
    'no-trailing-spaces': 'error', // 禁止行尾空格
    'eol-last': ['error', 'always'], // 文件末尾保留空行
    
    // ===== TypeScript 严格模式 =====
    '@typescript-eslint/no-explicit-any': 'error', // 禁止 any
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }], // 未使用变量警告
    '@typescript-eslint/array-type': ['error', { default: 'array-simple' }], // 使用 T[] 而非 Array<T>
    '@typescript-eslint/consistent-type-imports': ['error', { 
      prefer: 'type-imports',
      fixStyle: 'inline-type-imports',
    }], // 类型导入使用 import type
    '@typescript-eslint/no-non-null-assertion': 'warn', // 禁止 ! 断言
    '@typescript-eslint/ban-ts-comment': 'warn', // 禁止 @ts-ignore 等注释
    
    // ===== 导入顺序规则 =====
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    }],
    'import/no-unresolved': 'off', // React Native 模块可能无法解析，关闭此规则
    
    // ===== React 最佳实践 =====
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn', // useEffect 依赖检查
    'react/no-unescaped-entities': 'warn',
    
    // ===== 代码质量 =====
    'no-console': ['warn', { allow: ['warn', 'error'] }], // 允许 console.warn/error
    'prefer-const': 'error', // 优先使用 const
    'no-var': 'error', // 禁止 var
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  overrides: [
    {
      // 测试文件规则放宽
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
  ],
};
