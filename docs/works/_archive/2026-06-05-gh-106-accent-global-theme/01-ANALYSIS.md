# 需求分析 (Explore 产物)

## 现状理解

**主题管理器存在, 非缺失。** `src/renderer/src/components/theme-provider.tsx` 是统一主题管理器: React Context 集中管理 `theme` (light/dark/system) 与 `accent` (5 色), localStorage 持久化 (`berth-theme` / `berth-accent`), 经 `App.tsx:37` 包裹全树并嵌 `HeroUIProvider`。

**两套独立颜色 token 是问题根源:**
- `--primary` 品牌主色, 默认蓝 `212 100% 47%` (`globals.css:16`)。picker 经 `html[data-accent]` 覆盖块 (`globals.css:108-143`) 同时改写 `--primary*` 与 `--heroui-primary*`。驱动 CTA / 图表 / focus ring / icon badge / tab 选中 / 滑块。
- `--accent` 中性强调色, 浅色黑 `240 5.9% 10%` (`globals.css:22`) / 深色近白 `0 0% 98%` (`globals.css:67`)。固定值, picker 不碰。

**HeroUI v2 集成** (`@heroui/react` 2.8.10, `@heroui/theme` 2.4.26): token 为 CSS 变量, 命名 `--heroui-<color>-<shade>` (prefix=heroui), 可在 stylesheet 直接消费 (来源: v2.heroui.com/docs/customization/colors)。官方首选 tailwind config `heroui({themes})` 静态定制主色; 运行时切换靠覆盖 CSS 变量。berth 为支持用户运行时切换, 采用 `[data-accent]` override `--heroui-primary*` (GH-105 建立并截图验证), 属 v2 CSS-var 体系内合法手段, 非 hack。dark mode 用 `.dark` class (`theme-provider.tsx:56`), 与官方一致。

## 关联与依赖

**accent 切换链路**: `settings.tsx` setAccent → localStorage → `theme-provider` useEffect 写 `html[data-accent]` → `globals.css` 覆盖 `--primary` / `--heroui-primary` → `bg-primary` / `text-primary` / HeroUI `color=primary` 消费点变色。

**token 消费点盘点** (Explore 全量):
- **`--primary` ~36 处** (logo `sidebar.tsx:84`、group 按钮选中 `sessions.tsx:135`、icon badge `bg-primary/10 text-primary` 多页、tab 选中 `memory-view.tsx:295`、状态 badge、链接、滑块 `globals.css:177`): 已跟随 picker。
- **`--accent` ~36 处, 分两类语义:**
  - **选中态 / 启用态 (语义=主色强调, 当前误用中性 token)**: `sidebar.tsx:144` 导航选中 (黑底白字)、`search-dialog.tsx:346` 搜索结果选中、`settings.tsx:68` toggle 启用、`settings.tsx:173/208` 主题/语言选中、`settings.tsx:179/214` check 图标、`local-sources-section.tsx:126/188/256` 列表选中。**这批本应跟随主色。**
  - **hover 反馈 + 结构 (语义=中性, 正确)**: 18 处 `hover:bg-accent/5`、7 处 `sidebar-accent` (侧栏局部 hover)、边框 / 背景。**这批应保持中性。**

**导航选中实现** (`sidebar.tsx:144`): `active ? 'bg-accent text-accent-foreground font-medium' : ...`。用户截图里的黑色选中态来自 `--accent` (浅色黑), 与品牌主色 `--primary` 完全脱钩, 故 picker 切换对它无效。

## 任务分类与 debt 校准

