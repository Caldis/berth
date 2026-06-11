// GH-120: 重放导出 — Blob + anchor[download] 走 Chromium 下载管线。
// main 进程无 will-download 自定义 handler, Electron 默认弹系统保存对话框;
// 零 IPC, 不扩大主进程写能力。

export function downloadTextFile(
  filename: string,
  text: string,
  mimeType = 'application/json'
): void {
  const blob = new Blob([text], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/** 文件名片段消毒: 路径分隔/保留字符/空白折叠为 `-`。 */
export function sanitizeFilenamePart(name: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|\s]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'export'
  )
}
