// =========================================================================
// Serviço de PREÇOS AUTOMÁTICOS.
// Junta dados de fontes gratuitas:
//   - brapi.dev      -> Ações BR e FIIs (token já embutido)
//   - CoinGecko      -> Criptomoedas (sem cadastro)
//   - AwesomeAPI     -> Cotação do dólar (sem cadastro)
//   - Yahoo Finance  -> Ações dos EUA (sem cadastro, via proxy aberto)
//   - Finnhub        -> Ações dos EUA (opcional, se você colocar a chave)
//
// Cada função devolve um objeto { TICKER: preço } na moeda nativa do ativo.
// =========================================================================
import { DEFAULT_BRAPI_TOKEN } from '../data/config'

// Mapa de tickers de cripto -> id usado pela CoinGecko.
const CRYPTO_IDS = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  ADA: 'cardano', XRP: 'ripple', DOGE: 'dogecoin', MATIC: 'matic-network',
  DOT: 'polkadot', LTC: 'litecoin', AVAX: 'avalanche-2', LINK: 'chainlink',
}

// Busca cotação atual do dólar (USD -> BRL). Sem cadastro, CORS liberado.
export async function getUsdBrl() {
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
    const data = await r.json()
    const v = parseFloat(data?.USDBRL?.bid)
    return isFinite(v) && v > 0 ? v : null
  } catch (e) {
    console.warn('Falha ao buscar dólar:', e)
    return null
  }
}

// Preços de Ações BR e FIIs via brapi.dev. Aceita vários tickers de uma vez.
async function getBrapiQuotes(tickers, token) {
  if (!tickers.length) return {}
  const out = {}
  // O plano gratuito da brapi permite só 1 ativo por requisição, então
  // buscamos um de cada vez (com no máximo 6 em paralelo para não estourar).
  await comLimite(tickers, 6, async (t) => {
    try {
      const url = `https://brapi.dev/api/quote/${t}` + (token ? `?token=${token}` : '')
      const r = await fetch(url)
      const data = await r.json()
      const item = data?.results?.[0]
      if (item?.symbol && isFinite(item.regularMarketPrice)) {
        out[item.symbol] = item.regularMarketPrice
      }
    } catch (e) {
      console.warn('Falha brapi', t, e)
    }
  })
  return out
}

// Executa uma tarefa para cada item, com no máximo `limite` rodando ao mesmo tempo.
async function comLimite(itens, limite, tarefa) {
  const fila = [...itens]
  const trabalhadores = Array.from({ length: Math.min(limite, fila.length) }, async () => {
    while (fila.length) {
      const item = fila.shift()
      await tarefa(item)
    }
  })
  await Promise.all(trabalhadores)
}

// Preços de cripto via CoinGecko, já em BRL.
async function getCryptoQuotes(tickers) {
  if (!tickers.length) return {}
  const ids = tickers.map((t) => CRYPTO_IDS[t.toUpperCase()] || t.toLowerCase())
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=brl`
  const out = {}
  try {
    const r = await fetch(url)
    const data = await r.json()
    tickers.forEach((t, idx) => {
      const v = data?.[ids[idx]]?.brl
      if (isFinite(v)) out[t.toUpperCase()] = v
    })
  } catch (e) {
    console.warn('Falha CoinGecko:', e)
  }
  return out
}

// Preços de ações dos EUA via Finnhub (1 chamada por ticker). Opcional.
async function getUsQuotesFinnhub(tickers, token) {
  const out = {}
  await Promise.all(
    tickers.map(async (t) => {
      try {
        const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${t}&token=${token}`)
        const data = await r.json()
        if (isFinite(data?.c) && data.c > 0) out[t] = data.c
      } catch (e) {
        console.warn('Falha Finnhub', t, e)
      }
    })
  )
  return out
}

// Preços de ações dos EUA via Yahoo Finance, SEM cadastro.
// O Yahoo não libera CORS, então passamos por um proxy aberto (corsproxy.io).
async function getUsQuotesYahoo(tickers) {
  const out = {}
  const buscarUm = async (t) => {
    try {
      const alvo = `https://query1.finance.yahoo.com/v8/finance/chart/${t}?interval=1d&range=1d`
      const url = `https://corsproxy.io/?url=${encodeURIComponent(alvo)}`
      const r = await fetch(url)
      const data = await r.json()
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
      if (isFinite(price) && price > 0) out[t] = price
    } catch (e) {
      /* tenta de novo na segunda passada */
    }
  }
  // Concorrência baixa (2): o proxy gratuito recusa muitas chamadas simultâneas.
  await comLimite(tickers, 2, buscarUm)
  // Segunda tentativa, mais devagar, só pros que faltaram.
  const faltando = tickers.filter((t) => !(t in out))
  if (faltando.length) {
    await new Promise((r) => setTimeout(r, 1500))
    await comLimite(faltando, 1, buscarUm)
  }
  return out
}

// Escolhe a fonte dos EUA: Finnhub se houver chave, senão Yahoo (grátis).
async function getUsQuotes(tickers, finnhubToken) {
  if (!tickers.length) return {}
  if (finnhubToken) return getUsQuotesFinnhub(tickers, finnhubToken)
  return getUsQuotesYahoo(tickers)
}

// =========================================================================
// Função principal: recebe a lista de ativos e as chaves, e devolve
// { prices: { TICKER: preço }, usdBrl, updatedAt, errors: [] }
// Preços ficam na MOEDA NATIVA (BRL para BR/cripto, USD para exterior).
// =========================================================================
export async function fetchAllPrices(assets, settings = {}) {
  const errors = []
  const brTickers = assets.filter((a) => a.cls === 'acoes_br' || a.cls === 'fiis').map((a) => a.ticker)
  const cryptoTickers = assets.filter((a) => a.cls === 'cripto').map((a) => a.ticker)
  const usTickers = assets.filter((a) => a.cls === 'exterior').map((a) => a.ticker)

  const brapiToken = settings.brapiToken || DEFAULT_BRAPI_TOKEN

  const [usdBrl, brPrices, cryptoPrices, usPrices] = await Promise.all([
    getUsdBrl(),
    getBrapiQuotes(brTickers, brapiToken),
    getCryptoQuotes(cryptoTickers),
    getUsQuotes(usTickers, settings.finnhubToken),
  ])

  if (brTickers.length && Object.keys(brPrices).length === 0) {
    errors.push('Não consegui preços de Ações BR / FIIs agora. Tente atualizar de novo em instantes.')
  }
  if (usTickers.length && Object.keys(usPrices).length === 0) {
    errors.push('Não consegui preços do Exterior agora — usando o último preço salvo.')
  }
  if (!usdBrl) errors.push('Não consegui a cotação do dólar agora.')

  const prices = { ...brPrices, ...cryptoPrices, ...usPrices }
  return { prices, usdBrl, updatedAt: new Date().toISOString(), errors }
}

// Busca o histórico de dividendos de um ativo BR via brapi (módulo dividends).
export async function getDividends(ticker, token) {
  try {
    const url = `https://brapi.dev/api/quote/${ticker}?modules=dividends` + (token ? `&token=${token}` : '')
    const r = await fetch(url)
    const data = await r.json()
    const list = data?.results?.[0]?.dividendsData?.cashDividends || []
    return list.map((d) => ({
      date: d.paymentDate || d.date,
      value: d.rate,
      type: d.label || 'Provento',
    }))
  } catch (e) {
    console.warn('Falha dividendos', ticker, e)
    return []
  }
}
