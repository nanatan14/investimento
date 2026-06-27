import { pct } from '../utils/format'

// #23 — Heatmap da variação do dia: um quadrinho por ativo, verde se subiu,
// vermelho se caiu, mais forte quanto maior a variação.
export default function Heatmap({ variable, onOpen }) {
  const itens = variable
    .filter((a) => a.valueBRL > 0)
    .sort((a, b) => (b.change ?? -Infinity) - (a.change ?? -Infinity))

  if (!itens.length) return <div className="empty">Sem ativos para o mapa de calor.</div>

  const temVar = itens.some((a) => a.change != null)

  return (
    <>
      <div className="heatmap">
        {itens.map((a) => (
          <button key={a.id} className="heat-tile" style={{ background: corVar(a.change) }}
            onClick={() => onOpen && onOpen(a)} title={`${a.ticker}: ${a.change != null ? sinal(a.change) : 'sem dado'}`}>
            <span className="heat-ticker">{a.ticker}</span>
            <span className="heat-var">{a.change != null ? sinal(a.change) : '—'}</span>
          </button>
        ))}
      </div>
      {!temVar && <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
        A variação do dia aparece após atualizar os preços (botão “↻ Atualizar preços”).
      </p>}
    </>
  )
}

function sinal(v) {
  return (v >= 0 ? '+' : '') + pct(v)
}

// Cor do quadrinho conforme a variação (satura até ±4%).
function corVar(change) {
  if (change == null) return 'var(--surface-2)'
  const intensidade = Math.min(1, Math.abs(change) / 0.04)
  const alpha = 0.15 + intensidade * 0.7
  return change >= 0
    ? `rgba(26, 157, 110, ${alpha.toFixed(2)})`
    : `rgba(214, 69, 69, ${alpha.toFixed(2)})`
}
