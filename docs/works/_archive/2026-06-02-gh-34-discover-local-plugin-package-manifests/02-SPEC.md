# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
不新增 shared 类型。`AgentCapabilityPluginManifestEntry.path` 继续返回实际 JSON manifest 文件路径。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
修改 `src/main/agent-plugins/manifest.ts`:

- 将 `discoverManifestPaths()` 的候选输入从“manifest 文件路径”扩展为“manifest source path”。
- 支持 source path:
  - 文件: 原样作为 manifest。
  - 目录: 先检查该目录本身是否含 `manifest.json` / `plugin.json`; 再检查直接子目录是否含 `manifest.json` / `plugin.json`。
- home/project `.berth/agent-plugins` 走同一目录发现逻辑。
- package manifest 入口优先级: `manifest.json` 优先于 `plugin.json`。
- 不递归到孙目录, 避免扫描范围过大。
- 继续使用 `path.resolve()` 去重。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不适用 | 无 UI 改动 |
| 组件选择 / 设计系统一致性 | 不适用 | 无 UI 改动 |
| 交互反馈 / 状态切换 | 不适用 | 无 UI 改动 |
| loading / empty / error / disabled / focus | 不适用 | 无 UI 改动 |
| 响应式 / 可访问性 / 键盘可达 | 不适用 | 无 UI 改动 |
| 文案 / i18n / 数字和路径格式 | 不适用 | 无 UI 改动 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| explicit directory source 发现 `manifest.json` / `plugin.json` | unit | `tests/unit/agent-plugin-manifest.test.ts` | `pnpm test -- tests/unit/agent-plugin-manifest.test.ts` | 不适用 |
| home/project plugin root 发现直接子目录 package | unit | `tests/unit/agent-plugin-manifest.test.ts` | 同上 | 不适用 |
| duplicate id 顺序保持 | unit | `tests/unit/agent-plugin-manifest.test.ts` | 同上 | 不适用 |
| 本地门禁 | lint/typecheck/test/harness/build | 全仓 | `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm harness:check`; `pnpm build` | 不适用 |
| 推送后 CI | CI | GitHub Actions | `gh run watch <run-id> --exit-status` | 远端 runner 实测 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| source path 支持文件与目录 | 1, 2, 3 |
| home/project plugin root 使用 package discovery | 4 |
| manifest 入口优先级和去重 | 5, 6 |
| 只读 discovery | 7 |
