# IMPROVEMENT: harness 健康审计 — 剩余清理专项 (handoff)

状态: OPEN (专项, 新会话执行)。本批为 2026-06-20/21 harness 健康审计的**剩余项**; 安全的大块削减已落地, 剩下是对**治理契约文件**的精细手术, 拆出专项避免疲劳下改错关键文件。

## 背景 (已完成, 勿重做)
2026-06-20/21 复盘 + 3 路审计已落地:
- 移除 Codex 交叉评审 (全局 `~/.claude/CLAUDE.md`) + #2 去 codex 依赖。
- AGENTS.md: task-state 默认轻量 (大件才建) · friction「记录≠都折常驻规则」· Behavioral guidelines 64→6 行 · EVOLUATION 提交纪律去重 · AGENTS.md 134→75 行。
- README: action 计数 10→11 · 何时进入对齐轻量 · 修 2 处 stale friction 引用 (release-tag / static-green → `_archive/`)。
- 提交: `fc6a1769` `d771f219` (已推送 master)。
- 审计结论: harness 底子健康 (skills 11/11 一致 · scripts 8/8 存活 · 无死/断引用), 问题集中在**文本膨胀** + 少量 stale。

## ⚠️ 执行前必读 (安全护栏 — 上一轮踩坑教训)
1. **`harness:check` 硬校验规则短语**: `scripts/harness-check.mjs` 有 entry-rules validators, 校验 AGENTS.md/README/_shared/各 phase 文件**必须含特定规则短语** (small-change 豁免 / frequent scoped commit / test evidence / frontend taste / Superpowers flow policy / side-product issue capture / archive backlog reminder 等; 常量如 `SMALL_CHANGE_EXEMPTION_RULES`)。**删错短语即红灯**。→ **动任何规则文本前, 先读 `scripts/harness-check.mjs` 的 validators (约 line 340-435) + 对应常量, 确认你要删/改的不是被校验的短语**。
2. **每个改动前后各跑 `pnpm harness:check`**, 绿了才提交 (上轮违规先提交后验, 别重蹈)。
3. **不重编号 `_shared.md` 不变量**: 他处 (AGENTS.md / phase 文件 / friction) 按号引用 (如"见不变量 6/11")。只能**原地裁剪内容**, 不能删/挪导致重编号。改后 grep 全仓 `不变量 [0-9]` 确认引用仍对得上。
4. **保留高复发规则, 只降级低复发一次性项** (子代理审计建议过度降级, 已否决): 必须**保留**以下高复发规则 (本会话反复用到, 是并发-主分支模型核心): concurrent-registry-collision 时序 · fork-vs-fresh-agent + 子代理自报独立复验 + git 审计 · golden/snapshot host-Node 可移植性 · per-file 暂存纪律 · filter-options-from-full-set · CI 红归因-before-revert · static-green-over-runtime。
5. 默认轻量执行 (本身就是 docs 清理, 无需建 task-state); 每项一提交, `git diff --cached` 核对只动自己文件。

## 执行项 (按风险从低到高)

### E. `docs/issues/_roadmap.md` 刷新 (安全, 先做)
- 现状 stale: 顶部快照写 ~10 active, 实际仅 **4 active** (heroui-migration-followup / background-progressive-asset-indexer / health-restructure-and-message-contract / ci-artifact-actions-node-deprecation)。
- 动作: 用 `pnpm harness:issues` 读当前 active, 重写顶部进度快照反映真实 4 项 + 删除已解决行。

### D. `docs/ARCHITECTURE.md` 补 3 处本会话产物 (安全, 纯补)
- 缺 `engine/health/` 13 模块结构 (health.ts 1446→45 行已拆: value-guards/fs-utils/command-heuristics/markdown/constants/types/hooks/make-check/shared-checks/claude/codex/cross-agent/paths)。
- 缺 `engine/assets/progress-coalescer.ts` (IPC 进度合并, GH-#10)。
- 缺 HealthCheck `i18nKeys?{title/message/suggestion/fixLabel/fixDescription}` + `params?` messageKey 契约 (health-restructure Phase-2A, 渲染层 health-check-i18n 已纯 key-first)。
- 动作: 在对应 engine/IPC 段补条目, 不重写全文。

### C. Superpowers 约束 4 处去重 (中风险, 4 文件)
- 同一规则 (Superpowers 只作方法参考 / 不建 active docs/superpowers plans|specs / 不要 worktree / 不覆盖 INDEX.phase) 散在: `AGENTS.md` (§何时进入末尾) · `.agents/workflow/2.0-design.md` · `.agents/workflow/3.0-implement.md` · `_shared.md` (不变量 17/18)。
- 动作: 留 `_shared.md` 不变量 17/18 为 canonical, 其余 3 处转一行指针 ("Superpowers 政策见 `_shared.md` 不变量 17/18")。
- **护栏**: harness-check 有 "missing Superpowers flow policy" validator (约 line 419) —— 先确认它校验的是哪个文件, 那个文件必须保留完整 policy 短语, 不能只留指针。

### B. `4.0-verify.md` 压缩低复发一次性规则 (中风险)
- 现 68 行, ~line 48-59 内联多条 friction 派生过程规则。
- **保留** (高复发, 概要保留): golden/snapshot 可移植性 · CI 红归因-before-revert · static-green-over-runtime · HeroUI 浮层时序伪影。
- **降级为一行 + friction 链接** (低复发一次性): Windows DPI/CopyFromScreen 截图坐标 · virtuoso sticky 头 · dev:agent stop EPERM · macOS 截图 CDP · WAL checkpoint seed 冷启 · vitest singleFork。
- **护栏**: harness-check 有 "frontend taste rule" (line 392) + "test evidence rule" (line 408) validator —— 确认它校验 4.0-verify 的哪些短语, 保留之。
- 目标: 68 → ~48 行。

### A. `_shared.md` 提交-CI 政策互重去重 (高风险, THE 契约文件, 最后做)
- 重复: `_shared.md:5-7` "## 最高优先级规则" (~1100 字 commit/push/CI-async/baseline/exception 政策) 与 **不变量 #11** (审计称 ~line 139) 互为详尽 restatement。
- 动作: 保**一份** canonical (建议留顶部 §最高优先级规则为详细家, 不变量 #11 裁成简指针 "提交/推送/CI-async 纪律见 §最高优先级规则" —— **保留 #11 编号**)。读两处确认无规则内容丢失。
- **护栏 (最关键)**: harness-check 有 "frequent scoped commit rule" validator (line 375) —— **必先确认它校验哪个文件的哪个短语**; 被校验的那份必须保留该短语, 只能裁另一份。改后 harness:check 必绿 + grep `不变量 11` / `最高优先级` 引用全对得上。
- 目标: _shared 163 → ~140 行。

## 验收 (每项 + 总)
- 每项改完: `pnpm harness:check` 绿 + 该文件无丢规则 (对照本文"保留清单") + grep 不变量编号引用不断。
- 总: `pnpm harness:check` 绿; `git grep -nE "docs/(superpowers|friction/[0-9])"` 无断引用; AGENTS/README/_shared/phase 全部 entry-rules validator 过。
- 每项一提交 (`docs(harness): 健康审计清理批N — <item>`), 推送。

## 来源
2026-06-20/21 复盘 + 3 路并行审计 (top-level / _shared+phases / skills+scripts+ARCHITECTURE)。审计原始发现见各 commit + 本文已蒸馏关键项。
