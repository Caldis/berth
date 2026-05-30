# 工程摩擦记录

## 发生阶段
optimization

## 现象
用户要求 harness 明确: agent 应尽可能频繁提交, 但每次只能提交和自己相关的部分。

## 工程师介入动作
将规则补入 `.agents/workflow/_shared.md`, 并在 Implement / Archive playbook 与根 `AGENTS.md` 中写明提交前必须只暂存相关文件并核对 staged diff。

## 应沉淀的上下文或规则
已验证、边界清楚的增量应尽可能频繁提交; 每次提交前只暂存自己相关文件, 用 `git diff --cached` 核对 staged 集合, 不提交无关工作区改动。

## 建议的流程改进
已落地到 harness 共享契约、阶段 playbook 与入口规则检查。
