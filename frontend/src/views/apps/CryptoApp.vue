<script setup lang="ts">
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
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
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
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
      :title="detail?.symbol ?? t('name')"
      :subtitle="
        detail?.name ?? (authenticated ? `@${profile?.handle}` : t('subtitle'))
      "
      large
    >
      <template v-if="detail" #left
        ><SkyLink :aria-label="t('marketDetail.back')" @click="detail = null"
          ><ArrowLeft :size="19" /></SkyLink
      ></template>
      <template v-else-if="authenticated" #right
        ><SkyLink :aria-label="t('refresh')" @click="crypto.load()"
          ><RefreshCw :size="18" /></SkyLink
      ></template>
    </SkyNavbar>

    <SkyScrollArea v-if="crypto.isLoading && !crypto.data" class="state" padded
      ><SkySpinner />
      <p>{{ t('loading') }}</p></SkyScrollArea
    >
    <SkyScrollArea v-else-if="!authenticated" class="auth" padded>
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

    <SkyScrollArea v-else-if="detail" with-tabbar padded>
      <section class="detail-head">
        <span class="coin large" :style="{ background: detail.color }">{{
          detail.symbol[0]
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
            detail.symbol[0]
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

    <SkyScrollArea v-else with-tabbar padded>
      <template v-if="tab === 'portfolio'">
        <section class="portfolio">
          <p>{{ t('portfolio.total') }} <ShieldCheck :size="14" /></p>
          <strong>{{ privateMoney(crypto.data?.portfolioValue ?? '0') }}</strong
          ><em :class="portfolioChange >= 0 ? 'up' : 'down'"
            >{{ portfolioChange >= 0 ? '▲' : '▼' }}
            {{ Math.abs(portfolioChange).toFixed(2) }}% ·
            {{ t('marketDetail.today') }}</em
          ><svg viewBox="0 0 320 100" preserveAspectRatio="none">
            <polyline :points="points(portfolioLine, 320, 96)" />
          </svg>
        </section>
        <div class="quick">
          <button @click="setTab('markets')">
            <span><ChartNoAxesCombined :size="21" /></span
            >{{ t('quick.trade') }}</button
          ><button @click="openSettlement('deposit')">
            <span><ArrowDownLeft :size="21" /></span
            >{{ t('actions.deposit') }}</button
          ><button @click="openSettlement('withdraw')">
            <span><ArrowUpRight :size="21" /></span
            >{{ t('actions.withdraw') }}</button
          ><button @click="setTab('profile')">
            <span><Settings2 :size="21" /></span>{{ t('quick.more') }}
          </button>
        </div>
        <SkyCard class="cash"
          ><WalletCards :size="20" /><span
            ><small>{{ t('portfolio.cash') }}</small
            ><b>{{ privateMoney(crypto.data?.cashBalance ?? '0') }}</b></span
          ><ChevronRight :size="18"
        /></SkyCard>
        <div class="heading">
          <h2>{{ t('portfolio.holdings') }}</h2>
          <button @click="crypto.load()"><RefreshCw :size="17" /></button>
        </div>
        <SkyEmptyState
          v-if="!holdings.length"
          :title="t('portfolio.empty')"
          :description="t('portfolio.emptyBody')"
        /><button
          v-for="holding in holdings"
          v-else
          :key="holding.assetId"
          class="row"
          @click="openMarket(market(holding.assetId)!)"
        >
          <span
            class="coin"
            :style="{ background: market(holding.assetId)?.color }"
            >{{ market(holding.assetId)?.symbol[0] }}</span
          ><span
            ><b>{{ market(holding.assetId)?.name }}</b
            ><small
              >{{ quantity(holding.quantity) }}
              {{ market(holding.assetId)?.symbol }}</small
            ></span
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
        <div class="market-grid">
          <button
            v-for="item in markets.slice(0, 2)"
            :key="item.id"
            @click="openMarket(item)"
          >
            <span class="coin" :style="{ background: item.color }">{{
              item.symbol[0]
            }}</span
            ><small>{{ item.symbol }}</small
            ><b>{{ money(item.price) }}</b
            ><em :class="item.changePercent >= 0 ? 'up' : 'down'"
              >{{ item.changePercent >= 0 ? '▲' : '▼' }}
              {{ Math.abs(item.changePercent).toFixed(2) }}%</em
            ><svg viewBox="0 0 120 48" preserveAspectRatio="none">
              <polyline :points="points(item.sparkline, 120, 46)" />
            </svg>
          </button>
        </div>
        <SkyCard class="movers"
          ><div class="heading">
            <h2>{{ t('markets.movers') }}</h2>
            <em>{{ t('markets.today') }}</em>
          </div>
          <button
            v-for="item in [...markets].sort(
              (a, b) => b.changePercent - a.changePercent,
            )"
            :key="item.id"
            @click="openMarket(item)"
          >
            <span class="coin" :style="{ background: item.color }">{{
              item.symbol[0]
            }}</span
            ><span
              ><b>{{ item.name }}</b
              ><small>{{ item.symbol }}</small></span
            ><span
              ><b>{{ money(item.price) }}</b
              ><small :class="item.changePercent >= 0 ? 'up' : 'down'"
                >{{ item.changePercent.toFixed(2) }}%</small
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
        <section class="activity-head">
          <p>{{ t('activity.volume') }}</p>
          <strong>{{ privateMoney(profile?.totalVolume ?? '0') }}</strong
          ><span
            >{{ profile?.totalTrades }}
            {{ t('activity.completedTrades') }}</span
          >
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
        <h2 class="title">{{ t('activity.title') }}</h2>
        <SkyEmptyState
          v-if="!activities.length"
          :title="t('activity.empty')"
          :description="t('activity.emptyBody')"
        />
        <div
          v-for="item in activities"
          v-else
          :key="item.id"
          class="row static"
        >
          <span class="activity-icon"><ArrowLeftRight :size="18" /></span
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
        </div>
      </template>

      <template v-else>
        <section class="profile-head">
          <span>{{ profile?.handle.slice(0, 2).toUpperCase() }}</span>
          <h2>@{{ profile?.handle }}</h2>
          <p><ShieldCheck :size="15" />{{ t('profile.verified') }}</p>
        </section>
        <div class="profile-stats">
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
            }}</b
            ><small>{{ t('profile.memberSince') }}</small>
          </div>
        </div>
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
        <i />
        <h2>
          {{
            sheet === 'trade'
              ? `${t(`trade.${side}`)} ${selectedMarket?.symbol}`
              : t(`actions.${sheet}`)
          }}
        </h2>
        <template v-if="sheet === 'trade' && selectedMarket"
          ><p>
            {{ selectedMarket.name }} <b>{{ money(selectedMarket.price) }}</b>
          </p>
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
          ><p>
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
  padding: 4px 18px calc(var(--sky-safe-area-bottom) + 20px);
}
.sheet > i {
  width: 38px;
  height: 5px;
  margin: auto;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.22);
}
.sheet h2,
.sheet p {
  margin: 0;
}
.sheet > p {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
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
</style>
