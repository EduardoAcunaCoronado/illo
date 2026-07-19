const engine = new VisualNovelEngine();
let isGameRunning = false;
let waitingForInput = false;
let clickHandler = null;
let currentChapterNumber = 0;
let currentChapterName = null;

// Capítulos disponibles para el selector de "Cargar" (se cargan dinámicamente)
let AVAILABLE_CHAPTERS = [];

// Elementos del DOM
const gameContainer = document.getElementById('game-container');
const mainMenu = document.getElementById('main-menu');
const startBtn = document.getElementById('start-btn');
const loadBtn = document.getElementById('load-btn');
const dialogBox = document.getElementById('dialog-box');
const gameArea = document.querySelector('#game-container > :not(#main-menu)');

// Event listeners del menú
startBtn.addEventListener('click', () => startNewGame());
loadBtn.addEventListener('click', () => loadGame());

// Inicializar
document.addEventListener('DOMContentLoaded', initGame);

async function initGame() {
    console.log('Visual Novel Engine inicializado');
    await loadAvailableChapters();
}

async function loadAvailableChapters() {
    AVAILABLE_CHAPTERS = [];
    // Intentar cargar cada capítulo chapter0-chapter99
    for (let i = 0; i < 100; i++) {
        const chapterId = `chapter${i}`;
        try {
            const response = await fetch(`chapters/${chapterId}.json?v=${Date.now()}`, {
                cache: 'no-store'
            });
            if (response.ok) {
                const chapter = await response.json();
                const title = chapter.title || `Capítulo ${i}`;
                AVAILABLE_CHAPTERS.push({ id: chapterId, title });
            }
        } catch (error) {
            // Silenciosamente ignorar errores
        }
    }
}

async function loadAllCharacters() {
    const characters = ['luna', 'edu', 'zip', 'alex', '2b', 'pod', 'emil', 'samu', 'iphone5', 'loca', 'nate', 'jose', 'tony'];
    for (const character of characters) {
        await engine.loadCharacter(character);
    }
}

