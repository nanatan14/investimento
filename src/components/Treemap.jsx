import { brl, pct } from '../utils/format'

// #22 — Treemap (retângulos proporcionais) por ativo, colorido por classe.
// Algoritmo "squarified" simplificado para deixar os retângulos próximos de quadrados.
export default function Treemap({ items, total, onClick }) {
  const W = 1000, H = 460
  const dados = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value)
  if (!dados.length) return <div className="empty">Sem dados para o mapa.</div>

  const soma = dados.reduce((s, i) => s + i.value, 0)
  const rects = squarify(dados.map((d) => ({ ...d, area: (d.value / soma) * (W * H) })), W, H)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', borderRadius: 10 }}>
      {rects.map((r, i) => {
        const mostrarTexto = r.w > 54 && r.h > 30
        return (
          <g key={i} className="tm-cell" onClick={() => onClick && onClick(r)} style={{ cursor: onClick ? 'pointer' : 'default' }}>
            <rect x={r.x + 1.5} y={r.y + 1.5} width={Math.max(0, r.w - 3)} height={Math.max(0, r.h - 3)}
              rx="5" fill={r.color} />
            {mostrarTexto && (
              <>
                <text x={r.x + 9} y={r.y + 21} fontSize="15" fontWeight="800" fill="#fff">{r.label}</text>
                <text x={r.x + 9} y={r.y + 38} fontSize="11" fill="#fff" opacity="0.85">{pct(r.value / (total || soma))}</text>
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// Divide um retângulo em sub-retângulos com áreas proporcionais (squarified).
function squarify(itens, W, H) {
  const out = []
  let x = 0, y = 0, w = W, h = H
  let resto = [...itens]

  while (resto.length) {
    const horizontal = w >= h
    const ladoFixo = horizontal ? h : w
    // monta uma "fileira" enquanto melhora a proporção
    let fileira = []
    let melhor = Infinity
    while (resto.length) {
      const tentativa = [...fileira, resto[0]]
      const r = piorRazao(tentativa, ladoFixo)
      if (r <= melhor) { fileira = tentativa; melhor = r; resto.shift() }
      else break
    }
    const areaFileira = fileira.reduce((s, i) => s + i.area, 0)
    const ladoVar = areaFileira / ladoFixo // espessura da fileira
    let off = 0
    for (const it of fileira) {
      const comp = it.area / ladoVar
      if (horizontal) out.push({ ...it, x: x, y: y + off, w: ladoVar, h: comp })
      else out.push({ ...it, x: x + off, y: y, w: comp, h: ladoVar })
      off += comp
    }
    if (horizontal) { x += ladoVar; w -= ladoVar } else { y += ladoVar; h -= ladoVar }
  }
  return out
}

function piorRazao(fileira, ladoFixo) {
  const area = fileira.reduce((s, i) => s + i.area, 0)
  const ladoVar = area / ladoFixo
  let pior = 0
  for (const it of fileira) {
    const comp = it.area / ladoVar
    const razao = Math.max(ladoVar / comp, comp / ladoVar)
    if (razao > pior) pior = razao
  }
  return pior
}
