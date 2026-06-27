import { useState } from 'react'

// #35 (turbinado) — Navegação inferior estilo app nativo, só aparece no celular.
const PRIMARIAS = [
  { id: 'resumo', label: 'Resumo', icon: '🏠' },
  { id: 'carteira', label: 'Carteira', icon: '💼' },
  { id: 'rebalancear', label: 'Aportar', icon: '⚖️' },
  { id: 'insights', label: 'Insights', icon: '💡' },
]
const SECUNDARIAS = [
  { id: 'proventos', label: 'Proventos', icon: '💰' },
  { id: 'reserva', label: 'Reserva', icon: '🛟' },
  { id: 'watchlist', label: 'Watchlist', icon: '👀' },
  { id: 'config', label: 'Configurações', icon: '⚙️' },
]

export default function MobileNav({ tab, onTab, refreshing, onRefresh, privacy, onTogglePrivacy, theme, onToggleTheme, onLogout }) {
  const [mais, setMais] = useState(false)
  const noMais = SECUNDARIAS.some((s) => s.id === tab)

  function ir(id) { onTab(id); setMais(false) }

  return (
    <>
      {/* Folha "Mais" que sobe de baixo */}
      {mais && (
        <div className="sheet-overlay" onClick={() => setMais(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-grid">
              {SECUNDARIAS.map((s) => (
                <button key={s.id} className={`sheet-item ${tab === s.id ? 'active' : ''}`} onClick={() => ir(s.id)}>
                  <span className="sheet-icon">{s.icon}</span>{s.label}
                </button>
              ))}
            </div>
            <div className="sheet-sep" />
            <div className="sheet-grid">
              <button className="sheet-item" onClick={() => { onTogglePrivacy(); }}>
                <span className="sheet-icon">{privacy ? '🙈' : '👁️'}</span>{privacy ? 'Mostrar valores' : 'Esconder valores'}
              </button>
              <button className="sheet-item" onClick={() => { onToggleTheme(); }}>
                <span className="sheet-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              </button>
              <button className="sheet-item" onClick={onLogout}>
                <span className="sheet-icon">🚪</span>Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra inferior */}
      <nav className="bottom-nav">
        {PRIMARIAS.map((t) => (
          <button key={t.id} className={`bn-item ${tab === t.id ? 'active' : ''}`} onClick={() => ir(t.id)}>
            <span className="bn-icon">{t.icon}</span>
            <span className="bn-label">{t.label}</span>
          </button>
        ))}
        <button className={`bn-item ${noMais || mais ? 'active' : ''}`} onClick={() => setMais((m) => !m)}>
          <span className="bn-icon">⋯</span>
          <span className="bn-label">Mais</span>
        </button>
      </nav>
    </>
  )
}
