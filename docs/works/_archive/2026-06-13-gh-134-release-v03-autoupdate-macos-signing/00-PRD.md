# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
- 用户指令 (2026-06-13): "这个会话我们来优化发布版本和构建问题。自动更新功能支持自动检查/beta通道等开关。github release 发布版本增加 macos 版本 release (使用 zip 包) (macOS 版本的签名方式可以参考 bobcorn 项目)。然后将版本 bump 到 0.3 发布新版本。"
- GitHub Issue: https://github.com/Caldis/berth/issues/134
- 前置任务: GH-124 自动更新流水线 (`docs/works/_archive/2026-06-12-gh-124-release-pipeline-auto-update`)
- 前置 issue: `docs/issues/resolved/2026-06-04-IMPROVEMENT-macos-release-signing-config.md` (未签名分支已落地, 注明"签名发布属新需求另立案")
- 参考仓库: D:/Code/bobcorn (同作者 Electron 项目, electron-builder + electron-updater, mac CSC_LINK/APPLE_* 签名+公证流水线)

## 正文 (用户原话)

> 这个会话我们来优化发布版本和构建问题
> 自动更新功能支持自动检查/beta通道等开关
> github release 发布版本增加 macos 版本 release (使用 zip 包) (macOS 版本的签名方式可以参考 bobcorn 项目)
> 然后将版本 bump 到 0.3 发布新版本

## 三项目标

1. **自动更新开关**: 当前 `update-preferences.ts` 仅有 `autoDownload` 偏好。需补:
   - 自动检查 (auto-check): 应用启动 / 周期性是否自动 `checkForUpdates`。
   - beta 渠道 (allowPrerelease): 是否接收预发布版本。
   - 以上做成设置中可见开关, 持久化并接线到 electron-updater (`autoUpdater.channel` / `allowPrerelease` / 自动检查调度)。

2. **macOS 签名 zip 发布**: 当前 mac 未签名, electron-updater 在 mac 上被降级为 `platformLimited` (仅跳转 releases 页)。需:
   - GitHub Release 提供签名后的 macOS zip (electron-updater 在 mac 上以 zip + latest-mac.yml 为更新源)。
   - 签名 + 公证方式参考 bobcorn 项目 (CSC_LINK / CSC_KEY_PASSWORD / APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID 等 secrets, electron-builder notarize)。
   - 签名链路打通后解除 updater 的 `platformLimited` 降级分支 (updater.ts 注释已标注 "Lift the branch once the signing issue is resolved")。

3. **版本 bump 0.2.0 → 0.3.0 并发布新版本** (tag `v0.3.0` 触发 release.yml)。

## 已知执行约束 (继承自 GH-124)

- pnpm 9.15.4 workspace (corepack 钉版); release.yml 全 pnpm 化含 @berth/scan-engine 三连。
- IPC 新通道必须四方同批 (IpcChannels/IpcEvents 表 + handlers + preload + setup mock; 对账测试强制); electron 值 import 白名单。
- 本机为 Windows, **无法本地跑 mac 签名打包**; macОС 全链验证依赖 GitHub macOS runner + Apple 凭据。
- mac 签名 secrets 是否已在 berth GitHub 仓库配置 = explore/design 待核实的关键阻塞项 (Apple Developer 账号/证书/公证凭据)。
