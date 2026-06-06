# 描述
- 侧边文件查看抽屉 (FileViewerDrawer / markdown reader) 的 header 与右上角应用窗口控件
  (固定/最小化/最大化/关闭) 同时可见, 出现**两套 [X]**(抽屉自带关闭 X + 应用窗口关闭 X),
  且抽屉 header 高度与外层 header 不一致。

# 重现步骤
- 打开任一资产详情 → 点"查看文件" → 右侧文件查看抽屉弹出。
- Windows 下: 抽屉 header 右侧通过 `pr-48` 预留空间躲避窗口控件, 控件仍悬浮可见 → 双 X。

# 预期结果
- 抽屉 header 与外层 header 等高, 并盖住右上角三个窗口控件, 仅保留单一关闭入口。

# 实际结果
- 抽屉 z-[9990] 低于 WindowControls z-[10000], 且 header py-3(~60px)与外层 72px 不齐。

# 解决方案 / 状态
- 已修复 (GH-110, 提交 604d20b4): 抽屉 z 提到 `z-[10001]` 盖住窗口控件; header 改
  `min-h-[72px]` 与外层等高并移除 `pr-48` 右侧预留。抽屉为模态(遮罩+Esc+自带 X),
  打开期间窗口控件被覆盖可接受。WindowControls 与 InspectorDrawer 为同栈上下文兄弟,
  z 序成立(实测 header y=0 h=72, 控件落于 header 区内被覆盖, 单一 X)。
- 状态: **RESOLVED**。
