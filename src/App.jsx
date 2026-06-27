import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Holdings from './components/Holdings'
import Rebalance from './components/Rebalance'
import Insights from './components/Insights'
import Reserva from './components/Reserva'
import Proventos from './components/Proventos'
import Watchlist from './components/Watchlist'
import Settings from './components/Settings'
import AssetModal from './components/AssetModal'
import AssetDetail from './components/AssetDetail'
import Skeleton from './components/Skeleton'
import MobileNav from './components/MobileNav'
import { loadPortfolio, savePortfolio, emptyPortfolio, seedPortfolio } from './services/portfolioService'
import { fetchAllPrices } from './services/priceService'
import { computePortfolio } from './utils/calc'
import { listarAlertas } from './utils/alerts'
import { setMask } from './utils/format'
import { PRICE_CACHE_MINUTES, DEFAULT_BRAPI_TOKEN } from './data/config'

const TABS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'carteira', label: 'Carteira' },
  { id: 'rebalancear', label: 'Rebalancear' },
  { id: 'insights', label: 'Insights' },
  { id: 'proventos', label: 'Proventos' },
  { id: 'reserva', label: 'Reserva' },
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'config', label: 'Configurações' },
]

export default function App() {
  const { user, loading, login, logout } = useAuth()
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [portfolio, setPortfolio] = useState(null)
  const [loadingPf, setLoadingPf] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [tab, setTab] = useState(() => {
    const t = new URLSearchParams(location.search).get('tab')
    return TABS.some((x) => x.id === t) ? t : 'resumo'
  })
  const [modal, setModal] = useState(null) // { asset, isFixed }
  const [refreshing, setRefreshing] = useState(false)
  const [priceErrors, setPriceErrors] = useState([])
  const [loadError, setLoadError] = useState('')
  const [privacy, setPrivacy] = useState(() => localStorage.getItem('privacy') === '1')
  const [detail, setDetail] = useState(null) // ativo aberto no detalhe
  const autoRefreshedRef = useRef(false)

  // Modo privacidade: mascara os valores em dinheiro.
  setMask(privacy)
  useEffect(() => { localStorage.setItem('privacy', privacy ? '1' : '0') }, [privacy])

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
      // Inclui tickers de reserva em dólar (ex: TFLO) na busca de preços (#17).
      const reservaTickers = (portfolio.reserva || []).filter((r) => r.ticker).map((r) => r.ticker)
      // Também busca os preços dos ativos da watchlist (#40).
      const paraBuscar = [...portfolio.assets, ...(portfolio.watchlist || [])]
      const { prices, changes, usdBrl, updatedAt, errors } = await fetchAllPrices(paraBuscar, portfolio.settings || {}, reservaTickers)
      setPriceErrors(errors)
      mutate((prev) => ({
        ...prev,
        lastPrices: { ...prev.lastPrices, ...prices },
        lastChanges: { ...prev.lastChanges, ...changes },
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
  const alertas = useMemo(() => listarAlertas(computed?.variable || []), [computed])

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
  if (loadingPf) return <Skeleton />
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
          <button className="btn sm refresh-btn" onClick={atualizarPrecos} disabled={refreshing}>
            <span>↻</span><span className="btn-text">{refreshing ? ' Atualizando…' : ' Atualizar preços'}</span>
          </button>
          <div className="topbar-actions desktop-only">
            <button className="btn sm ghost" onClick={() => setPrivacy((p) => !p)} title="Esconder/mostrar valores">
              {privacy ? '🙈' : '👁️'}
            </button>
            <button className="btn sm ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <div className="userchip">
              {user?.photoURL && <img src={user.photoURL} alt="" />}
              <button className="btn sm ghost" onClick={logout}>Sair</button>
            </div>
          </div>
        </div>
        <div className="tabs container desktop-only">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="container">
        {loadError && <div className="banner error">⚠️ {loadError}</div>}
        {alertas.length > 0 && (
          <div className="banner alert">
            🔔 {alertas.map((a) => (
              <span key={a.ticker} style={{ marginRight: 14 }}>
                <b>{a.ticker}</b> {a.tipo === 'below' ? 'caiu abaixo de' : 'passou de'} {a.cur === 'USD' ? 'US$' : 'R$'} {a.alvo}
              </span>
            ))}
          </div>
        )}
        {priceErrors.length > 0 && (
          <div className="banner warn">
            {priceErrors.map((e, i) => <div key={i}>• {e}</div>)}
          </div>
        )}

        <div key={tab} className="fade-in">
        {tab === 'resumo' && (
          <Dashboard computed={computed} usdBrl={portfolio.usdBrl} updatedAt={portfolio.priceUpdatedAt} />
        )}
        {tab === 'carteira' && (
          <Holdings
            computed={computed}
            onAdd={() => setModal({ asset: null, isFixed: false })}
            onEdit={(a, isFixed) => setModal({ asset: a, isFixed })}
            onRemove={removerAtivo}
            onOpen={(a) => setDetail(a)}
          />
        )}
        {tab === 'rebalancear' && (
          <Rebalance computed={computed} onAddAsset={() => setModal({ asset: null, isFixed: false })} />
        )}
        {tab === 'insights' && <Insights computed={computed} onOpen={(a) => setDetail(a)} />}
        {tab === 'proventos' && (
          <Proventos computed={computed} usdBrl={portfolio.usdBrl} />
        )}
        {tab === 'watchlist' && (
          <Watchlist
            watchlist={portfolio.watchlist || []}
            lastPrices={portfolio.lastPrices || {}}
            lastChanges={portfolio.lastChanges || {}}
            onChange={(w) => mutate((prev) => ({ ...prev, watchlist: w }))}
            onAddToPortfolio={(w) => setModal({ asset: { cls: w.cls, ticker: w.ticker, qty: '', price: '', avgPrice: '', targetPct: '', sector: '' }, isFixed: false })}
          />
        )}
        {tab === 'reserva' && (
          <Reserva
            reserva={portfolio.reserva || []}
            usdBrl={portfolio.usdBrl}
            lastPrices={portfolio.lastPrices || {}}
            onChange={(r) => mutate((prev) => ({ ...prev, reserva: r }))}
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
        </div>
      </main>

      {modal && (
        <AssetModal
          asset={modal.asset}
          onSave={salvarAtivo}
          onClose={() => setModal(null)}
        />
      )}
      {detail && (
        <AssetDetail
          asset={detail}
          brapiToken={portfolio.settings?.brapiToken || DEFAULT_BRAPI_TOKEN}
          onClose={() => setDetail(null)}
          onEdit={(a) => { setDetail(null); setModal({ asset: a, isFixed: false }) }}
        />
      )}

      <MobileNav
        tab={tab} onTab={setTab}
        refreshing={refreshing} onRefresh={atualizarPrecos}
        privacy={privacy} onTogglePrivacy={() => setPrivacy((p) => !p)}
        theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onLogout={logout}
      />
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
