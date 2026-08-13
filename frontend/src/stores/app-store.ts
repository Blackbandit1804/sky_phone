import { defineStore } from 'pinia'

import {
  getPhoneApp,
  isExternalPhoneApp,
  isPhoneAppId,
  isPhoneAppRemovable,
  isValidExternalPhoneAppId,
  NON_REMOVABLE_PHONE_APP_IDS,
  PHONE_APPS,
} from '@/config/apps'
import { usePhoneStore } from '@/stores/phone'
import type { LaunchablePhoneAppId } from '@/types/apps'
import {
  addHomeAppToFolder,
  addHomePage,
  createHomeFolder,
  createDefaultHomeLayout,
  deleteHomePage,
  extractHomeFolderApp,
  moveHomeFolderApp,
  moveHomeApp,
  parseHomeLayout,
  renameHomeFolder,
  removeHomeApp,
  restoreHomeApp,
  type HomeArea,
} from '@/utils/homeLayout'
import { nuiCall } from '@/utils/nui'

const INSTALL_DURATION_MS = 3000

type PendingInstallation = {
  deviceImei: string
  timer: ReturnType<typeof globalThis.setTimeout>
  token: symbol
}

const pendingInstallations = new WeakMap<
  object,
  Map<LaunchablePhoneAppId, PendingInstallation>
>()

function getDefaultGridIds(): LaunchablePhoneAppId[] {
  return [...PHONE_APPS]
    .sort((a, b) => a.gridOrder - b.gridOrder)
    .map((app) => app.id)
}

function getDefaultDockIds(): LaunchablePhoneAppId[] {
  return PHONE_APPS.filter((app) => app.dockOrder !== null)
    .sort((a, b) => (a.dockOrder ?? 0) - (b.dockOrder ?? 0))
    .map((app) => app.id)
}

function getDefaultInstalledIds(): LaunchablePhoneAppId[] {
  return PHONE_APPS.filter((app) =>
    isExternalPhoneApp(app) ? app.defaultInstalled : app.category !== 'games',
  ).map((app) => app.id)
}

function isProtectedHomeApp(appId: LaunchablePhoneAppId): boolean {
  const app = getPhoneApp(appId)
  return app
    ? !isPhoneAppRemovable(app)
    : NON_REMOVABLE_PHONE_APP_IDS.has(appId)
}

