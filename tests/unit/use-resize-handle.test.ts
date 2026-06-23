import { describe, it, expect } from 'vitest'
import { deltaToSpan } from '@/components/dashboard/use-resize-handle'
describe('deltaToSpan', () => {
  it('量化+clamp', () => {
    expect(deltaToSpan(3,112,112,1,6)).toBe(4); expect(deltaToSpan(3,10000,112,1,6)).toBe(6); expect(deltaToSpan(3,-10000,112,1,6)).toBe(1)
  })
})
