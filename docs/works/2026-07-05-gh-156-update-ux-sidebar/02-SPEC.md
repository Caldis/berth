# 02-SPEC — 优化版本更新体验 (GH-156)

> Design 产物。每条回指 01-ANALYSIS 验收标准编号 (AC1-AC11)。

## 0. 设计决策 (消解 01-ANALYSIS Q1-Q5)

| # | 决策 | 依据 |
|---|---|---|
| D1 (Q1/Q4) | release notes 仅用 electron-updater, 开启 `autoUpdater.fullChangelog = true` 获得**跨版本** `Array<ReleaseNoteInfo>` ({version, note}[] 版本倒序); 不做官网 changelog.json 双源, 不扩大范围到 website | 官方源码证实 (GitHubProvider.ts): fullChangelog=true 返回结构化数组, 原生覆盖 bobcorn 双源想要的跨版本聚合; note 内容取自 GitHub Atom feed `content` 元素, 为 **HTML** — 渲染层必须 DOMParser 提纯纯文本, 永不注入 |
| D2 (Q2) | 不做下载取消按钮 | bobcorn 的取消是仅复位 UI 的软取消, 有误导性; berth 下载本就静默后台 + `autoInstallOnAppQuit` 兜底 |
| D3 (Q3) | 自动检查错误静默在 main 侧 controller 实现 (`userInitiated` 标志, 与 bobcorn 同构); IPC 通道集零变化 (`update:check` 经 IPC 调用即用户主动语义) | 若在 renderer 判断则每个消费者都要各自实现; main 单点 |
| D4 (Q5) | `update-section.tsx` 保持现状 (偏好开关 + 手动检查), 不同步渲染 notes/进度条 | 避免双处维护同一浮层; 状态一致性由共享 store 保证 (见 §2.3) |
| D5 (新) | 指示器渲染为 footer 容器内**独立一行** (现有 [Settings][Scan][折叠] 行之上), 非 idle 才出现 | 现有行 3 元素已满, 塞入文本微组件会挤压; 更新状态变化低频 (每次启动至多一次), 出现/消失的纵向 reflow 可接受 (区别于 GH-113 扫描态高频切换需保留 slot 的场景) |

假设声明 (用户可否决, 影响面小可后补): D1 放弃官网双源属最小交付, 若后续要官网聚合源可另开 issue; D2/D4 为克制项, 加回成本低。

## 1. 数据契约 (AC3, AC4)

`pkg:shared/types/ipc.ts` — **仅类型变化, 通道集零增删** (四方对账不受影响):

```ts
export interface UpdateReleaseNote {
  version: string
  note: string   // DOMParser 提纯前的原始 HTML/文本, 渲染层负责提纯; 单条截断 4000 字符
}

export interface UpdateState {
  phase: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  releaseNotes?: UpdateReleaseNote[]   // 替换原 notes?: string (renderer 无消费者, 安全替换; 实现时 grep 复核)
  percent?: number
  error?: string
}
```

- 归一化 (main, `updater.ts` update-available handler): `info.releaseNotes` 为 string → `[{version: info.version ?? '', note}]`; 为数组 → map `{version, note: note ?? ''}`, 过滤空 note; 上限 20 条 × 每条 4000 字符 (约束 IPC payload)。
- `downloaded` 事件同样携带 releaseNotes (若 electron-updater 提供), 供 downloaded 态浮层继续展示。

## 2. 模块结构 / 组件拆分

### 2.1 main (AC4)

`src/main/updater.ts`:
- `UpdaterLike` 增加 `fullChangelog: boolean`; controller init 设 `autoUpdater.fullChangelog = true`。
- `check(options?: { userInitiated?: boolean })`, 默认 `true` (IPC handler 零改动); `src/main/index.ts` 启动自动检查改为 `check({ userInitiated: false })`。
- 内部 `userInitiated` 标志: 用户 `check()`/`download()` 置 true; `error` 事件读取 — true → emit `{phase:'error'}`, false → emit `{phase:'not-available'}` (静默); 读取后复位 false。所有 error 恒 log。
- `check()`/`download()` 的 try-catch 分支同样遵守静默语义。

`src/main/index.ts`:
- 启动 check 传 `{userInitiated:false}`。
- **dev 模拟驱动** (AC11 可测试性): `!app.isPackaged` 时注册 `CommandOrControl+Shift+U` globalShortcut, 定时序列经同一广播函数发 fake `update:state` (checking → available(v99.0.0, 两条假 notes) → downloading(0/25/50/75/100) → downloaded), 与 bobcorn 同构。仅 dev, 不进打包。

### 2.2 renderer 状态 (AC6)

- `stores/app.ts`: 新增 `updateState: UpdateState` (初始 `{phase:'idle'}`) + `setUpdateState` action。
- `hooks/use-update.ts`: `state` 改读 store selector; `onState` 订阅回调改写 store。**返回形状不变** → `update-section.tsx` 零改动。多实例订阅幂等 (同 payload 重复写 store 无害); 状态在组件卸载/重挂后不丢 (修复 Settings 打开晚于广播时显示 stale idle 的隐性缺陷)。

