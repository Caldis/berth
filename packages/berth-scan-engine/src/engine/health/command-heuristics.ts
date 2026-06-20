// Command-string heuristics for Windows / PowerShell hook detection.
// Extracted from health.ts (GH #6 health-restructure, behavior-preserving).

export function looksPowerShellCommand(command: string): boolean {
  return /\b(powershell|pwsh)\b/i.test(command) || /\b[A-Z][A-Za-z]+-[A-Za-z]+\b/.test(command)
}

export function looksWindowsSpecificCommand(command: string): boolean {
  return (
    looksPowerShellCommand(command) ||
    /\bcmd(\.exe)?\s*\/c\b/i.test(command) ||
    /\.(ps1|bat|cmd)(\s|$)/i.test(command)
  )
}
