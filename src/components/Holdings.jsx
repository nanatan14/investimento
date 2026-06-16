import { useState } from 'react'
import { CLASSES, CLASS_ORDER } from '../data/classes'
import { brl, num, pct } from '../utils/format'
import { alertaDisparado } from '../utils/alerts'
import { recomendar, corRecomendacao } from '../utils/analysis'
import RowSparkline from './RowSparkline'

// Selo de nota de qualidade (#30): estrelas de 1 a 5.
function Estrelas({ n }) {
  if (!isFinite(n) || n <= 0) return null
  return <span className="estrelas" title={`Nota ${n} de 5`}>{'★'.repeat(Math.round(n))}<span className="estrelas-off">{'★'.repeat(5 - Math.round(n))}</span></span>
}

// Lista todos os ativos agrupados por classe. Clique no ativo abre o detalhe.
export default function Holdings({ computed, onEdit, onRemove, onAdd, onOpen }) {
  const [open, setOpen] = useState(() => new Set(CLASS_ORDER))

  function toggle(cls) {
    setOpen((s) => {
      const n = new Set(s)
      n.has(cls) ? n.delete(cls) : n.add(cls)
      return n
    })
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
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table>
                  <thead>
                    {isFixed ? (
                      <tr><th>Ativo</th><th>Valor</th><th>% Atual</th><th></th></tr>
                    ) : (
                      <tr><th>Ativo</th><th>6 meses</th><th>Preço</th><th>Valor</th><th>Rentab.</th><th>Sinal</th><th></th></tr>
                    )}
                  </thead>
                  <tbody>
                    {items.map((a) => {
                      const alerta = !isFixed && alertaDisparado(a)
                      const rec = !isFixed && recomendar(a)
                      return (
                        <tr key={a.id} className={isFixed ? '' : 'row-click'} onClick={isFixed ? undefined : () => onOpen(a)}>
                          <td>
                            <span className="ticker">{a.ticker}</span>
                            <Estrelas n={a.note} />
                            {alerta && <span className="alert-dot" title="Alerta de preço disparado">🔔</span>}
                            <div className="muted" style={{ fontSize: 12 }}>
                              {num(a.qty, 6)} × {a.cur === 'USD' ? 'US$ ' : 'R$ '}{num(a.price)}
                            </div>
                          </td>
                          {!isFixed && <td><RowSparkline ticker={a.ticker} cls={a.cls} /></td>}
                          {!isFixed && <td className="muted">{a.cur === 'USD' ? 'US$ ' : 'R$ '}{num(a.price)}</td>}
                          <td>{brl(a.valueBRL)}</td>
                          {!isFixed && (
                            <td className={a.temCusto ? (a.rentab >= 0 ? 'pos' : 'neg') : 'muted'}>
                              {a.temCusto ? pct(a.rentab) : '—'}
                            </td>
                          )}
                          {!isFixed && (
                            <td>{rec && <span className="sinal" style={{ color: corRecomendacao(rec.tipo), borderColor: corRecomendacao(rec.tipo) }}>{rec.label}</span>}</td>
                          )}
                          <td onClick={(e) => e.stopPropagation()}>
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
