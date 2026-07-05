# 01-ANALYSIS — 优化版本更新体验 (GH-156)

> Explore 产物。输入: 00-PRD.md; 调查: bobcorn 更新交互全链路 + berth 现有更新栈 (两个 Explore 子代理, 2026-07-05)。

## 1. 现状理解 (berth)

### 主进程
- `src/main/updater.ts` (GH-124/GH-134): 全依赖注入、electron-free 的状态机 controller。事件归一为 `UpdateState` 单对象: `checking / available(version,notes≤2000) / not-available / downloading(percent 取整) / downloaded(version) / error(message)`。`check()`/`download()` 自带 try-catch → emit error。
- 装配 (`src/main/index.ts:308-327`): whenReady 后创建 controller, `emit` 对所有窗口广播 `update:state`; `autoCheck` 开启时**启动 5s 后自动 check 一次**, 无轮询。
- 偏好 (`src/main/update-preferences.ts`): `userData/update-preferences.json`, `{autoCheck:true, autoDownload:false, allowPrerelease:false}` 默认, 逐字段 merge 容错。
- electron-updater 配置: `electron-builder.yml` + `dev-app-update.yml` 均 `provider:github / Caldis/berth`; dev 模式 `forceDevUpdateConfig` 可走真 releases 测链路。

### IPC 契约 (真源 `pkg:shared/types/ipc.ts`)
- invoke ×5: `update:check|download|install|get-preferences|set-preferences`。
- broadcast ×1: `update:state` → `UpdateState`。
- preload `window.api.update.{check,download,install,getPreferences,setPreferences,onState}`; 四方对账测试 `tests/unit/ipc-contract.test.ts` 强制。
- **本次改造预期零通道增删** (状态机数据已齐全, `notes` 字段 main 已传但 UI 未消费)。

### 渲染进程
- `hooks/use-update.ts`: 组件内 useState 局部管理 (不进 zustand store), mount 时 getPreferences + onState 订阅。当前唯一消费者是 settings。
- `components/settings/update-section.tsx`: 深埋 Settings→About 卡片内。状态文本一行 (进度/错误都拼进同一行文本), 条件互斥按钮 (check/download/install), 三个偏好 Switch。**无进度条、无 release notes 渲染、无常驻入口**。
- i18n: `settings.update.*` 13 个 key (zh.json:2221-2235 / en.json 对应)。

### 侧边栏 (`components/layout/sidebar.tsx`)
- 结构: macOS 拖拽带 → Logo(h-14) → 顶部控件(scope/agent/search) → 中部 nav(flex-1) → **底部 footer (`border-t p-3`, :171-201): [Settings 按钮][SidebarScanStatus][折叠按钮]**, 折叠时 `flex-col`。
- 折叠态存在 (80px vs 200-360px 可拖), **不持久化** (无 persist)。
- footer 无版本号、无更新元素 → 改造落点即此 footer 行。
- 先例: `sidebar-scan-status.tsx` — 同样是 footer 内图标 + `FloatingPopover` hover 弹层 (side 折叠时 right/否则 top, `align="end"`, hoverBridge), 是新指示器的结构模板。

### 设计系统可复用件
- `shared/floating-popover.tsx` (@floating-ui): hover(safePolygon, closeDelay 80ms)/click 两模式、fixed 定位、flip/shift 防溢出、Esc/outside dismiss、`motion-safe:animate-in` 动画。**复用不改**。
- `@/components/ui`: HeroUI `Progress/Tooltip/Badge/Modal/Switch/Spinner` + berth `Button/Chip(tone)`。
- 语义色: `--primary`=蓝(CTA), `--destructive`=红; **无独立 `--success`/`--warning` CSS 变量** — 成功/警告走 HeroUI success/warning 或 tailwind emerald/amber 类名 (scan-status 先例: `text-amber-500`/`text-red-500`)。
- 动效 token: `ui/motion.ts` MOTION.duration/ease; 动画一律 `motion-safe:` 前缀。

### 测试布局
- `tests/unit/updater-controller.test.ts` (fake UpdaterLike + fire()), `tests/unit/update-preferences.test.ts`, `tests/renderer/settings-update.test.tsx` (mock onState 捕获 pushState 驱动), `tests/unit/ipc-contract.test.ts` 四方对账。`tests/setup.ts` mockApi.update (:278)。
- renderer 测试: vitest + @testing-library/react + 真实 i18n。

## 2. 参考对象 bobcorn 交互模型 (提炼)

核心哲学: **把"更新"做成状态栏微交互 (一颗按钮 + hover 卡片), 而非打断式弹窗**。

