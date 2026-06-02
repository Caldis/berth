# BUG 快照 (只读)

来源: https://github.com/Caldis/berth/issues/47

## 复现步骤

1. 进入中文界面。
2. 打开存在无标题 session 的总览最近会话、Sessions 列表或 Session 详情页。

## 期望 vs 实际

期望: 无标题 session 的 fallback 标题使用 locale key, 英文为 `Session #{{id}}`, 中文为 `会话 #{{id}}`, 并保留短 id 格式。

实际: `src/renderer/src/pages/overview.tsx`、`src/renderer/src/pages/sessions.tsx`、`src/renderer/src/pages/session-detail.tsx` 直接渲染硬编码 `Session #xxxx`, 中文界面会漏出英文。

## 范围

保持窄范围: 添加 i18n key 或 helper, 更新三个 fallback 渲染路径, 并补中文 fallback renderer 测试。
