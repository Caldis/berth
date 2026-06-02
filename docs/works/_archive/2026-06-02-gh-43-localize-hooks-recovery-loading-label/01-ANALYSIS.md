# 需求分析 (Explore 产物)

## 现状理解
问题只在 renderer:
- `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx` 的恢复中心 loading skeleton 有硬编码英文 aria-label。
- 该文件已经使用 `useTranslation`, 所以组件层不需要新增 i18n 初始化逻辑。

## 关联与依赖
不改 Hooks recovery 数据结构、IPC、恢复逻辑或视觉布局。只增加 locale key 并替换 aria-label。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 中文界面下 recovery loading skeleton 的 accessible name 为中文。
2. 英文界面仍保留 `Loading hook recoveries`。
3. 源码不再包含该硬编码英文 aria-label。

## 界面质量与交互验收
这是可访问性文案修复。loading skeleton 的数量、尺寸、间距、动画和布局保持不变。

## 未决问题
无。
