# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

**执行顺序**: 任务 1 (真源) → 2 (globals) → 3/4/5 (消费点) → 6 (收口)。
**顺序执行理由**: 任务 3/4 与任务 2 共改 `tests/renderer/theme-palette.test.ts` (测试文件耦合); 任务 3/4/5 均 import 任务 1 的真源 (依赖前置)。共享工作区下单线顺序最稳, 不并行。

- [ ] 任务 1: 新建配色真源 `src/renderer/src/lib/chart-colors.ts` (CHART_SERIES_FILL / CHART_CATEGORICAL / TOKEN_SEGMENT_COLOR_VAR)
  - tests: 先写 `tests/renderer/chart-colors.test.ts` (red): 断言 `CHART_SERIES_FILL==='hsl(var(--primary))'`; `CHART_CATEGORICAL` 长度 5 且依次引用 `--chart-1..5`; `TOKEN_SEGMENT_COLOR_VAR.input==='--chart-1'` … `unknown==='--muted-foreground'`。建文件转 green。`pnpm test chart-colors`
  - verify: 单测通过; 验收标准 1 (单一真源)。非视觉项, 无截图。

- [ ] 任务 2: `styles/globals.css` 将 `--chart-1~5` (light L41-45 / dark L76-80) 改为统一语义色板 + 注释
  - tests: 更新 `tests/renderer/theme-palette.test.ts`: 断言 globals 含 `--chart-1: 217 91% 60%;` (light) 与 `--chart-1: 213 94% 68%;` (dark) 等新值; 保留 `not.toMatch` 旧橙 `24.6 95% 53.1%`。`pnpm test theme-palette`
  - verify: 单测通过; 截图(亮+暗)确认 breakdown 与 token 条呈蓝绿橙紫; 界面质量: 设计系统一致性(颜色走变量)、暗色对比充足。验收标准 1/3/4/5。

- [ ] 任务 3: `pages/overview.tsx` 近 7 天费用柱状图单色化 (去 Cell 循环多色 → `fill={CHART_SERIES_FILL}` 单色, 去 opacity)
  - tests: 更新 `theme-palette.test.ts`: 断言 `overview.tsx` 含 `CHART_SERIES_FILL` 且不再含 `--chart-${` 动态循环。`pnpm test theme-palette`
  - verify: 截图首页「近 7 天费用」全部柱子为中性 primary 单色, 不再黑/灰/蓝灰/青绿/玫红混搭; 界面质量: 布局/barSize 无位移、与「每日花费」观感一致。验收标准 2。

- [ ] 任务 4: `pages/usage.tsx` 真源迁移 (删本地 CHART_COLORS→import; 每日花费 fill→CHART_SERIES_FILL; breakdown→CHART_CATEGORICAL 循环)
  - tests: 更新 `theme-palette.test.ts` test2: 改为断言 `usage.tsx` 引用 `CHART_CATEGORICAL` 与 `CHART_SERIES_FILL` (真源迁移后不再内联 `hsl(var(--chart-n))` 数组; --chart-1~5 引用由 chart-colors.test 锁定)。`pnpm test theme-palette`
  - verify: 截图用量页「每日花费」为中性 primary 单色; 「按模型/按项目」色标为蓝绿橙紫语义色板; 界面质量: breakdown 行保留文字标签不靠纯色。验收标准 2/4。

- [ ] 任务 5: `components/shared/token-usage-display.tsx` 接入 CSS 变量真源 (SEGMENT_CLASS Tailwind 硬编码 → TOKEN_SEGMENT_COLOR_VAR + inline style)
  - tests: 新建 `tests/renderer/token-usage-display.test.tsx`: 渲染 detail 模式, 断言不含 `bg-blue-500/bg-emerald-500/bg-amber-500/bg-violet-500`; 分段与图例点 style 含 `var(--chart-1)` 等。`pnpm test token-usage-display`
  - verify: 截图会话详情页 + 用量页 token 条颜色(亮)与现状一致、暗色自适应变亮; 分段与图例点同色; unknown 段仍中性半透。验收标准 1/3。

- [ ] 任务 6: 全局门禁 + 视觉收口
  - tests: `pnpm harness:prepush` (typecheck/lint/test/e2e/build) 全绿。
  - verify: 实测 electron 窗口坐标裁剪截图, 亮 + 暗 各一组, 覆盖首页近7天费用 / 用量页每日花费+token条+breakdown / 会话详情 token 条; 逐项核对 01-ANALYSIS「界面质量与交互验收」与验收标准 1-6。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
