# 需求分析 (Explore 产物)

## 现状理解
- `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx` 的 `HookAssetRow` 直接渲染 `display.type`。
- `display.type` 来自 `hook.meta.hookType`，所以界面会出现 `prompt`、`http`、`mcp_tool` 这类配置标识。
- 同一行已经接收 `handlerDescriptor`，descriptor 内有 `labelKey`，可以在不碰解析逻辑的情况下生成可读标签。
- `tests/renderer/hooks-lifecycle-view.test.tsx` 当前断言裸值出现在 UI，测试需要改成约束可读标签和 JSON 原文并存。

## 关联与依赖
- 依赖 Agent Capability Plugin hook schema 的 handler 描述。
- i18n key 需要覆盖内置 Claude Code / Codex handler。
- 原始 JSON 展示仍应保留配置真实值。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. Hook 行首 badge 使用可读 handler label，而不是裸 `prompt` / `mcp_tool` 等实现标识。
2. 自定义 handler 可通过插件 schema 的 `labelKey` 展示可读名称。
3. 原始 JSON 仍展示真实 `type`，便于用户核对配置。
4. 没有 schema 或翻译缺失时，界面仍有非空回退。

## 界面质量与交互验收
这是 UI 文案和信息层级改进。行首 badge 是高频扫视信息，应使用短标签，不占用副标题或 JSON 区域。JSON 折叠区是核对真实配置的位置，不能翻译原文。

## 未决问题
无。
