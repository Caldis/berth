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
- [x] U7 空隙回填 → **真·瀑布流已落地** (commit 169b4ff): CSS-Grid row-span masonry (grid-auto-rows:1px + ResizeObserver 测内容高算 gridRowEnd + items-start 防反馈回环) + grid-flow-row-dense。无需绝对定位/JS bin-packer, dnd-kit sortable 不受影响。
  - **lead 独立 CDP 复测 (量化, 勿只信"收敛至 28px"的笼统说法)**: 普通变高 widget 已紧排至 28px 间距 (行轨道对齐死白确已消除, 核心目标达成)。但 full-width (Wide/XL) 屏障上方残留**可观**间隙: 默认布局 (10 widget) 实测单洞约 235px; 全 15 widget 显示时最大约 579px (Models→Usage 132px、Recent sessions→Growth 579px)。成因: col-span-4 屏障强制清空所有列, 其上方较矮列无小 widget 可回填即留洞, 是 CSS-grid dense + dnd-kit rect sortable 约束下的**固有**残留, 非 bug。
  - **工程判定**: 要 100% 消除须改 JS 绝对定位 bin-packer (Pinterest 式), 会破坏 dnd-kit 的 rect 碰撞排序 + DOM 阅读序 + 入场动效, 代价远大于收益 → **接受此残留**。缓解只能靠减少 full-width 默认 widget 数 (设计取舍, 属用户决策) 或把 full-width widget 排在布局顶部 (其上无内容则无洞)。
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
- [x] token-breakdown: 堆叠条 / 饼图 / 空心饼 (donut) 切换 (commit 7427e29)
- [x] usage-trend: 柱状 / 折线 / 面积 切换 + 尺寸驱动密度 (commit aa006ae, 面积形态已实测渲染)
- [x] model-distribution: 横条榜 / 饼图 / donut 切换 + M5/L8 密度 (commit aa006ae)
- [x] 抽象可复用 `<ChartTypeToggle>` + useChartForm (受控/非受控) + chartType 并入 layout 持久化 + 单测 (commit 7427e29)
- 范围 (range/days) 暂留组件本地态, 未并入 layout 持久化 (避免本轮过度扩 schema)。

### R2-C 维度/组件丰富度
- [ ] 评估补充更多维度 widget (如: 每日/每周活跃时段、cost 趋势分模型、skill/mcp 增长、agent 对比等) — 视数据可得性
- [ ] 各 widget 多形态组合

### R2-D 架构级 (都要做)
- [ ] U5 drag-out: dnd-kit 跨容器 (gallery DndContext 与 grid 共享), 从画廊直接拖入网格 (现为点击取用)
- [x] U7 真·瀑布流 (commit 169b4ff): CSS-Grid row-span masonry — grid-auto-rows:1px + 每项 ResizeObserver 测内容高算 gridRowEnd span + grid-flow-row-dense 回填; items-start 使项盒=内容高避免测量反馈回环。dnd-kit sortable 零改动兼容。CDP+app e2e 14/14 验证通过。

### R2-E 超额交付 (举一反三 — 用户中途显式授权 "我说一你做5, 给我惊喜")
见 friction 20260617-extrapolate-beyond-literal-ask + memory user-wants-extrapolative-delivery。
把每个显式需求当意图样本, 围绕统一主题系统扩展 (非散点堆功能), 主动做用户没说但顶尖专家会做的。
主题: **让仪表盘"活起来" + 尺寸即信息设计**。
- [ ] T1 尺寸即信息设计 (推广 R2-A): S=速览 hero (单值/Top-3, 去 chrome) · M=紧凑 · L=丰富
      (更多条目 + 更大图 + 轴/网格细节)。给所有适用 widget 补 S, 让 S/M/L 是三种**信息密度设计**
      而非仅宽度。已: usage-trend(M/L/Wide 高度+轴密度)、model-distribution(M5/L8)。
- [ ] T2 让数据活起来: 环比 delta (本周期 vs 上周期 ▲▼%) + sparkline 注入指标卡; (依赖 Explore 数据可得性结论)
- [~] T3 新维度 widget (Explore 已给可行性图): 已落地 6 个新维度, 刻意分散视觉形态避免重复 —
      ① 活动节律 hour×weekday punch-card (fe684e5); ② 会话时长分布 histogram (c4717bb);
      ③ 累计增长曲线 area (c5ed81e); ④ Token 强度 tokens/session 分模型 bar (948d173);
      ⑤ 项目分布 byProject 份额 (2a7d986, 并发 agent 交付); ⑥ 模型趋势 tokens 分模型**堆叠面积**
      (engine buildModelTrend 85dbec3 + widget 41c72f9, 仪表盘首个"随时间堆叠"形态)。
      各为纯函数聚合 + 单测 + 全链路注册 (catalog/registry/types/i18n/layout-test)。
      候选续做: skill/mcp 增长 (现成数据)、模型成本趋势分模型 (跨层, 较重)。
      CDP 视觉验收: model-trend 已与 U7 masonry 合并实测 — 6 段堆叠面积真数据渲染正确 (claude-opus-4-8 等 5 模型 + others, 25/30 天有数据)。
- [x] T4 形态切换推广: token-breakdown / usage-trend / model-distribution 已接入可复用 ChartTypeToggle + 持久化。
- [ ] T5 交互/动效升级: 布局预设 (Focus/Analytics/Minimal 一键)、per-widget 设置 popover (维度+范围+形态集中)、
      重排 FLIP 动效、U5 拖出。(U7 真瀑布流已完成, 见 R2-D。)

### 执行方式 (context 友好)
- 用子代理做**逐组件设计评审**: 子代理读单个 widget 源 + 返回简明 findings (尺寸/留白/美学/形态建议), 主 Agent 落地, 不把大段分析灌入主上下文。
- 视觉验收用 CDP **逐组件**截图 (dev:agent + 9335+ 端口, 单 widget 聚焦), 不只截整页。
- 落地仍小步提交 + (触 renderer DOM) build+e2e + 全套件; widget 内部改动 e2e 安全。
- chartType/size 状态优先并入 `lib/dashboard-layout` 的 widget 配置 (持久化) — 改 schema 时同步 migrate + 单测。

## 验证
每批改动: typecheck/lint/单测 + (触 overview/renderer DOM 时) e2e + CDP/截图复盘请用户裁定 taste。
**逐组件视觉验收强制** (见 friction 20260617-per-component-visual-review)。
