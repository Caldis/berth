# 需求分析 (Explore 产物)

> 2026-06-12。来源: 00-PRD.md (issue engine-shared-core-package)。用户重构链 ①。

## 现状理解

### 分层倒置实证 (全部 2026-06-12 代码核实)
- `packages/berth-scan-engine/src/engine-bridge.ts:9-12`: `../../../src` 反向 import ×4 (scanner + shared types/asset + types/ipc + scope), 文件头自认 "P1.3 hybrid 临时态, P2 物理迁移"。
- **typecheck 盲区比 issue 记述更严重**: 包 `tsconfig.json` exclude 自曝 — `src/cli.ts`、`src/cli-bin.ts`、`src/engine-bridge.ts` 因反向 import 无法在包内独立 typecheck 被整体排除, comment 自认 "typechecked at the repo"——但 root 三段 tsconfig (node/web/test) include 均不含 `packages/**`, 即**这三个文件在任何地方都零 typecheck** (CI 的 `--filter @berth/scan-engine typecheck` 只查未被 exclude 的 index/capabilities/cli-args)。成包后 exclude 清空 = 盲区根治判据。
- 本地门禁缺口: root `pnpm typecheck`/`pnpm test`/vitest include (`tests/**`) 均不含包; CI 有 `--filter` build/test/typecheck 三步, 但本地改 src 打断 CLI 只能等远端红。
- `tsup.config.ts` 经 esbuild alias `@shared → ../../src/shared` 把仓内 shared 打进 bundle (包产物自包含, 但源码层依赖仓内)。
- 反向依赖确认: `src/` 与 `website/` 零 import `@berth/scan-engine` — 主应用不依赖包。

### engine 可成包性 (关键事实)
- **engine 零 electron import** (27 文件全量 grep): 三方仅 chokidar/glob/js-yaml/minisearch/smol-toml + node 内置 (fs/os/path/worker_threads); better-sqlite3 为注入式 (main/index.ts 传 `(file) => new Database(file)`), 包不触原生模块。
- ARCHITECTURE 既有约束印证: electron 值 import 白名单仅 index/dev-instance/devtools/ipc — engine/adapters 本就被禁用 electron。

### 真实迁移闭包 = 53 文件 (issue "30 文件"系 GH-115 时低估, 未计 adapters 全量)
传递闭包 (符号级 import 追踪):
| 块 | 文件数 | 对外依赖 |
|---|---|---|
| `engine/**` | 27 | adapters ×8 入口、agent-plugins/adapter-registry、4 中立件、@shared ×10、三方 |
| `adapters/**` (claude-code/codex/_shared) | 21 | agent-homes、project-config-roots、`engine/assets/file-cache` (反向, 同包后合法)、@shared、三方 |
| `agent-plugins/adapter-registry.ts` | 1 | adapters、engine/assets/file-cache |
| 根级中立件: log / agent-homes / project-config-roots / project-scope | 4 | 全叶子 (fs/os/path; project-scope 仅 @shared/types/asset) |
- agent-plugins 其余 3 文件 (descriptors/manifest/registry, 能力插件 UI 域) **留 main**: descriptors.ts 消费 adapters 描述符 → 迁移后方向为 main→包, 正向 ✓。
- `shared/**` 12 文件被 main/renderer/preload/CLI 四方消费 — 去向是 design 主决策 (见未决 Q1)。

## 关联与依赖

### 消费面与触点 (改写量实测)
- **main 内仅 6 文件 17 行 import**: index.ts ×4、ipc/handlers.ts ×4 (另 1 行指 main 内 project-scope-runtime)、project-scope-runtime.ts ×2、memory ×2、agent-teams ×1、agent-plugins/descriptors.ts ×3。project-scope-runtime.ts 是消费者留 main (R33 "归位"届时一并看)。
- **tests: 40 文件 ~50 行** 指向闭包 (机械改写或 vitest alias 兼容)。
- **配置触点**: electron.vite.config.ts (main input `asset-worker: src/main/engine/assets/worker.ts` + @shared alias); vitest.config.ts (@shared alias + coverage include `src/**`); 四个 tsconfig 的 paths/include; tsup alias; eslint **已覆盖 packages** (ignores 不含, 无需动); CI 已有包门禁三步 (无需新增, 可考虑本地 prepush 串包)。
- website 零引用。e2e 跑 out/ 产物, 不受源码路径影响 (worker 产物名由 input key 决定, 不变)。

### 机制先例 (无需联网查证, 仓内已实证)
- 源码 alias 进 bundle: electron.vite main 段 @shared alias 指 `src/shared` 即同机制 — 把 `@berth/scan-engine` alias 指包源码目录是同一能力的同一用法。
- externalizeDepsPlugin exclude: GH-119 preload 段已实证 (打 @electron-toolkit/preload 进 bundle)。
- 等价钉测红绿网: `tests/unit/asset-sources-equivalence.test.ts` (GH-115 T9 预铺, issue 明示"可作迁移红绿网")。

