# 解决 (RESOLVED 2026-06-10)
- 回填 `docs/ARCHITECTURE.md`: 仓库布局补 `packages/` (@berth/scan-engine); 主进程模块补 `src/main/memory/` (只读记忆聚合, 实际为 index/types + sources/{united-memory,claude-native}) + engine `snapshot-store.ts`/`sqlite-snapshot-store.ts` (含 SQLite 冷启 SWR)。
- 额外修正同源漂移: 安全约束 "v0.1 不写任何本地文件 / 缓存不落磁盘" 已被 GH-113 SQLite 持久化推翻, 改为准确表述 (唯一本地写入是 berth 自有索引缓存 berth-index.db, 不触用户数据)。纯文档, 小改动豁免。

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
