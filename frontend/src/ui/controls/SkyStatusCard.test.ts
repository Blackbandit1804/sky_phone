import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import SkyStatusCard from '@/ui/controls/SkyStatusCard.vue'

describe('SkyStatusCard', () => {
  it('renders a textual live status with a semantic tone and indicator', async () => {
    const app = createSSRApp({
      render: () =>
        h(
          SkyStatusCard,
          {
            indicator: true,
            ariaLive: 'polite',
            subtitle: 'Yaca',
            title: 'Connected to 120.5 MHz',
            tone: 'success',
          },
          { icon: () => h('svg', { 'aria-hidden': 'true' }) },
        ),
    })

    const html = await renderToString(app)

    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('aria-atomic="true"')
    expect(html).toContain('sky-status-card--success')
    expect(html).toContain('sky-status-card__indicator')
    expect(html).toContain('Connected to 120.5 MHz')
    expect(html).toContain('Yaca')
  })
})
