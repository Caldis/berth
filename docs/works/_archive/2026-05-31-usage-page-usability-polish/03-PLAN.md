# 任务清单

按优先级顺序执行, 每项完成后跑对应验证并小步提交。

- [x] 任务 1: cost mode tooltip 与 radiogroup 语义
  - 改 `Usage` 页 cost mode 控件和 en/zh i18n。
  - 验证: `pnpm test -- tests/renderer/sessions-pages.test.tsx`, `pnpm typecheck:web`。
  - 结果: 已通过 `pnpm test -- tests/renderer/sessions-pages.test.tsx -t "passes selected cost mode"`、`pnpm typecheck:web`; 该 Vitest 命令实际运行了整个 `sessions-pages` 文件, jsdom 下仍有 Recharts 0 宽高警告。

- [x] 任务 2: token cache read/write tooltip
  - 改 `src/shared/token-usage.ts` 和 `TokenUsageDisplay`。
  - 验证: `pnpm test -- tests/unit/token-usage.test.ts tests/renderer/sessions-pages.test.tsx`, `pnpm typecheck:web`。
  - 结果: 已通过 `pnpm test -- tests/unit/token-usage.test.ts tests/renderer/sessions-pages.test.tsx`、`pnpm typecheck:web`; 该页面测试仍有 Recharts 0 宽高警告。

- [x] 任务 3: pricing gap override 默认收起与复制按钮
  - 改 `Usage` 页和 en/zh i18n。
  - 验证: `pnpm test -- tests/renderer/sessions-pages.test.tsx`, `pnpm typecheck:web`。
  - 结果: 已通过 `pnpm test -- tests/renderer/sessions-pages.test.tsx`、`pnpm typecheck:web`; Recharts 0 宽高警告仍为既有 jsdom 噪声。

- [x] 任务 4: 数据口径提示
  - 在费用说明区显示“本地扫描 / 估算不等于账单”提示。
  - 验证: `pnpm test -- tests/renderer/sessions-pages.test.tsx`, `pnpm typecheck:web`。
  - 结果: 已通过 `pnpm test -- tests/renderer/sessions-pages.test.tsx`、`pnpm typecheck:web`; Recharts 0 宽高警告仍为既有 jsdom 噪声。

- [x] 任务 5: 初次加载 skeleton
  - 初次请求未完成时显示 summary / explanation skeleton。
  - 验证: `pnpm test -- tests/renderer/sessions-pages.test.tsx`, `pnpm typecheck:web`。
  - 结果: 已通过 `pnpm test -- tests/renderer/sessions-pages.test.tsx`、`pnpm typecheck:web`; Recharts 0 宽高警告仍为既有 jsdom 噪声。

- [x] 任务 6: 错误态保留旧数据提示
  - 刷新失败且有旧数据时显示 stale data 文案, 不隐藏旧数据。
  - 验证: `pnpm test -- tests/renderer/sessions-pages.test.tsx`, `pnpm typecheck:web`。
  - 结果: 已通过 `pnpm test -- tests/renderer/sessions-pages.test.tsx`、`pnpm typecheck:web`; Recharts 0 宽高警告仍为既有 jsdom 噪声。

- [x] 任务 7: 总验证
  - `pnpm harness:check`
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm build`
  - 可选: `pnpm test:e2e -- tests/e2e/app.e2e.ts -g "can navigate to usage"`。
  - 结果:
    - `pnpm lint` 通过。
    - `pnpm harness:check` 通过。
    - `pnpm test` 通过: 42 个测试文件、271 个测试。
    - `pnpm typecheck` 通过。
    - `pnpm build` 通过。
    - `pnpm test:e2e -- tests/e2e/app.e2e.ts -g "can navigate to usage"` 通过。
    - 真实 Electron 视觉检查: 已进入 Usage 页, 看到计价模式、cache 读写拆分、费用口径提示、价格缺口和默认收起的本地覆盖示例; 未见白屏、明显重叠或按钮文字溢出。截图在系统临时目录, 未入库。

## verify 回写

verify 不通过项追加到这里。
