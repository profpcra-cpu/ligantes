import { db } from "./firebase-config.js";
import { ref, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { tocarSom } from "./audio.js";

// ────────────────────────────────────────────────────────────────
// CONSTANTES
// ────────────────────────────────────────────────────────────────
export const PALETA = [
    '#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#a855f7',
    '#06b6d4', '#ec4899', '#84cc16', '#f43f5e', '#14b8a6',
    '#8b5cf6', '#d97706', '#0284c7', '#16a34a', '#dc2626'
];

const TAMANHO_POR_NIVEL = {
    1: 8,
    2: 10,
    3: 12,
    4: 14,
    5: 16,
    6: 16,
    7: 18,
    8: 18,
    9: 20,
    10: 20
};

// ────────────────────────────────────────────────────────────────
// ESTADO
// ────────────────────────────────────────────────────────────────
function lerJogadorSessao() {
    try {
        const raw = localStorage.getItem('brain_hub_jogador');
        if (!raw) return { chave: 'visitante_default', nome: 'Jogador', avatar: '🎮' };
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') throw new Error('inválido');
        return { nome: 'Jogador', avatar: '🎮', ...parsed };
    } catch (_) {
        return { chave: 'visitante_default', nome: 'Jogador', avatar: '🎮' };
    }
}

export const estado = {
    nivel: 1,
    tamanho: 8,
    grid: [],
    pares: [],
    trilhas: {},
    historico: [],       // pilha de snapshots para desfazer
    desenhando: null,
    pontos: 0,
    segundos: 0,
    timer: null,
    concluido: false,
    jogadorSessao: lerJogadorSessao()
};

// ────────────────────────────────────────────────────────────────
// INICIALIZAÇÃO
// ────────────────────────────────────────────────────────────────
export function iniciarPuzzle(nivel, boardElement, callbacks) {
    if (!boardElement) throw new Error('boardElement obrigatório');
    validarCallbacks(callbacks);

    const nivelSeguro = Math.max(1, Math.min(10, parseInt(nivel, 10) || 1));
    const tamanho = TAMANHO_POR_NIVEL[nivelSeguro] || 16;

    estado.nivel = nivelSeguro;
    estado.tamanho = tamanho;
    estado.trilhas = {};
    estado.historico = [];
    estado.concluido = false;
    estado.desenhando = null;

    const n = estado.tamanho;
    boardElement.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    boardElement.style.gridTemplateRows = `repeat(${n}, 1fr)`;
    boardElement.innerHTML = '';

    estado.grid = Array.from({ length: n }, () =>
        Array.from({ length: n }, () => ({ cor: null, parId: null, tipo: 'vazio' }))
    );

    const quantidadePares = Math.min(nivelSeguro, PALETA.length, Math.floor((n * n) / 8));
    estado.pares = gerarParesAleatorios(n, quantidadePares);

    estado.pares.forEach(p => {
        estado.grid[p.a.r][p.a.c] = { cor: p.cor, parId: p.id, tipo: 'endpoint' };
        estado.grid[p.b.r][p.b.c] = { cor: p.cor, parId: p.id, tipo: 'endpoint' };
    });

    // cria células DOM
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
    boardElement.appendChild(fragment);

    callbacks.onAtualizarVisual();
    iniciarTimer(callbacks.onAtualizarTempo);
}

function validarCallbacks(cb) {
    if (!cb || typeof cb.onAtualizarVisual !== 'function') {
        throw new Error('callbacks.onAtualizarVisual é obrigatório');
    }
    // callbacks opcionais viram no-ops
    cb.onAtualizarTempo = cb.onAtualizarTempo || (() => {});
    cb.onVitoria = cb.onVitoria || (() => {});
}

// ────────────────────────────────────────────────────────────────
// GERAÇÃO DE PARES
// ────────────────────────────────────────────────────────────────
function gerarParesAleatorios(tamanho, qtdPares) {
    const pares = [];
    const ocupados = [];
    const distMin = 4;
    const margem = 2;
    const limite = tamanho - margem;

    for (let i = 0; i < qtdPares; i++) {
        let a = null, b = null, tentativas = 0;

        // ponto A
        while (!a && tentativas < 300) {
            tentativas++;
            const r = margem + Math.floor(Math.random() * (limite - margem));
            const c = margem + Math.floor(Math.random() * (limite - margem));
            if (!ocupados.some(p => Math.abs(p.r - r) + Math.abs(p.c - c) < distMin)) {
                a = { r, c };
                ocupados.push(a);
            }
        }

        // ponto B (não na mesma linha/coluna, longe o suficiente)
        tentativas = 0;
        while (!b && tentativas < 300) {
            tentativas++;
            const r = margem + Math.floor(Math.random() * (limite - margem));
            const c = margem + Math.floor(Math.random() * (limite - margem));
            const emLinhaReta = (a && (a.r === r || a.c === c));
            const muitoPerto = ocupados.some(p => Math.abs(p.r - r) + Math.abs(p.c - c) < distMin);
            if (!muitoPerto && !emLinhaReta) {
                b = { r, c };
                ocupados.push(b);
            }
        }

        // fallback determinístico
        if (!a || !b) {
            a = { r: margem + (i % (limite - margem)), c: margem };
            b = { r: margem + (i % (limite - margem)), c: limite - 1 };
            ocupados.push(a, b);
        }

        pares.push({ id: i, cor: PALETA[i % PALETA.length], a, b });
    }

    return pares;
}

// ────────────────────────────────────────────────────────────────
// VISUAL
// ────────────────────────────────────────────────────────────────
export function atualizarVisualDom() {
    const n = estado.tamanho;
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            if (!cell) continue;

            // reset rápido
            cell.className = 'cell';
            cell.style.removeProperty('--trail-color');

            const dado = estado.grid[r][c];

            if (dado.tipo === 'endpoint') {
                const conectado = estado.trilhas[dado.parId] ? ' connected' : '';
                // só recria se mudou o conteúdo (evita reflow)
                const html = `<div class="endpoint${conectado}" style="background:${dado.cor}"></div>`;
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

// ────────────────────────────────────────────────────────────────
// INTERAÇÃO
// ────────────────────────────────────────────────────────────────
export function iniciarDesenho(r, c, callbacks) {
    if (estado.concluido) return false;

    const dado = estado.grid[r][c];
    if (dado.tipo !== 'endpoint') return false;

    // Se já existe trilha desse par, apaga e limpa o grid
    if (estado.trilhas[dado.parId]) {
        const trilhaAntiga = estado.trilhas[dado.parId];
        limparTrilha(trilhaAntiga);
        delete estado.trilhas[dado.parId];
    }

    // Snapshot do estado atual (antes de começar)
    estado.historico.push(snapshotTrilhas());

    estado.desenhando = {
        parId: dado.parId,
        cor: dado.cor,
        pontos: [{ r, c }]
    };

    tocarSom?.('inicio');
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (_) {} }
    callbacks.onAtualizarVisual();
    return true;
}

export function lidarComMovimento(r, c, callbacks) {
    if (!estado.desenhando || estado.concluido) return;

    const trail = estado.desenhando.pontos;
    const ultima = trail[trail.length - 1];

    if (ultima.r === r && ultima.c === c) return;

    // backtrack: voltou para a penúltima → remove última
    if (trail.length >= 2) {
        const penultima = trail[trail.length - 2];
        if (penultima.r === r && penultima.c === c) {
            const removido = trail.pop();
            if (estado.grid[removido.r][removido.c].tipo === 'trilha') {
                estado.grid[removido.r][removido.c] = { cor: null, parId: null, tipo: 'vazio' };
            }
            callbacks.onAtualizarVisual();
            return;
        }
    }

    // precisa ser ortogonalmente adjacente
    const dr = r - ultima.r;
    const dc = c - ultima.c;
    if (Math.abs(dr) + Math.abs(dc) !== 1) return;

    aplicarMovimento(r, c, callbacks);
}

// Movimento contínuo — usado pelo puzzle.js quando o pointermove traz células puladas
export function lidarComMovimentoInterpolado(rAlvo, cAlvo, callbacks) {
    if (!estado.desenhando || estado.concluido) return;
    const trail = estado.desenhando.pontos;

    let guard = 0;
    while (guard++ < 64) {
        const ultima = trail[trail.length - 1];
        if (ultima.r === rAlvo && ultima.c === cAlvo) return;

        // já voltou pra penúltima?
        if (trail.length >= 2) {
            const penultima = trail[trail.length - 2];
            if (penultima.r === rAlvo && penultima.c === cAlvo) {
                const removido = trail.pop();
                if (estado.grid[removido.r][removido.c].tipo === 'trilha') {
                    estado.grid[removido.r][removido.c] = { cor: null, parId: null, tipo: 'vazio' };
                }
                callbacks.onAtualizarVisual();
                return;
            }
        }

        // avança ortogonalmente em direção ao alvo (prioriza eixo com maior diferença)
        const dr = rAlvo - ultima.r;
        const dc = cAlvo - ultima.c;
        let passo;
        if (Math.abs(dr) >= Math.abs(dc)) {
            passo = { r: ultima.r + Math.sign(dr), c: ultima.c };
        } else {
            passo = { r: ultima.r, c: ultima.c + Math.sign(dc) };
        }

        const antes = trail.length;
        aplicarMovimento(passo.r, passo.c, callbacks);
        if (trail.length === antes && !estado.trilhas[estado.desenhando?.parId]) {
            // não avançou — evita loop infinito
            return;
        }
        if (!estado.desenhando) return; // finalizou no caminho
    }
}

function aplicarMovimento(r, c, callbacks) {
    const trail = estado.desenhando.pontos;
    const alvo = estado.grid[r][c];

    // finalizou no extremo correto?
    if (alvo.tipo === 'endpoint' && alvo.parId === estado.desenhando.parId) {
        // não pode finalizar no mesmo ponto inicial
        const inicio = trail[0];
        if (inicio.r === r && inicio.c === c && trail.length === 1) return;

        trail.push({ r, c });
        estado.trilhas[estado.desenhando.parId] = {
            cor: estado.desenhando.cor,
            pontos: [...trail]
        };
        estado.desenhando = null;
        tocarSom?.('par');
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch (_) {} }
        callbacks.onAtualizarVisual();
        verificarVitoria(callbacks);
        return;
    }

    // não passa por endpoint de outro par
    if (alvo.tipo === 'endpoint') return;

    // invade trilha de outro par → apaga aquela trilha
    if (alvo.tipo === 'trilha' && alvo.parId !== estado.desenhando.parId) {
        const trilhaAlheia = estado.trilhas[alvo.parId];
        if (trilhaAlheia) {
            limparTrilha(trilhaAlheia);
            delete estado.trilhas[alvo.parId];
        }
    }

    // anexa
    trail.push({ r, c });
    estado.grid[r][c] = {
        cor: estado.desenhando.cor,
        parId: estado.desenhando.parId,
        tipo: 'trilha'
    };
    callbacks.onAtualizarVisual();
}

export function finalizarDesenho() {
    if (!estado.desenhando) return;
    // não conectou → apaga o progresso parcial da trilha no grid
    estado.desenhando.pontos.forEach((p, idx) => {
        if (idx === 0) return; // mantém o endpoint
        if (estado.grid[p.r][p.c].tipo === 'trilha') {
            estado.grid[p.r][p.c] = { cor: null, parId: null, tipo: 'vazio' };
        }
    });
    estado.desenhando = null;
}

// ────────────────────────────────────────────────────────────────
// LIMPEZA / HISTÓRICO
// ────────────────────────────────────────────────────────────────
export function limparTrilha(trilhaObj) {
    if (!trilhaObj || !Array.isArray(trilhaObj.pontos)) return;
    trilhaObj.pontos.forEach(p => {
        if (estado.grid[p.r] && estado.grid[p.r][p.c] && estado.grid[p.r][p.c].tipo === 'trilha') {
            estado.grid[p.r][p.c] = { cor: null, parId: null, tipo: 'vazio' };
        }
    });
}

function snapshotTrilhas() {
    // cópia rasa das trilhas + pontos
    const snap = {};
    for (const id in estado.trilhas) {
        snap[id] = {
            cor: estado.trilhas[id].cor,
            pontos: estado.trilhas[id].pontos.map(p => ({ r: p.r, c: p.c }))
        };
    }
    return snap;
}

export function desfazer(callbacks) {
    if (estado.historico.length === 0) return false;

    // limpa trilhas atuais
    for (const id in estado.trilhas) {
        limparTrilha(estado.trilhas[id]);
    }
    estado.trilhas = {};

    // restaura snapshot
    const snap = estado.historico.pop();
    for (const id in snap) {
        estado.trilhas[id] = snap[id];
        // reescreve no grid
        snap[id].pontos.forEach((p, idx) => {
            if (idx === 0) return;
            const par = estado.pares.find(pp => pp.id === parseInt(id));
            if (!par) return;
            const ehEndpoint = (par.a.r === p.r && par.a.c === p.c) || (par.b.r === p.r && par.b.c === p.c);
            if (!ehEndpoint) {
                estado.grid[p.r][p.c] = { cor: snap[id].cor, parId: parseInt(id), tipo: 'trilha' };
            }
        });
    }

    estado.concluido = false;
    callbacks.onAtualizarVisual();
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (_) {} }
    return true;
}

