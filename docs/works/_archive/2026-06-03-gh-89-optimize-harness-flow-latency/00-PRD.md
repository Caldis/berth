# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
- 用户请求, 2026-06-03
- GitHub Issue: https://github.com/Caldis/berth/issues/89

## 正文
- 希望优化 harness 流程。
- Project 同步与远端 CI 等非本地任务应每次由子代理完成, 不阻塞主流程; 若发现问题再反馈主线程修复。
- 分析 prepush 主要耗时来源, 特别是 Vitest 是否可以加速; 相关优化也可由子代理处理。
- 任务态写作/同步固定成本与 UI 类 Electron/截图/交互验证必须由主 Agent 完成。
