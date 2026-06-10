import { describe, expect, it } from 'vitest'
import { redactStatusLineCommand } from '@/pages/capabilities'

// GH-115 T0: "凭证不进渲染进程" 安全边界的最后一道 UI 防线是这组正则。
// 枚举测试钉死脱敏行为, 任何下沉/重构 (god-page issue) 都必须先过此网。

describe('redactStatusLineCommand', () => {
  it('redacts env-var style credentials (TOKEN/SECRET/PASSWORD/API_KEY families)', () => {
    const cases = [
      ['MY_API_TOKEN=abc123 node status.js', 'MY_API_TOKEN=[redacted] node status.js'],
      ['GITHUB_TOKEN="ghp_secretvalue" ./run.sh', 'GITHUB_TOKEN=[redacted] ./run.sh'],
      ["OPENAI_API_KEY='sk-live-xyz' python s.py", 'OPENAI_API_KEY=[redacted] python s.py'],
      ['DB_PASSWORD=hunter2 cmd', 'DB_PASSWORD=[redacted] cmd'],
      // shell 语义: 赋值止于空白, 因此只脱敏到第一个 token (现行为, 钉死)
      ['AUTHORIZATION="Basic dXNlcg==" curl api', 'AUTHORIZATION=[redacted] curl api']
    ] as const
    for (const [input, expected] of cases) {
      const result = redactStatusLineCommand(input)
      expect(result.value).toBe(expected)
      expect(result.redacted).toBe(true)
    }
  })

  it('redacts credential CLI flags', () => {
    const result = redactStatusLineCommand('mycli --token abc123 --api-key "sk-999" run')
    expect(result.value).toBe('mycli --token [redacted] --api-key [redacted] run')
    expect(result.redacted).toBe(true)
  })

  it('redacts Bearer tokens', () => {
    const result = redactStatusLineCommand('curl -H "Authorization: Bearer eyJhbGciOi.payload~sig"')
    expect(result.value).toContain('Bearer [redacted]')
    expect(result.redacted).toBe(true)
  })

  it('leaves plain commands untouched and reports redacted=false', () => {
    const cases = ['node ~/.claude/statusline.js', 'python3 status.py --verbose', '']
    for (const input of cases) {
      const result = redactStatusLineCommand(input)
      expect(result.value).toBe(input)
      expect(result.redacted).toBe(false)
    }
  })

  it('does not over-redact identifiers that merely contain keyword substrings without assignment', () => {
    const input = 'node tokenizer.js --secretive-mode'
    const result = redactStatusLineCommand(input)
    expect(result.value).toBe(input)
    expect(result.redacted).toBe(false)
  })
})
