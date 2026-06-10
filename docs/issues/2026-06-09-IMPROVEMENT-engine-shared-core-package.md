# 描述
- 扫描引擎事实上是 UI + CLI + 未来 agent 集成三方共享内核, 却物理嵌在 `src/main/engine/`。CLI 包只能反向相对路径爬进主进程内部, 形成分层倒置 (依赖方向反了)。

# 证据
- `packages/berth-scan-engine/src/engine-bridge.ts:9`: `import { AssetScanner } from '../../../src/main/engine/scanner'`; 文件头注释自承 P1.3 hybrid 临时态, 计划 "P2 物理迁移 engine 进包"。
- 同文件还反向 import `src/shared/types/asset`、`src/shared/types/ipc`、`src/shared/scope`。
- 反向依赖确认: `src/` 内无任何文件 import `@berth/scan-engine` — 主应用不依赖该包。

# 预期 · 建议
- 把 `engine/` + 其依赖的 `src/shared/types`/`scope` 提升为一等包 (新建 `packages/core` 或并入 `@berth/scan-engine`), 让 `src/main` 反过来依赖包, 消灭所有 `../../../`。
- 成包后顺势收敛 `src/main/memory/sources/claude-native.ts:58` 与 `united-memory.ts:109` 两份 `splitFrontmatter` 变体 (返回 `{}` 而非 null, 与 `adapters/_shared/markdown.ts` 已统一版三方近似) — 当前 memory→adapters/_shared 属跨模块反向依赖不可取, 是 adapter-parsing-shared-core (已 RESOLVED) 的范围外残留。
- 收益: CLI 可独立发布 (当前打包会拖入半个 src/main); engine 重构不再隐式打断 CLI 相对路径。
- 顺序: 先做 adapter / shared 内核内聚 (2026-06-09-IMPROVEMENT-adapter-parsing-shared-core.md) 抽出纯逻辑, 再整体迁移, 避免一次性大爆炸重构。

# 来源 · 关联
- 架构图绘制任务 (2026-06-09)。关联 2026-06-09-IMPROVEMENT-architecture-doc-drift.md、2026-06-09-IMPROVEMENT-asset-runtime-collaborators-split.md。
- 状态: OPEN。

# 追记 (GH-115 前置已铺, 2026-06-10)
- T8: adapters↔agent-plugins 唯一值依赖环已解 (descriptor 数据下沉 adapter 侧); AgentAdapter 3 死方法已删。
- T9: per-agent 扫描源声明 (adapters/<agent>/sources.ts) + engine/agent-capabilities 单点漏斗已建, shallow/derive/watcher 三方 mirror 表已收敛; 等价钉测 (asset-sources-equivalence) 可作迁移红绿网。
- T10: session 域逻辑已离开 ipc 层进 engine (session-detail/session-activity), 与包切线对齐。
- 仍属本 issue: engine 物理迁包 (闭包 30 文件)、adapter scanAll 接 sources 表 (settings.local.json 2/5-parser 分叉届时定案)、conventions 双表收敛讨论、memory splitFrontmatter ×2 收敛 (characterization 已钉, tests/unit/memory-frontmatter-characterization.test.ts)、session 解析进 capability map 契约、watcher resolveClaudeManagedDir 中立化、engine-bridge/cli typecheck 盲区、tsup cjs-only/publishConfig、project-scope*.ts 归位 (R33)。
