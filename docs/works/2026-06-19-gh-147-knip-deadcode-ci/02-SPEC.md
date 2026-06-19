# 02-SPEC — Design 产物

## knip.json (root, 单项目视角 + paths, **不切 workspaces**)
- `entry`: 8 真实入口 + `scripts/*.mjs` + `tests/**/*.test.{ts,tsx}` + `tests/setup.ts` + scan-engine tests
- `project`: `src/**/*.{ts,tsx}` + `packages/berth-scan-engine/src/**/*.ts` + `scripts/**/*.mjs` + tests
- `paths`: `{ "@/*", "@shared/*", "@berth/scan-engine", "@berth/scan-engine/*" }` (复刻 vite/tsconfig alias → 引擎/renderer 源)
- `ignore`: `**/*.d.ts`, out/dist/build/release/coverage/test-results/playwright-report/website
- 插件: `vite`/`vitest`/`eslint`/`playwright` true; `ignoreExportsUsedInFile: true` (压噪声)
- 备选: 实跑若需分包则退化 workspaces, 但 root workspace `paths` 必须保留 `@berth/scan-engine*` 映射, 否则误报全量。

## package.json scripts
- `knip: "knip"`; `knip:ci: "knip --no-exit-code"` (软门禁, 退出码恒 0)
- devDep `knip` `^5` (只装 root; 装包改 `pnpm-lock.yaml`)

## ci.yml
- `pnpm lint` 后插 `pnpm knip:ci`, `if: matrix.os == 'ubuntu-latest'` (静态分析单平台跑一次)

## 验收 (软门禁)
1. `pnpm install --frozen-lockfile` 成功 (lock 含 knip)
2. `pnpm knip` 跑通打印结构化报告, 不崩不报配置错; **报告非空不算失败**
3. **反向核验 (防误报全量)**: 报告**不得**含被 main/renderer 经 `@berth/scan-engine/...` 实际消费的引擎核心文件 (`engine/scanner.ts`, `adapters/*/parsers` 等); 若被列 unused → `paths` 没生效, 配置失败要修。**区分真死代码报告 vs 零配置全量误报的判据**。
4. `pnpm knip:ci` 退出码 0; CI knip 步骤绿
5. 既有门禁 (lint/typecheck/test/build/e2e) 不受影响

## 文件边界
`knip.json` (新建) + `package.json` + `.github/workflows/ci.yml` + `pnpm-lock.yaml`。**零产品源码**。首次死代码只记录/allowlist (写 `knip.json` 的 ignore, 不动源码)。

## 风险
- 多入口漏配 → 误报全量 (最高危, 验收点3 守)
- lock 与 package.json 须**同 commit** (frozen-lockfile)
- `?asset` png 误报 → 补 `ignore: ["assets/**"]` (实跑微调)
- 软门禁不阻新死代码沉积 (本批折中; 硬门禁 + 死码清理留独立后续)
