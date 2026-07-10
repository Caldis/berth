# 描述
- 插件缓存目录按版本存放 (`~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`), 而 claude-code 适配器用 `safeGlob('cache/**/.claude-plugin/plugin.json')` 收集清单 (概念锚点: `scanPlugins`, `packages/berth-scan-engine/src/adapters/claude-code/scanner.ts`, 2026-07-10 快照约 L387), **同一插件的每个残留版本目录都被扫成独立 plugin 资产并 descend 出全套组件**。
- 连锁污染多个视图 (2026-07-10 本机实测): 插件页 frontend-design / context7 / claude-dashboard 各出现 2 次 (`1.16.2`+`1.30.0`、`a5c7fb5d86a4`+`unknown`); 命令页 claude-dashboard 的 4 个斜杠命令 ×2 = 8 条; MCP 页 pencil ×4、context7 ×2。
- 伴生显示问题: 版本目录名为 `unknown` 时 UI 渲染成 "vunknown" (`v` 前缀 + 未知版本字符串直接拼接)。

# 重现步骤
- `~/.claude/plugins/cache/<marketplace>/<plugin>/` 下存在多个版本目录 (升级插件后旧版本目录残留即满足)。
- 打开 Berth 插件页 / 命令页 / MCP 页。

# 预期结果
- 每个已安装插件只出现一次: 只取当前启用/安装的版本 (以 Claude Code 的安装指针为准; 无指针时至少按插件名去重取最高版本), 其余缓存版本不产出资产, 或折叠为同一插件的历史版本元数据。
- 版本未知时不显示 "vunknown", 省略版本徽标。

# 实际结果
- 每个缓存版本目录都成为独立 plugin 资产, 插件/命令/MCP/Skills 视图成倍重复。

# 解决方案
- 探明 Claude Code 对"当前安装版本"的权威指针 (known_marketplaces.json / installed 记录 / settings enabledPlugins), scanPlugins 按 (marketplace, name) 分组只保留 active 版本; 缺指针时退化为语义化版本最高者。
- 补单测: 同插件双版本目录 fixture → 断言仅产出 1 个 plugin 资产及其组件。
- 影响面: 插件资产 id (`plugin:<marketplace>/<name>@<version>`) 与组件 pluginId 归属, 需过 e2e 与快照持久化回归。
