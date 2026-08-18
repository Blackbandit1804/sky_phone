<script setup lang="ts">
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  ChartCandlestick,
  ChevronRight,
  Eye,
  EyeOff,
  LockKeyhole,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

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
} from '@/ui'

type CryptoTab = 'portfolio' | 'markets' | 'activity'
type SheetMode = 'trade' | 'deposit' | 'withdraw' | null

const crypto = useCryptoStore()
const phone = usePhoneStore()
const activeTab = ref<CryptoTab>('portfolio')
const authMode = ref<'login' | 'register'>('login')
const handle = ref('')
const password = ref('')
const showPassword = ref(false)
const sheetMode = ref<SheetMode>(null)
const selectedMarket = ref<CryptoMarket | null>(null)
const side = ref<CryptoSide>('buy')
const amount = ref('')
const financialPassword = ref('')
const formError = ref('')

const locale = computed(() => phone.lang || 'de')
const authenticated = computed(() => crypto.data?.authenticated === true)
const markets = computed(() => crypto.data?.markets ?? [])
const holdings = computed(() => crypto.data?.holdings ?? [])
const activity = computed(() => crypto.data?.activity ?? [])
const selectedHolding = computed(() =>
  holdings.value.find((item) => item.assetId === selectedMarket.value?.id),
)

function t(key: string): string {
  return phone.t(`Apps.crypto.${key}`)
}

