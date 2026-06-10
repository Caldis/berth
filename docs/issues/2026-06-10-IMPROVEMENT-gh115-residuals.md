# 描述
GH-115 实施期显式 defer 的残项 (避撞或未验证, 不静默丢弃):
1. **globals.css 死 token + tailwind accordion keyframes/boxShadow card 删除 + theme-palette.test 整体改写为行为断言** — gh-103 (unify-chart-colors) 仍在 implement, 其足迹 (globals.css/chart-colors/usage/overview/token-usage-display) 全程避让。gh-103 收口后执行 (孤儿明细见 01-ANALYSIS orphansConfirmed #15)。
2. **i18n 快审 254 候选中未验证残余复核** — T12 只删了对抗验证 24∩仍死 19 个; 快审对主进程拼接 key (guidance/labelKey/hooks.stage 族) 大量假阳性; settings.localSources*/sourceCount*/sourceSummary/detected/notFound/noSourceRoots 等 LocalSources 家族残键高度可疑但未逐一对抗验证。需配好豁免规则 (labelKey/descriptionKey 主进程拼接 + replace 推导) 后复核。
3. **死代码扫描工具入 CI** — knip/ts-prune 对本仓多入口+双 tsconfig 零配置失配 (explore 实证), 需适配 (entry: main/preload/renderer/worker/scan-engine-cli) 后入 CI 阻止再沉积。
4. **app_icon.png/app_icon_v2.png (3.56MB) 接线或删除决策** — electron-builder 无 icon 字段, BrowserWindow 无 icon 选项, 接线=产品视觉变更需决策; 不接则删 (git 可恢复)。

# 来源 · 关联
- GH-115 架构全面分析 (2026-06-10), 完整证据见 `docs/works/2026-06-10-gh-115-architecture-refactor/01-ANALYSIS.md`。关联 docs/works/2026-06-04-gh-103-unify-chart-colors/。
- 状态: OPEN。
