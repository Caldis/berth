# Explore

## 现状

- `src/renderer/src/components/shared/scope-badge.tsx` 是 scope 标签的共享入口。
- `ScopeBadge` 已被 Capabilities、Instructions、Session detail、Hooks lifecycle 等页面复用。
- 当前 scope 颜色仍包含 `blue` / `green` / `purple` / `zinc`; 其中前三个是分类色, 不是成功/警告/错误状态。
- 之前的黑白主题调整保留了状态色; 本任务只处理 scope category, 不触碰 warning/success/error 或 cost source 语义色。

## 设计判断

- 目标界面是本地 agent 管理工具, 高频扫描和判断优先; 分类标签只需要可读, 不需要抢视觉注意。
- scope 文本本身已经表达 user/project/enterprise/session, 再用强分类色重复表达收益很低。
- 中性标签能降低页面噪声, 同时不改变布局和交互。

## 验收标准

1. shared `ScopeBadge` 不再包含 `blue` / `green` / `purple` / `orange` category class。
2. 所有 scope 仍渲染对应本地化文本。
3. Instructions 等消费者不需要各自维护颜色表。
4. 不改变状态色、风险色和 cost source 色。
5. 本地测试、harness 检查和 GitHub Actions 均通过。
