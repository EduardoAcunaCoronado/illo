// Registro de audio creado por código. Los elementos new Audio() de los
// minijuegos no viven en el DOM y no se pueden localizar con querySelector.
const gamePauseMedia = (() => {
  const audios = new Set();
  const contexts = new Set();
  const NativeAudio = window.Audio;

  if (NativeAudio) {
    const TrackedAudio = function (...args) {
      const audio = new NativeAudio(...args);
      audios.add(audio);
      audio.addEventListener("ended", () => audios.delete(audio), { once: true });
      return audio;
    };
    TrackedAudio.prototype = NativeAudio.prototype;
    Object.setPrototypeOf(TrackedAudio, NativeAudio);
    window.Audio = TrackedAudio;
  }

  ["AudioContext", "webkitAudioContext"].forEach((name) => {
    const NativeContext = window[name];
    if (!NativeContext || NativeContext.__illoTracked) return;
    const TrackedContext = function (...args) {
      const context = new NativeContext(...args);
      contexts.add(context);
      return context;
    };
    TrackedContext.prototype = NativeContext.prototype;
    Object.setPrototypeOf(TrackedContext, NativeContext);
    TrackedContext.__illoTracked = true;
    window[name] = TrackedContext;
  });

  return { audios, contexts };
})();

// Reloj pausable de la partida. Los minijuegos usan una mezcla de timers y
// requestAnimationFrame; centralizarlos aquí hace que Esc congele ambos sin
// obligar a que cada minijuego implemente una pausa distinta.
const gamePauseClock = (() => {
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeClearTimeout = window.clearTimeout.bind(window);
  const nativeSetInterval = window.setInterval.bind(window);
  const nativeClearInterval = window.clearInterval.bind(window);
  const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
  const nativeCancelAnimationFrame = window.cancelAnimationFrame.bind(window);
  const realPerformanceNow = performance.now.bind(performance);
  const realDateNow = Date.now.bind(Date);

  let paused = false;
  let pausedAt = 0;
  let pausedDateAt = 0;
  let totalPaused = 0;
  let totalDatePaused = 0;
  let nextId = 1_000_000;
  const timers = new Map();
  const frames = new Map();

  const virtualPerformanceNow = () => {
    const now = realPerformanceNow();
    return now - totalPaused - (paused ? now - pausedAt : 0);
  };
  const virtualDateNow = () => {
    const now = realDateNow();
    return now - totalDatePaused - (paused ? now - pausedDateAt : 0);
  };

  // Los bucles de juego que comparan performance.now()/Date.now() también
  // deben ignorar el tiempo pasado dentro del menú de pausa.
  try {
    Object.defineProperty(performance, "now", {
      configurable: true,
      value: virtualPerformanceNow,
    });
  } catch (_) {}
  Date.now = virtualDateNow;

  const invoke = (callback, args) => {
    if (typeof callback === "function") callback(...args);
  };

  const armTimer = (record) => {
    if (paused || !timers.has(record.id)) return;
    record.startedAt = realPerformanceNow();
    record.nativeId = nativeSetTimeout(() => {
      record.nativeId = null;
      if (!timers.has(record.id)) return;
      if (record.interval) {
        record.remaining = record.delay;
        invoke(record.callback, record.args);
        if (timers.has(record.id)) armTimer(record);
      } else {
        timers.delete(record.id);
        invoke(record.callback, record.args);
      }
    }, Math.max(0, record.remaining));
  };

  const createTimer = (callback, delay, args, interval) => {
    // El panel de pausa (y herramientas de accesibilidad/automatización) puede
    // crear sus propios timers mientras el juego está detenido. Esos timers
    // nuevos no pertenecen a la simulación pausada y deben seguir funcionando.
    if (paused) {
      return interval
        ? nativeSetInterval(callback, delay, ...args)
        : nativeSetTimeout(callback, delay, ...args);
    }
    const id = nextId++;
    const normalizedDelay = Math.max(0, Number(delay) || 0);
    const record = {
      id,
      callback,
      args,
      interval,
      delay: normalizedDelay,
      remaining: normalizedDelay,
      startedAt: 0,
      nativeId: null,
    };
    timers.set(id, record);
    armTimer(record);
    return id;
  };

  const clearTimer = (id) => {
    const record = timers.get(id);
    if (!record) {
      nativeClearTimeout(id);
      nativeClearInterval(id);
      return;
    }
    if (record.nativeId !== null) nativeClearTimeout(record.nativeId);
    timers.delete(id);
  };

  window.setTimeout = (callback, delay, ...args) =>
    createTimer(callback, delay, args, false);
  window.setInterval = (callback, delay, ...args) =>
    createTimer(callback, delay, args, true);
  window.clearTimeout = clearTimer;
  window.clearInterval = clearTimer;

  const armFrame = (record) => {
    if (paused || !frames.has(record.id)) return;
    record.nativeId = nativeRequestAnimationFrame(() => {
      frames.delete(record.id);
      record.callback(virtualPerformanceNow());
    });
  };

  window.requestAnimationFrame = (callback) => {
    if (paused) return nativeRequestAnimationFrame(callback);
    const record = { id: nextId++, callback, nativeId: null };
    frames.set(record.id, record);
    armFrame(record);
    return record.id;
  };
  window.cancelAnimationFrame = (id) => {
    const record = frames.get(id);
    if (!record) {
      nativeCancelAnimationFrame(id);
      return;
    }
    if (record.nativeId !== null) nativeCancelAnimationFrame(record.nativeId);
    frames.delete(id);
  };

  const setPaused = (value) => {
    const next = !!value;
    if (next === paused) return;

    if (next) {
      paused = true;
      pausedAt = realPerformanceNow();
      pausedDateAt = realDateNow();
      for (const record of timers.values()) {
        if (record.nativeId === null) continue;
        nativeClearTimeout(record.nativeId);
        record.nativeId = null;
        record.remaining = Math.max(0, record.remaining - (pausedAt - record.startedAt));
      }
      for (const record of frames.values()) {
        if (record.nativeId !== null) nativeCancelAnimationFrame(record.nativeId);
        record.nativeId = null;
      }
      return;
    }

    totalPaused += realPerformanceNow() - pausedAt;
    totalDatePaused += realDateNow() - pausedDateAt;
    paused = false;
    for (const record of timers.values()) armTimer(record);
    for (const record of frames.values()) armFrame(record);
  };

  return { setPaused, isPaused: () => paused };
})();

const engine = new VisualNovelEngine();
let isGameRunning = false;
let waitingForInput = false;
let clickHandler = null;
let currentChapterNumber = 0;
let currentChapterName = null;

// Mantener Control acelera el texto y avanza las líneas, como el modo skip de
// una novela visual. Las elecciones y los minijuegos siguen requiriendo input.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Control" || e.repeat || !isGameRunning) return;
  engine.setFastForward(true);
  if (clickHandler) clickHandler();
});

document.addEventListener("keyup", (e) => {
  if (e.key === "Control") engine.setFastForward(e.ctrlKey);
});

window.addEventListener("blur", () => engine.setFastForward(false));

// Capítulos disponibles para el selector de "Cargar" (se cargan dinámicamente)
let AVAILABLE_CHAPTERS = [];
let availableChaptersPromise = null;

// Elementos del DOM
const gameContainer = document.getElementById("game-container");
const mainMenu = document.getElementById("main-menu");
const startBtn = document.getElementById("start-btn");
const loadBtn = document.getElementById("load-btn");
const dialogBox = document.getElementById("dialog-box");
const gameArea = document.querySelector("#game-container > :not(#main-menu)");

function setMainMenuVisible(visible) {
  mainMenu.classList.toggle("hidden", !visible);
  mainMenu.toggleAttribute("inert", !visible);

  if (visible) {
    mainMenu.removeAttribute("aria-hidden");
  } else {
    mainMenu.setAttribute("aria-hidden", "true");
  }
}

// Event listeners del menú
startBtn.addEventListener("click", () => startNewGame());
loadBtn.addEventListener("click", () => loadGame());
document.getElementById("settings-btn")?.addEventListener("click", () => showSettingsPanel());

// "Salir" solo existe en la app de escritorio. El navegador no permite cerrar
// de forma fiable una pestaña que no ha abierto mediante script.
const quitBtn = document.getElementById("quit-btn");
if (window.desktopApp?.quit) {
  quitBtn?.addEventListener("click", () => window.desktopApp.quit());
}

// Elegir cualquier OTRA opción del menú cierra la Configuración. El panel es una
// caja centrada, no tapa el menú, así que sin esto se quedaba flotando encima
// del selector de capítulos o de la partida recién empezada.
// Va en el <nav> en vez de en cada botón para que valga también para las
// opciones que se añadan más adelante.
document.querySelector(".nm-nav")?.addEventListener("click", (e) => {
  const opcion = e.target.closest(".nm-item");
  if (!opcion || opcion.id === "settings-btn") return;
  document.getElementById("settings-panel")?.remove();
});

// ===== Retroceder a la escena anterior (demo 25-jul-2026) =====
// El bucle de juego está casi siempre parado dentro de waitForClick(), así que
// el botón no puede limitarse a cambiar el estado: además tiene que desbloquear
// esa espera. Se marca la petición y se resuelve el clic pendiente a mano; el
// bucle la atiende al dar la vuelta.
let rewindRequested = false;
let rewindWatcher = null;
const rewindBtn = document.getElementById("rewind-btn");

