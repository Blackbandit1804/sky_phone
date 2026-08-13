import { describe, expect, it } from 'vitest'

import {
  addHomeAppToFolder,
  addHomePage,
  createHomeFolder,
  createDefaultHomeLayout,
  deleteHomePage,
  extractHomeFolderApp,
  getHomeFolder,
  HOME_GRID_PAGE_SIZE,
  homeKeyboardTarget,
  isHomeFolder,
  MAX_HOME_GRID_PAGES,
  moveHomeFolderApp,
  moveHomeApp,
  parseHomeLayout,
  renameHomeFolder,
  removeHomeApp,
  restoreHomeApp,
  type HomeLayout,
} from '@/utils/homeLayout'

const installed = ['phone', 'messages', 'mail', 'clock', 'notes'] as const
const defaults = createDefaultHomeLayout(
  [...installed],
  ['phone', 'messages', 'mail', 'clock', 'notes'],
  ['phone', 'messages', 'clock'],
)

describe('home layout', () => {
  it('uses fixed grid and dock slots for the registry arrangement', () => {
    const layout = parseHomeLayout(undefined, defaults, [...installed])

    expect(layout.grid).toHaveLength(HOME_GRID_PAGE_SIZE)
    expect(layout.grid.slice(0, 6)).toEqual([
      'phone',
      'messages',
      'mail',
      'clock',
      'notes',
      null,
    ])
    expect(layout.dock).toEqual(['phone', 'messages', 'clock', null])
    expect(layout.version).toBe(5)
  })

  it('migrates compact persisted arrays and appends newly installed apps', () => {
    const layout = parseHomeLayout(
      {
        dock: ['messages', 'invalid', 'messages'],
        grid: ['mail'],
        hidden: ['phone'],
      },
      defaults,
      [...installed],
    )

    expect(layout.dock).toEqual(['messages', null, null, null])
    expect(layout.grid.slice(0, 4)).toEqual(['mail', 'clock', 'notes', null])
    expect(layout.hidden).toEqual(['phone'])
    expect(layout.version).toBe(5)
  })

  it('preserves explicit gaps in versioned layouts', () => {
    const grid: HomeLayout['grid'] = Array.from(
      { length: 20 },
      () => null,
    )
    grid[0] = 'phone'
    grid[7] = 'mail'

    const layout = parseHomeLayout(
      {
        dock: ['messages', null, 'clock', null],
        grid,
        hidden: ['notes'],
        version: 2,
      },
      defaults,
      [...installed],
    )

    expect(layout.grid[0]).toBe('phone')
    expect(layout.grid[1]).toBeNull()
    expect(layout.grid[7]).toBe('mail')
    expect(layout.dock).toEqual(['messages', null, 'clock', null])
  })

  it('keeps valid custom-app tombstones in version 3 layouts', () => {
    const grid: HomeLayout['grid'] = Array.from(
      { length: 20 },
      () => null,
    )
    grid[6] = 'temporarily-missing' as HomeLayout['hidden'][number]

    const layout = parseHomeLayout(
      {
        dock: ['phone', null, null, null],
        grid,
        hidden: [],
        version: 3,
      },
      defaults,
      [...installed],
    )

    expect(layout.grid[6]).toBe('temporarily-missing')
    expect(layout.version).toBe(5)
  })

  it('expands version 3 capacity without compacting persisted gaps', () => {
    const grid: HomeLayout['grid'] = Array.from({ length: 40 }, () => null)
    grid[19] = 'mail'
    grid[20] = 'notes'

    const layout = parseHomeLayout(
      {
        dock: ['phone', null, null, null],
        grid,
        hidden: [],
        version: 3,
      },
      defaults,
      [...installed],
    )

    expect(layout.grid).toHaveLength(HOME_GRID_PAGE_SIZE * 2)
    expect(layout.grid[19]).toBe('mail')
    expect(layout.grid[20]).toBe('notes')
    expect(layout.grid.slice(21, 24)).toEqual([null, null, null])
    expect(layout.version).toBe(5)
  })

  it('preserves independently positioned shortcuts for the same app', () => {
    const grid: HomeLayout['grid'] = Array.from(
      { length: 20 },
      () => null,
    )
    grid[0] = 'phone'
    grid[5] = 'phone'

    const layout = parseHomeLayout(
      {
        dock: ['phone', null, null, null],
        grid,
        hidden: [],
        version: 2,
      },
      defaults,
      [...installed],
    )

    expect(layout.grid[0]).toBe('phone')
    expect(layout.grid[5]).toBe('phone')
    expect(layout.dock[0]).toBe('phone')
  })

  it('moves to an exact empty slot without compacting other apps', () => {
    const moved = moveHomeApp(defaults, 'grid', 2, 'grid', 12)

    expect(moved.grid[2]).toBeNull()
    expect(moved.grid[12]).toBe('mail')
    expect(moved.grid[0]).toBe('phone')
    expect(moved.grid[4]).toBe('notes')
  })

  it('provides bounded keyboard reorder targets without wrapping rows', () => {
    expect(homeKeyboardTarget(defaults, 'grid', 1, 'right')).toBe(2)
    expect(homeKeyboardTarget(defaults, 'grid', 3, 'right')).toBeNull()
    expect(homeKeyboardTarget(defaults, 'grid', 0, 'up')).toBeNull()
    expect(homeKeyboardTarget(defaults, 'grid', 0, 'down')).toBe(4)
    expect(homeKeyboardTarget(defaults, 'dock', 1, 'left')).toBe(0)
    expect(homeKeyboardTarget(defaults, 'dock', 1, 'down')).toBeNull()
  })

  it('swaps occupied grid slots without moving unrelated apps', () => {
    const reordered = moveHomeApp(defaults, 'grid', 2, 'grid', 0)
    expect(reordered.grid.slice(0, 5)).toEqual([
      'mail',
      'messages',
      'phone',
      'clock',
      'notes',
    ])
  })

  it('swaps an occupied dock slot with the exact grid source', () => {
    const docked = moveHomeApp(defaults, 'grid', 2, 'dock', 2)

    expect(docked.dock).toEqual(['phone', 'messages', 'mail', null])
    expect(docked.grid[2]).toBe('clock')
  })

  it('swaps with an app in a full dock without shifting the dock', () => {
    const layout: HomeLayout = {
      ...defaults,
      dock: ['phone', 'messages', 'clock', 'notes'],
    }
    const docked = moveHomeApp(layout, 'grid', 2, 'dock', 1)

    expect(docked.dock).toEqual(['phone', 'mail', 'clock', 'notes'])
    expect(docked.grid[2]).toBe('messages')
  })

  it('moves shortcuts between the dock and grid independently', () => {
    const movedToGrid = moveHomeApp(defaults, 'dock', 0, 'grid', 5)

    expect(movedToGrid.dock[0]).toBeNull()
    expect(movedToGrid.grid[0]).toBe('phone')
    expect(movedToGrid.grid[5]).toBe('phone')

    const movedToDock = moveHomeApp(movedToGrid, 'grid', 1, 'dock', 3)
    expect(movedToDock.grid[1]).toBeNull()
    expect(movedToDock.dock[1]).toBe('messages')
    expect(movedToDock.dock[3]).toBe('messages')
  })

  it('removes shortcuts without closing gaps and restores the first gap', () => {
    const layout: HomeLayout = moveHomeApp(defaults, 'grid', 0, 'grid', 10)
    const removed = removeHomeApp(layout, 'phone')
    expect(removed.grid[0]).toBeNull()
    expect(removed.grid[10]).toBeNull()
    expect(removed.dock[0]).toBeNull()
    expect(removed.hidden).toContain('phone')

    const restored = restoreHomeApp(removed, 'phone')
    expect(restored.grid[0]).toBe('phone')
    expect(restored.hidden).not.toContain('phone')
  })

  it('adds persistent empty pages up to the home screen limit', () => {
    let layout = defaults
    for (let page = 1; page < MAX_HOME_GRID_PAGES; page += 1) {
      layout = addHomePage(layout)
    }

    expect(layout.grid).toHaveLength(HOME_GRID_PAGE_SIZE * MAX_HOME_GRID_PAGES)
    expect(addHomePage(layout)).toBe(layout)
  })

  it('deletes a page and moves its apps into remaining empty slots', () => {
    let layout = addHomePage(defaults)
    layout = moveHomeApp(layout, 'grid', 0, 'grid', HOME_GRID_PAGE_SIZE)
    const deleted = deleteHomePage(layout, 2)

    expect(deleted.grid).toHaveLength(HOME_GRID_PAGE_SIZE)
    expect(deleted.grid).toContain('phone')
    expect(deleteHomePage(deleted, 1)).toBe(deleted)
  })

  it('creates, renames, and persists a folder without moving other slots', () => {
    const folderLayout = createHomeFolder(
      defaults,
      'grid',
      2,
      'grid',
      4,
      'folder-work-123456',
      'Work',
    )
    const folder = folderLayout.grid[4]

    expect(folderLayout.grid[2]).toBeNull()
    expect(isHomeFolder(folder) && folder.apps).toEqual(['notes', 'mail'])
    expect(folderLayout.grid[0]).toBe('phone')

    const renamed = renameHomeFolder(
      folderLayout,
      'folder-work-123456',
      '  Dienstprogramme  ',
    )
    expect(getHomeFolder(renamed, 'folder-work-123456')?.name).toBe(
      'Dienstprogramme',
    )

    const parsed = parseHomeLayout(renamed, defaults, [...installed])
    expect(parsed.version).toBe(5)
    expect(getHomeFolder(parsed, 'folder-work-123456')).toEqual({
      apps: ['notes', 'mail'],
      id: 'folder-work-123456',
      name: 'Dienstprogramme',
      type: 'folder',
    })
  })

  it('adds apps to a folder and swaps apps inside its 3x3 pages', () => {
    const folderLayout = createHomeFolder(
      defaults,
      'grid',
      2,
      'grid',
      4,
      'folder-tools-123456',
      'Tools',
    )
    const expanded = addHomeAppToFolder(
      folderLayout,
      'grid',
      3,
      'folder-tools-123456',
    )
    expect(expanded.grid[3]).toBeNull()
    expect(getHomeFolder(expanded, 'folder-tools-123456')?.apps).toEqual([
      'notes',
      'mail',
      'clock',
    ])

    const reordered = moveHomeFolderApp(
      expanded,
      'folder-tools-123456',
      2,
      0,
    )
    expect(getHomeFolder(reordered, 'folder-tools-123456')?.apps).toEqual([
      'clock',
      'mail',
      'notes',
    ])
  })

  it('extracts a folder app into an exact gap and dissolves one-app folders', () => {
    const folderLayout = createHomeFolder(
      defaults,
      'grid',
      2,
      'grid',
      4,
      'folder-social-123456',
      'Social',
    )
    const extracted = extractHomeFolderApp(
      folderLayout,
      'folder-social-123456',
      1,
      'grid',
      12,
    )

    expect(extracted.grid[12]).toBe('mail')
    expect(extracted.grid[4]).toBe('notes')
    expect(getHomeFolder(extracted, 'folder-social-123456')).toBeNull()
  })

  it('removes hidden apps from folders and dissolves the folder when needed', () => {
    const folderLayout = createHomeFolder(
      defaults,
      'grid',
      2,
      'grid',
      4,
      'folder-mixed-123456',
      'Mixed',
    )
    const removed = removeHomeApp(folderLayout, 'mail')

    expect(removed.grid[4]).toBe('notes')
    expect(removed.hidden).toContain('mail')
  })
})
