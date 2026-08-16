<script setup lang="ts">
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  CircleDollarSign,
  House,
  Landmark,
  Send,
  WalletCards,
  X,
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useBankingStore } from '@/stores/banking'
import { useCallsStore } from '@/stores/calls'
import { usePhoneStore } from '@/stores/phone'
import type {
  BankingAction,
  BankingTransaction,
  BankingTransactionKind,
} from '@/types/banking'
import type { PhoneContact } from '@/types/phone'
import { handleEnterAction } from '@/utils/keyboard'
import { formatPhoneNumber, normalizePhoneNumber } from '@/utils/phone'
import {
  SkyAppPage,
  SkyButton,
  SkyCard,
  SkyEmptyState,
  SkyField,
  SkyGlass,
  SkyLink,
  SkyList,
  SkyListItem,
  SkyNavbar,
  SkySheet,
  SkySpinner,
  SkyTabBar,
  SkyTabButton,
  SkyToast,
} from '@/ui'

type BankingTab = 'home' | 'activity'

const phone = usePhoneStore()
const banking = useBankingStore()
const calls = useCallsStore()
const activeTab = ref<BankingTab>('home')
const action = ref<BankingAction | null>(null)
const amount = ref('')
const target = ref('')
const formError = ref('')
const bankingScroll = ref<HTMLElement | null>(null)
const isRefreshing = ref(false)
const pullDistance = ref(0)
const cooldownToastOpened = ref(false)

const pullThreshold = 56
let pullStartY = 0
let isPulling = false
let wheelRefreshTimeout: ReturnType<typeof setTimeout> | undefined
let cooldownToastTimer: ReturnType<typeof setTimeout> | undefined

function closeCooldownToast(): void {
  cooldownToastOpened.value = false
  if (banking.error === 'reload_cooldown') banking.error = ''
}

const transactionIcons: Record<BankingTransactionKind, typeof Send> = {
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
  transfer_in: ArrowDownLeft,
  transfer_out: ArrowUpRight,
}

const isIncoming = (kind: BankingTransactionKind): boolean =>
  kind === 'deposit' || kind === 'transfer_in'

const chart = computed(() => {
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (6 - offset))
    return { date, incoming: 0, outgoing: 0 }
  })
  for (const transaction of banking.overview?.transactions ?? []) {
    const transactionDate = new Date(transaction.createdAt)
    transactionDate.setHours(0, 0, 0, 0)
    const day = days.find(
      (candidate) => candidate.date.getTime() === transactionDate.getTime(),
    )
    if (!day) continue
    if (isIncoming(transaction.kind)) day.incoming += transaction.amount
    else day.outgoing += transaction.amount
  }
  const maximum = Math.max(
    1,
    ...days.flatMap((day) => [day.incoming, day.outgoing]),
  )
  return days.map((day) => ({
    ...day,
    incomingHeight: Math.max(5, (day.incoming / maximum) * 100),
    label: new Intl.DateTimeFormat(phone.lang, { weekday: 'narrow' }).format(
      day.date,
    ),
    outgoingHeight: Math.max(5, (day.outgoing / maximum) * 100),
  }))
})

const totals = computed(() =>
  (banking.overview?.transactions ?? []).reduce(
    (result, transaction) => {
      if (isIncoming(transaction.kind)) result.incoming += transaction.amount
      else result.outgoing += transaction.amount
      return result
    },
    { incoming: 0, outgoing: 0 },
  ),
)

function formatMoney(value: number, signed = false): string {
  const formatted = new Intl.NumberFormat(phone.lang, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.abs(value))
  const prefix = signed ? (value >= 0 ? '+' : '−') : ''
  return `${prefix}${banking.overview?.currency ?? '$'}${formatted}`
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(phone.lang, {
    day: 'numeric',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: 'short',
  }).format(timestamp)
}

