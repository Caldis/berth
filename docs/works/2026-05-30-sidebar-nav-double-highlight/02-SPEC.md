# 设计 / 修复方案 (Design 产物)

## 决策
用户选定: **删除占位项 (最小修复)**。移除 "Claude Code" 导航项 + 空 AGENTS 分组 + `components/agents` 空目录; Sessions 保留。

## 方案
1. **删重复项**: 移除 `sidebar.tsx` navSections 中的 AGENTS 分组 (含 `claude-code` 项)。Sessions 分组保留。
2. **可测试性**: 将导航数据 (`NavItem`/`NavSection` 类型 + `navSections`) 抽到纯数据模块 `src/renderer/src/components/layout/nav-config.ts` (仅依赖 lucide 图标, 无 React hook / zustand / i18n / window), 供 `sidebar.tsx` 与单测 import。
3. **删孤儿**: `sidebar.tsx` 中因改动而未用的 `Bot` 图标 import; i18n `nav.agents`、`nav.claudeCode` 键 (zh.json + en.json)。
4. **清脚手架**: 删除空目录 `components/agents/claude-code`、`components/agents/sessions` (及空的 `components/agents`)。git 不跟踪空目录, 属本地清理。
5. **保留** `isActive` 的 `startsWith`: 它使 `/sessions/:id` 详情页仍高亮 Sessions, 是正确行为, 不改。

## 影响面
- 改: `src/renderer/src/components/layout/sidebar.tsx` (数据改 import; 删 Bot import)
- 增: `src/renderer/src/components/layout/nav-config.ts`
- 改: `src/renderer/src/i18n/locales/zh.json`、`en.json` (删 2 键)
- 增: `tests/renderer/nav-config.test.ts` (路径唯一性回归)
- 删: 空目录 `components/agents/*`

## 验收映射
(对 01-ANALYSIS 验收标准逐条)
1. 仅一项高亮 ← 删除重复项后, `/sessions` 下只有 Sessions 匹配。
2. active 与路由唯一对应 ← `nav-config.test.ts` 断言所有 `item.path` 唯一 (回归防护)。
3. 无死链项 ← 删除的正是唯一无路由项; 其余项均有 App.tsx 路由。
4. typecheck / lint / test 通过 ← verify 执行。
5. 视觉无双亮 ← verify 实测窗口坐标截图确认。
