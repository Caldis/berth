# 技术方案 (Design 产物)

## 数据契约

- 不新增 IPC。
- 不修改 `ThemeProvider` 对外契约。
- 不修改 i18n 初始化契约。
- 设置弹窗内部继续使用 localStorage keys:
  - `berth-theme`
  - `berth-language`
  - `berth-file-watching`
  - `berth-advanced-mode`

## 模块结构 / 组件拆分

- `src/renderer/src/components/layout/nav-config.ts`
  - 移除 Settings 导航项和 `Settings` 图标 import。对应验收标准 2。
- `src/renderer/src/components/layout/sidebar.tsx`
  - 移除直接 theme/language 快捷按钮逻辑。
  - 增加设置弹窗 open state。
  - 底部设置按钮打开弹窗, 折叠按钮继续保留。对应验收标准 1、3、6。
  - 引入 `SettingsDialog` 组件。
- `src/renderer/src/components/layout/settings-dialog.tsx`
  - 从原 Settings 页面抽出弹窗内容。
  - 负责遮罩、dialog、关闭按钮、Esc 关闭、设置项展示。对应验收标准 4、5。
- `src/renderer/src/pages/settings.tsx`
  - 提供可复用的设置内容组件, 由弹窗承载。对应验收标准 4。
- `src/renderer/src/App.tsx`
  - 移除 `/settings` 独立页面路由, 避免设置继续以页面形式出现。对应验收标准 3。
- `src/renderer/src/components/layout/search-dialog.tsx`
  - 移除 Settings 页面入口。对应验收标准 7。

## 测试策略

- 静态检查: `pnpm typecheck`, `pnpm lint`。
- 单测: `pnpm test`。
- 视觉/交互验收:
  - 启动或复用 Electron 应用。
  - 截图确认侧边栏底部布局。
  - 点击底部设置按钮, 截图确认设置以弹窗显示。
  - 验证遮罩或关闭按钮可关闭弹窗。

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| nav-config 移除 Settings 普通项 | 2 |
| sidebar 底部设置按钮与折叠按钮 | 1, 3, 6 |
| settings-dialog 弹窗和设置内容 | 4, 5 |
| search-dialog 移除 Settings 跳转 | 7 |
| 门禁与 UI 验收 | 8 |
