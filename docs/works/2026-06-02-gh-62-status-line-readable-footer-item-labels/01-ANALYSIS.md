# 需求分析 (Explore 产物)

## 现状理解
- `src/renderer/src/pages/capabilities.tsx` 内的 `StatusLineCard` 直接渲染 `items.map(item => item)`。
- `CodexDefaultStatusLine` 也直接渲染默认 raw item。
- `src/main/adapters/codex/parsers.ts` 当前只把 `model-with-reasoning` 和 `current-dir` 识别为 known item。
- 测试 `tests/renderer/status-line-section.test.tsx` 当前断言 raw item 出现在 UI。

## 关联与依赖
- 只改 renderer 展示和 locale。
- 不改 Codex parser，不新增 supported item。
- unknown item 必须继续以 raw 形式出现。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 已知 Codex footer item 在 card 和默认 footer 中显示可读 label。
2. 已知 item 的 title 保留 raw id。
3. unknown item 继续显示 raw id 并保留 warning。
4. 中文状态栏文案不再把 `Footer items` 当主要文案。

## 界面质量与交互验收
这是状态栏小标签文案改进。主界面展示可读标签，raw 配置标识放到 hover title；未知项保留 raw 以暴露风险。

## 未决问题
无。
