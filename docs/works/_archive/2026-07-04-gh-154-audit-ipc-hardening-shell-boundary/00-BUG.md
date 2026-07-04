# 00-BUG — 原始输入快照 (只读)

来源: `docs/issues/2026-07-04-IMPROVEMENT-audit-remaining-batches-ipc-hardening-and-p3.md` 条目 1-7 (2026-07-04 综合审查剩余项, **耐久写法** — 原报告行号已随会话压照过期, 本批 explore 必须实读源码逐项核实现状, 先例 GH-153 explore 九项全核实)。

## 入批七项

1. **typed registerHandler**: `src/main/ipc/` 的 handler 注册缺编译期类型约束 — channel 名与 payload/返回类型未从单一契约表派生, 新增 handler 时类型漂移只能靠运行时/对账测试兜底。方向: registerHandler 泛型化, 从 IpcChannels 契约表推导入参/出参类型。
2. **sender 校验**: ipcMain handler 未校验 `event.senderFrame`/sender 来源 — 任何能执行 JS 的帧都可调用特权 IPC。方向: 统一入口校验 sender 是主窗口 webContents。
3. **typed emit (IpcEvents)**: `webContents.send` 广播侧无类型约束, 事件名/payload 形状靠约定。方向: typed emit helper, 与 IpcEvents 表同源。(friction 锚: 契约对账方向是 表←实现, 先 grep 实发调用点核对真实形状, 把表当真源会固化历史漂移。)
4. **mock 对账双向全等**: 四方对账 (handlers/preload/IpcChannels/mock) 当前单向覆盖 — mock 可含真实 API 不存在的多余方法而不报。方向: 对账测试改双向集合全等。
5. **正则提取加固**: 主进程/adapter 里用正则从半结构化文本提取字段、对异常输入静默产出空值的点; 以 "正则 + 无失败分支" 特征全量 grep 定位并逐个核实 (补失败分支 / 记账 / 显式豁免)。
6. **openPath realpath 归一**: shell openPath 白名单校验基于字面路径前缀, 未 realpath 归一 — symlink/.. 构造可能绕过扫描根白名单 (GH-119 url-guard 补强)。
7. **openExternal scheme 白名单**: openExternal 对 URL scheme 无白名单, 资产内容中的任意链接可拉起外部程序。方向: 限 https/mailto 等安全 scheme。

## 范围裁定

- engine 侧条目 (getEngineInfo 能力元数据失真 / worker cancel 未实现) 与 P3 收敛族 (DRY/巨石拆分/forwardRef/测试 fixture) **不入本批**, 留 issues 清单待后续批次。
- 条目 5 的面在 explore 定量; 若定位结果过大 (>10 处需改), design 裁决拆分或收窄为高危子集。
