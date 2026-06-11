# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。**全程顺序执行** (全局迁移类: 同批文件互引密集, B2 依赖 B1 alias 就位, B3 依赖 B1+B2 物理就位)。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [ ] B1 shared 进包 (AC-1 部分 / AC-2 前置)
  - 内容: `git mv src/shared packages/berth-scan-engine/src/shared`; alias/include 改指 5 处 (tsconfig.node paths+include、tsconfig.web paths+include、tsconfig.test paths、vitest alias、electron.vite main+renderer @shared); preload index.ts 2 行相对 `../shared/*` → `@shared/*` + electron.vite preload 段补 resolve.alias; 包 tsup alias `../../src/shared` → `./src/shared`; 包 tsconfig 补 paths `@shared/*`。
  - tests: not needed - 纯说明符/alias 改向零行为变更; 证据 = `pnpm typecheck` + `pnpm test` 全量绿 + `pnpm --filter @berth/scan-engine build` 绿。
  - verify: 门禁三绿 + git diff 确认 shared 12 文件纯 rename; 非 UI 不适用界面验收。

- [ ] B2 内核 53 文件平移 + 消费面改写 (AC-1/5/6 主体)
  - 内容: `git mv` src/main/{engine,adapters} + agent-plugins/adapter-registry.ts + {log,agent-homes,project-config-roots,project-scope}.ts → packages/berth-scan-engine/src/ (保持相对结构, 闭包内零行修改); main 6 文件 17 行 + tests 40 文件 ~50 行 import → `@berth/scan-engine/<path>`; electron.vite main 段增 `@berth/scan-engine` alias + worker input 改包路径; vitest 增 alias + coverage include; tsconfig.node paths 增 + include 增 `packages/berth-scan-engine/src/**/*`。
  - tests: not needed - 纯平移+说明符改写; 证据 = 等价钉测 + `pnpm test` 全量双轮 + `pnpm build` + `pnpm test:e2e` (win32 已知项口径同 GH-119) + typecheck (首次纳管包源码)。
  - verify: AC-1 (src/main 内闭包目录消失) + AC-6 (grep 零旧路径 import) + 门禁全绿; 非 UI 不适用。

- [ ] B3 CLI 归位 + 盲区根治 (AC-2/3)
  - 内容: engine-bridge.ts `../../../src/*` ×4 → 包内 `./engine/scanner` + `@shared/*`; 包 tsconfig exclude 清空 cli.ts/cli-bin.ts/engine-bridge.ts 三项; `pnpm --filter @berth/scan-engine build && test && typecheck` 三绿。
  - tests: not needed - CLI E2E golden 网既有 (fixtures 快照); exclude 清空后 typecheck 首次全覆盖三文件即 AC-3 证据。
  - verify: AC-2 (packages/** 零 `../../../src` — grep 实证) + AC-3 (exclude 清空 + root `pnpm typecheck` 含包) + 包三命令绿; 非 UI 不适用。

- [ ] B4 文档对齐 + 收口 (AC-7/8)
  - 内容: docs/ARCHITECTURE.md — engine/adapters/中立件目录行迁移至 packages 段、模块表路径、"electron 值 import 白名单"措辞核对 (白名单文件未动, 路径表述更新); 源 issue (engine-shared-core-package) 补进展 (splitFrontmatter 等余项明确留存); 全量门禁末轮 + prepush + push + ci:wait。
  - tests: not needed - 文档与流程收口; 证据 = `pnpm harness:check` + 全量门禁 + CI conclusion=success。
  - verify: AC-7/AC-8 + verify 阶段逐条核对 AC-1~8; 非 UI 不适用。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
