const engine = new VisualNovelEngine();
let isGameRunning = false;
let waitingForInput = false;
let clickHandler = null;
let currentChapterNumber = 0;
let currentChapterName = null;

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
    if (clickHandler) { clickHandler(); return; }
    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    if (++intentos < 120) { setTimeout(tirar, 150); return; } // hasta 18 s
    // Se agotó: normalmente porque hay un minijuego en marcha y el bucle está
    // dentro de él. Se DESCARTA la petición; si se dejara puesta, saltaría sola
    // al terminar el minijuego, en mitad de otra cosa, borrando el escenario.
    sceneJumpRequested = null;
    rewindRequested = false;
  };
  tirar();
}

// Un minijuego EN MARCHA sí tapa los botones. La pantalla de "¿reintentar?" no:
// si no, quien llega ahí desde el menú de escenas se queda encerrado, porque la
// única salida sería ganar el minijuego.
// OJO: no todos los minijuegos usan `.minigame-overlay`. El combate monta
// `.battle-minigame` y los créditos `.credits-minigame`, así que si solo se
// mira la primera clase los botones se quedan visibles durante un COMBATE y
// pulsarlos pide un salto que el bucle no puede atender.
function minijuegoEnMarcha() {
  return [...document.querySelectorAll(
    ".minigame-overlay, .cutscene-overlay, .battle-minigame, .credits-minigame"
  )].some((o) => !o.classList.contains("minigame-retry"));
}

function updateRewindButton() {
  if (!rewindBtn) return;
  const hayElecciones = !!document.querySelector("#choices-container.active");
  const visible =
    isGameRunning && engine.canRewind() && !minijuegoEnMarcha() && !hayElecciones;
  rewindBtn.classList.toggle("hidden", !visible);
}

function startRewindWatcher() {
  stopRewindWatcher();
  rewindWatcher = setInterval(() => {
    updateRewindButton();
    updateScenesButton();
  }, 200);
}

function stopRewindWatcher() {
  if (rewindWatcher) clearInterval(rewindWatcher);
  rewindWatcher = null;
  rewindBtn?.classList.add("hidden");
  scenesBtn?.classList.add("hidden");
  cerrarMenuEscenas();
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
// Durante un minijuego sí se oculta: ahí el bucle está dentro del minijuego.
function updateScenesButton() {
  if (!scenesBtn) return;
  const visible = isGameRunning && engine.sceneList().length > 1 && !minijuegoEnMarcha();
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

// ===== Configuración: volúmenes de música y efectos (persistentes) =====
function showSettingsPanel() {
  if (document.getElementById("settings-panel")) return; // ya abierto
  const volOf = (k, def) => {
    const v = parseFloat(localStorage.getItem(k));
    return isNaN(v) ? def : Math.round(v * 100);
  };
  const panel = document.createElement("div");
  panel.className = "nm-modal";
  panel.id = "settings-panel";
  panel.innerHTML = `
        <h2 class="nm-modal-title">Configuración</h2>
        <div class="nm-settings">
            <label class="nm-setting-row">🎵 Música
                <input type="range" id="vol-music" min="0" max="100" value="${volOf("illo_vol_music", 100)}">
                <span class="nm-setting-val" id="vol-music-val"></span>
            </label>
            <label class="nm-setting-row">🔊 Efectos
                <input type="range" id="vol-sfx" min="0" max="100" value="${volOf("illo_vol_sfx", 100)}">
                <span class="nm-setting-val" id="vol-sfx-val"></span>
            </label>
        </div>
        <div class="nm-modal-buttons">
            <button id="settings-close">Volver</button>
        </div>
    `;
  document.getElementById("game-container").appendChild(panel);

  const wire = (sliderId, storeKey) => {
    const slider = panel.querySelector("#" + sliderId);
    const label = panel.querySelector("#" + sliderId + "-val");
    const paint = () => { label.textContent = slider.value + "%"; };
    paint();
    slider.addEventListener("input", () => {
      localStorage.setItem(storeKey, String(slider.value / 100));
      paint();
      engine.applyVolumeSettings();
    });
  };
  wire("vol-music", "illo_vol_music");
  wire("vol-sfx", "illo_vol_sfx");

  panel.querySelector("#settings-close").addEventListener("click", () => panel.remove());
}

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
  startupOpening.hidden = false;
  startupOpeningStatus.textContent = "Cargando opening…";
  startupOpeningVideo.muted = false;
  startupOpeningVideo.volume = storedMusicVolume();
  startupOpeningVideo.currentTime = 0;

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
    startupOpening.classList.add("is-playing");
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
    "loca",
    "nate",
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

async function playChapter(chapterIdentifier) {
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
  await engine.loadChapter(chapterName);

  // Jugar el capítulo
  await playGame();
}

async function playGame() {
  startRewindWatcher();
  while (isGameRunning) {
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
    const handler = () => {
      waitingForInput = false;
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
  });
}

async function endGame() {
  isGameRunning = false;
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
  await engine.showChapterEnd(chapterTitle);

  // Resetear el estado
  engine.reset();

  // Si el capítulo es el final del juego, volver directamente al menú
  if (isFinalChapter) {
    setMainMenuVisible(true);
    showMenuMedia();
    return;
  }

  // Si una decisión definió un capítulo de ruta, usarlo; si no, seguir
  // la secuencia numérica habitual
  const nextChapterId = branchChapter || `chapter${currentChapterNumber + 1}`;
  const nextChapterExists = await checkChapterExists(nextChapterId);

  if (nextChapterExists) {
    // Mostrar opción de continuar al siguiente capítulo
    await showContinueOptions(nextChapterId);
  } else {
    // No hay más capítulos, volver al menú
    setMainMenuVisible(true);
    showMenuMedia();
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

async function showContinueOptions(nextChapterId) {
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
      playChapter(nextChapterId);
    } else {
      setMainMenuVisible(true);
      showMenuMedia();
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
