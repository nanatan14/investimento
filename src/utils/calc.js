// =========================================================================
// Cálculos da carteira: valor atual, valor ideal e "quanto falta aportar".
// Toda conta final é convertida para REAIS (BRL) usando a cotação do dólar.
// =========================================================================
import { CLASS_ORDER, CLASSES } from '../data/classes'

// Preço atual de um ativo, na moeda nativa. Usa o último preço buscado;
// se não houver, cai pro preço salvo na planilha (a.price).
function nativePrice(asset, lastPrices) {
  const live = lastPrices?.[asset.ticker]
  if (isFinite(live) && live > 0) return live
  return isFinite(asset.price) ? asset.price : 0
}

function toBRL(value, cur, usdBrl) {
  if (cur === 'USD') return value * (usdBrl || 0)
  return value
}

// Calcula tudo de uma vez a partir da carteira + preços + dólar.
export function computePortfolio(portfolio, lastPrices = {}, usdBrl = null) {
  const usd = usdBrl || portfolio.usdBrl || 0
  const changes = portfolio.lastChanges || {}
  const variable = []

  // 1) Ativos variáveis (ações, fiis, exterior, cripto)
  for (const a of portfolio.assets || []) {
    const price = nativePrice(a, lastPrices)
    const cur = CLASSES[a.cls]?.cur || 'BRL'
    const valueNative = (a.qty || 0) * price
    const valueBRL = toBRL(valueNative, cur, usd)

    // Preço médio de compra: se não informado, assume o preço atual (lucro = 0).
    const avgPrice = isFinite(a.avgPrice) && a.avgPrice > 0 ? a.avgPrice : price
    const temCusto = isFinite(a.avgPrice) && a.avgPrice > 0 && (a.qty || 0) > 0
    const custoNative = avgPrice * (a.qty || 0)
    const lucroNative = valueNative - custoNative
    const lucroBRL = toBRL(lucroNative, cur, usd)
    const rentab = custoNative > 0 ? lucroNative / custoNative : 0

    const change = isFinite(changes[a.ticker]) ? changes[a.ticker] : null
    variable.push({ ...a, price, cur, avgPrice, valueNative, valueBRL, temCusto, custoBRL: toBRL(custoNative, cur, usd), lucroBRL, rentab, change })
  }

  // 2) Ativos de valor fixo (renda fixa, reserva) — já estão em BRL
  const fixed = (portfolio.fixed || []).map((f) => ({
    ...f,
    valueBRL: f.value || 0,
  }))

  const total =
    variable.reduce((s, a) => s + a.valueBRL, 0) +
    fixed.reduce((s, f) => s + f.valueBRL, 0)

  // 3) Quanto falta por ativo (rebalanceamento)
  const variableComputed = variable.map((a) => {
    const priceBRL = toBRL(a.price, CLASSES[a.cls]?.cur || 'BRL', usd)
    const idealBRL = total * (a.targetPct || 0)
    const faltaBRL = idealBRL - a.valueBRL
    const faltaQtd = priceBRL > 0 ? faltaBRL / priceBRL : 0
    const currentPct = total > 0 ? a.valueBRL / total : 0
    return { ...a, priceBRL, idealBRL, faltaBRL, faltaQtd, currentPct }
  })

  // 4) Resumo por classe
  const byClass = CLASS_ORDER.map((cls) => {
    const items = [
      ...variableComputed.filter((a) => a.cls === cls),
      ...fixed.filter((f) => f.cls === cls),
    ]
    const current = items.reduce((s, i) => s + i.valueBRL, 0)
    const targetPct = portfolio.classTargets?.[cls] ?? 0
    const idealBRL = total * targetPct
    return {
      cls,
      label: CLASSES[cls].label,
      color: CLASSES[cls].color,
      current,
      currentPct: total > 0 ? current / total : 0,
      targetPct,
      idealBRL,
      faltaBRL: idealBRL - current,
      count: items.length,
    }
  })

  // 5) Totais de lucro/prejuízo (só dos ativos com preço médio informado)
  const comCusto = variableComputed.filter((a) => a.temCusto)
  const lucroTotal = comCusto.reduce((s, a) => s + a.lucroBRL, 0)
  const custoTotal = comCusto.reduce((s, a) => s + a.custoBRL, 0)
  const rentabTotal = custoTotal > 0 ? lucroTotal / custoTotal : 0

  return { total, usdBrl: usd, variable: variableComputed, fixed, byClass, lucroTotal, custoTotal, rentabTotal, temCusto: comCusto.length > 0 }
}
