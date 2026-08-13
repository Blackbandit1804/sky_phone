import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./SettingsApp.vue', import.meta.url),
  'utf8',
)

describe('SettingsApp Sky UI contract', () => {
  it('uses the first-party settings surface without direct Konsta markup', () => {
    expect(source).not.toContain("from 'konsta/vue'")
    expect(source).not.toMatch(/<\/?k-[a-z]/)
    expect(source).toContain('<SkyAppPage')
    expect(source).toContain('<SkyNavbar')
    expect(source).toContain(
      ":variant=\"activeView === 'root' ? 'large' : 'compact'\"",
    )
    expect(source).toContain('<SkyScrollArea')
    expect(source).toContain('<SkySettingsGroup')
    expect(source).toContain('<SkySettingsRow')
    expect(source).toContain(
      `<template v-if="activeView === 'account' && !account.email" #right>`,
    )
  })

  it('uses the navbar control gap only once on compact subpages', () => {
    expect(source).toContain(
      ":class=\"{ 'settings-content--subpage': activeView !== 'root' }\"",
    )
    expect(source).toMatch(
      /\.settings-content\s*\{[^}]*padding-top:\s*var\(--sky-space-2\)/,
    )
    expect(source).toMatch(
      /\.settings-content--subpage\s*\{[^}]*padding-top:\s*0/,
    )
    expect(source).toMatch(
      /\.settings-content--subpage[\s\S]*?:deep\(\s*\.sky-settings-group:first-child\s*>\s*\.sky-settings-group__title:first-child\s*\)\s*\{[^}]*margin-top:\s*0/,
    )
  })
})