rewindBtn?.addEventListener("click", (e) => {
  // Que el clic no llegue a document: si no, contaría como "avanzar diálogo"
  e.preventDefault();
  e.stopPropagation();
  if (!isGameRunning || !engine.canRewind()) return;
  rewindRequested = true;
  desbloquearBucle(() => rewindRequested);
});

// Desbloquea el bucle para que atienda una petición (retroceder o ir a una
// escena). Casi siempre está parado en waitForClick() y basta con resolverlo.
//
// Pero justo al entrar en una escena puede pasarse varios segundos SIN estar
// parado: primero encadena las acciones de la primera línea (fundidos, esperas,
// cambios de fondo) y luego escribe el diálogo letra a letra, que con
// textSpeed "slow" son otros cuantos segundos. Medido: 4,5 s en la Escena 5 del
// capítulo 3. En ese rato no existe clickHandler, y con un margen corto la
// petición se perdía: se quedaba encolada hasta el siguiente clic del jugador y
// daba la sensación de que el menú "no funcionaba" en algunas escenas.
// Por eso además se lanza un clic de verdad, que es lo que adelanta el tecleo
// (el skipHandler de displayDialog). Si no hay nada escribiéndose no hace nada,
// y el salto se atiende en cuanto el bucle llega a waitForClick.
let tokenPeticion = 0;
function desbloquearBucle(sigueHaciendoFalta) {
  // Cada petición apaga la cadena de reintentos de la anterior. Si no, dos
  // peticiones seguidas (dos clics rápidos en el menú) dejan dos cadenas vivas
  // y la vieja sigue desbloqueando el bucle: se cuelan avances de línea.
  const mio = ++tokenPeticion;
  let intentos = 0;
  const tirar = () => {
    if (mio !== tokenPeticion) return;
    if (!sigueHaciendoFalta()) return;
    // Se comprueba en CADA intento, no solo al pulsar: la elección puede
    // aparecer un instante después (la línea todavía estaba escribiéndose), y
    // entonces el bucle se queda esperando respuesta y no lo despierta ningún
    // clic. Una vez abortada, las siguientes llamadas no hacen nada.
    if (engine.hayEleccionAbierta && engine.hayEleccionAbierta()) {
      engine.abortarEleccion();
    }
    // Lo mismo con la pantalla de reintento de un minijuego perdido.
    if (engine.hayRetryAbierto && engine.hayRetryAbierto()) {
      engine.abortarRetry();
    }
    // Y con un minijuego en marcha: sus botones se ven ahora también desde
    // arriba, así que salir de uno es una salida legítima. El bucle está DENTRO
    // de playMinigame y solo lo suelta el aborto.
    if (engine.hayMinijuegoAbierto && engine.hayMinijuegoAbierto()) {
      engine.abortarMinijuego();
    }
    if (clickHandler) { clickHandler(); return; }
    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    if (++intentos < 120) { setTimeout(tirar, 150); return; } // hasta 18 s
    // Se agotó. Se DESCARTA la petición; si se dejara puesta, saltaría sola más
    // tarde, en mitad de otra cosa, borrando el escenario.
    sceneJumpRequested = null;
    rewindRequested = false;
    exitToMenuRequested = false;
  };
  tirar();
}

// Los botones de arriba se ven también durante los minijuegos: atascarse en uno
// era la única forma de quedarse encerrado sin salida que no fuera ganarlo. Al
// pulsarlos, el motor aborta el minijuego (engine.abortarMinijuego).
//
// La excepción es la CUTSCENE: es un vídeo que ya se salta con un clic o con
// Esc, y unos controles encima solo estorbarían.
function cutsceneEnMarcha() {
  return !!document.querySelector(".cutscene-overlay");
}

function updateRewindButton() {
  if (!rewindBtn) return;
  const hayElecciones = !!document.querySelector("#choices-container.active");
  const visible =
    isGameRunning && engine.canRewind() && !cutsceneEnMarcha() && !hayElecciones;
  rewindBtn.classList.toggle("hidden", !visible);
}

function startRewindWatcher() {
  stopRewindWatcher();
  rewindWatcher = setInterval(() => {
    updateRewindButton();
    updateScenesButton();
    updateOptionsButton();
  }, 200);
}

function stopRewindWatcher() {
  if (rewindWatcher) clearInterval(rewindWatcher);
  rewindWatcher = null;
  rewindBtn?.classList.add("hidden");
  scenesBtn?.classList.add("hidden");
  optionsBtn?.classList.add("hidden");
  cerrarMenuEscenas();
}

// El botón de opciones sigue la misma regla que los otros dos: solo se esconde
// durante una cutscene, donde Esc es del vídeo.
function updateOptionsButton() {
  if (!optionsBtn) return;
  const visible = isGameRunning && !cutsceneEnMarcha();
  optionsBtn.classList.toggle("hidden", !visible);
  if (!visible) cerrarMenuPausa();
}

// ===== Menú de escenas =====
// Igual que el de retroceder: el bucle está parado dentro de waitForClick(),
// así que se apunta la escena pedida y se resuelve el clic pendiente a mano.
let sceneJumpRequested = null;
const scenesBtn = document.getElementById("scenes-btn");
const scenesMenu = document.getElementById("scenes-menu");
const scenesList = document.getElementById("scenes-list");
const scenesChapter = document.getElementById("scenes-chapter");

// El menú de escenas SÍ se ofrece durante una elección: es navegación, y si no
// el jugador se queda encerrado en la pantalla de elección sin poder ir a otra
// escena (el bucle está esperando respuesta). Al saltar se aborta la elección.
// Y lo mismo durante un minijuego, por el mismo motivo: el bucle está dentro
// del minijuego y saltar de escena lo aborta.
function updateScenesButton() {
  if (!scenesBtn) return;
  const visible = isGameRunning && engine.sceneList().length > 1 && !cutsceneEnMarcha();
  scenesBtn.classList.toggle("hidden", !visible);
  if (!visible) cerrarMenuEscenas();
}

function cerrarMenuEscenas() {
  scenesMenu?.classList.add("hidden");
}

function abrirMenuEscenas() {
  if (!scenesMenu || !scenesList) return;
  const escenas = engine.sceneList();
  if (!escenas.length) return;
  scenesChapter.textContent = engine.chapterTitle();
  scenesList.innerHTML = "";
  escenas.forEach((e) => {
    const li = document.createElement("li");
    li.className =
      "scenes-item" +
      (e.actual ? " actual" : "") +
      (e.visitada && !e.actual ? " visitada" : "");
    li.innerHTML =
      '<span class="scenes-num">' +
      (e.index + 1) +
      '</span><span class="scenes-title"></span>';
    li.querySelector(".scenes-title").textContent = e.title;
    li.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      cerrarMenuEscenas();
      if (e.actual) return;
      sceneJumpRequested = e.index;
      // Si hay una elección esperando respuesta, el bucle está parado ahí y no
      // en waitForClick: se aborta para que pueda atender el salto.
      if (engine.hayEleccionAbierta && engine.hayEleccionAbierta()) {
        engine.abortarEleccion();
      }
      desbloquearBucle(() => sceneJumpRequested !== null);
    });
    scenesList.appendChild(li);
  });
  scenesMenu.classList.remove("hidden");
  const activo = scenesList.querySelector(".actual");
  if (activo) {
    // `scrollIntoView()` también desplaza los ancestros con overflow (incluido
    // el escenario en algunos tamaños de Chrome), dejando el juego recortado
    // por arriba. Movemos únicamente la lista interna del selector.
    const centroActivo =
      activo.offsetTop - scenesList.offsetTop + activo.offsetHeight / 2;
    scenesList.scrollTop = Math.max(
      0,
      centroActivo - scenesList.clientHeight / 2,
    );
  }
}

scenesBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!isGameRunning) return;
  if (scenesMenu?.classList.contains("hidden")) abrirMenuEscenas();
  else cerrarMenuEscenas();
});

document.getElementById("scenes-close")?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  cerrarMenuEscenas();
});

// Clic en el fondo oscuro: cerrar sin que el clic avance el diálogo
scenesMenu?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.target === scenesMenu) cerrarMenuEscenas();
});

// ===== Configuración: volúmenes, extras (persistentes) =====
// La clave la define battle-minigame.js, que es quien lee el ajuste al montar
// el combate; aquí solo se pinta la casilla.
const KOSAI_SETTING_KEY = window.BattleMinigame?.KOSAI_SETTING_KEY || "illo_kosai";
const BLIP_SETTING_KEY = "illo_text_blip";
const TEXT_SPEED_SETTING_KEY = "illo_text_speed";
const TEXT_SPEED_OPTIONS = [
  { label: "Muy lento", delay: 100 },
  { label: "Lento", delay: 70 },
  { label: "Normal", delay: 50 },
  { label: "Rápido", delay: 30 },
  { label: "Muy rápido", delay: 15 },
  { label: "Instantáneo", delay: 0 },
];

function storedTextSpeed() {
  const stored = Number.parseInt(localStorage.getItem(TEXT_SPEED_SETTING_KEY), 10);
  return Number.isInteger(stored) && stored >= 0 && stored < TEXT_SPEED_OPTIONS.length
    ? stored
    : 2;
}

