# PRD 快照 (只读)

来源: https://github.com/Caldis/berth/issues/52

## 正文

当前视觉审计发现应用仍使用高饱和橙色作为全局 accent:

- `src/renderer/src/styles/globals.css` 中的 `--accent`、`--sidebar-accent`、`--chart-2`。
- `src/renderer/src/pages/usage.tsx` 中硬编码的 Usage 图表 palette。

问题:

- 橙色仍像旧主题主色。
- 当前产品方向是更克制的黑白产品界面, 接近 Vercel 的中性风格。
- 语义 warning / error 状态色应保留, 不应被主题替换误伤。

范围:

- 将全局品牌和交互 accent token 改为中性黑白。
- 将 Usage 图表 palette 改为读取 chart token, 不再硬编码旧橙色。
- 保留 warning / error 等语义状态色。
- 通过本地检查和界面截图验证。
