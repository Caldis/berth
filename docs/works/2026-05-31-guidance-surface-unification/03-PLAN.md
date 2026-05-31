# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 建共享提示组件。
  - 新增 `FeatureGuidePanel`。
  - 扩展 `EmptyState`。
  - 新增 `NoticePanel`, 并让 `WarningBanner` 可继续兼容。
  - 验证: `pnpm test -- tests/renderer/feature-guide-panel.test.tsx tests/renderer/shared-guidance-primitives.test.tsx`。

- [x] 任务 2: 建统一 guide 数据层。
  - 新增或迁移 `feature-guidance.ts`。
  - 迁移现有 instructions / capabilities guide 定义。
  - 新增 memories / sessions guide 定义。
  - 验证: `pnpm test -- tests/renderer/feature-guidance.test.ts`。

- [x] 任务 3: 补全 Instructions / Memories。
  - memories tab 渲染统一功能说明。
  - conventions guide key 从 memories 命名拆出。
  - `MemoryView` 空态改用扩展后的 `EmptyState`, 文案进入 i18n。
  - 验证: `pnpm test -- tests/renderer/instructions-guidance.test.tsx`。

- [x] 任务 4: 合并 Capabilities / Hooks 重复说明。
  - 外层 guide 承接 hooks 概念说明和三张 insight。
  - `HooksLifecycleView` 保留控制区、开关、健康摘要、生命周期和对比内容。
  - 验证: `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx tests/renderer/capabilities-guidance.test.tsx tests/renderer/feature-guide-panel.test.tsx tests/renderer/feature-guidance.test.ts`。

- [x] 任务 5: 合并 Capabilities / Status Line 重复说明。
  - 外层 guide 承接 Claude / Codex 模型说明。
  - `StatusLineIntro` 删除或内联消解为 guide insight。
  - `StatusLineSection` 保留 summary、default footer、cards、diagnostics。
  - 验证: `pnpm test -- tests/renderer/status-line-section.test.tsx tests/renderer/capabilities-guidance.test.tsx tests/renderer/feature-guide-panel.test.tsx tests/renderer/feature-guidance.test.ts`。

- [x] 任务 6: 补全 Sessions。
  - sessions 列表页新增统一功能说明。
  - sessions 空态改成标题 + 说明。
  - session detail 只补 section 空态说明, 不加大 guide。
  - 验证: `pnpm test -- tests/renderer/sessions-pages.test.tsx`。

- [x] 任务 7: 统一剩余提示风格。
  - Usage 的刷新失败、价格缺口迁移到 `NoticePanel`。
  - Settings 本地来源空态迁移到共享 `EmptyState`。
  - 验证: `pnpm test -- tests/renderer/settings-sources.test.tsx`, `pnpm test -- tests/renderer/sessions-pages.test.tsx`, `pnpm typecheck:web`。

- [x] 任务 8: 收口验证。
  - `pnpm test -- tests/renderer/feature-guide-panel.test.tsx tests/renderer/feature-guidance.test.ts tests/renderer/hooks-lifecycle-view.test.tsx tests/renderer/status-line-section.test.tsx tests/renderer/sessions-pages.test.tsx`
  - `pnpm typecheck:web`
  - `pnpm harness:check`
  - 根据改动范围补 `pnpm test`、`pnpm typecheck`、`pnpm build`。
  - 更新 `INDEX.md` 到 verify。

## verify 回写

2026-05-31:
- `pnpm test -- tests/renderer/feature-guide-panel.test.tsx tests/renderer/feature-guidance.test.ts tests/renderer/hooks-lifecycle-view.test.tsx tests/renderer/status-line-section.test.tsx tests/renderer/sessions-pages.test.tsx tests/renderer/instructions-guidance.test.tsx tests/renderer/capabilities-guidance.test.tsx tests/renderer/shared-guidance-primitives.test.tsx tests/renderer/settings-sources.test.tsx`: 9 files / 52 tests passed。
- `pnpm lint`: passed。
- `pnpm typecheck`: passed。
- `pnpm test`: 48 files / 293 tests passed。Recharts 在 jsdom 中输出 0 尺寸 warning, 测试通过。
- `pnpm harness:check`: passed。
- 真实应用验收: `pnpm dev:agent guard before --id guidance-surface-verify --json`; `pnpm dev:agent start --id guidance-surface-verify --json` 启动成功, agent Electron 主进程 PID 354400。真实窗口截图确认应用可打开; 另用同一 agent dev server + mocked preload 检查 Sessions、Instructions / Memory、Capabilities / Hooks、Capabilities / Status Line、Usage 页面, 未见页面错误、明显重叠或文字溢出。`pnpm dev:agent stop guidance-surface-verify --json` 已停止本轮实例; `pnpm dev:agent guard after --id guidance-surface-verify --json` 通过, protected 用户 dev PID 204932 / 322572 未退出。

verify 不通过项作为新任务追加于此, phase 退回 implement。
