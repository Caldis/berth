# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源: 用户请求与截图, 2026-06-04。

## 复现步骤

1. 打开应用, 进入带 header 指南按钮的页面, hover header 中的指南按钮。
2. 进入能力 > Hooks, 在左侧生命周期栏的 Hook 检查区域 hover 状态 tag。

## 期望 vs 实际

期望:
- Header 指南浮层和 Hooks 左侧 Hook 检查 hover 浮层都显示在应用 shell 上方, 不被左侧导航栏或滚动容器裁剪。
- 这些 popover / tooltip 类浮层收敛到公共组件。
- 优先引用成熟开源控件, 不手写定位系统。

实际:
- Header 指南浮层和 Hooks Hook 检查 hover 浮层会被左侧导航栏截断, 存在层级与 overflow 上下文问题。
