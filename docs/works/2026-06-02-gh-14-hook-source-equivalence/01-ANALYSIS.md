# 需求分析 (Explore 产物)

## 现状理解

- hook parser 已经写入 `scenarioHash`, `hookHash`, `hookKey`, `enabled`, `managed`, `toggleStrategy`。
- `AssetScanner` 现在只是拼接各 adapter 的 assets, 没有跨 source 后处理。
- Hooks 生命周期 UI 只展示当前行的 enabled/disabled, 没有 effectiveEnabled。

## 官方依据

Claude Code 与 Codex 都支持多位置 Hook 来源。Claude Code docs 明确 hooks 可以来自用户、项目、managed policy、plugin、skill/agent; Codex docs 明确多个匹配 hook 文件会同时运行。参考:
- https://code.claude.com/docs/en/hooks
- https://developers.openai.com/codex/hooks

## 验收标准

1. 扫描完成后, 同 agentId + scenarioHash + hookHash 的 hook assets 会写入 `equivalentSources`。
2. 同组 hook 写入 `equivalentSourceCount` 和 `effectiveEnabled`。
3. `effectiveEnabled` 为同组任一来源 enabled 时 true; 所有来源 disabled 时 false。
4. Hooks 生命周期行显示本来源 enabled/disabled, 并在有等价来源时显示 source count。
5. 当本来源 disabled 但 `effectiveEnabled` 为 true 时, 行内风险提示说明仍会由其他来源生效。

## 界面质量与交互验收

- 不增加新的视图切换。
- 等价来源信息使用紧凑 tag + hover title, 不平铺大块解释。
- 风险提示继续使用现有 HookRiskHints 区域。

## 未决问题

无。
