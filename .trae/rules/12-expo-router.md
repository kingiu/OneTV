# Expo Router 项目结构与路由规则

## 1. 文件结构与命名
*   所有路由页面文件必须位于 `src/app` 目录下。
*   `index.tsx` 文件作为其所在目录的默认入口，对应根路径或父级路径。
*   动态路由使用方括号 `[param]` 语法，参数会作为路由 `param` 对象的一部分传入页面。
*   使用括号 `(group)` 文件夹对路由进行逻辑分组，该文件夹名不会出现在实际的 URL 路径中。

## 2. 核心路由文件
*   `_layout.tsx` 文件是路由组的布局组件，用于定义该组下所有路由的通用布局（如导航栏、侧边栏）。

## 3. 路由生成示例
*   文件 `src/app/index.tsx` -> 路由路径 `/`
*   文件 `src/app/settings.tsx` -> 路由路径 `/settings`
*   文件 `src/app/user/[id].tsx` -> 路由路径 `/user/:id` (例如 `/user/123`)
*   文件 `src/app/(auth)/login.tsx` -> 路由路径 `/login`

## 4. 导航跳转
*   在组件内部进行页面跳转时，必须使用 Expo Router 提供的 `router` 对象或 `Link` 组件。
*   进行命令式跳转：`import { router } from 'expo-router'; router.push('/settings');`
*   使用声明式跳转：`import { Link } from 'expo-router'; <Link href="/settings">Go to Settings</Link>`