// ────────────────────────────────────────────────────────────────
// VITÓRIA
// ────────────────────────────────────────────────────────────────
function verificarVitoria(callbacks) {
    if (Object.keys(estado.trilhas).length !== estado.pares.length) return;

    estado.concluido = true;
    pararTimer();
    tocarSom?.('vitoria');
    if (navigator.vibrate) { try { navigator.vibrate([30, 50, 30]); } catch (_) {} }
    callbacks.onVitoria();

    const bonusTempo = Math.max(0, 60 - estado.segundos); // bônus decrescente
    const pontosGanhos = estado.nivel * 100 + bonusTempo * 2;
    salvarProgressoNoFirebase(pontosGanhos);
}

async function salvarProgressoNoFirebase(pontosGanhos) {
    try {
        const refUser = ref(db, 'jogadores/' + estado.jogadorSessao.chave);
        await update(refUser, {
            pontos: (estado.pontos || 0) + pontosGanhos,
            ultimaAtividade: new Date().toISOString()
        });
        estado.pontos = (estado.pontos || 0) + pontosGanhos;
    } catch (err) {
        console.warn("Modo offline ou erro ao salvar:", err);
    }
}

// ────────────────────────────────────────────────────────────────
// TIMER
// ────────────────────────────────────────────────────────────────
function iniciarTimer(callbackTempo) {
    pararTimer();
    estado.segundos = 0;
    callbackTempo?.('00:00');
    estado.timer = setInterval(() => {
        if (estado.concluido) return;
        estado.segundos++;
        const m = String(Math.floor(estado.segundos / 60)).padStart(2, '0');
        const s = String(estado.segundos % 60).padStart(2, '0');
        callbackTempo?.(`${m}:${s}`);
    }, 1000);
}

function pararTimer() {
    if (estado.timer) clearInterval(estado.timer);
    estado.timer = null;
}

export function resetTimer() {
    pararTimer();
    estado.segundos = 0;
}
