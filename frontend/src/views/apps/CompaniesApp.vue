<script setup lang="ts">
import {
  kActions,
  kActionsButton,
  kActionsGroup,
  kBadge,
  kBlock,
  kBlockTitle,
  kButton,
  kCard,
  kChip,
  kDialog,
  kDialogButton,
  kGlass,
  kIcon,
  kLink,
  kList,
  kListInput,
  kListItem,
  kMessage,
  kMessagebar,
  kMessages,
  kMessagesTitle,
  kNavbar,
  kNavbarBackLink,
  kPage,
  kPreloader,
  kProgressbar,
  kRadio,
  kSearchbar,
  kSegmented,
  kSegmentedButton,
  kSheet,
  kTabbar,
  kTabbarLink,
  kToast,
  kToggle,
  kToolbarPane,
} from 'konsta/vue'
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  CircleAlert,
  ClipboardList,
  Clock3,
  Compass,
  ImagePlus,
  MapPin,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  Send,
  Share2,
  Settings2,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-vue-next'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useCallsStore } from '@/stores/calls'
import { useCompaniesStore } from '@/stores/companies'
import { useEasyShareStore } from '@/stores/easyshare'
import { useMessageMediaStore } from '@/stores/messageMedia'
import { useMessagesStore } from '@/stores/messages'
import { usePhoneStore } from '@/stores/phone'
import type {
  Company,
  CompanyAvailability,
  CompanyCoordinates,
  CompanyDirectoryFilters,
  CompanyHours,
  CompanyRequestEvent,
  CompanyRequestList,
  CompanyRequestStatus,
  CompanyRequestSummary,
  CompanyService,
  CompanySummary,
} from '@/types/companies'
import type { PhoneMedia } from '@/types/media'
import { handleEnterAction } from '@/utils/keyboard'
import { nuiCall } from '@/utils/nui'

type CompaniesTab = 'directory' | 'requests' | 'work'
type CompaniesScreen = 'company' | 'manager' | 'request' | 'root'
type RequestOrigin = 'customer' | 'work'

type RequestMediaContext = {
  companyId: string
  description: string
  media: PhoneMedia[]
  serviceId: string
  subject: string
}

type ManagerProfileDraft = {
  acceptsRequests: boolean
  address: string
  description: string
  district: string
  locationLabel: string
}

type ManagerMediaContext = {
  announcement: { body: string; expiresAt: string }
  companyId: string
  coords: CompanyCoordinates | null
  coverMedia: PhoneMedia | null
  hours: CompanyHours[]
  kind: 'cover' | 'logo'
  logoMedia: PhoneMedia | null
  profile: ManagerProfileDraft
  services: CompanyService[]
}

const phone = usePhoneStore()
const calls = useCallsStore()
const messages = useMessagesStore()
const companies = useCompaniesStore()
const easyShare = useEasyShareStore()
const mediaPicker = useMessageMediaStore()
const route = useRoute()
const router = useRouter()

const activeTab = ref<CompaniesTab>('directory')
const screen = ref<CompaniesScreen>('root')
const requestOrigin = ref<RequestOrigin>('customer')
const search = ref('')
const selectedCategory = ref<string | null>(null)
const requestList = ref<CompanyRequestList>('open')
const requestSheetOpened = ref(false)
const requestSheetContent = ref<HTMLElement | null>(null)
const requestServiceId = ref('')
const requestSubject = ref('')
const requestDescription = ref('')
const requestMedia = ref<PhoneMedia[]>([])
const threadDraft = ref('')
const workActionsOpened = ref(false)
const assignmentSheetOpened = ref(false)
const selectedMemberId = ref('')
const cancelDialogOpened = ref(false)
const conflictDialogOpened = ref(false)
const toastOpened = ref(false)
const toastText = ref('')
const profileDraft = reactive<ManagerProfileDraft>({
  acceptsRequests: false,
  address: '',
  description: '',
  district: '',
  locationLabel: '',
})
const hoursDraft = ref<CompanyHours[]>([])
const servicesDraft = ref<CompanyService[]>([])
const announcementDraft = reactive({ body: '', expiresAt: '' })
const profileCoords = ref<CompanyCoordinates | null>(null)
const selectedLogoMedia = ref<PhoneMedia | null>(null)
const selectedCoverMedia = ref<PhoneMedia | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | undefined
let toastTimer: ReturnType<typeof setTimeout> | undefined

const directoryFilters = computed<CompanyDirectoryFilters>(() => ({
  acceptsRequests: false,
  availability: null,
  categoryId: selectedCategory.value,
  hasLocation: false,
  search: search.value.trim(),
  sort: 'relevance',
}))
const availableCompanies = computed(() =>
  companies.directory.filter((company) => company.availability === 'available'),
)
const filtersActive = computed(
  () => Boolean(search.value.trim()) || Boolean(selectedCategory.value),
)
const activeCompany = computed(() => companies.company)
const workCompany = computed(() => companies.workContext?.company ?? null)
const managerLogoUrl = computed(
  () => selectedLogoMedia.value?.url ?? workCompany.value?.logoUrl ?? null,
)
const managerCoverUrl = computed(
  () => selectedCoverMedia.value?.url ?? workCompany.value?.coverUrl ?? null,
)
const requestProgress = computed(() => {
  if (!requestServiceId.value) return 0.25
  if (!requestSubject.value.trim() || !requestDescription.value.trim())
    return 0.5
  if (!phone.device?.sim?.registered) return 0.75
  return 1
})
const canSubmitRequest = computed(
  () =>
    Boolean(requestServiceId.value) &&
    requestSubject.value.trim().length >= 3 &&
    requestDescription.value.trim().length >= 10 &&
    Boolean(phone.device?.sim?.registered) &&
    !companies.mutating,
)
const canSendThreadMessage = computed(
  () =>
    Boolean(companies.request?.actions.canReply) &&
    Boolean(threadDraft.value.trim()) &&
    !companies.mutating,
)
const navbarTitle = computed(() => {
  if (screen.value === 'company') return activeCompany.value?.name ?? ''
  if (screen.value === 'request') {
    return companies.request?.subject ?? phone.t('Apps.companies.request')
  }
  if (screen.value === 'manager') {
    return phone.t('Apps.companies.manager.title')
  }
  return phone.t('Apps.companies.name')
})
const availabilityValues: CompanyAvailability[] = [
  'available',
  'busy',
  'closed',
]
const weekdayKeys = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

function eventValue(event: Event): string {
  if (
    !(event.target instanceof HTMLInputElement) &&
    !(event.target instanceof HTMLTextAreaElement) &&
    !(event.target instanceof HTMLSelectElement)
  ) {
    console.error(
      '[companies] Input event did not originate from a form field.',
    )
    return ''
  }
  return event.target.value
}

function messagebarValue(event: Event): string {
  if (!(event.target instanceof HTMLTextAreaElement)) {
    console.error(
      '[companies] Message event did not originate from a textarea.',
    )
    return ''
  }
  return event.target.value
}

function showToast(message: string): void {
  if (toastTimer) clearTimeout(toastTimer)
  toastText.value = message
  toastOpened.value = true
  toastTimer = setTimeout(() => (toastOpened.value = false), 2800)
}

function errorText(code = 'request_failed'): string {
  const phoneErrors = ['airplane_mode', 'busy', 'no_sim', 'voice_unavailable']
  if (phoneErrors.includes(code)) return phone.t(`Apps.phone.errors.${code}`)
  const known = [
    'anonymous_sim',
    'call_unavailable',
    'company_not_found',
    'invalid_media',
    'invalid_expiration',
    'invalid_profile',
    'invalid_request',
    'invalid_service',
    'invalid_status',
    'messaging_unavailable',
    'no_sim',
    'not_authorized',
    'rate_limited',
    'request_not_found',
    'revision_conflict',
    'service_unavailable',
    'too_many_open_requests',
  ]
  const key = known.includes(code) ? code : 'request_failed'
  return phone.t(`Apps.companies.errors.${key}`)
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(phone.lang, {
    day: 'numeric',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: 'short',
  }).format(date)
}

function localDateTimeInput(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ]
  return `${parts[0]}-${parts[1]}-${parts[2]}T${parts[3]}:${parts[4]}`
}

function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000))
  if (minutes < 1) return phone.t('Apps.companies.time.justNow')
  if (minutes < 60) {
    return phone.t('Apps.companies.time.minutesAgo', {
      count: String(minutes),
    })
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return phone.t('Apps.companies.time.hoursAgo', { count: String(hours) })
  }
  return phone.t('Apps.companies.time.daysAgo', {
    count: String(Math.floor(hours / 24)),
  })
}

function companyInitials(company: CompanySummary): string {
  return company.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase()
}

function categoryLabel(categoryId: string, fallback: string): string {
  const key = `Apps.companies.categories.${categoryId}`
  const translated = phone.t(key)
  return translated === key ? fallback : translated
}

function statusClass(
  status: CompanyAvailability | CompanyRequestStatus,
): string {
  return `is-${status.replace('_', '-')}`
}

function requestSubtitle(request: CompanyRequestSummary): string {
  const parts = [request.serviceName, relativeTime(request.updatedAt)].filter(
    Boolean,
  )
  return parts.join(' · ')
}

function messageAuthorLabel(value: 'company' | 'customer' | 'you'): string {
  return phone.t(`Apps.companies.messageAuthors.${value}`)
}

function memberName(name: string): string {
  return name.trim() || phone.t('Apps.companies.assignment.unknownMember')
}

function maskedPhoneNumber(value: string): string {
  return value.replace(/.(?=.{4})/g, '•')
}

function eventLabel(event: CompanyRequestEvent): string {
  if (event.type === 'status_changed' && event.status) {
    return phone.t('Apps.companies.timeline.statusChanged', {
      status: phone.t(`Apps.companies.requestStatuses.${event.status}`),
    })
  }
  return phone.t(`Apps.companies.timeline.${event.type}`)
}

function resetDirectoryFilters(): void {
  search.value = ''
  selectedCategory.value = null
  void companies.loadCompanies(directoryFilters.value)
}

function queueDirectoryLoad(): void {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(
    () => void companies.loadCompanies(directoryFilters.value),
    260,
  )
}

function selectCategory(categoryId: string | null): void {
  selectedCategory.value = categoryId
}

async function selectTab(tab: CompaniesTab): Promise<void> {
  activeTab.value = tab
  screen.value = 'root'
  if (tab === 'directory' && !companies.directory.length) {
    await companies.loadCompanies(directoryFilters.value)
  }
  if (tab === 'requests') await companies.loadMyRequests(requestList.value)
  if (tab === 'work') await companies.loadWorkContext()
}