function applyTextSpeed(index) {
  const parsed = Number.parseInt(index, 10);
  const normalized = Number.isInteger(parsed)
    && parsed >= 0
    && parsed < TEXT_SPEED_OPTIONS.length
    ? parsed
    : 2;
  engine.textSpeedPreset = normalized;
  engine.typingSpeed = TEXT_SPEED_OPTIONS[normalized].delay;
  return normalized;
}

applyTextSpeed(storedTextSpeed());

// En la app de escritorio el localStorage se pierde en cada arranque (el
// servidor interno cambia de puerto, y con él de origen), así que el ajuste se
// copia además a la carpeta de datos de la app, que es quien lo devuelve al
// abrir. En el navegador `desktopApp` no existe y basta con el localStorage.
function saveSetting(key, value) {
  localStorage.setItem(key, value);
  window.desktopApp?.setSetting?.(key, value);
}

// Modo de ventana: solo tiene sentido en la app de escritorio, donde el proceso
// principal es quien la pone a pantalla completa. En el navegador ya manda F11.
const WINDOW_MODE_KEY = "illo_window_mode";
const hayOpcionesDeVideo = !!window.desktopApp;

function windowModeActual() {
  return localStorage.getItem(WINDOW_MODE_KEY) === "window" ? "window" : "fullscreen";
}

// Los mismos ajustes salen en dos sitios: en Configuración (menú principal) y
// en el menú de pausa (Esc durante la partida). Se generan y se conectan aquí
// una sola vez para que no se dupliquen ni se desincronicen.
//
// Van repartidos en pestañas (Juego, Vídeo, Sonido, Trucos). Juego siempre va
// primero; Vídeo se cae entera en el navegador porque allí no hay modo de
// ventana que configurar.
function settingsMarkup() {
  const volOf = (k, def) => {
    const v = parseFloat(localStorage.getItem(k));
    return isNaN(v) ? def : Math.round(v * 100);
  };
  const kosaiOn = localStorage.getItem(KOSAI_SETTING_KEY) === "1";
  const blipsOn = localStorage.getItem(BLIP_SETTING_KEY) !== "0";
  const textSpeed = storedTextSpeed();
  const modo = windowModeActual();

  const grupos = [{
    id: "juego",
    titulo: "Juego",
    icono: "assets/images/ui/settings/game-neon.png",
    contenido: `
            <div class="nm-setting-block nm-text-speed-setting">
                <label class="nm-setting-row nm-text-speed-row">
                    <span>Velocidad de texto</span>
                    <input type="range" class="opt-text-speed" min="0" max="5" step="1"
                           value="${textSpeed}" aria-label="Velocidad de texto">
                    <output class="nm-setting-val nm-text-speed-value"></output>
                </label>
                <div class="nm-text-speed-scale" aria-hidden="true">
                    ${TEXT_SPEED_OPTIONS.map((option, index) =>
                      `<span data-speed-step="${index}">${option.label}</span>`).join("")}
                </div>
                <div class="nm-text-speed-preview">
                    <span class="nm-text-speed-preview-label">Vista previa</span>
                    <p class="opt-text-speed-preview"></p>
                </div>
            </div>`,
  }];
  if (hayOpcionesDeVideo) {
    grupos.push({
      id: "video",
      titulo: "Vídeo",
      icono: "assets/images/ui/settings/video-neon.png",
      // Dos botones en vez de un <select>: la lista que despliega un select la
      // dibuja el sistema, sale clara sobre el panel oscuro y no hay CSS que la
      // alcance. Así además va a juego con las pestañas.
      contenido: `
            <div class="nm-setting-block">
                <span class="nm-setting-label" id="nm-window-mode-label">Modo de ventana</span>
                <div class="nm-segmented opt-window-mode" role="radiogroup" aria-labelledby="nm-window-mode-label">
                    <button type="button" class="nm-seg${modo === "fullscreen" ? " is-active" : ""}"
                            role="radio" aria-checked="${modo === "fullscreen"}" data-mode="fullscreen">Pantalla completa</button>
                    <button type="button" class="nm-seg${modo === "window" ? " is-active" : ""}"
                            role="radio" aria-checked="${modo === "window"}" data-mode="window">Ventana</button>
                </div>
                <p class="nm-setting-hint">También se cambia en cualquier momento con F11.</p>
            </div>`,
    });
  }
  grupos.push({
    id: "sonido",
    titulo: "Sonido",
    icono: "assets/images/ui/settings/sound-neon.png",
    contenido: `
            <label class="nm-setting-row">Música
                <input type="range" class="opt-vol-music" min="0" max="100" value="${volOf("illo_vol_music", 100)}">
                <span class="nm-setting-val"></span>
            </label>
            <label class="nm-setting-row">Efectos
                <input type="range" class="opt-vol-sfx" min="0" max="100" value="${volOf("illo_vol_sfx", 100)}">
                <span class="nm-setting-val"></span>
            </label>
            <div class="nm-setting-toggle">
                <label class="nm-setting-row">Blips de texto
                    <input type="checkbox" class="opt-blips" ${blipsOn ? "checked" : ""}>
                </label>
                <p class="nm-setting-hint">Reproduce un sonido breve mientras aparece cada letra del diálogo.</p>
            </div>`,
  });
  grupos.push({
    id: "trucos",
    titulo: "Trucos",
    icono: "assets/images/ui/settings/cheats-neon.png",
    contenido: `
            <div class="nm-setting-toggle">
                <label class="nm-setting-row">Ataque Kosai
                    <input type="checkbox" class="opt-kosai" ${kosaiOn ? "checked" : ""}>
                </label>
                <p class="nm-setting-hint">Añade a todo el equipo un golpe que deja al objetivo a 0 PV en los combates por turnos.</p>
            </div>`,
  });

  const pestanas = grupos
    .map(
      (g, i) => `
            <button type="button" class="nm-tab${i === 0 ? " is-active" : ""}" role="tab"
                    aria-selected="${i === 0}" aria-controls="nm-pane-${g.id}" data-tab="${g.id}">
                <img class="nm-tab-icon" src="${g.icono}" alt="" aria-hidden="true">
                <span>${g.titulo}</span>
            </button>`,
    )
    .join("");

  const paneles = grupos
    .map(
      (g, i) => `
            <div class="nm-tab-pane${i === 0 ? " is-active" : ""}" role="tabpanel"
                 id="nm-pane-${g.id}" data-pane="${g.id}">${g.contenido}
            </div>`,
    )
    .join("");

  return `
        <div class="nm-settings">
            <div class="nm-tabs" role="tablist">${pestanas}</div>
            <div class="nm-tab-panes">${paneles}</div>
        </div>
  `;
}

function wireSettings(panel) {
  const tabs = [...panel.querySelectorAll(".nm-tab")];
  const panes = [...panel.querySelectorAll(".nm-tab-pane")];
  const activar = (id) => {
    tabs.forEach((t) => {
      const activa = t.dataset.tab === id;
      t.classList.toggle("is-active", activa);
      t.setAttribute("aria-selected", String(activa));
    });
    panes.forEach((p) => p.classList.toggle("is-active", p.dataset.pane === id));
  };
  tabs.forEach((tab) => tab.addEventListener("click", () => activar(tab.dataset.tab)));

  const wire = (selector, storeKey) => {
    const slider = panel.querySelector(selector);
    const label = slider.parentElement.querySelector(".nm-setting-val");
    const paint = () => { label.textContent = slider.value + "%"; };
    paint();
    slider.addEventListener("input", () => {
      saveSetting(storeKey, String(slider.value / 100));
      paint();
      engine.applyVolumeSettings();
    });
  };
  wire(".opt-vol-music", "illo_vol_music");
  wire(".opt-vol-sfx", "illo_vol_sfx");

  const textSpeedSlider = panel.querySelector(".opt-text-speed");
  const textSpeedValue = panel.querySelector(".nm-text-speed-value");
  const textSpeedPreview = panel.querySelector(".opt-text-speed-preview");
  const textSpeedSteps = [...panel.querySelectorAll("[data-speed-step]")];
  const previewText = "Así aparecerá el texto durante la partida.";
  let previewTimer = null;
  let previewRun = 0;

  const paintTextSpeed = () => {
    const index = applyTextSpeed(textSpeedSlider.value);
    const option = TEXT_SPEED_OPTIONS[index];
    textSpeedValue.textContent = option.label;
    textSpeedSlider.setAttribute("aria-valuetext", option.label);
    textSpeedSteps.forEach((step) => {
      step.classList.toggle("is-active", Number(step.dataset.speedStep) === index);
    });
    return option;
  };

  const playTextPreview = () => {
    const option = paintTextSpeed();
    const run = ++previewRun;
    if (previewTimer !== null) clearTimeout(previewTimer);
    textSpeedPreview.textContent = "";

    if (option.delay === 0) {
      textSpeedPreview.textContent = previewText;
      return;
    }

    const chars = Array.from(previewText);
    let index = 0;
    const typeNext = () => {
      if (run !== previewRun || !textSpeedPreview.isConnected) return;
      const character = chars[index++];
      textSpeedPreview.textContent += character;
      if (index >= chars.length) return;
      const punctuation = ".!?…".includes(character)
        ? 240
        : ",;:—".includes(character) ? 90 : 0;
      previewTimer = setTimeout(
        typeNext,
        option.delay + punctuation * (option.delay / 50),
      );
    };
    typeNext();
  };

  textSpeedSlider.addEventListener("input", () => {
    playTextPreview();
    saveSetting(TEXT_SPEED_SETTING_KEY, String(engine.textSpeedPreset));
  });
  // En el menú de pausa, wireSettings() se ejecuta justo antes de activar el
  // reloj pausado. La microtarea hace que la demo use los timers vivos del panel.
  queueMicrotask(playTextPreview);

  // Se puede tocar en mitad de un combate (menú de pausa): el golpe aparece o
  // desaparece de la lista de habilidades al momento, sin esperar al siguiente.
  const kosai = panel.querySelector(".opt-kosai");
  kosai.addEventListener("change", () => {
    saveSetting(KOSAI_SETTING_KEY, kosai.checked ? "1" : "0");
    window.BattleMinigame?.setKosaiEnabled?.(kosai.checked);
  });

  const blips = panel.querySelector(".opt-blips");
  blips.addEventListener("change", () => {
    saveSetting(BLIP_SETTING_KEY, blips.checked ? "1" : "0");
  });

  // Modo de ventana: lo aplica el proceso principal al recibir el ajuste. Y al
  // revés, si se cambia con F11 con el panel abierto, los botones se enteran.
  const grupoModo = panel.querySelector(".opt-window-mode");
  if (!grupoModo) return;
  const botonesModo = [...grupoModo.querySelectorAll(".nm-seg")];
  const pintarModo = (valor) => {
    botonesModo.forEach((b) => {
      const activo = b.dataset.mode === valor;
      b.classList.toggle("is-active", activo);
      b.setAttribute("aria-checked", String(activo));
    });
  };
  botonesModo.forEach((boton) => {
    boton.addEventListener("click", () => {
      pintarModo(boton.dataset.mode);
      saveSetting(WINDOW_MODE_KEY, boton.dataset.mode);
    });
  });
  const dejarDeEscuchar = window.desktopApp?.onSettingChanged?.((key, value) => {
    // El panel se cierra con remove(), así que no hay un sitio donde darse de
    // baja: se hace aquí, la primera vez que llega un aviso sin panel delante.
    if (!grupoModo.isConnected) return dejarDeEscuchar?.();
    if (key === WINDOW_MODE_KEY) pintarModo(value);
  });
}

