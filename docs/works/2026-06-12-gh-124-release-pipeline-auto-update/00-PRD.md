# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
- 用户指令 (2026-06-12, v0.2.0 发布后): "你让 github ci 去跑，整个构建流程和 skill 可以参考一下 bobcorn（位于 D 盘 code 下面），我还需要你加一个自动更新的功能，同样参考 bobcorn"。
- GitHub Issue: https://github.com/Caldis/berth/issues/124
- 参考仓库: D:/Code/bobcorn (同作者 Electron 项目, npm + electron-builder + electron-updater 6.8.3)。

## 正文

用户原话: 你让 github ci 去跑，整个构建流程和 skill 可以参考一下 bobcorn（位于 D 盘 code 下面），我还需要你加一个自动更新的功能，同样参考 bobcorn。

bobcorn 参考形态 (0.0-new 侦察):
- `.github/workflows/release.yml` 三阶段: test gate (ubuntu) → win/mac/linux matrix electron-builder 打包 (--publish never, fail-fast: false, 产物验存在 + upload-artifact) → publish job (全平台 artifact 齐验 → conventional-commit changelog 萃取 → 清残留 draft → gh release create → 资产上传含 latest*.yml → release 完整性校验含 latest.yml/latest-mac.yml/latest-linux.yml)。tag v* 触发。mac 走 CSC_LINK/APPLE_* secrets 签名+公证。
- 自动更新: `electron-updater` ^6.8.3; package.json build.publish = {provider: github, owner, repo}; main 侧 autoUpdater — autoDownload 按用户偏好 / allowPrerelease 按渠道 (beta) / autoInstallOnAppQuit / dev 模式 forceDevUpdateConfig + dev-app-update.yml; 全事件转发 renderer (checking / available(带 releaseNotes) / not-available / download-progress(percent) / downloaded / error); 更新偏好持久化 (readUpdatePreferences)。

berth 侧已知差异 (执行约束):
- pnpm 9.15.4 workspace (corepack 钉版, BUILD_ENV 强约束) vs bobcorn npm — workflow 全部 pnpm 化, 含 @berth/scan-engine 包三连。
- mac 签名 secrets 暂缺 (2026-06-04 签名 issue 既有跟踪) — 未签名打包沿 v0.1.1/v0.2.0 先例; **macOS 上 electron-updater 对未签名应用的限制需 explore 用官方 primary source 核实并如实定界**。
- IPC 新通道必须四方同批 (IpcChannels/IpcEvents 表 + handlers + preload + setup mock, 对账测试强制); electron 值 import 白名单 (index/dev-instance/devtools/ipc)。
- GH-119 加固不回退: sandbox/permission/导航守卫不受 updater 影响。
