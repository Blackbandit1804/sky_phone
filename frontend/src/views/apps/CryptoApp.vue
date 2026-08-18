<script setup lang="ts">
import {
  ArrowDownLeft,
  ArrowUpRight,
  BellRing,
  ChartCandlestick,
  ChartNoAxesCombined,
  ChevronRight,
  Eye,
  EyeOff,
  Fingerprint,
  History,
  LockKeyhole,
  LogOut,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
  X,
} from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useCryptoStore } from '@/stores/crypto'
import { usePhoneStore } from '@/stores/phone'
import type { CryptoMarket, CryptoSide } from '@/types/crypto'
import {
  SkyAppPage,
  SkyButton,
  SkyCard,
  SkyEmptyState,
  SkyField,
  SkyLink,
  SkyNavbar,
  SkyPillNavigation,
  SkyScrollArea,
  SkySegmented,
  SkySegmentedButton,
  SkySheet,
  SkySpinner,
  SkyStatusCard,
  SkyToggle,
} from '@/ui'

type Tab = 'portfolio' | 'markets' | 'activity' | 'profile'
type Sheet = 'trade' | 'deposit' | 'withdraw' | null
const crypto = useCryptoStore()
const phone = usePhoneStore()
const tab = ref<Tab>('portfolio')
const authMode = ref<'login' | 'register'>('login')
const activityFilter = ref<'all' | 'trades' | 'wallet'>('all')
const detail = ref<CryptoMarket | null>(null)
const sheet = ref<Sheet>(null)
const selectedMarket = ref<CryptoMarket | null>(null)
const side = ref<CryptoSide>('buy')
const handle = ref('')
const password = ref('')
const amount = ref('')
const financialPassword = ref('')
const showPassword = ref(false)
const formError = ref('')
const profileHandle = ref('')
const profilePassword = ref('')
const priceAlerts = ref(true)
const confirmations = ref(true)
const hideBalances = ref(false)
const saved = ref(false)
const period = ref('1D')

const locale = computed(() => phone.lang || 'de')
const authenticated = computed(() => crypto.data?.authenticated === true)
const profile = computed(() => crypto.data?.profile ?? null)
const markets = computed(() => crypto.data?.markets ?? [])
const holdings = computed(() => crypto.data?.holdings ?? [])
const activities = computed(() =>
  (crypto.data?.activity ?? []).filter(
    (item) =>
      activityFilter.value === 'all' ||
      (activityFilter.value === 'trades'
        ? ['buy', 'sell'].includes(item.type)
        : ['deposit', 'withdrawal'].includes(item.type)),
  ),
)
const portfolioLine = computed(() => markets.value[0]?.sparkline ?? [])
const portfolioChange = computed(() =>
  markets.value.length
    ? markets.value.reduce((sum, market) => sum + market.changePercent, 0) /
      markets.value.length
    : 0,
)
const investedValue = computed(() =>
  Math.max(
    0,
    Number(crypto.data?.portfolioValue ?? 0) -
      Number(crypto.data?.cashBalance ?? 0),
  ),
)
const cashShare = computed(() => {
  const total = Number(crypto.data?.portfolioValue ?? 0)
  return total > 0
    ? Math.min(100, (Number(crypto.data?.cashBalance ?? 0) / total) * 100)
    : 0
})
const topMover = computed(
  () =>
    [...markets.value].sort(
      (first, second) => second.changePercent - first.changePercent,
    )[0],
)
const detailHolding = computed(() =>
  holdings.value.find((item) => item.assetId === detail.value?.id),
)
const selectedHolding = computed(() =>
  holdings.value.find((item) => item.assetId === selectedMarket.value?.id),
)

