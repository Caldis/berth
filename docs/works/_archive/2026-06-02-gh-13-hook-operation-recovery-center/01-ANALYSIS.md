# 需求分析 (Explore 产物)

## 现状理解

- `src/main/engine/hooks-manager.ts` 已负责 Hook 启用/禁用。Claude Code 单 hook 禁用通过从 `~/.claude/settings.json` 移除 handler, 再把原 handler 写入 `~/.claude/.berth/hooks-state.json`。
- 当前恢复入口在单个 Hook 行内, 用户只能在看到该 Hook 时恢复。若源文件缺失、sidecar 损坏、Hook 已被手动恢复或多个 Hook 被禁用, 页面没有集中解释。
- `src/shared/types/ipc.ts`、`src/preload/index.ts`、`src/main/ipc/handlers.ts` 只有 `hooks:status` / `hooks:statuses` / `hooks:set-enabled` / `hooks:set-hook-enabled`。缺少恢复点列表与清理 API。
- Hooks 页面主入口在 `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx`。这里已经有生命周期侧栏和单 hook 操作按钮, 适合增加轻量恢复中心, 不需要新页面。
- Renderer 测试已有 `tests/renderer/hooks-lifecycle-view.test.tsx`; 主进程 Hook 写入测试在 `tests/unit/hooks-manager.test.ts`。

## 官方文档复查

- Claude Code hooks 是 JSON settings 的三层结构: event -> matcher group -> handler。来源可包含 user/project/local/managed/plugin/skill/agent。官方 `/hooks` 菜单也是只读浏览器, 删除 Hook 需要改 settings JSON；临时禁用全部 Hook 用 `disableAllHooks`。文档还明确没有“保留配置但禁用单个 Hook”的原生机制。来源: https://code.claude.com/docs/en/hooks
- Claude Code handler 类型包括 `command`、`http`、`mcp_tool`、`prompt`、`agent`; 常见字段有 `type`、`if`、`timeout`、`statusMessage`，不同类型有 `command/args/shell`、`url/headers`、`server/tool/input`、`prompt/model` 等。来源: https://code.claude.com/docs/en/hooks
- Codex hooks 文档说明 Codex 会在运行前列出 hooks, 非 managed command hook 需要用户 review/trust 精确定义, trust 与 hook 当前 hash 绑定；变化后的 hook 会重新进入 review。来源: https://developers.openai.com/codex/hooks
- 本任务不改 Codex 写入逻辑。Codex 没有 Berth sidecar 恢复点, 强行展示“可恢复”会误导用户。

## 关联与依赖

- 恢复中心的数据源只读 sidecar 和源文件。恢复操作复用 `setHookEnabled({ enabled: true })`, 不新增第二套恢复写入路径。
- 清理操作只删除 sidecar entry, 不触碰 Agent 原始配置。它必须使用已有写前比较能力, 避免覆盖并行修改。
- 列表状态应尽量窄:
  - `recoverable`: sidecar 有 entry, 源文件存在, 源文件里没有等价 handler。
  - `already-restored`: sidecar 有 entry, 源文件里已经有等价 handler。
  - `source-missing`: sidecar 有 entry, 源文件不存在。
  - `invalid`: sidecar 文件损坏或 entry 无法解析。
- 状态解释放在 UI 内部, 不依赖用户读 sidecar JSON。

## 验收标准

1. Hooks 页面出现恢复中心入口, 能展示 Berth 管理过的禁用恢复点数量与损坏/警告数量。
2. 恢复点显示 Agent、source path、event、matcher、handler type、handler 摘要、创建时间和状态。
3. 可恢复项能从恢复中心执行恢复, 并复用现有冲突检测和错误文案。
4. 已恢复或失效项能清理 sidecar entry, 且清理不修改 Agent 原始配置。
5. sidecar 损坏、源文件缺失、Hook 已手动恢复都有明确状态和提示。
6. Codex 暂无 Berth restore point 时不展示伪恢复项。
7. UI 紧凑、可扫描, 不新增大面积说明卡片; hover/focus/禁用/错误状态可用。
8. 自动化测试覆盖主进程恢复点枚举、清理、renderer 操作调用和错误状态。

## 界面质量与交互验收

- 现有 Hooks 页偏工具型, 需要保留高频生命周期列表和 Hook 行内操作。恢复中心应作为折叠式辅助区, 默认只占一行摘要, 展开后才显示详细恢复点。
- 视觉上与当前页面的黑白克制方向保持一致, 减少橙色强调。状态 tag 用文字、边框和低饱和色区分, 不靠大色块。
- 用户路径:
  1. 看见“恢复中心”摘要。
  2. 展开后扫描异常/可恢复项。
  3. 点击“恢复”或“清理”, 操作前确认目标 source path 与 handler 摘要。
  4. 操作后列表刷新并保留当前位置。
- loading: 恢复中心加载时显示窄骨架。
- empty: 没有恢复点时只显示一句短文案。
- error: IPC 失败时显示内联错误, 不清空已加载内容。
- disabled: 源文件缺失项不能恢复, 只允许清理。
- focus: 恢复、清理、打开路径按钮可键盘聚焦。
- 响应式: 窄屏下恢复点字段垂直排列, 操作按钮换行但不遮挡。

## 未决问题

无。Codex 恢复点属于后续 Agent Capability Plugin 体系或 Codex 写入能力扩展, 不阻塞本任务。

