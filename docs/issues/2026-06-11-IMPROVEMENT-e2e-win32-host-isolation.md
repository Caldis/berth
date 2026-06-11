# 描述
- e2e 隔离在 win32 缺位: GH-117 的共享 launch helper 只在 POSIX 经 `HOME` 接管 `os.homedir()` (决策: 不覆盖 `USERPROFILE`, 因会波及 Electron 自身路径推导且当时无法在 POSIX 机上实证), Windows 行为与隔离前一致 — 测试直接扫宿主真实 `~/.claude`。
- 后果: `project-scope.e2e.ts:68` 的隔离断言 `expect(getByRole('option')).toHaveCount(3)` 在宿主数据丰富的 Windows 开发机必现失败 (实测 14 个 option, 宿主 11+ 真实项目泄入), 本地 `pnpm test:e2e` 无法全绿。

# 证据
- GH-119 T3 (2026-06-11, win32 开发机) 实测: 带改动与 stash baseline **双侧同失败** (14≠3), 证实与当次改动无关、为预先存在的环境依赖。
- `tests/e2e/launch.ts:37-40` 注释自认: "win32 的 os.homedir() 读 USERPROFILE 而非 HOME, 此处不覆盖 USERPROFILE … 隔离仅在 POSIX 生效 (GH-117 02-SPEC 决策 1)"。
- CI (POSIX) 不受影响 — HOME 接管生效, GH-117 验收时 CI 绿。

# 预期 / 建议
- 给 win32 落实等效隔离, 候选方向 (需实证 Electron 对 USERPROFILE 的敏感面):
  1. launch helper 在 win32 同时覆盖 `USERPROFILE` + 显式 `--user-data-dir` (后者已传) 并实测 Electron 路径推导是否仍健康;
  2. 或主进程为 home 解析引入可注入 seam (env `BERTH_HOME_OVERRIDE` 仅 NODE_ENV=test 生效), 绕开 os.homedir 平台分叉;
  3. 或 win32 上跳过隔离敏感断言 (最后手段, 削弱回归网, 不优先)。
- 验收: 宿主数据丰富的 Windows 机上 `pnpm test:e2e` 全绿且隔离断言仍有效 (option 计数=3)。

# 来源 / 关联
- GH-119 T3 实测发现 (docs/works/2026-06-11-gh-119-electron-window-hardening), baseline 对比定性; 上游决策 GH-117 (docs/works/_archive/2026-06-11-gh-117-project-scope-e2e-macos)。
- 状态: OPEN。
