import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts'
import { brl, pct, num } from '../utils/format'
import { PillTooltip } from './ChartBits'

// Visão geral: patrimônio total, dólar, e gráficos de composição (atual x ideal).
export default function Dashboard({ computed, usdBrl, updatedAt }) {
  const { total, byClass } = computed
  const classesComAtivo = byClass.filter((c) => c.current > 0 || c.targetPct > 0)
  const pieData = classesComAtivo.filter((c) => c.current > 0)

  // Dados para o gráfico de barras: % atual vs % ideal por classe
  const barData = classesComAtivo.map((c) => ({
    name: c.label,
    Atual: +(c.currentPct * 100).toFixed(1),
    Ideal: +(c.targetPct * 100).toFixed(1),
  }))

  return (
    <>
      <div className="card hero-card">
        <div className="hero-label">PATRIMÔNIO INVESTIDO</div>
        <div className="hero-value">{brl(total)}</div>
        <div className="hero-row">
          {computed.temCusto && (
            <div>
              <div className="mini-label">Lucro / Prejuízo</div>
              <div className="mini-value">
                {computed.lucroTotal >= 0 ? '▲' : '▼'} {brl(Math.abs(computed.lucroTotal))} ({pct(computed.rentabTotal)})
              </div>
            </div>
          )}
          <div>
            <div className="mini-label">Dólar (USD/BRL)</div>
            <div className="mini-value">{usdBrl ? brl(usdBrl) : '—'}</div>
          </div>
          <div>
            <div className="mini-label">Ativos</div>
            <div className="mini-value">{computed.variable.filter((a) => a.valueBRL > 0).length}</div>
          </div>
          <div>
            <div className="mini-label">Atualizado em</div>
            <div className="mini-value">
              {updatedAt ? new Date(updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Composição atual</h2>
          <p className="sub">Como seu dinheiro está dividido hoje</p>
          {pieData.length === 0 ? (
            <div className="empty">Sem ativos ainda.</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="current" nameKey="label" cx="50%" cy="50%"
                  innerRadius={58} outerRadius={95} paddingAngle={3} cornerRadius={6} isAnimationActive={false}>
                  {pieData.map((c) => <Cell key={c.cls} fill={c.color} stroke="transparent" />)}
                </Pie>
                <Tooltip content={<PillTooltip format={(v) => brl(v)} />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2>Atual x Ideal</h2>
          <p className="sub">Distância da sua carteira ideal (%)</p>
          {barData.length === 0 ? (
            <div className="empty">Defina suas metas para ver.</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} margin={{ left: -10 }}>
                <defs>
                  <linearGradient id="barAtual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f6bff" />
                    <stop offset="100%" stopColor="#16b8ce" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip cursor={{ fill: 'rgba(127,127,127,0.08)' }} content={<PillTooltip format={(v) => v + '%'} />} />
                <Legend />
                <Bar dataKey="Atual" fill="url(#barAtual)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="Ideal" fill="#cbb3f0" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Resumo por classe</h2>
        <p className="sub">Valor, participação atual e meta de cada classe</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Classe</th><th>Ativos</th><th>Valor</th><th>% Atual</th><th>% Ideal</th><th>Aportar</th>
              </tr>
            </thead>
            <tbody>
              {classesComAtivo.map((c) => (
                <tr key={c.cls}>
                  <td>
                    <span className="flex" style={{ gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />
                      {c.label}
                    </span>
                  </td>
                  <td className="muted">{c.count}</td>
                  <td>{brl(c.current)}</td>
                  <td>{pct(c.currentPct)}</td>
                  <td className="muted">{pct(c.targetPct)}</td>
                  <td className={c.faltaBRL > 0.5 ? 'pos' : 'muted'}>
                    {c.faltaBRL > 0.5 ? brl(c.faltaBRL) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
