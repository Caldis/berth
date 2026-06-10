# 需求分析 (Explore 产物)

## 现状理解

纯 **renderer 层 (React + Recharts + Tailwind)** 视觉任务, **不涉及 main / preload / IPC / 数据契约**。所有改动落在 `src/renderer/src/`。

配色真源现状 (分散三处, 无统一中央定义):
- `styles/globals.css` — `--chart-1 ~ --chart-5` CSS 变量 (light L36-40 / dark L71-75)。shadcn "多分类对比" 默认色板。
- `pages/usage.tsx:32-38` — `CHART_COLORS[]` 常量, 仅是 `hsl(var(--chart-1..5))` 的 JS 数组包装。
- `components/shared/token-usage-display.tsx:19-25` — `SEGMENT_CLASS`, Tailwind 硬编码类 (`bg-blue-500 / bg-emerald-500 / bg-amber-500 / bg-violet-500`), **未接入 CSS 变量体系**。

`--chart-1~5` 实际色相 (light): 近黑 / 中灰 / 蓝灰(215) / 青绿(173) / 玫红(339) — 5 个互不相关色相, 为分类对比设计。

## 关联与依赖

全站图表/配色使用点 (renderer 完整清单):

| # | 位置 | 文件:行 | 数据性质 | 当前配色 | 用户评价 |
|---|------|---------|---------|---------|---------|
| A | token 用量条 (compact/detail, 含图例点) | token-usage-display.tsx:19-25,98-123 | **多分类·固定语义** (输入/输出/缓存/推理) | Tailwind 蓝/绿/橙/紫 | **好/基准** (Image #2/#3) |
| B | 首页「近 7 天费用」柱状图 | overview.tsx:413-417 | **同质·时间序列** (按日期) | `--chart-(i%5+1)` 循环多色 + opacity 0.85 | **很丑** ← 重点 (Image #1) |
| C | 用量页「每日花费」柱状图 | usage.tsx:683 | **同质·时间序列** (按日期) | `--chart-1` 单色 | 可保留 (Image #4) |
| D | 用量页「按模型」breakdown 色标 | usage.tsx:708-713 (CHART_COLORS) | **多分类·动态数量** (N 模型) | `--chart-(i%5)` | 未点名 |
| E | 用量页「按项目」breakdown 色标 | usage.tsx:737-742 (CHART_COLORS) | **多分类·动态数量** (N 项目) | `--chart-(i%5)` | 未点名 |

`TokenUsageDisplay` 被 sessions / session-detail / usage / overview **4 页复用** — 即用户在「会话详情页」看到并称赞的 token 条 (Image #2) 与用量页 token 条 (Image #3) 是**同一组件同一配色**。

**核心诊断 (根因)**: 「很丑」不是色板本身差, 而是 **把为多分类对比设计的 5 色板 (`--chart-1~5`) 误用到同质时间序列 (按日期的费用柱) 上 → 色相无意义跳变**。反证: 同为按日期的「每日花费」(C) 用单色 `--chart-1` 即被认可; 真多分类的 token 条 (A) 用语义多色即被称赞。
→ **统一原则应按数据语义分流, 而非全站一种色**:
  - 同质/序列数据 (B、C) → **单一强调色**;
  - 多分类数据 (A、D、E) → **统一一套分类语义色板** (单一真源)。

应用整体风格 = shadcn 极简中性 (`--primary` light 近黑 / dark 近白), 故「符合应用风格」= 克制、中性为主 + 有限语义强调色。

## 任务分类与 debt 校准
- type / maintenance.subtype: maintenance / ui-ux (不变)
- source.kind / refs: user-request / [GH-103] (不变)
- debt estimate 修正: incurred 2→3 (新增集中配色真源文件 + 改 5 处使用点 + 暗色模式校准), repaid 2 (消除分散硬编码 / 收敛两套并存色板), net 0→1
- scope / risk / areas / confidence: module / low / [ui-ux] / low→medium (纯视觉、无逻辑与数据契约变更, 风险低)
- revision: 见 INDEX.debt.revisions[] (explore 校准, 2026-06-04)

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 存在**单一中央配色真源** (CSS 变量 + 可选 TS 常量), 不再有分散硬编码 (`bg-blue-500` 等) 与重复数组。
2. 首页「近 7 天费用」柱状图不再色相杂乱: 同质日期数据采用统一处理 (单色或同色系), 视觉协调, 与「每日花费」一致。
3. token 用量条 (A) 的语义色 (输入/输出/缓存/推理) 仍清晰可辨, 且暗色模式自适应; 配色来自统一真源而非组件内硬编码。
4. 用量页「按模型/按项目」breakdown 色标与全站分类色板一致 (同一真源)。
5. 亮色 / 暗色两套主题下所有图表配色均美观、对比充足、可读 (坐标轴/网格/tooltip 不受影响)。
6. 不引入逻辑 / 数据 / IPC 变更; typecheck / lint / test / e2e 通过; 视觉以实测窗口截图验收 (亮+暗)。

## 界面质量与交互验收
- **现有页面结构**: Overview (metrics + 近7天费用图 + recent sessions + health)、Usage (每日花费图 + token 用量条 + byModel/byProject breakdown)、Session-detail (复用 token 条)、Sessions 列表 (token 条)。
- **设计系统用法**: shadcn + Tailwind + CSS 变量 (HSL 三元组), 卡片化 `rounded-lg border bg-card`, 中性灰阶为主。Recharts 通过 `hsl(var(--chart-*))` 取色, 已支持暗色切换 (除 SEGMENT_CLASS 走 Tailwind 固定色)。
- **信息密度**: 图表为卡片内次要可视化, 尺寸不大 (barSize≈12, 高度有限)。
- **主要用户路径**: 进首页看近7天费用 → 用量页看每日花费/token 分布/模型项目 breakdown → 会话详情看单会话 token 条。
- **可见状态**: 图表有 loading skeleton / empty (emptyModels/emptyProjects) / 数据态; 本任务不改这些状态, 仅改配色。
- **交互反馈**: Recharts Tooltip (contentStyle 用 card/border 变量) — 配色统一时需保持 tooltip 文本可读。
- **响应式**: ResponsiveContainer 自适应宽度; 配色与布局无关, 低风险。
- **可访问性风险**: 语义色需保证亮/暗对比度; breakdown 色标若纯靠颜色区分需保留文字标签 (现有已有标签, 不退化)。

## 未决问题
留给 design 向人澄清 (将以 brainstorming ≤3 问确认, 仅影响方案/范围/验收的关键项):
1. **同质序列图表 (近7天费用 / 每日花费) 的单色选什么?** 选项: (a) 中性 primary 色 (纯黑/白, 极简, 与每日花费现状一致); (b) 单一柔和强调色 (如呼应 token 条的蓝); (c) 同色系深浅渐变 (按数值高低)。用户称 token 条「好」可能偏好 (b)/(c) 的「有彩但克制」。
2. **多分类色板 (token A + breakdown D/E) 是否统一为同一套?** token 是 4 固定语义色 (蓝绿橙紫), breakdown 是动态 N 色循环。建议: 定义一套 `--chart-categorical-*` 语义色板 (蓝绿橙紫为前 4), token 映射固定语义、breakdown 按序循环。需确认是否接受 breakdown 从现有黑灰蓝灰玫红切换为蓝绿橙紫体系。
3. **是否保留 `--chart-1~5` 命名**, 还是新增语义化命名 (如 `--chart-accent` / `--chart-cat-1..n`)? 影响改动面与向后兼容。
