import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { brl, parseNum } from '../utils/format'

// Registro de proventos (dividendos, JCP, rendimentos de FII) recebidos.
export default function Dividends({ proventos, onAdd, onRemove }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), ticker: '', value: '' })

  function adicionar() {
    const v = parseNum(form.value)
    if (!form.ticker.trim() || v <= 0) return
    onAdd({
      id: 'prov_' + Date.now(),
      date: form.date,
      ticker: form.ticker.trim().toUpperCase(),
      value: v,
    })
    setForm({ ...form, ticker: '', value: '' })
  }

  const lista = [...proventos].sort((a, b) => (a.date < b.date ? 1 : -1))
  const total = proventos.reduce((s, p) => s + (p.value || 0), 0)

  // Agrupa por mês para o gráfico
  const porMes = useMemo(() => {
    const m = {}
    for (const p of proventos) {
      const mes = (p.date || '').slice(0, 7)
      if (!mes) continue
      m[mes] = (m[mes] || 0) + (p.value || 0)
    }
    return Object.entries(m).sort().slice(-12).map(([mes, v]) => ({
      mes: mes.split('-').reverse().slice(0, 2).join('/'),
      Recebido: +v.toFixed(2),
    }))
  }, [proventos])

  return (
    <>
      <div className="grid grid-2">
        <div className="stat">
          <div className="label">Total recebido</div>
          <div className="value">{brl(total)}</div>
        </div>
        <div className="stat">
          <div className="label">Lançamentos</div>
          <div className="value">{proventos.length}</div>
        </div>
      </div>

      {porMes.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Proventos por mês</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={porMes} margin={{ left: -10 }}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => brl(v)} />
              <Bar dataKey="Recebido" fill="#1a9d6e" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Lançar provento</h2>
        <p className="sub">Anote os dividendos, JCP e rendimentos que você recebeu.</p>
        <div className="flex wrap" style={{ gap: 10, alignItems: 'flex-end' }}>
          <div style={{ width: 150 }}>
            <label className="field">Data</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div style={{ width: 130 }}>
            <label className="field">Ativo</label>
            <input value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} placeholder="MXRF11" />
          </div>
          <div style={{ width: 130 }}>
            <label className="field">Valor (R$)</label>
            <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0,00" inputMode="decimal" />
          </div>
          <button className="btn primary" onClick={adicionar}>Adicionar</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Histórico</h2>
        {lista.length === 0 ? (
          <div className="empty">Nenhum provento lançado ainda.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Data</th><th>Ativo</th><th>Valor</th><th></th></tr></thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id}>
                    <td>{p.date?.split('-').reverse().join('/')}</td>
                    <td className="ticker">{p.ticker}</td>
                    <td className="pos">{brl(p.value)}</td>
                    <td><button className="btn sm danger" onClick={() => onRemove(p.id)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
