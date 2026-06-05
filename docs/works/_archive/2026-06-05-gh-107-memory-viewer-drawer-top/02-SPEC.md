# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 方案选定: C1 (drawer 背景贴顶 + macOS titlebar-drag spacer)
仅改 `src/renderer/src/components/shared/file-viewer-drawer.tsx`:
1. backdrop (line 159): 保留 `isMac ? 'top-10' : 'top-0'` 不动 — 全宽遮罩仍从 40px 起, 左上红绿灯条不被半透明黑压暗。[验收 2]
2. drawer 容器 (line 171): `isMac ? 'top-10 h-[calc(100%-2.5rem)]' : 'top-0 h-full'` → 统一 `top-0 h-full` — drawer 背景从窗口顶起, 消除面板上方留白。[验收 1]
3. 在 resize handle 之后、header 之前插入 macOS 专属占位条:
   `{isMac && <div aria-hidden="true" data-testid="file-viewer-mac-titlebar" className="titlebar-drag h-10 w-full shrink-0" />}`
   该条复用 `sidebar.tsx:80` 既有约定 (`titlebar-drag h-9` spacer)。作用: 把 header 内容压到顶部 40px 系统区之下, 使 close/copy 按钮绝对位置与当前 `top-10` 方案一致, 同时顶部 40px 保留窗口可拖。[验收 1/3]
4. header (line 192) `isWindows && 'pr-48'` 不动。[验收 4]

净效果: drawer 背景贴顶, header 内容与按钮的绝对位置不变 (仍在距窗口顶 ~40px 以下), backdrop 红绿灯保护不变。

## 外部约束 (primary source, 决定方案 C1 而非简单 top-0)
macOS `titleBarStyle: 'hiddenInset'` 顶部系统区内 `-webkit-app-region: no-drag` 元素的可点性不可靠 (Electron 已知行为):
- maximize→restore 后顶部区按钮失去 click: https://github.com/electron/electron/issues/17425
- no-drag 处理不当: https://github.com/electron/electron/issues/41695
- 顶部 traffic-light 区特定状态不接收 click: https://github.com/electron/electron/issues/39885
结论: no-drag 按钮在常规窗口可点, 但落在顶部系统区 / maximized 边缘时可能丢失 click。方案 C1 让 close/copy 按钮停留在 40px 以下避开该区, 规避此回归 (用户提示的"关闭按钮无法交互"红线)。方案 B (drawer + 按钮整体 top-0) 会把按钮推入该区, 弃用。

## 数据契约
无。纯 renderer 布局/样式改动, 不涉及 IPC、store 字段或 main 进程。

## 任务分类与 debt
- type: bug; source.kind: user-request; refs: GH-107。
- debt.estimate: incurred 1 / repaid 0 / net 1 / scope file / risk low / areas [ui-ux] / confidence high。
- debt.final 预期: 与 estimate 一致 (单文件 + 单测试, 方案 C1 经 primary source 规避已知坑)。
- revisions: explore 已记一次 (module/medium → file/low); design 不改变估算实质, 不新增 revision。
- Project 字段同步: Task Type=bug / Priority=P2 / scope=file / risk=low 已随 ensure 写入, archive 时 done 同步 final。

## 模块结构 / 组件拆分
仅 `file-viewer-drawer.tsx` 一处。`inspector-drawer.tsx`、`memory-view.tsx`、`file-viewer-button.tsx` 不改 (透传/调用方)。组件被 memory 与 inspector 共用, 改动对两入口一致。[验收 6]

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | drawer `top-0 h-full` 贴顶; macOS 顶部 40px 为 titlebar-drag 占位条; header 内容位置不变 | macOS 实测截图: 面板背景到顶无留白 [验收 1] |
| 组件选择 / 设计系统一致性 | 复用 `titlebar-drag` 既有 class 与 `sidebar.tsx` spacer 模式; 无新组件 | 代码评审 + 截图 |
| 交互反馈 / 状态切换 | slide-in 动画、copy Check 反馈、resize cursor 均不变 | 手动操作 + renderer 测试 |
| loading / empty / error / disabled / focus | 不变 (内容打开前已 load); 入场聚焦 close 不变 | renderer 测试 (focus 用例) |
| 响应式 / 可访问性 / 键盘可达 | width clamp 不变; spacer `aria-hidden`; Tab trap / Escape 不变 | renderer 测试 + 键盘实测 |
| 文案 / i18n / 数字和路径格式 | 无文案变更 | 不适用 |
| macOS 顶部交互 (回归红线) | close/copy 按钮留在 40px 以下避开系统区; 顶部 40px 可拖窗口 | macOS 实测: 常规 + maximize→restore 后点击 close/copy 均生效 [验收 3] |
| 红绿灯遮罩 | backdrop 保留 top-10 | macOS 截图: 左上红绿灯不被压暗 [验收 2] |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| macOS drawer 贴顶 (`top-0 h-full`, 不再 `top-10`) | renderer | tests/renderer/inspector-drawer.test.tsx | `pnpm test -- inspector-drawer` | — |
| macOS 存在 titlebar-drag 占位条 (`data-testid=file-viewer-mac-titlebar`) | renderer | tests/renderer/inspector-drawer.test.tsx | 同上 | — |
| macOS backdrop 仍 `top-10` (红绿灯保护) | renderer | tests/renderer/inspector-drawer.test.tsx | 同上 | — |
| Windows drawer `top-0 h-full` + header `pr-48` 不变 | renderer | tests/renderer/inspector-drawer.test.tsx | 同上 | — |
| 既有 focus/Tab/Escape/copy/resize 不回归 | renderer | tests/renderer/inspector-drawer.test.tsx | 同上 | — |
| macOS 顶部 close/copy 可点 (常规 + maximize→restore); 面板贴顶视觉; 红绿灯不压暗 | manual (electron 实测) | — | `pnpm dev` + 实测窗口坐标截图 | jsdom 无法验证真实 app-region 系统行为与窗口状态; 必须 macOS 实机实测 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| drawer `top-0 h-full` 贴顶 | 1 |
| backdrop 保留 `top-10` | 2 |
| macOS titlebar-drag spacer 使按钮避开系统区 | 1, 3 |
| header `pr-48` 不动 | 4 |
| 既有交互 renderer 测试 | 5 |
| 共用组件一致 | 6 |
