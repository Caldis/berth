# 描述
- macOS 关闭窗口后经 Dock 激活重建的新窗口收不到 `assets:changed` 与 `assets:progress` 推送: 两个推送监听器在 `whenReady` 时以闭包捕获首个 `mainWindow`, `activate` 分支新建窗口但不重绑监听器, `isDestroyed()` 守卫只防崩溃不重定向 — 增量更新与扫描进度对新窗口静默失效 (初始快照走拉模式仍可得)。

# 重现步骤
1. macOS 启动应用, 关闭窗口 (应用因 `window-all-closed` 非 darwin 才 quit 而保持存活)。
2. 点击 Dock 图标触发 `activate`, 新窗口创建。
3. 修改任一被扫描文件 (如 `~/.claude/skills/` 下文件)。

# 预期结果
- 新窗口收到 `assets:progress` / `assets:changed`, 列表增量更新。

# 实际结果
- 推送发往已销毁的首窗口被 `isDestroyed()` 丢弃, 新窗口数据停滞, 需手动刷新/重扫。

# 证据
- `src/main/index.ts:143-146` watcher.setListener 闭包捕获 `mainWindow`; `:150-153` setProgressListener 同; `:155-157` activate 新建窗口无重绑。
- 静态接线事实已核验 (GH-115 架构分析对抗验证); 用户可感知度未真机实测。

# 解决方案
- 推送改 `BrowserWindow.getAllWindows()` 广播, 或抽接线函数供首建与 activate 复用; 修复后 mac 真机验证 activate 后增量推送可达。

# 来源 · 关联
- GH-115 架构全面分析 (2026-06-10) 旁支发现。关联 docs/works/_archive/2026-06-10-gh-115-architecture-refactor/。

# 终态 (2026-06-10, RESOLVED)
- 修复: `src/main/index.ts` 两个推送监听器 (`assets:changed` / `assets:progress`) 由闭包单播首窗口改为 `BrowserWindow.getAllWindows()` 广播 (含 isDestroyed 守卫), activate 重建的新窗口天然可达, 无需重绑。
- 验证: typecheck/lint 绿; `pnpm build` + `tests/e2e/incremental-watch.e2e.ts` 通过 (单窗口推送链路无回归)。macOS Dock 重建多窗口场景为平台特有, Windows 无法真机复现, 广播语义静态自证 (getAllWindows 含新建窗口)。
- 关联 commit: 见本文件移入 resolved 的同一提交。
