import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./FeatherApp.vue', import.meta.url),
  'utf8',
)
const postCard = readFileSync(
  new URL('../../components/feather/FeatherPostCard.vue', import.meta.url),
  'utf8',
)

describe('FeatherApp Sky UI contract', () => {
  it('uses explicit Sky UI components without Konsta-style aliases', () => {
    expect(source).not.toContain("from 'konsta/vue'")
    expect(postCard).not.toContain("from 'konsta/vue'")
    expect(postCard).toContain('import { SkyButton, SkyGlass, SkyIcon }')
    expect(postCard).not.toMatch(/Sky[A-Za-z]+ as k[A-Za-z]+/)
    expect(postCard).not.toMatch(/<\/?k[A-Z]/)
  })

  it('gives likes and bookmarks a reduced-motion-safe pulse animation', () => {
    expect(postCard).toContain(
      "const reactionPulse = ref<'like' | 'bookmark' | null>(null)",
    )
    expect(postCard).toContain('@click.stop="react(\'like\')"')
    expect(postCard).toContain('@click.stop="react(\'bookmark\')"')
    expect(postCard).toContain("'is-pulsing': reactionPulse === 'like'")
    expect(postCard).toContain("'is-pulsing': reactionPulse === 'bookmark'")
    expect(postCard).toContain('@keyframes feather-reaction-pop')
    expect(postCard).toContain('@keyframes feather-reaction-ring')
    expect(postCard).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('keeps the post header actions visible and compact', () => {
    expect(postCard).toContain(
      ':aria-label="phone.t(\'Apps.feather.moreActions\')"',
    )
    expect(postCard).toMatch(
      /<SkyButton\s+icon-only\s+rounded\s+small\s+tonal\s+class="feather-more"/s,
    )
    expect(postCard).toMatch(
      /\.feather-follow\s*\{[^}]*--sky-app-accent:\s*var\(--feather-blue,[^}]*color:\s*var\(--feather-blue,/s,
    )
    expect(postCard).not.toMatch(
      /\.feather-follow\s*\{[^}]*--sky-app-accent:\s*transparent/s,
    )
    expect(postCard).toMatch(
      /\.feather-more\s*\{[^}]*width:\s*27px[^}]*height:\s*27px[^}]*border:\s*1px/s,
    )
  })

  it('keeps the composer below the iPhone header with compact actions', () => {
    expect(source).toContain("'feather-app--composer':")
    expect(source).toMatch(
      /\.feather-app--active\.feather-app--composer \.feather-navbar\s*\{[^}]*--sky-safe-area-top:\s*54px/s,
    )
    expect(source).toMatch(
      /\.feather-app--active\.feather-app--composer > \.feather-composer\s*\{[^}]*top:\s*112px[^}]*padding-top:\s*18px/s,
    )
    expect(source).toMatch(
      /\.feather-composer-close\s*\{[^}]*width:\s*32px[^}]*height:\s*32px/s,
    )
    expect(source).toMatch(
      /\.feather-composer-publish\s*\{[^}]*min-width:\s*52px[^}]*min-height:\s*28px/s,
    )
  })

  it('renders a white profile banner title and owner logout icon at the top right', () => {
    const profileStart = source.indexOf('class="feather-profile"')
    const tabsStart = source.indexOf(
      'class="feather-profile-tabs"',
      profileStart,
    )
    const profile = source.slice(profileStart, tabsStart)

    expect(profile).toContain('class="feather-profile__cover-title"')
    expect(profile).toContain('class="feather-profile__logout"')
    expect(profile).toContain('v-if="activeProfile.is_owner"')
    expect(profile).toContain(':aria-label="phone.t(\'Common.signOut\')"')
    expect(profile).toContain('@click="logoutDialogOpen = true"')
    expect(profile).not.toContain('feather-profile-action--logout')
    expect(source).toMatch(
      /\.feather-profile__cover-title\s*\{[^}]*color:\s*#fff/s,
    )
    expect(source).toMatch(
      /\.feather-app--active \.feather-profile__logout\s*\{[^}]*top:\s*10px[^}]*right:\s*10px/s,
    )
  })
})
