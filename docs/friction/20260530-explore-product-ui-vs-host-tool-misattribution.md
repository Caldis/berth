# 工程摩擦记录

## 发生阶段
explore (任务起步定位问题时)。

## 现象
用户说"目前 [指令] 下面的 [记忆] 都是空的, 请排查问题"。Agent 把 [指令]/[记忆] 误判为
**Claude Code 宿主本体**的记忆/指令上下文, 花大量步骤去查 `~/.claude` 原生 memory、united-memory
插件内部、SessionStart hook 等宿主侧实现。实际上 berth **本身就是一个看板类产品**, 用户指的是
**berth 产品 UI 里的"指令"页 / "记忆" tab** (instructions.tsx)。方向偏了一大圈才被用户的后续澄清
("将 mem 的数据接入层做成可替换 adaption 层") 拉回产品代码。

## 工程师介入动作
用户通过追加诉求隐式纠正了目标; Agent 随后改为先在 berth 源码 (instructions.tsx / adapters /
ipc) 定位"记忆"面板的真实数据来源, 才找到根因 (tab 仅映射 claude-md/agents-md、无记忆数据源)。

## 应沉淀的上下文或规则
当**本项目自身就是"工具/IDE/看板/companion"类产品**时, 用户用方括号或口语指代的
"[X] 面板 / [Y] 视图 / 某某是空的", **默认先指 berth 产品自身的 UI/功能**, 而非 Claude Code /
harness / 宿主环境的同名概念。定位顺序: 先在**产品源码** (src/renderer 页面 + src/main 数据层)
搜对应 UI 与其数据链, 确认确实不是产品问题后, 再外扩到宿主/环境。可一句话向用户确认指代对象,
成本远低于查错对象。

## 建议的流程改进
- explore 起步先问/判: "这是 berth 产品里的 X, 还是宿主环境的 X?" 再展开。
- 对"看板/companion"类产品, 任何"显示为空/不对"类反馈优先走"产品 UI → 数据层"链路定位。
