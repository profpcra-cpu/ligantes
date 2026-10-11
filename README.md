# 🧩 Brain Curves

> **Um jogo de lógica espacial e otimização de percursos.**
> Conecte pontos da mesma cor, contorne obstáculos e domine o Índice de Agilidade Topológica (IAT).

[![Deploy](https://img.shields.io/badge/demo-ligantes.vercel.app-6366f1?style=for-the-badge&logo=vercel&logoColor=white)](https://ligantes.vercel.app/#)
[![Firebase](https://img.shields.io/badge/Firebase-10.8.0-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](./LICENSE)

<p align="center">
  <img src="./docs/preview.png" alt="Preview do Brain Curves" width="360">
</p>

---

## 📖 Índice

- [Sobre o Jogo](#-sobre-o-jogo)
- [Como Jogar](#-como-jogar)
- [Funcionalidades](#-funcionalidades)
- [Níveis de Dificuldade](#-níveis-de-dificuldade)
- [Sistema de Pontuação (IAT)](#-sistema-de-pontuação-iat)
- [Tecnologias](#-tecnologias)
- [Arquitetura do Código](#-arquitetura-do-código)
- [Executar Localmente](#-executar-localmente)
- [Configurar Firebase](#-configurar-firebase)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Roadmap](#-roadmap)
- [Contribuir](#-contribuir)
- [Licença](#-licença)
- [Créditos](#-créditos)

---

## 🎮 Sobre o Jogo

**Brain Curves** é um jogo web de puzzle espacial onde o objetivo é **ligar pares de nós coloridos** através de trilhas contínuas, **sem que estas se cruzem**. Cada nível apresenta uma grelha com endpoints de várias cores — a tua tarefa é traçar caminhos que os unam todos, respeitando o espaço disponível.

Mais do que um simples "connect the dots", o jogo recompensa:

- 🧠 **Planeamento espacial** — prever onde cada trilha vai passar antes de a desenhar.
- 🎯 **Otimização de percurso** — quanto menos voltas, melhor.
- ⏱️ **Fluidez temporal** — resolver rápido sem erros.
- 🧩 **Resolução de conflitos** — quando várias trilhas competem pelo mesmo espaço.

> **Demo ao vivo:** [ligantes.vercel.app](https://ligantes.vercel.app/#)

---

## 🕹️ Como Jogar

1. **Arrasta** o dedo (ou o rato) de um nó colorido até ao nó gémeo da **mesma cor**.
2. A trilha desenha-se célula a célula enquanto moves o ponteiro.
3. **Trilhas alheias podem ser atravessadas** — mas isso apaga a trilha do adversário.
4. Um par está **concluído** quando os dois endpoints ficam ligados por um caminho contínuo.
5. **Ganha** quando todos os pares estiverem ligados e nenhuma trilha se cruzar.

### Atalhos e botões

| Botão | Ação |
|---|---|
| ↩ **Desfazer** | Reverte a última trilha desenhada |
| 💡 **Dica** | Aplica automaticamente um caminho simples para um par pendente |
| 🤖 **Auto-Resolver** | Calcula e anima a solução completa do nível |
| 🔄 **Reiniciar** | Gera um novo tabuleiro para o nível atual |
| 🔄 **Zerar** | Reinicia a pontuação acumulada |
| **Sair** | Termina a sessão (Auth) |

> 📱 Em dispositivos móveis, usa o **polegar** para desenhar — a app suporta `Pointer Events` nativamente.

---

## ✨ Funcionalidades

### 🎯 Mecânica de Jogo
- **Geração garantida de pares** — o algoritmo de geração nunca produz layouts insolúveis.
- **Desenho contínuo** — suporta `pointermove` coalescido para máxima fluidez.
- **Undo com histórico** — desfaz trilhas uma a uma.
- **Dicas inteligentes** — resolve automaticamente o par mais próximo de ser concluído.
- **Auto-solver animado** — vê a solução ótima a ser desenhada passo-a-passo (A* com retry).

### 🧠 Métricas
- **Índice de Agilidade Topológica (IAT)** — combina densidade da grelha, tempo e conexões.
- **Patamares de Progressão Cartográfica** — títulos atribuídos conforme o IAT:
  - 🥉 *Explorador de Trilha*
  - 🥈 *Cartógrafo Urbano*
  - 🥇 *Navegador Sináptico*
  - 💎 *Arquiteto de Fluxos*

### 🔐 Autenticação e Persistência
- Login via **Google**, **E-mail/Palavra-passe** ou **Modo Anónimo**.
- Sincronização de pontos com **Firebase Realtime Database**.
- **Fallback** para `localStorage` quando o utilizador é anónimo ou está offline.

### 🎨 Feedback Sensorial
- 🎵 **Áudio dinâmico** gerado via Web Audio API (sem ficheiros).
- 📳 **Vibração háptica** em dispositivos compatíveis (Vibration API).
- 🎬 **Animações CSS** com suporte a `prefers-reduced-motion`.

---

## 📊 Níveis de Dificuldade

| Nível | Grelha | Pares | IAT alvo |
| :---: | :---: | :---: | :---: |
| **1** | 6 × 6  | 3  | ~150 |
| **2** | 8 × 8  | 5  | ~280 |
| **3** | 10 × 10 | 7  | ~450 |
| **4** | 11 × 11 | 9  | ~640 |
| **5** | 12 × 12 | 12 | ~900 |

O **IAT** é calculado em tempo real durante o jogo:

```text
IAT = (tamanho × 15) + (conexões × 25) + max(0, (pares × 4 − segundos) × 5)
```

- **tamanho × 15** → fator espacial (grelhas maiores = mais complexas)
- **conexões × 25** → progresso (cada par ligado soma)
- **bónus de tempo** → resolve rápido e ganha pontos extra

---

## 🏆 Sistema de Pontuação

Ao concluir um nível:

```text
ganho = (nível × 50) + max(0, 60 − segundos) × 2
```

| Ação | Efeito |
|---|---|
| Completar nível | Soma pontos conforme fórmula |
| Zerar pontos | Reinicia para 0 (com confirmação) |
| Modo Anónimo | Pontos ficam em `localStorage` |
| Autenticado | Pontos sincronizam com Firebase |

---

## 🛠️ Tecnologias

| Camada | Tecnologia | Uso |
|---|---|---|
| **Frontend** | HTML5 / CSS3 / JS (ES6+ Modules) | Interface e lógica |
| **Autenticação** | Firebase Auth 10.8.0 | Google, E-mail, Anónimo |
| **Base de Dados** | Firebase Realtime Database | Pontuações por utilizador |
| **Áudio** | Web Audio API | Sons gerados proceduralmente |
| **Háptico** | Vibration API | Feedback tátil em mobile |
| **Deploy** | Vercel | Hospedagem estática + CDN |

**Sem dependências de build** — o jogo corre diretamente com `<script type="module">`.

---

## 🗂️ Arquitetura do Código

O projeto está dividido em **módulos ES6** com responsabilidades claras:

```text
index.html          → Estrutura + CSS + bootstrap do módulo principal
├── game-engine.js  → Motor do jogo (estado, render, eventos, UI)
│   ├── firebase-config.js  → Inicialização do Firebase
│   ├── audio.js            → Motor de áudio procedural
│   └── solver.js           → A* + retry para auto-resolução animada
```

### Responsabilidades por módulo

#### `game-engine.js`
- **Estado global** do jogo (`estado`).
- **Geração de pares** garantida (`gerarPares`, `tentarGerarPares`).
- **Renderização** do tabuleiro (`montarBoard`, `atualizarVisualDom`).
- **Mecânica de desenho** (`iniciarDesenho`, `aplicarPasso`, `finalizarDesenho`).
- **UI**: botões, autenticação, toast, timer, progresso.
- **Bootstrap**: chama `iniciarJogo(5)` no arranque.

#### `solver.js`
- **A\*** com heurística Manhattan + penalidade de corredor estreito.
- **Retry estratégico** com 5 ordens diferentes (até 12 tentativas).
- **Animação progressiva** célula a célula com controlo de velocidade.
- **Cancelável** via `Escape` ou clique no botão.

#### `audio.js`
- **Áudio procedural** — todos os sons são gerados em runtime.
- **Anti-fadiga** com ducking adaptativo.
- **Envelopes ADSR** + filtros + reverb sintético.
- **Notas aleatórias** da escala pentatónica menor.

#### `firebase-config.js`
- Inicialização do Firebase App, Auth e Realtime Database.
- Exporta instâncias `db` e `auth`.

---

## 💻 Executar Localmente

### Pré-requisitos
- Navegador moderno (Chrome 90+, Firefox 88+, Safari 14+)
- Servidor HTTP local (**obrigatório** para `type="module"`)

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/profpcra-cpu/ligantes.git
cd ligantes

# 2. Sirva localmente (escolhe UM)
npx serve .
# ou
python -m http.server 8000
# ou
php -S localhost:8000
```

Abre [http://localhost:8000](http://localhost:8000) e o jogo arranca.

> ⚠️ **Não abras `index.html` diretamente** (`file:///`) — os `import` de módulos ES6 falham por CORS.

---

## 🔥 Configurar Firebase

### 1. Criar projeto
1. Vai a [console.firebase.google.com](https://console.firebase.google.com/)
2. Cria um novo projeto (ex.: `ligantes-app`)

### 2. Ativar serviços
- **Authentication** → Sign-in methods:
  - ✅ Google
  - ✅ E-mail/Password
  - ✅ Anonymous
- **Realtime Database** → Create database (modo de teste):
  ```json
  {
    "rules": {
      "jogadores": {
        "$uid": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        }
      }
    }
  }
  ```

### 3. Copiar credenciais

Edita `firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:xxxxxxxxxxxxxxxx"
};
```

### 4. Autorizar domínio (produção)

Em **Authentication → Settings → Authorized domains**, adiciona:
- `localhost`
- `ligantes.vercel.app` (ou o teu domínio)

---

## 📁 Estrutura do Projeto

```text
ligantes/
├── index.html              # UI + CSS + bootstrap
├── game-engine.js          # Motor do jogo
├── solver.js               # Auto-resolver (A* + animação)
├── audio.js                # Áudio procedural
├── firebase-config.js      # Credenciais Firebase
├── README.md               # Este ficheiro
└── docs/
    └── preview.png         # Screenshot para o README
```

### Fluxo de dependências

```text
index.html
   └── game-engine.js
        ├── firebase-config.js
        ├── audio.js
        └── solver.js
             ├── game-engine.js (import circular controlado)
             └── audio.js
```

> O `import` circular entre `game-engine` ↔ `solver` é seguro porque o solver só acede a `estado` e funções do engine **em runtime** (após clique do utilizador), nunca durante a fase de module loading.

---

## 🗺️ Roadmap

### ✅ Concluído
- [x] Geração garantida de pares solucionáveis
- [x] Autenticação tripla (Google, E-mail, Anónimo)
- [x] Sincronização Firebase + fallback local
- [x] Índice de Agilidade Topológica (IAT)
- [x] Auto-resolver com animação progressiva
- [x] Áudio procedural moderno
- [x] Suporte a `prefers-reduced-motion`
- [x] Pointer Events para touch + rato

### 🚧 Em desenvolvimento
- [ ] Modo **Contra-Relógio** com countdown
- [ ] **Leaderboard global** por nível
- [ ] **Modo Noturno** automático (`prefers-color-scheme`)
- [ ] Persistência de **estado de jogo** (retomar sessão)

### 💡 Ideias futuras
- [ ] Modo **Multiplayer** (Firebase Realtime)
- [ ] Editor de níveis customizados
- [ ] Exportação de solução como imagem (share social)
- [ ] Suporte a **gamepad**
- [ ] PWA + offline-first
- [ ] i18n (PT / EN / ES)

---

## 🤝 Contribuir

Contribuições são bem-vindas! Para alterações significativas, abre primeiro um **issue** para discutirmos.

### Fluxo recomendado

```bash
# 1. Fork do repositório
# 2. Cria a tua branch
git checkout -b feature/nome-da-feature

# 3. Commit com mensagens claras
git commit -m "feat: adiciona modo contra-relógio"

# 4. Push e abre PR
git push origin feature/nome-da-feature
```

### Convenção de commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` alteração em documentação
- `style:` formatação (sem alteração de lógica)
- `refactor:` refatoração
- `perf:` melhoria de performance
- `test:` testes

### Estilo de código

- **ES6+ Modules** (sem bundlers)
- **Sem dependências externas** (exceto Firebase via CDN)
- **Nomes em português** para domínio, inglês para termos técnicos
- **Funções pequenas e nomeadas**

---

## 📄 Licença

Distribuído sob a licença **MIT**. Vê [`LICENSE`](./LICENSE) para mais detalhes.

---

## 👤 Créditos

**Desenvolvido por [@profpcra-cpu](https://github.com/profpcra-cpu)**

- 🔗 Repositório: [github.com/profpcra-cpu/ligantes](https://github.com/profpcra-cpu/ligantes)
- 🌐 Demo: [ligantes.vercel.app](https://ligantes.vercel.app/#)

### Agradecimentos
- [Firebase](https://firebase.google.com/) pela infraestrutura
- [Vercel](https://vercel.com/) pelo hosting gratuito
- Comunidade open-source pela inspiração

---

<p align="center">
  <strong>🧩 Traça o teu caminho. Liga os pontos. Domina o fluxo.</strong>
</p>

<p align="center">
  <a href="https://ligantes.vercel.app/#">▶️ Jogar agora</a> ·
  <a href="https://github.com/profpcra-cpu/ligantes/issues">🐛 Reportar bug</a> ·
  <a href="https://github.com/profpcra-cpu/ligantes/issues">💡 Sugerir feature</a>
</p>
