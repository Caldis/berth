import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../src/renderer/src/i18n'
import { PageErrorBoundary } from '../../src/renderer/src/components/layout/page-error-boundary'

let shouldThrow = true

function MaybeBroken(): React.ReactElement {
  if (shouldThrow) throw new Error('boom')
  return <div>Recovered page</div>
}

function renderWithRouter(ui: React.ReactElement, initialPath = '/broken'): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<div>Overview home</div>} />
        <Route path="/broken" element={ui} />
      </Routes>
    </MemoryRouter>
  )
}

// React 19 在并发渲染中遇 throw 会"恢复并同步重渲", 恢复错误以 window error 事件逃逸 —
// 不拦截则 vitest 记为 Unhandled Error (用例全过但 run 失败)。boundary 类测试标准处理。
const swallowRecoveredRenderError = (e: ErrorEvent): void => e.preventDefault()

describe('PageErrorBoundary', () => {
  beforeEach(() => {
    window.addEventListener('error', swallowRecoveredRenderError)
  })

  afterEach(() => {
    window.removeEventListener('error', swallowRecoveredRenderError)
    shouldThrow = true
    vi.restoreAllMocks()
  })

  it('renders a retryable fallback when a page throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    renderWithRouter(
      <PageErrorBoundary titleKey="usage.pageErrorTitle" bodyKey="usage.pageErrorBody">
        <MaybeBroken />
      </PageErrorBoundary>
    )

    expect(screen.getByText('Usage page failed')).toBeInTheDocument()

    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(screen.getByText('Recovered page')).toBeInTheDocument()
  })

  it('falls back to generic copy without keys and offers a back-to-overview escape', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    renderWithRouter(
      <PageErrorBoundary>
        <MaybeBroken />
      </PageErrorBoundary>
    )

    // GH-115 T4: 桌面应用无刷新入口, 错误兜底必须提供脱困动作 (回 Overview), 不只 Retry。
    fireEvent.click(screen.getByRole('button', { name: 'Back to overview' }))

    expect(screen.getByText('Overview home')).toBeInTheDocument()
  })
})
