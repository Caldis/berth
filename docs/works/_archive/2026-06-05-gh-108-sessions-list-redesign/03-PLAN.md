# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

**并行/顺序边界**: 任务 1、2 文件不重叠且测试独立 → 可并行; 任务 3 依赖 1+2; 任务 4 配合 3 同步; 任务 5 (验收) 最后。本 session 顺序推进 1→2→3→4→5, 小步提交。

- [x] 任务 1: `TokenSparkBar` 组件 (token 细分可视化) — AC6  ✅ 4 测试通过
  - 实现: 新建 `src/renderer/src/components/shared/token-spark-bar.tsx`。复用 `tokenUsageSegments` + `TOKEN_SEGMENT_COLOR_VAR`; 渲染 `{formatNumber(totalTokens)} tok` + 紧凑分段 bar (段宽=percentage, 段色=segmentColor, unknown 半透明); `title`/`aria-label` 含 `Input N / Output M / …`; `!hasBreakdown` 或 `totalTokens===0` 仅数字无 bar。不改 `TokenUsageDisplay`。
  - tests: `tests/renderer/token-spark-bar.test.tsx` (新) — 总量文本; segments 段数与 width style; 段色 style; 空 usage 仅数字无 bar; aria-label 含 Input/Output。先写测试再实现。命令 `pnpm test -- token-spark-bar`。
  - verify: 单测绿; (verify 阶段) Electron 实测 bar 段色对应 token 类别且暗/亮主题自适应。

- [x] 任务 2: `AssetCountChip` 组件 (skills/mcp 计数) — AC4, AC5, AC1  ✅ 4 测试通过
  - 实现: 新建 `src/renderer/src/components/shared/asset-count-chip.tsx`。props `{icon, iconClassName, count, names[], label, max=3}`; `count===0` 返回 `null`; HeroUI `Chip` (tone neutral/flat/sm, `startContent`=icon, children=count); `aria-label`+`title`=`${label}: ${names.slice(0,max).join(', ')}` + 溢出 `+K`。
  - tests: `tests/renderer/asset-count-chip.test.tsx` (新) — count 显示; count=0 返回 null; aria-label 含 names; names>max 显示 `+K`; startContent icon 在 DOM。先写测试再实现。命令 `pnpm test -- asset-count-chip`。
  - verify: 单测绿; chip 图标语义 (Sparkles 蓝/Plug 绿) 与详情页一致。

- [x] 任务 3: `SessionRow` 单行重构 + 集成新组件 — AC1, AC2, AC3, AC7, AC8, AC9, AC10, AC12  ✅ sessions-pages 27 测试通过 (含新增行为 + Codex 分支)
  - 实现: 改 `src/renderer/src/pages/sessions.tsx`。单行布局 (左 flex-1 title+时间·时长, 右 shrink-0: agent Chip[all 视图] + skills AssetCountChip + mcp AssetCountChip + cost[非 null] + TokenSparkBar + model Chip[tone primary])。移除手写 agent badge / model chip span。`<button>` 与 `session-row-{id}` testid、首尾圆角逻辑保留。`defaultItemHeight` 72→56。
  - tests: 扩展 `tests/renderer/sessions-pages.test.tsx` — skills chip(1)+aria 含 `frontend-design`; mcp chip(1)+aria 含 `plugin_playwright_playwright`; cost null 不渲染 cost; token `38 tok` 保留 + bar 存在; agent chip `Claude`(默认 all); model 文本保留; 更新旧 `I 10 / O 5` 断言为新 TokenSparkBar 形式 (aria/title); 虚拟列表/jump-nav/圆角/筛选/空态断言保持绿。命令 `pnpm test -- sessions-pages`。
  - verify: 界面质量 — 标题不被右侧元数据挤断 (Electron); hover 背景 + focus-visible ring; Tab+Enter 打开详情; `max-md` 时长隐藏、右侧不溢出; 每屏可见会话数较旧版增加。

