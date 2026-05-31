export type AutoOpenDevToolsOptions = {
  isDev: boolean
  rendererUrl?: string
  isAgentDev: boolean
}

export function shouldAutoOpenDevTools({
  isDev,
  rendererUrl,
  isAgentDev
}: AutoOpenDevToolsOptions): boolean {
  return isDev && Boolean(rendererUrl) && !isAgentDev
}