### 2.3 renderer UI (AC1/2/3/5/8/9)

`src/renderer/src/components/layout/sidebar-update-indicator.tsx` (新, layout 域, 单页消费, 先例 sidebar-scan-status):
- `<SidebarUpdateIndicator collapsed={boolean}>`; phase ∈ {idle, not-available} → `return null`。
- **展开态主按钮** (bobcorn 视觉移植到 berth token): `inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] text-muted-foreground`, 可点击态 `hover:bg-sidebar-accent/10 hover:text-sidebar-foreground cursor-pointer`:
  - checking: 无点, 文案 `update.indicator.checking` (不可点)
  - available: 蓝点 `h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-pulse` (animationiteration 一轮后移除 pulse 类) + `update.indicator.available` "{{version}} 可用"
  - downloading: 条形进度 `w-12 h-0.5 rounded-full bg-muted overflow-hidden` 内层 `bg-primary transition-[width] duration-300 ease-out` + "{{percent}}%" (不可点)
  - downloaded: 绿点 `bg-emerald-500` + `update.indicator.downloaded` "重启更新至 {{version}}"
  - error: 红点 `bg-destructive` + `update.indicator.error` "更新失败"
- **点击流转** (AC2): available→`download()`; downloaded→`install()`; error→`check()`; checking/downloading 不响应。
- **折叠态** (AC5): 图标级 button (同 footer 其它图标尺寸), 仅呈现状态点 (downloading 时点用 primary 色 + `motion-safe:animate-pulse`); 完整状态文案进 `aria-label`; 浮层 side='right'。
- **浮层** (AC3): 复用 `FloatingPopover` (interaction='hover', side=collapsed?'right':'top', align='start', role='dialog', hoverBridge); 内容为导出组件 `UpdateNotesPanel` (直测用, 先例 ScanProgressPanel):
  - 头部: 状态点 + 版本 (多条目显 `vA → vB` 区间) + Chip (available→"新版本" primary 不用/中性?; 用 berth `Chip` tone: available→`neutral`? — bobcorn 用蓝/绿 pill; berth Chip tone 无 primary, available 用 HeroUI Badge/文本色 `text-primary`, downloaded 用 `text-emerald-500`; 实现取最贴近现有 token 的形式) + Maximize2 icon 暗示可放大
  - 主体: 逐版本条目 (版本号 + 提纯后的纯文本 note, `whitespace-pre-line`); 空 → `update.notes.empty` "暂无更新说明"; error phase → 具体 error 文本 + 重试提示; downloading → 进度信息
  - 整卡点击 → 打开 Modal
- **Modal** (AC3): `@/components/ui` Modal, 标题 `update.notes.title` + 版本区间, body `max-h-[60vh] overflow-y-auto` 复用 UpdateNotesPanel 主体; Esc/遮罩/关闭按钮可关 (HeroUI 自带)。
- 挂载: `sidebar.tsx` footer 容器内、现有按钮行之上 (D5)。

`src/renderer/src/lib/release-notes.ts` (新, 纯逻辑下沉 lib 配直测):
- `releaseNoteHtmlToText(html): string` — DOMParser('text/html') 惰性文档提纯 (br→换行, li→'• ', 块级补换行, 取 textContent), **从不注入 HTML** (bobcorn 已验证方案)。
- `formatVersionRange(entries, fallbackVersion): string` — 单条→`vX`; 多条→`vOldest → vNewest`。

### 2.4 i18n (AC7)

新顶层命名空间 `update` (zh/en 同批; 顶层无既有 `update` key, 已核): `update.indicator.{checking,available,downloading,downloaded,error}`, `update.indicator.tooltip.{download,install,retry}`, `update.notes.{title,empty,clickToExpand,readyBadge,newBadge}`。`settings.update.*` 不动。
**并发撞车防护** (不变量 11, GH-150 同时在改 locale 文件): 写前 grep `"update"` 顶层 key 占用; 每次编辑前重读; Edit "file modified since read" 即竞态信号重读再改。

## 3. 任务分类与 debt

- type / maintenance.subtype: `maintenance` / `ui-ux` (不变)
- source.kind / refs: `user-request` (不变)
- debt.estimate: incurred 2 / repaid 6 / net -4, scope cross-process, risk medium, confidence medium — design 后无变化 (D1 排除 website 扩面, D5 排除 footer 行重排, 影响面与 explore 校准一致)
- debt.final 预期: 与 estimate 相同 (G1-G6 差距闭合 → ui-ux 偿还; 新组件 + 契约字段增长 → 小额 incurred)
- revisions: 无新增 (数值未变)
- Project 字段同步: archive 前 `harness-projects.mjs done` 统一同步
- harness:stats total=29 (<40), maintenance 任务无需 override 说明

