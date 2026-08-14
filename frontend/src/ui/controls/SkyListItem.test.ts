import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import SkyListItem from './SkyListItem.vue'

describe('SkyListItem', () => {
  it('matches the Konsta anchor default for link rows', async () => {
    const html = await renderToString(
      createSSRApp(SkyListItem, { link: true, title: 'Inbox' }),
    )

    expect(html).toMatch(
      /^<li[^>]*class="sky-list-item[^"]*sky-list-item--link[^"]*"><a class="sky-list-item__row"/,
    )
    expect(html).not.toContain('<button')
  })
})
