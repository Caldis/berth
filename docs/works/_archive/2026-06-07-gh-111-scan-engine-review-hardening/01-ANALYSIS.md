# 需求分析 (Explore 产物)

Explore = Codex×Claude 两轮对抗审查 (记录见 `review/`, 综合见 00-PRD)。本文聚焦受影响代码图、官方核验状态、Tier 拆分与测试策略。

## 受影响代码图 (Tier-1)

| ID | 文件:行 | 现状 | 维度 |
|---|---|---|---|
| C1 | `adapters/claude-code/scanner.ts:163` | `scanDir(claudeDir/'output-modes','user','**/*.md',parseOutputMode)` — 仅用户级, 目录名错 | 覆盖 |
| C2 | `adapters/claude-code/scanner.ts:122` + `parsers.ts:70-87` | skills `**/*.md`; parseSkill name fallback=`basename(file)` | 覆盖 |
| O1 | `adapters/claude-code/parsers.ts:1088` | `readSettingsJson` try/catch→null (缺文件与坏JSON 不分) | 观测 |
| O2 | `adapters/claude-code/parsers.ts:703-716` | session readFileSync+split; 坏行 `continue`; 读失败下游空 catch | 观测 |
| O3 | `adapters/claude-code/scanner.ts:57` | `safeGlob` catch→[] 不写 ctx.errors | 观测 |
| O4 | `engine/scanner.ts` runScanAll + `shared/types/ipc.ts AssetScanPartial` + `renderer/stores/app.ts applyAssetProgress` | partial 仅 assets/stats, 无 errors | 观测 |
| R1 | `adapters/claude-code/scanner.ts:501` (及同类裸 statSync) | `fs.statSync(fp).isFile()` 在 safeScan 外 | 正确性 |
| R2 | `engine/watcher.ts:36-39` | `ignored:[/(^|[/\\])\../,/node_modules/]` 自忽略点目录监听根 | 正确性 |
| R3 | `adapters/claude-code/parsers.ts:467` | `samePath` 无条件 `path.resolve().toLocaleLowerCase()` | 正确性 |
| R4 | `engine/assets/runtime.ts:328-336 runRefresh` | await 后重读 `this.scanner` (可被 setProjectDir 换掉) | 并发 |
| P1 | `engine/scanner.ts` onPartial | partial 携带含 `raw` 的累计 assets | 性能 |

## 官方核验状态
- C1: 已对 https://docs.claude.com/en/docs/claude-code/output-styles 核验 — user `~/.claude/output-styles` + project `.claude/output-styles`。
- C2: 已对 https://code.claude.com/docs/en/skills + .../claude-directory 核验 — skill 形态 `<name>/SKILL.md` + 同级支持文件。Codex 适配器/插件下钻已用 `**/SKILL.md` (内部一致性佐证)。
- 其余为代码层缺陷, 已逐行核验 (见 00-PRD)。

## 修复陷阱 (Round-2 Codex 提出, 已采纳)
- C2: 改 `**/SKILL.md` 后 fallback 名会变 "SKILL" → 必须取父目录名 (`basename(dirname(file))`)。
- C1: 不止改目录名 — 还需补 project scope; asset type 维持 `output-mode` (兼容渲染层/路由/i18n), 不引入新 type。
- R2: 不能简单删 `ignored`; 用"只忽略明确噪声 (node_modules/.git)", 保留点目录监听根。
- R4: 用捕获本轮 scanner 引用 (不是改全局), 完成前用捕获引用取 sources/candidates。

## Tier-2 (本任务只记 docs/issues, 不实现)
- P2 长驻 worker / 避免 sessionCache 双向 clone
- P3 session 流式逐行解析
- P4 退役 legacy `getScanner()` (assets:scan-category / hooks:statuses 统一走 runtime)
- P5 scope 过滤认 projectDirs 继承链 (子目录项目隐藏父级生效配置)
- R5 hook effective 态反映 `disableAllHooks`

## 测试策略
- C1/C2/O1/O2/O3/R1/R3: 引擎/parser 层单测 — 临时 fixture 目录, 断言扫描产出 + 错误进入 ctx.errors + 边界 (坏 JSON / 父目录名 / 删文件 TOCTOU)。复用 `tests/unit/output-mode-command-agent.test.ts` 的临时目录范式。
- R2: watcher 单测 — `getAssetWatchPaths` 不被 `ignored` 自匹配 (断言 ignore 函数对监听根返回 false)。
- R4: runtime 单测 — scanAll 期间 setProjectDir, 断言最终 snapshot 不混用旧 assets+新 scanner。
- O4/P1: store/engine 单测 — partial 带 errorCount; partial assets 不含 raw。
- 全局: `pnpm test` + `pnpm --filter @berth/scan-engine test` 无回归; build 绿。
