import * as fs from 'fs'
import * as path from 'path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const globalsCss = fs.readFileSync(path.join(root, 'src/renderer/src/styles/globals.css'), 'utf8')
const usagePage = fs.readFileSync(path.join(root, 'src/renderer/src/pages/usage.tsx'), 'utf8')
const usageTrendWidget = fs.readFileSync(
  path.join(root, 'src/renderer/src/components/dashboard/widgets/usage-trend.widget.tsx'),
  'utf8'
)

describe('renderer theme palette', () => {
  it('defaults to neutral primary with switchable accents incl. blue (GH-106 A)', () => {
    // GH-106 (decision A): neutral is the default accent (light=near-black,
    // dark=near-white) driving --primary, so nav/CTA/selection follow the picker.
    // :root keeps blue as the data-accent='blue' fallback; --accent stays a neutral
    // contrast token for hover/structure, no longer the nav-selection driver.
    expect(globalsCss).toMatch(/html\[data-accent='neutral'\]/) // GH-106 neutral default block
    expect(globalsCss).toMatch(/html\.dark\[data-accent='neutral'\]/) // light/dark branch
    expect(globalsCss).toContain('--primary: 212 100% 47%;') // light (blue fallback)
    expect(globalsCss).toContain('--primary: 212 100% 50%;') // dark
    expect(globalsCss).toContain('--primary-foreground: 0 0% 100%;')
    expect(globalsCss).toContain('--ring: 212 100% 47%;') // unified blue focus ring

    // nav/selection accent remains neutral (near-black on light, near-white on dark)
    expect(globalsCss).toContain('--accent: 240 5.9% 10%;')
    expect(globalsCss).toContain('--sidebar-accent: 240 5.9% 10%;')
    expect(globalsCss).toContain('--accent: 0 0% 98%;')
    expect(globalsCss).toContain('--accent-foreground: 240 10% 3.9%;')
    expect(globalsCss).toContain('--sidebar-accent: 0 0% 98%;')

    // switchable accent dimension exists (GH-105)
    expect(globalsCss).toMatch(/html\[data-accent='violet'\]/)

    // the old orange theme accent is still gone
    expect(globalsCss).not.toMatch(/--(?:accent|sidebar-accent|chart-2):\s*24\.6 95% 53\.1%;/)

    // dead tokens stay deleted (GH-115 orphans #15, removed after GH-103 closed):
    // --secondary pair and --sidebar-accent-foreground had zero class consumers.
    expect(globalsCss).not.toMatch(/--secondary(?:-foreground)?:/)
    expect(globalsCss).not.toMatch(/--sidebar-accent-foreground:/)
  })

  it('uses a unified categorical semantic chart palette (blue/green/amber/violet/pink)', () => {
    // light
    expect(globalsCss).toContain('--chart-1: 217 91% 60%;')
    expect(globalsCss).toContain('--chart-2: 160 84% 39%;')
    expect(globalsCss).toContain('--chart-3: 38 92% 50%;')
    expect(globalsCss).toContain('--chart-4: 258 90% 66%;')
    expect(globalsCss).toContain('--chart-5: 330 81% 60%;')
    // dark (brightened one step for contrast)
    expect(globalsCss).toContain('--chart-1: 213 94% 68%;')
    expect(globalsCss).toContain('--chart-2: 160 65% 52%;')
    expect(globalsCss).toContain('--chart-3: 43 96% 56%;')
    expect(globalsCss).toContain('--chart-4: 255 92% 76%;')
    expect(globalsCss).toContain('--chart-5: 329 87% 70%;')
    // old shadcn contrast palette (mixed unrelated hues) is gone
    expect(globalsCss).not.toContain('--chart-3: 215 16% 47%;')
    expect(globalsCss).not.toContain('--chart-5: 339 45% 50%;')
  })

  it('renders homogeneous series charts with the neutral primary single color', () => {
    // GH-138: 「近 7 天费用」图随 Overview 重构迁入 usage-trend widget; 仍用单色
    // CHART_SERIES_FILL, 不按索引循环 --chart-${...}
    expect(usageTrendWidget).toContain('CHART_SERIES_FILL')
    expect(usageTrendWidget).not.toMatch(/--chart-\$\{/)
  })

  it('keeps Usage chart colors tied to shared chart tokens', () => {
    expect(usagePage).toContain('CHART_CATEGORICAL')
    expect(usagePage).toContain('CHART_SERIES_FILL')

    expect(usagePage).not.toMatch(/hsl\(24\.6,\s*95%,\s*53\.1%\)/)
  })
})
