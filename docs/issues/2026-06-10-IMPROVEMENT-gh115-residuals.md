# 描述
GH-115 实施期显式 defer 的残项 (避撞或未验证, 不静默丢弃):
1. ~~globals.css 死 token + tailwind accordion keyframes/boxShadow card 删除 + theme-palette.test 改写~~ — **DONE (2026-06-10)**: GH-103 归档解锁后执行。删 `--secondary` 对 + `--sidebar-accent-foreground` (light/dark 共 6 行, tailwind 映射同步; `sidebar-accent` 本体有 3 处消费保留)、tailwind accordion keyframes/animations (radix 遗留)、boxShadow card/card-dark (零 shadow-card 类消费); theme-palette.test 去除死 token 钉文本、增加死 token 排除断言。验证: 测试 4/4 + typecheck/lint/build 绿。
2. **i18n 快审 254 候选中未验证残余复核** — T12 只删了对抗验证 24∩仍死 19 个; 快审对主进程拼接 key (guidance/labelKey/hooks.stage 族) 大量假阳性; settings.localSources*/sourceCount*/sourceSummary/detected/notFound/noSourceRoots 等 LocalSources 家族残键高度可疑但未逐一对抗验证。需配好豁免规则 (labelKey/descriptionKey 主进程拼接 + replace 推导) 后复核。
3. **死代码扫描工具入 CI** — knip/ts-prune 对本仓多入口+双 tsconfig 零配置失配 (explore 实证), 需适配 (entry: main/preload/renderer/worker/scan-engine-cli) 后入 CI 阻止再沉积。
4. ~~app_icon.png/app_icon_v2.png (3.56MB) 接线或删除决策~~ — **DONE (2026-06-10, 用户拍板: 接线 app_icon.png)**: 源图去黑边圆角处理 (950×950 透明角) 后全面接线 — electron-builder win/mac/linux icon (exe/安装包 rcedit 嵌入实证无黑边)、BrowserWindow 窗口图标、边栏顶部 logo、README、官网 Nav/Footer/favicon; 另按用户要求新增图标橙强调色 `orange` (hsl 17 96% 55%)。app_icon_v2.png 保留待用户处置。提交 1dd67392 / 957df9c1。

# 来源 · 关联
- GH-115 架构全面分析 (2026-06-10), 完整证据见 `docs/works/2026-06-10-gh-115-architecture-refactor/01-ANALYSIS.md`。关联 docs/works/2026-06-04-gh-103-unify-chart-colors/。
- 状态: OPEN。
