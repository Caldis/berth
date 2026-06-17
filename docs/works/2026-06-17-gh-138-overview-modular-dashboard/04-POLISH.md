# 抛光记录 (3.1-polish)

用户明确要求 (invariant 12 授权): "继续细化, 补充细节, 优化交互, 打磨布局, 优化体验"。
范围限当前仪表盘的视觉/交互/布局/体验; 不扩功能范围。基于截图复盘识别打磨项。

## 打磨清单

### 批次 1 — 参考图保真 + 编辑结构 (done, 截图验证)
- [x] P1 stats-band: 指标列间细竖发丝线 (lg 单行 `lg:border-l`, 钳第一列), 对齐 Codex `|` 分隔。
- [x] P2 activity-heatmap: 左侧 Mon/Wed/Fri 星期标签 (本地化 Intl weekday, 与月份标签 w-7 spacer 对齐)。
- [x] P3 activity-heatmap: cell tooltip 本地化 (dayTooltip/noneTooltip: "N 个会话 · 日期")。

### 批次 2 — 拖拽交互手感 (done)
- [x] P4 拖拽抬起反馈: 拖拽中 widget 改为实心抬起面 (bg-card + shadow-xl + 实心 ring + z-20), 替代旧的 opacity-50 淡出, 更有"拿起"手感; 编辑非拖拽态保持虚线环。

### 批次 3 — 体验/数据真实性 (done)
- [x] P5 stats-band「最长任务」异常值: `buildPeakMetrics` 加 24h sanity cap (墙钟跨度 >24h 的
  stale/未关闭 session 从峰值时长剔除, token/计数仍计) + 单测; issue 更新为 MITIGATED。回到有意义值。

### 候选 (待截图复盘 + 用户反馈后排期)
- 编辑态进出的微动效 (affordance 渐显)。
- 空态视觉一致性 (各 widget 空态对齐)。
- 响应式断点在窄屏的 widget 跨度复核。
- 间距/节奏微调 (区块间留白)。

## 验证
每批改动: typecheck/lint/单测 + (触 overview/renderer DOM 时) e2e + CDP/截图复盘请用户裁定 taste。
