import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCompaniesStore } from '@/stores/companies'
import type {
  Company,
  CompanyDirectoryFilters,
  CompanyRequest,
  CompanySummary,
} from '@/types/companies'
import { nuiCall } from '@/utils/nui'

vi.mock('@/utils/nui', () => ({ nuiCall: vi.fn() }))

const mockNuiCall = vi.mocked(nuiCall)

const summary: CompanySummary = {
  acceptsRequests: true,
  announcement: null,
  availability: 'available',
  availabilityUpdatedAt: '2026-08-10T10:00:00.000Z',
  canCall: true,
  canMessage: false,
  categoryId: 'public',
  categoryName: 'Public services',
  description: 'City emergency service.',
  id: 'police',
  location: {
    address: 'Mission Row',
    coords: { x: 441, y: -981, z: 30 },
    district: 'Mission Row',
    label: 'Mission Row Station',
  },
  logoUrl: null,
  name: 'Los Santos Police',
  phoneNumber: '911',
  serviceSummary: 'Emergency response',
  verified: true,
}

const company: Company = {
  ...summary,
  coverUrl: null,
  hours: [],
  revision: 3,
  services: [],
}

const request: CompanyRequest = {
  actions: {
    allowedStatuses: ['in_progress'],
    canAssign: false,
    canCall: true,
    canCancel: true,
    canClaim: false,
    canReply: true,
  },
  assignedLabel: null,
  companyId: company.id,
  companyLogoUrl: null,
  companyName: company.name,
  createdAt: '2026-08-10T10:00:00.000Z',
  description: 'I need assistance.',
  events: [],
  id: 'request-1',
  media: [],
  messages: [],
  phoneNumber: '911',
  revision: 1,
  serviceId: 'response',
  serviceName: 'Emergency response',
  status: 'new',
  subject: 'Help needed',
  unreadCount: 1,
  updatedAt: '2026-08-10T10:00:00.000Z',
}

const filters: CompanyDirectoryFilters = {
  acceptsRequests: false,
  availability: null,
  categoryId: null,
  hasLocation: false,
  search: '',
  sort: 'relevance',
}

