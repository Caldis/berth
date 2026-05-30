# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

小步提交要求: 每完成一个任务并通过对应检查, 只暂存本任务相关文件, `git diff --cached` 核对后立即提交。

- [ ] 任务 1: 增加 renderer hooks lifecycle 抽象模型
  - 改动: `src/renderer/src/lib/hook-lifecycle.ts`, `tests/unit` 或 `tests/renderer` 中对应纯函数测试。
  - 内容: 定义 stage、agent support、native event 映射、view 过滤、asset 分组、unknown event 保留策略。
  - 验证: 运行 lifecycle 映射相关测试。

- [ ] 任务 2: 接入 Codex user-level hooks 数据
  - 改动: `src/main/adapters/codex/parsers.ts`, `src/main/adapters/codex/index.ts`, Codex parser / adapter 测试。
  - 内容: 解析 `~/.codex/hooks.json`, 输出 `agentId:'codex'` 的 hook assets; 不解析 repo-local / TOML / plugin hooks。
  - 验证: Codex parser / adapter 测试通过。

- [ ] 任务 3: 重构 Hooks tab 页面布局
  - 改动: `src/renderer/src/pages/capabilities.tsx`, 新增 `src/renderer/src/components/capabilities/*`。
  - 内容: 顶部说明区、生命周期 index、stage sections、hook rows、教学型空状态。
  - 验证: renderer 测试覆盖基本渲染与空状态。

- [ ] 任务 4: 增加 view-aware 文案与 i18n
  - 改动: `src/renderer/src/i18n/locales/en.json`, `src/renderer/src/i18n/locales/zh.json`。
  - 内容: hooks intro、stage 行为说明、Agent 差异、限制说明、empty state。
  - 验证: renderer 测试断言 `codex` 视角不出现 Claude Code 专属提示, `claude` 视角不出现 Codex 专属提示, `all` 视角出现对照。

- [ ] 任务 5: 同步用户文档
  - 改动: `docs/user-manual.md`。
  - 内容: Hooks Tab 从“按 8 个事件分组”改为“按抽象生命周期 stage 展示, 并随 Agent 视角调整”。
  - 验证: `pnpm harness:check`。

- [ ] 任务 6: 全量验证与视觉验收
  - 运行: `pnpm typecheck`, 相关 `pnpm test`, `pnpm harness:check`。
  - UI: 启动 Electron, 使用实测窗口坐标截图, 分别检查 all / Claude / Codex 视角的 hooks tab。
  - 验收点: 文案不溢出, 长命令不撑破布局, 单 Agent 视角没有另一 Agent 的专属提示。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
