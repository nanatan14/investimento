import { useEffect, useState } from 'react'
import { getDividends } from '../services/priceService'
import { brl, pct, num } from '../utils/format'
import { CLASSES } from '../data/classes'

// #4 — Dividendos AUTOMÁTICOS. Busca o histórico de proventos de cada
// ativo BR (Ações e FIIs) na brapi e estima sua renda passiva.
export default function Proventos({ computed, usdBrl }) {
  // Ações BR, FIIs e ações dos EUA pagam dividendos (cripto não).
  const pagadores = computed.variable.filter(
    (a) => a.cls !== 'cripto' && a.qty > 0
  )
  const dolar = usdBrl || 0
  const [dados, setDados] = useState({})   // { ticker: {dy, total12m} }
  const [carregando, setCarregando] = useState(true)

  async function buscar() {
    setCarregando(true)
    const out = {}
    const fila = [...pagadores]
    const worker = async () => {
      while (fila.length) {
        const a = fila.shift()
        const d = await getDividends(a.ticker, a.cls, a.price)
        out[a.ticker] = d
      }
    }
    await Promise.all(Array.from({ length: 3 }, worker)) // 3 em paralelo (proxy)
    setDados(out)
    setCarregando(false)
  }

  useEffect(() => { buscar() }, []) // busca uma vez ao abrir

  // Renda passiva: proventos/ação (12m) × quantidade, convertendo dólar p/ real.
  const linhas = pagadores.map((a) => {
    const d = dados[a.ticker]
    const rendaNativa = d ? (d.total12m || 0) * a.qty : 0
    const rendaAno = a.cur === 'USD' ? rendaNativa * dolar : rendaNativa
    return { ...a, dy: d?.dy, rendaAno, ultimo: d?.lista?.[0] }
  }).sort((x, y) => y.rendaAno - x.rendaAno)

  const rendaAnual = linhas.reduce((s, l) => s + l.rendaAno, 0)
  const patrimonio = pagadores.reduce((s, a) => s + a.valueBRL, 0)
  const dyMedio = patrimonio > 0 ? rendaAnual / patrimonio : 0

  return (
    <>
      <div className="card hero-card">
        <div className="hero-label">RENDA PASSIVA ESTIMADA (12 meses)</div>
        <div className="hero-value">{brl(rendaAnual)}</div>
        <div className="hero-row">
          <div><div className="mini-label">Por mês (média)</div><div className="mini-value">{brl(rendaAnual / 12)}</div></div>
          <div><div className="mini-label">Yield da carteira</div><div className="mini-value">{pct(dyMedio)}</div></div>
          <div><div className="mini-label">Ativos analisados</div><div className="mini-value">{pagadores.length}</div></div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Proventos por ativo</h2>
            <p className="sub">Dividendos e rendimentos dos últimos 12 meses (Ações BR, FIIs e Exterior), buscados automaticamente.</p>
          </div>
          <button className="btn" onClick={buscar} disabled={carregando}>{carregando ? 'Buscando…' : '↻ Atualizar'}</button>
        </div>

        {carregando && Object.keys(dados).length === 0 ? (
          <div className="empty">Buscando proventos…</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Ativo</th><th>Classe</th><th>DY 12m</th><th>Renda estimada/ano</th><th>Por mês</th></tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.id}>
                    <td><span className="ticker">{l.ticker}</span></td>
                    <td><span className="tag">{CLASSES[l.cls].label}</span></td>
                    <td className={l.dy ? 'pos' : 'muted'}>{l.dy != null ? pct(l.dy) : '—'}</td>
                    <td>{l.rendaAno > 0 ? brl(l.rendaAno) : '—'}</td>
                    <td className="muted">{l.rendaAno > 0 ? brl(l.rendaAno / 12) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!carregando && rendaAnual === 0 && (
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
            Não encontrei histórico de proventos agora — a fonte gratuita pode ter recusado as chamadas.
            Tente “↻ Atualizar” em instantes.
          </p>
        )}
      </div>
    </>
  )
}
