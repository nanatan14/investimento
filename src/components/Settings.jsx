import { useState } from 'react'
import { CLASS_ORDER, CLASSES } from '../data/classes'
import { pct, parseNum } from '../utils/format'

// Configurações: chaves de API, metas por classe e ações de carteira.
export default function Settings({ portfolio, onSaveSettings, onSaveTargets, onReset, onLoadSeed }) {
  const [brapi, setBrapi] = useState(portfolio.settings?.brapiToken || '')
  const [finnhub, setFinnhub] = useState(portfolio.settings?.finnhubToken || '')
  const [targets, setTargets] = useState(() => {
    const t = {}
    for (const c of CLASS_ORDER) t[c] = ((portfolio.classTargets?.[c] || 0) * 100).toString()
    return t
  })
  const [msg, setMsg] = useState('')

  const somaMetas = CLASS_ORDER.reduce((s, c) => s + parseNum(targets[c]), 0)

  function salvarChaves() {
    onSaveSettings({ brapiToken: brapi.trim(), finnhubToken: finnhub.trim() })
    flash('Chaves salvas! Atualize os preços para testar.')
  }
  function salvarMetas() {
    const out = {}
    for (const c of CLASS_ORDER) out[c] = parseNum(targets[c]) / 100
    onSaveTargets(out)
    flash('Metas salvas!')
  }
  function flash(t) { setMsg(t); setTimeout(() => setMsg(''), 3000) }

  return (
    <>
      {msg && <div className="banner warn" style={{ background: '#e3f5ec', color: '#1a6b48', borderColor: '#9fe0c2' }}>{msg}</div>}

      <div className="card">
        <h2>Chaves de API (preços automáticos)</h2>
        <p className="sub">São gratuitas. Veja no README onde pegar cada uma.</p>

        <div className="field-row">
          <label className="field">Token brapi.dev — Ações BR e FIIs</label>
          <input value={brapi} onChange={(e) => setBrapi(e.target.value)} placeholder="já configurado — preencha só se quiser trocar" />
          <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
            ✅ Já vem um token pronto. Para usar o seu, pegue grátis em{' '}
            <a href="https://brapi.dev/dashboard" target="_blank" rel="noreferrer">brapi.dev/dashboard</a>.
          </p>
        </div>

        <div className="field-row">
          <label className="field">Chave Finnhub — Ações dos EUA (opcional)</label>
          <input value={finnhub} onChange={(e) => setFinnhub(e.target.value)} placeholder="opcional — sem ela usamos o Yahoo, de graça" />
          <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
            Os preços dos EUA já funcionam sem chave (via Yahoo). Se quiser dados mais rápidos,
            pegue grátis em <a href="https://finnhub.io/dashboard" target="_blank" rel="noreferrer">finnhub.io/dashboard</a>.
          </p>
        </div>

        <button className="btn primary" onClick={salvarChaves}>Salvar chaves</button>
      </div>

      <div className="card">
        <h2>Metas por classe (%)</h2>
        <p className="sub">Quanto cada classe deve representar do seu patrimônio. Soma ideal: 100%.</p>
        <div className="grid grid-3">
          {CLASS_ORDER.map((c) => (
            <div key={c} className="field-row" style={{ marginBottom: 0 }}>
              <label className="field">
                <span className="flex" style={{ gap: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: CLASSES[c].color }} />
                  {CLASSES[c].label}
                </span>
              </label>
              <input value={targets[c]} inputMode="decimal"
                onChange={(e) => setTargets({ ...targets, [c]: e.target.value })} />
            </div>
          ))}
        </div>
        <p className={Math.abs(somaMetas - 100) < 0.5 ? 'pos' : 'neg'} style={{ marginTop: 12, fontSize: 13 }}>
          Soma atual: {somaMetas.toFixed(1)}% {Math.abs(somaMetas - 100) < 0.5 ? '✓' : '(o ideal é 100%)'}
        </p>
        <button className="btn primary" onClick={salvarMetas}>Salvar metas</button>
      </div>

      <div className="card">
        <h2>Carteira</h2>
        <p className="sub">Comece do zero ou carregue a carteira de exemplo (da sua planilha).</p>
        <div className="flex wrap" style={{ gap: 10 }}>
          <button className="btn" onClick={onLoadSeed}>Carregar carteira da planilha</button>
          <button className="btn danger" onClick={onReset}>Apagar tudo e começar do zero</button>
        </div>
      </div>
    </>
  )
}