async function openCompany(companyId: string): Promise<void> {
  companies.company = null
  screen.value = 'company'
  if (!(await companies.loadCompany(companyId))) {
    showToast(errorText(companies.directoryError))
  }
}

async function openRequest(
  requestId: string,
  origin: RequestOrigin,
): Promise<void> {
  requestOrigin.value = origin
  companies.resetRequest()
  screen.value = 'request'
  if (!(await companies.loadRequest(requestId))) {
    showToast(errorText(companies.requestError))
  }
}

function goBack(): void {
  if (screen.value === 'manager') {
    screen.value = 'root'
    activeTab.value = 'work'
    return
  }
  if (screen.value === 'request') {
    companies.resetRequest()
    screen.value = 'root'
    activeTab.value = requestOrigin.value === 'work' ? 'work' : 'requests'
    return
  }
  screen.value = 'root'
  activeTab.value = 'directory'
}

async function callNumber(phoneNumber: string | null): Promise<void> {
  if (!phoneNumber) {
    showToast(phone.t('Apps.companies.actionUnavailable.call'))
    return
  }
  const response = await calls.dial(phoneNumber)
  if (!response.success) {
    showToast(errorText(response.error))
    return
  }
  await router.push('/apps/phone')
}

async function messageCompany(company: CompanySummary): Promise<void> {
  if (!company.canMessage || !company.phoneNumber) {
    showToast(phone.t('Apps.companies.actionUnavailable.message'))
    return
  }
  if (!(await messages.openThread(company.phoneNumber))) {
    showToast(errorText('messaging_unavailable'))
    return
  }
  await router.push('/apps/messages')
}

async function setRoute(company: CompanySummary): Promise<void> {
  if (!company.location) {
    showToast(phone.t('Apps.companies.actionUnavailable.route'))
    return
  }
  const response = await nuiCall('map:setWaypoint', {
    coords: company.location.coords,
  })
  if (!response.success) {
    showToast(errorText(response.error))
    return
  }
  showToast(phone.t('Apps.companies.routeSet'))
}

function shareCompany(company: Company): void {
  easyShare.open({
    appId: 'companies',
    copyText: `${company.name}\n${company.description}`,
    id: company.id,
    imageUrl: company.logoUrl,
    kind: 'profile',
    link: `skyphone://companies/profile/${company.id}`,
    subtitle: company.phoneNumber ?? company.categoryName,
    title: company.name,
  })
}

function openRequestComposer(company: Company): void {
  if (!company.acceptsRequests) {
    showToast(phone.t('Apps.companies.actionUnavailable.request'))
    return
  }
  requestServiceId.value =
    company.services.find(
      (service) => service.active && service.acceptsRequests,
    )?.id ?? ''
  requestSubject.value = ''
  requestDescription.value = ''
  requestMedia.value = []
  requestSheetOpened.value = true
}

function chooseRequestMedia(): void {
  if (!activeCompany.value) return
  mediaPicker.begin(
    'companies:request',
    'photo',
    '/apps/companies?compose=1',
    3,
    {
      companyId: activeCompany.value.id,
      description: requestDescription.value,
      media: requestMedia.value,
      serviceId: requestServiceId.value,
      subject: requestSubject.value,
    } satisfies RequestMediaContext,
  )
  requestSheetOpened.value = false
  void router.push({
    path: '/apps/photos',
    query: { mediaAttachment: 'photo' },
  })
}

function removeRequestMedia(id: number): void {
  requestMedia.value = requestMedia.value.filter((media) => media.id !== id)
}

async function submitRequest(): Promise<void> {
  if (!activeCompany.value || !canSubmitRequest.value) return
  const response = await companies.createRequest({
    companyId: activeCompany.value.id,
    description: requestDescription.value.trim(),
    mediaIds: requestMedia.value.map((media) => String(media.id)),
    serviceId: requestServiceId.value,
    subject: requestSubject.value.trim(),
  })
  if (!response.success || !response.data?.request) {
    if (response.error === 'revision_conflict')
      conflictDialogOpened.value = true
    else showToast(errorText(response.error))
    return
  }
  requestSheetOpened.value = false
  showToast(phone.t('Apps.companies.feedback.requestCreated'))
  activeTab.value = 'requests'
  requestOrigin.value = 'customer'
  screen.value = 'request'
  await companies.loadMyRequests('open')
}

async function sendThreadMessage(): Promise<void> {
  const request = companies.request
  if (!request || !canSendThreadMessage.value) return
  const response = await companies.sendMessage(
    request.id,
    threadDraft.value.trim(),
    request.revision,
  )
  if (!response.success) {
    if (response.error === 'revision_conflict')
      conflictDialogOpened.value = true
    else showToast(errorText(response.error))
    return
  }
  threadDraft.value = ''
}

async function cancelActiveRequest(): Promise<void> {
  const request = companies.request
  if (!request) return
  const response = await companies.cancelRequest(request.id, request.revision)
  cancelDialogOpened.value = false
  if (!response.success) {
    if (response.error === 'revision_conflict')
      conflictDialogOpened.value = true
    else showToast(errorText(response.error))
    return
  }
  showToast(phone.t('Apps.companies.feedback.requestCancelled'))
}

async function claimActiveRequest(): Promise<void> {
  const request = companies.request
  if (!request) return
  const response = await companies.claimRequest(request.id, request.revision)
  workActionsOpened.value = false
  if (!response.success) {
    if (response.error === 'revision_conflict')
      conflictDialogOpened.value = true
    else showToast(errorText(response.error))
    return
  }
  showToast(phone.t('Apps.companies.feedback.requestClaimed'))
}

async function openAssignment(): Promise<void> {
  workActionsOpened.value = false
  selectedMemberId.value = ''
  if (!(await companies.loadMembers())) {
    showToast(errorText(companies.mutationError))
    return
  }
  assignmentSheetOpened.value = true
}

async function assignActiveRequest(): Promise<void> {
  const request = companies.request
  if (!request || !selectedMemberId.value) return
  const response = await companies.assignRequest(
    request.id,
    selectedMemberId.value,
    request.revision,
  )
  if (!response.success) {
    if (response.error === 'revision_conflict')
      conflictDialogOpened.value = true
    else showToast(errorText(response.error))
    return
  }
  assignmentSheetOpened.value = false
  showToast(phone.t('Apps.companies.feedback.requestAssigned'))
}

async function updateActiveRequestStatus(
  status: CompanyRequestStatus,
): Promise<void> {
  const request = companies.request
  if (!request) return
  const response = await companies.updateRequestStatus(
    request.id,
    status,
    request.revision,
  )
  workActionsOpened.value = false
  if (!response.success) {
    if (response.error === 'revision_conflict')
      conflictDialogOpened.value = true
    else showToast(errorText(response.error))
    return
  }
  showToast(phone.t('Apps.companies.feedback.statusUpdated'))
}

async function callRequestParty(): Promise<void> {
  const request = companies.request
  if (!request) return
  if (requestOrigin.value === 'work') {
    const response = await companies.callCustomer(request.id)
    workActionsOpened.value = false
    if (!response.success) {
      showToast(errorText(response.error))
      return
    }
    if (response.data) calls.applyCallState(response.data)
    await router.push('/apps/phone')
    return
  }
  await callNumber(request.phoneNumber)
}

async function setCompanyAvailability(
  availability: CompanyAvailability,
): Promise<void> {
  const company = workCompany.value
  if (!company) return
  const response = await companies.updateAvailability(
    availability,
    company.revision,
  )
  if (!response.success) {
    if (response.error === 'revision_conflict')
      conflictDialogOpened.value = true
    else showToast(errorText(response.error))
    return
  }
  showToast(phone.t('Apps.companies.feedback.availabilityUpdated'))
}

async function toggleCallAvailability(): Promise<void> {
  const context = companies.workContext
  if (!context) return
  const response = await companies.setCallAvailability(!context.callAvailable)
  if (!response.success) {
    showToast(errorText(response.error))
    return
  }
  showToast(
    phone.t(
      `Apps.companies.feedback.${response.data?.context.callAvailable ? 'callsEnabled' : 'callsDisabled'}`,
    ),
  )
}

function syncManagerDraft(company: Company): void {
  profileDraft.acceptsRequests = company.acceptsRequests
  profileDraft.address = company.location?.address ?? ''
  profileDraft.description = company.description
  profileDraft.district = company.location?.district ?? ''
  profileDraft.locationLabel = company.location?.label ?? ''
  hoursDraft.value = weekdayKeys.map((_, day) => {
    const existing = company.hours.find((hours) => hours.day === day)
    return existing
      ? { ...existing }
      : { closesAt: '18:00', day, isClosed: true, opensAt: '09:00' }
  })
  servicesDraft.value = company.services.map((service) => ({ ...service }))
  announcementDraft.body = company.announcement?.body ?? ''
  announcementDraft.expiresAt = localDateTimeInput(
    company.announcement?.expiresAt,
  )
  profileCoords.value = company.location?.coords
    ? { ...company.location.coords }
    : null
  selectedLogoMedia.value = null
  selectedCoverMedia.value = null
}

function openManager(): void {
  const company = workCompany.value
  if (!company) return
  syncManagerDraft(company)
  screen.value = 'manager'
}

function managerResponseError(error?: string): void {
  if (error === 'revision_conflict') {
    conflictDialogOpened.value = true
    return
  }
  showToast(errorText(error))
}

function chooseManagerMedia(kind: 'cover' | 'logo'): void {
  const company = workCompany.value
  if (!company) return
  mediaPicker.begin(
    'companies:manager-media',
    'photo',
    '/apps/companies?managerMedia=1',
    1,
    {
      announcement: { ...announcementDraft },
      companyId: company.id,
      coords: profileCoords.value ? { ...profileCoords.value } : null,
      coverMedia: selectedCoverMedia.value,
      hours: hoursDraft.value.map((hours) => ({ ...hours })),
      kind,
      logoMedia: selectedLogoMedia.value,
      profile: { ...profileDraft },
      services: servicesDraft.value.map((service) => ({ ...service })),
    } satisfies ManagerMediaContext,
  )
  void router.push({
    path: '/apps/photos',
    query: { mediaAttachment: 'photo' },
  })
}

async function useCurrentLocation(): Promise<void> {
  const response = await nuiCall<{ coords?: CompanyCoordinates }>(
    'map:getPlayerCoords',
  )
  if (!response.success || !response.data?.coords) {
    showToast(errorText(response.error))
    return
  }
  profileCoords.value = { ...response.data.coords }
  showToast(phone.t('Apps.companies.feedback.locationUpdated'))
}

