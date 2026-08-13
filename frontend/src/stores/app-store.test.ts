import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NON_REMOVABLE_PHONE_APP_IDS } from '@/config/apps'
import { useAppStoreStore } from '@/stores/app-store'
import {
  getHomeFolder,
  HOME_GRID_PAGE_SIZE,
  removeHomeApp,
} from '@/utils/homeLayout'

const mocks = vi.hoisted(() => ({
  phone: {
    device: { imei: 'phone-a' },
    isOpen: true,
    saveDeviceNamespace: vi.fn(),
  },
}))
vi.mock('@/stores/phone', () => ({
  usePhoneStore: () => mocks.phone,
}))

describe('app store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.phone.device.imei = 'phone-a'
    mocks.phone.isOpen = true
    mocks.phone.saveDeviceNamespace.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hydrates valid launch counts and persists launches with claimed apps', () => {
    const apps = useAppStoreStore()

    apps.hydrate({
      claimedApps: ['snake'],
      launchCounts: { mail: 3, invalid: 20, phone: -1 },
    })
    apps.recordLaunch('mail')

    expect(apps.launchCounts).toEqual({ mail: 4 })
    expect(mocks.phone.saveDeviceNamespace).toHaveBeenCalledWith('apps', {
      claimedApps: ['snake'],
      homeLayout: apps.homeLayout,
      launchCounts: { mail: 4 },
    })
  })

  it('keeps external app state while migrating version 4 layouts', () => {
    const apps = useAppStoreStore()
    const grid = Array.from({ length: 24 }, () => null as string | null)
    grid[20] = 'external-radio'

    apps.hydrate({
      claimedApps: ['external-radio'],
      homeLayout: { dock: [], grid, hidden: [], version: 4 },
      launchCounts: { 'external-radio': 3 },
    })

    expect(apps.claimedApps).toEqual(['external-radio'])
    expect(apps.homeLayout.version).toBe(5)
    expect(apps.homeLayout.grid).toContain('external-radio')
    const pageAppCount = apps.homeLayout.grid
      .slice(0, HOME_GRID_PAGE_SIZE)
      .filter((appId) => appId !== null).length
    expect(apps.homeLayout.grid.slice(0, pageAppCount)).not.toContain(null)
    expect(apps.launchCounts).toEqual({ 'external-radio': 3 })
    expect(mocks.phone.saveDeviceNamespace).toHaveBeenCalledTimes(1)
  })

  it('keeps external app state from current version 5 layouts', () => {
    const apps = useAppStoreStore()

    apps.hydrate({
      claimedApps: ['external-radio'],
      homeLayout: {
        dock: [],
        grid: ['external-radio'],
        hidden: [],
        version: 5,
      },
      launchCounts: { 'external-radio': 3 },
    })

    expect(apps.claimedApps).toEqual(['external-radio'])
    expect(apps.homeLayout.grid).toContain('external-radio')
    expect(apps.launchCounts).toEqual({ 'external-radio': 3 })
    expect(mocks.phone.saveDeviceNamespace).not.toHaveBeenCalled()
  })

  it('persists a page-aware version 3 to version 5 migration once', () => {
    const apps = useAppStoreStore()
    const grid = Array.from({ length: 40 }, () => null as string | null)
    grid[20] = 'external-page-two'

    apps.hydrate({
      claimedApps: ['external-page-two'],
      homeLayout: { dock: [], grid, hidden: [], version: 3 },
    })

    expect(apps.homeLayout.version).toBe(5)
    expect(apps.homeLayout.grid[20]).not.toBe('external-page-two')
    expect(apps.homeLayout.grid[24]).toBe('external-page-two')
    expect(mocks.phone.saveDeviceNamespace).toHaveBeenCalledTimes(1)
  })

  it('installs an app after showing a three second loading state', () => {
    vi.useFakeTimers()
    const apps = useAppStoreStore()

    apps.installApp('snake')

    expect(apps.installingApps.snake).toBe(true)
    expect(apps.claimedApps).toEqual([])

    vi.advanceTimersByTime(2999)
    expect(apps.claimedApps).toEqual([])

    vi.advanceTimersByTime(1)
    expect(apps.installingApps.snake).toBeUndefined()
    expect(apps.claimedApps).toEqual(['snake'])
    expect(mocks.phone.saveDeviceNamespace).toHaveBeenCalledWith('apps', {
      claimedApps: ['snake'],
      homeLayout: apps.homeLayout,
      launchCounts: {},
    })
  })

  it('ignores duplicate installation requests and invalid persisted ids', () => {
    vi.useFakeTimers()
    const apps = useAppStoreStore()

    apps.hydrate({ claimedApps: ['memory', 'not-an-app'] })
    apps.installApp('snake')
    apps.installApp('snake')
    vi.advanceTimersByTime(3000)

    expect(apps.claimedApps).toEqual(['memory', 'snake'])
    expect(mocks.phone.saveDeviceNamespace).toHaveBeenCalledTimes(1)
  })

  it('reinstalls core and claimed apps removed from the Home Screen', () => {
    vi.useFakeTimers()
    const apps = useAppStoreStore()

    apps.hydrate({ claimedApps: ['memory'] })
    apps.removeHomeApp('notes')
    apps.removeHomeApp('memory')
    mocks.phone.saveDeviceNamespace.mockClear()

    apps.installApp('notes')
    apps.installApp('memory')

    expect(apps.installingApps).toEqual({ notes: true, memory: true })
    expect(apps.homeLayout.hidden).toEqual(['notes', 'memory'])

    vi.advanceTimersByTime(3000)

    expect(apps.installingApps).toEqual({})
    expect(apps.homeLayout.hidden).toEqual([])
    expect(apps.homeLayout.grid).toContain('notes')
    expect(apps.homeLayout.grid).toContain('memory')
    expect(apps.claimedApps).toEqual(['memory'])
    expect(mocks.phone.saveDeviceNamespace).toHaveBeenCalledTimes(2)
  })

  it('prevents protected apps from being removed from the Home Screen', () => {
    const apps = useAppStoreStore()
    apps.hydrate(null)
    mocks.phone.saveDeviceNamespace.mockClear()

    expect([...NON_REMOVABLE_PHONE_APP_IDS]).toEqual([
      'app-store',
      'settings',
      'camera',
      'photos',
      'phone',
      'messages',
      'mail',
    ])
    for (const appId of NON_REMOVABLE_PHONE_APP_IDS) {
      apps.removeHomeApp(appId)
      expect(apps.homeLayout.hidden).not.toContain(appId)
    }

    expect(mocks.phone.saveDeviceNamespace).not.toHaveBeenCalled()
  })

  it('restores protected apps hidden by older persisted layouts', () => {
    const apps = useAppStoreStore()
    const legacyLayout = removeHomeApp(apps.homeLayout, 'mail')

    apps.hydrate({ homeLayout: legacyLayout })

    expect(apps.homeLayout.hidden).not.toContain('mail')
    expect(apps.homeLayout.grid).toContain('mail')
    expect(mocks.phone.saveDeviceNamespace).toHaveBeenCalledWith('apps', {
      claimedApps: [],
      homeLayout: apps.homeLayout,
      launchCounts: {},
    })
  })

  it('persists home reordering and removal independently from installation', () => {
    const apps = useAppStoreStore()
    apps.hydrate(null)

    const notesIndex = apps.homeLayout.grid.indexOf('notes')
    apps.moveHomeApp('grid', notesIndex, 'grid', 0)
    expect(apps.homeLayout.grid[0]).toBe('notes')

    apps.removeHomeApp('notes')
    expect(apps.homeLayout.grid).not.toContain('notes')
    expect(apps.homeLayout.hidden).toContain('notes')
    expect(mocks.phone.saveDeviceNamespace).toHaveBeenLastCalledWith('apps', {
      claimedApps: [],
      homeLayout: apps.homeLayout,
      launchCounts: {},
    })
  })

  it('persists a cross-page drop exactly once', () => {
    const apps = useAppStoreStore()
    apps.hydrate(null)
    mocks.phone.saveDeviceNamespace.mockClear()
    const sourceIndex = apps.homeLayout.grid.indexOf('phone')
    expect(sourceIndex).toBeGreaterThanOrEqual(0)

    expect(
      apps.moveHomeAppToGridPage('grid', sourceIndex, 2, 0, [
        HOME_GRID_PAGE_SIZE,
        HOME_GRID_PAGE_SIZE,
      ]),
    ).toBe(true)
    expect(apps.homeLayout.grid[HOME_GRID_PAGE_SIZE]).toBe('phone')
    expect(mocks.phone.saveDeviceNamespace).toHaveBeenCalledTimes(1)
  })

  it('persists the complete folder lifecycle through store actions', () => {
    const apps = useAppStoreStore()
    apps.hydrate(null)
    mocks.phone.saveDeviceNamespace.mockClear()

    const notesIndex = apps.homeLayout.grid.indexOf('notes')
    const clockIndex = apps.homeLayout.grid.indexOf('clock')
    const folderId = apps.createHomeFolder(
      'grid',
      notesIndex,
      'grid',
      clockIndex,
      'Utilities',
    )

    expect(folderId).toBeTruthy()
    expect(getHomeFolder(apps.homeLayout, folderId!)?.apps).toEqual([
      'clock',
      'notes',
    ])
    const mailIndex = apps.homeLayout.grid.indexOf('mail')
    expect(apps.addHomeAppToFolder('grid', mailIndex, folderId!)).toBe(true)
    apps.moveHomeFolderApp(folderId!, 2, 0)
    apps.renameHomeFolder(folderId!, 'Work')
    expect(getHomeFolder(apps.homeLayout, folderId!)).toMatchObject({
      apps: ['mail', 'notes', 'clock'],
      name: 'Work',
    })

    const emptyIndex = apps.homeLayout.grid.indexOf(null)
    expect(apps.extractHomeFolderApp(folderId!, 0, 'grid', emptyIndex)).toBe(
      true,
    )
    expect(apps.homeLayout.grid).toContain('mail')
    expect(mocks.phone.saveDeviceNamespace).toHaveBeenCalledTimes(5)
  })

  it('does not commit an installation to a different phone', () => {
    vi.useFakeTimers()
    const apps = useAppStoreStore()

    apps.installApp('snake')
    mocks.phone.device.imei = 'phone-b'
    vi.advanceTimersByTime(3000)

    expect(apps.installingApps).toEqual({})
    expect(apps.claimedApps).toEqual([])
    expect(mocks.phone.saveDeviceNamespace).not.toHaveBeenCalled()
  })

  it('cancels installation timers when hydration changes device scope', () => {
    vi.useFakeTimers()
    const apps = useAppStoreStore()

    apps.installApp('snake')
    expect(vi.getTimerCount()).toBe(1)

    mocks.phone.device.imei = 'phone-b'
    apps.hydrate(null)
    expect(vi.getTimerCount()).toBe(0)

    vi.advanceTimersByTime(3000)
    expect(apps.claimedApps).toEqual([])
    expect(mocks.phone.saveDeviceNamespace).not.toHaveBeenCalled()
  })

  it('cancels installation timers when the phone closes', () => {
    vi.useFakeTimers()
    const apps = useAppStoreStore()

    apps.installApp('snake')
    mocks.phone.isOpen = false
    apps.cancelPendingInstalls()

    expect(vi.getTimerCount()).toBe(0)
    expect(apps.installingApps).toEqual({})
    vi.advanceTimersByTime(3000)
    expect(apps.claimedApps).toEqual([])
    expect(mocks.phone.saveDeviceNamespace).not.toHaveBeenCalled()
  })
})
