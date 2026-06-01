# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源: https://github.com/Caldis/berth/issues/17

## 复现步骤

1. 将某 `.agents/workflow/<verb>.md` 截断为 0 字节, 跑 `pnpm harness:check`。
2. 检查 `docs/works/_archive` 与 `docs/friction/_archive` 是否被 git 跟踪。

## 期望 vs 实际

期望:

1. 空 playbook 应报错, 因为 workflow playbook 是操作真源。
2. 两个 `_archive` 目录应存在于版本库。

实际:

1. `checkWorkflowSources` 仅用 `existsSync`, 0 字节文件通过校验。
2. git 不跟踪空目录, 两个 `_archive` 未提交; archive 运行时会 `mkdir -p`, 功能无碍但初始仓库结构不完整。

## 原始解决方案

1. `checkWorkflowSources` 增加非空或含 `# harness-<action-id>` 头断言。
2. 为两个 `_archive` 目录各加 `.gitkeep`。
3. 孤儿 playbook 检测已完成, 不在本次范围。

