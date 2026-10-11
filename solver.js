// No teu módulo de inicialização da UI
import {
    resolverNivelAutomaticamente,
    cancelarAnimacao,
    animacaoEmAndamento,
    setVelocidadeAnimacao
} from "./solver.js";

const btnSolve = document.getElementById('btn-auto-solve');
const btnCancel = document.getElementById('btn-cancelar-anim');
const rangeVel = document.getElementById('range-vel');

btnSolve.addEventListener('click', async () => {
    if (animacaoEmAndamento()) {
        cancelarAnimacao();
        return;
    }
    btnCancel.style.display = '';
    try {
        await resolverNivelAutomaticamente();
    } finally {
        btnCancel.style.display = 'none';
    }
});

btnCancel.addEventListener('click', cancelarAnimacao);
rangeVel.addEventListener('input', (e) => setVelocidadeAnimacao(Number(e.target.value)));

// Esc cancela
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && animacaoEmAndamento()) cancelarAnimacao();
});
