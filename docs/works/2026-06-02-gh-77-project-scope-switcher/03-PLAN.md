# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 新增应用级 scope 类型、路径规范化 helper、store 状态
  - tests: `pnpm test tests/unit/scope.test.ts tests/renderer/app-store.test.ts` (8 passed); `pnpm typecheck:web`; `pnpm typecheck:node`
  - verify: 非 UI; `global` / `user` / `project` 三种状态可表达, project scope 会规范化 path/pathKey; 空 project path 回退 global; Windows 路径大小写归一并去重。
- [x] 任务 2: 主进程生成项目候选, sessions/usage 接受精确 project path
  - tests: `pnpm test tests/unit/project-scope.test.ts tests/unit/usage-summary.test.ts tests/unit/engine-scanner.test.ts` (21 passed); `pnpm typecheck:node`; `pnpm typecheck:web`
  - verify: 非 UI; `projectScopeCandidatesFromAssets()` 从当前 projectDir 与历史 session 合并候选并去重; `sessions:list` / `usage:summary` 接受 `projectPath`, 精确匹配规范化路径, 不使用模糊项目名。
- [ ] 任务 3: 侧边栏增加 Project Scope Switcher
  - tests: `pnpm test src/renderer/src/components/layout/project-scope-switcher.test.tsx`
  - verify: UI; expanded/collapsed sidebar 都有入口; 与 Agent selector 区分; 弹层有 global/user/project 分组、长路径截断、loading/empty/error/focus 状态。
- [ ] 任务 4: Overview / Sessions / Usage 消费应用级 scope
  - tests: `pnpm test <overview/session/usage-page-tests>`; `pnpm test:e2e tests/e2e/project-scope.e2e.ts`
  - verify: UI; 切换 project 后 recent sessions、sessions list、usage summary 同步变化; 切回 global 恢复全量。
- [ ] 任务 5: Instructions / Capabilities 在应用级 scope 下过滤资产
  - tests: `pnpm test <instructions/capabilities-page-tests>`
  - verify: UI; project scope 下展示匹配项目资产和有效 user/enterprise 基础层级; 页面内 asset scope filter 不与应用 scope 冲突。
- [ ] 任务 6: 切换 project scope 后处理扫描刷新与过期状态
  - tests: `pnpm test <scanner-or-hook-test>`
  - verify: 非 UI + UI; 不保留上一项目过期结果; 若本轮只做到现有资产过滤, 必须在 issue/plan 中保留 scanner 重建任务, 不标为完成。
- [ ] 任务 7: 视觉和交互验收
  - tests: `pnpm build`; `pnpm test:e2e tests/e2e/project-scope.e2e.ts`
  - verify: UI; 用 `pnpm dev:agent` 打开真实 Electron, `print-window` 截图 expanded/collapsed 状态, 检查黑白工具壳、信息密度、键盘路径、窗口控制区不重叠。
- [ ] 任务 8: harness verify / archive
  - tests: `pnpm harness:check --work docs/works/2026-06-02-gh-77-project-scope-switcher`; `node scripts/harness-projects.mjs check --strict`; `pnpm harness:prepush`
  - verify: 非 UI; 所有实现测试和 UI 验收通过后, `harness-projects done`, 移动到 `_archive`, 推送并等待 CI。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