- [x] 任务 4: i18n 文案 (en/zh) — AC3  ✅ 复用现有 sessions.skillsUsed/mcpConnected key, 无新增; zh/en 由 sessions-pages 测试覆盖
  - 实现: `src/renderer/src/i18n/locales/{en,zh}.json` 新增 AssetCountChip aria/label 文案 key (skills/mcp 计数描述); 复用现有 `sessions.skillsUsed`/`sessions.mcpConnected`。
  - tests: `sessions-pages.test.tsx` 现有 zh 路径断言扩展 (chip aria 中文); 命令 `pnpm test -- sessions-pages`。
  - verify: zh/en 切换 chip aria 与明细文案正确; 无硬编码英文。

- [x] 任务 6: 分组头 + 行容器视觉重设计 (用户反馈多轮迭代) — 追加  ✅ sessions-pages 27 + Electron 实测四态
  - 背景: 原圆角卡片分组头在 `GroupedVirtuoso` sticky 吸顶时, 顶部圆角透明缺口被下方直角行透出 (穿透), 视觉不连贯。经多轮用户视觉裁定 (扁平灰条 → 否决; 方角卡片 → 否决) 收敛为「安静 section label + 无卡片边框」方向, 再叠加四处微调定稿。
  - 分组头: 去整组卡片边框 (border-x/t), 改 `bg-background` 不透明 section bar + 底部 hairline; 标签改 `text-[11px] font-semibold uppercase tracking-wide text-muted-foreground` (小号大写字距打开柔和灰)。无圆角 → 无穿透。
  - 微调① sticky 偏移: gutter 写进分组头**自身 top padding** (`pt-6`) 而非 margin / 容器 padding —— 吸顶时头自身不透明 bg 覆盖 gutter 带。virtuoso 行为绝对定位, 容器 padding 留出的透明 gap 会被行穿透 (已实测: app-layout 全局 gutter 方案与 sticky-top override 均穿透, 已回退); 唯有头自身 padding 可靠遮挡。flow 与 stuck 偏移一致。
  - 微调② 右侧元数据定宽列: agent/skills/mcp/cost/token/model 各 `w-N` cell + `justify-end`, 跨行纵向成列, 支持连续竖扫; 缺省项仍占位保持对齐。
  - 微调③ 模型标签 `tone` primary(蓝) → neutral(灰), 不再抢视觉。
  - 微调④ 行无边框 + 圆角 hover: 去 border-x/b + rounded-b-lg, 无分割线; hover 复用 HeroUI listbox-item token (`rounded-medium` + `bg-default-100`) 做内缩 (`px-2` wrapper) 圆角高亮, 不自绘。未直接用 `Listbox` 组件: 它不虚拟化, 会让全部会话全量渲染牺牲 windowing, 故只复用视觉 token。
  - tests: `sessions-pages` 改写圆角/边框断言 → 行断言无 border-x/b/rounded-b-lg、有 rounded-medium + hover:bg-default-100; 头断言 pt-6 + bg-background + 无 rounded-t-lg/border-x。`pnpm test -- sessions-pages` 27 绿。
  - verify: Electron 实测 light/dark × 静止/吸顶/hover; 吸顶 gutter 保留且无行穿透; 右列对齐; 模型灰; 圆角 hover。`app-layout.tsx` 改动已回退 (净零)。

- [x] 任务 5: 全门禁 + 视觉验收 (verify 阶段主体) — AC13, AC14  ✅ 全套 686 测试 + CI 全绿 (lint/typecheck/test/harness:check/build/e2e on ubuntu+windows) + Electron 实测四态
  - tests: `pnpm typecheck` + `pnpm lint` + `pnpm test` 全绿; 远端 CI#27053331568 completed/success。
  - verify: Electron 实测 light + dark × 静止/吸顶/hover; 逐条核对 AC1–AC12 + 任务 6 (分组头吸顶保留 gutter 无穿透 / 右列对齐 / 圆角 hover / 模型灰)。
  - accent 主题验收 = **N/A (例外理由)**: 重设计后的行/分组头元素全部走 neutral/muted/chart token, 不使用 `--primary`/`--accent`; accent 主题切换不影响这些元素 (仅影响未改动的侧栏/分组切换 toggle/focus ring)。light/dark (会改变 surface) 已实测。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
