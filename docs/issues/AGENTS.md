> 说明: 产品缺陷、功能请求与改进项统一存放在 `docs/issues/`。开发过程中的工程摩擦
> (卡顿/手动补的上下文/被迫修正) 记入 AI Native Workflow 的
> `docs/friction/{yyyymmdd}-{action-id}-{summary}.md`, 由 `harness-5.1-optimization` 消费。
> 本目录与 works/friction 只做交叉引用, 不承载任务 phase 状态。

# ISSUES
本目录存放发现的 bug、需要改进的功能、以及其他任何需要跟踪的问题
- 每个 issue 按照 {YYYY-MM-DD}-{BUG|FEATURE|IMPROVEMENT}-{SHORT_DESCRIPTION}.md 命名
- 创建时, 按照模板填充 issue 内容
- 完成后, 移入 resolved 目录, 并补充完成日期和解决方案简述

## 产生时机
- 用户直接提出产品 bug、功能请求或改进项。
- Agent 在 Explore / Implement / Verify 过程中发现已验证的产品问题, 但它不属于当前主线任务验收范围。
- 当前任务只交叉引用该 issue; 不顺手修旁支问题, 除非用户明确扩大任务范围。

## 收敛
- 用 `pnpm harness:issues` 查看 active / resolved 数量和 active issue 列表。
- 用 `harness-5.2-issues` 收敛堆积: 已修复的移入 `resolved/`, 仍有效的转 GitHub Issue / work, 重复或过期的写明原因后移入 `resolved/`。
- archive 后只提醒可选清理, 不自动执行 issue 收敛。

# TEMPLATE
```
# 描述
- 简要描述问题或改进点
# 重现步骤
- 列出重现问题的步骤, 包括输入和环境
# 预期结果
- 描述预期的行为或结果
# 实际结果
- 描述实际发生的行为或结果
# 解决方案
- 简要描述解决方案或改进措施
```
