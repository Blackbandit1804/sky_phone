export type CryptoSide = 'buy' | 'sell'

export type CryptoMarket = {
  changePercent: number
  color: string
  enabled: boolean
  high24h: string
  id: string
  issuedSupply: string
  logo: string
  low24h: string
  name: string
  price: string
  sparkline: number[]
  symbol: string
  treasuryAvailable: string
}

export type CryptoHolding = {
  assetId: string
  averagePrice: string
  quantity: string
  value: string
}

export type CryptoActivity = {
  amount: string
  createdAt: number
  id: string
  marketId?: string
  status: string
  type: 'buy' | 'sell' | 'deposit' | 'withdrawal'
}

export type CryptoProfile = {
  createdAt: number
  handle: string
  hideBalances: boolean
  id: string
  priceAlerts: boolean
  status: 'active' | 'frozen' | 'closed'
  totalTrades: number
  totalVolume: string
  tradeConfirmations: boolean
}

export type CryptoBootstrap = {
  activity: CryptoActivity[]
  authenticated: boolean
  cashBalance: string
  holdings: CryptoHolding[]
  markets: CryptoMarket[]
  portfolioValue: string
  profile: CryptoProfile | null
}

export type CryptoQuote = {
  expiresAt: number
  fee: string
  gross: string
  id: string
  marketId: string
  net: string
  price: string
  quantity: string
  side: CryptoSide
}
