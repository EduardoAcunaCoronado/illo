/* ============================================================================
   juice.js — Primitivas de "game feel" reutilizables (vanilla, sin librerías).
   Se cargan una vez y el engine las llama, o se usan como acciones desde los
   JSON de escena: {type:"shake"|"flash"|"grade"|"vignette", ...}.

   Los overlays (flash, viñeta) cuelgan de #game-container para que escalen con
   el escenario 1280x720. El shake NO reescribe el transform del escenario:
   compone con la escala mediante variables CSS (--shake-x/-y/-r), así el
   escalado responsive se mantiene intacto.

   Idea maestra (GDC "Juice it or Lose it" / "Art of Screenshake"): apilar
   varios efectos baratos en el mismo instante y escalarlos al momento.
   ========================================================================== */
(function () {
    'use strict';

    const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const sfxState = {};

    const state = {
        ready: false,
        stage: null,
        bg: null,
        flashEl: null,
        vignetteEl: null,
        trauma: 0,
        shaking: false,
        maxPx: 0,
        decay: 3,
        last: 0,
        audio: null,
        lastBlip: 0,
        gradeFilter: 'none',
        vignetteStrength: 0,
    };

    // Crea (una vez) los overlays dentro del escenario. Idempotente.
    function ensure() {
        if (state.ready) return true;
        const stage = document.getElementById('game-container');
        if (!stage) return false;
        state.stage = stage;
        state.bg = document.getElementById('background');

        const flash = document.createElement('div');
        flash.className = 'juice-flash';
        stage.appendChild(flash);
        state.flashEl = flash;

        const vig = document.createElement('div');
        vig.className = 'juice-vignette';
        stage.appendChild(vig);
        state.vignetteEl = vig;

        state.ready = true;
        return true;
    }

    /**
     * FLASH: Genera un destello a pantalla completa que se apaga rápidamente.
     * Añade o utiliza un div overlay sobre el escenario.
     * @param {string} [color='rgba(255,255,255,0.85)'] - Color CSS del destello.
     * @param {number} [ms=120] - Tiempo en milisegundos que tarda en desvanecerse.
     */
    function flash(color, ms) {
        if (!ensure()) return;
        color = color || 'rgba(255,255,255,0.85)';
        ms = ms || 120;
        const el = state.flashEl;
        el.style.transition = 'none';
        el.style.background = color;
        el.style.opacity = '1';
        void el.offsetWidth; // reflow para reiniciar
        el.style.transition = 'opacity ' + ms + 'ms ease-out';
        el.style.opacity = '0';
    }

    /**
     * SHAKE (modelo de trauma): Sacude el escenario y decae progresivamente.
     * Se puede llamar varias veces: el "trauma" se acumula (tope 1) de forma aditiva.
     * Respeta la preferencia "prefers-reduced-motion" del usuario.
     * @param {number} [intensity=8] - Intensidad inicial de la sacudida en píxeles.
     * @param {number} [ms=350] - Tiempo en milisegundos que dura el efecto antes de decaer.
     */
    function shake(intensity, ms) {
        if (!ensure() || REDUCED) return;
        intensity = intensity || 8;
        state.trauma = Math.min(1, state.trauma + Math.min(1, intensity / 10));
        state.maxPx = Math.max(state.maxPx, intensity);
        state.decay = 1000 / (ms || 350); // unidades de trauma por segundo
        if (!state.shaking) {
            state.shaking = true;
            state.last = performance.now();
            requestAnimationFrame(shakeStep);
        }
    }

    function shakeStep(now) {
        const dt = Math.min(0.05, (now - state.last) / 1000);
        state.last = now;
        const s = state.trauma * state.trauma; // curva de trauma (no lineal)
        const px = state.maxPx;
        const st = state.stage.style;
        st.setProperty('--shake-x', ((Math.random() * 2 - 1) * px * s).toFixed(2) + 'px');
        st.setProperty('--shake-y', ((Math.random() * 2 - 1) * px * s).toFixed(2) + 'px');
        st.setProperty('--shake-r', ((Math.random() * 2 - 1) * 2.2 * s).toFixed(2) + 'deg');
        state.trauma = Math.max(0, state.trauma - state.decay * dt);
        if (state.trauma > 0.001) {
            requestAnimationFrame(shakeStep);
        } else {
            st.setProperty('--shake-x', '0px');
            st.setProperty('--shake-y', '0px');
            st.setProperty('--shake-r', '0deg');
            state.shaking = false;
            state.maxPx = 0;
        }
    }

    /**
     * COLOR GRADE: Tinte o humor para la escena mediante filtros CSS.
     * Aplica `filter` tanto al fondo principal como al fondo secundario en transición.
     * @param {string} [filter='none'] - String CSS filter (ej. 'contrast(1.1) saturate(1.15)').
     * @param {number} [ms=800] - Tiempo de transición hacia el nuevo filtro.
     */
    function grade(filter, ms) {
        if (!ensure() || !state.bg) return;
        ms = ms == null ? 800 : ms;
        state.gradeFilter = filter || 'none';
        // El fondo usa dos capas durante los crossfades. Mantener el etalonaje en
        // ambas evita que la imagen entrante aparezca durante unos fotogramas sin
        // contraste/tinte y produzca un destello antes de asentarse en la capa A.
        state.bg.style.transition = 'opacity 0.8s ease, filter ' + ms + 'ms ease';
        state.bg.style.filter = state.gradeFilter;
        const secondaryBg = document.getElementById('background-b');
        if (secondaryBg) {
            // No tocar su transición de opacidad: durante un crossfade pertenece al
            // motor y su duración puede ser distinta. El filtro entra instantáneo en
            // B mientras A conserva la transición cromática.
            secondaryBg.style.filter = state.gradeFilter;
        }
    }
    function clearGrade(ms) {
        grade('none', ms);
    }

    /**
     * VIGNETTE: Oscurece los bordes para centrar la atención visual.
     * @param {number} [strength=0.6] - Intensidad del 0 al 1.
     * @param {number} [ms=600] - Tiempo de transición.
     */
    function vignette(strength, ms) {
        if (!ensure()) return;
        strength = strength == null ? 0.6 : strength;
        ms = ms == null ? 600 : ms;
        state.vignetteStrength = Math.max(0, Math.min(1, strength));
        const el = state.vignetteEl;
        el.style.transition = 'opacity ' + ms + 'ms ease';
        el.style.opacity = String(state.vignetteStrength);
    }
    function clearVignette(ms) {
        vignette(0, ms);
    }

    /* --- BLIP: tic suave por letra del typewriter (voz "de juguete") ----------
     Tono base por personaje (hash del nombre) + micro-variación aleatoria. */
    function audioCtx() {
        if (state.audio) return state.audio;
        try {
            state.audio = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            state.audio = null;
        }
        return state.audio;
    }
    /**
     * Calcula una frecuencia base (Hz) a partir del string identificador de un personaje,
     * para darle un tono de voz único pero consistente (tipo Animal Crossing / Undertale).
     * @param {string} key - Identificador del personaje (ej. 'samu', 'edu').
     * @returns {number} Frecuencia base en Hz.
     */
    function baseFreqFor(key) {
        if (!key) return 320;
        let h = 0;
        for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0xffff;
        return 240 + (h % 220); // Rango 240..460 Hz
    }

    /**
     * BLIP: Tic sonoro suave por cada letra que se escribe.
     * Sintetiza una onda cuadrada minúscula usando la WebAudio API.
     * @param {string} ch - El carácter actual que se está dibujando.
     * @param {string} speakerKey - El identificador del hablante para calcular el tono base.
     */
    function blip(ch, speakerKey) {
        if (REDUCED || ch === ' ' || ch === '\n') return;
        const now = performance.now();
        if (now - state.lastBlip < 28) return; // throttle anti-metralleta
        state.lastBlip = now;
        const ctx = audioCtx();
        if (!ctx) return;
        if (ctx.state === 'suspended') {
            try {
                ctx.resume();
            } catch (e) {}
        }
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = baseFreqFor(speakerKey) * (0.94 + Math.random() * 0.12);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.05, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        osc.connect(g).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.07);
    }

    // Pausa extra del typewriter según puntuación (ms). Da ritmo al texto.
    function punctuationPause(ch) {
        if ('.!?…'.indexOf(ch) !== -1) return 240;
        if (',;:—'.indexOf(ch) !== -1) return 90;
        return 0;
    }

    /**
     * Inicia un SFX sintetizado continuo simulando latidos del corazón.
     * Compuesto de ondas senoidales programadas en rampa en un oscilador en bucle.
     * @param {Object} opts - Opciones.
     * @param {number} [opts.volume=0.16] - Volumen principal del efecto.
     * @returns {Object} Un objeto controlador con la función `stop()`.
     */
    function startHeartbeat(opts) {
        const ctx = audioCtx();
        if (!ctx) return null;
        const master = ctx.createGain();
        master.gain.value = opts && opts.volume != null ? opts.volume : 0.16;
        master.connect(ctx.destination);
        let alive = true;
        const thump = (when, strong) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(58, when);
            osc.frequency.exponentialRampToValueAtTime(38, when + 0.16);
            g.gain.setValueAtTime(0.0001, when);
            g.gain.exponentialRampToValueAtTime(strong ? 1 : 0.6, when + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
            osc.connect(g);
            g.connect(master);
            osc.start(when);
            osc.stop(when + 0.26);
        };
        let next = ctx.currentTime + 0.1;
        const timer = setInterval(() => {
            if (!alive) return;
            // programar por adelantado (bum-BUM ... pausa)
            while (next < ctx.currentTime + 1.2) {
                thump(next, false);
                thump(next + 0.28, true);
                next += 0.95;
            }
        }, 300);
        return {
            stop() {
                alive = false;
                clearInterval(timer);
                try {
                    master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
                } catch (e) {}
                setTimeout(() => {
                    try {
                        master.disconnect();
                    } catch (e) {}
                }, 500);
            },
        };
    }

    /**
     * Inicia un SFX sintetizado continuo simulando ruido marrón de baja frecuencia.
     * Crea un buffer de audio aleatorio pasado por un filtro pasabajos (Lowpass).
     * @param {Object} opts - Opciones.
     * @param {number} [opts.volume=0.1] - Volumen principal del efecto.
     * @returns {Object} Un objeto controlador con la función `stop()`.
     */
    function startRumble(opts) {
        const ctx = audioCtx();
        if (!ctx) return null;
        const bufferSize = 2 * ctx.sampleRate;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + 0.02 * white) / 1.02; // ruido marrón
            data[i] = lastOut * 3.5;
        }
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 90;
        const g = ctx.createGain();
        g.gain.value = opts && opts.volume != null ? opts.volume : 0.1;
        src.connect(filter);
        filter.connect(g);
        g.connect(ctx.destination);
        src.start();
        return {
            stop() {
                try {
                    g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
                } catch (e) {}
                setTimeout(() => {
                    try {
                        src.stop();
                        src.disconnect();
                    } catch (e) {}
                }, 700);
            },
        };
    }

    /**
     * Gestiona el estado de efectos de sonido continuos en bucle.
     * Si no existe, lo instancia y guarda. Si ya existe, lo ignora o lo destruye si `on=false`.
     * @param {string} name - Identificador del SFX ('heartbeat', 'rumble').
     * @param {boolean} [on=true] - True para arrancar, false para detener.
     * @param {Object} [opts] - Parámetros adicionales (como el volumen).
     */
    function sfx(name, on, opts) {
        if (on === undefined) on = true;
        if (!on) {
            if (sfxState[name]) {
                sfxState[name].stop();
                delete sfxState[name];
            }
            return;
        }
        if (sfxState[name]) return; // ya sonando
        let inst = null;
        if (name === 'heartbeat') inst = startHeartbeat(opts);
        else if (name === 'rumble') inst = startRumble(opts);
        if (inst) {
            inst._snapshotOptions = Object.assign({}, opts || {});
            sfxState[name] = inst;
        }
    }

    /**
     * Fuerza la detención y destrucción de todas las camas de sonido activas.
     */
    function stopAllSfx() {
        for (const k of Object.keys(sfxState)) {
            sfxState[k].stop();
            delete sfxState[k];
        }
    }

    /**
     * Captura el estado actual de los efectos continuos del motor (Grade, Vignette, SFX).
     * Ignora destellos rápidos (flash) y temblores temporales (shake).
     * @returns {Object} Estado visual y sonoro persistible para el historial/guardado.
     */
    function snapshot() {
        ensure();
        return {
            grade: state.gradeFilter,
            vignette: state.vignetteStrength,
            sfx: Object.keys(sfxState).map(function (name) {
                return {
                    name: name,
                    options: Object.assign({}, sfxState[name]._snapshotOptions || {}),
                };
            }),
        };
    }

    /**
     * Restaura de golpe un conjunto de efectos continuos a partir de un estado guardado.
     * Transición inmediata (`ms=0`).
     * @param {Object} saved - El objeto devuelto previamente por `snapshot()`.
     */
    function restore(saved) {
        if (!saved) return;
        grade(saved.grade || 'none', 0);
        vignette(saved.vignette == null ? 0 : saved.vignette, 0);
        (saved.sfx || []).forEach(function (entry) {
            if (entry && entry.name) sfx(entry.name, true, entry.options || {});
        });
    }

    /**
     * Limpia completamente todos los efectos visuales y detiene los sonidos.
     * Útil al reiniciar el juego o volver al menú principal.
     */
    function reset() {
        if (!state.ready) return;
        clearGrade(0);
        clearVignette(0);
        state.trauma = 0;
        stopAllSfx();
        const st = state.stage.style;
        st.setProperty('--shake-x', '0px');
        st.setProperty('--shake-y', '0px');
        st.setProperty('--shake-r', '0deg');
    }

    window.Juice = {
        init: ensure,
        flash,
        shake,
        grade,
        clearGrade,
        vignette,
        clearVignette,
        blip,
        punctuationPause,
        reset,
        sfx,
        stopAllSfx,
        snapshot,
        restore,
        currentGrade: function () {
            return state.gradeFilter || 'none';
        },
        isReduced: function () {
            return REDUCED;
        },
    };

    if (document.readyState !== 'loading') ensure();
    else document.addEventListener('DOMContentLoaded', ensure);
})();
