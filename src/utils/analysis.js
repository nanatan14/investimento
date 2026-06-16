// Análises que apoiam a tomada de decisão.

// #4 + #14 — Recomendação automática por ativo: Comprar / Manter / Reduzir.
// Usa a distância da meta e o "preço-teto" (alerta de alta) que você definiu.
export function recomendar(a) {
  if (!a || a.cls === 'renda_fixa' || a.cls === 'reserva') return null
  const tp = a.targetPct || 0

  // Ativo "caro": passou do teto que você definiu (alerta de alta)
  if (isFinite(a.alertAbove) && a.alertAbove > 0 && a.price >= a.alertAbove) {
    return { tipo: 'vender', label: 'Avaliar venda', motivo: 'Preço acima do teto que você definiu.' }
  }
  // Muito acima da meta na carteira → considerar reduzir
  if (tp > 0 && a.currentPct > tp * 1.6 && a.valueBRL > 0) {
    return { tipo: 'vender', label: 'Reduzir', motivo: 'Bem acima da meta na carteira.' }
  }
  // Abaixo da meta com folga → bom momento de aportar
  if (a.faltaBRL > Math.max(20, (a.idealBRL || 0) * 0.1)) {
    return { tipo: 'comprar', label: 'Comprar', motivo: 'Abaixo da meta — vale aportar.' }
  }
  return { tipo: 'manter', label: 'Manter', motivo: 'Perto da meta.' }
}

export function corRecomendacao(tipo) {
  return tipo === 'comprar' ? 'var(--green)' : tipo === 'vender' ? 'var(--red)' : 'var(--text-soft)'
}

// #10 — Perfil de risco da carteira (0 a 100). Combina o risco de cada classe
// (cripto e ações pesam mais, renda fixa quase nada) com a concentração.
const RISCO_CLASSE = { acoes_br: 6, fiis: 4, exterior: 6, cripto: 10, renda_fixa: 1 }

export function perfilRisco(byClass, maiorPct = 0) {
  let soma = 0, peso = 0
  for (const c of byClass) {
    if (c.current > 0) { soma += (RISCO_CLASSE[c.cls] ?? 5) * c.currentPct; peso += c.currentPct }
  }
  const base = peso > 0 ? soma / peso : 0 // 1 a 10
  const extraConc = maiorPct > 0.15 ? (maiorPct - 0.15) * 20 : 0 // concentração eleva o risco
  const score = Math.round(Math.min(10, base + extraConc) * 10) // 0 a 100
  const label = score < 35 ? 'Conservador' : score < 65 ? 'Moderado' : 'Arrojado'
  const cor = score < 35 ? 'var(--green)' : score < 65 ? 'var(--amber)' : 'var(--red)'
  return { score, label, cor }
}
