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
- 完成日期: 2026-06-02
- 关联任务: `docs/works/_archive/2026-06-02-gh-56-localize-health-check-content`
- 关联提交: `a924389116917bcf4054ded649a19a34797329d5`
- 新增 renderer 侧健康检查 i18n helper, Overview 与 Hooks 生命周期 hover 详情共用。
- 中英文资源新增健康检查标题、说明、修复建议与 evidence label 翻译。
- 测试覆盖中文 Overview 健康检查内容与 Hooks hover 详情。
