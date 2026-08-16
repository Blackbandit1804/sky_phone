import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const component = readFileSync(
  new URL('./PhoneDynamicIsland.vue', import.meta.url),
  'utf8',
)
const app = readFileSync(new URL('../App.vue', import.meta.url), 'utf8')

describe('PhoneDynamicIsland contract', () => {
  it('renders only a ringing incoming call with Sky actions', () => {
    expect(component).toContain("call?.direction === 'incoming'")
    expect(component).toContain("call.state === 'ringing'")
    expect(component).toContain('<SkyButton')
    expect(component).toContain("await calls.answer()")
    expect(component).toContain("await calls.decline()")
  })

  it('keeps incoming calls in the current app until accepted', () => {
    expect(app).toContain("call.state !== 'ringing'")
    expect(app).toContain("call.direction !== 'incoming'")
    expect(app).toContain('<PhoneDynamicIsland @accepted="openAcceptedCall" />')
  })
})
