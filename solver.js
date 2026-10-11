// solver.js
import { estado, atualizarVisualDom, mostrarToast, verificarVitoria } from "./game-engine.js";
import { tocarSom } from "./audio.js";

// ────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO
// ────────────────────────────────────────────────────────────────
const MAX_TENTATIVAS = 12;
const PENALIDADE_ESTREITO = 40;
const MAX_REJEICOES = 3;

const ANIM = {
    msPorCelula: 45,
    msPorPar: 220,
    msAposDesenharPar: 180,
    velocidadeMin: 5,
    velocidadeMax: 300
};

const animController = {
    cancelado: false,
    emAndamento: false
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ────────────────────────────────────────────────────────────────
// ENTRADA PÚBLICA
// ────────────────────────────────────────────────────────────────
export async function resolverNivelAutomaticamente() {
    if (estado.concluido) {
        mostrarToast("O nível já está concluído!");
        return;
    }
    if (animController.emAndamento) {
        cancelarAnimacao();
        return;
    }

    mostrarToast("🤖 A calcular solução inteligente...");

    const solucao = await procurarSolucaoComRetry();

    if (!solucao) {
        tocarSom('erro');
        mostrarToast("⚠️ Não foi possível encontrar solução. Tente reiniciar.");
        return;
    }

    await aplicarSolucaoAnimada(solucao);
}

export function cancelarAnimacao() {
    if (!animController.emAndamento) return;
    animController.cancelado = true;
    mostrarToast("⏹️ Animação cancelada.");
}

export function animacaoEmAndamento() {
    return animController.emAndamento;
}

export function setVelocidadeAnimacao(ms) {
    ANIM.msPorCelula = Math.max(ANIM.velocidadeMin, Math.min(ANIM.velocidadeMax, ms));
}

// ────────────────────────────────────────────────────────────────
// PROCURA DE SOLUÇÃO
// ────────────────────────────────────────────────────────────────
async function procurarSolucaoComRetry() {
    const estrategias = construirEstrategias(estado.pares);
    for (let i = 0; i < estrategias.length && i < MAX_TENTATIVAS; i++) {
        const sol = tentarResolver(estrategias[i]);
        if (sol && Object.keys(sol).length === estado.pares.length) {
            console.log(`[Solver] Sucesso: ${estrategias[i].nome}`);
            return sol;
        }
    }
    return null;
}

function construirEstrategias(pares) {
    const dist = (p) => Math.abs(p.a.r - p.b.r) + Math.abs(p.a.c - p.b.c);
    return [
        { nome: "distância ↓",  pares: [...pares].sort((a, b) => dist(b) - dist(a)) },
        { nome: "bordas",       pares: [...pares].sort((a, b) => bordaScore(b) - bordaScore(a)) },
        { nome: "aleatória",    pares: shuffle([...pares]) },
        { nome: "distância ↑",  pares: [...pares].sort((a, b) => dist(a) - dist(b)) },
        { nome: "central",      pares: [...pares].sort((a, b) => central(b) - central(a)) }
    ];
}

function bordaScore(par) {
    const t = estado.tamanho;
    const d = (p) => Math.min(p.r, p.c, t - 1 - p.r, t - 1 - p.c);
    return -(d(par.a) + d(par.b));
}

function central(par) {
    const t = estado.tamanho;
    const c = (t - 1) / 2;
    const d = (p) => Math.abs(p.r - c) + Math.abs(p.c - c);
    return -(d(par.a) + d(par.b));
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function tentarResolver(estrategia) {
    const t = estado.tamanho;
    const grid = Array.from({ length: t }, () =>
        Array.from({ length: t }, () => ({ tipo: 'vazio', cor: null, parId: null }))
    );

    for (const p of estado.pares) {
        grid[p.a.r][p.a.c] = { tipo: 'endpoint', cor: p.cor, parId: p.id };
        grid[p.b.r][p.b.c] = { tipo: 'endpoint', cor: p.cor, parId: p.id };
    }

    const solucao = {};

    for (const par of estrategia.pares) {
        const caminho = encontrarCaminho(par.a, par.b, grid, t, par.id);
        if (!caminho) return null;

        solucao[par.id] = { cor: par.cor, pontos: caminho };

        for (let i = 1; i < caminho.length - 1; i++) {
            const p = caminho[i];
            grid[p.r][p.c] = { tipo: 'trilha', cor: par.cor, parId: par.id };
        }
    }

    return solucao;
}

function encontrarCaminho(inicio, fim, grid, tamanho, parId) {
    const h = (r, c) => Math.abs(r - fim.r) + Math.abs(c - fim.c);
    const open = [{ r: inicio.r, c: inicio.c, g: 0, f: h(inicio.r, inicio.c), caminho: [inicio] }];
    const visitados = new Map();

    while (open.length) {
        let idx = 0;
        for (let i = 1; i < open.length; i++) {
            if (open[i].f < open[idx].f) idx = i;
        }
        const atual = open.splice(idx, 1)[0];
        const key = `${atual.r},${atual.c}`;

        if (visitados.has(key) && visitados.get(key) <= atual.g) continue;
        visitados.set(key, atual.g);

        if (atual.r === fim.r && atual.c === fim.c) return atual.caminho;

        for (const v of vizinhos(atual.r, atual.c, tamanho)) {
            const ehFim = v.r === fim.r && v.c === fim.c;
            const cel = grid[v.r][v.c];

            if (!ehFim && cel.tipo === 'trilha') continue;
            if (!ehFim && cel.tipo === 'endpoint' && cel.parId !== parId) continue;

            const ng = atual.g + 1 + custoLocal(v, grid, tamanho);
            const nk = `${v.r},${v.c}`;

            if (!visitados.has(nk) || visitados.get(nk) > ng) {
                open.push({
                    r: v.r, c: v.c, g: ng,
                    f: ng + h(v.r, v.c),
                    caminho: [...atual.caminho, v]
                });
            }
        }
    }
    return null;
}

function custoLocal(cel, grid, tamanho) {
    let bloq = 0;
    for (const v of vizinhos(cel.r, cel.c, tamanho)) {
        if (grid[v.r][v.c].tipo === 'trilha') bloq++;
    }
    return bloq >= 2 ? PENALIDADE_ESTREITO : 0;
}

function vizinhos(r, c, t) {
    const out = [];
    if (r > 0) out.push({ r: r - 1, c });
    if (r < t - 1) out.push({ r: r + 1, c });
    if (c > 0) out.push({ r, c: c - 1 });
    if (c < t - 1) out.push({ r, c: c + 1 });
    return out;
}

// ────────────────────────────────────────────────────────────────
// APLICAÇÃO ANIMADA
// ────────────────────────────────────────────────────────────────
async function aplicarSolucaoAnimada(solucao) {
    animController.cancelado = false;
    animController.emAndamento = true;

    try {
        // Reset limpo
        estado.trilhas = {};
        estado.grid = Array.from({ length: estado.tamanho }, () =>
            Array.from({ length: estado.tamanho }, () => ({
                tipo: 'vazio', cor: null, parId: null
            }))
        );

        for (const p of estado.pares) {
            estado.grid[p.a.r][p.a.c] = { tipo: 'endpoint', cor: p.cor, parId: p.id };
            estado.grid[p.b.r][p.b.c] = { tipo: 'endpoint', cor: p.cor, parId: p.id };
        }

        // Push ao histórico para permitir undo
        if (typeof window !== "undefined" && window.registarHistorico) {
            window.registarHistorico();
        }

        atualizarVisualDom();
        await sleep(120);

        const ordemIds = Object.keys(solucao).map((s) => parseInt(s, 10));
        const total = ordemIds.length;
        let feitos = 0;

        for (const id of ordemIds) {
            if (animController.cancelado) break;

            const par = estado.pares.find((p) => p.id === id);
            if (!par) continue;

            await animarPar(par, solucao[id].pontos);

            feitos++;
            if (typeof window.atualizarProgressoAnimacao === "function") {
                window.atualizarProgressoAnimacao((feitos / total) * 100);
            }
        }

        const completou = !animController.cancelado
            && Object.keys(estado.trilhas).length === estado.pares.length;

        if (completou) {
            tocarSom('vitoria');
            mostrarToast("✨ Nível resolvido automaticamente!");
            if (typeof verificarVitoria === 'function') verificarVitoria();
        } else if (animController.cancelado) {
            mostrarToast("⏹️ Animação interrompida.");
        }
    } finally {
        animController.emAndamento = false;
        animController.cancelado = false;

        // Limpa cabeça de trilha
        document.querySelectorAll('.cell.trail-head')
            .forEach((el) => el.classList.remove('trail-head'));

        // Atualiza botão undo
        if (typeof window.atualizarBotaoUndo === "function") {
            window.atualizarBotaoUndo();
        }
    }
}

async function animarPar(par, pontos) {
    if (!pontos || pontos.length < 2) return;

    const { cor } = par;
    const trilhaViva = { cor, pontos: [pontos[0]] };
    estado.trilhas[par.id] = trilhaViva;

    atualizarVisualDom();
    marcarCabeca(pontos[0]);

    if (ANIM.msPorPar > 0) await sleep(ANIM.msPorPar);
    if (animController.cancelado) return;

    for (let i = 1; i < pontos.length - 1; i++) {
        if (animController.cancelado) return;

        const p = pontos[i];
        trilhaViva.pontos.push(p);
        estado.grid[p.r][p.c] = { tipo: 'trilha', cor, parId: par.id };

        atualizarVisualDom();
        marcarCabeca(p);

        if (ANIM.msPorCelula > 0) await sleep(ANIM.msPorCelula);
    }

    if (animController.cancelado) return;

    trilhaViva.pontos.push(pontos[pontos.length - 1]);
    atualizarVisualDom();
    marcarCabeca(pontos[pontos.length - 1]);

    tocarSom('par');
    if (ANIM.msAposDesenharPar > 0) await sleep(ANIM.msAposDesenharPar);
}

function marcarCabeca(p) {
    document.querySelectorAll('.cell.trail-head')
        .forEach((el) => el.classList.remove('trail-head'));
    const cell = document.getElementById(`cell-${p.r}-${p.c}`);
    if (cell) cell.classList.add('trail-head');
}
