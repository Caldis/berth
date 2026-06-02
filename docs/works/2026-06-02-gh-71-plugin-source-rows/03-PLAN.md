# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 先补 Settings 插件来源行的 renderer 测试。
  - tests: `pnpm vitest run tests/renderer/settings-agent-plugins.test.tsx` (fail before implementation: missing source rows and empty source state)
  - verify: collapsed 不显示来源路径; expanded Sources 显示具体来源字段; 空 sources 有紧凑空态。
- [x] 任务 2: 实现 expanded Sources 具体来源行和 i18n 文案。
  - tests: `pnpm vitest run tests/renderer/settings-agent-plugins.test.tsx` (pass, 10 tests); `pnpm typecheck:web` (pass)
  - verify: 来源行使用紧凑列表, 长路径 truncate/title, 不新增默认噪声; dev UI screenshot `%TEMP%\berth-gh71-plugin-source-rows-fallback-cdp.png` confirmed candidate source labels are localized and raw source code is hidden.
- [ ] 任务 3: 跑 harness 检查、prepush、推送并等待 CI。
  - tests: `pnpm harness:check`; `pnpm harness:prepush`
  - verify: push 前检查 CI baseline; push 后等待本 SHA 的 GitHub Actions run。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
