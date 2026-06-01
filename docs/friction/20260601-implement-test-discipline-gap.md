# 工程摩擦记录

> 命名: docs/friction/{YYYYMMDD}-{phase}-{summary}.md (phase: new|continue|explore|design|implement|verify|polish|archive|optimization)
> 可在正文交叉引用 task_id / issue, 不拆子目录。优化后移入 _archive/。

## 发生阶段
implement

## 现象
workflow 只在 `harness-implement` 用一句话要求“先写单元测试”, 但 `02-SPEC` / `03-PLAN` 模板没有要求每个实现项写清测试文件、测试命令和例外理由。Agent 容易在实现阶段只跑总体验证, 没有有意识地为具体功能补 unit / renderer / e2e / harness 测试。

## 工程师介入动作
用户指出“目前大部分任务在 implement 阶段并没有有意识地增加功能的单元测试, 这和预期目标不符”, 要求检查 workflow 中所有测试相关节点并找优化点。

## 应沉淀的上下文或规则
测试不能只放在 verify 阶段补跑。Design 阶段必须产出测试矩阵, Implement 阶段每个任务必须先写或更新目标测试, Verify 阶段必须审计每个实现项是否有测试证据或明确例外理由。

## 建议的流程改进
(由 harness-optimization 消费)
将 “每个实现项必须有测试证据或明确例外理由” 写入共享契约、design / implement / verify playbook 和 02-SPEC / 03-PLAN 模板, 并由 `pnpm harness:check` 检查该规则是否仍存在。
