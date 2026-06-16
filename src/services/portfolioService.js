// Leitura e gravação da carteira no Firestore.
// Tudo do usuário fica em um único documento: users/{uid}/data/portfolio
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { SEED_PORTFOLIO } from '../data/seedPortfolio'

function portfolioRef(uid) {
  return doc(db, 'users', uid, 'data', 'portfolio')
}

// Estrutura padrão de uma carteira vazia.
export function emptyPortfolio() {
  return {
    assets: [],
    fixed: [],
    reserva: [],
    classTargets: { acoes_br: 0.02, fiis: 0.2, exterior: 0.65, cripto: 0.03, renda_fixa: 0.1 },
    settings: { brapiToken: '', finnhubToken: '' },
    lastPrices: {},
    usdBrl: null,
  }
}

// Carteira pré-preenchida com os ativos da planilha do Natan.
export function seedPortfolio() {
  return {
    ...emptyPortfolio(),
    assets: structuredClone(SEED_PORTFOLIO.assets),
    fixed: structuredClone(SEED_PORTFOLIO.fixed),
    reserva: structuredClone(SEED_PORTFOLIO.reserva),
    classTargets: structuredClone(SEED_PORTFOLIO.classTargets),
  }
}

// Ajusta carteiras antigas para o formato novo (reserva fora da carteira).
function migrar(pf) {
  if (!pf.reserva) pf.reserva = []
  // Move itens de reserva que estavam junto da renda fixa para a aba Reserva.
  const reservasNoFixed = (pf.fixed || []).filter((f) => f.cls === 'reserva')
  if (reservasNoFixed.length && pf.reserva.length === 0) {
    pf.reserva = reservasNoFixed.map((f) => ({
      id: f.id, name: f.ticker || 'Reserva', cur: 'BRL', value: f.value || 0, goal: (f.value || 0) * 10,
    }))
    pf.fixed = pf.fixed.filter((f) => f.cls !== 'reserva')
  }
  if (pf.classTargets) delete pf.classTargets.reserva
  delete pf.proventos
  return pf
}

export async function loadPortfolio(uid) {
  const snap = await getDoc(portfolioRef(uid))
  if (snap.exists()) {
    // Mescla com o padrão pra garantir que campos novos sempre existam.
    return migrar({ ...emptyPortfolio(), ...snap.data() })
  }
  return null // ainda não existe — o app vai oferecer começar do zero ou usar a planilha.
}

export async function savePortfolio(uid, portfolio) {
  await setDoc(portfolioRef(uid), portfolio, { merge: true })
}
