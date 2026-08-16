import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./PhoneApp.vue', import.meta.url), 'utf8')

describe('PhoneApp EasyShare contract', () => {
  it('loads the server-canonical own contact instead of creating a profile payload', () => {
    expect(source).toContain(
      "nuiCall<EasySharePayload>('easyshare:own-contact')",
    )
    expect(source).toContain('easyShare.open(response.data)')
    expect(source).not.toContain("kind: 'profile'")
  })

  it('uses the shared full-width Sky tab bar for phone sections', () => {
    expect(source).toContain('<sky-tab-bar')
    expect(source).toContain('<sky-tab-button')
    expect(source).not.toContain('<sky-segmented')
  })

  it('opens contact deep links only after contacts bootstrap and consumes the query', () => {
    const mounted = source.slice(
      source.indexOf('onMounted(async () => {'),
      source.indexOf('onBeforeUnmount(() => {'),
    )
    const bootstrapIndex = mounted.indexOf('await calls.bootstrap()')
    const contactRequestIndex = mounted.indexOf(
      "typeof route.query.contactId === 'string'",
    )

    expect(bootstrapIndex).toBeGreaterThanOrEqual(0)
    expect(contactRequestIndex).toBeGreaterThan(bootstrapIndex)
    expect(mounted).toContain(
      '(contact) => contact.id === route.query.contactId',
    )
    expect(mounted).toContain("tab.value = 'contacts'")
    expect(mounted).toContain('openRecentDetail(requestedContact.phone_number)')
    expect(mounted).toMatch(
      /route\.query\.contactId[\s\S]*await router\.replace\('\/apps\/phone'\)/,
    )
  })

  it('opens new-contact deep links in the contact editor and consumes the query', () => {
    const mounted = source.slice(
      source.indexOf('onMounted(async () => {'),
      source.indexOf('onBeforeUnmount(() => {'),
    )
    const bootstrapIndex = mounted.indexOf('await calls.bootstrap()')
    const newContactRequestIndex = mounted.indexOf(
      "typeof route.query.newContactNumber === 'string'",
    )

    expect(bootstrapIndex).toBeGreaterThanOrEqual(0)
    expect(newContactRequestIndex).toBeGreaterThan(bootstrapIndex)
    expect(mounted).toContain(
      'openContact(undefined, route.query.newContactNumber)',
    )
    expect(mounted).toMatch(
      /route\.query\.newContactNumber[\s\S]*await router\.replace\('\/apps\/phone'\)/,
    )
  })
})
