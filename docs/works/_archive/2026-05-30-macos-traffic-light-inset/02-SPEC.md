# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
无新增 IPC / 数据结构。平台判定用 renderer 端 `navigator.platform.includes('Mac')` (与 sidebar.tsx:143 既有用法一致)。

## 模块结构 / 组件拆分
仅改 `src/renderer/src/components/layout/sidebar.tsx` 的 logo header (第 116 行起):
- 计算 `isMac = navigator.platform.includes('Mac')`。
- macOS 下给 logo header 容器顶部预留红绿灯空间: 由 `h-14`(56) 改为在 macOS 增加 `pt-[26px]` 顶部内边距 (红绿灯 y=16 + 按钮高度 ~14 → 内容下移到 ~30px 以下), 同时整体高度增至约 `h-[68px]` 以保持图标垂直区合理。
- 非 macOS 维持原 `h-14` 无额外 pt (验收 3)。
- 折叠态共用同一 header 容器, 自动生效 (验收 4)。
- main 进程 index.ts 窗口配置不动 (trafficLightPosition 保持 16,16)。

实现以 className 条件拼接 (cn 工具) 表达, 不引入内联 style 魔法数分散。

## 测试策略
- 该改动为纯视觉布局, 无逻辑分支可单测; 依赖 verify 阶段启动 app 截图人工/视觉验收 (验收 1/2/4)。
- 回归: lint / typecheck / 既有 45 test 全绿 (验收 5)。
- Windows 不变验证: 代码层确认 pt 仅在 isMac 分支添加 (验收 3)。

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| macOS header 顶部加 pt-[26px] | 1, 2 |
| 非 mac 维持 h-14 无 pt | 3 |
| 折叠态共用容器 | 4 |
| lint/typecheck/test | 5 |
