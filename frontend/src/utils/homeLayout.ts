import type { LaunchablePhoneAppId } from '@/types/apps'
import type { ReorderDirection } from '@/utils/keyboard'

export const HOME_DOCK_CAPACITY = 4
export const HOME_GRID_COLUMNS = 4
export const HOME_GRID_PAGE_SIZE = 24
export const HOME_FOLDER_PAGE_SIZE = 9
export const HOME_FOLDER_NAME_MAX_LENGTH = 32
export const MAX_HOME_GRID_PAGES = 5
const LEGACY_HOME_GRID_PAGE_SIZE = 20

export type HomeArea = 'dock' | 'grid'

export type HomeFolder = {
  apps: LaunchablePhoneAppId[]
  id: string
  name: string
  type: 'folder'
}

export type HomeItem = HomeFolder | LaunchablePhoneAppId
export type HomeSlot = HomeItem | null

export type HomeLayout = {
  dock: HomeSlot[]
  grid: HomeSlot[]
  hidden: LaunchablePhoneAppId[]
  version: 5
}

export function isHomeFolder(value: unknown): value is HomeFolder {
  if (!value || typeof value !== 'object') return false
  const folder = value as Partial<HomeFolder>
  return (
    folder.type === 'folder' &&
    typeof folder.id === 'string' &&
    typeof folder.name === 'string' &&
    Array.isArray(folder.apps)
  )
}

function isPersistableAppId(value: unknown): value is LaunchablePhoneAppId {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{1,63}$/.test(value)
}

function isPersistableFolderId(value: unknown): value is string {
  return typeof value === 'string' && /^folder-[a-z0-9-]{6,80}$/.test(value)
}

function readAppIds(
  value: unknown,
  availableIds: Set<LaunchablePhoneAppId>,
): LaunchablePhoneAppId[] {
  if (!Array.isArray(value)) return []

  const ids: LaunchablePhoneAppId[] = []
  for (const valueId of value) {
    if (
      typeof valueId === 'string' &&
      availableIds.has(valueId as LaunchablePhoneAppId) &&
      !ids.includes(valueId as LaunchablePhoneAppId)
    ) {
      ids.push(valueId as LaunchablePhoneAppId)
    }
  }
  return ids
}

function createSlots(length: number): HomeSlot[] {
  return Array.from({ length }, () => null)
}

function getGridCapacity(itemCount: number): number {
  return Math.max(
    HOME_GRID_PAGE_SIZE,
    Math.ceil(itemCount / HOME_GRID_PAGE_SIZE) * HOME_GRID_PAGE_SIZE,
  )
}

function migrateLegacyGrid(value: unknown): unknown[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, LEGACY_HOME_GRID_PAGE_SIZE * MAX_HOME_GRID_PAGES)
}

function cloneItem(item: HomeSlot): HomeSlot {
  return isHomeFolder(item) ? { ...item, apps: [...item.apps] } : item
}

function cloneLayout(layout: HomeLayout): HomeLayout {
  return {
    dock: layout.dock.map(cloneItem),
    grid: layout.grid.map(cloneItem),
    hidden: [...layout.hidden],
    version: 5,
  }
}

function normalizeFolder(folder: HomeFolder): HomeSlot {
  if (folder.apps.length === 0) return null
  if (folder.apps.length === 1) return folder.apps[0]
  return folder
}

function readItem(
  value: unknown,
  availableIds: Set<LaunchablePhoneAppId>,
  folderIds: Set<string>,
): HomeSlot {
  if (
    typeof value === 'string' &&
    availableIds.has(value as LaunchablePhoneAppId)
  ) {
    return value as LaunchablePhoneAppId
  }
  if (!isHomeFolder(value) || !isPersistableFolderId(value.id)) return null
  if (folderIds.has(value.id)) return null

  const apps = readAppIds(value.apps, availableIds)
  if (apps.length === 0) return null
  if (apps.length === 1) return apps[0]
  folderIds.add(value.id)
  return {
    apps,
    id: value.id,
    name: value.name.trim().slice(0, HOME_FOLDER_NAME_MAX_LENGTH),
    type: 'folder',
  }
}

function readSlots(
  value: unknown,
  availableIds: Set<LaunchablePhoneAppId>,
  length: number,
  folderIds: Set<string>,
): HomeSlot[] {
  const slots = createSlots(length)
  if (!Array.isArray(value)) return slots

  for (let index = 0; index < Math.min(value.length, length); index += 1) {
    slots[index] = readItem(value[index], availableIds, folderIds)
  }
  return slots
}

