# 🧩 Brain Curves

**Brain Curves** (disponível em [ligantes.vercel.app](https://ligantes.vercel.app/#)) é um jogo web interativo de lógica espacial e otimização de percursos. Desenvolvido em JavaScript moderno (ES6+ módulos), o projeto é integrado ao **Firebase Realtime Database** e autenticação segura, sendo projetado para exercitar o planeamento espacial, o contorno de obstáculos e a fluidez temporal.

---

## 🚀 Funcionalidades Principais

* **Mecânica de Fluxo e Conexão**: Conecte pontos correspondentes da mesma cor numa grelha dinâmica sem cruzar as trilhas alheias.
* **Margem de Contorno Inteligente**: Sistema de geração de caminhos garantidos que otimiza o posicionamento inicial dos nós na grelha[cite: 1].
* **Índice de Agilidade Topológica (IAT)**: Métrica interna focada na eficiência espacial, tempo de resolução, densidade da grelha e fluidez de traçado, substituindo métricas convencionais por uma avaliação alinhada à natureza do jogo[cite: 1].
* **Patamares de Progressão Cartográfica**:
  * *Explorador de Trilha*
  * *Cartógrafo Urbano*
  * *Navegador Sináptico*
  * *Arquiteto de Fluxos*
* **Autenticação Flexível**: Suporte a login via Google, E-mail/Palavra-passe e Modo Anónimo através do **Firebase Auth**[cite: 1].
* **Persistência de Dados**: Sincronização de pontos e recordes na nuvem com o Firebase Realtime Database (e fallback seguro para `localStorage`)[cite: 1].
* **Feedback Multissensorial**: Efeitos sonoros customizados e suporte a vibração háptica em dispositivos compatíveis[cite: 1].

---

## 📊 Níveis de Dificuldade

O jogo adapta-se a diferentes níveis de desafio através de uma matriz de complexidade progressiva[cite: 1]:

| Nível | Tamanho da Grelha | Pares de Nós |
| :---: | :---: | :---: |
| **1** | 6 x 6 | 3 Pares[cite: 1] |
| **2** | 8 x 8 | 5 Pares[cite: 1] |
| **3** | 10 x 10 | 7 Pares[cite: 1] |
| **4** | 11 x 11 | 9 Pares[cite: 1] |
| **5** | 12 x 12 | 12 Pares[cite: 1] |

---

## 🛠️ Tecnologias Utilizadas

* **HTML5 / CSS3 / JavaScript (ES6+ Modules)**: Lógica do jogo, renderização otimizada de elementos no DOM e gestão de eventos de ponteiro (*Pointer Events* para toque e rato)[cite: 1].
* **Firebase (v10.8.0)**[cite: 1]: 
  * `Firebase Auth` para gestão de utilizadores e sessões[cite: 1].
  * `Firebase Realtime Database` para armazenamento e recuperação de pontuações[cite: 1].
* **Web APIs**: *Vibration API* e manipulação de áudio dinâmico[cite: 1].

---

## 📂 Estrutura do Código

O código-fonte principal está organizado nas seguintes secções lógicas[cite: 1]:
1. **Constantes e Paleta**: Definição das cores, símbolos visuais e configuração dos níveis[cite: 1].
2. **Autenticação e Sessão**: Gestão de utilizadores anónimos, Google Auth e sincronização com o Firebase[cite: 1].
3. **Geração de Caminhos**: Algoritmo de pathfinding com margens de contorno e *fallback* em grelha[cite: 1].
4. **Mecânica de Jogo**: Controlo do tabuleiro, desenho de trilhas, validação de passos, recuo (*undo*) e dicas inteligentes[cite: 1].
5. **Métrica IAT**: Cálculo dinâmico do Índice de Agilidade Topológica e títulos de progressão[cite: 1].
6. **Gestão de Eventos**: Captura robusta de ponteiros (`pointerdown`, `pointermove`, `pointerup`) para computadores e dispositivos móveis[cite: 1].

---

## 📝 Como Executar o Projeto Localmente

1. Clone o repositório para o seu ambiente local[cite: 1]:
   ```bash
   git clone [https://github.com/profpcra-cpu/ligantes.git](https://github.com/profpcra-cpu/ligantes.git)
