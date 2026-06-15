import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

// Traduz os erros do Firebase para mensagens simples em português.
function traduzErro(code) {
  const map = {
    'auth/invalid-email': 'Email inválido.',
    'auth/missing-password': 'Digite a senha.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/email-already-in-use': 'Já existe uma conta com esse email. Tente entrar.',
    'auth/invalid-credential': 'Email ou senha incorretos.',
    'auth/wrong-password': 'Email ou senha incorretos.',
    'auth/user-not-found': 'Não achei uma conta com esse email. Crie uma conta.',
    'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
    'auth/network-request-failed': 'Sem conexão com a internet.',
  }
  return map[code] || 'Não consegui agora. Tente novamente.'
}

export default function Login() {
  const { login, register } = useAuth()
  const [modo, setModo] = useState('entrar') // 'entrar' | 'criar'
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      if (modo === 'criar') await register(email.trim(), senha, nome.trim())
      else await login(email.trim(), senha)
    } catch (err) {
      console.error(err)
      setErro(traduzErro(err.code))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="big-dot">
          <svg width="32" height="32" viewBox="0 0 64 64">
            <path d="M14 42 L26 28 L36 36 L50 18" fill="none" stroke="#fff"
              strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="50" cy="18" r="5" fill="#7be0c9" />
          </svg>
        </div>
        <h1 style={{ margin: '0 0 6px', fontSize: 24 }}>InvestFolio</h1>
        <p className="muted" style={{ margin: 0 }}>
          {modo === 'criar' ? 'Crie sua conta para começar.' : 'Entre para ver sua carteira.'}
        </p>

        {erro && <div className="banner error" style={{ marginTop: 18, textAlign: 'left' }}>{erro}</div>}

        <form onSubmit={enviar} style={{ marginTop: 18, textAlign: 'left' }}>
          {modo === 'criar' && (
            <div className="field-row">
              <label className="field">Nome</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como quer ser chamado" />
            </div>
          )}
          <div className="field-row">
            <label className="field">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com" autoComplete="email" />
          </div>
          <div className="field-row">
            <label className="field">Senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
              placeholder="mínimo 6 caracteres"
              autoComplete={modo === 'criar' ? 'new-password' : 'current-password'} />
          </div>

          <button className="btn primary" type="submit" disabled={carregando}
            style={{ width: '100%', padding: 12, marginTop: 4 }}>
            {carregando ? 'Aguarde…' : modo === 'criar' ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <p className="muted" style={{ fontSize: 14, marginTop: 18 }}>
          {modo === 'criar' ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
          <button className="btn ghost sm" style={{ padding: 2 }}
            onClick={() => { setErro(''); setModo(modo === 'criar' ? 'entrar' : 'criar') }}>
            {modo === 'criar' ? 'Entrar' : 'Criar conta'}
          </button>
        </p>
      </div>
    </div>
  )
}
