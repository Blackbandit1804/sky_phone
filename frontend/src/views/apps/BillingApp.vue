<script setup lang="ts">
import {
  AlertTriangle,
  ArrowLeftRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  Hash,
  History,
  House,
  Inbox,
  ListFilter,
  ReceiptText,
  RefreshCw,
  SearchX,
  ShieldAlert,
  Send,
  WalletCards,
  X,
} from 'lucide-vue-next'
import {
  kBadge,
  kButton,
  kCard,
  kGlass,
  kIcon,
  kLink,
  kNavbar,
  kNavbarBackLink,
  kPage,
  kPreloader,
  kSearchbar,
  kSegmented,
  kSegmentedButton,
  kSheet,
  kTabbar,
  kTabbarLink,
  kToast,
  kToolbarPane,
} from 'konsta/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useBillingStore } from '@/stores/billing'
import { usePhoneStore } from '@/stores/phone'
import type {
  BillingDirection,
  BillingFilter,
  BillingStatus,
  InvoiceSummary,
} from '@/types/billing'
import { isTrustedRootMessageSource } from '@/utils/windowMessages'

type BillingTab = 'overview' | 'inbox' | 'history'
type BillingScreen = 'main' | 'detail'

const phone = usePhoneStore()
const billing = useBillingStore()
const tab = ref<BillingTab>('overview')
const screen = ref<BillingScreen>('main')
const direction = ref<BillingDirection>('inbox')
const filter = ref<BillingFilter>('all')
const filters: BillingFilter[] = ['all', 'open', 'paid']
const search = ref('')
const paymentOpen = ref(false)
const toastOpen = ref(false)
const toastText = ref('')
let searchTimer: number | undefined
let toastTimer: number | undefined

const t = (key: string, values?: Record<string, string | number>) =>
  phone.t(
    `Apps.billing.${key}`,
    values &&
      Object.fromEntries(
        Object.entries(values).map(([name, value]) => [name, String(value)]),
      ),
  )

const title = computed(() =>
  screen.value === 'detail'
    ? t('detail.title')
    : tab.value === 'overview'
      ? t('name')
      : t(`tabs.${tab.value}`),
)

const visibleInvoices = computed(() => {
  if (tab.value !== 'history') return billing.invoices
  return billing.invoices.filter((invoice) =>
    ['paid', 'cancelled', 'refunded', 'disputed'].includes(invoice.status),
  )
})

const statusIcons: Record<BillingStatus, typeof Clock3> = {
  open: Clock3,
  processing: RefreshCw,
  paid: CheckCircle2,
  disputed: ShieldAlert,
  cancelled: X,
  refunded: ArrowLeftRight,
}

const filterIcons: Record<BillingFilter, typeof Clock3> = {
  all: ListFilter,
  open: Clock3,
  overdue: AlertTriangle,
  paid: CheckCircle2,
}

function formatMoney(
  amount: number,
  currency = billing.overview?.currency ?? '$',
): string {
  return `${new Intl.NumberFormat(phone.lang, { maximumFractionDigits: 0 }).format(amount)} ${currency}`
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return t('detail.noDueDate')
  return new Intl.DateTimeFormat(phone.lang, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(timestamp)
}

function formatDateTime(timestamp: number | null): string {
  if (!timestamp) return t('detail.noDueDate')
  return new Intl.DateTimeFormat(phone.lang, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function statusKey(invoice: InvoiceSummary): string {
  return invoice.isOverdue ? 'overdue' : invoice.status
}

function showToast(message: string): void {
  toastText.value = message
  toastOpen.value = true
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toastOpen.value = false), 2800)
}

async function loadList(): Promise<boolean> {
  const activeFilter = tab.value === 'history' ? 'paid' : filter.value
  return billing.loadInvoices(direction.value, activeFilter, search.value)
}

async function selectTab(nextTab: BillingTab): Promise<void> {
  tab.value = nextTab
  screen.value = 'main'
  paymentOpen.value = false
  if (nextTab === 'overview') {
    await billing.loadOverview(direction.value)
    return
  }
  direction.value = 'inbox'
  filter.value = nextTab === 'history' ? 'paid' : 'all'
  await loadList()
}

async function selectDirection(nextDirection: BillingDirection): Promise<void> {
  direction.value = nextDirection
  if (tab.value === 'overview') await billing.loadOverview(nextDirection)
  else await loadList()
}

async function selectFilter(nextFilter: BillingFilter): Promise<void> {
  filter.value = nextFilter
  await loadList()
}

function updateSearch(event: Event): void {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) {
    console.error('[billing] Search input emitted without an input target.')
    return
  }
  search.value = input.value
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => void loadList(), 220)
}

