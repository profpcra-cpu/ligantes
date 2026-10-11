import { estado, aplicarPassoAutomatico, atualizarVisualDom, tocarSom, mostrarToast } from "./ligantes.js"; // Ajuste os imports conforme a sua estrutura de ficheiros

/**
 * Tenta resolver automaticamente todos os pares pendentes do nível atual.
 */
export async function resolverNivelAutomaticamente() {
    if (estado.concluido) {
        mostrarToast("O nível já está concluído!");
        return;
    }

    mostrarToast("🤖 A calcular solução automática...");

    // Limpa trilhas existentes antes de resolver
    estado.trilhas = {};
    estado.grid = Array.from({ length: estado.tamanho }, () =>
        Array.from({ length: estado.tamanho }, () => ({ tipo: 'vazio', cor: null, parId: null }))
    );

    // Reinsere os endpoints no grid
    estado.pares.forEach(p => {
        estado.grid[p.a.r][p.a.c] = { tipo: 'endpoint', cor: p.cor, parId: p.id };
        estado.grid[p.b.r][p.b.c] = { tipo: 'endpoint', cor: p.cor, parId: p.id };
    });

    // Tenta encontrar o caminho para cada par utilizando a lógica de pathfinding
    for (const par of estado.pares) {
        const caminho = encontrarCaminhoSolver(par.a, par.b, estado.grid, estado.tamanho);
        if (caminho) {
            estado.trilhas[par.id] = {
                cor: par.cor,
                pontos: caminho
            };

            // Preenche o grid com a trilha encontrada (exceto nos pontos finais)
            caminho.forEach((p, idx) => {
                if (idx > 0 && idx < caminho.length - 1) {
                    estado.grid[p.r][p.c] = { tipo: 'trilha', cor: par.cor, parId: par.id };
                }
            });
        }
    }

    atualizarVisualDom();
    tocarSom('vitoria');
    mostrarToast("✨ Nível resolvido automaticamente!");
    
    // Dispara a verificação de vitória para atualizar pontuação e IAT
    if (typeof verificarVitoria === 'function') {
        verificarVitoria();
    }
}

/**
 * Algoritmo auxiliar de busca para o solver
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