async function saveProfile(): Promise<void> {
  const company = workCompany.value
  if (!company) return
  const response = await companies.updateProfile({
    acceptsRequests: profileDraft.acceptsRequests,
    address: profileDraft.address.trim(),
    ...(profileCoords.value ? { coords: profileCoords.value } : {}),
    ...(selectedCoverMedia.value
      ? { coverMediaId: selectedCoverMedia.value.id }
      : {}),
    description: profileDraft.description.trim(),
    district: profileDraft.district.trim(),
    ...(selectedLogoMedia.value
      ? { logoMediaId: selectedLogoMedia.value.id }
      : {}),
    locationLabel: profileDraft.locationLabel.trim(),
    revision: company.revision,
  })
  if (!response.success || !response.data?.company) {
    managerResponseError(response.error)
    return
  }
  syncManagerDraft(response.data.company)
  showToast(phone.t('Apps.companies.feedback.profileSaved'))
}

function updateHour(
  index: number,
  field: 'closesAt' | 'opensAt',
  event: Event,
): void {
  hoursDraft.value[index][field] = eventValue(event)
}

async function saveHours(): Promise<void> {
  const company = workCompany.value
  if (!company) return
  const response = await companies.updateHours(
    company.revision,
    hoursDraft.value,
  )
  if (!response.success || !response.data?.company) {
    managerResponseError(response.error)
    return
  }
  syncManagerDraft(response.data.company)
  showToast(phone.t('Apps.companies.feedback.hoursSaved'))
}

function addService(): void {
  servicesDraft.value.push({
    acceptsRequests: true,
    active: true,
    description: '',
    id: '',
    priceText: null,
    title: '',
  })
}

function removeService(index: number): void {
  servicesDraft.value.splice(index, 1)
}

function updateService(
  index: number,
  field: 'description' | 'priceText' | 'title',
  event: Event,
): void {
  servicesDraft.value[index][field] = eventValue(event)
}

async function saveServices(): Promise<void> {
  const company = workCompany.value
  if (!company) return
  const response = await companies.updateServices(
    company.revision,
    servicesDraft.value,
  )
  if (!response.success || !response.data?.company) {
    managerResponseError(response.error)
    return
  }
  syncManagerDraft(response.data.company)
  showToast(phone.t('Apps.companies.feedback.servicesSaved'))
}

async function publishAnnouncement(): Promise<void> {
  const company = workCompany.value
  if (!company) return
  let expiresAt: string | null = null
  if (announcementDraft.expiresAt) {
    const expiration = new Date(announcementDraft.expiresAt)
    if (Number.isNaN(expiration.getTime())) {
      showToast(errorText('invalid_expiration'))
      return
    }
    expiresAt = expiration.toISOString()
  }
  const response = await companies.publishAnnouncement({
    body: announcementDraft.body.trim(),
    expiresAt,
    revision: company.revision,
  })
  if (!response.success || !response.data?.company) {
    managerResponseError(response.error)
    return
  }
  syncManagerDraft(response.data.company)
  showToast(phone.t('Apps.companies.feedback.announcementPublished'))
}

async function reloadConflict(): Promise<void> {
  conflictDialogOpened.value = false
  const loaded = await companies.loadWorkContext()
  if (loaded && companies.workContext?.company) {
    syncManagerDraft(companies.workContext.company)
  }
  if (companies.request) await companies.loadRequest(companies.request.id)
}

watch(search, queueDirectoryLoad)
watch(selectedCategory, () => companies.loadCompanies(directoryFilters.value))
watch(requestList, () => {
  if (activeTab.value === 'requests')
    void companies.loadMyRequests(requestList.value)
})
watch(requestSheetOpened, async (opened) => {
  if (!opened) return
  await nextTick()
  requestSheetContent.value?.scrollTo({ top: 0 })
})
watch(
  () => route.query.requestId,
  async (requestId) => {
    if (typeof requestId !== 'string') return
    const origin: RequestOrigin =
      route.query.area === 'work' ? 'work' : 'customer'
    await router.replace('/apps/companies')
    await openRequest(requestId, origin)
  },
)

