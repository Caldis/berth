# 描述
- `docs/ARCHITECTURE.md` 自称项目地图单一真源, 但已与代码漂移: 完全未提及 `packages/` (@berth/scan-engine CLI 包)、`src/main/memory/`、`engine/assets/sqlite-snapshot-store.ts` 三个已落地的关键模块, 会持续误导后续 Agent 按错误地图工作。

# 证据
- `docs/ARCHITECTURE.md` 全文无 `packages` / `memory` 字样; 仅技术栈段提 better-sqlite3, 未说明它已落为 snapshot store。
- 实际存在: `packages/berth-scan-engine/` (pnpm-workspace.yaml 成员)、`src/main/memory/{index,united-memory,claude-native}.ts`、`src/main/engine/assets/sqlite-snapshot-store.ts` (berth-index.db, WAL)。

# 预期 · 建议
- 回填三块: 仓库布局补 `packages/`; 主进程模块补 memory 源与 sqlite snapshot store; 数据流补 SQLite 冷启动 + SWR 持久化。
- 低风险纯文档改动, 宜作为引擎重构 (2026-06-09-IMPROVEMENT-engine-shared-core-package.md) 的前置。

# 来源 · 关联
- 架构图绘制任务 (2026-06-09) 扫描发现。关联本批次其余架构 issue。
- 状态: OPEN。
