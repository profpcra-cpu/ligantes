// audio.js
// ────────────────────────────────────────────────────────────────
// Motor de áudio moderno para o Brain Curves
// 100% Web Audio API — sem ficheiros externos
// ────────────────────────────────────────────────────────────────

let audioCtx = null;
let masterGain = null;
let compressor = null;
let reverbNode = null;

// Anti-fadiga: deteta sons repetidos em curto espaço de tempo
const historicoSons = [];
const JANELA_DUCKING_MS = 1500;
const VOLUME_BASE = 0.14;

// Escala pentatónica menor (C menor) — sempre agradável, sem dissonância
const ESCALA = [
    261.63, // C4
    311.13, // Eb4
    349.23, // F4
    392.00, // G4
    466.16, // Bb4
    523.25, // C5
    622.25, // Eb5
    698.46  // F5
];

// ────────────────────────────────────────────────────────────────
// INICIALIZAÇÃO
// ────────────────────────────────────────────────────────────────
function inicializar() {
    if (audioCtx) return true;
    try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return false;

        audioCtx = new Ctor();

        // Cadeia: [voz] → masterGain → compressor → destination
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.6;

        compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.knee.value = 22;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;

        masterGain.connect(compressor);
        compressor.connect(audioCtx.destination);

        // Reverb curto e barato (convolução com IR gerada)
        reverbNode = audioCtx.createConvolver();
        reverbNode.buffer = gerarImpulsoReverb(0.6, 2.2);

        const reverbGain = audioCtx.createGain();
        reverbGain.gain.value = 0.18;
        reverbNode.connect(reverbGain);
        reverbGain.connect(masterGain);

        return true;
    } catch (_) {
        audioCtx = null;
        return false;
    }
}

function garantirResumo() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
}

// Impulso de reverb sintético (sino curto)
function gerarImpulsoReverb(duracaoSeg, decaimento) {
    const rate = audioCtx.sampleRate;
    const len = Math.floor(rate * duracaoSeg);
    const buffer = audioCtx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < len; i++) {
            const t = i / len;
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decaimento);
        }
    }
    return buffer;
}

// ────────────────────────────────────────────────────────────────
// VOZES E UTILITÁRIOS
// ────────────────────────────────────────────────────────────────
function calcularDucking(tipo) {
    const agora = performance.now();
    historicoSons.push({ tipo, t: agora });

    while (historicoSons.length && agora - historicoSons[0].t > JANELA_DUCKING_MS) {
        historicoSons.shift();
    }

    const repetidos = historicoSons.filter((h) => h.tipo === tipo).length;
    // 1ª vez: volume cheio; cada repetição reduz 18% até 45%
    const fator = Math.max(0.45, Math.pow(0.82, repetidos - 1));
    return fator;
}

function obterDestino(pan = 0) {
    if (pan === 0) return masterGain;
    const panner = audioCtx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    panner.connect(masterGain);
    return panner;
}

/**
 * Voz completa com envelope ADSR e filtro.
 */
function voz({
    freqIni, freqFim, dur = 0.15, vol = 1.0, tipo = 'sine',
    ataque = 0.008, decai = 0.04, sustain = 0.6, pan = 0,
    filtroTipo = 'lowpass', filtroFreq = 3200, reverb = 0.15,
    delayInicio = 0
}) {
    const t0 = audioCtx.currentTime + delayInicio;
    const destino = obterDestino(pan);

    const osc = audioCtx.createOscillator();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freqIni, t0);
    if (freqFim && freqFim !== freqIni) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqFim), t0 + dur);
    }

    const filtro = audioCtx.createBiquadFilter();
    filtro.type = filtroTipo;
    filtro.frequency.value = filtroFreq;
    filtro.Q.value = 0.8;

    const gain = audioCtx.createGain();
    const volFinal = VOLUME_BASE * vol;

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volFinal, t0 + ataque);
    gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, volFinal * sustain),
        t0 + ataque + decai
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(filtro);
    filtro.connect(gain);
    gain.connect(destino);

    // Envio para reverb (paralelo, não substitui o sinal seco)
    if (reverb > 0 && reverbNode) {
        const send = audioCtx.createGain();
        send.gain.value = reverb;
        gain.connect(send);
        send.connect(reverbNode);
    }

    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
}

