const engine = new VisualNovelEngine();
let isGameRunning = false;
let waitingForInput = false;
let clickHandler = null;
let currentChapterNumber = 0;
let currentChapterName = null;

// Capítulos disponibles para el selector de "Cargar" (se cargan dinámicamente)
let AVAILABLE_CHAPTERS = [];

// Elementos del DOM
const gameContainer = document.getElementById("game-container");
const mainMenu = document.getElementById("main-menu");
const startBtn = document.getElementById("start-btn");
const loadBtn = document.getElementById("load-btn");
const dialogBox = document.getElementById("dialog-box");
const gameArea = document.querySelector("#game-container > :not(#main-menu)");

// Event listeners del menú
startBtn.addEventListener("click", () => startNewGame());
loadBtn.addEventListener("click", () => loadGame());

// ===== Menú principal: vídeo de fondo + tema "Más de lo que ven tus ojos" =====
// El vídeo arranca en bucle y silenciado (autoplay). Al primer clic/tecla se
// activa su sonido base BAJITO y arranca el tema del menú (los navegadores no
// permiten audio antes del primer gesto del usuario). Al empezar a jugar, todo
// se funde y el vídeo se oculta; al volver al menú, vuelve.
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
function showMenuMedia() {
  const vid = menuVideoEl();
  if (vid) {
    vid.classList.remove("hidden");
    applyMenuVideoRate();
    vid.play().catch(() => {});
  }
  if (menuAudioUnlocked) {
    playMenuChill(); // al volver al menú, el chill acompaña (el tema no se relanza)
  }
}

// Inicializar
document.addEventListener("DOMContentLoaded", initGame);

async function initGame() {
  console.log("Visual Novel Engine inicializado");
  await loadAvailableChapters();
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
}

async function loadAllCharacters() {
  // Nota: "luna" y "alex" se quitaron de la lista (no existe su ficha JSON y
  // generaban errores 404 en cada partida; si algún día se crean, el engine
  // los carga igualmente a demanda con showCharacter).
  const characters = [
    "edu",
    "zip",
    "pod",
    "emil",
    "samu",
    "iphone5",
    "loca",
    "nate",
    "jose",
    "2b",
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
  stopMenuMedia();
  mainMenu.classList.add("hidden");
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
  }
  currentChapterName = chapterName;

  // Cargar el capítulo
  await engine.loadChapter(chapterName);

  // Jugar el capítulo
  await playGame();
}

async function playGame() {
  while (isGameRunning) {
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
    clickHandler = () => {
      waitingForInput = false;
      document.removeEventListener("click", clickHandler);
      resolve();
    };
    document.addEventListener("click", clickHandler);
  });
}

async function endGame() {
  isGameRunning = false;
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
    mainMenu.classList.remove("hidden");
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
    mainMenu.classList.remove("hidden");
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
      mainMenu.classList.remove("hidden");
      showMenuMedia();
    }
  });
}

function loadGame() {
  showChapterSelector();
}

function showChapterSelector() {
  // Evitar duplicados si ya está abierto
  if (document.getElementById("chapter-selector")) return;

  // Ocultar menú principal
  mainMenu.classList.add("hidden");

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

  selector.innerHTML = `
        <div class="chapter-selector-panel">
            <h2 class="chapter-selector-title">Seleccionar Capítulo</h2>
            <div class="chapter-selector-list">
                ${buttonsHTML}
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
      mainMenu.classList.remove("hidden");
    });
}

async function startChapterFromSelector(chapterId) {
  stopMenuMedia();
  mainMenu.classList.add("hidden");

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
