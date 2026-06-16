// #9 — Alertas de preço. O usuário define limites (abaixo de / acima de) por ativo,
// e o app destaca quando o preço atual cruza esses limites.

// Retorna 'below' | 'above' | null para um ativo já calculado (tem .price nativo).
export function alertaDisparado(asset) {
  const p = asset.price
  if (!isFinite(p) || p <= 0) return null
  if (isFinite(asset.alertBelow) && asset.alertBelow > 0 && p <= asset.alertBelow) return 'below'
  if (isFinite(asset.alertAbove) && asset.alertAbove > 0 && p >= asset.alertAbove) return 'above'
  return null
}

// Lista todos os alertas disparados na carteira.
export function listarAlertas(variable = []) {
  const out = []
  for (const a of variable) {
    const tipo = alertaDisparado(a)
    if (tipo) out.push({ ticker: a.ticker, tipo, price: a.price, cur: a.cur, alvo: tipo === 'below' ? a.alertBelow : a.alertAbove })
  }
  return out
}
