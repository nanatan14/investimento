import { useState } from 'react'
import { CLASSES, CLASS_ORDER, assetFlag } from '../data/classes'
import { brl, num, pct } from '../utils/format'
import { alertaDisparado } from '../utils/alerts'
import { recomendar, corRecomendacao } from '../utils/analysis'
import RowSparkline from './RowSparkline'

// Selo de nota de qualidade (#30): estrelas de 1 a 5.
function Estrelas({ n }) {
  if (!isFinite(n) || n <= 0) return null
  return <span className="estrelas" title={`Nota ${n} de 5`}>{'★'.repeat(Math.round(n))}<span className="estrelas-off">{'★'.repeat(5 - Math.round(n))}</span></span>
}

// #29 — Mini-resumo que aparece ao passar o mouse no ativo.
function MiniTip({ a, rec }) {
  const moeda = a.cur === 'USD' ? 'US$ ' : 'R$ '
  return (
    <div className="tip-card">
      <div className="tip-title">{assetFlag(a)} {a.ticker}</div>
      <Linha k="Preço" v={`${moeda}${num(a.price)}`} />
      <Linha k="Valor na carteira" v={brl(a.valueBRL)} />
      <Linha k="% da carteira" v={pct(a.currentPct || 0)} />
      {a.temCusto && <Linha k="Rentabilidade" v={pct(a.rentab)} cor={a.rentab >= 0 ? 'var(--green)' : 'var(--red)'} />}
      {a.change != null && <Linha k="Hoje" v={(a.change >= 0 ? '+' : '') + pct(a.change)} cor={a.change >= 0 ? 'var(--green)' : 'var(--red)'} />}
      {rec && <Linha k="Sinal" v={rec.label} cor={corRecomendacao(rec.tipo)} />}
    </div>
  )
}
function Linha({ k, v, cor }) {
  return <div className="tip-row"><span>{k}</span><span style={{ color: cor, fontWeight: 700 }}>{v}</span></div>
}