// Configuración se abre igual que Capítulos: pantalla completa con el fondo
// difuminado detrás y el menú principal retirado, no como una cajita encima.
// De ahí que comparta las clases `chapter-selector*`; lo propio de este panel
// (ancho, sin lista que desplazar) va en `.settings-selector-panel`.
function showSettingsPanel() {
  if (document.getElementById("settings-panel")) return; // ya abierto

  mainMenu.classList.add("hidden");

  const selector = document.createElement("div");
  selector.id = "settings-panel";
  selector.className = "chapter-selector settings-selector";
  selector.innerHTML = `
        <div class="chapter-selector-panel settings-selector-panel">
            <h2 class="chapter-selector-title">Configuración</h2>
            ${settingsMarkup()}
            <button class="chapter-selector-back" id="settings-close">Volver</button>
        </div>
    `;

  document.getElementById("game-container").appendChild(selector);
  wireSettings(selector);

  selector.querySelector("#settings-close").addEventListener("click", () => {
    selector.remove();
    mainMenu.classList.remove("hidden");
  });
}

// ===== Menú de pausa (Esc o el botón de arriba a la izquierda) =====
// Lleva los mismos ajustes que Configuración más la salida al menú principal.
let exitToMenuRequested = false;
const optionsBtn = document.getElementById("options-btn");
let mediaPausedByGame = [];
let audioContextsPausedByGame = [];

function menuPausaAbierto() {
  return !!document.getElementById("pause-menu");
}

// La pausa congela la partida, pero el menú de Opciones no debe cortar su
// banda sonora. Se identifica por la carpeta de música para no dejar vivos
// también efectos en bucle (motores, ambiente, etc.).
function esPistaMusical(media) {
  if (!media) return false;
  const source = String(media._srcPath || media.currentSrc || media.src || "")
    .replaceAll("\\", "/");
  return /(?:^|\/)(?:audio|sounds)\/music\//i.test(source);
}

function setGamePaused(paused) {
  const shouldPause = !!paused;
  if (shouldPause === gamePauseClock.isPaused()) return;

  if (shouldPause) {
    engine.setFastForward(false);
    mediaPausedByGame = [];
    const candidates = new Set([
      ...document.querySelectorAll("audio, video"),
      ...gamePauseMedia.audios,
      engine.currentMusic,
      ...Object.values(engine.audioInstances || {}),
    ]);
    candidates.forEach((media) => {
      if (!media || media.paused || media.ended || esPistaMusical(media)) return;
      mediaPausedByGame.push(media);
      try { media.pause(); } catch (_) {}
    });
    audioContextsPausedByGame = [];
    gamePauseMedia.contexts.forEach((context) => {
      if (!context || context.state !== "running") return;
      audioContextsPausedByGame.push(context);
      try { context.suspend(); } catch (_) {}
    });
  }

  document.body.classList.toggle("game-paused", shouldPause);
  gamePauseClock.setPaused(shouldPause);
  window.dispatchEvent(new CustomEvent("illo:pausechange", {
    detail: { paused: shouldPause },
  }));

  if (!shouldPause) {
    const toResume = mediaPausedByGame;
    mediaPausedByGame = [];
    toResume.forEach((media) => {
      if (!media || media.ended || media._stopping) return;
      try { media.play().catch(() => {}); } catch (_) {}
    });
    const contextsToResume = audioContextsPausedByGame;
    audioContextsPausedByGame = [];
    contextsToResume.forEach((context) => {
      if (!context || context.state === "closed") return;
      try { context.resume(); } catch (_) {}
    });
  }
}

function cerrarMenuPausa() {
  document.getElementById("pause-menu")?.remove();
  setGamePaused(false);
}

function abrirMenuPausa() {
  if (menuPausaAbierto() || !isGameRunning || cutsceneEnMarcha()) return;

  const overlay = document.createElement("div");
  overlay.id = "pause-menu";
  overlay.className = "pause-menu";
  overlay.innerHTML = `
        <div class="nm-modal pause-panel">
            <h2 class="nm-modal-title">Opciones</h2>
            ${settingsMarkup()}
            <div class="nm-modal-buttons pause-buttons">
                <button id="pause-resume">Continuar</button>
                <button id="pause-exit" class="pause-exit">Menú principal</button>
            </div>
        </div>
    `;
  document.getElementById("game-container").appendChild(overlay);
  wireSettings(overlay);
  setGamePaused(true);

  // El juego avanza el diálogo con cualquier clic en document: sin esto, tocar
  // un deslizador o el propio panel pasaría de línea por detrás.
  overlay.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.target === overlay) cerrarMenuPausa(); // clic fuera del panel = cerrar
  });

  overlay.querySelector("#pause-resume").addEventListener("click", cerrarMenuPausa);
  overlay.querySelector("#pause-exit").addEventListener("click", () => {
    cerrarMenuPausa();
    salirAlMenuPrincipal();
  });
}

// El bucle de juego casi siempre está parado dentro de waitForClick(), así que
// no basta con bajar la bandera: hay que despertarlo igual que hacen los
// botones de retroceder y de escenas. playGame() atiende la petición y sale.
function salirAlMenuPrincipal() {
  if (!isGameRunning) return;
  // Si se sale desde la pausa con el HUD oculto, hay que despertar primero el
  // typewriter: el clic sintético que libera playGame también está bloqueado
  // mientras `hud-hidden` siga activo.
  mostrarHUD();
  exitToMenuRequested = true;
  desbloquearBucle(() => exitToMenuRequested);
}

function targetPermiteInputEnPausa(target) {
  return target instanceof Element && !!target.closest("#pause-menu");
}

function bloquearInputDurantePausa(e) {
  if (!gamePauseClock.isPaused() || targetPermiteInputEnPausa(e.target)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
}

function alternarHUD() {
  const oculto = document.body.classList.toggle("hud-hidden");
  // El motor conserva el grafema y la pausa de puntuación pendientes. También
  // suelta el avance automático para que no termine la línea a escondidas.
  engine.setTextPaused(oculto);
}

function hudOculto() {
  return document.body.classList.contains("hud-hidden");
}

// Al terminar la partida el HUD vuelve siempre: dejarlo oculto arrastraría el
// bloqueo de input al menú o al capítulo siguiente.
function mostrarHUD() {
  document.body.classList.remove("hud-hidden");
  engine.setTextPaused(false);
}

// Con el HUD escondido no se ve el bocadillo, así que cualquier input solo
// serviría para pasar líneas a ciegas: mientras esté oculto, la historia no
// avanza. Se dejan pasar el menú de pausa y las elecciones (que siguen a la
// vista) y los minijuegos, que llevan su propio ritmo y no son "avanzar".
function inputBloqueadoPorHUD(target) {
  if (!isGameRunning || !hudOculto() || cutsceneEnMarcha()) return false;
  if (engine.hayMinijuegoAbierto?.()) return false;
  if (target instanceof Element && target.closest("#pause-menu, #choices-container")) return false;
  return true;
}

function bloquearInputConHUDOculto(e) {
  // El botón secundario es justo el que devuelve el HUD: nunca se bloquea.
  if (e.button === 2 || !inputBloqueadoPorHUD(e.target)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
}

function puedeAvanzarDialogo() {
  if (!isGameRunning || gamePauseClock.isPaused() || cutsceneEnMarcha()) return false;
  if (hudOculto()) return false;
  if (!dialogBox?.classList.contains("active")) return false;
  if (document.querySelector("#choices-container.active")) return false;
  if (engine.hayMinijuegoAbierto?.()) return false;
  return true;
}

function avanzarDialogo() {
  if (!puedeAvanzarDialogo()) return;
  // Reutiliza exactamente la ruta del clic izquierdo: durante el tecleo lo
  // completa y, durante la espera, avanza una sola línea.
  document.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));
}

