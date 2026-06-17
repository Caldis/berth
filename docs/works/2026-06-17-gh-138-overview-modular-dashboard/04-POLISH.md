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

## 用户批评 8 项 (50%→95%, 设计原点见下)

逆向设计哲学: ①不留死白(填满宽高/瀑布流/动态高) ②密度与充实(拒空洞) ③控件即时可辨一次到位
(枚举非轮换) ④iOS 式直接操作美学(浮动毛玻璃画廊/拖出/预览非标题) ⑤一致性无特例(效果统一或删)
⑥层级可辨(尺寸变体肉眼可分)。

- [x] U8 涟漪统一: HeroUI Button 默认 ripple 不一致 → ui/Button 包装全局 `disableRipple` (与原生按钮一致, 克制)。
- [x] U3 尺寸切换枚举化: 轮换按钮 → 分段枚举控件 (一眼看全所有尺寸 + 一次点击命中); use-dashboard-layout cycleSize→setSize。
- [x] U4 用量趋势: 30/90/180d 分段可配置, 默认 30d 起 (7d 太短); XAxis minTickGap 防标签重叠。
- [x] U1 活动热力图占满横向空间: 周列 flex-1 + 格 aspect-square (随宽放大保持方形), 星期列 items-stretch 自动对齐动态格高。
- [x] U2 洞察/常用 增实质: insights 加 Codex/Claude agent 占比条 + 更醒目值; top-usage 加排名序号 + 更粗条。
- [x] U6 M/L 区分: 内容驱动 — recent-sessions L 显示 8 条(M 5), top-usage L 显示 10(M 5); 自然更高更有用 (避免强制行高撑空短组件)。
- [~] U7 空隙回填: grid-flow-dense 回填可填空隙 (部分)。**真·瀑布流** (变高列式打包 + 动态高度) 需列式重构 + dnd 多容器 sortable, 属更大改造, 见候选。
- [ ] U5 隐藏 widget → 底部 sticky 毛玻璃浮动画廊, 预览渲染(非标题), 可直接拖出 (iOS 小组件库) — 架构级, 进行中。

## 验证
每批改动: typecheck/lint/单测 + (触 overview/renderer DOM 时) e2e + CDP/截图复盘请用户裁定 taste。
