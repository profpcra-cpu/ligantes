import { estado, atualizarVisualDom, mostrarToast, verificarVitoria } from "./game-engine.js";
import { tocarSom } from "./audio.js";

/**
 * Tenta resolver automaticamente todos os pares pendentes do nível atual.
 */
export async function resolverNivelAutomaticamente() {
    if (estado.concluido) {
        mostrarToast("O nível já está concluído!");
        return;
    }

    mostrarToast("🤖 A calcular solução inteligente...");

    // 1. Limpa trilhas existentes
    estado.trilhas = {};
    estado.grid = Array.from({ length: estado.tamanho }, () =>
        Array.from({ length: estado.tamanho }, () => ({ tipo: 'vazio', cor: null, parId: null }))
    );

    // 2. Reinsere rigorosamente apenas os endpoints no grid
    estado.pares.forEach(p => {
        estado.grid[p.a.r][p.a.c] = { tipo: 'endpoint', cor: p.cor, parId: p.id };
        estado.grid[p.b.r][p.b.c] = { tipo: 'endpoint', cor: p.cor, parId: p.id };
    });

    // 3. Ordena os pares por distância de Manhattan (resolve primeiro os mais curtos/difíceis para desobstruir espaço)
    const paresOrdenados = [...estado.pares].sort((p1, p2) => {
        const dist1 = Math.abs(p1.a.r - p1.b.r) + Math.abs(p1.a.c - p1.b.c);
        const dist2 = Math.abs(p2.a.r - p2.b.r) + Math.abs(p2.a.c - p2.b.c);
        return dist1 - dist2;
    });

    let todosResolvidos = true;

    // 4. Processa o pathfinding com prioridade espacial
    for (const par of paresOrdenados) {
        const caminho = encontrarCaminhoSolver(par.a, par.b, estado.grid, estado.tamanho);
        if (caminho) {
            estado.trilhas[par.id] = {
                cor: par.cor,
                pontos: caminho
            };

            // Regista a trilha no grid para bloquear células para os pares seguintes
            caminho.forEach((p, idx) => {
                if (idx > 0 && idx < caminho.length - 1) {
                    estado.grid[p.r][p.c] = { tipo: 'trilha', cor: par.cor, parId: par.id };
                }
            });
        } else {
            todosResolvidos = false;
        }
    }

    atualizarVisualDom();

    if (todosResolvidos && Object.keys(estado.trilhas).length === estado.pares.length) {
        tocarSom('vitoria');
        mostrarToast("✨ Nível resolvido automaticamente com sucesso!");
        if (typeof verificarVitoria === 'function') {
            verificarVitoria();
        }
    } else {
        tocarSom('erro');
        mostrarToast("⚠️ Conflito detetado na matriz. Tente reiniciar o nível.");
    }
}

/**
 * Algoritmo de busca otimizado (BFS com peso para contornos)
 */
function encontrarCaminhoSolver(inicio, fim, grid, tamanho) {
    const fila = [[inicio]];
    const visitados = new Set();
    visitados.add(`${inicio.r},${inicio.c}`);

    while (fila.length > 0) {
        const caminho = fila.shift();
        const atual = caminho[caminho.length - 1];

        if (atual.r === fim.r && atual.c === fim.c) {
            return caminho;
        }

        // Direções baralhadas ou ordenadas para priorizar fluidez
        const dirs = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
        
        for (const d of dirs) {
            const viz = { r: atual.r + d.r, c: atual.c + d.c };
            if (viz.r < 0 || viz.r >= tamanho || viz.c < 0 || viz.c >= tamanho) continue;

            const chave = `${viz.r},${viz.c}`;
            const celulaOcupada = grid[viz.r][viz.c].tipo !== 'vazio';
            const ehFim = (viz.r === fim.r && viz.c === fim.c);

            if (!visitados.has(chave) && (!celulaOcupada || ehFim)) {
                visitados.add(chave);
                fila.push([...caminho, viz]);
            }
        }
    }
    return null;
}
