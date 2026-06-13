import { describe, expect, it } from 'vitest'
import packageJson from '../package.json'

describe('package exports', () => {
  it('publishes adapter-api as a stable subpath for independently maintained adapters', () => {
    expect(packageJson.exports['./adapter-api']).toEqual({
      types: './dist/adapter-api.d.ts',
      import: './dist/adapter-api.js',
      require: './dist/adapter-api.cjs'
    })
  })
})
