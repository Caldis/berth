# 工程摩擦记录

## 发生阶段
new (gh project item 建立与置状态)。

## 现象
为任务建 gh item 后置 Todo 状态时, Agent 在 `item-edit` 用了一个**手敲/凭记忆的 item id** (`...zgvFB7g`), 而非 `item-create` 输出里返回的真实 id (`...zguOSWQ`)。结果 GraphQL 报 "Could not resolve to a node" 但命令 exit 0, 状态未设上, 需重做。此为上个 session 同类 gh id 错误的**复发**。

## 工程师介入动作
Agent 自查发现 id 不符, 改用"item-list --format json 按标题取回真实 id 再 item-edit"的脚本重做并复核 status=Todo。

## 应沉淀的上下文或规则
1. **gh node id (project/item/field/option) 一律从 `--format json` 输出取, 同一脚本内用 shell 变量传递; 严禁手敲或凭记忆填。** 错 id 触发 GraphQL "could not resolve" 却 exit 0, 属静默失败, 极易误判成功。
2. **元模式 (与 [[new-harness-entry-no-mandatory-trigger]] 同类)**: 该规则原已存在于 `.agents/tools.md` (reference) 第 47 行, 但实际执行的 `new.md` 步骤 7 (playbook) 未内嵌它; 执行时不回看 reference, 规则即落空。**规则必须落在使用点 (point-of-use) 才会被遵守, 放在参考文档不够。**

## 建议的流程改进 (已落地)
1. `.agents/workflow/new.md` 步骤 7 内嵌 gh id 取值纪律: 用 `item-create --format json`; id 全部从 create/list 的 json 输出经 shell 变量传递, 禁手敲; item-edit 后 item-list 复核 status。
2. tools.md 第 47 行规则保留 (已正确), 作为 reference; 真源执行点在 new.md。