function money(value: string | number): string {
  return new Intl.NumberFormat(locale.value, {
    currency: 'USD',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(Number(value) || 0)
}

function quantity(value: string): string {
  return new Intl.NumberFormat(locale.value, {
    maximumFractionDigits: 6,
  }).format(Number(value) || 0)
}

function errorText(code: string): string {
  const key = `errors.${code}`
  const translated = t(key)
  return translated === `Apps.crypto.${key}` ? t('errors.default') : translated
}

async function submitAuth(): Promise<void> {
  formError.value = ''
  const success =
    authMode.value === 'register'
      ? await crypto.register(handle.value.trim(), password.value)
      : await crypto.login(password.value)
  if (!success) formError.value = errorText(crypto.error)
  else password.value = ''
}

function openSettlement(mode: 'deposit' | 'withdraw'): void {
  sheetMode.value = mode
  amount.value = ''
  financialPassword.value = ''
  formError.value = ''
}

function openTrade(market: CryptoMarket, nextSide: CryptoSide = 'buy'): void {
  selectedMarket.value = market
  side.value = nextSide
  amount.value = ''
  formError.value = ''
  crypto.pendingQuote = null
  sheetMode.value = 'trade'
}

function closeSheet(): void {
  sheetMode.value = null
  crypto.pendingQuote = null
}

async function submitSettlement(): Promise<void> {
  if (sheetMode.value !== 'deposit' && sheetMode.value !== 'withdraw') return
  const normalized = amount.value.trim()
  if (!/^\d+$/.test(normalized) || Number(normalized) <= 0) {
    formError.value = t('errors.invalid_amount')
    return
  }
  const success = await crypto.settle(
    sheetMode.value,
    normalized,
    financialPassword.value,
  )
  if (!success) formError.value = errorText(crypto.error)
  else closeSheet()
}

async function requestQuote(): Promise<void> {
  if (!selectedMarket.value || !/^\d+(?:\.\d{1,6})?$/.test(amount.value)) {
    formError.value = t('errors.invalid_quantity')
    return
  }
  const response = await crypto.quote(
    selectedMarket.value.id,
    side.value,
    amount.value,
  )
  if (!response.success) formError.value = errorText(crypto.error)
}

async function executeQuote(): Promise<void> {
  const success = await crypto.executeQuote()
  if (!success) formError.value = errorText(crypto.error)
  else closeSheet()
}

function activityTitle(type: string): string {
  return t(`activityTypes.${type}`)
}

onMounted(() => void crypto.load())
</script>

<template>
  <SkyAppPage
    class="crypto-app"
    accent="#20d69b"
    accent-soft="rgba(32, 214, 155, 0.18)"
    dark
  >
    <SkyNavbar
      :title="t('name')"
      :subtitle="
        authenticated ? `@${crypto.data?.profile?.handle}` : t('subtitle')
      "
      large
    >
      <template v-if="authenticated" #right>
        <SkyLink :aria-label="t('logout')" @click="crypto.logout()">
          <LogOut :size="18" />
        </SkyLink>
      </template>
    </SkyNavbar>

    <SkyScrollArea
      v-if="crypto.isLoading && !crypto.data"
      class="crypto-state"
      padded
    >
      <SkySpinner />
      <p>{{ t('loading') }}</p>
    </SkyScrollArea>

    <SkyScrollArea v-else-if="!authenticated" class="crypto-auth" padded>
      <div class="crypto-auth__hero">
        <span class="crypto-auth__mark"><ChartCandlestick :size="32" /></span>
        <p class="crypto-eyebrow">{{ t('auth.eyebrow') }}</p>
        <h2>
          {{
            authMode === 'login'
              ? t('auth.loginTitle')
              : t('auth.registerTitle')
          }}
        </h2>
        <p>{{ t('auth.body') }}</p>
      </div>
      <SkySegmented>
        <SkySegmentedButton
          :active="authMode === 'login'"
          @click="authMode = 'login'"
          >{{ t('auth.login') }}</SkySegmentedButton
        >
        <SkySegmentedButton
          :active="authMode === 'register'"
          @click="authMode = 'register'"
          >{{ t('auth.register') }}</SkySegmentedButton
        >
      </SkySegmented>
      <form class="crypto-form" @submit.prevent="submitAuth">
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
          :placeholder="t('auth.passwordPlaceholder')"
          :type="showPassword ? 'text' : 'password'"
          maxlength="72"
          outline
        >
          <template #leading><LockKeyhole :size="18" /></template>
          <template #trailing>
            <button
              class="crypto-visibility"
              type="button"
              :aria-label="
                t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')
              "
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" :size="18" /><Eye v-else :size="18" />
            </button>
          </template>
        </SkyField>
        <p class="crypto-form__hint">
          <ShieldCheck :size="15" />{{ t('auth.security') }}
        </p>
        <p v-if="formError" class="crypto-error" role="alert">
          {{ formError }}
        </p>
        <SkyButton type="submit" :disabled="crypto.isLoading" block>{{
          t(authMode === 'login' ? 'auth.loginAction' : 'auth.registerAction')
        }}</SkyButton>
      </form>
    </SkyScrollArea>

    <SkyScrollArea v-else with-tabbar padded>
      <template v-if="activeTab === 'portfolio'">
        <SkyCard class="crypto-balance">
          <p>{{ t('portfolio.total') }}</p>
          <strong>{{ money(crypto.data?.portfolioValue ?? '0') }}</strong>
          <span
            >{{ t('portfolio.cash') }} ·
            {{ money(crypto.data?.cashBalance ?? '0') }}</span
          >
          <div class="crypto-balance__actions">
            <SkyButton @click="openSettlement('deposit')"
              ><ArrowDownToLine :size="17" />{{
                t('actions.deposit')
              }}</SkyButton
            >
            <SkyButton variant="secondary" @click="openSettlement('withdraw')"
              ><ArrowUpFromLine :size="17" />{{
                t('actions.withdraw')
              }}</SkyButton
            >
          </div>
        </SkyCard>
        <div class="crypto-section-title">
          <h2>{{ t('portfolio.holdings') }}</h2>
          <button
            type="button"
            :aria-label="t('refresh')"
            @click="crypto.load()"
          >
            <RefreshCw :size="17" />
          </button>
        </div>
        <SkyEmptyState
          v-if="!holdings.length"
          :title="t('portfolio.empty')"
          :description="t('portfolio.emptyBody')"
        />
        <button
          v-for="holding in holdings"
          v-else
          :key="holding.assetId"
          class="crypto-row"
          type="button"
          @click="
            openTrade(
              markets.find((market) => market.id === holding.assetId)!,
              'sell',
            )
          "
        >
          <span
            class="crypto-asset-dot"
            :style="{
              background: markets.find(
                (market) => market.id === holding.assetId,
              )?.color,
            }"
            >{{
              markets
                .find((market) => market.id === holding.assetId)
                ?.symbol.slice(0, 1)
            }}</span
          >
          <span
            ><strong>{{
              markets.find((market) => market.id === holding.assetId)?.name
            }}</strong
            ><small
              >{{ quantity(holding.quantity) }}
              {{
                markets.find((market) => market.id === holding.assetId)?.symbol
              }}</small
            ></span
          >
          <span class="crypto-row__value"
            ><strong>{{ money(holding.value) }}</strong
            ><small
              >{{ t('portfolio.avg') }} {{ money(holding.averagePrice) }}</small
            ></span
          >
          <ChevronRight :size="17" />
        </button>
      </template>

      <template v-else-if="activeTab === 'markets'">
        <SkyStatusCard
          tone="accent"
          :title="t('markets.noticeTitle')"
          :subtitle="t('markets.notice')"
        />
        <div class="crypto-section-title">
          <h2>{{ t('markets.title') }}</h2>
          <span>{{ t('markets.live') }}</span>
        </div>
        <button
          v-for="market in markets"
          :key="market.id"
          class="crypto-market"
          type="button"
          @click="openTrade(market)"
        >
          <span
            class="crypto-asset-dot"
            :style="{ background: market.color }"
            >{{ market.symbol.slice(0, 1) }}</span
          >
          <span class="crypto-market__name"
            ><strong>{{ market.name }}</strong
            ><small>{{ market.symbol }}</small></span
          >
          <svg class="crypto-spark" viewBox="0 0 72 28" aria-hidden="true">
            <polyline
              :points="
                market.sparkline
                  .map(
                    (point, index) =>
                      `${index * (72 / Math.max(1, market.sparkline.length - 1))},${26 - point * 22}`,
                  )
                  .join(' ')
              "
            />
          </svg>
          <span class="crypto-market__price"
            ><strong>{{ money(market.price) }}</strong
            ><small :class="market.changePercent >= 0 ? 'is-up' : 'is-down'"
              >{{ market.changePercent >= 0 ? '+' : ''
              }}{{ market.changePercent.toFixed(2) }}%</small
            ></span
          >
        </button>
      </template>

      <template v-else>
        <h2 class="crypto-page-title">{{ t('activity.title') }}</h2>
        <SkyEmptyState
          v-if="!activity.length"
          :title="t('activity.empty')"
          :description="t('activity.emptyBody')"
        />
        <div
          v-for="item in activity"
          v-else
          :key="item.id"
          class="crypto-row crypto-row--static"
        >
          <span class="crypto-activity-icon"
            ><ArrowLeftRight :size="18"
          /></span>
          <span
            ><strong>{{ activityTitle(item.type) }}</strong
            ><small>{{
              new Intl.DateTimeFormat(locale, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(item.createdAt)
            }}</small></span
          >
          <span class="crypto-row__value"
            ><strong
              >{{ item.type === 'buy' || item.type === 'withdrawal' ? '−' : '+'
              }}{{ money(item.amount) }}</strong
            ><small>{{ t(`statuses.${item.status}`) }}</small></span
          >
        </div>
      </template>
    </SkyScrollArea>

    <SkyPillNavigation
      v-if="authenticated"
      layout="full"
      :label="t('navigation')"
    >
      <SkySegmented navigation>
        <SkySegmentedButton
          :active="activeTab === 'portfolio'"
          @click="activeTab = 'portfolio'"
          >{{ t('tabs.portfolio') }}</SkySegmentedButton
        >
        <SkySegmentedButton
          :active="activeTab === 'markets'"
          @click="activeTab = 'markets'"
          >{{ t('tabs.markets') }}</SkySegmentedButton
        >
        <SkySegmentedButton
          :active="activeTab === 'activity'"
          @click="activeTab = 'activity'"
          >{{ t('tabs.activity') }}</SkySegmentedButton
        >
      </SkySegmented>
    </SkyPillNavigation>

    <SkySheet
      :opened="sheetMode !== null"
      swipe-to-close
      @backdropclick="closeSheet"
      @escape="closeSheet"
      @swipeclose="closeSheet"
    >
      <div v-if="sheetMode" class="crypto-sheet">
        <div class="crypto-sheet__handle" />
        <h2 v-if="sheetMode === 'trade'">
          {{ side === 'buy' ? t('trade.buy') : t('trade.sell') }}
          {{ selectedMarket?.symbol }}
        </h2>
        <h2 v-else>{{ t(`actions.${sheetMode}`) }}</h2>
        <template v-if="sheetMode === 'trade' && selectedMarket">
          <p class="crypto-sheet__market">
            {{ selectedMarket.name }}
            <strong>{{ money(selectedMarket.price) }}</strong>
          </p>
          <SkySegmented>
            <SkySegmentedButton
              :active="side === 'buy'"
              @click="side = 'buy'"
              >{{ t('trade.buy') }}</SkySegmentedButton
            >
            <SkySegmentedButton
              :active="side === 'sell'"
              @click="side = 'sell'"
              >{{ t('trade.sell') }}</SkySegmentedButton
            >
          </SkySegmented>
          <SkyField
            v-model="amount"
            :label="t('trade.quantity')"
            :placeholder="'0.000000'"
            inputmode="decimal"
            outline
          />
          <p
            v-if="side === 'sell' && selectedHolding"
            class="crypto-form__hint"
          >
            {{ t('trade.available') }} {{ quantity(selectedHolding.quantity) }}
            {{ selectedMarket.symbol }}
          </p>
          <SkyCard v-if="crypto.pendingQuote" class="crypto-quote">
            <div>
              <span>{{ t('trade.price') }}</span
              ><strong>{{ money(crypto.pendingQuote.price) }}</strong>
            </div>
            <div>
              <span>{{ t('trade.gross') }}</span
              ><strong>{{ money(crypto.pendingQuote.gross) }}</strong>
            </div>
            <div>
              <span>{{ t('trade.fee') }}</span
              ><strong>{{ money(crypto.pendingQuote.fee) }}</strong>
            </div>
            <div class="crypto-quote__total">
              <span>{{ t('trade.total') }}</span
              ><strong>{{ money(crypto.pendingQuote.net) }}</strong>
            </div>
            <small>{{ t('trade.quoteExpiry') }}</small>
          </SkyCard>
          <p v-if="formError" class="crypto-error" role="alert">
            {{ formError }}
          </p>
          <SkyButton
            v-if="!crypto.pendingQuote"
            block
            :disabled="crypto.isLoading"
            @click="requestQuote"
            >{{ t('trade.getQuote') }}</SkyButton
          >
          <SkyButton
            v-else
            block
            :disabled="crypto.isLoading"
            @click="executeQuote"
            >{{ t('trade.confirm') }}</SkyButton
          >
        </template>
        <template v-else>
          <p>
            {{
              t(
                sheetMode === 'deposit'
                  ? 'settlement.depositBody'
                  : 'settlement.withdrawBody',
              )
            }}
          </p>
          <SkyField
            v-model="amount"
            :label="t('settlement.amount')"
            placeholder="0"
            inputmode="numeric"
            outline
          />
          <SkyField
            v-model="financialPassword"
            :label="t('auth.password')"
            type="password"
            outline
          />
          <p v-if="formError" class="crypto-error" role="alert">
            {{ formError }}
          </p>
          <SkyButton
            block
            :disabled="crypto.isLoading"
            @click="submitSettlement"
            >{{ t('settlement.confirm') }}</SkyButton
          >
        </template>
      </div>
    </SkySheet>
  </SkyAppPage>
</template>

<style scoped>
.crypto-app {
  --crypto-muted: rgba(220, 235, 244, 0.62);
  color: #f7fbff;
  background: #07151d;
}
.crypto-state,
.crypto-auth {
  display: grid;
  align-content: center;
  gap: 18px;
  min-height: 100%;
  text-align: center;
}
.crypto-auth__hero {
  display: grid;
  justify-items: center;
  gap: 7px;
}
.crypto-auth__hero h2,
.crypto-auth__hero p {
  margin: 0;
}
.crypto-auth__hero > p:last-child {
  max-width: 280px;
  color: var(--crypto-muted);
  font-size: 13px;
  line-height: 1.45;
}
.crypto-auth__mark {
  display: grid;
  place-items: center;
  width: 66px;
  height: 66px;
  margin-bottom: 5px;
  border-radius: 21px;
  color: #07151d;
  background: linear-gradient(145deg, #67f5c8, #11bbeb);
  box-shadow: 0 16px 45px rgba(32, 214, 155, 0.25);
}
.crypto-eyebrow {
  color: #49e4b2 !important;
  font-size: 11px !important;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.crypto-form {
  display: grid;
  gap: 13px;
  text-align: left;
}
.crypto-form__hint {
  display: flex;
  gap: 7px;
  align-items: center;
  margin: -3px 2px 0;
  color: var(--crypto-muted);
  font-size: 11px;
}
.crypto-visibility {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: inherit;
  background: none;
  border: 0;
}
.crypto-error {
  margin: 0;
  color: #ff8d98;
  font-size: 12px;
}
.crypto-balance {
  margin-bottom: 22px;
  padding: 21px;
  background: linear-gradient(
    145deg,
    rgba(25, 71, 81, 0.96),
    rgba(10, 37, 48, 0.96)
  );
}
.crypto-balance p,
.crypto-balance span {
  margin: 0;
  color: var(--crypto-muted);
  font-size: 12px;
}
.crypto-balance > strong {
  display: block;
  margin: 6px 0 2px;
  font-size: 32px;
  letter-spacing: -0.04em;
}
.crypto-balance__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin-top: 20px;
}
.crypto-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 2px 10px;
}
.crypto-section-title h2,
.crypto-page-title {
  margin: 0;
  font-size: 18px;
}
.crypto-section-title button {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: #fff;
  background: none;
  border: 0;
}
.crypto-section-title > span {
  color: #49e4b2;
  font-size: 11px;
  font-weight: 700;
}
.crypto-row,
.crypto-market {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto 18px;
  gap: 10px;
  align-items: center;
  width: 100%;
  min-height: 67px;
  padding: 10px 12px;
  color: inherit;
  text-align: left;
  background: rgba(15, 40, 50, 0.86);
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.crypto-row:first-of-type,
.crypto-market:first-of-type {
  border-radius: var(--sky-radius-card) var(--sky-radius-card) 0 0;
}
.crypto-row:last-of-type,
.crypto-market:last-of-type {
  border-bottom: 0;
  border-radius: 0 0 var(--sky-radius-card) var(--sky-radius-card);
}
.crypto-row span,
.crypto-market span {
  min-width: 0;
}
.crypto-row strong,
.crypto-row small,
.crypto-market strong,
.crypto-market small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.crypto-row small,
.crypto-market small {
  margin-top: 3px;
  color: var(--crypto-muted);
  font-size: 10px;
}
.crypto-row__value,
.crypto-market__price {
  text-align: right;
}
.crypto-asset-dot,
.crypto-activity-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 13px;
  color: #fff;
  font-weight: 900;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.3);
}
.crypto-activity-icon {
  color: #49e4b2;
  background: rgba(73, 228, 178, 0.12);
}
.crypto-market {
  grid-template-columns: 42px minmax(64px, 1fr) 72px auto;
}
.crypto-spark {
  width: 72px;
  height: 28px;
  overflow: visible;
}
.crypto-spark polyline {
  fill: none;
  stroke: #49e4b2;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}
.is-up {
  color: #49e4b2 !important;
}
.is-down {
  color: #ff7d8a !important;
}
.crypto-row--static {
  grid-template-columns: 42px minmax(0, 1fr) auto;
}
.crypto-sheet {
  display: grid;
  gap: 14px;
  padding: 4px 18px calc(var(--sky-safe-area-bottom) + 20px);
  color: #f7fbff;
}
.crypto-sheet__handle {
  width: 38px;
  height: 5px;
  margin: 3px auto 2px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.22);
}
.crypto-sheet h2,
.crypto-sheet p {
  margin: 0;
}
.crypto-sheet__market {
  display: flex;
  justify-content: space-between;
  color: var(--crypto-muted);
  font-size: 13px;
}
.crypto-quote {
  display: grid;
  gap: 8px;
  padding: 14px;
}
.crypto-quote div {
  display: flex;
  justify-content: space-between;
  color: var(--crypto-muted);
  font-size: 12px;
}
.crypto-quote strong {
  color: #fff;
}
.crypto-quote__total {
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 14px !important;
}
.crypto-quote small {
  color: var(--crypto-muted);
  font-size: 10px;
}
@media (prefers-reduced-motion: reduce) {
  .crypto-auth__mark {
    box-shadow: none;
  }
}
</style>