function t(key: string) {
  return phone.t(`Apps.crypto.${key}`)
}
function money(value: string | number) {
  return new Intl.NumberFormat(locale.value, {
    currency: 'USD',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(Number(value) || 0)
}
function privateMoney(value: string | number) {
  return profile.value?.hideBalances ? '••••••' : money(value)
}
function quantity(value: string) {
  return new Intl.NumberFormat(locale.value, {
    maximumFractionDigits: 6,
  }).format(Number(value) || 0)
}
function compact(value: string | number) {
  return new Intl.NumberFormat(locale.value, {
    maximumFractionDigits: 2,
    notation: 'compact',
  }).format(Number(value) || 0)
}
function points(values: number[], width = 320, height = 110) {
  return values
    .map(
      (value, index) =>
        `${index * (width / Math.max(1, values.length - 1))},${height - 7 - value * (height - 14)}`,
    )
    .join(' ')
}
function market(id?: string) {
  return markets.value.find((item) => item.id === id)
}
function allocation(value: string) {
  const total = Number(crypto.data?.portfolioValue ?? 0)
  return total > 0 ? Math.min(100, (Number(value) / total) * 100) : 0
}
function errorText(code: string) {
  const value = t(`errors.${code}`)
  return value.startsWith('Apps.crypto.') ? t('errors.default') : value
}
function setTab(next: Tab) {
  detail.value = null
  tab.value = next
}
function openMarket(next: CryptoMarket) {
  detail.value = next
  period.value = '1D'
}
function openTrade(next: CryptoMarket, nextSide: CryptoSide = 'buy') {
  selectedMarket.value = next
  side.value = nextSide
  amount.value = ''
  formError.value = ''
  crypto.pendingQuote = null
  sheet.value = 'trade'
}
function openSettlement(next: 'deposit' | 'withdraw') {
  sheet.value = next
  amount.value = ''
  financialPassword.value = ''
  formError.value = ''
}
function closeSheet() {
  sheet.value = null
  crypto.pendingQuote = null
}

async function submitAuth() {
  formError.value = ''
  const success =
    authMode.value === 'register'
      ? await crypto.register(handle.value.trim(), password.value)
      : await crypto.login(password.value)
  if (!success) formError.value = errorText(crypto.error)
  else password.value = ''
}
async function submitSettlement() {
  if (sheet.value !== 'deposit' && sheet.value !== 'withdraw') return
  if (!/^\d+$/.test(amount.value) || Number(amount.value) <= 0) {
    formError.value = t('errors.invalid_amount')
    return
  }
  if (
    !(await crypto.settle(sheet.value, amount.value, financialPassword.value))
  )
    formError.value = errorText(crypto.error)
  else closeSheet()
}
async function requestQuote() {
  if (!selectedMarket.value || !/^\d+(?:\.\d{1,6})?$/.test(amount.value)) {
    formError.value = t('errors.invalid_quantity')
    return
  }
  if (
    !(await crypto.quote(selectedMarket.value.id, side.value, amount.value))
      .success
  )
    formError.value = errorText(crypto.error)
}
async function executeQuote() {
  if (!(await crypto.executeQuote())) formError.value = errorText(crypto.error)
  else closeSheet()
}
async function saveProfile() {
  saved.value = false
  formError.value = ''
  const success = await crypto.updateProfile({
    handle: profileHandle.value.trim(),
    hideBalances: hideBalances.value,
    password: profilePassword.value,
    priceAlerts: priceAlerts.value,
    tradeConfirmations: confirmations.value,
  })
  if (!success) formError.value = errorText(crypto.error)
  else {
    profilePassword.value = ''
    saved.value = true
  }
}

watch(
  profile,
  (value) => {
    if (!value) return
    profileHandle.value = value.handle
    priceAlerts.value = value.priceAlerts
    confirmations.value = value.tradeConfirmations
    hideBalances.value = value.hideBalances
  },
  { immediate: true },
)
onMounted(() => void crypto.load())
</script>

<template>
  <SkyAppPage
    class="crypto-app"
    accent="#31d6aa"
    accent-soft="rgba(49,214,170,.16)"
    dark
  >
    <SkyNavbar
      :key="
        detail ? `detail-${detail.id}` : `page-${authenticated ? tab : 'auth'}`
      "
      class="vault-navbar"
      :title="detail?.symbol ?? (authenticated ? t(`tabs.${tab}`) : t('name'))"
      :show-back="Boolean(detail)"
      back-appearance="surface"
      :back-label="t('marketDetail.back')"
      @back="detail = null"
    >
      <template #title>
        <span
          v-if="!detail && (!authenticated || tab === 'portfolio')"
          class="vault-header-brand"
        >
          <i><ChartCandlestick :size="16" /></i>
          <span>{{ t('name') }}</span>
        </span>
        <span v-else-if="detail" class="vault-detail-title">
          <i :style="{ background: detail.color }">{{ detail.logo }}</i>
          <span>
            <b>{{ detail.symbol }}</b>
            <small>{{ detail.name }}</small>
          </span>
        </span>
        <strong v-else class="vault-section-title">
          {{ t(`tabs.${tab}`) }}
        </strong>
      </template>
    </SkyNavbar>

    <SkyScrollArea
      v-if="crypto.isLoading && !crypto.data"
      key="loading"
      class="state vault-view"
      padded
      ><SkySpinner />
      <p>{{ t('loading') }}</p></SkyScrollArea
    >
    <SkyScrollArea
      v-else-if="!authenticated"
      key="auth"
      class="auth vault-view"
      padded
    >
      <div class="auth-hero">
        <span><ChartCandlestick :size="32" /></span>
        <p>{{ t('auth.eyebrow') }}</p>
        <h2>
          {{
            t(authMode === 'login' ? 'auth.loginTitle' : 'auth.registerTitle')
          }}
        </h2>
        <small>{{ t('auth.body') }}</small>
      </div>
      <SkySegmented
        strong
        :active-index="authMode === 'login' ? 0 : 1"
        :item-count="2"
        ><SkySegmentedButton
          :active="authMode === 'login'"
          @click="authMode = 'login'"
          >{{ t('auth.login') }}</SkySegmentedButton
        ><SkySegmentedButton
          :active="authMode === 'register'"
          @click="authMode = 'register'"
          >{{ t('auth.register') }}</SkySegmentedButton
        ></SkySegmented
      >
      <form class="form" @submit.prevent="submitAuth">
        <SkyField
          v-if="authMode === 'register'"
          v-model="handle"
          :label="t('auth.handle')"
          :placeholder="t('auth.handlePlaceholder')"
          maxlength="20"
          outline
        />
        <SkyField
          v-model="password"
          :label="t('auth.password')"
          :type="showPassword ? 'text' : 'password'"
          :placeholder="t('auth.passwordPlaceholder')"
          maxlength="72"
          outline
          ><template #leading><LockKeyhole :size="18" /></template
          ><template #trailing
            ><button
              class="visibility"
              type="button"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" :size="18" /><Eye
                v-else
                :size="18"
              /></button></template
        ></SkyField>
        <p class="hint"><ShieldCheck :size="15" />{{ t('auth.security') }}</p>
        <p v-if="formError" class="error">{{ formError }}</p>
        <SkyButton block type="submit">{{
          t(authMode === 'login' ? 'auth.loginAction' : 'auth.registerAction')
        }}</SkyButton>
      </form>
    </SkyScrollArea>

    <SkyScrollArea
      v-else-if="detail"
      :key="`detail-${detail.id}`"
      class="vault-view"
      with-tabbar
      padded
    >
      <section class="detail-head">
        <span class="coin large" :style="{ background: detail.color }">{{
          detail.logo
        }}</span>
        <p>{{ detail.symbol }} · {{ detail.name }}</p>
        <strong>{{ money(detail.price) }}</strong
        ><em :class="detail.changePercent >= 0 ? 'up' : 'down'"
          >{{ detail.changePercent >= 0 ? '▲' : '▼' }}
          {{ Math.abs(detail.changePercent).toFixed(2) }}% ·
          {{ t('marketDetail.today') }}</em
        >
      </section>
      <SkyCard class="big-chart"
        ><svg viewBox="0 0 320 160" preserveAspectRatio="none">
          <defs>
            <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#31d6aa" stop-opacity=".4" />
              <stop offset="1" stop-color="#31d6aa" stop-opacity="0" />
            </linearGradient>
          </defs>
          <g class="grid">
            <line
              v-for="y in [25, 65, 105, 145]"
              :key="y"
              x1="0"
              :y1="y"
              x2="320"
              :y2="y"
            />
          </g>
          <polygon
            :points="`0,160 ${points(detail.sparkline, 320, 150)} 320,160`"
            fill="url(#fill)"
          />
          <polyline :points="points(detail.sparkline, 320, 150)" />
        </svg>
        <div class="periods">
          <button
            v-for="value in ['1D', '1W', '1M', '6M', '1Y']"
            :key="value"
            :class="{ active: period === value }"
            @click="period = value"
          >
            {{ value }}
          </button>
        </div></SkyCard
      >
      <p class="detail-copy">{{ t('marketDetail.description') }}</p>
      <h2 class="title">{{ t('marketDetail.investment') }}</h2>
      <SkyCard class="investment"
        ><small>{{ t('marketDetail.totalValue') }}</small
        ><strong>{{ privateMoney(detailHolding?.value ?? '0') }}</strong>
        <div>
          <span class="coin" :style="{ background: detail.color }">{{
            detail.logo
          }}</span
          ><span
            ><b>{{ detail.name }}</b
            ><small
              >{{ quantity(detailHolding?.quantity ?? '0') }}
              {{ detail.symbol }}</small
            ></span
          ><span
            ><b>{{ privateMoney(detailHolding?.value ?? '0') }}</b
            ><small
              >{{ t('portfolio.avg') }}
              {{ money(detailHolding?.averagePrice ?? detail.price) }}</small
            ></span
          >
        </div></SkyCard
      >
      <h2 class="title">{{ t('marketDetail.statistics') }}</h2>
      <SkyCard class="stats"
        ><div>
          <span>{{ t('marketDetail.high24h') }}</span
          ><b>{{ money(detail.high24h) }}</b>
        </div>
        <div>
          <span>{{ t('marketDetail.low24h') }}</span
          ><b>{{ money(detail.low24h) }}</b>
        </div>
        <div>
          <span>{{ t('marketDetail.supply') }}</span
          ><b>{{ compact(detail.issuedSupply) }} {{ detail.symbol }}</b>
        </div>
        <div>
          <span>{{ t('marketDetail.liquidity') }}</span
          ><b>{{ compact(detail.treasuryAvailable) }} {{ detail.symbol }}</b>
        </div></SkyCard
      >
      <div class="dual">
        <SkyButton block @click="openTrade(detail, 'buy')">{{
          t('trade.buy')
        }}</SkyButton
        ><SkyButton
          block
          variant="secondary"
          @click="openTrade(detail, 'sell')"
          >{{ t('trade.sell') }}</SkyButton
        >
      </div>
    </SkyScrollArea>

    <SkyScrollArea
      v-else
      :key="`tab-${tab}`"
      class="vault-view"
      with-tabbar
      padded
    >
      <template v-if="tab === 'portfolio'">
        <section class="portfolio-shell">
          <div class="portfolio-glow" />
          <div class="portfolio-topline">
            <span><ShieldCheck :size="13" />{{ t('portfolio.total') }}</span>
            <span class="live-pill"><i />{{ t('markets.live') }}</span>
          </div>
          <div class="portfolio-value">
            <strong>{{
              privateMoney(crypto.data?.portfolioValue ?? '0')
            }}</strong>
            <span :class="portfolioChange >= 0 ? 'up' : 'down'">
              {{ portfolioChange >= 0 ? '↗' : '↘' }}
              {{ Math.abs(portfolioChange).toFixed(2) }}%
              <small>{{ t('marketDetail.today') }}</small>
            </span>
          </div>
          <div class="portfolio-chart">
            <svg viewBox="0 0 320 112" preserveAspectRatio="none">
              <defs>
                <linearGradient id="portfolio-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="#65fbd2" stop-opacity=".32" />
                  <stop offset="1" stop-color="#65fbd2" stop-opacity="0" />
                </linearGradient>
              </defs>
              <polygon
                :points="`0,112 ${points(portfolioLine, 320, 106)} 320,112`"
                fill="url(#portfolio-fill)"
              />
              <polyline :points="points(portfolioLine, 320, 106)" />
            </svg>
            <span class="chart-orb" />
          </div>
          <div class="portfolio-metrics">
            <div>
              <small>{{ t('portfolio.cash') }}</small>
              <b>{{ privateMoney(crypto.data?.cashBalance ?? '0') }}</b>
            </div>
            <i />
            <div>
              <small>{{ t('portfolio.invested') }}</small>
              <b>{{ privateMoney(investedValue) }}</b>
            </div>
          </div>
        </section>
        <div class="quick">
          <button @click="setTab('markets')">
            <span><ChartNoAxesCombined :size="20" /></span>
            <b>{{ t('quick.trade') }}</b>
            <small>{{ t('markets.live') }}</small></button
          ><button @click="openSettlement('deposit')">
            <span><ArrowDownLeft :size="20" /></span>
            <b>{{ t('actions.deposit') }}</b>
            <small>{{ t('activity.cash') }}</small></button
          ><button @click="openSettlement('withdraw')">
            <span><ArrowUpRight :size="20" /></span>
            <b>{{ t('actions.withdraw') }}</b>
            <small>{{ t('activity.cash') }}</small></button
          ><button @click="setTab('profile')">
            <span><Settings2 :size="20" /></span>
            <b>{{ t('quick.more') }}</b>
            <small>{{ t('profile.preferences') }}</small>
          </button>
        </div>
        <SkyCard class="allocation-card">
          <div class="allocation-copy">
            <span><WalletCards :size="19" /></span>
            <div>
              <small>{{ t('portfolio.allocation') }}</small>
              <b
                >{{ Math.round(100 - cashShare) }}%
                {{ t('portfolio.inMarket') }}</b
              >
            </div>
            <strong>{{ Math.round(cashShare) }}%</strong>
          </div>
          <div class="allocation-track">
            <i :style="{ width: `${Math.max(3, 100 - cashShare)}%` }" />
          </div>
        </SkyCard>
        <div class="heading">
          <h2>{{ t('portfolio.holdings') }}</h2>
          <em>{{ holdings.length }} {{ t('portfolio.assets') }}</em>
        </div>
        <SkyEmptyState
          v-if="!holdings.length"
          :title="t('portfolio.empty')"
          :description="t('portfolio.emptyBody')"
        /><button
          v-for="holding in holdings"
          v-else
          :key="holding.assetId"
          class="row asset-row"
          @click="openMarket(market(holding.assetId)!)"
        >
          <span
            class="coin"
            :style="{ background: market(holding.assetId)?.color }"
            >{{ market(holding.assetId)?.logo }}</span
          ><span
            ><b>{{ market(holding.assetId)?.name }}</b
            ><small
              >{{ quantity(holding.quantity) }}
              {{ market(holding.assetId)?.symbol }}</small
            ><i class="asset-allocation"
              ><i
                :style="{
                  width: `${allocation(holding.value)}%`,
                }" /></i></span
          ><span
            ><b>{{ privateMoney(holding.value) }}</b
            ><small
              :class="
                (market(holding.assetId)?.changePercent ?? 0) >= 0
                  ? 'up'
                  : 'down'
              "
              >{{ market(holding.assetId)?.changePercent.toFixed(2) }}%</small
            ></span
          ><ChevronRight :size="17" />
        </button>
        <SkyStatusCard
          tone="neutral"
          :title="t('portfolio.insightTitle')"
          :subtitle="t('portfolio.insightBody')"
          ><template #icon><Sparkles :size="19" /></template
        ></SkyStatusCard>
      </template>

      <template v-else-if="tab === 'markets'">
        <div class="market-head">
          <span
            ><small>{{ t('markets.eyebrow') }}</small>
            <h2>{{ t('markets.title') }}</h2></span
          ><em>{{ t('markets.live') }}</em>
        </div>
        <button
          v-if="topMover"
          class="featured-market"
          @click="openMarket(topMover)"
        >
          <div class="featured-market__top">
            <span class="coin large" :style="{ background: topMover.color }">{{
              topMover.logo
            }}</span>
            <span>
              <small>{{ t('markets.movers') }}</small>
              <b>{{ topMover.name }}</b>
              <em>{{ topMover.symbol }}</em>
            </span>
            <ChevronRight :size="18" />
          </div>
          <div class="featured-market__quote">
            <strong>{{ money(topMover.price) }}</strong>
            <span :class="topMover.changePercent >= 0 ? 'up' : 'down'">
              {{ topMover.changePercent >= 0 ? '↗' : '↘' }}
              {{ Math.abs(topMover.changePercent).toFixed(2) }}%
            </span>
          </div>
          <svg viewBox="0 0 320 74" preserveAspectRatio="none">
            <polyline :points="points(topMover.sparkline, 320, 70)" />
          </svg>
          <div class="featured-market__stats">
            <span
              ><small>{{ t('marketDetail.high24h') }}</small
              ><b>{{ money(topMover.high24h) }}</b></span
            >
            <span
              ><small>{{ t('marketDetail.low24h') }}</small
              ><b>{{ money(topMover.low24h) }}</b></span
            >
          </div>
        </button>
        <div class="heading market-list-heading">
          <h2>{{ t('portfolio.assets') }}</h2>
          <em>{{ markets.length }} {{ t('markets.live') }}</em>
        </div>
        <div class="market-grid market-grid--advanced">
          <button
            v-for="item in markets"
            :key="item.id"
            @click="openMarket(item)"
          >
            <div class="market-tile__top">
              <span class="coin" :style="{ background: item.color }">{{
                item.logo
              }}</span>
              <span
                ><b>{{ item.symbol }}</b
                ><small>{{ item.name }}</small></span
              >
              <em :class="item.changePercent >= 0 ? 'up' : 'down'">
                {{ item.changePercent >= 0 ? '+' : ''
                }}{{ item.changePercent.toFixed(2) }}%
              </em>
            </div>
            <div class="market-tile__price">
              <b>{{ money(item.price) }}</b>
              <small>{{ t('markets.today') }}</small>
            </div>
            <svg viewBox="0 0 150 52" preserveAspectRatio="none">
              <polyline :points="points(item.sparkline, 150, 50)" />
            </svg>
          </button>
        </div>
        <SkyCard class="movers"
          ><div class="heading">
            <h2>{{ t('markets.movers') }}</h2>
            <em>{{ t('markets.today') }}</em>
          </div>
          <button
            v-for="item in [...markets]
              .sort((a, b) => b.changePercent - a.changePercent)
              .slice(0, 5)"
            :key="item.id"
            @click="openMarket(item)"
          >
            <span class="coin" :style="{ background: item.color }">{{
              item.logo
            }}</span
            ><span
              ><b>{{ item.name }}</b
              ><small>{{ item.symbol }} · {{ t('markets.today') }}</small></span
            ><span
              ><b>{{ money(item.price) }}</b
              ><small :class="item.changePercent >= 0 ? 'up' : 'down'"
                >{{ item.changePercent >= 0 ? '+' : ''
                }}{{ item.changePercent.toFixed(2) }}%</small
              ></span
            >
          </button></SkyCard
        >
        <SkyStatusCard
          tone="accent"
          :title="t('markets.noticeTitle')"
          :subtitle="t('markets.notice')"
        />
      </template>

      <template v-else-if="tab === 'activity'">
        <section class="activity-head activity-dashboard">
          <div class="activity-dashboard__copy">
            <p>{{ t('activity.volume') }}</p>
            <strong>{{ privateMoney(profile?.totalVolume ?? '0') }}</strong>
            <span
              >{{ profile?.totalTrades }}
              {{ t('activity.completedTrades') }}</span
            >
          </div>
          <div class="activity-ring">
            <svg viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="29" />
              <circle class="activity-ring__value" cx="36" cy="36" r="29" />
            </svg>
            <span
              ><ShieldCheck :size="15" /><small>{{
                t('statuses.completed')
              }}</small></span
            >
          </div>
        </section>
        <SkySegmented
          strong
          :active-index="
            activityFilter === 'all' ? 0 : activityFilter === 'trades' ? 1 : 2
          "
          :item-count="3"
          ><SkySegmentedButton
            :active="activityFilter === 'all'"
            @click="activityFilter = 'all'"
            >{{ t('activity.filters.all') }}</SkySegmentedButton
          ><SkySegmentedButton
            :active="activityFilter === 'trades'"
            @click="activityFilter = 'trades'"
            >{{ t('activity.filters.trades') }}</SkySegmentedButton
          ><SkySegmentedButton
            :active="activityFilter === 'wallet'"
            @click="activityFilter = 'wallet'"
            >{{ t('activity.filters.wallet') }}</SkySegmentedButton
          ></SkySegmented
        >
        <div class="heading activity-title">
          <h2>{{ t('activity.title') }}</h2>
          <em>{{ activities.length }}</em>
        </div>
        <SkyEmptyState
          v-if="!activities.length"
          :title="t('activity.empty')"
          :description="t('activity.emptyBody')"
        />
        <div
          v-for="item in activities"
          v-else
          :key="item.id"
          class="row static activity-row"
        >
          <span :class="['activity-icon', `activity-icon--${item.type}`]">
            <ArrowDownLeft v-if="item.type === 'deposit'" :size="18" />
            <ArrowUpRight v-else-if="item.type === 'withdrawal'" :size="18" />
            <ChartNoAxesCombined v-else :size="18" /> </span
          ><span
            ><b>{{ t(`activityTypes.${item.type}`) }}</b
            ><small
              >{{ market(item.marketId)?.symbol ?? t('activity.cash') }} ·
              {{
                new Intl.DateTimeFormat(locale, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(item.createdAt)
              }}</small
            ></span
          ><span
            ><b
              :class="['buy', 'withdrawal'].includes(item.type) ? 'down' : 'up'"
              >{{ ['buy', 'withdrawal'].includes(item.type) ? '−' : '+'
              }}{{ privateMoney(item.amount) }}</b
            ><small>{{ t(`statuses.${item.status}`) }}</small></span
          >
          <i class="timeline-dot" />
        </div>
      </template>

      <template v-else>
        <section class="profile-card">
          <div class="profile-card__mesh" />
          <div class="profile-card__top">
            <span class="profile-avatar">{{
              profile?.handle.slice(0, 2).toUpperCase()
            }}</span>
            <span class="profile-status"><i />{{ t('profile.verified') }}</span>
          </div>
          <h2>@{{ profile?.handle }}</h2>
          <p><ShieldCheck :size="15" />{{ t('profile.verified') }}</p>
          <div class="profile-card__id">
            <small>VAULTX ID</small>
            <b>{{ profile?.id.slice(0, 8).toUpperCase() }}</b>
            <Fingerprint :size="26" />
          </div>
        </section>
        <div class="profile-stats profile-stats--premium">
          <div>
            <b>{{ profile?.totalTrades }}</b
            ><small>{{ t('profile.trades') }}</small>
          </div>
          <div>
            <b>{{ privateMoney(profile?.totalVolume ?? '0') }}</b
            ><small>{{ t('profile.volume') }}</small>
          </div>
          <div>
            <b>{{
              profile
                ? new Intl.DateTimeFormat(locale, {
                    month: 'short',
                    year: 'numeric',
                  }).format(profile.createdAt)
                : '—'
            }}</b>
            <small>{{ t('profile.memberSince') }}</small>
          </div>
        </div>
        <SkyCard class="security-overview">
          <div class="security-score">
            <ShieldCheck :size="22" /><b>100</b><small>/100</small>
          </div>
          <span
            ><small>{{ t('profile.securityTitle') }}</small
            ><b>{{ t('profile.verified') }}</b
            ><em>{{ t('profile.securityBody') }}</em></span
          >
        </SkyCard>
        <h2 class="title">{{ t('profile.preferences') }}</h2>
        <SkyCard class="settings"
          ><label
            ><span
              ><BellRing :size="18" /><span
                ><b>{{ t('profile.priceAlerts') }}</b
                ><small>{{ t('profile.priceAlertsBody') }}</small></span
              ></span
            ><SkyToggle v-model="priceAlerts" /></label
          ><label
            ><span
              ><Fingerprint :size="18" /><span
                ><b>{{ t('profile.confirmations') }}</b
                ><small>{{ t('profile.confirmationsBody') }}</small></span
              ></span
            ><SkyToggle v-model="confirmations" /></label
          ><label
            ><span
              ><EyeOff :size="18" /><span
                ><b>{{ t('profile.hideBalances') }}</b
                ><small>{{ t('profile.hideBalancesBody') }}</small></span
              ></span
            ><SkyToggle v-model="hideBalances" /></label
        ></SkyCard>
        <h2 class="title">{{ t('profile.identity') }}</h2>
        <form class="form profile-form" @submit.prevent="saveProfile">
          <SkyField
            v-model="profileHandle"
            :label="t('auth.handle')"
            maxlength="20"
            outline
            ><template #leading><UserRound :size="18" /></template></SkyField
          ><SkyField
            v-model="profilePassword"
            :label="t('profile.passwordForChange')"
            :placeholder="t('profile.passwordOptional')"
            type="password"
            outline
            ><template #leading><LockKeyhole :size="18" /></template
          ></SkyField>
          <p v-if="saved" class="success">
            <ShieldCheck :size="15" />{{ t('profile.saved') }}
          </p>
          <p v-if="formError" class="error">{{ formError }}</p>
          <SkyButton block type="submit">{{ t('profile.save') }}</SkyButton>
        </form>
        <SkyCard class="security"
          ><ShieldCheck :size="22" /><span
            ><b>{{ t('profile.securityTitle') }}</b
            ><small>{{ t('profile.securityBody') }}</small></span
          ></SkyCard
        ><SkyButton block variant="danger" @click="crypto.logout()"
          ><LogOut :size="18" />{{ t('logout') }}</SkyButton
        >
      </template>
    </SkyScrollArea>

    <SkyPillNavigation
      v-if="authenticated && !detail"
      layout="full"
      :label="t('navigation')"
      ><SkySegmented navigation
        ><SkySegmentedButton
          :active="tab === 'portfolio'"
          @click="setTab('portfolio')"
          ><WalletCards :size="19" /><span>{{
            t('tabs.portfolio')
          }}</span></SkySegmentedButton
        ><SkySegmentedButton
          :active="tab === 'markets'"
          @click="setTab('markets')"
          ><ChartNoAxesCombined :size="19" /><span>{{
            t('tabs.markets')
          }}</span></SkySegmentedButton
        ><SkySegmentedButton
          :active="tab === 'activity'"
          @click="setTab('activity')"
          ><History :size="19" /><span>{{
            t('tabs.activity')
          }}</span></SkySegmentedButton
        ><SkySegmentedButton
          :active="tab === 'profile'"
          @click="setTab('profile')"
          ><UserRound :size="19" /><span>{{
            t('tabs.profile')
          }}</span></SkySegmentedButton
        ></SkySegmented
      ></SkyPillNavigation
    >

    <SkySheet
      :opened="sheet !== null"
      swipe-to-close
      @backdropclick="closeSheet"
      @escape="closeSheet"
      @swipeclose="closeSheet"
      ><div v-if="sheet" class="sheet">
        <header class="sheet-header" data-sky-sheet-drag-handle>
          <div class="sheet-heading">
            <span
              class="sheet-icon"
              :style="
                sheet === 'trade' && selectedMarket
                  ? { background: selectedMarket.color }
                  : undefined
              "
            >
              <template v-if="sheet === 'trade' && selectedMarket">{{
                selectedMarket.logo
              }}</template>
              <ArrowDownLeft v-else-if="sheet === 'deposit'" :size="19" />
              <ArrowUpRight v-else :size="19" />
            </span>
            <span>
              <small>{{
                sheet === 'trade' && selectedMarket
                  ? selectedMarket.name
                  : t('activity.cash')
              }}</small>
              <h2>
                {{
                  sheet === 'trade'
                    ? `${t(`trade.${side}`)} ${selectedMarket?.symbol}`
                    : t(`actions.${sheet}`)
                }}
              </h2>
            </span>
          </div>
          <SkyLink
            component="button"
            icon-only
            class="sheet-close"
            :aria-label="phone.t('Common.close')"
            @click="closeSheet"
          >
            <X :size="18" />
          </SkyLink>
        </header>
        <template v-if="sheet === 'trade' && selectedMarket"
          ><div class="sheet-market-summary">
            <span>{{ selectedMarket.symbol }}</span>
            <b>{{ money(selectedMarket.price) }}</b>
            <em :class="selectedMarket.changePercent >= 0 ? 'up' : 'down'">
              {{ selectedMarket.changePercent >= 0 ? '↗' : '↘' }}
              {{ Math.abs(selectedMarket.changePercent).toFixed(2) }}%
            </em>
          </div>
          <SkySegmented
            strong
            :item-count="2"
            :active-index="side === 'buy' ? 0 : 1"
            ><SkySegmentedButton
              :active="side === 'buy'"
              @click="side = 'buy'"
              >{{ t('trade.buy') }}</SkySegmentedButton
            ><SkySegmentedButton
              :active="side === 'sell'"
              @click="side = 'sell'"
              >{{ t('trade.sell') }}</SkySegmentedButton
            ></SkySegmented
          ><SkyField
            v-model="amount"
            :label="t('trade.quantity')"
            placeholder="0.000000"
            inputmode="decimal"
            outline
          /><small v-if="side === 'sell' && selectedHolding"
            >{{ t('trade.available') }}
            {{ quantity(selectedHolding.quantity) }}
            {{ selectedMarket.symbol }}</small
          ><SkyCard v-if="crypto.pendingQuote" class="quote"
            ><div>
              <span>{{ t('trade.price') }}</span
              ><b>{{ money(crypto.pendingQuote.price) }}</b>
            </div>
            <div>
              <span>{{ t('trade.fee') }}</span
              ><b>{{ money(crypto.pendingQuote.fee) }}</b>
            </div>
            <div>
              <span>{{ t('trade.total') }}</span
              ><b>{{ money(crypto.pendingQuote.net) }}</b>
            </div>
            <small>{{ t('trade.quoteExpiry') }}</small></SkyCard
          >
          <p v-if="formError" class="error">{{ formError }}</p>
          <SkyButton
            block
            @click="crypto.pendingQuote ? executeQuote() : requestQuote()"
            >{{
              t(crypto.pendingQuote ? 'trade.confirm' : 'trade.getQuote')
            }}</SkyButton
          ></template
        ><template v-else
          ><p class="sheet-copy">
            {{
              t(
                sheet === 'deposit'
                  ? 'settlement.depositBody'
                  : 'settlement.withdrawBody',
              )
            }}
          </p>
          <SkyField
            v-model="amount"
            :label="t('settlement.amount')"
            inputmode="numeric"
            outline
          /><SkyField
            v-model="financialPassword"
            :label="t('auth.password')"
            type="password"
            outline
          />
          <p v-if="formError" class="error">{{ formError }}</p>
          <SkyButton block @click="submitSettlement">{{
            t('settlement.confirm')
          }}</SkyButton></template
        >
      </div></SkySheet
    >
  </SkyAppPage>
</template>

<style scoped>
.crypto-app {
  --card: #11151b;
  --muted: rgba(225, 234, 240, 0.58);
  color: #f8fbfd;
  background:
    radial-gradient(
      circle at 50% -10%,
      rgba(42, 91, 105, 0.25),
      transparent 33%
    ),
    #05070b;
}
.state,
.auth {
  display: grid;
  align-content: center;
  gap: 18px;
  min-height: 100%;
  text-align: center;
}
.auth-hero {
  display: grid;
  justify-items: center;
  gap: 7px;
}
.auth-hero > span,
.profile-head > span {
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  border-radius: 22px;
  color: #04110e;
  background: linear-gradient(145deg, #6ff5cd, #3d8fff);
  box-shadow: 0 18px 45px rgba(49, 214, 170, 0.18);
}
.auth-hero p,
.auth-hero h2,
.auth-hero small {
  margin: 0;
}
.auth-hero p {
  color: #49e4b2;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.auth-hero small {
  max-width: 280px;
  color: var(--muted);
  line-height: 1.45;
}
.form {
  display: grid;
  gap: 13px;
  text-align: left;
}
.hint,
.success {
  display: flex;
  gap: 7px;
  align-items: center;
  color: var(--muted);
  font-size: 11px;
}
.success,
.up {
  color: #31d6aa !important;
}
.error,
.down {
  color: #ff5c70 !important;
}
.visibility {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: inherit;
  background: none;
  border: 0;
}
.portfolio {
  display: grid;
  justify-items: center;
  min-height: 225px;
  text-align: center;
}
.portfolio p {
  display: flex;
  gap: 5px;
  align-items: center;
  margin: 15px 0 0;
  color: var(--muted);
  font-size: 11px;
}
.portfolio > strong {
  margin: 7px 0 2px;
  font-size: 38px;
  letter-spacing: -0.05em;
}
.portfolio em,
.detail-head em {
  font-size: 11px;
  font-style: normal;
}
.portfolio svg {
  width: calc(100% + 32px);
  height: 100px;
  margin-top: 8px;
}
.portfolio polyline,
.big-chart polyline,
.market-grid polyline {
  fill: none;
  stroke: #dffff6;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  filter: drop-shadow(0 0 7px rgba(49, 214, 170, 0.45));
}
.quick {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 20px;
}
.quick button {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 0;
  color: #eef3f5;
  font-size: 9px;
  background: none;
  border: 0;
}
.quick button span {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 17px;
  background: #242a33;
}
.cash {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 15px;
  background: linear-gradient(135deg, #172026, #101419);
}
.cash > svg {
  color: #49e4b2;
}
.cash span {
  display: grid;
  flex: 1;
}
.cash small {
  color: var(--muted);
}
.heading,
.market-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 2px 10px;
}
.heading h2,
.market-head h2,
.title {
  margin: 0;
  font-size: 18px;
}
.heading button {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: #fff;
  background: none;
  border: 0;
}
.title {
  margin: 23px 2px 11px;
}
.row {
  display: grid;
  grid-template-columns: 42px 1fr auto 18px;
  gap: 10px;
  align-items: center;
  width: 100%;
  margin-bottom: 8px;
  padding: 11px 12px;
  color: #fff;
  text-align: left;
  background: var(--card);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 18px;
}
.row.static {
  grid-template-columns: 42px 1fr auto;
}
.row span:last-of-type {
  text-align: right;
}
.row b,
.row small {
  display: block;
}
.row small {
  margin-top: 3px;
  color: var(--muted);
  font-size: 9px;
}
.coin,
.activity-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 13px;
  color: #fff;
  font-weight: 900;
}
.activity-icon {
  color: #49e4b2;
  background: rgba(49, 214, 170, 0.12);
}
.market-head small {
  color: #49e4b2;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.market-head em,
.heading em {
  color: #49e4b2;
  font-size: 9px;
  font-style: normal;
}
.market-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 18px;
}
.market-grid button {
  display: grid;
  min-height: 188px;
  padding: 15px;
  color: #fff;
  text-align: left;
  background: var(--card);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 21px;
}
.market-grid button > small {
  margin-top: 9px;
  color: var(--muted);
}
.market-grid button > b {
  font-size: 18px;
}
.market-grid em {
  font-size: 10px;
  font-style: normal;
}
.market-grid svg {
  align-self: end;
  width: 100%;
  height: 48px;
}
.market-grid polyline {
  stroke: #31d6aa;
  stroke-width: 2;
}
.movers {
  padding: 8px 12px;
  margin-bottom: 15px;
  background: var(--card);
}
.movers button {
  display: grid;
  grid-template-columns: 42px 1fr auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 10px 2px;
  color: #fff;
  text-align: left;
  background: none;
  border: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.movers button span:last-child {
  text-align: right;
}
.movers b,
.movers small {
  display: block;
}
.movers small {
  color: var(--muted);
  font-size: 9px;
}
.detail-head {
  display: grid;
  justify-items: center;
  padding: 12px 0 15px;
  text-align: center;
}
.coin.large {
  width: 58px;
  height: 58px;
  border-radius: 20px;
  font-size: 20px;
}
.detail-head p {
  margin: 9px 0 0;
  color: var(--muted);
  font-size: 11px;
}
.detail-head > strong {
  font-size: 34px;
}
.big-chart {
  padding: 7px 0;
  background: #080b0e;
  overflow: hidden;
}
.big-chart svg {
  width: 100%;
  height: 160px;
}
.grid line {
  stroke: rgba(255, 255, 255, 0.06);
}
.periods {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 3px 9px;
}
.periods button {
  height: 35px;
  color: var(--muted);
  background: none;
  border: 0;
  border-radius: 11px;
}
.periods button.active {
  color: #fff;
  background: #252a31;
}
.detail-copy {
  color: var(--muted);
  font-size: 10px;
  line-height: 1.5;
}
.investment,
.stats {
  padding: 16px;
  background: var(--card);
}
.investment > small {
  color: var(--muted);
}
.investment > strong {
  display: block;
  margin: 3px 0 14px;
  font-size: 28px;
}
.investment > div {
  display: grid;
  grid-template-columns: 42px 1fr auto;
  gap: 10px;
  align-items: center;
}
.investment > div span:last-child {
  text-align: right;
}
.investment b,
.investment small {
  display: block;
}
.investment small {
  color: var(--muted);
  font-size: 9px;
}
.stats div {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 10px;
}
.stats div:last-child {
  border: 0;
}
.stats span {
  color: var(--muted);
}
.dual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin-top: 16px;
}
.activity-head,
.profile-head {
  display: grid;
  justify-items: center;
  padding: 22px 0;
  text-align: center;
}
.activity-head p,
.activity-head span {
  margin: 0;
  color: var(--muted);
  font-size: 10px;
}
.activity-head strong {
  font-size: 32px;
}
.profile-head > span {
  width: 78px;
  height: 78px;
  font-size: 24px;
  font-weight: 900;
}
.profile-head h2 {
  margin: 10px 0 2px;
}
.profile-head p {
  display: flex;
  gap: 5px;
  align-items: center;
  margin: 0;
  color: #49e4b2;
  font-size: 10px;
}
.profile-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
}
.profile-stats div {
  display: grid;
  gap: 4px;
  padding: 13px 5px;
  text-align: center;
  background: var(--card);
  border-radius: 16px;
}
.profile-stats small {
  color: var(--muted);
  font-size: 8px;
}
.settings {
  padding: 0 14px;
  background: var(--card);
}
.settings label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 67px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.settings label > span {
  display: flex;
  gap: 10px;
  align-items: center;
}
.settings b,
.settings small {
  display: block;
}
.settings small {
  max-width: 180px;
  color: var(--muted);
  font-size: 8px;
}
.profile-form {
  padding: 15px;
  background: var(--card);
  border-radius: 20px;
}
.security {
  display: flex;
  gap: 11px;
  align-items: center;
  margin: 15px 0;
  padding: 15px;
  color: #49e4b2;
  background: rgba(49, 214, 170, 0.08);
}
.security span {
  display: grid;
}
.security small {
  color: var(--muted);
  font-size: 9px;
}
.sheet {
  display: grid;
  gap: 13px;
  padding: 2px 18px calc(var(--sky-safe-area-bottom) + 20px);
}
.sheet h2,
.sheet p {
  margin: 0;
}
.quote {
  display: grid;
  gap: 8px;
  padding: 14px;
}
.quote div {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 11px;
}
.quote small {
  color: var(--muted);
  font-size: 9px;
}

/* VaultX owns a dense trading surface while shared phone geometry stays in Sky UI. */
.crypto-app {
  --card: #10151d;
  --card-strong: #151c26;
  --muted: rgba(220, 231, 238, 0.57);
  --vault-mint: #65fbd2;
  --vault-blue: #68a7ff;
  background:
    radial-gradient(
      circle at 88% 9%,
      rgba(71, 133, 175, 0.16),
      transparent 28%
    ),
    radial-gradient(
      circle at 0% 34%,
      rgba(51, 219, 176, 0.09),
      transparent 28%
    ),
    linear-gradient(180deg, #070b11 0%, #030509 74%);
}
.crypto-app::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background-image: linear-gradient(
    rgba(255, 255, 255, 0.018) 1px,
    transparent 1px
  );
  background-size: 100% 48px;
  mask-image: linear-gradient(to bottom, #000, transparent 58%);
}
.crypto-app :deep(.sky-navbar) {
  --sky-navbar-glass: #070b11;
  z-index: 12;
  color: #f8fbfd;
  background: #070b11;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.vault-header-brand {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}
.vault-header-brand > i {
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  color: #07100e;
  background: linear-gradient(145deg, #9affe4, #5f9dff);
  border: 1px solid rgba(255, 255, 255, 0.38);
  border-radius: 8px;
  box-shadow: 0 7px 18px rgba(101, 251, 210, 0.16);
}
.vault-section-title {
  font-size: 17px;
  letter-spacing: -0.02em;
}
.vault-detail-title {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}
.vault-detail-title > i {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  color: #fff;
  font-size: 11px;
  font-style: normal;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
}
.vault-detail-title > span {
  display: grid;
  justify-items: start;
  line-height: 1.05;
}
.vault-detail-title b {
  font-size: 13px;
}
.vault-detail-title small {
  margin-top: 2px;
  color: var(--muted);
  font-size: 8px;
  font-weight: 600;
}
.crypto-app :deep(.sky-scroll-area__content) {
  position: relative;
}
.crypto-app :deep(.sky-pill-navigation) {
  --sky-glass-solid: rgba(14, 19, 27, 0.97);
}
.crypto-app :deep(.sky-pill-navigation .sky-segmented-button--active) {
  color: #fff;
}
.auth-hero > span {
  position: relative;
  width: 76px;
  height: 76px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 26px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.8), transparent 42%),
    linear-gradient(145deg, #7dffe0, #3977ff);
  box-shadow:
    0 22px 70px rgba(60, 224, 184, 0.22),
    inset 0 0 24px rgba(255, 255, 255, 0.3);
}
.auth-hero > span::after {
  position: absolute;
  right: -5px;
  bottom: -5px;
  width: 18px;
  height: 18px;
  border: 4px solid #070b11;
  border-radius: 50%;
  content: '';
  background: var(--vault-mint);
}
.portfolio-shell {
  position: relative;
  min-height: 294px;
  margin-bottom: 12px;
  padding: 18px 17px 15px;
  overflow: hidden;
  background:
    radial-gradient(
      circle at 80% 12%,
      rgba(91, 159, 255, 0.2),
      transparent 27%
    ),
    radial-gradient(
      circle at 24% 82%,
      rgba(101, 251, 210, 0.16),
      transparent 35%
    ),
    linear-gradient(145deg, #151d28, #0a0f16 66%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 30px;
  box-shadow:
    0 22px 50px rgba(0, 0, 0, 0.36),
    inset 0 1px rgba(255, 255, 255, 0.08);
}
.portfolio-shell::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background: linear-gradient(
    112deg,
    transparent 38%,
    rgba(255, 255, 255, 0.045) 49%,
    transparent 60%
  );
}
.portfolio-glow {
  position: absolute;
  top: -64px;
  right: -50px;
  width: 190px;
  height: 190px;
  border: 1px solid rgba(101, 251, 210, 0.1);
  border-radius: 50%;
  box-shadow: 0 0 65px rgba(101, 251, 210, 0.08);
}
.portfolio-glow::before,
.portfolio-glow::after {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: inherit;
  content: '';
}
.portfolio-glow::before {
  inset: 22px;
}
.portfolio-glow::after {
  inset: 47px;
}
.portfolio-topline,
.portfolio-value,
.portfolio-metrics,
.allocation-copy,
.market-tile__top,
.featured-market__top,
.featured-market__quote,
.featured-market__stats {
  display: flex;
  align-items: center;
}
.portfolio-topline {
  position: relative;
  z-index: 1;
  justify-content: space-between;
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.portfolio-topline > span:first-child {
  display: flex;
  gap: 6px;
  align-items: center;
}
.portfolio-topline svg {
  color: var(--vault-mint);
}
.live-pill,
.profile-status {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 6px 9px;
  color: rgba(255, 255, 255, 0.76);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--sky-radius-pill);
}
.live-pill i,
.profile-status i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vault-mint);
  box-shadow: 0 0 9px var(--vault-mint);
}
.portfolio-value {
  position: relative;
  z-index: 1;
  justify-content: space-between;
  margin-top: 15px;
}
.portfolio-value strong {
  font-size: 35px;
  letter-spacing: -0.055em;
}
.portfolio-value > span {
  display: grid;
  justify-items: end;
  font-size: 12px;
  font-weight: 800;
}
.portfolio-value small {
  margin-top: 2px;
  color: var(--muted);
  font-size: 8px;
  font-weight: 600;
}
.portfolio-chart {
  position: relative;
  height: 112px;
  margin: 2px -17px 0;
}
.portfolio-chart svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.portfolio-chart polyline,
.featured-market polyline {
  fill: none;
  stroke: #dffff6;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  filter: drop-shadow(0 0 8px rgba(101, 251, 210, 0.5));
}
.chart-orb {
  position: absolute;
  right: 11%;
  top: 28%;
  width: 9px;
  height: 9px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: var(--vault-mint);
  box-shadow:
    0 0 0 5px rgba(101, 251, 210, 0.12),
    0 0 17px var(--vault-mint);
}
.portfolio-metrics {
  position: relative;
  z-index: 1;
  justify-content: space-around;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
.portfolio-metrics div {
  display: grid;
  gap: 2px;
  min-width: 40%;
}
.portfolio-metrics div:last-child {
  text-align: right;
}
.portfolio-metrics small {
  color: var(--muted);
  font-size: 8px;
}
.portfolio-metrics b {
  font-size: 12px;
}
.portfolio-metrics > i {
  width: 1px;
  height: 27px;
  background: rgba(255, 255, 255, 0.08);
}
.quick {
  gap: 8px;
  margin: 0 0 14px;
}
.quick button {
  align-content: start;
  min-height: 94px;
  padding: 10px 5px 8px;
  background: linear-gradient(
    160deg,
    rgba(30, 39, 51, 0.94),
    rgba(12, 17, 24, 0.94)
  );
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: 19px;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.045);
}
.quick button span {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(101, 251, 210, 0.14);
  border-radius: 14px;
  color: var(--vault-mint);
  background: rgba(101, 251, 210, 0.08);
}
.quick button b {
  font-size: 9px;
}
.quick button small {
  max-width: 62px;
  overflow: hidden;
  color: var(--muted);
  font-size: 7px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.allocation-card {
  margin-bottom: 21px;
  padding: 14px;
  background: linear-gradient(
    125deg,
    rgba(21, 29, 39, 0.98),
    rgba(12, 17, 23, 0.98)
  );
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.allocation-copy {
  gap: 10px;
}
.allocation-copy > span {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  color: var(--vault-mint);
  background: rgba(101, 251, 210, 0.1);
  border-radius: 13px;
}
.allocation-copy > div {
  display: grid;
  flex: 1;
  gap: 2px;
}
.allocation-copy small {
  color: var(--muted);
  font-size: 8px;
}
.allocation-copy b {
  font-size: 11px;
}
.allocation-copy > strong {
  color: var(--vault-mint);
  font-size: 14px;
}
.allocation-track,
.asset-allocation {
  display: block;
  height: 4px;
  margin-top: 11px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.07);
  border-radius: var(--sky-radius-pill);
}
.allocation-track i,
.asset-allocation i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--vault-mint), var(--vault-blue));
  border-radius: inherit;
}
.asset-row {
  min-height: 72px;
  margin-bottom: 9px;
  padding: 12px;
  background: linear-gradient(
    145deg,
    rgba(19, 26, 35, 0.97),
    rgba(10, 14, 20, 0.97)
  );
  border-color: rgba(255, 255, 255, 0.07);
  border-radius: 20px;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.035);
}
.asset-allocation {
  width: 72px;
  height: 3px;
  margin-top: 7px;
}
.featured-market {
  position: relative;
  width: 100%;
  margin-bottom: 20px;
  padding: 16px;
  overflow: hidden;
  color: #fff;
  text-align: left;
  background:
    radial-gradient(
      circle at 88% 12%,
      rgba(101, 251, 210, 0.16),
      transparent 28%
    ),
    linear-gradient(145deg, #18212d, #0a0f16 68%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 26px;
  box-shadow:
    0 20px 45px rgba(0, 0, 0, 0.28),
    inset 0 1px rgba(255, 255, 255, 0.07);
}
.featured-market__top {
  gap: 11px;
}
.featured-market__top > span:nth-child(2) {
  display: grid;
  flex: 1;
}
.featured-market__top small {
  color: var(--vault-mint);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.featured-market__top b {
  margin-top: 2px;
  font-size: 16px;
}
.featured-market__top em {
  color: var(--muted);
  font-size: 8px;
  font-style: normal;
}
.featured-market__quote {
  justify-content: space-between;
  margin-top: 17px;
}
.featured-market__quote strong {
  font-size: 28px;
  letter-spacing: -0.04em;
}
.featured-market__quote span {
  font-size: 11px;
  font-weight: 800;
}
.featured-market > svg {
  width: calc(100% + 32px);
  height: 74px;
  margin: 2px -16px 6px;
}
.featured-market__stats {
  gap: 8px;
}
.featured-market__stats > span {
  display: grid;
  flex: 1;
  gap: 2px;
  padding: 9px 10px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}
.featured-market__stats small {
  color: var(--muted);
  font-size: 7px;
}
.featured-market__stats b {
  font-size: 10px;
}
.market-list-heading {
  margin-top: 2px;
}
.market-grid--advanced {
  grid-template-columns: 1fr;
  gap: 9px;
}
.market-grid--advanced button {
  display: block;
  min-height: 154px;
  padding: 14px;
  background: linear-gradient(
    145deg,
    rgba(19, 26, 35, 0.96),
    rgba(10, 14, 20, 0.96)
  );
  border-radius: 20px;
}
.market-tile__top {
  gap: 10px;
}
.market-tile__top > span:nth-child(2) {
  display: grid;
  flex: 1;
}
.market-tile__top b {
  font-size: 12px;
}
.market-tile__top small {
  margin: 1px 0 0 !important;
  font-size: 8px !important;
}
.market-tile__top em {
  padding: 5px 7px;
  font-size: 9px;
  background: rgba(101, 251, 210, 0.08);
  border-radius: var(--sky-radius-pill);
}
.market-tile__price {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 11px;
}
.market-tile__price b {
  font-size: 20px;
}
.market-tile__price small {
  margin: 0 !important;
}
.market-grid--advanced svg {
  height: 43px;
  margin-top: 4px;
}
.activity-dashboard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding: 20px 18px;
  text-align: left;
  background:
    radial-gradient(
      circle at 90% 20%,
      rgba(101, 251, 210, 0.16),
      transparent 31%
    ),
    linear-gradient(145deg, #17202b, #0b1017);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 26px;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.28);
}
.activity-dashboard__copy {
  display: grid;
  gap: 3px;
}
.activity-dashboard__copy strong {
  font-size: 27px;
  letter-spacing: -0.045em;
}
.activity-ring {
  position: relative;
  width: 76px;
  height: 76px;
}
.activity-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.activity-ring circle {
  fill: none;
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 6;
}
.activity-ring .activity-ring__value {
  stroke: var(--vault-mint);
  stroke-linecap: round;
  stroke-dasharray: 168 182;
  filter: drop-shadow(0 0 5px rgba(101, 251, 210, 0.45));
}
.activity-ring > span {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  color: var(--vault-mint);
}
.activity-ring small {
  max-width: 52px;
  margin-top: 2px;
  color: var(--muted);
  font-size: 6px;
  text-align: center;
}
.activity-title {
  margin-top: 22px;
}
.activity-row {
  position: relative;
  min-height: 70px;
  margin-left: 10px;
  width: calc(100% - 10px);
  overflow: visible;
  background: linear-gradient(
    145deg,
    rgba(19, 26, 35, 0.95),
    rgba(9, 13, 18, 0.95)
  );
}
.activity-row::before {
  position: absolute;
  top: -13px;
  bottom: -13px;
  left: -11px;
  width: 1px;
  content: '';
  background: rgba(255, 255, 255, 0.09);
}
.timeline-dot {
  position: absolute;
  top: 31px;
  left: -14px;
  width: 7px;
  height: 7px;
  border: 2px solid #070b11;
  border-radius: 50%;
  background: var(--vault-mint);
  box-shadow: 0 0 7px var(--vault-mint);
}
.activity-icon--withdrawal {
  color: #ff7588;
  background: rgba(255, 92, 112, 0.1);
}
.activity-icon--deposit {
  color: var(--vault-blue);
  background: rgba(104, 167, 255, 0.1);
}
.profile-card {
  position: relative;
  min-height: 225px;
  padding: 18px;
  overflow: hidden;
  background:
    radial-gradient(
      circle at 82% 14%,
      rgba(104, 167, 255, 0.28),
      transparent 30%
    ),
    radial-gradient(
      circle at 16% 90%,
      rgba(101, 251, 210, 0.2),
      transparent 30%
    ),
    linear-gradient(145deg, #1a2532, #0b1119 70%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 29px;
  box-shadow:
    0 22px 55px rgba(0, 0, 0, 0.35),
    inset 0 1px rgba(255, 255, 255, 0.08);
}
.profile-card__mesh {
  position: absolute;
  right: -35px;
  bottom: -50px;
  width: 190px;
  height: 190px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  box-shadow:
    inset 0 0 0 24px rgba(255, 255, 255, 0.015),
    inset 0 0 0 48px rgba(255, 255, 255, 0.012);
}
.profile-card__top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.profile-avatar {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  color: #07100e;
  font-size: 17px;
  font-weight: 900;
  background: linear-gradient(145deg, #b8ffea, #4b94ff);
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 19px;
  box-shadow: 0 12px 30px rgba(101, 251, 210, 0.18);
}
.profile-status {
  max-width: 150px;
  color: var(--vault-mint);
  font-size: 7px;
}
.profile-card h2 {
  position: relative;
  margin: 14px 0 2px;
  font-size: 24px;
}
.profile-card > p {
  position: relative;
  display: flex;
  gap: 6px;
  align-items: center;
  margin: 0;
  color: var(--muted);
  font-size: 9px;
}
.profile-card > p svg {
  color: var(--vault-mint);
}
.profile-card__id {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.profile-card__id small {
  color: var(--muted);
  font-size: 7px;
  letter-spacing: 0.14em;
}
.profile-card__id b {
  grid-column: 1;
  margin-top: 2px;
  font-size: 11px;
  letter-spacing: 0.16em;
}
.profile-card__id svg {
  grid-column: 2;
  grid-row: 1 / span 2;
  color: rgba(255, 255, 255, 0.45);
}
.profile-stats--premium {
  margin-top: 10px;
}
.profile-stats--premium div {
  min-height: 66px;
  align-content: center;
  background: linear-gradient(145deg, #151c25, #0b1016);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.security-overview {
  display: flex;
  gap: 13px;
  align-items: center;
  margin-top: 11px;
  padding: 13px;
  background: linear-gradient(
    135deg,
    rgba(101, 251, 210, 0.09),
    rgba(104, 167, 255, 0.06)
  );
  border: 1px solid rgba(101, 251, 210, 0.14);
}
.security-score {
  position: relative;
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  flex: 0 0 auto;
  color: var(--vault-mint);
  border: 4px solid rgba(101, 251, 210, 0.2);
  border-top-color: var(--vault-mint);
  border-radius: 50%;
}
.security-score svg {
  position: absolute;
  opacity: 0.16;
}
.security-score b {
  font-size: 14px;
  line-height: 1;
}
.security-score small {
  font-size: 6px;
}
.security-overview > span {
  display: grid;
  gap: 2px;
}
.security-overview > span small {
  color: var(--vault-mint);
  font-size: 8px;
}
.security-overview > span b {
  font-size: 11px;
}
.security-overview > span em {
  color: var(--muted);
  font-size: 7px;
  font-style: normal;
  line-height: 1.35;
}
.settings,
.profile-form,
.security,
.stats,
.investment,
.movers {
  background: linear-gradient(
    145deg,
    rgba(20, 27, 36, 0.97),
    rgba(9, 13, 18, 0.97)
  );
  border: 1px solid rgba(255, 255, 255, 0.065);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.035);
}
.settings label > span > svg {
  color: var(--vault-mint);
}
.detail-head {
  position: relative;
  margin-bottom: 10px;
  padding: 18px 0 10px;
}
.detail-head::before {
  position: absolute;
  top: -65px;
  width: 230px;
  height: 230px;
  border-radius: 50%;
  content: '';
  background: radial-gradient(
    circle,
    rgba(101, 251, 210, 0.13),
    transparent 65%
  );
}
.detail-head > * {
  position: relative;
}
.big-chart {
  background:
    linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(145deg, #101720, #070b10);
  background-size:
    100% 40px,
    53px 100%,
    auto;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
}
.periods {
  margin: 0 7px 7px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.035);
  border-radius: 14px;
}
.periods button.active {
  color: #07100e;
  background: var(--vault-mint);
  box-shadow: 0 5px 18px rgba(101, 251, 210, 0.18);
}
.dual {
  position: sticky;
  bottom: calc(var(--sky-safe-area-bottom) + 4px);
  z-index: 3;
  padding: 6px;
  background: rgba(7, 10, 14, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.55);
}
.vault-view {
  animation: vault-view-in 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes vault-view-in {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
.crypto-app :deep(.sky-sheet__panel) {
  max-height: calc(100% - var(--sky-safe-area-top) - 20px);
  overflow-y: auto;
  color: #f8fbfd;
  background: #0d1219;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-bottom: 0;
  border-radius: 28px 28px 0 0;
  box-shadow: 0 -22px 70px rgba(0, 0, 0, 0.52);
}
.crypto-app :deep(.sky-sheet__grabber) {
  background: rgba(255, 255, 255, 0.2);
}
.sheet {
  background:
    radial-gradient(
      circle at 92% 0%,
      rgba(101, 251, 210, 0.1),
      transparent 27%
    ),
    #0d1219;
}
.sheet-header,
.sheet-heading,
.sheet-market-summary {
  display: flex;
  align-items: center;
}
.sheet-header {
  min-height: 52px;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.sheet-heading {
  min-width: 0;
  gap: 10px;
}
.sheet-heading > span:last-child {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.sheet-heading small {
  overflow: hidden;
  color: var(--muted);
  font-size: 8px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sheet-heading h2 {
  font-size: 18px;
  letter-spacing: -0.025em;
}
.sheet-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  color: #07100e;
  font-size: 15px;
  font-weight: 900;
  background: linear-gradient(145deg, var(--vault-mint), var(--vault-blue));
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  box-shadow: 0 9px 24px rgba(101, 251, 210, 0.12);
}
.sheet-header :deep(.sheet-close) {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  min-width: 38px;
  color: #f8fbfd;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 50%;
}
.sheet-market-summary {
  justify-content: space-between;
  gap: 9px;
  padding: 12px 13px;
  background: linear-gradient(145deg, #151d27, #0b1016);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
}
.sheet-market-summary span {
  color: var(--muted);
  font-size: 9px;
  font-weight: 800;
}
.sheet-market-summary b {
  flex: 1;
  font-size: 13px;
}
.sheet-market-summary em {
  font-size: 9px;
  font-style: normal;
  font-weight: 800;
}
.sheet-copy {
  color: var(--muted);
  font-size: 10px;
  line-height: 1.5;
}
.quote {
  background: linear-gradient(145deg, #151d27, #0c1117);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
@media (prefers-reduced-motion: reduce) {
  .portfolio-shell::after,
  .chart-orb {
    display: none;
  }
  .vault-view {
    animation: none;
  }
}
.phone-app--performance .portfolio-shell,
.phone-app--performance .featured-market,
.phone-app--performance .profile-card {
  box-shadow: none;
}
</style>
