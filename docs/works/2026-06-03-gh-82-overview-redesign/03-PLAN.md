# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [ ] 任务 1: 添加/更新 Overview renderer 测试, 锁定新信息结构、范围展示、能力入口新路由、loading/empty/unknown cost 状态。
  - tests: `pnpm test tests/renderer/overview-redesign.test.tsx tests/renderer/overview-health-checks.test.tsx tests/renderer/sessions-pages.test.tsx`
  - verify: 测试必须覆盖界面质量项中的布局层级、文案/i18n、loading/empty/focus 可访问名称。
- [ ] 任务 2: 重构 `src/renderer/src/pages/overview.tsx`, 保留现有数据契约和健康检查动作, 实现 hero、能力入口、最近会话、用量摘要、健康待处理面板。
  - tests: 同任务 1; 另跑 `pnpm typecheck:web`
  - verify: 大屏双列、小屏单列; 不依赖旧 `/configuration/*` 路径; 健康检查点击、复制、忽略、证据链接继续可用。
- [ ] 任务 3: 补齐 `overview.*` 中英文文案, 更新受影响 renderer/e2e 测试。
  - tests: 同任务 1; `pnpm test:e2e tests/e2e/app.e2e.ts`
  - verify: 不显示 raw enum; 中文不出现英文 fallback; e2e 默认首页能看到核心区域。
- [ ] 任务 4: 做本地界面验收和提交前检查。
  - tests: `pnpm harness:check`, `pnpm harness:prepush`
  - verify: 用 Electron/CDP 在桌面窗口截图, 检查首屏密度、健康状态、最近会话/用量面板和焦点路径; 截图写 `$env:TEMP`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