1. 状态机 6 态, `idle` 时指示器**完全不渲染** (手动检查入口在 Settings)。
2. 底栏按钮各态: checking="检查更新…"(不可点) / available=蓝点**脉冲一轮即停**(animationiteration 移除类)+"vX 可用" / downloading=**48×2px 条形进度**(CSS transition 平滑)+"{percent}%" / downloaded=绿点+"重启更新至 vX" / error=红点+"更新失败"(title 挂具体错误)。
3. 点击流转: available→下载; downloaded→重启安装; error→重试检查; checking/downloading 不可点。
4. hover 浮层 (300ms 进/200ms 出, portal fixed 视口钳制, 宽 240px, maxHeight=视口/3): 头部 [状态点+版本(跨版本显 vA→vB)+New/Ready 徽标+Maximize2 icon], 内容 changelog; **整卡点击→放大 Dialog** (max-w-xl, max-h-[60vh], 无底部按钮)。浮层不承担下载/安装操作 (归主按钮)。
5. release notes 双源: 优先官网 `changelog.json` 结构化聚合 (semver 筛 (当前,目标] 区间**全部跨版本条目**新→旧); 回退 electron-updater releaseNotes 经 **DOMParser 提纯纯文本** (从不注入 HTML); 双无→"暂无更新说明"。
6. 错误分级: **自动检查错误静默** (main 用 `userInitiatedAction` 闭包标志, 非用户触发的 error 转发为 not-available); 用户主动操作错误才露出。
7. 下载中有"×"软取消 (仅 UI 复位 idle + 可跳官网, 不真正中止下载)。
8. 安装前守卫: 未保存数据三选一 + dev 模式二次确认 (bobcorn 是编辑器有脏状态; berth 是只读工具, 无此需求)。
9. 无"跳过此版本"持久化。

## 3. 关联与依赖 / blast radius (符号边界)

| 文件 | 改动性质 | 符号边界依据 |
|---|---|---|
| `src/renderer/src/components/layout/sidebar.tsx` | 修改: footer 挂载新指示器 | JSX 使用点 +1 (footer flex 行) |
| `src/renderer/src/components/layout/sidebar-update-indicator.tsx` (新) | 新增: 指示器 + 浮层 + Modal | 单页消费 → layout 域 (同 sidebar-scan-status 先例) |
| `src/renderer/src/hooks/use-update.ts` | 复用; 或小改 | 消费者从 1 (update-section) 变 2; 双实例各自订阅 update:state, 状态由 main 广播天然一致 |
| `src/renderer/src/components/settings/update-section.tsx` | 保持或小幅增强 | 独立组件, 不被他处 import |
| `src/renderer/src/i18n/locales/{zh,en}.json` | 新增 key | **可枚举注册契约, 并发撞车点** (不变量 11): 写前 grep key 确认未占用 |
| `src/main/updater.ts` | 小改 (若做自动检查错误静默) | 被 index.ts + updater-controller.test.ts 引用 |
| `src/main/index.ts` | 小改 (启动 check 调用点传 auto 语义) | electron 装配层 |
| `tests/unit/updater-controller.test.ts` | 补断言 | 跟随 updater.ts |
| `tests/renderer/` 新组件测试 (新) | 新增 | 独立 |
| IPC 契约 / preload / setup.ts mock | **零变化** (通道集不动) | 四方对账测试守护 |
| `shared/floating-popover.tsx` | **不改** | 多页消费 (scan-status 等), 改动即扩大 blast radius |

依赖方向合规: 新组件只 import `@/components/ui` + `shared/floating-popover` + `hooks/use-update`, 无新 IPC、无 main 新分层。

## 4. 差距清单 (berth 现状 vs bobcorn 目标体验)

| # | 差距 | 现状 | 目标 |
|---|---|---|---|
| G1 | 无常驻入口 | 更新深埋 Settings→About | 侧边栏 footer 常驻指示器 (非 idle 态) |
| G2 | 无进度可视化 | 百分比拼进文本行 | 条形进度 + 平滑过渡 |
| G3 | release notes 不可见 | notes 字段 UI 未消费 | hover 卡片 + 放大 Modal |
| G4 | 错误不分级 | 自动检查失败也 emit error (若有 UI 常驻会打扰) | 自动检查错误静默, 用户主动操作才露错 |
| G5 | 无轻量点击流转 | 按钮在 Settings 内 | 点=下载/安装/重试 单键流转 |
| G6 | 折叠态无对应设计 | (bobcorn 无折叠) | 80px 折叠态图标级降级 (berth 特有, 需自行设计) |

## 5. 任务分类与 debt 校准

- type / maintenance.subtype: `maintenance` / `ui-ux` — 确认不变 (harness:stats 推荐, ui-ux 域 47 过线)。
- source.kind / refs: `user-request` — 不变。
- debt estimate 修正: 数值维持 incurred 2 / repaid 6 / net -4。
- scope / risk / areas / confidence: `cross-process` 确认 (renderer 为主 + main updater 小改); `medium` 确认 (触碰共享 sidebar + 启动检查行为, IPC 契约零变化压低风险); areas `[ui-ux]` 不变; confidence `low → medium`。
- revision: 已在 INDEX.md `debt.revisions[]` 追加 explore 校准记录。

## 6. 验收标准 (verify 据此逐条核对)