// Captura antes que los controles particulares de los minijuegos: Esc abre una
// sola pausa global y, mientras está activa, ninguna tecla o clic se filtra al
// juego que ha quedado debajo del panel.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // Durante una cutscene, Esc sigue siendo suyo: salta el vídeo.
    if (!isGameRunning || cutsceneEnMarcha()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (menuPausaAbierto()) cerrarMenuPausa();
    else abrirMenuPausa();
    return;
  }

  if (gamePauseClock.isPaused()) {
    if (!targetPermiteInputEnPausa(e.target)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    return;
  }

  if (!isGameRunning) return;
  if (!e.repeat && e.key.toLowerCase() === "h") {
    e.preventDefault();
    e.stopImmediatePropagation();
    alternarHUD();
    return;
  }
  // H es la única tecla que sigue viva con el HUD oculto (además de Esc, que ya
  // se ha atendido arriba): ni Control acelera ni Espacio pasa de línea.
  if (inputBloqueadoPorHUD(e.target)) {
    e.preventDefault();
    e.stopImmediatePropagation();
    return;
  }
  if (e.repeat) return;
  if ((e.key === " " || e.key === "Enter") && puedeAvanzarDialogo()) {
    e.preventDefault();
    e.stopImmediatePropagation();
    avanzarDialogo();
  }
}, true);

document.addEventListener("keyup", bloquearInputDurantePausa, true);
["pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick", "wheel", "touchstart", "touchend"]
  .forEach((type) => {
    document.addEventListener(type, bloquearInputDurantePausa, true);
    document.addEventListener(type, bloquearInputConHUDOculto, true);
  });
document.addEventListener("keyup", bloquearInputConHUDOculto, true);

// El clic secundario no debe activar disparos/impulsos antes de que llegue su
// evento contextmenu: queda reservado por completo para alternar el HUD.
["pointerdown", "pointerup", "mousedown", "mouseup", "click", "auxclick"].forEach((type) => {
  document.addEventListener(type, (e) => {
    if (!isGameRunning || cutsceneEnMarcha() || e.button !== 2) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
});

document.addEventListener("contextmenu", (e) => {
  if (!isGameRunning || cutsceneEnMarcha()) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if (!gamePauseClock.isPaused()) alternarHUD();
}, true);

optionsBtn?.addEventListener("click", (e) => {
  // Que el clic no llegue a document: contaría como "avanzar diálogo"
  e.preventDefault();
  e.stopPropagation();
  if (menuPausaAbierto()) cerrarMenuPausa();
  else abrirMenuPausa();
});

// ===== Arranque: disclaimer -> opening de Samu -> menú principal =====
// El navegador exige un gesto del usuario para autorizar audio. El disclaimer
// convierte ese requisito en parte explícita del arranque y permite que el
// opening reproduzca su pista AAC desde el primer fotograma.
const startupOverlay = document.getElementById("startup-overlay");
const startupDisclaimer = document.getElementById("startup-disclaimer");
const startupOpening = document.getElementById("startup-opening");
const startupOpeningVideo = document.getElementById("startup-opening-video");
const startupOpeningStatus = document.getElementById("startup-opening-status");
const startupEnterBtn = document.getElementById("startup-enter");
const startupSkipBtn = document.getElementById("startup-skip");
let startupFinished = false;
let startupStarted = false;

function fitStartupOpeningToViewport() {
  if (!startupOverlay || !startupOpeningVideo) return;

  // Usar píxeles explícitos conserva la corrección del primer frame pequeño en
  // Electron, pero tomando ahora la ventana real en vez del escenario 1280x720.
  const overlayRect = startupOverlay.getBoundingClientRect();
  const width = Math.max(1, Math.round(overlayRect.width || window.innerWidth));
  const height = Math.max(1, Math.round(overlayRect.height || window.innerHeight));
  startupOpeningVideo.style.width = `${width}px`;
  startupOpeningVideo.style.height = `${height}px`;
}

function storedMusicVolume() {
  const value = parseFloat(localStorage.getItem("illo_vol_music"));
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
}

function audibleStartupVolume() {
  const stored = storedMusicVolume();
  if (stored > 0) return stored;

  // El gesto dice explícitamente «Entrar con sonido». Si una sesión anterior
  // dejó la música totalmente silenciada, recuperamos un nivel audible y seguro
  // tanto para el opening como para el menú que viene después.
  const restored = 0.7;
  saveSetting("illo_vol_music", String(restored));
  engine.applyVolumeSettings?.();
  return restored;
}

function showMainMenuAfterOpening() {
  if (startupFinished) return;
  startupFinished = true;
  window.removeEventListener("resize", fitStartupOpeningToViewport);
  try { startupOpeningVideo.pause(); } catch (error) {}
  startupOverlay?.classList.add("is-leaving");

  setTimeout(() => {
    document.body.classList.remove("startup-pending");
    startupOverlay?.remove();
    setMainMenuVisible(true);
    showMenuMedia(false);
    playMenuTheme();
  }, 560);
}

function startStartupOpening() {
  if (startupStarted || startupFinished) return;
  startupStarted = true;
  menuAudioUnlocked = true;
  startupDisclaimer.hidden = true;
  // El vídeo permanece oculto hasta que Electron ha creado y dimensionado su
  // superficie de compositor. Sin esto, la versión empaquetada podía enseñar
  // brevemente el primer frame a 640x360 dentro de la ventana 1280x720.
  startupOpening.classList.remove("is-playing");
  startupOpening.hidden = false;
  fitStartupOpeningToViewport();
  startupOpeningStatus.textContent = "Cargando opening…";
  startupOpeningVideo.muted = false;
  startupOpeningVideo.volume = audibleStartupVolume();
  startupOpeningVideo.currentTime = 0;

  // Fuerza el layout a las dimensiones reales después de retirar [hidden] y
  // antes de solicitar reproducción. Así el compositor no llega a presentar
  // ni el antiguo 640x360 de Electron ni un rectángulo fijo 1280x720 en web.
  void startupOpeningVideo.getBoundingClientRect();

  const playback = startupOpeningVideo.play();
  if (playback && playback.catch) {
    playback.catch(() => {
      startupOpeningStatus.textContent =
        "No se pudo reproducir el opening. Pulsa «Saltar opening» para continuar.";
    });
  }
}

function setupStartupSequence() {
  if (!startupOverlay || !startupOpeningVideo || !startupEnterBtn) {
    document.body.classList.remove("startup-pending");
    setMainMenuVisible(true);
    showMenuMedia(false);
    return;
  }

  menuVideoEls().forEach(video => {
    try { video.pause(); } catch (error) {}
  });

  fitStartupOpeningToViewport();
  window.addEventListener("resize", fitStartupOpeningToViewport);
  startupEnterBtn.addEventListener("click", startStartupOpening);
  startupSkipBtn?.addEventListener("click", showMainMenuAfterOpening);
  startupOpeningVideo.addEventListener("playing", () => {
    // Dos frames dan tiempo a Chromium/Electron para presentar la superficie de
    // vídeo con su tamaño definitivo. Hasta entonces se ve el fondo negro y el
    // estado de carga, nunca una copia encogida del opening.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!startupFinished && !startupOpeningVideo.paused) {
          startupOpening.classList.add("is-playing");
        }
      });
    });
  });
  startupOpeningVideo.addEventListener("ended", showMainMenuAfterOpening);
  startupOpeningVideo.addEventListener("error", () => {
    startupOpeningStatus.textContent =
      "No se ha podido cargar el opening. Pulsa «Saltar opening» para continuar.";
  });
  startupEnterBtn.focus();
}

// ===== Menú principal: vídeo de fondo + tema "Más de lo que ven tus ojos" =====
// Tras el opening, el vídeo del menú arranca en bucle y silenciado. Su música
// usa el gesto ya realizado en el disclaimer, por lo que no vuelve a pedir clic.
const MENU_MUSIC_SRC = "assets/audio/music/menu/tema_menu.mp3"; // alternativa: tema_menu_v2.mp3
const MENU_AMBIENCE_SRC = "assets/audio/music/menu/ambiente_menu.mp3"; // audio base del vídeo, extraído
const MENU_CHILL_SRC = "assets/audio/music/menu/menu_chill.mp3"; // instrumental chill que releva al tema
const MENU_VIDEO_RATE = 0.5;   // velocidad del vídeo (1 = normal; más bajo = más lento)
const MENU_VIDEO_CROSSFADE_MS = 1200; // solape real entre el final y el inicio del bucle
const MENU_AMBIENCE_VOL = 0.12; // sonido de base (bajito, SIEMPRE a velocidad normal)
const MENU_MUSIC_VOL = 0.5;     // tema principal
const MENU_CHILL_VOL = 0.32;    // el chill va por debajo del tema, como música de sala
let menuAudioUnlocked = false;
let menuVideoActiveIndex = 0;
let menuVideoCrossfading = false;
let menuVideoFrame = 0;
let menuVideoCrossfadeTimer = 0;
let menuVideoStopTimer = 0;
let menuVideoRunId = 0;
const isDesktopApp = !!window.desktopApp;

