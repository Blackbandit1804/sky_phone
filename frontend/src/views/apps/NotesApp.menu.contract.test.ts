import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./NotesApp.vue', import.meta.url), 'utf8')
const menuSource = source.slice(
  source.indexOf('<SkyActionSheet'),
  source.indexOf('</SkyActionSheet>') + '</SkyActionSheet>'.length,
)

describe('NotesApp more menu', () => {
  it('uses the shared Feather-style action sheet', () => {
    expect(menuSource).toContain(
      ':aria-label="phone.t(\'Apps.notes.actions\')"',
    )
    expect(menuSource.match(/<SkyButton\b/g)).toHaveLength(4)
    expect(menuSource.match(/\btonal\b/g)).toHaveLength(3)
    expect(menuSource).toContain('<SkyButton block clear large')
    expect(menuSource).toContain('class="notes-action-sheet sky-ui-provider"')
    expect(menuSource).toContain("'sky-ui-provider--dark': phone.isDarkMode")
    expect(source).not.toContain('<SkyPopover')
  })

  it('keeps every action and close path connected', () => {
    expect(menuSource).toContain('@click="shareNote"')
    expect(menuSource).toContain('@click="togglePinned"')
    expect(menuSource).toContain('@click="deleteNote"')
    expect(menuSource).toContain('@backdropclick="menuOpened = false"')
    expect(menuSource).toContain('@escape="menuOpened = false"')
  })
})
