// GH-116: 重放详情面板的 JSON 词法着色 — 零依赖手写 tokenizer。
// token 串接后必须与输入逐字节相等 (round-trip), 渲染层只负责按 type 上色。

export type JsonTokenType = 'key' | 'string' | 'number' | 'literal' | 'punctuation' | 'text'

export interface JsonToken {
  type: JsonTokenType
  text: string
}

/** 超过此长度的 payload 截断后再渲染 — base64 截图等单行多 MB 字段会拖死高亮与布局。 */
export const MAX_PAYLOAD_RENDER_LENGTH = 100_000

export interface FormattedPayload {
  text: string
  truncated: boolean
}

/** 合法 JSON 美化为两空格缩进; 非 JSON 原样返回; 超长截断并标记。 */
export function formatReplayPayload(json: string): FormattedPayload {
  let text = json
  try {
    text = JSON.stringify(JSON.parse(json), null, 2)
  } catch {
    // 保留原文 (截断行/非 JSON 记录)。
  }
  if (text.length > MAX_PAYLOAD_RENDER_LENGTH) {
    return { text: `${text.slice(0, MAX_PAYLOAD_RENDER_LENGTH)}…`, truncated: true }
  }
  return { text, truncated: false }
}

export function tokenizeJson(input: string): JsonToken[] {
  const tokens: JsonToken[] = []
  let i = 0

  const push = (type: JsonTokenType, text: string): void => {
    const last = tokens[tokens.length - 1]
    if (last && last.type === type && (type === 'text' || type === 'punctuation')) {
      last.text += text
    } else {
      tokens.push({ type, text })
    }
  }

  while (i < input.length) {
    const char = input[i]

    if (char === '"') {
      let j = i + 1
      while (j < input.length) {
        if (input[j] === '\\') {
          j += 2
          continue
        }
        if (input[j] === '"') break
        j++
      }
      const text = input.slice(i, Math.min(j + 1, input.length))
      // 字符串后第一个非空白字符是 ':' → 这是对象键
      let k = j + 1
      while (k < input.length && /\s/.test(input[k])) k++
      push(input[k] === ':' ? 'key' : 'string', text)
      i = j + 1
      continue
    }

    if (char === '-' || (char >= '0' && char <= '9')) {
      const match = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(input.slice(i))
      if (match) {
        push('number', match[0])
        i += match[0].length
        continue
      }
    }

    const literal = /^(true|false|null)/.exec(input.slice(i))
    if (literal) {
      push('literal', literal[0])
      i += literal[0].length
      continue
    }

    if ('{}[],:'.includes(char)) {
      push('punctuation', char)
      i++
      continue
    }

    push('text', char)
    i++
  }

  return tokens
}
