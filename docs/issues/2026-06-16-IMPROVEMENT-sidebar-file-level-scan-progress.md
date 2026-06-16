# 描述
用户在 GH-135 frontend-design 反馈中希望左下角扫描进度面板能 breakdown 显示「当前正在扫描的路径或文件」, 制造逐文件刷新的「刷刷刷」即时反馈感。当前进度只到 adapter 粒度, 体感是「一格一格跳」而非「逐文件流动」。本次只落地了同一反馈里的顶栏瘦身 (去内联索引指示), 文件级进度因需引擎改造 + 高频 IPC 治理而拆出。

# 现状缺口
- **进度粒度到 adapter 为止**: `scanner.ts:92,105` 每个 adapter 发一次 `onProgress({ phase: 'parsing', current: index, total, label: adapter.displayName })` — `label` 是 adapter 显示名 (如 "Claude Code skills"), 不是正在读的文件路径。
- **UI 已就位但无米下锅**: `ScanProgressPanel` (sidebar-scan-status.tsx) 已渲染 `phaseLabel · progress.label` 且 `truncate`, 但 `progress.label` 最细只有 adapter 名, 给不出文件级流动感。
- adapter 内部枚举/解析文件的循环不向外冒泡单文件事件。

# 预期 / 建议
- **引擎发逐文件进度**: adapter 文件枚举/解析循环冒泡当前文件相对路径 (扩展 `AssetScanProgress` 或新增轻量 `currentPath` 字段), scanner 透传。
- **高频 IPC 必须先治理 (硬约束)**: 单次扫描可达数千文件, 逐文件事件穿 engine→main→renderer 三进程会打爆 IPC。落地前必须 coalesce/节流 (如 rAF 或 ~50ms 合并到最新一条, 只保留 latest path 不排队), 否则不允许接线。
- **与 helper 迁移耦合**: 若扫描内核迁 utilityProcess 长驻 helper (B 策略 / `2026-06-07-FEATURE-background-progressive-asset-indexer`), 逐文件事件多穿一层进程边界, 合并节流是前置条件而非优化项。
- **UI**: `ScanProgressPanel` 已有 truncate 行可直接消费 `currentPath`; 折叠态侧栏空间有限, 仅展开/hover 面板内显示, 不进折叠态。

# 来源 / 关联
- 来源: GH-135 frontend-design 反馈 case 1 的后半段 (前半段顶栏去扫描文本已落地, commit cbda635)。
- 关联: `2026-06-07-FEATURE-background-progressive-asset-indexer` (helper 迁移); `docs/works/2026-06-15-gh-135-index-progress-visibility/`。
- 状态: OPEN (future, 非阻塞 GH-135; 当前 adapter 级进度已可用, 仅缺逐文件流动感)。
