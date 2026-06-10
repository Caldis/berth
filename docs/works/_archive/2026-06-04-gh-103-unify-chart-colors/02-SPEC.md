# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 决策摘要 (来自 brainstorming)
- **同质序列图** (近7天费用 B / 每日花费 C) → 中性 `--primary` 单色 (用户选: 极简, 与每日花费一致)。 → 验收 2
- **多分类色板** (token A + byModel D + byProject E) → 全部统一到一套蓝绿橙紫语义色板, 收进 CSS 变量真源。 → 验收 1/3/4

## 关键架构判断 (受测真源约束)
`tests/renderer/theme-palette.test.ts` 已锁定: (1) `usage.tsx` 必须引用 `--chart-1~5`; (2) `--chart-2` 不得回退为旧橙 `24.6 95% 53.1%`。故**不新增 `--chart-cat-*` 变量**, 而是**直接把 `--chart-1~5` 的值改为统一语义色板**, 让 breakdown 自动跟随; 同质序列单色改用 `--primary` (与 `--chart-1` 解耦), 两个诉求落在两组不同 token, 互不冲突。测试随真源意图同步更新, 不绕开。

## 数据契约
无。纯 renderer 视觉, 不涉及 IPC / main / preload / `@shared` 数据契约。`@shared/token-usage` 的 `TokenUsageSegmentId` 类型复用, 不改。

## 配色真源定义

### A. `--chart-1~5` 语义化 (globals.css) — 多分类语义色板
取用户已认可的蓝绿橙紫 (≈ Tailwind blue/emerald/amber/violet-500), 第 5 色补粉 (breakdown 第 5+ 循环)。暗色提亮一档 (≈ -400) 保证对比。

| 变量 | 语义 (token 映射) | light (HSL) | dark (HSL) |
|---|---|---|---|
| --chart-1 | 输入 input · 蓝 | 217 91% 60% | 213 94% 68% |
| --chart-2 | 输出 output · 绿 | 160 84% 39% | 160 65% 52% |
| --chart-3 | 缓存 cache · 橙 | 38 92% 50% | 43 96% 56% |
| --chart-4 | 推理 reasoning · 紫 | 258 90% 66% | 255 92% 76% |
| --chart-5 | 第 5+ 分类 · 粉 | 330 81% 60% | 329 87% 70% |

### B. 同质序列单色 = `hsl(var(--primary))`
- light 240 5.9% 10% (近黑) / dark 0 0% 98% (近白) — 现有值, 不改 `--primary`。

### C. 集中引用层 `src/renderer/src/lib/chart-colors.ts` (新建) — 单一真源
```ts
import type { TokenUsageSegmentId } from '@shared/token-usage'
// 同质序列图 (按时间的单序列) 统一单色
export const CHART_SERIES_FILL = 'hsl(var(--primary))'
// 多分类语义色板: token 固定语义 + breakdown 按序循环
export const CHART_CATEGORICAL = [
  'hsl(var(--chart-1))', // 蓝
  'hsl(var(--chart-2))', // 绿
  'hsl(var(--chart-3))', // 橙
  'hsl(var(--chart-4))', // 紫
  'hsl(var(--chart-5))'  // 粉
] as const
// token 段 → CSS 变量名 (固定语义映射, unknown 用中性 muted)
export const TOKEN_SEGMENT_COLOR_VAR: Record<TokenUsageSegmentId, string> = {
  input: '--chart-1', output: '--chart-2', cache: '--chart-3', reasoning: '--chart-4',
  unknown: '--muted-foreground'
}
```

## 模块结构 / 组件拆分 (改动面, 全在 renderer)
1. **新建** `lib/chart-colors.ts` — 真源 (上 C)。→ 验收 1
2. `styles/globals.css` L41-45 (light) / L76-80 (dark) — `--chart-1~5` 改为语义色板值 + 注释。→ 验收 1/3/4/5
3. `pages/overview.tsx` L413-417 — 近7天费用: 去掉 `<Cell>` 循环多色, 改 `<Bar fill={CHART_SERIES_FILL} radius={...}>` 单色 (去 opacity, 与每日花费一致)。清理因此不再用的 `Cell` import (若 overview 其它处无 Cell)。→ 验收 2
4. `pages/usage.tsx` L32-38 — 删本地 `CHART_COLORS`, 改 `import { CHART_CATEGORICAL, CHART_SERIES_FILL }`; L683 每日花费 `fill="hsl(var(--chart-1))"` → `fill={CHART_SERIES_FILL}`; L712/741 breakdown 改用 `CHART_CATEGORICAL[i % CHART_CATEGORICAL.length]`。→ 验收 2/4
5. `components/shared/token-usage-display.tsx` L19-25 — `SEGMENT_CLASS` (Tailwind 硬编码) → 用 `TOKEN_SEGMENT_COLOR_VAR`, 分段 (L100-105) 与图例点 (L116) 改 `style={{ backgroundColor: \`hsl(var(${TOKEN_SEGMENT_COLOR_VAR[id]})${id==='unknown'?' / 0.5':''})\` }}`。→ 验收 1/3

