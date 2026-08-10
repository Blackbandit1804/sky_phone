export type SkyPhoneAppContext = {
  appId: string
  capabilities: string[]
  colorScheme: 'dark' | 'light'
  language: string
  locale: Record<string, unknown>
  phoneScale: number
  protocolVersion: 1
  safeArea: {
    bottom: number
    left: number
    right: number
    top: number
  }
}

export type SkyPhoneAppEvents = {
  context: SkyPhoneAppContext | null
  message: unknown
  open: unknown
}

export type SkyPhoneAppNotification = {
  sound?: 'chime' | 'signal' | 'soft'
  subtitle?: string
  text: string
  title: string
}

export type SkyPhoneAppStorageEntry<Value = unknown> = {
  exists: boolean
  revision: number
  value?: Value
}

export type SkyPhoneAppStorageWrite = {
  revision: number
}

export type SkyPhoneAppApi = {
  readonly appId: string
  readonly protocolVersion: 1
  close(): Promise<void>
  getContext(): SkyPhoneAppContext | null
  notify(
    notification: SkyPhoneAppNotification,
  ): Promise<{ notificationId: string | null }>
  on<EventName extends keyof SkyPhoneAppEvents>(
    eventName: EventName,
    listener: (payload: SkyPhoneAppEvents[EventName]) => void,
  ): () => void
  open(
    appId: string,
    data?: Record<string, unknown>,
  ): Promise<{ appId: string }>
  ready(): boolean
  request<Result = unknown>(method: string, payload?: unknown): Promise<Result>
  storage: {
    get<Value = unknown>(key: string): Promise<SkyPhoneAppStorageEntry<Value>>
    set(
      key: string,
      value: unknown,
      revision: number,
    ): Promise<SkyPhoneAppStorageWrite>
  }
}

declare global {
  interface Window {
    SkyPhoneApp: SkyPhoneAppApi
  }
}

export {}
