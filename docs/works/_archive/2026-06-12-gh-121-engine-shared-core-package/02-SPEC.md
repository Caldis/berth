# 技术方案 (Design 产物)

> 2026-06-12。基于 01-ANALYSIS。Q1-Q4 全部依实测事实自决 (无 PRD 歧义): Q1→A1 shared 物理进包; Q2→平移保持相对结构; Q3→深路径 + 源码 alias; Q4→root tsconfig 纳管包源码。

## 数据契约

**运行时行为零变更** (AC-4): 纯物理迁移 + import 说明符改写; IPC/快照/扫描语义一字不动。等价钉测 asset-sources-equivalence + 全量 1016 unit + e2e + CLI E2E golden 为回归网。

**包内目录契约** (Q2, 平移保持 src/main 内相对结构 → 闭包内全部相对 import 零行修改):
```
packages/berth-scan-engine/src/
  engine/**            (27, 原 src/main/engine)
  adapters/**          (21, 原 src/main/adapters)
  agent-plugins/adapter-registry.ts  (1, 保持子目录深度)
  log.ts · agent-homes.ts · project-config-roots.ts · project-scope.ts  (4 中立件)
  shared/**            (12, 原 src/shared — Q1=A1 彻底正向, 唯一非 main 平移块)
  engine-bridge.ts · cli*.ts · capabilities.ts · index.ts  (CLI 既有)
```
- 平移成立依据: 闭包内相对引用只存在于原 src/main 兄弟之间 (engine↔adapters↔agent-plugins/↔中立件), 整体平移后相对深度不变; shared 全部经 @shared 说明符 (零相对), 物理位置任意。

**import 说明符契约** (Q3):
- main 消费面 17 行 → `@berth/scan-engine/<原 main 内路径>` (如 `@berth/scan-engine/engine/assets/runtime`); tests ~50 行同形。
- `@shared/*` 说明符全仓保留, alias 目标改指 `packages/berth-scan-engine/src/shared/*`。
- preload 仅有的 2 行相对 `../shared/*` (index.ts:3-4) 改 `@shared/*` (preload 段补 alias)。
- 包内部 (engine-bridge): `../../../src/main/engine/scanner` → `./engine/scanner`; shared 类型 → `@shared/*` (tsup alias 改指包内 `./src/shared`)。

**解析配置契约** (每处均为既有机制改指向, 仓内先例):
| 配置 | 改动 |
|---|---|
| electron.vite main 段 | alias 增 `'@berth/scan-engine' → packages/berth-scan-engine/src`; `@shared` 改指包内 shared; worker input → `packages/berth-scan-engine/src/engine/assets/worker.ts` (输出名 asset-worker.js 由 input key 决定不变, worker-host 按 `__dirname/asset-worker.js` 定位 — 实测 worker-host.ts:152) |
| electron.vite preload 段 | 增 resolve.alias `@shared` (支撑 preload 2 行改写) |
| electron.vite renderer 段 | `@shared` 改指包内 |
| tsconfig.node.json | paths 增 `@berth/scan-engine/*`、`@shared/*` 改指; include 增 `packages/berth-scan-engine/src/**/*` (← **Q4: root typecheck 直接纳管包全部源码, 含 CLI 三文件, 盲区根治**), `src/shared` include 行随迁移移除 |
| tsconfig.web.json / tsconfig.test.json | `@shared/*` paths 改指; web include 的 `src/shared/**` 改包内 shared 路径 |
| vitest.config.ts | `@shared` alias 改指 + 增 `@berth/scan-engine` alias; coverage include 增 `packages/berth-scan-engine/src/**` |
| 包 tsconfig.json | **exclude 清空 cli.ts/cli-bin.ts/engine-bridge.ts 三项** (AC-3 判据); compilerOptions 增 paths `@shared/*` → `./src/shared/*` |
| 包 tsup.config.ts | `@shared` alias 由 `../../src/shared` 改 `./src/shared` (包自包含, 反向依赖归零) |
| 不动 | eslint (已覆盖 packages); CI (已有 --filter 三步); package.json (无新依赖 — 源码 alias 非 node 解析); pnpm-workspace |

**留 main 的边界** (方向恒 main→包): ipc/、index.ts、dev-instance/devtools、memory/ (消费 agent-homes 改包说明符)、agent-teams、agent-plugins 余 3 件 (descriptors.ts 消费包内 adapters descriptors)、project-scope-runtime.ts (消费者, R33 归位不混入)、url-guard、preload、renderer。