function clearSearch(): void {
  search.value = ''
  void loadList()
}

async function openInvoice(invoice: InvoiceSummary): Promise<void> {
  screen.value = 'detail'
  if (!(await billing.loadDetail(invoice.id))) screen.value = 'main'
}

function goBack(): void {
  paymentOpen.value = false
  billing.detail = null
  screen.value = 'main'
}

async function payInvoice(): Promise<void> {
  if (!billing.detail) return
  const response = await billing.pay(billing.detail.id)
  if (!response.success) {
    showToast(t(`errors.${response.error ?? 'payment_failed'}`))
    return
  }
  paymentOpen.value = false
  showToast(t('payment.success'))
}

async function disputeInvoice(): Promise<void> {
  if (!billing.detail) return
  const response = await billing.dispute(billing.detail.id)
  if (!response.success) {
    showToast(t(`errors.${response.error ?? 'dispute_unavailable'}`))
    return
  }
  showToast(t('detail.disputedSuccess'))
}

function onBillingMessage(event: MessageEvent): void {
  if (!isTrustedRootMessageSource(event.source, window)) return
  if (
    event.data?.type !== 'billing:changed' &&
    event.data?.type !== 'billing:new'
  ) {
    return
  }

  if (tab.value !== 'overview') void loadList()
  if (screen.value === 'detail' && billing.detail) {
    void billing.loadDetail(billing.detail.id)
  }
}

onMounted(async () => {
  window.addEventListener('message', onBillingMessage)
  await billing.loadOverview(direction.value)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onBillingMessage)
  if (searchTimer) window.clearTimeout(searchTimer)
  if (toastTimer) window.clearTimeout(toastTimer)
})
</script>

