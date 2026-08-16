import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./MusicApp.vue', import.meta.url), 'utf8')
const menuSource = source.slice(
  source.indexOf('<SkyPopover'),
  source.indexOf('</SkyPopover>') + '</SkyPopover>'.length,
)

describe('MusicApp action menu contract', () => {
  it('uses the shared anchored Sky popover and its close paths', () => {
    expect(source).toContain('SkyPopover,')
    expect(source).toContain('const menuTarget = ref<HTMLElement | null>(null)')
    expect(source.split('menuTarget.value = event.currentTarget')).toHaveLength(
      3,
    )
    expect(menuSource).toContain(
      ':opened="addMenuOpened || actionMenuOpened"',
    )
    expect(menuSource).toContain(':target="menuTarget"')
    expect(menuSource).toContain('@backdropclick="dismissMenus"')
    expect(menuSource).toContain('@escape="dismissMenus"')
    expect(menuSource).toContain('@positionerror="dismissMenus"')
  })

  it('keeps every add, playlist, and track action in the central menu', () => {
    expect(menuSource).toContain('@click="shareActivePlaylist"')
    expect(menuSource).toContain('@click="openActivePlaylistTrackPicker"')
    expect(menuSource).toContain('openSheet')
    expect(menuSource).toContain('rename')
    expect(menuSource).toContain('@click="requestDeletePlaylist"')
    expect(menuSource).toContain('youtube')
    expect(menuSource).toContain('@click="openNewPlaylist()"')
    expect(menuSource).toContain('@click="shareTrack()"')
    expect(menuSource).toContain('@click="openPlaylistPicker(actionTrack)"')
    expect(menuSource).toContain('@click="removeFromActivePlaylist"')
    expect(menuSource).toContain('@click="requestRemoveTrack"')
    expect(menuSource.split('variant="danger"')).toHaveLength(4)
  })

  it('does not retain the manual popover geometry or dismiss overlay', () => {
    expect(source).not.toContain('positionPopover')
    expect(source).not.toContain('popoverStyle')
    expect(source).not.toContain('MUSIC_POPOVER_')
    expect(source).not.toContain('music-popover-dismiss')
    expect(source).not.toContain('class="music-popover"')
  })
})
