# PRD 快照 (只读)

> 原始需求快照。任何阶段不回写。

来源: 用户主动需求 (2026-06-15, 继续索引引擎优化主线)。GitHub Issue #135 (https://github.com/Caldis/berth/issues/135)。母 FEATURE: `docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md` (本任务为其 OPEN 主线剩余切片)。

## 用户原始诉求 (要点保留)

继续做索引引擎的优化, 这次着重于**进度可视化**。目的是让用户能在界面中清晰地看到:
- 目前扫描的数量
- 进度
- 剩余时间
- 下次扫描周期
- 完整的扫描过程

力求做到整个索引对用户是**可预期、可中断、可重置 (这个操作需要有警告)** 的, 就跟系统搜索的索引一样。

附带调研问题: 类似 **Raycast** 这种应用是如何索引并且不影响系统性能的? 可以参考一下。

## 目标拆解

1. **进度可视化 (可预期)**: 数量 / 进度 / 预计剩余时间 / 下次扫描周期 / 完整扫描过程 (阶段 + 当前路径或资产类型流转)。
2. **可中断**: 暂停 / 恢复 (或取消) 正在进行的索引; 协作式取消, 不损坏已写入数据。
3. **可重置 (带警告)**: 重建索引 (清空 `berth-index.db` 重扫); 破坏性操作必须明确警告确认。
4. **性能基线**: 后台索引不影响系统性能, 对标 OS 搜索索引 (macOS Spotlight / Windows Search Indexer) 与 Raycast 策略。

## 对标参考 (explore 阶段英文检索 primary source)

- macOS Spotlight (`mds` / `mdworker` 调度, 低优先级 IO, 空闲触发)
- Windows Search Indexer (空闲调度 + 背压)
- Raycast 后台索引策略 (后台 / 增量 / 不影响系统性能)
