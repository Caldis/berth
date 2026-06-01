# 抛光记录

## 视觉检查

- 启动 agent-owned Electron 实例: `pnpm dev:agent start --id gh12-agent-plugins --json`
- 保护用户 dev: `pnpm dev:agent guard before --id gh12-agent-plugins --json`
- Settings 默认区块截图: `C:\Users\mail\AppData\Local\Temp\berth-gh12-settings-dialog.png`
- Claude Code 插件展开截图: `C:\Users\mail\AppData\Local\Temp\berth-gh12-settings-expanded.png`
- 抛光后展开详情截图: `C:\Users\mail\AppData\Local\Temp\berth-gh12-settings-polished.png`
- 清理 agent 实例: `pnpm dev:agent stop gh12-agent-plugins --json`
- 保护检查: `pnpm dev:agent guard after --id gh12-agent-plugins --json`

## 调整

- 将展开详情里的权限和能力条目从小卡片改为分隔行, 减少设置弹窗里的“卡片套卡片”噪声。
- 保留默认摘要行的紧凑展示, 权限、能力和来源详情只在展开后显示。

## 门禁

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm harness:check`
- `node scripts/harness-projects.mjs check --strict`
