# 工程摩擦记录

> 命名: docs/friction/{YYYYMMDD}-{phase}-{summary}.md (phase: new|continue|explore|design|implement|verify|archive|optimization)
> 不与 Jira 关联, 不拆子目录。优化后移入 _archive/。

## 发生阶段

verify

## 现象

侧边栏设置弹窗任务已经完成实现、测试和视觉验收, 但最终停在未提交工作区。harness 的 `implement` 阶段要求“频繁提交”, `archive` 阶段也要求“提交代码”。如果 verify 完成后还需要用户确认再进入 archive, 也应该在最终说明中明确当前仍未提交, 等待 archive/commit。

## 工程师介入动作

用户追问后, 重新核对 `.agents/workflow/implement.md`、`.agents/workflow/verify.md`、`.agents/workflow/archive.md`, 确认这是阶段收尾执行缺口。当前轮将补充 workflow 规则, 并对本次相关改动做精确暂存和提交。

## 应沉淀的上下文或规则

完成可验证阶段后不能默默停在未提交状态。若已完成任务验收, 应进入 archive 并提交; 若由于 verify 需要用户确认而暂不 archive, 最终说明必须明确“尚未提交, 等待确认后 archive/commit”。

## 建议的流程改进

在 verify 步骤末尾加入提交边界: verify 通过后若用户已确认或明确认为任务完成, 立即执行 archive 的归档和提交; 若未确认, final 必须显式说明未提交与下一步。
