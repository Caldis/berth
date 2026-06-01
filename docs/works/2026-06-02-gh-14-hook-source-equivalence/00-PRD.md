# PRD 快照 (只读)

来源: https://github.com/Caldis/berth/issues/14

# Hook Source Equivalence

同一个 Hook 可能同时来自 user、project、plugin、managed 或 Codex inline config / `hooks.json`。用户在 UI 中点“禁用”时, 当前操作往往只影响当前来源。如果另一个来源仍有等价 Hook, 实际效果可能不是用户以为的“这个 Hook 已经不运行”。

## 需要改进

- 扫描阶段为等价 Hook 写入 `equivalentSources`。
- Codex inline hooks 与 plugin `hooks.json` 出现同类 Hook 时, 能标记为等价来源。
- Claude Code user / project / managed 等来源出现同类 Hook 时, UI 能提示“当前操作只影响 user source”。
- 生命周期页区分:
  - `enabled`: 当前这条注册是否启用。
  - `effectiveEnabled`: 是否仍可能因其他来源生效。
- 禁用后若仍有其他来源生效, 行内 tag 或详情中必须说明原因。
