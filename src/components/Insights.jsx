import { useMemo } from 'react'
import { brl, pct, num } from '../utils/format'
import { CLASSES } from '../data/classes'

// Aba INSIGHTS — análises automáticas da carteira (sem você fazer nada).
export default function Insights({ computed }) {
  const { total, variable, byClass } = computed

  const dados = useMemo(() => {
    const ativos = [...variable].sort((a, b) => b.valueBRL - a.valueBRL)
    const maior = ativos[0]
    const top5 = ativos.slice(0, 5).reduce((s, a) => s + a.valueBRL, 0)

    // Exposição em dólar (classe exterior)
    const exterior = byClass.find((c) => c.cls === 'exterior')?.current || 0

    // Classe mais distante da meta
    const desvios = byClass
      .map((c) => ({ ...c, desvio: c.currentPct - c.targetPct }))
      .sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio))
    const maisDistante = desvios[0]

    // Nota média ponderada pelo valor (campo "note" 1 a 5)
    let somaNota = 0, somaPeso = 0
    for (const a of variable) {
      if (isFinite(a.note) && a.valueBRL > 0) { somaNota += a.note * a.valueBRL; somaPeso += a.valueBRL }
    }
    const notaMedia = somaPeso > 0 ? somaNota / somaPeso : null

    // Próximo aporte (mais atrasado)
    const aportar = [...variable].filter((a) => a.faltaBRL > 0.5).sort((a, b) => b.faltaBRL - a.faltaBRL)

    // Distribuição por setor
    const setores = {}
    for (const a of variable) {
      const s = a.sector || CLASSES[a.cls]?.label || 'Outros'
      setores[s] = (setores[s] || 0) + a.valueBRL
    }
    const setoresOrdenados = Object.entries(setores)
      .map(([nome, v]) => ({ nome, v, pct: total > 0 ? v / total : 0 }))
      .sort((a, b) => b.v - a.v)

    return {
      maior, top5pct: total > 0 ? top5 / total : 0, exteriorPct: total > 0 ? exterior / total : 0,
      maisDistante, notaMedia, aportar, setores: setoresOrdenados, nAtivos: variable.filter((a) => a.valueBRL > 0).length,
    }
  }, [computed])

  if (!variable.length || total === 0) {
    return <div className="card"><div className="empty">Adicione ativos para ver os insights da sua carteira.</div></div>
  }

  const d = dados
  const cards = [
    {
      icon: '🎯', titulo: 'Foco do próximo aporte',
      valor: d.aportar[0] ? d.aportar[0].ticker : 'Tudo na meta!',
      desc: d.aportar[0]
        ? `É o ativo mais atrasado. Faltam ${brl(d.aportar[0].faltaBRL)} para a meta.`
        : 'Parabéns, sua carteira está alinhada com as metas.',
      cor: 'var(--brand)',
    },
    {
      icon: '⚖️', titulo: 'Classe fora do alvo',
      valor: d.maisDistante ? d.maisDistante.label : '—',
      desc: d.maisDistante
        ? `Está ${d.maisDistante.desvio >= 0 ? 'acima' : 'abaixo'} da meta (${pct(d.maisDistante.currentPct)} vs ${pct(d.maisDistante.targetPct)}).`
        : '',
      cor: d.maisDistante && d.maisDistante.desvio >= 0 ? 'var(--amber)' : 'var(--brand)',
    },
    {
      icon: '🏆', titulo: 'Maior posição',
      valor: d.maior ? d.maior.ticker : '—',
      desc: d.maior
        ? `Representa ${pct(d.maior.currentPct)} da carteira${d.maior.currentPct > 0.1 ? ' — atenção à concentração.' : '.'}`
        : '',
      cor: d.maior && d.maior.currentPct > 0.1 ? 'var(--red)' : 'var(--text)',
    },
    {
      icon: '💵', titulo: 'Exposição em dólar',
      valor: pct(d.exteriorPct),
      desc: 'Parte do patrimônio investida em ativos no exterior.',
      cor: 'var(--brand)',
    },
    {
      icon: '⭐', titulo: 'Nota média da carteira',
      valor: d.notaMedia != null ? d.notaMedia.toFixed(1) + ' / 5' : '—',
      desc: 'Média das suas notas de qualidade, ponderada pelo valor de cada ativo.',
      cor: 'var(--brand)',
    },
    {
      icon: '🧩', titulo: 'Diversificação',
      valor: `${d.nAtivos} ativos`,
      desc: `As 5 maiores posições somam ${pct(d.top5pct)} da carteira.`,
      cor: d.top5pct > 0.6 ? 'var(--amber)' : 'var(--green)',
    },
  ]

  return (
    <>
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
