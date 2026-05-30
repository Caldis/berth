# 工程摩擦记录

> 命名: docs/friction/{YYYYMMDD}-{phase}-{summary}.md (phase: new|continue|explore|design|implement|verify|archive|optimization)
> 不与 Jira 关联, 不拆子目录。优化后移入 _archive/。

## 发生阶段

verify

## 现象

侧边栏任务的 Windows Electron 截图验收过程中, 已经遇到并验证了两个可复用问题: `_electron.launch()` 返回进程没有主窗口句柄, 以及高 DPI 下普通窗口矩形不能直接用于屏幕裁剪。但当时只把它当作当前验收脚本问题继续处理, 没有在问题被确认后立即写入 `docs/friction/`。

## 工程师介入动作

用户追问后, 已补写 `docs/friction/20260530-verify-windows-electron-dwm-screenshot.md`, 并把 Windows Electron 截图规则补进 `.agents/workflow/verify.md`。

## 应沉淀的上下文或规则

harness 工作流里, 一旦问题被验证为可复用工程摩擦, 不应等到最终复盘或用户追问才记录。应在继续后续验证前先写 friction, 同步必要 workflow 规则, 并跑 `pnpm harness:check`。

## 建议的流程改进

verify 阶段增加显式检查点: 遇到工具链 workaround、截图/进程/环境类问题、或用户纠正后, 先沉淀 friction 并验证沉淀产物, 再继续最终汇报。
