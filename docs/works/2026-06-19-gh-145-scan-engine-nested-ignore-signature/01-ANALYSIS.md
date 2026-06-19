# 01-ANALYSIS — Explore 产物 (经代码核实)

## 项1: scan-exclude 下沉后续

### (a) 其他 adapter 下沉 → 证伪, 关闭
逐一核实 8 adapter 的 glob (cwd + pattern):
- **claude-code**: `glob('**/CLAUDE.md', {cwd: projectDir})` (scanner.ts:138) — 全仓**唯一**项目树递归, 已接 buildScanIgnore (GH-142)。
- codex / cursor / gemini-cli / github-copilot-cli / opencode / openclaw / hermes-agent: 项目侧 glob 全在固定浅 config 子目录 (`.codex/`/`.cursor/`/`.github/`/`.opencode/` 等) 内递归, 或 `fs.existsSync` 定文件名 (gemini/hermes 根本非 glob)。**无项目树递归**。

结论: 不存在"其他有项目树递归的 adapter", 抽共享枚举封装零收益 (反增抽象成本)。`filterExcludedPaths` (scanner.ts:135/438) 对全部 adapter 产出事后兜底过滤, excludePaths 正确性不变。

### (b) 嵌套累积 gitignore → 做 (claude-code 专属)
`loadProjectIgnore` (scan-ignore.ts:35-42) 只读 projectDir 根 `.gitignore`/`.berthignore`; 子目录 `.gitignore` 不叠加。此项**仅对 claude-code `**/CLAUDE.md` (唯一深递归) 有意义**。

### _shared 现状
`packages/berth-scan-engine/src/adapters/_shared/` 已有 8 工具文件, **无 barrel index.ts**, 各 adapter 直接 import 单文件。新模块沿用此风格。

## 项2: signature 收敛 (转义方向与 issue 相反)
- `createIndexSignature`: **1 定义 (search.ts:127) + 2 调用 (:39/:44)**, 非 issue 说的"3 处"。
- `result-signature.ts` (renderer): 用 ``/``, `field()` 会转义两分隔符 → **已转义**。
- `search.ts` (engine): 相同分隔符但字段内**不转义** (直接 `.join('')`) → 真有伪相等风险。**需补转义的是 search.ts**, 非 issue 点名的 result-signature。
- 跨 package 物理隔离 (renderer `src/shared` vs scan-engine `src/shared`) → "单一真源"不可达。
- 签名唯一契约 = **身份保持** (内容相等 ⇒ 复用旧引用 / 跳过重建索引)。消费: renderer `CachedResource` (use-ipc/use-memory); engine `AssetSearch.ensureIndexed`。
- **无专门单测** (search/result-signature 均无); renderer 侧由 `use-memory-cache.test.tsx` 端到端覆盖身份保持。