export const useAppStoreStore = defineStore('app-store', {
  state: () => ({
    claimedApps: [] as LaunchablePhoneAppId[],
    homeLayout: createDefaultHomeLayout(
      getDefaultInstalledIds(),
      getDefaultGridIds(),
      getDefaultDockIds(),
    ),
    hydrated: false,
    installingApps: {} as Partial<Record<LaunchablePhoneAppId, boolean>>,
    launchCounts: {} as Partial<Record<LaunchablePhoneAppId, number>>,
  }),
  actions: {
    addHomePage(): boolean {
      const next = addHomePage(this.homeLayout)
      if (next === this.homeLayout) return false
      this.homeLayout = next
      this.persist()
      return true
    },
    deleteHomePage(page: number): boolean {
      const next = deleteHomePage(this.homeLayout, page)
      if (next === this.homeLayout) return false
      this.homeLayout = next
      this.persist()
      return true
    },
    claimApp(id: LaunchablePhoneAppId): void {
      if (!this.claimedApps.includes(id)) {
        this.claimedApps.push(id)
        this.homeLayout = restoreHomeApp(this.homeLayout, id)
        this.persist()
      }
    },
    cancelPendingInstalls(): void {
      const installations = pendingInstallations.get(this)
      if (installations) {
        for (const installation of installations.values()) {
          globalThis.clearTimeout(installation.timer)
        }
        pendingInstallations.delete(this)
      }
      this.installingApps = {}
    },
    installApp(id: LaunchablePhoneAppId): void {
      const installed = this.isInstalled(id)
      if (
        this.installingApps[id] ||
        (installed && !this.homeLayout.hidden.includes(id))
      ) {
        return
      }

      const phone = usePhoneStore()
      const deviceImei = phone.device?.imei
      if (!phone.isOpen || !deviceImei) {
        console.error(
          `[App store] Installation cancelled because no phone device is open for ${id}.`,
        )
        return
      }

      const app = getPhoneApp(id)
      const reportInstall = !installed && isExternalPhoneApp(app)
      const token = Symbol(id)
      const installations =
        pendingInstallations.get(this) ??
        new Map<LaunchablePhoneAppId, PendingInstallation>()
      this.installingApps[id] = true
      const timer = globalThis.setTimeout(() => {
        const pending = installations.get(id)
        if (!pending || pending.token !== token) return
        installations.delete(id)
        if (!installations.size) pendingInstallations.delete(this)

        const activePhone = usePhoneStore()
        if (
          !activePhone.isOpen ||
          activePhone.device?.imei !== pending.deviceImei
        ) {
          delete this.installingApps[id]
          console.error(
            `[App store] Installation cancelled because the active phone changed for ${id}.`,
          )
          return
        }
        if (reportInstall && !isExternalPhoneApp(getPhoneApp(id))) {
          delete this.installingApps[id]
          console.error(
            `[Custom apps] Installation cancelled because ${id} is no longer registered.`,
          )
          return
        }
        if (this.isInstalled(id)) {
          this.restoreHomeApp(id)
        } else {
          this.claimApp(id)
        }
        delete this.installingApps[id]
        if (reportInstall) {
          void nuiCall('custom-app:lifecycle', {
            appId: id,
            event: 'install',
          }).then((response) => {
            if (!response.success) {
              console.error(
                `[Custom apps] Install lifecycle failed for ${id}: ${response.error ?? 'request_failed'}`,
              )
            }
          })
        }
      }, INSTALL_DURATION_MS)
      installations.set(id, { deviceImei, timer, token })
      pendingInstallations.set(this, installations)
    },
    hydrate(payload: unknown): void {
      this.cancelPendingInstalls()
      const data = payload as {
        claimedApps?: unknown
        homeLayout?: unknown
        launchCounts?: unknown
      } | null
      const layoutVersion =
        data?.homeLayout && typeof data.homeLayout === 'object'
          ? (data.homeLayout as { version?: unknown }).version
          : undefined
      this.claimedApps = Array.isArray(data?.claimedApps)
        ? data.claimedApps.filter(
            (id): id is LaunchablePhoneAppId =>
              typeof id === 'string' &&
              (isPhoneAppId(id) ||
                ((layoutVersion === 3 ||
                  layoutVersion === 4 ||
                  layoutVersion === 5) &&
                  isValidExternalPhoneAppId(id))),
          )
        : []
      const installedIds = [
        ...new Set([...getDefaultInstalledIds(), ...this.claimedApps]),
      ]
      const defaults = createDefaultHomeLayout(
        installedIds,
        getDefaultGridIds(),
        getDefaultDockIds(),
      )
      this.homeLayout = parseHomeLayout(
        data?.homeLayout,
        defaults,
        installedIds,
      )
      const protectedHiddenAppIds =
        this.homeLayout.hidden.filter(isProtectedHomeApp)
      for (const appId of protectedHiddenAppIds) {
        this.homeLayout = restoreHomeApp(this.homeLayout, appId)
      }
      this.launchCounts = {}
      if (data?.launchCounts && typeof data.launchCounts === 'object') {
        for (const [appId, count] of Object.entries(data.launchCounts)) {
          if (
            (isPhoneAppId(appId) ||
              ((layoutVersion === 3 ||
                layoutVersion === 4 ||
                layoutVersion === 5) &&
                isValidExternalPhoneAppId(appId))) &&
            typeof count === 'number' &&
            Number.isFinite(count) &&
            count > 0
          ) {
            this.launchCounts[appId] = Math.floor(count)
          }
        }
      }
      this.hydrated = true
      if (protectedHiddenAppIds.length) this.persist()
    },
    isInstalled(appId: LaunchablePhoneAppId): boolean {
      if (this.claimedApps.includes(appId)) return true
      const app = getPhoneApp(appId)
      if (!app) return false
      return isExternalPhoneApp(app)
        ? app.defaultInstalled
        : app.category !== 'games'
    },
    reconcileCatalog(): void {
      const installedIds = [
        ...new Set([...getDefaultInstalledIds(), ...this.claimedApps]),
      ]
      const defaults = createDefaultHomeLayout(
        installedIds,
        getDefaultGridIds(),
        getDefaultDockIds(),
      )
      const previous = JSON.stringify(this.homeLayout)
      this.homeLayout = parseHomeLayout(this.homeLayout, defaults, installedIds)

      for (const appId of [...this.homeLayout.hidden]) {
        if (isProtectedHomeApp(appId)) {
          this.homeLayout = restoreHomeApp(this.homeLayout, appId)
        }
      }

      if (this.hydrated && previous !== JSON.stringify(this.homeLayout)) {
        this.persist()
      }
    },
    recordLaunch(appId: LaunchablePhoneAppId): void {
      this.launchCounts[appId] = (this.launchCounts[appId] ?? 0) + 1
      this.persist()
    },
    moveHomeApp(
      from: HomeArea,
      sourceIndex: number,
      to: HomeArea,
      targetIndex: number,
    ): void {
      this.homeLayout = moveHomeApp(
        this.homeLayout,
        from,
        sourceIndex,
        to,
        targetIndex,
      )
      this.persist()
    },
    createHomeFolder(
      from: HomeArea,
      sourceIndex: number,
      to: HomeArea,
      targetIndex: number,
      name: string,
    ): string | null {
      const folderId = `folder-${globalThis.crypto.randomUUID()}`
      const next = createHomeFolder(
        this.homeLayout,
        from,
        sourceIndex,
        to,
        targetIndex,
        folderId,
        name,
      )
      if (next === this.homeLayout) return null
      this.homeLayout = next
      this.persist()
      return folderId
    },
    addHomeAppToFolder(
      from: HomeArea,
      sourceIndex: number,
      folderId: string,
    ): boolean {
      const next = addHomeAppToFolder(
        this.homeLayout,
        from,
        sourceIndex,
        folderId,
      )
      if (next === this.homeLayout) return false
      this.homeLayout = next
      this.persist()
      return true
    },
    renameHomeFolder(folderId: string, name: string): void {
      const next = renameHomeFolder(this.homeLayout, folderId, name)
      if (next === this.homeLayout) return
      this.homeLayout = next
      this.persist()
    },
    moveHomeFolderApp(
      folderId: string,
      sourceIndex: number,
      targetIndex: number,
    ): void {
      const next = moveHomeFolderApp(
        this.homeLayout,
        folderId,
        sourceIndex,
        targetIndex,
      )
      if (next === this.homeLayout) return
      this.homeLayout = next
      this.persist()
    },
    extractHomeFolderApp(
      folderId: string,
      sourceIndex: number,
      to: HomeArea,
      targetIndex: number,
    ): boolean {
      const next = extractHomeFolderApp(
        this.homeLayout,
        folderId,
        sourceIndex,
        to,
        targetIndex,
      )
      if (next === this.homeLayout) return false
      this.homeLayout = next
      this.persist()
      return true
    },
    removeHomeApp(appId: LaunchablePhoneAppId): void {
      if (isProtectedHomeApp(appId)) return

      this.homeLayout = removeHomeApp(this.homeLayout, appId)
      this.persist()
    },
    restoreHomeApp(appId: LaunchablePhoneAppId): void {
      this.homeLayout = restoreHomeApp(this.homeLayout, appId)
      this.persist()
    },
    persist(): void {
      usePhoneStore().saveDeviceNamespace('apps', {
        claimedApps: this.claimedApps,
        homeLayout: this.homeLayout,
        launchCounts: this.launchCounts,
      })
    },
  },
})
