// Controla o login por EMAIL e SENHA e mantém o usuário logado em todo o app.
import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  // Entrar (conta já existente)
  const login = (email, senha) => signInWithEmailAndPassword(auth, email, senha)

  // Criar conta nova (com nome opcional para a saudação)
  const register = async (email, senha, nome) => {
    const cred = await createUserWithEmailAndPassword(auth, email, senha)
    if (nome) await updateProfile(cred.user, { displayName: nome })
    return cred
  }

  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
