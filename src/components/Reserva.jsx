import { useState } from 'react'
import { brl, usd, pct, parseNum } from '../utils/format'

// Aba RESERVA DE EMERGÊNCIA — fica FORA da carteira de investimentos.
// Cada reserva tem um valor atual e uma META; mostramos o progresso.
export default function Reserva({ reserva, usdBrl, lastPrices = {}, onChange }) {
  const [novo, setNovo] = useState(null) // item em criação

  const dolar = usdBrl || 0
  // #17 — se a reserva tem um ticker (ex: TFLO), o valor vem do preço ao vivo × quantidade.
  const valorAtual = (item) => {
    if (item.ticker && isFinite(lastPrices[item.ticker]) && (item.qty || 0) > 0) {
      return lastPrices[item.ticker] * item.qty
    }
    return item.value || 0
  }
  const emBRL = (item) => (item.cur === 'USD' ? valorAtual(item) * dolar : valorAtual(item))
  const metaBRL = (item) => (item.cur === 'USD' ? (item.goal || 0) * dolar : item.goal || 0)

  const totalAtual = reserva.reduce((s, i) => s + emBRL(i), 0)
  const totalMeta = reserva.reduce((s, i) => s + metaBRL(i), 0)
  const progressoGeral = totalMeta > 0 ? totalAtual / totalMeta : 0

  function atualizar(id, campo, valor) {
    const numerico = campo === 'value' || campo === 'goal' || campo === 'qty'
    onChange(reserva.map((i) => (i.id === id ? { ...i, [campo]: numerico ? parseNum(valor) : valor } : i)))
  }
  function remover(id) {
    if (confirm('Remover esta reserva?')) onChange(reserva.filter((i) => i.id !== id))
  }
  function adicionar() {
    if (!novo?.name?.trim()) return
    onChange([...reserva, { ...novo, id: 'res_' + Date.now(), value: parseNum(novo.value), goal: parseNum(novo.goal) }])
    setNovo(null)
  }

  const cor = (p) => (p >= 1 ? 'var(--green)' : p >= 0.5 ? 'var(--brand)' : 'var(--amber)')

  return (
    <>
      <div className="card hero-card">
        <div className="hero-label">Reserva de emergência (fora da carteira)</div>
        <div className="hero-value">{brl(totalAtual)}</div>
        <div className="hero-sub">
          Meta total: {brl(totalMeta)} · {pct(progressoGeral)} alcançado
        </div>
        <div className="bar big" style={{ marginTop: 14 }}>
          <span style={{ width: Math.min(100, progressoGeral * 100) + '%', background: cor(progressoGeral) }} />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Minhas reservas</h2>
            <p className="sub">Acompanhe quanto já guardou e quanto falta para cada meta.</p>
          </div>
          {!novo && (
            <button className="btn primary" onClick={() => setNovo({ name: '', cur: 'BRL', value: '', goal: '' })}>
              + Reserva
            </button>
          )}
        </div>

        {reserva.length === 0 && !novo && <div className="empty">Nenhuma reserva ainda. Clique em “+ Reserva”.</div>}

        <div className="reserva-grid">
          {reserva.map((item) => {
            const auto = Boolean(item.ticker)
            const atual = valorAtual(item)
            const meta = item.goal || 0
            const p = meta > 0 ? atual / meta : 0
            const fmt = item.cur === 'USD' ? usd : brl
            return (
              <div key={item.id} className="reserva-item">
                <div className="reserva-top">
                  <div className="reserva-name">
                    {item.name}
                    <span className="tag" style={{ marginLeft: 8 }}>{item.cur === 'USD' ? 'Dólar' : 'Real'}</span>
                    {auto && <span className="tag" style={{ marginLeft: 6, background: 'var(--brand-soft)' }}>auto · {item.ticker}</span>}
                  </div>
                  <button className="btn sm danger" onClick={() => remover(item.id)}>×</button>
                </div>

                <div className="bar big" style={{ margin: '12px 0 8px' }}>
                  <span style={{ width: Math.min(100, p * 100) + '%', background: cor(p) }} />
                </div>
                <div className="reserva-progress">
                  <strong>{fmt(atual)}</strong> de {fmt(meta)} · <span style={{ color: cor(p) }}>{pct(p)}</span>
                  {item.cur === 'USD' && <span className="muted"> · ≈ {brl(emBRL(item))}</span>}
                </div>
                {p < 1 && <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Falta {fmt(Math.max(0, meta - atual))}</div>}

                <div className="reserva-edit">
                  {auto ? (
                    <label className="field">
                      Quantidade (cotação automática)
                      <input defaultValue={item.qty || 0} inputMode="decimal"
                        onBlur={(e) => atualizar(item.id, 'qty', e.target.value)} />
                    </label>
                  ) : (
                    <label className="field">
                      Valor atual ({item.cur})
                      <input defaultValue={atual} inputMode="decimal"
                        onBlur={(e) => atualizar(item.id, 'value', e.target.value)} />
                    </label>
                  )}
                  <label className="field">
                    Meta ({item.cur})
                    <input defaultValue={meta} inputMode="decimal"
                      onBlur={(e) => atualizar(item.id, 'goal', e.target.value)} />
                  </label>
                </div>
              </div>
            )
          })}

          {novo && (
            <div className="reserva-item">
              <div className="reserva-name">Nova reserva</div>
              <div className="field-row" style={{ marginTop: 10 }}>
                <label className="field">Nome</label>
                <input autoFocus value={novo.name} onChange={(e) => setNovo({ ...novo, name: e.target.value })}
                  placeholder="Ex: Reserva em Dólar" />
              </div>
              <div className="reserva-edit">
                <label className="field">Moeda
                  <select value={novo.cur} onChange={(e) => setNovo({ ...novo, cur: e.target.value })}>
                    <option value="BRL">Real (R$)</option>
                    <option value="USD">Dólar (US$)</option>
                  </select>
                </label>
                <label className="field">Valor atual
                  <input value={novo.value} inputMode="decimal" onChange={(e) => setNovo({ ...novo, value: e.target.value })} />
                </label>
                <label className="field">Meta
                  <input value={novo.goal} inputMode="decimal" onChange={(e) => setNovo({ ...novo, goal: e.target.value })} />
                </label>
              </div>
              <div className="modal-actions" style={{ marginTop: 12 }}>
                <button className="btn ghost" onClick={() => setNovo(null)}>Cancelar</button>
                <button className="btn primary" onClick={adicionar}>Adicionar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
