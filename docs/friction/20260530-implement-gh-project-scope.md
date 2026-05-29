# 工程摩擦记录

## 发生阶段
new / archive (引入 gh project 跟踪时)。

## 现象
harness 要求用 gh project 跟踪任务, 但当前 gh token 缺 `project` / `read:project` scope,
`gh project list/create/item-add` 全部失败。`gh auth refresh -s project,read:project` 是设备码
OAuth 流程, 必须人工在浏览器确认, Agent 无法在非交互后台完成 (echo y 喂不进, 且需 --hostname)。

## 工程师介入动作
用户在终端运行 `gh auth refresh -h github.com -s project,read:project` 完成浏览器授权。

## 应沉淀的上下文或规则
1. gh project 操作需 token 具备 project + read:project scope, 属一次性环境前置。
2. 此类需人工浏览器确认的授权步骤, Agent 必须 STOP 并请用户介入, 不得擅自 echo/超时重试。
3. harness 的 new/archive playbook 应显式列出 gh project 跟踪步骤与 scope 前置检查。

## 建议的流程改进 (已落地)
- .agents/workflow/new.md: 创建任务时新增 gh project item, 并前置 scope 检查 (无 scope 则提示用户授权, 不阻塞代码流程)。
- .agents/workflow/archive.md: 归档时更新 gh project item 状态为 Done。
- .agents/tools.md: 记录 gh project 能力与 scope 前置。
