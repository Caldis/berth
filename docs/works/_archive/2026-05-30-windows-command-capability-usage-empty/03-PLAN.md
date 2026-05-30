# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 1. 接通渲染层全局资产 store: `useAssets()` 写入 `useAppStore`, AppLayout 启动扫描, Overview 读 store。
- [x] 2. 增加主进程扫描状态与 ensure-scanned 读取路径, 消除页面访问顺序依赖。
- [x] 3. 为 `usage:summary` 增加 `stats-cache` fallback, 只展示真实 token/model 数据, 不估算成本。
- [x] 4. 固化 session 顶层扫描策略, 明确排除 `subagents/*.jsonl` 独立展示。
- [x] 5. 补测试: 渲染 store 写入、scanner scanned 状态、stats-cache fallback、Windows session fixture。
- [x] 6. 跑门禁与 Windows Electron 实测, 记录结果。

## 实测记录
- `pnpm typecheck` 通过。
- `pnpm lint` 通过。
- `pnpm test` 通过: 14 files / 76 tests。
- `pnpm test:e2e` 通过: 13 tests。
- `pnpm build` 通过。
- `pnpm harness:check` 通过。
- Windows Electron 实测:
  - `scanAll()` 返回 `skills=2`, `hooks=5`, `plugins=4`, `sessions=21`, `stats-cache=1`。
  - Instructions 页面显示 `redesign-existing-projects` 与 `full-output-enforcement`。
  - Capabilities 页面显示 Hooks 5 / 插件 4; Hooks tab 展示 PreToolUse、PostToolUse、UserPromptSubmit、Stop、SessionStart。
  - Usage 页面显示 `914.6M` token 与模型占比; 成本保持 `$0.00`, 未估算成本。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