- **AC1 常驻指示器**: 侧边栏 footer 新增更新指示器; `idle`/`not-available` 完全不渲染; `checking` 显示检查文案(不可点); `available` 蓝点(脉冲一轮即停)+版本文案; `downloading` 条形进度+百分比; `downloaded` 绿点+重启安装文案; `error` 红点+失败文案。
- **AC2 点击流转**: available→触发下载; downloaded→重启安装; error→重试检查; checking/downloading 不可点。
- **AC3 更新内容浮层**: available/downloaded 态 hover 出卡片 (版本 + release notes, 防 HTML 注入的纯文本渲染, 空时"暂无更新说明"); 点击卡片放大 Modal 全文 (可滚动); Esc/outside 可关。
- **AC4 错误分级**: 启动自动检查失败静默 (不出现 error 态指示器); 用户主动 check/download 失败才显示 error 态, 具体错误可见 (tooltip/浮层)。
- **AC5 折叠态**: 80px 折叠下指示器降级为图标/圆点级, tooltip/浮层仍可用, 不破坏 footer 布局。
- **AC6 与 Settings 共存**: update-section 偏好开关与手动检查继续工作; 两处 UI 状态一致 (同一 `update:state` 广播源)。
- **AC7 i18n**: zh/en 同批新增, 插值规范, 现有 i18n 结构测试保持绿。
- **AC8 主题与动效**: light/dark 均正确; 动画走 `motion-safe:`; 脉冲一轮即停。
- **AC9 可访问性**: 指示器为可聚焦 button 且 aria-label 表意; 浮层 role 正确、焦点管理不破坏 (click 模式返回焦点)。
- **AC10 测试**: main 侧行为变化有 unit 覆盖 (fake updater); 新指示器组件测试覆盖各 phase 渲染 + 点击流转 + 浮层触发; `ipc-contract` / `settings-update` 等既有测试保持绿。
- **AC11 视觉验收**: dev 实测窗口逐状态截图核验 (利用 dev 模拟驱动状态机); 主观视觉项 (间距/对齐/密度) 交用户确认。

## 7. 界面质量与交互验收基线 (现状记录)

- **页面结构**: sidebar footer 单行 flex (折叠时 flex-col), 元素间 gap 小、图标 h-3.5; 信息密度低 (3 个图标级元素), 有容纳一个"文本+点"微组件的空间 (非折叠 ≥200px 宽)。
- **设计系统用法**: footer 内按钮统一 `text-[11px]`/图标 3.5 号 + hover bg 类; 弹层统一走 FloatingPopover (rounded-md border bg-popover shadow-lg)。
- **主要用户路径**: 现状 = 用户无感知→(手动) Settings→About→看一行状态文本; 目标 = 启动自动检查→有更新时 footer 出现指示器→hover 看内容→点击下载→进度→点击重启。
- **可见状态问题**: 现状 downloading/error 均为纯文本行, 无进度条/错误分级; notes 完全不可见。
- **交互反馈**: 现状 check 按钮 busy 时仅 disabled; 无动效。
- **响应式/可访问性风险**: 折叠态 (80px) 是 berth 特有约束, bobcorn 无对应设计, 需自行设计降级形态; 浮层在折叠态应翻转到右侧 (scan-status 已有先例 side 逻辑); reduced-motion 用户脉冲动画需 motion-safe 降级。

## 8. 未决问题 (design 阶段裁决)

- **Q1 release notes 数据源**: berth 官网无稳定机器可读 changelog.json 端点 (changelog 数据在 website i18n locale 内, dist 产物为 hash 命名)。选项: (a) 仅用 electron-updater releaseNotes (无新网络出口, 无 website 改动, 但只有目标版本单条、无跨版本聚合) — **倾向 (a)**; (b) 复刻 bobcorn 双源 (需 website 构建发布稳定 changelog.json, 扩大范围到 website 子项目)。
- **Q2 downloading 取消按钮**: bobcorn 为软取消 (仅 UI 复位, 不真正中止)。倾向**不做** (软取消有误导性, berth 下载本就静默后台 + autoInstallOnAppQuit 兜底)。
- **Q3 自动检查错误静默实现位置**: 倾向 main 侧 controller 增加 auto/user-initiated 语义 (与 bobcorn 同构), IPC 通道集不动 (仅 `update:check` 语义 = 用户主动)。
- **Q4 electron-updater releaseNotes 格式**: 官方契约 `string | ReleaseNoteInfo[] | null`, GitHub provider 的 body 具体是 HTML 还是 markdown 需 design 阶段查官方文档定提纯策略 (不变量 9; bobcorn 按 HTML 用 DOMParser 提纯, berth 现只收 string 且截 2000 字)。
- **Q5 update-section 是否同步增强**: 新指示器落地后 Settings 内是否也渲染 notes / 进度条, 还是保持现状仅偏好开关 + 手动检查。倾向最小增强 (保持现状), 避免双处维护同一浮层。

## 9. 交叉引用

- 历史: `docs/works/_archive/2026-06-12-gh-124-release-pipeline-auto-update/` (更新链路首建), `docs/works/_archive/2026-06-13-gh-134-release-v03-autoupdate-macos-signing/` (偏好开关 + macOS 签名)。
- 相邻 open issue: `docs/issues/2026-07-05-IMPROVEMENT-sidebar-scope-filter-persistence.md` (sidebar 持久化同域, 本任务不处理)。
- 无更新 UX 相关 open issue; 本任务即 GH-156。
