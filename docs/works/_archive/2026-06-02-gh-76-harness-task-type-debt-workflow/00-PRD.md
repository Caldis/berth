# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
- GitHub Issue: https://github.com/Caldis/berth/issues/76
- 用户设计确认: 2026-06-02 对 harness 增加 task type / maintenance subtype / source / debt estimate-final-revision / GitHub Project 字段同步。

## 正文

为 harness 增加任务分类和技术债计分机制。

核心需求:
- 任务类型扩展为 `feature | bug | maintenance`。
- `issue` 和 `friction` 不作为 maintenance subtype, 改为 source 来源。
- maintenance subtype 使用 `ui-ux | performance | architecture | testability | tooling-ci | dependency | docs`。
- debt 不在任务开始时一次性定死, 需要支持 estimate -> final 的逐步校准, 并记录重要 revisions。
- debt pool 从各任务 `INDEX.md` 聚合计算, 不写共享总文件, 以减少多 Agent 并发冲突。
- debt 高于阈值时提示 maintenance, 但用户可覆盖; 高风险覆盖需要记录原因。
- 本地 `INDEX.md` 是唯一可信状态源。
- GitHub Project 要同步 task type、priority、时间、debt、scope、risk 等字段; 同步失败不能伪装成功。