// Lista todos os ativos agrupados por classe. Clique no ativo abre o detalhe.
export default function Holdings({ computed, onEdit, onRemove, onAdd, onOpen }) {
  const [open, setOpen] = useState(() => new Set(CLASS_ORDER))
  // Ordenação por coluna: clique no cabeçalho alterna crescente/decrescente.
  const [sort, setSort] = useState({ key: null, dir: 'asc' })

  function toggle(cls) {
    setOpen((s) => {
      const n = new Set(s)
      n.has(cls) ? n.delete(cls) : n.add(cls)
      return n
    })
  }

  function ordenarPor(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  function valorChave(a, key) {
    switch (key) {
      case 'ativo': return (a.ticker || '').toUpperCase()
      case 'preco': return a.price || 0
      case 'valor': return a.valueBRL || 0
      case 'rentab': return a.temCusto ? a.rentab : -Infinity
      case 'pct': return a.currentPct || 0
      default: return 0
    }
  }

  function ordenar(items) {
    if (!sort.key) return items
    const arr = [...items]
    arr.sort((a, b) => {
      const va = valorChave(a, sort.key), vb = valorChave(b, sort.key)
      const c = typeof va === 'string' ? va.localeCompare(vb, 'pt-BR') : va - vb
      return sort.dir === 'asc' ? c : -c
    })
    return arr
  }

  // Cabeçalho clicável que mostra a setinha de ordenação.
  function Th({ label, k, right }) {
    const ativo = sort.key === k
    return (
      <th onClick={() => ordenarPor(k)} className="th-sort" style={{ textAlign: right ? 'right' : undefined }}>
        {label}<span className="th-arrow">{ativo ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}</span>
      </th>
    )
  }

  const allItems = [...computed.variable, ...computed.fixed]

  return (
    <div className="card">
      <div className="card-head" style={{ marginBottom: 6 }}>
        <div><h2 style={{ margin: 0 }}>Minha carteira</h2>
          <p className="sub" style={{ margin: '4px 0 0' }}>Clique num ativo para ver detalhes, gráfico e notícias.</p>
        </div>
        <button className="btn primary" onClick={() => onAdd()}>+ Ativo</button>
      </div>

      {allItems.length === 0 && <div className="empty">Nenhum ativo ainda. Clique em “+ Ativo”.</div>}

      {CLASS_ORDER.map((cls) => {
        const items = allItems.filter((i) => i.cls === cls)
        if (!items.length) return null
        const subtotal = items.reduce((s, i) => s + i.valueBRL, 0)
        const isFixed = cls === 'renda_fixa' || cls === 'reserva'
        return (
          <div key={cls} style={{ marginTop: 18 }}>
            <button className="flex" onClick={() => toggle(cls)}
              style={{ background: 'none', border: 'none', padding: 0, width: '100%', justifyContent: 'space-between' }}>
              <span className="flex" style={{ gap: 8, fontWeight: 700 }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: CLASSES[cls].color }} />
                {CLASSES[cls].label} <span className="muted">({items.length})</span>
              </span>
              <span className="muted">{brl(subtotal)} {open.has(cls) ? '▾' : '▸'}</span>
            </button>

            {open.has(cls) && (
              <div className="table-wrap cards-mobile" style={{ marginTop: 8 }}>
                <table>
                  <thead>
                    {isFixed ? (
                      <tr><Th label="Ativo" k="ativo" /><Th label="Valor" k="valor" /><Th label="% Atual" k="pct" /><th></th></tr>
                    ) : (
                      <tr>
                        <Th label="Ativo" k="ativo" />
                        <th>6 meses</th>
                        <Th label="Preço" k="preco" />
                        <Th label="Valor" k="valor" />
                        <Th label="Rentab." k="rentab" />
                        <th>Sinal</th><th></th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {ordenar(items).map((a) => {
                      const alerta = !isFixed && alertaDisparado(a)
                      const rec = !isFixed && recomendar(a)
                      return (
                        <tr key={a.id} className={isFixed ? '' : 'row-click'} onClick={isFixed ? undefined : () => onOpen(a)}>
                          <td className={`cell-asset ${isFixed ? '' : 'has-tip'}`}>
                            <span className="ticker">{!isFixed && assetFlag(a)} {a.ticker}</span>
                            <Estrelas n={a.note} />
                            {alerta && <span className="alert-dot" title="Alerta de preço disparado">🔔</span>}
                            <div className="muted" style={{ fontSize: 12 }}>
                              {num(a.qty, 6)} × {a.cur === 'USD' ? 'US$ ' : 'R$ '}{num(a.price)}
                            </div>
                            {!isFixed && <MiniTip a={a} rec={rec} />}
                          </td>
                          {!isFixed && <td data-label="6 meses" className="cell-spark"><RowSparkline ticker={a.ticker} cls={a.cls} /></td>}
                          {!isFixed && <td data-label="Preço" className="muted">{a.cur === 'USD' ? 'US$ ' : 'R$ '}{num(a.price)}</td>}
                          <td data-label="Valor">{brl(a.valueBRL)}</td>
                          {!isFixed && (
                            <td data-label="Rentab." className={a.temCusto ? (a.rentab >= 0 ? 'pos' : 'neg') : 'muted'}>
                              {a.temCusto ? pct(a.rentab) : '—'}
                            </td>
                          )}
                          {isFixed && <td data-label="% Atual" className="muted">{pct(computed.total > 0 ? a.valueBRL / computed.total : 0)}</td>}
                          {!isFixed && (
                            <td data-label="Sinal">{rec && <span className="sinal" style={{ color: corRecomendacao(rec.tipo), borderColor: corRecomendacao(rec.tipo) }}>{rec.label}</span>}</td>
                          )}
                          <td className="cell-actions" onClick={(e) => e.stopPropagation()}>
                            <div className="row-actions">
                              <button className="btn sm" onClick={() => onEdit(a, isFixed)}>Editar</button>
                              <button className="btn sm danger" onClick={() => onRemove(a, isFixed)}>×</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
