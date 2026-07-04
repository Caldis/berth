import { describe, expect, it, vi } from 'vitest'
import { CachedResource } from '../../src/renderer/src/hooks/cached-resource'

// GH-153 T3: forceRequest — 保证 fetcher 必然执行 (在途 settle 后), 且其结果最后落缓存。
// 背景: request() 的 in-flight 去重会把 force 语义吞成软刷结果 (health "重新检查" 失效)。
describe('CachedResource.forceRequest', () => {
  it('behaves like request() when nothing is in flight', async () => {
    const resource = new CachedResource<string>(60_000)
    const fetcher = vi.fn(async () => 'fresh')

    await expect(resource.forceRequest('', fetcher)).resolves.toBe('fresh')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(resource.peek()).toBe('fresh')
  })

  it('runs the forced fetcher after the in-flight one settles, its result landing last', async () => {
    const resource = new CachedResource<string>(60_000)
    let resolveSoft: (value: string) => void = () => {}
    const softFetcher = vi.fn(
      () => new Promise<string>((resolve) => {
        resolveSoft = resolve
      })
    )
    const forceFetcher = vi.fn(async () => 'forced')

    const soft = resource.request('', softFetcher)
    const forced = resource.forceRequest('', forceFetcher)

    // force 不与在途去重合流: 在途未 settle 前不执行, settle 后必然执行。
    expect(forceFetcher).not.toHaveBeenCalled()

    resolveSoft('soft')
    await expect(soft).resolves.toBe('soft')
    await expect(forced).resolves.toBe('forced')
    expect(softFetcher).toHaveBeenCalledTimes(1)
    expect(forceFetcher).toHaveBeenCalledTimes(1)
    // 写序: force 结果最后落缓存, 不被软刷结果倒挂。
    expect(resource.peek()).toBe('forced')
  })

  it('still issues the forced fetch when the in-flight request rejects', async () => {
    const resource = new CachedResource<string>(60_000)
    let rejectSoft: (err: Error) => void = () => {}
    const softFetcher = vi.fn(
      () => new Promise<string>((_resolve, reject) => {
        rejectSoft = reject
      })
    )
    const forceFetcher = vi.fn(async () => 'forced')

    const soft = resource.request('', softFetcher)
    const forced = resource.forceRequest('', forceFetcher)

    rejectSoft(new Error('soft failed'))
    await expect(soft).rejects.toThrow('soft failed')
    await expect(forced).resolves.toBe('forced')
    expect(resource.peek()).toBe('forced')
  })

  it('chains behind a second in-flight request that appeared meanwhile', async () => {
    const resource = new CachedResource<string>(60_000)
    let resolveFirst: (value: string) => void = () => {}
    const firstFetcher = vi.fn(
      () => new Promise<string>((resolve) => {
        resolveFirst = resolve
      })
    )
    let resolveSecond: (value: string) => void = () => {}
    const secondFetcher = vi.fn(
      () => new Promise<string>((resolve) => {
        resolveSecond = resolve
      })
    )
    const forceFetcher = vi.fn(async () => 'forced')

    void resource.request('', firstFetcher)
    const forced = resource.forceRequest('', forceFetcher)

    resolveFirst('first')
    // 第一个 settle 后立刻插入新的软请求, force 必须继续排在它后面而不是并行。
    await Promise.resolve()
    void resource.request('', secondFetcher)
    resolveSecond('second')

    await expect(forced).resolves.toBe('forced')
    expect(forceFetcher).toHaveBeenCalledTimes(1)
    expect(resource.peek()).toBe('forced')
  })
})