- **type**: feature (保持)。用户新增能力: 全局主题色 + 中性黑选项 + 中性默认。
- **实现路径校准 (关键)**: 核心动作不是"把 `--accent` 接入 picker 驱动"(那会令深色下白色选中态与文字混淆), 而是 **把误用 `--accent` 的选中态/启用态改用 `--primary` (已被 picker 驱动) + 新增中性黑 accent 并设默认**。改动集中在 ~6-10 处语义修正 + 1 个 `data-accent` 块 + 默认值, 非全局 token 大改。
- **debt estimate 修正**: scope `global → module` (改动集中 globals.css + theme-provider + sidebar + search-dialog + settings); incurred `5 → 4`; repaid `1 → 2` (偿还 GH-105 选中态语义错位的 ui-ux 债, 让主题系统语义自洽); net `4 → 2`; risk `medium` (默认观感变更 + 多处选中态视觉回归, 需截图验收); areas `[ui-ux, architecture]`; confidence `low → medium`。
- **revision**: explore, 2026-06-05, from {incurred:5,repaid:1,net:4,scope:global,confidence:low} to {incurred:4,repaid:2,net:2,scope:module,confidence:medium}, reason: 盘点确认改动集中于"选中态语义修正", 远小于"全局 token 接入"初判; repaid 上调因偿还 GH-105 误用 `--accent` 的语义债。

## 验收标准

1. 设置面板 accent 含"中性/黑"选项且为默认选中项; 浅色 / 深色下均正确显示。
2. 默认 (中性) 下: 导航选中、toggle 启用、选中态强调呈中性黑 (浅) / 中性白 (深), 与当前观感一致, 无突兀蓝色。
3. 切换任一彩色 accent 后: 导航选中、toggle、选中态、CTA、icon badge 全部跟随变色 (跨页面可见), 不仅 CTA / focus ring。
4. hover 反馈 (`bg-accent/5`)、`sidebar-accent` hover、结构边框 / 背景保持中性, 不随 accent 变色 (避免过花)。
5. 浅 / 深双主题 × 6 accent (中性 + 5 彩) 矩阵下, 选中态文字对比度可读, 无回归。
6. 既有 5 彩色 accent 切换不回归; localStorage 已存 accent 值的用户保留其选择。
7. 默认 accent 变更: 无 localStorage 的新用户默认中性; 已存 'blue' 等值的用户保持原选。

## 界面质量与交互验收

- **现有结构**: settings `Appearance` section 含 theme / language / accent 三组 radiogroup (`settings.tsx:146-267`); sidebar 导航 active item 用 `bg-accent`; settings dialog 为 HeroUI Modal。
- **设计系统**: Tailwind token + HeroUI v2, `components/ui` 共享层。
- **信息密度**: accent swatch 为 `h-9 w-9` 圆 + `h-5 w-5` 内圆 + check, `gap-2.5`。新增第 6 个 swatch 后布局仍宽松。
- **可见状态**: 选中 (`border-foreground` + check)、hover (`scale-105`)、focus (`ring-2 ring-ring`)。中性 swatch 的展示色值待定 (浅黑 / 深白 / 固定中性灰)。
- **可访问性**: radio role + aria-checked + 箭头键导航 (已有); 中性 accent 需新增 `settings.accent.neutral` i18n (en/zh) 供 aria-label。
- **风险**: 彩色 accent 下导航选中变彩色背景 (如绿底白字), 侧栏显眼度上升 — 审美权衡, 见未决 #1。

## 未决问题

1. **[需用户] 导航选中态在彩色 accent 下的力度**: 选中态改 `--primary` 后, 选彩色则侧栏 active item 变彩色底 (默认中性黑时不显, 仅用户主动选彩色时出现)。两种取向: (A) 导航选中跟随主色 (全局力度最大, 彩色下侧栏显眼); (B) 导航选中保持中性, 仅 toggle / CTA / badge / 其他选中态跟随 (力度适中, 侧栏始终稳定)。影响"全局生效"的视觉范围。
2. **[design] 中性黑 accent 精确色值**: 浅色取 `240 5.9% 10%` (= 现 `--accent`)? 深色对应值? picker 内 swatch 如何展示。
3. **[design] HeroUI primary 同步**: 中性 accent 是否同步 `--heroui-primary` 为中性 (令 HeroUI `color=primary` 组件也中性), 倾向同步以保持一致。
4. **[design] i18n**: 新增 `settings.accent.neutral` (en/zh)。

> 交叉引用: 延伸自 GH-105 (#105, accent picker 来源); 既有 `docs/issues/2026-06-05-IMPROVEMENT-heroui-migration-followup.md` 未覆盖本项。
