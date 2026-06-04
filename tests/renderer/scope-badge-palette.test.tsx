import * as fs from 'fs'
import * as path from 'path'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { HeroUIProvider } from '@heroui/react'
import i18n from '../../src/renderer/src/i18n'
import { ScopeBadge } from '../../src/renderer/src/components/shared/scope-badge'

const root = process.cwd()
const instructionsPage = fs.readFileSync(path.join(root, 'src/renderer/src/pages/instructions.tsx'), 'utf8')
const scopeBadgeSource = fs.readFileSync(path.join(root, 'src/renderer/src/components/shared/scope-badge.tsx'), 'utf8')
const categoryColorPattern = /(?:bg|text|border)-(?:blue|green|purple|orange)/
const scopeLabels = {
  user: 'User',
  project: 'Project',
  enterprise: 'Enterprise',
  session: 'Session'
} as const

describe('ScopeBadge palette', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders all scopes neutrally (no category colors) on the shared Chip', () => {
    render(
      <HeroUIProvider>
        {Object.keys(scopeLabels).map((scope) => (
          <ScopeBadge key={scope} scope={scope as keyof typeof scopeLabels} />
        ))}
      </HeroUIProvider>
    )

    for (const label of Object.values(scopeLabels)) {
      const badge = screen.getByText(label)
      // GH-105: scope pills are built on the shared neutral Chip — no category
      // hues, and no per-scope semantic color (success/danger/etc.) leaks in.
      expect(badge.className).not.toMatch(categoryColorPattern)
      expect(badge.className).not.toMatch(/(?:bg|text)-(?:success|danger|warning|primary)/)
    }
  })

  it('keeps scope color tables from reintroducing category colors', () => {
    expect(scopeBadgeSource).not.toMatch(categoryColorPattern)
    expect(instructionsPage).not.toMatch(/function ScopeBadge|scopeColors|const colors: Record/)
  })
})
