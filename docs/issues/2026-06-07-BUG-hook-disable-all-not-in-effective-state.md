# 描述
- hook 资产一律 `effectiveEnabled: true` (或仅由 enabled/disabledByBerth 决定), 未反映 Claude settings 的 `disableAllHooks` 全局开关; 目前只有 statusline 解析处理了 `disableAllHooks`。用户开启 disableAllHooks 后, 界面仍把 hooks 显示为有效。

# 证据
- `src/main/adapters/claude-code/parsers.ts` hook 解析 (~273-345) 未读取 `disableAllHooks`; statusline (~563-565) 处理了。
- `src/main/engine/scanner.ts annotateEquivalentHookSources` 仅按 source enabled 聚合, 不涉及 disableAllHooks。

# 预期 / 建议
- hook parser 读 settings 的 `disableAllHooks`, 显式写 `disabledByDisableAllHooks` / 修正 `effectiveEnabled:false`; UI 区分"单 hook 禁用"与"全局禁用"。

# 来源 / 关联
- Codex×Claude 对抗审查 (GH-111) Round-2 B#4; Tier-2。关联 `docs/works/2026-06-07-gh-111-scan-engine-review-hardening/` (R5)。
- 状态: OPEN。
