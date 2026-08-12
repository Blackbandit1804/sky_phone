import type { Router } from 'vue-router'

import { getPhoneApp } from '@/config/apps'
import type { EasySharePayload } from '@/types/easyshare'

const schemeRoutes: Record<string, string> = {
  location: '/apps/map',
  media: '/apps/photos',
  phone: '/apps/phone',
}

export function easyShareRoute(payload: EasySharePayload): {
  path: string
  query: Record<string, string>
} {
  const match = payload.link?.match(/^skyphone:\/\/([^/]+)(?:\/([^/]+))?(?:\/(.+))?$/)
  const schemeApp = match?.[1]
  const app = schemeApp ? getPhoneApp(schemeApp) : getPhoneApp(payload.appId)
  const path =
    (schemeApp && schemeRoutes[schemeApp]) || app?.route || '/'
  const query: Record<string, string> = {
    easyShareId: String(payload.id ?? match?.[3] ?? match?.[2] ?? ''),
    easyShareKind: payload.kind,
    easyShareLink: payload.link ?? '',
  }
  if (schemeApp === 'citymarkt' && match?.[2] === 'listing' && match[3]) {
    query.listingId = decodeURIComponent(match[3])
  }
  return {
    path,
    query,
  }
}

export async function openEasySharePayload(
  router: Router,
  payload: EasySharePayload,
): Promise<void> {
  await router.push(easyShareRoute(payload))
}
