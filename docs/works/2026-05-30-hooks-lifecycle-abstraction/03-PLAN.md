# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

小步提交要求: 每完成一个任务并通过对应检查, 只暂存本任务相关文件, `git diff --cached` 核对后立即提交。

- [x] 任务 1: 增加 renderer hooks lifecycle 与管理动作抽象模型
  - 改动: `src/renderer/src/lib/hook-lifecycle.ts`, `tests/unit` 或 `tests/renderer` 中对应纯函数测试。
  - 内容: 定义 stage、agent support、native event 映射、view 过滤、asset 分组、unknown event 保留策略、hook management action availability。
  - 验证: 运行 lifecycle 映射相关测试。

- [x] 任务 2: 接入 Codex user-level hooks 数据
  - 改动: `src/main/adapters/codex/parsers.ts`, `src/main/adapters/codex/index.ts`, Codex parser / adapter 测试。
  - 内容: 解析 `~/.codex/hooks.json`, 输出 `agentId:'codex'` 的 hook assets; 提取来源文件、matcher、command、entryPaths、managed/enabled 可判定状态; 不解析 repo-local / TOML / plugin hooks。
  - 验证: Codex parser / adapter 测试通过。

- [x] 任务 3: 重构 Hooks tab 页面布局
  - 改动: `src/renderer/src/pages/capabilities.tsx`, 新增 `src/renderer/src/components/capabilities/*`。
  - 内容: 顶部说明区、生命周期 index、stage sections、hook rows、教学型空状态、hook row 管理菜单。
  - 验证: renderer 测试覆盖基本渲染与空状态。

- [x] 任务 4: 增加 view-aware 文案与 i18n
  - 改动: `src/renderer/src/i18n/locales/en.json`, `src/renderer/src/i18n/locales/zh.json`。
  - 内容: hooks intro、stage 行为说明、Agent 差异、限制说明、empty state、open actions、enable/disable 不可用原因。
  - 验证: renderer 测试断言 `codex` 视角不出现 Claude Code 专属提示, `claude` 视角不出现 Codex 专属提示, `all` 视角出现对照; Claude 单 hook toggle 不可用且说明原因。

- [x] 任务 5: 接入只读快速打开动作
  - 改动: renderer hook row / management menu, 必要时补 preload / IPC shell 类型。
  - 内容: 打开 hook 来源文件、来源目录; command 能解析为本地脚本时打开入口文件、入口目录。
  - 验证: renderer 测试覆盖按钮可见性; shell bridge mock 断言 openPath 参数正确。

- [ ] 任务 6: 设计并实现受控启停入口
  - 改动: `src/shared/types/ipc.ts`, `src/main/ipc/handlers.ts`, hooks 管理组件与测试。
  - 内容: 先实现官方确定且结构清晰的 agent-level hooks enable/disable; Claude 写 `disableAllHooks`, Codex 写 `[features].hooks`; 单 hook toggle 只在 capability 明确时启用, 否则显示不可用原因。
  - 验证: IPC 单元测试覆盖 unsupported/managed/unknown action; renderer 测试覆盖确认文案和状态更新。
  - 风险: 这一步突破当前只读架构, 实施前需要在代码里建立明确的写入边界、确认 UI 和失败回滚。若边界无法在本轮收敛, 本任务应先完成只读打开动作, 把启停写入拆为单独 issue。

- [ ] 任务 7: 同步用户文档
  - 改动: `docs/user-manual.md`。
  - 内容: Hooks Tab 从“按 8 个事件分组”改为“按抽象生命周期 stage 展示, 并随 Agent 视角调整”; 说明打开来源文件/入口文件和启停限制。
  - 验证: `pnpm harness:check`。

- [ ] 任务 8: 全量验证与视觉验收
  - 运行: `pnpm typecheck`, 相关 `pnpm test`, `pnpm harness:check`。
  - UI: 启动 Electron, 使用实测窗口坐标截图, 分别检查 all / Claude / Codex 视角的 hooks tab。
  - 验收点: 文案不溢出, 长命令不撑破布局, 单 Agent 视角没有另一 Agent 的专属提示; 打开动作清楚可见; 不可用 toggle 有原因。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