/**
 * Ruído branco filtrado — para texturas "cristalinas" ou "whoosh".
 */
function ruidoFiltrado({
    dur = 0.2, vol = 0.4, freqIni = 4000, freqFim = 800,
    q = 4, pan = 0, delayInicio = 0, filtroTipo = 'bandpass'
}) {
    const t0 = audioCtx.currentTime + delayInicio;
    const destino = obterDestino(pan);

    const rate = audioCtx.sampleRate;
    const len = Math.max(1, Math.floor(rate * dur));
    const buffer = audioCtx.createBuffer(1, len, rate);
    const dados = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) dados[i] = Math.random() * 2 - 1;

    const fonte = audioCtx.createBufferSource();
    fonte.buffer = buffer;

    const filtro = audioCtx.createBiquadFilter();
    filtro.type = filtroTipo;
    filtro.Q.value = q;
    filtro.frequency.setValueAtTime(freqIni, t0);
    filtro.frequency.exponentialRampToValueAtTime(Math.max(50, freqFim), t0 + dur);

    const gain = audioCtx.createGain();
    const volFinal = VOLUME_BASE * vol;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volFinal, t0 + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    fonte.connect(filtro);
    filtro.connect(gain);
    gain.connect(destino);

    fonte.start(t0);
    fonte.stop(t0 + dur + 0.02);
}

// Escolhe uma nota da escala, evitando repetir a última
let ultimaNotaIdx = -1;
function notaAleatoria() {
    let idx;
    do { idx = Math.floor(Math.random() * ESCALA.length); }
    while (idx === ultimaNotaIdx && ESCALA.length > 1);
    ultimaNotaIdx = idx;
    return ESCALA[idx];
}