<template>
  <kPage
    component="main"
    class="billing-app native-app"
    :class="{
      'billing-app--home': screen === 'main' && tab === 'overview',
      'billing-app--light': !phone.isDarkMode,
      'billing-app--section': screen !== 'main' || tab !== 'overview',
    }"
  >
    <kNavbar
      class="billing-navbar"
      :subtitle="
        screen === 'main' && tab === 'overview' ? undefined : t('name')
      "
      :title="screen === 'main' && tab === 'overview' ? undefined : title"
    >
      <template v-if="screen === 'detail'" #left>
        <kNavbarBackLink :show-text="false" :text="t('back')" @click="goBack" />
      </template>
      <template v-else-if="tab === 'overview'" #title>
        <ReceiptText
          class="billing-navbar__brand-mark"
          :size="30"
          :stroke-width="1.8"
        />
      </template>
    </kNavbar>

    <section v-if="screen === 'detail'" class="billing-scroll billing-detail">
      <div v-if="billing.isLoading && !billing.detail" class="billing-loading">
        <kPreloader />
        <span>{{ phone.t('Common.loading') }}</span>
      </div>
      <template v-else-if="billing.detail">
        <kGlass
          :highlight="false"
          class="billing-detail__hero"
          :class="{
            'billing-detail__hero--paid': billing.detail.status === 'paid',
          }"
        >
          <template v-if="billing.detail.status === 'paid'">
            <div class="billing-paid-mark">
              <CheckCircle2 :size="38" :stroke-width="2.2" />
            </div>
            <strong class="billing-paid-title">{{ t('status.paid') }}</strong>
            <strong class="billing-paid-amount">
              {{ formatMoney(billing.detail.amount, billing.detail.currency) }}
            </strong>
            <span class="billing-paid-date">
              {{
                t('detail.paidOn', {
                  date: formatDateTime(billing.detail.paidAt),
                })
              }}
            </span>
          </template>
          <template v-else>
            <div class="billing-issuer-mark"><Building2 :size="26" /></div>
            <div class="billing-detail__identity">
              <strong>{{ billing.detail.issuerLabel }}</strong>
              <span>#{{ billing.detail.id.slice(0, 13).toUpperCase() }}</span>
            </div>
            <kBadge
              :class="`billing-status billing-status--${statusKey(billing.detail)}`"
            >
              {{ t(`status.${statusKey(billing.detail)}`) }}
            </kBadge>
            <div class="billing-detail__amount">
              <span>{{ t('detail.total') }}</span>
              <strong>{{
                formatMoney(billing.detail.amount, billing.detail.currency)
              }}</strong>
            </div>
          </template>
        </kGlass>

        <div class="billing-detail__section-title">
          {{
            t(
              billing.detail.status === 'paid'
                ? 'detail.paymentInformation'
                : 'detail.invoiceInformation',
            )
          }}
        </div>

        <kCard :content-wrap="false" class="billing-panel">
          <div v-if="billing.detail.status === 'paid'" class="billing-detail-row">
            <span class="billing-detail-row__icon"><Building2 :size="18" /></span>
            <span class="billing-detail-row__copy">
              <small>{{ t('detail.issuer') }}</small>
              <strong>{{ billing.detail.issuerLabel }}</strong>
            </span>
          </div>
          <div v-else class="billing-detail-row">
            <span class="billing-detail-row__icon"><ReceiptText :size="18" /></span>
            <span class="billing-detail-row__copy">
              <small>{{ t('detail.reason') }}</small>
              <strong>{{ billing.detail.title }}</strong>
            </span>
          </div>
          <div class="billing-detail-row">
            <span class="billing-detail-row__icon">
              <FileCheck2 v-if="billing.detail.status === 'paid'" :size="18" />
              <CalendarDays v-else :size="18" />
            </span>
            <span class="billing-detail-row__copy">
              <small>{{
                t(
                  billing.detail.status === 'paid'
                    ? 'detail.paidAt'
                    : 'detail.issued',
                )
              }}</small>
              <strong>{{
                billing.detail.status === 'paid'
                  ? formatDateTime(billing.detail.paidAt)
                  : formatDate(billing.detail.issuedAt)
              }}</strong>
            </span>
          </div>
          <div v-if="billing.detail.status !== 'paid'" class="billing-detail-row">
            <span class="billing-detail-row__icon"><Clock3 :size="18" /></span>
            <span class="billing-detail-row__copy">
              <small>{{ t('detail.due') }}</small>
              <strong>{{ formatDate(billing.detail.dueAt) }}</strong>
            </span>
          </div>
          <div v-if="billing.detail.paymentReference" class="billing-detail-row">
            <span class="billing-detail-row__icon"><Hash :size="18" /></span>
            <span class="billing-detail-row__copy">
              <small>{{ t('detail.paymentReference') }}</small>
              <strong class="billing-detail-row__reference">
                {{ billing.detail.paymentReference }}
              </strong>
            </span>
          </div>
          <div class="billing-detail-row">
            <span class="billing-detail-row__icon"><Hash :size="18" /></span>
            <span class="billing-detail-row__copy">
              <small>{{ t('detail.invoiceNumber') }}</small>
              <strong>#{{ billing.detail.id.toUpperCase() }}</strong>
            </span>
          </div>
        </kCard>

        <kCard v-if="billing.detail.description" class="billing-note">
          <span>{{ t('detail.note') }}</span>
          <p>{{ billing.detail.description }}</p>
        </kCard>

        <div v-if="billing.detail.canPay" class="billing-detail__actions">
          <kButton rounded large @click="paymentOpen = true">
            <WalletCards :size="18" />
            {{ t('payment.payNow') }}
            <ChevronRight class="billing-action-chevron" :size="18" />
          </kButton>
          <kLink
            v-if="billing.detail.canDispute"
            component="button"
            :link-props="{ type: 'button' }"
            @click="disputeInvoice"
          >
            {{ t('detail.dispute') }}
          </kLink>
        </div>
      </template>
    </section>

    <section v-else class="billing-scroll billing-main">
      <div
        v-if="billing.isLoading && !billing.overview"
        class="billing-loading"
      >
        <kPreloader />
        <span>{{ phone.t('Common.loading') }}</span>
      </div>

      <div v-else-if="billing.error && !billing.overview" class="billing-empty">
        <AlertTriangle :size="39" />
        <strong>{{ t(`errors.${billing.error}`) }}</strong>
        <kButton rounded @click="billing.loadOverview(direction)">
          {{ t('tryAgain') }}
        </kButton>
      </div>

      <template v-else-if="tab === 'overview' && billing.overview">
        <div class="billing-summary">
          <kGlass
            :highlight="false"
            class="billing-summary__item billing-summary__item--open"
          >
            <ReceiptText :size="19" />
            <span>{{ t('summary.open') }}</span>
            <strong>{{ billing.overview.openCount }}</strong>
          </kGlass>
          <kGlass
            :highlight="false"
            class="billing-summary__item billing-summary__item--due"
          >
            <CalendarDays :size="19" />
            <span>{{ t('summary.due') }}</span>
            <strong>{{ formatMoney(billing.overview.openTotal) }}</strong>
          </kGlass>
          <kGlass
            :highlight="false"
            class="billing-summary__item billing-summary__item--overdue"
          >
            <AlertTriangle :size="19" />
            <span>{{ t('summary.overdue') }}</span>
            <strong>{{ billing.overview.overdueCount }}</strong>
          </kGlass>
        </div>

        <div
          v-if="billing.overview.supportsSent"
          class="billing-filter-panel billing-filter-panel--overview"
        >
          <span class="billing-filter-label">{{ t('filters.scope') }}</span>
          <kSegmented class="billing-direction">
            <kSegmentedButton
              type="button"
              :active="direction === 'inbox'"
              @click="selectDirection('inbox')"
            >
              <Inbox :size="15" />
              <span>{{ t('direction.inbox') }}</span>
              <b
                v-if="billing.overview.unreadCount"
                class="billing-filter-count"
              >
                {{ Math.min(99, billing.overview.unreadCount) }}
              </b>
            </kSegmentedButton>
            <kSegmentedButton
              type="button"
              :active="direction === 'sent'"
              @click="selectDirection('sent')"
            >
              <Send :size="15" />
              <span>{{ t('direction.sent') }}</span>
            </kSegmentedButton>
          </kSegmented>
        </div>

        <div class="billing-section-heading">
          <div>
            <span>{{ t('overview.eyebrow') }}</span>
            <h2>{{ t('overview.urgent') }}</h2>
          </div>
          <kLink
            component="button"
            :link-props="{ type: 'button' }"
            @click="selectTab('inbox')"
          >
            {{ t('overview.viewAll') }}
          </kLink>
        </div>

        <div
          v-if="billing.overview.urgentInvoices.length"
          class="billing-card-list"
        >
          <button
            v-for="invoice in billing.overview.urgentInvoices"
            :key="invoice.id"
            type="button"
            class="billing-invoice-card"
            @click="openInvoice(invoice)"
          >
            <span class="billing-issuer-mark"><Building2 :size="22" /></span>
            <span class="billing-invoice-card__copy">
              <strong>{{ invoice.title }}</strong>
              <small>{{ invoice.issuerLabel }}</small>
              <small
                >{{ t('detail.due') }} {{ formatDate(invoice.dueAt) }}</small
              >
            </span>
            <span class="billing-invoice-card__amount">
              <kBadge
                :class="`billing-status billing-status--${statusKey(invoice)}`"
              >
                {{ t(`status.${statusKey(invoice)}`) }}
              </kBadge>
              <strong>{{
                formatMoney(invoice.amount, invoice.currency)
              }}</strong>
              <ChevronRight :size="17" />
            </span>
          </button>
        </div>
        <div v-else class="billing-empty">
          <CheckCircle2 :size="39" />
          <strong>{{ t('empty.openTitle') }}</strong>
          <p>{{ t('empty.openBody') }}</p>
        </div>
      </template>

      <template v-else>
        <div
          v-if="tab === 'inbox' && billing.overview?.supportsSent"
          class="billing-filter-panel"
        >
          <span class="billing-filter-label">{{ t('filters.scope') }}</span>
          <kSegmented class="billing-direction">
            <kSegmentedButton
              type="button"
              :active="direction === 'inbox'"
              @click="selectDirection('inbox')"
            >
              <Inbox :size="15" />
              <span>{{ t('direction.inbox') }}</span>
              <b
                v-if="billing.overview?.unreadCount"
                class="billing-filter-count"
              >
                {{ Math.min(99, billing.overview.unreadCount) }}
              </b>
            </kSegmentedButton>
            <kSegmentedButton
              type="button"
              :active="direction === 'sent'"
              @click="selectDirection('sent')"
            >
              <Send :size="15" />
              <span>{{ t('direction.sent') }}</span>
            </kSegmentedButton>
          </kSegmented>
        </div>
        <kSearchbar
          v-if="tab === 'inbox'"
          class="billing-search"
          :placeholder="t('search')"
          :value="search"
          @clear="clearSearch"
          @input="updateSearch"
        />
        <div v-if="tab === 'inbox'" class="billing-status-filter">
          <span class="billing-filter-label">{{ t('filters.status') }}</span>
          <div class="billing-status-filter__scroll">
            <kSegmented class="billing-filters">
              <kSegmentedButton
                v-for="entry in filters"
                :key="entry"
                type="button"
                :active="filter === entry"
                @click="selectFilter(entry)"
              >
                <component :is="filterIcons[entry]" :size="14" />
                <span>{{ t(`filters.${entry}`) }}</span>
              </kSegmentedButton>
            </kSegmented>
          </div>
        </div>

        <div
          v-if="billing.isLoading"
          class="billing-loading billing-loading--list"
        >
          <kPreloader />
        </div>
        <div v-else-if="visibleInvoices.length" class="billing-list">
          <button
            v-for="invoice in visibleInvoices"
            :key="invoice.id"
            type="button"
            class="billing-list-row"
            :class="{ 'is-unread': invoice.isUnread }"
            @click="openInvoice(invoice)"
          >
            <span class="billing-list-row__icon">
              <component :is="statusIcons[invoice.status]" :size="20" />
            </span>
            <span class="billing-list-row__copy">
              <strong>{{ invoice.issuerLabel }}</strong>
              <span>{{ invoice.title }}</span>
              <small
                >#{{ invoice.id.slice(0, 8).toUpperCase() }} ·
                {{ formatDate(invoice.issuedAt) }}</small
              >
            </span>
            <span class="billing-list-row__meta">
              <kBadge
                :class="`billing-status billing-status--${statusKey(invoice)}`"
              >
                {{ t(`status.${statusKey(invoice)}`) }}
              </kBadge>
              <strong>{{
                formatMoney(invoice.amount, invoice.currency)
              }}</strong>
            </span>
          </button>
          <kButton
            v-if="billing.hasMore"
            clear
            :disabled="billing.isLoadingMore"
            class="billing-load-more"
            @click="
              billing.loadInvoices(
                direction,
                tab === 'history' ? 'paid' : filter,
                search,
                true,
              )
            "
          >
            <kPreloader v-if="billing.isLoadingMore" />
            <span v-else>{{ t('loadMore') }}</span>
          </kButton>
        </div>
        <div v-else class="billing-empty billing-empty--list">
          <SearchX :size="39" />
          <strong>{{ t(`empty.${tab}Title`) }}</strong>
          <p>{{ t(`empty.${tab}Body`) }}</p>
        </div>
      </template>
    </section>

    <kTabbar
      v-if="screen === 'main'"
      component="nav"
      icons
      labels
      class="billing-tabbar bottom-0 left-0 fixed"
      inner-class="!w-full !max-w-none !gap-0 !px-1"
      :aria-label="t('navigation')"
    >
      <kToolbarPane class="billing-tab-pane">
        <kTabbarLink
          component="button"
          :active="tab === 'overview'"
          :link-props="{ class: 'billing-tab-button', type: 'button' }"
          @click="selectTab('overview')"
        >
          <template #label
            ><span class="billing-tab-label">{{
              t('tabs.overview')
            }}</span></template
          >
          <template #icon
            ><kIcon
              ><House
                :size="20"
                :fill="tab === 'overview' ? 'currentColor' : 'none'" /></kIcon
          ></template>
        </kTabbarLink>
        <kTabbarLink
          component="button"
          :active="tab === 'inbox'"
          :link-props="{ class: 'billing-tab-button', type: 'button' }"
          @click="selectTab('inbox')"
        >
          <template #label
            ><span class="billing-tab-label">{{
              t('tabs.inbox')
            }}</span></template
          >
          <template #icon>
            <span class="billing-tab-icon">
              <kIcon
                ><Inbox
                  :size="20"
                  :fill="tab === 'inbox' ? 'currentColor' : 'none'"
              /></kIcon>
              <b v-if="billing.overview?.unreadCount">{{
                Math.min(99, billing.overview.unreadCount)
              }}</b>
            </span>
          </template>
        </kTabbarLink>
        <kTabbarLink
          component="button"
          :active="tab === 'history'"
          :link-props="{ class: 'billing-tab-button', type: 'button' }"
          @click="selectTab('history')"
        >
          <template #label
            ><span class="billing-tab-label">{{
              t('tabs.history')
            }}</span></template
          >
          <template #icon
            ><kIcon><History :size="20" /></kIcon
          ></template>
        </kTabbarLink>
      </kToolbarPane>
    </kTabbar>

    <kSheet
      :opened="paymentOpen"
      class="billing-payment-sheet"
      @backdropclick="paymentOpen = false"
    >
      <section v-if="billing.detail" class="billing-payment-sheet__content">
        <span class="billing-payment-sheet__icon"
          ><WalletCards :size="27"
        /></span>
        <h2>{{ t('payment.title') }}</h2>
        <p>{{ t('payment.body', { issuer: billing.detail.issuerLabel }) }}</p>
        <kGlass :highlight="false" class="billing-payment-total">
          <span>{{ billing.detail.title }}</span>
          <strong>{{
            formatMoney(billing.detail.amount, billing.detail.currency)
          }}</strong>
        </kGlass>
        <kButton rounded large :disabled="billing.isPaying" @click="payInvoice">
          <kPreloader v-if="billing.isPaying" />
          <span v-else>{{ t('payment.confirm') }}</span>
        </kButton>
        <kLink
          component="button"
          :link-props="{ type: 'button' }"
          @click="paymentOpen = false"
        >
          {{ t('payment.cancel') }}
        </kLink>
      </section>
    </kSheet>

    <kToast :opened="toastOpen" position="center" class="billing-toast">
      {{ toastText }}
    </kToast>
  </kPage>