## 4. 界面质量与交互验收 (AC1/2/3/5/8/9/11)

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | footer 容器内独立一行 (非 idle 才渲染), 不挤占现有 3 元素行; 展开态单行 [点/进度][11px 文案], 折叠态图标级 | 各状态截图: 展开/折叠 × available/downloading/downloaded/error |
| 组件选择 / 设计系统一致性 | FloatingPopover (弹层) + HeroUI Modal + berth 语义色 (`bg-primary` 蓝=可用/进度, `bg-emerald-500` 绿=就绪, `bg-destructive` 红=错误); 文字 `text-[11px] text-muted-foreground` 同 footer 现有元素 | 代码走查 + 截图对照 footer 既有元素 |
| 交互反馈 / 状态切换 | 可点击态 hover bg + cursor-pointer; 不可点态 cursor-default; 进度条 CSS transition 平滑; available 蓝点脉冲一轮即停 | dev 模拟驱动完整序列, 肉眼核验 + 组件测试断言点击 dispatch |
| loading / empty / error / disabled / focus | checking=loading 态 (不可点); notes 空态"暂无更新说明"; error 态红点 + 浮层内具体错误 + 点击重试; focus ring 走全局 ring token | 组件测试逐 phase 断言 + 截图 |
| 响应式 / 可访问性 / 键盘可达 | 折叠 80px 降级图标级, aria-label 携带完整状态文案 (scan-status 先例); 浮层 role=dialog, Esc/outside 可关; 指示器为原生 button 可 Tab 聚焦, FloatingPopover useFocus 支持键盘触达浮层 | 组件测试断言 aria-label; 手动 Tab 走查 |
| 文案 / i18n / 数字和路径格式 | zh/en 同批新增 `update.*`; 版本恒 `v` 前缀; 百分比整数 | i18n 结构测试 + zh/en 截图各一 |
| 动效 / reduced-motion | 全部动画 `motion-safe:` 前缀 (脉冲/浮层入场沿用 FloatingPopover 既有) | 代码走查 |

## 5. 测试策略 (AC10)

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| fullChangelog 开启; releaseNotes string/数组归一化 (含截断/上限); 自动检查错误静默 vs 用户主动错误露出; check/download catch 分支同语义 | unit | `tests/unit/updater-controller.test.ts` (扩) | `pnpm vitest run tests/unit/updater-controller.test.ts` | — |
| UpdateState 契约变更后无 `notes` 残留消费 | unit (typecheck 兜底) | 全仓 typecheck | `pnpm typecheck` | — |
| releaseNoteHtmlToText 提纯 (br/li/块级/纯文本/恶意标签不执行) + formatVersionRange | renderer unit | `tests/renderer/release-notes.test.ts` (新) | `pnpm vitest run tests/renderer/release-notes.test.ts` | — |
| 指示器逐 phase 渲染 (idle/not-available 零渲染; 各态文案/点/进度) + 点击流转 dispatch + 折叠态 aria-label + 浮层 click 冒烟 + UpdateNotesPanel 直测 (多版本条目/空态/error 态) + Modal 打开 | renderer | `tests/renderer/sidebar-update-indicator.test.tsx` (新) | `pnpm vitest run tests/renderer/sidebar-update-indicator.test.tsx` | hover 触发在 jsdom 不稳定 → panel 直测 + click 冒烟 (scan-status 先例) |
| store updateState slice + use-update 改读 store 后 settings 回归 | renderer (既有) | `tests/renderer/settings-update.test.tsx` | `pnpm vitest run tests/renderer/settings-update.test.tsx` | — |
| IPC 四方对账 (通道零变化) | unit (既有) | `tests/unit/ipc-contract.test.ts` | `pnpm vitest run tests/unit/ipc-contract.test.ts` | — |
| i18n 结构合规 | renderer (既有) | `tests/renderer/i18n-plural-convention.test.ts` | `pnpm vitest run tests/renderer/i18n-plural-convention.test.ts` | — |
| dev 模拟快捷键 | manual | — | dev 运行按 Ctrl+Shift+U | dev-only 调试胶水, 不进打包; 以 verify 阶段手动驱动全状态序列为证据 |
| 视觉/交互验收 | manual | — | dev 模拟 + 实测窗口截图 | 主观视觉项按不变量 22 交用户确认 |

## 6. 验收标准映射

| SPEC 项 | 对应 AC |
|---|---|
| §2.3 主按钮各态渲染 + null 态 | AC1 |
| §2.3 点击流转 | AC2 |
| §1 契约 + §2.3 浮层/Modal + §2.3 lib 提纯 | AC3 |
| §2.1 userInitiated 静默 | AC4 |
| §2.3 折叠态 | AC5 |
| §2.2 store 单源 + D4 | AC6 |
| §2.4 i18n | AC7 |
| §4 动效/主题行 | AC8 |
| §4 可访问性行 | AC9 |
| §5 测试矩阵 | AC10 |
| §2.1 dev 模拟 + §4 截图验收 | AC11 |