// ────────────────────────────────────────────────────────────────
// API PÚBLICA
// ────────────────────────────────────────────────────────────────
export function tocarSom(tipo) {
    if (!inicializar()) return;
    garantirResumo();

    const duck = calcularDucking(tipo);

    switch (tipo) {
        // ✦ Par fechado: blip cristalino ascendente + shimmer
        case 'par': {
            const base = notaAleatoria();
            voz({
                freqIni: base,
                freqFim: base * 1.5,
                dur: 0.16,
                vol: 0.9 * duck,
                tipo: 'triangle',
                pan: (Math.random() - 0.5) * 0.4,
                filtroFreq: 4200,
                reverb: 0.22
            });
            // Shimmer: harmónico agudo muito curto
            voz({
                freqIni: base * 3,
                freqFim: base * 3,
                dur: 0.05,
                vol: 0.35 * duck,
                tipo: 'sine',
                delayInicio: 0.01,
                filtroFreq: 8000,
                reverb: 0.4
            });
            break;
        }

        // ✦ Passo de trilha: tique muito curto e seco
        case 'passo': {
            voz({
                freqIni: 900 + Math.random() * 200,
                freqFim: 700,
                dur: 0.035,
                vol: 0.22 * duck,
                tipo: 'sine',
                ataque: 0.002,
                decai: 0.02,
                sustain: 0.1,
                filtroFreq: 5000,
                reverb: 0
            });
            break;
        }

        // ✦ Erro: "thunk" descendente com textura ruidosa
        case 'erro': {
            voz({
                freqIni: 220,
                freqFim: 90,
                dur: 0.22,
                vol: 0.7 * duck,
                tipo: 'sawtooth',
                filtroTipo: 'lowpass',
                filtroFreq: 900,
                reverb: 0.05
            });
            ruidoFiltrado({
                dur: 0.14,
                vol: 0.2 * duck,
                freqIni: 1200,
                freqFim: 200,
                q: 1.5,
                filtroTipo: 'lowpass',
                pan: -0.15
            });
            break;
        }

        // ✦ Undo: "quem" descendente suave
        case 'undo': {
            voz({
                freqIni: 520,
                freqFim: 320,
                dur: 0.12,
                vol: 0.55 * duck,
                tipo: 'sine',
                pan: -0.1,
                filtroFreq: 2600,
                reverb: 0.1
            });
            break;
        }

        // ✦ Dica: arpejo curto e etéreo (3 notas)
        case 'dica': {
            const raiz = notaAleatoria();
            [1, 1.25, 1.5].forEach((mult, i) => {
                voz({
                    freqIni: raiz * mult,
                    freqFim: raiz * mult,
                    dur: 0.14,
                    vol: 0.45 * duck,
                    tipo: 'sine',
                    delayInicio: i * 0.07,
                    pan: -0.2 + i * 0.2,
                    filtroFreq: 5000,
                    reverb: 0.45
                });
            });
            break;
        }

        // ✦ Vitória: arpejo maior + shimmer + reverb generoso
        case 'vitoria': {
            const acorde = [1, 1.25, 1.5, 2]; // maior (raiz, 3ª, 5ª, 8ª)
            const raiz = ESCALA[4]; // Bb4 — brilha bem

            acorde.forEach((mult, i) => {
                voz({
                    freqIni: raiz * mult,
                    freqFim: raiz * mult * 1.005, // leve vibrato ascendente
                    dur: 0.55,
                    vol: 0.55 * duck,
                    tipo: 'triangle',
                    ataque: 0.015,
                    decai: 0.1,
                    sustain: 0.4,
                    delayInicio: i * 0.11,
                    pan: -0.3 + i * 0.2,
                    filtroFreq: 6000,
                    reverb: 0.55
                });
            });

            // Shimmer final
            voz({
                freqIni: raiz * 4,
                freqFim: raiz * 4,
                dur: 0.9,
                vol: 0.22 * duck,
                tipo: 'sine',
                delayInicio: 0.45,
                filtroFreq: 9000,
                reverb: 0.7
            });
            break;
        }

        // ✦ Nível iniciado: whoosh curto
        case 'iniciar': {
            ruidoFiltrado({
                dur: 0.28,
                vol: 0.28 * duck,
                freqIni: 300,
                freqFim: 3500,
                q: 2,
                filtroTipo: 'bandpass',
                pan: 0
            });
            break;
        }

        // ✦ Clique UI: tique mínimo
        case 'clique': {
            voz({
                freqIni: 1400,
                freqFim: 1000,
                dur: 0.025,
                vol: 0.18 * duck,
                tipo: 'sine',
                ataque: 0.001,
                decai: 0.01,
                sustain: 0.05,
                reverb: 0
            });
            break;
        }
    }
}

// ────────────────────────────────────────────────────────────────
// CONTROLO GLOBAL DE VOLUME (opcional — podes ligar à UI)
// ────────────────────────────────────────────────────────────────
export function setVolumeGlobal(v) {
    if (!masterGain) return;
    const clamped = Math.max(0, Math.min(1, v));
    masterGain.gain.setTargetAtTime(clamped * 0.6, audioCtx.currentTime, 0.05);
}

export function setMudo(mudo) {
    if (!masterGain) return;
    const alvo = mudo ? 0 : 0.6;
    masterGain.gain.setTargetAtTime(alvo, audioCtx.currentTime, 0.08);
}

// Resolve autoplay no primeiro gesto (fallback caso o jogo
// não toque som antes do primeiro clique)
if (typeof window !== 'undefined') {
    const resolver = () => {
        inicializar();
        garantirResumo();
        window.removeEventListener('pointerdown', resolver);
        window.removeEventListener('keydown', resolver);
        window.removeEventListener('touchstart', resolver);
    };
    window.addEventListener('pointerdown', resolver, { once: true });
    window.addEventListener('keydown', resolver, { once: true });
    window.addEventListener('touchstart', resolver, { once: true });
}
