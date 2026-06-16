import { useEffect, useState } from 'react'
import { getPriceHistory, getNews } from '../services/priceService'
import { brl, usd, pct, num } from '../utils/format'
import { CLASSES } from '../data/classes'
import { recomendar, corRecomendacao } from '../utils/analysis'

// #29 — Tela de detalhe do ativo: posição, rentabilidade, gráfico e notícias.
export default function AssetDetail({ asset, brapiToken, onClose, onEdit }) {
  const [hist, setHist] = useState(null) // null = carregando
  const [news, setNews] = useState(null)
  const cur = asset.cur || CLASSES[asset.cls]?.cur || 'BRL'
  const money = cur === 'USD' ? usd : brl

  useEffect(() => {
    let vivo = true
    getPriceHistory(asset.ticker, asset.cls, brapiToken).then((h) => vivo && setHist(h))
    getNews(asset.ticker, asset.cls).then((n) => vivo && setNews(n))
    return () => { vivo = false }
  }, [asset.ticker])

  const lucroPos = (asset.lucroBRL || 0) >= 0
  const rec = recomendar(asset)

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-lg fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="detail-head">
          <div>
            <div className="flex" style={{ gap: 8 }}>
              <h3 style={{ margin: 0 }}>{asset.ticker}</h3>
              {isFinite(asset.note) && asset.note > 0 && (
                <span className="estrelas" title={`Nota ${asset.note}`}>{'★'.repeat(Math.round(asset.note))}<span className="estrelas-off">{'★'.repeat(5 - Math.round(asset.note))}</span></span>
              )}
            </div>
            <span className="muted" style={{ fontSize: 13 }}>{asset.sector || CLASSES[asset.cls]?.label}</span>
          </div>
          <div className="flex" style={{ gap: 6 }}>
            <button className="btn sm" onClick={() => onEdit(asset)}>Editar</button>
            <button className="btn sm ghost" onClick={onClose}>Fechar</button>
          </div>
        </div>

        {rec && (
          <div className="rec-banner" style={{ borderColor: corRecomendacao(rec.tipo) }}>
            <span className="sinal" style={{ color: corRecomendacao(rec.tipo), borderColor: corRecomendacao(rec.tipo) }}>{rec.label}</span>
            <span className="muted" style={{ fontSize: 13 }}>{rec.motivo}</span>
          </div>
        )}

        {/* Mini gráfico de preço */}
        <Sparkline hist={hist} cur={cur} />

        {/* Números principais */}
        <div className="detail-stats">
          <Stat label="Preço atual" valor={money(asset.price)} />
          <Stat label="Preço médio" valor={asset.avgPrice ? money(asset.avgPrice) : '—'} />
          <Stat label="Quantidade" valor={num(asset.qty, 6)} />
          <Stat label="Valor na carteira" valor={brl(asset.valueBRL)} />
          <Stat label="Participação" valor={pct(asset.currentPct || 0)} />
          <Stat
            label="Lucro / Prejuízo"
            valor={asset.temCusto ? brl(asset.lucroBRL) : '—'}
            sub={asset.temCusto ? pct(asset.rentab) : 'informe o preço médio'}
            cor={asset.temCusto ? (lucroPos ? 'var(--green)' : 'var(--red)') : undefined}
          />
        </div>

        {(asset.alertBelow || asset.alertAbove) && (
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            🔔 Alertas: {asset.alertBelow ? `abaixo de ${money(asset.alertBelow)}` : ''}
            {asset.alertBelow && asset.alertAbove ? ' · ' : ''}
            {asset.alertAbove ? `acima de ${money(asset.alertAbove)}` : ''}
          </div>
        )}

        {/* Notícias */}
        <h4 style={{ margin: '20px 0 10px' }}>📰 Notícias recentes</h4>
        {news === null ? (
          <div className="muted">Buscando notícias…</div>
        ) : news.length === 0 ? (
          <div className="muted">
            Sem notícias agora.{' '}
            <a href={`https://news.google.com/search?q=${encodeURIComponent(asset.ticker)}&hl=pt-BR`} target="_blank" rel="noreferrer">
              Buscar no Google Notícias
            </a>
          </div>
        ) : (
          <div className="news-list">
            {news.map((n, i) => (
              <a key={i} className="news-item" href={n.link} target="_blank" rel="noreferrer">
                <div className="news-title">{n.title}</div>
                <div className="news-meta">{n.source}{n.date ? ' · ' + new Date(n.date).toLocaleDateString('pt-BR') : ''}</div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, valor, sub, cor }) {
  return (
    <div className="detail-stat">
      <div className="ds-label">{label}</div>
      <div className="ds-value" style={{ color: cor }}>{valor}</div>
      {sub && <div className="ds-sub" style={{ color: cor }}>{sub}</div>}
    </div>
  )
}

// Mini gráfico de linha (sparkline) desenhado em SVG, sem biblioteca.
function Sparkline({ hist, cur }) {
  if (hist === null) return <div className="spark-box muted">Carregando gráfico…</div>
  if (!hist.length) return <div className="spark-box muted">Histórico indisponível para este ativo.</div>

  const W = 600, H = 120, pad = 6
  const vals = hist.map((p) => p.c)
  const min = Math.min(...vals), max = Math.max(...vals)
  const span = max - min || 1
  const x = (i) => pad + (i / (hist.length - 1)) * (W - 2 * pad)
  const y = (v) => H - pad - ((v - min) / span) * (H - 2 * pad)
  const d = hist.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.c).toFixed(1)}`).join(' ')
  const area = `${d} L${x(hist.length - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`
  const subiu = vals[vals.length - 1] >= vals[0]
  const cor = subiu ? 'var(--green)' : 'var(--red)'
  const money = cur === 'USD' ? usd : brl
  const variacao = vals[0] > 0 ? (vals[vals.length - 1] - vals[0]) / vals[0] : 0

  return (
    <div className="spark-box">
      <div className="spark-head">
        <span className="muted" style={{ fontSize: 12 }}>Últimos 6 meses</span>
        <span style={{ color: cor, fontWeight: 700, fontSize: 13 }}>
          {subiu ? '▲' : '▼'} {pct(Math.abs(variacao))}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 120 }}>
        <path d={area} fill={cor} opacity="0.12" />
        <path d={d} fill="none" stroke={cor} strokeWidth="2" />
      </svg>
      <div className="spark-foot muted">
        <span>{money(min)}</span><span>{money(max)}</span>
      </div>
    </div>
  )
}