function placeInFirstEmptySlot(slots: HomeSlot[], item: HomeItem): void {
  const emptyIndex = slots.indexOf(null)
  if (emptyIndex !== -1) {
    slots[emptyIndex] = cloneItem(item)
    return
  }

  slots.push(...createSlots(HOME_GRID_PAGE_SIZE))
  slots[slots.length - HOME_GRID_PAGE_SIZE] = cloneItem(item)
}

function itemContainsApp(item: HomeSlot, appId: LaunchablePhoneAppId): boolean {
  return isHomeFolder(item) ? item.apps.includes(appId) : item === appId
}

function folderLocation(
  layout: HomeLayout,
  folderId: string,
): { area: HomeArea; index: number } | null {
  for (const area of ['grid', 'dock'] as const) {
    const index = layout[area].findIndex(
      (item) => isHomeFolder(item) && item.id === folderId,
    )
    if (index !== -1) return { area, index }
  }
  return null
}

export function getHomeFolder(
  layout: HomeLayout,
  folderId: string,
): HomeFolder | null {
  const location = folderLocation(layout, folderId)
  if (!location) return null
  const item = layout[location.area][location.index]
  return isHomeFolder(item) ? item : null
}

export function createDefaultHomeLayout(
  installedIds: LaunchablePhoneAppId[],
  defaultGridIds: LaunchablePhoneAppId[],
  defaultDockIds: LaunchablePhoneAppId[],
): HomeLayout {
  const installed = new Set(installedIds)
  const gridIds = defaultGridIds.filter((id) => installed.has(id))
  const grid = createSlots(getGridCapacity(gridIds.length))
  for (let index = 0; index < gridIds.length; index += 1) {
    grid[index] = gridIds[index]
  }

  const dock = createSlots(HOME_DOCK_CAPACITY)
  for (const [index, id] of defaultDockIds
    .filter((id) => installed.has(id))
    .slice(0, HOME_DOCK_CAPACITY)
    .entries()) {
    dock[index] = id
  }

  return { dock, grid, hidden: [], version: 5 }
}

export function parseHomeLayout(
  value: unknown,
  defaults: HomeLayout,
  installedIds: LaunchablePhoneAppId[],
): HomeLayout {
  if (!value || typeof value !== 'object') return defaults

  const source = value as Partial<Record<keyof HomeLayout, unknown>>
  const availableIds = new Set(installedIds)
  if (source.version === 3 || source.version === 4 || source.version === 5) {
    for (const collection of [source.dock, source.grid, source.hidden]) {
      if (!Array.isArray(collection)) continue
      for (const item of collection) {
        if (isPersistableAppId(item)) availableIds.add(item)
        if (source.version === 5 && isHomeFolder(item)) {
          for (const appId of item.apps) {
            if (isPersistableAppId(appId)) availableIds.add(appId)
          }
        }
      }
    }
  }
  const hidden = readAppIds(source.hidden, availableIds)
  const hiddenIds = new Set(hidden)
  const persistedGrid =
    source.version === 2 || source.version === 3
      ? migrateLegacyGrid(source.grid)
      : source.grid
  const persistedGridLength = Array.isArray(persistedGrid)
    ? Math.min(persistedGrid.length, HOME_GRID_PAGE_SIZE * MAX_HOME_GRID_PAGES)
    : 0
  const gridLength = Math.max(
    defaults.grid.length,
    getGridCapacity(persistedGridLength),
  )
  let grid: HomeSlot[]
  let dock: HomeSlot[]

  if (
    source.version === 2 ||
    source.version === 3 ||
    source.version === 4 ||
    source.version === 5
  ) {
    const folderIds = new Set<string>()
    grid = readSlots(persistedGrid, availableIds, gridLength, folderIds)
    dock = readSlots(source.dock, availableIds, HOME_DOCK_CAPACITY, folderIds)
  } else {
    grid = createSlots(gridLength)
    for (const id of readAppIds(source.grid, availableIds)) {
      placeInFirstEmptySlot(grid, id)
    }
    dock = createSlots(HOME_DOCK_CAPACITY)
    for (const [index, id] of readAppIds(source.dock, availableIds)
      .slice(0, HOME_DOCK_CAPACITY)
      .entries()) {
      dock[index] = id
    }
  }

  const removeHidden = (item: HomeSlot): HomeSlot => {
    if (typeof item === 'string') return hiddenIds.has(item) ? null : item
    if (!isHomeFolder(item)) return null
    return normalizeFolder({
      ...item,
      apps: item.apps.filter((appId) => !hiddenIds.has(appId)),
    })
  }
  grid = grid.map(removeHidden)
  dock = dock.map(removeHidden)
  const placedIds = new Set<LaunchablePhoneAppId>(hidden)
  for (const item of [...grid, ...dock]) {
    if (typeof item === 'string') placedIds.add(item)
    if (isHomeFolder(item)) {
      for (const appId of item.apps) placedIds.add(appId)
    }
  }

  for (const item of defaults.grid) {
    if (typeof item === 'string' && !placedIds.has(item)) {
      placeInFirstEmptySlot(grid, item)
      placedIds.add(item)
    }
  }

  return { dock, grid, hidden, version: 5 }
}

