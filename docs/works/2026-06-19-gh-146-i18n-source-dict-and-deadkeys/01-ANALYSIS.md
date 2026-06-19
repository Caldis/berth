# 01-ANALYSIS — Explore 产物 (经代码核实)

## 真实路径
- locales: `src/renderer/src/i18n/locales/{en.json (2217 行), zh.json (2201 行)}`; `i18n/index.ts` keySeparator='.' fallbackLng=en, 无 saveMissing (缺键回显 key)。
- 字典: `src/renderer/src/components/layout/local-source-copy.ts`。

## local-source-copy 结构 (issue 描述不完整)
导出 **3 函数** (非只 getScanSourceStatusLabel):
- `getScanSourceCopy(source, language)`: 依 `EN/ZH_SOURCE_COPY` (各 22 条 `{title, summary?, actionHint?}`)
- `getScanSourceStatusLabel(status, language)`: 内联双语 (scanned→Scanned/已扫描, missing→Missing/未发现, 其它→Not scanned/未扫描)
- `formatScanSourceStatusCount(status, count, language)`: en `{count} {label}` / zh `{label} {count}`

唯一消费点 = `project-scope-switcher.tsx` 三处 (L452 copy / L503 statusLabel / L375 countformat)。
→ 只迁 statusLabel 不迁 copy, 22 条大字典仍在, 平行机制未消除。**完整并入需 3 函数都改**。

## issue 与代码不符
- 建议迁 `sources.*` 前缀**不可行**: `projectScope.sources.*` 已占用 (候选来源类型)。
- **已存在第二份平行字典** (issue 没提): `settings.agentPluginSources.*` (41 叶 `{label, description}`, 同批 source code 但文案不同) + `agentPluginSourceRowStatus` + `agentPluginSourceStatus`。本批不动, 交叉引用作后续。

## ZH 漂移陷阱 (关键)
`agentPluginSourceRowStatus.missing` ZH = **缺失**; local-source-copy `missing` ZH = **未发现**。现有测试 `project-scope-switcher.test.tsx` 只跑 en (L110), 复用现成 key 会 EN 绿但 **ZH 静默从"未发现"变"缺失"**。→ 必须新建 `sources.status.*` 照搬 ZH 原文 + 新增 zh 断言测试。

## 9 死键确认 (git 实锤: commit 914e4c94 删消费 UI 但 locale 未同步)
`settings.{localSources, localSourcesEmpty, sourceCount_one/_other, sourceNotFound, sourceNotFoundDesc, sourceSummary, detected, notFound, noSourceRoots}` — 字面 + 拼接双重 grep 确认**零消费零推导零测试引用, 真死可删**。
- 邻近**活键** (fileWatching/automatic/about/version/...) 勿误删。
- 同名**异命名空间活键** (`projectScope.sourceCount` / `capabilities.*.notFound` / `plugin.detected` 数据字段) 勿波及。
