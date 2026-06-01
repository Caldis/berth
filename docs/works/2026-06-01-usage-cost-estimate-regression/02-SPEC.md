# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

- 不改 IPC 类型。继续使用 `usage:summary` 的 `{ days: number; agentView?: AgentView; costMode?: CostMode }` 参数。
- 约定 `days <= 0` 表示全量累计, 复用 `src/main/engine/usage.ts` 现有 `dateInRange()` 语义。对应验收标准: 1, 4。
- Renderer 的 “All” 选项传 `days = 0`, 7 天和 30 天继续分别传 `7` / `30`。对应验收标准: 1, 3。

## 模块结构 / 组件拆分

遵守 docs/ARCHITECTURE.md 的边界与约定。

- `src/renderer/src/pages/usage.tsx`
  - 把 `TIME_RANGES` 的 All 值从 `365` 改为 `0`。
  - 把默认 `days` 从 `30` 改为 `0`, 让页面初始总成本使用累计口径。
  - 不改 cost mode、不改价格展示、不改 chart 组件结构。
- `src/main/engine/usage.ts`
  - 现有 `dateInRange()` 已支持 `days <= 0` 不过滤, 原则上不需要改实现。
  - 若测试暴露边界问题, 只做最小修正。
- 不修改价格 catalog、价格估算公式或供应商模型匹配逻辑。对应验收标准: 6。

## 测试策略

- Unit: `tests/unit/usage-summary.test.ts`
  - 增加回归测试: 使用同一批跨年数据, `days: 0` 时 `now` 从 2026-05-31 前进到 2026-06-01, `totalCost` 保持全量累计。
  - 保留现有 7 天范围过滤测试, 证明滚动窗口仍有效。对应验收标准: 3, 4。
- Renderer: `tests/renderer/sessions-pages.test.tsx`
  - 更新默认 Usage 请求断言为 `{ days: 0, agentView, costMode: 'auto' }`。
  - 增加或更新交互断言: 点击 30 天传 `days: 30`, 再点击 All 传 `days: 0`。对应验收标准: 1, 2, 5。
- 验证命令:
  - `pnpm test -- tests/unit/usage-summary.test.ts tests/renderer/sessions-pages.test.tsx`
  - `pnpm typecheck:web`
  - `pnpm typecheck:node`
  - `pnpm harness:check`

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| All 使用 `days=0` 且默认打开为 All | 1, 2 |
| 7/30 天维持滚动过滤 | 3 |
| 主进程回归测试覆盖 All 不随 now 前进下降 | 4 |
| Renderer 测试覆盖默认与按钮参数 | 5 |
| 不改 pricing catalog / 价格公式 | 6 |
