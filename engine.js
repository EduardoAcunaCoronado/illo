class VisualNovelEngine {
    constructor() {
        this.currentChapter = null;
        this.currentScene = 0;
        this.currentLine = 0;
        this.characters = {};
        this.chapters = {};
        this.gameState = {};
        this.history = [];
        this.isWaitingForInput = false;
        this.typingSpeed = 50;
        this.lastChapterName = null;
        this.speakingCharacter = null;
        this.speakingPosition = null;
        this.characterPositions = {}; // Rastrear qué personaje está en qué posición
        this.audioInstances = {}; // Rastrear instancias de audio
        this.currentMusic = null; // Música de fondo actual
        this.sceneEndedByChoice = false; // Indica si la escena terminó por una elección
        this.completedCalls = []; // Rastrear las llamadas completadas
        this.nextChapter = null; // Capítulo a cargar (ruta ramificada elegida)
        this.rescued = []; // Personajes rescatados, en orden (persiste entre capítulos)
        this.storyDelay = 0; // Retraso acumulado por las decisiones de ruta dentro de un capítulo
    }

    async loadChapter(chapterName) {
        try {
            const response = await fetch(`chapters/${chapterName}.json`);
            const chapter = await response.json();

            const isNewChapter = this.lastChapterName !== chapterName;
            this.lastChapterName = chapterName;

            this.currentChapter = chapter;
            this.currentScene = 0;
            this.currentLine = 0;
            this.nextChapter = null; // Limpiar la ruta al cargar un capítulo nuevo
            this.storyDelay = 0; // Reiniciar el retraso acumulado en cada capítulo

            if (isNewChapter) {
                await this.playChapterIntro(chapter);
            }

            return chapter;
        } catch (error) {
            console.error(`Error cargando capítulo ${chapterName}:`, error);
            return null;
        }
    }

    async loadCharacter(characterName) {
        try {
            const response = await fetch(`characters/${characterName}.json`);
            const character = await response.json();
            this.characters[characterName] = character;
            return character;
        } catch (error) {
            console.error(`Error cargando personaje ${characterName}:`, error);
            return null;
        }
    }

    getCurrentScene() {
        if (!this.currentChapter || !this.currentChapter.scenes) {
            return null;
        }
        return this.currentChapter.scenes[this.currentScene];
    }

    getCurrentLine() {
        const scene = this.getCurrentScene();
        if (!scene || !scene.lines) {
            return null;
        }
        return scene.lines[this.currentLine];
    }

    // Si la línea define una variante por consecuencia, devuelve una copia con
    // el texto alternativo. Soporta (en orden de prioridad):
    // - byRescueCount: mapa "nº de rescatados" -> texto. Permite revelar la
    //   historia por etapas según el ORDEN de rescate. Al entrar a un Capítulo 2
    //   la acción "rescue" ya se ejecutó, así que rescued.length vale 1, 2 o 3
    //   según si este amigo es el 1º, 2º o 3º/último rescate. Se elige la entrada
    //   cuya clave sea el mayor umbral <= rescued.length (así "3" cubre el último
    //   rescate aunque en el futuro hubiera más amigos).
    // - allRescuedText: se usa cuando ya se ha rescatado a todos (3).
    // - consequence.delayAtLeast: se usa según el retraso acumulado.
    // Si no aplica ninguna, devuelve la línea tal cual.
    resolveConsequenceLine(line) {
        if (line.byRescueCount && typeof line.byRescueCount === 'object') {
            const count = this.rescued.length;
            let best = null;
            for (const key of Object.keys(line.byRescueCount)) {
                const threshold = parseInt(key, 10);
                if (!isNaN(threshold) && threshold <= count &&
                    (best === null || threshold > best)) {
                    best = threshold;
                }
            }
            if (best !== null) {
                return Object.assign({}, line, { text: line.byRescueCount[String(best)] });
            }
        }
        if (line.allRescuedText && this.rescued.length >= 3) {
            return Object.assign({}, line, { text: line.allRescuedText });
        }
        const c = line.consequence;
        if (c && typeof c.delayAtLeast === 'number' && this.storyDelay >= c.delayAtLeast && c.text) {
            return Object.assign({}, line, { text: c.text });
        }
        return line;
    }

    async executeAction(action) {
        if (!action) return;

        switch (action.type) {
            case 'setBackground':
                this.setBackground(action.value);
                break;
            case 'showCharacter':
                await this.showCharacter(action.character, action.position, action.pose);
                break;
            case 'hideCharacter':
            case 'removeCharacter':
            case 'quitarPersonaje':
                this.hideCharacter(action.character, action.position);
                break;
            case 'setPose':
                this.setPose(action.character, action.position, action.pose);
                break;
            case 'setVariable':
                this.gameState[action.variable] = action.value;
                break;
            case 'playSound':
                // Soportar tanto formato antiguo (action.value) como nuevo (action.path + opciones)
                const soundPath = action.path || action.value;
                const soundOptions = {
                    volume: action.volume !== undefined ? action.volume : 1.0,
                    loop: action.loop || false,
                    autoPlay: action.autoPlay !== false,
                    id: action.id,
                    fadeIn: action.fadeIn || 0
                };
                this.playSound(soundPath, soundOptions);
                break;
            case 'stopSound':
                this.stopSound(action.id || action.audio, action.fadeOut || 0);
                break;
            case 'stopAllSounds':
                this.stopAllSounds();
                break;
            case 'pauseSound':
                this.pauseSound(action.id || action.audio);
                break;
            case 'resumeSound':
                this.resumeSound(action.id || action.audio);
                break;
            case 'setVolume':
                this.setVolume(action.id || action.audio, action.volume);
                break;
            case 'wait':
                await this.wait(action.value);
                break;
            case 'minigame':
                await this.playMinigame(action);
                break;
            case 'rescue':
                this.rescueCharacter(action.character);
                break;
            case 'setDelay':
                this.storyDelay = action.value || 0;
                break;
            case 'addDelay':
                this.storyDelay += (action.value || 0);
                break;
            case 'goToScene':
                this.jumpToScene(action.value);
                break;
        }
    }

    // Salta a una escena por título (o índice) dentro del capítulo actual.
    // Marca un salto pendiente para que nextLine detenga el procesamiento
    // normal de la línea y no avance automáticamente.
    jumpToScene(target) {
        let sceneIndex;
        if (typeof target === 'string') {
            sceneIndex = this.currentChapter.scenes.findIndex(
                scene => scene.title === target
            );
        } else {
            sceneIndex = target;
        }
        if (sceneIndex === undefined || sceneIndex === -1) {
            console.warn(`goToScene: escena no encontrada: ${target}`);
            return;
        }
        this.currentScene = sceneIndex;
        this.currentLine = 0;
        this.pendingSceneJump = true;
    }

    // Registrar un personaje como rescatado (mantiene el orden de rescate)
    rescueCharacter(name) {
        if (name && !this.rescued.includes(name)) {
            this.rescued.push(name);
        }
    }

    async playMinigame(action) {
        // Ajustar la dificultad según el retraso acumulado, si se define.
        // Cualquier propiedad "<algo>ByDelay" (p. ej. maxHitsByDelay,
        // maxMissesByDelay) sobreescribe "<algo>" eligiendo la entrada cuya
        // clave sea el mayor umbral <= storyDelay.
        for (const prop of Object.keys(action)) {
            if (!prop.endsWith('ByDelay')) continue;
            const base = prop.slice(0, -'ByDelay'.length); // p. ej. "maxMisses"
            const map = action[prop];
            const thresholds = Object.keys(map)
                .map(Number)
                .filter(n => n <= this.storyDelay)
                .sort((a, b) => a - b);
            if (thresholds.length > 0) {
                const key = thresholds[thresholds.length - 1];
                action = Object.assign({}, action, { [base]: map[key] });
            }
        }

        // Despachar según el tipo de minijuego solicitado
        switch (action.game) {
            case 'ketchup':
                await this.playKetchupMinigame(action);
                break;
            case 'ecchi':
                await this.playEcchiMinigame(action);
                break;
            case 'paloma':
                await this.playPalomaMinigame(action);
                break;
            case 'gatos':
                await this.playGatosMinigame(action);
                break;
            default:
                console.warn(`Minijuego desconocido: ${action.game}`);
        }
    }

    // Minijuego: Samu come ketchup y esquiva guindillas.
    // Orquesta las rondas y permite reintentar si pierdes.
    async playKetchupMinigame(options = {}) {
        // El minijuego gestiona su propia entrada; no esperar clic extra al salir
        this.isWaitingForInput = false;

        // Se repite hasta ganar; al perder solo se puede reintentar
        let won = false;
        while (!won) {
            won = await this.runKetchupRound(options);
            if (!won) {
                await this.showMinigameRetry();
            }
        }
        return won;
    }

    // Una ronda del minijuego. Resuelve con true (ganada) o false (perdida).
    runKetchupRound(options = {}) {
        const goal = options.goal || 10;          // ketchups necesarios para ganar
        const maxHits = options.maxHits || 3;     // golpes de guindilla permitidos
        const duration = options.duration || 0;   // 0 = sin límite de tiempo

        return new Promise(resolve => {
            // --- Crear overlay del minijuego ---
            const overlay = document.createElement('div');
            overlay.className = 'minigame-overlay';
            overlay.innerHTML = `
                <div class="minigame-hud">
                    <span class="mg-score"><img class="mg-hud-icon" src="assets/minigames/ketchup.png" alt="ketchup"><span class="mg-score-text">0 / ${goal}</span></span>
                    <span class="mg-lives">❤️ ${maxHits}</span>
                </div>
                <div class="minigame-field" id="mg-field">
                    <div class="mg-player" id="mg-player">🐺</div>
                </div>
                <div class="minigame-instructions">Mueve con ← → (o el ratón). ¡Come <img class="mg-inline-icon" src="assets/minigames/ketchup.png" alt="ketchup"> y esquiva <img class="mg-inline-icon" src="assets/minigames/chili.png" alt="guindilla">!</div>
            `;
            document.getElementById('game-container').appendChild(overlay);

            const field = overlay.querySelector('#mg-field');
            const player = overlay.querySelector('#mg-player');
            const scoreEl = overlay.querySelector('.mg-score-text');
            const livesEl = overlay.querySelector('.mg-lives');

            const fieldRect = () => field.getBoundingClientRect();

            let score = 0;
            let lives = maxHits;
            let playerX = 0.5; // posición horizontal normalizada (0..1)
            const playerW = 0.12; // ancho del jugador relativo al campo
            let items = [];     // { el, x, y, speed, type }
            let running = true;
            let spawnTimer = 0;
            let lastTime = null;

            const updatePlayerPos = () => {
                player.style.left = `${playerX * 100}%`;
            };
            updatePlayerPos();

            // --- Controles ---
            let moveLeft = false;
            let moveRight = false;

            const keyDown = (e) => {
                if (e.key === 'ArrowLeft' || e.key === 'a') moveLeft = true;
                if (e.key === 'ArrowRight' || e.key === 'd') moveRight = true;
            };
            const keyUp = (e) => {
                if (e.key === 'ArrowLeft' || e.key === 'a') moveLeft = false;
                if (e.key === 'ArrowRight' || e.key === 'd') moveRight = false;
            };
            const mouseMove = (e) => {
                const r = fieldRect();
                playerX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
                updatePlayerPos();
            };
            // Evitar que los clics del minijuego avancen el diálogo
            const swallowClick = (e) => e.stopPropagation();

            document.addEventListener('keydown', keyDown);
            document.addEventListener('keyup', keyUp);
            field.addEventListener('mousemove', mouseMove);
            overlay.addEventListener('click', swallowClick, true);

            const spawnItem = () => {
                const isChili = Math.random() < 0.4; // 40% guindillas, 60% ketchup
                const el = document.createElement('div');
                el.className = 'mg-item';
                const img = document.createElement('img');
                img.src = isChili ? 'assets/minigames/chili.png' : 'assets/minigames/ketchup.png';
                img.alt = isChili ? 'guindilla' : 'ketchup';
                img.draggable = false;
                el.appendChild(img);
                const x = Math.random() * 0.9 + 0.02;
                el.style.left = `${x * 100}%`;
                el.style.top = '-10%';
                field.appendChild(el);
                items.push({
                    el,
                    x,
                    y: -0.1,
                    speed: 0.25 + Math.random() * 0.25, // fracción de campo por segundo
                    type: isChili ? 'chili' : 'ketchup'
                });
            };

            const cleanup = (won) => {
                running = false;
                document.removeEventListener('keydown', keyDown);
                document.removeEventListener('keyup', keyUp);
                field.removeEventListener('mousemove', mouseMove);

                // Mensaje final breve
                const result = document.createElement('div');
                result.className = 'minigame-result';
                result.textContent = won ? '¡Banquete de ketchup!' : '¡Demasiado picante!';
                overlay.appendChild(result);

                setTimeout(() => {
                    // Quitar el bloqueo de clics justo antes de eliminar el overlay
                    overlay.removeEventListener('click', swallowClick, true);
                    overlay.remove();
                    resolve(won);
                }, won ? 1500 : 800);
            };

            const startTime = performance.now();

            const loop = (time) => {
                if (!running) return;
                if (lastTime === null) lastTime = time;
                const dt = (time - lastTime) / 1000; // segundos
                lastTime = time;

                // Mover jugador con teclado
                const moveSpeed = 1.2; // campo por segundo
                if (moveLeft) playerX = Math.max(0, playerX - moveSpeed * dt);
                if (moveRight) playerX = Math.min(1, playerX + moveSpeed * dt);
                updatePlayerPos();

                // Generar ítems periódicamente
                spawnTimer -= dt;
                if (spawnTimer <= 0) {
                    spawnItem();
                    spawnTimer = 0.7 + Math.random() * 0.6;
                }

                // Mover ítems y detectar colisiones
                for (let i = items.length - 1; i >= 0; i--) {
                    const it = items[i];
                    it.y += it.speed * dt;
                    it.el.style.top = `${it.y * 100}%`;

                    // Colisión con el jugador (zona inferior del campo)
                    const caught = it.y >= 0.82 && it.y <= 0.98 &&
                        Math.abs(it.x - playerX) < playerW;

                    if (caught) {
                        if (it.type === 'ketchup') {
                            score++;
                            scoreEl.textContent = `${score} / ${goal}`;
                        } else {
                            lives--;
                            livesEl.textContent = `❤️ ${Math.max(0, lives)}`;
                            field.classList.add('mg-hit');
                            setTimeout(() => field.classList.remove('mg-hit'), 200);
                        }
                        it.el.remove();
                        items.splice(i, 1);
                        continue;
                    }

                    // Salió del campo
                    if (it.y > 1.1) {
                        it.el.remove();
                        items.splice(i, 1);
                    }
                }

                // Condiciones de fin
                if (score >= goal) return cleanup(true);
                if (lives <= 0) return cleanup(false);
                if (duration > 0 && (time - startTime) >= duration) {
                    return cleanup(score >= goal);
                }

                requestAnimationFrame(loop);
            };

            requestAnimationFrame(loop);
        });
    }

    // Pantalla de derrota: ofrece reintentar el minijuego.
    showMinigameRetry(message = '¡Demasiado picante!') {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'minigame-overlay minigame-retry';
            overlay.innerHTML = `
                <div class="minigame-result">
                    <div class="mg-retry-title">${message}</div>
                    <div class="mg-retry-buttons">
                        <button id="mg-retry-btn">Reintentar</button>
                    </div>
                </div>
            `;
            document.getElementById('game-container').appendChild(overlay);

            // Evitar que un clic en el overlay (fuera del botón) avance el diálogo
            const swallowClick = (e) => {
                if (!e.target.closest('#mg-retry-btn')) {
                    e.stopPropagation();
                }
            };
            overlay.addEventListener('click', swallowClick, true);

            const retryBtn = overlay.querySelector('#mg-retry-btn');
            retryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                overlay.removeEventListener('click', swallowClick, true);
                overlay.remove();
                resolve(true);
            });
        });
    }

    // Minijuego: la loca de los gatos (El Jamón). Estilo Pac-Man: Samu se mueve
    // libremente por el campo y debe SOBREVIVIR huyendo de los gatos que le
    // persiguen durante un tiempo (por defecto 60 s). Si un gato lo alcanza,
    // pierde y puede reintentar.
    async playGatosMinigame(options = {}) {
        this.isWaitingForInput = false;

        let won = false;
        while (!won) {
            won = await this.runGatosRound(options);
            if (!won) {
                await this.showMinigameRetry('¡Un gato te ha pillado!');
            }
        }
        return won;
    }

    // Laberinto fijo de "calles de la ciudad" para el minijuego de gatos.
    // '#' = manzana (pared), ' ' = calle transitable. Diseñado en cuadrícula
    // urbana con avenidas horizontales/verticales, sin callejones sin salida
    // y con múltiples rutas de escape. Samu empieza en el centro (S) y los
    // gatos en las esquinas (C). El borde exterior es todo calle (ronda).
    static get GATOS_MAZE() {
        return [
            '                     ',
            ' ### ### ### ### ### ',
            ' ### ### ### ### ### ',
            '                     ',
            ' ### ### ### ### ### ',
            ' ### ### ### ### ### ',
            '                     ',
            ' ### ### ### ### ### ',
            ' ### ### ### ### ### ',
            '                     ',
            ' ### ### ### ### ### ',
            ' ### ### ### ### ### ',
            '                     ',
            ' ### ### ### ### ### ',
            '                     '
        ];
    }

    // Una ronda del minijuego de gatos, estilo Pac-Man por REJILLA. Samu y los
    // gatos recorren las calles del laberinto (giran en las intersecciones).
    // Los gatos persiguen a Samu con búsqueda de camino (BFS) por las calles.
    // Resuelve con true (sobreviviste 'survive' s) o false (te pillaron).
    runGatosRound(options = {}) {
        const surviveMs = (options.survive || 60) * 1000; // tiempo a aguantar
        const catCount = options.cats || 3;               // nº de gatos perseguidores
        // Velocidades en CELDAS por segundo. Samu debe ir más rápido que los
        // gatos para poder escapar por las calles.
        const playerSpeed = options.playerSpeed || 5.0;
        const catSpeed = options.catSpeed || 3.6;

        // --- Construir el mapa del laberinto ---
        const map = VisualNovelEngine.GATOS_MAZE;
        const rows = map.length;
        const cols = Math.max(...map.map(r => r.length));
        const isWall = (c, r) => {
            if (r < 0 || r >= rows || c < 0 || c >= cols) return true;
            const row = map[r];
            return c >= row.length ? true : row[c] === '#';
        };
        const isStreet = (c, r) => !isWall(c, r);

        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'minigame-overlay gatos-minigame';
            overlay.innerHTML = `
                <div class="minigame-hud">
                    <span class="mg-timer">⏱️ ${Math.ceil(surviveMs / 1000)}s</span>
                    <span class="mg-cats"><img class="mg-hud-icon" src="assets/minigames/gato.png" alt="gato"> ${catCount}</span>
                </div>
                <div class="minigame-field" id="mg-field-gatos">
                    <div class="mg-maze" id="mg-maze"></div>
                    <div class="mg-player" id="mg-player-gatos">🐺</div>
                </div>
                <div class="minigame-instructions">¡Recorre las calles con ← ↑ → ↓ (o WASD) y aguanta sin que te pillen los gatos!</div>
            `;
            document.getElementById('game-container').appendChild(overlay);

            const field = overlay.querySelector('#mg-field-gatos');
            const maze = overlay.querySelector('#mg-maze');
            const player = overlay.querySelector('#mg-player-gatos');
            const timerEl = overlay.querySelector('.mg-timer');

            // Dibujar el laberinto como rejilla de celdas (las manzanas son
            // bloques; las calles quedan en negro). Se escala vía CSS grid.
            maze.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
            maze.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cell = document.createElement('div');
                    cell.className = isWall(c, r) ? 'mg-wall' : 'mg-street';
                    maze.appendChild(cell);
                }
            }

            // Posición en coordenadas de rejilla (celdas, con decimales). Colocar
            // a Samu y a los gatos en calles conocidas.
            const centerStreet = () => {
                // buscar la calle transitable más cercana al centro
                const cc = Math.floor(cols / 2), cr = Math.floor(rows / 2);
                for (let rad = 0; rad < Math.max(rows, cols); rad++) {
                    for (let dr = -rad; dr <= rad; dr++) {
                        for (let dc = -rad; dc <= rad; dc++) {
                            if (isStreet(cc + dc, cr + dr)) return { c: cc + dc, r: cr + dr };
                        }
                    }
                }
                return { c: 1, r: 1 };
            };
            const start = centerStreet();
            let pcx = start.c + 0.5, pcy = start.r + 0.5; // centro de celda
            let pdir = { x: 0, y: 0 };   // dirección actual
            let wantDir = { x: 0, y: 0 }; // dirección deseada (se aplica al poder)

            // Convertir celda (col,fila con decimales) a % dentro del campo
            const toPct = (cx, cy) => ({ left: (cx / cols) * 100, top: (cy / rows) * 100 });

            const placeEntity = (el, cx, cy) => {
                const p = toPct(cx, cy);
                el.style.left = `${p.left}%`;
                el.style.top = `${p.top}%`;
            };
            player.style.bottom = 'auto';
            placeEntity(player, pcx, pcy);

            // Gatos en las esquinas (calles del borde), lo más lejos posible
            const snapStreet = (c, r) => {
                if (isStreet(c, r)) return { c, r };
                const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
                for (const [dc, dr] of dirs) if (isStreet(c+dc, r+dr)) return { c: c+dc, r: r+dr };
                return { c, r };
            };
            // Cada gato arranca en una esquina, que es también su "rincón" de
            // dispersión (scatter). Las esquinas se reparten para rodear a Samu.
            const catStarts = [
                { c: 1, r: 1 }, { c: cols - 2, r: rows - 2 },
                { c: cols - 2, r: 1 }, { c: 1, r: rows - 2 },
                { c: Math.floor(cols / 2), r: 1 }, { c: Math.floor(cols / 2), r: rows - 2 }
            ].map(p => snapStreet(p.c, p.r));
            const cats = [];
            for (let i = 0; i < catCount; i++) {
                const s = catStarts[i % catStarts.length];
                const el = document.createElement('div');
                el.className = 'mg-cat';
                const catImg = document.createElement('img');
                catImg.src = 'assets/minigames/gato.png';
                catImg.alt = 'gato';
                catImg.draggable = false;
                el.appendChild(catImg);
                placeEntity(el, s.c + 0.5, s.r + 0.5);
                field.appendChild(el);
                cats.push({ el, cx: s.c + 0.5, cy: s.r + 0.5, dir: { x: 0, y: 0 },
                    wantDir: { x: 0, y: 0 }, lastCell: null, home: s, role: i });
            }
            const clampCell = (c, r) => snapStreet(
                Math.max(0, Math.min(cols - 1, c)), Math.max(0, Math.min(rows - 1, r)));

            // BFS por las calles: devuelve el primer paso (dirección) desde
            // 'from' hacia 'to'. Si no hay camino, {x:0,y:0}.
            const bfsStep = (from, to) => {
                if (from.c === to.c && from.r === to.r) return { x: 0, y: 0 };
                const key = (c, r) => `${c},${r}`;
                const q = [[from.c, from.r]];
                const prev = new Map();
                prev.set(key(from.c, from.r), null);
                const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
                let found = false;
                while (q.length) {
                    const [c, r] = q.shift();
                    if (c === to.c && r === to.r) { found = true; break; }
                    for (const [dc, dr] of dirs) {
                        const nc = c + dc, nr = r + dr;
                        if (isWall(nc, nr)) continue;
                        const k = key(nc, nr);
                        if (prev.has(k)) continue;
                        prev.set(k, [c, r]);
                        q.push([nc, nr]);
                    }
                }
                if (!found) return { x: 0, y: 0 };
                // reconstruir hasta el primer paso desde 'from'
                let cur = [to.c, to.r];
                let step = cur;
                while (true) {
                    const p = prev.get(key(cur[0], cur[1]));
                    if (!p) break;
                    if (p[0] === from.c && p[1] === from.r) { step = cur; break; }
                    cur = p;
                }
                return { x: Math.sign(step[0] - from.c), y: Math.sign(step[1] - from.r) };
            };

            // --- Controles ---
            const keyDown = (e) => {
                if (e.key === 'ArrowUp' || e.key === 'w') wantDir = { x: 0, y: -1 };
                else if (e.key === 'ArrowDown' || e.key === 's') wantDir = { x: 0, y: 1 };
                else if (e.key === 'ArrowLeft' || e.key === 'a') wantDir = { x: -1, y: 0 };
                else if (e.key === 'ArrowRight' || e.key === 'd') wantDir = { x: 1, y: 0 };
                if (e.key.startsWith('Arrow')) e.preventDefault();
            };
            const swallowClick = (e) => e.stopPropagation();
            document.addEventListener('keydown', keyDown);
            overlay.addEventListener('click', swallowClick, true);

            let running = true;
            let lastTime = null;
            const startTime = performance.now();

            const cleanup = (won) => {
                running = false;
                document.removeEventListener('keydown', keyDown);
                const result = document.createElement('div');
                result.className = 'minigame-result';
                result.textContent = won ? '¡Escapaste de la loca de los gatos!' : '¡Un gato te ha pillado!';
                overlay.appendChild(result);
                setTimeout(() => {
                    overlay.removeEventListener('click', swallowClick, true);
                    overlay.remove();
                    resolve(won);
                }, won ? 1500 : 800);
            };

            // ¿Está una entidad alineada al centro de su celda? (para poder girar)
            const atCenter = (v) => Math.abs(v - (Math.floor(v) + 0.5)) < 0.08;
            // ¿Se puede avanzar en 'dir' desde el centro de la celda (cc,cr)?
            const canGo = (cc, cr, dir) => dir.x === 0 && dir.y === 0
                ? false
                : isStreet(Math.floor(cc) + dir.x, Math.floor(cr) + dir.y);

            // Mover una entidad por la rejilla: solo gira cuando está centrada en
            // una celda y la nueva dirección es calle. Devuelve nueva {cx,cy,dir}.
            const moveGrid = (cx, cy, dir, want, speed, dt) => {
                const cCol = Math.floor(cx), cRow = Math.floor(cy);
                // Intentar aplicar la dirección deseada al estar centrado
                if (want && (want.x !== dir.x || want.y !== dir.y)) {
                    if (atCenter(cx) && atCenter(cy) && canGo(cx, cy, want)) {
                        cx = cCol + 0.5; cy = cRow + 0.5;
                        dir = { ...want };
                    }
                }
                // Si delante hay pared y estamos centrados, parar
                if (atCenter(cx) && atCenter(cy) && !canGo(cx, cy, dir)) {
                    dir = { x: 0, y: 0 };
                }
                // Avanzar, sin sobrepasar el centro si la siguiente celda es pared
                let step = speed * dt;
                if (dir.x !== 0 || dir.y !== 0) {
                    const nextIsWall = isWall(cCol + dir.x, cRow + dir.y);
                    cx += dir.x * step;
                    cy += dir.y * step;
                    if (nextIsWall) {
                        // no pasar del centro de la celda actual
                        if (dir.x > 0) cx = Math.min(cx, cCol + 0.5);
                        if (dir.x < 0) cx = Math.max(cx, cCol + 0.5);
                        if (dir.y > 0) cy = Math.min(cy, cRow + 0.5);
                        if (dir.y < 0) cy = Math.max(cy, cRow + 0.5);
                    }
                }
                return { cx, cy, dir };
            };

            const loop = (time) => {
                if (!running) return;
                if (lastTime === null) lastTime = time;
                const dt = Math.min((time - lastTime) / 1000, 0.05);
                lastTime = time;

                // --- Mover a Samu ---
                const pr = moveGrid(pcx, pcy, pdir, wantDir, playerSpeed, dt);
                pcx = pr.cx; pcy = pr.cy; pdir = pr.dir;
                placeEntity(player, pcx, pcy);

                // --- Mover los gatos (persecución BFS por calles) ---
                // Como los fantasmas de Pac-Man, los gatos NO persiguen todos
                // directo: alternan "scatter" (van a su rincón) y "chase" (cazan),
                // y en chase cada uno tiene un objetivo distinto. Esto crea
                // ventanas de escape; si todos apuntaran a Samu lo acorralarían
                // siempre y el juego sería imposible.
                const elapsed = time - startTime;
                const scatter = (Math.floor(elapsed / 1000) % 8) < 3; // 3s scatter cada 8s
                const playerCell = { c: Math.floor(pcx), r: Math.floor(pcy) };
                for (const cat of cats) {
                    // Recalcula su rumbo al llegar al centro de una celda nueva
                    // (una intersección): así gira justo donde toca. El BFS sobre
                    // ~180 celdas es barato a esta frecuencia.
                    const cellC = Math.floor(cat.cx), cellR = Math.floor(cat.cy);
                    const centered = atCenter(cat.cx) && atCenter(cat.cy);
                    const newCell = !cat.lastCell || cellC !== cat.lastCell.c || cellR !== cat.lastCell.r;
                    const stopped = cat.dir.x === 0 && cat.dir.y === 0;
                    if (centered && (newCell || stopped)) {
                        // Objetivo según modo y rol del gato
                        let target;
                        if (scatter) {
                            target = cat.home;
                        } else if (cat.role === 0) {
                            target = playerCell;                                   // caza directa
                        } else if (cat.role === 1) {
                            // emboscar: apunta 4 celdas por delante de Samu
                            target = clampCell(playerCell.c + pdir.x * 4, playerCell.r + pdir.y * 4);
                        } else {
                            // acosador tímido: solo caza si está lejos; si no, ronda su rincón
                            const manhattan = Math.abs(cellC - playerCell.c) + Math.abs(cellR - playerCell.r);
                            target = manhattan > 6 ? playerCell : cat.home;
                        }
                        cat.wantDir = bfsStep({ c: cellC, r: cellR }, target);
                        cat.lastCell = { c: cellC, r: cellR };
                    }
                    const cr = moveGrid(cat.cx, cat.cy, cat.dir, cat.wantDir, catSpeed, dt);
                    cat.cx = cr.cx; cat.cy = cr.cy; cat.dir = cr.dir;
                    placeEntity(cat.el, cat.cx, cat.cy);

                    // Colisión: misma celda / muy cerca
                    if (Math.hypot(cat.cx - pcx, cat.cy - pcy) < 0.6) {
                        return cleanup(false);
                    }
                }

                // --- Cuenta atrás ---
                const remaining = Math.max(0, surviveMs - elapsed);
                timerEl.textContent = `⏱️ ${Math.ceil(remaining / 1000)}s`;
                if (remaining <= 0) return cleanup(true);

                requestAnimationFrame(loop);
            };

            requestAnimationFrame(loop);
        });
    }

    // Minijuego: reacción rápida en Ecchi Land.
    // Orquesta las rondas y permite reintentar si pierdes.
    async playEcchiMinigame(options = {}) {
        this.isWaitingForInput = false;

        let won = false;
        while (!won) {
            won = await this.runEcchiRound(options);
            if (!won) {
                await this.showMinigameRetry('¡Te dejaste llevar! 💔');
            }
        }
        return won;
    }

    // Una ronda del minijuego de reacción. Resuelve true (ganada) o false (perdida).
    // Clica 🍑 antes de que desaparezcan; NO cliques 💋 (trampas).
    runEcchiRound(options = {}) {
        const goal = options.goal || 12;          // aciertos para ganar
        const maxMisses = options.maxMisses || 3; // fallos permitidos
        const lifetime = options.lifetime || 1100; // ms que dura cada objetivo

        this.isWaitingForInput = false;

        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'minigame-overlay ecchi-minigame';
            overlay.innerHTML = `
                <div class="minigame-hud">
                    <span class="mg-score">🍑 0 / ${goal}</span>
                    <span class="mg-lives">💔 ${maxMisses}</span>
                </div>
                <div class="minigame-field" id="mg-field-ecchi"></div>
                <div class="minigame-instructions">¡Clica los 🍑 a tiempo! No toques los 💋</div>
            `;
            document.getElementById('game-container').appendChild(overlay);

            const field = overlay.querySelector('#mg-field-ecchi');
            const scoreEl = overlay.querySelector('.mg-score');
            const livesEl = overlay.querySelector('.mg-lives');

            let score = 0;
            let misses = 0;
            let running = true;
            let spawnTimeout = null;
            const activeTargets = new Set();

            // Bloquear clics que avanzarían el diálogo, pero dejar pasar los
            // que caen sobre un objetivo del minijuego
            const swallowClick = (e) => {
                if (!e.target.closest('.mg-target')) {
                    e.stopPropagation();
                }
            };
            overlay.addEventListener('click', swallowClick, true);

            const registerMiss = () => {
                misses++;
                livesEl.textContent = `💔 ${Math.max(0, maxMisses - misses)}`;
                field.classList.add('mg-hit');
                setTimeout(() => field.classList.remove('mg-hit'), 200);
                if (misses >= maxMisses) endRound(false);
            };

            const registerHit = () => {
                score++;
                scoreEl.textContent = `🍑 ${score} / ${goal}`;
                if (score >= goal) endRound(true);
            };

            const spawnTarget = () => {
                if (!running) return;

                const isTrap = Math.random() < 0.35; // 35% trampas 💋
                const target = document.createElement('div');
                target.className = 'mg-target' + (isTrap ? ' mg-trap' : '');
                target.textContent = isTrap ? '💋' : '🍑';

                // Posición aleatoria dentro del campo (con margen)
                target.style.left = `${Math.random() * 80 + 5}%`;
                target.style.top = `${Math.random() * 70 + 10}%`;
                field.appendChild(target);
                activeTargets.add(target);

                // Tiempo de vida del objetivo
                const ttl = setTimeout(() => {
                    if (!running) return;
                    activeTargets.delete(target);
                    target.remove();
                    // Dejar escapar un 🍑 cuenta como fallo; un 💋 escapado está bien
                    if (!isTrap) registerMiss();
                }, lifetime);

                target.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!running) return;
                    clearTimeout(ttl);
                    activeTargets.delete(target);
                    target.remove();
                    if (isTrap) {
                        registerMiss();
                    } else {
                        registerHit();
                    }
                });

                // Programar el siguiente
                spawnTimeout = setTimeout(spawnTarget, 550 + Math.random() * 450);
            };

            const endRound = (won) => {
                if (!running) return;
                running = false;
                clearTimeout(spawnTimeout);
                activeTargets.forEach(t => t.remove());
                activeTargets.clear();
                overlay.removeEventListener('click', swallowClick, true);

                const result = document.createElement('div');
                result.className = 'minigame-result';
                result.textContent = won ? '¡Resististe la tentación! 😎' : '¡Caíste! 💔';
                overlay.appendChild(result);

                setTimeout(() => {
                    overlay.remove();
                    resolve(won);
                }, won ? 1500 : 800);
            };

            spawnTarget();
        });
    }

    // Minijuego: memoria de palomas (estilo Simon) en Paloma City.
    // Orquesta las rondas y permite reintentar si pierdes.
    async playPalomaMinigame(options = {}) {
        this.isWaitingForInput = false;

        let won = false;
        while (!won) {
            won = await this.runPalomaRound(options);
            if (!won) {
                await this.showMinigameRetry('¡Las palomas te confundieron! 🕊️');
            }
        }
        return won;
    }

    // Una partida de memoria: repite la secuencia de palomas que se ilumina.
    // La secuencia crece cada nivel hasta completar `rounds`. Resuelve true/false.
    runPalomaRound(options = {}) {
        const rounds = options.rounds || 5;      // niveles para ganar
        const flashMs = options.flashMs || 600;  // duración de cada destello
        const gapMs = options.gapMs || 250;      // pausa entre destellos
        const palomas = ['🕊️', '🐦', '🦤', '🦆']; // cuatro palomas distintas

        this.isWaitingForInput = false;

        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'minigame-overlay paloma-minigame';
            overlay.innerHTML = `
                <div class="minigame-hud">
                    <span class="mg-score">Nivel 1 / ${rounds}</span>
                    <span class="mg-status">Observa...</span>
                </div>
                <div class="paloma-grid" id="paloma-grid">
                    ${palomas.map((p, i) => `
                        <button class="paloma-pad" data-index="${i}">${p}</button>
                    `).join('')}
                </div>
                <div class="minigame-instructions">Memoriza la secuencia de palomas y repítela.</div>
            `;
            document.getElementById('game-container').appendChild(overlay);

            const grid = overlay.querySelector('#paloma-grid');
            const scoreEl = overlay.querySelector('.mg-score');
            const statusEl = overlay.querySelector('.mg-status');
            const pads = Array.from(overlay.querySelectorAll('.paloma-pad'));

            // No dejar que los clics avancen el diálogo de fondo
            const swallowClick = (e) => {
                if (!e.target.closest('.paloma-pad')) e.stopPropagation();
            };
            overlay.addEventListener('click', swallowClick, true);

            let sequence = [];
            let inputIndex = 0;
            let acceptingInput = false;
            let level = 0;

            const wait = (ms) => new Promise(r => setTimeout(r, ms));

            const flashPad = async (idx) => {
                pads[idx].classList.add('paloma-active');
                await wait(flashMs);
                pads[idx].classList.remove('paloma-active');
                await wait(gapMs);
            };

            const finish = (won) => {
                acceptingInput = false;
                overlay.removeEventListener('click', swallowClick, true);

                const result = document.createElement('div');
                result.className = 'minigame-result';
                result.textContent = won ? '¡Memoria de paloma! 🕊️🎉' : '¡Secuencia incorrecta! 🐦';
                overlay.appendChild(result);

                setTimeout(() => {
                    overlay.remove();
                    resolve(won);
                }, won ? 1500 : 800);
            };

            const playSequence = async () => {
                acceptingInput = false;
                statusEl.textContent = 'Observa...';
                grid.classList.add('paloma-locked');
                await wait(500);
                for (const idx of sequence) {
                    await flashPad(idx);
                }
                grid.classList.remove('paloma-locked');
                statusEl.textContent = '¡Tu turno!';
                inputIndex = 0;
                acceptingInput = true;
            };

            const nextLevel = async () => {
                level++;
                scoreEl.textContent = `Nivel ${level} / ${rounds}`;
                // Añadir una paloma aleatoria a la secuencia
                sequence.push(Math.floor(Math.random() * pads.length));
                await playSequence();
            };

            pads.forEach((pad, idx) => {
                pad.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!acceptingInput) return;

                    // Feedback visual breve
                    pad.classList.add('paloma-active');
                    setTimeout(() => pad.classList.remove('paloma-active'), 180);

                    if (idx === sequence[inputIndex]) {
                        inputIndex++;
                        if (inputIndex >= sequence.length) {
                            // Secuencia completa de este nivel
                            acceptingInput = false;
                            if (level >= rounds) {
                                finish(true);
                            } else {
                                statusEl.textContent = '¡Bien!';
                                await wait(600);
                                await nextLevel();
                            }
                        }
                    } else {
                        // Fallo
                        finish(false);
                    }
                });
            });

            nextLevel();
        });
    }

    setBackground(imagePath) {
        const bg = document.getElementById('background');
        bg.style.backgroundImage = `url('${imagePath}')`;
    }

    async showCharacter(characterName, position = 'left', pose = 'neutral') {
        const character = this.characters[characterName];
        if (!character) return;

        const charElement = document.getElementById(`character-${position}`);
        if (charElement) {
            const poseImage = character.poses && character.poses[pose]
                ? character.poses[pose]
                : (character.poses && character.poses[character.defaultPose])
                ? character.poses[character.defaultPose]
                : character.image || character.poses?.neutral;

            charElement.style.backgroundImage = `url('${poseImage}')`;
            charElement.classList.add('active');

            // Rastrear posición del personaje
            this.characterPositions[characterName.toLowerCase()] = position;
        }
    }

    setPose(characterName, position, pose = 'neutral') {
        const character = this.characters[characterName];
        if (!character) return;

        const charElement = document.getElementById(`character-${position}`);
        if (charElement && charElement.classList.contains('active')) {
            const poseImage = character.poses && character.poses[pose]
                ? character.poses[pose]
                : (character.poses && character.poses[character.defaultPose])
                ? character.poses[character.defaultPose]
                : character.image || character.poses?.neutral;

            charElement.style.backgroundImage = `url('${poseImage}')`;
        }
    }

    // Quita a un personaje de la escena. Se puede indicar:
    // - characterName: quita al personaje (usando la posición rastreada en la
    //   que se mostró; si además se da position, solo quita si coincide).
    // - position (sin characterName): vacía directamente ese hueco (left/right/center).
    // Si no se indica ninguno, no hace nada.
    hideCharacter(characterName, position) {
        const clearSlot = (pos) => {
            const el = document.getElementById(`character-${pos}`);
            if (el) {
                el.classList.remove('active', 'speaking');
                el.style.backgroundImage = '';
            }
        };

        if (characterName) {
            const key = characterName.toLowerCase();
            const tracked = this.characterPositions[key];
            const target = position || tracked;
            if (target) {
                // Si se pasó position explícita y no coincide con la rastreada,
                // respetamos la position pedida igualmente (limpia ese hueco).
                clearSlot(target);
                if (this.characterPositions[key] === target) {
                    delete this.characterPositions[key];
                }
            }
        } else if (position) {
            clearSlot(position);
            // Olvidar cualquier personaje que estuviera rastreado en esa posición
            for (const k of Object.keys(this.characterPositions)) {
                if (this.characterPositions[k] === position) delete this.characterPositions[k];
            }
        }
    }

    focusCharacter(characterName, position) {
        const charElement = document.getElementById(`character-${position}`);
        if (charElement && charElement.classList.contains('active')) {
            charElement.classList.add('speaking');
        }
    }

    unfocusCharacter(position) {
        const charElement = document.getElementById(`character-${position}`);
        if (charElement) {
            charElement.classList.remove('speaking');
        }
    }

    playSound(soundPath, options = {}) {
        const {
            volume = 1.0,
            loop = false,
            autoPlay = true,
            id = null,
            fadeIn = 0
        } = options;

        const audio = new Audio(soundPath);
        audio.volume = Math.max(0, Math.min(1, volume)); // Clamp 0-1
        audio.loop = loop;

        // Si es música (loop), guardar como música actual
        if (loop) {
            this.currentMusic = audio;
        }

        // Rastrear por ID si se proporciona
        if (id) {
            this.audioInstances[id] = audio;
        }

        // Fade in si se especifica
        if (fadeIn > 0) {
            audio.volume = 0;
            let startTime = Date.now();
            const targetVolume = Math.max(0, Math.min(1, volume));

            const fadeInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / fadeIn, 1);
                audio.volume = targetVolume * progress;

                if (progress >= 1) {
                    clearInterval(fadeInterval);
                }
            }, 20);
        }

        if (autoPlay) {
            audio.play().catch(e => console.log('Error reproduciendo sonido:', e));
        }

        return audio;
    }

    stopSound(audioOrId, fadeOut = 0) {
        let audio = audioOrId;

        // Si es string, buscar por ID
        if (typeof audioOrId === 'string') {
            audio = this.audioInstances[audioOrId];
            if (!audio) {
                console.warn(`Audio con ID "${audioOrId}" no encontrado`);
                return;
            }
        }

        if (!audio) return;

        if (fadeOut > 0) {
            // Fade out gradual
            let startTime = Date.now();
            const initialVolume = audio.volume;

            const fadeInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / fadeOut, 1);
                audio.volume = initialVolume * (1 - progress);

                if (progress >= 1) {
                    clearInterval(fadeInterval);
                    audio.pause();
                    audio.currentTime = 0;
                }
            }, 20);
        } else {
            // Parar inmediatamente
            audio.pause();
            audio.currentTime = 0;
        }
    }

    stopAllSounds() {
        // Parar toda la música y efectos
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.currentMusic = null;
        }

        // Parar todos los efectos registrados
        for (const id in this.audioInstances) {
            this.audioInstances[id].pause();
            this.audioInstances[id].currentTime = 0;
        }
        this.audioInstances = {};
    }

    pauseSound(audioOrId) {
        let audio = audioOrId;

        if (typeof audioOrId === 'string') {
            audio = this.audioInstances[audioOrId];
        }

        if (audio) {
            audio.pause();
        }
    }

    resumeSound(audioOrId) {
        let audio = audioOrId;

        if (typeof audioOrId === 'string') {
            audio = this.audioInstances[audioOrId];
        }

        if (audio) {
            audio.play().catch(e => console.log('Error reanudando sonido:', e));
        }
    }

    setVolume(audioOrId, volume) {
        let audio = audioOrId;

        if (typeof audioOrId === 'string') {
            audio = this.audioInstances[audioOrId];
        }

        if (audio) {
            audio.volume = Math.max(0, Math.min(1, volume));
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async displayDialog(line) {
        const characterName = document.getElementById('character-name');
        const dialogText = document.getElementById('dialog-text');
        const dialogBox = document.getElementById('dialog-box');

        characterName.textContent = line.character || '';
        dialogText.textContent = '';
        dialogBox.classList.add('active');

        // Encontrar y aplicar efecto al personaje que habla. Por defecto es el
        // sprite cuyo nombre coincide con line.character, pero se puede forzar
        // otro con "speakingAs" (p. ej. en las llamadas habla "Edu" pero el
        // sprite en pantalla es el móvil "iphone5", que es el que debe resaltarse).
        const speakerName = (line.speakingAs || line.character || '').toLowerCase();

        // Limpiar efectos de todos los personajes
        ['left', 'right'].forEach(pos => {
            const elem = document.getElementById(`character-${pos}`);
            if (elem) elem.classList.remove('speaking');
        });

        // Buscar la posición del personaje que habla usando el rastreo
        const speakerPosition = this.characterPositions[speakerName];

        if (speakerPosition) {
            const speakerElement = document.getElementById(`character-${speakerPosition}`);
            if (speakerElement && speakerElement.classList.contains('active')) {
                speakerElement.classList.add('speaking');
                this.speakingCharacter = speakerName;
                this.speakingPosition = speakerPosition;
            }
        }

        this.isWaitingForInput = false;

        return new Promise(resolve => {
            let charIndex = 0;
            const text = line.text;
            let skipTyping = false;
            let timeoutId = null;

            const typeChar = () => {
                if (skipTyping) {
                    dialogText.textContent = text;
                    this.isWaitingForInput = true;
                    resolve();
                    return;
                }

                if (charIndex < text.length) {
                    dialogText.textContent += text[charIndex];
                    charIndex++;
                    timeoutId = setTimeout(typeChar, this.typingSpeed);
                } else {
                    this.isWaitingForInput = true;
                    resolve();
                }
            };

            const skipHandler = () => {
                skipTyping = true;
                if (timeoutId) clearTimeout(timeoutId);
                dialogText.textContent = text;
                this.isWaitingForInput = true;
                document.removeEventListener('click', skipHandler);
                resolve();
            };

            document.addEventListener('click', skipHandler);
            typeChar();
        });
    }

    // Registrar que se ha completado una llamada según el título de la escena
    registerCall(scene) {
        if (!scene || !scene.title) return;
        const title = scene.title;
        if (title.includes("Llamada a Edu") && !this.completedCalls.includes("edu")) {
            this.completedCalls.push("edu");
        } else if (title.includes("Llamada a Tony") && !this.completedCalls.includes("tony")) {
            this.completedCalls.push("tony");
        } else if (title.includes("Llamada a José") && !this.completedCalls.includes("jose")) {
            this.completedCalls.push("jose");
        }
    }

    // Devuelve true si la escena de destino de una llamada ya fue completada
    isCallChoiceCompleted(choice) {
        if (!choice.nextScene || typeof choice.nextScene !== 'string') return false;
        const target = choice.nextScene;
        if (target.includes("Llamada a Edu")) return this.completedCalls.includes("edu");
        if (target.includes("Llamada a Tony")) return this.completedCalls.includes("tony");
        if (target.includes("Llamada a José")) return this.completedCalls.includes("jose");
        return false;
    }

    // Indica si una opción es una llamada a un amigo (destino de escena de llamada)
    isCallChoice(choice) {
        if (!choice || !choice.nextScene || typeof choice.nextScene !== 'string') return false;
        return choice.nextScene.includes("Llamada a");
    }

    // Regla del teléfono: Samu solo puede completar una llamada "real" por cada
    // amigo rescatado (más la primera del principio). Es decir, tras llamar a
    // uno, el resto queda "fuera de cobertura" hasta que rescate a alguien.
    // Así, tanto en el Capítulo 1 como al final de cada Capítulo 2, solo puede
    // llamar a UN amigo antes de tener que ponerse en marcha.
    canMakeRealCall() {
        return this.completedCalls.length < this.rescued.length + 1;
    }

    async displayChoices(choices) {
        const choicesContainer = document.getElementById('choices-container');
        choicesContainer.innerHTML = '';
        choicesContainer.classList.add('active');

        // Filtrar opciones:
        // - ocultar las llamadas ya realizadas
        // - ocultar "Investigar más" hasta completar las 3 llamadas
        // - ocultar rescates de personajes ya rescatados
        const availableChoices = choices.filter(choice => {
            if (this.isCallChoiceCompleted(choice)) return false;
            if (choice.requireAllCalls && this.completedCalls.length < 3) return false;
            if (choice.rescueTarget && this.rescued.includes(choice.rescueTarget)) return false;
            if (choice.requireAllRescued && this.rescued.length < 3) return false;
            return true;
        });

        return new Promise(resolve => {
            availableChoices.forEach((choice, index) => {
                const button = document.createElement('button');
                button.className = 'choice-btn';
                button.innerHTML = `
                    <span>${choice.text}</span>
                `;
                button.style.animationDelay = `${index * 0.1}s`;
                button.onclick = () => {
                    choicesContainer.classList.remove('active');
                    resolve(choice);
                };
                choicesContainer.appendChild(button);
            });
        });
    }

    async nextLine() {
        const scene = this.getCurrentScene();
        if (!scene || !scene.lines) return false;

        const line = this.getCurrentLine();
        if (!line) return false;

        // Ejecutar acciones previas al diálogo
        if (line.actions) {
            for (let action of line.actions) {
                await this.executeAction(action);
                // Si una acción solicitó saltar de escena, detener el
                // procesamiento de esta línea y continuar en el nuevo destino.
                if (this.pendingSceneJump) {
                    this.pendingSceneJump = false;
                    return true;
                }
            }
        }

        // Mostrar diálogo si existe (con posible variante por consecuencia)
        if (line.text) {
            await this.displayDialog(this.resolveConsequenceLine(line));
        }

        // Si hay elecciones, mostrarlas
        if (line.choices) {
            const selectedChoice = await this.displayChoices(line.choices);
            this.history.push({
                scene: this.currentScene,
                line: this.currentLine,
                choice: selectedChoice.text
            });

            // Si la elección define una ruta de capítulo, guardarla para
            // que el juego cargue el capítulo correspondiente al terminar
            if (selectedChoice.nextChapter !== undefined) {
                this.nextChapter = selectedChoice.nextChapter;
            }

            // Si la elección lleva al Capítulo 3 según el primer rescatado,
            // resolver el destino dinámicamente (chapter3-<primero>)
            if (selectedChoice.chapter3ByFirst && this.rescued.length > 0) {
                this.nextChapter = `chapter3-${this.rescued[0]}`;
            }

            // Si la elección lleva al Capítulo 2 según el primer amigo llamado,
            // resolver el destino dinámicamente (chapter2-<primera llamada>)
            if (selectedChoice.chapter2ByFirstCalled && this.completedCalls.length > 0) {
                this.nextChapter = `chapter2-${this.completedCalls[0]}`;
            }

            // Si la elección lleva al Capítulo 2 según el último amigo llamado,
            // resolver el destino dinámicamente (chapter2-<última llamada>)
            if (selectedChoice.chapter2ByLastCalled && this.completedCalls.length > 0) {
                this.nextChapter = `chapter2-${this.completedCalls[this.completedCalls.length - 1]}`;
            }

            // Ir a la escena/línea correspondiente
            if (selectedChoice.nextScene !== undefined) {
                // Regla del teléfono: si es una llamada pero Samu ya gastó su
                // llamada disponible (sin rescatar a nadie desde entonces),
                // redirigir a la escena de "fuera de cobertura" y no completar
                // la llamada real.
                let targetTitle = selectedChoice.nextScene;
                if (this.isCallChoice(selectedChoice) && !this.canMakeRealCall()) {
                    targetTitle = selectedChoice.offCoverageScene || "Escena: Fuera de cobertura";
                }

                // Si el destino es un string (título), buscar la escena por título
                if (typeof targetTitle === 'string') {
                    const sceneIndex = this.currentChapter.scenes.findIndex(
                        scene => scene.title === targetTitle
                    );
                    this.currentScene = sceneIndex !== -1 ? sceneIndex : 0;
                } else {
                    // Si es un número, usarlo directamente
                    this.currentScene = targetTitle;
                }
                this.currentLine = 0;
                this.sceneEndedByChoice = true; // Marcar que esta escena vino de una elección

                // Registrar la llamada solo si de verdad entramos en la escena de llamada
                this.registerCall(this.getCurrentScene());

                return true;
            } else if (selectedChoice.nextLine !== undefined) {
                this.currentLine = selectedChoice.nextLine;
            } else {
                this.currentLine++;
            }
        } else {
            this.currentLine++;
        }

        // Verificar si hemos llegado al final de la escena
        if (this.currentLine >= scene.lines.length) {
            // Si la escena fue seleccionada por una elección, no avanzar automáticamente
            if (this.sceneEndedByChoice) {
                this.sceneEndedByChoice = false;
                return false; // Fin de la escena (sin continuar a la siguiente)
            }

            this.currentScene++;
            this.currentLine = 0;

            if (this.currentScene >= this.currentChapter.scenes.length) {
                return false; // Fin del capítulo
            }
        }

        return true;
    }

    hideDialog() {
        const dialogBox = document.getElementById('dialog-box');
        dialogBox.classList.remove('active');
    }

    reset() {
        this.currentScene = 0;
        this.currentLine = 0;
        this.gameState = {};
        this.history = [];
        this.lastChapterName = null;
        this.speakingCharacter = null;
        this.speakingPosition = null;
        this.characterPositions = {};
        this.sceneEndedByChoice = false;
        // Nota: completedCalls NO se limpia aquí; debe persistir entre capítulos
        // igual que rescued, para que la regla de llamadas funcione al final de
        // cada Capítulo 2. Se limpia solo al empezar una partida nueva.
        this.storyDelay = 0;
        this.pendingSceneJump = false;

        // Detener todos los sonidos
        this.stopAllSounds();

        // Limpiar la interfaz visual
        this.hideDialog();

        // Limpiar personajes
        const leftChar = document.getElementById('character-left');
        const rightChar = document.getElementById('character-right');
        const centerChar = document.getElementById('character-center');

        if (leftChar) {
            leftChar.classList.remove('active');
            leftChar.classList.remove('speaking');
        }
        if (rightChar) {
            rightChar.classList.remove('active');
            rightChar.classList.remove('speaking');
        }
        if (centerChar) {
            centerChar.classList.remove('active');
            centerChar.classList.remove('speaking');
        }

        // Limpiar fondo
        const bg = document.getElementById('background');
        if (bg) bg.style.backgroundImage = '';

        // Limpiar elecciones
        const choicesContainer = document.getElementById('choices-container');
        if (choicesContainer) {
            choicesContainer.classList.remove('active');
            choicesContainer.innerHTML = '';
        }
    }

    async playChapterIntro(chapter) {
        const gameContainer = document.getElementById('game-container');
        const chapterTitle = chapter.title || 'Capítulo Sin Título';

        // Crear overlay de capítulo
        const chapterOverlay = document.createElement('div');
        chapterOverlay.className = 'chapter-intro-overlay';
        chapterOverlay.innerHTML = `
            <div class="chapter-intro-content">
                <div class="chapter-intro-line chapter-intro-line-top"></div>
                <div class="chapter-intro-text">
                    <h2 class="chapter-intro-title">${chapterTitle}</h2>
                </div>
                <div class="chapter-intro-line chapter-intro-line-bottom"></div>
            </div>
        `;

        gameContainer.appendChild(chapterOverlay);

        // Esperar a que la animación se complete
        return new Promise(resolve => {
            setTimeout(() => {
                chapterOverlay.classList.add('fade-out');
                setTimeout(() => {
                    chapterOverlay.remove();
                    resolve();
                }, 500);
            }, 2000);
        });
    }

    async showChapterEnd(chapterTitle) {
        const gameContainer = document.getElementById('game-container');

        // Crear overlay de fin de capítulo
        const endOverlay = document.createElement('div');
        endOverlay.className = 'chapter-end-overlay';
        endOverlay.innerHTML = `
            <div class="chapter-end-content">
                <div class="chapter-end-line chapter-end-line-top"></div>
                <div class="chapter-end-text">
                    <h2 class="chapter-end-title">Fin del Capítulo</h2>
                    <p class="chapter-end-subtitle">${chapterTitle}</p>
                </div>
                <div class="chapter-end-line chapter-end-line-bottom"></div>
                <button class="chapter-end-btn" id="continue-btn">Continuar</button>
            </div>
        `;

        gameContainer.appendChild(endOverlay);

        // Esperar a que hagan click en Continuar
        return new Promise(resolve => {
            const continueBtn = document.getElementById('continue-btn');
            continueBtn.addEventListener('click', () => {
                endOverlay.classList.add('fade-out');
                setTimeout(() => {
                    endOverlay.remove();
                    resolve();
                }, 500);
            });
        });
    }
}
