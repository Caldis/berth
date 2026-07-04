# REJECTED: 把 project-scope activate 改为对全局快照的纯 narrow-down 过滤 (跳过后台深扫)

- 裁决日期: 2026-06-20 (记入 rejected/: 2026-07-04, 播种新约定)
- 概念别名: activate 零扫描 / 切项目纯过滤 / narrow-down only / instant project switch without rescan

## 提案

切换项目 scope 时不触发任何扫描, 仅对已有全局快照做过滤 — 消灭 activate 路径的后台刷新。

## 耐久拒绝理由 (真权衡)

非活动项目当前仅浅索引 (root-level 约定 + 能力, 无嵌套 `**/*.md` / 深层 `.claude/`), 全局快照**不是完整深结果** — 纯过滤会静默丢失新激活项目的嵌套能力资产。**正确性 > 速度**。activate 已是 cache-hit 即时 + cache-miss 非阻塞后台刷新 (10s 阻塞卡顿已由 wait:false 消除并加回归守卫), 速度问题已解, 剩余差距只能靠"后台 deep-index 全部项目"从根上补齐 (见 active issue background-progressive-asset-indexer), 不能靠跳过扫描伪装。

## 何时可重开

后台 deep-index 全部项目落地、[全局] 成为真完整深结果之后 — 届时 narrow-down-only 自然成立, 无需单独提案。

## 出处

docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md「进展 (2026-06-20, 残项核实)」·「不做激进 narrow-down (有意 STOP)」。
