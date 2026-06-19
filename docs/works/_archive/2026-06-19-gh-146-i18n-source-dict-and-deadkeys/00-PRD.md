# 来源快照 (只读输入)

## 源 issue
- `docs/issues/2026-06-10-IMPROVEMENT-renderer-dir-semantics.md` (字典并入项; **memory-view chrome 上提项不做**)
- `docs/issues/2026-06-10-IMPROVEMENT-gh115-residuals.md` (第2项: i18n 快审残键复核)

## 目标
消除 `local-source-copy.ts` 绕过 i18next 的平行翻译机制 (双语字典并入 i18next) + 删 settings 残键。

## 边界
`local-source-copy.ts` + `i18n/locales/{en,zh}.json` + `project-scope-switcher.tsx` (唯一消费点) + 测试。

由 harness-5.2-issues A 组稳健批并行处理生成。
