# 现状分析 (Explore 产物)

## 现状理解
- **路由** (`src/renderer/src/App.tsx`): 注册 7 条 — `/`→Overview, `/sessions`→Sessions, `/sessions/:id`→SessionDetail, `/configuration/instructions`, `/configuration/capabilities`, `/usage`, `/settings`。**无 `claude-code` 路由**。
- **导航数据** (`src/renderer/src/components/layout/sidebar.tsx` navSections): "Claude Code" (id=`claude-code`, AGENTS 分组, line 44) 与 "Sessions" (id=`sessions`, 独立分组, line 49) 的 `path` **均为 `/sessions`**。
- **active 判定** (`isActive`, line 92-95): 非根路由用 `location.pathname.startsWith(path)`。
- **页面**: `pages/sessions.tsx` 存在且被路由引用; **无 claude-code 页面**。`components/agents/{claude-code,sessions}/` 为**空目录** (脚手架遗留, 无文件、无任何引用)。
- **i18n**: `nav.claudeCode = "Claude Code"` 已存在于 zh.json / en.json (line 9)。

## 关联与依赖
1. **双高亮直接成因**: 两个导航项共享同一 `path = /sessions`。在该路由下 `isActive` 对两者同时返回 true。
2. **`startsWith` 为次要因素**: 即便改为精确匹配 (`location.pathname === path`), 因两项 `path` 相同, `'/sessions' === '/sessions'` 对两者仍同时为真。**仅改判定逻辑无法修复**。
3. **根因**: "Claude Code" 导航项无独立目的地, 被占位指向 `/sessions`, 与 "Sessions" 的可达路由完全重合。修复必须消除"两项共享同一可达路由"这一结构性重复。

## 验收标准
(逐条编号, 后续 SPEC 与 verify 据此核对)
1. 同一时刻侧边栏仅一个导航项处于 active 高亮态。
2. 每个导航项的 active 态与当前路由唯一对应; 不存在两个项共享同一可达路由且同时高亮。
3. 不引入未被路由覆盖的死链导航项 (点击后无对应页面)。
4. `pnpm typecheck` / `pnpm lint` / 既有测试通过。
5. 视觉验收 (实测窗口坐标裁剪截图) 确认 `/sessions` 下无双亮。

## 未决问题
(留给 design 向人澄清)
1. **"Claude Code" 的产品意图为何?** 代码无法判定。三种可能, 对应不同修复:
   - (a) 它本应是**独立页面** (Claude Code agent 概览/landing), 尚未实现, 当前占位指向 `/sessions` → 修复 = 新建 `/claude-code` 路由 + 页面, 导航项指向它。
   - (b) 它与 "Sessions" **语义重复** → 修复 = 删除其一 (及空的 AGENTS 脚手架)。
   - (c) "Claude Code" 为 agent **父级**, "Sessions" 为其子视图 → 修复 = 层级化导航结构。
