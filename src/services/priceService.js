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

// Busca uma URL passando por proxies abertos (pra contornar CORS).
// #21 — fonte redundante: tenta um proxy; se falhar, tenta o outro.
async function proxyFetch(alvo) {
  const proxies = [
    (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ]
  for (const p of proxies) {
    try {
      const r = await fetch(p(alvo))
      if (r.ok) return r
    } catch (e) { /* tenta o próximo proxy */ }
  }
  return null
}

// Busca cotação atual do dólar (USD -> BRL). #21 — duas fontes redundantes.
export async function getUsdBrl() {
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
    const data = await r.json()
    const v = parseFloat(data?.USDBRL?.bid)
    if (isFinite(v) && v > 0) return v
  } catch (e) { /* tenta a fonte reserva */ }
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD')
    const data = await r.json()
    const v = data?.rates?.BRL
    if (isFinite(v) && v > 0) return v
  } catch (e) {
    console.warn('Falha ao buscar dólar (2 fontes):', e)
  }
  return null
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
      const r = await proxyFetch(alvo)
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
export async function fetchAllPrices(assets, settings = {}, extraUsTickers = []) {
  const errors = []
  const brTickers = assets.filter((a) => a.cls === 'acoes_br' || a.cls === 'fiis').map((a) => a.ticker)
  const cryptoTickers = assets.filter((a) => a.cls === 'cripto').map((a) => a.ticker)
  // Inclui também tickers da reserva em dólar (ex: TFLO) na busca dos EUA.
  const usTickers = [...new Set([
    ...assets.filter((a) => a.cls === 'exterior').map((a) => a.ticker),
    ...extraUsTickers,
  ])]

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

// Converte o ticker para o formato do Yahoo (Ações BR e FIIs levam ".SA").
function yahooSymbol(ticker, cls) {
  if (cls === 'acoes_br' || cls === 'fiis') return `${ticker}.SA`
  return ticker
}

// #4 — Dividendos dos últimos 12 meses via Yahoo Finance (funciona para
// Ações BR, FIIs e ações dos EUA, de graça). Devolve { lista, total12m, dy }.
export async function getDividends(ticker, cls, precoAtual) {
  try {
    const sym = yahooSymbol(ticker, cls)
    const alvo = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=1y&interval=1d&events=div`
    const r = await proxyFetch(alvo)
    const data = await r.json()
    const ev = data?.chart?.result?.[0]?.events?.dividends || {}
    const lista = Object.values(ev)
      .map((d) => ({ date: new Date((d.date || 0) * 1000).toISOString().slice(0, 10), value: d.amount }))
      .filter((d) => isFinite(d.value))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
    const total12m = lista.reduce((s, d) => s + d.value, 0)
    const dy = precoAtual > 0 ? total12m / precoAtual : null
    return { lista, total12m, dy }
  } catch (e) {
    console.warn('Falha dividendos', ticker, e)
    return { lista: [], total12m: 0, dy: null }
  }
}

// #25 — Histórico de preços (últimos ~6 meses) pra desenhar o mini gráfico.
// Devolve um array de { t (timestamp), c (fechamento) }.
export async function getPriceHistory(ticker, cls, token) {
  // Ações dos EUA: Yahoo (via proxy)
  if (cls === 'exterior') {
    try {
      const alvo = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=6mo`
      const r = await proxyFetch(alvo)
      const data = await r.json()
      const res = data?.chart?.result?.[0]
      const ts = res?.timestamp || []
      const closes = res?.indicators?.quote?.[0]?.close || []
      return ts.map((t, i) => ({ t: t * 1000, c: closes[i] })).filter((p) => Number.isFinite(p.c))
    } catch (e) { return [] }
  }
  // Ações BR / FIIs: Yahoo com ".SA" (mais confiável que o plano grátis da brapi)
  if (cls === 'acoes_br' || cls === 'fiis') {
    try {
      const alvo = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.SA?interval=1d&range=6mo`
      const r = await proxyFetch(alvo)
      const data = await r.json()
      const res = data?.chart?.result?.[0]
      const ts = res?.timestamp || []
      const closes = res?.indicators?.quote?.[0]?.close || []
      return ts.map((t, i) => ({ t: t * 1000, c: closes[i] })).filter((p) => Number.isFinite(p.c))
    } catch (e) { return [] }
  }
  return []
}

// #11 — Retornos de 12 meses dos principais índices (pra comparar com sua carteira).
async function variacao12m(simbolo) {
  try {
    const alvo = `https://query1.finance.yahoo.com/v8/finance/chart/${simbolo}?interval=1wk&range=1y`
    const r = await proxyFetch(alvo)
    const data = await r.json()
    const closes = (data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []).filter((c) => Number.isFinite(c))
    if (closes.length < 2) return null
    return (closes[closes.length - 1] - closes[0]) / closes[0]
  } catch (e) { return null }
}

export async function getBenchmarks() {
  const [ibov, sp500] = await Promise.all([variacao12m('%5EBVSP'), variacao12m('%5EGSPC')])

  // CDI acumulado 12 meses via Banco Central (série 4391, % ao mês).
  let cdi = null
  try {
    const r = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4391/dados/ultimos/12?formato=json')
    const data = await r.json()
    if (Array.isArray(data) && data.length) {
      cdi = data.reduce((acc, d) => acc * (1 + parseFloat(d.valor) / 100), 1) - 1
    }
  } catch (e) { /* usa fallback abaixo */ }
  if (cdi == null) cdi = 0.105 // estimativa de reserva se a API falhar

  return { ibov, sp500, cdi }
}

// #23 — Notícias do ativo via Google Notícias (RSS), através de proxy.
export async function getNews(ticker, cls) {
  try {
    const termo = cls === 'cripto' ? `${ticker} cripto` : `${ticker} ações`
    const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(termo)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
    const r = await proxyFetch(rss)
    const xml = await r.text()
    const doc = new DOMParser().parseFromString(xml, 'text/xml')
    return [...doc.querySelectorAll('item')].slice(0, 6).map((it) => ({
      title: it.querySelector('title')?.textContent || '',
      link: it.querySelector('link')?.textContent || '',
      date: it.querySelector('pubDate')?.textContent || '',
      source: it.querySelector('source')?.textContent || '',
    }))
  } catch (e) {
    console.warn('Falha notícias', ticker, e)
    return []
  }
}
