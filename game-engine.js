import { db, auth } from "./firebase-config.js";
import { ref, get, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { 
    signInAnonymously, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { tocarSom } from "./audio.js";
import { resolverNivelAutomaticamente } from "./solver.js";

// ────────────────────────────────────────────────────────────────
// CONSTANTES E PALETA
// ────────────────────────────────────────────────────────────────
export const PALETA = [
    { cor: '#22c55e', simbolo: '●' },
    { cor: '#3b82f6', simbolo: '▲' },
    { cor: '#ef4444', simbolo: '■' },
    { cor: '#f59e0b', simbolo: '★' },
    { cor: '#a855f7', simbolo: '◆' },
    { cor: '#06b6d4', simbolo: '✚' },
    { cor: '#ec4899', simbolo: '♥' },
    { cor: '#84cc16', simbolo: '⬟' },
    { cor: '#14b8a6', simbolo: '✿' },
    { cor: '#f97316', simbolo: '✦' },
    { cor: '#8b5cf6', simbolo: '☯' },
    { cor: '#0ea5e9', simbolo: '❄' }
];

const CONFIG_NIVEIS = {
    1: { tamanho: 6, pares: 3 },
    2: { tamanho: 8, pares: 5 },
    3: { tamanho: 10, pares: 7 },
    4: { tamanho: 11, pares: 9 },
    5: { tamanho: 12, pares: 12 }
};

export const estado = {
    nivel: 5,
    tamanho: 12,
    grid: [],
    pares: [],
    trilhas: {},
    historico: [],
    desenhando: null,
    pontos: 0,
    segundos: 0,
    timer: null,
    concluido: false,
    utilizador: null
};

const $ = (id) => document.getElementById(id);

// ────────────────────────────────────────────────────────────────
// AUTENTICAÇÃO E GESTÃO DE UTILIZADOR
// ────────────────────────────────────────────────────────────────
function verificarSessaoInicial() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if ($('auth-modal'))$('auth-modal').classList.remove('active');
            configurarSessao(user);
        } else {
            if ($('auth-modal'))$('auth-modal').classList.add('active');
        }
    });
}

async function configurarSessao(user) {
    const isAnon = user.isAnonymous;
    const emailStr = user.email || (isAnon ? "Anónimo" : "utilizador@google.com");
    
    estado.utilizador = {
        uid: user.uid,
        email: emailStr,
        nome: user.displayName || emailStr.split('@')[0],
        isAnonimo: isAnon
    };

    if ($('user-display')) {$('user-display').textContent = isAnon ? "👤 Anónimo" : emailStr.split('@')[0];
    }
    await carregarPontosDoFirebase();
}

async function carregarPontosDoFirebase() {
    if (!estado.utilizador || estado.utilizador.isAnonimo) {
        try {
            const p = parseInt(localStorage.getItem('brain_hub_pontos') || '0', 10);
            if (!isNaN(p)) {
                estado.pontos = p;
                if ($('display-pontos'))$('display-pontos').textContent = `Pontos: ${estado.pontos}`;
            }
        } catch (_) {}
        return;
    }

    try {
        const userRef = ref(db, 'jogadores/' + estado.utilizador.uid);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (typeof data.pontos === 'number') {
                estado.pontos = data.pontos;
                if ($('display-pontos'))$('display-pontos').textContent = `Pontos: ${estado.pontos}`;
                salvarLocal();
            }
        }
    } catch (e) {
        console.warn("Erro ao ler dados da nuvem.");
    }
}

