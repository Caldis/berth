# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源: 用户反馈 + GitHub Issue https://github.com/Caldis/berth/issues/95

## 复现步骤

1. 打开会话详情页。
2. 查看 Overview 里的 Token 速率指标。

## 期望 vs 实际

- 期望: token 速率应基于可靠的会话活动时间计算; 当时间跨度不可靠或过短时, 不应显示误导性的巨大 `tok/min` 数值。
- 实际: 页面可显示类似 `663034.5 tok/min` 的离谱数值, 用户无法据此判断真实速度。
