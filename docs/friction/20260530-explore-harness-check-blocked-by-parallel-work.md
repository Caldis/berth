# 工程摩擦记录

## 发生阶段
explore

## 现象
当前任务新建后执行 `pnpm harness:check` 时, 全局检查失败在并行任务 `docs/works/2026-05-30-memory-source-adapter-layer`: `phase=explore requires 00-PRD.md`。这不是当前任务产物错误, 但会阻止当前任务按规则提交已验证的新建任务增量。

## 工程师介入动作
未修改并行任务文件。继续推进当前任务的 explore/design 产物, 并在提交前复查全局 harness 状态。

## 应沉淀的上下文或规则
在多 agent 同一工作区并行时, harness 的全局检查会被其他未完成任务态影响。当前 agent 只能验证自身目录结构, 不能擅自补齐或移动其他 agent 的任务文件。

## 建议的流程改进
为 `harness:check` 增加可选 `--work <task>` 或 `--changed-only` 模式, 允许提交当前任务的合规产物时不被并行未完成任务阻塞。全局检查仍保留在总验证阶段。
