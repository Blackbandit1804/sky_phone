import { describe, expect, it } from 'vitest'

import type { EasySharePayload } from '@/types/easyshare'
import { easyShareRoute } from '@/utils/easyshare'

function payload(overrides: Partial<EasySharePayload>): EasySharePayload {
  return {
    appId: 'notes',
    copyText: 'Shared content',
    kind: 'note',
    title: 'Shared content',
    ...overrides,
  }
}

describe('EasyShare deep links', () => {
  it.each([
    ['skyphone://media/42', '/apps/photos'],
    ['skyphone://location/current', '/apps/map'],
    ['skyphone://phone/5550142', '/apps/phone'],
    ['skyphone://music/server/night-drive', '/apps/music'],
    ['skyphone://citymarkt/listing/listing-1', '/apps/citymarkt'],
  ])('routes %s into its source app', (link, path) => {
    expect(easyShareRoute(payload({ link })).path).toBe(path)
  })

  it('falls back to the payload app and preserves share context', () => {
    expect(
      easyShareRoute(payload({ appId: 'calendar', id: 'event-1' })),
    ).toEqual({
      path: '/apps/calendar',
      query: {
        easyShareId: 'event-1',
        easyShareKind: 'note',
        easyShareLink: '',
      },
    })
  })

  it('opens CityMarkt links on the referenced listing', () => {
    expect(
      easyShareRoute(
        payload({
          appId: 'citymarkt',
          id: 'listing-1',
          kind: 'link',
          link: 'skyphone://citymarkt/listing/listing-1',
        }),
      ).query.listingId,
    ).toBe('listing-1')
  })

  it.each([
    ['picstagram', 'post', 'pic-post-1', '/apps/picstagram'],
    ['picstagram', 'profile', 'pic-profile-1', '/apps/picstagram'],
    ['feather', 'post', 'feather-post-1', '/apps/feather'],
    ['fliptok', 'post', 'fliptok-1', '/apps/fliptok'],
    ['local-pages', 'post', 'pages-post-1', '/apps/local-pages'],
  ])('preserves the exact %s %s target', (appId, kind, id, path) => {
    expect(
      easyShareRoute(
        payload({
          appId: appId as EasySharePayload['appId'],
          id,
          kind: kind as EasySharePayload['kind'],
          link: `skyphone://${appId}/${kind}/${id}`,
        }),
      ),
    ).toMatchObject({
      path,
      query: { easyShareId: id, easyShareKind: kind },
    })
  })
})
