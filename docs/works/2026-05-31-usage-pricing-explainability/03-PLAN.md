# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [ ] 任务 1: shared UsageSummary 归一化层
  - 新增 `src/shared/usage-summary.ts`。
  - 移除 `Usage` 页内重复 normalization。
  - 验证: `pnpm test -- tests/unit/usage-summary-normalizer.test.ts tests/renderer/sessions-pages.test.tsx`, `pnpm typecheck:web`。
- [ ] 任务 2: cost mode 与 cost explanation 主进程契约
  - 扩展 shared 类型、pricing estimate、catalog metadata、usage 聚合和 IPC/preload。
  - 验证: `pnpm test -- tests/unit/pricing.test.ts tests/unit/usage-summary.test.ts`, `pnpm typecheck:node`。
- [ ] 任务 3: Usage 页面解释区、cost mode 控件和 pricing gap 操作提示
  - 修改 `Usage` 页面和 en/zh i18n。
  - 验证: `pnpm test -- tests/renderer/sessions-pages.test.tsx`, `pnpm typecheck:web`。
- [ ] 任务 4: token 结构分析展示
  - 在 shared token helper 增加结构段派生函数。
  - Usage 页面显示 input/output/cache/reasoning/unknown 结构。
  - 验证: `pnpm test -- tests/unit/token-usage.test.ts tests/renderer/sessions-pages.test.tsx`。
- [ ] 任务 5: Usage 页面错误边界和 IPC 错误态
  - 新增 route-level `PageErrorBoundary`。
  - Usage IPC reject 时显示错误态并可重试。
  - 验证: `pnpm test -- tests/renderer/page-error-boundary.test.tsx tests/renderer/sessions-pages.test.tsx`。
- [ ] 任务 6: 总验证
  - `pnpm harness:check`
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm build`
  - 可选: `pnpm test:e2e -- tests/e2e/app.e2e.ts -g "can navigate to usage"`。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
