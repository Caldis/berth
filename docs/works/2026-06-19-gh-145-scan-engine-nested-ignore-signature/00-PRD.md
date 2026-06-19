# 来源快照 (只读输入)

## 源 issue
- `docs/issues/2026-06-19-IMPROVEMENT-scan-exclude-remaining-adapters-and-nested-gitignore.md` (GH-142 下沉后续)
- `docs/issues/2026-06-09-IMPROVEMENT-shared-path-and-type-config.md` (仅 signature 收敛项; asset-type 配置表已标过期不做, 路径统一已 DONE)

## 目标
GH-142 已把 excludePaths/gitignore 下沉到 claude-code 项目树 glob。本任务收口两项剩余:
1. 嵌套累积 gitignore (per-directory `.gitignore` 叠加)。
2. signature 习语收敛 + 修 `search.ts` 潜在伪相等。

## 边界
`packages/berth-scan-engine/` + `src/renderer/src/lib/result-signature.ts`。其他 adapter 下沉项经 explore 逐一核实证伪 (无真项目树递归), 关闭。

由 harness-5.2-issues A 组稳健批并行处理生成。
