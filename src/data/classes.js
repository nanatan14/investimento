// Definição das classes de ativos da carteira.
// label = nome bonito, color = cor nos gráficos, cur = moeda dos preços.
export const CLASSES = {
  acoes_br:   { label: 'Ações BR',        color: '#0d7488', cur: 'BRL', variable: true },
  fiis:       { label: 'Fundos Imob.',    color: '#2a9d8f', cur: 'BRL', variable: true },
  exterior:   { label: 'Exterior',        color: '#3d5a80', cur: 'USD', variable: true },
  cripto:     { label: 'Criptomoedas',    color: '#e9a23b', cur: 'BRL', variable: true },
  renda_fixa: { label: 'Renda Fixa',      color: '#8d99ae', cur: 'BRL', variable: false },
}

// A reserva de emergência (real e dólar) fica FORA da carteira, na aba própria.
export const CLASS_ORDER = ['acoes_br', 'fiis', 'exterior', 'cripto', 'renda_fixa']

export function classLabel(cls) {
  return CLASSES[cls]?.label || cls
}
export function classColor(cls) {
  return CLASSES[cls]?.color || '#888'
}
