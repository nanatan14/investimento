// Funções para formatar dinheiro, porcentagem e números no padrão brasileiro.

export function brl(value) {
  if (value == null || isNaN(value)) return 'R$ 0,00'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function usd(value) {
  if (value == null || isNaN(value)) return 'US$ 0,00'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' })
}

export function pct(value, digits = 2) {
  if (value == null || isNaN(value)) return '0,00%'
  return (value * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }) + '%'
}

export function num(value, digits = 2) {
  if (value == null || isNaN(value)) return '0'
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

// Converte texto digitado ("1.234,56" ou "1234.56") em número.
export function parseNum(text) {
  if (typeof text === 'number') return text
  if (!text) return 0
  const cleaned = String(text).trim().replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}
