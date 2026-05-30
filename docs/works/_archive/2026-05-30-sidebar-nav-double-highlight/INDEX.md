---
task: 2026-05-30-sidebar-nav-double-highlight
type: bug
jira:
phase: archive
created: 2026-05-30
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
---

# 侧边栏导航双高亮修复

侧边栏 "Claude Code" 与 "Sessions" 两个导航项在 `/sessions` 下同时高亮。harness 第 2 个真实 dogfood。

## 产物
- [x] source: 00-BUG.md (含证据 bug-screenshot.png)
- [x] 01-ANALYSIS.md — 根因: 两导航项共享同一路由 /sessions
- [x] 02-SPEC.md — 决策: 删除占位项 (最小修复)
- [x] 03-PLAN.md

## 状态
archive。修复已提交 ( edc7561); 自动门禁全绿 (typecheck=0 / lint=0 / test 54 通过, 含 nav-config 路径唯一性回归); i18n 死键已清。
视觉 (验收标准 5): 运行实例截图已发用户目视确认 (本 session 工具通道损坏, Agent 端无法渲染图像)。修复为确定性删除, 逻辑上 `/sessions` 仅 Sessions 命中 isActive。若用户目视发现异常则 verify 退回 implement。
gh item 置 Done。

## gh project
Caldis/berth project #6 (https://github.com/users/Caldis/projects/6)
item "sidebar-nav-double-highlight: 侧边栏 Claude Code/Sessions 双高亮", 状态 Todo
(item id PVTI_lAHOADXbEs4BZHvQzguOSWQ; 实施完成后置 Done)