function menuVideoStackEl() {
  return document.getElementById("menu-video-stack");
}

function menuVideoEls() {
  return [
    document.getElementById("menu-video"),
    document.getElementById("menu-video-overlap"),
  ].filter(Boolean);
}

// El vídeo va SIEMPRE mudo y ralentizado; su sonido de base se reproduce aparte
// (ambiente_menu.mp3) para que no se estire ni cambie de tono al frenar el vídeo.
function applyMenuVideoRate() {
  menuVideoEls().forEach(video => {
    video.muted = true;
    video.playbackRate = MENU_VIDEO_RATE;
  });
}
applyMenuVideoRate();

function menuVideoVisible() {
  const stack = menuVideoStackEl();
  return !!stack &&
    !stack.classList.contains("hidden") &&
    !mainMenu.classList.contains("hidden");
}

function cancelMenuVideoScheduling() {
  if (menuVideoFrame) cancelAnimationFrame(menuVideoFrame);
  if (menuVideoCrossfadeTimer) clearTimeout(menuVideoCrossfadeTimer);
  menuVideoFrame = 0;
  menuVideoCrossfadeTimer = 0;
  menuVideoCrossfading = false;
}

function normalizeMenuVideoLayers(videos = menuVideoEls()) {
  videos.forEach((video, index) => {
    video.classList.remove("is-active", "is-crossfade-in", "is-visible");
    if (index === menuVideoActiveIndex) video.classList.add("is-active");
  });
}

function finishMenuVideoCrossfade(outgoingIndex, incomingIndex, runId) {
  const videos = menuVideoEls();
  const outgoing = videos[outgoingIndex];
  const incoming = videos[incomingIndex];
  if (!outgoing || !incoming || !menuVideoCrossfading || runId !== menuVideoRunId) return;

  try {
    outgoing.pause();
    outgoing.currentTime = 0;
  } catch (error) {}
  menuVideoActiveIndex = incomingIndex;
  menuVideoCrossfading = false;
  menuVideoCrossfadeTimer = 0;
  normalizeMenuVideoLayers(videos);
}

async function crossfadeMenuVideo() {
  const videos = menuVideoEls();
  if (videos.length < 2 || menuVideoCrossfading || !menuVideoVisible()) return;

  const runId = menuVideoRunId;
  const outgoingIndex = menuVideoActiveIndex;
  const incomingIndex = outgoingIndex === 0 ? 1 : 0;
  const outgoing = videos[outgoingIndex];
  const incoming = videos[incomingIndex];
  menuVideoCrossfading = true;

  try {
    incoming.pause();
    incoming.currentTime = 0;
    incoming.muted = true;
    incoming.playbackRate = MENU_VIDEO_RATE;
    incoming.classList.remove("is-active", "is-visible");
    incoming.classList.add("is-crossfade-in");
    await incoming.play();
  } catch (error) {
    if (runId !== menuVideoRunId) {
      try { incoming.pause(); } catch (pauseError) {}
      return;
    }
    // Si la segunda superficie no puede arrancar, reiniciar la activa mantiene
    // el menú operativo aunque se pierda el fundido en esa vuelta concreta.
    menuVideoCrossfading = false;
    normalizeMenuVideoLayers(videos);
    try {
      outgoing.currentTime = 0;
      await outgoing.play();
    } catch (playError) {}
    return;
  }

  if (runId !== menuVideoRunId || !menuVideoVisible()) {
    try { incoming.pause(); } catch (error) {}
    if (runId === menuVideoRunId) {
      menuVideoCrossfading = false;
      normalizeMenuVideoLayers(videos);
    }
    return;
  }

  // Separar estado inicial y final en dos frames garantiza que Chromium cree
  // la transición incluso si la segunda copia ya estaba decodificada en caché.
  void incoming.offsetWidth;
  requestAnimationFrame(() => {
    if (runId !== menuVideoRunId || !menuVideoVisible()) {
      try { incoming.pause(); } catch (error) {}
      if (runId === menuVideoRunId) {
        menuVideoCrossfading = false;
        normalizeMenuVideoLayers(videos);
      }
      return;
    }
    incoming.classList.add("is-visible");
    menuVideoCrossfadeTimer = setTimeout(
      () => finishMenuVideoCrossfade(outgoingIndex, incomingIndex, runId),
      MENU_VIDEO_CROSSFADE_MS + 40,
    );
  });
}

function monitorMenuVideoLoop() {
  if (menuVideoFrame) cancelAnimationFrame(menuVideoFrame);

  const tick = () => {
    menuVideoFrame = 0;
    if (!menuVideoVisible()) return;

    const active = menuVideoEls()[menuVideoActiveIndex];
    if (active && !menuVideoCrossfading && Number.isFinite(active.duration)) {
      const rate = Math.max(0.01, active.playbackRate || MENU_VIDEO_RATE);
      const remainingMs = Math.max(0, (active.duration - active.currentTime) / rate * 1000);
      // El pequeño margen evita que el primer vídeo llegue a su frame final
      // antes de que termine de cubrirlo la copia entrante.
      if (remainingMs <= MENU_VIDEO_CROSSFADE_MS + 160) crossfadeMenuVideo();
    }
    menuVideoFrame = requestAnimationFrame(tick);
  };

  menuVideoFrame = requestAnimationFrame(tick);
}

function startMenuVideoLoop() {
  const stack = menuVideoStackEl();
  const videos = menuVideoEls();
  if (!stack || videos.length === 0) return;

  if (menuVideoStopTimer) clearTimeout(menuVideoStopTimer);
  menuVideoStopTimer = 0;
  cancelMenuVideoScheduling();
  menuVideoRunId += 1;
  stack.classList.remove("hidden");
  stack.style.setProperty("--menu-video-crossfade", `${MENU_VIDEO_CROSSFADE_MS}ms`);
  applyMenuVideoRate();
  normalizeMenuVideoLayers(videos);

  const active = videos[menuVideoActiveIndex];
  const inactive = videos[menuVideoActiveIndex === 0 ? 1 : 0];
  if (inactive) {
    try {
      inactive.pause();
      inactive.currentTime = 0;
    } catch (error) {}
  }
  if (active.ended || (Number.isFinite(active.duration) && active.currentTime >= active.duration - 0.05)) {
    active.currentTime = 0;
  }
  active.play().catch(() => {});
  monitorMenuVideoLoop();
}

function stopMenuVideoLoop() {
  const stack = menuVideoStackEl();
  const videos = menuVideoEls();
  menuVideoRunId += 1;
  cancelMenuVideoScheduling();
  videos.forEach(video => {
    try {
      video.pause();
      video.currentTime = 0;
    } catch (error) {}
  });
  menuVideoActiveIndex = 0;
  normalizeMenuVideoLayers(videos);
  stack?.classList.add("hidden");
}

// DESACTIVADO (jul 2026): el ambiente de base ya no suena en el menú; la capa
// musical queda en manos del tema (una vez) + menu_chill en bucle. Se conserva
// la función por si algún día se quiere recuperar.
function startMenuAmbience() {
  engine.playSound(MENU_AMBIENCE_SRC, { id: "menu_ambience", loop: true, volume: MENU_AMBIENCE_VOL, fadeIn: 900 });
}

// Música chill de relevo: entra cuando termina el tema (o al volver al menú) y
// se aparta cuando el tema vuelve a sonar (botón ♪). Si el mp3 aún no existe,
// falla en silencio y no pasa nada.
function playMenuChill() {
  if (!menuAudioUnlocked) return;
  if (mainMenu.classList.contains("hidden")) return; // solo en el menú
  const audio = engine.playSound(MENU_CHILL_SRC, { id: "menu_chill", loop: true, volume: MENU_CHILL_VOL, fadeIn: 1800 });
  if (audio) audio.onerror = () => { try { engine.stopSound("menu_chill", 0); } catch (err) {} };
}

// El tema del menú suena UNA sola vez (como una intro); al terminar entra la
// música chill de fondo. El botón ♪ permite volver a escucharlo cuando se quiera.
function playMenuTheme() {
  // El tema pertenece al menú y no debe solaparse con la secuencia inicial.
  // showMainMenuAfterOpening marca el arranque como terminado antes de llamarlo.
  if (!startupFinished && document.body.classList.contains("startup-pending")) return;
  if (mainMenu.classList.contains("hidden")) return;

  try { engine.stopSound("menu_chill", 800); } catch (err) {} // el tema manda
  const audio = engine.playSound(MENU_MUSIC_SRC, { id: "menu_music", loop: false, volume: MENU_MUSIC_VOL, fadeIn: 600 });
  const btn = document.getElementById("menu-theme-btn");
  if (btn) btn.classList.add("playing");
  if (audio) {
    audio.onended = () => {
      if (btn) btn.classList.remove("playing");
      playMenuChill(); // relevo suave al acabar la intro
    };
  }
}

