import { useEffect, useState } from 'react'
import { getPriceHistory } from '../services/priceService'

// #27 — Mini-gráfico (sparkline) de cada ativo na lista da carteira.
// Cache compartilhado + fila de no máximo 2 buscas ao mesmo tempo (o proxy
// gratuito não aguenta muitas chamadas juntas).
const cache = new Map() // ticker -> array de pontos
let ativos = 0
const fila = []

function agendar(tarefa) {
  return new Promise((resolve) => {
    fila.push({ tarefa, resolve })
    bombear()
  })
}
function bombear() {
  while (ativos < 2 && fila.length) {
    const { tarefa, resolve } = fila.shift()
    ativos++
    tarefa().then((r) => { ativos--; resolve(r); bombear() })
  }
}

export default function RowSparkline({ ticker, cls }) {
  const [hist, setHist] = useState(() => cache.get(ticker) || null)

  useEffect(() => {
    if (cache.has(ticker)) { setHist(cache.get(ticker)); return }
    let vivo = true
    agendar(() => getPriceHistory(ticker, cls).then((h) => {
      const pts = (h || []).slice(-40) // últimos ~40 pontos
      cache.set(ticker, pts)
      return pts
    })).then((pts) => vivo && setHist(pts))
    return () => { vivo = false }
  }, [ticker])

  if (hist === null) return <div className="spark-mini muted">···</div>
  if (!hist.length) return <div className="spark-mini muted">—</div>

  const W = 90, H = 26
  const vals = hist.map((p) => p.c)
  const min = Math.min(...vals), max = Math.max(...vals)
  const span = max - min || 1
  const x = (i) => (i / (hist.length - 1)) * W
  const y = (v) => H - 2 - ((v - min) / span) * (H - 4)
  const d = hist.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.c).toFixed(1)}`).join(' ')
  const subiu = vals[vals.length - 1] >= vals[0]
  const cor = subiu ? 'var(--green)' : 'var(--red)'

  return (
    <svg className="spark-mini" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <path d={d} fill="none" stroke={cor} strokeWidth="1.6" />
    </svg>
  )
}
