# 01-ANALYSIS — Explore 产物 (经代码核实)

## 选型: knip (非 ts-prune)
ts-prune 已废弃 (作者推荐迁 knip); 只查 unused exports, 查不了 unused files/deps/多入口可达性。knip 原生支持多 entry / 多 project / monorepo / `paths` 别名 / vite-vitest-eslint 插件。

## 根因: 零配置失配
root 经 path-alias `@berth/scan-engine` → `packages/.../src` 消费引擎**源码** (node_modules 无 `@berth` 符号链接, root package.json 未声明该依赖)。knip 零配置把 `packages/berth-scan-engine` 当独立 workspace, **看不到 root alias 对引擎深层文件的消费** → 误报引擎核心文件全 unused。**必须把别名告诉 knip (`paths`)**。

## 真实 entry (electron.vite.config + index.html + tsup 核实)
- main: `src/main/index.ts`
- scan-helper: `src/main/scan-helper.ts` (utilityProcess, GH-135)
- asset-worker: `packages/berth-scan-engine/src/engine/assets/worker.ts`
- preload: `src/preload/index.ts`
- renderer: `src/renderer/src/main.tsx`
- scan-engine 库: `packages/berth-scan-engine/src/{index.ts, adapter-api.ts, cli-bin.ts}`
- 补: `scripts/*.mjs`, `tests/**/*.test.ts(x)`, `*.d.ts` (ambient, 勿当死文件)

## 双 tsconfig
root `tsconfig.{json,node,web,test}.json` 三分裂 + 跨根 paths; scan-engine 独立 tsconfig。knip 靠 `project` (扫描面) + `paths` (别名) 覆盖, 不逐个指定 tsconfig。

## CI 插入点
`ci.yml` 单 job `verify` (3-OS), 步骤 install→lint→typecheck→test→(scan-engine)→harness:check→build→e2e。插在 **lint 后 typecheck 前**。

## 报告规模预估
247 源文件 + 188 测试; 首次预计个位数 unused files + 几十条 unused exports (含已知假阳性家族: 主进程拼接 key / LocalSources 残键) → **不宜首次硬门禁**。
