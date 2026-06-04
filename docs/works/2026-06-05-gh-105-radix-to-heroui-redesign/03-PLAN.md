# 03-PLAN — GH-105 Radix → HeroUI (活清单)

从 02-SPEC 拆解。顺序确定; 高 risk/global 与触及共享 config 的项**顺序**执行, 互不重叠的 ui/ 组件与逐页迁移可在主 session 内分批。implement 维护此清单, 每项先写/更测试、跑过再勾。只暂存自己文件。

图例: `[ ]` 未开始 · `[~]` 进行中 · `[x]` 完成 (测试通过)

---

## P1 — 基建 gate (顺序, 触及 package.json/tailwind/.npmrc/App, 必须先过)
- [ ] **P1.1 安装 HeroUI v2 + framer-motion + pnpm hoisting**
  - 装 `@heroui/react`(钉 v2.x) + `framer-motion`; `.npmrc` 加 `public-hoist-pattern[]=*@heroui*`; `pnpm install`。
  - tests: `pnpm install` 成功 + `node -e "require('@heroui/react')"` 解析。
  - verify: 依赖入 package.json; 不破坏 better-sqlite3/electron 构建 (pnpm 9.x)。
- [ ] **P1.2 Tailwind 插件 + content glob**
  - `tailwind.config.ts` 加 `heroui()` plugin + content `./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}`; 保留 `darkMode:'class'` 与既有 token。
  - tests: 不适用 (配置); 由 P1.4 烟测覆盖。
  - verify: `pnpm build` 成功。
- [ ] **P1.3 HeroUIProvider 接线**
  - `App.tsx` 在 Router 内、ThemeProvider 内包 `<HeroUIProvider navigate useHref locale reducedMotion="user">`。
  - tests: `tests/renderer/heroui-provider.test.tsx` — 渲染不报错。
  - verify: 应用启动正常, 路由可用。
- [ ] **P1.4 烟测组件 (TW3 有样式 gate)**
  - 临时放一个 HeroUI `<Button color="primary">` 烟测点; Electron 截图确认**有样式** (非 unstyled)。失败 → 回退钉 `@heroui/react@2.6.x` 重试。
  - tests: render 测试; verify: Electron 截图 dark+light。
  - **此项通过前不进 P3+。**

## P2 — Token / 主题 / accent (顺序, 触及 globals.css/tailwind/theme-provider, 全局)
- [ ] **P2.1 globals.css 视觉地基**
  - 蓝 `--primary`(+foreground+ring); `--radius`→0.875rem; 加深 dark 分层; 加 `--shadow-*`; **不动 `--chart-*`**; 导航选中态保持中性。
  - tests: `tests/renderer/theme-tokens.test.tsx` — 关键 var 存在/取值 (smoke)。
  - verify: 现有页面无改动即视觉提升 (Electron 截图前后比对)。
- [ ] **P2.2 heroui() 主题对齐 + accent 机制定稿**
  - `heroui({themes})` 配 light/dark 与 globals.css 同值; 烟测候选 A/B, 定稿 accent 切换机制 (默认 B: `[data-accent]` 覆盖 `--primary*`+`--heroui-primary-*`)。
  - tests: 由 P2.3 覆盖。
  - verify: HeroUI 组件与现有组件同蓝同 radius (截图)。
- [ ] **P2.3 ThemeProvider accent 扩展**
  - 增 `accent`/`setAccent`, 持久化 `berth-accent`, 设 `data-accent`; ≥4 accent。
  - tests: `tests/renderer/theme-accent.test.tsx` — set→localStorage+data-accent+默认值。
  - verify: 切 accent 后 CTA/chart/focus 变色, dark/light×accent 正确 (截图 ≥1 非默认 accent)。

## P3 — 共享 ui/ 层 (主 session 分批; 文件互不重叠, barrel 串行汇总)
> 先由主 Agent 写 2 个范例 wrapper (button, chip) 定约定, 其余按范例补齐。每个含测试。
- [ ] **P3.1 范例: ui/button.tsx + ui/chip.tsx + ui/index.ts + motion.ts**
  - tests: `tests/renderer/ui/button.test.tsx`, `ui/chip.test.tsx` — variant/color/testid/className/onPress。
  - verify: 不适用视觉单点 (P6 整页验收)。
- [ ] **P3.2 ui/card.tsx, stat-card.tsx, detail-row.tsx**
  - tests: 各 wrapper 测试 (isPressable/header-body-footer/testid)。
- [ ] **P3.3 ui/input.tsx, select.tsx, kbd.tsx**
  - tests: value/onChange/startContent/clear; select selectionChange。
- [ ] **P3.4 ui/tabs.tsx (替 tab-group), accordion.tsx**
  - tests: tab 切换/selectedKey; accordion 展开/aria-expanded。
- [ ] **P3.5 ui/modal.tsx, drawer.tsx**
  - tests: open/close/Escape/focus-trap/backdrop; testid 透传。
- [ ] **P3.6 ui/dropdown.tsx, tooltip.tsx, listbox.tsx**
  - tests: dropdown onAction/danger item; tooltip content; listbox selection。
- [ ] **P3.7 ui/switch.tsx, slider.tsx, skeleton.tsx, spinner.tsx, avatar.tsx, alert.tsx, empty-state.tsx**
  - tests: switch onValueChange; slider range; alert color; empty-state action。

## P4 — 迁移 2 处真实 Radix (顺序, 各自文件)
- [ ] **P4.1 session-detail Tabs → ui/tabs**
  - tests: 现有 + 更新 — 三 tab 切换、active 样式、`data-testid` 保留。
  - verify: Tabs 键盘/ARIA 不回归; 截图。
- [ ] **P4.2 category-jump-nav → ui/listbox (或薄 nav)**
  - tests: `tests/renderer/category-jump-nav.test.tsx` — active/onSelect/aria-current/count。
  - verify: 垂直 jump 导航键盘可达; 截图。
- [ ] **P4.3 移除 `@radix-ui/react-tabs` + `react-navigation-menu`**
  - tests: grep `@radix-ui` 在 src 归零; `pnpm test`。
  - verify: build 通过。

## P5 — 重复收敛 (顺序, 触及多个共享/页面文件)
- [ ] **P5.1 3 处 focus-trap modal/drawer → ui/modal+drawer** (settings-dialog, search-dialog, file-viewer-drawer)
  - tests: 各自现有测试 + 焦点陷阱/Escape/backdrop; search-dialog 保留键盘 nav 与防抖搜索。
  - verify: 三处行为一致; 截图。
- [ ] **P5.2 4 处 chevron 折叠 → ui/accordion** (local-sources, agent-plugins, session-detail CollapsibleSection, memory NoteCard)
  - tests: 展开/折叠/aria; 虚拟化页 (memory) 高度 re-measure 不抖。
  - verify: 动画一致; 截图。
- [ ] **P5.3 badge/pill → ui/chip** (scope-badge, cost-source-badge, 本地 Badge, 各路 pill)
  - tests: 语义色映射; 调用点不回归。
  - verify: chip 词汇统一; 截图。

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
- [ ] **P6.8 settings** — 面板 ui/card; toggle→ui/switch; badge→chip; 折叠→accordion; About avatar 蓝。
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
