// GH-115 T8: per-agent descriptor 数据已下沉 adapters/{claude-code,codex}/descriptors.ts,
// 解除 adapters↔agent-plugins 唯一值依赖环。本文件聚合 re-export 维持既有消费面
// (registry / 测试); helper 在 adapters/_shared/source-descriptors.ts。
export { CLAUDE_SOURCE_DESCRIPTORS } from '@berth/scan-engine/adapters/claude-code/descriptors'
export { CODEX_SOURCE_DESCRIPTORS } from '@berth/scan-engine/adapters/codex/descriptors'
export { scanRootFromDescriptor, sourceDescriptor } from '@berth/scan-engine/adapters/_shared/source-descriptors'
