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
- [x] U5 iOS 小组件库式画廊: 隐藏 widget 改为底部 sticky 毛玻璃浮动面板 (backdrop-blur 悬浮于网格上方),
  以**缩放实时预览**呈现 (渲染真实 widget 内容如 token 构成堆叠条/模型榜, 非标题), 点击取用加入网格。
  美学/哲学对齐 iOS widget gallery。**遗留增强**: 直接拖拽出来 (需 dnd-kit 跨容器 gallery→grid, 列候选)。

## 第 2 轮 (用户判定 65%, 目标 70%+) — 续跑计划 (落盘, 压缩后据此继续)

用户反馈根因: **未对每个组件做视觉验收** → 遗留 M/L 无区别、缺 S 尺寸、留白过大。
要求: 逐组件视觉验收 + 美学设计评审, 并新增"可视化形态可切换"。U5 拖出 + U7 真瀑布流"都得做"。

### R2-A 逐组件视觉验收 + 美学评审 (每个 widget 必做, 不可只截整页)
对 9 widget 各自: ① 支持的尺寸集是否完整 (缺 S 的补 S); ② M/L/S 各尺寸是否肉眼可分 (内容/密度随尺寸变);
③ 留白是否过大 (压缩到合适密度); ④ 美学 (排版/对齐/层级/色) 评审打磨。逐个 CDP 截图验收。
- [ ] stats-band (Wide/XL): 尺寸集复核 + 留白
- [ ] activity-heatmap (Wide/XL): cell 尺寸/密度 + S? (小尺寸紧凑版)
- [ ] activity-insights (M/L): M/L 区分 + 留白 + 补 S?
- [ ] top-usage (M/L): M/L 区分 + 补 S?
- [ ] recent-sessions (M/L): 已 L=8/M=5; 补 S?
- [ ] usage-trend (M/L/Wide): M/L 区分 + 形态切换
- [ ] quick-actions (S/M/Wide): 已有 S; 各尺寸布局复核
- [ ] token-breakdown (M/L): M/L 区分 + 形态切换 + 补 S
- [ ] model-distribution (M/L): M/L 区分 + 形态切换 + 补 S
- **通则**: 每个 widget 评估是否该支持 S; M/L 用内容密度 (条目数/字号/图形大小) 拉开区别; 留白过大处收紧。

### R2-B 可视化形态可切换 (用户重点, 推广)
viz widget 提供形态切换 (用户选展现形式), 例: token-breakdown 支持 条形/饼图/空心饼(donut)。
- 设计: 复用 Recharts (已在仓); 加一个 ChartType 切换 (分段控件, 与 size/range 同风格); 形态状态可持久化 (localStorage per-widget 或并入 layout)。
- [ ] token-breakdown: 堆叠条 / 饼图 / 空心饼 (donut) 切换
- [ ] usage-trend: 柱状 / 折线 / 面积 切换
- [ ] model-distribution: 横条榜 / 饼图 / donut 切换
- [ ] 抽象一个可复用 `<ChartTypeToggle>` + 各 widget 接入; 考虑 widget 配置 (size + chartType + range) 统一进 layout 持久化

### R2-C 维度/组件丰富度
- [ ] 评估补充更多维度 widget (如: 每日/每周活跃时段、cost 趋势分模型、skill/mcp 增长、agent 对比等) — 视数据可得性
- [ ] 各 widget 多形态组合

### R2-D 架构级 (都要做)
- [ ] U5 drag-out: dnd-kit 跨容器 (gallery DndContext 与 grid 共享), 从画廊直接拖入网格 (现为点击取用)
- [ ] U7 真·瀑布流: 列式 masonry 打包 + 动态高度彻底消除空隙 (现 dense 部分); 需与 dnd sortable 协调 (多列 sortable 或自定义)

### 执行方式 (context 友好)
- 用子代理做**逐组件设计评审**: 子代理读单个 widget 源 + 返回简明 findings (尺寸/留白/美学/形态建议), 主 Agent 落地, 不把大段分析灌入主上下文。
- 视觉验收用 CDP **逐组件**截图 (dev:agent + 9335+ 端口, 单 widget 聚焦), 不只截整页。
- 落地仍小步提交 + (触 renderer DOM) build+e2e + 全套件; widget 内部改动 e2e 安全。
- chartType/size 状态优先并入 `lib/dashboard-layout` 的 widget 配置 (持久化) — 改 schema 时同步 migrate + 单测。

## 验证
每批改动: typecheck/lint/单测 + (触 overview/renderer DOM 时) e2e + CDP/截图复盘请用户裁定 taste。
**逐组件视觉验收强制** (见 friction 20260617-per-component-visual-review)。
