(function bootstrapSkyPhoneApp() {
  'use strict'

  const protocolVersion = 1
  const requestTimeoutMs = 8000
  const query = new URLSearchParams(window.location.search)
  const appId =
    query.get('skyPhoneAppId') ||
    document.documentElement.dataset.skyPhoneAppId ||
    document.currentScript?.dataset.appId ||
    ''
  const listeners = new Map()
  const pendingRequests = new Map()
  let context = null
  let nextRequestId = 1
  let readySent = false

  function emit(eventName, payload) {
    const eventListeners = listeners.get(eventName)
    if (eventListeners) {
      for (const listener of [...eventListeners]) listener(payload)
    }
    window.dispatchEvent(
      new CustomEvent(`sky-phone-app:${eventName}`, { detail: payload }),
    )
  }

  function send(message) {
    if (!appId) {
      console.error('[Sky Phone App] Missing skyPhoneAppId in the frame URL.')
      return false
    }

    window.parent.postMessage(
      {
        ...message,
        appId,
        protocolVersion,
      },
      '*',
    )
    return true
  }

  function ready() {
    if (readySent) return true
    readySent = send({ type: 'sky-phone-app:ready' })
    return readySent
  }

  function on(eventName, listener) {
    if (typeof eventName !== 'string' || typeof listener !== 'function') {
      throw new TypeError('SkyPhoneApp.on requires an event name and a function.')
    }

    const eventListeners = listeners.get(eventName) || new Set()
    eventListeners.add(listener)
    listeners.set(eventName, eventListeners)
    return function unsubscribe() {
      eventListeners.delete(listener)
      if (eventListeners.size === 0) listeners.delete(eventName)
    }
  }

  function request(method, payload) {
    if (typeof method !== 'string' || !method) {
      return Promise.reject(new TypeError('A bridge method is required.'))
    }

    const requestId = `${Date.now().toString(36)}-${nextRequestId++}`
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        pendingRequests.delete(requestId)
        reject(new Error(`Sky Phone request timed out: ${method}`))
      }, requestTimeoutMs)

      pendingRequests.set(requestId, { reject, resolve, timeout })
      if (
        !send({
          type: 'sky-phone-app:request',
          method,
          payload,
          requestId,
        })
      ) {
        window.clearTimeout(timeout)
        pendingRequests.delete(requestId)
        reject(new Error('Sky Phone bridge is unavailable.'))
      }
    })
  }

  function close() {
    return request('app.close')
  }

  function open(targetAppId, data) {
    if (typeof targetAppId !== 'string' || !targetAppId) {
      return Promise.reject(new TypeError('A target app ID is required.'))
    }

    return request('app.open', {
      appId: targetAppId,
      ...(data === undefined ? {} : { data }),
    })
  }

  function notify(notification) {
    if (!notification || typeof notification !== 'object') {
      return Promise.reject(new TypeError('A notification is required.'))
    }

    return request('notification.create', notification)
  }

  const storage = Object.freeze({
    get(key) {
      return request('device.storage.get', { key })
    },
    set(key, value, revision) {
      return request('device.storage.set', { key, revision, value })
    },
  })

  function applyContext(nextContext) {
    if (!nextContext || typeof nextContext !== 'object') return

    const root = document.documentElement
    if (
      nextContext.colorScheme === 'dark' ||
      nextContext.colorScheme === 'light'
    ) {
      root.dataset.theme = nextContext.colorScheme
      root.style.colorScheme = nextContext.colorScheme
    }
    if (typeof nextContext.language === 'string' && nextContext.language) {
      root.lang = nextContext.language
    }
    if (typeof nextContext.phoneScale === 'number') {
      root.style.setProperty('--sky-phone-scale', String(nextContext.phoneScale))
    }
    if (nextContext.safeArea && typeof nextContext.safeArea === 'object') {
      for (const edge of ['top', 'right', 'bottom', 'left']) {
        const value = nextContext.safeArea[edge]
        if (typeof value === 'number') {
          root.style.setProperty(`--sky-safe-area-${edge}`, `${value}px`)
        }
      }
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return
    const message = event.data
    if (
      !message ||
      typeof message !== 'object' ||
      message.appId !== appId ||
      message.protocolVersion !== protocolVersion
    ) {
      return
    }

    if (message.type === 'sky-phone-app:context') {
      context = message.context || null
      applyContext(context)
      emit('context', context)
    } else if (message.type === 'sky-phone-app:message') {
      emit('message', message.payload)
    } else if (message.type === 'sky-phone-app:open') {
      emit('open', message.data)
    } else if (message.type === 'sky-phone-app:response') {
      const pending = pendingRequests.get(message.requestId)
      if (!pending) return
      window.clearTimeout(pending.timeout)
      pendingRequests.delete(message.requestId)
      if (message.success) pending.resolve(message.data)
      else pending.reject(new Error(message.error || 'Sky Phone request failed.'))
    }
  })

  const api = Object.freeze({
    appId,
    close,
    getContext: () => context,
    notify,
    on,
    open,
    protocolVersion,
    ready,
    request,
    storage,
  })

  if (window.SkyPhoneApp) {
    console.error('[Sky Phone App] window.SkyPhoneApp is already defined.')
    return
  }
  Object.defineProperty(window, 'SkyPhoneApp', {
    configurable: false,
    enumerable: true,
    value: api,
    writable: false,
  })

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true })
  } else {
    ready()
  }
})()
