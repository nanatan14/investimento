import { useMemo, useState } from 'react'
import { CLASSES } from '../data/classes'
import { brl, num, parseNum } from '../utils/format'

// Mostra quanto aportar em cada ativo para chegar na carteira ideal.
// Você digita quanto tem pra investir e ele distribui de forma inteligente.
export default function Rebalance({ computed, onAddAsset }) {
  // Ativos que estão abaixo da meta (precisam de aporte)
  const faltantes = useMemo(
    () =>
      computed.variable
        .filter((a) => a.faltaBRL > 0.5)
        .sort((a, b) => b.faltaBRL - a.faltaBRL),
    [computed]
  )

  const totalFalta = faltantes.reduce((s, a) => s + a.faltaBRL, 0)
  const [aporteTxt, setAporteTxt] = useState('')
  const aporte = parseNum(aporteTxt)

  // Distribui o aporte priorizando quem está mais longe da meta (proporcional ao gap).
  const sugestoes = useMemo(() => {
    const valor = aporte > 0 ? aporte : totalFalta
    if (totalFalta <= 0) return []
    return faltantes.map((a) => {
      const fatia = (a.faltaBRL / totalFalta) * valor
      const aplicar = Math.min(fatia, a.faltaBRL) // nunca passa da meta
      const priceBRL = a.priceBRL || 0
      return {
        ...a,
        aplicarBRL: aplicar,
        aplicarQtd: priceBRL > 0 ? aplicar / priceBRL : 0,
      }
    }).filter((a) => a.aplicarBRL > 0.5)
  }, [faltantes, aporte, totalFalta])

  const totalSugerido = sugestoes.reduce((s, a) => s + a.aplicarBRL, 0)

  return (
    <>
      <div className="card">
        <div className="card-head">
          <div>
            <h2>Simulador de aporte</h2>
            <p className="sub" style={{ marginBottom: 0 }}>
              Digite quanto você tem pra investir agora. O app sugere onde colocar pra
              aproximar sua carteira da ideal — começando pelos ativos mais atrasados.
            </p>
          </div>
          {onAddAsset && (
            <button className="btn" onClick={onAddAsset} title="Inclua um ativo que ainda não está na carteira">
              + Novo ativo
            </button>
          )}
        </div>
        <div className="flex wrap" style={{ gap: 12, marginTop: 14 }}>
          <div style={{ maxWidth: 220 }}>
            <label className="field">Valor do aporte (R$)</label>
            <input value={aporteTxt} onChange={(e) => setAporteTxt(e.target.value)}
              placeholder={num(totalFalta)} inputMode="decimal" />
          </div>
          <div className="stat" style={{ padding: '10px 14px' }}>
            <div className="label">Falta total p/ carteira ideal</div>
            <div className="value sm">{brl(totalFalta)}</div>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 12, marginBottom: 0 }}>
          💡 Quer aportar num ativo novo? Clique em <b>+ Novo ativo</b>, defina a meta dele, e ele já
          entra aqui na sugestão de aporte.
        </p>
      </div>

      <div className="card">
        <h2>Onde aportar</h2>
        <p className="sub">
          {aporte > 0
            ? `Distribuindo ${brl(aporte)} entre os ativos abaixo da meta:`
            : 'Para zerar a diferença e ficar 100% na meta, aporte assim:'}
        </p>

        {sugestoes.length === 0 ? (
          <div className="empty">🎯 Sua carteira já está na meta! Nada a aportar agora.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ativo</th><th>Classe</th><th>Falta total</th>
                  <th>Aportar</th><th>Qtd aprox.</th>
                </tr>
              </thead>
              <tbody>
                {sugestoes.map((a) => (
                  <tr key={a.id}>
                    <td><span className="ticker">{a.ticker}</span></td>
                    <td><span className="tag">{CLASSES[a.cls].label}</span></td>
                    <td className="muted">{brl(a.faltaBRL)}</td>
                    <td className="pos">{brl(a.aplicarBRL)}</td>
                    <td>{num(a.aplicarQtd, 4)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ fontWeight: 700 }}>Total</td>
                  <td className="pos" style={{ fontWeight: 800 }}>{brl(totalSugerido)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
