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
})