onMounted(async () => {
  const selection =
    mediaPicker.consumeMany<RequestMediaContext>('companies:request')
  const managerSelection = mediaPicker.consumeMany<ManagerMediaContext>(
    'companies:manager-media',
  )
  const linkedRequestId =
    typeof route.query.requestId === 'string' ? route.query.requestId : null
  const linkedRequestOrigin: RequestOrigin =
    route.query.area === 'work' ? 'work' : 'customer'
  await Promise.all([
    companies.loadCompanies(directoryFilters.value),
    companies.loadMyRequests('open'),
    companies.loadWorkContext(),
    calls.loadContacts(),
  ])
  if (linkedRequestId) {
    await router.replace('/apps/companies')
    await openRequest(linkedRequestId, linkedRequestOrigin)
    return
  }
  if (
    managerSelection?.context &&
    managerSelection.context.companyId === workCompany.value?.id &&
    companies.workContext?.permissions.canManageProfile
  ) {
    const context = managerSelection.context
    openManager()
    Object.assign(profileDraft, context.profile)
    hoursDraft.value = context.hours.map((hours) => ({ ...hours }))
    servicesDraft.value = context.services.map((service) => ({ ...service }))
    announcementDraft.body = context.announcement.body
    announcementDraft.expiresAt = context.announcement.expiresAt
    profileCoords.value = context.coords ? { ...context.coords } : null
    selectedLogoMedia.value = context.logoMedia
    selectedCoverMedia.value = context.coverMedia
    const selectedMedia = managerSelection.media[0]
    if (selectedMedia && context.kind === 'logo') {
      selectedLogoMedia.value = selectedMedia
    } else if (selectedMedia && context.kind === 'cover') {
      selectedCoverMedia.value = selectedMedia
    }
    return
  }
  if (!selection?.context) return
  await openCompany(selection.context.companyId)
  requestServiceId.value = selection.context.serviceId
  requestSubject.value = selection.context.subject
  requestDescription.value = selection.context.description
  requestMedia.value = selection.media.length
    ? selection.media
    : selection.context.media
  requestSheetOpened.value = true
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <k-page
    component="main"
    class="companies-app"
    :class="{ 'companies-app--dark': phone.isDarkMode }"
    :colors="{ bgIos: 'bg-transparent' }"
    :aria-label="phone.t('Apps.companies.name')"
  >
    <div class="companies-backdrop" aria-hidden="true"></div>

    <k-navbar :title="navbarTitle" class="companies-navbar">
      <template v-if="screen !== 'root'" #left>
        <k-navbar-back-link
          :text="phone.t('Apps.companies.back')"
          :show-text="false"
          @click="goBack"
        />
      </template>
      <template
        v-if="
          screen === 'request' && requestOrigin === 'work' && companies.request
        "
        #right
      >
        <k-link
          component="button"
          icon-only
          :aria-label="phone.t('Apps.companies.actions')"
          :link-props="{ type: 'button' }"
          @click="workActionsOpened = true"
        >
          <MoreHorizontal :size="24" />
        </k-link>
      </template>
    </k-navbar>

    <section
      v-if="screen === 'root' && activeTab === 'directory'"
      class="companies-content companies-directory"
    >
      <div class="companies-search-wrap">
        <k-searchbar
          :value="search"
          :placeholder="phone.t('Apps.companies.directory.searchPlaceholder')"
          :disable-button="true"
          @input="search = eventValue($event)"
          @clear="search = ''"
        />
      </div>

      <div
        class="companies-chip-row"
        :aria-label="phone.t('Apps.companies.directory.categories')"
      >
        <k-chip
          component="button"
          type="button"
          :class="{ 'is-selected': selectedCategory === null }"
          @click="selectCategory(null)"
        >
          {{ phone.t('Apps.companies.directory.allCategories') }}
        </k-chip>
        <k-chip
          v-for="category in companies.categories"
          :key="category.id"
          component="button"
          type="button"
          :class="{ 'is-selected': selectedCategory === category.id }"
          @click="selectCategory(category.id)"
        >
          {{ categoryLabel(category.id, category.name) }}
        </k-chip>
      </div>

      <k-block
        v-if="companies.directoryLoading"
        inset
        strong
        class="companies-state"
      >
        <k-preloader />
        <span>{{ phone.t('Apps.companies.loading.directory') }}</span>
      </k-block>
      <k-block
        v-else-if="companies.directoryError"
        inset
        strong
        class="companies-state"
      >
        <CircleAlert :size="34" />
        <strong>{{ phone.t('Apps.companies.states.directoryError') }}</strong>
        <p>{{ errorText(companies.directoryError) }}</p>
        <k-button rounded @click="companies.loadCompanies(directoryFilters)">
          <RefreshCw :size="16" />
          {{ phone.t('Apps.companies.tryAgain') }}
        </k-button>
      </k-block>
      <k-block
        v-else-if="!companies.directory.length"
        inset
        strong
        class="companies-state"
      >
        <Building2 :size="36" />
        <strong>
          {{
            phone.t(
              filtersActive
                ? 'Apps.companies.states.noResults'
                : 'Apps.companies.states.noCompanies',
            )
          }}
        </strong>
        <p>
          {{
            phone.t(
              filtersActive
                ? 'Apps.companies.states.noResultsBody'
                : 'Apps.companies.states.noCompaniesBody',
            )
          }}
        </p>
        <k-button v-if="filtersActive" rounded @click="resetDirectoryFilters">
          {{ phone.t('Apps.companies.directory.resetFilters') }}
        </k-button>
      </k-block>
      <template v-else>
        <template v-if="availableCompanies.length">
          <k-block-title>{{
            phone.t('Apps.companies.directory.availableSection')
          }}</k-block-title>
          <div class="companies-featured-row">
            <k-card
              v-for="company in availableCompanies.slice(0, 4)"
              :key="`available-${company.id}`"
              component="button"
              type="button"
              class="company-feature-card"
              @click="openCompany(company.id)"
            >
              <span class="company-logo company-logo--small">
                <img
                  v-if="company.logoUrl"
                  :src="company.logoUrl"
                  :alt="company.name"
                />
                <span v-else>{{ companyInitials(company) }}</span>
              </span>
              <strong>{{ company.name }}</strong>
              <span>{{
                company.location?.district ??
                categoryLabel(company.categoryId, company.categoryName)
              }}</span>
              <k-badge :class="statusClass(company.availability)">
                {{
                  phone.t(`Apps.companies.availability.${company.availability}`)
                }}
              </k-badge>
            </k-card>
          </div>
        </template>

        <k-block-title>{{
          phone.t('Apps.companies.directory.allCompanies')
        }}</k-block-title>
        <k-list inset strong class="company-list">
          <k-list-item
            v-for="company in companies.directory"
            :key="company.id"
            link
            link-component="button"
            :link-props="{ type: 'button' }"
            :title="company.name"
            :subtitle="company.serviceSummary || company.description"
            @click="openCompany(company.id)"
          >
            <template #media>
              <span class="company-logo">
                <img
                  v-if="company.logoUrl"
                  :src="company.logoUrl"
                  :alt="company.name"
                />
                <span v-else>{{ companyInitials(company) }}</span>
              </span>
            </template>
            <template #after>
              <span class="company-row-after">
                <k-badge :class="statusClass(company.availability)">
                  {{
                    phone.t(
                      `Apps.companies.availability.${company.availability}`,
                    )
                  }}
                </k-badge>
                <small>{{
                  company.location?.district ??
                  categoryLabel(company.categoryId, company.categoryName)
                }}</small>
              </span>
            </template>
          </k-list-item>
        </k-list>
        <k-button
          v-if="companies.directoryNextCursor"
          outline
          rounded
          class="companies-load-more"
          :disabled="companies.directoryLoadingMore"
          @click="companies.loadCompanies(directoryFilters, true)"
        >
          <k-preloader v-if="companies.directoryLoadingMore" />
          <span v-else>{{ phone.t('Apps.companies.loadMore') }}</span>
        </k-button>
      </template>
    </section>

    <section
      v-else-if="screen === 'root' && activeTab === 'requests'"
      class="companies-content"
    >
      <div class="companies-segment-wrap">
        <k-segmented strong rounded>
          <k-segmented-button
            :active="requestList === 'open'"
            @click="requestList = 'open'"
          >
            {{ phone.t('Apps.companies.requests.open') }}
          </k-segmented-button>
          <k-segmented-button
            :active="requestList === 'closed'"
            @click="requestList = 'closed'"
          >
            {{ phone.t('Apps.companies.requests.closed') }}
          </k-segmented-button>
        </k-segmented>
      </div>

      <k-block
        v-if="companies.myRequestsLoading"
        inset
        strong
        class="companies-state"
      >
        <k-preloader />
        <span>{{ phone.t('Apps.companies.loading.requests') }}</span>
      </k-block>
      <k-block
        v-else-if="companies.myRequestsError"
        inset
        strong
        class="companies-state"
      >
        <CircleAlert :size="34" />
        <strong>{{ phone.t('Apps.companies.states.requestsError') }}</strong>
        <p>{{ errorText(companies.myRequestsError) }}</p>
        <k-button rounded @click="companies.loadMyRequests(requestList)">
          {{ phone.t('Apps.companies.tryAgain') }}
        </k-button>
      </k-block>
      <k-block
        v-else-if="!companies.myRequests.length"
        inset
        strong
        class="companies-state"
      >
        <ClipboardList :size="36" />
        <strong>{{
          phone.t(
            `Apps.companies.states.no${requestList === 'open' ? 'Open' : 'Closed'}Requests`,
          )
        }}</strong>
        <p>{{ phone.t('Apps.companies.states.noRequestsBody') }}</p>
        <k-button
          v-if="requestList === 'open'"
          rounded
          @click="selectTab('directory')"
        >
          {{ phone.t('Apps.companies.requests.findCompany') }}
        </k-button>
      </k-block>
      <k-list v-else inset strong class="company-request-list">
        <k-list-item
          v-for="item in companies.myRequests"
          :key="item.id"
          link
          link-component="button"
          :link-props="{ type: 'button' }"
          :title="item.subject"
          :subtitle="requestSubtitle(item)"
          :header="item.companyName"
          @click="openRequest(item.id, 'customer')"
        >
          <template #media>
            <span class="company-request-icon"
              ><ClipboardList :size="19"
            /></span>
          </template>
          <template #after>
            <span class="request-row-after">
              <k-badge v-if="item.unreadCount" class="is-unread">{{
                item.unreadCount
              }}</k-badge>
              <k-badge :class="statusClass(item.status)">
                {{ phone.t(`Apps.companies.requestStatuses.${item.status}`) }}
              </k-badge>
            </span>
          </template>
        </k-list-item>
      </k-list>
      <k-button
        v-if="companies.myRequestsNextCursor"
        outline
        rounded
        class="companies-load-more"
        :disabled="companies.myRequestsLoadingMore"
        @click="companies.loadMyRequests(requestList, true)"
      >
        {{ phone.t('Apps.companies.loadMore') }}
      </k-button>
    </section>

    <section
      v-else-if="screen === 'root' && activeTab === 'work'"
      class="companies-content companies-work"
    >
      <k-block
        v-if="companies.workContextLoading"
        inset
        strong
        class="companies-state"
      >
        <k-preloader />
        <span>{{ phone.t('Apps.companies.loading.work') }}</span>
      </k-block>
      <k-block
        v-else-if="companies.workContextError"
        inset
        strong
        class="companies-state"
      >
        <CircleAlert :size="34" />
        <strong>{{ phone.t('Apps.companies.states.workError') }}</strong>
        <p>{{ errorText(companies.workContextError) }}</p>
        <k-button rounded @click="selectTab('work')">
          {{ phone.t('Apps.companies.tryAgain') }}
        </k-button>
      </k-block>
      <k-block
        v-else-if="!companies.workContext?.authorized"
        inset
        strong
        class="companies-state"
      >
        <BriefcaseBusiness :size="38" />
        <strong>{{ phone.t('Apps.companies.work.notAuthorized') }}</strong>
        <p>{{ phone.t('Apps.companies.work.notAuthorizedBody') }}</p>
      </k-block>
      <template v-else-if="companies.workContext && workCompany">
        <k-card class="work-identity-card">
          <span class="company-logo company-logo--large">
            <img
              v-if="workCompany.logoUrl"
              :src="workCompany.logoUrl"
              :alt="workCompany.name"
            />
            <span v-else>{{ companyInitials(workCompany) }}</span>
          </span>
          <span>
            <small>{{ phone.t('Apps.companies.work.workspace') }}</small>
            <strong>{{ workCompany.name }}</strong>
            <span>{{
              phone.t(`Apps.companies.roles.${companies.workContext.role}`)
            }}</span>
          </span>
          <k-badge :class="statusClass(workCompany.availability)">
            {{
              phone.t(`Apps.companies.availability.${workCompany.availability}`)
            }}
          </k-badge>
        </k-card>

        <k-block-title>{{
          phone.t('Apps.companies.work.publicAvailability')
        }}</k-block-title>
        <k-segmented strong rounded class="availability-segmented">
          <k-segmented-button
            v-for="availability in availabilityValues"
            :key="availability"
            :active="workCompany.availability === availability"
            :disabled="
              !companies.workContext.permissions.canSetAvailability ||
              companies.mutating
            "
            @click="setCompanyAvailability(availability)"
          >
            {{ phone.t(`Apps.companies.availability.${availability}`) }}
          </k-segmented-button>
        </k-segmented>

        <k-list inset strong>
          <k-list-item
            v-if="companies.workContext.permissions.canTakeCalls"
            :title="phone.t('Apps.companies.work.takeCalls')"
            :subtitle="phone.t('Apps.companies.work.takeCallsBody')"
          >
            <template #media><PhoneCall :size="20" /></template>
            <template #after>
              <k-toggle
                :checked="companies.workContext.callAvailable"
                :disabled="companies.mutating"
                :aria-label="phone.t('Apps.companies.work.takeCalls')"
                @change="toggleCallAvailability"
              />
            </template>
          </k-list-item>
          <k-list-item
            v-if="companies.workContext.role === 'manager'"
            link
            link-component="button"
            :link-props="{ type: 'button' }"
            :title="phone.t('Apps.companies.manager.title')"
            :subtitle="phone.t('Apps.companies.manager.subtitle')"
            @click="openManager"
          >
            <template #media><Settings2 :size="20" /></template>
          </k-list-item>
        </k-list>

        <k-block-title>{{
          phone.t('Apps.companies.work.overview')
        }}</k-block-title>
        <div class="work-metrics">
          <k-glass :highlight="false" class="work-metric">
            <strong>{{ companies.workContext.metrics.new }}</strong>
            <span>{{ phone.t('Apps.companies.work.metrics.new') }}</span>
          </k-glass>
          <k-glass :highlight="false" class="work-metric">
            <strong>{{ companies.workContext.metrics.assigned }}</strong>
            <span>{{ phone.t('Apps.companies.work.metrics.assigned') }}</span>
          </k-glass>
          <k-glass :highlight="false" class="work-metric">
            <strong>{{ companies.workContext.metrics.waiting }}</strong>
            <span>{{ phone.t('Apps.companies.work.metrics.waiting') }}</span>
          </k-glass>
          <k-glass :highlight="false" class="work-metric">
            <strong>{{ companies.workContext.metrics.completedToday }}</strong>
            <span>{{
              phone.t('Apps.companies.work.metrics.completedToday')
            }}</span>
          </k-glass>
        </div>
      </template>
    </section>

    <section
      v-else-if="screen === 'company'"
      class="companies-content company-profile"
    >
      <k-block
        v-if="companies.directoryLoading && !activeCompany"
        inset
        strong
        class="companies-state"
      >
        <k-preloader />
        <span>{{ phone.t('Apps.companies.loading.profile') }}</span>
      </k-block>
      <k-block
        v-else-if="companies.directoryError || !activeCompany"
        inset
        strong
        class="companies-state"
      >
        <CircleAlert :size="34" />
        <strong>{{ phone.t('Apps.companies.states.profileError') }}</strong>
        <p>{{ errorText(companies.directoryError) }}</p>
        <k-button rounded @click="goBack">{{
          phone.t('Apps.companies.back')
        }}</k-button>
      </k-block>
      <template v-else>
        <div
          class="company-cover"
          :style="
            activeCompany.coverUrl
              ? { backgroundImage: `url(${activeCompany.coverUrl})` }
              : undefined
          "
        >
          <span class="company-logo company-logo--hero">
            <img
              v-if="activeCompany.logoUrl"
              :src="activeCompany.logoUrl"
              :alt="activeCompany.name"
            />
            <span v-else>{{ companyInitials(activeCompany) }}</span>
          </span>
        </div>
        <k-block class="company-profile-heading">
          <span class="company-profile-heading__eyebrow">
            {{
              categoryLabel(
                activeCompany.categoryId,
                activeCompany.categoryName,
              )
            }}
            <BadgeCheck
              v-if="activeCompany.verified"
              :size="15"
              :aria-label="phone.t('Apps.companies.verified')"
            />
          </span>
          <h1>{{ activeCompany.name }}</h1>
          <k-badge :class="statusClass(activeCompany.availability)">
            {{
              phone.t(
                `Apps.companies.availability.${activeCompany.availability}`,
              )
            }}
          </k-badge>
          <small>
            {{
              phone.t('Apps.companies.profile.updated', {
                time: relativeTime(activeCompany.availabilityUpdatedAt),
              })
            }}
          </small>
          <p>{{ activeCompany.description }}</p>
        </k-block>

        <k-card v-if="activeCompany.announcement" class="company-announcement">
          <Megaphone :size="20" />
          <span>
            <strong>{{
              phone.t('Apps.companies.profile.announcement')
            }}</strong>
            <span>{{ activeCompany.announcement.body }}</span>
          </span>
        </k-card>

        <k-block-title>{{
          phone.t('Apps.companies.profile.location')
        }}</k-block-title>
        <k-list inset strong>
          <k-list-item
            v-if="activeCompany.location"
            :title="activeCompany.location.label"
            :subtitle="`${activeCompany.location.address} · ${activeCompany.location.district}`"
          >
            <template #media><MapPin :size="20" /></template>
          </k-list-item>
          <k-list-item
            v-else
            :title="phone.t('Apps.companies.profile.noLocation')"
          >
            <template #media><MapPin :size="20" /></template>
          </k-list-item>
        </k-list>

        <k-block-title>{{
          phone.t('Apps.companies.profile.hours')
        }}</k-block-title>
        <k-list inset strong>
          <k-list-item
            v-for="hours in activeCompany.hours"
            :key="hours.day"
            :title="phone.t(`Apps.companies.days.${weekdayKeys[hours.day]}`)"
            :after="
              hours.isClosed
                ? phone.t('Apps.companies.profile.closed')
                : `${hours.opensAt}–${hours.closesAt}`
            "
          >
            <template #media><Clock3 :size="19" /></template>
          </k-list-item>
          <k-list-item
            v-if="!activeCompany.hours.length"
            :title="phone.t('Apps.companies.profile.byAvailability')"
          />
        </k-list>

        <k-block-title>{{
          phone.t('Apps.companies.profile.services')
        }}</k-block-title>
        <k-list inset strong>
          <k-list-item
            v-for="service in activeCompany.services.filter(
              (item) => item.active,
            )"
            :key="service.id"
            :title="service.title"
            :subtitle="service.description"
            :after="service.priceText ?? undefined"
          />
          <k-list-item
            v-if="!activeCompany.services.some((service) => service.active)"
            :title="phone.t('Apps.companies.profile.noServices')"
          />
        </k-list>

        <k-glass :highlight="false" class="company-profile-actions">
          <k-button
            rounded
            :disabled="!activeCompany.canCall || !activeCompany.phoneNumber"
            @click="callNumber(activeCompany.phoneNumber)"
          >
            <Phone :size="17" />{{ phone.t('Apps.companies.profile.call') }}
          </k-button>
          <k-button
            rounded
            outline
            :disabled="!activeCompany.canMessage || !activeCompany.phoneNumber"
            @click="messageCompany(activeCompany)"
          >
            <MessageCircle :size="17" />{{
              phone.t('Apps.companies.profile.message')
            }}
          </k-button>
          <k-button
            rounded
            outline
            :disabled="!activeCompany.location"
            @click="setRoute(activeCompany)"
          >
            <MapPin :size="17" />{{ phone.t('Apps.companies.profile.route') }}
          </k-button>
          <k-button
            rounded
            :disabled="!activeCompany.acceptsRequests"
            @click="openRequestComposer(activeCompany)"
          >
            <ClipboardList :size="17" />{{
              phone.t('Apps.companies.profile.request')
            }}
          </k-button>
          <k-button rounded outline @click="shareCompany(activeCompany)">
            <Share2 :size="17" />{{ phone.t('Apps.easyShare.share') }}
          </k-button>
        </k-glass>
      </template>
    </section>

    <section
      v-else-if="screen === 'request'"
      class="companies-content request-thread"
    >
      <k-block
        v-if="companies.requestLoading"
        inset
        strong
        class="companies-state"
      >
        <k-preloader />
        <span>{{ phone.t('Apps.companies.loading.request') }}</span>
      </k-block>
      <k-block
        v-else-if="companies.requestError || !companies.request"
        inset
        strong
        class="companies-state"
      >
        <CircleAlert :size="34" />
        <strong>{{ phone.t('Apps.companies.states.requestError') }}</strong>
        <p>{{ errorText(companies.requestError) }}</p>
        <k-button rounded @click="goBack">{{
          phone.t('Apps.companies.back')
        }}</k-button>
      </k-block>
      <template v-else>
        <div class="request-thread-scroll">
          <k-card class="request-summary-card">
            <span>
              <small>{{ companies.request.companyName }}</small>
              <strong>{{ companies.request.subject }}</strong>
            </span>
            <k-badge :class="statusClass(companies.request.status)">
              {{
                phone.t(
                  `Apps.companies.requestStatuses.${companies.request.status}`,
                )
              }}
            </k-badge>
            <p>{{ companies.request.description }}</p>
            <span class="request-summary-card__meta">
              {{
                companies.request.serviceName ??
                phone.t('Apps.companies.requests.generalService')
              }}
              · {{ formatDate(companies.request.createdAt) }}
            </span>
          </k-card>

          <div
            v-if="companies.request.media.length"
            class="request-media-strip"
            :aria-label="phone.t('Apps.companies.requests.attachments')"
          >
            <img
              v-for="media in companies.request.media"
              :key="media.id"
              :src="media.url"
              :alt="phone.t('Apps.companies.requests.attachedPhoto')"
              draggable="false"
              loading="lazy"
              referrerpolicy="no-referrer"
            />
          </div>

          <k-block-title>{{
            phone.t('Apps.companies.requests.timeline')
          }}</k-block-title>
          <div class="request-timeline">
            <div v-for="event in companies.request.events" :key="event.id">
              <span><Check :size="12" /></span>
              <p>
                <strong>{{ eventLabel(event) }}</strong>
                <small>{{ formatDate(event.createdAt) }}</small>
              </p>
            </div>
          </div>

          <k-block-title>{{
            phone.t('Apps.companies.requests.conversation')
          }}</k-block-title>
          <k-messages class="company-messages">
            <k-messages-title v-if="!companies.request.messages.length">
              {{ phone.t('Apps.companies.requests.noMessages') }}
            </k-messages-title>
            <k-message
              v-for="message in companies.request.messages"
              :key="message.id"
              :type="message.isMine ? 'sent' : 'received'"
              :name="messageAuthorLabel(message.authorLabel)"
              :text="message.body"
              :text-footer="formatDate(message.createdAt)"
            />
          </k-messages>

          <div class="request-thread-actions">
            <k-button
              v-if="companies.request.actions.canCall"
              outline
              rounded
              @click="callRequestParty"
            >
              <Phone :size="16" />{{ phone.t('Apps.companies.requests.call') }}
            </k-button>
            <k-button
              v-if="companies.request.actions.canCancel"
              outline
              rounded
              class="is-danger"
              @click="cancelDialogOpened = true"
            >
              <X :size="16" />{{ phone.t('Apps.companies.requests.cancel') }}
            </k-button>
          </div>
        </div>
        <k-messagebar
          v-if="companies.request.actions.canReply"
          class="company-messagebar"
          :disabled="companies.mutating"
          :placeholder="phone.t('Apps.companies.requests.replyPlaceholder')"
          :value="threadDraft"
          @input="threadDraft = messagebarValue($event)"
          @keydown.enter.exact="handleEnterAction($event, sendThreadMessage)"
        >
          <template #right>
            <k-toolbar-pane class="ios:h-10">
              <k-link
                component="button"
                icon-only
                :disabled="!canSendThreadMessage"
                :aria-label="phone.t('Apps.companies.requests.sendReply')"
                :link-props="{ type: 'button' }"
                @click="sendThreadMessage"
              >
                <Send :size="22" />
              </k-link>
            </k-toolbar-pane>
          </template>
        </k-messagebar>
      </template>
    </section>

    <section
      v-else-if="screen === 'manager' && workCompany"
      class="companies-content manager-screen"
    >
      <k-card class="manager-intro">
        <Settings2 :size="24" />
        <span>
          <strong>{{ workCompany.name }}</strong>
          <span>{{
            phone.t('Apps.companies.manager.revision', {
              revision: String(workCompany.revision),
            })
          }}</span>
        </span>
      </k-card>

      <k-block-title>{{
        phone.t('Apps.companies.manager.availability')
      }}</k-block-title>
      <k-segmented strong rounded class="availability-segmented">
        <k-segmented-button
          v-for="availability in availabilityValues"
          :key="availability"
          :active="workCompany.availability === availability"
          :disabled="
            !companies.workContext?.permissions.canSetAvailability ||
            companies.mutating
          "
          @click="setCompanyAvailability(availability)"
        >
          {{ phone.t(`Apps.companies.availability.${availability}`) }}
        </k-segmented-button>
      </k-segmented>

      <template v-if="companies.workContext?.permissions.canManageProfile">
        <k-block-title>{{
          phone.t('Apps.companies.manager.profile')
        }}</k-block-title>
        <div class="manager-media-grid">
          <k-button
            tonal
            rounded
            large
            class="manager-media-button"
            @click="chooseManagerMedia('cover')"
          >
            <img
              v-if="managerCoverUrl"
              :src="managerCoverUrl"
              :alt="phone.t('Apps.companies.manager.coverPhoto')"
              loading="lazy"
            />
            <span v-else><ImagePlus :size="22" /></span>
            <small>{{ phone.t('Apps.companies.manager.chooseCover') }}</small>
          </k-button>
          <k-button
            tonal
            rounded
            large
            class="manager-media-button"
            @click="chooseManagerMedia('logo')"
          >
            <img
              v-if="managerLogoUrl"
              :src="managerLogoUrl"
              :alt="phone.t('Apps.companies.manager.logoPhoto')"
              loading="lazy"
            />
            <span v-else><ImagePlus :size="22" /></span>
            <small>{{ phone.t('Apps.companies.manager.chooseLogo') }}</small>
          </k-button>
        </div>
        <k-list inset strong class="manager-form-list">
          <k-list-input
            outline
            type="textarea"
            maxlength="500"
            :label="phone.t('Apps.companies.manager.description')"
            :placeholder="
              phone.t('Apps.companies.manager.descriptionPlaceholder')
            "
            :value="profileDraft.description"
            @input="profileDraft.description = eventValue($event)"
          />
          <k-list-input
            outline
            type="tel"
            readonly
            :label="phone.t('Apps.companies.manager.phoneNumber')"
            :info="phone.t('Apps.companies.manager.phoneNumberManaged')"
            :value="
              workCompany.phoneNumber ??
              phone.t('Apps.companies.manager.noPhoneNumber')
            "
          />
          <k-list-input
            outline
            maxlength="80"
            :label="phone.t('Apps.companies.manager.locationLabel')"
            :value="profileDraft.locationLabel"
            @input="profileDraft.locationLabel = eventValue($event)"
          />
          <k-list-input
            outline
            maxlength="120"
            :label="phone.t('Apps.companies.manager.address')"
            :value="profileDraft.address"
            @input="profileDraft.address = eventValue($event)"
          />
          <k-list-input
            outline
            maxlength="80"
            :label="phone.t('Apps.companies.manager.district')"
            :value="profileDraft.district"
            @input="profileDraft.district = eventValue($event)"
          />
          <k-list-item
            :title="phone.t('Apps.companies.manager.acceptRequests')"
            :subtitle="phone.t('Apps.companies.manager.acceptRequestsBody')"
          >
            <template #after>
              <k-toggle
                :checked="profileDraft.acceptsRequests"
                :aria-label="phone.t('Apps.companies.manager.acceptRequests')"
                @change="
                  profileDraft.acceptsRequests = !profileDraft.acceptsRequests
                "
              />
            </template>
          </k-list-item>
        </k-list>
        <k-button
          outline
          rounded
          class="manager-location"
          :disabled="companies.mutating"
          @click="useCurrentLocation"
        >
          <Compass :size="16" />{{
            phone.t('Apps.companies.manager.useCurrentLocation')
          }}
        </k-button>
        <small v-if="profileCoords" class="manager-location-status">
          {{ phone.t('Apps.companies.manager.locationReady') }}
        </small>
        <k-button
          rounded
          class="manager-save"
          :disabled="companies.mutating"
          @click="saveProfile"
        >
          {{ phone.t('Apps.companies.manager.saveProfile') }}
        </k-button>
      </template>

      <template v-if="companies.workContext?.permissions.canManageHours">
        <k-block-title>{{
          phone.t('Apps.companies.manager.hours')
        }}</k-block-title>
        <k-card
          v-for="(hours, index) in hoursDraft"
          :key="hours.day"
          class="manager-hours-card"
          :content-wrap="false"
        >
          <k-list nested>
            <k-list-item
              :title="phone.t(`Apps.companies.days.${weekdayKeys[hours.day]}`)"
            >
              <template #after>
                <k-toggle
                  :checked="!hours.isClosed"
                  :aria-label="phone.t('Apps.companies.manager.dayOpen')"
                  @change="hours.isClosed = !hours.isClosed"
                />
              </template>
            </k-list-item>
            <template v-if="!hours.isClosed">
              <k-list-input
                outline
                type="time"
                :label="phone.t('Apps.companies.manager.opensAt')"
                :value="hours.opensAt"
                @input="updateHour(index, 'opensAt', $event)"
              />
              <k-list-input
                outline
                type="time"
                :label="phone.t('Apps.companies.manager.closesAt')"
                :value="hours.closesAt"
                @input="updateHour(index, 'closesAt', $event)"
              />
            </template>
          </k-list>
        </k-card>
        <k-button
          rounded
          class="manager-save"
          :disabled="companies.mutating"
          @click="saveHours"
        >
          {{ phone.t('Apps.companies.manager.saveHours') }}
        </k-button>
      </template>

      <template v-if="companies.workContext?.permissions.canManageServices">
        <k-block-title>{{
          phone.t('Apps.companies.manager.services')
        }}</k-block-title>
        <k-card
          v-for="(service, index) in servicesDraft"
          :key="`${service.id}-${index}`"
          class="manager-service-card"
          :content-wrap="false"
        >
          <k-list nested>
            <k-list-input
              outline
              maxlength="80"
              :label="phone.t('Apps.companies.manager.serviceTitle')"
              :value="service.title"
              @input="updateService(index, 'title', $event)"
            />
            <k-list-input
              outline
              maxlength="240"
              :label="phone.t('Apps.companies.manager.serviceDescription')"
              :value="service.description"
              @input="updateService(index, 'description', $event)"
            />
            <k-list-input
              outline
              maxlength="40"
              :label="phone.t('Apps.companies.manager.priceText')"
              :value="service.priceText ?? ''"
              @input="updateService(index, 'priceText', $event)"
            />
            <k-list-item
              :title="phone.t('Apps.companies.manager.serviceActive')"
            >
              <template #after>
                <k-toggle
                  :checked="service.active"
                  :aria-label="phone.t('Apps.companies.manager.serviceActive')"
                  @change="service.active = !service.active"
                />
              </template>
            </k-list-item>
            <k-list-item
              :title="phone.t('Apps.companies.manager.serviceRequests')"
            >
              <template #after>
                <k-toggle
                  :checked="service.acceptsRequests"
                  :aria-label="
                    phone.t('Apps.companies.manager.serviceRequests')
                  "
                  @change="service.acceptsRequests = !service.acceptsRequests"
                />
              </template>
            </k-list-item>
          </k-list>
          <k-button
            outline
            rounded
            class="manager-remove"
            @click="removeService(index)"
          >
            <Trash2 :size="15" />{{
              phone.t('Apps.companies.manager.removeService')
            }}
          </k-button>
        </k-card>
        <k-button outline rounded class="manager-save" @click="addService">
          <Plus :size="16" />{{ phone.t('Apps.companies.manager.addService') }}
        </k-button>
        <k-button
          rounded
          class="manager-save"
          :disabled="companies.mutating"
          @click="saveServices"
        >
          {{ phone.t('Apps.companies.manager.saveServices') }}
        </k-button>
      </template>

      <template v-if="companies.workContext?.permissions.canManageAnnouncement">
        <k-block-title>{{
          phone.t('Apps.companies.manager.announcement')
        }}</k-block-title>
        <k-list inset strong class="manager-form-list">
          <k-list-input
            outline
            type="textarea"
            maxlength="280"
            :label="phone.t('Apps.companies.manager.announcementText')"
            :placeholder="
              phone.t('Apps.companies.manager.announcementPlaceholder')
            "
            :value="announcementDraft.body"
            @input="announcementDraft.body = eventValue($event)"
          />
          <k-list-input
            outline
            type="datetime-local"
            :label="phone.t('Apps.companies.manager.expiresAt')"
            :value="announcementDraft.expiresAt"
            @input="announcementDraft.expiresAt = eventValue($event)"
          />
        </k-list>
        <k-button
          rounded
          class="manager-save"
          :disabled="companies.mutating"
          @click="publishAnnouncement"
        >
          <Megaphone :size="16" />{{
            phone.t('Apps.companies.manager.publish')
          }}
        </k-button>
      </template>
    </section>

    <k-tabbar
      v-if="screen === 'root'"
      component="nav"
      icons
      labels
      class="companies-tabbar bottom-0 left-0 fixed"
      :aria-label="phone.t('Apps.companies.navigation')"
    >
      <k-toolbar-pane>
        <k-tabbar-link
          component="button"
          :active="activeTab === 'directory'"
          :link-props="{ type: 'button' }"
          @click="selectTab('directory')"
        >
          <template #label>{{
            phone.t('Apps.companies.tabs.directory')
          }}</template>
          <template #icon
            ><k-icon><Compass class="w-7 h-7" /></k-icon
          ></template>
        </k-tabbar-link>
        <k-tabbar-link
          component="button"
          :active="activeTab === 'requests'"
          :link-props="{ type: 'button' }"
          @click="selectTab('requests')"
        >
          <template #label>{{
            phone.t('Apps.companies.tabs.requests')
          }}</template>
          <template #icon>
            <span class="companies-tab-icon">
              <k-icon><ClipboardList class="w-7 h-7" /></k-icon>
              <k-badge v-if="companies.customerUnreadCount">{{
                companies.customerUnreadCount
              }}</k-badge>
            </span>
          </template>
        </k-tabbar-link>
        <k-tabbar-link
          component="button"
          :active="activeTab === 'work'"
          :link-props="{ type: 'button' }"
          @click="selectTab('work')"
        >
          <template #label>{{ phone.t('Apps.companies.tabs.work') }}</template>
          <template #icon>
            <span class="companies-tab-icon">
              <k-icon><BriefcaseBusiness class="w-7 h-7" /></k-icon>
              <k-badge v-if="companies.workUnreadCount">{{
                companies.workUnreadCount
              }}</k-badge>
            </span>
          </template>
        </k-tabbar-link>
      </k-toolbar-pane>
    </k-tabbar>

    <div class="companies-sheet">
      <k-sheet
        :opened="requestSheetOpened"
        @backdropclick="requestSheetOpened = false"
      >
      <section
        v-if="requestSheetOpened && activeCompany"
        ref="requestSheetContent"
        class="companies-sheet__content"
        role="dialog"
        aria-modal="true"
      >
        <header>
          <span><ClipboardList :size="23" /></span>
          <div>
            <small>{{ activeCompany.name }}</small>
            <h2>{{ phone.t('Apps.companies.composer.title') }}</h2>
          </div>
          <k-link
            component="button"
            icon-only
            :aria-label="phone.t('Apps.companies.close')"
            :link-props="{ type: 'button' }"
            @click="requestSheetOpened = false"
          >
            <X :size="19" />
          </k-link>
        </header>
        <k-progressbar :progress="requestProgress" />
        <k-block-title class="composer-service-title">{{
          phone.t('Apps.companies.composer.chooseService')
        }}</k-block-title>
        <k-list inset strong class="composer-service-list">
          <k-list-item
            v-for="service in activeCompany.services.filter(
              (item) => item.active && item.acceptsRequests,
            )"
            :key="service.id"
            label
            :title="service.title"
            :subtitle="service.description"
            title-font-size-ios="text-[15px]"
            title-font-size-material="text-[15px]"
            media-class="!py-2.5 !me-3"
            inner-class="!py-2.5 !pe-safe-3"
            title-wrap-class="!min-h-5"
          >
            <template #media>
              <k-radio
                name="company-request-service"
                :value="service.id"
                :checked="requestServiceId === service.id"
                @change="requestServiceId = service.id"
              />
            </template>
            <template v-if="service.priceText" #after>
              <span class="composer-service-price">{{
                service.priceText
              }}</span>
            </template>
          </k-list-item>
        </k-list>
        <k-list inset strong class="composer-form-list">
          <k-list-input
            outline
            maxlength="100"
            :label="phone.t('Apps.companies.composer.subject')"
            :placeholder="phone.t('Apps.companies.composer.subjectPlaceholder')"
            :value="requestSubject"
            :input-style="{ height: '38px' }"
            @input="requestSubject = eventValue($event)"
          />
          <k-list-input
            outline
            type="textarea"
            maxlength="1200"
            :label="phone.t('Apps.companies.composer.description')"
            :placeholder="
              phone.t('Apps.companies.composer.descriptionPlaceholder')
            "
            :value="requestDescription"
            :input-style="{
              height: '72px',
              lineHeight: '20px',
              paddingBottom: '8px',
              paddingTop: '8px',
              resize: 'none',
            }"
            @input="requestDescription = eventValue($event)"
          />
        </k-list>
        <k-card class="composer-contact-card">
          <Phone :size="18" />
          <span>
            <strong>{{ phone.t('Apps.companies.composer.contact') }}</strong>
            <span v-if="phone.device?.sim?.registered">
              {{
                phone.t('Apps.companies.composer.registeredSim', {
                  number: maskedPhoneNumber(phone.device.sim.number),
                })
              }}
            </span>
            <span v-else>{{
              phone.t('Apps.companies.composer.registeredSimRequired')
            }}</span>
          </span>
        </k-card>
        <k-button
          outline
          rounded
          :disabled="requestMedia.length >= 3"
          @click="chooseRequestMedia"
        >
          <ImagePlus :size="17" />
          {{
            phone.t('Apps.companies.composer.addPhotos', {
              count: String(requestMedia.length),
            })
          }}
        </k-button>
        <div v-if="requestMedia.length" class="composer-media-strip">
          <span v-for="media in requestMedia" :key="media.id">
            <img
              :src="media.url"
              :alt="phone.t('Apps.companies.composer.selectedPhoto')"
            />
            <k-button
              rounded
              :aria-label="phone.t('Apps.companies.composer.removePhoto')"
              @click="removeRequestMedia(media.id)"
            >
              <X :size="13" />
            </k-button>
          </span>
        </div>
        <k-button
          large
          rounded
          :disabled="!canSubmitRequest || companies.mutating"
          @click="submitRequest"
        >
          <k-preloader v-if="companies.mutating" />
          <span v-else>{{ phone.t('Apps.companies.composer.send') }}</span>
        </k-button>
      </section>
      </k-sheet>
    </div>

    <k-actions
      v-if="workActionsOpened"
      :opened="workActionsOpened"
      @backdropclick="workActionsOpened = false"
    >
      <k-actions-group v-if="companies.request">
        <k-actions-button
          v-if="companies.request.actions.canClaim"
          @click="claimActiveRequest"
        >
          {{ phone.t('Apps.companies.workActions.claim') }}
        </k-actions-button>
        <k-actions-button
          v-if="companies.request.actions.canAssign"
          @click="openAssignment"
        >
          {{ phone.t('Apps.companies.workActions.assign') }}
        </k-actions-button>
        <k-actions-button
          v-if="companies.request.actions.canCall"
          @click="callRequestParty"
        >
          {{ phone.t('Apps.companies.workActions.callCustomer') }}
        </k-actions-button>
        <k-actions-button
          v-for="status in companies.request.actions.allowedStatuses"
          :key="status"
          @click="updateActiveRequestStatus(status)"
        >
          {{
            phone.t('Apps.companies.workActions.setStatus', {
              status: phone.t(`Apps.companies.requestStatuses.${status}`),
            })
          }}
        </k-actions-button>
      </k-actions-group>
      <k-actions-group>
        <k-actions-button bold @click="workActionsOpened = false">
          {{ phone.t('Apps.companies.close') }}
        </k-actions-button>
      </k-actions-group>
    </k-actions>

    <div class="companies-sheet companies-assignment-sheet">
      <k-sheet
        :opened="assignmentSheetOpened"
        @backdropclick="assignmentSheetOpened = false"
      >
      <section
        v-if="assignmentSheetOpened"
        class="companies-sheet__content"
        role="dialog"
        aria-modal="true"
      >
        <header>
          <span><UsersRound :size="23" /></span>
          <div>
            <h2>{{ phone.t('Apps.companies.assignment.title') }}</h2>
          </div>
          <k-link
            component="button"
            icon-only
            :aria-label="phone.t('Apps.companies.close')"
            :link-props="{ type: 'button' }"
            @click="assignmentSheetOpened = false"
          >
            <X :size="19" />
          </k-link>
        </header>
        <k-block
          v-if="companies.membersLoading"
          inset
          strong
          class="companies-state companies-state--compact"
        >
          <k-preloader />
        </k-block>
        <k-list v-else inset strong>
          <k-list-item
            v-for="member in companies.members"
            :key="member.id"
            label
            :title="memberName(member.name)"
            :subtitle="`${member.role} · ${phone.t(`Apps.companies.assignment.${member.online ? 'online' : 'offline'}`)}`"
          >
            <template #media
              ><span class="member-avatar"><UserRound :size="18" /></span
            ></template>
            <template #after>
              <k-radio
                name="company-member"
                :value="member.id"
                :checked="selectedMemberId === member.id"
                :disabled="!member.online"
                @change="selectedMemberId = member.id"
              />
            </template>
          </k-list-item>
        </k-list>
        <k-button
          large
          rounded
          :disabled="!selectedMemberId || companies.mutating"
          @click="assignActiveRequest"
        >
          {{ phone.t('Apps.companies.assignment.confirm') }}
        </k-button>
      </section>
      </k-sheet>
    </div>

    <k-dialog
      :opened="cancelDialogOpened"
      :title="phone.t('Apps.companies.requests.cancelTitle')"
      :content="phone.t('Apps.companies.requests.cancelBody')"
      @backdropclick="cancelDialogOpened = false"
    >
      <template #buttons>
        <k-dialog-button @click="cancelDialogOpened = false">
          {{ phone.t('Apps.companies.requests.keep') }}
        </k-dialog-button>
        <k-dialog-button
          strong
          :disabled="companies.mutating"
          @click="cancelActiveRequest"
        >
          {{ phone.t('Apps.companies.requests.cancelConfirm') }}
        </k-dialog-button>
      </template>
    </k-dialog>

    <k-dialog
      :opened="conflictDialogOpened"
      :title="phone.t('Apps.companies.conflict.title')"
      :content="phone.t('Apps.companies.conflict.body')"
      @backdropclick="conflictDialogOpened = false"
    >
      <template #buttons>
        <k-dialog-button @click="conflictDialogOpened = false">
          {{ phone.t('Apps.companies.close') }}
        </k-dialog-button>
        <k-dialog-button strong @click="reloadConflict">
          {{ phone.t('Apps.companies.conflict.reload') }}
        </k-dialog-button>
      </template>
    </k-dialog>

    <k-toast
      :opened="toastOpened"
      position="center"
      @click="toastOpened = false"
    >
      {{ toastText }}
    </k-toast>
  </k-page>
