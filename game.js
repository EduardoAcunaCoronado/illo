const engine = new VisualNovelEngine();
let isGameRunning = false;
let waitingForInput = false;
let clickHandler = null;

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
}

async function startNewGame() {
    mainMenu.classList.add('hidden');
    isGameRunning = true;

    // Cargar capítulo inicial
    await engine.loadChapter('chapter1');

    // Cargar todos los personajes disponibles
    const characters = ['luna', 'alex', '2b', 'pod', 'emil'];
    for (const character of characters) {
        await engine.loadCharacter(character);
    }

    // Iniciar el juego
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

    // Mostrar pantalla de fin de capítulo
    const chapterTitle = engine.currentChapter?.title || 'Capítulo Sin Título';
    await engine.showChapterEnd(chapterTitle);

    // Resetear el estado y volver al menú
    engine.reset();
    mainMenu.classList.remove('hidden');
}

function loadGame() {
    const saved = localStorage.getItem('gameState');
    if (saved) {
        const state = JSON.parse(saved);
        engine.gameState = state;
        mainMenu.classList.add('hidden');
        isGameRunning = true;
        playGame();
    } else {
        alert('No hay partida guardada');
    }
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
