import { readFileSync } from 'node:fs'

import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import SkySheet from './SkySheet.vue'

async function renderSheet(
  props: InstanceType<typeof SkySheet>['$props'],
): Promise<string> {
  return renderToString(
    createSSRApp({
      render: () => h(SkySheet, props, () => 'Sheet content'),
    }),
  )
}

describe('SkySheet', () => {
  it('renders an opt-in drag handle without changing ordinary sheets', async () => {
    const swipeable = await renderSheet({
      ariaLabel: 'Property details',
      opened: true,
      swipeToClose: true,
    })
    const ordinary = await renderSheet({ opened: true })

    expect(swipeable).toContain('class="sky-sheet__grabber"')
    expect(swipeable).toContain('Sheet content')
    expect(ordinary).not.toContain('sky-sheet__grabber')
  })

  it('owns pointer capture, close thresholds, and settling motion', () => {
    const source = readFileSync(
      new URL('./SkySheet.vue', import.meta.url),
      'utf8',
    )
    const overlays = readFileSync(
      new URL('../overlays.css', import.meta.url),
      'utf8',
    )

    expect(source).toContain('swipeclose: [event: PointerEvent]')
    expect(source).toContain('setPointerCapture(event.pointerId)')
    expect(source).toContain('dragOffset.value >= closeThreshold')
    expect(source).toContain("emit('swipeclose', event)")
    expect(overlays).toMatch(
      /\.sky-sheet__grabber\s*\{[^}]*touch-action:\s*none;/s,
    )
    expect(overlays).toMatch(
      /\.sky-sheet__panel--settling\s*\{[^}]*transition:\s*transform 220ms/s,
    )
  })
})
