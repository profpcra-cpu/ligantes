import { db } from "./firebase-config.js";
import { ref, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { tocarSom } from "./audio.js";

export const PALETA = ['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

export const estado = {
    nivel: 1, tamanho: 5, grid: [], pares: [], trilhas: {},
    desenhando: null, pontos: 0, segundos: 0, timer: null, concluido: false,
    jogadorSessao: JSON.parse(localStorage.getItem('brain_hub_jogador')) || { chave: 'visitante_default', nome: 'Jogador', avatar: '🎮' }
};

export function iniciarPuzzle(nivel, boardElement, callbacks) {
    estado.nivel = nivel;
    estado.tamanho = nivel + 4;
    estado.trilhas = {};
    estado.concluido = false;
    estado.desenhando = null;
    
    const n = estado.tamanho;
    boardElement.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    boardElement.style.gridTemplateRows = `repeat(${n}, 1fr)`;
    boardElement.innerHTML = '';

    estado.grid = Array.from({ length: n }, () => Array.from({ length: n }, () => ({ cor: null, parId: null, tipo: 'vazio' })));
    
    const quantidadePares = Math.min(nivel + 2, PALETA.length);
    estado.pares = [];
    
    const posicoesIniciais = [
        { a: {r: 0, c: 0}, b: {r: n-1, c: n-1} },
        { a: {r: 0, c: n-1}, b: {r: n-1, c: 0} },
        { a: {r: Math.floor(n/2), c: 0}, b: {r: Math.floor(n/2), c: n-1} },
        { a: {r: 0, c: Math.floor(n/2)}, b: {r: n-1, c: Math.floor(n/2)} }
    ];

    for (let i = 0; i < quantidadePares; i++) {
        const pos = posicoesIniciais[i % posicoesIniciais.length];
        estado.pares.push({
            id: i,
            cor: PALETA[i],
            a: { ...pos.a },
            b: { ...pos.b }
        });
    }

    estado.pares.forEach(p => {
        estado.grid[p.a.r][p.a.c] = { cor: p.cor, parId: p.id, tipo: 'endpoint' };
        estado.grid[p.b.r][p.b.c] = { cor: p.cor, parId: p.id, tipo: 'endpoint' };
    });

    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.r = r; cell.dataset.c = c;
            cell.id = `cell-${r}-${c}`;
            boardElement.appendChild(cell);
        }
    }

    callbacks.onAtualizarVisual();
    iniciarTimer(callbacks.onAtualizarTempo);
}

export function atualizarVisualDom() {
    const n = estado.tamanho;
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            if (!cell) continue;
            cell.className = 'cell';
            cell.style.removeProperty('--trail-color');
            const dado = estado.grid[r][c];

            if (dado.tipo === 'endpoint') {
                const conectado = estado.trilhas[dado.parId] ? ' connected' : '';
                cell.innerHTML = `<div class="endpoint${conectado}" style="background:${dado.cor}"></div>`;
            } else if (dado.tipo === 'trilha') {
                cell.classList.add('trail');
                cell.style.setProperty('--trail-color', dado.cor);
                cell.innerHTML = '';
            } else {
                cell.innerHTML = '';
            }
        }
    }
}

export function lidarComMovimento(r, c, callbacks) {
    if (!estado.desenhando) return;
    const trail = estado.desenhando.pontos;
    const ultima = trail[trail.length - 1];
    if (ultima.r === r && ultima.c === c) return;
    if (Math.abs(r - ultima.r) + Math.abs(c - ultima.c) !== 1) return;

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

    const alvo = estado.grid[r][c];

    if (alvo.tipo === 'endpoint' && alvo.parId === estado.desenhando.parId) {
        trail.push({ r, c });
        estado.trilhas[estado.desenhando.parId] = { pontos: [...trail] };
        estado.desenhando = null;
        tocarSom('par');
        callbacks.onAtualizarVisual();
        verificarVitoria(callbacks);
        return;
    }

    if (alvo.tipo === 'endpoint') return;

    if (alvo.tipo === 'trilha' && alvo.parId !== estado.desenhando.parId) {
        if (estado.trilhas[alvo.parId]) {
            limparTrilha(estado.trilhas[alvo.parId]);
            delete estado.trilhas[alvo.parId];
        }
    }

    if (alvo.tipo === 'vazio' || alvo.tipo === 'trilha') {
        trail.push({ r, c });
        estado.grid[r][c] = { cor: estado.desenhando.cor, parId: estado.desenhando.parId, tipo: 'trilha' };
        callbacks.onAtualizarVisual();
    }
}

export function limparTrilha(trilhaObj) {
    if (!trilhaObj) return;
    trilhaObj.pontos.forEach(p => {
        if (estado.grid[p.r][p.c].tipo === 'trilha') {
            estado.grid[p.r][p.c] = { cor: null, parId: null, tipo: 'vazio' };
        }
    });
}

function verificarVitoria(callbacks) {
    if (Object.keys(estado.trilhas).length === estado.pares.length) {
        estado.concluido = true;
        clearInterval(estado.timer);
        tocarSom('vitoria');
        callbacks.onVitoria();
        salvarProgressoNoFirebase();
    }
}

async function salvarProgressoNoFirebase() {
    try {
        const refUser = ref(db, 'jogadores/' + estado.jogadorSessao.chave);
        await update(refUser, { pontos: 150, ultimaAtividade: new Date().toISOString() });
    } catch (err) {
        console.warn("Modo offline ou erro ao salvar:", err);
    }
}

function iniciarTimer(callbackTempo) {
    clearInterval(estado.timer);
    estado.segundos = 0;
    estado.timer = setInterval(() => {
        estado.segundos++;
        const m = String(Math.floor(estado.segundos / 60)).padStart(2, '0');
        const s = String(estado.segundos % 60).padStart(2, '0');
        callbackTempo(`${m}:${s}`);
    }, 1000);
}