async function startNewGame() {
    mainMenu.classList.add('hidden');
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
    const chapterName = typeof chapterIdentifier === 'number'
        ? `chapter${chapterIdentifier}`
        : chapterIdentifier;

    if (typeof chapterIdentifier === 'number') {
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
    return new Promise(resolve => {
        waitingForInput = true;
        clickHandler = () => {
            waitingForInput = false;
            document.removeEventListener('click', clickHandler);
            resolve();
        };
        document.addEventListener('click', clickHandler);
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
    const chapterTitle = engine.currentChapter?.title || 'Capítulo Sin Título';
    await engine.showChapterEnd(chapterTitle);

    // Resetear el estado
    engine.reset();

    // Si el capítulo es el final del juego, volver directamente al menú
    if (isFinalChapter) {
        mainMenu.classList.remove('hidden');
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
        mainMenu.classList.remove('hidden');
    }
}

async function checkChapterExists(chapterName) {
    try {
        const response = await fetch(`chapters/${chapterName}.json?v=${Date.now()}`, {
            cache: 'no-store'
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

async function showContinueOptions(nextChapterId) {
    return new Promise(resolve => {
        // Crear un panel de opciones
        const optionsContainer = document.createElement('div');
        optionsContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #000;
            border: 3px solid #ffcc00;
            padding: 40px;
            text-align: center;
            z-index: 500;
            border-radius: 0;
            clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%);
        `;

        optionsContainer.innerHTML = `
            <h2 style="color: #ffcc00; font-size: 28px; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 2px;">
                ¿Continuar?
            </h2>
            <div style="display: flex; gap: 20px; justify-content: center;">
                <button id="continue-next-chapter" style="
                    background: #000;
                    border: 3px solid #ffcc00;
                    color: #ffcc00;
                    padding: 15px 40px;
                    font-size: 18px;
                    cursor: pointer;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    transition: all 0.3s ease;
                ">Siguiente Capítulo</button>
                <button id="return-to-menu" style="
                    background: #000;
                    border: 3px solid #ffcc00;
                    color: #ffcc00;
                    padding: 15px 40px;
                    font-size: 18px;
                    cursor: pointer;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    transition: all 0.3s ease;
                ">Menú Principal</button>
            </div>
        `;

        document.getElementById('game-container').appendChild(optionsContainer);

        document.getElementById('continue-next-chapter').addEventListener('click', () => {
            optionsContainer.remove();
            resolve('continue');
        });

        document.getElementById('return-to-menu').addEventListener('click', () => {
            optionsContainer.remove();
            resolve('menu');
        });
    }).then(choice => {
        if (choice === 'continue') {
            isGameRunning = true;
            playChapter(nextChapterId);
        } else {
            mainMenu.classList.remove('hidden');
        }
    });
}

function loadGame() {
    showChapterSelector();
}

function showChapterSelector() {
    // Evitar duplicados si ya está abierto
    if (document.getElementById('chapter-selector')) return;

    // Ocultar menú principal
    mainMenu.classList.add('hidden');

    const selector = document.createElement('div');
    selector.id = 'chapter-selector';
    selector.className = 'chapter-selector';

    const buttonsHTML = AVAILABLE_CHAPTERS.map(ch => `
        <button class="chapter-select-btn" data-chapter="${ch.id}">
            <span>${ch.title}</span>
        </button>
    `).join('');

    selector.innerHTML = `
        <div class="chapter-selector-panel">
            <h2 class="chapter-selector-title">Seleccionar Capítulo</h2>
            <div class="chapter-selector-list">
                ${buttonsHTML}
            </div>
            <button class="chapter-selector-back" id="chapter-selector-back">Volver</button>
        </div>
    `;

    document.getElementById('game-container').appendChild(selector);

    selector.querySelectorAll('.chapter-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const chapterId = btn.getAttribute('data-chapter');
            selector.remove();
            startChapterFromSelector(chapterId);
        });
    });

    document.getElementById('chapter-selector-back').addEventListener('click', () => {
        selector.remove();
        mainMenu.classList.remove('hidden');
    });
}

async function startChapterFromSelector(chapterId) {
    mainMenu.classList.add('hidden');

    // Asegurar un estado limpio antes de empezar el capítulo elegido
    engine.reset();
    engine.lastChapterName = null;
    engine.rescued = [];
    engine.completedCalls = [];
    engine.inventory = [];

    isGameRunning = true;

    // Cargar personajes y arrancar el capítulo seleccionado
    await loadAllCharacters();
    await playChapter(chapterId);
}

function saveGame() {
    const saveData = {
        chapter: engine.currentChapter,
        scene: engine.currentScene,
        line: engine.currentLine,
        state: engine.gameState,
        history: engine.history
    };
    localStorage.setItem('gameState', JSON.stringify(saveData));
}

// ===== Debug Mode =====
function initDebugMode() {
    // Activar con Ctrl + D
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            toggleDebugPanel();
        }
    });

    // Configurar botones del debug panel
    const debugPanel = document.getElementById('debug-panel');
    if (!debugPanel) return;

    document.getElementById('debug-close').addEventListener('click', () => {
        debugPanel.classList.add('hidden');
    });

    document.getElementById('debug-goto-line').addEventListener('click', () => {
        const input = document.getElementById('debug-line-input');
        const lineNumber = parseInt(input.value, 10);
        if (!isNaN(lineNumber)) {
            if (engine.goToLine(lineNumber)) {
                // Hacer que se muestre la línea
                playGame();
            } else {
                alert('Número de línea inválido');
            }
        }
    });

    document.getElementById('debug-reload').addEventListener('click', () => {
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
    document.getElementById('debug-line-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('debug-goto-line').click();
        }
    });
}

function toggleDebugPanel() {
    const debugPanel = document.getElementById('debug-panel');
    if (debugPanel.classList.contains('hidden')) {
        debugPanel.classList.remove('hidden');
        engine.debugMode = true;
    } else {
        debugPanel.classList.add('hidden');
        engine.debugMode = false;
    }
}

// Inicializar debug mode cuando el juego empieza
document.addEventListener('DOMContentLoaded', () => {
    initDebugMode();
});