export function removeHomeApp(
  layout: HomeLayout,
  appId: LaunchablePhoneAppId,
): HomeLayout {
  const removeFromItem = (item: HomeSlot): HomeSlot => {
    if (item === appId) return null
    if (!isHomeFolder(item)) return item
    return normalizeFolder({
      ...item,
      apps: item.apps.filter((folderAppId) => folderAppId !== appId),
    })
  }
  return {
    dock: layout.dock.map(removeFromItem),
    grid: layout.grid.map(removeFromItem),
    hidden: layout.hidden.includes(appId)
      ? [...layout.hidden]
      : [...layout.hidden, appId],
    version: 5,
  }
}

export function restoreHomeApp(
  layout: HomeLayout,
  appId: LaunchablePhoneAppId,
): HomeLayout {
  if (
    layout.grid.some((item) => itemContainsApp(item, appId)) ||
    layout.dock.some((item) => itemContainsApp(item, appId))
  ) {
    return layout
  }
  const grid = layout.grid.map(cloneItem)
  placeInFirstEmptySlot(grid, appId)
  return {
    dock: layout.dock.map(cloneItem),
    grid,
    hidden: layout.hidden.filter((id) => id !== appId),
    version: 5,
  }
}

export function addHomePage(layout: HomeLayout): HomeLayout {
  if (layout.grid.length >= HOME_GRID_PAGE_SIZE * MAX_HOME_GRID_PAGES) {
    return layout
  }

  return {
    dock: layout.dock.map(cloneItem),
    grid: [...layout.grid.map(cloneItem), ...createSlots(HOME_GRID_PAGE_SIZE)],
    hidden: [...layout.hidden],
    version: 5,
  }
}

export function deleteHomePage(layout: HomeLayout, page: number): HomeLayout {
  const pageCount = Math.ceil(layout.grid.length / HOME_GRID_PAGE_SIZE)
  if (pageCount <= 1 || page < 1 || page > pageCount) return layout

  const pageStart = (page - 1) * HOME_GRID_PAGE_SIZE
  const grid = layout.grid.map(cloneItem)
  const removedItems = grid
    .splice(pageStart, HOME_GRID_PAGE_SIZE)
    .filter((item): item is HomeItem => item !== null)
  if (removedItems.length > grid.filter((item) => item === null).length) {
    return layout
  }
  for (const item of removedItems) placeInFirstEmptySlot(grid, item)

  return {
    dock: layout.dock.map(cloneItem),
    grid,
    hidden: [...layout.hidden],
    version: 5,
  }
}

export function moveHomeApp(
  layout: HomeLayout,
  from: HomeArea,
  sourceIndex: number,
  to: HomeArea,
  targetIndex: number,
): HomeLayout {
  const next = cloneLayout(layout)
  const source = next[from]
  const target = next[to]
  const item = source[sourceIndex]
  if (
    !item ||
    sourceIndex < 0 ||
    sourceIndex >= source.length ||
    targetIndex < 0 ||
    targetIndex >= target.length
  ) {
    return layout
  }

  if (from === to && sourceIndex === targetIndex) return layout
  source[sourceIndex] = cloneItem(target[targetIndex])
  target[targetIndex] = item
  return next
}

