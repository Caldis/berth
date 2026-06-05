# 技术方案 (Design 产物)

会话列表行从手写元素升级为 HeroUI Chip 组件化的**单行高密度**布局 (用户选定方案 B), 在主行内符号化呈现 token 细分 / skills / mcp 计数, 完整明细走原生 `title`+`aria-label` 渐进披露。每条回指 01-ANALYSIS 验收标准编号。

## 数据契约
- 全部消费现有 `SessionSummary` (`@shared/types/asset`), **不扩 IPC、不改 main**。字段: `title` `agentId` `startedAt` `duration` `cost` `tokenUsage` `model` `skillsUsed[]` `mcpServers[]`。`hooksFired` 不进列表行 (本机样本多为 0, AC7)。
- token 段复用 `tokenUsageSegments(usage)` (`@shared/token-usage:120`) + `TOKEN_SEGMENT_COLOR_VAR` (`@/lib/chart-colors`: input 蓝/output 绿/cache 橙/reasoning 紫/unknown muted)。
- 空值规则 (AC4/5/8): `skillsUsed`/`mcpServers` 空数组 → 不渲染对应 chip; `cost==null` (Codex) → 不渲染 cost, 不显示误导性 0/—。

## 任务分类与 debt
- type: feature / source.kind: user-request / refs: GH-108。
- debt.estimate: incurred 4 / repaid 2 / net 2 / scope module / risk low / areas [ui-ux] (维持 explore 校准值)。方案锁定后 confidence 实质达 high; net/scope/risk/areas 均未变, **不追加 revision** (无数值变化)。
- debt.final 预期: incurred ~4 (2 新展示组件 + 行重构 + i18n), repaid ~2 (agent badge + model chip 收敛到语义 Chip)。
- Project 字段同步: archive 前 `harness-projects.mjs done` 同步最终 debt。

## 模块结构 / 组件拆分
遵守 ARCHITECTURE: 纯 renderer, 不碰 main/preload/IPC。

**新增** (`src/renderer/src/components/shared/`):
1. `token-spark-bar.tsx` — `TokenSparkBar`。props `{ usage: TokenUsageBreakdown; className? }`。渲染 `{总量} tok` + 紧凑分段 bar (宽 ~52px / 高 6px, 段宽=percentage, 段色=segmentColor)。`title`/`aria-label` 含细分 (`Input N / Output M / …`)。`hasBreakdown===false` 或 `totalTokens===0` → 仅数字无 bar。**不改 `TokenUsageDisplay`** (避免波及 overview/usage/detail)。
2. `asset-count-chip.tsx` — `AssetCountChip`。props `{ icon; iconClassName; count; names: string[]; label; max? }`。`count===0` → 返回 `null`。渲染 HeroUI `Chip` (tone neutral, variant flat, size sm, `startContent`=icon, children=count)。`aria-label`=`${label}: ${names.slice(0,max).join(', ')}${溢出 ' +K'}`, 同值挂 `title`。skills 用 `Sparkles` 蓝 / mcp 用 `Plug` 绿 (复用详情页图标语义, AC1)。

**修改** `src/renderer/src/pages/sessions.tsx`:
- `SessionRow` 重写为单行 (~56px): 左 `flex-1 min-w-0` (title truncate + 相对时间·时长, 时长 `max-md` 隐藏); 右 `shrink-0 flex items-center gap-2`: agent `Chip` (仅 `agentView==='all'`) → `AssetCountChip` skills → `AssetCountChip` mcp → cost (`Coins`+金额, 仅非 null) → `TokenSparkBar` → model `Chip` (tone primary)。行保持 `<button>` (键盘可达, AC10), `data-testid` `session-row-{id}` 与组内首尾圆角逻辑不变 (AC12)。
- 移除手写 agent badge span 与 model chip span, 收敛到 `Chip` (AC1/2)。
- `VirtualGroupedList` `defaultItemHeight` 72 → 56 (估算, virtuoso 自动测量真实高度, AC12)。

**Tooltip 决策** (规则 9 / 嵌套交互 / 可测性): 主行**不嵌 HeroUI Tooltip** — 它在 `<button>` 内有嵌套 focusable 风险, 且 content 未 hover 不入 DOM (不可单测、关闭态无 a11y 描述)。完整 skills/mcp 名称与 token 细分统一走原生 `title`+`aria-label` (cost-source-badge 已验证模式: 可测 `getByTitle`/`getByLabelText`、a11y 完整、无嵌套)。HeroUI Tooltip 仅在 implement 验证无嵌套/a11y 告警时作为视觉增强叠加, 否则不用。

