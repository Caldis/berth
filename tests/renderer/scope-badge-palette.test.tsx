import * as fs from 'fs'
import * as path from 'path'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { ScopeBadge } from '../../src/renderer/src/components/shared/scope-badge'

const root = process.cwd()
const instructionsPage = fs.readFileSync(path.join(root, 'src/renderer/src/pages/instructions.tsx'), 'utf8')

describe('ScopeBadge palette', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders session scope with neutral colors instead of orange', () => {
    render(<ScopeBadge scope="session" />)

    const badge = screen.getByText('Session')
    expect(badge.className).toContain('bg-zinc-500/10')
    expect(badge.className).toContain('text-zinc-700')
    expect(badge.className).toContain('dark:text-zinc-300')
    expect(badge.className).not.toMatch(/orange/)
  })

  it('keeps Instructions from redefining orange session scope colors locally', () => {
    expect(instructionsPage).not.toMatch(/bg-orange|text-orange/)
  })
})
