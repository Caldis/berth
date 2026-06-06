# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
- 用户请求 (`/goal`, harness 任务), 2026-06-06
- GitHub Issue: https://github.com/Caldis/berth/issues/110

## 正文

### 用户目标 (原文要点)

请开始安排团队启动开发, 就上述事项逐个按依赖关系/优先级进行落地, 如果无依赖则尽可能并行以提高效率。目的是:

1. 根据对应 agent 的**官方文档**, 将本机上 Claude Code 和 Codex 的**所有文件目录资产都完整扫描并呈现**到应用中, 便于用户管理查看。
2. 扫描和索引过程中**没有性能瓶颈**。
3. 将核心的扫描模块**收敛到一起**, 便于集中管理扫描策略、作用域管理策略与开发。
4. 应用边栏中展示**统一的 loading UI**。
5. Scope 切换器做到**秒级切换**, 而不是现在的 5-10s 等待。

总括: 本次迭代是对整个核心资产扫描模块的一次正式升级, 做到真正的**生产级别扫描能力**, 且和官方文档**完整对齐**, 做到不遗漏任何一个文件和关联关系。

补充约束:
- 开发过程中如有可同步解决/开发的 issue, 尽可能让 team 并行完成, 高效高质高产。
- 设计上注意 UI 美观与交互动画流畅; 任何组件**优先采用 HeroUI 公共控件, 不手搓**。
- **插件与其实际提供的 skill/mcp/hooks 等关联关系**也需在界面完整体现。
- 输出模式/命令/子代理若缺乏测试用例, 可构造**无副作用**用例插入并测试。

### 已验证现状根因 (诊断结论, 详见 01-ANALYSIS)

1. 插件内容不下钻 (`parsePlugin` 仅元数据, 不扫插件内 skills/agents/mcp/conventions)。
2. 第三方 manifest 插件只读元数据 (`ManifestAgentAdapter.scanAll` 返回单桩)。
3. 全局/用户域 projectDir=undefined → 项目级资产 0 命中, "全局"非聚合。
4. 一次只扫一个 projectDir, 切换整体重扫 → 5-10s 等待。
5. 硬编码白名单盲区 (子目录 CLAUDE.md / @import / 多来源 MCP)。
6. `safeScan` 解析失败静默丢弃, UI 未暴露错误。

### 验收目标 (高层, 细化见 02-SPEC)

- [ ] 扫描覆盖与官方目录规范完整对齐 (逐项 checklist), 含插件下钻 + 第三方 manifest 描述符驱动扫描 (只读, 不执行第三方代码)。
- [ ] 插件 ↔ skill/mcp/hooks/子代理关联关系 UI 完整呈现。
- [ ] 核心扫描引擎 + Scope/作用域策略收敛统一模块。
- [ ] Scope 切换器秒级切换 + 边栏统一 loading UI。
- [ ] 扫描/索引无性能瓶颈 (基准 + 增量/缓存)。
- [ ] 输出模式/命令/子代理补无副作用测试。
- [ ] UI 全用 HeroUI 公共控件, 动画流畅。

### 可并行折叠的相关 issue (explore triage)

- `2026-06-03-BUG-agent-teams-runtime-state-classification`
- `2026-06-05-IMPROVEMENT-session-error-channel`
- `2026-06-04-IMPROVEMENT-sessions-list-virtualization`
- `2026-06-05-IMPROVEMENT-heroui-migration-followup`

## 追加输入 (2026-06-06, 探索阶段, 用户新增)

将扫描引擎**进一步抽象为可独立发布的引擎 + CLI 项目**, UI 仅作为消费端:

1. 扫描引擎本身能作为一个**独立的 CLI 项目发布** (与 Electron 解耦, 不依赖 app/BrowserWindow/ipcMain)。
2. 基于该 CLI 做**完整的端到端测试闭环** (对 fixture HOME 跑 CLI、断言稳定 JSON 输出, 无需起 Electron 窗口)。
3. **UI 依赖这个独立引擎** (Electron 主进程作为引擎的一个消费端, IPC 层只做薄封装)。
4. **Agent 可使用该引擎与应用交互** — Agent-friendly CLI: 稳定 JSON 契约、确定性退出码、只读无副作用查询、`--json` 全覆盖。

影响: 范围由"应用内模块收敛"升级为"引擎提取为独立包 + 公共 API + CLI 表面 + 多消费端 (Electron / CLI / Agent)"。

设计阶段需决定 (待 design 收口, 默认假设已在 02-SPEC 标注待确认):
- **包边界默认**: 仓库内 pnpm workspace 包 (如 `packages/berth-scan-engine`), 可独立 `npm publish` 并带 `bin`; 而非另起仓库。理由: UI 依赖本地化、E2E 在仓库内闭环、与现有 `src/shared` 类型共享、共享主分支多 Agent 协作成本最低, 且后续仍可拆仓 (可逆)。
- 公共 API 粒度 (scan/snapshot/selectors/relations/sources/scope) 与 CLI 命令面。
