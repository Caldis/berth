# 描述
GH-138 首页仪表盘「指标带」的「最长任务」(longest task) 显示 ~1793h (≈74 天), 来自
`buildPeakMetrics` 取所有 session 的 `meta.duration` 最大值。74 天的单次"任务"几乎肯定是
某个长期未关闭 / 异常 session 的 duration 异常值, 使该指标失真 (看起来像 bug)。

# 现状缺口
- `packages/berth-scan-engine/src/engine/activity-insights.ts` 的 `buildPeakMetrics` 直接
  `maxSessionDurationSeconds = max(session.meta.duration)`, 无上限 / 异常过滤。
- 根因在上游: session duration 解析可能产出超长值 (session 跨多天未关闭, 或 `endedAt - startedAt`
  含挂起空窗, 并非实际活跃时长)。同一数据也会影响其它按 duration 的统计。
- 现象在 stats-band widget 暴露, 但治理点应在 engine 聚合 / session duration 解析侧, 不是 UI。

# 预期 / 建议
- **先取 ground truth**: 实机找出触发该值的 session + 其 duration 字段来源 (是 transcript 实际
  时长还是 startedAt/endedAt 差值), 再决定治理层。不要凭猜直接截断。
- **聚合侧 sanity cap**: 在 `buildPeakMetrics` 对单 session duration 加合理上限 (如 > 48h 视为
  异常值排除或截断), 加单测覆盖异常值被过滤。
- 或上游 `session-detail` duration 解析侧治理 (区分活跃时长 vs 墙钟跨度)。
- 治理后同步校准 stats-band 显示与 A1 单测。

# 来源 / 关联
- 来源: GH-138 首页仪表盘截图验收时发现 (stats-band「最长任务」1793h)。
- 关联: `docs/works/2026-06-17-gh-138-overview-modular-dashboard` (当前任务仅交叉引用, 不在本次
  验收范围内修 — 属上游数据质量, 非仪表盘 UI 主线)。
- 状态: OPEN (非阻塞 GH-138; 仪表盘其余指标正常)。
