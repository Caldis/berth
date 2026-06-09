# 解决 (RESOLVED 2026-06-10)
- 在 `i18n/locales/{en,zh}.json` `settings` 下补 `accent.{neutral,blue,violet,emerald,amber,rose}` (zh: 中性/蓝/紫/绿/琥珀/玫瑰), 并一并补同 picker 缺失的 `settings.accentColor` (zh: 强调色)。settings.tsx 已用 `t()` 读取, 无需改组件。
- 测试 `tests/renderer/settings-accent-i18n.test.ts`: 断言 6 名 + accentColor 在 en/zh 本地化 (缺 key 令 t() 回显 key, 故同时守 key 存在)。小改动豁免, 标准门禁验收, 无单独 work。

# 描述
settings picker 的 accent 颜色名 (Neutral / Blue / Violet / Emerald / Amber / Rose) 的 `aria-label` 全部走 `t('settings.accent.${id}', { defaultValue: label })` 的英文 defaultValue; i18n locales 无 `settings.accent.*` key。中文语言下这些 accent 名仍显示英文。

# 重现步骤
- 切换应用语言为中文。
- 打开 设置 > Appearance > Accent color。
- 屏幕阅读器 / aria-label 读出的颜色名为英文 (Blue / Neutral / ...)。

# 预期结果
accent 名随语言本地化 (zh: 中性 / 蓝 / 紫 / 绿 / 琥珀 / 玫瑰)。

# 实际结果
全英文 (defaultValue label), 与应用其余已 i18n 文案不一致。

# 解决方案
为 6 个 accent 在 `src/renderer/src/i18n/locales` 的 en / zh 加 `settings.accent.{neutral,blue,violet,emerald,amber,rose}` key; `settings.tsx` 已用 `t()` 读取, 加 key 即生效, 无需改组件。

# 来源
GH-105 引入 accent picker 时未加 i18n; GH-106 (#106) 新增 neutral 时沿用现状, 为保持一致未单独本地化 neutral, 改进项统一记于此。交叉引用: `docs/works/_archive/2026-06-05-gh-106-accent-global-theme/03-PLAN.md`。
