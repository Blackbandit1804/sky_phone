import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

describe('Sky UI graphics modes', () => {
  const mainCss = readFileSync(
    fileURLToPath(new URL('../assets/main.css', import.meta.url)),
    'utf8',
  )
  const performanceStart = mainCss.indexOf(
    '/* FiveM CEF blur-free glass fallback.',
  )
  const performanceEnd = mainCss.indexOf(
    '/* Chromium 103 cannot resolve color-mix()',
    performanceStart,
  )
  const performanceCss = mainCss.slice(performanceStart, performanceEnd)
  const controlsCss = readFileSync(
    fileURLToPath(new URL('./controls.css', import.meta.url)),
    'utf8',
  )

  it('keeps Performance glass solid and blur-free', () => {
    expect(performanceCss).toContain(
      '--sky-glass: var(--phone-performance-glass)',
    )
    expect(performanceCss).toContain(
      '--sky-glass-solid: var(--phone-performance-glass)',
    )
    expect(performanceCss).toContain('--sky-navbar-glass: var(--sky-bg)')
    expect(performanceCss).toContain('backdrop-filter: none !important')
    expect(performanceCss).toContain('-webkit-backdrop-filter: none !important')
  })

  it('removes Range and Toggle hold glass only inside Performance mode', () => {
    expect(performanceCss).toContain('--sky-hold-thumb-scale: 1')
    expect(performanceCss).toContain('--sky-range-hold-background: #ffffff')
    expect(performanceCss).toContain(
      '--sky-range-hold-shadow: var(--sky-shadow-thumb)',
    )
    expect(performanceCss).toContain('--sky-toggle-hold-background: #ffffff')
    expect(performanceCss).toContain('--sky-toggle-hold-glass-opacity: 0')
    expect(performanceCss).toContain('--sky-toggle-hold-glow-opacity: 0')
    expect(performanceCss).toContain('--sky-toggle-hold-track-scale: 1')
    expect(performanceCss).toContain(
      '.phone-app--performance .sky-glass--touch-highlight',
    )
    expect(performanceCss).toContain(
      '.phone-app--performance .sky-glass--highlight-visible::after',
    )
    expect(performanceCss).toContain("[class~='rounded-[inherit]']")
    expect(performanceCss).toContain(
      "[class~='group-has-[input:active]/range:scale-[1.4]']",
    )
    expect(performanceCss).toContain("[class~='group-active:scale-[1.4]']")
    expect(performanceCss).toContain("[class~='group-active:opacity-100']")
  })

  it('does not globally disable functional motion or focus styling', () => {
    const universalPerformanceRule = performanceCss.match(
      /\.phone-app--performance,\s*\.phone-app--performance \*,\s*\.phone-app--performance \*::before,\s*\.phone-app--performance \*::after\s*\{([^}]*)\}/,
    )?.[1]

    expect(universalPerformanceRule).toBeDefined()
    expect(universalPerformanceRule).not.toMatch(
      /(?:^|;)\s*(?:animation|box-shadow|opacity|transform|transition)\s*:/,
    )
  })

  it('keeps pill navigation solid in Performance and glass in Ultimate', () => {
    expect(performanceCss).toMatch(
      /\.phone-app--performance \.sky-segmented--navigation\s*\{[^}]*background:\s*var\(--phone-performance-glass\)[^}]*box-shadow:\s*none/s,
    )
    expect(performanceCss).toMatch(
      /\.phone-app--performance \.sky-segmented--navbar\s*\{[^}]*background:\s*var\(--phone-performance-glass\)[^}]*box-shadow:\s*none/s,
    )
    expect(controlsCss).toMatch(
      /\.sky-glass\s*\{[^}]*background:\s*var\(--sky-glass-solid[^}]*box-shadow:\s*var\(--sky-shadow-glass\)/s,
    )
    expect(controlsCss).toMatch(
      /@supports[\s\S]*?\.sky-glass\s*\{[^}]*backdrop-filter:\s*blur\(16px\)[^}]*\}[\s\S]*?\.sky-glass\s*\{[^}]*background:\s*var\(--sky-glass,/,
    )
  })
})
