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
  if (activo) activo.scrollIntoView({ block: "center" });
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
// Van repartidos en pestañas (Vídeo, Sonido, Trucos). La de Vídeo se cae entera
// en el navegador, así que la primera pestaña no es siempre la misma: la activa
// se decide aquí, no en el HTML.
function settingsMarkup() {
  const volOf = (k, def) => {
    const v = parseFloat(localStorage.getItem(k));
    return isNaN(v) ? def : Math.round(v * 100);
  };
  const kosaiOn = localStorage.getItem(KOSAI_SETTING_KEY) === "1";
  const blipsOn = localStorage.getItem(BLIP_SETTING_KEY) !== "0";
  const modo = windowModeActual();

  const grupos = [];
  if (hayOpcionesDeVideo) {
    grupos.push({
      id: "video",
      titulo: "🖥️ Vídeo",
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
    titulo: "🔊 Sonido",
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
    titulo: "⚔️ Trucos",
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
                    aria-selected="${i === 0}" aria-controls="nm-pane-${g.id}" data-tab="${g.id}">${g.titulo}</button>`,
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

function menuPausaAbierto() {
  return !!document.getElementById("pause-menu");
}

function cerrarMenuPausa() {
  document.getElementById("pause-menu")?.remove();
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
  exitToMenuRequested = true;
  desbloquearBucle(() => exitToMenuRequested);
}

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  // Durante una cutscene, Esc es suyo: salta el vídeo.
  if (!isGameRunning || cutsceneEnMarcha()) return;
  e.preventDefault();
  if (menuPausaAbierto()) cerrarMenuPausa();
  else abrirMenuPausa();
});

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
  startupOpeningStatus.textContent = "Cargando opening…";
  startupOpeningVideo.muted = false;
  startupOpeningVideo.volume = audibleStartupVolume();
  startupOpeningVideo.currentTime = 0;

  // Fuerza el layout 1280x720 después de retirar [hidden], antes de solicitar
  // reproducción. El width/height del HTML y el CSS fijo hacen que este tamaño
  // no dependa todavía del primer cálculo porcentual del compositor de vídeo.
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
    return;
  }

  const menuVideo = menuVideoEl();
  if (menuVideo) {
    try { menuVideo.pause(); } catch (error) {}
  }

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
const MENU_MUSIC_SRC = "assets/sounds/music/tema_menu.mp3"; // alternativa: tema_menu_v2.mp3
const MENU_AMBIENCE_SRC = "assets/sounds/music/ambiente_menu.mp3"; // audio base del vídeo, extraído
const MENU_CHILL_SRC = "assets/sounds/music/menu_chill.mp3"; // instrumental chill que releva al tema
const MENU_VIDEO_RATE = 0.5;   // velocidad del vídeo (1 = normal; más bajo = más lento)
const MENU_AMBIENCE_VOL = 0.12; // sonido de base (bajito, SIEMPRE a velocidad normal)
const MENU_MUSIC_VOL = 0.5;     // tema principal
const MENU_CHILL_VOL = 0.32;    // el chill va por debajo del tema, como música de sala
let menuAudioUnlocked = false;
const isDesktopApp = !!window.desktopApp;

function menuVideoEl() {
  return document.getElementById("menu-video");
}

// El vídeo va SIEMPRE mudo y ralentizado; su sonido de base se reproduce aparte
// (ambiente_menu.mp3) para que no se estire ni cambie de tono al frenar el vídeo.
function applyMenuVideoRate() {
  const vid = menuVideoEl();
  if (vid) vid.playbackRate = MENU_VIDEO_RATE;
}
applyMenuVideoRate();

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
  const vid = menuVideoEl();
  if (vid && !vid.classList.contains("hidden")) {
    setTimeout(() => {
      vid.pause();
      vid.classList.add("hidden");
    }, 700);
  }
}

// Volver a mostrar el menú con su vídeo y su ambiente (al regresar al menú).
// El tema NO se relanza solo: para volver a oírlo está el botón ♪.
function showMenuMedia(playChillOnReturn = true) {
  const vid = menuVideoEl();
  if (vid) {
    vid.classList.remove("hidden");
    applyMenuVideoRate();
    vid.play().catch(() => {});
  }
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
    const handler = () => {
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
