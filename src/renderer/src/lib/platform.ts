/**
 * 平台检测。优先 navigator.userAgentData (navigator.platform 已被浏览器标记弃用);
 * 渲染进程为 Chromium, userAgentData 恒可用, platform 取值如 "macOS" / "Windows"。
 */
export function isMacPlatform(): boolean {
  const platform = (navigator as unknown as { userAgentData?: { platform?: string } })
    .userAgentData?.platform
  return (platform ?? '').toLowerCase().includes('mac')
}
