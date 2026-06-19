# 02-SPEC — Design 产物

## 范围
完整并入 (消除平行机制): 新建顶层 `sources.*` + 3 函数改吃 `t()` + 删 9 死键。第二份平行字典 `agentPluginSources` 本批不动 (交叉引用作后续)。

## 改动方案

### 新建 i18n 命名空间 sources.* (en.json + zh.json 各一份)
- `sources.code.<code>`: `{title, summary?, actionHint?}` 22+2 条, 逐字照搬 `EN/ZH_SOURCE_COPY` (code 作**引号包裹 flat key**, 防点拆嵌套)
- `sources.status`: `{scanned, missing(ZH 未发现!), not-scanned}` 照搬原文 (**勿复用** agentPluginSourceRowStatus)
- `sources.statusCount`: 带 `{{count}}` 复数 + `{{label}}` 插值; en `{{count}} {{label}}` / zh `{{label}} {{count}}` (语序由 JSON 自带)

### local-source-copy.ts 3 函数改吃 t()
- `getScanSourceStatusLabel(t, status)` → `t('sources.status.' + status)`
- `formatScanSourceStatusCount(t, status, count)` → `label = t(status)` + `t('sources.statusCount', { count, label })`
- `getScanSourceCopy(t, source)` → **三次** `t(...title/summary/actionHint, { defaultValue })` 取值 (规避 returnObjects init 依赖), 空串归 undefined; 兜底 `source.description/code/path`
- 删 `EN_SOURCE_COPY` / `ZH_SOURCE_COPY` 两字典

### 删 9 死键 (en + zh, 复数键 en/zh 对称同删)

### 外溢: project-scope-switcher.tsx 三处 (L375/452/503) 改传 t (已有 useTranslation)

## 测试矩阵
- **现成回归**: `project-scope-switcher.test.tsx` (en) 断言 `3 sources`/`2 Scanned`/`1 Missing`/source 标题 全绿无改 = en 渲染逐字不变
- **新增 ZH 锁定**: 仿 `settings-accent-i18n.test.ts`, 断言 `i18n.t('sources.status.missing')===未发现` + `sources.code.<code>.title===原文` (en/zh 各一)
- **删键护栏**: `i18n-plural-convention.test.ts` (删 `settings.sourceCount_one/_other` 须 en/zh 对称, 否则该测试红)
- 全量 `pnpm test` + `typecheck:web` (改函数签名 TS 编译期暴露 project-scope-switcher 漏改) + lint

## 文件边界
`local-source-copy.ts` + `i18n/locales/{en,zh}.json` + `project-scope-switcher.tsx` (消费点外溢, 明确列出) + 测试

## 风险
- 删错活键 (sourceCount/detected/notFound 同名异命名空间) → 已逐一区分**只删 `settings.` 前缀**
- 改函数签名影响面**封闭** (唯一消费者 project-scope-switcher)
- ZH 漂移陷阱 (见 01) → 新建 `sources.status.*` 照搬 + zh 断言锁
