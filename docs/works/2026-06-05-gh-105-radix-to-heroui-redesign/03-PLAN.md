# 03-PLAN — GH-105 Radix → HeroUI (活清单)

从 02-SPEC 拆解。顺序确定; 高 risk/global 与触及共享 config 的项**顺序**执行, 互不重叠的 ui/ 组件与逐页迁移可在主 session 内分批。implement 维护此清单, 每项先写/更测试、跑过再勾。只暂存自己文件。

图例: `[ ]` 未开始 · `[~]` 进行中 · `[x]` 完成 (测试通过)

---

## P1 — 基建 gate (顺序, 触及 package.json/tailwind/App, 必须先过) ✅ 完成
- [x] **P1.1 安装 HeroUI v2 + framer-motion**
  - 装 `@heroui/react@2.8.10` + `framer-motion` + `@heroui/theme@2.4.26`(直接 devDep, 使顶层可解析, 免 .npmrc hoist 全量重建)。
  - tests: `pnpm install` 成功 + `require('@heroui/theme').heroui` 为 function。✅
  - verify: 依赖入 package.json; 未触发 node_modules 全量重建 (保护共享工作区)。
  - 注: `latest`=v3(3.1.0/TW4), 故显式钉 2.8.10; 改用 `.pnpm`-aware 直接 devDep 替代 `.npmrc` hoist (更低 blast radius)。
- [x] **P1.2 Tailwind 插件 + content glob**
  - `tailwind.config.ts` 加 `import { heroui } from '@heroui/theme'` + content `./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}` + `plugins:[tailwindAnimate, heroui()]`; 保留 `darkMode:'class'` 与既有 token。
  - tests: 由 P1.4 build 烟测覆盖。✅
  - verify: `pnpm build` 成功, CSS 含 115 个 `--heroui-*` 变量 + `bg-content1`。
- [x] **P1.3 HeroUIProvider 接线**
  - `App.tsx` 在 MemoryRouter 内、ThemeProvider 内包 `<HeroUIProvider navigate={useNavigate()} locale={i18n.language} reducedMotion="user">`。
  - tests: `tests/renderer/heroui-provider.test.tsx` ✅; app-routing/app-layout 回归通过。
  - verify: typecheck:web+node 通过。
- [x] **P1.4 烟测 (TW3 有样式 gate) — 通过, 无需回退 v2.6.x**
  - 证据: build CSS 含 `--heroui-primary: 212 100% 47%`(HeroUI 蓝) + 测试渲染 `<Button color="primary">` 带 `bg-primary` class。
  - **GATE 通过 → 进 P2。** 尽管 @heroui/theme 声明 TW4 peer, 插件在 TW3.4.19 下实测正常。

## P2 — Token / 主题 / accent (顺序, 触及 globals.css/tailwind/theme-provider, 全局) ✅ 完成
- [x] **P2.1 globals.css 视觉地基**
  - 蓝 `--primary`(212 100% 47/50%)+ `--primary-foreground` 白 + `--ring`→蓝; `--radius`→0.875rem; dark 分层加深 (bg 4% / sidebar 6.5% / card 9%); **未动 `--chart-*`**; `--accent` 保持中性 (导航选中不变蓝)。tailwind 加 `boxShadow.card`/`card-dark` 软阴影。
  - tests: 由 build 验证 (CSS 含 `--radius:0.875rem` + 4 accent 块); jsdom 不应用 Tailwind CSS 故不做 var 单测。
  - verify (P10 截图): 现有页面无改动即视觉提升。
- [x] **P2.2 accent 机制定稿 = 候选 B**
  - `html[data-accent]` unlayered 选择器覆盖 `--primary*` + `--heroui-primary*` + `--heroui-focus` (whichever utility 解析皆切换); 无需 named heroui themes。heroui() 默认主题已是蓝+近黑, 与 globals.css 同向, 暂不额外配 themes (P6/P10 视觉差异再补)。
  - tests: 由 P2.3 + build 覆盖。
- [x] **P2.3 ThemeProvider accent 扩展**
  - 增 `accent`/`setAccent`/`ACCENTS`, 持久化 `berth-accent`, useEffect 设 `data-accent`; 5 accent (blue/violet/emerald/amber/rose)。
  - tests: `tests/renderer/theme-accent.test.tsx` ✅ (默认 blue/切换持久化/恢复/非法回退 4 例)。
  - verify (P10 截图): 切 accent 后 CTA/focus 变色。

