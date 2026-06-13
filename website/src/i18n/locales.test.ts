import { describe, expect, it } from 'vitest'
import { LANGS, type Lang } from '@/lib/langs'
import en from './locales/en.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import zh from './locales/zh.json'

const resources: Record<Lang, unknown> = { zh, en, ja, ko }

function shapeOf(value: unknown, path = '$'): string[] {
  if (Array.isArray(value)) {
    return [
      `${path}:array:${value.length}`,
      ...value.flatMap((item, index) => shapeOf(item, `${path}[${index}]`)),
    ]
  }

  if (value && typeof value === 'object') {
    return [
      `${path}:object`,
      ...Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .flatMap(([key, child]) => shapeOf(child, `${path}.${key}`)),
    ]
  }

  return [`${path}:${typeof value}`]
}

describe('localized website copy', () => {
  it('keeps every locale structurally aligned with English', () => {
    const englishShape = shapeOf(resources.en)

    for (const lang of LANGS) {
      expect(shapeOf(resources[lang]), `locale shape for ${lang}`).toEqual(englishShape)
    }
  })
})
