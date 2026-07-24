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
        this._charColorMissing = new Set(); // Claves de personaje sin ficha (evita 404 repetidos al colorear el nombre)
        this.audioInstances = {}; // Rastrear instancias de audio
        this.currentMusic = null; // Música de fondo actual
        this.sceneEndedByChoice = false; // Indica si la escena terminó por una elección
        this.completedCalls = []; // Rastrear las llamadas completadas
        this.nextChapter = null; // Capítulo a cargar (ruta ramificada elegida)
        this.rescued = []; // Personajes rescatados, en orden (persiste entre capítulos)
        this.inventory = []; // Objetos conseguidos (p. ej. 'diapason'); persiste entre capítulos
        this.storyDelay = 0; // Retraso acumulado por las decisiones de ruta dentro de un capítulo
        this.debugMode = false; // Modo debug para testing
    }

    // Añade un objeto al inventario (sin duplicar). Persiste entre capítulos.
    addItem(name) {
        if (name && !this.inventory.includes(name)) this.inventory.push(name);
    }

    // Indica si el jugador tiene un objeto en el inventario.
    hasItem(name) {
        return this.inventory.includes(name);
    }

    async loadChapter(chapterName) {
        try {
            const response = await fetch(`chapters/${chapterName}.json?v=${Date.now()}`, {
                cache: 'no-store'
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
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
            const characterKey = this.getCharacterKey(characterName);
            const response = await fetch(`characters/${characterKey}.json?v=${Date.now()}`, {
                cache: 'no-store'
            });
            const character = await response.json();
            this.characters[characterKey] = character;
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
                this.setBackground(action.value, action);
                break;
            case 'clearBackground':
            case 'removeBackground':
                this.clearBackground();
                break;
            case 'showCharacter':
                await this.showCharacter(action.character, action.position, action.pose, action.flipped, action.enter);
                break;
            case 'hideCharacter':
            case 'removeCharacter':
            case 'quitarPersonaje':
                this.hideCharacter(action.character, action.position, action.exit);
                break;
            case 'setPose':
                this.setPose(action.character, action.position, action.pose);
                break;
            case 'hideDialog':
            case 'hideText':
            case 'ocultarTexto':
                this.hideDialog();
                break;
            case 'setVariable':
                this.gameState[action.variable] = action.value;
                break;
            case 'giveItem':
            case 'addItem':
                this.addItem(action.item || action.value);
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
                await this.wait(action.ms != null ? action.ms : action.value);
                break;
            case 'waitForClick':
            case 'waitClick':
            case 'esperarClick':
                await this.waitForActionClick();
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
            case 'setNextChapter':
                this.nextChapter = action.value;
                break;
            case 'playVideo':
            case 'cutscene':
                await this.playVideo(action);
                break;
            // ---- Efectos de "game feel" (juice.js) ----
            case 'shake':
            case 'screenShake':
                if (window.Juice) window.Juice.shake(action.intensity || action.value || 8, action.duration || 350);
                break;
            case 'flash':
                if (window.Juice) window.Juice.flash(action.color || action.value, action.duration);
                break;
            case 'grade':
            case 'colorGrade':
            case 'tinte':
                if (window.Juice) window.Juice.grade(action.value || action.filter || 'none', action.duration);
                break;
            case 'vignette':
            case 'vigneta':
                if (window.Juice) {
                    const s = (action.value != null) ? action.value : action.strength;
                    window.Juice.vignette(s, action.duration);
                }
                break;
            // ---- Juice II (jul 2026): dirección de escena ----
            case 'fade':
                // { to:"black", duration } funde A negro; { from:"black", duration }
                // funde DESDE negro. Espera a que termine.
                await this.fadeScene(action);
                break;
            case 'bgPan':
                // Ken Burns del fondo: { zoomFrom, zoomTo, xFrom..yTo (%), duration }
                this.bgPan(action);
                break;
            case 'showCG':
                await this.showCG(action.path || action.value, action.duration);
                break;
            case 'hideCG':
                this.hideCG(action.duration);
                break;
            case 'sfx':
                // Capa Web Audio sintetizada (latido, rumble). { name, on, volume }
                if (window.Juice && window.Juice.sfx) {
                    window.Juice.sfx(action.name, action.on !== false, action);
                }
                break;
        }
    }

    // Reproduce un vídeo/cutscene a pantalla completa (p. ej. el opening de Tony).
    // El vídeo trae su propio audio; se pausa la música del juego mientras dura y
    // se reanuda al terminar. Se puede saltar con clic / Esc / Enter / Espacio.
    playVideo(action = {}) {
        const src = action.path || action.value || action.src;
        if (!src) { console.warn('playVideo: falta la ruta del vídeo'); return Promise.resolve(); }

        // Pausar la música que esté sonando para no solaparla con el audio del vídeo.
        const paused = [];
        const tryPause = (audio) => {
            if (audio && !audio.paused) { try { audio.pause(); paused.push(audio); } catch (e) {} }
        };
        tryPause(this.currentMusic);
        for (const a of Object.values(this.audioInstances || {})) tryPause(a);

        this.isWaitingForInput = false;

        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'cutscene-overlay';

            const video = document.createElement('video');
            video.className = 'cutscene-video';
            video.src = this.cacheBustAsset(src);
            video.setAttribute('playsinline', '');
            video.autoplay = true;
            video.controls = false;
            video.muted = !!action.muted;

            const skipHint = document.createElement('div');
            skipHint.className = 'cutscene-skip';
            skipHint.textContent = 'Clic para saltar ▶▶';

            overlay.appendChild(video);
            overlay.appendChild(skipHint);
            document.getElementById('game-container').appendChild(overlay);

            let done = false;
            const finish = () => {
                if (done) return;
                done = true;
                document.removeEventListener('keydown', onKey);
                try { video.pause(); } catch (e) {}
                overlay.remove();
                for (const a of paused) { try { a.play().catch(() => {}); } catch (e) {} }
                resolve();
            };

            const onKey = (e) => {
                if (['Escape', 'Enter', ' ', 'Spacebar'].includes(e.key)) { e.preventDefault(); finish(); }
            };

            video.addEventListener('ended', finish);
            video.addEventListener('error', finish);
            overlay.addEventListener('click', finish);
            document.addEventListener('keydown', onKey);

            // Autoplay puede fallar si el navegador exige gesto: ofrecer clic para arrancar.
            const p = video.play();
            if (p && p.catch) {
                p.catch(() => { skipHint.textContent = 'Clic para reproducir ▶'; });
            }
        });
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
        // Al cambiar de escena, cualquier CG a pantalla se retira solo
        this.hideCG(250);
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
            case 'runa':
                await this.playRunaMinigame(action);
                break;
            case 'gatos':
                await this.playGatosMinigame(action);
                break;
            case 'vocalecho':
                await this.playVocalEchoMinigame(action);
                break;
            case 'rhythm':
                await this.playRhythmMinigame(action);
                break;
            case 'battle':
                await this.playBattleMinigame(action);
                break;
            case 'chase':
                await this.playChaseMinigame(action);
                break;
            case 'eduvuelo':
                await this.playEduVueloMinigame(action);
                break;
            case 'credits':
            case 'creditos':
                await this.playCreditsMinigame(action);
                break;
            default:
                console.warn(`Minijuego desconocido: ${action.game}`);
        }
    }

    async playCreditsMinigame(options = {}) {
        this.isWaitingForInput = false;

        if (!window.CreditsMinigame) {
            console.warn('CreditsMinigame no está cargado.');
            return false;
        }

        return await window.CreditsMinigame.play(options);
    }

    async playBattleMinigame(options = {}) {
        this.isWaitingForInput = false;

        if (!window.BattleMinigame) {
            console.warn('BattleMinigame no está cargado.');
            return false;
        }

        return await window.BattleMinigame.play(options);
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
        const spawnRate = options.spawnRate || 1.0; // multiplicador de frecuencia de aparición
        const speedMult = options.speedMult || 1.0; // multiplicador de velocidad de caída
        const chiliChance = options.chiliChance !== undefined ? options.chiliChance : 0.6;
        const showExtraInfo = options.showExtraInfo || false; // mostrar info de debug/test
        const ketchupIcon = this.cacheBustAsset('assets/minigames/ketchup.png');
        const chiliIcon = this.cacheBustAsset('assets/minigames/chili.png');
        const musicTrack = options.music;

        return new Promise(resolve => {
            // Reproducir música del minijuego (si se proporciona)
            let musicAudio = null;
            if (musicTrack) {
                musicAudio = new Audio(musicTrack);
                musicAudio.loop = true;
                musicAudio.volume = 0.6;
                musicAudio.play().catch(() => {
                    // Silenciosamente fallar si no se puede reproducir
                });
            }
            // --- Crear overlay del minijuego ---
            const overlay = document.createElement('div');
            overlay.className = 'minigame-overlay';
            overlay.innerHTML = `
                <div class="minigame-hud">
                    <span class="mg-score"><img class="mg-hud-icon" src="${ketchupIcon}" alt="ketchup"><span class="mg-score-text">0 / ${goal}</span></span>
                    <span class="mg-lives">❤️ ${maxHits}</span>
                    ${showExtraInfo ? `<span class="mg-extra-info" style="margin-left:20px; font-size:0.8em; color:#ffb4b4">🌶️ Vel: ${(speedMult * 1.5).toFixed(2)}x</span>` : ''}
                </div>
                <div class="minigame-field" id="mg-field">
                    <div class="mg-player" id="mg-player"><img src="${this.cacheBustAsset('assets/minigames/samu_player.png')}" alt="Samu" draggable="false"></div>
                </div>
                <div class="minigame-instructions">Mueve con ← → (o el ratón). ¡Come <img class="mg-inline-icon" src="${ketchupIcon}" alt="ketchup"> y esquiva <img class="mg-inline-icon" src="${chiliIcon}" alt="guindilla">!</div>
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
                const isChili = Math.random() < chiliChance;
                const el = document.createElement('div');
                el.className = 'mg-item';
                const img = document.createElement('img');
                img.src = isChili ? chiliIcon : ketchupIcon;
                img.alt = isChili ? 'guindilla' : 'ketchup';
                img.draggable = false;
                el.appendChild(img);
                const x = Math.random() * 0.9 + 0.05;
                el.style.left = `${x * 100}%`;
                el.style.top = '-10%';
                field.appendChild(el);
                const speedBase = (0.25 + Math.random() * 0.25) * speedMult;
                items.push({
                    el,
                    x,
                    y: -0.1,
                    speed: speedBase,
                    type: isChili ? 'chili' : 'ketchup'
                });
            };

            const cleanup = (won) => {
                running = false;
                document.removeEventListener('keydown', keyDown);
                document.removeEventListener('keyup', keyUp);
                field.removeEventListener('mousemove', mouseMove);

                // Detener música
                if (musicAudio) {
                    musicAudio.pause();
                    musicAudio.currentTime = 0;
                }

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
                // Límite de tiempo opcional (nuestro): duration 0 = sin límite
                if (duration > 0 && (time - startTime) >= duration) {
                    return cleanup(score >= goal);
                }
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
                    spawnTimer = (0.7 + Math.random() * 0.6) / spawnRate;
                }

                // Mover ítems y detectar colisiones
                for (let i = items.length - 1; i >= 0; i--) {
                    const it = items[i];
                    it.y += it.speed * dt;
                    it.el.style.top = `${it.y * 100}%`;

                    // Colisión con el jugador (zona inferior del campo)
                    const hitboxWidth = it.type === 'chili' ? 0.04 : playerW;
                    const caught = it.y >= 0.82 && it.y <= 0.98 &&
                        Math.abs(it.x - playerX) < hitboxWidth;

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
        const catIcon = this.cacheBustAsset('assets/minigames/gato.png');
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
                    <span class="mg-cats"><img class="mg-hud-icon" src="${catIcon}" alt="gato"> ${catCount}</span>
                </div>
                <div class="minigame-field" id="mg-field-gatos">
                    <div class="mg-maze" id="mg-maze"></div>
                    <div class="mg-player" id="mg-player-gatos"><img src="${this.cacheBustAsset('assets/minigames/samu_player.png')}" alt="Samu" draggable="false"></div>
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
            const catImages = [
                this.cacheBustAsset('assets/minigames/me-perdonas.png'),
                this.cacheBustAsset('assets/minigames/te-perdono.png'),
                this.cacheBustAsset('assets/minigames/no-te-perdono.png')
            ];
            const cats = [];
            for (let i = 0; i < catCount; i++) {
                const s = catStarts[i % catStarts.length];
                const el = document.createElement('div');
                el.className = 'mg-cat';
                const catImg = document.createElement('img');
                catImg.src = catImages[i % catImages.length];
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

        // Bonus del Diapasón de Plata (recompensa por rescatar a Tony antes que a
        // José): "afina" las palomas → secuencia más lenta y una ronda menos.
        if (this.hasItem('diapason')) {
            options = Object.assign({}, options, {
                flashMs: Math.round((options.flashMs || 600) * 1.4),
                gapMs: Math.round((options.gapMs || 250) * 1.25),
                rounds: Math.max(1, (options.rounds || 5) - 1),
                diapason: true
            });
        }

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
                <div class="minigame-instructions">${options.diapason ? '🔉 El Diapasón de Plata afina las palomas: van más lentas. ' : ''}Memoriza la secuencia de palomas y repítela.</div>
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

    // Minijuego: memoria de runas (estilo Simon).
    async playRunaMinigame(options = {}) {
        this.isWaitingForInput = false;

        let won = false;
        while (!won) {
            won = await this.runRunaRound(options);
            if (!won) {
                await this.showMinigameRetry('¡La barrera ha rechazado la secuencia!');
            }
        }
        return won;
    }

    // Una partida de memoria: repite la secuencia de runas que se ilumina.
    // La secuencia crece cada nivel hasta completar `rounds`. Resuelve true/false.
    runRunaRound(options = {}) {
        const rounds = options.rounds || 5;
        const flashMs = options.flashMs || 600;
        const gapMs = options.gapMs || 250;
        const runas = [
            { image: 'assets/minigames/runa_samu.png', label: 'Magia de Samu' },
            { image: 'assets/minigames/runa_edu.png', label: 'Prisa de Edu' },
            { image: 'assets/minigames/runa_tony.png', label: 'Purificación de Seraphyna' },
            { image: 'assets/minigames/runa_jose.png', label: 'Fuerza de Jose' }
        ];

        this.isWaitingForInput = false;

        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'minigame-overlay runa-minigame';
            overlay.innerHTML = `
                <div class="minigame-hud">
                    <span class="mg-score">Nivel 1 / ${rounds}</span>
                    <span class="mg-status">Observa...</span>
                </div>
                <div class="runa-grid" id="runa-grid">
                    ${runas.map((runa, i) => `
                        <button class="runa-pad" data-index="${i}" aria-label="${runa.label}">
                            <img class="runa-icon" src="${this.cacheBustAsset(runa.image)}" alt="${runa.label}">
                            <span class="runa-label">${runa.label}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="minigame-instructions">Memoriza la secuencia de runas y repítela en el mismo orden.</div>
            `;
            document.getElementById('game-container').appendChild(overlay);

            const grid = overlay.querySelector('#runa-grid');
            const scoreEl = overlay.querySelector('.mg-score');
            const statusEl = overlay.querySelector('.mg-status');
            const pads = Array.from(overlay.querySelectorAll('.runa-pad'));

            const swallowClick = (e) => {
                if (!e.target.closest('.runa-pad')) e.stopPropagation();
            };
            overlay.addEventListener('click', swallowClick, true);

            let sequence = [];
            let requiredRunes = Array.from({ length: pads.length }, (_, i) => i).sort(
                () => Math.random() - 0.5
            );
            let inputIndex = 0;
            let acceptingInput = false;
            let level = 0;

            const wait = (ms) => new Promise(r => setTimeout(r, ms));

            const flashPad = async (idx) => {
                pads[idx].classList.add('runa-active');
                await wait(flashMs);
                pads[idx].classList.remove('runa-active');
                await wait(gapMs);
            };

            const finish = (won) => {
                acceptingInput = false;
                overlay.removeEventListener('click', swallowClick, true);

                const result = document.createElement('div');
                result.className = 'minigame-result';
                result.textContent = won ? '¡Las runas aceptan la secuencia!' : '¡Secuencia incorrecta!';
                overlay.appendChild(result);

                setTimeout(() => {
                    overlay.remove();
                    resolve(won);
                }, won ? 1500 : 800);
            };

            const playSequence = async () => {
                acceptingInput = false;
                statusEl.textContent = 'Observa...';
                grid.classList.add('runa-locked');
                await wait(500);
                for (const idx of sequence) {
                    await flashPad(idx);
                }
                grid.classList.remove('runa-locked');
                statusEl.textContent = '¡Tu turno!';
                inputIndex = 0;
                acceptingInput = true;
            };

            const nextLevel = async () => {
                level++;
                scoreEl.textContent = `Nivel ${level} / ${rounds}`;
                const nextRune =
                    requiredRunes.length > 0
                        ? requiredRunes.pop()
                        : Math.floor(Math.random() * pads.length);
                sequence.push(nextRune);
                await playSequence();
            };

            pads.forEach((pad, idx) => {
                pad.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!acceptingInput) return;

                    pad.classList.add('runa-active');
                    setTimeout(() => pad.classList.remove('runa-active'), 180);

                    if (idx === sequence[inputIndex]) {
                        inputIndex++;
                        if (inputIndex >= sequence.length) {
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
                        finish(false);
                    }
                });
            });

            nextLevel();
        });
    }

    // ============================================================
    // Minijuego: "Vocal Echo / Dúo" (Simon musical) — capítulo de Tony.
    // Tony canta una secuencia de notas (pads que se iluminan y suenan con
    // Web Audio); el jugador la repite. Arranca con `startLength` notas y
    // crece cada estrofa hasta completar `rounds`. Escala con speed/strictTempo.
    // ============================================================
    async playVocalEchoMinigame(options = {}) {
        this.isWaitingForInput = false;
        let won = false;
        while (!won) {
            won = await this.runVocalEchoRound(options);
            if (!won) {
                await this.showMinigameRetry('¡Desafinaste! 🎤 Escucha otra vez a Tony.');
            }
        }
        return won;
    }

    runVocalEchoRound(options = {}) {
        const rounds = options.rounds || 4;
        const startLength = options.startLength || 3;
        const speed = options.speed || 1.0;            // >1 = Tony canta más rápido
        const strictTempo = !!options.strictTempo;     // exigir repetir sin dormirse
        const flashMs = Math.max(170, Math.round(520 / speed));
        const gapMs = Math.max(80, Math.round(240 / speed));

        // Pads pentatónicos con colores neón de Ecchi Land
        const pads = [
            { freq: 523.25, label: '🎵', color: '#ff4fa3' }, // C5 magenta
            { freq: 587.33, label: '🎶', color: '#4fd0ff' }, // D5 cian
            { freq: 659.25, label: '🎵', color: '#b04fff' }, // E5 morado
            { freq: 783.99, label: '🎶', color: '#ff8cf0' }  // G5 rosa
        ];

        this.isWaitingForInput = false;

        return new Promise(resolve => {
            let audioCtx = null;
            const ensureAudio = () => {
                if (!audioCtx) {
                    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
                    catch (e) { audioCtx = null; }
                }
                if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
                return audioCtx;
            };
            const playTone = (freq, dur = 0.3) => {
                const ctx = ensureAudio();
                if (!ctx) return;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.0001, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(); osc.stop(ctx.currentTime + dur + 0.03);
            };

            const overlay = document.createElement('div');
            overlay.className = 'minigame-overlay vocalecho-minigame';
            overlay.innerHTML = `
                <div class="minigame-hud">
                    <span class="mg-score">Estrofa 1 / ${rounds}</span>
                    <span class="mg-status">Escucha a Tony...</span>
                </div>
                <div class="vocalecho-grid" id="vocalecho-grid">
                    ${pads.map((p, i) => `
                        <button class="vocalecho-pad" data-index="${i}" style="--pad-color:${p.color}">${p.label}</button>
                    `).join('')}
                </div>
                <div class="minigame-instructions">🎤 Repite la melodía de Tony: pulsa las notas en el mismo orden.</div>
            `;
            document.getElementById('game-container').appendChild(overlay);

            const grid = overlay.querySelector('#vocalecho-grid');
            const scoreEl = overlay.querySelector('.mg-score');
            const statusEl = overlay.querySelector('.mg-status');
            const padEls = Array.from(overlay.querySelectorAll('.vocalecho-pad'));

            const swallowClick = (e) => { if (!e.target.closest('.vocalecho-pad')) e.stopPropagation(); };
            overlay.addEventListener('click', swallowClick, true);

            let sequence = [];
            let inputIndex = 0;
            let acceptingInput = false;
            let level = 0;
            let turnStart = 0;

            const wait = (ms) => new Promise(r => setTimeout(r, ms));

            const flashPad = async (idx, withSound = true) => {
                padEls[idx].classList.add('vocalecho-active');
                if (withSound) playTone(pads[idx].freq, flashMs / 1000);
                await wait(flashMs);
                padEls[idx].classList.remove('vocalecho-active');
                await wait(gapMs);
            };

            const finish = (won) => {
                acceptingInput = false;
                overlay.removeEventListener('click', swallowClick, true);
                const result = document.createElement('div');
                result.className = 'minigame-result';
                result.textContent = won ? '¡Dúo perfecto! 🎤✨' : '¡Se rompió la melodía! 🎶💔';
                overlay.appendChild(result);
                setTimeout(() => { overlay.remove(); resolve(won); }, won ? 1500 : 800);
            };

            const playSequence = async () => {
                acceptingInput = false;
                statusEl.textContent = 'Escucha a Tony...';
                grid.classList.add('vocalecho-locked');
                await wait(450);
                for (const idx of sequence) { await flashPad(idx, true); }
                grid.classList.remove('vocalecho-locked');
                statusEl.textContent = strictTempo ? '¡Tu turno! (a tiempo)' : '¡Tu turno!';
                inputIndex = 0;
                acceptingInput = true;
                turnStart = performance.now();
            };

            const nextLevel = async () => {
                level++;
                scoreEl.textContent = `Estrofa ${level} / ${rounds}`;
                const target = startLength + (level - 1);
                while (sequence.length < target) {
                    sequence.push(Math.floor(Math.random() * padEls.length));
                }
                await playSequence();
            };

            padEls.forEach((pad, idx) => {
                pad.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!acceptingInput) return;
                    pad.classList.add('vocalecho-active');
                    playTone(pads[idx].freq, 0.26);
                    setTimeout(() => pad.classList.remove('vocalecho-active'), 150);

                    if (idx === sequence[inputIndex]) {
                        inputIndex++;
                        if (inputIndex >= sequence.length) {
                            acceptingInput = false;
                            if (strictTempo) {
                                const budget = sequence.length * (flashMs + gapMs) * 1.8 + 1200;
                                if (performance.now() - turnStart > budget) { finish(false); return; }
                            }
                            if (level >= rounds) {
                                finish(true);
                            } else {
                                statusEl.textContent = '¡Afinadísimo!';
                                await wait(520);
                                await nextLevel();
                            }
                        }
                    } else {
                        finish(false);
                    }
                });
            });

            nextLevel();
        });
    }

    // ============================================================
    // Minijuego: "Neon Runner" (ritmo tipo DDR) — capítulo de Tony.
    // Caen notas por varios carriles; hay que pulsar la tecla del carril
    // (o clicar el carril) cuando la nota cruza la línea de acierto. Se gana
    // completando la tanda con una precisión >= minAccuracy. Escala con
    // bpm/lanes/hitWindowMs/minAccuracy (resueltos por playMinigame vía ByDelay).
    // ============================================================
    async playRhythmMinigame(options = {}) {
        this.isWaitingForInput = false;
        // Asegurar que el avatar (p.ej. samu) está cargado para resolver bien las
        // rutas de sus poses (si no, el avatar saldría vacío / con 404).
        const avKey = this.getCharacterKey(options.avatar || 'samu');
        if (!this.characters[avKey]) { await this.loadCharacter(avKey); }
        let won = false;
        while (!won) {
            won = await this.runRhythmRound(options);
            if (!won) {
                await this.showMinigameRetry('¡Perdiste el ritmo! 🎧 La multitud casi te absorbe.');
            }
        }
        return won;
    }

    runRhythmRound(options = {}) {
        const bpm = options.bpm || 150;
        const lanes = Math.max(3, Math.min(6, options.lanes || 4));
        const hitWindowMs = options.hitWindowMs || 140;
        const minAccuracy = options.minAccuracy || 0.6;
        const totalNotes = options.totalNotes || 40;      // notas de la tanda (más largo)
        const travelMs = options.travelMs || 1500;        // lo que tarda en caer
        const perfectWindowMs = options.perfectWindowMs || hitWindowMs * 0.45; // ventana PERFECT (resto GOOD)

        // Sincronización musical: las notas caen sobre la rejilla de beats de la
        // canción y el reloj lo marca el propio audio (audio.currentTime), así
        // los toques van al ritmo. Si no hay audio, se usa un reloj interno.
        const beatMs = 60000 / bpm;
        const beatOffsetMs = options.beatOffsetMs || 0;    // primer golpe de la canción
        const beatStep = options.beatStep || 1;            // beats entre nota y nota (0.5 = corcheas)
        const audioEl = options.audio ||
            (options.audioId ? (this.audioInstances && this.audioInstances[options.audioId]) : null);

        // Efectos de sonido (sintetizados, volumen bajo). Se pueden desactivar
        // con sfx:false y ajustar con sfxVolume.
        const sfxOn = options.sfx !== false;
        const sfxVol = options.sfxVolume !== undefined ? options.sfxVolume : 1;

        // Avatar (Samu) que reacciona a cada acierto/fallo. Las rutas salen de la
        // FICHA del personaje (poses), que viven en assets/characters/<key>/...
        // (antes se construían sin la subcarpeta -> 404 en bucle y avatar vacío).
        // Se cache-bustean UNA sola vez aquí, no en cada cambio, para no
        // redescargar ni disparar 404 repetidos.
        const avatarKey = this.getCharacterKey(options.avatar || 'samu');
        const avatarChar = this.characters[avatarKey] || {};
        const aPose = (name, fallback) =>
            this.cacheBustAsset((avatarChar.poses && avatarChar.poses[name]) || fallback);
        const avatarPoses = {
            idle:    aPose('neutral',    `assets/characters/${avatarKey}/${avatarKey}.png`),
            perfect: aPose('happy',      `assets/characters/${avatarKey}/${avatarKey}_happy.png`),
            good:    aPose('determined', `assets/characters/${avatarKey}/${avatarKey}_determined.png`),
            miss:    aPose('worried',    `assets/characters/${avatarKey}/${avatarKey}_worried.png`)
        };

        // Teclas por carril según número de carriles
        const keySets = {
            3: ['D', 'F', 'J'],
            4: ['D', 'F', 'J', 'K'],
            5: ['D', 'F', 'G', 'J', 'K'],
            6: ['S', 'D', 'F', 'J', 'K', 'L']
        };
        const keys = keySets[lanes];
        const laneColors = ['#ff4fa3', '#4fd0ff', '#b04fff', '#ff8cf0', '#7cffb2', '#ffd166'];

        // Objetos especiales estilo osu!: sliders (mantener) y spinners (machacar)
        const sliderChance = options.sliderChance || 0;   // prob. de que una nota sea slider
        const sliderBeats = options.sliderBeats || 2;     // longitud del slider en beats
        const spinnerCount = options.spinnerCount || 0;   // nº de spinners en la tanda
        const spinnerTaps = options.spinnerTaps || 14;    // toques necesarios para el spinner
        const spinnerBeats = options.spinnerBeats || 3;   // duración del spinner en beats

        // Horario de notas: cada nota (o su cabeza) debe CRUZAR la línea en su beat.
        const schedule = [];
        const spinnerAt = new Set();
        for (let s = 1; s <= spinnerCount; s++) {
            spinnerAt.add(Math.floor(totalNotes * s / (spinnerCount + 1)));
        }
        let beatCursor = 0;
        for (let i = 0; i < totalNotes; i++) {
            const hitMs = beatOffsetMs + beatCursor * beatMs;
            if (spinnerAt.has(i)) {
                const durMs = spinnerBeats * beatMs;
                schedule.push({ type: 'spinner', hitMs, endMs: hitMs + durMs, required: spinnerTaps });
                beatCursor += spinnerBeats + beatStep * 2;
            } else if (Math.random() < sliderChance) {
                const durMs = sliderBeats * beatMs;
                schedule.push({ type: 'slider', hitMs, endMs: hitMs + durMs, durMs, lane: Math.floor(Math.random() * lanes) });
                beatCursor += sliderBeats + beatStep;
            } else {
                schedule.push({ type: 'tap', hitMs, lane: Math.floor(Math.random() * lanes) });
                beatCursor += beatStep;
            }
        }

        this.isWaitingForInput = false;

        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'minigame-overlay rhythm-minigame';
            overlay.innerHTML = `
                <div class="rhythm-bg"></div>
                <div class="rhythm-avatar" id="rhythm-avatar">
                    <img id="rhythm-avatar-img" src="${avatarPoses.idle}" alt="Samu">
                </div>
                <div class="minigame-hud neon-font">
                    <span class="mg-score">0 / ${totalNotes}</span>
                    <span class="mg-combo">Combo 0</span>
                    <span class="mg-status">Precisión objetivo: ${Math.round(minAccuracy * 100)}%</span>
                </div>
                <div class="rhythm-stage">
                    <div class="rhythm-field" id="rhythm-field">
                        <div class="rhythm-grid"></div>
                        ${Array.from({ length: lanes }).map((_, i) => `
                            <div class="rhythm-lane" data-lane="${i}" style="--lane-color:${laneColors[i]}"></div>
                        `).join('')}
                        <div class="rhythm-hitline" id="rhythm-hitline"></div>
                    </div>
                </div>
                <div class="rhythm-keys">
                    ${Array.from({ length: lanes }).map((_, i) => `
                        <button class="rhythm-key" data-lane="${i}" style="--lane-color:${laneColors[i]}">${keys[i]}</button>
                    `).join('')}
                </div>
                <div class="minigame-instructions">🎧 Pulsa ${keys.join(' · ')} (o toca las teclas) cuando la nota llegue a la línea.</div>
            `;
            document.getElementById('game-container').appendChild(overlay);

            const field = overlay.querySelector('#rhythm-field');
            const hitlineEl = overlay.querySelector('#rhythm-hitline');
            const scoreEl = overlay.querySelector('.mg-score');
            const comboEl = overlay.querySelector('.mg-combo');
            const statusEl = overlay.querySelector('.mg-status');
            const avatarBox = overlay.querySelector('#rhythm-avatar');
            const avatarImg = overlay.querySelector('#rhythm-avatar-img');
            const laneEls = Array.from(overlay.querySelectorAll('.rhythm-lane'));
            const keyEls = Array.from(overlay.querySelectorAll('.rhythm-key'));

            const swallow = (e) => { e.stopPropagation(); };
            overlay.addEventListener('click', swallow, true);

            // Geometría del campo
            const fieldH = () => field.clientHeight;
            const hitY = () => fieldH() * 0.82;              // línea de acierto (px)
            overlay.querySelector('#rhythm-hitline').style.top = '82%';

            let notes = [];       // { el, lane, hitMs, type, hit, ... }
            let spawnedIdx = 0;   // índice de la próxima nota del horario
            let judged = 0;       // notas resueltas (hit o miss)
            let hits = 0;
            let combo = 0;
            let running = true;
            let ticker = null;
            let activeSpinner = null; // spinner en curso (captura los toques)
            const startTime = performance.now();

            // CLAVE para el reintento: reiniciar la canción al principio en CADA
            // ronda. Si no, tras perder la música sigue avanzando y
            // audio.currentTime queda muy por delante del horario de notas nuevo,
            // así que todas nacen ya "pasadas" y se pierde al instante con 0%.
            if (audioEl) {
                try { audioEl.currentTime = 0; } catch (e) {}
                const _p = audioEl.play();
                if (_p && _p.catch) _p.catch(() => {});
            }

            // Reloj maestro en ms: si hay audio sonando, manda audio.currentTime
            // (los toques van al ritmo de la canción); si no, reloj interno.
            const nowMs = () => {
                if (audioEl && !audioEl.paused && audioEl.currentTime > 0.02) {
                    return audioEl.currentTime * 1000;
                }
                return performance.now() - startTime;
            };

            // Efectos de sonido cortitos y suaves (Web Audio, sin archivos)
            let sfxCtx = null;
            const ensureSfx = () => {
                if (!sfxOn) return null;
                if (!sfxCtx) {
                    try { sfxCtx = new (window.AudioContext || window.webkitAudioContext)(); }
                    catch (e) { sfxCtx = null; }
                }
                if (sfxCtx && sfxCtx.state === 'suspended') sfxCtx.resume();
                return sfxCtx;
            };
            const beep = (freq, dur, delay, type, vol) => {
                const ctx = ensureSfx(); if (!ctx) return;
                const t = ctx.currentTime + (delay || 0);
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = type || 'sine';
                osc.frequency.setValueAtTime(freq, t);
                g.gain.setValueAtTime(0.0001, t);
                g.gain.exponentialRampToValueAtTime((vol || 0.1) * sfxVol, t + 0.008);
                g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
                osc.connect(g); g.connect(ctx.destination);
                osc.start(t); osc.stop(t + dur + 0.02);
            };
            const sfx = {
                perfect: () => { beep(1046, 0.09, 0, 'triangle', 0.12); beep(1568, 0.10, 0.05, 'triangle', 0.10); },
                good:    () => { beep(784, 0.10, 0, 'triangle', 0.10); },
                miss:    () => { beep(196, 0.14, 0, 'sawtooth', 0.08); },
                break:   () => { beep(392, 0.09, 0, 'square', 0.08); beep(174, 0.16, 0.06, 'square', 0.08); }
            };

            const updateHud = () => {
                scoreEl.textContent = `${hits} / ${totalNotes}`;
                comboEl.textContent = `Combo ${combo}`;
            };

            const flashLane = (lane, cls) => {
                laneEls[lane].classList.add(cls);
                setTimeout(() => laneEls[lane].classList.remove(cls), 140);
            };

            const flashKey = (lane) => {
                const k = keyEls[lane];
                if (!k) return;
                k.classList.add('rhythm-key-press');
                setTimeout(() => k.classList.remove('rhythm-key-press'), 130);
            };

            // Estallido de chispas neón en la línea de acierto del carril
            const burst = (lane, count = 9) => {
                const laneEl = laneEls[lane];
                for (let p = 0; p < count; p++) {
                    const s = document.createElement('div');
                    s.className = 'rhythm-spark';
                    s.style.background = laneColors[lane];
                    s.style.setProperty('--dx', `${Math.random() * 150 - 75}px`);
                    s.style.setProperty('--dy', `${-Math.random() * 100 - 15}px`);
                    laneEl.appendChild(s);
                    setTimeout(() => s.remove(), 540);
                }
            };

            // Texto de juicio (PERFECT / GOOD / ✕) sobre la línea del carril
            const JUDGE = {
                perfect: { t: 'PERFECT', c: '#4fe8ff' },
                good:    { t: 'GOOD',    c: '#7cffb2' },
                miss:    { t: '✕',       c: '#ff466b' }
            };
            const showJudgment = (lane, kind) => {
                const info = JUDGE[kind]; if (!info) return;
                const j = document.createElement('div');
                j.className = 'rhythm-judge neon-font rj-' + kind;
                j.textContent = info.t;
                j.style.color = info.c;
                // Plano sobre el escenario (no dentro del carril inclinado, para que no se tuerza)
                overlay.appendChild(j);
                setTimeout(() => j.remove(), 620);
            };

            // Avatar de Samu: cambia de expresión según el acierto y vuelve a idle
            let avatarTimer = null;
            const setAvatar = (kind) => {
                if (!avatarImg) return;
                avatarImg.src = avatarPoses[kind] || avatarPoses.idle;
                avatarBox.classList.remove('av-perfect', 'av-good', 'av-miss');
                avatarBox.classList.add('av-' + kind);
                if (avatarTimer) clearTimeout(avatarTimer);
                avatarTimer = setTimeout(() => {
                    avatarImg.src = avatarPoses.idle;
                    avatarBox.classList.remove('av-perfect', 'av-good', 'av-miss');
                }, 680);
            };

            // Cartel de hito de combo (cada 10 seguidos)
            const showComboMilestone = () => {
                const b = document.createElement('div');
                b.className = 'rhythm-combo-banner neon-font';
                b.textContent = `🔥 COMBO ${combo}`;
                overlay.appendChild(b);
                setTimeout(() => b.remove(), 850);
            };

            const pulseCombo = () => {
                comboEl.classList.remove('mg-combo-pulse');
                void comboEl.offsetWidth; // reiniciar animación
                comboEl.classList.add('mg-combo-pulse');
                // Escala el brillo con el combo
                comboEl.style.setProperty('--combo-glow', `${Math.min(1, 0.3 + combo * 0.06)}`);
            };

            const pulseHitline = (good) => {
                hitlineEl.classList.remove('rhythm-hitline-hit', 'rhythm-hitline-miss');
                void hitlineEl.offsetWidth;
                hitlineEl.classList.add(good ? 'rhythm-hitline-hit' : 'rhythm-hitline-miss');
            };

            const finish = (won) => {
                if (!running) return;
                running = false;
                if (ticker) clearInterval(ticker);
                overlay.removeEventListener('click', swallow, true);
                document.removeEventListener('keydown', onKey);
                notes.forEach(n => n.el.remove());
                notes = [];
                const acc = totalNotes ? Math.round((hits / totalNotes) * 100) : 0;
                // Registrar el resultado (para líneas con "showIf" después)
                this.lastMinigameResult = { accuracy: totalNotes ? hits / totalNotes : 0 };
                const result = document.createElement('div');
                result.className = 'minigame-result';
                result.textContent = won
                    ? `¡Abriste paso! 🎉 Precisión ${acc}%`
                    : `¡Te absorbió el trance! 🌀 Precisión ${acc}%`;
                overlay.appendChild(result);
                setTimeout(() => { overlay.remove(); resolve(won); }, won ? 1600 : 900);
            };

            // Acierto de nota normal (o resolución con éxito de cabeza/cola)
            const resolveHit = (lane, perfect) => {
                hits++; judged++; combo++;
                sfx[perfect ? 'perfect' : 'good']();
                flashLane(lane, 'rhythm-lane-good');
                burst(lane, perfect ? 15 : 8);
                showJudgment(lane, perfect ? 'perfect' : 'good');
                setAvatar(perfect ? 'perfect' : 'good');
                pulseCombo();
                pulseHitline(true);
                if (combo > 0 && combo % 10 === 0) showComboMilestone();
                updateHud();
            };

            // Toque durante un spinner: gira el anillo y llena la barra
            const spinnerTap = () => {
                const sp = activeSpinner;
                if (!sp) return;
                sp.taps++;
                if (sp.ring) sp.ring.style.transform = `rotate(${sp.taps * 45}deg)`;
                const frac = Math.min(1, sp.taps / sp.required);
                if (sp.fill) sp.fill.style.width = `${frac * 100}%`;
                if (sp.count) sp.count.textContent = `${sp.taps} / ${sp.required}`;
                if (frac >= 1) sp.el.classList.add('rhythm-spinner-full');
            };

            // Soltar tecla: si había un slider mantenido en ese carril, suéltalo
            const releaseLane = (lane) => {
                if (keyEls[lane]) keyEls[lane].classList.remove('rhythm-key-hold');
                for (const n of notes) {
                    if (n.type === 'slider' && n.lane === lane && n.headHit && n.holding && !n.hit) {
                        n.holding = false;
                        n.el.classList.remove('rhythm-slider-holding');
                    }
                }
            };

            const judgeHit = (lane) => {
                if (!running) return;
                if (activeSpinner) { spinnerTap(); flashKey(lane); return; }
                flashLane(lane, 'rhythm-lane-press');
                flashKey(lane);
                const now = nowMs();
                // nota del carril más cercana en el tiempo (tap o cabeza de slider)
                let best = null, bestDt = Infinity;
                for (const n of notes) {
                    if (n.lane !== lane || n.hit || n.type === 'spinner') continue;
                    if (n.type === 'slider' && n.headHit) continue;
                    const dt = Math.abs(now - n.hitMs);
                    if (dt < bestDt) { bestDt = dt; best = n; }
                }
                if (best && bestDt <= hitWindowMs) {
                    const perfect = bestDt <= perfectWindowMs;
                    if (best.type === 'slider') {
                        // coger la cabeza: empezar a MANTENER (se juzga al llegar la cola)
                        best.headHit = true;
                        best.holding = true;
                        best.headPerfect = perfect;
                        best.el.classList.add('rhythm-slider-holding');
                        if (keyEls[lane]) keyEls[lane].classList.add('rhythm-key-hold');
                        burst(lane, 6);
                        pulseHitline(true);
                    } else {
                        best.hit = true;
                        best.el.classList.add('rhythm-note-hit');
                        resolveHit(lane, perfect);
                    }
                } else {
                    if (combo > 0) sfx.break();   // pulsación en vano que corta la racha
                    combo = 0;
                    pulseHitline(false);
                    updateHud();
                }
            };

            const checkEnd = () => {
                if (judged >= totalNotes) {
                    const acc = hits / totalNotes;
                    finish(acc >= minAccuracy);
                }
            };

            const onKey = (e) => {
                const lane = keys.indexOf((e.key || '').toUpperCase());
                if (lane === -1) return;
                e.preventDefault();
                if (activeSpinner) { spinnerTap(); flashKey(lane); return; }
                if (!e.repeat) judgeHit(lane);   // ignorar auto-repetición (mantener slider)
            };
            const onKeyUp = (e) => {
                const lane = keys.indexOf((e.key || '').toUpperCase());
                if (lane !== -1) releaseLane(lane);
            };
            document.addEventListener('keydown', onKey);
            document.addEventListener('keyup', onKeyUp);
            laneEls.forEach((laneEl, i) => {
                laneEl.addEventListener('click', (e) => { e.stopPropagation(); judgeHit(i); });
            });
            keyEls.forEach((keyEl, i) => {
                keyEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); judgeHit(i); });
                keyEl.addEventListener('pointerup', (e) => { e.stopPropagation(); releaseLane(i); });
            });

            // Crea el elemento DOM de una entrada del horario según su tipo
            const spawnEntry = (s) => {
                if (s.type === 'spinner') {
                    const el = document.createElement('div');
                    el.className = 'rhythm-spinner neon-font';
                    el.innerHTML =
                        '<div class="rhythm-spinner-ring"></div>' +
                        '<div class="rhythm-spinner-label">¡MACHACA!</div>' +
                        '<div class="rhythm-spinner-count">0 / ' + s.required + '</div>' +
                        '<div class="rhythm-spinner-bar"><div class="rhythm-spinner-fill"></div></div>' +
                        '<div class="rhythm-spinner-timerbar"><div class="rhythm-spinner-timer"></div></div>';
                    overlay.appendChild(el);
                    notes.push({ el, type: 'spinner', hitMs: s.hitMs, endMs: s.endMs, required: s.required, taps: 0, hit: false, active: false,
                        ring: el.querySelector('.rhythm-spinner-ring'), fill: el.querySelector('.rhythm-spinner-fill'),
                        count: el.querySelector('.rhythm-spinner-count'), timer: el.querySelector('.rhythm-spinner-timer') });
                } else if (s.type === 'slider') {
                    const el = document.createElement('div');
                    el.className = 'rhythm-note rhythm-slider';
                    el.style.background = laneColors[s.lane];
                    laneEls[s.lane].appendChild(el);
                    notes.push({ el, type: 'slider', lane: s.lane, hitMs: s.hitMs, endMs: s.endMs, durMs: s.durMs, hit: false, headHit: false, holding: false, headPerfect: false });
                } else {
                    const el = document.createElement('div');
                    el.className = 'rhythm-note';
                    el.style.background = laneColors[s.lane];
                    laneEls[s.lane].appendChild(el);
                    notes.push({ el, type: 'tap', lane: s.lane, hitMs: s.hitMs, hit: false });
                }
            };

            // Ticker por reloj de audio. Cada nota nace `travelMs` antes de su beat
            // y su cabeza cruza la línea en el beat (los toques van a la música).
            const tick = () => {
                if (!running) return;
                const now = nowMs();

                while (spawnedIdx < schedule.length && now >= schedule[spawnedIdx].hitMs - travelMs) {
                    spawnEntry(schedule[spawnedIdx]);
                    spawnedIdx++;
                }

                const y = hitY();
                for (const n of notes) {
                    if (n.hit) continue;

                    if (n.type === 'spinner') {
                        if (!n.active && now >= n.hitMs) { n.active = true; activeSpinner = n; n.el.classList.add('rhythm-spinner-active'); }
                        if (n.active) {
                            const total = n.endMs - n.hitMs;
                            if (n.timer) n.timer.style.width = `${Math.max(0, (n.endMs - now) / total) * 100}%`;
                            if (now >= n.endMs) {
                                n.hit = true;
                                if (activeSpinner === n) activeSpinner = null;
                                judged++;
                                if (n.taps >= n.required) {
                                    const pf = n.taps >= n.required * 1.4;
                                    hits++; combo++;
                                    sfx[pf ? 'perfect' : 'good']();
                                    showJudgment(0, pf ? 'perfect' : 'good'); setAvatar(pf ? 'perfect' : 'good');
                                    pulseCombo(); if (combo > 0 && combo % 10 === 0) showComboMilestone();
                                } else {
                                    sfx.miss(); combo = 0; showJudgment(0, 'miss'); setAvatar('miss');
                                }
                                n.el.classList.add('rhythm-spinner-done');
                                const sEl = n.el; setTimeout(() => sEl.remove(), 260);
                                updateHud();
                            }
                        }
                    } else if (n.type === 'slider') {
                        const barLen = (n.durMs / travelMs) * y;
                        const headTop = (1 - (n.hitMs - now) / travelMs) * y;
                        n.el.style.height = `${barLen}px`;
                        n.el.style.top = `${headTop - barLen}px`;
                        if (now >= n.endMs) {
                            n.hit = true; judged++;
                            const success = n.headHit && n.holding;
                            if (success) {
                                hits++; combo++;
                                sfx[n.headPerfect ? 'perfect' : 'good']();
                                showJudgment(n.lane, n.headPerfect ? 'perfect' : 'good'); setAvatar(n.headPerfect ? 'perfect' : 'good');
                                burst(n.lane, n.headPerfect ? 15 : 8); flashLane(n.lane, 'rhythm-lane-good'); pulseCombo(); pulseHitline(true);
                                if (combo > 0 && combo % 10 === 0) showComboMilestone();
                            } else {
                                sfx.miss(); combo = 0; showJudgment(n.lane, 'miss'); setAvatar('miss'); flashLane(n.lane, 'rhythm-lane-miss');
                            }
                            if (keyEls[n.lane]) keyEls[n.lane].classList.remove('rhythm-key-hold');
                            n.el.remove();
                            updateHud();
                        } else if (!n.headHit && now > n.hitMs + hitWindowMs) {
                            n.el.classList.add('rhythm-slider-missed');
                        }
                    } else { // tap
                        const prog = Math.min(1.15, 1 - (n.hitMs - now) / travelMs);
                        n.el.style.top = `${prog * y}px`;
                        if (now > n.hitMs + hitWindowMs) {
                            n.hit = true; n.el.classList.add('rhythm-note-miss'); n.el.remove();
                            judged++; combo = 0;
                            sfx.miss();
                            flashLane(n.lane, 'rhythm-lane-miss'); showJudgment(n.lane, 'miss'); setAvatar('miss');
                            updateHud();
                        }
                    }
                }
                notes = notes.filter(n => !n.hit);

                checkEnd();
            };

            updateHud();
            ticker = setInterval(tick, 16);
        });
    }

    // ============================================================
    // Minijuego "chase" (persecución en coche): esquiva obstáculos y a los memes
    // en moto durante una distancia. Reutiliza el motor side-scroller.
    // ============================================================
    async playChaseMinigame(options = {}) {
        this.isWaitingForInput = false;
        let won = false;
        while (!won) {
            won = await this.runSideScroller({
                mode: 'chase',
                goal: options.distance || 60,
                speed: options.speed || 6,
                maxHits: options.maxHits || 3,
                playerFrames: ['coche_0', 'coche_1', 'coche_2'],
                playerHeight: 0.19, playerRatio: 1.55,
                yMin: 0.70, yMax: 0.94,
                bgFar: 'carretera_loop_fondo', bgNear: 'carretera_loop',
                obstacles: ['obs_bidon', 'obs_valla', 'obs_rocas', 'obs_cable'],
                enemies: [['meme_bob_0', 'meme_bob_1'], ['meme_knucles_0', 'meme_knucles_1'],
                          ['meme_pepe_0', 'meme_pepe_1'], ['meme_troll_0', 'meme_troll_1']],
                collectible: null,
                title: '🏎️ Mueve el coche con el RATÓN (o ↑/↓) y esquiva obstáculos y a los memes.',
                winMsg: '¡Los habéis perdío en la rotonda! 🏁',
                loseMsg: '¡Os han embestido! 🏍️'
            });
            if (!won) {
                await this.showMinigameRetry('¡Os han pillado los memes! 🏍️');
            }
        }
        return won;
    }

    // ============================================================
    // Minijuego "eduvuelo" (Edu volando): recoge partituras esquivando focos que
    // caen y cables eléctricos. Reutiliza el motor side-scroller (modo vuelo).
    // ============================================================
    async playEduVueloMinigame(options = {}) {
        this.isWaitingForInput = false;
        let won = false;
        while (!won) {
            won = await this.runSideScroller({
                mode: 'fly',
                goal: options.goal || 8,
                speed: options.speed || 5,
                maxHits: options.maxHits || 3,
                backdrop: 'aire_fondo',
                playerFrames: ['edu_fly_0', 'edu_fly_1', 'edu_fly_2', 'edu_fly_3'],
                playerHeight: 0.19, playerRatio: 0.72,
                yMin: 0.12, yMax: 0.86,
                bgFar: null, bgNear: null,
                obstacles: ['aire_foco', 'aire_foco_on', 'aire_cable', 'aire_cable_spark'],
                enemies: [],
                collectible: ['partitura', 'partitura_glow'],
                title: '🐉 Vuela con el RATÓN (o ↑/↓): RECOGE las partituras y esquiva focos y cables.',
                winMsg: '¡Partituras completas! 🎼',
                loseMsg: '¡Te electrocutaste! ⚡'
            });
            if (!won) {
                await this.showMinigameRetry('¡Se te han escapado las partituras! ⚡');
            }
        }
        return won;
    }

    // Motor común de los side-scrollers. Devuelve Promise<boolean> (ganado).
    runSideScroller(cfg) {
        this.isWaitingForInput = false;
        const SP = 'assets/minigames/cap3/sprites/';
        const CAP = 'assets/minigames/cap3/';
        const url = (n, base = SP) => `url('${this.cacheBustAsset(base + n + '.png')}')`;
        const speed = cfg.speed || 6;
        const maxHits = cfg.maxHits || 3;
        const goal = cfg.goal || 60;
        const isFly = cfg.mode === 'fly';

        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'minigame-overlay sidescroller-minigame ' + (isFly ? 'ss-fly' : 'ss-chase');
            overlay.innerHTML = `
                <div class="minigame-hud neon-font">
                    <span class="mg-score"></span>
                    <span class="ss-lives"></span>
                    <span class="mg-status"></span>
                </div>
                <div class="ss-stage" id="ss-stage">
                    ${cfg.bgNear ? '<div class="ss-bg ss-bg-far"></div><div class="ss-bg ss-bg-near"></div>' : ''}
                    <div class="ss-player" id="ss-player"></div>
                    <div class="ss-progress-wrap"><div class="ss-progress-fill" id="ss-progress"></div></div>
                </div>
                <div class="minigame-instructions">${cfg.title}</div>
            `;
            document.getElementById('game-container').appendChild(overlay);
            const swallow = (e) => e.stopPropagation();
            overlay.addEventListener('click', swallow, true);

            const stage = overlay.querySelector('#ss-stage');
            const playerEl = overlay.querySelector('#ss-player');
            const scoreEl = overlay.querySelector('.mg-score');
            const livesEl = overlay.querySelector('.ss-lives');
            const statusEl = overlay.querySelector('.mg-status');
            const progressEl = overlay.querySelector('#ss-progress');
            const bgFarEl = overlay.querySelector('.ss-bg-far');
            const bgNearEl = overlay.querySelector('.ss-bg-near');
            if (bgFarEl && cfg.bgFar) bgFarEl.style.backgroundImage = url(cfg.bgFar, CAP);
            if (bgNearEl && cfg.bgNear) bgNearEl.style.backgroundImage = url(cfg.bgNear, CAP);
            // Telón estático opcional (no hace scroll): ambienta sin costuras de loop
            if (cfg.backdrop) {
                stage.style.backgroundImage = url(cfg.backdrop, CAP);
                stage.style.backgroundSize = 'cover';
                stage.style.backgroundPosition = 'center';
            }

            const fieldW = () => stage.clientWidth || 1;
            const fieldH = () => stage.clientHeight || 1;

            // Banda vertical de juego (0..1). En "chase" se limita a la carretera;
            // en vuelo abarca casi todo el cielo. Se aplica al jugador Y a los spawns.
            const yMin = cfg.yMin != null ? cfg.yMin : 0.09;
            const yMax = cfg.yMax != null ? cfg.yMax : 0.91;

            const pRatio = cfg.playerRatio || 1.5;
            const pFrac = cfg.playerHeight || 0.26;
            const sizePlayer = () => {
                const h = fieldH() * pFrac;
                playerEl.style.height = h + 'px';
                playerEl.style.width = (h * pRatio) + 'px';
            };
            playerEl.style.backgroundImage = url(cfg.playerFrames[0]);
            sizePlayer();
            let playerY = (yMin + yMax) / 2, targetY = playerY;
            // z-index por profundidad: quien va más abajo (mayor Y) se dibuja delante.
            // Así, si un objeto pasa por debajo del centro del coche va por encima, y
            // si pasa por encima, el coche queda delante (efecto pseudo-3D).
            const zByY = (y) => Math.round(y * 100) + 10;
            const setPlayerY = () => {
                playerEl.style.top = (playerY * 100) + '%';
                playerEl.style.zIndex = zByY(playerY);
            };
            setPlayerY();

            let frameIdx = 0, frameT = 0;
            const animatePlayer = (dt) => {
                frameT += dt;
                if (frameT >= (isFly ? 0.11 : 0.15)) {
                    frameT = 0;
                    frameIdx = (frameIdx + 1) % cfg.playerFrames.length;
                    playerEl.style.backgroundImage = url(cfg.playerFrames[frameIdx]);
                }
            };

            const onMove = (e) => {
                const r = stage.getBoundingClientRect();
                targetY = Math.max(yMin, Math.min(yMax, (e.clientY - r.top) / r.height));
            };
            stage.addEventListener('pointermove', onMove);
            const keys = {};
            const onKey = (e) => {
                const k = (e.key || '').toLowerCase();
                if (['arrowup', 'w', 'arrowdown', 's'].includes(k)) {
                    e.preventDefault();
                    keys[k] = (e.type === 'keydown');
                }
            };
            document.addEventListener('keydown', onKey);
            document.addEventListener('keyup', onKey);

            let objs = [];
            const spawnObj = () => {
                if (!running) return;
                const el = document.createElement('div');
                el.className = 'ss-obj';
                let name, kind, hFrac, wRatio;
                const roll = Math.random();
                if (cfg.collectible && roll < 0.55) {
                    kind = 'collect'; name = cfg.collectible[0];
                    el.classList.add('ss-collect'); hFrac = 0.12; wRatio = 1.05;
                } else if (cfg.enemies && cfg.enemies.length && roll < 0.75) {
                    kind = 'enemy';
                    const en = cfg.enemies[Math.floor(Math.random() * cfg.enemies.length)];
                    el.classList.add('ss-enemy'); el._frames = en; name = en[0];
                    hFrac = 0.18; wRatio = 1.75;
                } else {
                    kind = 'obstacle';
                    name = cfg.obstacles[Math.floor(Math.random() * cfg.obstacles.length)];
                    hFrac = 0.14; wRatio = 1.1;
                }
                el.style.backgroundImage = url(name);
                const h = fieldH() * hFrac;
                el.style.height = h + 'px';
                el.style.width = (h * wRatio) + 'px';
                const y = yMin + Math.random() * (yMax - yMin);
                el.style.top = (y * 100) + '%';
                el.style.left = '108%';
                el.style.zIndex = zByY(y);
                stage.appendChild(el);
                objs.push({ el, x: 1.08, y, kind, taken: false, frameT: 0, frameIdx: 0 });
            };

            let hits = 0, collected = 0, dist = 0, running = true;
            const updateHud = () => {
                if (isFly) { scoreEl.textContent = `🎼 ${collected} / ${goal}`; statusEl.textContent = 'Recoge'; }
                else { scoreEl.textContent = '🏁 ESCAPA'; statusEl.textContent = ''; }
                progressEl.style.width = ((isFly ? collected / goal : dist / goal) * 100) + '%';
                let s = '';
                for (let i = 0; i < maxHits; i++) s += `<span class="ss-heart${i < hits ? ' ss-lost' : ''}">❤</span>`;
                livesEl.innerHTML = s;
            };
            updateHud();

            let sctx = null;
            const beep = (f, d, t, v) => {
                try {
                    if (!sctx) sctx = new (window.AudioContext || window.webkitAudioContext)();
                    if (sctx.state === 'suspended') sctx.resume();
                    const o = sctx.createOscillator(), g = sctx.createGain(), n = sctx.currentTime + (t || 0);
                    o.type = v && v.type || 'sine';
                    o.frequency.value = f;
                    g.gain.setValueAtTime(0.0001, n);
                    g.gain.exponentialRampToValueAtTime((v && v.vol) || 0.07, n + 0.01);
                    g.gain.exponentialRampToValueAtTime(0.0001, n + d);
                    o.connect(g).connect(sctx.destination);
                    o.start(n); o.stop(n + d + 0.02);
                } catch (e) {}
            };

            let spawnTimer = null, raf = null;
            const finish = (won) => {
                if (!running) return;
                running = false;
                if (spawnTimer) clearInterval(spawnTimer);
                if (raf) clearInterval(raf);
                stage.removeEventListener('pointermove', onMove);
                document.removeEventListener('keydown', onKey);
                document.removeEventListener('keyup', onKey);
                overlay.removeEventListener('click', swallow, true);
                objs.forEach(o => o.el.remove()); objs = [];
                const result = document.createElement('div');
                result.className = 'minigame-result';
                result.textContent = won ? cfg.winMsg : cfg.loseMsg;
                overlay.appendChild(result);
                // Registrar cómo fue la partida (para líneas con "showIf" después)
                this.lastMinigameResult = { hits, maxHits, collected, goal };
                setTimeout(() => { overlay.remove(); resolve(won); }, won ? 1500 : 950);
            };

            // Invulnerabilidad: al empezar (spawn) y un respiro tras cada golpe.
            let invulnUntil = performance.now() + (cfg.graceMs != null ? cfg.graceMs : 1200);
            const hitPlayer = () => {
                hits++; updateHud();
                invulnUntil = performance.now() + (cfg.hitGraceMs != null ? cfg.hitGraceMs : 800);
                playerEl.classList.remove('ss-hurt'); void playerEl.offsetWidth; playerEl.classList.add('ss-hurt');
                stage.classList.remove('ss-hit'); void stage.offsetWidth; stage.classList.add('ss-hit');
                beep(150, 0.18, 0, { type: 'sawtooth', vol: 0.08 });
                if (hits >= maxHits) finish(false);
            };
            const grab = (o) => {
                collected++; o.taken = true; o.el.classList.add('ss-taken');
                if (cfg.collectible && cfg.collectible[1]) o.el.style.backgroundImage = url(cfg.collectible[1]);
                beep(880, 0.09, 0, { type: 'triangle', vol: 0.08 });
                beep(1320, 0.09, 0.05, { type: 'triangle', vol: 0.06 });
                updateHud();
                const el = o.el; setTimeout(() => el.remove(), 320);
                if (collected >= goal) finish(true);
            };

            let bgX = 0, last = performance.now();
            const objSpeed = 0.12 + speed * 0.055;   // fracción de ancho por segundo
            const distRate = speed * 0.62;
            spawnTimer = setInterval(spawnObj, Math.max(480, 1150 - speed * 75));

            const tick = () => {
                if (!running) return;
                const now = performance.now();
                const dt = Math.min(0.05, (now - last) / 1000); last = now;

                if (keys['arrowup'] || keys['w']) targetY -= dt * 1.15;
                if (keys['arrowdown'] || keys['s']) targetY += dt * 1.15;
                targetY = Math.max(yMin, Math.min(yMax, targetY));
                playerY += (targetY - playerY) * Math.min(1, dt * 10);
                setPlayerY();
                animatePlayer(dt);

                bgX -= speed * 55 * dt;
                if (bgFarEl) bgFarEl.style.backgroundPositionX = (bgX * 0.4) + 'px';
                if (bgNearEl) bgNearEl.style.backgroundPositionX = bgX + 'px';

                if (!isFly) {
                    dist += distRate * dt;
                    if (dist >= goal) { finish(true); return; }
                }

                const fw = fieldW(), fh = fieldH();
                const pw = playerEl.offsetWidth, ph = playerEl.offsetHeight;
                const pcx = 0.12 * fw + pw / 2, pcy = playerY * fh;
                const psh = 0.5;
                const pL = pcx - pw * psh / 2, pR = pcx + pw * psh / 2, pT = pcy - ph * psh / 2, pB = pcy + ph * psh / 2;

                for (const o of objs) {
                    if (o.taken) continue;
                    o.x -= objSpeed * dt;
                    o.el.style.left = (o.x * 100) + '%';
                    if (o.kind === 'enemy' && o.el._frames) {
                        o.frameT += dt;
                        if (o.frameT >= 0.14) { o.frameT = 0; o.frameIdx ^= 1; o.el.style.backgroundImage = url(o.el._frames[o.frameIdx]); }
                    }
                    const ow = o.el.offsetWidth, oh = o.el.offsetHeight;
                    const ocx = o.x * fw, ocy = o.y * fh;
                    const osh = o.kind === 'collect' ? 0.75 : 0.52;
                    const oL = ocx - ow * osh / 2, oR = ocx + ow * osh / 2, oT = ocy - oh * osh / 2, oB = ocy + oh * osh / 2;
                    if (pL < oR && pR > oL && pT < oB && pB > oT) {
                        if (o.kind === 'collect') { grab(o); if (!running) return; }
                        else if (now >= invulnUntil) { o.taken = true; o.el.remove(); hitPlayer(); if (!running) return; }
                        // Durante la invulnerabilidad los obstáculos pasan de largo
                    }
                }
                objs = objs.filter(o => !o.taken && o.x > -0.25);

                // Parpadeo del jugador mientras dura la invulnerabilidad
                playerEl.style.opacity = (now < invulnUntil && Math.floor(now / 120) % 2 === 0) ? '0.35' : '1';

                updateHud();
            };
            raf = setInterval(tick, 16);
        });
    }

    // Capas de dirección de escena (crossfade de fondo, fundido a negro y CG).
    // Se crean perezosamente colgando de #game-container (regla del stage escalado).
    ensureSceneLayers() {
        const gc = document.getElementById('game-container');
        if (!gc) return {};
        let bgB = document.getElementById('background-b');
        if (!bgB) {
            bgB = document.createElement('div');
            bgB.id = 'background-b';
            bgB.className = 'background background-b';
            const bg = document.getElementById('background');
            if (bg && bg.nextSibling) gc.insertBefore(bgB, bg.nextSibling);
            else gc.appendChild(bgB);
        }
        let fader = document.getElementById('scene-fader');
        if (!fader) {
            fader = document.createElement('div');
            fader.id = 'scene-fader';
            fader.className = 'scene-fader';
            gc.appendChild(fader);
        }
        let cg = document.getElementById('cg-layer');
        if (!cg) {
            cg = document.createElement('div');
            cg.id = 'cg-layer';
            cg.className = 'cg-layer';
            gc.appendChild(cg);
        }
        return { bgB, fader, cg };
    }

    // Cambia el fondo con CROSSFADE suave (400 ms) usando una segunda capa.
    // Con { cut: true } se comporta como antes (corte seco intencionado).
    setBackground(imagePath, opts = {}) {
        const bg = document.getElementById('background');
        const url = `url('${this.cacheBustAsset(imagePath)}')`;
        // Resetear cualquier Ken Burns anterior al cambiar de fondo
        this.bgPan({ reset: true });
        if (opts.cut || !document.getElementById('game-container')) {
            bg.style.backgroundImage = url;
            return;
        }
        const { bgB } = this.ensureSceneLayers();
        if (!bgB) { bg.style.backgroundImage = url; return; }
        // Pintar el nuevo fondo en la capa B y fundirla por encima
        bgB.style.transition = 'none';
        bgB.style.opacity = '0';
        bgB.style.backgroundImage = url;
        // Forzar reflow para que la transición arranque desde 0
        void bgB.offsetWidth;
        const dur = opts.fadeMs != null ? opts.fadeMs : 400;
        bgB.style.transition = `opacity ${dur}ms ease`;
        bgB.style.opacity = '1';
        clearTimeout(this._bgSwapTimer);
        this._bgSwapTimer = setTimeout(() => {
            bg.style.backgroundImage = url;
            bgB.style.transition = 'none';
            bgB.style.opacity = '0';
        }, dur + 60);
    }

    clearBackground() {
        this.bgPan({ reset: true });
        const bg = document.getElementById('background');
        const bgB = document.getElementById('background-b');
        if (bg) bg.style.backgroundImage = '';
        if (bgB) {
            bgB.style.transition = 'none';
            bgB.style.opacity = '0';
            bgB.style.backgroundImage = '';
        }
    }

    // Fundido de escena: { to:"black"|color, duration } o { from:"black", duration }.
    // Devuelve una promesa que espera el final del fundido.
    fadeScene(action = {}) {
        const { fader } = this.ensureSceneLayers();
        if (!fader) return Promise.resolve();
        const dur = action.duration != null ? action.duration : 800;
        const color = (typeof action.to === 'string' && action.to !== 'black') ? action.to
                    : (typeof action.from === 'string' && action.from !== 'black') ? action.from
                    : '#000';
        fader.style.background = color;
        fader.style.transition = `opacity ${dur}ms ease`;
        const goingDark = action.from == null; // "to" (u omitido) = oscurecer
        // Estado inicial coherente
        if (goingDark && fader.style.opacity === '') fader.style.opacity = '0';
        if (!goingDark && fader.style.opacity === '') fader.style.opacity = '1';
        void fader.offsetWidth;
        fader.style.opacity = goingDark ? '1' : '0';
        fader.style.pointerEvents = goingDark ? 'auto' : 'none';
        return new Promise(r => setTimeout(r, dur + 40));
    }

    // Ken Burns del fondo: zoom/paneo lento. Se resetea al cambiar de fondo.
    bgPan(action = {}) {
        const bg = document.getElementById('background');
        if (!bg) return;
        if (action.reset) {
            bg.style.transition = 'none';
            bg.style.transform = '';
            return;
        }
        const zf = action.zoomFrom != null ? action.zoomFrom : 1.05;
        const zt = action.zoomTo != null ? action.zoomTo : 1.0;
        const xf = action.xFrom || 0, xt = action.xTo || 0;
        const yf = action.yFrom || 0, yt = action.yTo || 0;
        const dur = action.duration != null ? action.duration : 6000;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        bg.style.transition = 'none';
        bg.style.transform = `scale(${zf}) translate(${xf}%, ${yf}%)`;
        void bg.offsetWidth;
        bg.style.transition = `transform ${dur}ms ease-out`;
        bg.style.transform = `scale(${zt}) translate(${xt}%, ${yt}%)`;
    }

    // Lámina CG a pantalla (por encima de personajes, por debajo del diálogo).
    showCG(path, duration = 600) {
        const { cg } = this.ensureSceneLayers();
        if (!cg || !path) return Promise.resolve();
        cg.style.backgroundImage = `url('${this.cacheBustAsset(path)}')`;
        cg.style.transition = `opacity ${duration}ms ease`;
        cg.style.opacity = '1';
        cg.classList.add('cg-visible');
        return new Promise(r => setTimeout(r, duration + 40));
    }

    hideCG(duration = 500) {
        const cg = document.getElementById('cg-layer');
        if (!cg) return;
        cg.style.transition = `opacity ${duration}ms ease`;
        cg.style.opacity = '0';
        cg.classList.remove('cg-visible');
    }

    cacheBustAsset(path) {
        if (!path || path.startsWith('data:') || /^https?:\/\//.test(path)) {
            return path;
        }
        const separator = path.includes('?') ? '&' : '?';
        return `${path}${separator}v=${Date.now()}`;
    }

    getCharacterKey(characterName) {
        return String(characterName || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    async showCharacter(characterName, position = 'left', pose = 'neutral', flipped = false, enter = null) {
        const characterKey = this.getCharacterKey(characterName);
        let character = this.characters[characterKey];
        if (!character) {
            character = await this.loadCharacter(characterKey);
        }
        if (!character) return;

        const charElement = document.getElementById(`character-${position}`);
        if (charElement) {
            const poseImage = character.poses && character.poses[pose]
                ? character.poses[pose]
                : (character.poses && character.poses[character.defaultPose])
                ? character.poses[character.defaultPose]
                : character.image || character.poses?.neutral;

            charElement.style.backgroundImage = `url('${this.cacheBustAsset(poseImage)}')`;
            charElement.classList.add('active');
            charElement.setAttribute('data-character', characterKey);

            // Manejar video integrado si la pose tiene un video asociado (compañeros)
            const videoPath = character.poses && character.poses[`${pose}_video`];
            this.updateCharacterVideo(charElement, videoPath);

            // Aplicar flip horizontal si está especificado (sin animación) y el
            // escalado por personaje de los compañeros (p. ej. José un 18% más grande)
            const characterScale = this.getCharacterScale(characterKey);
            charElement.style.transform = `${flipped ? 'scaleX(-1)' : 'scaleX(1)'} scale(${characterScale})`;

            // Entrada animada opcional ("right"/"left"/"bottom"/"fade"). Usa la
            // propiedad CSS `translate` (independiente de transform, no pisa el flip).
            if (enter) {
                const cls = `char-enter-${['right','left','bottom','fade'].includes(enter) ? enter : 'fade'}`;
                charElement.classList.remove('char-enter-right','char-enter-left','char-enter-bottom','char-enter-fade');
                void charElement.offsetWidth;
                charElement.classList.add(cls);
                setTimeout(() => charElement.classList.remove(cls), 550);
            }

            // Rastrear posición del personaje
            this.characterPositions[characterKey] = position;
        }
        this.layoutCharacters();
    }

    // Reparte a los personajes ACTIVOS en franjas horizontales iguales.
    // IMPORTANTE: el ancho es FIJO (no depende de cuántos haya), así con 3
    // personajes NO se encogen; solo se separan. Como los sprites son verticales
    // y usan background-size: contain, a tamaño completo apenas se solapan, y el
    // foco lo da el iluminado del que habla. Posiciona con left + margin-left
    // (el transform se reserva para el flip scaleX y el escalado por personaje).
    layoutCharacters() {
        const order = ['left', 'center', 'right'];
        const active = order.filter(p => {
            const el = document.getElementById(`character-${p}`);
            return el && el.classList.contains('active');
        });
        const N = active.length;
        if (N === 0) return;
        const W = 42; // ancho fijo de cada personaje (%), igual que el CSS base
        active.forEach((p, i) => {
            const el = document.getElementById(`character-${p}`);
            const cx = ((2 * i + 1) / (2 * N)) * 100; // centro de su franja (%)
            el.style.left = `${cx}%`;
            el.style.right = 'auto';
            el.style.width = `${W}%`;
            el.style.marginLeft = `${-W / 2}%`;
        });
    }

    getCharacterScale(characterKey) {
        const characterScales = {
            airi: 0.7,
            tung_tung_tung_sahur: 0.85,
            jose: 1.18,
            amalgama: 1.2,
            amalgama_final: 1.2
        };
        return characterScales[characterKey] || 1;
    }

    setPose(characterName, position, pose = 'neutral') {
        const characterKey = this.getCharacterKey(characterName);
        const character = this.characters[characterKey];
        if (!character) return;

        const charElement = document.getElementById(`character-${position}`);
        if (charElement && charElement.classList.contains('active')) {
            const poseImage = character.poses && character.poses[pose]
                ? character.poses[pose]
                : (character.poses && character.poses[character.defaultPose])
                ? character.poses[character.defaultPose]
                : character.image || character.poses?.neutral;

            charElement.style.backgroundImage = `url('${this.cacheBustAsset(poseImage)}')`;

            // Manejar video integrado si la pose tiene un video asociado (compañeros)
            const videoPath = character.poses && character.poses[`${pose}_video`];
            this.updateCharacterVideo(charElement, videoPath);
        }
    }

    updateCharacterVideo(charElement, videoPath) {
        let videoContainer = charElement.querySelector('.character-video-container');

        if (!videoPath) {
            if (videoContainer) videoContainer.remove();
            return;
        }

        if (!videoContainer) {
            videoContainer = document.createElement('div');
            videoContainer.className = 'character-video-container';
            charElement.appendChild(videoContainer);
        }

        let video = videoContainer.querySelector('video');
        if (!video) {
            video = document.createElement('video');
            video.className = 'character-video';
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.setAttribute('playsinline', '');
            videoContainer.appendChild(video);
        }

        const fullPath = this.cacheBustAsset(videoPath);
        if (video.src !== fullPath && !video.src.endsWith(videoPath)) {
            video.src = fullPath;
            video.play().catch(e => console.warn('Error auto-playing character video:', e));
        }
    }

    // Quita a un personaje de la escena. Se puede indicar:
    // - characterName: quita al personaje (usando la posición rastreada en la
    //   que se mostró; si además se da position, solo quita si coincide).
    // - position (sin characterName): vacía directamente ese hueco (left/right/center).
    // Si no se indica ninguno, no hace nada.
    hideCharacter(characterName, position, exit = null) {
        const clearSlot = (pos) => {
            const el = document.getElementById(`character-${pos}`);
            if (!el) return;
            const doClear = () => {
                el.classList.remove('active', 'speaking', 'char-exit-fade');
                el.style.backgroundImage = '';
                const videoContainer = el.querySelector('.character-video-container');
                if (videoContainer) videoContainer.remove();
            };
            if (exit) {
                // Salida suave: fundido corto y luego limpieza real
                el.classList.add('char-exit-fade');
                setTimeout(doClear, 320);
            } else {
                doClear();
            }
        };

        if (characterName) {
            const key = this.getCharacterKey(characterName);
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
        this.layoutCharacters();
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

    // Devuelve el color del personaje asegurando un mínimo de luminosidad para
    // que el nombre se lea sobre la caja oscura (aclara los colores oscuros
    // mezclándolos hacia el blanco, conservando el tono). Acepta cualquier
    // formato CSS (hex, nombre como "gray", rgb()). Sin color -> dorado.
    readableNameColor(color) {
        if (!color || typeof color !== 'string') return '#ffcc00';
        // Resolver cualquier formato CSS a RGB usando el canvas como parser.
        if (!this._colorParser) {
            this._colorParser = document.createElement('canvas').getContext('2d');
        }
        const ctx = this._colorParser;
        ctx.fillStyle = '#000';       // reset (si el color es inválido, queda este)
        ctx.fillStyle = color;
        const resolved = ctx.fillStyle; // normalizado a #rrggbb o rgba(...)
        let r, g, b;
        if (resolved[0] === '#') {
            r = parseInt(resolved.slice(1, 3), 16);
            g = parseInt(resolved.slice(3, 5), 16);
            b = parseInt(resolved.slice(5, 7), 16);
        } else {
            const m = resolved.match(/\d+/g);
            if (!m || m.length < 3) return '#ffcc00';
            r = +m[0]; g = +m[1]; b = +m[2];
        }
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        if (lum < 0.55) {
            const k = ((0.55 - lum) / 0.55) * 0.75; // cuánto mezclar hacia blanco
            r = Math.round(r + (255 - r) * k);
            g = Math.round(g + (255 - g) * k);
            b = Math.round(b + (255 - b) * k);
        }
        return `rgb(${r}, ${g}, ${b})`;
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

        // Rastrear por ID si se proporciona.
        if (id) {
            // Si ya había un audio con este id, DESVANECERLO antes de reemplazarlo.
            // Si no, el track viejo queda huérfano (sin referencia) sonando en
            // bucle para siempre y se solapa con el nuevo (por eso las músicas
            // "no se paraban" al cambiar de escena). Un fade corto evita cortes
            // secos y, si el nuevo entra con fadeIn, queda un crossfade limpio.
            const prev = this.audioInstances[id];
            if (prev && prev !== audio) {
                this.fadeOutAndStop(prev, 350);
            }
            this.audioInstances[id] = audio;
        }

        // Fade in si se especifica. El intervalo se guarda en audio._fadeInterval
        // para que un fade-out posterior pueda cancelarlo (evita que dos fades
        // compitan por el volumen del mismo audio).
        if (fadeIn > 0) {
            if (audio._fadeInterval) clearInterval(audio._fadeInterval);
            audio.volume = 0;
            const startTime = Date.now();
            const targetVolume = Math.max(0, Math.min(1, volume));
            audio._fadeInterval = setInterval(() => {
                const progress = Math.min((Date.now() - startTime) / fadeIn, 1);
                audio.volume = targetVolume * progress;
                if (progress >= 1) { clearInterval(audio._fadeInterval); audio._fadeInterval = null; }
            }, 20);
        }

        if (autoPlay) {
            audio.play().catch(e => console.log('Error reproduciendo sonido:', e));
        }

        return audio;
    }

    // Desvanece el volumen a 0 en `ms` y luego pausa y rebobina. Cancela
    // cualquier fade anterior sobre el mismo audio (evita intervalos compitiendo
    // por el volumen). Con ms<=0, o si ya está pausado, para de inmediato.
    fadeOutAndStop(audio, ms = 300) {
        if (!audio) return;
        if (audio._fadeInterval) { clearInterval(audio._fadeInterval); audio._fadeInterval = null; }
        if (ms <= 0 || audio.paused) {
            try { audio.pause(); audio.currentTime = 0; } catch (e) {}
            return;
        }
        const startTime = Date.now();
        const initialVolume = audio.volume;
        audio._fadeInterval = setInterval(() => {
            const progress = Math.min((Date.now() - startTime) / ms, 1);
            audio.volume = initialVolume * (1 - progress);
            if (progress >= 1) {
                clearInterval(audio._fadeInterval);
                audio._fadeInterval = null;
                try { audio.pause(); audio.currentTime = 0; } catch (e) {}
            }
        }, 20);
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

        this.fadeOutAndStop(audio, fadeOut);
    }

    stopAllSounds() {
        // Parar de inmediato cancelando cualquier fade en curso.
        const kill = (a) => {
            if (!a) return;
            if (a._fadeInterval) { clearInterval(a._fadeInterval); a._fadeInterval = null; }
            try { a.pause(); a.currentTime = 0; } catch (e) {}
        };
        kill(this.currentMusic);
        this.currentMusic = null;
        for (const id in this.audioInstances) kill(this.audioInstances[id]);
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

    waitForActionClick() {
        return new Promise(resolve => {
            const clickHandler = () => {
                document.removeEventListener('click', clickHandler);
                resolve();
            };

            document.addEventListener('click', clickHandler);
        });
    }

    async displayDialog(line) {
        // Actualizar debug panel si está activo
        if (this.debugMode) {
            this.updateDebugPanel();
        }

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
        const speakerName = this.getCharacterKey(line.speakingAs || line.character);

        // Nombre del hablante en SU color (identidad + reconocimiento inmediato).
        // Si sus datos aún no están cargados (habla sin sprite en pantalla), se
        // cargan en segundo plano y se aplica el color al llegar, salvo que ya
        // haya cambiado el hablante.
        const applyNameColor = (data) => {
            characterName.style.color = this.readableNameColor(data && data.color);
        };
        const spData = this.characters[speakerName];
        if (spData) {
            applyNameColor(spData);
        } else if (this._charColorMissing.has(speakerName) || !/[a-z0-9]/.test(speakerName)) {
            // Sin ficha conocida o clave sin letras (p. ej. hablante misterioso "???"):
            // dorado por defecto y sin pedir ficha al servidor.
            applyNameColor(null);
        } else {
            applyNameColor(null); // dorado por defecto mientras carga
            const nm = line.character;
            this.loadCharacter(speakerName)
                .then(d => {
                    if (d) { if (characterName.textContent === nm) applyNameColor(d); }
                    else { this._charColorMissing.add(speakerName); }
                })
                .catch(() => { this._charColorMissing.add(speakerName); });
        }

        // Limpiar el estado "speaking" de TODOS los huecos (incluido center,
        // que antes se olvidaba: por eso el del centro no se apagaba al hablar otro).
        ['left', 'center', 'right'].forEach(pos => {
            const elem = document.getElementById(`character-${pos}`);
            if (elem) elem.classList.remove('speaking');
        });

        // Buscar la posición del personaje que habla usando el rastreo
        const speakerPosition = this.characterPositions[speakerName];
        const charactersContainer = document.getElementById('characters-container');
        let speakerOnScreen = false;

        if (speakerPosition) {
            const speakerElement = document.getElementById(`character-${speakerPosition}`);
            if (speakerElement && speakerElement.classList.contains('active')) {
                speakerElement.classList.add('speaking');
                this.speakingCharacter = speakerName;
                this.speakingPosition = speakerPosition;
                speakerOnScreen = true;
            }
        }

        // Solo grisamos/apagamos a los demás cuando hay un hablante EN PANTALLA.
        // Durante la narración (2B) o si quien habla no tiene sprite, nadie se apaga.
        if (charactersContainer) {
            charactersContainer.classList.toggle('has-speaker', speakerOnScreen);
        }
        if (!speakerOnScreen) {
            this.speakingCharacter = null;
            this.speakingPosition = null;
        }

        this.isWaitingForInput = false;

        // Velocidad de texto por línea: "slow" (drama), "fast" (pánico) o un
        // multiplicador numérico. Hereda el blip y las pausas de puntuación.
        const speedMult = line.textSpeed === 'slow' ? 2.2
                        : line.textSpeed === 'fast' ? 0.45
                        : (typeof line.textSpeed === 'number' ? line.textSpeed : 1);

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
                    const ch = text[charIndex];
                    dialogText.textContent += ch;
                    charIndex++;
                    // Blip por letra (tono según el que habla) y pausa extra en la
                    // puntuación para dar ritmo al texto.
                    let delay = this.typingSpeed * speedMult;
                    if (window.Juice) {
                        window.Juice.blip(ch, speakerName);
                        delay += window.Juice.punctuationPause(ch);
                    }
                    timeoutId = setTimeout(typeChar, delay);
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

    // ¿Cumple la línea su condición "showIf"? Soporta:
    // { result: "clean" | "close" } (resultado del último minijuego),
    // { hasItem: "x" } y { delayAtLeast: n }.
    lineConditionMet(cond) {
        if (!cond) return true;
        if (cond.result) {
            const r = this.lastMinigameResult;
            if (!r) return false;
            const hits = r.hits != null ? r.hits : 0;
            const maxHits = r.maxHits != null ? r.maxHits : 3;
            const acc = r.accuracy != null ? r.accuracy : null;
            const clean = (acc != null) ? acc >= 0.9 : hits === 0;
            const close = (acc != null) ? false : hits >= maxHits - 1;
            if (cond.result === 'clean' && !clean) return false;
            if (cond.result === 'close' && !(close && !clean)) return false;
            if (cond.result === 'normal' && (clean || hits >= maxHits - 1)) return false;
        }
        if (cond.hasItem && !(this.inventory || []).includes(cond.hasItem)) return false;
        if (typeof cond.delayAtLeast === 'number' && this.storyDelay < cond.delayAtLeast) return false;
        return true;
    }

    async nextLine() {
        const scene = this.getCurrentScene();
        if (!scene || !scene.lines) return false;

        let line = this.getCurrentLine();
        if (!line) return false;

        // Saltar líneas condicionales que no aplican (variantes de victoria, etc.).
        // Regla de autoría: no poner líneas showIf al FINAL de una escena.
        while (line && line.showIf && !this.lineConditionMet(line.showIf)) {
            this.currentLine++;
            line = this.getCurrentLine();
        }
        if (!line) return false;

        // Resetear el flag de input esperando. Se re-seteará a true si la línea tiene diálogo
        this.isWaitingForInput = false;

        // Ejecutar acciones previas al diálogo
        if (line.actions) {
            for (let action of line.actions) {
                await this.executeAction(action);
                // Si una acción solicitó saltar de escena, detener el
                // procesamiento de esta línea y continuar en el nuevo destino.
                if (this.pendingSceneJump) {
                    this.pendingSceneJump = false;
                    // Cuando saltamos de escena, ya estamos en línea 0 de la nueva escena
                    // No incrementar currentLine
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
        const characterName = document.getElementById('character-name');
        const dialogText = document.getElementById('dialog-text');

        dialogBox.classList.remove('active');
        if (characterName) characterName.textContent = '';
        if (dialogText) dialogText.textContent = '';
        this.isWaitingForInput = false;
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
        const charactersContainer = document.getElementById('characters-container');
        if (charactersContainer) charactersContainer.classList.remove('has-speaker');

        // Limpiar efectos de juice (tinte, viñeta, shake)
        if (window.Juice) window.Juice.reset();

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

    updateDebugPanel() {
        const panel = document.getElementById('debug-panel');
        if (!panel) return;

        const chapterSpan = document.getElementById('debug-chapter');
        const sceneSpan = document.getElementById('debug-scene');
        const lineSpan = document.getElementById('debug-line');

        if (this.currentChapter) {
            const sceneName = this.currentChapter.scenes[this.currentScene]?.title || '-';
            const totalLines = this.currentChapter.scenes[this.currentScene]?.lines.length || 0;

            if (chapterSpan) chapterSpan.textContent = this.lastChapterName || '-';
            if (sceneSpan) sceneSpan.textContent = sceneName;
            if (lineSpan) lineSpan.textContent = `${this.currentLine} / ${totalLines}`;
        }
    }

    goToLine(lineNumber) {
        if (!this.currentChapter) return false;
        const scene = this.currentChapter.scenes[this.currentScene];
        if (!scene || lineNumber < 0 || lineNumber >= scene.lines.length) return false;

        this.currentLine = lineNumber;
        this.updateDebugPanel();
        return true;
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
