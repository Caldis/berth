# 描述
- 对 `docs/works/_archive/2026-05-28-v0-1-development-plan/v0.1-development.md` 的 6 项 post-release 发布遗留做可行性评估, 标注归属与阻塞,
  并落地其中可自主、低风险的一项 (CI 加 production build 冒烟)。

# 重现步骤
- 参见 `docs/works/_archive/2026-05-28-v0-1-development-plan/v0.1-development.md` "Remaining Work (post-release)"

# 预期结果
- 每项有明确状态: 可自主落地 / 需外部条件 / 当前不宜

# 实际结果 (逐项评估, 2026-05-30)
1. **GitHub Actions CI for automated builds** — 部分完成且本次推进。
   - 已有: ci.yml 跑 lint/typecheck/test/harness:check。
   - 本次新增: `pnpm build` 冒烟步骤 (生产构建必须成功; 本地实测 BUILD_EXIT=0, 2.3s)。
   - 仍缺: 打包产物 (dmg/exe) 的自动构建与上传 release — 需签名密钥, 部分需用户。
2. **GitHub Pages (requires public repo)** — 阻塞: 需 public repo + 用户在 GitHub 设置启用。不能自主。
3. **NSIS installer (requires Windows Developer Mode)** — 阻塞: 需 Windows 环境 + 签名。macOS 不能自主。
4. **macOS .dmg build** — 代码层可行 (electron-builder.yml 已配, `pnpm package:mac`), 但属重型打包
   (下载 electron 二进制、签名), 且签名需证书。可在干净 macOS 环境自主试, 本会话工具状态不宜实跑。
5. **E2E test execution** — tests/e2e/app.e2e.ts 是真实测试 (electron.launch ['./out/main/index.js'],
   5 用例), 依赖先 `pnpm build`。可自主 `pnpm build && pnpm test:e2e`; CI 跑需 headless xvfb 配置,
   未纳入本次 CI (electron 在 CI/本会话运行不稳定, 需专门环境验证)。
6. **Performance profiling (startup < 1s)** — 需可靠的应用启动测量; 本会话 electron 启动反复不稳定,
   不宜在此环境产出可信数据。建议在干净环境用 performance.now() / Electron 的 ready-to-show 计时专门做。

# 解决方案
- 本次落地: ci.yml 增 `pnpm build` 冒烟 (#1 部分)。
- 待用户/专门环境: #2 (public repo 设置), #3 (Windows 签名), #4 (macOS 证书签名),
  #5 (CI headless e2e), #6 (启动 profiling)。均非代码缺陷, 属发布工程的环境/凭证依赖。