export function createHomeFolder(
  layout: HomeLayout,
  from: HomeArea,
  sourceIndex: number,
  to: HomeArea,
  targetIndex: number,
  folderId: string,
  name: string,
): HomeLayout {
  if (!isPersistableFolderId(folderId)) return layout
  if (folderLocation(layout, folderId)) return layout
  const sourceItem = layout[from][sourceIndex]
  const targetItem = layout[to][targetIndex]
  if (
    typeof sourceItem !== 'string' ||
    typeof targetItem !== 'string' ||
    (from === to && sourceIndex === targetIndex)
  ) {
    return layout
  }

  const next = cloneLayout(layout)
  next[from][sourceIndex] = null
  next[to][targetIndex] = {
    apps: [targetItem, sourceItem],
    id: folderId,
    name: name.trim().slice(0, HOME_FOLDER_NAME_MAX_LENGTH),
    type: 'folder',
  }
  return next
}

export function addHomeAppToFolder(
  layout: HomeLayout,
  from: HomeArea,
  sourceIndex: number,
  folderId: string,
): HomeLayout {
  const sourceItem = layout[from][sourceIndex]
  const location = folderLocation(layout, folderId)
  if (typeof sourceItem !== 'string' || !location) return layout
  if (location.area === from && location.index === sourceIndex) return layout

  const next = cloneLayout(layout)
  const folder = next[location.area][location.index]
  if (!isHomeFolder(folder)) return layout
  next[from][sourceIndex] = null
  folder.apps.push(sourceItem)
  return next
}

export function renameHomeFolder(
  layout: HomeLayout,
  folderId: string,
  name: string,
): HomeLayout {
  const location = folderLocation(layout, folderId)
  if (!location) return layout
  const next = cloneLayout(layout)
  const folder = next[location.area][location.index]
  if (!isHomeFolder(folder)) return layout
  const nextName = name.trim().slice(0, HOME_FOLDER_NAME_MAX_LENGTH)
  if (folder.name === nextName) return layout
  folder.name = nextName
  return next
}

export function moveHomeFolderApp(
  layout: HomeLayout,
  folderId: string,
  sourceIndex: number,
  targetIndex: number,
): HomeLayout {
  const location = folderLocation(layout, folderId)
  if (!location) return layout
  const folder = layout[location.area][location.index]
  if (
    !isHomeFolder(folder) ||
    sourceIndex < 0 ||
    sourceIndex >= folder.apps.length ||
    targetIndex < 0 ||
    targetIndex >= folder.apps.length ||
    sourceIndex === targetIndex
  ) {
    return layout
  }

  const next = cloneLayout(layout)
  const nextFolder = next[location.area][location.index]
  if (!isHomeFolder(nextFolder)) return layout
  const sourceApp = nextFolder.apps[sourceIndex]
  nextFolder.apps[sourceIndex] = nextFolder.apps[targetIndex]
  nextFolder.apps[targetIndex] = sourceApp
  return next
}

export function extractHomeFolderApp(
  layout: HomeLayout,
  folderId: string,
  sourceIndex: number,
  to: HomeArea,
  targetIndex: number,
): HomeLayout {
  const location = folderLocation(layout, folderId)
  const target = layout[to][targetIndex]
  if (
    !location ||
    target !== null ||
    (location.area === to && location.index === targetIndex)
  ) {
    return layout
  }
  const folder = layout[location.area][location.index]
  if (
    !isHomeFolder(folder) ||
    sourceIndex < 0 ||
    sourceIndex >= folder.apps.length
  ) {
    return layout
  }

  const next = cloneLayout(layout)
  const nextFolder = next[location.area][location.index]
  if (!isHomeFolder(nextFolder)) return layout
  const [appId] = nextFolder.apps.splice(sourceIndex, 1)
  next[to][targetIndex] = appId
  next[location.area][location.index] = normalizeFolder(nextFolder)
  return next
}

export function homeKeyboardTarget(
  layout: HomeLayout,
  area: HomeArea,
  sourceIndex: number,
  direction: ReorderDirection,
): number | null {
  const source = layout[area]
  if (!source[sourceIndex]) return null

  if (area === 'dock') {
    if (direction !== 'left' && direction !== 'right') return null
    const targetIndex = sourceIndex + (direction === 'left' ? -1 : 1)
    return targetIndex >= 0 && targetIndex < source.length ? targetIndex : null
  }

  const column = sourceIndex % HOME_GRID_COLUMNS
  if (direction === 'left' && column === 0) return null
  if (direction === 'right' && column === HOME_GRID_COLUMNS - 1) return null
  const deltas: Record<ReorderDirection, number> = {
    down: HOME_GRID_COLUMNS,
    left: -1,
    right: 1,
    up: -HOME_GRID_COLUMNS,
  }
  const targetIndex = sourceIndex + deltas[direction]
  return targetIndex >= 0 && targetIndex < source.length ? targetIndex : null
}
