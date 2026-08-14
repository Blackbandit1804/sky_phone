import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./MessagesApp.vue', import.meta.url),
  'utf8',
)

describe('MessagesApp Sky UI contract', () => {
  it('uses first-party Sky UI without direct Konsta markup', () => {
    expect(source).not.toContain("from 'konsta/vue'")
    expect(source).not.toMatch(/<\/?k-[a-z]/)
    expect(source).toContain('<SkyAppPage')
    expect(source).toContain('<SkyNavbar')
    expect(source).toContain('<SkyScrollArea')
    expect(source).toContain('<SkySearchbar')
    expect(source).toContain('<SkySegmented')
    expect(source).toContain('<SkyMessages')
    expect(source).toContain('<SkyMessagebar')
    expect(source).toContain('<SkyPillNavigation')
  })

  it('keeps inbox search focused on text and exposes clear filters', () => {
    const inboxStart = source.indexOf('messages-sky-inbox')
    const composeStart = source.indexOf('v-else-if="composing"')
    const inbox = source.slice(inboxStart, composeStart)

    expect(inbox).toContain('<SkySearchbar')
    expect(inbox).not.toContain('messages-inbox-search__voice')
    expect(inbox).toContain('Apps.messages.allMessages')
    expect(inbox).toContain('Apps.messages.unreadMessages')
  })

  it('uses one compact scroll region and an in-flow composer in threads', () => {
    expect(source).toContain('class="messages-sky-thread-scroll"')
    expect(source).toContain('class="messages-bubbles"')
    expect(source).toContain('class="messages-sky-composer-pill"')
    expect(source).toContain('class="messages-sky-messagebar"')
    expect(source).toMatch(
      /\.messages-bubbles\s*\{[^}]*min-height:\s*100%[^}]*justify-content:\s*flex-end/s,
    )
    expect(source).toMatch(
      /\.messages-sky-composer-shell\s*\{[^}]*flex:\s*none/s,
    )
    expect(source).toMatch(
      /\.messages-sky-composer-pill\s*\{[^}]*border-radius:\s*var\(--sky-radius-pill\)/s,
    )
  })

  it('provides a full-size back target and a compact recipient row', () => {
    expect(source).toContain('back-appearance="plain"')
    expect(source).toContain('class="messages-recipient-field"')
    expect(source).toContain('layout="inline"')
    expect(source).toMatch(
      /\.messages-recipient-field :deep\(\.sky-field\)\s*\{[^}]*min-height:\s*52px/s,
    )
  })

  it('keeps the SMS compose action in the inbox navbar', () => {
    const inboxStart = source.indexOf('messages-sky-inbox')
    const composeStart = source.indexOf('v-else-if="composing"')
    const inbox = source.slice(inboxStart, composeStart)

    expect(inbox).toContain('@click="beginCompose"')
    expect(inbox).toContain('<SquarePen')
    expect(inbox).not.toContain('messages-sky-compose-navigation')
  })

  it('keeps SMS conversations and recipients in flat iMessage-style lists', () => {
    expect(source).toMatch(
      /v-if="filteredConversations.length"\s+flush\s+class="messages-sky-conversation-list"/,
    )
    expect(source).toMatch(
      /class="messages-recipient-field"\s+density="compact"\s+flush/,
    )
    expect(source).toMatch(
      /v-if="contactSuggestions.length"\s+class="messages-contact-list"\s+flush/,
    )
  })
})
