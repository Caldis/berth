# 描述
GH-142 把 excludePaths 下沉到 adapter 枚举层 + respectGitignore 接入, 聚焦在 claude-code 的**项目树递归 glob** (`**/CLAUDE.md`, 最大 IO 成本点 / GH-117 10s 重扫根因)。以下为聚焦边界外的剩余项, 为控 risk 拆出独立跟踪。filterExcludedPaths (scanner.ts:129) 兜底保证所有 adapter 的 excludePaths 正确性不变, 故以下均为性能/完整性增强, 非正确性缺陷。

# 现状缺口
1. **其他 adapter 项目树递归未下沉**: codex/cursor/gemini-cli/github-copilot-cli/opencode/openclaw/hermes-agent 的 glob 枚举仍只靠结果后过滤 (正确但不省 IO)。codex `scanDir` (`adapters/codex/index.ts:304`) 等若有项目树递归, 同样可接 `buildScanIgnore` 下沉到 glob ignore。
2. **嵌套累积 gitignore 未支持**: GH-142 只读项目根 `.gitignore`/`.berthignore`; 严格 gitignore 是 per-directory 累积 (子目录 .gitignore 叠加规则)。深层子目录的 .gitignore 当前不生效。
3. **claude-code 其他 scanDir 未注入**: skills/agents/commands 的 `**/SKILL.md` 等 scanDir (固定 `.claude/` 子目录, 深度有限) 未接 excludePaths/gitignore; 收益递减, 低优先。

# 预期 / 建议
- 抽共享枚举封装 (`adapters/_shared`), 所有 adapter glob 统一经 `buildScanIgnore` 注入, 消除每 adapter 手接。
- 嵌套累积: 遍历时按目录层级合并各层 `.gitignore` (node-ignore 支持多源 `add`, 需按各层 cwd 相对化)。
- 直接复用 GH-142 落地的 `packages/berth-scan-engine/src/engine/scan-ignore.ts` (`loadProjectIgnore` + `buildScanIgnore` defaultPatterns)。

# 来源 / 关联
- GH-142 (`docs/works/2026-06-19-gh-142-scan-exclude-adapter-level`) design 聚焦边界 (02-SPEC「聚焦策略」)。
- 接续原 issue `2026-06-15-IMPROVEMENT-scan-exclude-adapter-level` (核心 excludePaths 下沉 + respectGitignore 已由 GH-142 兑现)。
- 状态: 基本收口 (余低优 (c)) (2026-06-20, GH-145)。

# 落地更新 (2026-06-20, GH-145)
- **(b) 嵌套累积 gitignore: DONE** — `loadNestedProjectIgnore` (scan-ignore.ts) 子树 glob .gitignore/.berthignore + relativizeRule 相对化; claude-code `**/CLAUDE.md` 切换。覆盖锚定/非锚定/单层否定; **已知限制**: 跨目录多层否定 last-match-wins 不复现 git per-directory 语义 (测试显式断言当前行为)。
- **(a) 其他 adapter 下沉: 关闭** — explore 逐一核实 8 adapter, 除 claude-code 外无项目树递归 glob (全固定浅 config 子目录), 抽共享枚举零收益。
- **(c) claude-code 其他 scanDir: 未做** (低优, 留 future)。
- work: `docs/works/_archive/2026-06-19-gh-145-scan-engine-nested-ignore-signature`。
