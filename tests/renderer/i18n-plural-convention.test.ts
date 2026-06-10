import { describe, expect, it } from 'vitest'
import en from '../../src/renderer/src/i18n/locales/en.json'
import zh from '../../src/renderer/src/i18n/locales/zh.json'

// GH-115 T12: zh 复数约定结构网 — en 用 _one/_other 区分单复数; 中文无单复数形态,
// zh 一律只写 `_other` (i18next zh plural rule 恒解析到 other)。此前 9 组混用裸 key,
// i18next 能回退不算 bug, 但结构不对称是维护噪音且复数 key 改名时裸 key 会静默残留。

type Tree = { [key: string]: Tree | string }

function flat(obj: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) Object.assign(out, flat(value, prefix + key + '.'))
    else out[prefix + key] = value
  }
  return out
}

describe('i18n plural convention', () => {
  const enFlat = flat(en as Tree)
  const zhFlat = flat(zh as Tree)
  const enPluralBases = [
    ...new Set(
      Object.keys(enFlat)
        .filter((k) => k.endsWith('_one') || k.endsWith('_other'))
        .map((k) => k.replace(/_(one|other)$/, ''))
    )
  ]

  it('en 的每个复数组在 zh 侧都有 _other 形式', () => {
    const missing = enPluralBases.filter((base) => !(base + '_other' in zhFlat))
    expect(missing).toEqual([])
  })

  it('zh 不允许复数组的裸 key 或 _one 变体 (恒走 other)', () => {
    const violations = enPluralBases.flatMap((base) => [
      ...(base in zhFlat ? [base + ' (bare)'] : []),
      ...(base + '_one' in zhFlat ? [base + '_one'] : [])
    ])
    expect(violations).toEqual([])
  })

  it('zh 没有 en 不存在的复数组 (防单边漂移)', () => {
    const zhBases = [
      ...new Set(
        Object.keys(zhFlat)
          .filter((k) => k.endsWith('_one') || k.endsWith('_other'))
          .map((k) => k.replace(/_(one|other)$/, ''))
      )
    ]
    expect(zhBases.filter((b) => !enPluralBases.includes(b))).toEqual([])
  })
})
