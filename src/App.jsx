import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Holdings from './components/Holdings'
import Rebalance from './components/Rebalance'
import Dividends from './components/Dividends'
import Settings from './components/Settings'
import AssetModal from './components/AssetModal'
import { loadPortfolio, savePortfolio, emptyPortfolio, seedPortfolio } from './services/portfolioService'
import { fetchAllPrices } from './services/priceService'
import { computePortfolio } from './utils/calc'
import { PRICE_CACHE_MINUTES } from './data/config'

const TABS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'carteira', label: 'Carteira' },
  { id: 'rebalancear', label: 'Rebalancear' },
  { id: 'dividendos', label: 'Dividendos' },
  { id: 'config', label: 'Configurações' },
]

export default function App() {
  const { user, loading, login, logout } = useAuth()
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [portfolio, setPortfolio] = useState(null)
  const [loadingPf, setLoadingPf] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [tab, setTab] = useState('resumo')
  const [modal, setModal] = useState(null) // { asset, isFixed }
  const [refreshing, setRefreshing] = useState(false)
  const [priceErrors, setPriceErrors] = useState([])
  const [loadError, setLoadError] = useState('')
  const autoRefreshedRef = useRef(false)

  // Tema claro/escuro
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Carrega a carteira ao logar
  useEffect(() => {
    if (!user) { setPortfolio(null); return }
    setLoadingPf(true)
    setLoadError('')
    loadPortfolio(user.uid)
      .then((pf) => {
        if (pf) { setPortfolio(pf); setNeedsOnboarding(false) }
        else setNeedsOnboarding(true)
      })
      .catch((e) => {
        console.error('Erro ao carregar carteira', e)
        // Não trava o app: deixa o usuário entrar e avisa o que houve.
        if (e?.code === 'permission-denied') {
          setLoadError(
            'O banco de dados está bloqueado. Publique as regras do Firestore (firestore.rules) — ' +
              'veja o README. Enquanto isso, dá pra usar o app, mas os dados não serão salvos.'
          )
        } else {
          setLoadError('Não consegui carregar seus dados agora. Verifique sua conexão.')
        }
        setNeedsOnboarding(true)
      })
      .finally(() => setLoadingPf(false))
  }, [user])

  // Salva qualquer mudança na carteira (estado + Firestore)
  function mutate(updater) {
    setPortfolio((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (user && next) savePortfolio(user.uid, next).catch((e) => console.error('Erro ao salvar', e))
      return next
    })
  }

  function comecar(tipo) {
    const pf = tipo === 'seed' ? seedPortfolio() : emptyPortfolio()
    setNeedsOnboarding(false)
    setPortfolio(pf)
    if (user) savePortfolio(user.uid, pf).catch(console.error)
  }

  // Atualiza preços nas APIs
  async function atualizarPrecos() {
    if (!portfolio) return
    setRefreshing(true)
    setPriceErrors([])
    try {
      const { prices, usdBrl, updatedAt, errors } = await fetchAllPrices(portfolio.assets, portfolio.settings || {})
      setPriceErrors(errors)
      mutate((prev) => ({
        ...prev,
        lastPrices: { ...prev.lastPrices, ...prices },
        usdBrl: usdBrl || prev.usdBrl,
        priceUpdatedAt: updatedAt,
        // Atualiza também o campo price salvo de cada ativo (fallback futuro)
        assets: prev.assets.map((a) => (prices[a.ticker] ? { ...a, price: prices[a.ticker] } : a)),
      }))
    } catch (e) {
      setPriceErrors(['Erro inesperado ao atualizar preços.'])
    } finally {
      setRefreshing(false)
    }
  }

  // #11 — Atualiza os preços sozinho ao abrir, se a última atualização já passou
  // do tempo de cache. Roda só uma vez por sessão (autoRefreshedRef).
  useEffect(() => {
    if (!portfolio || autoRefreshedRef.current) return
    if (!(portfolio.assets || []).length) return
    const last = portfolio.priceUpdatedAt ? new Date(portfolio.priceUpdatedAt).getTime() : 0
    const venceu = Date.now() - last > PRICE_CACHE_MINUTES * 60 * 1000
    if (venceu) {
      autoRefreshedRef.current = true
      atualizarPrecos()
    }
  }, [portfolio])

  const computed = useMemo(
    () => (portfolio ? computePortfolio(portfolio, portfolio.lastPrices, portfolio.usdBrl) : null),
    [portfolio]
  )

  // ---- Handlers de ativos ----
  function salvarAtivo(data, isFixed) {
    mutate((prev) => {
      const key = isFixed ? 'fixed' : 'assets'
      const list = prev[key] || []
      const exists = list.some((x) => x.id === data.id)
      const nova = exists ? list.map((x) => (x.id === data.id ? data : x)) : [...list, data]
      return { ...prev, [key]: nova }
    })
    setModal(null)
  }
  function removerAtivo(a, isFixed) {
    if (!confirm(`Remover ${a.ticker}?`)) return
    const key = isFixed ? 'fixed' : 'assets'
    mutate((prev) => ({ ...prev, [key]: prev[key].filter((x) => x.id !== a.id) }))
  }

  // ---- Telas de carregamento / login ----
  if (loading) return <CenterMsg>Carregando…</CenterMsg>
  if (!user) return <Login />
  if (loadingPf) return <CenterMsg>Carregando sua carteira…</CenterMsg>
  if (needsOnboarding) return <Onboarding onChoose={comecar} user={user} onLogout={logout} loadError={loadError} />
  if (!portfolio || !computed) return <CenterMsg>Carregando…</CenterMsg>

  return (
    <div className="app">
      <header className="topbar">
        <div className="container topbar-inner">
          <div className="logo">
            <span className="dot">
              <svg width="18" height="18" viewBox="0 0 64 64">
                <path d="M14 42 L26 28 L36 36 L50 18" fill="none" stroke="#fff" strokeWidth="7"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            InvestFolio
          </div>
          <div className="spacer" />
          <button className="btn sm" onClick={atualizarPrecos} disabled={refreshing}>
            {refreshing ? 'Atualizando…' : '↻ Atualizar preços'}
          </button>
          <button className="btn sm ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div className="userchip">
            {user?.photoURL && <img src={user.photoURL} alt="" />}
            <button className="btn sm ghost" onClick={logout}>Sair</button>
          </div>
        </div>
        <div className="tabs container">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="container">
        {loadError && <div className="banner error">⚠️ {loadError}</div>}
        {priceErrors.length > 0 && (
          <div className="banner warn">
            {priceErrors.map((e, i) => <div key={i}>• {e}</div>)}
          </div>
        )}

        {tab === 'resumo' && (
          <Dashboard computed={computed} usdBrl={portfolio.usdBrl} updatedAt={portfolio.priceUpdatedAt} />
        )}
        {tab === 'carteira' && (
          <Holdings
            computed={computed}
            onAdd={() => setModal({ asset: null, isFixed: false })}
            onEdit={(a, isFixed) => setModal({ asset: a, isFixed })}
            onRemove={removerAtivo}
          />
        )}
        {tab === 'rebalancear' && <Rebalance computed={computed} />}
        {tab === 'dividendos' && (
          <Dividends
            proventos={portfolio.proventos || []}
            onAdd={(p) => mutate((prev) => ({ ...prev, proventos: [...(prev.proventos || []), p] }))}
            onRemove={(id) => mutate((prev) => ({ ...prev, proventos: (prev.proventos || []).filter((x) => x.id !== id) }))}
          />
        )}
        {tab === 'config' && (
          <Settings
            portfolio={portfolio}
            onSaveSettings={(s) => mutate((prev) => ({ ...prev, settings: s }))}
            onSaveTargets={(t) => mutate((prev) => ({ ...prev, classTargets: t }))}
            onReset={() => { if (confirm('Apagar TODA a carteira e começar do zero?')) comecar('empty') }}
            onLoadSeed={() => { if (confirm('Carregar a carteira da planilha? Isso substitui a atual.')) comecar('seed') }}
          />
        )}
      </main>

      {modal && (
        <AssetModal
          asset={modal.asset}
          onSave={salvarAtivo}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function CenterMsg({ children }) {
  return <div className="login-wrap"><div className="muted">{children}</div></div>
}

function Onboarding({ onChoose, user, onLogout, loadError }) {
  return (
    <div className="login-wrap">
      <div className="login-card" style={{ maxWidth: 440 }}>
        <h1 style={{ marginTop: 0, fontSize: 22 }}>Olá, {user.displayName?.split(' ')[0] || 'investidor'}! 👋</h1>
        {loadError && <div className="banner error" style={{ textAlign: 'left', marginBottom: 14 }}>⚠️ {loadError}</div>}
        <p className="muted">Como você quer começar sua carteira?</p>
        <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
          <button className="btn primary" onClick={() => onChoose('seed')}>
            📊 Usar minha carteira da planilha
          </button>
          <button className="btn" onClick={() => onChoose('empty')}>
            ✨ Começar do zero
          </button>
        </div>
        <button className="btn ghost sm" style={{ marginTop: 16 }} onClick={onLogout}>Sair</button>
      </div>
    </div>
  )
}
