# 00-PRD — 原始输入快照 (只读)

## 用户指令 (/goal)
> 请你让 codex 参与现有的扫描引擎进行对抗式审查, 检查在资产覆盖完整度/性能/可观测性/或其他方面方面上是否有问题或可改善点, 然后你就其反馈进行二次对抗性审查, 进行两轮后得出下一轮改进意见并落地实施。

## 审查方式
- Round 1: Codex (`codex exec -s read-only --disable web_search`) 做代码层对抗审查 (性能/可观测性/正确性/并发); Claude 负责官方覆盖核验 (output-styles/skills 已对官方文档核验); Claude 逐条对抗核验 Codex 10 条。
- Round 2: 把 Round-1 结论回灌 Codex, 让其辩护/认错并深挖二阶问题 + 修复陷阱; Claude 再核验。
- 原始记录: `review/round1-codex.md`, `review/round2-codex.md`。

## 验证后的发现 (全部经代码/官方文档核验)

### 覆盖完整度
- **C1** output-styles 目录名错误: `claude-code/scanner.ts:163` 扫 `~/.claude/output-modes`, 官方为 `~/.claude/output-styles` (用户级) + `.claude/output-styles` (项目级)。实际扫不到任何输出样式 + 漏项目级。(官方: docs.claude.com/en/docs/claude-code/output-styles)
- **C2** skills 过度扫描: `claude-code/scanner.ts:122` 用 `**/*.md`, 官方 skill 为 `<name>/SKILL.md` + 同级支持文件 (reference.md 等) → 支持文件被误当独立 skill。应 `**/SKILL.md`; 且 parseSkill 缺 frontmatter name 时 fallback 应取父目录名 (否则全叫 "SKILL")。

### 可观测性 (静默失败 = 缺失数据看起来像没有数据)
- **O1** `parsers.ts:1088 readSettingsJson`: 缺文件与坏 JSON 都吞成 null → 坏 JSON 静默丢全部 hooks/perm/env/statusline。
- **O2** `parsers.ts:703-716` session 解析: 坏行 `continue`、整文件读失败空 catch, 调用方拿不到错误。
- **O3** `scanner.ts:57 safeGlob`: glob 失败返回 [] 不写 ctx.errors。
- **O4** partial 流 (`engine/scanner.ts` runScanAll) 不带 errors → 扫描中错误短暂不可见。

### 正确性/并发
- **R1** `scanner.ts:501` `fs.statSync` 在 safeScan 外 → TOCTOU 抛错使 claude adapter 该轮 scanAll 中断, 丢该 adapter 全部资产 (engine 层 catch, 不拖垮其它 adapter)。
- **R2** `engine/watcher.ts:36-39` `ignored: /(^|[/\\])\../` 匹配 `.claude/.codex/.agents` 监听根本身 → chokidar 自忽略要监听的点目录 → 实时更新可能失效。
- **R3** `parsers.ts:467 samePath` 无条件 `toLocaleLowerCase` → case-sensitive FS 误匹配 + locale bug (土耳其 İ); 与 `scanner.ts normalizePath` (win32-gated) 不一致。
- **R4** `engine/runtime.ts runRefresh` 在 await 后重读 `this.scanner`, 项目切换可在等待期替换 scanner → 旧 assets 配新 sources/projectDir (代际竞态)。
- **R5** hook 一律 `effectiveEnabled:true`, 未反映 `disableAllHooks` 设置 (仅 statusline 处理)。

### 性能 (Tier-2, 记 issues)
- **P1** partial 传全量含 `raw` (structured clone 放大) — Tier-1 去 raw。
- **P2** sessionCache 每轮跨 worker 双向 structured clone — Tier-2。
- **P3** session JSONL 全量 readFileSync+split — Tier-2 (流式)。
- **P4** legacy `getScanner()` 仍被 `assets:scan-category`/`hooks:statuses` 使用且不随项目切换更新 — Tier-2 (退役)。
- **P5** scope 过滤把子目录项目的父级生效配置过滤掉 — Tier-2 (继承链)。

## 范围
- **Tier-1 (本任务实现)**: C1, C2, O1, O2, O3, O4, R1, R2, R3, R4, P1。
- **Tier-2 (记 docs/issues 跟踪)**: P2, P3, P4, P5, R5。
