# 描述
- 会话列表右侧每行都渲染 token 徽标, 但大量 Codex 会话解析不到 token 数, 整列显示 `0 tok` (2026-07-10 本机实测: 根目录分组 18 行全部 `0 tok`), 无信息量且加重视觉噪音。

# 重现步骤
- 本机存在未解析出 usage 数据的 Codex 会话。
- 打开 Berth 会话页任意分组。

# 预期结果
- token 数为 0 / 缺失时不渲染该徽标 (或渲染成占位的 `—`), 有真实数据时才显示。
- (可选深挖) 确认这些 Codex rollout 是否本应解析出 token — 若是解析缺口, 另立 BUG。

# 实际结果
- 每行都显示 `0 tok`。

# 解决方案 (已完成 2026-07-10)
- `SessionRow` 对 `tokenUsage.totalTokens <= 0` 不渲染 TokenSparkBar (列宽保留对齐), 与 cost 列缺数据留空一致; 补 sessions-pages 单测 (零 token 会话行无 `0 tok`), CDP 实测本机 Codex 会话列噪音消失 (commit 3fb51a49)。
- 未覆盖的深挖项: 这些 Codex rollout 是否本应解析出 token — 如后续确认为解析缺口, 按原计划另立 BUG。