function transactionTitle(transaction: BankingTransaction): string {
  if (transaction.label) return transaction.label
  return phone.t(`Apps.banking.transactions.${transaction.kind}`)
}

function openAction(nextAction: BankingAction): void {
  if (banking.cooldownUntil > Date.now()) {
    banking.error = 'reload_cooldown'
    return
  }
  action.value = nextAction
  amount.value = ''
  target.value = ''
  formError.value = ''
  void calls.loadContacts()
}

function closeAction(): void {
  if (banking.isLoading) return
  action.value = null
}

function updateTarget(event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) {
    console.error(
      '[banking] Phone number input emitted without an input target.',
    )
    return
  }
  target.value = event.target.value
  formError.value = ''
}

function selectContact(contact: PhoneContact): void {
  target.value = contact.phone_number
  formError.value = ''
  void nextTick(() =>
    document.getElementById('banking-transfer-amount')?.focus(),
  )
}

function updateAmount(event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) {
    console.error('[banking] Amount input emitted without an input target.')
    return
  }
  amount.value = event.target.value
  formError.value = ''
}

async function refresh(): Promise<void> {
  if (isRefreshing.value) return
  isRefreshing.value = true
  pullDistance.value = pullThreshold
  await banking.load(true)
  isRefreshing.value = false
  pullDistance.value = 0
}

function atTop(): boolean {
  return (bankingScroll.value?.scrollTop ?? 0) <= 0
}

function startPull(event: TouchEvent): void {
  if (!atTop() || isRefreshing.value) return
  pullStartY = event.touches[0]?.clientY ?? 0
  isPulling = true
}

function movePull(event: TouchEvent): void {
  if (!isPulling || isRefreshing.value) return
  const distance = (event.touches[0]?.clientY ?? pullStartY) - pullStartY
  if (distance <= 0) {
    pullDistance.value = 0
    return
  }
  pullDistance.value = Math.min(pullThreshold + 20, distance * 0.45)
}

function finishPull(): void {
  if (!isPulling && pullDistance.value === 0) return
  isPulling = false
  if (pullDistance.value >= pullThreshold) {
    void refresh()
    return
  }
  pullDistance.value = 0
}

function pullWithWheel(event: WheelEvent): void {
  if (!atTop() || isRefreshing.value || event.deltaY >= 0) return
  pullDistance.value = Math.min(
    pullThreshold + 20,
    pullDistance.value + Math.abs(event.deltaY) * 0.18,
  )
  if (wheelRefreshTimeout) clearTimeout(wheelRefreshTimeout)
  wheelRefreshTimeout = setTimeout(finishPull, 130)
}

function errorMessage(code: string): string {
  return phone.t(`Apps.banking.errors.${code}`) ===
    `Apps.banking.errors.${code}`
    ? phone.t('Apps.banking.errors.default')
    : phone.t(`Apps.banking.errors.${code}`)
}

async function submitAction(): Promise<void> {
  if (!action.value) return
  const parsedAmount = Number(amount.value)
  const phoneNumber =
    action.value === 'transfer' ? normalizePhoneNumber(target.value) : undefined
  if (
    !Number.isSafeInteger(parsedAmount) ||
    parsedAmount <= 0 ||
    (action.value === 'transfer' && !phoneNumber)
  ) {
    formError.value = phone.t('Apps.banking.errors.invalid_request')
    return
  }
  const response = await banking.perform(
    action.value,
    parsedAmount,
    phoneNumber ?? undefined,
  )
  if (!response.success) {
    formError.value = errorMessage(response.error ?? 'default')
    return
  }
  action.value = null
}

onMounted(() => {
  void banking.load()
})

watch(
  () => banking.error,
  (error) => {
    if (error !== 'reload_cooldown') return
    if (cooldownToastTimer) clearTimeout(cooldownToastTimer)
    cooldownToastOpened.value = true
    cooldownToastTimer = setTimeout(closeCooldownToast, 2800)
  },
)

