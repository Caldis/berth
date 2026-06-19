# 02-SPEC — Design 产物

## 范围 (经 explore 校准)
- 项1(a) 其他 adapter 下沉: **关闭** (证伪, 无真递归)。
- 项1(b) 嵌套累积 gitignore: **做**, claude-code 专属, 常见非锚定规则实用版 + 已知限制记录。
- 项2 signature: **方案 A** — 各自习语对齐 + 给 search.ts 补转义 (修伪相等)。

## 改动方案

### 项1(b): scan-ignore.ts 新增 loadNestedProjectIgnore
- 签名: `loadNestedProjectIgnore(rootDir, leafDir, { respectGitignore }): Ignore | null`
- 把"多层 `.gitignore` 合并为一个 projectDir 视角的 Ignore"在加载阶段完成; `buildScanIgnore` **不改** (继续吃 `projectIgnore: Ignore`, matcherHit 仍相对 projectDir)。
- 子目录 `sub` 的 `.gitignore` 每条规则按 root 相对化 (前缀 `sub/`), 再 `add` 到合并 Ignore。
- **范围控制**: 覆盖常见非锚定规则前缀化; 否定(`!`)/锚定(`/foo`)/lazy-只读命中目录链 记为**已知限制** (写入 issue + 测试显式断言当前行为, 不假装支持)。
- `claude-code/scanner.ts` (~136-152): `loadProjectIgnore` → `loadNestedProjectIgnore(projectDir, projectDir, ...)`。

### 项2: search.ts 补转义 + result-signature 对齐
- `search.ts createIndexSignature` (:127): 字段 `.join('')` 前先经 `field()` 转义 (replaceAll `/` → 空格); 行级仍 `.sort().join('')`。**唯一有行为意义的改动** (消除 path/metadata 含 `` 时伪相等)。
- `result-signature.ts`: 已转义, 逻辑不变; 可选把硬编码字段数组抽模块内常量 + 复用 `row()` (near no-op)。

## 文件边界
- `packages/berth-scan-engine/src/engine/scan-ignore.ts`
- `packages/berth-scan-engine/src/adapters/claude-code/scanner.ts`
- `packages/berth-scan-engine/src/engine/search.ts`
- `src/renderer/src/lib/result-signature.ts`
- `packages/berth-scan-engine/tests/**` (新增)

全部边界内。**不抽跨 package 共享模块** (方案 A, 避免越界 `src/shared`)。

## 测试矩阵
- scan-engine (`pnpm --filter @berth/scan-engine test`):
  - 嵌套: 子目录 `.gitignore` 叠加 (`proj/sub/.gitignore: secret/` → `proj/sub/secret/CLAUDE.md` 跳过, `proj/sub/CLAUDE.md` 保留); 根+子规则共同生效; **仅根 `.gitignore` 现有用例回归** (向后兼容); 否定/锚定不支持的**显式断言**。
  - signature: 内容相同两列表 → `ensureIndexed` 第二次不重建 (spy addAll/removeAll 次数或断言 indexedSignature 不变); 字段不同 → 重建; **伪相等**: `a='x',b='yz'` vs `a='xy',b='z'` 转义后签名不同。
- renderer (`pnpm test`): `use-memory-cache.test.tsx` "preserves same result reference when unchanged" 保持绿; result-signature 若非 no-op 则加 `tests/renderer/result-signature.test.ts`。

## 风险
- 嵌套 gitignore 相对化语义 (否定/锚定) 是主要复杂度 → 实用版 + 已知限制。
- 签名行为不变靠现有 + 新测试钉死。
