# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源:
- 用户请求, 2026-07-06, GitHub Issue: https://github.com/Caldis/berth/issues/157
- 现场截图:
  - `/var/folders/v0/318dq8q959z29k7vx374rw400000gn/T/codex-clipboard-3c4d15c8-3c1e-455f-bddb-0ce99e029b5f.png`
  - `/var/folders/v0/318dq8q959z29k7vx374rw400000gn/T/codex-clipboard-a122d59a-67ec-48f3-a09b-cab9ddb5b142.png`
  - `/var/folders/v0/318dq8q959z29k7vx374rw400000gn/T/codex-clipboard-4ac6df2e-88b0-4606-a3ba-154ebcf988d9.png`

## 复现步骤
1. 打开本机已安装的 production Berth。
2. 在设置中触发重建索引或等待文件监听触发扫描。
3. 观察扫描进度、设置页扫描历史、主界面左侧栏和本地日志。

## 期望 vs 实际
期望:
- 索引重建在可接受时间内完成; 若失败, 日志和 UI 给出可定位错误。
- scan helper 不应反复因 120000ms 无消息被 watchdog kill。
- 左侧边栏应展示 agent 选择器。
- production 日志按 verbose/info/warning/error 等级记录关键事务和错误, 便于 agent 自主定位。

实际:
- 索引过程极慢, 用户观察超过 5 小时仍未完成。
- core 多次 timeout 或出现其他错误。
- 扫描弹层显示 `Asset scan helper sent no message for 120000ms; killed as wedged`。
- 设置页扫描历史多次约 120s 后失败。
- 左侧边栏未出现 agent 选择器。
