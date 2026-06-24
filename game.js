const engine = new VisualNovelEngine();
let isGameRunning = false;
let waitingForInput = false;
let clickHandler = null;
let currentChapterNumber = 0;

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
    currentChapterNumber = 0;

    // Cargar todos los personajes disponibles
    const characters = ['luna', 'alex', '2b', 'pod', 'emil', 'samu'];
    for (const character of characters) {
        await engine.loadCharacter(character);
    }

    // Iniciar con chapter0
    await playChapter(currentChapterNumber);
}

async function playChapter(chapterNumber) {
    currentChapterNumber = chapterNumber;
    const chapterName = `chapter${chapterNumber}`;

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

    // Mostrar pantalla de fin de capítulo
    const chapterTitle = engine.currentChapter?.title || 'Capítulo Sin Título';
    await engine.showChapterEnd(chapterTitle);

    // Resetear el estado
    engine.reset();

    // Verificar si hay siguiente capítulo
    const nextChapterNumber = currentChapterNumber + 1;
    const nextChapterExists = await checkChapterExists(`chapter${nextChapterNumber}`);

    if (nextChapterExists) {
        // Mostrar opción de continuar al siguiente capítulo
        await showContinueOptions(nextChapterNumber);
    } else {
        // No hay más capítulos, volver al menú
        mainMenu.classList.remove('hidden');
    }
}

async function checkChapterExists(chapterName) {
    try {
        const response = await fetch(`chapters/${chapterName}.json`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

async function showContinueOptions(nextChapterNumber) {
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
            playChapter(nextChapterNumber);
        } else {
            mainMenu.classList.remove('hidden');
        }
    });
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
