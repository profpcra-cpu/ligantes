// sobre.js
// Conteúdo do README embutido como string.
// Quando atualizares o README.md, copia o novo conteúdo para dentro
// das backticks abaixo (mantém o Markdown tal e qual).

export const CONTEUDO_SOBRE = `
# 🧩 Brain Curves

**Brain Curves** (disponível em [ligantes.vercel.app](https://ligantes.vercel.app/#)) é um jogo web interativo de lógica espacial e otimização de percursos. Desenvolvido em JavaScript moderno (ES6+ módulos), o projeto é integrado ao **Firebase Realtime Database** e autenticação segura, sendo projetado para exercitar o planeamento espacial, o contorno de obstáculos e a fluidez temporal.

---

## 🚀 Funcionalidades Principais

- **Mecânica de Fluxo e Conexão**: Conecte pontos correspondentes da mesma cor numa grelha dinâmica sem cruzar as trilhas alheias.
- **Margem de Contorno Inteligente**: Sistema de geração de caminhos garantidos que otimiza o posicionamento inicial dos nós na grelha.
- **Índice de Agilidade Topológica (IAT)**: Métrica interna focada na eficiência espacial, tempo de resolução, densidade da grelha e fluidez de traçado.
- **Patamares de Progressão Cartográfica**:
  - *Explorador de Trilha*
  - *Cartógrafo Urbano*
  - *Navegador Sináptico*
  - *Arquiteto de Fluxos*
- **Autenticação Flexível**: Suporte a login via Google, E-mail/Palavra-passe e Modo Anónimo através do **Firebase Auth**.
- **Persistência de Dados**: Sincronização de pontos e recordes na nuvem com o Firebase Realtime Database (e fallback seguro para \`localStorage\`).
- **Feedback Multissensorial**: Efeitos sonoros customizados e suporte a vibração háptica em dispositivos compatíveis.

---

## 📊 Níveis de Dificuldade

| Nível | Tamanho da Grelha | Pares de Nós |
| :---: | :---: | :---: |
| **1** | 6 x 6 | 3 Pares |
| **2** | 8 x 8 | 5 Pares |
| **3** | 10 x 10 | 7 Pares |
| **4** | 11 x 11 | 9 Pares |
| **5** | 12 x 12 | 12 Pares |

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 / CSS3 / JavaScript (ES6+ Modules)**: Lógica do jogo, renderização otimizada de elementos no DOM e gestão de eventos de ponteiro (*Pointer Events* para toque e rato).
- **Firebase (v10.8.0)**:
  - \`Firebase Auth\` para gestão de utilizadores e sessões.
  - \`Firebase Realtime Database\` para armazenamento e recuperação de pontuações.
- **Web APIs**: *Vibration API* e manipulação de áudio dinâmico.

---

## 📂 Estrutura do Código

1. **Constantes e Paleta**: Definição das cores, símbolos visuais e configuração dos níveis.
2. **Autenticação e Sessão**: Gestão de utilizadores anónimos, Google Auth e sincronização com o Firebase.
3. **Geração de Caminhos**: Algoritmo de pathfinding com margens de contorno e *fallback* em grelha.
4. **Mecânica de Jogo**: Controlo do tabuleiro, desenho de trilhas, validação de passos, recuo (*undo*) e dicas inteligentes.
5. **Métrica IAT**: Cálculo dinâmico do Índice de Agilidade Topológica e títulos de progressão.
6. **Gestão de Eventos**: Captura robusta de ponteiros (\`pointerdown\`, \`pointermove\`, \`pointerup\`) para computadores e dispositivos móveis.

---

## 📝 Como Executar o Projeto Localmente

1. Clone o repositório:
   \`\`\`bash
   git clone https://github.com/profpcra-cpu/ligantes.git
   \`\`\`
2. Sirva localmente:
   \`\`\`bash
   npx serve .
   \`\`\`
3. Abra [http://localhost:3000](http://localhost:3000) no browser.
`;

export default CONTEUDO_SOBRE;
