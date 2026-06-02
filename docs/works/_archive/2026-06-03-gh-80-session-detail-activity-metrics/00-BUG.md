# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源: `docs/issues/2026-06-02-BUG-session-detail-activity-metrics.md`

## 描述

- 会话详情页 token 速率计算不准确。
- 使用的 skills、MCP 和触发 hooks 有时显示不正确。

## 复现步骤

- 打开包含多条消息、工具调用、skills、MCP 或 hooks 的会话详情。
- 对照原始会话数据检查 token 速率和相关资产识别。

## 期望 vs 实际

### 期望

- token 速率按可靠的时间范围和 token 字段计算。
- skills、MCP、hooks 的识别来源可解释, 与原始会话事件一致。

### 实际

- 当前 token 速率被认为错误, skills / MCP / hooks 识别也存在不稳定情况。

## 初始解决方向

- 先补原始会话样本和单元测试。
- 明确 token rate 的定义, 避免用不可靠时间戳或不完整 token 字段计算。
- 将 skills / MCP / hooks 识别改为可测试的解析器逻辑。
