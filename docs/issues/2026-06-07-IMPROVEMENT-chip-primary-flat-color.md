# 描述
- 用户反馈: 多处信息型 tag 使用"灰底蓝字"配色(HeroUI `Chip color=primary variant=flat` —
  低饱和 primary/20 底 + primary 蓝字), 视觉突兀且与相邻 `neutral` chip 不一致。
- 出现位置: memory `SourceBadge`(来源名 chip)、capabilities 插件卡"N 个组件"计数 chip、
  扫描进度弹层类目计数 chip(GH-110 P4.6 引入)。

# 重现步骤
- 打开 记忆 / 插件页, 观察来源徽标与组件计数 chip 呈灰底蓝字。

# 预期结果
- 信息型 chip 安静一致(neutral 灰底 + 前景文本), 不使用低对比灰底蓝字。

# 实际结果
- primary flat 渲染为灰底蓝字, 与同卡片 marketplace/子组计数(neutral)割裂。

# 解决方案 / 状态
- 已修复 (GH-110, 提交 91a6cad4): 三处信息型 chip 由 `tone=primary` 改 `tone=neutral`,
  与 marketplace / 子组计数 / AssetCountChip 既有约定对齐。`primary` 语义保留供未来真正
  需要强调处使用, 但信息型计数/名称 chip 不再用之。
- 状态: **RESOLVED**。
