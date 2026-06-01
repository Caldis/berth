# 描述
- 健康检查和诊断入口会跳转到 `/configuration/capabilities?tab=hooks`, 但 Capabilities 页面只用本地 React state 初始化页签, 没有读取 `tab` query 参数。

# GitHub
- Issue: https://github.com/Caldis/berth/issues/23
- Number: #23

# 重现步骤
- 打开 `/configuration/capabilities?tab=hooks`。
- 或从 Overview 健康检查点击指向 `/configuration/capabilities?tab=hooks` 的修复入口。

# 预期结果
- 页面应选中 Hooks 页签。
- 非法 `tab` 值应回退到默认 MCP 页签。

# 实际结果
- 页面仍停留在默认 MCP 页签。

# 解决方案
- Capabilities 页面读取 `tab` query 参数并约束到已知页签。
- 页签切换时同步 query 参数, 方便刷新和分享 URL。
- 增加 renderer 测试覆盖合法和非法 query。