## P3 — 共享 ui/ 层 (种子) ✅ 完成
> 精简高度 (AGENTS 简洁原则): 不为每个 HeroUI 组件写厚包装。`ui/index.ts` = 单一 import 入口 (re-export HeroUI primitives), 页面只从 `@/components/ui` 引。berth 专属 composite (语义 Chip / motion) 先落地; StatCard/SectionCard/Modal/Accordion 等**随 P5/P6 各页迁移按真实需求原地重建**, 长进这层 (而非投机抽象)。
- [x] **P3.1 ui/index.ts (barrel) + ui/motion.ts + ui/chip.tsx (语义 Chip)**
  - barrel re-export: Button/Card 族/Input/Select/Tabs/Switch/Slider/Modal 族/Drawer 族/Dropdown 族/Popover 族/Tooltip/Badge/Avatar/Accordion/Skeleton/Spinner/Listbox/Table 族/Kbd/Alert/Divider/ScrollShadow/useDisclosure + berth Chip/MOTION。
  - Chip: tone(neutral/primary/success/warning/danger)→HeroUI color, 默认 flat/sm; 灭 badge 乱象。
  - tests: `tests/renderer/ui/barrel.test.tsx` (导出齐全 + render) ✅ + `ui/chip.test.tsx` (tone 映射/默认/onClose) ✅。
- [~] **P3.2 后续 composite (随 P5/P6 落地)**: SectionCard(面板)、StatCard(KPI+delta)、EmptyState/LoadingState 重建、Modal/Drawer/Accordion 收敛 — 见 P5/P6。

## P4 — 迁移 2 处真实 Radix (顺序) ✅ 完成
- [x] **P4.1 session-detail Tabs → HeroUI Tabs**
  - Radix `Tabs.Root/List/Trigger/Content` → `<Tabs><Tab title=...>panel</Tab>`; 卡片网格外观经 classNames(tabList grid / tab data-[selected=true] / cursor hidden)保留; `data-[state=active]`→`group-data-[selected=true]`。`SessionDetailTabs` 重构为 `sessionTabMeta`(数据)+ `SessionTabTitle`(标题节点)。
  - tests: sessions-pages.test.tsx 断言 `data-state=active`→`aria-selected=true`; 25 测试通过 (tab 切换/计数/面板)。
  - verify (P10 截图): 卡片网格 tab + 键盘/ARIA。
- [x] **P4.2 category-jump-nav → 原生 `<nav><ul><li>`**
  - NavigationMenu 仅作语义包裹(无 menu 行为)→ 原生 nav/ul/li, 保留 aria-label/aria-current/testid/类/行为; Tailwind preflight 重置 ul 样式。
  - tests: category-jump-nav.test.tsx 3 测试通过 (role=navigation/onSelect/aria-current/count/sticky 类)。
- [x] **P4.3 移除全部 10 Radix 包 + cmdk (含 P8 死依赖)**
  - `pnpm remove` 10 个 @radix-ui + cmdk; src 内 `@radix-ui`/`cmdk` 引用归零; package.json count=0; build 通过。

## P5 — 重复收敛 (顺序, 触及多个共享/页面文件)
- [ ] **P5.1 3 处 focus-trap modal/drawer → ui/modal+drawer** (settings-dialog, search-dialog, file-viewer-drawer)
  - tests: 各自现有测试 + 焦点陷阱/Escape/backdrop; search-dialog 保留键盘 nav 与防抖搜索。
  - verify: 三处行为一致; 截图。
- [ ] **P5.2 4 处 chevron 折叠 → ui/accordion** (local-sources, agent-plugins, session-detail CollapsibleSection, memory NoteCard)
  - tests: 展开/折叠/aria; 虚拟化页 (memory) 高度 re-measure 不抖。
  - verify: 动画一致; 截图。
- [~] **P5.3 badge/pill → ui/chip** (进行中)
  - [x] scope-badge → Chip(tone=neutral); cost-source-badge → Chip(actual=success/estimated=primary/mixed=warning/unknown=neutral), 去掉硬编码 emerald/sky/amber。tests: scope-badge-palette(中性/无类别色) + cost-source-badge(label/title/aria) 通过。
  - [ ] 本地 Badge / 各路内联 pill (agent-plugins、project-scope-switcher、session-detail tags 等) → 随 P6 各页迁移。

