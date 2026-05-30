# 工程摩擦记录

## 发生阶段
new (任务进入前的入口判定)。

## 现象
用户给出 bug 修复任务 (侧边栏 Claude Code 与 Sessions 同时高亮)。Agent 未经 `/opsx:new` 建任务态, 直接 Read/Bash 进入调试。用户中断并以条件命题质询: 走了 harness 则可, 未走则说明 harness 指引存在缺陷。

## 工程师介入动作
用户 "稍等" 中断, 质询入口合规性, 将 Agent 行为作为 harness 指令质量的检验。

## 应沉淀的上下文或规则
1. AGENTS.md 的 `AI NATIVE WORKFLOW HARNESS` 章节为纯描述: 列出命令与目录, 无任何强制祈使。它是该文件 8 个治理章节中唯一缺 "必须" 的 (TEST / BUILD_ENV / EVOLUATION 均有硬性触发)。
2. `.agents/README.md` 的 "调用" 节只述 how to invoke, 不述 when must enter; `_shared.md` 的阶段门禁仅在进入工作流后才生效。进入工作流本身被留给 Agent 裁量。
3. 全局 `using-superpowers` skill 主动将 "接到任务该做什么" 拉向其自有流程 (brainstorming / debugging), 且该 skill 自身声明 AGENTS.md 优先级高于 skill。故 AGENTS.md 一旦有硬触发器即可压过该默认; 缺触发器才让 skill 默认生效。
4. 合规若依赖裁量而非绑定触发, 该指令即欠定义。入口触发器必须落在 always-loaded 表面 (AGENTS.md), 不能只放在仅进入后才读的 playbook 里。

## 建议的流程改进 (已落地)
1. AGENTS.md harness 章节新增 "何时进入 (强制)": feature / bug 落代码前必须 `/opsx:new`; 平凡改动 (单行 / 拼写 / 纯文案注释, 无需根因分析与验收) 豁免; 存疑默认走 harness; 进行中任务用 `/opsx:continue`。
2. `.agents/README.md` 同步新增 "何时进入" 节, 与 AGENTS.md 对齐。
3. `docs/friction/_template.md` 的 phase 枚举注释从 4 个补齐为 8 个 verb, 与 `harness-check` 的 `FRICTION_NAME` 正则对齐。
