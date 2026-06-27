import { useState } from 'react'
import { CLASSES, CLASS_ORDER, assetFlag } from '../data/classes'
import { num, pct } from '../utils/format'
import RowSparkline from './RowSparkline'

// #40 — Watchlist: ativos que você acompanha mas ainda não tem na carteira.
export default function Watchlist({ watchlist, lastPrices = {}, lastChanges = {}, onChange, onAddToPortfolio }) {
  const [form, setForm] = useState({ ticker: '', cls: 'acoes_br' })

  function adicionar() {
    const ticker = form.ticker.trim().toUpperCase()
    if (!ticker) return
    if (watchlist.some((w) => w.ticker === ticker)) { setForm({ ...form, ticker: '' }); return }
    onChange([...watchlist, { id: 'w_' + Date.now(), ticker, cls: form.cls }])
    setForm({ ...form, ticker: '' })
  }
  function remover(id) { onChange(watchlist.filter((w) => w.id !== id)) }

  const simbolo = (cls) => (CLASSES[cls]?.cur === 'USD' ? 'US$ ' : 'R$ ')

  return (
    <>
      <div className="card">
        <div className="card-head">
          <div>
            <h2>Lista de desejos</h2>
            <p className="sub">Acompanhe ativos antes de comprar. Os preços atualizam junto com a carteira.</p>
          </div>
        </div>
        <div className="flex wrap" style={{ gap: 10, alignItems: 'flex-end' }}>
          <div style={{ width: 160 }}>
            <label className="field">Ticker</label>
            <input value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })}
              placeholder="Ex: WEGE3, GOOGL" onKeyDown={(e) => e.key === 'Enter' && adicionar()} />
          </div>
          <div style={{ width: 170 }}>
            <label className="field">Classe</label>
            <select value={form.cls} onChange={(e) => setForm({ ...form, cls: e.target.value })}>
              {CLASS_ORDER.filter((c) => CLASSES[c].variable).map((c) => (
                <option key={c} value={c}>{CLASSES[c].label}</option>
              ))}
            </select>
          </div>
          <button className="btn primary" onClick={adicionar}>+ Acompanhar</button>
        </div>
      </div>

      <div className="card">
        {watchlist.length === 0 ? (
          <div className="empty">Nenhum ativo na lista. Adicione acima pra acompanhar o preço.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Ativo</th><th>6 meses</th><th>Preço</th><th>Dia</th><th></th></tr>
              </thead>
              <tbody>
                {watchlist.map((w) => {
                  const preco = lastPrices[w.ticker]
                  const ch = lastChanges[w.ticker]
                  return (
                    <tr key={w.id}>
                      <td>
                        <span className="ticker">{assetFlag(w)} {w.ticker}</span>
                        <div className="muted" style={{ fontSize: 12 }}>{CLASSES[w.cls]?.label}</div>
                      </td>
                      <td><RowSparkline ticker={w.ticker} cls={w.cls} /></td>
                      <td className="muted">{isFinite(preco) ? simbolo(w.cls) + num(preco) : '—'}</td>
                      <td className={ch == null ? 'muted' : ch >= 0 ? 'pos' : 'neg'}>
                        {ch == null ? '—' : (ch >= 0 ? '+' : '') + pct(ch)}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="btn sm" onClick={() => onAddToPortfolio(w)}>+ Carteira</button>
                          <button className="btn sm danger" onClick={() => remover(w.id)}>×</button>
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
    </>
  )
}
