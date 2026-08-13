import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import SkyRange from '@/ui/controls/SkyRange.vue'

describe('SkyRange', () => {
  it('renders a native accessible range with the configured progress', async () => {
    const app = createSSRApp(SkyRange, {
      ariaLabel: 'Radio volume',
      ariaValueText: '25%',
      max: 100,
      min: 0,
      modelValue: 25,
      step: 1,
    })

    const html = await renderToString(app)

    expect(html).toContain('type="range"')
    expect(html).toContain('aria-label="Radio volume"')
    expect(html).toContain('aria-valuetext="25%"')
    expect(html).toContain('min="0"')
    expect(html).toContain('max="100"')
    expect(html).toContain('step="1"')
    expect(html).toContain('--sky-range-progress:25%')
  })

  it('integrates an optional caption without replacing the accessible name', async () => {
    const app = createSSRApp(SkyRange, {
      ariaLabel: 'Radio volume',
      caption: 'Volume',
      modelValue: 64,
    })

    const html = await renderToString(app)

    expect(html).toContain('sky-range--captioned')
    expect(html).toContain('class="sky-range__caption"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('Volume')
    expect(html).toContain('aria-label="Radio volume"')
  })
})
