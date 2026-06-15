// Conexão com o Firebase (login por email/senha + banco de dados Firestore).
//
// As chaves abaixo são as do SEU projeto Firebase. Para apps web, elas PODEM
// ser públicas — a segurança vem das regras do Firestore (firestore.rules),
// onde cada usuário só acessa os próprios dados. Por isso já vêm embutidas:
// você sobe no GitHub e o app funciona, sem configurar nada.
//
// (Opcional) Dá pra sobrescrever por um arquivo .env — veja .env.example.
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAjPyPV8BYWVw44eIYQB77-NzdGM7u-dRs',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'investimento-5b2f1.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'investimento-5b2f1',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'investimento-5b2f1.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '680345200903',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:680345200903:web:f05b178f897d93547c7da2',
}

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
