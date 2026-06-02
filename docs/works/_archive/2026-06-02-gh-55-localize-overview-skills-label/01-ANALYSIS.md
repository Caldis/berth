# Explore

## 现状

- 真实 Electron 截图显示中文总览页统计卡仍展示 `Skills`。
- `src/renderer/src/i18n/locales/zh.json` 中 `overview.stats.skills` 当前值为 `Skills`。
- 同一组统计卡里 `overview.stats.plugins` 已为 `插件`, `sessions` 标签已显示 `会话`。
- `Overview` 组件通过 `t('overview.stats.skills')` 渲染, 只需修中文资源。

## 验收标准

1. 中文总览统计卡不再显示英文 `Skills`。
2. 英文资源保持现状, 不影响英文界面。
3. Renderer 测试覆盖中文 `Overview` 渲染。
4. 本地检查、harness 检查、Project 状态审计和 GitHub Actions 均通过。
