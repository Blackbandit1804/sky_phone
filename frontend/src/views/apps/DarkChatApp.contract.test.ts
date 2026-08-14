import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./DarkChatApp.vue', import.meta.url),
  'utf8',
)

describe('DarkChatApp Sky UI contract', () => {
  it('uses first-party Sky UI without direct Konsta markup', () => {
    expect(source).not.toContain("from 'konsta/vue'")
    expect(source).not.toMatch(/<\/?k-[a-z]/)
    expect(source).toContain('<SkyAppPage')
    expect(source).toContain('<SkyNavbar')
    expect(source).toContain('<SkyScrollArea')
    expect(source).toContain('<SkySettingsGroup')
    expect(source).toContain('<SkyMessagebar')
    expect(source).toContain('<SkyPillNavigation')
  })

  it('keeps one identity action in the inbox header', () => {
    const inboxStart = source.indexOf("screen === 'inbox'")
    const newChatStart = source.indexOf("screen === 'new'")
    const inbox = source.slice(inboxStart, newChatStart)

    expect(inbox.match(/@click="openProfile"/g)).toHaveLength(1)
  })

  it('uses the full conversation card width', () => {
    const conversationStart = source.indexOf(
      'v-for="conversation in filteredConversations"',
    )
    const conversationEnd = source.indexOf('</SkyListItem>', conversationStart)
    const conversation = source.slice(conversationStart, conversationEnd)

    expect(conversation).not.toMatch(/\scontacts(?:\s|>)/)
  })

  it('bottom-aligns short threads and exposes profile lifecycle actions', () => {
    expect(source).toContain('ref="messagesArea"')
    expect(source).toMatch(/\.dc-day\s*\{[^}]*margin:\s*auto 0 8px/s)
    expect(source).toContain('@click="signOut"')
    expect(source).toContain('@click="deleteProfile"')
  })

  it('separates the round attachment action from the floating message pill', () => {
    expect(source).toContain('class="dc-composer-row"')
    expect(source).toContain('class="dc-composer-action"')
    expect(source).toContain('class="dc-composer-pill"')
    expect(source).toMatch(
      /<div v-else class="dc-composer-row">[\s\S]*?<SkyGlass[\s\S]*?class="dc-composer-action"[\s\S]*?<SkyGlass class="dc-composer-pill">[\s\S]*?<SkyMessagebar/,
    )
    expect(source).not.toContain('<template #left>')
    expect(source).toMatch(
      /\.dc-composer-pill\s*\{[^}]*border-radius:\s*var\(--sky-radius-pill\)/s,
    )
    expect(source).toMatch(
      /\.dc-composer-action\s*\{[^}]*border-radius:\s*50%/s,
    )
  })

  it('presents attachments as a compact five-action Sky glass rail', () => {
    const attachmentsStart = source.indexOf(
      'v-if="attachmentOpen" class="dc-attachments"',
    )
    const attachmentsEnd = source.indexOf('</div>', attachmentsStart)
    const attachments = source.slice(attachmentsStart, attachmentsEnd)

    expect(attachments.match(/class="dc-attachment-action"/g)).toHaveLength(5)
    expect(attachments.match(/<SkyGlass/g)).toHaveLength(5)
    expect(source).toMatch(
      /\.dc-attachments\s*\{[^}]*grid-template-columns:\s*repeat\(5,/s,
    )
  })

  it('raises only the DarkChat inbox title block', () => {
    expect(source).toContain('class="dc-inbox-navbar"')
    expect(source).toMatch(
      /\.dc-inbox-navbar :deep\(\.sky-navbar__title-container > div\)\s*\{[^}]*translateY\(-14px\)/s,
    )
  })
})
