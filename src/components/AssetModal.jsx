import { useState } from 'react'
import { CLASSES, CLASS_ORDER } from '../data/classes'
import { parseNum } from '../utils/format'

// Modal para adicionar ou editar um ativo (variável ou de valor fixo).
export default function AssetModal({ asset, onSave, onClose }) {
  const editing = Boolean(asset?.id)
  const [form, setForm] = useState(
    asset || { cls: 'acoes_br', ticker: '', sector: '', qty: '', price: '', targetPct: '', value: '' }
  )
  const isFixed = form.cls === 'renda_fixa' || form.cls === 'reserva'

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  function salvar() {
    const ticker = (form.ticker || '').trim().toUpperCase()
    if (!ticker) return
    const base = {
      id: form.id || `${form.cls}_${ticker}_${Date.now().toString().slice(-4)}`,
      cls: form.cls,
      ticker,
      sector: form.sector || CLASSES[form.cls].label,
    }
    const data = isFixed
      ? { ...base, value: parseNum(form.value), targetPct: parseNum(form.targetPct) / 100 }
      : {
          ...base,
          cur: CLASSES[form.cls].cur,
          qty: parseNum(form.qty),
          price: parseNum(form.price),
          targetPct: parseNum(form.targetPct) / 100,
          note: form.note || null,
        }
    onSave(data, isFixed)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{editing ? 'Editar ativo' : 'Adicionar ativo'}</h3>

        <div className="field-row">
          <label className="field">Classe</label>
          <select value={form.cls} onChange={(e) => set('cls', e.target.value)} disabled={editing}>
            {CLASS_ORDER.map((c) => (
              <option key={c} value={c}>{CLASSES[c].label}</option>
            ))}
          </select>
        </div>

        <div className="field-row">
          <label className="field">{isFixed ? 'Nome' : 'Ticker (ex: PETR4, MXRF11, AAPL, BTC)'}</label>
          <input value={form.ticker} onChange={(e) => set('ticker', e.target.value)}
            placeholder={isFixed ? 'CDB Liquidez diária' : 'PETR4'} />
        </div>

        {!isFixed ? (
          <>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="field-row">
                <label className="field">Quantidade</label>
                <input value={form.qty} onChange={(e) => set('qty', e.target.value)} placeholder="0" inputMode="decimal" />
              </div>
              <div className="field-row">
                <label className="field">Preço atual ({CLASSES[form.cls].cur})</label>
                <input value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0,00" inputMode="decimal" />
              </div>
            </div>
            <div className="field-row">
              <label className="field">Setor (opcional)</label>
              <input value={form.sector} onChange={(e) => set('sector', e.target.value)} placeholder="Financeiro" />
            </div>
          </>
        ) : (
          <div className="field-row">
            <label className="field">Valor investido (R$)</label>
            <input value={form.value} onChange={(e) => set('value', e.target.value)} placeholder="0,00" inputMode="decimal" />
          </div>
        )}

        <div className="field-row">
          <label className="field">Meta na carteira (% do patrimônio total)</label>
          <input
            value={form.targetPct === '' ? '' : (form.targetPct < 1 ? (form.targetPct * 100) : form.targetPct)}
            onChange={(e) => set('targetPct', e.target.value)}
            placeholder="Ex: 2,5" inputMode="decimal" />
          <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
            Quanto você quer que esse ativo represente do total. Deixe 0 se ainda não definiu.
          </p>
        </div>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={salvar}>{editing ? 'Salvar' : 'Adicionar'}</button>
        </div>
      </div>
    </div>
  )
}