</template>

<style scoped>
.companies-app {
  --company-blue: #3b82f6;
  --company-cyan: #38bdf8;
  --company-green: #22c55e;
  --company-orange: #f59e0b;
  --company-red: #ef4444;
  --k-safe-area-top: 46px;
  --k-safe-area-bottom: 25px;
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #111827;
}

.companies-app--dark {
  color: #f8fafc;
}

.companies-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 12% 4%, rgb(56 189 248 / 16%), transparent 30%),
    radial-gradient(circle at 88% 34%, rgb(59 130 246 / 13%), transparent 32%),
    linear-gradient(180deg, #eff7ff 0%, #f6f8fb 45%, #eef2f7 100%);
}

.companies-app--dark .companies-backdrop {
  background:
    radial-gradient(circle at 12% 4%, rgb(56 189 248 / 13%), transparent 30%),
    radial-gradient(circle at 88% 34%, rgb(59 130 246 / 11%), transparent 32%),
    linear-gradient(180deg, #07111f 0%, #0b1220 52%, #111827 100%);
}

.companies-content {
  position: relative;
  z-index: 1;
  min-height: 0;
  padding: 10px 10px calc(var(--k-safe-area-bottom) + 88px);
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.companies-navbar {
  flex: none;
}

.companies-content::-webkit-scrollbar,
.companies-chip-row::-webkit-scrollbar,
.companies-featured-row::-webkit-scrollbar {
  display: none;
}

.companies-search-wrap {
  margin: 0 -4px 8px;
}

.companies-chip-row {
  display: flex;
  gap: 7px;
  padding: 2px 2px 9px;
  overflow-x: auto;
  scrollbar-width: none;
}

.companies-chip-row :deep(.k-chip) {
  flex: none;
  white-space: nowrap;
}

.companies-chip-row :deep(.is-selected) {
  color: white;
  background: linear-gradient(135deg, var(--company-blue), var(--company-cyan));
}

.work-identity-card,
.manager-intro,
.request-summary-card,
.composer-contact-card,
.company-announcement {
  margin: 0 0 12px;
  border: 1px solid rgb(255 255 255 / 58%);
  border-radius: 18px;
  background: rgb(255 255 255 / 68%);
  box-shadow: 0 12px 30px rgb(24 56 93 / 8%);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
}

.companies-app--dark .work-identity-card,
.companies-app--dark .manager-intro,
.companies-app--dark .request-summary-card,
.companies-app--dark .composer-contact-card,
.companies-app--dark .company-announcement {
  border-color: rgb(255 255 255 / 8%);
  background: rgb(20 30 46 / 70%);
}

.companies-state {
  min-height: 260px;
  margin: 14px 6px;
  padding: 36px 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: #64748b;
  text-align: center;
}

.companies-state strong {
  color: inherit;
  font-size: 16px;
}

.companies-state p {
  max-width: 260px;
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
}

.companies-state--compact {
  min-height: 150px;
  padding: 20px;
}

.companies-featured-row {
  display: flex;
  gap: 9px;
  padding: 0 2px 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.company-feature-card {
  width: 145px;
  min-width: 145px;
  margin: 0;
  text-align: left;
}

.company-feature-card :deep(> *) {
  padding: 12px;
  display: grid;
  gap: 6px;
}

.company-feature-card strong {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.company-feature-card :deep(> *) > span {
  color: #64748b;
  font-size: 10px;
}

.company-list,
.company-request-list {
  margin-top: 6px;
}

.company-list :deep(.k-list-item > button),
.company-request-list :deep(.k-list-item > button) {
  width: 100%;
  text-align: left;
}

.companies-content :deep(.k-block-title) {
  margin-bottom: 10px;
}

.company-logo {
  width: 42px;
  height: 42px;
  display: grid;
  flex: none;
  place-items: center;
  overflow: hidden;
  border-radius: 13px;
  color: white;
  background: linear-gradient(145deg, var(--company-blue), var(--company-cyan));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 42%);
  font-size: 13px;
  font-weight: 800;
}

.company-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.company-logo--small {
  width: 36px;
  height: 36px;
  border-radius: 11px;
}

.company-logo--large {
  width: 54px;
  height: 54px;
  border-radius: 17px;
}

.company-row-after,
.request-row-after {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.company-row-after small {
  max-width: 82px;
  overflow: hidden;
  color: #94a3b8;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.k-badge) {
  min-width: 0;
  border-radius: 999px;
  font-size: 8px;
  line-height: 1.2;
}

:deep(.k-badge.is-available),
:deep(.k-badge.is-completed) {
  color: #047857;
  background: #d1fae5;
}

:deep(.k-badge.is-busy),
:deep(.k-badge.is-waiting-customer) {
  color: #b45309;
  background: #fef3c7;
}

:deep(.k-badge.is-closed),
:deep(.k-badge.is-cancelled) {
  color: #b91c1c;
  background: #fee2e2;
}

:deep(.k-badge.is-new),
:deep(.k-badge.is-assigned),
:deep(.k-badge.is-in-progress),
:deep(.k-badge.is-unread) {
  color: #1d4ed8;
  background: #dbeafe;
}

.companies-load-more,
.manager-save {
  width: calc(100% - 20px);
  margin: 14px 10px 4px;
}

.companies-segment-wrap,
.availability-segmented {
  margin: 4px 6px 14px;
}

.company-request-icon,
.member-avatar {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: var(--company-blue);
  background: rgb(59 130 246 / 13%);
}

.work-identity-card :deep(> *),
.manager-intro :deep(> *),
.composer-contact-card :deep(> *),
.company-announcement :deep(> *) {
  display: flex;
  align-items: center;
  gap: 11px;
}

.work-identity-card :deep(> *) > span:nth-child(2),
.manager-intro :deep(> *) > span,
.composer-contact-card :deep(> *) > span,
.company-announcement :deep(> *) > span {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.work-identity-card small,
.manager-intro span span,
.composer-contact-card span span,
.company-announcement span span {
  color: #64748b;
  font-size: 10px;
}

.work-identity-card strong {
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 0 5px 14px;
}

.work-metric {
  margin: 0;
  padding: 15px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-radius: 16px;
}

.work-metrics strong {
  color: var(--company-blue);
  font-size: 24px;
}

.work-metrics span {
  color: #64748b;
  font-size: 10px;
}

.company-cover {
  height: 145px;
  margin: -10px -10px 0;
  display: flex;
  align-items: flex-end;
  padding: 14px;
  background:
    linear-gradient(180deg, transparent, rgb(15 23 42 / 48%)),
    linear-gradient(135deg, #1d4ed8, #38bdf8 58%, #67e8f9);
  background-position: center;
  background-size: cover;
}

.company-logo--hero {
  width: 66px;
  height: 66px;
  border: 3px solid rgb(255 255 255 / 88%);
  border-radius: 20px;
  font-size: 18px;
}

.company-profile-heading {
  margin-top: 10px;
}

.company-profile-heading__eyebrow {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--company-blue);
  font-size: 11px;
  font-weight: 700;
}

.company-profile-heading h1 {
  margin: 3px 0 6px;
  font-size: 24px;
  line-height: 1.1;
}

.company-profile-heading small {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 9px;
}

.company-profile-heading p {
  margin: 12px 0 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.5;
}

.company-profile {
  padding-bottom: calc(var(--k-safe-area-bottom) + 24px);
}

.company-profile > :deep(.k-block-title) {
  margin-top: 18px;
  margin-bottom: 6px;
}

.company-profile > :deep(.k-list) {
  margin-top: 8px;
  margin-bottom: 10px;
}

.companies-app--dark .company-profile-heading p,
.companies-app--dark .work-identity-card small,
.companies-app--dark .manager-intro span span,
.companies-app--dark .composer-contact-card span span,
.companies-app--dark .company-announcement span span,
.companies-app--dark .work-metrics span {
  color: #94a3b8;
}

.company-announcement {
  color: var(--company-blue);
}

.company-profile-actions {
  position: relative;
  z-index: 4;
  margin: 18px 0 0;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 7px;
  border: 1px solid rgb(255 255 255 / 45%);
  border-radius: 20px;
}

.companies-app--dark .company-profile-actions {
  border-color: rgb(255 255 255 / 8%);
}

.request-thread {
  padding: 8px 0 0;
  overflow: hidden;
}

.request-thread-scroll {
  height: 100%;
  padding: 4px 10px 88px;
  overflow-y: auto;
  scrollbar-width: none;
}

.request-summary-card :deep(> *) {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 10px;
}

.request-summary-card :deep(> *) > span:first-child {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.request-summary-card small,
.request-summary-card__meta {
  color: #64748b;
  font-size: 9px;
}

.request-summary-card p,
.request-summary-card__meta {
  grid-column: 1 / -1;
}

.request-summary-card p {
  margin: 5px 0 0;
  font-size: 12px;
  line-height: 1.45;
}

.request-media-strip {
  margin: 0 2px 14px;
  display: grid;
  grid-auto-columns: minmax(112px, 58%);
  grid-auto-flow: column;
  gap: 8px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
}

.request-media-strip::-webkit-scrollbar {
  display: none;
}

.request-media-strip img {
  width: 100%;
  height: 108px;
  display: block;
  scroll-snap-align: start;
  border-radius: 14px;
  object-fit: cover;
  background: rgb(148 163 184 / 20%);
}

.request-timeline {
  margin: 0 12px 16px;
}

.request-timeline > div {
  position: relative;
  display: flex;
  gap: 9px;
  min-height: 40px;
}

.request-timeline > div:not(:last-child)::before {
  position: absolute;
  top: 18px;
  bottom: -3px;
  left: 10px;
  width: 1px;
  content: '';
  background: rgb(59 130 246 / 28%);
}

.request-timeline > div > span {
  z-index: 1;
  width: 21px;
  height: 21px;
  display: grid;
  flex: none;
  place-items: center;
  border-radius: 50%;
  color: white;
  background: var(--company-blue);
}

.request-timeline p {
  margin: 1px 0 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
}

.request-timeline small {
  color: #64748b;
  font-size: 9px;
}

.company-messages {
  min-height: 100px;
}

.request-thread-actions {
  margin: 14px 5px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.request-thread-actions .is-danger,
.manager-remove {
  color: var(--company-red);
}

.company-messagebar {
  position: absolute;
  z-index: 4;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgb(255 255 255 / 86%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.companies-app--dark .company-messagebar {
  background: rgb(15 23 42 / 88%);
}

.manager-screen {
  padding-bottom: 35px;
}

.manager-media-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 9px;
  margin: 0 10px 12px;
}

.manager-media-button {
  min-width: 0;
  min-height: 86px;
  overflow: hidden;
  position: relative;
  display: grid;
  place-items: center;
  border: 1px solid rgb(148 163 184 / 30%);
  padding: 0;
}

.manager-media-grid img {
  width: 100%;
  height: 86px;
  object-fit: cover;
}

.manager-media-grid small {
  position: absolute;
  right: 6px;
  bottom: 6px;
  left: 6px;
  overflow: hidden;
  border-radius: 8px;
  padding: 4px 6px;
  color: white;
  background: rgb(15 23 42 / 72%);
  font-size: 9px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manager-location {
  width: calc(100% - 20px);
  margin: 0 10px 4px;
}

.manager-location-status {
  display: block;
  margin: 0 16px 8px;
  color: #64748b;
  font-size: 10px;
}

.manager-form-list,
.manager-hours-card,
.manager-service-card {
  margin-bottom: 10px;
}

.manager-hours-card,
.manager-service-card {
  border-radius: 18px;
}

.manager-remove {
  width: calc(100% - 20px);
  margin: 2px 10px 10px;
}

.companies-tab-icon {
  position: relative;
  display: inline-flex;
}

.companies-tab-icon :deep(.k-badge) {
  position: absolute;
  top: -5px;
  right: -10px;
  color: white;
  background: var(--company-red);
}

.companies-sheet :deep(.k-sheet) {
  max-height: 88%;
  border-radius: 24px 24px 0 0;
  overflow: hidden;
}

.companies-sheet__content {
  max-height: 82vh;
  padding: 16px 12px max(22px, env(safe-area-inset-bottom));
  overflow-y: auto;
}

.companies-sheet__content > header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.companies-sheet__content > header > span {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: white;
  background: linear-gradient(145deg, var(--company-blue), var(--company-cyan));
}

.companies-sheet__content > header > div {
  min-width: 0;
  flex: 1;
}

.companies-sheet__content h2 {
  margin: 0;
  font-size: 18px;
}

.companies-sheet__content header small {
  color: #64748b;
  font-size: 9px;
}

.composer-service-title {
  margin-top: 18px;
  margin-bottom: 8px;
}

.composer-service-list {
  margin-top: 0;
  margin-right: 8px;
  margin-bottom: 10px;
  margin-left: 8px;
}

.composer-service-list :deep(.k-list-item .text-sm) {
  overflow: hidden;
  font-size: 11px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.composer-service-list :deep(.k-radio > i) {
  width: 20px;
  height: 20px;
}

.composer-service-price {
  color: #64748b;
  font-size: 11px;
  font-weight: 500;
}

.composer-form-list {
  margin-top: 10px;
  margin-right: 8px;
  margin-bottom: 10px;
  margin-left: 8px;
}

.composer-form-list :deep(.k-list-input) {
  margin-top: 8px;
  margin-bottom: 8px;
}

.composer-contact-card {
  margin-top: 12px;
}

.composer-media-strip {
  display: flex;
  gap: 8px;
  margin: 10px 2px;
  overflow-x: auto;
}

.composer-media-strip > span {
  position: relative;
  width: 74px;
  height: 74px;
  flex: none;
}

.composer-media-strip img {
  width: 100%;
  height: 100%;
  border-radius: 13px;
  object-fit: cover;
}

.composer-media-strip :deep(.k-button) {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 24px;
  min-width: 24px;
  height: 24px;
  padding: 0;
  color: white;
  background: rgb(15 23 42 / 82%);
}

@media (max-width: 330px) {
  .companies-content {
    padding-inline: 7px;
  }

  .company-profile-actions {
    grid-template-columns: 1fr;
  }

  .company-profile {
    padding-bottom: 190px;
  }
}
</style>
