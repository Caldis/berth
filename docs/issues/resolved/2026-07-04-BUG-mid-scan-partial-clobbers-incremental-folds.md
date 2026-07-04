# BUG: 全量扫描的 mid-scan partial 会瞬时压掉扫描期间落地的增量折叠

状态: RESOLVED (2026-07-04, GH-155 T3 @ commit 9a487e3c)

## 解决 (2026-07-04, GH-155 design 裁决 Q1 入批)

按下方「修复方向」首选方案落地: `AgentAssetRuntime` 记录扫描期间 `applyFileChange` 的 `midScanSourceKeys` 集合, `applyPartial`/`commitScan` 对集合内 key 用当前快照行替换扫描流的 t0 旧行 (空折叠 = 删除同样胜出); 窗口随 commit/fail/cancel 关闭, 扫描外折叠不入集合 (下一轮扫描以磁盘真值为准)。后台队列提交 (GH-155 W1) 发生在扫描中时同样并入该保留窗。单测 4 项钉住 (partial 回吐 / commit 回滚 / 删除赢 / cancel 清窗), 见 `tests/unit/agent-asset-runtime.test.ts` "mid-scan sourceKey retention"。入批理由: backgroundIndexQueue 把单扫瞬态覆盖窗口乘以 M 个项目, 不修则 GH-155 自己放大此 bug。

## 现象 (真机时序实测, GH-151 verify 阶段观察)

隔离实例 (isolated codex home) 下: 全量扫描进行中, 20 个新 session 文件经 watcher 增量路径 (`applyFileChange`) 陆续折入实时快照; `waitForFunction` 观测到计数到达 20 后, **下一次采样回落到 15, 且 snapshot id 未变** — 说明不是新 commit, 而是 `applyPartial` (`runtime.ts`) 用扫描器的累积 partial **整体替换** `snapshot.assets`, 而该 partial 基于扫描开始时的枚举, 不含后落地的文件。

时序: ① 扫描 t0 启动 (枚举完成); ② t1-t5 watcher 增量折入新 session (立即可见); ③ 扫描器 t6 发下一个 partial → `applyPartial` 整体替换 → 增量结果从 UI 上瞬时消失; ④ 扫描 commit (磁盘为准, 20 个都在) 或 GH-151 S4 排队的 watcher refresh 重扫 → 最终恢复 20。

同族: `commitScan` 也会用 t0 的旧解析覆盖 ② 的增量 (审查报告健壮性发现 #5), 但 commit 后快照来自完整磁盘枚举, 通常自带新文件; 真正只剩 "扫描期间**修改**的文件内容被 commit 回滚到扫描时读数" 一种残留窗口, 同样由 S4 排队刷新兜底。

## 影响

- 用户可见: 活跃 agent 会话高频落盘 + 恰逢全量扫描时, 列表/计数可能短暂"回吐"几秒 (增量项闪现后消失, 扫描结束后再回来)。
- 数据正确性: GH-151 S4 (refresh 排队 latest-wins) 落地后**最终一致性有保证**, 不再有 24h 不可见窗口; 本 issue 只剩瞬态 UX 问题。

## 修复方向 (供后续任务)

- `AgentAssetRuntime` 记录扫描期间收到的增量 `sourceKey` 集合; `applyPartial`/`commitScan` 时对该集合的资产做保留合并 (类似 `foldKeepingShallow` 的语义), 而非无条件整体替换。
- 或: 扫描进行中把增量事件降级为排队 (S4 机制已有), 不做实时折叠 — 代价是丢掉 mid-scan 即时可见性, 不如前者。

## 来源

综合审查 (2026-07-04, GH-151 00-BUG 引用的健壮性审查发现 #5 同族) 中列为中危未入批; GH-151 verify 阶段真机时序采集实测到 20→15 回落 (snapshot id 不变) 坐实。按不变量 10/verify 步骤 4 记录, 不混入 GH-151 修复范围。任务态见 `docs/works/_archive/2026-07-04-gh-151-scan-engine-audit-fixes/` (03-PLAN verify 证据节)。
