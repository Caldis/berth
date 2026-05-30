function getNavigatorPlatformText(): string {
  const nav = navigator as unknown as {
    userAgentData?: { platform?: string }
    platform?: string
    userAgent?: string
  }
  return [nav.userAgentData?.platform, nav.platform, nav.userAgent]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function isMacPlatform(): boolean {
  return getNavigatorPlatformText().includes('mac')
}

export function isWindowsPlatform(): boolean {
  const platform = getNavigatorPlatformText()
  return platform.includes('win')
}
