# 工程摩擦记录

## 发生阶段
optimization

## 现象
用户指出: harness 已经有主动记录工程摩擦的机制, 但缺少等价规则来处理开发过程中发现的旁支产品问题。若问题不属于当前主线任务, agent 应主动记录到 `docs/issues/`, 而不是遗忘、顺手修, 或污染当前任务范围。

## 工程师介入动作
将规则补入 `.agents/workflow/_shared.md`, 并在 Explore / Implement / Verify playbook 与 `docs/issues/AGENTS.md` 中增加产生时机和处理边界。

## 应沉淀的上下文或规则
执行当前任务时, 若发现已验证的产品 bug、功能缺口或改进项, 且不属于当前主线验收范围, 必须主动写入 `docs/issues/`; 当前任务产物只保留交叉引用, 不顺手修旁支问题, 除非用户明确扩大任务范围。

## 建议的流程改进
已落地到 harness 共享契约与阶段 playbook。
