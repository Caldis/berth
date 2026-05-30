const PROVIDERS_WITH_DOT_IDS = new Set([
  'ai21',
  'amazon',
  'anthropic',
  'azure',
  'bedrock',
  'cohere',
  'deepseek',
  'fireworks',
  'google',
  'groq',
  'meta',
  'mistral',
  'openai',
  'perplexity',
  'together',
  'vertex'
])

export function normalizeModelId(value: string): string {
  return value.trim().toLowerCase()
}

export function modelMatchKeys(value: string): Set<string> {
  const normalized = normalizeModelId(value)
  const keys = new Set<string>()
  addKey(keys, normalized)

  const slashIndex = normalized.lastIndexOf('/')
  if (slashIndex >= 0) addKey(keys, normalized.slice(slashIndex + 1))

  const colonIndex = normalized.indexOf(':')
  if (colonIndex > 0) addKey(keys, normalized.slice(0, colonIndex))

  addDotProviderKeys(keys, normalized)
  addBedrockAnthropicKeys(keys, normalized)

  return keys
}

function addKey(keys: Set<string>, value: string): void {
  const normalized = normalizeModelId(value)
  if (normalized) keys.add(normalized)
}

function addDotProviderKeys(keys: Set<string>, value: string): void {
  const segments = value.split('.')
  for (let index = 0; index < segments.length - 1; index += 1) {
    const provider = segments[index]
    if (!PROVIDERS_WITH_DOT_IDS.has(provider)) continue

    const model = segments.slice(index + 1).join('.')
    addKey(keys, model)
    addKey(keys, `${provider}/${model}`)
  }
}

function addBedrockAnthropicKeys(keys: Set<string>, value: string): void {
  const match = value.match(/^(?:[a-z0-9-]+\.)?anthropic\.([a-z0-9-]+-\d{8})(?:-v\d+(?::\d+)?)?$/)
  if (!match?.[1]) return

  addKey(keys, match[1])
  addKey(keys, `anthropic/${match[1]}`)
}