</template>

<style scoped>
.billing-app {
  --billing-blue: #1784ff;
  --billing-border: rgb(255 255 255 / 9%);
  --billing-panel: #171b21;
  position: relative;
  display: flex;
  height: 100%;
  overflow: hidden;
  flex-direction: column;
  color: #f6f7f9;
  background: #07090c;
  font-family: Inter, system-ui, sans-serif;
}
.billing-app--light {
  --billing-border: rgb(15 23 42 / 10%);
  --billing-panel: #fff;
  color: #111827;
  background: #f5f7fa;
}
.billing-navbar {
  --k-navbar-bg-color: color-mix(in srgb, #07090c 90%, transparent);
  --k-safe-area-top: 46px;
  position: absolute;
  z-index: 8;
  inset: 0 0 auto;
  border-bottom: 0;
  background: color-mix(in srgb, #07090c 88%, transparent);
  backdrop-filter: blur(18px);
}
.billing-app--section .billing-navbar {
  border-bottom: 1px solid var(--billing-border);
}
.billing-app--light .billing-navbar {
  --k-navbar-bg-color: color-mix(in srgb, #f5f7fa 91%, transparent);
  background: color-mix(in srgb, #f5f7fa 88%, transparent);
}
.billing-navbar__brand-mark {
  display: block;
  color: #ff6f67;
  filter: drop-shadow(0 3px 8px rgb(0 0 0 / 18%));
  transform: translateY(4px);
}
.billing-scroll {
  position: absolute;
  inset: 94px 0 0;
  overflow: auto;
  overscroll-behavior: contain;
}
.billing-main {
  padding: 13px 12px 76px;
}
.billing-detail {
  padding: 14px 12px 28px;
}
.billing-loading {
  display: flex;
  min-height: 60%;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #929ba7;
}
.billing-loading--list {
  min-height: 180px;
}
.billing-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.billing-summary__item {
  display: flex;
  min-height: 106px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
  border: 1px solid var(--billing-border);
  border-radius: 15px;
  background: color-mix(in srgb, var(--billing-panel) 90%, transparent);
}
.billing-summary__item span {
  color: #929ba7;
  font-size: 10px;
}
.billing-summary__item strong {
  max-width: 100%;
  overflow: hidden;
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.billing-summary__item--open svg {
  color: #4da0ff;
}
.billing-summary__item--due svg {
  color: #f1ad35;
}
.billing-summary__item--overdue svg {
  color: #ff625d;
}
.billing-filter-panel {
  display: grid;
  gap: 7px;
  margin-bottom: 11px;
  border: 1px solid var(--billing-border);
  border-radius: 15px;
  padding: 10px;
  background: color-mix(in srgb, var(--billing-panel) 94%, transparent);
}
.billing-filter-panel--overview {
  margin-top: 12px;
  margin-bottom: 0;
}
.billing-filter-label {
  padding-left: 3px;
  color: #7f8995;
  font-size: 8px;
  font-weight: 750;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.billing-direction {
  width: 100%;
}
.billing-direction :deep(button) {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.billing-filter-count {
  min-width: 17px;
  border-radius: 999px;
  padding: 1px 5px;
  color: #fff;
  background: #ff3b30;
  font-size: 8px;
  line-height: 15px;
  text-align: center;
}
.billing-section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  padding: 20px 4px 9px;
}
.billing-section-heading span {
  color: #7f8995;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}
.billing-section-heading h2 {
  margin: 2px 0 0;
  font-size: 20px;
}
.billing-card-list {
  display: grid;
  gap: 10px;
}
.billing-invoice-card,
.billing-list-row {
  width: 100%;
  border: 1px solid var(--billing-border);
  color: inherit;
  background: color-mix(in srgb, var(--billing-panel) 94%, transparent);
  text-align: left;
}
.billing-invoice-card {
  display: grid;
  min-height: 108px;
  align-items: center;
  grid-template-columns: 45px minmax(0, 1fr) auto;
  gap: 10px;
  border-radius: 16px;
  padding: 13px;
  box-shadow: 0 10px 24px rgb(0 0 0 / 18%);
}
.billing-issuer-mark {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  color: #fff;
  background: linear-gradient(145deg, #ff846c, #ff5266);
}
.billing-invoice-card__copy,
.billing-list-row__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.billing-invoice-card__copy strong {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.billing-invoice-card__copy small {
  margin-top: 3px;
  overflow: hidden;
  color: #8d96a1;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.billing-invoice-card__amount {
  display: grid;
  justify-items: end;
  gap: 8px;
}
.billing-invoice-card__amount strong {
  font-size: 16px;
}
.billing-invoice-card__amount svg {
  color: #74808c;
}
.billing-status {
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 2px 6px;
  font-size: 8px;
  font-weight: 750;
}
.billing-status--open {
  color: #4da0ff;
  background: rgb(25 132 255 / 12%);
}
.billing-status--overdue {
  color: #ff625d;
  background: rgb(255 98 93 / 12%);
}
.billing-status--processing {
  color: #f1ad35;
  background: rgb(241 173 53 / 12%);
}
.billing-status--paid {
  color: #48c76f;
  background: rgb(72 199 111 / 12%);
}
.billing-status--disputed {
  color: #a987ff;
  background: rgb(169 135 255 / 12%);
}
.billing-status--cancelled,
.billing-status--refunded {
  color: #8e98a5;
  background: rgb(142 152 165 / 12%);
}
.billing-search {
  margin: 0 0 11px;
}
.billing-search :deep(form) {
  min-height: 36px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--billing-panel) 96%, transparent);
}
.billing-status-filter {
  display: grid;
  gap: 7px;
  margin-bottom: 12px;
}
.billing-status-filter__scroll {
  overflow: hidden;
}
.billing-filters {
  width: 100%;
}
.billing-filters :deep(button) {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
.billing-list {
  display: grid;
  gap: 8px;
}
.billing-list-row {
  display: grid;
  min-height: 82px;
  align-items: center;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  gap: 9px;
  border-radius: 14px;
  padding: 10px;
}
.billing-list-row.is-unread {
  border-color: rgb(23 132 255 / 48%);
}
.billing-list-row__icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 50%;
  color: var(--billing-blue);
  background: rgb(23 132 255 / 13%);
}
.billing-list-row__copy strong,
.billing-list-row__copy span,
.billing-list-row__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.billing-list-row__copy strong {
  font-size: 12px;
}
.billing-list-row__copy span {
  margin-top: 2px;
  font-size: 11px;
}
.billing-list-row__copy small {
  margin-top: 3px;
  color: #87919c;
  font-size: 9px;
}
.billing-list-row__meta {
  display: grid;
  justify-items: end;
  gap: 8px;
}
.billing-list-row__meta strong {
  font-size: 13px;
}
.billing-load-more {
  margin: 8px auto 0;
}
.billing-empty {
  display: flex;
  min-height: 270px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  color: #7f8995;
  text-align: center;
}
.billing-empty svg {
  color: #48c76f;
}
.billing-empty strong {
  color: inherit;
  font-size: 15px;
}
.billing-empty p {
  max-width: 245px;
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
}
.billing-empty--list svg {
  color: #73808d;
}
.billing-detail__hero {
  display: grid;
  align-items: center;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 10px;
  border: 1px solid var(--billing-border);
  border-radius: 17px;
  padding: 14px;
  background: color-mix(in srgb, var(--billing-panel) 93%, transparent);
}
.billing-detail__hero--paid {
  display: flex;
  min-height: 208px;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  border-color: rgb(72 199 111 / 24%);
  padding: 24px 18px;
  background:
    radial-gradient(circle at 50% 6%, rgb(72 199 111 / 18%), transparent 52%),
    color-mix(in srgb, var(--billing-panel) 94%, transparent);
  text-align: center;
}
.billing-paid-mark {
  display: grid;
  width: 72px;
  height: 72px;
  margin-bottom: 3px;
  place-items: center;
  border: 1px solid rgb(72 199 111 / 28%);
  border-radius: 50%;
  color: #48c76f;
  background: rgb(72 199 111 / 12%);
  box-shadow: 0 12px 32px rgb(72 199 111 / 12%);
}
.billing-paid-title {
  color: #48c76f;
  font-size: 19px;
}
.billing-paid-amount {
  font-size: 31px;
  letter-spacing: -0.035em;
}
.billing-paid-date {
  color: #89939f;
  font-size: 10px;
}
.billing-detail__identity {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.billing-detail__identity strong {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.billing-detail__identity span {
  margin-top: 3px;
  color: #89939f;
  font-size: 9px;
}
.billing-detail__amount {
  display: flex;
  align-items: center;
  grid-column: 1 / -1;
  flex-direction: column;
  gap: 4px;
  border-top: 1px solid var(--billing-border);
  padding-top: 17px;
}
.billing-detail__amount span {
  color: #8b95a0;
  font-size: 10px;
}
.billing-detail__amount strong {
  font-size: 30px;
  letter-spacing: -0.03em;
}
.billing-detail__section-title {
  margin: 17px 4px 7px;
  color: #89939f;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.billing-panel,
.billing-note {
  margin-top: 12px;
  border: 1px solid var(--billing-border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--billing-panel) 94%, transparent);
}
.billing-detail__section-title + .billing-panel {
  margin-top: 0;
}
.billing-detail-row {
  display: flex;
  min-height: 55px;
  align-items: center;
  gap: 11px;
  margin: 0 13px;
  border-bottom: 1px solid var(--billing-border);
  padding: 9px 0;
}
.billing-detail-row:last-child {
  border-bottom: 0;
}
.billing-detail-row__icon {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  color: var(--billing-blue);
  background: rgb(23 132 255 / 11%);
}
.billing-detail__hero--paid + .billing-detail__section-title + .billing-panel
  .billing-detail-row__icon {
  color: #48c76f;
  background: rgb(72 199 111 / 11%);
}
.billing-detail-row__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}
.billing-detail-row__copy small {
  color: #89939f;
  font-size: 9px;
}
.billing-detail-row__copy strong {
  overflow-wrap: anywhere;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.35;
}
.billing-detail-row__reference {
  color: #48c76f;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 9.5px !important;
}
.billing-note span {
  color: #89939f;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.billing-note p {
  margin: 7px 0 0;
  font-size: 11px;
  line-height: 1.55;
}
.billing-detail__actions {
  display: grid;
  justify-items: center;
  gap: 13px;
  margin-top: 16px;
}
.billing-detail__actions :deep(.k-button) {
  --k-button-bg-color: var(--billing-blue);
  width: 100%;
}
.billing-action-chevron {
  margin-left: auto;
}
.billing-tab-pane {
  width: 100% !important;
  max-width: none;
  flex: none;
  gap: 2px;
  padding: 0 4px;
}
:global(.billing-tab-button) {
  width: auto !important;
  min-width: 0 !important;
  max-width: none !important;
  flex: 1 1 0 !important;
  padding-inline: 3px !important;
}
.billing-tab-label {
  display: block;
  max-width: 72px;
  overflow: hidden;
  font-size: 9.5px;
  line-height: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.billing-tab-icon {
  position: relative;
}
.billing-tab-icon b {
  position: absolute;
  top: -6px;
  right: -9px;
  min-width: 15px;
  border-radius: 999px;
  padding: 1px 4px;
  color: #fff;
  background: #ff3b30;
  font-size: 8px;
  text-align: center;
}
.billing-payment-sheet__content {
  display: grid;
  justify-items: center;
  gap: 12px;
  border-radius: 22px 22px 0 0;
  padding: 22px 16px 36px;
  color: #f6f7f9;
  background: #15191f;
  text-align: center;
}
.billing-app--light .billing-payment-sheet__content {
  color: #111827;
  background: #fff;
}
.billing-payment-sheet__icon {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: 16px;
  color: #fff;
  background: var(--billing-blue);
}
.billing-payment-sheet h2 {
  margin: 0;
  font-size: 20px;
}
.billing-payment-sheet p {
  margin: 0;
  color: #909aa5;
  font-size: 11px;
}
.billing-payment-total {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--billing-border);
  border-radius: 14px;
  padding: 13px;
  text-align: left;
}
.billing-payment-total span {
  color: #909aa5;
  font-size: 11px;
}
.billing-payment-total strong {
  font-size: 18px;
}
.billing-payment-sheet :deep(.k-button) {
  --k-button-bg-color: var(--billing-blue);
  width: 100%;
}
@supports not (color: color-mix(in srgb, white, black)) {
  .billing-navbar {
    --k-navbar-bg-color: rgb(7 9 12 / 90%);
    background: rgb(7 9 12 / 88%);
  }
  .billing-app--light .billing-navbar {
    --k-navbar-bg-color: rgb(245 247 250 / 91%);
    background: rgb(245 247 250 / 88%);
  }
  .billing-summary__item,
  .billing-filter-panel,
  .billing-invoice-card,
  .billing-list-row,
  .billing-search :deep(form),
  .billing-detail__hero,
  .billing-panel,
  .billing-note {
    background: var(--billing-panel);
  }
  .billing-detail__hero--paid {
    background:
      radial-gradient(circle at 50% 6%, rgb(72 199 111 / 18%), transparent 52%),
      var(--billing-panel);
  }
}
.billing-toast {
  z-index: 50;
}
</style>