### 上下游
- 上游已收口: adapter-parsing-shared-core RESOLVED (纯逻辑内聚); GH-115 T8 (依赖环已解)/T9 (sources 表+钉测)/T10 (session 域离开 ipc)。
- 下游: 链 ② asset-runtime-collaborators-split 在包内做 (本任务为其安全前置); 链 ③ indexer 主线。
- 同窗风险: GH-120 verify 收尾中 (仅余主观裁判+归档), 代码已全推; 工作区他人未提交文件仅 AGENTS.md/.agents (非代码), 物理迁移冲突风险已解除。
- memory splitFrontmatter ×2 收敛 (PRD 残项): characterization 已钉 (tests/unit/memory-frontmatter-characterization.test.ts); 收敛方向 = memory 消费包导出的 markdown 工具 (方向 main→包 正向)。属"成包后顺势"项, design 决定纳入与否。

## 任务分类与 debt 校准

- type / maintenance.subtype: maintenance / architecture — 维持。
- source.kind / refs: docs-issues — 维持。
- debt estimate 修正: 数值维持 incurred 2 / repaid 6 / net -4 (闭包 53 > 估 30, 但消费面改写实测小: main 17 行 + tests ~50 行 + 配置 ~6 处)。
- scope / risk / areas / confidence: global / high / [architecture] 维持; **confidence low→medium** (闭包/消费面/构建触点全部实测, 机制全部有仓内先例)。
- revision: 已追加 INDEX `debt.revisions[]`。

## 验收标准

1. **AC-1 物理迁移完成**: engine 27 + adapters 21 + adapter-registry + 4 中立件物理位于 `packages/berth-scan-engine/src/**`; `src/main/engine`、`src/main/adapters` 目录消失, src/main 内零残留。
2. **AC-2 反向依赖归零**: `packages/**` 源码零 `../../../src`、零仓内 src 相对引用; shared 引用按 design 决议机制解析且被 typecheck 覆盖。
3. **AC-3 typecheck 盲区根治**: 包 tsconfig exclude 中 cli.ts/cli-bin.ts/engine-bridge.ts 三项清空 (engine-bridge 迁移后或改写为包内 import); root 本地门禁链 (typecheck 或 prepush) 含包 typecheck。
4. **AC-4 行为零变更**: asset-sources-equivalence 等价钉测绿; 全量 unit 双轮绿; e2e 全量绿 (win32 宿主隔离已知项除外); 包自测 (--filter test, 含 CLI E2E golden) 绿。
5. **AC-5 构建链健康**: `pnpm build` (electron-vite, 含 worker 入口) 绿; `--filter @berth/scan-engine build` (tsup) 绿; e2e (消费 out/ 产物) 即打包冒烟。
6. **AC-6 消费面正向**: src/main 内零 `./engine|../engine|../adapters|./agent-homes` 等闭包旧路径 import, 全部经包入口; 方向恒 main→包。
7. **AC-7 文档对齐**: docs/ARCHITECTURE.md 模块表、目录行、白名单措辞随迁移更新。
8. **AC-8 门禁**: typecheck / lint / test / e2e / CI (含包三步) 全绿。

## 界面质量与交互验收

不适用 (纯主进程/包结构重构, 零 UI 改动, 行为零变更由 AC-4 钉死)。

## 未决问题

- **Q1 shared 去向** (design 自决, 两选项已盘清):
  - A1 物理进包 (`packages/.../src/shared`): 彻底正向; import 语句零改 (@shared alias 改指包内即可), 改 tsconfig×3/vitest/electron.vite/tsup ~6 处配置; 需核 coverage include、tailwind content、preload index.d.ts 等边角。
  - A2 留 `src/shared`: 配置零改, 但包源码仍依赖仓内 shared (倒置残留一半, 靠 tsup bundle 兜自包含)。
- **Q2 包内目录结构**: `src/{engine,adapters,shared?,...}` 平移保持相对关系 (git mv 整目录, 包内 ../ 关系自动成立) vs 重组 — 倾向平移最小惊动。
- **Q3 main 消费 import 形态**: 深路径 (`@berth/scan-engine/engine/assets/runtime`, 源码 alias) vs 桶导出收口 — 倾向深路径 alias 最小改写 (17 行), 桶导出留链 ②。
- **Q4 本地门禁串包形态**: root typecheck 脚本串 `--filter typecheck` vs prepush 加步 — design 定。

## 旁支发现 (不入本任务范围)

- CLI `dist/` 产物与 `node_modules/.vite` 缓存目录形态未核 (git 跟踪与否); 若 dist 入库属仓库卫生项, 届时单看。
- `shell:openPath` 通道名语义错位已在 GH-119 记录, 不混入。
