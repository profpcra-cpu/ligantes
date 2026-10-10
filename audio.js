let audioCtx = null;

export function tocarSom(tipo) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const emitir = (f1, f2, dur, vol = 0.09) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(f1, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(f2, audioCtx.currentTime + dur);
            gain.gain.setValueAtTime(vol, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur + 0.06);
            osc.start();
            osc.stop(audioCtx.currentTime + dur + 0.06);
        };

        if (tipo === 'par') emitir(660, 990, 0.12);
        if (tipo === 'erro') emitir(220, 110, 0.15, 0.08);
        if (tipo === 'vitoria') {
            [523, 659, 784, 1047].forEach((freq, i) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.connect(g); g.connect(audioCtx.destination);
                o.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.1);
                g.gain.setValueAtTime(0.09, audioCtx.currentTime + i * 0.1);
                g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.1 + 0.25);
                o.start(audioCtx.currentTime + i * 0.1);
                o.stop(audioCtx.currentTime + i * 0.1 + 0.25);
            });
        }
    } catch (_) { /* silencioso caso o browser bloqueie autoplay */ }
}
