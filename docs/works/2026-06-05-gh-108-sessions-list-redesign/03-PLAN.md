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

- [ ] 任务 5: 全门禁 + 视觉验收 (verify 阶段主体) — AC13, AC14
  - 实现: 不新增代码; 收口。
  - tests: `pnpm typecheck` + `pnpm lint` + `pnpm test` 全绿。
  - verify: Electron 实测截图 dark + light + 默认 blue + 1 个非默认 accent; 逐条核对 AC1–AC12; 归档前跑全局 `pnpm harness:check`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
