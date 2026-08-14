import { readFileSync } from 'node:fs'

import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import SkySegmented from './SkySegmented.vue'
import SkySegmentedButton from './SkySegmentedButton.vue'

const controls = readFileSync(
  new URL('../controls.css', import.meta.url),
  'utf8',
)

async function renderNavigation(activeIndex = 1): Promise<string> {
  return renderToString(
    createSSRApp({
      render: () =>
        h(
          SkySegmented,
          {
            activeIndex,
            ariaLabel: 'App Store',
            itemCount: 3,
            navigation: true,
            rounded: true,
            strong: true,
          },
          {
            default: () =>
              ['Apps', 'Games', 'Search'].map((label, index) =>
                h(
                  SkySegmentedButton,
                  {
                    active: activeIndex === index,
                    'aria-label': label,
                  },
                  () => label,
                ),
              ),
          },
        ),
    }),
  )
}

describe('SkySegmented navigation', () => {
  it('keeps ordinary iOS segments at Konsta height and Strong colors', () => {
    expect(controls).toMatch(
      /\.sky-segmented\s*\{[^}]*height:\s*34px[^}]*min-height:\s*34px/s,
    )
    expect(controls).toMatch(
      /\.sky-segmented-button\s*\{[^}]*height:\s*34px[^}]*min-height:\s*34px[^}]*padding:\s*0 8px[^}]*font-size:\s*15px[^}]*font-weight:\s*500/s,
    )
    expect(controls).toMatch(
      /\.sky-segmented--strong:not\(\.sky-segmented--navigation\):not\([\s\S]*?height:\s*38px[^}]*padding:\s*2px[^}]*background:\s*rgba\(0, 0, 0, 0\.05\)/,
    )
    expect(controls).toMatch(
      /\.sky-segmented--strong:not\(\.sky-segmented--navigation\):not\([\s\S]*?\.sky-segmented-button\s*\{[^}]*color:\s*var\(--sky-text, #000000\)/,
    )
    expect(controls).toMatch(
      /\.sky-segmented--strong:not\(\.sky-segmented--navigation\):not\([\s\S]*?\.sky-segmented-button--active\s*\{[^}]*color:\s*#000000[^}]*0 1px 3px rgba\(0, 0, 0, 0\.1\)[^}]*0 1px 2px -1px rgba\(0, 0, 0, 0\.1\)/,
    )
    expect(controls).toMatch(
      /\.sky-segmented--rounded:not\(\.sky-segmented--outline\):not\([\s\S]*?\.sky-segmented-button--active\s*\{[^}]*border-radius:\s*var\(--sky-radius-pill, 999px\)/,
    )
  })

  it('renders the Konsta iOS glass stack and one moving highlight', async () => {
    const html = await renderNavigation()

    expect(html).toContain('sky-glass')
    expect(html).toContain('sky-glass--highlight')
    expect(html).toContain('sky-segmented--navigation')
    expect(html).toContain('role="group"')
    expect(html).toContain('aria-label="App Store"')
    expect(html.match(/<button/g)).toHaveLength(3)
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html).toContain('sky-segmented__highlight')
    expect(html).toContain('width:calc(33.3333% - 5.3333px)')
    expect(html).toContain('--sky-segmented-indicator-offset:calc(100% + 4px)')
  })

  it('allows callers to disable only the interactive Glass highlight', async () => {
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(
            SkySegmented,
            {
              ariaLabel: 'Static glass',
              glassHighlight: false,
              itemCount: 1,
              navigation: true,
            },
            {
              default: () =>
                h(SkySegmentedButton, { active: true }, () => 'One'),
            },
          ),
      }),
    )

    expect(html).toContain('sky-glass')
    expect(html).not.toContain('sky-glass--highlight')
  })

  it('locks the 56px container, 48px controls and reduced motion', () => {
    expect(controls).toMatch(
      /\.sky-glass\.sky-segmented--navigation\s*\{[^}]*min-height:\s*56px[^}]*gap:\s*4px[^}]*padding:\s*4px/s,
    )
    expect(controls).toMatch(
      /\.sky-segmented--navigation \.sky-segmented-button\s*\{[^}]*min-height:\s*48px/s,
    )
    expect(controls).toMatch(
      /\.sky-segmented__highlight\s*\{[^}]*top:\s*4px[^}]*bottom:\s*4px[^}]*background:\s*#e5e5ea/s,
    )
    expect(controls).toMatch(
      /\.sky-app-page--dark \.sky-segmented__highlight\s*\{[^}]*background:\s*#2c2c2e/s,
    )
    expect(controls).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.sky-segmented__highlight,[\s\S]*transition-duration:\s*0\.01ms/,
    )
  })

  it('keeps text-only Glass navigation compact with 44px targets', async () => {
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(
            SkySegmented,
            {
              activeIndex: 1,
              ariaLabel: 'Availability',
              compact: true,
              itemCount: 3,
              navigation: true,
            },
            {
              default: () =>
                ['Available', 'Busy', 'Closed'].map((label, index) =>
                  h(SkySegmentedButton, { active: index === 1 }, () => label),
                ),
            },
          ),
      }),
    )

    expect(html).toContain('sky-segmented--compact')
    expect(html).toContain('width:calc(33.3333% - 5.3333px)')
    expect(controls).toMatch(
      /\.sky-glass\.sky-segmented--navigation\.sky-segmented--compact\s*\{[^}]*height:\s*48px[^}]*min-height:\s*48px[^}]*padding-block:\s*2px/s,
    )
    expect(controls).toMatch(
      /\.sky-segmented--navigation\.sky-segmented--compact \.sky-segmented-button\s*\{[^}]*height:\s*var\(--sky-touch-target, 44px\)[^}]*font-size:\s*15px[^}]*font-weight:\s*500/s,
    )
    expect(controls).toMatch(
      /\.sky-segmented--compact \.sky-segmented__highlight\s*\{[^}]*top:\s*2px[^}]*bottom:\s*2px/s,
    )
  })

  it('lets subnavbar search controls fill the available Konsta row', () => {
    expect(controls).toMatch(
      /\.sky-searchbar\s*\{[^}]*width:\s*100%[^}]*flex:\s*1 1 auto/s,
    )
  })

  it('keeps Navbar segmented visuals at Konsta size with 44px targets', () => {
    expect(controls).toMatch(
      /\.sky-glass\.sky-segmented--navbar\s*\{[^}]*height:\s*var\(--sky-touch-target, 44px\)[^}]*gap:\s*4px[^}]*padding:\s*0 4px/s,
    )
    expect(controls).toMatch(
      /\.sky-segmented--navbar \.sky-segmented-button\s*\{[^}]*min-height:\s*var\(--sky-touch-target, 44px\)[^}]*padding:\s*0 8px[^}]*font-size:\s*15px[^}]*font-weight:\s*500/s,
    )
    expect(controls).toMatch(
      /\.sky-segmented--navbar \.sky-segmented__highlight\s*\{[^}]*top:\s*5px[^}]*bottom:\s*5px[^}]*background:\s*#ffffff/s,
    )
    expect(controls).toMatch(
      /\.sky-app-page--dark \.sky-segmented--navbar \.sky-segmented__highlight\s*\{[^}]*background:\s*rgba\(255, 255, 255, 0\.75\)/s,
    )
  })

  it('calculates the same sliding pill for full-width five-item navigation', async () => {
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(
            SkySegmented,
            {
              activeIndex: 4,
              ariaLabel: 'Five tabs',
              itemCount: 5,
              navigation: true,
            },
            {
              default: () =>
                Array.from({ length: 5 }, (_, index) =>
                  h(
                    SkySegmentedButton,
                    { active: index === 4 },
                    () => `${index}`,
                  ),
                ),
            },
          ),
      }),
    )

    expect(html).toContain('width:calc(20% - 4.8px)')
    expect(html).toContain('--sky-segmented-indicator-offset:calc(400% + 16px)')
  })
})
