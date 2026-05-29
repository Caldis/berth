# 工程摩擦记录

## 发生阶段
implement (macOS 红绿灯避让的样式实现)。

## 现象
用户指出: 首版修复 (`h-[72px] pt-[26px]`) 样式欠佳 — 红绿灯距离 logo 图标过近 (实际 gap 仅约 7px,
因 items-center 把图标拉回顶部), 没有保留合适间距。Agent 当时凭数值拼凑, 未用设计 skill 指导。

## 工程师介入动作
用户截图指出间距问题, 要求用 `/frontend-design:frontend-design` 指导优化。
Agent 重做: 废弃 pt hack, 改为"为红绿灯预留专用拖拽带 (h-9, 与主内容区 app-layout.tsx 顶部 drag strip 同高,
实现全窗口顶部对齐)" + logo header 恢复自然 h-14, 红绿灯与图标间距增至约 22px。

## 应沉淀的上下文或规则
1. UI 改动 (布局/间距/样式) 必须用 `/frontend-design:frontend-design` 指导设计判断, 不靠拍脑袋调数值。
2. 间距/对齐要有明确依据: 与既有元素对齐 (本例对齐主内容区 36px drag strip)、符合平台 HIG (macOS 红绿灯
   y=16 + 12px 按钮, 底边 y=28, 留 ~22px 呼吸间距)。
3. `items-center` + `pt` 会把内容重新垂直居中, 抵消 pt 的下推意图 — 预留空间用独立 spacer 更可控。

## 建议的流程改进 (已落地)
.agents/workflow/verify.md 步骤 3: UI 视觉验收必须用 /frontend-design 指导, 间距/对齐需有依据。