function unlockMenuAudio(e) {
  if (menuAudioUnlocked) return;
  // Durante el disclaimer solo su botón debe iniciar el opening. El gesto se
  // reserva para esa pista y no arranca música del menú por debajo del vídeo.
  if (document.body.classList.contains("startup-pending")) {
    if (e && e.target && e.target.closest &&
        e.target.closest("#startup-enter")) menuAudioUnlocked = true;
    return;
  }
  if (mainMenu.classList.contains("hidden")) return; // ya no estamos en el menú
  menuAudioUnlocked = true;
  // Si el primer gesto es justo "Comenzar", no arrancamos nada para un instante
  // (quedaría un chispazo); el gesto ya deja el audio desbloqueado.
  if (e && e.target && e.target.closest && e.target.closest("#start-btn")) return;
  // (ambiente de base desactivado: solo tema + chill)
  // Si el primer gesto es el propio botón ♪, el tema lo lanza su click (evita doble arranque)
  if (e && e.target && e.target.closest && e.target.closest("#menu-theme-btn")) return;
  playMenuTheme();
}
document.addEventListener("pointerdown", unlockMenuAudio, true);
document.addEventListener("keydown", unlockMenuAudio, true);

// Botón ♪: volver a escuchar el tema desde el principio
document.getElementById("menu-theme-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  playMenuTheme();
});

// Electron permite autoplay mediante la política configurada en main.js. En
// navegador se conserva el desbloqueo tras el primer gesto, exigido por este.
if (isDesktopApp) {
  menuAudioUnlocked = true;
}

// Fundir y ocultar el vídeo + sonidos del menú (al empezar a jugar)
function stopMenuMedia() {
  try { engine.stopSound("menu_music", 700); } catch (err) {}
  try { engine.stopSound("menu_ambience", 700); } catch (err) {}
  try { engine.stopSound("menu_chill", 700); } catch (err) {}
  const themeBtn = document.getElementById("menu-theme-btn");
  if (themeBtn) themeBtn.classList.remove("playing");
  const stack = menuVideoStackEl();
  if (stack && !stack.classList.contains("hidden")) {
    if (menuVideoStopTimer) clearTimeout(menuVideoStopTimer);
    menuVideoStopTimer = setTimeout(() => {
      menuVideoStopTimer = 0;
      stopMenuVideoLoop();
    }, 700);
  }
}

// Volver a mostrar el menú con su vídeo y su ambiente (al regresar al menú).
// El tema NO se relanza solo: para volver a oírlo está el botón ♪.
function showMenuMedia(playChillOnReturn = true) {
  startMenuVideoLoop();
  if (menuAudioUnlocked && playChillOnReturn) {
    playMenuChill(); // al volver al menú, el chill acompaña (el tema no se relanza)
  }
}

setupStartupSequence();

// Inicializar
document.addEventListener("DOMContentLoaded", initGame);

async function initGame() {
  console.log("Visual Novel Engine inicializado");
  await ensureAvailableChapters();
}

function ensureAvailableChapters() {
  if (AVAILABLE_CHAPTERS.length > 0) {
    return Promise.resolve(AVAILABLE_CHAPTERS);
  }

  // Compartir la misma carga entre DOMContentLoaded y un clic temprano en
  // "Capítulos". Sin esto, el selector podía renderizarse con la lista aún vacía.
  if (!availableChaptersPromise) {
    availableChaptersPromise = loadAvailableChapters().finally(() => {
      availableChaptersPromise = null;
    });
  }

  return availableChaptersPromise;
}

async function loadAvailableChapters() {
  AVAILABLE_CHAPTERS = [];
  // Los capítulos son CONSECUTIVOS (chapter0, chapter1, ...). Sondeamos en orden
  // y paramos en el primero que no exista, en vez de pedir hasta chapter99: eso
  // generaba ~94 peticiones 404 y llenaba la consola en cada carga. Ahora solo
  // hay 1 fallo (el centinela que detecta "no hay más capítulos"). El tope de
  // 100 queda como salvaguarda por si algún día hubiera muchos.
  for (let i = 0; i < 100; i++) {
    const chapterId = `chapter${i}`;
    try {
      const response = await fetch(
        `chapters/${chapterId}.json?v=${Date.now()}`,
        {
          cache: "no-store",
        },
      );
      if (!response.ok) break; // no existe -> no hay más capítulos
      const chapter = await response.json();
      const title = chapter.title || `Capítulo ${i}`;
      AVAILABLE_CHAPTERS.push({ id: chapterId, title });
    } catch (error) {
      break; // error de red -> dejar de sondear
    }
  }
  return AVAILABLE_CHAPTERS;
}

async function loadAllCharacters() {
  // Nota: "luna" y "alex" se quitaron de la lista (no existe su ficha JSON y
  // generaban errores 404 en cada partida; si algún día se crean, el engine
  // los carga igualmente a demanda con showCharacter).
  const characters = [
    "edu",
    "zip",
    "epod",
    "nexo",
    "samu",
    "iphone5",
    "micaela",
    "neit",
    "jose",
    "3c",
    "tony",
    "airi",
    "airi_adult",
    "amalgama",
    "amalgama_final",
    "andres",
    "carlos",
    "gorila",
    "ketchling",
    "paloma",
    "santi",
    "sebas",
    "tung_tung_tung_sahur",
    "ballerina_capuchina",
    "tralalelo_tralala",
  ];
  for (const character of characters) {
    await engine.loadCharacter(character);
  }
}

async function startNewGame() {
  if (isGameRunning) return; // doble clic = una sola partida
  engine.setFastForward(false);
  stopMenuMedia();
  setMainMenuVisible(false);
  isGameRunning = true;
  currentChapterNumber = 0;

  // Partida nueva: limpiar el progreso de rescates, llamadas e inventario
  engine.rescued = [];
  engine.completedCalls = [];
  engine.inventory = [];

  // Cargar todos los personajes disponibles
  await loadAllCharacters();

  // Iniciar con chapter0
  await playChapter(currentChapterNumber);
}

function releaseChapterTransition(transitionCurtain) {
  if (!transitionCurtain?.isConnected) return;

  transitionCurtain.classList.add("is-releasing");
  setTimeout(() => transitionCurtain.remove(), 380);
}

async function playChapter(chapterIdentifier, transitionCurtain = null) {
  // Permitir tanto número (chapter0, chapter1...) como nombre directo (chapter2-edu)
  const chapterName =
    typeof chapterIdentifier === "number"
      ? `chapter${chapterIdentifier}`
      : chapterIdentifier;

  if (typeof chapterIdentifier === "number") {
    currentChapterNumber = chapterIdentifier;
  } else {
    // También los ids en string ("chapter4") actualizan el contador: si no, el
    // fallback numérico de endGame se queda clavado en 0 y, en capítulos sin
    // setNextChapter (4 y 5), "Siguiente capítulo" devolvía al chapter1 y el
    // juego entero entraba en bucle.
    const numerico = String(chapterIdentifier).match(/^chapter(\d+)$/);
    if (numerico) currentChapterNumber = parseInt(numerico[1], 10);
  }
  currentChapterName = chapterName;

  // Cargar el capítulo
  const chapter = await engine.loadChapter(chapterName);

  if (!chapter) {
    isGameRunning = false;
    engine.setFastForward(false);
    setMainMenuVisible(true);
    showMenuMedia();
    releaseChapterTransition(transitionCurtain);
    return;
  }

  releaseChapterTransition(transitionCurtain);

  // Jugar el capítulo
  await playGame();
}

async function playGame() {
  startRewindWatcher();
  while (isGameRunning) {
    // Salida al menú principal desde el menú de pausa
    if (exitToMenuRequested) {
      exitToMenuRequested = false;
      volverAlMenuPrincipal();
      break;
    }

    // Petición de retroceso: rebobinar y volver a reproducir la escena anterior
    // desde su primera línea (sus acciones repintan fondo, personajes y música).
    if (rewindRequested) {
      rewindRequested = false;
      engine.rewindToPreviousScene();
      updateRewindButton();
      continue;
    }

    // Salto directo desde el menú de escenas
    if (sceneJumpRequested !== null) {
      const destino = sceneJumpRequested;
      sceneJumpRequested = null;
      engine.saltarAEscena(destino);
      updateRewindButton();
      continue;
    }

    const hasMoreContent = await engine.nextLine();

    if (!hasMoreContent) {
      // Último diálogo ya está mostrado, esperar click antes de terminar
      if (engine.isWaitingForInput) {
        await waitForClick();
      }
      endGame();
      break;
    }

    if (!engine.isWaitingForInput) {
      continue;
    }

    await waitForClick();
  }
}

function waitForClick() {
  return new Promise((resolve) => {
    waitingForInput = true;
    let fastForwardTimer = null;
    const handler = (event) => {
      // El botón secundario está reservado para ocultar/mostrar el HUD.
      if (event && event.button !== 0) return;
      waitingForInput = false;
      if (fastForwardTimer) clearTimeout(fastForwardTimer);
      document.removeEventListener("click", handler);
      // IMPRESCINDIBLE ponerlo a null: los botones de retroceder y de escenas
      // desbloquean el bucle llamando a clickHandler(), y si se queda apuntando
      // a un manejador ya resuelto lo llaman, no pasa nada, y la petición se
      // queda colgada hasta el siguiente clic de verdad.
      if (clickHandler === handler) clickHandler = null;
      resolve();
    };
    clickHandler = handler;
    document.addEventListener("click", handler);

    if (engine.fastForward) {
      fastForwardTimer = setTimeout(() => {
        if (engine.fastForward) handler();
      }, 45);
    }
  });
}