遵守 ARCHITECTURE: 纯 renderer 视觉层, 无 IPC/进程边界改动。

## 界面质量与交互验收
| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 仅改 fill/背景色, 布局/尺寸/barSize 不变 | 截图对比布局无位移 |
| 组件选择 / 设计系统一致性 | 颜色全部来自 CSS 变量真源; 序列图=primary 中性, 分类=蓝绿橙紫语义; 契合 shadcn 极简风 | 截图(亮+暗) + 源码断言走真源 |
| 交互反馈 / 状态切换 | Recharts Tooltip contentStyle 不变, 仍 card/border 变量 | hover tooltip 文本可读 |
| loading / empty / error / disabled / focus | 不改这些状态分支 (emptyModels/emptyProjects 文案保留) | 既有测试不回归 |
| 响应式 / 可访问性 / 键盘可达 | 颜色与布局无关; 语义色保证亮暗对比; breakdown/token 均保留文字标签不靠纯色 | 暗色截图对比度目测 + 标签仍在 |
| 文案 / i18n / 数字和路径格式 | 无文案改动 | 不适用 |

## 测试策略
Recharts SVG 在 jsdom 下 fill 断言不可靠, 故图表"实际渲染色"以**源码文本断言锁定真源** + **实测窗口截图 (亮+暗)** 验收; 真源常量与 token 组件用单元测试锁定。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| chart-colors.ts 真源: series=primary, categorical 5 色引用 --chart-1~5 | unit | tests/renderer/chart-colors.test.ts (新) | pnpm test | — |
| globals.css `--chart-1~5` 为新语义色板 (含 chart-1 蓝 `217 91% 60%`), 非旧黑灰玫红 | renderer(文本) | tests/renderer/theme-palette.test.ts (改) | pnpm test | — |
| usage 真源迁移: 引用 CHART_CATEGORICAL / CHART_SERIES_FILL, breakdown 走真源 | renderer(文本) | theme-palette.test.ts (改 test2 指向真源) | pnpm test | — |
| token 条接入 CSS 变量, 不再含 `bg-blue-500/emerald/amber/violet-500` | renderer | tests/renderer/token-usage-display.test.tsx (新) | pnpm test | — |
| 近7天费用单色化, overview 不再 `--chart-${...}` 循环 | renderer(文本) | theme-palette.test.ts (增 overview 断言) | pnpm test | — |
| 亮/暗主题图表美观、对比充足、布局无位移 | manual(截图) | — | 实测窗口截图(亮+暗) | Recharts SVG 渲染色 jsdom 不可靠, 视觉需人眼 |
| 全局回归不破坏 | harness | — | pnpm harness:prepush | typecheck/lint/test/e2e/build |

## 任务分类与 debt
- type / maintenance.subtype: maintenance / ui-ux
- source.kind / refs: user-request / [GH-103]
- debt.estimate: incurred 3 / repaid 2 / net 1 / module / low / [ui-ux] / medium (design 后维持 explore 校准值; 方案复用现有 --chart-1~5 未新增变量, 改动面如预期)
- debt.final 预期: 与 estimate 接近 (net ≈ 1); verify 后据实回填
- revisions: 见 INDEX (explore 校准已记录; design 未再变更估算, 不追加)
- Project 字段同步: archive 时 `done` 同步最终 debt

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 新建 chart-colors.ts 真源 | 1 |
| 近7天费用单色化 (primary) | 2 |
| 每日花费用 primary | 2 |
| token 条接入 CSS 变量 + 暗色自适应 | 3 |
| breakdown 走统一语义色板 | 4 |
| 亮/暗主题美观可读 | 5 |
| 无逻辑/数据/IPC 变更, 门禁通过 | 6 |
