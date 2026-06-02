# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
不改应用数据契约和 IPC 契约。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
修改 `tests/e2e/window-controls.e2e.ts`:

- 保留真实 Win32 鼠标点击。
- 点击前从主进程取 `BrowserWindow.getNativeWindowHandle()` 作为窗口句柄, 避免依赖进程 `MainWindowHandle`。
- 将页面坐标换算到 Windows 屏幕坐标时考虑 `window.devicePixelRatio`。
- 如仍不稳定, 记录具体证据后再判断是否需要调用 Win32/DWM 取真实窗口物理边界。

修改 `playwright.config.ts`:

- 将 E2E workers 限制为 1, 避免 Electron 单实例锁和真实系统鼠标测试在 CI 并发启动时互相干扰。

修改 `.github/workflows/ci.yml`:

- `pnpm build` 在 Ubuntu 和 Windows 都执行。
- `pnpm test:e2e` 只在 `windows-2022` 执行, 覆盖 Windows 自定义标题栏真实鼠标链路。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改 UI | E2E 保持现有按钮可见性断言 |
| 组件选择 / 设计系统一致性 | 不改 UI | 不适用 |
| 交互反馈 / 状态切换 | 真实鼠标点击最大化/还原 | `window-controls.e2e.ts` |
| loading / empty / error / disabled / focus | 不改 UI | 不适用 |
| 响应式 / 可访问性 / 键盘可达 | 不改 UI | 不适用 |
| 文案 / i18n / 数字和路径格式 | 不改 UI | 不适用 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 窗口控件真实点击稳定 | e2e | `tests/e2e/window-controls.e2e.ts` | `pnpm exec playwright test tests/e2e/window-controls.e2e.ts --retries=0` | 不适用 |
| 全量 Electron E2E | e2e | `tests/e2e/*.e2e.ts` | `pnpm test:e2e` | 不适用 |
| Windows CI E2E | CI/e2e | `.github/workflows/ci.yml` | `gh run watch <run-id> --exit-status` | 需远端 Windows runner 实测 |
| 本地门禁 | lint/typecheck/unit/harness/build | 全仓 | `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm harness:check`; `pnpm build` | 不适用 |
| 推送后 CI | CI | GitHub Actions | `gh run watch <run-id> --exit-status` | 远端 runner 实测 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 修复真实鼠标定位 | 1, 3 |
| 限制 E2E worker 并加入 Windows CI E2E | 2, 5 |
| 本地门禁与远端 CI | 4, 5 |
