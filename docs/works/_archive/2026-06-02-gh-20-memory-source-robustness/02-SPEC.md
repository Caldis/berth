# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

扩展 `MemoryNote`:

```ts
missing?: boolean
```

含义:

- `true`: source index 里有这条 note, 但当前本地文件不存在或不可读。
- 缺省/`false`: 文件存在或 source 没有做缺失校验。

不改 IPC channel 名称和参数, 因为 `MemoryNote` 是原通道的返回类型扩展。

## 模块结构 / 组件拆分

- `src/main/memory/sources/united-memory.ts`
  - 增加 local id 安全校验和 path boundary 校验。
  - `detect()` 缓存解析后的 index notes, `list()` 复用同一实例内缓存。
  - `list()` 对 index 条目的目标文件做存在性校验, 缺失时标记 `missing: true`。
- `src/main/memory/sources/claude-native.ts`
  - 增加 `asDateString()` 并提取 `metadata.created/updated`。
  - `read()` 校验 local id 只能是 `<slug>/<filename.md>`。
  - `list()` 优先读取 `MEMORY.md` 索引生成列表, 并标记缺失文件; 无索引时保留旧的逐文件 fallback。
- `src/shared/types/memory.ts`
  - 增加 `missing?: boolean`。
- `src/renderer/src/components/memory/memory-view.tsx`
  - 展示 missing tag 和展开提示。
  - 缺失条目禁用 View Raw / Show in Explorer。
- Tests
  - `tests/unit/memory-service.test.ts`
  - `tests/unit/memory-claude-native.test.ts`
  - `tests/renderer/memory-view.test.tsx` 新增或扩展。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 缺失提示作为小 tag 和展开行, 不新增外层容器 | renderer 测试确认标题/来源/importance 仍可见 |
| 组件选择 / 设计系统一致性 | 使用现有 badge/button/border 风格 | 不新增设计系统组件 |
| 交互反馈 / 状态切换 | 缺失文件不显示无效文件动作 | renderer 测试确认按钮不存在 |
| loading / empty / error / disabled / focus | 缺失是条目状态, 不替代 source error 或 empty state | 缺失条目仍可展开看到说明 |
| 响应式 / 可访问性 / 键盘可达 | tag/说明可换行; 展开仍由 button 控制 | renderer 测试用 role 点击 |
| 文案 / i18n / 数字和路径格式 | 使用 `t()` 默认文案, 后续可补 locale | 渲染测试按默认英文断言 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| path traversal 防护 | unit | `tests/unit/memory-service.test.ts` | `pnpm test -- tests/unit/memory-service.test.ts` | N/A |
| native 时间字段 | unit | `tests/unit/memory-claude-native.test.ts` | `pnpm test -- tests/unit/memory-claude-native.test.ts` | N/A |
| native list 走索引并保留 missing entry | unit | `tests/unit/memory-service.test.ts` | `pnpm test -- tests/unit/memory-service.test.ts` | N/A |
| united-memory list missing + detect/list cache | unit | `tests/unit/memory-service.test.ts` | `pnpm test -- tests/unit/memory-service.test.ts` | N/A |
| MemoryView missing 展示 | renderer | `tests/renderer/memory-view.test.tsx` | `pnpm test -- tests/renderer/memory-view.test.tsx` | N/A |
| 类型约束 | typecheck | N/A | `pnpm typecheck:node`; `pnpm typecheck:web` | N/A |
| harness 任务态 | harness | N/A | `pnpm harness:check` | N/A |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| local id/path boundary 校验 | 1, 2 |
| native metadata 时间 | 3 |
| native index list | 4 |
| missing 契约和 UI | 5 |
| united-memory index cache | 6 |
| 验证命令 | 7 |

