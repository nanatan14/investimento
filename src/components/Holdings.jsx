import { useState } from 'react'
import { CLASSES, CLASS_ORDER } from '../data/classes'
import { brl, num, pct } from '../utils/format'

// Lista todos os ativos agrupados por classe. Permite editar/remover.
export default function Holdings({ computed, onEdit, onRemove, onAdd }) {
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
      <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <div><h2 style={{ margin: 0 }}>Minha carteira</h2>
          <p className="sub" style={{ margin: '4px 0 0' }}>Todos os seus ativos. Clique para editar.</p>
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
                      <tr><th>Ativo</th><th>Qtd</th><th>Preço</th><th>Valor</th><th>% Atual</th><th></th></tr>
                    )}
                  </thead>
                  <tbody>
                    {items.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <span className="ticker">{a.ticker}</span>
                          {a.sector && <div className="muted" style={{ fontSize: 12 }}>{a.sector}</div>}
                        </td>
                        {!isFixed && <td>{num(a.qty, 6)}</td>}
                        {!isFixed && <td className="muted">
                          {a.cur === 'USD' ? 'US$ ' : 'R$ '}{num(a.price)}
                        </td>}
                        <td>{brl(a.valueBRL)}</td>
                        <td className="muted">{pct(a.currentPct || 0)}</td>
                        <td>
                          <div className="row-actions">
                            <button className="btn sm" onClick={() => onEdit(a, isFixed)}>Editar</button>
                            <button className="btn sm danger" onClick={() => onRemove(a, isFixed)}>×</button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
