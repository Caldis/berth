# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源:
- GitHub Issue: https://github.com/Caldis/berth/issues/56
- 本地 issue: `docs/issues/2026-06-02-BUG-localize-health-check-content.md`
- 发现截图: `C:\Users\mail\AppData\Local\Temp\berth-gh55-overview-verify.png`

## 复现步骤

- 将应用语言切到中文或使用中文环境启动。
- 打开 Overview 页面。
- 查看底部健康检查列表。

## 期望 vs 实际

- 期望: 健康检查标题、说明和建议文案应与页面语言一致, 显示中文。
- 实际: 页面主导航和统计卡已显示中文, 但健康检查条目仍出现 `Skill is missing SKILL.md`、`Suggested fix` 等英文文案。

## 初步解决方向

- 将健康检查定义中的用户可见文案纳入 i18n 资源。
- renderer 测试覆盖中文 Overview 健康检查标题与建议文案。
