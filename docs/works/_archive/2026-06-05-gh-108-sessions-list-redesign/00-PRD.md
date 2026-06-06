# 00-PRD — 会话列表重设计 (只读输入快照)

> 本文件为只读输入快照, 任何阶段不回写。

## 用户请求 (原文)
> 请优化 [会话] 页面右侧的设计, 并深入看看这里如何能重新设计并利用 heroui 库中的组件可视化呈现更多有效数据, 让列表更加易用。

附: 会话页面截图 (Image #2)。

## 截图所示现状
- 页面: 左侧主导航 "会话" 选中; 顶部页头含 "分组: 项目 / 日期" 切换、帮助按钮、"筛选会话…" 搜索框 (⌘K)。
- 主区: 左列 `CategoryJumpNav` (项目跳转锚, 根目录/Desktop/Code 下各项目带计数); 右列虚拟分组列表。
- 每个会话行: 标题 (如 "Codex Session 019e91d1")、相对时间 + 时长、agent 标识 (Codex)、一个链接图标 + "—"、token 概览 (`# 10.9M tok · 入 5.5M / 出 20.2k`)、model chip (`gpt-5.5`)。
- 分组头: 文件夹图标 + 组名 (如 "根目录 /"、"berth") + 路径副标题 + 右侧计数。

## 目标 (用户意图拆解)
1. 重设计会话行视觉与信息结构, 用 HeroUI 组件替换手写 button/span/chip。
2. 可视化呈现 "更多有效数据" — 暴露当前已采集但未展示的字段。
3. 提升列表易用性 (信息层级、扫读效率、交互反馈、密度)。

## 约束与背景 (待 explore 验证, 非快照承诺)
- 已采集但未呈现的 `SessionSummary` 字段: `skillsUsed[]`、`mcpServers[]`、`hooksFired`、token 细分 (input/output/cacheRead/cacheCreation/reasoning)、`endedAt`、`transcriptPath`。
- 列表为虚拟滚动 (`VirtualGroupedList`, `defaultItemHeight=72`); 行高调整需同步虚拟化测量。
- HeroUI v2 + 共享 `components/ui` DS 层已由 GH-105 引入, 应复用而非另起。
