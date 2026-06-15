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
    classTargets: { acoes_br: 0.02, fiis: 0.2, exterior: 0.65, cripto: 0.03, renda_fixa: 0.1, reserva: 0 },
    proventos: [],
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
    classTargets: structuredClone(SEED_PORTFOLIO.classTargets),
  }
}

export async function loadPortfolio(uid) {
  const snap = await getDoc(portfolioRef(uid))
  if (snap.exists()) {
    // Mescla com o padrão pra garantir que campos novos sempre existam.
    return { ...emptyPortfolio(), ...snap.data() }
  }
  return null // ainda não existe — o app vai oferecer começar do zero ou usar a planilha.
}

export async function savePortfolio(uid, portfolio) {
  await setDoc(portfolioRef(uid), portfolio, { merge: true })
}