**明确不做** (聚焦物理迁移): memory splitFrontmatter ×2 收敛 (issue 残项保留, characterization 已钉, 成包后单独小批); 桶导出收口与 exports 子路径发布形态 (链 ② 一并); pricing/convert.ts 孤儿处置 (GH-115 孤儿清单既有记录)。

## 任务分类与 debt
- type / maintenance.subtype: maintenance / architecture; source.kind: docs-issues。
- debt.estimate: incurred 2 / repaid 6 / net -4, global / high / medium — design 后维持 (方案消除"互引闭包能否分批"不确定性: 批边界 = 说明符隔离块与互引闭包整体)。
- debt.final 预期: 与 estimate 同量级; risk 预期 verify 后降 (红绿网全程)。
- revisions: explore 一条; design 无新增。
- Project 字段同步: 已绑定, archive 时 done。

## 模块结构 / 组件拆分

实施分 4 批, 每批独立可验证可提交 (批边界依据: B1 shared 仅说明符隔离可独立; B2 内核 53 文件互引密集为最小可验证整体; B3 CLI 归位依赖 B1+B2 就位; B4 文档收尾)。全程顺序执行 (全局迁移类, 不并行)。

- **B1 shared 进包**: git mv src/shared → 包 src/shared; 5 处 alias/include 改指; preload 2 行 @shared 化 + preload 段 alias。
- **B2 内核 53 文件平移**: git mv engine/ adapters/ agent-plugins/adapter-registry.ts 4 中立件 → 包 src/ (保持结构); main 17 行 + tests ~50 行 → `@berth/scan-engine/*`; electron.vite worker input + main alias + vitest alias + tsconfig.node paths/include。
- **B3 CLI 归位 + 盲区根治**: engine-bridge 改包内相对; 包 tsconfig exclude 三项清空 + paths; tsup alias 包内化; `--filter` build/test/typecheck 三绿。
- **B4 文档对齐**: ARCHITECTURE.md 模块表/目录/白名单措辞; 源 issue 余项登记。

## 界面质量与交互验收

不适用 (纯结构重构, 零 UI 改动; 行为零变更由测试矩阵钉死)。

## 测试策略

纯结构迁移零行为变更 — **不新增测试文件**; 每批以全量既有测试网为回归证据 (1016 unit 含等价钉测 + 40 个直接 import 闭包的测试文件本身即迁移正确性探针):

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| B1 shared 解析改向 | unit + typecheck (既有全量) | tests/** 全量 | `pnpm typecheck && pnpm test` | 纯说明符/alias 改向零新行为, 全量绿即证据 |
| B2 迁移行为零变更 | unit (含等价钉测) 双轮 + e2e 全量 | tests/unit/asset-sources-equivalence.test.ts + 全量 | `pnpm test` ×2 + `pnpm build && pnpm test:e2e` | 等价钉测即 GH-115 预铺的迁移红绿网; e2e 消费 out/ 即构建冒烟 |
| B3 CLI 包自包含 | 包 unit + CLI E2E golden + typecheck | packages/berth-scan-engine/tests/** | `pnpm --filter @berth/scan-engine build/test/typecheck` | golden 网既有 (fixtures 扫描快照); exclude 清空后首次全覆盖即 AC-3 证据 |
| root 门禁纳管包 | 机械检查 | — | `pnpm typecheck` | typecheck 命令本身即验证, 无测试文件可写 |
| win32 e2e 已知项 | — | tests/e2e/project-scope.e2e.ts | — | 预存宿主隔离缺口 (issue 2026-06-11-IMPROVEMENT-e2e-win32-host-isolation), 口径同 GH-119 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| B1+B2 物理迁移 (包内目录契约) | AC-1 |
| B3 tsup 包内化 + engine-bridge 包内相对 | AC-2 |
| B3 exclude 清空 + Q4 root include 纳管 | AC-3 |
| 测试矩阵全行 | AC-4 |
| electron.vite worker input + e2e + --filter build | AC-5 |
| B2 main 17 行说明符改写 | AC-6 |
| B4 ARCHITECTURE 更新 | AC-7 |
| 每批门禁 + CI | AC-8 |
