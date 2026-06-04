# Polish

可选抛光阶段记录。本任务 verify 已全绿, 用户主动要求 Polish。**不自动改代码**, 候选项待用户勾选。

## 当前任务边界

- 负责: header 由悬浮(absolute overlay)改为普通块布局, 移除测高/偏移补偿链路; sticky 子导航 top 改 gutter。
- 文件: top-navigation.tsx, app-layout.tsx, globals.css, category-jump-nav.tsx, hooks-lifecycle-view.tsx; 对应 renderer 测试。
- 旁支(不在本任务): 各页业务内容、guide 弹层实现(GH-102 正在改 FloatingPopover)、虚拟列表、记忆页等。

## 候选项

按 (影响 × 成本 × 置信) 排序。debt 为预估增量, 负值=偿还。

### C1 — 清理 header 过渡中已失效的 `background-color` (建议进入, 重构孤儿)
- 现状: `top-navigation.tsx` header `transition-[opacity,background-color]`。块布局后 header 恒为 `bg-background`(已移除 `/80` 半透明切换), `background-color` 过渡永不触发。
- 改法: `transition-[opacity,background-color]` → `transition-opacity`。
- 影响: 代码清晰度; 无视觉变化。成本: 极低。置信: 高。debt: -1 (偿还孤儿)。
- tests: 现有 top-navigation/app-layout 测试不断言 transition 类, 安全; 视觉无变化。
- 建议: ✅ 进入 (属"清理自己改动造成的孤儿", 符合 Surgical Changes)。

### C2 — 移除内容外层 `<div>` 的 `relative` (建议进入, 重构孤儿)
- 现状: `app-layout.tsx` 第 63-66 行 wrapper `className="relative flex ... flex-col ..."`。`relative` 原是 `absolute` header 的定位父级; header 回归文档流后已无消费者。
- 验证: WindowControls 为 `fixed`(相对视口)且渲染在该 wrapper 之外; 页面内 `absolute` 元素(如 session-detail tooltip)相对各自最近定位祖先, 不依赖此 wrapper。故移除安全。
- 改法: 删 `relative` (保留 `flex min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-200`)。
- 影响: 移除无用定位上下文; 无视觉变化。成本: 低。置信: 中高 (建议实现时再 grep 一次确认无 absolute 后代依赖)。debt: -1。
- tests: app-layout 测试不断言该类; 实测截图回归(已验证布局)。
- 建议: ✅ 进入 (孤儿清理), 实现前再确认。

### C3 — 确认 guide 弹层在 header 失去 `z-20` 后层叠正确 (建议进入, 仅验证)
- 现状: 块布局移除了 header 的 `absolute ... z-20`。guide 弹层(GH-102 改为 `FloatingPopover`, 经 portal 逃逸裁剪)理论上层叠不受影响。
- 动作: 运行实例打开任意带 guide 的页(sessions/instructions/capabilities), hover/聚焦 guide 按钮, 确认弹层浮于内容之上、不被裁剪。
- 影响: 防止 z-index 回归。成本: 低(一次实测)。置信: 高(FloatingPopover 设计即为逃逸裁剪)。debt: 0。
- tests: top-navigation 单测已覆盖 guide 渲染逻辑; 本项为视觉层叠确认。
- 建议: ✅ 进入 (我的改动触及 header z 上下文, 应确认)。

### C4 — header 滚动态阴影深度提示 (可选, 偏新行为)
- 现状: 旧悬浮 header 用 `backdrop-blur` 提供"内容从下方滚过"的深度暗示; 块布局改为静态 `border-b`, 深度暗示减弱。
- 改法: 监听 `<main>` 滚动, scrollTop>0 时给 header 加细微底部阴影(`shadow-[...]`), 顶部时仅 border。
- 影响: 视觉深度/质感提升。成本: 中(新增滚动监听 + 状态)。置信: 中(taste 判断, 也可能用户更偏好极简平边)。debt: +2 (新增行为/监听)。
- 评估: 这是**新增交互行为**而非清理本次重构, 边界偏外。建议: ⚠️ 若用户想要再做; 否则记入 `docs/issues/` 作为 IMPROVEMENT, 不混入本任务。
- 建议: 默认不进入 (倾向最简平边; 如需深度感可单列 issue)。

### C5 — 简化 hidden 态 opacity 逻辑 (可选, 低价值)
- 现状: header `isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'`; 实际所有真实路由 isVisible 恒真(未知路由会重定向), hidden 态近乎死代码。
- 改法: 可保留(无害, 防御未知路由)或简化。
- 影响: 极小。成本: 低。置信: 中。debt: 0~-1。
- 建议: ⏭️ 跳过 (保留防御性逻辑, 改动收益极低)。

## 用户选择
用户勾选 **C1 + C2** (两处重构孤儿清理)。C3 (验证, 未选, 由 FloatingPopover 设计 + 单测覆盖)、C4 (滚动阴影, 偏新行为, 如需可单列 issue)、C5 (跳过) 均不进入。
- 已实现 C1/C2 (见 03-PLAN P1/P2); typecheck/lint/目标测试绿; 纯类名孤儿清理, 零视觉变化, 沿用已验证布局截图。
- phase 临时回 implement 执行, 完成后回 verify; debt.final repaid 5->7, net -6。
