// GH-115 T7: 实现已下沉 src/shared/object-guards.ts (无 node 依赖单源)。
// 本文件保持 re-export 以维持 adapters 域内既有 import 面; 新代码请直接 import @shared/object-guards。
export {
  isRecord,
  readString,
  readNumber,
  readBoolean,
  readStringArray,
  readValidDateString,
  firstString,
  uniqueStrings,
  safeId
} from '@shared/object-guards'
