# 📈 InvestFolio — Acompanhamento e Rebalanceamento de Carteira

App para acompanhar seus investimentos (Ações BR, FIIs, ativos no exterior, cripto,
renda fixa e reserva) com **preços automáticos** e sugestão de **quanto aportar** em
cada ativo para chegar na sua carteira ideal — igual à sua planilha, só que automático.

- 🔐 Login com email e senha (Firebase) — seus dados sincronizam entre celular e PC
- 💹 Preços automáticos: brapi.dev (Ações BR/FIIs, token já incluído), CoinGecko (cripto),
  AwesomeAPI (dólar) e Yahoo Finance (Ações dos EUA, sem precisar de chave)
- 🔄 Atualiza os preços sozinho ao abrir (com cache de 15 min pra não pesar)
- 📈 Preço médio e rentabilidade (lucro/prejuízo) por ativo
- 💰 Dividendos automáticos (Ações BR, FIIs e Exterior) + renda passiva estimada
- ⚖️ Simulador de aporte / rebalanceamento (+ adicionar ativo novo)
- 💡 Insights com score de saúde da carteira e distribuição por setor
- 🔔 Alertas de preço por ativo
- 🔍 Tela de detalhe do ativo (gráfico de 6 meses + notícias)
- 🛟 Aba Reserva de emergência (real e dólar) com meta — fora da carteira
- 🙈 Modo privacidade (esconde os valores)
- 📊 Gráficos de composição (atual x ideal)
- 📱 Instalável no celular (PWA), atalhos rápidos e modo offline
- 🌗 Tema claro/escuro

---

## ✅ Passo a passo (do zero ao app no ar)

### 1. Instalar o Node.js
Se ainda não tem, baixe em <https://nodejs.org> (versão LTS) e instale.

### 2. Baixar as dependências do projeto
Abra o terminal **dentro da pasta `investfolio`** e rode:

```bash
npm install
```

### 3. Firebase (já configurado!)
A configuração do **seu** projeto Firebase (`investimento-5b2f1`) já está embutida
em `src/firebase.js` — não precisa mexer em nada. Só confira no console que estão ativos:
- **Authentication > Sign-in method > Email/senha** ✅ (você já ativou)
- **Firestore Database** criado
- Em **Authentication > Settings > Domínios autorizados**, adicione o domínio onde
  for publicar (ex: `seu-projeto.web.app` ou o domínio da Vercel).

> As chaves do Firebase para web podem ser públicas — a segurança vem das regras do
> Firestore (`firestore.rules`), onde cada usuário só acessa os próprios dados.

### 4. Pegar o token grátis da brapi (preços de Ações BR e FIIs)
1. Crie conta em <https://brapi.dev>.
2. Copie o token em <https://brapi.dev/dashboard>.
3. Você pode colá-lo **dentro do app**, na aba **Configurações** (recomendado),
   ou no `.env` em `VITE_BRAPI_TOKEN`.

> (Opcional) Para preços de ações dos EUA, crie conta grátis em <https://finnhub.io>
> e cole a chave também em **Configurações**.

### 5. Rodar no seu computador
```bash
npm run dev
```
Abra o endereço que aparecer (geralmente <http://localhost:5173>), **crie sua conta**
(email e senha) e escolha **“Usar minha carteira da planilha”**. Os preços já atualizam sozinhos.

### 📱 Instalar no celular (como um app)
Depois de publicado, abra o site no navegador do celular e toque em **“Adicionar à tela
de início”** (Android: menu ⋮ / iPhone: botão Compartilhar). Ele vira um app com ícone próprio.

---

## ☁️ Publicar no Firebase Hosting

```bash
# 1. Instale as ferramentas (só na primeira vez)
npm install -g firebase-tools

# 2. Faça login
firebase login

# 3. Conecte ao seu projeto (escolha o projeto criado no passo 3)
firebase use --add

# 4. Gere a versão final e publique
npm run build
firebase deploy
```
Ao final, o Firebase mostra o link do seu app no ar. 🎉

> As regras de segurança em `firestore.rules` garantem que **cada usuário só acessa
> a própria carteira**. Elas são publicadas junto no `firebase deploy`.

---

## 🐙 Subir no GitHub

```bash
git init
git add .
git commit -m "InvestFolio: primeira versão"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/investfolio.git
git push -u origin main
```

> Confira que o arquivo `.env` **não** aparece na lista do `git status` antes de subir.

### (Alternativa) Publicar na Vercel
1. Suba no GitHub (acima).
2. Entre em <https://vercel.com>, importe o repositório.
3. Em **Settings > Environment Variables**, adicione as mesmas variáveis do `.env`.
4. Deploy. Pronto.

---

## 🔒 Sobre segurança
- As chaves do Firebase para web **podem** ficar no app — quem protege seus dados são
  as **regras do Firestore** (`firestore.rules`), não as chaves.
- O token da brapi/Finnhub fica no seu navegador/conta. Em um app público qualquer pessoa
  tecnicamente poderia inspecioná-lo; como são planos gratuitos e de leitura, o risco é baixo.
  Se um dia quiser blindar totalmente, dá pra mover essas chamadas para uma função no servidor.

## 🗂️ Estrutura
```
src/
  components/   telas (Login, Dashboard, Holdings, Rebalance, Dividends, Settings, AssetModal)
  services/     priceService (APIs de preço) e portfolioService (Firestore)
  utils/        calc (rebalanceamento) e format (R$, %)
  data/         classes e a carteira inicial da planilha
  contexts/     login
```