## P6 — 逐页消费 + 视觉重构 (主 session 顺序, 每页一提交)
> 每页: 改用 ui/ 组件 + 应用 dashboard 语言 (分层/radius/elevation/chip/icon/排版/5 态); 保留 testid/虚拟化/chrome/i18n。
- [ ] **P6.1 layout shell** (app-layout/sidebar/top-navigation/project-scope-switcher/window-controls)
  - tests: 现有 layout 测试; testid 保留; 拖拽区/宽度同步不破。
  - verify: 截图 — 分层近黑、统一 icon、nav 中性选中、CTA 蓝。
- [ ] **P6.2 overview** — KPI→ui/card+delta chip; 面板→ui/card; 健康行→列表/chip; skeleton。
  - tests: `overview-hero` testid + 现有; verify: 截图。
- [ ] **P6.3 sessions** — 分组卡 ui/card; agent/model→chip; 行 focus-visible; 保留 virtuoso。
  - tests: 现有; verify: 截图 + 键盘焦点可见。
- [ ] **P6.4 session-detail** — 面板 ui/card 统一 header; KPI/Signals stat tile; tags→chip; 折叠→accordion (与 P5.2)。
  - tests: 现有; verify: 截图。
- [ ] **P6.5 instructions (+ memory-view)** — 卡片/折叠/filter chip 统一; 补 loading skeleton; 保留 virtuoso + markdown。
  - tests: `instruction-asset-card-*`/`memory-note-card-*` testid + 已改的 instructions-guidance 测试; verify: 截图。
- [ ] **P6.6 capabilities (+ hooks-lifecycle-view)** — 卡/KPI/chip 统一; native select/details→ui/dropdown/select; 保留 SVG connector/scroll-spy。
  - tests: `hook-lifecycle-*` testid + 现有; verify: 截图 + connector 几何不破。
- [ ] **P6.7 usage** — 卡片统一; 时间段→ui/tabs; cost-mode→ui/select; NoticePanel→ui/alert; recharts 主题对齐蓝 (不碰 chart-colors.ts)。
  - tests: 现有; verify: 截图。
- [~] **P6.8 settings** — 面板 ui/card; toggle→ui/switch; badge→chip; 折叠→accordion; About avatar 蓝。
  - [x] accent 选择器: Appearance 区加 5 色板 radiogroup → setAccent, 使 AC4 用户可达。tests: settings-accent(5 板/默认 blue/切换 emerald→data-accent+localStorage) ✅; CDP 实测切 rose → --primary+--heroui-primary 双变 + logo 变 rose 截图。
  - [ ] 其余 settings 面板/toggle/折叠 ui 化 (随后)。
  - tests: 现有 settings 测试; verify: 截图。

## P7 — 动画补全 (顺序, 收口)
- [ ] **P7.1 motion 一致性 + reducedMotion**
  - 统一进出/hover/press/展开/tab motion 时长缓动 (motion.ts); 确认 `reducedMotion="user"` 生效; 非 HeroUI 自定义动画对齐。
  - tests: reducedMotion 行为 (smoke); verify: 交互实测 + prefers-reduced-motion 截图。

## P8 — 清理 (顺序, 触及 package.json)
- [ ] **P8.1 移除死依赖** 8 个 Radix + `cmdk` + (P4.3 后) 最后 2 Radix; 清理无用 shadcn token 映射 (若安全)。
  - tests: grep `@radix-ui`/`cmdk` 在 src 归零; `pnpm test` + `pnpm build`。
  - verify: 依赖树干净。

## P9 — issues 落地 (并行)
- [ ] **P9.1 记录超范围项** 到 `docs/issues/`: sessions/session-detail error 通道缺失 (需 hook/IPC); settings 单列→分段导航建议; 其它探索副产物。本任务只交叉引用。
  - tests: 不适用 (文档); verify: `pnpm harness:check`。

## P10 — verify 收口 (顺序)
- [ ] **P10.1 全量门禁** `pnpm typecheck && pnpm lint && pnpm test && pnpm build` 全绿。
- [ ] **P10.2 视觉验收** Electron 实测窗口截图: dark/light × 默认+1 accent, 覆盖所有页; 比对参考图与 AC5 各项。
- [ ] **P10.3 全局 harness:check** + CI 绿; debt.final 回填; 进 archive。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
