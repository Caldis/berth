/// <reference types="vite/client" />

// 显式声明跨根目录的图片导入 (assets/icon/app_icon.png 位于 renderer root 之外,
// vite/client 的通配声明对该相对路径不生效)。
declare module '*.png' {
  const src: string
  export default src
}
