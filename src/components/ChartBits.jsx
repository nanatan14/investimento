// Pecinhas visuais premium reutilizáveis: tooltip em "pílula" e anel de progresso.

// Tooltip estilo pílula (bolha roxa) para os gráficos do recharts.
export function PillTooltip({ active, payload, label, format }) {
  if (!active || !payload || !payload.length) return null
  const v = payload[0].value
  return (
    <div className="pill-tip">
      {format ? format(v) : v}
      {label != null && <small>{label}</small>}
    </div>
  )
}

// Anel de progresso "clay" (estilo My Wallet). value de 0 a 1.
export function RingGauge({ value = 0, size = 150, valueText, sub, cor }) {
  const pctVal = Math.max(0, Math.min(1, value))
  const stroke = 16
  const r = (size - stroke) / 2
  const cx = size / 2
  const C = 2 * Math.PI * r
  const arc = 0.78 // usa ~280° do círculo
  const dash = C * arc
  const offset = dash * (1 - pctVal)
  const rot = 90 + (1 - arc) * 180 // centraliza o "vão" embaixo
  const grad = 'ringGrad'

  return (
    <div className="ring-box" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#16b8ce" />
            <stop offset="55%" stopColor="#4f6bff" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {/* trilho */}
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${dash} ${C}`} transform={`rotate(${rot} ${cx} ${cx})`} />
        {/* progresso */}
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={cor || `url(#${grad})`} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${dash} ${C}`} strokeDashoffset={offset}
          transform={`rotate(${rot} ${cx} ${cx})`} style={{ transition: 'stroke-dashoffset .9s ease' }} />
      </svg>
      <div className="ring-center">
        <div className="ring-value">{valueText}</div>
        {sub && <div className="ring-sub">{sub}</div>}
      </div>
    </div>
  )
}
