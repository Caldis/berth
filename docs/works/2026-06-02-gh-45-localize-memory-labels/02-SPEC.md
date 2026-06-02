# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

新增 locale key:
- `memory.fileMissing`
- `memory.fileMissingBody`
- `memory.importance`
- `memory.allImportance`
- `memory.tags`
- `memory.allTags`

## 模块结构 / 组件拆分

- 只修改 locale JSON 和 `tests/renderer/memory-view.test.tsx`。
- 不修改 `memory-view.tsx`, 因为现有 key 调用已经正确。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改 UI 结构 | renderer 测试确认文案可见 |
| 组件选择 / 设计系统一致性 | 复用现有 chip/button | 不新增组件 |
| 交互反馈 / 状态切换 | 保持现有展开、筛选、清除筛选行为 | `memory-view.test.tsx` |
| loading / empty / error / disabled / focus | 只修 missing file 状态文案 | `memory-view.test.tsx` |
| 响应式 / 可访问性 / 键盘可达 | 不改 DOM 结构 | 现有测试不回退 |
| 文案 / i18n / 数字和路径格式 | zh/en 显式 key | locale diff + renderer 测试 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| zh missing file 和 filter 文案 | renderer | `tests/renderer/memory-view.test.tsx` | `pnpm exec vitest run tests/renderer/memory-view.test.tsx` | 不适用 |
| web 类型 | typecheck | renderer | `pnpm typecheck:web` | 不适用 |
| harness 任务结构 | harness | docs/works | `pnpm harness:check --work docs/works/2026-06-02-gh-45-localize-memory-labels` | 不适用 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 补齐 locale key | 1, 2 |
| 增加 zh renderer 测试 | 3, 4 |
| 本地检查和 CI | 5, 6 |