// ────────────────────────────────────────────────────────────────
// GERAÇÃO GARANTIDA COM MARGEM DE CONTORNO
// ────────────────────────────────────────────────────────────────
function obterVizinhosEmbaralhados(r, c, tamanho) {
    const dirs = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
    for (let i = dirs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    return dirs.map(d => ({ r: r + d.r, c: c + d.c }))
               .filter(p => p.r >= 0 && p.r < tamanho && p.c >= 0 && p.c < tamanho);
}

function encontrarCaminhoAleatorio(inicio, fim, gridOcupado, tamanho, maxPassos) {
    const fila = [[inicio]];
    const visitados = new Set();
    visitados.add(`${inicio.r},${inicio.c}`);

    while (fila.length > 0) {
        const caminho = fila.shift();
        const atual = caminho[caminho.length - 1];

        if (atual.r === fim.r && atual.c === fim.c) {
            return caminho;
        }

        if (caminho.length > maxPassos) continue;

        const vizinhos = obterVizinhosEmbaralhados(atual.r, atual.c, tamanho);
        for (const viz of vizinhos) {
            const chave = `${viz.r},${viz.c}`;
            const ehFim = (viz.r === fim.r && viz.c === fim.c);
            if (!visitados.has(chave) && (!gridOcupado[viz.r][viz.c] || ehFim)) {
                visitados.add(chave);
                fila.push([...caminho, viz]);
            }
        }
    }
    return null;
}


export function gerarPares(tamanho, qtdPares) {
    for (let tentativa = 0; tentativa < 150; tentativa++) {
        const gridOcupado = Array.from({ length: tamanho }, () => Array(tamanho).fill(false));
        const paresCandidatos = [];
        let geracaoComSucesso = true;

        const margemMin = tamanho > 6 ? 1 : 0;
        const margemMax = tamanho > 6 ? tamanho - 2 : tamanho - 1;

        // Declaração explícita da matriz de células disponíveis
        const celulasDisponiveis = [];
        for (let r = margemMin; r <= margemMax; r++) {
            for (let c = margemMin; c <= margemMax; c++) {
                celulasDisponiveis.push({ r, c });
            }
        }

        for (let i = celulasDisponiveis.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [celulasDisponiveis[i], celulasDisponiveis[j]] = [celulasDisponive[j], celulasDisponive[i]];
        }

        for (let i = 0; i < qtdPares; i++) {
            if (celulasDisponiveis.length < 2) {
                geracaoComSucesso = false;
                break;
            }

            let a = null, b = null, caminho = null;
            let tentativasPar = 0;

            while (tentativasPar < 20 && !caminho) {
                if (celulasDisponiveis.length < 2) break;
                a = celulasDisponiveis.pop();
                b = celulasDisponiveis.pop();

                if (gridOcupado[a.r][a.c] || gridOcupado[b.r][b.c]) continue;

                const dist = Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
                if (dist < 2) {
                    celulasDisponiveis.unshift(b);
                    tentativasPar++;
                    continue;
                }

                caminho = encontrarCaminhoAleatorio(a, b, gridOcupado, tamanho, tamanho * 2);
                if (!caminho) {
                    celulasDisponiveis.unshift(b);
                }
                tentativasPar++;
            }

            if (!caminho) {
                geracaoComSucesso = false;
                break;
            }

            caminho.forEach(p => {
                gridOcupado[p.r][p.c] = true;
            });

            const pInfo = PALETA[i % PALETA.length];
            paresCandidatos.push({ id: i, cor: pInfo.cor, simbolo: pInfo.simbolo, a, b });
        }

        if (geracaoComSucesso && paresCandidatos.length === qtdPares) {
            return paresCandidatos;
        }
    }

    const paresFallback = [];
    for (let i = 0; i < qtdPares; i++) {
        const p = PALETA[i % PALETA.length];
        paresFallback.push({ id: i, cor: p.cor, simbolo: p.simbolo, a: { r: i % tamanho, c: 1 }, b: { r: i % tamanho, c: tamanho - 2 } });
    }
    return paresFallback;
}
// ────────────────────────────────────────────────────────────────
// RENDER E MECÂNICA DE JOGO
// ────────────────────────────────────────────────────────────────
function montarBoard() {
    const board = $('board');
    if (!board) return;
    const n = estado.tamanho;
    board.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${n}, 1fr)`;
    board.innerHTML = '';

    const fragment = document.createDocumentFragment();
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.id = `cell-${r}-${c}`;
            fragment.appendChild(cell);
        }
    }
    board.appendChild(fragment);
}

export function atualizarVisualDom() {
    const n = estado.tamanho;
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const cell = $('cell-' + r + '-' + c);
            if (!cell) continue;

            cell.className = 'cell grid-visible';
            cell.style.removeProperty('--trail-color');

            const dado = estado.grid[r][c];
            if (dado.tipo === 'endpoint') {
                const par = estado.pares[dado.parId];
                const conectado = estado.trilhas[dado.parId] ? ' connected' : '';
                let html = `<div class="endpoint${conectado}" style="background:${dado.cor}; color:${dado.cor}">`;
                html += `<span class="symbol">${par?.simbolo || ''}</span>`;
                html += `</div>`;
                if (cell.innerHTML !== html) cell.innerHTML = html;
            } else if (dado.tipo === 'trilha') {
                cell.classList.add('trail');
                cell.style.setProperty('--trail-color', dado.cor);
                if (cell.innerHTML) cell.innerHTML = '';
            } else {
                if (cell.innerHTML) cell.innerHTML = '';
            }
        }
    }
}

function iniciarDesenho(r, c) {
    if (estado.concluido) return false;
    const dado = estado.grid[r][c];
    if (dado.tipo !== 'endpoint') return false;

    if (estado.trilhas[dado.parId]) {
        limparTrilhaNoGrid(estado.trilhas[dado.parId]);
        delete estado.trilhas[dado.parId];
    }

    estado.historico.push(snapshotTrilhas());
    estado.desenhando = { parId: dado.parId, cor: dado.cor, pontos: [{ r, c }] };
    vibrar(8);
    atualizarVisualDom();
    atualizarBotaoUndo();
    atualizarProgresso();
    return true;
}

function aplicarPasso(r, c) {
    const d = estado.desenhando;
    if (!d || estado.concluido) return;

    const trail = d.pontos;
    const ultima = trail[trail.length - 1];
    if (ultima.r === r && ultima.c === c) return;

    if (trail.length >= 2) {
        const penultima = trail[trail.length - 2];
        if (penultima.r === r && penultima.c === c) {
            const removido = trail.pop();
            if (estado.grid[removido.r][removido.c].tipo === 'trilha') {
                estado.grid[removido.r][removido.c] = { tipo: 'vazio', cor: null, parId: null };
            }
            atualizarVisualDom();
            return;
        }
    }

    const dist = Math.abs(r - ultima.r) + Math.abs(c - ultima.c);
    if (dist !== 1) return;

    const alvo = estado.grid[r][c];
    if (alvo.tipo === 'endpoint' && alvo.parId === d.parId) {
        const inicio = trail[0];
        if (inicio.r === r && inicio.c === c && trail.length === 1) return;

        trail.push({ r, c });
        estado.trilhas[d.parId] = { cor: d.cor, pontos: [...trail] };
        estado.desenhando = null;

        vibrar(15);
        tocarSom('par');
        atualizarVisualDom();
        atualizarProgresso();
        verificarVitoria();
        return;
    }

    if (alvo.tipo === 'endpoint') return;

    if (alvo.tipo === 'trilha' && alvo.parId !== d.parId) {
        const alheia = estado.trilhas[alvo.parId];
        if (alheia) {
            limparTrilhaNoGrid(alheia);
            delete estado.trilhas[alvo.parId];
        }
    }

    trail.push({ r, c });
    estado.grid[r][c] = { tipo: 'trilha', cor: d.cor, parId: d.parId };
    atualizarVisualDom();
    atualizarProgresso();
}

function lidarComMovimento(rAlvo, cAlvo) {
    if (!estado.desenhando || estado.concluido) return;
    let guard = 0;
    while (guard++ < 64) {
        const trail = estado.desenhando?.pontos;
        if (!trail) return;
        const ultima = trail[trail.length - 1];
        if (ultima.r === rAlvo && ultima.c === cAlvo) return;

        if (trail.length >= 2) {
            const penultima = trail[trail.length - 2];
            if (penultima.r === rAlvo && penultima.c === cAlvo) {
                aplicarPasso(rAlvo, cAlvo);
                return;
            }
        }

        const dr = rAlvo - ultima.r;
        const dc = cAlvo - ultima.c;
        const passo = (Math.abs(dr) >= Math.abs(dc))
            ? { r: ultima.r + Math.sign(dr), c: ultima.c }
            : { r: ultima.r, c: ultima.c + Math.sign(dc) };

        const antes = trail.length;
        aplicarPasso(passo.r, passo.c);
        if (!estado.desenhando) return;
        if (estado.desenhando.pontos.length === antes) return;
    }
}

function finalizarDesenho() {
    if (!estado.desenhando) return;
    estado.desenhando.pontos.forEach((p, idx) => {
        if (idx === 0) return;
        if (estado.grid[p.r][p.c].tipo === 'trilha') {
            estado.grid[p.r][p.c] = { tipo: 'vazio', cor: null, parId: null };
        }
    });
    estado.desenhando = null;
    atualizarVisualDom();
}

function limparTrilhaNoGrid(trilhaObj) {
    if (!trilhaObj || !trilhaObj.pontos) return;
    trilhaObj.pontos.forEach(p => {
        const g = estado.grid[p.r]?.[p.c];
        if (g && g.tipo === 'trilha') {
            estado.grid[p.r][p.c] = { tipo: 'vazio', cor: null, parId: null };
        }
    });
}

function snapshotTrilhas() {
    const snap = {};
    for (const id in estado.trilhas) {
        snap[id] = {
            cor: estado.trilhas[id].cor,
            pontos: estado.trilhas[id].pontos.map(p => ({ r: p.r, c: p.c }))
        };
    }
    return snap;
}

function desfazer() {
    if (estado.historico.length === 0) return;
    for (const id in estado.trilhas) limparTrilhaNoGrid(estado.trilhas[id]);
    estado.trilhas = {};

    const snap = estado.historico.pop();
    for (const id in snap) {
        estado.trilhas[id] = snap[id];
        const parIdInt = parseInt(id, 10);
        const par = estado.pares.find(p => p.id === parIdInt);
        snap[id].pontos.forEach((p, idx) => {
            if (idx === 0) return;
            const ehEndpoint = par && ((par.a.r === p.r && par.a.c === p.c) || (par.b.r === p.r && par.b.c === p.c));
            if (!ehEndpoint) {
                estado.grid[p.r][p.c] = { tipo: 'trilha', cor: snap[id].cor, parId: parIdInt };
            }
        });
    }

    estado.concluido = false;
    estado.desenhando = null;
    vibrar(10);
    tocarSom('erro');
    atualizarVisualDom();
    atualizarBotaoUndo();
    atualizarProgresso();
}

function darDica() {
    if (estado.concluido) return;
    const paresPendentes = estado.pares.filter(p => !estado.trilhas[p.id]);
    if (paresPendentes.length === 0) {
        mostrarToast('Todos os pares já estão ligados!');
        return;
    }

    const parAlvo = paresPendentes[0];
    if (estado.trilhas[parAlvo.id]) {
        limparTrilhaNoGrid(estado.trilhas[parAlvo.id]);
        delete estado.trilhas[parAlvo.id];
    }

    estado.historico.push(snapshotTrilhas());
    const pontosDica = [parAlvo.a];
    if (parAlvo.a.r !== parAlvo.b.r) {
        pontosDica.push({ r: parAlvo.b.r, c: parAlvo.a.c });
    }
    pontosDica.push(parAlvo.b);

    estado.trilhas[parAlvo.id] = { cor: parAlvo.cor, pontos: pontosDica };
    pontosDica.forEach((p, idx) => {
        if (idx === 0 || idx === pontosDica.length - 1) return;
        estado.grid[p.r][p.c] = { tipo: 'trilha', cor: parAlvo.cor, parId: parAlvo.id };
    });

    vibrar(20);
    tocarSom('par');
    atualizarVisualDom();
    atualizarBotaoUndo();
    atualizarProgresso();
    mostrarToast(`💡 Dica aplicada para o par ${parAlvo.simbolo}`);
    verificarVitoria();
}

// ────────────────────────────────────────────────────────────────
// UI, MÉTRICA IAT E UTILITÁRIOS
// ────────────────────────────────────────────────────────────────
function atualizarProgresso() {
    const total = estado.pares.length;
    const feitos = Object.keys(estado.trilhas).length;
    if ($('progress-display'))$('progress-display').textContent = `${feitos} / ${total} pares`;
}

function atualizarBotaoUndo() {
    if ($('btn-undo')) {$('btn-undo').disabled = estado.historico.length === 0 && Object.keys(estado.trilhas).length === 0;
    }
}

export function atualizarIAT(conectados) {
    const totalPares = estado.pares.length;
    const fatorEspacial = estado.tamanho * 15;
    const pontosConexao = conectados * 25;
    const tempoIdealEsperado = totalPares * 4;
    const bonusTempo = Math.max(0, (tempoIdealEsperado - estado.segundos) * 5);
    
    const iat = fatorEspacial + pontosConexao + bonusTempo;
    
    const el = $('iq-display');
    if (el) {
        let tituloPercurso = "Explorador de Trilha";
        if (iat > 500) tituloPercurso = "Arquiteto de Fluxos";
        else if (iat > 300) tituloPercurso = "Navegador Sináptico";
        else if (iat > 150) tituloPercurso = "Cartógrafo Urbano";

        el.textContent = `IAT: ${iat}`;
        if (conectados > 0) {
            el.classList.add('up');
            setTimeout(() => el.classList.remove('up'), 400);
        }
    }
    return iat;
}

function atualizarTimer() {
    const m = String(Math.floor(estado.segundos / 60)).padStart(2, '0');
    const s = String(estado.segundos % 60).padStart(2, '0');
    if ($('timer-display'))$('timer-display').textContent = `${m}:${s}`;
}

function iniciarTimer() {
    pararTimer();
    estado.segundos = 0;
    atualizarTimer();
    estado.timer = setInterval(() => {
        if (estado.concluido) return;
        estado.segundos++;
        atualizarTimer();
    }, 1000);
}

function pararTimer() {
    if (estado.timer) clearInterval(estado.timer);
    estado.timer = null;
}

let toastTimeout = null;
export function mostrarToast(msg) {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.remove('show'), 2400);
}

function vibrar(ms) {
    if (navigator.vibrate) {
        try { navigator.vibrate(ms); } catch (_) {}
    }
}

export function verificarVitoria() {
    const conectados = Object.keys(estado.trilhas).length;
    atualizarIAT(conectados);

    if (conectados !== estado.pares.length) return;

    estado.concluido = true;
    pararTimer();

    const bonusTempo = Math.max(0, 60 - estado.segundos);
    const ganho = estado.nivel * 50 + bonusTempo * 2;
    estado.pontos += ganho;

    if ($('display-pontos'))$('display-pontos').textContent = `Pontos: ${estado.pontos}`;

    vibrar([30, 50, 30]);
    tocarSom('vitoria');
    mostrarToast(`🎉 Nível ${estado.nivel} completo! +${ganho} pts`);

    atualizarBotaoUndo();
    salvarLocal();
    sincronizarPontuacaoFirebase();
}

function salvarLocal() {
    try { localStorage.setItem('brain_hub_pontos', String(estado.pontos)); } catch (_) {}
}

async function sincronizarPontuacaoFirebase() {
    if (!estado.utilizador || estado.utilizador.isAnonimo) return;
    try {
        const userRef = ref(db, 'jogadores/' + estado.utilizador.uid);
        await set(userRef, {
            email: estado.utilizador.email,
            nome: estado.utilizador.nome,
            pontos: estado.pontos,
            nivelAtual: estado.nivel,
            ultimaAtividade: new Date().toISOString()
        });
    } catch (e) {}
}

// ────────────────────────────────────────────────────────────────
// INPUTS DE TOQUE (POINTER EVENTS)
// ────────────────────────────────────────────────────────────────
let activePointerId = null;
let ultimaCellTocada = null;

function getCellComTolerancia(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const cell = el.closest?.('.cell');
    if (cell) {
        return { r: parseInt(cell.dataset.r, 10), c: parseInt(cell.dataset.c, 10) };
    }
    const board = $('board');
    if (!board) return null;
    const rect = board.getBoundingClientRect();
    const n = estado.tamanho;
    const cellW = rect.width / n;
    const cellH = rect.height / n;
    const c = Math.floor((clientX - rect.left) / cellW);
    const r = Math.floor((clientY - rect.top) / cellH);
    if (r < 0 || r >= n || c < 0 || c >= n) return null;
    return { r, c };
}

function onPointerDown(e) {
    if (estado.concluido) return;
    if (activePointerId !== null) return;
    e.preventDefault();

    const board = $('board');
    if (board) {
        try { board.setPointerCapture(e.pointerId); } catch (_) {}
    }

    const cell = getCellComTolerancia(e.clientX, e.clientY);
    if (!cell) return;

    if (iniciarDesenho(cell.r, cell.c)) {
        activePointerId = e.pointerId;
        ultimaCellTocada = cell;
    }
}

function onPointerMove(e) {
    if (e.pointerId !== activePointerId) return;
    if (!estado.desenhando) return;
    e.preventDefault();

    const eventos = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of eventos) {
        const cell = getCellComTolerancia(ev.clientX, ev.clientY);
        if (!cell) continue;
        if (ultimaCellTocada && cell.r === ultimaCellTocada.r && cell.c === ultimaCellTocada.c) continue;
        ultimaCellTocada = cell;
        lidarComMovimento(cell.r, cell.c);
    }
}

function onPointerUp(e) {
    if (e.pointerId !== activePointerId) return;
    const board = $('board');
    if (board) {
        try { board.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    finalizarDesenho();
    activePointerId = null;
    ultimaCellTocada = null;
    atualizarBotaoUndo();
}

function onPointerCancel(e) {
    if (e.pointerId !== activePointerId) return;
    const board = $('board');
    if (board) {
        try { board.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    finalizarDesenho();
    activePointerId = null;
    ultimaCellTocada = null;
    atualizarBotaoUndo();
}

const board = $('board');
if (board) {
    board.addEventListener('pointerdown', onPointerDown, { passive: false });
    board.addEventListener('pointermove', onPointerMove, { passive: false });
    board.addEventListener('pointerup', onPointerUp);
    board.addEventListener('pointercancel', onPointerCancel);
    board.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    board.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
}

// ────────────────────────────────────────────────────────────────
// INICIALIZAÇÃO DE NÍVEL
// ────────────────────────────────────────────────────────────────
export function iniciarJogo(nivel) {
    const n = Math.max(1, Math.min(5, parseInt(nivel, 10) || 5));
    estado.nivel = n;
    
    const config = CONFIG_NIVEIS[n] || CONFIG_NIVEIS[5];
    estado.tamanho = config.tamanho;
    const qtdPares = config.pares;

    estado.pares = gerarPares(estado.tamanho, qtdPares);
    estado.trilhas = {};
    estado.historico = [];
    estado.desenhando = null;
    estado.concluido = false;
    activePointerId = null;
    ultimaCellTocada = null;

    estado.grid = Array.from({ length: estado.tamanho }, () =>
        Array.from({ length: estado.tamanho }, () => ({ tipo: 'vazio', cor: null, parId: null }))
    );

    estado.pares.forEach(p => {
        estado.grid[p.a.r][p.a.c] = { tipo: 'endpoint', cor: p.cor, parId: p.id };
        estado.grid[p.b.r][p.b.c] = { tipo: 'endpoint', cor: p.cor, parId: p.id };
    });

    montarBoard();
    atualizarVisualDom();
    atualizarIAT(0);
    atualizarProgresso();
    atualizarBotaoUndo();
    iniciarTimer();
}

// ────────────────────────────────────────────────────────────────
// LIGAÇÃO DIRETA DOS BOTÕES E CONTROLOS DA UI
// ────────────────────────────────────────────────────────────────
function inicializarBotoesUI() {
    const btnGoogle = $('btn-login-google');
    if (btnGoogle) {
        btnGoogle.onclick = async () => {
            try {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
                mostrarToast('Autenticado com sucesso!');
            } catch (e) {
                console.error(e);
                mostrarToast('Erro ao autenticar com o Google.');
            }
        };
    }

    const btnAnon = $('btn-login-anon');
    if (btnAnon) {
        btnAnon.onclick = async () => {
            try {
                await signInAnonymously(auth);
                mostrarToast('Modo Anónimo ativado.');
            } catch (e) {
                mostrarToast('Erro ao iniciar como anónimo.');
            }
        };
    }

    let modoRegisto = false;
    const btnToggleMode = $('btn-toggle-mode');
    const emailFormTitle = $('email-form-title');
    const btnEmailSubmit = $('btn-email-submit');

    if (btnToggleMode) {
        btnToggleMode.onclick = () => {
            modoRegisto = !modoRegisto;
            if (modoRegisto) {
                emailFormTitle.textContent = 'Crie a sua nova conta:';
                btnEmailSubmit.textContent = '📝 Registar e Entrar';
                btnToggleMode.textContent = 'Já tem conta? Clique aqui para entrar';
            } else {
                emailFormTitle.textContent = 'Ou entre com o seu E-mail:';
                btnEmailSubmit.textContent = '🔑 Entrar com E-mail';
                btnToggleMode.textContent = 'Não tem conta? Clique aqui para se registar';
            }
        };
    }

    if (btnEmailSubmit) {
        btnEmailSubmit.onclick = async () => {
            const email = $('auth-email').value.trim();
            const password = $('auth-password').value.trim();

            if (!email || !password) {
                mostrarToast('Preencha o e-mail e a palavra-passe.');
                return;
            }

            try {
                if (modoRegisto) {
                    await createUserWithEmailAndPassword(auth, email, password);
                    mostrarToast('Conta criada com sucesso!');
                } else {
                    await signInWithEmailAndPassword(auth, email, password);
                    mostrarToast('Sessão iniciada com sucesso!');
                }
            } catch (e) {
                console.error(e);
                mostrarToast('Erro na autenticação. Verifique os dados.');
            }
        };
    }

    const btnSwitch = $('btn-switch-user');
    if (btnSwitch) {
        btnSwitch.onclick = async () => {
            if (confirm('Deseja terminar a sessão atual?')) {
                await signOut(auth);
                window.location.reload();
            }
        };
    }

    const btnResetScore = $('btn-reset-score');
    if (btnResetScore) {
        btnResetScore.onclick = async () => {
            if (confirm('Deseja zerar a pontuação e começar do zero?')) {
                estado.pontos = 0;
                const disp = $('display-pontos');
                if (disp) disp.textContent = `Pontos: 0`;
                salvarLocal();
                if (estado.utilizador && !estado.utilizador.isAnonimo) {
                    await sincronizarPontuacaoFirebase();
                }
                mostrarToast('Pontuação reiniciada!');
            }
        };
    }

    const selectNivel = $('select-nivel');
    if (selectNivel) {
        selectNivel.onchange = (e) => {
            const temProgresso = Object.keys(estado.trilhas).length > 0 && !estado.concluido;
            if (temProgresso && !confirm('Trocar de nível vai apagar o progresso atual. Continuar?')) {
                e.target.value = estado.nivel;
                return;
            }
            iniciarJogo(parseInt(e.target.value, 10));
        };
    }

    const btnReset = $('btn-reset');
    if (btnReset) {
        btnReset.onclick = () => {
            const temProgresso = Object.keys(estado.trilhas).length > 0 && !estado.concluido;
            if (temProgresso && !confirm('Tem a certeza de que deseja reiniciar o nível atual? O progresso será perdido.')) {
                return;
            }
            iniciarJogo(estado.nivel);
        };
    }

    const btnHint = $('btn-hint');
    if (btnHint) btnHint.onclick = darDica;

    const btnUndo = $('btn-undo');
    if (btnUndo) btnUndo.onclick = desfazer;

    // Botão de Auto-Resolução
    const btnAutoSolve = $('btn-auto-solve');
    if (btnAutoSolve) {
        btnAutoSolve.onclick = () => {
            if (confirm('Deseja ver a solução automática deste nível?')) {
                resolverNivelAutomaticamente();
            }
        };
    }
}

inicializarBotoesUI();
verificarSessaoInicial();
iniciarJogo(5);
