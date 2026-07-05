# 描述
- Windows 上 statusline/hook 命令常以 MSYS/Git-Bash 风格书写绝对路径 (如 `node /c/Users/mail/.claude/plugins/.../index.js`, Claude Code 经 bash 执行时合法)。Berth 的 `extractCommandEntryPaths` (`packages/berth-scan-engine/src/adapters/command-entry-paths.ts`) 不识别 `/c/...` → `C:\...` 映射: `path.isAbsolute('/c/...')` 在 win32 为 true, normalize 后成 `\c\...`, `existsSync` 必然 false → entryPaths 为空。
- 结果是 UI 出现「命令看起来像脚本路径, 但 Berth 没有确认到可读取的本地脚本」的误报警告 (`unresolvedEntry` 诊断), 尽管脚本真实存在且状态栏工作正常。

# 重现步骤
- Windows 机器, `~/.claude/settings.json` 配置 `statusLine.command = "node /c/Users/<name>/.../dist/index.js"` (脚本实际存在于 `C:\Users\<name>\...`)。
- 打开 Berth 状态栏页。

# 预期结果
- Berth 将 `/<盘符>/...` 形式按 `X:\...` 解析并确认脚本可读, 不出警告; entryPaths 携带解析后的真实路径。

# 实际结果
- entryPaths 为空, 卡片带 `unresolvedEntry` 警告 (2026-07-05 本机实测, claude-dashboard 插件 statusline)。

# 解决方案
- `expandCommandPathToken` 或候选归一阶段增加 win32 专属映射: token 匹配 `^/([A-Za-z])/` 时改写为 `<盘符>:\` 前缀再 existsSync; 保持非 win32 平台行为不变。补一条 win32 单测 (MSYS 路径命中真实文件)。
