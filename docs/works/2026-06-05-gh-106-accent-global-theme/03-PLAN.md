# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。**顺序执行** (主题 token 强耦合 + settings.tsx 被任务2/3 共同触碰 + 视觉验收依赖前序实现, 不并行)。implement 阶段维护此清单。

- [x] 任务1: 中性 accent token + 枚举 + 默认 (SPEC A/E)
  - 改动: `globals.css` 新增 `html[data-accent='neutral']` (浅黑) 与 `html.dark[data-accent='neutral']` (深白) 两块, override `--primary` / `--primary-foreground` / `--ring` / `--heroui-primary` / `-500` / `-foreground` / `--heroui-focus`; `theme-provider.tsx` Accent 类型加 'neutral'、ACCENTS 首位加 'neutral'、`defaultAccent='neutral'`、ThemeContext 默认 accent 'neutral'。
  - tests: `tests/renderer/theme-accent.test.tsx` 加: 默认 accent='neutral'、`data-accent='neutral'` 写入 documentElement、neutral 下 `--primary` 解析为中性值; 既有彩色断言不回归。
  - verify: `pnpm test` 绿; 启动应用 (`pnpm dev`) 无 localStorage 时默认主色为中性黑 (浅) / 白 (深)。界面项: 验证默认主色值, 此步无新 picker UI。
- [x] 任务2: picker swatch + i18n (SPEC D)
  - 改动: `settings.tsx` accents 数组首位加 `neutral` 项, swatch backgroundColor 用 `hsl(var(--foreground))` 自适应; `i18n` en/zh 加 `settings.accent.neutral` (Neutral / 中性)。
  - tests: `tests/renderer/settings-accent.test.tsx` 加: 渲染 6 个 swatch、neutral 为首且默认 `aria-checked`、点击 neutral 写 localStorage+data-accent、箭头键导航覆盖 neutral。
  - verify: 界面项 — picker 首个为中性 swatch 且默认选中; 键盘箭头含 neutral; 深色下中性 swatch 可辨 (border-2 兜底); 截图浅/深。
  - 偏差: 任务1+2 合并为一次原子提交 (默认改 neutral 与 swatch 列表/测试强耦合, 分开会产生中间红态); i18n 现有 5 accent 均无 key, neutral 同用 defaultValue 'Neutral' 保持一致 (不单独加 zh, 免割裂); swatch check 深色对比加 `text-background` 兜底 (foreground 底白色 check 不可见)。已记 issue 跟踪 accent 名整体 i18n 缺失。
- [x] 任务3: 选中态/启用态改 --primary (SPEC B, 甲)
  - 改动: `sidebar.tsx:144` (导航选中)、`search-dialog.tsx:346` (结果选中)、`settings.tsx:68/173-174/179/208-209/214` (toggle+主题/语言选中+check+hover)、`local-sources-section.tsx:126/188/256` (列表选中): `accent` 家族 → `primary` 家族。
  - tests: 新建或并入 `tests/renderer/sidebar.test.tsx` 断言 active item 含 `bg-primary text-primary-foreground`; `settings-accent.test.tsx` 扩展断言选中态用 primary class。
  - verify: 界面项 — 切任一彩色 accent 后, 导航选中 / toggle / 主题语言选中 / 列表选中 / CTA 跨页面跟随变色 (AC3); `hover:bg-accent/5` 与 `sidebar-accent` 与结构边框背景保持中性 (AC4); 截图浅/深 × neutral + 至少 2 彩色。
  - 偏差: local-sources 三处 (126/188/256) 经查为 installed/detected 状态 badge (非纯选中态), 改 primary 与其他 icon badge 一致且符合甲; sidebar:158 description 文字一并跟随; settings/search/local 的 primary 由视觉验收覆盖, 单测聚焦 sidebar active (app-layout) + palette 语义更新。
- [ ] 任务4: 视觉回归验收 (SPEC 界面表; AC2/3/4/5) — 移至 4.0-verify 实测 (视觉截图属 verify 范畴; 任务1-3 代码+单测已交付, e3886cd CI 绿)
  - 改动: 无代码; Electron 主进程坐标裁剪截图矩阵 (neutral 浅黑 / 深白 + emerald + rose), 核对导航选中 / toggle / CTA 跟随、hover / sidebar / 结构保持中性、选中态文字对比度可读。
  - tests: manual (截图)。理由: 颜色渲染需人眼 / 截图实测, 单测仅覆盖 class 断言。
  - verify: 逐条核对 AC2 (默认中性观感一致)、AC3 (彩色全局跟随)、AC4 (中性元素不变)、AC5 (浅深×6 对比度无回归); 截图临时存 tmp, 验收后清理 (重用价值的归档 works)。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