// Abandona la partida en curso y deja el menú principal como al arrancar.
// No pasa por endGame(): ahí hay pantalla de fin de capítulo y encadenado con
// el siguiente, y esto es una salida seca a mitad de capítulo.
function volverAlMenuPrincipal() {
  isGameRunning = false;
  rewindRequested = false;
  sceneJumpRequested = null;
  exitToMenuRequested = false;
  stopRewindWatcher();
  cerrarMenuPausa();
  mostrarHUD();
  engine.hideDialog();
  engine.reset(); // también para la música y limpia fondo y personajes
  // No basta con quitar `hidden`: al iniciar una partida el menú también recibe
  // `inert`, que desactiva todos sus botones. Esta función restaura ambas cosas
  // (visibilidad e interactividad) y sincroniza aria-hidden.
  setMainMenuVisible(true);
  showMenuMedia();
}

async function endGame() {
  isGameRunning = false;
  engine.setFastForward(false);
  rewindRequested = false;
  sceneJumpRequested = null;
  stopRewindWatcher();
  mostrarHUD();
  engine.hideDialog();

  // Capturar la ruta ramificada elegida y si el capítulo es final (los
  // capítulos 3 marcan "isFinal": true), antes de resetear el estado
  const branchChapter = engine.nextChapter;
  const isFinalChapter = engine.currentChapter?.isFinal === true;

  // Mostrar pantalla de fin de capítulo
  const chapterTitle = engine.currentChapter?.title || "Capítulo Sin Título";
  const transitionCurtain = await engine.showChapterEnd(chapterTitle);

  // Resetear el estado
  engine.reset();

  // Si el capítulo es el final del juego, volver directamente al menú
  if (isFinalChapter) {
    setMainMenuVisible(true);
    showMenuMedia();
    releaseChapterTransition(transitionCurtain);
    return;
  }

  // Si una decisión definió un capítulo de ruta, usarlo; si no, seguir
  // la secuencia numérica habitual
  const nextChapterId = branchChapter || `chapter${currentChapterNumber + 1}`;
  const nextChapterExists = await checkChapterExists(nextChapterId);

  if (nextChapterExists) {
    // Mostrar opción de continuar al siguiente capítulo
    await showContinueOptions(nextChapterId, transitionCurtain);
  } else {
    // No hay más capítulos, volver al menú
    setMainMenuVisible(true);
    showMenuMedia();
    releaseChapterTransition(transitionCurtain);
  }
}

async function checkChapterExists(chapterName) {
  try {
    const response = await fetch(
      `chapters/${chapterName}.json?v=${Date.now()}`,
      {
        cache: "no-store",
      },
    );
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function showContinueOptions(nextChapterId, transitionCurtain) {
  return new Promise((resolve) => {
    // Panel de opciones con el sistema "Neón de Medianoche" (clases en styles.css)
    const optionsContainer = document.createElement("div");
    optionsContainer.className = "nm-modal";
    optionsContainer.innerHTML = `
            <h2 class="nm-modal-title">¿Continuar?</h2>
            <div class="nm-modal-buttons">
                <button id="continue-next-chapter">Siguiente capítulo</button>
                <button id="return-to-menu">Menú principal</button>
            </div>
        `;

    document.getElementById("game-container").appendChild(optionsContainer);

    document
      .getElementById("continue-next-chapter")
      .addEventListener("click", () => {
        optionsContainer.remove();
        resolve("continue");
      });

    document.getElementById("return-to-menu").addEventListener("click", () => {
      optionsContainer.remove();
      resolve("menu");
    });
  }).then((choice) => {
    if (choice === "continue") {
      isGameRunning = true;
      return playChapter(nextChapterId, transitionCurtain);
    } else {
      setMainMenuVisible(true);
      showMenuMedia();
      releaseChapterTransition(transitionCurtain);
    }
  });
}

async function loadGame() {
  if (
    document.getElementById("chapter-selector") ||
    loadBtn.dataset.loading === "true"
  ) {
    return;
  }

  loadBtn.dataset.loading = "true";
  loadBtn.disabled = true;
  loadBtn.setAttribute("aria-busy", "true");
  const originalText = loadBtn.textContent;
  loadBtn.textContent = "Cargando capítulos…";

  try {
    await ensureAvailableChapters();
    showChapterSelector();
  } finally {
    loadBtn.textContent = originalText;
    loadBtn.disabled = false;
    loadBtn.removeAttribute("aria-busy");
    delete loadBtn.dataset.loading;
  }
}

function showChapterSelector() {
  // Evitar duplicados si ya está abierto
  if (document.getElementById("chapter-selector")) return;

  // Ocultar menú principal
  setMainMenuVisible(false);

  const selector = document.createElement("div");
  selector.id = "chapter-selector";
  selector.className = "chapter-selector";

  const buttonsHTML = AVAILABLE_CHAPTERS.map(
    (ch) => `
        <button class="chapter-select-btn" data-chapter="${ch.id}">
            <span>${ch.title}</span>
        </button>
    `,
  ).join("");
  const listHTML =
    buttonsHTML ||
    `<p class="chapter-selector-empty" role="status">
      No se han podido cargar los capítulos. Vuelve al menú para reintentarlo.
    </p>`;

  selector.innerHTML = `
        <div class="chapter-selector-panel">
            <h2 class="chapter-selector-title">Seleccionar Capítulo</h2>
            <div class="chapter-selector-list">
                ${listHTML}
            </div>
            <button class="chapter-selector-back" id="chapter-selector-back">Volver</button>
        </div>
    `;

  document.getElementById("game-container").appendChild(selector);

  selector.querySelectorAll(".chapter-select-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const chapterId = btn.getAttribute("data-chapter");
      selector.remove();
      startChapterFromSelector(chapterId);
    });
  });

  document
    .getElementById("chapter-selector-back")
    .addEventListener("click", () => {
      selector.remove();
      setMainMenuVisible(true);
      loadBtn.focus();
    });

  (
    selector.querySelector(".chapter-select-btn") ||
    selector.querySelector("#chapter-selector-back")
  )?.focus();
}

async function startChapterFromSelector(chapterId) {
  if (isGameRunning) return; // doble clic = una sola partida
  engine.setFastForward(false);
  stopMenuMedia();
  setMainMenuVisible(false);

  // Asegurar un estado limpio antes de empezar el capítulo elegido
  engine.reset();
  engine.lastChapterName = null;
  engine.rescued = [];
  engine.completedCalls = [];

  isGameRunning = true;

  // Si el id es numérico (chapterN), pasar el número para mantener la
  // secuencia correcta; si no, pasar el nombre de la rama directamente
  const numericMatch = chapterId.match(/^chapter(\d+)$/);
  const identifier = numericMatch ? parseInt(numericMatch[1], 10) : chapterId;

  // Cargar personajes y arrancar el capítulo seleccionado
  await loadAllCharacters();
  await playChapter(identifier);
}

function saveGame() {
  const saveData = {
    chapter: engine.currentChapter,
    scene: engine.currentScene,
    line: engine.currentLine,
    state: engine.gameState,
    history: engine.history,
  };
  localStorage.setItem("gameState", JSON.stringify(saveData));
}

// ===== Debug Mode =====
function initDebugMode() {
  // Activar con Ctrl + D
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "d") {
      e.preventDefault();
      toggleDebugPanel();
    }
  });

  // Configurar botones del debug panel
  const debugPanel = document.getElementById("debug-panel");
  if (!debugPanel) return;

  document.getElementById("debug-close").addEventListener("click", () => {
    debugPanel.classList.add("hidden");
  });

  document.getElementById("debug-goto-line").addEventListener("click", () => {
    const input = document.getElementById("debug-line-input");
    const lineNumber = parseInt(input.value, 10);
    if (!isNaN(lineNumber)) {
      if (engine.goToLine(lineNumber)) {
        // Hacer que se muestre la línea
        playGame();
      } else {
        alert("Número de línea inválido");
      }
    }
  });

  document.getElementById("debug-reload").addEventListener("click", () => {
    if (isGameRunning && engine.currentChapter) {
      // Recargar el capítulo actual en la misma línea
      const currentLine = engine.currentLine;
      engine.lastChapterName = currentChapterName;
      engine.reset();
      engine.loadChapter(currentChapterName).then(() => {
        engine.currentLine = currentLine;
        playGame();
      });
    }
  });

  // Enter en el input también hace go to line
  document
    .getElementById("debug-line-input")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        document.getElementById("debug-goto-line").click();
      }
    });
}

function toggleDebugPanel() {
  const debugPanel = document.getElementById("debug-panel");
  if (debugPanel.classList.contains("hidden")) {
    debugPanel.classList.remove("hidden");
    engine.debugMode = true;
  } else {
    debugPanel.classList.add("hidden");
    engine.debugMode = false;
  }
}

// Inicializar debug mode cuando el juego empieza
document.addEventListener("DOMContentLoaded", () => {
  initDebugMode();
});
