# BUG 快照 (只读)

来源: https://github.com/Caldis/berth/issues/45

## 复现步骤

1. 切换 UI 语言为中文。
2. 打开 Memory 页面, 使用存在 missing note、importance/tag filter 的数据。
3. 展开 missing note 并查看筛选标签。

## 期望 vs 实际

期望:
- missing file badge/body 使用中文。
- importance/tag filter 的 label 和 all-chip 使用中文。
- en/zh locale 都显式拥有对应 key, 不依赖组件 fallback。

实际:
- `memory.fileMissing`、`memory.fileMissingBody`、`memory.importance`、`memory.allImportance`、`memory.tags`、`memory.allTags` 缺失。
- 中文 UI 会显示 `File missing`、`The indexed note file is missing on disk.`、`Importance`、`All importance`、`Tags`、`All tags` 等英文 fallback。
