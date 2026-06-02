# BUG 快照 (只读)

来源:
- `docs/issues/2026-06-02-BUG-project-config-discovery.md`
- GitHub Issue: https://github.com/Caldis/berth/issues/78

## 描述
- 当前约定、skills、子代理、MCP 等资产没有正确识别项目下的配置。
- 这会导致项目实际可用能力和 UI 展示不一致。

## 复现步骤
- 在某个项目目录下配置约定、skills、子代理或 MCP。
- 打开 berth 查看相关页面。

## 期望 vs 实际
- 期望: 应用能识别全局、用户级和项目级配置。
- 期望: UI 能说明每个资产来自哪里, 以及当前项目是否覆盖或继承它。
- 实际: 项目下配置识别不完整, UI 可能只展示全局或用户级内容。

## 初始解决方向
- 先梳理各 agent 的项目配置路径和扫描规则。
- 扩展 source discovery, 让 scanner 能区分 project source。
- 为识别结果补测试样本, 避免只修某一个页面展示。
