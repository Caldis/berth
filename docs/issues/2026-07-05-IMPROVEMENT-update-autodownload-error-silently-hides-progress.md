# IMPROVEMENT: autoDownload 后台下载失败时 downloading 进度条无痕消失

状态: OPEN (低优, 非阻塞; 仅 autoDownload=true 且下载中途失败时可见)

## 描述

GH-156 引入的错误分级把**非用户主动**动作的 updater 错误静默为 `not-available` (启动自动检查失败不打扰用户)。但 `autoDownload=true` 时, electron-updater 在 available 后**内部自动开始下载** (不经 `controller.download()`, `userInitiated` 保持 false); 若该下载中途失败, error 事件同样被静默为 `not-available` → 侧边栏指示器上用户正看着的 downloading 进度条**连同整行无痕消失** (若浮层/Modal 打开也随组件卸载)。错误仅落主进程日志。

## 影响

- 默认配置 (`autoDownload=false`) 不受影响 — 用户主动点击下载的失败会正常显示 error 态。
- `autoDownload=true` 的用户在网络中断等场景会看到进度条静默蒸发, 无解释; 下次启动自动检查会重新走一遍, 有自愈路径。

## 建议

后台下载失败时不要降级到 `not-available`, 而是回落 `available` (更新仍然存在, 只是这次下载没成) + 保留静默 (不弹 error); 或在 UpdateState 增加轻量 `downloadFailed` 标记供指示器展示"下载中断, 点击重试"。需要 main 侧区分 error 来源 (check vs download), 可用 phase 序列推断 (上一 phase 为 downloading 即下载失败)。

## 来源

GH-156 verify 阶段 Spec 轴评审发现 (2026-07-05, `docs/works/2026-07-05-gh-156-update-ux-sidebar/`); SPEC/AC4 只定义了"自动检查错误静默", 自动下载错误行为属未决空档, 不在该任务验收范围, 交叉引用记录。
