# 03-PLAN — 活任务清单

## 实现项 (每项先写/更新测试, 跑通才勾)

### 项2 (先做, 风险低)
- [ ] `search.ts`: 加 `field()` 转义辅助, `createIndexSignature` 字段经 `field()` 再 join
  - test: 新增 scan-engine signature 用例 — 伪相等 (转义后不碰撞) + 身份保持 (内容同不重建)
- [ ] `result-signature.ts`: 习语对齐 (硬编码字段抽常量 + 复用 `row`), 行为不变
  - test: `use-memory-cache.test.tsx` 保持绿 (身份保持端到端)

### 项1(b)
- [ ] `scan-ignore.ts`: 新增 `loadNestedProjectIgnore` (多层合并到 projectDir 视角 + 子目录规则相对化)
  - test: 嵌套 `.gitignore` 叠加单测 (相对化逻辑) + 已知限制显式断言
- [ ] `claude-code/scanner.ts`: 调用点 `loadProjectIgnore` → `loadNestedProjectIgnore`
  - test: `claude-code-nested-ignore.test.ts` 扩 (子目录叠加 + 根回归)

### 文档
- [ ] `docs/issues/2026-06-19-...scan-exclude` + `2026-06-09-...shared-path` 状态更新 (本批落地范围 + (a) 关闭 + 嵌套已知限制 + signature 转义方向更正)

## 验收
`pnpm --filter @berth/scan-engine test` + `pnpm test` + `pnpm typecheck` + `pnpm lint` 全绿。
