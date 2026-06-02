# BUG 快照 (只读)

来源: https://github.com/Caldis/berth/issues/44

## 复现步骤

1. 运行 renderer session 页面测试。
2. 查看测试输出中的 stderr / console warning。

## 期望 vs 实际

期望:
- renderer tests 为 chart 容器提供符合 jsdom 场景的非零尺寸模拟。
- 已有 Recharts 图表页面代码不需要为测试环境改业务逻辑。
- 目标测试通过且不再输出 Recharts zero-size warning。

实际:
- `tests/renderer/sessions-pages.test.tsx` 对 Usage 页面图表做渲染时, Recharts `ResponsiveContainer` 在 jsdom 中得到 0 宽高。
- 测试通过, 但输出反复出现:

```text
The width(0) and height(0) of chart should be greater than 0...
```

影响:
- CI 日志难以扫描。
- 真实 warning 更容易被既有噪声掩盖。
