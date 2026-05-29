# 工程摩擦记录

## 发生阶段
optimization (任务收尾沉淀知识时)。

## 现象
Agent 把 berth 的项目知识 (构建约束、harness 总览、工具行为事实、反馈准则) 写进了 Claude 会话私有的
`~/.claude/projects/.../memory/`。用户指出: 这造成"项目知识却存在项目外"的割裂 — Codex 读不到、不能随仓库
提交交接、新人 clone 拿不到, 与 harness "知识落仓库" 的核心理念冲突。

## 工程师介入动作
用户要求将所有 memory 转移到项目内: 有意义的落为指令/约束, 无意义的删除。
Agent 逐条判定 4 条 memory:
- berth-build-env → 落 AGENTS.md BUILD_ENV 段 (指令)
- ai-tool-command-distribution → 落 .agents/references/ (约束/参考)
- berth-harness → 删 (重复 .agents/README.md)
- harness-feedback-loop-behavior → 删 (已在 AGENTS.md EVOLUATION + _shared.md 不变量 6)
清空 MEMORY.md 并注明"知识一律落仓库"。

## 应沉淀的上下文或规则
本项目知识沉淀一律落仓库 (双工具可见、可提交、可交接), 不写会话私有 memory。判定: 有复用价值→指令
(AGENTS.md) 或参考 (.agents/references/) 或摩擦 (docs/friction/); 无价值→不写。

## 建议的流程改进 (已落地)
- 全部 memory 已迁移/删除, MEMORY.md 注明约定。
- 该约定本身随本仓库提交, 后续 Agent 与 Codex 均可见。
