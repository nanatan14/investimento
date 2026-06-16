import { useEffect, useMemo, useState } from 'react'
import { brl, pct } from '../utils/format'
import { CLASSES, classColor } from '../data/classes'
import { perfilRisco } from '../utils/analysis'
import { getBenchmarks } from '../services/priceService'
import Treemap from './Treemap'

// Aba INSIGHTS — análises automáticas + score de saúde da carteira.
export default function Insights({ computed }) {
  const { total, variable, byClass, temCusto, rentabTotal, lucroTotal } = computed
  const [bench, setBench] = useState(null)
  useEffect(() => { getBenchmarks().then(setBench) }, [])

  const dados = useMemo(() => {
    const ativos = [...variable].sort((a, b) => b.valueBRL - a.valueBRL)
    const maior = ativos[0]
    const top5 = ativos.slice(0, 5).reduce((s, a) => s + a.valueBRL, 0)
    const exterior = byClass.find((c) => c.cls === 'exterior')?.current || 0
    const nAtivos = variable.filter((a) => a.valueBRL > 0).length

    const desvios = byClass
      .map((c) => ({ ...c, desvio: c.currentPct - c.targetPct }))
      .sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio))
    const maisDistante = desvios[0]
    const somaDesvio = byClass.reduce((s, c) => s + Math.abs(c.currentPct - c.targetPct), 0)

    let somaNota = 0, somaPeso = 0
    for (const a of variable) {
      if (isFinite(a.note) && a.valueBRL > 0) { somaNota += a.note * a.valueBRL; somaPeso += a.valueBRL }
    }
    const notaMedia = somaPeso > 0 ? somaNota / somaPeso : null

    const aportar = [...variable].filter((a) => a.faltaBRL > 0.5).sort((a, b) => b.faltaBRL - a.faltaBRL)

    const setores = {}
    for (const a of variable) {
      const s = a.sector || CLASSES[a.cls]?.label || 'Outros'
      setores[s] = (setores[s] || 0) + a.valueBRL
    }
    const setoresOrdenados = Object.entries(setores)
      .map(([nome, v]) => ({ nome, v, pct: total > 0 ? v / total : 0 })).sort((a, b) => b.v - a.v)

    const maiorPct = total > 0 && maior ? maior.valueBRL / total : 0
    const top5pct = total > 0 ? top5 / total : 0

    // --- Score de saúde (0 a 100) ---
    const sAlinhamento = Math.max(0, 1 - somaDesvio)          // perto das metas
    const sConcentracao = Math.max(0, 1 - Math.max(0, (maiorPct - 0.1) / 0.4)) // 1 maior posição pequena
    const sTopo = Math.max(0, 1 - Math.max(0, (top5pct - 0.5) / 0.5))          // top5 não domina
    const sDiversif = Math.min(1, nAtivos / 20)               // pelo menos ~20 ativos
    const score = Math.round((sAlinhamento * 0.4 + sConcentracao * 0.2 + sTopo * 0.2 + sDiversif * 0.2) * 100)

    // Melhor e pior por rentabilidade (só se houver preço médio)
    const comRent = variable.filter((a) => a.temCusto)
    const melhor = [...comRent].sort((a, b) => b.rentab - a.rentab)[0]
    const pior = [...comRent].sort((a, b) => a.rentab - b.rentab)[0]
    // #13 — Maior acerto e maior erro em R$ (lucro/prejuízo absoluto)
    const maiorAcerto = [...comRent].sort((a, b) => b.lucroBRL - a.lucroBRL)[0]
    const maiorErro = [...comRent].sort((a, b) => a.lucroBRL - b.lucroBRL)[0]

    const risco = perfilRisco(byClass, maiorPct)

    // Treemap: cada ativo, colorido pela classe
    const treemap = variable.filter((a) => a.valueBRL > 0)
      .map((a) => ({ label: a.ticker, value: a.valueBRL, color: classColor(a.cls) }))

    return {
      maior, maiorPct, top5pct, exteriorPct: total > 0 ? exterior / total : 0, maisDistante,
      notaMedia, aportar, setores: setoresOrdenados, nAtivos, score, risco, treemap,
      sub: { alinhamento: sAlinhamento, concentracao: sConcentracao, diversif: sDiversif },
      melhor, pior, maiorAcerto, maiorErro,
    }
  }, [computed])

  if (!variable.length || total === 0) {
    return <div className="card"><div className="empty">Adicione ativos para ver os insights da sua carteira.</div></div>
  }

  const d = dados
  const scoreCor = d.score >= 75 ? 'var(--green)' : d.score >= 50 ? 'var(--amber)' : 'var(--red)'
  const scoreTxt = d.score >= 75 ? 'Saudável' : d.score >= 50 ? 'Pode melhorar' : 'Atenção'

  const cards = [
    { icon: '🎯', titulo: 'Foco do próximo aporte', valor: d.aportar[0] ? d.aportar[0].ticker : 'Tudo na meta!',
      desc: d.aportar[0] ? `Mais atrasado. Faltam ${brl(d.aportar[0].faltaBRL)} para a meta.` : 'Carteira alinhada com as metas.', cor: 'var(--brand)' },
    { icon: '⚖️', titulo: 'Classe fora do alvo', valor: d.maisDistante ? d.maisDistante.label : '—',
      desc: d.maisDistante ? `Está ${d.maisDistante.desvio >= 0 ? 'acima' : 'abaixo'} da meta (${pct(d.maisDistante.currentPct)} vs ${pct(d.maisDistante.targetPct)}).` : '',
      cor: d.maisDistante && d.maisDistante.desvio >= 0 ? 'var(--amber)' : 'var(--brand)' },
    { icon: '🏆', titulo: 'Maior posição', valor: d.maior ? d.maior.ticker : '—',
      desc: d.maior ? `Representa ${pct(d.maiorPct)} da carteira${d.maiorPct > 0.1 ? ' — atenção à concentração.' : '.'}` : '',
      cor: d.maiorPct > 0.1 ? 'var(--red)' : 'var(--text)' },
    { icon: '💵', titulo: 'Exposição em dólar', valor: pct(d.exteriorPct), desc: 'Parte do patrimônio em ativos no exterior.', cor: 'var(--brand)' },
    ...(d.maiorAcerto ? [{ icon: '🚀', titulo: 'Maior acerto', valor: d.maiorAcerto.ticker,
      desc: `Já rendeu ${brl(d.maiorAcerto.lucroBRL)} (${pct(d.maiorAcerto.rentab)}).`, cor: 'var(--green)' }] : []),
    ...(d.maiorErro && d.maiorErro !== d.maiorAcerto && d.maiorErro.lucroBRL < 0 ? [{ icon: '🩹', titulo: 'Maior prejuízo', valor: d.maiorErro.ticker,
      desc: `Está em ${brl(d.maiorErro.lucroBRL)} (${pct(d.maiorErro.rentab)}).`, cor: 'var(--red)' }] : []),
    { icon: '⭐', titulo: 'Nota média da carteira', valor: d.notaMedia != null ? d.notaMedia.toFixed(1) + ' / 5' : '—',
      desc: 'Média das suas notas, ponderada pelo valor de cada ativo.', cor: 'var(--brand)' },
    { icon: '🧩', titulo: 'Diversificação', valor: `${d.nAtivos} ativos`,
      desc: `As 5 maiores posições somam ${pct(d.top5pct)} da carteira.`, cor: d.top5pct > 0.6 ? 'var(--amber)' : 'var(--green)' },
  ]

  return (
    <>
      {/* Score de saúde */}
      <div className="card health-card">
        <Gauge value={d.score} cor={scoreCor} />
        <div className="health-info">
          <h2 style={{ margin: 0 }}>Saúde da carteira</h2>
          <p className="sub" style={{ margin: '4px 0 12px' }}>Uma nota geral de 0 a 100 com base no equilíbrio da sua carteira.</p>
          <div className="health-tag" style={{ background: scoreCor }}>{scoreTxt}</div>
          <div className="health-bars">
            <HealthBar label="Alinhamento com metas" v={d.sub.alinhamento} />
            <HealthBar label="Baixa concentração" v={d.sub.concentracao} />
            <HealthBar label="Diversificação" v={d.sub.diversif} />
          </div>
        </div>
      </div>

      {/* Perfil de risco (#10) + Benchmarks (#11) */}
      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h2>Perfil de risco</h2>
          <p className="sub" style={{ marginBottom: 12 }}>Calculado pela mistura de classes e pela concentração.</p>
          <div className="flex" style={{ gap: 14 }}>
            <div className="risk-score" style={{ color: d.risco.cor }}>{d.risco.score}</div>
            <div>
              <div className="health-tag" style={{ background: d.risco.cor }}>{d.risco.label}</div>
              <div className="bar big" style={{ marginTop: 10, width: 220 }}>
                <span style={{ width: d.risco.score + '%', background: d.risco.cor }} />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Comparativo com o mercado (12 meses)</h2>
          <p className="sub" style={{ marginBottom: 10 }}>
            Sua carteira {temCusto ? <b style={{ color: rentabTotal >= 0 ? 'var(--green)' : 'var(--red)' }}>{pct(rentabTotal)}</b> : '(informe o preço médio dos ativos)'} desde o preço médio.
          </p>
          <div className="bench-list">
            <BenchRow nome="Ibovespa" v={bench?.ibov} loading={!bench} />
            <BenchRow nome="S&P 500 (EUA)" v={bench?.sp500} loading={!bench} />
            <BenchRow nome="CDI" v={bench?.cdi} loading={!bench} />
          </div>
        </div>
      </div>

      <div className="insights-grid">
        {cards.map((c, i) => (
          <div key={i} className="insight-card" style={{ '--accent': c.cor }}>
            <div className="insight-icon">{c.icon}</div>
            <div className="insight-titulo">{c.titulo}</div>
            <div className="insight-valor">{c.valor}</div>
            <div className="insight-desc">{c.desc}</div>
          </div>
        ))}
      </div>

      {/* Treemap (#22) */}
      <div className="card">
        <h2>Mapa da carteira</h2>
        <p className="sub">Cada retângulo é um ativo; o tamanho é o quanto ele pesa. Cores = classes.</p>
        <Treemap items={d.treemap} total={total} />
      </div>

      <div className="card">
        <h2>Distribuição por setor</h2>
        <p className="sub">Onde seu dinheiro está concentrado, somando todas as classes.</p>
        <div className="setores">
          {d.setores.slice(0, 12).map((s) => (
            <div key={s.nome} className="setor-row">
              <div className="setor-nome">{s.nome}</div>
              <div className="bar"><span style={{ width: Math.max(2, s.pct * 100) + '%', background: 'var(--brand)' }} /></div>
              <div className="setor-val">{pct(s.pct)} · {brl(s.v)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function BenchRow({ nome, v, loading }) {
  return (
    <div className="bench-row">
      <span>{nome}</span>
      <span className={v == null ? 'muted' : v >= 0 ? 'pos' : 'neg'}>
        {loading ? '…' : v == null ? '—' : (v >= 0 ? '+' : '') + pct(v)}
      </span>
    </div>
  )
}

function HealthBar({ label, v }) {
  return (
    <div className="hb-row">
      <span className="hb-label">{label}</span>
      <div className="bar"><span style={{ width: Math.round(v * 100) + '%', background: 'var(--brand)' }} /></div>
    </div>
  )
}

// Medidor circular (gauge) em SVG.
function Gauge({ value, cor }) {
  const R = 52, C = 2 * Math.PI * R
  const off = C * (1 - value / 100)
  return (
    <div className="gauge">
      <svg viewBox="0 0 130 130" width="130" height="130">
        <circle cx="65" cy="65" r={R} fill="none" stroke="var(--border)" strokeWidth="11" />
        <circle cx="65" cy="65" r={R} fill="none" stroke={cor} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 65 65)" style={{ transition: 'stroke-dashoffset .8s ease' }} />
        <text x="65" y="62" textAnchor="middle" fontSize="30" fontWeight="800" fill="var(--text)">{value}</text>
        <text x="65" y="84" textAnchor="middle" fontSize="12" fill="var(--text-soft)">de 100</text>
      </svg>
    </div>
  )
}
