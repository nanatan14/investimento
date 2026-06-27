// #32 — Tela de carregamento "esqueleto" (placeholders animados) enquanto a
// carteira carrega — fica bem mais agradável que um "Carregando…".
export default function Skeleton() {
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
          <span className="sk sk-pill" />
        </div>
        <div className="tabs container">
          {[60, 70, 90, 70, 80].map((w, i) => <span key={i} className="sk sk-tab" style={{ width: w }} />)}
        </div>
      </header>
      <main className="container">
        <div className="sk sk-hero" />
        <div className="grid grid-2" style={{ marginTop: 16 }}>
          <div className="card"><span className="sk sk-line" style={{ width: '40%' }} /><div className="sk sk-block" /></div>
          <div className="card"><span className="sk sk-line" style={{ width: '40%' }} /><div className="sk sk-block" /></div>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <span className="sk sk-line" style={{ width: '30%' }} />
          {[0, 1, 2, 3].map((i) => <div key={i} className="sk sk-row" />)}
        </div>
      </main>
    </div>
  )
}
