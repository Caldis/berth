# 需求分析 (Explore 产物)

## 现状理解

- Berth 主窗口在 `src/main/index.ts` 创建, 当前 Windows 配置为 `titleBarStyle: 'hiddenInset'` + `titleBarOverlay`, 但没有 `frame: false`, 也没有移除默认 Application Menu, 因此 Windows 上仍显示系统标题栏下的 `File / Edit / View / Window / Help` 菜单。
- 渲染层已有 `.titlebar-drag` / `.titlebar-no-drag` CSS, `AppLayout` 在主内容顶部放了 `h-9` 拖拽区, `Sidebar` 也把顶部 logo 区设为可拖拽。说明应用已经按沉浸式 chrome 做了一部分准备。
- `D:/Code/bobcorn` 的 Windows 逻辑是主进程 `frame: false`, `titleBarStyle: 'hidden'`, 渲染层挂 `TitleBarButtonGroup`, 通过 preload 暴露 `windowMinimize/windowMaximize/windowClose/windowIsMaximized/onMaximizedChange`。
- Berth 现有 preload API 集中在 `window.api`, IPC 契约在 `src/shared/types/ipc.ts`, 适合把窗口控制作为 `api.window.*` 加进去。

## 关联与依赖

- 主进程: `src/main/index.ts` 负责窗口 chrome 参数和 maximize/unmaximize 事件转发。
- IPC: `src/main/ipc/handlers.ts` 注册窗口控制 handler; `src/preload/index.ts` 暴露给 renderer; `src/preload/index.d.ts` 与 `src/shared/types/ipc.ts` 同步类型。
- 渲染层: `src/renderer/src/components/layout/app-layout.tsx` 是全局壳, 可在 Windows 下挂载自绘窗口按钮。平台判断在 `src/renderer/src/lib/platform.ts`。
- 既有未提交改动涉及 `Sidebar` 和 e2e spacing 测试, 本任务不依赖它们, 实现时不改这两个文件以降低冲突。

## 验收标准
1. Windows 下不再显示 Electron 默认菜单栏 (`File / Edit / View / Window / Help`)。
2. Windows 下窗口使用沉浸式标题栏/状态栏, 应用内容从顶部系统 chrome 下自然衔接, 不再出现额外菜单占位。
3. 非 Windows 平台不产生明显回归, 现有 macOS traffic-light 避让逻辑不被破坏。
4. 实现优先复用 `D:/Code/bobcorn` 的成熟逻辑, 只做适配本项目所需的最小改动。
5. 改动可通过自动检查或可重复的视觉验收验证。

## 未决问题
无。用户已明确允许复用 bobcorn 对应逻辑。