**不改**: `ui/index.ts` (Chip/Tooltip 已导出, 不需 Progress)、`CategoryJumpNav`、分组头、main 层。i18n `zh.json`/`en.json` 复用 `sessions.skillsUsed`/`sessions.mcpConnected`, 新增计数 aria 文案 key。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 单行 ~56px; title 弹性主信息, 右侧符号化元数据横排; 主信息 (标题) 一眼可得, 次级 (时长/cost) `max-md` 让位 | Electron 实测: 标题不被次级元数据挤断; 每屏可见会话数较旧版增加 (AC9) |
| 组件选择 / 设计系统一致性 | agent/skills/mcp/model 全部 HeroUI `Chip` (tone 语义); 图标复用详情页 (Sparkles 蓝/Plug 绿); token 段色用 chart 调色板 | 代码审查无手写 badge/chip; 截图 chip 圆角/间距与详情页一致 (AC1/2) |
| 交互反馈 / 状态切换 | 行 `hover` 背景 + `focus-visible` ring (走 `--ring`); chip 非交互 (纯展示) | 键盘 Tab 到行 + Enter 打开详情; hover 高亮可见 (AC10) |
| loading / empty / error / focus | 复用现有 `LoadingState` / `EmptyState` (无会话 vs 筛选无结果区分文案) / `toolbarStatus` 刷新态 | sessions-pages 测试现有断言保持绿 (AC11) |
| 响应式 / 可访问性 / 键盘可达 | `max-lg` jump-nav 转横向; 行右侧窄宽截断不溢出; chip 有 `aria-label`; 颜色非唯一信息载体 (图标+文本) | jsdom 测 aria-label; Electron 窄窗实测不溢出 (AC8/10) |
| 文案 / i18n / 数字和路径格式 | 计数/明细文案走 i18n (zh/en); token `formatNumber`; cost `formatOptionalCurrency`; 时间 `formatOptionalRelativeTime` | zh/en 双语测试; 无硬编码英文 (AC3) |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 例外理由 |
|---|---|---|---|---|
| `TokenSparkBar`: 总量文本 / segments 宽度色 / 空 usage / aria 细分 | renderer (jsdom+RTL) | `tests/renderer/token-spark-bar.test.tsx` (新) | `pnpm test -- token-spark-bar` | — |
| `AssetCountChip`: count 显示 / aria-label 含名称 / top-N 溢出 / count=0 返回 null | renderer | `tests/renderer/asset-count-chip.test.tsx` (新) | `pnpm test -- asset-count-chip` | — |
| `SessionRow`: skills/mcp chip 条件渲染 + aria-label; cost null 不显示; token 总量保留 + bar; agent/model chip; 更新旧 `I 10 / O 5` 断言到新形式 | renderer | `tests/renderer/sessions-pages.test.tsx` (扩展) | `pnpm test -- sessions-pages` | — |
| 虚拟列表 / jump-nav / 圆角 / 筛选 / 空态 不回归 | renderer | `tests/renderer/sessions-pages.test.tsx` (保持) | `pnpm test -- sessions-pages` | — |
| 行高 / dark·light·accent 视觉 / 每屏密度 | manual + e2e | Electron 实测截图 (`.agents/workflow/4.0-verify.md` 坐标裁剪) | 手动 | 精确像素/主题视觉不宜 jsdom 断言 |
| 全量回归 | renderer+unit | 全套 | `pnpm test` + `pnpm typecheck` + `pnpm lint` | — |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| SessionRow Chip 化 / 收敛手写 badge | 1, 2 |
| 保留现有字段 + Codex 分支 | 3, 8 |
| AssetCountChip (skills/mcp) | 4, 5 |
| TokenSparkBar 细分 | 6 |
| hooksFired/cache 不进主区 | 7 |
| 信息层级 / hover / focus / 键盘 | 9, 10 |
| loading/empty/refresh 状态 | 11 |
| defaultItemHeight + 虚拟列表不回归 | 12 |
| 测试覆盖 | 13 |
| dark/light/accent 截图 | 14 |
