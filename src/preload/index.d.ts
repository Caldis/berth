import { ElectronAPI } from '@electron-toolkit/preload'
import type { BerthAPI } from './index'

// GH-115 T1: window.api 类型从 preload 实现派生 (BerthAPI = typeof api)。
// 此前 104 行手写镜像已两处漂移 (phantom hooks.statuses / assets.scan); 禁止回退为手写方法签名。
declare global {
  interface Window {
    electron: ElectronAPI
    api: BerthAPI
  }
}

export type { BerthAPI }
