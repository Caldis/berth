# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源: https://github.com/Caldis/berth/issues/39

## 复现步骤
1. 打开设置页, 将语言改为中文或英文。
2. 设置页会调用 `localStorage.setItem('berth-language', lang.id)` 保存选择。
3. 重新加载 renderer 或重启应用。

## 期望 vs 实际
期望:

- `berth-language=en` 时, renderer 初始化为英文。
- `berth-language=zh` 时, renderer 初始化为中文。
- 缺失或非法值时, 继续按当前系统语言判断回退。

实际:

- `src/renderer/src/i18n/index.ts` 初始化只读取 `navigator.language`, 没有读取 `berth-language`。
- 当系统语言和用户选择不同, 用户设置可能在重启后丢失。
