# 工程摩擦记录

> 命名: docs/friction/{YYYYMMDD}-{phase}-{summary}.md (phase: new|continue|explore|design|implement|verify|archive|optimization)

## 发生阶段

verify

## 现象

Windows 沉浸式标题栏任务完成后, 用户反馈右上角按钮点不了。上一轮验证只确认了按钮可见、菜单栏隐藏、构建和单元测试通过, 没有在完成前点击自绘窗口按钮验证最小化/最大化/关闭链路。

第二次补测仍不充分: 使用 Playwright/CDP 点击能触发 renderer click, 但这会绕过真实 Windows 鼠标经过 Electron `-webkit-app-region` 的原生命中测试。真实鼠标 hover 没有效果, 说明事件在进入 DOM 前被拖拽区吃掉。

## 工程师介入动作

- 复查 Berth 与 bobcorn 的标题栏实现差异。
- 用 Electron + Playwright 新实例验证按钮点击是否触发 `BrowserWindow` 最大化。
- 将窗口按钮层级提升到 `z-[10000]`, 并在容器和按钮上显式保留 `titlebar-no-drag` / `pointer-events-auto`。
- 调整 `AppLayout`: Windows 下顶部拖拽条右侧让出按钮区域, 并把 `WindowControls` 放在 `main` 后渲染, 避免后面的 `titlebar-drag` 区域覆盖按钮命中。
- 增加 `tests/e2e/window-controls.e2e.ts`, 使用 Win32 `SetCursorPos` + `mouse_event` 发真实系统鼠标点击, 再断言主进程窗口状态变化。

## 应沉淀的上下文或规则

涉及 Electron `frame:false`、`titleBarStyle`、`preload`、`-webkit-app-region` 的改动, 验证标准不能停在 DOM 可见或截图可见。也不能只用 Playwright/CDP 点击代替真实鼠标, 因为 CDP 输入可能绕过系统非客户区和 draggable region 命中。必须至少用真实 OS 鼠标点击一个窗口按钮, 并从主进程读取窗口状态确认事件链路真实生效。

主进程和 preload 改动不能依赖 renderer HMR。验证和交付说明里必须明确需要重启 Electron 实例; 否则可能出现 renderer 显示了新按钮, 但运行中的 preload 仍是旧接口, 点击无效。

## 建议的流程改进

把“可见 + 真实鼠标可点 + 主进程状态变化”作为自绘窗口 chrome 的最小验收项。以后类似任务默认补真实鼠标 E2E, 并在最终说明中明确当前运行实例是否需要重启。若用户反馈 verify 阶段遗漏, 必须将任务重新视为 implement/verify 循环, 不把第一次绿色结果当成有效验收。
