# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 补齐 session activity metric 数据契约和 parser 单测
  - tests: `pnpm vitest run tests/unit/session-meta-parser.test.ts tests/unit/codex-session-parser.test.ts` 先红后绿; 目标红测失败在 `usageStartedAt` 未写入。
  - verify: 非 UI; Claude 测试覆盖 file-history/hook summary 不参与 usage duration, Codex 测试覆盖 MCP/skill/hook 结构化提取和不扫描 tool output 文本。
- [x] 任务 2: 实现 main parser 和 `sessions:get` activityMetrics
  - tests: `pnpm vitest run tests/unit/session-meta-parser.test.ts tests/unit/codex-session-parser.test.ts tests/renderer/sessions-pages.test.tsx`; `pnpm typecheck:node`。
  - verify: 非 UI; `SessionDetailResult.activityMetrics` 由 usage events 计算; Codex MCP/skill/hook counts 写入 session meta; Claude 旧 meta hook fallback 仅保留给 Claude Code。
- [x] 任务 3: 更新 Session Detail UI 使用 activityMetrics 并补 i18n
  - tests: `pnpm vitest run tests/renderer/sessions-pages.test.tsx`; `pnpm typecheck:web`。
  - verify: 界面质量与交互验收项: 没有新增平铺说明; token rate 继续在 Session signals 内; reliable 显示 `19 tok/min + Usage events`, unreliable 显示 `— + Not enough timing data`; tab roles/empty states 未退化。
- [x] 任务 4: 回归检查与阶段收口
  - tests: `pnpm typecheck`; `pnpm test`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`; CI `505094d` 通过。
  - verify: Electron agent `gh80-session-metrics` 实测 Session Detail Overview; `TOKEN 速率` 显示 `Usage 事件` 来源, 加载资产区域保持在右侧面板内; 截图 `C:/Users/mail/AppData/Local/Temp/berth-gh80-session-detail.png`; dev agent 已停止。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
