# 描述
- 中文界面下, Overview 健康检查条目的标题、说明和建议仍显示英文。
- 发现于 GH-55 视觉验收, 截图: `C:\Users\mail\AppData\Local\Temp\berth-gh55-overview-verify.png`。
- GitHub Issue: https://github.com/Caldis/berth/issues/56
- Work: `docs/works/2026-06-02-gh-56-localize-health-check-content`

# 重现步骤
- 将应用语言切到中文或使用中文环境启动。
- 打开 Overview 页面。
- 查看底部健康检查列表。

# 预期结果
- 健康检查标题、说明和建议文案应与页面语言一致, 显示中文。

# 实际结果
- 页面主导航和统计卡已显示中文, 但健康检查条目仍出现 `Skill is missing SKILL.md`、`Suggested fix` 等英文文案。

# 解决方案
- 将健康检查定义中的用户可见文案纳入 i18n 资源。
- renderer 测试覆盖中文 Overview 健康检查标题与建议文案。
