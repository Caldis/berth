# 描述
- 能力页部分资产会展示“查看原始文件”按钮, 但该资产没有可读取 raw 内容时, 点击按钮没有任何反馈。

# 重现步骤
- 启动应用并进入“能力”页。
- 保持 MCP tab, 选择 `openaiDeveloperDocs` MCP asset。
- 点击“查看原始文件”。

# 预期结果
- 若能读取 raw, 打开原文 drawer。
- 若不能读取 raw, 不应展示按钮, 或点击后给出明确错误/不可用提示。

# 实际结果
- 按钮可见, 但 `assets.get(asset.id)` 没有返回 `raw` 内容, 点击后界面没有变化。

# 解决方案
- 在所有 View Raw 入口统一按 `asset.raw` / `assets.get(...).raw` 可用性控制按钮状态。
- raw 不可用但入口仍需保留时, 将按钮置为 disabled 并提供简短原因提示。
