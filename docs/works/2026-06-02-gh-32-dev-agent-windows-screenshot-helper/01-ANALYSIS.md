# 需求分析 (Explore 产物)

## 现状理解

- `dev:agent` 已有实例隔离、state、status、guard、debug port 能力, 核心在 `scripts/agent-dev-core.mjs`。
- 当前视觉验收要截真实 Electron 窗口时, 仍依赖临时 PowerShell/C# 脚本。重复风险包括:
  - PowerShell 7 编译 `System.Drawing` 相关类型失败。
  - Windows PowerShell 5.1 若不显式引用 `System.Drawing.dll`, `System.Drawing.Imaging` 仍可能解析失败。
  - `CopyFromScreen` 依赖屏幕最终合成结果, 被遮挡时会截到遮挡窗口。
- `listProcesses()` 已能在 Windows 读取所有进程命令行。agent-owned Electron 主进程可通过 `electron.exe`、`--berth-agent-instance=<id>`、无 `--type=` 识别。

## 关联与依赖

- Microsoft `PrintWindow` 官方文档说明它会把窗口视觉内容复制到指定 device context, 成功返回非零; 这是遮挡场景下更合适的默认模式: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-printwindow
- Microsoft `DWMWA_EXTENDED_FRAME_BOUNDS` 文档说明该属性可取屏幕空间中的扩展窗口边界矩形: https://learn.microsoft.com/en-us/windows/win32/api/dwmapi/ne-dwmapi-dwmwindowattribute
- Microsoft `Graphics.CopyFromScreen` 文档说明它从屏幕复制像素数据到绘图面, 因此只能作为无遮挡辅助模式: https://learn.microsoft.com/en-us/dotnet/api/system.drawing.graphics.copyfromscreen
- 该能力只面向 Windows 真实窗口截图; macOS/Linux 暂不扩展, 避免把本轮范围放大成跨平台截图系统。
- 默认输出路径应落在 agent dev 临时目录中, 不写项目目录。显式 `--output` 用于需要固定证据路径的验收场景。

## 验收标准

1. `pnpm dev:agent screenshot <id> --json` 能解析并调用截图能力。
2. 默认输出到当前 agent instance 临时目录; `--output <path>` 能指定输出文件; `--mode print-window|screen` 可选。
3. 截图前必须确认实例 state 存在、owned dev server 仍运行, 并找到带 `--berth-agent-instance=<id>` 的 Electron 主进程; 找不到时失败。
4. Windows 下调用 Windows PowerShell 5.1 / `powershell.exe` helper, 显式引用 `System.Drawing.dll`, 支持 `PrintWindow` 默认模式和 `CopyFromScreen` screen 模式。
5. 输出 JSON 包含 `outputPath`、`mode`、Electron pid、window handle、bounds、file size。
6. 单元测试覆盖解析、进程识别、helper 调用和错误路径; runtime verify 对 agent-owned 实例生成 PNG。

## 界面质量与交互验收

非产品 UI 任务; 但需要真实 Electron 窗口截图验证。

## 未决问题

无。
