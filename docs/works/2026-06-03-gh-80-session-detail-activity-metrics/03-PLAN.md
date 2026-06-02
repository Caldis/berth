# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [ ] 任务 1: 补齐 session activity metric 数据契约和 parser 单测
  - tests: 先新增/调整 `tests/unit/session-meta-parser.test.ts`, `tests/unit/codex-session-parser.test.ts`, 让 token rate usage window、Codex MCP/skill/hook 识别缺口可复现。
  - verify: 非 UI; 红测应证明 file-history/hook summary 不参与 token rate duration, Codex meta 不再固定空 assets。
- [ ] 任务 2: 实现 main parser 和 `sessions:get` activityMetrics
  - tests: `pnpm vitest run tests/unit/session-meta-parser.test.ts tests/unit/codex-session-parser.test.ts`; 必要时补 `tests/renderer/sessions-pages.test.tsx` mock 数据契约。
  - verify: 非 UI; `SessionDetailResult.activityMetrics` 可由 usage events 计算; Codex MCP/skill/hook counts 写入 session meta; Claude 旧行为不退化。
- [ ] 任务 3: 更新 Session Detail UI 使用 activityMetrics 并补 i18n
  - tests: `pnpm vitest run tests/renderer/sessions-pages.test.tsx`; `pnpm typecheck:web`。
  - verify: 界面质量与交互验收项: 不新增平铺说明; token rate 继续在 Session signals 内; reliable 显示 `tok/min + Usage events`, unreliable 显示 `— + Not enough timing data`; tab roles/empty states 不退化。
- [ ] 任务 4: 回归检查与阶段收口
  - tests: `pnpm typecheck`; `pnpm test`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`。
  - verify: 任务计划中的测试证据完整; Electron 实测 Session Detail Overview, 确认 token rate 文案和 loaded assets 不挤压布局; 进入 verify 阶段。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
