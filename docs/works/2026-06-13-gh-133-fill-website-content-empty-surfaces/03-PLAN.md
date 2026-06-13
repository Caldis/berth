# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] T1 内容契约与测试护栏 — DONE: 新增 `website/src/i18n/locales.test.ts`, 校验 zh/en/ja/ko JSON key、数组长度和嵌套结构与英文一致; `pnpm --dir website test` 3 files / 13 tests 通过, `pnpm --dir website typecheck` 通过。
  - 内容: 增加 i18n JSON parity 测试; 必要时扩展 content/postbuild 测试; 明确 stale 文案检查命令。
  - tests: `pnpm --dir website test`, `pnpm --dir website typecheck`。
  - verify: 测试能在未改页面前约束四语结构; 界面项不适用。
- [ ] T2 首页、Features 和产品示意补齐
  - 内容: 更新 `i18n/locales/*.json`, `Home.tsx`, `Features.tsx`, `AssetPanel.tsx`; 表达多 agent、scan engine、adapter API、Settings 控制面、source coverage、安全边界。
  - tests: `pnpm --dir website test`, `pnpm --dir website typecheck`, stale `rg` 检查。
  - verify: 页面信息密度提升; 复用现有视觉系统; 首页 knowledge cards 指向具体目标; 不出现未实现承诺。
- [ ] T3 Knowledge、About、Privacy、Changelog、404 补齐
  - 内容: 删除过时 coming-soon 口径; About/Privacy/Changelog 改结构化内容; NotFound 接语言语境; postbuild 生成 `404.html`; 更新 `llms.txt` 简述。
  - tests: `pnpm --dir website test`, `pnpm --dir website typecheck`, `pnpm --dir website build`。
  - verify: `/en/about`, `/en/privacy`, `/en/changelog`, `/en/no-such-page`, `/404.html` 可读; sitemap 排除 404; llms 包含新产品事实。
- [ ] T4 本地 preview 和任务收口验证
  - 内容: 用本地 preview + Edge/Playwright 抽查桌面/移动主要路由; 更新 03-PLAN 证据; phase 推进 verify。
  - tests: `pnpm --dir website test`, `pnpm --dir website typecheck`, `pnpm --dir website build`, `pnpm harness:check --work docs/works/2026-06-13-gh-133-fill-website-content-empty-surfaces`。
  - verify: 所有 ANALYSIS AC 都有证据; 工作区只包含本任务文件和既有外部脏文件。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