describe('companies store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockNuiCall.mockReset()
  })

  it('loads, filters and deduplicates cursor pages', async () => {
    mockNuiCall
      .mockResolvedValueOnce({
        data: {
          categories: [{ id: 'public', name: 'Public services' }],
          companies: [summary],
          nextCursor: 'page-2',
        },
        success: true,
      })
      .mockResolvedValueOnce({
        data: {
          categories: [],
          companies: [
            { ...summary, description: 'Updated description' },
            { ...summary, id: 'medical', name: 'Los Santos Medical' },
          ],
          nextCursor: null,
        },
        success: true,
      })
    const store = useCompaniesStore()

    expect(await store.loadCompanies(filters)).toBe(true)
    expect(await store.loadCompanies(filters, true)).toBe(true)

    expect(store.directory.map((item) => item.id)).toEqual([
      'police',
      'medical',
    ])
    expect(store.directory[0].description).toBe('Updated description')
    expect(mockNuiCall).toHaveBeenNthCalledWith(2, 'companies:list', {
      acceptsRequests: false,
      availability: null,
      categoryId: null,
      cursor: 'page-2',
      hasLocation: false,
      search: '',
      sort: 'relevance',
    })
  })

  it('uses server-provided unread counts for the app badge', async () => {
    mockNuiCall.mockResolvedValueOnce({
      data: {
        nextCursor: null,
        requests: [request],
        unreadCount: 4,
      },
      success: true,
    })
    const store = useCompaniesStore()

    await store.loadMyRequests('open')
    store.applyUnreadCounts({ work: 2 })

    expect(store.customerUnreadCount).toBe(4)
    expect(store.workUnreadCount).toBe(2)
    expect(store.unreadCount).toBe(6)
  })

  it('does not refresh directory data before the app has loaded it', async () => {
    const store = useCompaniesStore()

    await store.applyChanged({ area: 'directory', companyId: 'police' })

    expect(mockNuiCall).not.toHaveBeenCalled()

    mockNuiCall.mockResolvedValue({
      data: { categories: [], companies: [summary], nextCursor: null },
      success: true,
    })
    await store.loadCompanies(filters)
    mockNuiCall.mockClear()

    await store.applyChanged({ area: 'directory', companyId: 'police' })

    expect(mockNuiCall).toHaveBeenCalledOnce()
  })

  it('clears customer badge state when the active device has no usable SIM', async () => {
    mockNuiCall.mockResolvedValueOnce({ error: 'no_sim', success: false })
    const store = useCompaniesStore()
    store.customerUnreadCount = 4

    expect(await store.loadMyRequests('open')).toBe(false)
    expect(store.customerUnreadCount).toBe(0)
  })

  it('drops SIM-scoped request data when the active device changes', () => {
    const store = useCompaniesStore()
    store.bindDeviceScope('device-a', 'sim-a')
    store.customerUnreadCount = 3
    store.myRequests = [request]
    store.request = request

    store.bindDeviceScope('device-a', 'sim-b')

    expect(store.customerUnreadCount).toBe(0)
    expect(store.myRequests).toEqual([])
    expect(store.request).toBeNull()
  })

  it('keeps server-resolved request media in the loaded thread', async () => {
    const requestWithMedia = {
      ...request,
      media: [{ id: 12, url: 'https://example.test/request-photo.jpg' }],
    }
    mockNuiCall.mockResolvedValueOnce({
      data: { request: requestWithMedia },
      success: true,
    })
    const store = useCompaniesStore()

    expect(await store.loadRequest(request.id)).toBe(true)
    expect(store.request?.media).toEqual(requestWithMedia.media)
  })

  it('refreshes counts without replacing the selected request list', async () => {
    mockNuiCall
      .mockResolvedValueOnce({
        data: { nextCursor: null, requests: [], unreadCount: 3 },
        success: true,
      })
      .mockResolvedValueOnce({
        data: {
          context: {
            authorized: false,
            callAvailable: false,
            company: null,
            metrics: { assigned: 0, completedToday: 0, new: 0, waiting: 0 },
            ownRequests: [],
            permissions: {
              canAssign: false,
              canManageAnnouncement: false,
              canManageHours: false,
              canManageProfile: false,
              canManageServices: false,
              canSetAvailability: false,
              canTakeCalls: false,
            },
            recentRequests: [],
            role: null,
            unreadCount: 0,
          },
        },
        success: true,
      })
    const store = useCompaniesStore()
    store.myRequestsList = 'closed'

    await store.refreshUnreadCounts()

    expect(mockNuiCall).toHaveBeenCalledWith('companies:my-requests', {
      cursor: null,
      list: 'closed',
    })
  })

  it('sends only server-resolved request identifiers when claiming', async () => {
    mockNuiCall.mockResolvedValueOnce({
      data: { request: { ...request, revision: 2, status: 'assigned' } },
      success: true,
    })
    const store = useCompaniesStore()

    await store.claimRequest(request.id, request.revision)

    expect(mockNuiCall).toHaveBeenCalledWith('companies:claim-request', {
      requestId: request.id,
      revision: request.revision,
    })
    expect(store.request?.status).toBe('assigned')
  })

  it('does not apply manager edits until the server confirms them', async () => {
    mockNuiCall.mockResolvedValueOnce({
      error: 'revision_conflict',
      success: false,
    })
    const store = useCompaniesStore()
    store.company = company

    await store.updateProfile({
      acceptsRequests: false,
      address: 'New address',
      description: 'Changed locally',
      district: 'Downtown',
      locationLabel: 'Office',
      revision: company.revision,
    })

    expect(store.company).toEqual(company)
    expect(store.mutationError).toBe('revision_conflict')
  })

  it('includes the current revision when availability changes', async () => {
    mockNuiCall.mockResolvedValueOnce({
      data: { company: { ...company, availability: 'busy', revision: 4 } },
      success: true,
    })
    const store = useCompaniesStore()

    await store.updateAvailability('busy', 3)

    expect(mockNuiCall).toHaveBeenCalledWith('companies:update-availability', {
      availability: 'busy',
      revision: 3,
    })
  })

  it('creates requests without client-owned identity fields', async () => {
    mockNuiCall.mockResolvedValueOnce({
      data: { request },
      success: true,
    })
    const store = useCompaniesStore()

    await store.createRequest({
      companyId: 'police',
      description: 'I need assistance.',
      mediaIds: ['10'],
      serviceId: 'response',
      subject: 'Help needed',
    })

    expect(mockNuiCall).toHaveBeenCalledWith('companies:create-request', {
      companyId: 'police',
      description: 'I need assistance.',
      mediaIds: ['10'],
      serviceId: 'response',
      subject: 'Help needed',
    })
  })
})