watch(action, async (currentAction) => {
  if (currentAction) {
    await nextTick()
    document.getElementById('banking-transfer-target')?.focus()
  }
})

onBeforeUnmount(() => {
  if (wheelRefreshTimeout) clearTimeout(wheelRefreshTimeout)
  if (cooldownToastTimer) clearTimeout(cooldownToastTimer)
})
</script>

<template>
  <SkyAppPage
    class="banking-app pb-safe-24"
    :label="phone.t('Apps.banking.name')"
    :dark="phone.isDarkMode"
    accent="#2d76ff"
    accent-soft="rgba(45, 118, 255, 0.18)"
  >
    <div class="banking-app__aurora" aria-hidden="true"></div>

    <SkyNavbar
      class="banking-navbar"
      :aria-hidden="Boolean(action)"
      :inert="Boolean(action)"
      :subtitle="phone.t('Apps.banking.welcome')"
      :title="banking.overview?.playerName ?? phone.t('Common.loading')"
    />

    <div
      v-if="!banking.overview && banking.isLoading"
      class="banking-loading"
      :aria-hidden="Boolean(action)"
      :inert="Boolean(action)"
    >
      <SkySpinner :label="phone.t('Common.loading')" />
      <span>{{ phone.t('Common.loading') }}</span>
    </div>

    <SkyEmptyState
      v-else-if="!banking.overview"
      class="banking-empty"
      :aria-hidden="Boolean(action)"
      :body="errorMessage(banking.error)"
      :inert="Boolean(action)"
      :title="phone.t('Apps.banking.unavailable')"
    >
      <template #icon><Landmark :size="34" /></template>
      <template #actions>
        <SkyButton rounded @click="banking.load(true)">
          {{ phone.t('Apps.banking.tryAgain') }}
        </SkyButton>
      </template>
    </SkyEmptyState>

    <div
      v-else
      ref="bankingScroll"
      class="banking-scroll"
      :aria-hidden="Boolean(action)"
      :inert="Boolean(action)"
      @touchend="finishPull"
      @touchmove.passive="movePull"
      @touchstart.passive="startPull"
      @wheel="pullWithWheel"
    >
      <div
        class="banking-pull-refresh"
        :class="{ 'is-visible': pullDistance > 0 }"
        :style="{ transform: `translateY(${pullDistance - pullThreshold}px)` }"
        aria-live="polite"
      >
        <SkySpinner :label="phone.t('Common.loading')" />
      </div>
      <template v-if="activeTab === 'home'">
        <SkyGlass class="banking-balance">
          <div class="banking-balance__label">
            <span>{{ phone.t('Apps.banking.totalBalance') }}</span>
            <small>#{{ banking.overview.playerId }}</small>
          </div>
          <strong>{{ formatMoney(banking.overview.bank) }}</strong>
          <div class="banking-balance__trend">
            <span>{{
              formatMoney(totals.incoming - totals.outgoing, true)
            }}</span>
            {{ phone.t('Apps.banking.recentPeriod') }}
          </div>
        </SkyGlass>

        <section
          class="banking-actions"
          :aria-label="phone.t('Apps.banking.actions')"
        >
          <SkyGlass
            component="button"
            type="button"
            class="banking-action banking-action--primary"
            @click="openAction('transfer')"
          >
            <span class="banking-action__icon"><Send :size="20" /></span>
            <b>{{ phone.t('Apps.banking.send') }}</b>
            <ChevronRight :size="16" aria-hidden="true" />
          </SkyGlass>
        </section>

        <SkyCard class="banking-card banking-accounts">
          <div class="banking-section-title">
            <h2>{{ phone.t('Apps.banking.accounts') }}</h2>
          </div>
          <SkyList inset strong class="banking-account-list">
            <SkyListItem
              :title="phone.t('Apps.banking.bankAccount')"
              :after="formatMoney(banking.overview.bank)"
            >
              <template #media><WalletCards :size="18" /></template>
            </SkyListItem>
            <SkyListItem
              :title="phone.t('Apps.banking.cash')"
              :after="formatMoney(banking.overview.cash)"
            >
              <template #media><CircleDollarSign :size="18" /></template>
            </SkyListItem>
          </SkyList>
        </SkyCard>

        <section class="banking-transactions">
          <div class="banking-section-title">
            <h2>{{ phone.t('Apps.banking.latestTransactions') }}</h2>
            <SkyLink
              component="button"
              type="button"
              @click="activeTab = 'activity'"
            >
              {{ phone.t('Apps.banking.viewAll') }}
            </SkyLink>
          </div>
          <SkyCard
            v-if="banking.overview.transactions.length"
            :content-wrap="false"
            class="banking-card banking-transaction-card"
          >
            <SkyList inset strong class="banking-transaction-list">
              <SkyListItem
                v-for="transaction in banking.overview.transactions.slice(0, 5)"
                :key="transaction.id"
                :subtitle="formatDate(transaction.createdAt)"
                :title="transactionTitle(transaction)"
              >
                <template #media>
                  <component
                    :is="transactionIcons[transaction.kind]"
                    :size="17"
                  />
                </template>
                <template #after>
                  <b :class="{ 'is-incoming': isIncoming(transaction.kind) }">
                    {{
                      formatMoney(
                        isIncoming(transaction.kind)
                          ? transaction.amount
                          : -transaction.amount,
                        true,
                      )
                    }}
                  </b>
                </template>
              </SkyListItem>
            </SkyList>
          </SkyCard>
          <p v-else class="banking-no-transactions">
            {{ phone.t('Apps.banking.noTransactions') }}
          </p>
        </section>
      </template>

      <template v-else>
        <section class="banking-activity-hero">
          <span>{{ phone.t('Apps.banking.activity') }}</span>
          <strong>{{
            formatMoney(totals.incoming - totals.outgoing, true)
          }}</strong>
          <small>{{ phone.t('Apps.banking.recentPeriod') }}</small>
        </section>

        <SkyCard :content-wrap="false" class="banking-card banking-chart-card">
          <div class="banking-chart-legend">
            <span
              ><i class="is-incoming"></i
              >{{ phone.t('Apps.banking.incoming') }}</span
            >
            <span><i></i>{{ phone.t('Apps.banking.outgoing') }}</span>
          </div>
          <div class="banking-chart">
            <div
              v-for="day in chart"
              :key="day.date.getTime()"
              class="banking-chart__day"
              role="img"
              :aria-label="
                phone.t('Apps.banking.chartDaySummary', {
                  day: day.label,
                  incoming: formatMoney(day.incoming),
                  outgoing: formatMoney(day.outgoing),
                })
              "
            >
              <div>
                <i
                  class="is-incoming"
                  :style="{ height: `${day.incomingHeight}%` }"
                ></i>
                <i :style="{ height: `${day.outgoingHeight}%` }"></i>
              </div>
              <span>{{ day.label }}</span>
            </div>
          </div>
        </SkyCard>

        <section class="banking-transactions banking-transactions--all">
          <div class="banking-section-title">
            <h2>{{ phone.t('Apps.banking.allTransactions') }}</h2>
          </div>
          <SkyCard
            :content-wrap="false"
            class="banking-card banking-transaction-card"
          >
            <SkyList inset strong class="banking-transaction-list">
              <SkyListItem
                v-for="transaction in banking.overview.transactions"
                :key="transaction.id"
                :subtitle="formatDate(transaction.createdAt)"
                :title="transactionTitle(transaction)"
              >
                <template #media>
                  <component
                    :is="transactionIcons[transaction.kind]"
                    :size="17"
                  />
                </template>
                <template #after>
                  <b :class="{ 'is-incoming': isIncoming(transaction.kind) }">
                    {{
                      formatMoney(
                        isIncoming(transaction.kind)
                          ? transaction.amount
                          : -transaction.amount,
                        true,
                      )
                    }}
                  </b>
                </template>
              </SkyListItem>
            </SkyList>
          </SkyCard>
        </section>
      </template>
    </div>

    <SkyTabBar
      v-if="banking.overview"
      icons
      labels
      class="banking-tabbar"
      :aria-hidden="Boolean(action)"
      :inert="Boolean(action)"
      :label="phone.t('Apps.banking.navigation')"
    >
      <SkyTabButton
        :active="activeTab === 'home'"
        :label="phone.t('Apps.banking.home')"
        @click="activeTab = 'home'"
      >
        <template #icon><House :size="25" /></template>
      </SkyTabButton>
      <SkyTabButton
        :active="activeTab === 'activity'"
        :label="phone.t('Apps.banking.activity')"
        @click="activeTab = 'activity'"
      >
        <template #icon><BarChart3 :size="25" /></template>
      </SkyTabButton>
    </SkyTabBar>

    <SkySheet
      :opened="Boolean(action)"
      :ariaLabelledby="action ? `banking-${action}-title` : undefined"
      @backdropclick="closeAction"
      @escape="closeAction"
    >
      <section v-if="action" class="banking-sheet__content">
        <SkyLink
          component="button"
          class="banking-modal__close"
          :aria-label="phone.t('Common.close')"
          icon-only
          type="button"
          @click="closeAction"
        >
          <X :size="17" />
        </SkyLink>
        <span class="banking-modal__icon">
          <Send :size="23" />
        </span>
        <h2 :id="`banking-${action}-title`">
          {{ phone.t(`Apps.banking.forms.${action}.title`) }}
        </h2>
        <p>{{ phone.t(`Apps.banking.forms.${action}.body`) }}</p>
        <SkyList aria-live="polite" inset strong class="banking-form-list">
          <SkyField
            :label="phone.t('Apps.banking.recipientPhone')"
            input-id="banking-transfer-target"
            inputmode="tel"
            outline
            :placeholder="phone.t('Apps.banking.recipientPhonePlaceholder')"
            type="tel"
            :value="target"
            @input="updateTarget"
          />
          <SkyField
            :label="phone.t('Apps.banking.amount')"
            :error="formError || false"
            input-id="banking-transfer-amount"
            inputmode="numeric"
            min="1"
            outline
            :placeholder="phone.t('Apps.banking.amountPlaceholder')"
            type="number"
            :value="amount"
            @input="updateAmount"
            @keydown.enter="handleEnterAction($event, submitAction)"
          />
        </SkyList>
        <div class="banking-contact-picker">
          <span>{{ phone.t('Apps.banking.chooseContact') }}</span>
          <SkyList v-if="calls.contacts.length" inset strong>
            <SkyListItem
              v-for="contact in calls.contacts"
              :key="contact.id"
              :title="contact.name"
              :subtitle="formatPhoneNumber(contact.phone_number)"
              link
              link-component="button"
              @click="selectContact(contact)"
            />
          </SkyList>
          <p v-else>{{ phone.t('Apps.banking.noContacts') }}</p>
        </div>
        <SkyButton
          block
          large
          rounded
          :disabled="banking.isLoading"
          @click="submitAction"
        >
          <SkySpinner
            v-if="banking.isLoading"
            :label="phone.t('Common.loading')"
            :size="20"
          />
          <template v-else>
            {{ phone.t(`Apps.banking.forms.${action}.submit`) }}
            <ArrowRight :size="17" />
          </template>
        </SkyButton>
      </section>
    </SkySheet>

    <SkyToast
      :opened="cooldownToastOpened"
      position="center"
      vertical-position="bottom"
      @click="closeCooldownToast"
    >
      {{ errorMessage('reload_cooldown') }}
    </SkyToast>
  </SkyAppPage>
</template>
