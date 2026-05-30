# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: shared token contract 与纯函数 helper
  - 修改 `src/shared/types/asset.ts` 与 `src/shared/token-usage.ts`。
  - 验证: 新增/更新 helper 单测, `pnpm test -- tests/unit/usage-summary.test.ts` 至少能编译到新类型。
- [x] 任务 2: Claude / Codex parser 保留 token 明细
  - 修改 `src/main/adapters/claude-code/parsers.ts`、`src/main/adapters/codex/parsers.ts`。
  - 验证: `pnpm test -- tests/unit/session-meta-parser.test.ts tests/unit/codex-session-parser.test.ts`。
- [x] 任务 3: Usage 聚合支持 token 明细、days 过滤和 session fallback
  - 修改 `src/main/engine/usage.ts` 与 `src/main/ipc/handlers.ts`。
  - 验证: `pnpm test -- tests/unit/usage-summary.test.ts`。
- [x] 任务 4: token 展示组件与页面替换
  - 新增 `src/renderer/src/components/shared/token-usage-display.tsx`。
  - 替换 Overview、Sessions、Session Detail、Usage 中的 token 总数显示。
  - 更新 en/zh i18n。
  - 验证: `pnpm test -- tests/renderer/sessions-pages.test.tsx`, `pnpm typecheck:web`。
- [x] 任务 5: pricing catalog 与 cost source 基础模型
  - 增加 pricing 类型和估算 helper, 暂不把估算冒充真实账单。
  - 支持内置 catalog / local override / missing pricing 结果。
  - 验证: `pnpm test -- tests/unit/pricing.test.ts tests/unit/usage-summary.test.ts tests/renderer/sessions-pages.test.tsx`, `pnpm typecheck:node`, `pnpm typecheck:web`。
- [ ] 任务 6: 总门禁与人工视觉检查
  - `pnpm harness:check`
  - `pnpm test`
  - `pnpm typecheck`
  - 若启动 UI, 用实测窗口截图检查 Usage、Sessions、Session Detail 文本不溢出。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
