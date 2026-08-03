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
        this.fastForward = false;
        this._finishTyping = null;
        this._lastDialogEmotionKey = null;
        this.typingSpeed = 50;
        this.lastChapterName = null;
        this.speakingCharacter = null;
        this.speakingPosition = null;
        this.characterPositions = {}; // Rastrear qué personaje está en qué posición
        this.stageCharacters = {}; // Pose/flip por hueco para restaurar escenas visitadas
        this.currentBackgroundPath = null;
        this._charColorMissing = new Set(); // Claves de personaje sin ficha (evita 404 repetidos al colorear el nombre)
        this.audioInstances = {}; // Rastrear instancias de audio
        this.currentMusic = null; // Música de fondo actual
        this.sceneEndedByChoice = false; // Indica si la escena terminó por una elección
        this.completedCalls = []; // Rastrear las llamadas completadas
        this.nextChapter = null; // Capítulo a cargar (ruta ramificada elegida)
        this.rescued = []; // Personajes rescatados, en orden (persiste entre capítulos)
        this.inventory = []; // Objetos conseguidos (p. ej. 'diapason'); persiste entre capítulos
        this.storyDelay = 0; // Retraso acumulado por las decisiones de ruta dentro de un capítulo
        // Presión narrativa acumulada entre capítulos. Las decisiones lentas de
        // Furrielva deben poder endurecer la huida de Ecchi Land; antes se
        // borraban tanto al cargar como al cerrar cada capítulo.
        this.storyPressure = 0;
        this._characterPoseAnimations = new Map();
        // Animaciones internas de una pose (parpadeo o efecto ocular/pantalla). Cada
        // fotograma es un sprite completo y sustituye al anterior; nunca se
        // superponen dos personajes en el mismo hueco.
        this._characterFrameAnimations = new Map();
        this.debugMode = false; // Modo debug para testing
        // Sello de caché fijo para toda la sesión (ver cacheBustAsset)
        this.assetStamp = Date.now();
        // Una URL y una decodificación por asset durante toda la sesión. Los
        // minijuegos cambian sprites muchas veces por segundo; conservar tanto la
        // URL como el Image evita nuevas consultas y nuevas decodificaciones.
        this.assetUrlCache = new Map();
        this.imagePreloadCache = new Map();
        this.preloadedImages = new Map();
        this.blinkIntermediateManifest = null;
        this.blinkIntermediatePromise = null;
        this.layerBlinkManifest = null;
        this.layerBlinkPromise = null;
        this.whiteHaloManifest = null;
        this.whiteHaloPromise = null;
    }

    // Añade un objeto al inventario (sin duplicar). Persiste entre capítulos.
    addItem(name) {
        if (name && !this.inventory.includes(name)) this.inventory.push(name);
    }

    // Indica si el jugador tiene un objeto en el inventario.
    hasItem(name) {
        return this.inventory.includes(name);
    }

    setFastForward(active) {
        this.fastForward = !!active;
        if (this.fastForward && this._finishTyping) {
            this._finishTyping();
        }
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
            this._lastDialogEmotionKey = null;
            // El historial de retroceso es por capítulo: no se vuelve al anterior
            this.sceneHistory = [];
            this._lastSeenScene = null;
            this.nextChapter = null; // Limpiar la ruta al cargar un capítulo nuevo
            // storyDelay se conserva como alias histórico, pero la fuente de
            // verdad entre capítulos es storyPressure. Al cargar una escena se
            // recupera la presión acumulada en vez de olvidar las decisiones.
            this.storyDelay = this.storyPressure;

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
            const [intermediates, layerBlinks, whiteHaloCopies] = await Promise.all([
                this.loadBlinkIntermediateManifest(),
                this.loadLayerBlinkManifest(),
                this.loadWhiteHaloManifest()
            ]);
            this.applyWhiteHaloCopies(characterKey, character, whiteHaloCopies);
            this.applyBlinkIntermediateFrames(characterKey, character, intermediates);
            this.applyLayerBlinkFrames(characterKey, character, layerBlinks);
            this.characters[characterKey] = character;
            return character;
        } catch (error) {
            console.error(`Error cargando personaje ${characterName}:`, error);
            return null;
        }
    }

    async loadBlinkIntermediateManifest() {
        if (this.blinkIntermediateManifest) return this.blinkIntermediateManifest;
        if (!this.blinkIntermediatePromise) {
            this.blinkIntermediatePromise = fetch(
                `assets/metadata/blink_eye_intermediates.json?v=${this.assetStamp}`,
                { cache: 'no-store' }
            ).then(response => response.ok ? response.json() : { poses: {} })
                .catch(error => {
                    console.warn('No se pudieron cargar los intermedios oculares:', error);
                    return { poses: {} };
                });
        }
        this.blinkIntermediateManifest = await this.blinkIntermediatePromise;
        return this.blinkIntermediateManifest;
    }

    async loadWhiteHaloManifest() {
        if (this.whiteHaloManifest) return this.whiteHaloManifest;
        if (!this.whiteHaloPromise) {
            this.whiteHaloPromise = fetch(
                `assets/metadata/sprite_white_halo_cleaned.json?v=${this.assetStamp}`,
                { cache: 'no-store' }
            ).then(response => response.ok ? response.json() : { sprites: {} })
                .catch(error => {
                    console.warn('No se pudo cargar el índice de sprites limpios:', error);
                    return { sprites: {} };
                });
        }
        this.whiteHaloManifest = await this.whiteHaloPromise;
        return this.whiteHaloManifest;
    }

    applyWhiteHaloCopies(characterKey, character, manifest) {
        if (!character?.poses || !manifest?.sprites) return;
        Object.keys(character.poses).forEach(pose => {
            const entry = manifest.sprites[`${characterKey}.${pose}`];
            if (!entry?.cleaned) return;
            const current = character.poses[pose];
            character.poses[pose] = current && typeof current === 'object'
                ? { ...current, src: entry.cleaned }
                : entry.cleaned;
        });
    }

    async loadLayerBlinkManifest() {
        if (this.layerBlinkManifest) return this.layerBlinkManifest;
        if (!this.layerBlinkPromise) {
            const load = path => fetch(`${path}?v=${this.assetStamp}`, { cache: 'no-store' })
                .then(response => response.ok ? response.json() : {});
            this.layerBlinkPromise = Promise.all([
                load('assets/metadata/blink_eye_region_previews.json'),
                load('assets/metadata/blink_eye_clean_offsets_manual.json'),
                load('assets/metadata/blink_eye_pixel_edits.json')
            ]).then(([previews, offsets, edits]) => {
                const poses = {};
                Object.entries(previews.poses || {}).forEach(([id, pose]) => {
                    const half = edits.edits?.saved?.[id]?.half || pose.half;
                    const closed = edits.edits?.saved?.[id]?.closed || pose.closed || pose.blinks?.[0];
                    const crop = pose.crop;
                    const canvas = pose.sourceCanvas;
                    if (!pose.sourceBase || !half || !closed || !crop || !canvas) return;
                    const transform = offsets.offsets?.[id] || {};
                    poses[id] = {
                        base: pose.sourceBase,
                        crop,
                        canvas,
                        half,
                        closed,
                        offsets: {
                            half: transform.half || [0, 0],
                            closed: transform.closed || [0, 0],
                            halfScale: transform.halfScale || [1, 1],
                            closedScale: transform.closedScale || [1, 1]
                        },
                        frames: [
                            { state: 'half', src: half, duration: 65 },
                            { state: 'closed', src: closed, duration: 95 },
                            { state: 'half', src: half, duration: 65 }
                        ]
                    };
                });
                return { poses };
            }).catch(error => {
                console.warn('No se pudieron cargar las capas oculares runtime:', error);
                return { poses: {} };
            });
        }
        this.layerBlinkManifest = await this.layerBlinkPromise;
        return this.layerBlinkManifest;
    }

    applyLayerBlinkFrames(characterKey, character, manifest) {
        if (!manifest?.poses || !character?.poses) return;
        character.layerBlinks = character.layerBlinks || {};
        Object.keys(character.poses).forEach(pose => {
            const config = manifest.poses[`${characterKey}.${pose}`];
            if (config) character.layerBlinks[pose] = config;
        });
    }

    getLayerBlinkConfig(characterKey, pose) {
        return this.layerBlinkManifest?.poses?.[`${characterKey}.${pose}`] || null;
    }

    applyBlinkIntermediateFrames(characterKey, character, manifest) {
        const animations = character?.animations || character?.poseAnimations;
        if (!animations || !manifest?.poses) return;
        Object.entries(animations).forEach(([pose, config]) => {
            const half = manifest.poses[`${characterKey}.${pose}`]?.half;
            if (!half) return;
            const frames = Array.isArray(config) ? config : config?.frames;
            if (!Array.isArray(frames) || !frames.length) return;
            const sources = frames.map(frame => this.animationFramePath(character, frame));
            if (sources.some(source => source === half) || sources.some(source => /blink[_-]half/i.test(source || ''))) {
                return;
            }
            const sequence = [
                { src: half, duration: 65 },
                ...frames,
                { src: half, duration: 65 }
            ];
            if (Array.isArray(config)) animations[pose] = sequence;
            else config.frames = sequence;
        });
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
            case 'clearBackground':
            case 'removeBackground':
                this.clearBackground();
                break;
            case 'setBackground':
                this.setBackground(action.value, action);
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
            case 'animateCharacter':
            case 'characterAnimation':
            case 'poseSequence':
                this.startCharacterPoseAnimation(action);
                break;
            case 'stopCharacterAnimation':
            case 'stopPoseSequence':
                this.stopCharacterPoseAnimation(action.character, action.position);
                break;
            case 'characterGlitch':
            case 'glitchCharacter':
                this.triggerCharacterGlitch(action.character, action.position, action.duration);
                break;
            case 'characterFullGlitch':
            case 'fullCharacterGlitch':
                this.triggerCharacterFullGlitch(action.character, action.position, action.duration);
                break;
            case 'characterGlitchUntilAdvance':
            case 'glitchUntilAdvance':
                this.startCharacterGlitchUntilAdvance(action.character, action.position);
                break;
            case 'characterAnimeFall':
            case 'animeFall':
                this.triggerCharacterAnimeFall(action.character, action.position, action);
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
                this.storyPressure = this.storyDelay;
                break;
            case 'addDelay':
                this.storyDelay += (action.value || 0);
                this.storyPressure = this.storyDelay;
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
                await this.showCG(action.path || action.value, action.duration, action);
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

        const audioCrossfade = Math.max(0, Number(action.audioCrossfade) || 0);
        const holdLastFrame = Math.max(0, Number(action.holdLastFrame) || 0);
        const visualFadeOut = Math.max(0, Number(action.visualFadeOut) || 0);
        const endBackground = action.endBackground || action.finalBackground || null;

        // No duplicar la música si currentMusic y bg_music apuntan al mismo Audio.
        const paused = [];
        const pausedSet = new Set();
        const tryPause = (audio) => {
            if (!audio || audio.paused || pausedSet.has(audio)) return;
            try {
                audio.pause();
                pausedSet.add(audio);
                paused.push(audio);
            } catch (e) {}
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
            let crossfadeStarted = false;
            let videoFadeInterval = null;

            const resumeAudio = (audio, duration) => {
                if (!audio || audio._stopping) return;
                if (audio._fadeInterval) {
                    clearInterval(audio._fadeInterval);
                    audio._fadeInterval = null;
                }
                const kind = audio._volKind || 'music';
                const base = audio._baseVol != null ? audio._baseVol : 1;
                const target = Math.max(0, Math.min(1, base * this.volFactor(kind)));
                if (duration <= 0) {
                    audio.volume = target;
                    try { audio.play().catch(() => {}); } catch (e) {}
                    return;
                }
                audio.volume = 0;
                try { audio.play().catch(() => {}); } catch (e) {}
                const startedAt = Date.now();
                audio._fadeInterval = setInterval(() => {
                    const progress = Math.min((Date.now() - startedAt) / duration, 1);
                    audio.volume = target * progress;
                    if (progress >= 1) {
                        clearInterval(audio._fadeInterval);
                        audio._fadeInterval = null;
                    }
                }, 20);
            };

            const beginAudioCrossfade = (duration = audioCrossfade) => {
                if (crossfadeStarted) return;
                crossfadeStarted = true;
                const fadeDuration = Math.max(0, duration);
                for (const audio of paused) resumeAudio(audio, fadeDuration);
                if (fadeDuration <= 0 || video.muted || video.volume <= 0) return;
                const initialVolume = video.volume;
                const startedAt = Date.now();
                videoFadeInterval = setInterval(() => {
                    const progress = Math.min((Date.now() - startedAt) / fadeDuration, 1);
                    video.volume = initialVolume * (1 - progress);
                    if (progress >= 1) {
                        clearInterval(videoFadeInterval);
                        videoFadeInterval = null;
                    }
                }, 20);
            };

            const onTimeUpdate = () => {
                if (audioCrossfade <= 0 || crossfadeStarted || !Number.isFinite(video.duration)) return;
                const remainingMs = Math.max(0, (video.duration - video.currentTime) * 1000);
                if (remainingMs <= audioCrossfade + 140) {
                    beginAudioCrossfade(Math.max(250, Math.min(audioCrossfade, remainingMs)));
                }
            };

            const cleanup = () => {
                overlay.remove();
                resolve();
            };

            const finish = (naturalEnd = false) => {
                if (done) return;
                done = true;
                document.removeEventListener('keydown', onKey);
                video.removeEventListener('timeupdate', onTimeUpdate);
                if (videoFadeInterval) {
                    clearInterval(videoFadeInterval);
                    videoFadeInterval = null;
                }

                // El fondo exacto del último frame queda preparado bajo el vídeo;
                // así el fundido revela la misma imagen y no la escena anterior.
                if (endBackground) this.setBackground(endBackground, { cut: true });
                if (!crossfadeStarted) {
                    const resumeFade = naturalEnd ? audioCrossfade : Math.min(audioCrossfade, 350);
                    beginAudioCrossfade(resumeFade);
                }
                try { video.pause(); } catch (e) {}

                const hold = naturalEnd ? holdLastFrame : 0;
                const fade = naturalEnd ? visualFadeOut : Math.min(visualFadeOut, 150);
                setTimeout(() => {
                    if (fade <= 0) { cleanup(); return; }
                    overlay.style.transition = `opacity ${fade}ms ease`;
                    overlay.style.opacity = '0';
                    setTimeout(cleanup, fade + 30);
                }, hold);
            };

            const onKey = (e) => {
                if (['Escape', 'Enter', ' ', 'Spacebar'].includes(e.key)) {
                    e.preventDefault();
                    finish(false);
                }
            };

            video.addEventListener('timeupdate', onTimeUpdate);
            video.addEventListener('ended', () => finish(true), { once: true });
            video.addEventListener('error', () => finish(false), { once: true });
            overlay.addEventListener('click', () => finish(false), { once: true });
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
    // Vaciar el fondo del todo (lo usa el final del compi en cap. 6/créditos)
    clearBackground() {
        this.bgPan({ reset: true });
        this.currentBackgroundPath = null;
        const bg = document.getElementById('background');
        const bgB = document.getElementById('background-b');
        if (bg) bg.style.backgroundImage = '';
        if (bgB) {
            bgB.style.transition = 'none';
            bgB.style.opacity = '0';
            bgB.style.backgroundImage = '';
        }
    }

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

        // Despachar según el tipo de minijuego solicitado. Va envuelto porque el
        // minijuego se puede abortar desde fuera (los botones de arriba: ir a
        // otra escena, retroceder o salir al menú), igual que su pantalla de
        // reintento: entonces rechaza con `minijuegoCancelado` y aquí se deshace
        // la cadena entera del minijuego sin ruido.
        //
        // OJO con lo que hace de verdad esta carrera: solo DESATASCA el await.
        // Lo que mata al minijuego es que el catch borre su overlay, porque sus
        // controles cuelgan de ahí; los bucles de animación comprueban además
        // que su overlay siga en el documento para pararse solos.
        const cancelacion = new Promise((_, reject) => {
            this._abortarMinijuego = () => {
                this._abortarMinijuego = null;
                const e = new Error('minijuego-cancelado');
                e.minijuegoCancelado = true;
                reject(e);
            };
        });

        try {
        await Promise.race([cancelacion, (async () => {
        switch (action.game) {
            case 'furrielvaExplore':
                await this.playFurrielvaExploreMinigame(action);
                break;
            case 'chiliHarvest':
            case 'guindillas':
                await this.playChiliHarvestMinigame(action);
                break;
            case 'ketchupBoss':
            case 'ketchup':
                await this.playKetchupBossMinigame(action);
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
            case 'runeChanneling':
            case 'rune_channeling':
            case 'canalizacionRunas':
                await this.playRuneChannelingMinigame(action);
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
            case 'credits':
            case 'creditos':
                await this.playCreditsMinigame(action);
                break;
            case 'chase':
                await this.playChaseMinigame(action);
                break;
            case 'eduvuelo':
                await this.playEduVueloMinigame(action);
                break;
            default:
                console.warn(`Minijuego desconocido: ${action.game}`);
        }
        })()]);
        } catch (e) {
            if (!e || !e.minijuegoCancelado) throw e;
            // Se salió del minijuego desde los botones de arriba: limpiar los
            // restos que pudieran quedar y seguir como si nada.
            document.querySelectorAll(
                '.minigame-overlay, .cutscene-overlay, .battle-minigame, .credits-minigame'
            ).forEach(o => o.remove());
            // La música y los efectos del minijuego no se van con el overlay.
            // Quien nos ha sacado (otra escena, retroceder, menú) repinta luego
            // su propio ambiente sonoro.
            this.stopAllSounds();
        } finally {
            this._abortarMinijuego = null;
        }
    }

    // ¿Hay un minijuego en marcha que se pueda abortar? Lo usan los botones de
    // arriba, que ahora se ven también durante los minijuegos.
    hayMinijuegoAbierto() {
        return typeof this._abortarMinijuego === 'function';
    }

    abortarMinijuego() {
        if (this._abortarMinijuego) this._abortarMinijuego();
    }

    // Investigación narrativa de Furrielva. Furry Maps presenta las zonas como
    // áreas reales del mapa: Samu las introduce, el jugador confirma cada ruta
    // y un Samu diminuto recorre el trayecto desde su última ubicación. Solo el
    // primer desplazamiento parte de la Iglesia del Rocío.
    playFurrielvaExploreMinigame(options = {}) {
        this.isWaitingForInput = false;
        const background = options.background ||
            'assets/images/backgrounds/chapter2/furrielva/mapa_furrielva_furry_maps_v2_4k.webp';
        const samuPortrait = 'assets/images/characters/samu/samu_thinking.webp';
        const samuFrames = [1, 2, 3, 4, 5, 7].map(n =>
            `assets/images/characters/samu/ketchup/${n}.webp`);
        const church = {
            id: 'iglesia',
            label: 'Iglesia del Rocío',
            destination: [50, 55.2]
        };
        const locations = [
            {
                id: 'plaza', label: 'Plaza del Rocío', area: 'zone-plaza',
                route: 'M500 276 C420 230 340 155 220 135', destination: [22, 27],
                background: 'assets/images/backgrounds/chapter2/furrielva/furrielva_plaza_investigacion_v1_4k.webp',
                npc: 'TADEO TRUFA',
                color: '#e98245',
                portrait: 'assets/images/characters/furrielva/tadeo_trufa_v1.webp',
                opening: [
                    { speaker: 'TADEO TRUFA', text: 'Genial... otra entrega tarde. Como vuelvan a cortarme la avenida esos camiones rojos, el jefe me descuenta el viaje.' },
                    { speaker: 'SAMU', text: 'Perdona, no quería meterme, pero ¿has dicho camiones rojos? Me he encontrado esta botella. ¿Reconoces la etiqueta de Kingdom Ketchup?' },
                    { speaker: 'TADEO TRUFA', text: 'No conozco ese nombre. Pero si es una fábrica, esos camiones son lo más raro que ha pasado por aquí. ¿Qué necesitas saber?' }
                ],
                choices: [
                    {
                        label: 'Preguntar por los camiones rojos',
                        dialogue: [
                            { speaker: 'SAMU', text: '¿Hacia dónde van cuando salen de la plaza?' },
                            { speaker: 'TADEO TRUFA', text: 'Al anochecer toman la carretera industrial. Sin matrícula, sin empresa; sólo una corona encima de un tomate.' },
                            { speaker: 'SAMU', text: 'Edu mencionó ketchup. Esa corona puede ser la primera pista de verdad.' }
                        ],
                        lore: 'Los camiones rojos sin matrícula siguen la carretera industrial y llevan una corona sobre un tomate.'
                    },
                    {
                        label: 'Preguntar por sus rutas',
                        dialogue: [
                            { speaker: 'SAMU', text: '¿Tus mapas de reparto no señalan de dónde vienen?' },
                            { speaker: 'TADEO TRUFA', text: 'Los nuevos no. Lo extraño es que mi libreta antigua sí marca una nave al final de esa carretera, aunque ahora la calle tiene otro nombre.' },
                            { speaker: 'SAMU', text: 'O sea, el sitio estaba antes de que el mapa decidiera olvidarlo.' }
                        ],
                        lore: 'La libreta antigua de Tadeo conserva una nave al final de la carretera industrial, aunque la calle haya cambiado de nombre.'
                    }
                ]
            },
            {
                id: 'comercio', label: 'Zona comercial', area: 'zone-commerce',
                route: 'M500 276 C430 330 350 375 245 360', destination: [25, 72],
                background: 'assets/images/backgrounds/chapter2/furrielva/furrielva_zona_comercial_v1_4k.webp',
                npc: 'LÍA LINCE',
                color: '#c878dc',
                portrait: 'assets/images/characters/furrielva/lia_lince_v1.webp',
                opening: [
                    { speaker: 'LÍA LINCE', text: 'Fantástico. Seis cajas que nadie ha pedido, un proveedor sin dirección y una promoción que no existe. ¿Dónde se supone que meto yo todo esto?' },
                    { speaker: 'SAMU', text: 'Eh... perdona. No quería escuchar, pero ¿has dicho que el proveedor no tiene dirección?' },
                    { speaker: 'LÍA LINCE', text: '¡Ah! No te había visto. Sí, han aparecido esta mañana. ¿Tú también vienes a reclamarme algo?' },
                    { speaker: 'SAMU', text: 'Al contrario. Busco Kingdom Ketchup y Furry Maps se niega a mostrarme dónde está.' },
                    { speaker: 'LÍA LINCE', text: 'Pues las cajas llevan una corona con tomate y las palabras «Kingdom Ketchup». Parece que los dos buscamos al mismo fantasma.' }
                ],
                choices: [
                    {
                        label: 'Examinar las cajas',
                        dialogue: [
                            { speaker: 'SAMU', text: '¿Puedo mirar la etiqueta de envío?' },
                            { speaker: 'LÍA LINCE', text: 'Adelante. Sólo trae un lote, K-K/03, y una ruta de recogida hacia la salida industrial.' },
                            { speaker: 'SAMU', text: 'K-K. No es precisamente una firma discreta.' }
                        ],
                        lore: 'Las cajas de Kingdom Ketchup usan el lote K-K/03 y regresan por una ruta hacia la salida industrial.'
                    },
                    {
                        label: 'Revisar el albarán',
                        dialogue: [
                            { speaker: 'SAMU', text: '¿Y el albarán? A veces queda una dirección en la letra pequeña.' },
                            { speaker: 'LÍA LINCE', text: 'Dirección, ninguna. Pero mira los comercios: El Jarrón, Noche y Mercaguasa. Ayer tenían otros nombres; hoy hasta los recibos antiguos aparecen corregidos.' },
                            { speaker: 'SAMU', text: 'Vale... esto ya no es una campaña publicitaria normal.' }
                        ],
                        lore: 'Los nombres de las tiendas y hasta sus recibos antiguos han cambiado sin que Lía los modificara.'
                    }
                ]
            },
            {
                id: 'callejon', label: 'Callejón de servicio', area: 'zone-alley',
                route: 'M500 276 C565 215 635 150 730 135', destination: [73, 27],
                background: 'assets/images/backgrounds/chapter2/furrielva/furrielva_callejon_tuberias_v1_4k.webp',
                npc: 'RULO MAPACHE',
                color: '#55b9c8',
                portrait: 'assets/images/characters/furrielva/rulo_mapache_v1.webp',
                opening: [
                    { speaker: 'RULO MAPACHE', text: 'Presión en la línea siete, calor en la acometida... y el plano insiste en que aquí no hay ninguna nave. Claro que sí, plano. Lo que tú digas.' },
                    { speaker: 'SAMU', text: 'Perdona... ¿estás discutiendo con un mapa?' },
                    { speaker: 'RULO MAPACHE', text: 'Con un mapa no. Con el gracioso que lo actualizó. Hay una instalación consumiendo media red y, según esto, sólo existe un solar vacío.' },
                    { speaker: 'SAMU', text: 'Estoy buscando una fábrica que tampoco aparece en Furry Maps. Kingdom Ketchup.' },
                    { speaker: 'RULO MAPACHE', text: 'Entonces puede que tu fábrica y mi tubería fantasma sean el mismo problema.' }
                ],
                choices: [
                    {
                        label: 'Seguir la tubería marcada',
                        dialogue: [
                            { speaker: 'SAMU', text: '¿Puedes saber adónde llega por la presión?' },
                            { speaker: 'RULO MAPACHE', text: 'Sale bajo tierra y reaparece en el límite industrial, justo debajo del solar que el mapa deja en blanco.' },
                            { speaker: 'SAMU', text: 'Tres pistas, el mismo lugar. Ya no parece una casualidad.' }
                        ],
                        lore: 'La conducción reaparece bajo el solar vacío del límite industrial.'
                    },
                    {
                        label: 'Preguntar por el fallo del mapa',
                        dialogue: [
                            { speaker: 'SAMU', text: '¿Qué ocurre cuando acercas el mapa a esa parcela?' },
                            { speaker: 'RULO MAPACHE', text: 'Ruido, bandas de colores y vuelta al solar vacío. Siempre la misma zona, incluso sin conexión.' },
                            { speaker: 'SAMU', text: 'Entonces no es cobertura. Hay algo ahí y el mapa no consigue enseñarlo.' }
                        ],
                        lore: 'El mapa falla siempre sobre la misma parcela, incluso sin conexión a la red.'
                    }
                ]
            }
        ];

        this.preloadImages([
            background, samuPortrait,
            ...samuFrames,
            ...locations.flatMap(location => [location.background, location.portrait])
        ]);
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'minigame-overlay furrielva-explore';
            overlay.innerHTML = `
                <div class="furrielva-device" role="application" aria-label="Furry Maps">
                    <i class="furrielva-side-button furrielva-side-button-a" aria-hidden="true"></i>
                    <i class="furrielva-side-button furrielva-side-button-b" aria-hidden="true"></i>
                    <div class="furrielva-screen">
                        <div class="furrielva-statusbar"><span>09:41</span><span>FURRIELVA · 5G&nbsp;&nbsp;◉</span></div>
                        <div class="furrielva-head">
                            <div class="furrielva-brand"><span aria-hidden="true">🐾</span><div><strong>Furry Maps</strong><small>Modo investigación</small></div></div>
                            <div class="furrielva-search"><span aria-hidden="true">⌕</span><div><b>Explorar Furrielva</b><small>Pregunta en tres zonas para localizar Kingdom Ketchup</small></div></div>
                            <span class="furrielva-counter">0 / ${locations.length}</span>
                        </div>
                        <div class="furrielva-map" style="--furrielva-bg:url('${this.cacheBustAsset(background)}')">
                            <svg class="furrielva-route" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
                                <path></path>
                            </svg>
                            <div class="furrielva-landmark"><span aria-hidden="true">◆</span>Iglesia del Rocío</div>
                            ${locations.map(location => `<button class="furrielva-zone ${location.area}" data-location="${location.id}" disabled><b>${location.label}</b><small>Seleccionar zona</small></button>`).join('')}
                            <div class="furrielva-kingdom-lock" aria-label="Zona no disponible"><span>UBICACIÓN INESTABLE</span><i></i><i></i><i></i></div>
                            <img class="furrielva-mini-samu" alt="Samu recorriendo la ruta" src="${this.cacheBustAsset(samuFrames[0])}">
                            <div class="furrielva-tour" aria-live="polite">
                                <img src="${this.cacheBustAsset(samuPortrait)}" alt="Samu">
                                <div><strong>SAMU</strong><p></p><button type="button">Siguiente</button></div>
                            </div>
                            <div class="furrielva-card" aria-live="polite">Primero voy a ordenar las posibilidades.</div>
                            <div class="furrielva-confirm" role="dialog" aria-modal="true" aria-labelledby="furrielva-confirm-title" hidden>
                                <div><small>FURRY MAPS</small><h3 id="furrielva-confirm-title">¿Marcar como ruta?</h3><p></p><span><button type="button" data-confirm="no">Seguir mirando</button><button type="button" data-confirm="yes">Marcar ruta</button></span></div>
                            </div>
                            <div class="furrielva-location-scene" hidden>
                                <div class="furrielva-npc-portrait" role="img"></div>
                                <div class="furrielva-location-dialogue"><strong></strong><p></p><div class="furrielva-location-choices"></div></div>
                            </div>
                            <div class="furrielva-blackout" aria-hidden="true"></div>
                        </div>
                        <div class="furrielva-appnav" aria-hidden="true"><span class="is-active">⌖<small>Mapa</small></span><span>♧<small>Lugares</small></span><span>●<small>Perfil</small></span></div>
                    </div>
                </div>
                <div class="minigame-instructions">Explora las zonas resaltadas · También puedes usar Tab y Enter</div>`;
            document.getElementById('game-container').appendChild(overlay);

            const visited = new Set();
            const lore = [];
            let currentLocation = church;
            const map = overlay.querySelector('.furrielva-map');
            const card = overlay.querySelector('.furrielva-card');
            const counter = overlay.querySelector('.furrielva-counter');
            const tour = overlay.querySelector('.furrielva-tour');
            const tourText = tour.querySelector('p');
            const tourButton = tour.querySelector('button');
            const confirm = overlay.querySelector('.furrielva-confirm');
            const locationScene = overlay.querySelector('.furrielva-location-scene');
            const routeSvg = overlay.querySelector('.furrielva-route');
            const routePath = routeSvg.querySelector('path');
            const miniSamu = overlay.querySelector('.furrielva-mini-samu');
            const kingdomLock = overlay.querySelector('.furrielva-kingdom-lock');
            const swallow = e => e.stopPropagation();
            overlay.addEventListener('click', swallow);

            let tourIndex = 0;
            let pendingLocation = null;
            const tourLines = [
                { id: 'plaza', text: 'Esta botella vacía lleva el nombre de Kingdom Ketchup. La plaza está llena de repartidores; alguno reconocerá la etiqueta o sabrá de dónde ha salido.' },
                { id: 'comercio', text: 'Si nadie reconoce el nombre, probaré en la zona comercial. Los comercios conocen a casi todos los repartidores y proveedores de la ciudad.' },
                { id: 'callejon', text: 'Y ese callejón de servicio parece comunicar con las instalaciones de la ciudad. Quizá algún trabajador municipal sepa qué hay detrás del fallo del mapa.' }
            ];

            const zoneButton = id => overlay.querySelector(`[data-location="${id}"]`);
            const setTourStep = () => {
                overlay.querySelectorAll('.furrielva-zone').forEach(zone => zone.classList.remove('is-tour-focus'));
                const step = tourLines[tourIndex];
                zoneButton(step.id)?.classList.add('is-tour-focus');
                tourText.textContent = step.text;
                tourButton.textContent = tourIndex === tourLines.length - 1 ? 'Empezar a investigar' : 'Siguiente zona';
            };

            const finishTour = () => {
                overlay.querySelectorAll('.furrielva-zone').forEach(zone => {
                    zone.classList.remove('is-tour-focus');
                    zone.disabled = false;
                });
                tour.classList.add('is-leaving');
                setTimeout(() => { tour.hidden = true; }, 280);
                card.textContent = 'Pasa el cursor por una zona y elige por dónde empezar.';
            };

            tourButton.addEventListener('click', () => {
                if (tourIndex < tourLines.length - 1) {
                    tourIndex += 1;
                    setTourStep();
                } else {
                    finishTour();
                }
            });
            setTourStep();

            const resetRoute = () => {
                routeSvg.classList.remove('is-active');
                routePath.setAttribute('d', '');
                miniSamu.className = 'furrielva-mini-samu';
                miniSamu.style.left = '';
                miniSamu.style.top = '';
                map.classList.remove('is-travelling');
            };

            const renderLocation = location => {
                locationScene.hidden = false;
                locationScene.style.setProperty('--location-bg', `url('${this.cacheBustAsset(location.background)}')`);
                const portrait = locationScene.querySelector('.furrielva-npc-portrait');
                portrait.style.setProperty('--npc-portrait', `url('${this.cacheBustAsset(location.portrait)}')`);
                portrait.setAttribute('aria-label', location.npc);
                const speaker = locationScene.querySelector('strong');
                const text = locationScene.querySelector('p');
                const choices = locationScene.querySelector('.furrielva-location-choices');
                const setSpeaker = name => {
                    speaker.textContent = name;
                    const color = name === 'SAMU'
                        ? ((this.characters.samu && this.characters.samu.color) || 'red')
                        : name === location.npc
                            ? location.color
                            : '#55d8c6';
                    speaker.style.color = this.readableNameColor(color);
                };

                const returnToMap = () => {
                    visited.add(location.id);
                    currentLocation = location;
                    const zone = zoneButton(location.id);
                    zone.classList.add('is-found');
                    zone.disabled = true;
                    counter.textContent = `${visited.size} / ${locations.length}`;
                    locationScene.classList.add('is-leaving');
                    setTimeout(() => {
                        locationScene.hidden = true;
                        locationScene.classList.remove('is-leaving');
                        resetRoute();
                        if (visited.size === locations.length) revealKingdom();
                        else card.textContent = `Pista conseguida en ${location.label}. Quedan ${locations.length - visited.size}.`;
                    }, 420);
                };

                const showDialogue = (lines, onComplete) => {
                    let index = 0;
                    const showCurrent = () => {
                        const line = lines[index];
                        setSpeaker(line.speaker);
                        text.textContent = line.text;
                        choices.innerHTML = `<button type="button" data-continue>${index === lines.length - 1 ? 'Continuar' : 'Siguiente'}</button>`;
                        choices.querySelector('[data-continue]').addEventListener('click', () => {
                            index += 1;
                            if (index < lines.length) showCurrent();
                            else onComplete();
                        }, { once: true });
                    };
                    showCurrent();
                };

                const showChoices = () => {
                    choices.innerHTML = location.choices.map((choice, index) =>
                        `<button type="button" data-choice="${index}">${choice.label}</button>`).join('');
                    choices.querySelectorAll('[data-choice]').forEach(button => {
                        button.addEventListener('click', () => {
                            const choice = location.choices[Number(button.dataset.choice)];
                            lore.push({ location: location.id, text: choice.lore });
                            showDialogue(choice.dialogue, () => {
                                setSpeaker('PISTA REGISTRADA');
                                text.textContent = choice.lore;
                                choices.innerHTML = '<button type="button" data-return-map>Volver a Furry Maps</button>';
                                choices.querySelector('[data-return-map]').addEventListener('click', returnToMap, { once: true });
                            });
                        }, { once: true });
                    });
                };

                showDialogue(location.opening, showChoices);
            };

            const routeBetween = (from, to) => {
                // Las tres rutas iniciales están dibujadas a mano para encajar
                // con las calles que salen de la iglesia. A partir de la primera
                // visita se construye una curva entre los centros reales de las
                // dos zonas, en las coordenadas 1000x500 del SVG.
                if (!from || from.id === church.id) return to.route;
                const [fromXPercent, fromYPercent] = from.destination;
                const [toXPercent, toYPercent] = to.destination;
                const startX = fromXPercent * 10;
                const startY = fromYPercent * 5;
                const endX = toXPercent * 10;
                const endY = toYPercent * 5;
                const deltaX = endX - startX;
                const deltaY = endY - startY;
                const distance = Math.max(1, Math.hypot(deltaX, deltaY));
                const side = from.id.localeCompare(to.id) < 0 ? 1 : -1;
                const bend = Math.min(70, Math.max(28, distance * .14)) * side;
                const normalX = -deltaY / distance;
                const normalY = deltaX / distance;
                const point = value => Math.round(value * 10) / 10;
                const control1X = startX + deltaX * .33 + normalX * bend;
                const control1Y = startY + deltaY * .33 + normalY * bend;
                const control2X = startX + deltaX * .67 + normalX * bend;
                const control2Y = startY + deltaY * .67 + normalY * bend;
                return `M${point(startX)} ${point(startY)} C${point(control1X)} ${point(control1Y)} ${point(control2X)} ${point(control2Y)} ${point(endX)} ${point(endY)}`;
            };

            const animateRoute = location => {
                confirm.hidden = true;
                const departure = currentLocation;
                routePath.setAttribute('d', routeBetween(departure, location));
                routeSvg.classList.add('is-active');
                const length = routePath.getTotalLength();
                const startPoint = routePath.getPointAtLength(0);
                miniSamu.style.left = `${startPoint.x / 10}%`;
                miniSamu.style.top = `${startPoint.y / 5}%`;
                miniSamu.classList.add('is-walking');
                miniSamu.hidden = false;
                card.textContent = `Ruta: ${departure.label} → ${location.label}`;
                const duration = 2600;
                const started = performance.now();
                let currentFrame = -1;
                const move = now => {
                    if (!overlay.isConnected) return;
                    const progress = Math.min(1, (now - started) / duration);
                    const point = routePath.getPointAtLength(length * progress);
                    miniSamu.style.left = `${point.x / 10}%`;
                    miniSamu.style.top = `${point.y / 5}%`;
                    const frame = Math.floor((now - started) / 120) % 4;
                    if (frame !== currentFrame) {
                        currentFrame = frame;
                        miniSamu.src = this.cacheBustAsset(samuFrames[frame]);
                    }
                    if (progress < 1) {
                        requestAnimationFrame(move);
                        return;
                    }
                    miniSamu.src = this.cacheBustAsset(samuFrames[4]);
                    miniSamu.classList.remove('is-walking');
                    miniSamu.classList.add('is-celebrating');
                    card.textContent = `¡Destino alcanzado: ${location.label}!`;
                    setTimeout(() => {
                        map.classList.add('is-travelling');
                        setTimeout(() => renderLocation(location), 650);
                    }, 720);
                };
                requestAnimationFrame(move);
            };

            const askForRoute = location => {
                pendingLocation = location;
                confirm.querySelector('p').textContent = `La ruta partirá desde ${currentLocation.label} hasta ${location.label}.`;
                confirm.hidden = false;
                confirm.querySelector('[data-confirm="yes"]').focus();
            };

            confirm.querySelector('[data-confirm="no"]').addEventListener('click', () => {
                confirm.hidden = true;
                pendingLocation = null;
            });
            confirm.querySelector('[data-confirm="yes"]').addEventListener('click', () => {
                if (!pendingLocation) return;
                const location = pendingLocation;
                pendingLocation = null;
                animateRoute(location);
            });

            locations.forEach(location => {
                const button = zoneButton(location.id);
                button.addEventListener('mouseenter', () => {
                    if (!button.disabled) card.textContent = `${location.label}: pulsa para consultar la ruta.`;
                });
                button.addEventListener('focus', () => {
                    if (!button.disabled) card.textContent = `${location.label}: pulsa para consultar la ruta.`;
                });
                button.addEventListener('click', () => askForRoute(location));
            });

            const revealKingdom = () => {
                card.textContent = 'Las tres pistas señalan el mismo vacío. El mapa está intentando ocultar algo.';
                kingdomLock.classList.add('is-revealing');
                setTimeout(() => {
                    kingdomLock.classList.add('is-revealed');
                    card.innerHTML = '<strong>SAMU:</strong> Ahí estás. La fábrica sí estaba aquí; alguna interferencia la borraba del mapa. Kingdom Ketchup… voy para allá.';
                    const finish = document.createElement('button');
                    finish.type = 'button';
                    finish.className = 'furrielva-finish';
                    finish.textContent = 'Marcar Kingdom Ketchup como destino';
                    card.appendChild(finish);
                    finish.addEventListener('click', () => {
                        map.classList.add('is-final-route');
                        finish.disabled = true;
                        setTimeout(() => {
                            overlay.removeEventListener('click', swallow);
                            overlay.remove();
                            this.lastMinigameResult = { explored: true, clues: visited.size, lore };
                            resolve(true);
                        }, 1050);
                    }, { once: true });
                }, 1700);
            };
        });
    }

    // Créditos finales del compi (credits-minigame.js). Solo tras cerrar el núcleo.
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

        // Soportar propiedades <x>ByDelay también en batallas (igual que en
        // playMinigame): p. ej. surviveTurnsByDelay {"0":5,"1":6,"2":7}.
        for (const prop of Object.keys(options)) {
            if (!prop.endsWith('ByDelay')) continue;
            const base = prop.slice(0, -'ByDelay'.length);
            const map = options[prop];
            const thresholds = Object.keys(map)
                .map(Number)
                .filter(n => n <= this.storyDelay)
                .sort((a, b) => a - b);
            if (thresholds.length > 0) {
                const key = thresholds[thresholds.length - 1];
                options = Object.assign({}, options, { [base]: map[key] });
            }
        }

        // El diapasón que Seraphyna le da a Samu al final del cap. 3 entra como
        // objeto consumible en los combates posteriores (decidido en la demo del
        // 25-jul-2026). Solo aparece si el jugador lo lleva de verdad encima.
        const diapason = window.BattleMinigame.items?.diapason;
        if (diapason && this.hasItem('diapason') && options.useInventory !== false) {
            const previos = Array.isArray(options.startItems) ? options.startItems : [];
            options = Object.assign({}, options, {
                startItems: [...previos, diapason]
            });
        }

        // retryOnDefeat: true -> al perder se reintenta (como el resto de
        // minijuegos del cap. 3). Por defecto false: el Game Over resuelve y
        // el capítulo decide (comportamiento original para las batallas de José).
        let won = await window.BattleMinigame.play(options);
        while (!won && options.retryOnDefeat) {
            await this.showMinigameRetry(options.retryText || '¡La marea os ha arrollado! 🌊');
            won = await window.BattleMinigame.play(options);
        }
        return won;
    }

    async playRuneChannelingMinigame(options = {}) {
        this.isWaitingForInput = false;

        if (!window.RuneChannelingMinigame) {
            console.warn('RuneChannelingMinigame no está cargado.');
            return false;
        }

        let won = false;
        while (!won) {
            won = await window.RuneChannelingMinigame.play(options);
            if (!won) {
                await this.showMinigameRetry('¡El santuario ha rechazado la canalización!');
            }
        }
        return won;
    }

    // Primera parte del combate de Kingdom Ketchup: durante un tiempo fijo,
    // Samu reúne tantas guindillas como pueda. No se pierde la historia si se
    // recogen pocas; el resultado regula la dificultad de la batalla contra Zip.
    async playChiliHarvestMinigame(options = {}) {
        this.isWaitingForInput = false;
        const collected = await this.runChiliHarvestRound(options);
        const hasChiliBox = this.hasItem('caja_guindillas');
        const boxBonus = hasChiliBox ? (Number(options.boxBonus) || 12) : 0;

        this.gameState.chiliCollected = collected;
        this.gameState.neitChiliBonus = boxBonus;
        this.gameState.chiliPower = collected + boxBonus;
        this.gameState.chiliPowerMax = Number(options.maxSpicePower) || 40;
        return collected;
    }

    runChiliHarvestRound(options = {}) {
        const rawDuration = Number(options.duration) || 22000;
        const duration = rawDuration <= 120 ? rawDuration * 1000 : rawDuration;
        const powerGoal = Number(options.powerGoal) || 28;
        const spawnRate = Number(options.spawnRate) || 1.35;
        const speedMult = Number(options.speedMult) || 1.25;
        const chiliChance = options.chiliChance !== undefined ? Number(options.chiliChance) : 0.72;
        const chiliIcon = this.cacheBustAsset('assets/images/minigames/chapter2/ketchup/chili_v2.webp');
        const ketchupIcon = this.cacheBustAsset('assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_gold.webp');
        const corruptIcon = this.cacheBustAsset('assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_corrupted.webp');
        const playerIcon = this.cacheBustAsset('assets/images/minigames/chapter2/common/samu_player.webp');
        const factoryBackground = this.cacheBustAsset(
            'assets/images/backgrounds/chapter2/kingdom_ketchup/kingdom_ketchup_production_floor_corrupted_v2_4k.webp'
        );

        this.preloadImages([
            'assets/images/minigames/chapter2/ketchup/chili_v2.webp',
            'assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_gold.webp',
            'assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_corrupted.webp',
            'assets/images/minigames/chapter2/common/samu_player.webp',
            'assets/images/characters/edu/edu_picante_wide_transparent.webp',
            'assets/images/characters/samu/samu_charred_closed.webp',
            'assets/images/characters/samu/samu_charred_whiteeyes.webp',
            'assets/images/backgrounds/chapter2/kingdom_ketchup/kingdom_ketchup_production_floor_corrupted_v2_4k.webp'
        ]);

        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'minigame-overlay chili-harvest-minigame';
            overlay.innerHTML = `
                <div class="minigame-hud chili-harvest-hud">
                    <span class="mg-score"><img class="mg-hud-icon" src="${chiliIcon}" alt="guindilla"><span class="mg-score-text">0</span></span>
                    <span class="chili-power-wrap"><span>PODER PICANTE</span><span class="chili-power-bar"><i></i></span></span>
                    <span class="mg-timer">${Math.ceil(duration / 1000)} s</span>
                </div>
                <div class="minigame-field" id="mg-field" style="--ketchup-factory:url('${factoryBackground}')">
                    <div class="mg-player" id="mg-player"><img src="${playerIcon}" alt="Samu" draggable="false"></div>
                    <div class="mg-phase-banner is-showing">¡Reúne picante para debilitar a Zip!</div>
                </div>
                <div class="minigame-instructions">Mueve con ← → / A D o el ratón. Recoge guindillas; las botellas te hacen perder una.</div>
            `;
            document.getElementById('game-container').appendChild(overlay);

            const field = overlay.querySelector('#mg-field');
            const player = overlay.querySelector('#mg-player');
            const scoreEl = overlay.querySelector('.mg-score-text');
            const timerEl = overlay.querySelector('.mg-timer');
            const powerFill = overlay.querySelector('.chili-power-bar i');
            const fieldRect = () => field.getBoundingClientRect();
            let score = 0;
            let playerX = 0.5;
            let items = [];
            let running = true;
            let spawnTimer = 0;
            let lastTime = null;
            const startTime = performance.now();

            const updateHud = remaining => {
                scoreEl.textContent = String(score);
                timerEl.textContent = `${Math.max(0, Math.ceil(remaining / 1000))} s`;
                powerFill.style.width = `${Math.min(100, (score / powerGoal) * 100)}%`;
            };
            const updatePlayer = () => { player.style.left = `${playerX * 100}%`; };
            updatePlayer();
            updateHud(duration);

            let moveLeft = false;
            let moveRight = false;
            const keyDown = event => {
                const key = event.key.toLowerCase();
                if (key === 'arrowleft' || key === 'a') moveLeft = true;
                if (key === 'arrowright' || key === 'd') moveRight = true;
                if (key.startsWith('arrow')) event.preventDefault();
            };
            const keyUp = event => {
                const key = event.key.toLowerCase();
                if (key === 'arrowleft' || key === 'a') moveLeft = false;
                if (key === 'arrowright' || key === 'd') moveRight = false;
            };
            const mouseMove = event => {
                const rect = fieldRect();
                playerX = Math.max(0.04, Math.min(0.96, (event.clientX - rect.left) / rect.width));
                updatePlayer();
            };
            const swallowClick = event => event.stopPropagation();
            document.addEventListener('keydown', keyDown);
            document.addEventListener('keyup', keyUp);
            field.addEventListener('mousemove', mouseMove);
            overlay.addEventListener('click', swallowClick, true);
            const detachControls = () => {
                document.removeEventListener('keydown', keyDown);
                document.removeEventListener('keyup', keyUp);
                field.removeEventListener('mousemove', mouseMove);
                overlay.removeEventListener('click', swallowClick, true);
            };

            const spawnItem = () => {
                const good = Math.random() < chiliChance;
                const corrupt = !good && Math.random() < 0.45;
                const type = good ? 'chili' : (corrupt ? 'corrupt' : 'ketchup');
                const icon = good ? chiliIcon : (corrupt ? corruptIcon : ketchupIcon);
                const el = document.createElement('div');
                el.className = `mg-item mg-item-${type}`;
                el.innerHTML = `<img src="${icon}" alt="${good ? 'guindilla' : 'botella de ketchup'}" draggable="false">`;
                const x = 0.05 + Math.random() * 0.9;
                el.style.left = `${x * 100}%`;
                el.style.top = '-10%';
                field.appendChild(el);
                items.push({
                    el,
                    x,
                    y: -0.1,
                    speed: (0.28 + Math.random() * 0.22) * speedMult,
                    good,
                });
            };

            const cleanup = () => {
                if (!running) return;
                running = false;
                detachControls();
                items.forEach(item => item.el.remove());
                items = [];
                const result = document.createElement('div');
                result.className = 'minigame-result';
                result.textContent = `¡${score} guindillas reunidas!`;
                overlay.appendChild(result);
                setTimeout(() => {
                    overlay.remove();
                    resolve(score);
                }, 1200);
            };

            const loop = time => {
                if (!running || !overlay.isConnected) {
                    running = false;
                    detachControls();
                    items.forEach(item => item.el.remove());
                    items = [];
                    return;
                }
                const elapsed = time - startTime;
                const remaining = duration - elapsed;
                if (remaining <= 0) return cleanup();
                if (lastTime === null) lastTime = time;
                const dt = Math.min((time - lastTime) / 1000, 0.05);
                lastTime = time;

                if (moveLeft) playerX = Math.max(0.04, playerX - 1.2 * dt);
                if (moveRight) playerX = Math.min(0.96, playerX + 1.2 * dt);
                updatePlayer();
                updateHud(remaining);

                spawnTimer -= dt;
                if (spawnTimer <= 0) {
                    spawnItem();
                    spawnTimer = (0.34 + Math.random() * 0.32) / spawnRate;
                }

                for (let index = items.length - 1; index >= 0; index--) {
                    const item = items[index];
                    item.y += item.speed * dt;
                    item.el.style.top = `${item.y * 100}%`;
                    const caught = item.y >= 0.80 && item.y <= 0.98 && Math.abs(item.x - playerX) < 0.075;
                    if (caught) {
                        if (item.good) {
                            score++;
                            player.classList.add('chili-caught');
                            setTimeout(() => player.classList.remove('chili-caught'), 120);
                        } else {
                            score = Math.max(0, score - 1);
                            field.classList.add('mg-hit');
                            setTimeout(() => field.classList.remove('mg-hit'), 200);
                        }
                        updateHud(remaining);
                        item.el.remove();
                        items.splice(index, 1);
                    } else if (item.y > 1.1) {
                        item.el.remove();
                        items.splice(index, 1);
                    }
                }
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        });
    }

    // Bullet hell de José Manuel, conectado a la reserva de guindillas obtenida
    // en la ronda anterior y al posible regalo de Neit.
    async playKetchupBossMinigame(options = {}) {
        // El minijuego gestiona su propia entrada; no esperar clic extra al salir
        this.isWaitingForInput = false;

        const bossGame = window.KetchupMinigame || window.KetchupBossMinigame;
        if (!bossGame) {
            console.warn('KetchupMinigame no está cargado.');
            return false;
        }

        const bossOptions = Object.assign({}, options, {
            spicePower: Number(this.gameState.chiliPower) || 0,
            maxSpicePower: Number(this.gameState.chiliPowerMax) || Number(options.maxSpicePower) || 40,
            hasChiliBox: this.hasItem('caja_guindillas')
        });

        // Se repite hasta ganar; al perder solo se puede reintentar
        let won = false;
        while (!won) {
            won = await bossGame.play(bossOptions);
            if (!won) {
                await this.showMinigameRetry('¡Samu ha acabado cubierto de ketchup!');
            }
        }
        return won;
    }

    // Alias para herramientas y escenas antiguas que invocaban este nombre.
    async playKetchupMinigame(options = {}) {
        return this.playKetchupBossMinigame(options);
    }

    // Implementación histórica del recolector, conservada temporalmente para
    // compatibilidad con pruebas antiguas; la historia usa chiliHarvest.
    runKetchupRound(options = {}) {
        const goal = options.goal || 10;          // ketchups necesarios para ganar
        const maxHits = options.maxHits || 3;     // golpes de guindilla permitidos
        const duration = options.duration || 0;   // 0 = sin límite de tiempo
        const spawnRate = options.spawnRate || 1.0; // multiplicador de frecuencia de aparición
        const speedMult = options.speedMult || 1.0; // multiplicador de velocidad de caída
        const chiliChance = options.chiliChance !== undefined ? options.chiliChance : 0.6;
        const showExtraInfo = options.showExtraInfo || false; // mostrar info de debug/test
        const phase1Goal = Math.min(goal - 2, options.phase1Goal || Math.ceil(goal * 0.3));
        const phase2Goal = Math.min(goal - 1, options.phase2Goal || Math.ceil(goal * 0.68));
        const ketchupIcon = this.cacheBustAsset('assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_gold.webp');
        const corruptIcon = this.cacheBustAsset('assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_corrupted.webp');
        const capIcon = this.cacheBustAsset('assets/images/minigames/chapter2/ketchup/golden_cap.webp');
        const chiliIcon = this.cacheBustAsset('assets/images/minigames/chapter2/ketchup/chili_v2.webp');
        this.preloadImages([
            'assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_gold.webp',
            'assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_corrupted.webp',
            'assets/images/minigames/chapter2/ketchup/golden_cap.webp',
            'assets/images/minigames/chapter2/ketchup/chili_v2.webp',
            'assets/images/backgrounds/chapter2/kingdom_ketchup/kingdom_ketchup_production_floor_corrupted_v2_4k.webp',
            'assets/images/minigames/chapter2/common/samu_player.webp'
        ]);
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
            overlay.className = 'minigame-overlay ketchup-minigame ketchup-phase-1';
            overlay.innerHTML = `
                <div class="minigame-hud">
                    <span class="mg-score"><img class="mg-hud-icon" src="${ketchupIcon}" alt="ketchup"><span class="mg-score-text">0 / ${goal}</span></span>
                    <span class="mg-phase">FASE 1 · REACTIVA LA LÍNEA</span>
                    <span class="mg-lives">❤️ ${maxHits}</span>
                    ${showExtraInfo ? `<span class="mg-extra-info" style="margin-left:20px; font-size:0.8em; color:#ffb4b4">🌶️ Vel: ${(speedMult * 1.5).toFixed(2)}x</span>` : ''}
                </div>
                <div class="minigame-field" id="mg-field" style="--ketchup-factory:url('${this.cacheBustAsset('assets/images/backgrounds/chapter2/kingdom_ketchup/kingdom_ketchup_production_floor_corrupted_v2_4k.webp')}')">
                    <div class="mg-player" id="mg-player"><img src="${this.cacheBustAsset('assets/images/minigames/chapter2/common/samu_player.webp')}" alt="Samu" draggable="false"></div>
                    <div class="mg-phase-banner">Reactiva la línea de embotellado</div>
                </div>
                <div class="minigame-instructions">Mueve con ← → / A D o el ratón. Recoge producto limpio y tapones; esquiva corrupción y guindillas.</div>
            `;
            document.getElementById('game-container').appendChild(overlay);

            const field = overlay.querySelector('#mg-field');
            const player = overlay.querySelector('#mg-player');
            const scoreEl = overlay.querySelector('.mg-score-text');
            const livesEl = overlay.querySelector('.mg-lives');
            const phaseEl = overlay.querySelector('.mg-phase');
            const phaseBanner = overlay.querySelector('.mg-phase-banner');

            const fieldRect = () => field.getBoundingClientRect();

            let score = 0;
            let lives = maxHits;
            let playerX = 0.5; // posición horizontal normalizada (0..1)
            const playerW = 0.12; // ancho del jugador relativo al campo
            let items = [];     // { el, x, y, speed, type }
            let running = true;
            let spawnTimer = 0;
            let lastTime = null;
            let phase = 1;

            const setPhase = next => {
                if (next === phase) return;
                phase = next;
                overlay.classList.remove('ketchup-phase-1', 'ketchup-phase-2', 'ketchup-phase-3');
                overlay.classList.add(`ketchup-phase-${phase}`);
                const labels = {
                    1: ['FASE 1 · REACTIVA LA LÍNEA', 'Reactiva la línea de embotellado'],
                    2: ['FASE 2 · DESCOMPRIME', 'Separa las botellas limpias de la corrupción'],
                    3: ['FASE 3 · LIBERA A EDU', '¡Los Ketchlings lanzan tapones dorados!']
                };
                phaseEl.textContent = labels[phase][0];
                phaseBanner.textContent = labels[phase][1];
                phaseBanner.classList.remove('is-showing');
                void phaseBanner.offsetWidth;
                phaseBanner.classList.add('is-showing');
            };

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
                const roll = Math.random();
                let type;
                if (phase === 2 && roll < 0.18) type = 'corrupt';
                else if (phase === 3 && roll < 0.28) type = 'cap';
                else type = roll < chiliChance ? 'chili' : 'ketchup';
                const el = document.createElement('div');
                el.className = `mg-item mg-item-${type}`;
                const img = document.createElement('img');
                const icons = { chili: chiliIcon, ketchup: ketchupIcon, corrupt: corruptIcon, cap: capIcon };
                const labels = { chili: 'guindilla', ketchup: 'botella limpia', corrupt: 'botella corrupta', cap: 'tapón dorado' };
                img.src = icons[type];
                img.alt = labels[type];
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
                    type
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
                // Si nos han sacado del minijuego desde los botones de arriba,
                // su overlay ya no está en el documento: parar el bucle.
                if (!running || !overlay.isConnected) { running = false; return; }
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
                    const hitboxWidth = (it.type === 'chili' || it.type === 'corrupt') ? 0.045 : playerW;
                    const caught = it.y >= 0.82 && it.y <= 0.98 &&
                        Math.abs(it.x - playerX) < hitboxWidth;

                    if (caught) {
                        if (it.type === 'ketchup' || it.type === 'cap') {
                            score++;
                            scoreEl.textContent = `${score} / ${goal}`;
                            if (score >= phase2Goal) setPhase(3);
                            else if (score >= phase1Goal) setPhase(2);
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
    // Pantalla de "has perdido, ¿reintentas?". Se puede ABORTAR desde fuera
    // (menú de escenas / retroceder): si no, quien llegue aquí desde el selector
    // se queda encerrado, porque la única salida es ganar el minijuego. Al
    // abortar se rechaza con un error etiquetado que playMinigame recoge y
    // deshace toda la cadena del minijuego de una vez.
    showMinigameRetry(message = '¡No ha salido bien!') {
        return new Promise((resolve, reject) => {
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

            const cerrar = () => {
                this._abortarRetry = null;
                overlay.removeEventListener('click', swallowClick, true);
                overlay.remove();
            };

            this._abortarRetry = () => {
                cerrar();
                const e = new Error('minijuego-cancelado');
                e.minijuegoCancelado = true;
                reject(e);
            };

            const retryBtn = overlay.querySelector('#mg-retry-btn');
            retryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                cerrar();
                resolve(true);
            });
        });
    }

    // ¿Hay una pantalla de reintento esperando? La usan los botones de escenas
    // y de retroceder para saber si tienen que sacarnos de ahí.
    hayRetryAbierto() {
        return typeof this._abortarRetry === 'function';
    }

    abortarRetry() {
        if (this._abortarRetry) this._abortarRetry();
    }

    // Minijuego: Micaela Michis (El Jarrón). Estilo Pac-Man: Samu se mueve
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
        const catIcon = this.cacheBustAsset('assets/images/minigames/chapter2/common/gato.webp');
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
                    <div class="mg-player" id="mg-player-gatos"><img src="${this.cacheBustAsset('assets/images/minigames/chapter2/common/samu_player.webp')}" alt="Samu" draggable="false"></div>
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
                this.cacheBustAsset('assets/images/minigames/shared/choices/me-perdonas.webp'),
                this.cacheBustAsset('assets/images/minigames/shared/choices/te-perdono.webp'),
                this.cacheBustAsset('assets/images/minigames/shared/choices/no-te-perdono.webp')
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
                result.textContent = won ? '¡Escapaste de Micaela Michis!' : '¡Un gato te ha pillado!';
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
                // Nos han sacado desde los botones de arriba: su overlay ya no
                // está en el documento, así que el bucle se para solo.
                if (!running || !overlay.isConnected) { running = false; return; }
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
                // Si nos han sacado desde los botones de arriba, el overlay ya
                // no está en el documento: cortar la cadena de spawns.
                if (!running || !overlay.isConnected) { running = false; return; }

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

    // Minijuego: memoria de palomas (estilo Simon) en Ciudad Paloma.
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
            { image: 'assets/images/minigames/shared/runes/runa_samu.webp', label: 'Magia de Samu' },
            { image: 'assets/images/minigames/shared/runes/runa_edu.webp', label: 'Prisa de Edu' },
            { image: 'assets/images/minigames/shared/runes/runa_tony.webp', label: 'Purificación de Seraphyna' },
            { image: 'assets/images/minigames/shared/runes/runa_jose.webp', label: 'Fuerza de José' }
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
        // FICHA del personaje (poses), que viven en assets/images/characters/<key>/...
        // (antes se construían sin la subcarpeta -> 404 en bucle y avatar vacío).
        // Se cache-bustean UNA sola vez aquí, no en cada cambio, para no
        // redescargar ni disparar 404 repetidos.
        const avatarKey = this.getCharacterKey(options.avatar || 'samu');
        const avatarChar = this.characters[avatarKey] || {};
        const aPose = (name, fallback) =>
            this.cacheBustAsset((avatarChar.poses && avatarChar.poses[name]) || fallback);
        const avatarPoses = {
            idle:    aPose('neutral',    `assets/images/characters/${avatarKey}/${avatarKey}.png`),
            perfect: aPose('happy',      `assets/images/characters/${avatarKey}/${avatarKey}_happy.png`),
            good:    aPose('determined', `assets/images/characters/${avatarKey}/${avatarKey}_determined.png`),
            miss:    aPose('worried',    `assets/images/characters/${avatarKey}/${avatarKey}_worried.png`)
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
            let startTime = performance.now();
            let cuentaTimer = null;   // temporizador de la cuenta atrás previa

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
                if (cuentaTimer) { clearTimeout(cuentaTimer); cuentaTimer = null; }
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

            // Si nos han sacado desde los botones de arriba no se ejecuta el
            // cierre normal, así que estos oyentes (que cuelgan de document) se
            // dan de baja solos: si no, seguirían tragándose las teclas D F J K
            // con preventDefault durante el resto de la partida.
            const soltarTeclas = () => {
                document.removeEventListener('keydown', onKey);
                document.removeEventListener('keyup', onKeyUp);
            };
            const onKey = (e) => {
                if (!overlay.isConnected) return soltarTeclas();
                const lane = keys.indexOf((e.key || '').toUpperCase());
                if (lane === -1) return;
                e.preventDefault();
                if (activeSpinner) { spinnerTap(); flashKey(lane); return; }
                if (!e.repeat) judgeHit(lane);   // ignorar auto-repetición (mantener slider)
            };
            const onKeyUp = (e) => {
                if (!overlay.isConnected) return soltarTeclas();
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
                // Nos han sacado desde los botones de arriba: el overlay ya no
                // está en el documento. Aquí hay que apagar el intervalo a mano;
                // los demás minijuegos van con requestAnimationFrame y se paran
                // solos al no volver a pedir cuadro.
                if (!running || !overlay.isConnected) {
                    running = false;
                    if (ticker) { clearInterval(ticker); ticker = null; }
                    return;
                }
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

            // ---- Cuenta atrás antes de empezar --------------------------------
            // Pedido tras la demo: el minijuego arrancaba de golpe y te pillaba con
            // las manos en el regazo. Aquí se avisa, se enseñan las teclas y solo
            // entonces empieza a correr el reloj.
            //
            // OJO: la canción tampoco puede sonar durante la cuenta. El reloj
            // maestro es audio.currentTime, así que si la música arranca antes,
            // el horario de notas avanza sin nosotros y nacerían ya pasadas.
            const arrancar = () => {
                startTime = performance.now();
                // Reiniciar la canción en CADA ronda: si no, tras perder seguiría
                // avanzando y las notas nuevas nacerían fuera de tiempo.
                if (audioEl) {
                    try { audioEl.currentTime = 0; } catch (e) {}
                    const _p = audioEl.play();
                    if (_p && _p.catch) _p.catch(() => {});
                }
                ticker = setInterval(tick, 16);
            };

            const cartel = document.createElement('div');
            cartel.className = 'rhythm-countdown neon-font';
            cartel.innerHTML =
                '<div class="rhythm-countdown-num"></div>' +
                '<div class="rhythm-countdown-hint">Prepara los dedos: <b>' +
                keys.join(' · ') + '</b></div>';
            overlay.appendChild(cartel);
            keyEls.forEach(k => k.classList.add('rhythm-key-ready'));

            const pasos = ['5', '4', '3', '2', '1', '¡YA!'];
            let paso = 0;
            const numEl = cartel.querySelector('.rhythm-countdown-num');
            const tictac = () => {
                if (!running || !overlay.isConnected) { running = false; return; }
                if (paso < pasos.length) {
                    numEl.textContent = pasos[paso];
                    numEl.classList.remove('rhythm-countdown-pop');
                    void numEl.offsetWidth;
                    numEl.classList.add('rhythm-countdown-pop');
                    // pitido: agudo y corto en los números, más brillante en el ¡YA!
                    const ultimo = paso === pasos.length - 1;
                    beep(ultimo ? 880 : 440, ultimo ? 0.18 : 0.09, 0, 'triangle', 0.5);
                    paso++;
                    // 5 números a 900 ms = 4,5 s, más el "¡YA!": unos 5 segundos
                    cuentaTimer = setTimeout(tictac, ultimo ? 500 : 900);
                } else {
                    cartel.remove();
                    keyEls.forEach(k => k.classList.remove('rhythm-key-ready'));
                    cuentaTimer = null;
                    arrancar();
                }
            };
            tictac();
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
                playerFrames: ['coche_v2_0', 'coche_v2_1', 'coche_v2_2',
                               'coche_v2_3', 'coche_v2_4', 'coche_v2_5'],
                playerHeight: 0.19, playerRatio: 1.55,
                // Huella sobre el asfalto (centro y radios relativos al sprite).
                // La imagen puede solaparse con otra por perspectiva sin chocar.
                playerFootprint: { x: 0.50, y: 0.83, rx: 0.39, ry: 0.07 },
                xMin: 0.03, xMax: 0.80,
                yMin: 0.65, yMax: 0.92,
                bgFar: 'carretera_loop_fondo_sin_luna_v2',
                bgNear: 'carretera_loop_v2',
                moon: 'carretera_luna_v2',
                moonStartX: 0.82, moonEndX: 0.20,
                moonStartY: 0.22, moonEndY: 0.12,
                obstacles: [
                    {
                        name: 'obs_bidon_v2_0',
                        frames: ['obs_bidon_v2_0', 'obs_bidon_v2_1',
                                 'obs_bidon_v2_2', 'obs_bidon_v2_3'],
                        frameMs: 0.11, h: 0.105, ratio: 0.691,
                        footprint: { x: 0.50, y: 0.89, rx: 0.30, ry: 0.08 }
                    },
                    {
                        name: 'obs_valla_v2_0',
                        frames: ['obs_valla_v2_0', 'obs_valla_v2_1',
                                 'obs_valla_v2_2', 'obs_valla_v2_3'],
                        frameMs: 0.16, h: 0.29, ratio: 0.976,
                        yMin: 0.68, yMax: 0.79,
                        // Tres apoyos a distinta profundidad: la valla serpentea
                        // hacia el fondo y corta buena parte del ancho de la vía.
                        footprints: [
                            { x: 0.47, y: 0.82, rx: 0.39, ry: 0.035 },
                            { x: 0.51, y: 0.49, rx: 0.22, ry: 0.030 },
                            { x: 0.51, y: 0.25, rx: 0.15, ry: 0.025 }
                        ]
                    },
                    {
                        name: 'obs_rocas_v2_0',
                        frames: ['obs_rocas_v2_0', 'obs_rocas_v2_1',
                                 'obs_rocas_v2_2', 'obs_rocas_v2_3'],
                        frameMs: 0.12, h: 0.095, ratio: 2.00,
                        footprint: { x: 0.50, y: 0.73, rx: 0.44, ry: 0.09 }
                    },
                    {
                        name: 'obs_cable_v2_0',
                        frames: ['obs_cable_v2_0', 'obs_cable_v2_1',
                                 'obs_cable_v2_2', 'obs_cable_v2_3'],
                        frameMs: 0.085, h: 0.085, ratio: 1.946,
                        footprint: { x: 0.50, y: 0.62, rx: 0.44, ry: 0.20 }
                    }
                ],
                enemies: [
                    ['meme_bob_v2_0', 'meme_bob_v2_1', 'meme_bob_v2_2', 'meme_bob_v2_3'],
                    ['meme_knucles_v2_0', 'meme_knucles_v2_1', 'meme_knucles_v2_2', 'meme_knucles_v2_3'],
                    ['meme_pepe_v2_0', 'meme_pepe_v2_1', 'meme_pepe_v2_2', 'meme_pepe_v2_3'],
                    ['meme_troll_v2_0', 'meme_troll_v2_1', 'meme_troll_v2_2', 'meme_troll_v2_3']
                ],
                collectible: null,
                // Knobs de dificultad/QA con passthrough (igual que en eduvuelo:
                // si no se reenvían, los valores del JSON se ignoran en silencio)
                spawnMs: options.spawnMs,
                graceMs: options.graceMs, hitGraceMs: options.hitGraceMs,
                debugHitboxes: !!options.debugHitboxes,
                title: '🏎️ Conduce con el RATÓN o WASD/FLECHAS. Muévete por toda la carretera y esquiva las embestidas.',
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
    // Minijuego "eduvuelo" (Edu volando): recupera las partituras entre el
    // entramado del concierto. Desde agosto de 2026 usa un motor propio para
    // poder tener impulso, energía, combos y patrones sin tocar la persecución.
    // ============================================================
    async playEduVueloMinigame(options = {}) {
        this.isWaitingForInput = false;
        let won = false;
        while (!won) {
            won = await this.runEduFlight({
                goal: options.goal || 16,
                speed: options.speed || 6.4,
                maxHits: options.maxHits || 3,
                spawnMs: options.spawnMs != null ? options.spawnMs : 620,
                hangChance: options.hangChance != null ? options.hangChance : 0.26,
                riserChance: options.riserChance != null ? options.riserChance : 0.20,
                hangMin: options.hangMin != null ? options.hangMin : 0.28,
                hangMax: options.hangMax != null ? options.hangMax : 0.62,
                fallerChance: options.fallerChance != null ? options.fallerChance : 0.28,
                fallerVy: options.fallerVy != null ? options.fallerVy : 0.30,
                speakerChance: options.speakerChance != null ? options.speakerChance : 0.19,
                gustChance: options.gustChance != null ? options.gustChance : 0.11,
                collectChance: options.collectChance != null ? options.collectChance : 0.29,
                collectEvery: options.collectEvery != null ? options.collectEvery : 3,
                phraseMin: options.phraseMin != null ? options.phraseMin : 1,
                phraseMax: options.phraseMax != null ? options.phraseMax : 2,
                energyRegen: options.energyRegen != null ? options.energyRegen : 8,
                dashCost: options.dashCost != null ? options.dashCost : 52,
                dashDuration: options.dashDuration != null ? options.dashDuration : 0.36,
                difficultyRamp: options.difficultyRamp != null ? options.difficultyRamp : 0.32,
                corridorMin: options.corridorMin != null ? options.corridorMin : 0.20,
                graceMs: options.graceMs != null ? options.graceMs : 900,
                hitGraceMs: options.hitGraceMs != null ? options.hitGraceMs : 900,
                debugHitboxes: !!options.debugHitboxes
            });
            if (!won) {
                await this.showMinigameRetry('¡Se te han escapado las partituras! ⚡');
            }
        }
        return won;
    }

    // Motor dedicado al vuelo. La progresión alterna frases de partituras con
    // patrones de peligro, de modo que una mala tirada aleatoria nunca alarga la
    // partida ni genera una pared sin salida.
    async runEduFlight(cfg = {}) {
        this.isWaitingForInput = false;
        const SP = 'assets/images/minigames/chapter3/sprites/';
        const CAP = 'assets/images/minigames/chapter3/';
        const FLIGHT_FRAMES = [
            'assets/images/minigames/chapter3/sprites/edu_fly_v3_0.webp',
            'assets/images/minigames/chapter3/sprites/edu_fly_v3_1.webp',
            'assets/images/minigames/chapter3/sprites/edu_fly_v3_2.webp',
            'assets/images/minigames/chapter3/sprites/edu_fly_v3_3.webp',
            'assets/images/minigames/chapter3/sprites/edu_fly_v3_4.webp',
            'assets/images/minigames/chapter3/sprites/edu_fly_v3_5.webp',
            'assets/images/minigames/chapter3/sprites/edu_fly_v3_6.webp',
            'assets/images/minigames/chapter3/sprites/edu_fly_v3_7.webp'
        ];
        const DASH_FRAMES = [
            'assets/images/minigames/chapter3/sprites/edu_fly_v3_dash_0.webp',
            'assets/images/minigames/chapter3/sprites/edu_fly_v3_dash_1.webp'
        ];
        const PLAYER_FRAMES = [...FLIGHT_FRAMES, ...DASH_FRAMES];
        const asset = (path) => `url('${this.cacheBustAsset(path)}')`;
        const playerFrameAsset = (path) => asset(path);

        await this.preloadImages([
            ...PLAYER_FRAMES,
            CAP + 'aire_fondo_v2.webp',
            SP + 'aire_foco_v2.webp',
            SP + 'aire_altavoz_v2.webp',
            SP + 'partitura_v2.webp',
            SP + 'aire_cable_v3.webp'
        ]);

        const goal = Math.max(1, cfg.goal || 16);
        const maxHits = Math.max(1, cfg.maxHits || 3);
        const baseSpeed = Math.max(2, cfg.speed || 6);

        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'minigame-overlay edu-flight-minigame';
            overlay.innerHTML = `
                <div class="fly-hud">
                    <div class="fly-hud-block fly-score">
                        <small>PARTITURAS</small><strong>0 / ${goal}</strong>
                    </div>
                    <div class="fly-hud-block fly-combo">
                        <small>CADENA</small><strong>x1</strong>
                    </div>
                    <div class="fly-energy" aria-label="Energía de impulso">
                        <span>IMPULSO</span>
                        <div class="fly-energy-track"><i></i></div>
                        <kbd>ESPACIO</kbd>
                    </div>
                    <div class="fly-lives" aria-label="Resistencia"></div>
                    <button class="ss-pause-btn" type="button" aria-label="Pausar">Ⅱ</button>
                </div>
                <div class="fly-stage">
                    <div class="fly-backdrop" aria-hidden="true"></div>
                    <div class="fly-haze" aria-hidden="true"></div>
                    <div class="fly-speed-lines" aria-hidden="true"></div>
                    <div class="fly-player" aria-label="Edu"></div>
                    <div class="fly-player-hitbox is-ellipse" aria-hidden="true"><span>EDU</span></div>
                    <div class="ss-progress-wrap"><div class="ss-progress-fill"></div></div>
                    <div class="fly-callout" aria-live="polite"></div>
                    <div class="ss-countdown active" aria-live="polite">3</div>
                    <div class="ss-pause-panel" hidden>
                        <strong>PAUSA</strong>
                        <span>Ratón o W/S para volar · ESPACIO/clic para impulsar.</span>
                        <button class="ss-resume-btn" type="button">CONTINUAR</button>
                    </div>
                </div>
                <div class="minigame-instructions">
                    <b>RECUPERA LAS PARTITURAS</b>
                    <span>Ratón / W S: altura</span>
                    <span>ESPACIO o clic: impulso</span>
                    <small>P / ESC: pausa</small>
                </div>
            `;
            document.getElementById('game-container').appendChild(overlay);

            const stage = overlay.querySelector('.fly-stage');
            const backdrop = overlay.querySelector('.fly-backdrop');
            const playerEl = overlay.querySelector('.fly-player');
            const playerDebugEl = overlay.querySelector('.fly-player-hitbox');
            const scoreEl = overlay.querySelector('.fly-score strong');
            const comboEl = overlay.querySelector('.fly-combo strong');
            const energyEl = overlay.querySelector('.fly-energy-track i');
            const energyWrap = overlay.querySelector('.fly-energy');
            const livesEl = overlay.querySelector('.fly-lives');
            const progressEl = overlay.querySelector('.ss-progress-fill');
            const calloutEl = overlay.querySelector('.fly-callout');
            const countdownEl = overlay.querySelector('.ss-countdown');
            const pauseBtn = overlay.querySelector('.ss-pause-btn');
            const pausePanel = overlay.querySelector('.ss-pause-panel');
            const resumeBtn = overlay.querySelector('.ss-resume-btn');

            backdrop.style.backgroundImage = asset(CAP + 'aire_fondo_v2.webp');
            playerEl.style.backgroundImage = playerFrameAsset(PLAYER_FRAMES[0]);
            playerDebugEl.hidden = !cfg.debugHitboxes;

            const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
            const fieldW = () => stage.clientWidth || 1;
            const fieldH = () => stage.clientHeight || 1;
            const yMin = 0.10;
            const yMax = 0.88;
            const homeX = 0.115;
            const dashX = 0.245;

            let running = true;
            let paused = false;
            let started = false;
            let last = performance.now();
            let countdownTime = 0;
            let countdownIndex = -1;
            let spawnClock = 0;
            let spawnNumber = 0;
            let hazardsSincePhrase = 0;
            let lastCableSide = Math.random() < 0.5 ? 'top' : 'bottom';
            let objects = [];
            let frameIndex = 0;
            let dashFrameIndex = 0;
            let frameClock = 0;
            let wasDashing = false;
            let playerX = homeX;
            let playerY = 0.50;
            let previousPlayerY = playerY;
            let collisionPreviousPlayerX = playerX;
            let collisionPreviousPlayerY = playerY;
            let targetY = playerY;
            let energy = 100;
            let hits = 0;
            let collected = 0;
            let combo = 0;
            let maxCombo = 0;
            let nearMisses = 0;
            let flightScore = 0;
            let dashUntil = 0;
            let dashCooldownUntil = 0;
            let invulnerableUntil = performance.now() + (cfg.graceMs || 0);
            let blinkUntil = invulnerableUntil;
            let calloutUntil = 0;
            let calloutPriority = 0;
            let finaleAnnounced = false;
            let raf = null;
            let resultTimer = null;
            let audioContext = null;

            const beep = (frequency, duration, options = {}) => {
                try {
                    if (!audioContext) {
                        audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    }
                    if (audioContext.state === 'suspended') audioContext.resume();
                    const oscillator = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    const when = audioContext.currentTime + (options.delay || 0);
                    oscillator.type = options.type || 'sine';
                    oscillator.frequency.value = frequency;
                    gain.gain.setValueAtTime(0.0001, when);
                    gain.gain.exponentialRampToValueAtTime(options.volume || 0.06, when + 0.01);
                    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
                    oscillator.connect(gain).connect(audioContext.destination);
                    oscillator.start(when);
                    oscillator.stop(when + duration + 0.02);
                } catch (error) {}
            };

            const showCallout = (
                text,
                tone = 'good',
                duration = 720,
                priority = 0
            ) => {
                const now = performance.now();
                if (now < calloutUntil && priority < calloutPriority) return;
                calloutEl.textContent = text;
                calloutEl.dataset.tone = tone;
                calloutEl.classList.remove('is-visible');
                void calloutEl.offsetWidth;
                calloutEl.classList.add('is-visible');
                calloutUntil = now + duration;
                calloutPriority = priority;
            };

            const playerRect = (y = playerY, x = playerX) => {
                const width = fieldH() * 0.245 * 0.78;
                const height = fieldH() * 0.245;
                return {
                    left: x * fieldW() + width * 0.30,
                    right: x * fieldW() + width * 1.10,
                    top: y * fieldH() - height * 0.12,
                    bottom: y * fieldH() + height * 0.38
                };
            };

            const rectsOverlap = (a, b) =>
                a.left < b.right && a.right > b.left &&
                a.top < b.bottom && a.bottom > b.top;

            const playerShapeAt = (y = playerY, x = playerX) => {
                const rect = playerRect(y, x);
                return {
                    kind: 'ellipse',
                    cx: (rect.left + rect.right) / 2,
                    cy: (rect.top + rect.bottom) / 2,
                    rx: (rect.right - rect.left) / 2,
                    ry: (rect.bottom - rect.top) / 2
                };
            };

            const objectRect = (object, previous = false) => {
                const x = (previous ? object.previousX : object.x) * fieldW();
                const y = (previous ? object.previousY : object.y) * fieldH();
                const width = object.el.offsetWidth;
                const height = object.el.offsetHeight;
                const sx = object.hitScaleX != null ? object.hitScaleX : 0.58;
                const sy = object.hitScaleY != null ? object.hitScaleY : 0.58;
                return {
                    left: x - width * sx / 2,
                    right: x + width * sx / 2,
                    top: y - height * sy / 2,
                    bottom: y + height * sy / 2
                };
            };

            const objectShapeAt = (object, x, y) => {
                const width = object.el.offsetWidth *
                    (object.hitScaleX != null ? object.hitScaleX : 0.58);
                const height = object.el.offsetHeight *
                    (object.hitScaleY != null ? object.hitScaleY : 0.58);
                const cx = x * fieldW();
                const cy = y * fieldH();
                if (object.type === 'cable') {
                    return {
                        kind: 'rect',
                        left: cx - width / 2,
                        right: cx + width / 2,
                        top: cy - height / 2,
                        bottom: cy + height / 2
                    };
                }
                return {
                    kind: 'ellipse',
                    cx,
                    cy,
                    rx: width / 2,
                    ry: height / 2
                };
            };

            const ellipseRectOverlap = (ellipse, rect, forgiveness = 1) => {
                const closestX = clamp(ellipse.cx, rect.left, rect.right);
                const closestY = clamp(ellipse.cy, rect.top, rect.bottom);
                const dx = (ellipse.cx - closestX) /
                    Math.max(1, ellipse.rx * forgiveness);
                const dy = (ellipse.cy - closestY) /
                    Math.max(1, ellipse.ry * forgiveness);
                return dx * dx + dy * dy < 1;
            };

            const shapesOverlap = (a, b, forgiveness = 1) => {
                if (a.kind === 'rect' && b.kind === 'rect') return rectsOverlap(a, b);
                if (a.kind === 'ellipse' && b.kind === 'rect') {
                    return ellipseRectOverlap(a, b, forgiveness);
                }
                if (a.kind === 'rect' && b.kind === 'ellipse') {
                    return ellipseRectOverlap(b, a, forgiveness);
                }
                const dx = (a.cx - b.cx) /
                    Math.max(1, (a.rx + b.rx) * forgiveness);
                const dy = (a.cy - b.cy) /
                    Math.max(1, (a.ry + b.ry) * forgiveness);
                return dx * dx + dy * dy < 1;
            };

            // Muestrea la trayectoria real entre frames. La caja barrida anterior
            // rellenaba también las esquinas de movimientos diagonales y podía
            // registrar impactos donde el foco o el altavoz nunca habían estado.
            const sweptObjectCollision = (object) => {
                const objectTravelX = (object.x - object.previousX) * fieldW();
                const objectTravelY = (object.y - object.previousY) * fieldH();
                const playerTravelX =
                    (playerX - collisionPreviousPlayerX) * fieldW();
                const playerTravelY =
                    (playerY - collisionPreviousPlayerY) * fieldH();
                const relativeTravel = Math.hypot(
                    objectTravelX - playerTravelX,
                    objectTravelY - playerTravelY
                );
                const currentPlayer = playerShapeAt();
                const stepSize = Math.max(
                    8,
                    Math.min(currentPlayer.rx, currentPlayer.ry) * 0.45
                );
                const steps = clamp(Math.ceil(relativeTravel / stepSize), 1, 8);
                const forgiveness = object.type === 'score' ? 1.06 :
                    object.type === 'gust' ? 0.96 : 0.80;
                for (let step = 0; step <= steps; step++) {
                    const t = step / steps;
                    const objectX =
                        object.previousX + (object.x - object.previousX) * t;
                    const objectY =
                        object.previousY + (object.y - object.previousY) * t;
                    const sampledPlayerX = collisionPreviousPlayerX +
                        (playerX - collisionPreviousPlayerX) * t;
                    const sampledPlayerY = collisionPreviousPlayerY +
                        (playerY - collisionPreviousPlayerY) * t;
                    const sampledPlayer =
                        playerShapeAt(sampledPlayerY, sampledPlayerX);
                    const sampledObject =
                        objectShapeAt(object, objectX, objectY);
                    if (shapesOverlap(
                        sampledPlayer,
                        sampledObject,
                        forgiveness
                    )) {
                        return {
                            t,
                            player: sampledPlayer,
                            object: sampledObject
                        };
                    }
                }
                return null;
            };

            const updatePlayerPosition = (now) => {
                const dashing = now < dashUntil;
                const wantedX = dashing ? dashX : homeX;
                playerX += (wantedX - playerX) * 0.24;
                const verticalDelta = playerY - previousPlayerY;
                const bank = clamp(verticalDelta * 620, -13, 13);
                playerEl.style.left = (playerX * 100) + '%';
                playerEl.style.top = (playerY * 100) + '%';
                playerEl.style.setProperty('--fly-bank', bank.toFixed(2) + 'deg');
                playerEl.classList.toggle('is-dashing', dashing);
                playerDebugEl.style.left = (playerRect().left / fieldW() * 100) + '%';
                playerDebugEl.style.top = (playerRect().top / fieldH() * 100) + '%';
                playerDebugEl.style.width =
                    ((playerRect().right - playerRect().left) / fieldW() * 100) + '%';
                playerDebugEl.style.height =
                    ((playerRect().bottom - playerRect().top) / fieldH() * 100) + '%';
                previousPlayerY = playerY;
            };

            const updateHud = () => {
                const multiplier = Math.min(5, 1 + Math.floor(combo / 4));
                scoreEl.textContent = `${collected} / ${goal}`;
                comboEl.textContent = `x${multiplier}`;
                comboEl.parentElement.classList.toggle('is-hot', multiplier >= 3);
                energyEl.style.width = clamp(energy, 0, 100) + '%';
                energyWrap.classList.toggle('is-ready', energy >= (cfg.dashCost || 42));
                progressEl.style.width = clamp(collected / goal * 100, 0, 100) + '%';
                livesEl.innerHTML = Array.from({ length: maxHits }, (_, index) =>
                    `<span class="ss-heart${index < hits ? ' ss-lost' : ''}">❤</span>`
                ).join('');
            };

            const addParticleBurst = (x, y, color = '#4fd0ff', amount = 8) => {
                for (let index = 0; index < amount; index++) {
                    const particle = document.createElement('i');
                    particle.className = 'fly-particle';
                    particle.style.left = (x * 100) + '%';
                    particle.style.top = (y * 100) + '%';
                    particle.style.color = color;
                    particle.style.setProperty('--px', `${(Math.random() - 0.5) * 110}px`);
                    particle.style.setProperty('--py', `${(Math.random() - 0.5) * 90}px`);
                    stage.appendChild(particle);
                    setTimeout(() => particle.remove(), 620);
                }
            };

            const removeObject = (object) => {
                object.taken = true;
                if (object.warning) object.warning.remove();
                object.el.remove();
            };

            const shapeBounds = (shape) => shape.kind === 'rect' ? shape : ({
                left: shape.cx - shape.rx,
                right: shape.cx + shape.rx,
                top: shape.cy - shape.ry,
                bottom: shape.cy + shape.ry
            });

            const visibleShapeFraction = (shape) => {
                const bounds = shapeBounds(shape);
                const width = Math.max(1, bounds.right - bounds.left);
                const height = Math.max(1, bounds.bottom - bounds.top);
                const visibleWidth = Math.max(0,
                    Math.min(bounds.right, fieldW()) - Math.max(bounds.left, 0));
                const visibleHeight = Math.max(0,
                    Math.min(bounds.bottom, fieldH()) - Math.max(bounds.top, 0));
                return visibleWidth * visibleHeight / (width * height);
            };

            const showImpactDebug = (object, collision) => {
                if (!cfg.debugHitboxes) return;
                const rect = shapeBounds(
                    collision?.object || objectShapeAt(object, object.x, object.y)
                );
                const marker = document.createElement('div');
                marker.className = 'fly-impact-debug';
                marker.classList.toggle('is-ellipse', object.type !== 'cable');
                marker.textContent = object.type.toUpperCase();
                marker.style.left = (rect.left / fieldW() * 100) + '%';
                marker.style.top = (rect.top / fieldH() * 100) + '%';
                marker.style.width = ((rect.right - rect.left) / fieldW() * 100) + '%';
                marker.style.height = ((rect.bottom - rect.top) / fieldH() * 100) + '%';
                stage.appendChild(marker);
                setTimeout(() => marker.remove(), 8000);
            };

            const keepImpactObjectVisible = (object, collision) => {
                object.taken = true;
                if (object.warning) {
                    object.warning.remove();
                    object.warning = null;
                }
                const bounds = shapeBounds(
                    collision?.object || objectShapeAt(object, object.x, object.y)
                );
                object.el.style.left =
                    (((bounds.left + bounds.right) / 2) / fieldW() * 100) + '%';
                object.el.style.top =
                    (((bounds.top + bounds.bottom) / 2) / fieldH() * 100) + '%';
                object.el.classList.add('is-impacting');
                setTimeout(() => object.el.classList.add('is-impact-fading'), 160);
                setTimeout(() => object.el.remove(), 650);
            };

            const makeDebugBox = (object, label) => {
                if (!cfg.debugHitboxes) return;
                const debug = document.createElement('div');
                debug.className = 'fly-object-hitbox';
                debug.classList.toggle('is-ellipse', object.type !== 'cable');
                debug.innerHTML = `<span>${label}</span>`;
                const sx = object.hitScaleX != null ? object.hitScaleX : 0.58;
                const sy = object.hitScaleY != null ? object.hitScaleY : 0.58;
                debug.style.left = ((1 - sx) * 50) + '%';
                debug.style.top = ((1 - sy) * 50) + '%';
                debug.style.width = (sx * 100) + '%';
                debug.style.height = (sy * 100) + '%';
                object.el.appendChild(debug);
            };

            const makeObject = (spec) => {
                const el = document.createElement('div');
                el.className = `fly-object fly-${spec.type}`;
                if (spec.image) el.style.backgroundImage = asset(spec.image);
                el.style.width = (spec.width * 100) + '%';
                el.style.height = (spec.height * 100) + '%';
                stage.appendChild(el);
                const object = {
                    el,
                    type: spec.type,
                    x: spec.x,
                    y: spec.y,
                    previousX: spec.x,
                    previousY: spec.y,
                    vx: spec.vx || 1,
                    vy: spec.vy || 0,
                    baseY: spec.y,
                    age: 0,
                    taken: false,
                    passed: false,
                    enteredViewport: false,
                    hitScaleX: spec.hitScaleX,
                    hitScaleY: spec.hitScaleY,
                    warning: spec.warning || null,
                    push: spec.push || 0
                };
                el.style.left = (object.x * 100) + '%';
                el.style.top = (object.y * 100) + '%';
                makeDebugBox(object,
                    spec.type === 'score' ? 'PARTITURA' :
                    spec.type === 'gust' ? 'RÁFAGA' : 'PELIGRO');
                objects.push(object);
                return object;
            };

            const createCable = (side, progress) => {
                const min = cfg.hangMin != null ? cfg.hangMin : 0.25;
                const max = cfg.hangMax != null ? cfg.hangMax : 0.58;
                const requested = min + Math.random() * Math.max(0, max - min);
                const corridor = cfg.corridorMin != null ? cfg.corridorMin : 0.20;
                const length = Math.min(requested, 1 - corridor - 0.12);
                const el = document.createElement('div');
                el.className = `fly-object fly-cable fly-cable-${side}`;
                const cableAspect = 222 / 1477;
                const width = clamp(
                    length * fieldH() / fieldW() * cableAspect * 1.45,
                    0.032,
                    0.060
                );
                el.style.width = (width * 100) + '%';
                el.style.height = (length * 100) + '%';
                const cableSprite = document.createElement('img');
                cableSprite.className = 'fly-cable-sprite';
                cableSprite.alt = '';
                cableSprite.draggable = false;
                cableSprite.setAttribute('aria-hidden', 'true');
                el.appendChild(cableSprite);
                stage.appendChild(el);
                const y = side === 'top' ? length / 2 : 1 - length / 2;
                const object = {
                    el,
                    type: 'cable',
                    x: 1.08,
                    y,
                    previousX: 1.08,
                    previousY: y,
                    vx: 0.98 + progress * 0.08,
                    vy: 0,
                    baseY: y,
                    age: 0,
                    taken: false,
                    passed: false,
                    enteredViewport: false,
                    visualReady: false,
                    hitScaleX: 0.62,
                    hitScaleY: 0.92,
                    warning: null,
                    push: 0
                };
                el.style.left = '108%';
                el.style.top = (y * 100) + '%';
                makeDebugBox(object, 'CABLE');
                objects.push(object);
                cableSprite.onload = () => {
                    if (object.taken) return;
                    object.visualReady = true;
                    el.classList.add('is-visual-ready');
                };
                cableSprite.onerror = () => {
                    if (!object.taken) removeObject(object);
                };
                cableSprite.src = this.cacheBustAsset(SP + 'aire_cable_v3.webp');
                setTimeout(() => {
                    if (!object.taken && !object.visualReady) removeObject(object);
                }, 1600);
            };

            const createSpotlight = (progress) => {
                const targetY = 0.20 + Math.random() * 0.52;
                const warning = document.createElement('div');
                warning.className = 'fly-warning fly-warning-focus';
                warning.style.top = (targetY * 100) + '%';
                warning.textContent = 'FOCO';
                stage.appendChild(warning);
                makeObject({
                    type: 'spotlight',
                    image: SP + 'aire_foco_v2.webp',
                    width: 0.085,
                    height: 0.20,
                    x: 1.10,
                    y: -0.08,
                    vx: 0.88 + progress * 0.12,
                    vy: (cfg.fallerVy != null ? cfg.fallerVy : 0.28) + 0.08 + progress * 0.10,
                    hitScaleX: 0.52,
                    hitScaleY: 0.64,
                    warning
                });
            };

            const createSpeaker = (progress) => {
                const y = 0.18 + Math.random() * 0.64;
                const warning = document.createElement('div');
                warning.className = 'fly-warning fly-warning-speaker';
                warning.style.top = (y * 100) + '%';
                warning.textContent = 'PULSO';
                stage.appendChild(warning);
                const speaker = makeObject({
                    type: 'speaker',
                    image: SP + 'aire_altavoz_v2.webp',
                    width: 0.125,
                    height: 0.19,
                    x: 1.12,
                    y,
                    vx: 1.08 + progress * 0.14,
                    hitScaleX: 0.63,
                    hitScaleY: 0.64,
                    warning
                });
                const ring = document.createElement('i');
                ring.className = 'fly-sonic-ring';
                speaker.el.appendChild(ring);
            };

            const createGust = () => {
                const y = 0.24 + Math.random() * 0.52;
                const push = y < 0.50 ? 0.18 : -0.18;
                const gust = makeObject({
                    type: 'gust',
                    width: 0.16,
                    height: 0.28,
                    x: 1.12,
                    y,
                    vx: 0.76,
                    hitScaleX: 0.78,
                    hitScaleY: 0.82,
                    push
                });
                gust.el.dataset.direction = push > 0 ? 'down' : 'up';
                gust.el.innerHTML += '<i></i><i></i><i></i>';
            };

            const createPhrase = (progress) => {
                const min = Math.max(1, cfg.phraseMin || 1);
                const max = Math.max(min, cfg.phraseMax || 2);
                const remaining = goal - collected;
                const count = Math.min(remaining,
                    min + Math.floor(Math.random() * (max - min + 1)));
                const center = 0.20 + Math.random() * 0.60;
                const arc = Math.random() < 0.5 ? -1 : 1;
                for (let index = 0; index < count; index++) {
                    const offset = count === 1 ? 0 :
                        (index - (count - 1) / 2) * 0.12 * arc;
                    makeObject({
                        type: 'score',
                        image: SP + 'partitura_v2.webp',
                        width: 0.082,
                        height: 0.125,
                        x: 1.08 + index * 0.12,
                        y: clamp(center + offset, yMin + 0.03, yMax - 0.03),
                        vx: 0.94 + progress * 0.08,
                        hitScaleX: 0.76,
                        hitScaleY: 0.72
                    });
                }
                hazardsSincePhrase = 0;
            };

            const spawnPattern = () => {
                const progress = clamp(collected / goal, 0, 1);
                spawnNumber++;
                const collectEvery = Math.max(1, cfg.collectEvery || 3);
                const needsPhrase = hazardsSincePhrase >= collectEvery ||
                    Math.random() < (cfg.collectChance != null ? cfg.collectChance : 0.34);
                if (needsPhrase) {
                    createPhrase(progress);
                    return;
                }

                hazardsSincePhrase++;
                // Se rebaja el peso del lado recién usado para que los cables
                // alternen con naturalidad sin convertirlo en un patrón fijo.
                const hang = Math.max(0, cfg.hangChance || 0) *
                    (lastCableSide === 'top' ? 0.55 : 1.15);
                const rise = Math.max(0, cfg.riserChance || 0) *
                    (lastCableSide === 'bottom' ? 0.55 : 1.15);
                const focus = Math.max(0, cfg.fallerChance || 0);
                const speaker = Math.max(0, cfg.speakerChance || 0);
                const gust = Math.max(0, cfg.gustChance || 0);
                const total = Math.max(0.001, hang + rise + focus + speaker + gust);
                const roll = Math.random() * total;
                if (roll < hang) {
                    lastCableSide = 'top';
                    createCable('top', progress);
                } else if (roll < hang + rise) {
                    lastCableSide = 'bottom';
                    createCable('bottom', progress);
                } else if (roll < hang + rise + focus) {
                    createSpotlight(progress);
                } else if (roll < hang + rise + focus + speaker) {
                    createSpeaker(progress);
                } else {
                    createGust();
                }

                // En la recta final se intercalan frases más a menudo, pero el
                // peligro nunca se duplica en el mismo instante.
                if (progress > 0.72 && spawnNumber % 3 === 0) {
                    hazardsSincePhrase = Math.max(hazardsSincePhrase, collectEvery);
                }
            };

            const collectScore = (object) => {
                collected++;
                combo++;
                maxCombo = Math.max(maxCombo, combo);
                const multiplier = Math.min(5, 1 + Math.floor(combo / 4));
                flightScore += 100 * multiplier;
                energy = Math.min(100, energy + 13);
                addParticleBurst(object.x, object.y, '#ffd166', 10);
                removeObject(object);
                beep(880 + multiplier * 70, 0.08, { type: 'triangle', volume: 0.065 });
                beep(1320 + multiplier * 90, 0.08,
                    { type: 'triangle', volume: 0.045, delay: 0.045 });
                showCallout(multiplier >= 3 ? `¡CADENA x${multiplier}!` : 'PARTITURA', 'good');
                updateHud();
                if (collected >= goal) finish(true);
            };

            const destroyWithDash = (object) => {
                flightScore += object.type === 'speaker' ? 220 : 120;
                energy = Math.min(100, energy + 5);
                addParticleBurst(object.x, object.y,
                    object.type === 'speaker' ? '#ff4fa3' : '#4fd0ff', 12);
                showCallout(object.type === 'speaker' ? '¡CONTRAPULSO!' : '¡ATRAVESADO!', 'dash');
                beep(220, 0.11, { type: 'square', volume: 0.055 });
                beep(740, 0.10, { type: 'sawtooth', volume: 0.045, delay: 0.03 });
                removeObject(object);
            };

            const hitPlayer = (object, collision) => {
                hits++;
                combo = 0;
                energy = Math.max(0, energy - 24);
                invulnerableUntil = performance.now() + (cfg.hitGraceMs || 900);
                blinkUntil = invulnerableUntil;
                playerEl.classList.remove('is-hurt');
                void playerEl.offsetWidth;
                playerEl.classList.add('is-hurt');
                stage.classList.remove('is-hit');
                void stage.offsetWidth;
                stage.classList.add('is-hit');
                showImpactDebug(object, collision);
                addParticleBurst(playerX + 0.05, playerY, '#ff466b', 12);
                const debugNames = {
                    cable: 'CABLE',
                    spotlight: 'FOCO',
                    speaker: 'ALTAVOZ'
                };
                showCallout(
                    `¡IMPACTO: ${debugNames[object.type] || object.type.toUpperCase()}!`,
                    'bad',
                    1100,
                    3
                );
                beep(145, 0.19, { type: 'sawtooth', volume: 0.085 });
                keepImpactObjectVisible(object, collision);
                updateHud();
                if (hits >= maxHits) finish(false);
            };

            const nearMiss = (object) => {
                if (object.passed || object.type === 'score' || object.type === 'gust') return;
                const rect = objectRect(object);
                const player = playerRect();
                const verticalGap = Math.max(0,
                    Math.max(rect.top - player.bottom, player.top - rect.bottom));
                if (verticalGap <= fieldH() * 0.055) {
                    object.passed = true;
                    nearMisses++;
                    combo++;
                    maxCombo = Math.max(maxCombo, combo);
                    flightScore += 80;
                    energy = Math.min(100, energy + 9);
                    showCallout('¡CASI! +IMPULSO', 'near');
                    beep(620, 0.06, { type: 'triangle', volume: 0.035 });
                    updateHud();
                }
            };

            const tryDash = () => {
                const now = performance.now();
                const cost = cfg.dashCost || 42;
                if (!started || paused || now < dashCooldownUntil || now < dashUntil) return;
                if (energy < cost) {
                    showCallout('SIN ENERGÍA', 'bad', 480);
                    energyWrap.classList.remove('is-denied');
                    void energyWrap.offsetWidth;
                    energyWrap.classList.add('is-denied');
                    return;
                }
                energy -= cost;
                dashUntil = now + (cfg.dashDuration || 0.46) * 1000;
                dashCooldownUntil = dashUntil + 180;
                invulnerableUntil = Math.max(invulnerableUntil, dashUntil);
                dashFrameIndex = 0;
                frameClock = 0;
                playerEl.style.backgroundImage =
                    playerFrameAsset(DASH_FRAMES[0]);
                playerEl.classList.remove('dash-pop');
                void playerEl.offsetWidth;
                playerEl.classList.add('dash-pop');
                addParticleBurst(playerX + 0.02, playerY, '#4fd0ff', 10);
                showCallout('¡IMPULSO!', 'dash', 420);
                beep(360, 0.12, { type: 'sawtooth', volume: 0.055 });
                beep(760, 0.10, { type: 'triangle', volume: 0.045, delay: 0.04 });
                updateHud();
            };

            const setPaused = (value) => {
                paused = !!value;
                pausePanel.hidden = !paused;
                pauseBtn.textContent = paused ? '▶' : 'Ⅱ';
                pauseBtn.setAttribute('aria-label', paused ? 'Continuar' : 'Pausar');
                if (!paused) last = performance.now();
            };

            const onPointerMove = (event) => {
                if (paused) return;
                const rect = stage.getBoundingClientRect();
                if (!rect.height) return;
                targetY = clamp((event.clientY - rect.top) / rect.height, yMin, yMax);
            };
            const onPointerDown = (event) => {
                if (event.target.closest('.ss-pause-btn, .ss-resume-btn')) return;
                event.preventDefault();
                onPointerMove(event);
                tryDash();
            };
            const keys = {};
            const onKey = (event) => {
                const key = (event.key || '').toLowerCase();
                if ((key === 'p' || key === 'escape') &&
                    event.type === 'keydown' && !event.repeat) {
                    event.preventDefault();
                    setPaused(!paused);
                    return;
                }
                if (key === ' ' && event.type === 'keydown' && !event.repeat) {
                    event.preventDefault();
                    tryDash();
                    return;
                }
                if (['arrowup', 'w', 'arrowdown', 's'].includes(key)) {
                    event.preventDefault();
                    keys[key] = event.type === 'keydown';
                }
            };
            const swallow = (event) => {
                if (!event.target.closest('.ss-pause-btn, .ss-resume-btn')) {
                    event.stopPropagation();
                }
            };

            window.addEventListener('pointermove', onPointerMove);
            stage.addEventListener('pointerdown', onPointerDown);
            document.addEventListener('keydown', onKey);
            document.addEventListener('keyup', onKey);
            overlay.addEventListener('click', swallow, true);
            pauseBtn.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                setPaused(!paused);
            });
            resumeBtn.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                setPaused(false);
            });

            const cleanup = () => {
                window.removeEventListener('pointermove', onPointerMove);
                stage.removeEventListener('pointerdown', onPointerDown);
                document.removeEventListener('keydown', onKey);
                document.removeEventListener('keyup', onKey);
                overlay.removeEventListener('click', swallow, true);
                if (raf) cancelAnimationFrame(raf);
                if (resultTimer) clearTimeout(resultTimer);
            };

            const finish = (won) => {
                if (!running) return;
                running = false;
                cleanup();
                const rank = won
                    ? (hits === 0 && maxCombo >= 8 ? 'S' :
                        hits <= 1 ? 'A' : hits < maxHits - 1 ? 'B' : 'C')
                    : '—';
                this.lastMinigameResult = {
                    hits,
                    maxHits,
                    collected,
                    goal,
                    comboMax: maxCombo,
                    nearMisses,
                    score: flightScore,
                    rank
                };
                const result = document.createElement('div');
                result.className = 'minigame-result fly-result';
                result.innerHTML = won
                    ? `<span>¡PARTITURAS COMPLETAS!</span><strong>RANGO ${rank}</strong>` +
                      `<small>${flightScore.toLocaleString('es-ES')} pts · cadena ${maxCombo}</small>`
                    : `<span>¡EDU HA CAÍDO!</span><strong>INTÉNTALO DE NUEVO</strong>`;
                overlay.appendChild(result);
                resultTimer = setTimeout(() => {
                    overlay.remove();
                    resolve(won);
                }, won ? 1700 : 1050);
            };

            const updateCountdown = (dt) => {
                countdownTime += dt;
                const steps = ['3', '2', '1', '¡VUELA!'];
                const index = Math.min(steps.length - 1, Math.floor(countdownTime / 0.48));
                if (index !== countdownIndex) {
                    countdownIndex = index;
                    countdownEl.textContent = steps[index];
                    countdownEl.classList.remove('ss-count-pop');
                    void countdownEl.offsetWidth;
                    countdownEl.classList.add('ss-count-pop');
                    beep(index === steps.length - 1 ? 980 : 520, 0.08,
                        { type: 'square', volume: 0.04 });
                }
                if (countdownTime >= steps.length * 0.48) {
                    started = true;
                    countdownEl.classList.remove('active');
                    countdownEl.textContent = '';
                    last = performance.now();
                }
            };

            const tick = () => {
                if (!running) return;
                const now = performance.now();
                const dt = Math.min(0.05, (now - last) / 1000);
                last = now;
                if (paused) return;

                collisionPreviousPlayerX = playerX;
                collisionPreviousPlayerY = playerY;
                if (!started) {
                    updateCountdown(dt);
                    updatePlayerPosition(now);
                    return;
                }

                if (keys.arrowup || keys.w) targetY -= dt * 0.95;
                if (keys.arrowdown || keys.s) targetY += dt * 0.95;
                targetY = clamp(targetY, yMin, yMax);
                playerY += (targetY - playerY) * Math.min(1, dt * 10.5);
                updatePlayerPosition(now);

                const dashing = now < dashUntil;
                if (wasDashing && !dashing) {
                    frameIndex = (frameIndex + 1) % FLIGHT_FRAMES.length;
                    playerEl.style.backgroundImage =
                        playerFrameAsset(FLIGHT_FRAMES[frameIndex]);
                    frameClock = 0;
                }
                wasDashing = dashing;

                frameClock += dt;
                const frameDuration = dashing ? 0.07 : 0.08;
                if (frameClock >= frameDuration) {
                    frameClock = 0;
                    if (dashing) {
                        dashFrameIndex =
                            (dashFrameIndex + 1) % DASH_FRAMES.length;
                        playerEl.style.backgroundImage =
                            playerFrameAsset(DASH_FRAMES[dashFrameIndex]);
                    } else {
                        frameIndex = (frameIndex + 1) % FLIGHT_FRAMES.length;
                        playerEl.style.backgroundImage =
                            playerFrameAsset(FLIGHT_FRAMES[frameIndex]);
                    }
                }

                energy = Math.min(100, energy + (cfg.energyRegen || 10) * dt);
                const progress = clamp(collected / goal, 0, 1);
                const ramp = 1 + progress * (cfg.difficultyRamp || 0.24);
                const velocity = (0.30 + baseSpeed * 0.035) * ramp;
                const spawnDelay = Math.max(330,
                    (cfg.spawnMs || 680) * (1 - progress * 0.20));

                spawnClock += dt * 1000;
                if (spawnClock >= spawnDelay) {
                    spawnClock -= spawnDelay;
                    spawnPattern();
                }

                if (progress >= 0.72 && !finaleAnnounced) {
                    finaleAnnounced = true;
                    stage.classList.add('is-finale');
                    showCallout('¡ÚLTIMO COMPÁS!', 'dash', 1100);
                    beep(740, 0.12, { type: 'square', volume: 0.045 });
                    beep(1040, 0.14, { type: 'triangle', volume: 0.045, delay: 0.08 });
                }

                for (const object of objects) {
                    if (object.taken) continue;
                    object.previousX = object.x;
                    object.previousY = object.y;
                    object.age += dt;
                    object.x -= velocity * object.vx * dt;
                    if (object.type === 'spotlight') {
                        object.y += object.vy * dt;
                    } else if (object.type === 'speaker') {
                        object.y = object.baseY + Math.sin(object.age * 5.4) * 0.026;
                    }
                    object.el.style.left = (object.x * 100) + '%';
                    object.el.style.top = (object.y * 100) + '%';
                    if (object.warning && object.x <= 0.99) {
                        object.warning.remove();
                        object.warning = null;
                    }

                    const visibleFraction = visibleShapeFraction(
                        objectShapeAt(object, object.x, object.y)
                    );
                    if (object.visualReady !== false &&
                        visibleFraction >= 0.18) object.enteredViewport = true;
                    const collision = object.visualReady !== false &&
                        object.enteredViewport &&
                        visibleFraction >= 0.10
                        ? sweptObjectCollision(object)
                        : null;
                    const collided = !!collision;
                    if (object.type === 'score' && collided) {
                        collectScore(object);
                        if (!running) return;
                        continue;
                    }
                    if (object.type === 'gust' && collided && !object.passed) {
                        object.passed = true;
                        targetY = clamp(targetY + object.push, yMin, yMax);
                        showCallout(object.push > 0 ? 'RÁFAGA ↓' : 'RÁFAGA ↑', 'near');
                        beep(300, 0.10, { type: 'sine', volume: 0.03 });
                        continue;
                    }
                    if (object.type !== 'score' && object.type !== 'gust' && collided) {
                        if (dashing) {
                            destroyWithDash(object);
                        } else if (now >= invulnerableUntil) {
                            hitPlayer(object, collision);
                            if (!running) return;
                        }
                        continue;
                    }

                    if (!object.passed && object.x < playerX - 0.02) nearMiss(object);
                    if (object.y > 1.22 || object.x < -0.22) removeObject(object);
                }

                objects = objects.filter(object => !object.taken);
                playerEl.style.opacity =
                    (now < blinkUntil && Math.floor(now / 105) % 2 === 0) ? '0.30' : '1';
                if (calloutUntil && now >= calloutUntil) {
                    calloutEl.classList.remove('is-visible');
                    calloutUntil = 0;
                    calloutPriority = 0;
                }
                updateHud();
            };

            const loop = () => {
                if (!running) return;
                tick();
                if (running) raf = requestAnimationFrame(loop);
            };

            updateHud();
            updatePlayerPosition(performance.now());
            raf = requestAnimationFrame(loop);
        });
    }

    // Motor común de los side-scrollers. Devuelve Promise<boolean> (ganado).
    async runSideScroller(cfg) {
        this.isWaitingForInput = false;
        const SP = 'assets/images/minigames/chapter3/sprites/';
        const CAP = 'assets/images/minigames/chapter3/';
        const url = (n, base = SP) => `url('${this.cacheBustAsset(base + n + '.webp')}')`;
        const spriteNames = (entry) => {
            if (typeof entry === 'string') return [entry];
            if (entry && entry.frames && entry.frames.length) return entry.frames;
            return entry && entry.name ? [entry.name] : [];
        };
        const spriteName = (entry) => spriteNames(entry)[0];
        const isFly = cfg.mode === 'fly';

        // Precargar TODO lo que el minijuego puede llegar a pintar. Sin esto, el
        // primer uso de cada sprite (y el primer cambio de fotograma) llega antes
        // que la imagen y se ve un hueco en blanco. Los cables y focos antiguos
        // pertenecen solo al modo fly: chase no debe descargar esos PNG de 2 MB.
        await this.preloadImages([
            ...(cfg.playerFrames || []).map(n => SP + n + '.webp'),
            ...(cfg.obstacles || []).flatMap(spriteNames).map(n => SP + n + '.webp'),
            ...(cfg.enemies || []).flat().map(n => SP + n + '.webp'),
            ...(cfg.collectible || []).map(n => SP + n + '.webp'),
            ...(isFly ? (cfg.fallerFrames || ['aire_foco', 'aire_foco_on']) : [])
                .map(n => SP + n + '.webp'),
            ...(isFly ? ['aire_cable_cap', 'aire_cable_body', 'aire_cable_tip'] : [])
                .map(n => SP + n + '.webp'),
            ...[cfg.bgFar, cfg.bgNear, cfg.backdrop, cfg.moon]
                .filter(Boolean).map(n => CAP + n + '.webp')
        ]);
        const speed = cfg.speed || 6;
        const maxHits = cfg.maxHits || 3;
        const goal = cfg.goal || 60;

        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'minigame-overlay sidescroller-minigame ' + (isFly ? 'ss-fly' : 'ss-chase');
            overlay.innerHTML = `
                <div class="minigame-hud neon-font">
                    <span class="mg-score"></span>
                    <span class="ss-lives"></span>
                    <span class="mg-status"></span>
                    <button class="ss-pause-btn" type="button" aria-label="Pausar">Ⅱ</button>
                </div>
                <div class="ss-stage" id="ss-stage">
                    ${cfg.bgFar ? '<div class="ss-bg ss-bg-far"></div>' : ''}
                    ${cfg.moon ? '<div class="ss-moon" aria-hidden="true"></div>' : ''}
                    ${cfg.bgNear ? '<div class="ss-bg ss-bg-near"></div>' : ''}
                    <div class="ss-player" id="ss-player"></div>
                    <div class="ss-progress-wrap"><div class="ss-progress-fill" id="ss-progress"></div></div>
                    <div class="ss-countdown" aria-live="polite"></div>
                    <div class="ss-pause-panel" hidden>
                        <strong>PAUSA</strong>
                        <span>${isFly ? 'Mueve a Edu con el ratón o ↑/↓.' : 'Conduce con el ratón o WASD/FLECHAS.'}</span>
                        <button class="ss-resume-btn" type="button">CONTINUAR</button>
                    </div>
                </div>
                <div class="minigame-instructions">${cfg.title} <small>P / ESC: pausa</small></div>
            `;
            document.getElementById('game-container').appendChild(overlay);
            const swallow = (e) => {
                if (e.target.closest('.ss-pause-btn, .ss-resume-btn')) return;
                e.stopPropagation();
            };
            overlay.addEventListener('click', swallow, true);

            const stage = overlay.querySelector('#ss-stage');
            const playerEl = overlay.querySelector('#ss-player');
            const scoreEl = overlay.querySelector('.mg-score');
            const livesEl = overlay.querySelector('.ss-lives');
            const statusEl = overlay.querySelector('.mg-status');
            const progressEl = overlay.querySelector('#ss-progress');
            const bgFarEl = overlay.querySelector('.ss-bg-far');
            const bgNearEl = overlay.querySelector('.ss-bg-near');
            const moonEl = overlay.querySelector('.ss-moon');
            const pauseBtn = overlay.querySelector('.ss-pause-btn');
            const pausePanel = overlay.querySelector('.ss-pause-panel');
            const resumeBtn = overlay.querySelector('.ss-resume-btn');
            const countdownEl = overlay.querySelector('.ss-countdown');
            if (bgFarEl && cfg.bgFar) bgFarEl.style.backgroundImage = url(cfg.bgFar, CAP);
            if (bgNearEl && cfg.bgNear) bgNearEl.style.backgroundImage = url(cfg.bgNear, CAP);
            if (moonEl && cfg.moon) {
                moonEl.style.backgroundImage = url(cfg.moon, CAP);
                moonEl.style.left = ((cfg.moonStartX != null ? cfg.moonStartX : 0.82) * 100) + '%';
                moonEl.style.top = ((cfg.moonStartY != null ? cfg.moonStartY : 0.22) * 100) + '%';
            }
            // Telón estático opcional (no hace scroll): ambienta sin costuras de loop
            if (cfg.backdrop) {
                stage.style.backgroundImage = url(cfg.backdrop, CAP);
                stage.style.backgroundSize = 'cover';
                stage.style.backgroundPosition = 'center';
            }

            const fieldW = () => stage.clientWidth || 1;
            const fieldH = () => stage.clientHeight || 1;

            // Banda de juego (0..1). Chase usa toda la calzada en dos dimensiones;
            // vuelo conserva el desplazamiento vertical con X fija.
            const xMin = cfg.xMin != null ? cfg.xMin : 0.03;
            const xMax = cfg.xMax != null ? cfg.xMax : 0.80;
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
            let playerX = isFly ? 0.12 : Math.max(xMin, Math.min(xMax, 0.12));
            let targetX = playerX;
            let playerY = (yMin + yMax) / 2, targetY = playerY;
            const playerFootprint = !isFly ? cfg.playerFootprint : null;
            const playerHitboxes = cfg.playerHitboxes || [
                { x: 0.25, y: 0.25, w: 0.50, h: 0.50 }
            ];
            const createDebugBoxes = (count, type, label, footprint = false) => {
                if (!cfg.debugHitboxes) return [];
                return Array.from({ length: count }, (_, index) => {
                    const box = document.createElement('div');
                    box.className = `ss-debug-hitbox ss-debug-${type}` +
                        (footprint ? ' ss-debug-footprint' : '');
                    box.innerHTML = `<span>${label}${count > 1 ? ` ${index + 1}` : ''}</span>`;
                    stage.appendChild(box);
                    return box;
                });
            };
            const playerDebugBoxes = createDebugBoxes(
                playerFootprint ? 1 : playerHitboxes.length,
                'player-hitbox', playerFootprint ? 'HUELLA COCHE' : 'EDU',
                !!playerFootprint);
            const paintDebugRect = (el, left, top, right, bottom) => {
                if (!el) return;
                el.style.left = left + 'px';
                el.style.top = top + 'px';
                el.style.width = Math.max(0, right - left) + 'px';
                el.style.height = Math.max(0, bottom - top) + 'px';
            };
            const rectsFromDefs = (defs, left, top, width, height) =>
                defs.map(def => ({
                    left: left + def.x * width,
                    top: top + def.y * height,
                    right: left + (def.x + def.w) * width,
                    bottom: top + (def.y + def.h) * height
                }));
            const footprintFromDef = (def, left, top, width, height) => ({
                cx: left + def.x * width,
                cy: top + def.y * height,
                rx: def.rx * width,
                ry: def.ry * height
            });
            const paintDebugFootprint = (el, footprint) => {
                if (!el || !footprint) return;
                paintDebugRect(el,
                    footprint.cx - footprint.rx, footprint.cy - footprint.ry,
                    footprint.cx + footprint.rx, footprint.cy + footprint.ry);
            };
            const paintDebugRects = (elements, rects) => {
                elements.forEach((el, index) => {
                    const rect = rects[index];
                    if (rect) paintDebugRect(el, rect.left, rect.top, rect.right, rect.bottom);
                });
            };
            const removeDebugBoxes = (elements) => {
                (elements || []).forEach(el => el.remove());
            };
            const rectsOverlap = (a, b) =>
                a.left < b.right && a.right > b.left &&
                a.top < b.bottom && a.bottom > b.top;
            const anyRectsOverlap = (first, second) =>
                first.some(a => second.some(b => rectsOverlap(a, b)));
            // Distancia mínima entre las trayectorias relativas de dos elipses.
            // Además de trabajar en el plano del asfalto, el barrido evita que
            // un objeto rápido atraviese el coche entre dos fotogramas.
            const sweptFootprintsOverlap = (aPrev, aNow, bPrev, bNow) => {
                const sumRx = Math.max(1, aNow.rx + bNow.rx);
                const sumRy = Math.max(1, aNow.ry + bNow.ry);
                const startX = (aPrev.cx - bPrev.cx) / sumRx;
                const startY = (aPrev.cy - bPrev.cy) / sumRy;
                const endX = (aNow.cx - bNow.cx) / sumRx;
                const endY = (aNow.cy - bNow.cy) / sumRy;
                const dx = endX - startX, dy = endY - startY;
                const lengthSq = dx * dx + dy * dy;
                const t = lengthSq > 0
                    ? Math.max(0, Math.min(1, -(startX * dx + startY * dy) / lengthSq))
                    : 0;
                const nearestX = startX + dx * t;
                const nearestY = startY + dy * t;
                return nearestX * nearestX + nearestY * nearestY <= 1;
            };
            const getPlayerRects = () => {
                const fw = fieldW(), fh = fieldH();
                const pw = playerEl.offsetWidth, ph = playerEl.offsetHeight;
                return rectsFromDefs(playerHitboxes,
                    playerX * fw, playerY * fh - ph / 2, pw, ph);
            };
            const getPlayerFootprint = () => {
                if (!playerFootprint) return null;
                const fw = fieldW(), fh = fieldH();
                const pw = playerEl.offsetWidth, ph = playerEl.offsetHeight;
                return footprintFromDef(playerFootprint,
                    playerX * fw, playerY * fh - ph / 2, pw, ph);
            };
            const updatePlayerDebug = () => {
                if (!playerDebugBoxes.length) return;
                if (playerFootprint) {
                    paintDebugFootprint(playerDebugBoxes[0], getPlayerFootprint());
                } else {
                    paintDebugRects(playerDebugBoxes, getPlayerRects());
                }
            };
            // z-index por profundidad: quien va más abajo (mayor Y) se dibuja delante.
            // Así, si un objeto pasa por debajo del centro del coche va por encima, y
            // si pasa por encima, el coche queda delante (efecto pseudo-3D).
            const zByY = (y) => Math.round(y * 100) + 10;
            const setPlayerPosition = () => {
                playerEl.style.left = (playerX * 100) + '%';
                playerEl.style.top = (playerY * 100) + '%';
                const footprint = getPlayerFootprint();
                playerEl.style.zIndex = zByY(footprint ? footprint.cy / fieldH() : playerY);
                updatePlayerDebug();
            };
            setPlayerPosition();

            let frameIdx = 0, frameT = 0;
            const animatePlayer = (dt) => {
                frameT += dt;
                if (frameT >= (isFly ? 0.11 : 0.085)) {
                    frameT = 0;
                    frameIdx = (frameIdx + 1) % cfg.playerFrames.length;
                    playerEl.style.backgroundImage = url(cfg.playerFrames[frameIdx]);
                }
            };

            // El ratón se sigue en TODA la ventana, no solo dentro del escenario.
            // Antes el escuchador colgaba de `stage`: en cuanto sacabas el cursor
            // por arriba o por abajo dejaban de llegar eventos y el coche se
            // quedaba clavado a media maniobra. Ahora, si te sales, el objetivo
            // simplemente se queda pegado al tope de ese lado y el coche sigue
            // respondiendo en cuanto vuelves a mover.
            let paused = false;
            let last = performance.now();
            const setPaused = (value) => {
                paused = !!value;
                pausePanel.hidden = !paused;
                pauseBtn.textContent = paused ? '▶' : 'Ⅱ';
                pauseBtn.setAttribute('aria-label', paused ? 'Continuar' : 'Pausar');
                if (!paused) last = performance.now();
            };
            pauseBtn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation(); setPaused(!paused);
            });
            resumeBtn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation(); setPaused(false);
            });

            const onMove = (e) => {
                if (paused) return;
                const r = stage.getBoundingClientRect();
                if (!r.height) return;
                targetY = Math.max(yMin, Math.min(yMax, (e.clientY - r.top) / r.height));
                if (!isFly && r.width) {
                    const wantedLeft = (e.clientX - r.left - playerEl.offsetWidth / 2) / r.width;
                    targetX = Math.max(xMin, Math.min(xMax, wantedLeft));
                }
            };
            window.addEventListener('pointermove', onMove);
            stage.addEventListener('pointerdown', onMove);
            const keys = {};
            // Igual que en el minijuego de ritmo: si nos sacan desde los botones
            // de arriba no hay cierre normal, y este oyente se quedaría tragando
            // las flechas con preventDefault. Se da de baja solo.
            const onKey = (e) => {
                if (!overlay.isConnected) {
                    document.removeEventListener('keydown', onKey);
                    document.removeEventListener('keyup', onKey);
                    window.removeEventListener('pointermove', onMove);
                    return;
                }
                const k = (e.key || '').toLowerCase();
                if (['p', 'escape'].includes(k) && e.type === 'keydown' && !e.repeat) {
                    e.preventDefault();
                    setPaused(!paused);
                    return;
                }
                if (['arrowup', 'w', 'arrowdown', 's', 'arrowleft', 'a', 'arrowright', 'd'].includes(k)) {
                    e.preventDefault();
                    keys[k] = (e.type === 'keydown');
                }
            };
            document.addEventListener('keydown', onKey);
            document.addEventListener('keyup', onKey);

            let objs = [];
            let ultimoCable = null;   // para no cerrar el pasillo con dos cables
            let ultimoModo = null;    // para no encadenar partituras seguidas
            let ultimoRoadY = null;   // evita zigzags extremos imposibles de leer
            let ultimoEnemigoMs = -Infinity;
            let nextEnemySide = Math.random() < 0.5 ? 'rear' : 'front';
            const spawnObj = () => {
                if (!running) return;
                const el = document.createElement('div');
                el.className = 'ss-obj';
                let name, kind, hFrac, wRatio, hitX = null, hitY = null, hitboxes = null;
                let footprint = null, footprints = null, frameDuration = null;
                let y = yMin + Math.random() * (yMax - yMin);
                let vy = 0, isHang = false, largoCable = 0;
                let spawnX = 1.08, direction = -1, phase = null, warning = null;
                let enemySide = null;
                const roll = Math.random();

                // Peligros especiales del modo VUELO (jul 2026):
                //  - "hang": cable que cuelga del TECHO estirándose hasta una altura
                //    aleatoria (deja hueco por debajo para esquivar).
                //  - "faller": foco que CAE desde arriba mientras avanza (movimiento real).
                const hangC = isFly ? (cfg.hangChance || 0) : 0;
                const riseC = isFly ? (cfg.riserChance || 0) : 0;
                const fallC = isFly ? (cfg.fallerChance || 0) : 0;
                const collC = cfg.collectible ? (cfg.collectChance != null ? cfg.collectChance : 0.55) : 0;
                const enemyC = (cfg.enemies && cfg.enemies.length) ? 0.20 : 0;
                // Ruleta en orden: colgante / cayente / partitura / enemigo / estático.
                // Sin estáticos configurados (modo vuelo), el resto se reparte entre
                // colgantes y cayentes: nada flota porque sí.
                let mode;
                if (isFly && roll < hangC) mode = 'hang';
                else if (isFly && roll < hangC + riseC) mode = 'riser';
                else if (isFly && roll < hangC + riseC + fallC) mode = 'faller';
                else if (cfg.collectible && roll < hangC + riseC + fallC + collC) mode = 'collect';
                else if (enemyC && roll < hangC + riseC + fallC + collC + enemyC) mode = 'enemy';
                else if (cfg.obstacles && cfg.obstacles.length) mode = 'static';
                else mode = ['hang', 'riser', 'faller'][Math.floor(Math.random() * 3)];

                // Las motos activas son más peligrosas que los obstáculos normales.
                // Se espacian para que nunca formen una pinza aleatoria entre ambos
                // sentidos de circulación.
                if (!isFly && mode === 'enemy' &&
                    (ultimoModo === 'enemy' || performance.now() - ultimoEnemigoMs < 1350)) {
                    mode = cfg.obstacles && cfg.obstacles.length ? 'static' : 'enemy';
                }

                // Nunca dos partituras seguidas: aunque el porcentaje esté bien,
                // el azar las encadenaba de tres en tres y el tramo se quedaba sin
                // peligros. Si toca repetir, ese turno pasa a ser un obstáculo.
                if (mode === 'collect' && ultimoModo === 'collect') {
                    mode = isFly ? ['hang', 'riser', 'faller'][Math.floor(Math.random() * 3)]
                                 : (cfg.obstacles && cfg.obstacles.length ? 'static' : 'enemy');
                }
                ultimoModo = mode;
                if (mode === 'hang' || mode === 'riser') {
                    kind = 'obstacle'; isHang = true;
                    const hMin = cfg.hangMin != null ? cfg.hangMin : 0.25;
                    const hMax = cfg.hangMax != null ? cfg.hangMax : 0.60;
                    let largo = hMin + Math.random() * (hMax - hMin);

                    // Un cable del techo y otro del suelo que coincidan pueden
                    // cerrar el pasillo entero y matarte sin escapatoria. Se mira
                    // TODO lo que sigue cerca de la zona de aparición (no solo el
                    // último: con esta densidad hay tres cables en la misma franja)
                    // y se recorta el nuevo para dejar siempre hueco por el que
                    // pasar. La caja de colisión de Edu mide 0,095 de la altura,
                    // así que por debajo de ~0,12 sería imposible.
                    const CORREDOR = cfg.corridorMin != null ? cfg.corridorMin : 0.18;
                    // Radio de vigilancia. A 0.30 recortaba cables que ni siquiera
                    // llegaban a solaparse (el ancho de un cable es ~0.09 y entre
                    // aparición y aparición hay 0.14): la mediana se quedaba en 0.44
                    // y solo el 21% pasaba de 0.60. A 0.20 sube al 29% sin que dos
                    // cables opuestos lleguen nunca a cerrar el paso.
                    const CERCA = 0.20;
                    let ocupadoEnfrente = 0;
                    objs.forEach(o => {
                        if (!o.isHang || o.hangMode === mode) return;
                        if (Math.abs(o.x - 1.05) > CERCA) return;
                        ocupadoEnfrente = Math.max(ocupadoEnfrente, o.hangLargo || 0);
                    });
                    if (ocupadoEnfrente > 0) {
                        largo = Math.min(largo, Math.max(0.12, 1 - CORREDOR - ocupadoEnfrente));
                    }

                    largoCable = largo;
                    const h = fieldH() * largo;
                    const w = Math.max(62, h * 0.22);
                    el.style.height = h + 'px';
                    el.style.width = w + 'px';
                    // Halo eléctrico sutil: el cable debe LEERSE sobre fondo oscuro
                    el.style.filter = 'drop-shadow(0 0 7px rgba(130,200,255,0.45))';

                    // OJO: .ss-obj se centra con translate(-50%,-50%), así que `top`
                    // marca el CENTRO del elemento, no su borde de arriba. Antes se
                    // ponía top:0 pensando en "pegado al techo" y la mitad del cable
                    // se quedaba fuera de pantalla: colgaba la mitad de lo que decía
                    // su longitud, y el desfase crecía cuanto más largo era. Por eso
                    // las alturas aleatorias no cuadraban con la colisión.
                    y = (mode === 'hang') ? (largo / 2) : (1 - largo / 2);
                    el.style.top = (y * 100) + '%';

                    // Cable en 3 piezas: soporte fijo + tramo recto estirable + punta
                    // pelada fija. Así el largo aleatorio no deforma el dibujo.
                    const tramo = document.createElement('div');
                    tramo.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;';
                    // El que sube del suelo es el mismo cable del revés: el soporte
                    // abajo y la punta pelada mirando al cielo.
                    if (mode === 'riser') tramo.style.transform = 'scaleY(-1)';
                    const capH = w * (160 / 200), tipH = w * (221 / 200);
                    [['aire_cable_cap', capH + 'px', '0 0 auto'],
                     ['aire_cable_body', 'auto', '1 1 auto'],
                     ['aire_cable_tip', tipH + 'px', '0 0 auto']].forEach(([piece, ph, flex]) => {
                        const seg = document.createElement('div');
                        seg.style.cssText = `width:100%;height:${ph};flex:${flex};` +
                            `background-image:${url(piece)};background-size:100% 100%;background-repeat:no-repeat;`;
                        tramo.appendChild(seg);
                    });
                    el.appendChild(tramo);
                } else if (mode === 'faller') {
                    kind = 'obstacle';
                    el._frames = cfg.fallerFrames || ['aire_foco', 'aire_foco_on'];
                    name = el._frames[0];
                    hFrac = 0.16; wRatio = 0.7;
                    y = 0.02;
                    vy = (cfg.fallerVy != null ? cfg.fallerVy : 0.26) + Math.random() * 0.16;
                } else if (mode === 'collect') {
                    kind = 'collect'; name = cfg.collectible[0];
                    el.classList.add('ss-collect'); hFrac = 0.12; wRatio = 1.05;
                } else if (mode === 'enemy') {
                    kind = 'enemy';
                    const en = cfg.enemies[Math.floor(Math.random() * cfg.enemies.length)];
                    el._frames = en; name = en[0];
                    hFrac = 0.18; wRatio = 1.75;
                    footprint = { x: 0.50, y: 0.82, rx: 0.44, ry: 0.07 };
                    const fromRear = nextEnemySide === 'rear';
                    nextEnemySide = fromRear ? 'front' : 'rear';
                    if (fromRear) {
                        enemySide = 'rear';
                        el.classList.add('ss-enemy', 'ss-enemy-rear', 'ss-enemy-stalk');
                        y = Math.max(yMin, Math.min(yMax,
                            playerY + (Math.random() - 0.5) * 0.10));
                        spawnX = -0.16; direction = 1; phase = 'stalk';
                    } else {
                        enemySide = 'front';
                        el.classList.add('ss-enemy', 'ss-enemy-front', 'ss-enemy-approach');
                        spawnX = 1.16; direction = -1; phase = 'front';
                    }
                    ultimoEnemigoMs = performance.now();
                } else {
                    kind = 'obstacle';
                    const spec = cfg.obstacles[Math.floor(Math.random() * cfg.obstacles.length)];
                    name = spriteName(spec);
                    if (typeof spec !== 'string' && spec.frames && spec.frames.length) {
                        el._frames = spec.frames;
                        frameDuration = spec.frameMs || null;
                    }
                    hFrac = typeof spec === 'string' ? 0.14 : (spec.h || 0.14);
                    wRatio = typeof spec === 'string' ? 1.1 : (spec.ratio || 1.1);
                    hitX = typeof spec === 'string' ? 0.52 : (spec.hitX || 0.52);
                    hitY = typeof spec === 'string' ? 0.52 : (spec.hitY || 0.52);
                    hitboxes = typeof spec === 'string' ? null : (spec.hitboxes || null);
                    footprint = typeof spec === 'string'
                        ? { x: 0.50, y: 0.78, rx: 0.30, ry: 0.09 }
                        : (spec.footprint || null);
                    footprints = typeof spec === 'string' ? null : (spec.footprints || null);
                    if (typeof spec !== 'string' && spec.yMin != null && spec.yMax != null) {
                        y = spec.yMin + Math.random() * (spec.yMax - spec.yMin);
                    }
                    if (!isFly && ultimoRoadY != null && Math.abs(y - ultimoRoadY) > 0.15) {
                        y = (y + ultimoRoadY) / 2;
                    }
                    if (typeof spec !== 'string' && spec.yMin != null && spec.yMax != null) {
                        y = Math.max(spec.yMin, Math.min(spec.yMax, y));
                    }
                    ultimoRoadY = y;
                }
                if (name) el.style.backgroundImage = url(name);
                if (hFrac) {
                    const h = fieldH() * hFrac;
                    el.style.height = h + 'px';
                    el.style.width = (h * wRatio) + 'px';
                }
                if (!isHang) el.style.top = (y * 100) + '%';
                el.style.left = (spawnX * 100) + '%';
                stage.appendChild(el);
                const footprintDefs = footprints || (footprint ? [footprint] : null);
                if (footprintDefs && footprintDefs.length) {
                    const initialFootprints = footprintDefs.map(def => footprintFromDef(def,
                        spawnX * fieldW() - el.offsetWidth / 2,
                        y * fieldH() - el.offsetHeight / 2,
                        el.offsetWidth, el.offsetHeight));
                    const nearestFootprint = initialFootprints.reduce(
                        (nearest, current) => current.cy > nearest.cy ? current : nearest);
                    el.style.zIndex = zByY(nearestFootprint.cy / fieldH());
                } else {
                    el.style.zIndex = zByY(y);
                }
                if (kind === 'enemy' && !isFly) {
                    warning = document.createElement('div');
                    warning.className = 'ss-threat-indicator' +
                        (enemySide === 'front' ? ' ss-threat-front' : '');
                    warning.textContent = enemySide === 'front' ? 'MOTO ⚠' : '⚠ MOTO';
                    warning.style.top = (y * 100) + '%';
                    stage.appendChild(warning);
                }
                const fallbackHitbox = {
                    x: (1 - (hitX != null ? hitX :
                        (kind === 'collect' ? 0.75 : (isHang ? 0.42 : 0.52)))) / 2,
                    y: (1 - (hitY != null ? hitY :
                        (kind === 'collect' ? 0.75 : (isHang ? 0.86 : 0.52)))) / 2,
                    w: hitX != null ? hitX :
                        (kind === 'collect' ? 0.75 : (isHang ? 0.42 : 0.52)),
                    h: hitY != null ? hitY :
                        (kind === 'collect' ? 0.75 : (isHang ? 0.86 : 0.52))
                };
                const collisionDefs = hitboxes || [fallbackHitbox];
                const usesFootprint = !isFly && !!(footprintDefs && footprintDefs.length);
                const debugLabel = kind === 'enemy'
                    ? (enemySide === 'front' ? 'HUELLA MOTO FRENTE' : 'HUELLA MOTO DETRÁS')
                    : (kind === 'collect' ? 'COLECCIONABLE' :
                        (usesFootprint ? 'HUELLA OBSTÁCULO' : 'OBSTÁCULO'));
                const debugBoxes = createDebugBoxes(
                    usesFootprint ? footprintDefs.length : collisionDefs.length,
                    kind, debugLabel, usesFootprint);
                // hangMode/hangLargo los usa el guardián del pasillo al generar el
                // siguiente cable: necesita saber de qué lado viene cada uno y
                // cuánto ocupa para no cerrar el paso.
                objs.push({
                    el, x: spawnX, y, kind, vy, isHang, taken: false,
                    frameT: 0, frameIdx: 0, direction, phase, age: 0, warning,
                    hitX, hitY, hitboxes: collisionDefs,
                    footprints: footprintDefs, prevFootprints: null, frameDuration,
                    enemySide, debugBoxes,
                    hangMode: isHang ? mode : null,
                    hangLargo: isHang ? largoCable : 0
                });
            };

            let hits = 0, collected = 0, dist = 0, running = true;
            const updateHud = () => {
                if (isFly) { scoreEl.textContent = `🎼 ${collected} / ${goal}`; statusEl.textContent = 'Recoge'; }
                else {
                    const pct = Math.max(0, Math.min(100, Math.round(dist / goal * 100)));
                    scoreEl.textContent = `🏁 ${pct}%`;
                    statusEl.textContent = `${Math.max(0, Math.ceil(goal - dist))} m`;
                }
                const progress = Math.max(0, Math.min(1, isFly ? collected / goal : dist / goal));
                progressEl.style.width = (progress * 100) + '%';
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

            let spawnTimer = null, raf = null, countdownTimers = [];
            const finish = (won) => {
                if (!running) return;
                running = false;
                if (spawnTimer) clearTimeout(spawnTimer);
                countdownTimers.forEach(clearTimeout);
                if (raf) cancelAnimationFrame(raf);
                window.removeEventListener('pointermove', onMove);
                stage.removeEventListener('pointerdown', onMove);
                document.removeEventListener('keydown', onKey);
                document.removeEventListener('keyup', onKey);
                overlay.removeEventListener('click', swallow, true);
                objs.forEach(o => {
                    o.el.remove();
                    if (o.warning) o.warning.remove();
                    removeDebugBoxes(o.debugBoxes);
                });
                removeDebugBoxes(playerDebugBoxes);
                objs = [];
                const result = document.createElement('div');
                result.className = 'minigame-result';
                result.textContent = won ? cfg.winMsg : cfg.loseMsg;
                overlay.appendChild(result);
                // Registrar cómo fue la partida (para líneas con "showIf" después)
                this.lastMinigameResult = { hits, maxHits, collected, goal };
                setTimeout(() => { overlay.remove(); resolve(won); }, won ? 1500 : 950);
            };

            // Chase tiene una cuenta atrás real, así que ya no necesita empezar
            // parpadeando. Vuelo conserva su gracia inicial histórica.
            let invulnUntil = performance.now() +
                (isFly ? (cfg.graceMs != null ? cfg.graceMs : 1200) : 0);
            let blinkUntil = isFly ? invulnUntil : 0;
            const hitPlayer = () => {
                hits++; updateHud();
                invulnUntil = performance.now() + (cfg.hitGraceMs != null ? cfg.hitGraceMs : 800);
                blinkUntil = invulnUntil;
                playerEl.classList.remove('ss-hurt'); void playerEl.offsetWidth; playerEl.classList.add('ss-hurt');
                stage.classList.remove('ss-hit'); void stage.offsetWidth; stage.classList.add('ss-hit');
                beep(150, 0.18, 0, { type: 'sawtooth', vol: 0.08 });
                if (hits >= maxHits) finish(false);
            };
            const grab = (o) => {
                collected++; o.taken = true; o.el.classList.add('ss-taken');
                if (o.warning) o.warning.remove();
                removeDebugBoxes(o.debugBoxes);
                if (cfg.collectible && cfg.collectible[1]) o.el.style.backgroundImage = url(cfg.collectible[1]);
                beep(880, 0.09, 0, { type: 'triangle', vol: 0.08 });
                beep(1320, 0.09, 0.05, { type: 'triangle', vol: 0.06 });
                updateHud();
                const el = o.el; setTimeout(() => el.remove(), 320);
                if (collected >= goal) finish(true);
            };

            let bgX = 0, prevPlayerFootprint = null;
            const roadPxPerSec = speed * 55;
            const objSpeed = 0.12 + speed * 0.055;   // vuelo y objetos sin carretera
            const distRate = speed * 0.62;
            const baseSpawnMs = cfg.spawnMs != null ? cfg.spawnMs : Math.max(480, 1150 - speed * 75);
            let started = isFly;
            const scheduleSpawn = () => {
                if (!running) return;
                const runProgress = isFly ? 0 : Math.max(0, Math.min(1, dist / goal));
                // Al ligar los obstáculos al asfalto recorren menos pantalla que
                // con la antigua velocidad artificial. Se conserva la separación
                // física entre spawns para que no formen una pared continua.
                const roadSpeed = roadPxPerSec / fieldW();
                const spacingFactor = isFly ? 1 : Math.max(1, objSpeed / roadSpeed);
                // El primer tercio da más aire; al final llega gradualmente al
                // ritmo configurado por storyDelay, sin un muro de dificultad.
                const delay = isFly ? baseSpawnMs :
                    baseSpawnMs * spacingFactor * (1.18 - runProgress * 0.18);
                spawnTimer = setTimeout(() => {
                    if (!running) return;
                    if (started && !paused) spawnObj();
                    scheduleSpawn();
                }, paused ? 120 : delay);
            };

            if (isFly) {
                scheduleSpawn();
            } else {
                countdownEl.classList.add('active');
                const countdownSteps = ['3', '2', '1', '¡YA!'];
                const runCountdownStep = (index) => {
                    if (!running) return;
                    if (paused) {
                        countdownTimers.push(setTimeout(() => runCountdownStep(index), 100));
                        return;
                    }
                    if (index >= countdownSteps.length) {
                        countdownEl.classList.remove('active');
                        countdownEl.textContent = '';
                        started = true;
                        last = performance.now();
                        scheduleSpawn();
                        return;
                    }
                    countdownEl.textContent = countdownSteps[index];
                    countdownEl.classList.remove('ss-count-pop');
                    void countdownEl.offsetWidth;
                    countdownEl.classList.add('ss-count-pop');
                    beep(index === countdownSteps.length - 1 ? 980 : 520, 0.08, 0,
                        { type: 'square', vol: 0.045 });
                    countdownTimers.push(setTimeout(() => runCountdownStep(index + 1), 430));
                };
                runCountdownStep(0);
            }

            const tick = () => {
                if (!running) return;
                const now = performance.now();
                const dt = Math.min(0.05, (now - last) / 1000); last = now;

                if (paused) {
                    playerEl.style.setProperty('--ss-steer', '0deg');
                    return;
                }

                if (keys['arrowup'] || keys['w']) targetY -= dt * 1.15;
                if (keys['arrowdown'] || keys['s']) targetY += dt * 1.15;
                if (!isFly && (keys['arrowleft'] || keys['a'])) targetX -= dt * 0.95;
                if (!isFly && (keys['arrowright'] || keys['d'])) targetX += dt * 0.95;
                targetX = Math.max(xMin, Math.min(xMax, targetX));
                targetY = Math.max(yMin, Math.min(yMax, targetY));
                playerX += (targetX - playerX) * Math.min(1, dt * 8);
                playerY += (targetY - playerY) * Math.min(1, dt * 10);
                setPlayerPosition();
                if (!isFly) {
                    const steer = Math.max(-2.6, Math.min(2.6, (targetY - playerY) * 24));
                    playerEl.style.setProperty('--ss-steer', steer.toFixed(2) + 'deg');
                }
                animatePlayer(dt);

                if (!started) {
                    updateHud();
                    return;
                }

                bgX -= roadPxPerSec * dt;
                if (bgFarEl) bgFarEl.style.backgroundPositionX = (bgX * 0.22) + 'px';
                if (bgNearEl) bgNearEl.style.backgroundPositionX = bgX + 'px';

                if (!isFly) {
                    dist += distRate * dt;
                    if (dist >= goal) { finish(true); return; }
                }
                if (moonEl && !isFly) {
                    const moonProgress = Math.max(0, Math.min(1, dist / goal));
                    const easedMoonProgress = moonProgress * moonProgress *
                        (3 - 2 * moonProgress);
                    const startX = cfg.moonStartX != null ? cfg.moonStartX : 0.82;
                    const endX = cfg.moonEndX != null ? cfg.moonEndX : 0.20;
                    const startY = cfg.moonStartY != null ? cfg.moonStartY : 0.22;
                    const endY = cfg.moonEndY != null ? cfg.moonEndY : 0.12;
                    moonEl.style.left =
                        ((startX + (endX - startX) * easedMoonProgress) * 100) + '%';
                    moonEl.style.top =
                        ((startY + (endY - startY) * easedMoonProgress) * 100) + '%';
                }

                const fw = fieldW(), fh = fieldH();
                const currentPlayerFootprint = getPlayerFootprint();
                const playerRects = isFly ? getPlayerRects() : [];
                if (currentPlayerFootprint) {
                    paintDebugFootprint(playerDebugBoxes[0], currentPlayerFootprint);
                } else {
                    paintDebugRects(playerDebugBoxes, playerRects);
                }

                for (const o of objs) {
                    if (o.taken) continue;
                    if (!isFly && o.kind === 'enemy') {
                        o.age += dt;
                        if (o.phase === 'stalk') {
                            o.x += (0.10 + speed * 0.008) * dt;
                            o.y += (playerY - o.y) * Math.min(1, dt * 2.8);
                            o.y = Math.max(yMin, Math.min(yMax, o.y));
                            o.el.style.top = (o.y * 100) + '%';
                            if (o.warning) o.warning.style.top = (o.y * 100) + '%';
                            if (o.age >= 0.85) {
                                o.phase = 'charge';
                                o.el.classList.remove('ss-enemy-stalk');
                                o.el.classList.add('ss-enemy-charge');
                                if (o.warning) { o.warning.remove(); o.warning = null; }
                                beep(720, 0.09, 0, { type: 'sawtooth', vol: 0.045 });
                            }
                        } else if (o.phase === 'charge') {
                            o.x += (0.34 + speed * 0.030) * dt;
                        } else {
                            // La moto frontal suma su propia marcha al movimiento
                            // del asfalto: se acerca más deprisa que un obstáculo
                            // quieto, pero avisa desde el borde derecho.
                            o.x -= (roadPxPerSec / fw + 0.14 + speed * 0.012) * dt;
                            if (o.warning && o.x <= 1.01) {
                                o.warning.remove();
                                o.warning = null;
                                o.el.classList.remove('ss-enemy-approach');
                            }
                        }
                    } else if (!isFly && o.kind === 'obstacle') {
                        // Un objeto apoyado en la calzada comparte exactamente el
                        // desplazamiento en píxeles de la textura de carretera.
                        o.x -= (roadPxPerSec / fw) * dt;
                    } else {
                        o.x -= objSpeed * dt;
                    }
                    o.el.style.left = (o.x * 100) + '%';
                    // Focos que CAEN (y cualquier objeto con velocidad vertical)
                    if (o.vy) {
                        o.y += o.vy * dt;
                        o.el.style.top = (o.y * 100) + '%';
                        o.el.style.zIndex = zByY(o.y);
                        if (o.y > 1.15) {
                            o.taken = true;
                            o.el.remove();
                            if (o.warning) o.warning.remove();
                            removeDebugBoxes(o.debugBoxes);
                            continue;
                        }
                    }
                    // Animación por frames para cualquier objeto que las tenga
                    if (o.el._frames && o.el._frames.length > 1) {
                        o.frameT += dt;
                        const frameDuration = o.frameDuration ||
                            (o.kind === 'enemy' ? 0.095 : 0.14);
                        if (o.frameT >= frameDuration) {
                            o.frameT = 0;
                            o.frameIdx = (o.frameIdx + 1) % o.el._frames.length;
                            o.el.style.backgroundImage = url(o.el._frames[o.frameIdx]);
                        }
                    }
                    const ow = o.el.offsetWidth, oh = o.el.offsetHeight;
                    const ocx = o.x * fw, ocy = o.y * fh;
                    let collided = false;
                    if (!isFly && currentPlayerFootprint &&
                        o.footprints && o.footprints.length) {
                        const currentObjectFootprints = o.footprints.map(def =>
                            footprintFromDef(def, ocx - ow / 2, ocy - oh / 2, ow, oh));
                        const nearestFootprint = currentObjectFootprints.reduce(
                            (nearest, current) => current.cy > nearest.cy ? current : nearest);
                        o.el.style.zIndex = zByY(nearestFootprint.cy / fh);
                        currentObjectFootprints.forEach((current, index) =>
                            paintDebugFootprint(o.debugBoxes[index], current));
                        collided = currentObjectFootprints.some((current, index) =>
                            sweptFootprintsOverlap(
                                prevPlayerFootprint || currentPlayerFootprint,
                                currentPlayerFootprint,
                                (o.prevFootprints && o.prevFootprints[index]) || current,
                                current));
                        o.prevFootprints = currentObjectFootprints;
                    } else {
                        const objectRects = rectsFromDefs(
                            o.hitboxes, ocx - ow / 2, ocy - oh / 2, ow, oh);
                        paintDebugRects(o.debugBoxes, objectRects);
                        collided = anyRectsOverlap(playerRects, objectRects);
                    }
                    const dangerous = o.kind !== 'enemy' ||
                        o.phase === 'charge' || o.phase === 'front' || isFly;
                    if (dangerous && collided) {
                        if (o.kind === 'collect') { grab(o); if (!running) return; }
                        else if (now >= invulnUntil) {
                            o.taken = true;
                            o.el.remove();
                            if (o.warning) o.warning.remove();
                            removeDebugBoxes(o.debugBoxes);
                            hitPlayer();
                            if (!running) return;
                        }
                        // Durante la invulnerabilidad los obstáculos pasan de largo
                    }
                }
                prevPlayerFootprint = currentPlayerFootprint;
                objs = objs.filter(o => {
                    const inBounds = o.direction > 0 ? o.x < 1.28 : o.x > -0.25;
                    if (!inBounds && o.warning) o.warning.remove();
                    if (!inBounds) removeDebugBoxes(o.debugBoxes);
                    return !o.taken && inBounds;
                });

                // Parpadeo del jugador mientras dura la invulnerabilidad
                playerEl.style.opacity = (now < blinkUntil && Math.floor(now / 120) % 2 === 0) ? '0.35' : '1';

                updateHud();
            };
            // Bucle con requestAnimationFrame: va sincronizado con el refresco de
            // la pantalla. Con setInterval(16) el navegador dibujaba a destiempo y
            // el desplazamiento daba tirones.
            // `overlay.isConnected`: si nos sacan desde los botones de arriba, el
            // overlay se borra y el bucle tiene que pararse solo.
            const loop = () => {
                if (!running || !overlay.isConnected) { running = false; return; }
                tick();
                if (running) raf = requestAnimationFrame(loop);
            };
            raf = requestAnimationFrame(loop);
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
            // Heredar el etalonaje vigente: Juice puede haberlo aplicado antes
            // de que esta segunda capa existiera.
            if (bg) {
                bgB.style.filter = (window.Juice && typeof window.Juice.currentGrade === 'function')
                    ? window.Juice.currentGrade()
                    : (bg.style.filter || getComputedStyle(bg).filter || 'none');
            }
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
        this.currentBackgroundPath = imagePath || null;
        const url = `url('${this.cacheBustAsset(imagePath)}')`;
        // Resetear cualquier Ken Burns anterior al cambiar de fondo
        this.bgPan({ reset: true });
        if (opts.cut || !document.getElementById('game-container')) {
            // Un corte seco tiene que cancelar cualquier fundido a medias: si
            // no, el temporizador del anterior dispara después y pisa este
            // fondo con el de la escena de la que venimos.
            clearTimeout(this._bgSwapTimer);
            this._bgSwapTimer = null;
            const bPrev = document.getElementById('background-b');
            if (bPrev) { bPrev.style.transition = 'none'; bPrev.style.opacity = '0'; }
            bg.style.backgroundImage = url;
            return;
        }
        const { bgB } = this.ensureSceneLayers();
        if (!bgB) { bg.style.backgroundImage = url; return; }
        // Pintar el nuevo fondo en la capa B y fundirla por encima
        bgB.style.transition = 'none';
        bgB.style.opacity = '0';
        // La capa A puede estar a mitad de una transición de etalonaje y su
        // `style.filter` no representa necesariamente el estado narrativo.
        // Juice conserva ese estado explícitamente para que B nunca entre con
        // `filter: none` durante el primer fotograma del crossfade.
        bgB.style.filter = (window.Juice && typeof window.Juice.currentGrade === 'function')
            ? window.Juice.currentGrade()
            : (bg.style.filter || getComputedStyle(bg).filter || 'none');
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
        const goingDark = action.from == null; // "to" (u omitido) = oscurecer
        // Cada acción declara su propio punto de partida. Es imprescindible al
        // saltar/retroceder: clearStage deja el telón a 0 y un `from` heredado
        // acabaría animando 0→0 sin llegar a verse.
        fader.style.transition = 'none';
        fader.style.opacity = goingDark ? '0' : '1';
        void fader.offsetWidth;
        fader.style.transition = `opacity ${dur}ms ease`;
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
    // Muestra una ilustración a pantalla completa. Con `size` se puede mostrar
    // un OBJETO en vez de una escena: las CGs normales son apaisadas y llenan la
    // pantalla (cover), pero una imagen vertical como el diapasón se ampliaba
    // hasta 1280x1382 y salía enorme y recortada. Con `size: "auto 55%"` se
    // dibuja centrada y a su tamaño. Se asigna SIEMPRE para que no se cuele el
    // tamaño de una CG en la siguiente.
    async showCG(path, duration = 600, opts = {}) {
        const { cg } = this.ensureSceneLayers();
        if (!cg || !path) return;
        // Las láminas 4K pueden tardar en descargarse y decodificarse. Si se
        // cambia el background antes de que estén listas, el CG anterior puede
        // reaparecer un instante o dejar un hueco durante el fundido.
        await this.preloadImages([path]);
        cg.style.backgroundImage = `url('${this.cacheBustAsset(path)}')`;
        cg.style.backgroundSize = opts.size || 'cover';
        cg.style.backgroundPosition = opts.position || 'center';
        // La viñeta interior de .cg-layer es para las ilustraciones a pantalla
        // completa. En modo objeto la capa es casi toda transparente, así que
        // ese borde oscuro se comería la escena que hay detrás.
        cg.style.boxShadow = opts.size ? 'none' : '';
        cg.style.transition = `opacity ${duration}ms ease`;
        cg.style.opacity = '1';
        cg.classList.add('cg-visible');
        await new Promise(r => setTimeout(r, duration + 40));
    }

    hideCG(duration = 500) {
        const cg = document.getElementById('cg-layer');
        if (!cg) return;
        cg.style.transition = `opacity ${duration}ms ease`;
        cg.style.opacity = '0';
        cg.classList.remove('cg-visible');
    }

    // Rompe la caché UNA VEZ POR CARGA DE PÁGINA, no en cada llamada. Antes esto
    // devolvía `?v=${Date.now()}`, así que cada cambio de fotograma de un sprite
    // generaba una URL nueva y el navegador se volvía a descargar el PNG entero:
    // el hueco se quedaba en blanco mientras tanto y el minijuego parpadeaba sin
    // parar (medido: 17 URLs distintas del coche en 2,5 s y 500 MB de descargas).
    // Con un sello fijo por sesión seguimos viendo los assets recién editados al
    // recargar, pero dentro de la partida la caché del navegador hace su trabajo.
    cacheBustAsset(path) {
        if (!path || path.startsWith('data:') || /^https?:\/\//.test(path)) {
            return path;
        }
        const cached = this.assetUrlCache.get(path);
        if (cached) return cached;
        const separator = path.includes('?') ? '&' : '?';
        const resolved = `${path}${separator}v=${this.assetStamp}`;
        this.assetUrlCache.set(path, resolved);
        return resolved;
    }

    // Precarga una lista de imágenes y conserva tanto la promesa como el Image.
    // Si se repite un minijuego o dos motores comparten un sprite, se reutiliza
    // exactamente la misma descarga y la misma decodificación en memoria.
    preloadImages(paths) {
        const uniquePaths = [...new Set((paths || []).filter(Boolean))];
        return Promise.all(uniquePaths.map(path => {
            const src = this.cacheBustAsset(path);
            const cached = this.imagePreloadCache.get(src);
            if (cached) return cached;

            const img = new Image();
            img.decoding = 'async';
            const pending = new Promise(resolve => {
                img.onload = async () => {
                    try {
                        if (img.decode) await img.decode();
                    } catch (error) {
                        // onload ya garantiza una imagen utilizable; decode puede
                        // rechazarse si el navegador la había decodificado antes.
                    }
                    this.preloadedImages.set(src, img);
                    resolve(img);
                };
                img.onerror = () => {
                    // Un fallo transitorio debe poder reintentarse en la próxima
                    // entrada al minijuego, no quedar memorizado toda la sesión.
                    this.imagePreloadCache.delete(src);
                    resolve(null);
                };
                img.src = src;
            });
            this.imagePreloadCache.set(src, pending);
            return pending;
        }));
    }

    getCharacterKey(characterName) {
        const norm = (s) => String(s || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
        const key = norm(characterName);
        // Alias por nombre visible: un speaker como "Micaela Michis" no es
        // clave de fichero, pero s\u00ed el "name" de micaela.json \u2014 resolverlo ah\u00ed en
        // vez de intentar un fetch de "micaela michis.json" (404 seguro).
        // Tambi\u00e9n se aceptan "aliases" del JSON del personaje (p. ej. tony.json
        // declara ["Seraphyna"]: su nombre art\u00edstico resalta SU sprite).
        if (!this.characters[key]) {
            for (const k in this.characters) {
                const c = this.characters[k];
                if (!c) continue;
                if (norm(c.name) === key) return k;
                if (Array.isArray(c.aliases) && c.aliases.some(a => norm(a) === key)) return k;
            }
        }
        return key;
    }

    getCharacterPoseImage(character, pose) {
        if (!character) return null;
        const selected = character.poses && character.poses[pose] != null
            ? character.poses[pose]
            : (character.poses && character.poses[character.defaultPose] != null)
            ? character.poses[character.defaultPose]
            : character.image || character.poses?.neutral;
        if (typeof selected === 'string') return selected;
        if (selected && typeof selected === 'object') {
            return selected.src || selected.image || selected.frames?.[0]?.src || selected.frames?.[0] || null;
        }
        return null;
    }

    // Un cambio de pose es un reemplazo limpio. La versión anterior creaba una
    // segunda capa con el sprite viejo; si la clase de animación se retiraba
    // antes de tiempo, esa copia quedaba visible detrás del personaje nuevo.
    // Las animaciones reales se reproducen ahora con sprites consecutivos.
    applyCharacterPoseImage(charElement, poseImage) {
        if (!charElement || !poseImage) return;
        const nextPoseSrc = this.cacheBustAsset(poseImage);
        const nextImage = `url('${nextPoseSrc}')`;
        clearTimeout(charElement._poseTransitionTimer);
        charElement._poseTransitionTimer = null;
        charElement.querySelectorAll(':scope > .character-pose-ghost').forEach(ghost => ghost.remove());
        charElement.classList.remove('pose-transitioning');
        delete charElement.dataset.poseTransition;
        charElement.style.backgroundImage = nextImage;
        charElement.dataset.poseSrc = nextPoseSrc;
        delete charElement.dataset.frameSrc;
        this.hideCharacterEyeLayer(charElement);
    }

    applyCharacterAnimationFrame(charElement, framePath) {
        if (!charElement || !framePath) return;
        const src = this.cacheBustAsset(framePath);
        charElement.style.backgroundImage = `url('${src}')`;
        charElement.dataset.frameSrc = src;
    }

    hideCharacterEyeLayer(charElement) {
        const layer = charElement?.querySelector(':scope > .character-eye-layer');
        if (layer) {
            layer.hidden = true;
            layer.removeAttribute('src');
        }
        if (charElement) delete charElement.dataset.eyeLayerState;
    }

    applyCharacterEyeLayerFrame(charElement, config, frame) {
        if (!charElement || !config || !frame?.src) return;
        let layer = charElement.querySelector(':scope > .character-eye-layer');
        if (!layer) {
            layer = document.createElement('img');
            layer.className = 'character-eye-layer';
            layer.alt = '';
            layer.setAttribute('aria-hidden', 'true');
            layer.draggable = false;
            charElement.appendChild(layer);
        }
        const state = frame.state === 'closed' ? 'closed' : 'half';
        const offset = config.offsets?.[state] || [0, 0];
        const stretch = config.offsets?.[`${state}Scale`] || [1, 1];
        const crop = config.crop;
        const canvas = config.canvas;
        const width = charElement.clientWidth;
        const height = charElement.clientHeight;
        const contain = Math.min(width / canvas.width, height / canvas.height) || 1;
        const imageLeft = (width - canvas.width * contain) / 2;
        const imageTop = height - canvas.height * contain;
        const targetWidth = crop.width * stretch[0];
        const targetHeight = crop.height * stretch[1];
        const targetLeft = crop.x + crop.width / 2 + offset[0] - targetWidth / 2;
        const targetTop = crop.y + crop.height / 2 + offset[1] - targetHeight / 2;
        layer.style.left = `${imageLeft + targetLeft * contain}px`;
        layer.style.top = `${imageTop + targetTop * contain}px`;
        layer.style.width = `${targetWidth * contain}px`;
        layer.style.height = `${targetHeight * contain}px`;
        layer.src = this.cacheBustAsset(frame.src);
        layer.hidden = false;
        charElement.dataset.eyeLayerState = state;
    }

    animationFramePath(character, frame) {
        const value = frame && typeof frame === 'object'
            ? (frame.src || frame.image || frame.pose)
            : frame;
        if (!value) return null;
        return character.poses?.[value]
            ? this.getCharacterPoseImage(character, value)
            : value;
    }

    animationDelay(value, fallback = 2400) {
        if (Array.isArray(value) && value.length) {
            const min = Math.max(0, Number(value[0]) || 0);
            const max = Math.max(min, Number(value[1]) || min);
            return min + Math.random() * (max - min);
        }
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
    }

    // Reproduce fotogramas pertenecientes a UNA misma pose. Cuando existen
    // recortes oculares, la base permanece inmóvil y sólo cambia el parche de
    // ojos (medio/cerrado/medio); el resto conserva el fallback de sprite completo.
    startCharacterFrameAnimation(characterKey, position, pose) {
        this.stopCharacterFrameAnimation(position, false);
        const character = this.characters[characterKey];
        const config = character?.animations?.[pose] || character?.poseAnimations?.[pose];
        const layerConfig = character?.layerBlinks?.[pose];
        const reducedMotion = (window.Juice && typeof window.Juice.isReduced === 'function'
            && window.Juice.isReduced()) || (window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        if ((!config && !layerConfig) || reducedMotion) return;

        const sourceFrames = layerConfig?.frames || (Array.isArray(config) ? config : config.frames);
        if (!Array.isArray(sourceFrames) || !sourceFrames.length) return;
        const frames = sourceFrames.map(frame => ({
            src: this.animationFramePath(character, frame),
            duration: frame && typeof frame === 'object' ? Number(frame.duration) : NaN,
            state: frame && typeof frame === 'object' ? frame.state : null
        })).filter(frame => frame.src);
        if (!frames.length) return;

        const basePoseImage = this.getCharacterPoseImage(character, pose);
        const entry = {
            character: characterKey,
            position,
            pose,
            basePoseImage,
            frames,
            layerConfig,
            timer: null,
            cancelled: false
        };
        this._characterFrameAnimations.set(position, entry);

        const stillOwnsSlot = () => {
            const element = document.getElementById(`character-${position}`);
            return element && element.classList.contains('active') &&
                element.getAttribute('data-character') === characterKey &&
                element.dataset.pose === String(pose).toLowerCase().replace(/[^a-z0-9_-]/g, '') &&
                this._characterFrameAnimations.get(position) === entry;
        };

        const scheduleBurst = () => {
            if (!stillOwnsSlot()) {
                this.stopCharacterFrameAnimation(position, false);
                return;
            }
            const wait = this.animationDelay(
                config?.delayRange || config?.idleRange || config?.loopDelay || [1800, 4200],
                Number(config?.delayMs) || 2400
            );
            entry.timer = setTimeout(playFrame, wait);
        };

        let index = 0;
        const playFrame = () => {
            if (!stillOwnsSlot()) {
                this.stopCharacterFrameAnimation(position, false);
                return;
            }
            const element = document.getElementById(`character-${position}`);
            const frame = frames[index];
            if (layerConfig) this.applyCharacterEyeLayerFrame(element, layerConfig, frame);
            else this.applyCharacterAnimationFrame(element, frame.src);
            const duration = Number.isFinite(frame.duration) && frame.duration > 0
                ? frame.duration
                : Math.max(40, Number(config?.frameMs) || 85);
            index += 1;
            if (index < frames.length) {
                entry.timer = setTimeout(playFrame, duration);
                return;
            }

            entry.timer = setTimeout(() => {
                if (!stillOwnsSlot()) return;
                if (layerConfig) this.hideCharacterEyeLayer(element);
                else this.applyCharacterAnimationFrame(element, basePoseImage);
                delete element.dataset.frameSrc;
                index = 0;
                if (config?.loop === false) {
                    this._characterFrameAnimations.delete(position);
                } else {
                    scheduleBurst();
                }
            }, duration);
        };

        this.preloadImages(frames.map(frame => frame.src)).then(() => {
            if (this._characterFrameAnimations.get(position) === entry) scheduleBurst();
        });
    }

    stopCharacterFrameAnimation(position, restoreBase = true) {
        if (!position) return;
        const entry = this._characterFrameAnimations.get(position);
        if (!entry) return;
        clearTimeout(entry.timer);
        entry.cancelled = true;
        this._characterFrameAnimations.delete(position);
        const element = document.getElementById(`character-${position}`);
        if (restoreBase && element && element.classList.contains('active') && entry.basePoseImage) {
            if (entry.layerConfig) this.hideCharacterEyeLayer(element);
            else this.applyCharacterAnimationFrame(element, entry.basePoseImage);
        }
        if (entry.layerConfig && element) this.hideCharacterEyeLayer(element);
        if (element) delete element.dataset.frameSrc;
    }

    // Edu, Tony y José conservan su retrato humano en el cursor hasta
    // el instante narrativo en que el juego revela su forma transformada. Los
    // umbrales por escena/línea permiten también saltar desde el menú de escenas
    // sin depender de una variable que solo se hubiera activado al jugar antes.
    humanDialogPortrait(characterKey) {
        const portraits = {
            edu: 'assets/images/characters/humans/edu_humano_sprite.webp',
            tony: 'assets/images/characters/humans/tony_humano_sprite.webp',
            jose: 'assets/images/characters/humans/jose_humano_sprite.webp'
        };
        return portraits[characterKey] || null;
    }

    isFurryIdentityRevealed(characterKey) {
        const revealAt = {
            edu: { chapter: 2, scene: 16, line: 4 },
            tony: { chapter: 3, scene: 13, line: 5 },
            jose: { chapter: 4, scene: 2, line: 4 }
        };
        const reveal = revealAt[characterKey];
        if (!reveal) return true;

        const chapterMatch = String(this.lastChapterName || '').match(/^chapter(\d+)/);
        const chapter = chapterMatch ? Number(chapterMatch[1]) : 0;
        if (chapter !== reveal.chapter) return chapter > reveal.chapter;
        if (this.currentScene !== reveal.scene) return this.currentScene > reveal.scene;
        return this.currentLine >= reveal.line;
    }

    async showCharacter(characterName, position = 'left', pose = 'neutral', flipped = false, enter = null) {
        const characterKey = this.getCharacterKey(characterName);
        let character = this.characters[characterKey];
        if (!character) {
            character = await this.loadCharacter(characterKey);
        }
        if (!character) return;

        const previousPosition = this.characterPositions[characterKey];
        if (previousPosition && previousPosition !== position) {
            this.hideCharacter(characterKey, previousPosition);
        }

        const charElement = document.getElementById(`character-${position}`);
        if (charElement) {
            // Un hueco solo puede pertenecer a un personaje. Limpiamos el
            // ocupante anterior y cualquier salida/acting pendiente antes de
            // reutilizarlo para evitar mappings fantasma y borrados tardíos.
            this.clearCharacterAnimeFall(charElement);
            const currentOccupant = charElement.getAttribute('data-character');
            if (currentOccupant !== characterKey) {
                this.resetCharacterSlotElement(charElement, position);
            } else {
                clearTimeout(charElement._exitTimer);
                charElement._exitTimer = null;
                charElement.classList.remove('char-exit-fade');
                this.stopCharacterPoseAnimation(null, position);
                this.stopCharacterFrameAnimation(position, false);
            }
            for (const key of Object.keys(this.characterPositions)) {
                if (this.characterPositions[key] === position) {
                    delete this.characterPositions[key];
                }
            }

            const poseImage = this.getCharacterPoseImage(character, pose);

            this.applyCharacterPoseImage(charElement, poseImage);
            this.applyPoseClass(charElement, pose);
            charElement.classList.add('active');
            charElement.setAttribute('data-character', characterKey);

            // Manejar video integrado si la pose tiene un video asociado (compañeros)
            const videoPath = character.poses && character.poses[`${pose}_video`];
            this.updateCharacterVideo(charElement, videoPath);

            // Aplicar flip horizontal si está especificado (sin animación) y el
            // escalado por personaje de los compañeros (p. ej. José un 18% más grande)
            const characterScale = this.getCharacterScale(characterKey);
            const characterVerticalOffset = this.getCharacterVerticalOffset(characterKey);
            charElement.style.transform = `${flipped ? 'scaleX(-1)' : 'scaleX(1)'} translateY(${characterVerticalOffset}) scale(${characterScale})`;

            // Entrada animada opcional ("right"/"left"/"bottom"/"fade"). Usa la
            // propiedad CSS `translate` (independiente de transform, no pisa el flip).
            if (enter) {
                const cls = `char-enter-${['right','left','bottom','fade'].includes(enter) ? enter : 'fade'}`;
                charElement.classList.remove('char-enter-right','char-enter-left','char-enter-bottom','char-enter-fade');
                void charElement.offsetWidth;
                charElement.classList.add(cls);
                clearTimeout(charElement._enterTimer);
                charElement._enterTimer = setTimeout(() => {
                    charElement.classList.remove(cls);
                    charElement._enterTimer = null;
                }, 550);
            }

            // Rastrear posición del personaje
            this.characterPositions[characterKey] = position;
            this.stageCharacters[position] = {
                character: characterKey,
                pose,
                flipped: !!flipped
            };
            this.startCharacterFrameAnimation(characterKey, position, pose);
        }
        this.layoutCharacters();
    }

    // Escala visual por personaje (cambios de los compañeros): permite que un
    // personaje concreto se dibuje más grande sin tocar su sprite.
    getCharacterScale(characterKey) {
        const characterScales = {
            airi: 0.7,
            tung_tung_tung_sahur: 1.5,
            jose: 1.18,
            amalgama: 1.2,
            amalgama_final: 1.2
        };
        return characterScales[characterKey] || 1;
    }

    // Al ampliar un sprite vertical, el origen inferior empuja la cabeza fuera
    // del escenario. Tung baja lo justo para conservar el rostro y convertir
    // su aparición en un plano de cintura cubierto por el cuadro de diálogo.
    getCharacterVerticalOffset(characterKey) {
        const characterVerticalOffsets = {
            tung_tung_tung_sahur: '38%'
        };
        return characterVerticalOffsets[characterKey] || '0%';
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

    setPose(characterName, position, pose = 'neutral', options = {}) {
        const characterKey = this.getCharacterKey(characterName);
        const character = this.characters[characterKey];
        if (!character) return;

        const charElement = document.getElementById(`character-${position}`);
        if (charElement && charElement.classList.contains('active')) {
            this.stopCharacterFrameAnimation(position, false);
            const poseImage = this.getCharacterPoseImage(character, pose);

            this.applyCharacterPoseImage(charElement, poseImage);
            this.applyPoseClass(charElement, pose);

            // Manejar video integrado si la pose tiene un video asociado (compañeros)
            const videoPath = character.poses && character.poses[`${pose}_video`];
            this.updateCharacterVideo(charElement, videoPath);
            const visual = this.stageCharacters[position];
            if (visual) visual.pose = pose;
            if (options.animateFrames !== false) {
                this.startCharacterFrameAnimation(characterKey, position, pose);
            }
        }
    }

    // Secuencia declarativa de poses. Permite pequeños acting loops usando los
    // sprites ya disponibles: parpadeos, respiración, nervios o sacudidas. Por
    // defecto vive hasta que el jugador avanza la línea; también admite una
    // secuencia finita con loop:false.
    startCharacterPoseAnimation(action = {}) {
        const characterName = action.character;
        const characterKey = this.getCharacterKey(characterName);
        const position = action.position || this.characterPositions[characterKey];
        const poses = (action.poses || action.frames || []).filter(Boolean);
        if (!position || !poses.length) return;

        this.stopCharacterPoseAnimation(characterKey, position);
        const reducedMotion = (window.Juice && typeof window.Juice.isReduced === 'function'
            && window.Juice.isReduced()) || (window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        if (reducedMotion) {
            // Las secuencias son animación real basada en temporizadores; el
            // media query CSS no puede detenerlas. Dejamos un fotograma legible.
            this.setPose(characterKey, position, poses[0], { animateFrames: false });
            return;
        }
        this.stopCharacterFrameAnimation(position, false);
        const frameMs = Math.max(90, Number(action.frameMs || action.duration) || 360);
        const loop = action.loop !== false;
        const pingPong = !!action.pingPong && poses.length > 2;
        const sequence = pingPong
            ? [...poses, ...poses.slice(1, -1).reverse()]
            : [...poses];
        let index = 0;

        const entry = {
            character: characterKey,
            position,
            untilAdvance: action.untilAdvance !== false,
            timer: null
        };
        const tick = () => {
            const element = document.getElementById(`character-${position}`);
            if (!element || !element.classList.contains('active')) {
                this.stopCharacterPoseAnimation(characterKey, position);
                return;
            }
            // Una secuencia ya aporta movimiento cuadro a cuadro. Evitamos el
            // fundido largo de expresión, que solaparía varios fotogramas.
            this.setPose(characterKey, position, sequence[index], { animateFrames: false });
            index += 1;
            if (index >= sequence.length) {
                if (!loop) {
                    this._characterPoseAnimations.delete(position);
                    return;
                }
                index = 0;
            }
            entry.timer = setTimeout(tick, frameMs);
        };

        this._characterPoseAnimations.set(position, entry);
        if (action.immediate === false) entry.timer = setTimeout(tick, frameMs);
        else tick();
    }

    stopCharacterPoseAnimation(characterName, position) {
        const key = characterName ? this.getCharacterKey(characterName) : null;
        const trackedPosition = position || (key && this.characterPositions[key]);
        if (!trackedPosition) return;
        const entry = this._characterPoseAnimations.get(trackedPosition);
        if (!entry) return;
        clearTimeout(entry.timer);
        this._characterPoseAnimations.delete(trackedPosition);
    }

    // Marca la pose activa en el elemento (clase "pose-<nombre>") para que el CSS
    // pueda tratar poses concretas de forma distinta. Se usa, por ejemplo, con los
    // primerísimos planos de llanto ("bua"), que en vez de centrarse se pegan a la
    // esquina inferior para que la cara encaje con el borde del escenario.
    applyPoseClass(charElement, pose) {
        // Retirar solo la pose anterior. Antes se eliminaba cualquier clase que
        // empezase por `pose-`, incluyendo clases internas de transición; ese
        // barrido era una de las causas de que la antigua capa fantasma quedase
        // congelada y visible.
        const previousPose = charElement.dataset.pose;
        if (previousPose) charElement.classList.remove(`pose-${previousPose}`);
        if (pose) {
            const limpia = String(pose).toLowerCase().replace(/[^a-z0-9_-]/g, '');
            if (limpia) {
                charElement.classList.add(`pose-${limpia}`);
                charElement.dataset.pose = limpia;
            }
        } else {
            delete charElement.dataset.pose;
        }
    }

    // Glitch visual puntual para llamadas o señales comprimidas. La clase se
    // reinicia siempre para que una segunda interrupción vuelva a animarse y se
    // retira al acabar, garantizando que el sprite recupere su forma normal.
    playCharacterGlitchSound() {
        // `characterGlitch` y `characterFullGlitch` pueden ejecutarse juntos en
        // una misma línea. Este margen conserva un solo golpe de estática en vez
        // de superponer dos copias idénticas y provocar saturación.
        const now = Date.now();
        if (now - (this._lastCharacterGlitchSoundAt || 0) < 160) return;
        this._lastCharacterGlitchSoundAt = now;
        this.playSound('assets/audio/sfx/sfx_estatica.mp3', { volume: 0.72 });
    }

    // Reacción cómica de anime: anticipación, desplome vertical, golpe, pausa y
    // reincorporación. Se programa sin bloquear el diálogo para que el personaje
    // reaccione mientras se escribe la frase que provoca la caída.
    triggerCharacterAnimeFall(characterName, position, options = {}) {
        const characterKey = this.getCharacterKey(characterName);
        const trackedPosition = position || this.characterPositions[characterKey];
        if (!trackedPosition) return;

        const charElement = document.getElementById(`character-${trackedPosition}`);
        if (!charElement || !charElement.classList.contains('active')) return;

        this.clearCharacterAnimeFall(charElement);
        const delay = Math.max(0, Number(options.delay) || 0);
        const duration = Math.max(900, Number(options.duration) || 1800);

        const startFall = () => {
            // El hueco puede haber cambiado de personaje durante el retardo.
            if (!charElement.classList.contains('active') ||
                charElement.dataset.character !== characterKey) return;

            charElement.style.setProperty('--anime-fall-duration', `${duration}ms`);
            void charElement.offsetWidth;
            charElement.classList.add('character-anime-fall');

            this.playSound(
                options.sound || 'assets/audio/sfx/sfx_caida_anime_edu.mp3',
                { volume: options.volume !== undefined ? options.volume : 0.82 }
            );

            charElement._animeFallImpactTimer = setTimeout(() => {
                if (window.Juice) window.Juice.shake(4, 170);
            }, duration * 0.37);
            charElement._animeFallEndTimer = setTimeout(() => {
                this.clearCharacterAnimeFall(charElement);
            }, duration + 80);
        };

        charElement._animeFallStartTimer = setTimeout(startFall, delay);
    }

    clearCharacterAnimeFall(charElement) {
        if (!charElement) return;
        clearTimeout(charElement._animeFallStartTimer);
        clearTimeout(charElement._animeFallImpactTimer);
        clearTimeout(charElement._animeFallEndTimer);
        charElement._animeFallStartTimer = null;
        charElement._animeFallImpactTimer = null;
        charElement._animeFallEndTimer = null;
        charElement.classList.remove('character-anime-fall');
        [
            '--anime-fall-duration'
        ].forEach(property => charElement.style.removeProperty(property));
    }

    triggerCharacterGlitch(characterName, position, duration = 1350) {
        const characterKey = this.getCharacterKey(characterName);
        const trackedPosition = position || this.characterPositions[characterKey];
        if (!trackedPosition) return;
        const charElement = document.getElementById(`character-${trackedPosition}`);
        if (!charElement || !charElement.classList.contains('active')) return;

        this.playCharacterGlitchSound();
        charElement.style.setProperty('--contact-glitch-duration', `${duration}ms`);
        charElement.classList.remove('contact-glitch');
        void charElement.offsetWidth;
        charElement.classList.add('contact-glitch');
        clearTimeout(charElement._contactGlitchTimer);
        charElement._contactGlitchTimer = setTimeout(() => {
            charElement.classList.remove('contact-glitch');
            charElement.style.removeProperty('--contact-glitch-duration');
        }, duration + 80);
    }

    // Segundo golpe de interferencia para el cierre de una llamada: afecta al
    // sprite completo sin sustituir el glitch independiente del retrato.
    triggerCharacterFullGlitch(characterName, position, duration = 1050) {
        const characterKey = this.getCharacterKey(characterName);
        const trackedPosition = position || this.characterPositions[characterKey];
        if (!trackedPosition) return;
        const charElement = document.getElementById(`character-${trackedPosition}`);
        if (!charElement || !charElement.classList.contains('active')) return;

        this.playCharacterGlitchSound();
        charElement.style.setProperty('--full-glitch-duration', `${duration}ms`);
        charElement.classList.remove('full-signal-glitch');
        void charElement.offsetWidth;
        charElement.classList.add('full-signal-glitch');
        clearTimeout(charElement._fullSignalGlitchTimer);
        charElement._fullSignalGlitchTimer = setTimeout(() => {
            charElement.classList.remove('full-signal-glitch');
            charElement.style.removeProperty('--full-glitch-duration');
        }, duration + 80);
    }

    // Interferencia persistente ligada a una sola línea de diálogo. No deforma
    // la escala del personaje: el movimiento y la separación RGB los resuelve
    // CSS mediante capas recortadas. nextLine() la retira justo al avanzar.
    startCharacterGlitchUntilAdvance(characterName, position) {
        const characterKey = this.getCharacterKey(characterName);
        const trackedPosition = position || this.characterPositions[characterKey];
        if (!trackedPosition) return;
        const charElement = document.getElementById(`character-${trackedPosition}`);
        if (!charElement || !charElement.classList.contains('active')) return;

        this.clearAdvanceBoundCharacterEffects();
        this.playCharacterGlitchSound();
        charElement.classList.add('dialogue-glitch-loop');
    }

    clearAdvanceBoundCharacterEffects() {
        document.querySelectorAll('.dialogue-glitch-loop').forEach(element => {
            element.classList.remove('dialogue-glitch-loop');
        });
        for (const [position, entry] of this._characterPoseAnimations) {
            if (entry.untilAdvance) this.stopCharacterPoseAnimation(entry.character, position);
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

    // Limpieza integral de un hueco de personaje. Centralizarla evita que un
    // temporizador de salida/glitch o un vídeo de una escena anterior sobreviva
    // a Retroceder, al selector de escenas o a la reutilización del mismo hueco.
    resetCharacterSlotElement(charElement, position) {
        if (!charElement) return;
        const occupant = charElement.getAttribute('data-character');

        this.clearCharacterAnimeFall(charElement);
        this.stopCharacterPoseAnimation(null, position);
        this.stopCharacterFrameAnimation(position, false);
        if (this.stageCharacters) delete this.stageCharacters[position];

        ['_exitTimer', '_enterTimer', '_poseTransitionTimer', '_contactGlitchTimer', '_fullSignalGlitchTimer']
            .forEach(timerKey => {
                clearTimeout(charElement[timerKey]);
                charElement[timerKey] = null;
            });

        [...charElement.classList]
            .filter(className => className.startsWith('pose-') ||
                className.startsWith('char-enter-') ||
                ['active', 'speaking', 'char-exit-fade', 'contact-glitch',
                    'full-signal-glitch', 'dialogue-glitch-loop'].includes(className))
            .forEach(className => charElement.classList.remove(className));

        charElement.style.backgroundImage = '';
        charElement.style.removeProperty('--contact-glitch-duration');
        charElement.style.removeProperty('--full-glitch-duration');
        charElement.removeAttribute('data-character');
        delete charElement.dataset.pose;
        delete charElement.dataset.poseSrc;
        delete charElement.dataset.frameSrc;
        delete charElement.dataset.poseTransition;
        charElement.querySelectorAll(':scope > .character-pose-ghost').forEach(ghost => ghost.remove());
        charElement.querySelectorAll(':scope > .character-eye-layer').forEach(layer => layer.remove());

        const videoContainer = charElement.querySelector('.character-video-container');
        if (videoContainer) {
            const video = videoContainer.querySelector('video');
            if (video) {
                video.pause();
                video.removeAttribute('src');
                video.load();
            }
            videoContainer.remove();
        }

        if (occupant && this.characterPositions?.[occupant] === position) {
            delete this.characterPositions[occupant];
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
                this.resetCharacterSlotElement(el, pos);
            };
            clearTimeout(el._exitTimer);
            if (exit) {
                // Salida suave: fundido corto y luego limpieza real
                el.classList.add('char-exit-fade');
                el._exitTimer = setTimeout(doClear, 320);
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
        // El azul CSS puro (#0000ff) tiene poca luminancia percibida. Mezclarlo
        // con blanco lo convertía en lavanda (rgb(166,166,255)), alejándose del
        // color declarado. Se traduce a un azul celeste legible y saturado.
        const readableNamedColors = {
            blue: '#4da3ff'
        };
        const inputColor = readableNamedColors[color.trim().toLowerCase()] || color;
        // Resolver cualquier formato CSS a RGB usando el canvas como parser.
        if (!this._colorParser) {
            this._colorParser = document.createElement('canvas').getContext('2d');
        }
        const ctx = this._colorParser;
        ctx.fillStyle = '#000';       // reset (si el color es inválido, queda este)
        ctx.fillStyle = inputColor;
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

    // Factor de volumen del panel de Configuración (0..1, persistido).
    volFactor(kind) {
        const raw = localStorage.getItem(kind === 'music' ? 'illo_vol_music' : 'illo_vol_sfx');
        const v = parseFloat(raw);
        return isNaN(v) ? 1 : Math.max(0, Math.min(1, v));
    }

    // Reaplicar los ajustes de volumen a todo lo que esté sonando (los fades
    // en curso se dejan terminar con su objetivo antiguo; caso raro y breve).
    applyVolumeSettings() {
        const apply = (a) => {
            if (!a || a._baseVol == null || a._fadeInterval) return;
            a.volume = Math.max(0, Math.min(1, a._baseVol * this.volFactor(a._volKind || 'sfx')));
        };
        apply(this.currentMusic);
        for (const id in this.audioInstances) apply(this.audioInstances[id]);
    }

    playSound(soundPath, options = {}) {
        const {
            volume = 1.0,
            loop = false,
            autoPlay = true,
            id = null,
            fadeIn = 0
        } = options;

        // Toda escena declara su propia música para que se pueda saltar directo a
        // ella (petición de José). Eso significa repetir la MISMA pista escena
        // tras escena, así que declararla no puede reiniciarla: si ya suena ese
        // id con esa misma ruta, se deja correr y solo se ajusta el volumen.
        if (id) {
            const sonando = this.audioInstances[id];
            if (sonando && sonando._srcPath === soundPath && !sonando._stopping && !sonando.ended && !sonando.paused) {
                sonando._baseVol = volume;
                sonando.loop = loop;
                if (!sonando._fadeInterval) {
                    const f = this.volFactor(sonando._volKind || 'music');
                    sonando.volume = Math.max(0, Math.min(1, volume * f));
                }
                return sonando;
            }
        }

        const audio = new Audio(soundPath);
        audio._srcPath = soundPath;
        audio.preload = 'auto';
        // Música = bucles y pistas del menú; el resto cuenta como efecto.
        const normalizedSoundPath = String(soundPath || '').replace(/\\/g, '/').toLowerCase();
        const soundId = String(id || '').toLowerCase();
        const isMusic = loop || normalizedSoundPath.includes('/audio/music/') ||
            ['bg_music', 'music'].includes(soundId) || soundId.startsWith('menu');
        const volKind = isMusic ? 'music' : 'sfx';
        audio._baseVol = volume;
        audio._volKind = volKind;
        const factor = this.volFactor(volKind);
        audio.volume = Math.max(0, Math.min(1, volume * factor)); // Clamp 0-1
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

        // Si el navegador no puede cargar o decodificar una pista, no dejar su
        // referencia averiada bloqueando futuros intentos con el mismo ID.
        audio.addEventListener('error', () => {
            console.error(`No se pudo cargar el audio: ${soundPath}`, audio.error || 'error desconocido');
            this.forgetAudio(audio);
        }, { once: true });
        if (!loop) {
            audio.addEventListener('ended', () => this.forgetAudio(audio), { once: true });
        }

        // Fade in si se especifica. El intervalo se guarda en audio._fadeInterval
        // para que un fade-out posterior pueda cancelarlo (evita que dos fades
        // compitan por el volumen del mismo audio).
        if (fadeIn > 0) {
            if (audio._fadeInterval) clearInterval(audio._fadeInterval);
            audio.volume = 0;
            const startTime = Date.now();
            const targetVolume = Math.max(0, Math.min(1, volume * factor));
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

    // Elimina únicamente las referencias que todavía apuntan a este elemento.
    // El audio puede continuar su fade con una referencia local, pero una nueva
    // acción con el mismo ID debe poder crear y arrancar otra pista enseguida.
    forgetAudio(audio) {
        if (!audio) return;
        if (this.currentMusic === audio) this.currentMusic = null;
        for (const [id, instance] of Object.entries(this.audioInstances || {})) {
            if (instance === audio) delete this.audioInstances[id];
        }
    }

    // Desvanece el volumen a 0 en `ms` y luego pausa y rebobina. Cancela
    // cualquier fade anterior sobre el mismo audio (evita intervalos compitiendo
    // por el volumen). Con ms<=0, o si ya está pausado, para de inmediato.
    fadeOutAndStop(audio, ms = 300) {
        if (!audio) return;
        audio._stopping = true;
        this.forgetAudio(audio);
        // Al terminar se libera el src: el elemento descartado no debe seguir
        // reteniendo su conexión de streaming (límite de 6 por host).
        const release = (a) => { try { a.removeAttribute('src'); a.load(); } catch (e) {} };
        if (audio._fadeInterval) { clearInterval(audio._fadeInterval); audio._fadeInterval = null; }
        if (ms <= 0 || audio.paused) {
            try { audio.pause(); audio.currentTime = 0; } catch (e) {}
            release(audio);
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
                release(audio);
            }
        }, 20);
    }

    stopSound(audioOrId, fadeOut = 0) {
        let audio = audioOrId;

        // Si es string, buscar por ID
        if (typeof audioOrId === 'string') {
            audio = this.audioInstances[audioOrId];
            // Parar una cama que todavía no llegó a arrancar es una operación
            // idempotente (pasa al entrar/salir rápido del menú). No ensuciar la
            // consola: los fallos reales de carga ya se notifican en playSound.
            if (!audio) return;
        }

        this.fadeOutAndStop(audio, fadeOut);
    }

    stopAllSounds() {
        // Parar de inmediato cancelando cualquier fade en curso. Además se
        // libera el recurso (src) del elemento: un audio parado que retiene su
        // conexión de streaming cuenta contra el límite de 6 conexiones por
        // host del navegador y puede llegar a bloquear fetches en sesiones
        // largas. Estos elementos nunca se reutilizan (cada playSound crea uno).
        const kill = (a) => {
            if (!a) return;
            if (a._fadeInterval) { clearInterval(a._fadeInterval); a._fadeInterval = null; }
            try { a.pause(); a.currentTime = 0; } catch (e) {}
            try { a.removeAttribute('src'); a.load(); } catch (e) {}
        };
        kill(this.currentMusic);
        this.currentMusic = null;
        for (const id in this.audioInstances) kill(this.audioInstances[id]);
        this.audioInstances = {};
        // También los beds WebAudio de juice.js (heartbeat/rumble): "parar todo"
        // tiene que significar TODO, o un latido huérfano se cuela en la
        // siguiente escena.
        if (window.Juice && Juice.stopAllSfx) Juice.stopAllSfx();
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
            // El volumen pedido es la nueva base; se escala por el ajuste del
            // panel de Configuración según el tipo del audio.
            audio._baseVol = volume;
            const factor = this.volFactor(audio._volKind || 'sfx');
            audio.volume = Math.max(0, Math.min(1, volume * factor));
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

    // Traduce emociones declaradas en una línea (o poses del personaje) a un
    // conjunto pequeño y estable de efectos tipográficos. Los capítulos pueden
    // usar nombres en español o inglés sin acentos ni diferencias de mayúsculas.
    normalizeDialogEmotion(value) {
        if (value === false || value == null) return null;
        const key = String(value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
        const aliases = {
            fear: 'fear', miedo: 'fear', scared: 'fear', afraid: 'fear', terrified: 'fear',
            anger: 'anger', angry: 'anger', agresividad: 'anger', aggressive: 'anger',
            enfado: 'anger', enfadado: 'anger', furia: 'anger', furious: 'anger',
            sadness: 'sadness', sad: 'sadness', tristeza: 'sadness', triste: 'sadness',
            joy: 'joy', alegria: 'joy', alegre: 'joy', felicidad: 'joy',
            surprise: 'surprise', surprised: 'surprise', sorpresa: 'surprise', sorprendido: 'surprise',
            nervous: 'nervous', nervousness: 'nervous', nervios: 'nervous', nervioso: 'nervous',
            whisper: 'whisper', susurro: 'whisper', susurrando: 'whisper',
            scream: 'scream', grito: 'scream', alarido: 'scream', shout: 'scream',
            estridente: 'scream'
        };
        return aliases[key] || null;
    }

    resolveDialogEmotion(line, speakerName) {
        const hasExplicitEmotion = line.emotion !== undefined ||
            line.emocion !== undefined || line.textEffect !== undefined;

        // Las animaciones son momentos de énfasis, no el estado normal del
        // diálogo. Si el JSON no pide ninguna, la línea permanece estática.
        if (line.textAnimation === undefined && !hasExplicitEmotion) {
            return null;
        }

        if (line.textAnimation !== undefined) {
            const animation = line.textAnimation;
            const normalized = String(animation ?? '').toLowerCase().trim();
            if (animation === false || ['none', 'normal', 'neutral', 'ninguna'].includes(normalized)) {
                return null;
            }
            if (animation !== true && normalized !== 'auto') {
                return this.normalizeDialogEmotion(animation);
            }
        }

        if (hasExplicitEmotion) {
            const value = line.emotion ?? line.emocion ?? line.textEffect;
            const normalized = String(value ?? '').toLowerCase().trim();
            if (value === false || ['none', 'normal', 'neutral', 'ninguna'].includes(normalized)) {
                return null;
            }
            // Un valor explícito desconocido no debe activar por accidente el
            // efecto de una pose anterior.
            return this.normalizeDialogEmotion(value);
        }

        const position = this.characterPositions[speakerName];
        const speaker = position && document.getElementById(`character-${position}`);
        if (!speaker || !speaker.classList.contains('active')) return null;

        const pose = speaker.dataset.pose || '';
        const poseEmotions = {
            alarmed: 'fear', worried: 'fear', preocupado: 'fear', scared: 'fear',
            terrified: 'fear', error: 'fear', sospecha: 'fear',
            angry: 'anger', enfadado: 'anger', crazy: 'anger', picado: 'anger',
            aggressive: 'anger', furious: 'anger',
            sad: 'sadness', bua: 'sadness', derrumbe: 'sadness', herido: 'sadness',
            crying: 'sadness',
            contento: 'joy', riendo: 'joy', giggle: 'joy',
            clapping: 'joy', saludando: 'joy',
            surprised: 'surprise', shocked: 'surprise', curious: 'surprise',
            embarrassed: 'nervous'
        };
        return poseEmotions[pose] || null;
    }

    limitRepeatedDialogEmotion(line, requestedEmotion) {
        const emotionCharacter = this.getCharacterKey(line.character);
        const emotionKey = requestedEmotion
            ? `${emotionCharacter}:${requestedEmotion}`
            : null;
        const effectiveEmotion = emotionKey === this._lastDialogEmotionKey
            ? null
            : requestedEmotion;
        this._lastDialogEmotionKey = emotionKey;
        return effectiveEmotion;
    }

    async displayDialog(line) {
        // Actualizar debug panel si está activo
        if (this.debugMode) {
            this.updateDebugPanel();
        }

        const characterName = document.getElementById('character-name');
        const dialogText = document.getElementById('dialog-text');
        const dialogBox = document.getElementById('dialog-box');
        const speakerCursorSlot = document.getElementById('speaker-cursor-slot');
        const speakerCursor = document.getElementById('speaker-cursor');
        const speakerCursorPortrait = document.getElementById('speaker-cursor-portrait');

        characterName.textContent = line.character || '';
        dialogText.textContent = '';
        dialogBox.classList.add('active');

        // Encontrar y aplicar efecto al personaje que habla. Por defecto es el
        // sprite cuyo nombre coincide con line.character, pero se puede forzar
        // otro con "speakingAs" (p. ej. en las llamadas habla "Edu" pero el
        // sprite en pantalla es el móvil "iphone5", que es el que debe resaltarse).
        const identityName = this.getCharacterKey(line.character);
        const speakerName = this.getCharacterKey(line.speakingAs || line.character);
        const speakerPosition = this.characterPositions[speakerName];
        const speakerElement = speakerPosition
            ? document.getElementById(`character-${speakerPosition}`)
            : null;
        const identityPosition = this.characterPositions[identityName];
        const portraitElement = identityPosition
            ? document.getElementById(`character-${identityPosition}`)
            : null;
        const humanPortrait = this.humanDialogPortrait(identityName);
        const useHumanPortrait = Boolean(
            humanPortrait && !this.isFurryIdentityRevealed(identityName)
        );
        const requestedDialogEmotion = this.resolveDialogEmotion(line, speakerName);
        const dialogEmotion = this.limitRepeatedDialogEmotion(line, requestedDialogEmotion);
        const emotionClasses = [
            'fear', 'anger', 'sadness', 'joy', 'surprise', 'nervous', 'whisper', 'scream'
        ].map(emotion => `dialog-emotion-${emotion}`);
        dialogText.classList.remove(...emotionClasses);
        if (dialogEmotion) dialogText.classList.add(`dialog-emotion-${dialogEmotion}`);
        if (speakerCursor) {
            if (speakerCursor._returnTimer) {
                clearTimeout(speakerCursor._returnTimer);
                speakerCursor._returnTimer = null;
            }
            speakerCursor.classList.remove(
                'is-typing', 'is-waiting', 'is-following-text',
                'is-returning', 'has-portrait', 'uses-human-portrait'
            );
            speakerCursor.style.removeProperty('--cursor-follow-x');
            speakerCursor.style.removeProperty('--cursor-follow-y');
            speakerCursor.dataset.character = identityName || 'unknown';
            delete speakerCursor.dataset.pose;
        }
        if (speakerCursorPortrait) speakerCursorPortrait.style.backgroundImage = '';

        // Nombre del hablante en SU color (identidad + reconocimiento inmediato).
        // Si sus datos aún no están cargados (habla sin sprite en pantalla), se
        // cargan en segundo plano y se aplica el color al llegar, salvo que ya
        // haya cambiado el hablante.
        const applySpeakerIdentity = (data) => {
            const speakerColor = this.readableNameColor(data && data.color);
            characterName.style.color = speakerColor;
            dialogText.style.setProperty('--dialog-emotion-color', speakerColor);
            if (speakerCursor) speakerCursor.style.setProperty('--speaker-color', speakerColor);

            if (!speakerCursorPortrait) return;
            if (speakerCursor) {
                speakerCursor.dataset.pose = portraitElement?.dataset.pose
                    || (data && data.defaultPose)
                    || 'neutral';
            }
            let portraitImage = useHumanPortrait
                ? `url('${this.cacheBustAsset(humanPortrait)}')`
                : (portraitElement?.style.backgroundImage || '');
            if (!portraitImage || portraitImage === 'none') {
                const poses = data && data.poses;
                const defaultPose = data && data.defaultPose;
                const fallbackPose = poses && (
                    (defaultPose && poses[defaultPose] && defaultPose) ||
                    (poses.neutral && 'neutral') ||
                    Object.keys(poses)[0]
                );
                const portraitPath = fallbackPose
                    ? this.getCharacterPoseImage(data, fallbackPose)
                    : null;
                if (portraitPath) {
                    portraitImage = `url('${this.cacheBustAsset(portraitPath)}')`;
                }
            }
            speakerCursorPortrait.style.backgroundImage = portraitImage;
            speakerCursor?.classList.toggle('has-portrait', !!portraitImage);
            speakerCursor?.classList.toggle('uses-human-portrait', useHumanPortrait);
        };
        const spData = this.characters[identityName];
        if (spData) {
            applySpeakerIdentity(spData);
        } else if (this._charColorMissing.has(identityName) || !/[a-z0-9]/.test(identityName)) {
            // Sin ficha conocida o clave sin letras (p. ej. hablante misterioso "???"):
            // dorado por defecto y sin pedir ficha al servidor.
            applySpeakerIdentity(null);
        } else {
            applySpeakerIdentity(null); // dorado por defecto mientras carga
            const nm = line.character;
            this.loadCharacter(identityName)
                .then(d => {
                    if (d) { if (characterName.textContent === nm) applySpeakerIdentity(d); }
                    else { this._charColorMissing.add(identityName); }
                })
                .catch(() => { this._charColorMissing.add(identityName); });
        }

        // Limpiar el estado "speaking" de TODOS los huecos (incluido center,
        // que antes se olvidaba: por eso el del centro no se apagaba al hablar otro).
        ['left', 'center', 'right'].forEach(pos => {
            const elem = document.getElementById(`character-${pos}`);
            if (elem) elem.classList.remove('speaking');
        });

        // Buscar la posición del personaje que habla usando el rastreo
        const charactersContainer = document.getElementById('characters-container');
        let speakerOnScreen = false;

        if (speakerPosition) {
            // No exigimos 'active': si el sprite aún está entrando/cargando en
            // este mismo instante, la clase llega un frame tarde y el resaltado
            // se saltaba "a veces" (bug reportado por Betanzos). El rastreo de
            // characterPositions ya garantiza que ahí hay un personaje.
            if (speakerElement) {
                speakerElement.classList.add('speaking');
                this.speakingCharacter = speakerName;
                this.speakingPosition = speakerPosition;
                speakerOnScreen = true;
            }
        }

        // Con hablante EN PANTALLA: él iluminado y el resto en gris. Durante la
        // narración (3C) o voces sin sprite ("???", off-screen): TODOS en gris
        // (petición de Betanzos — antes nadie se apagaba al narrar y parecía
        // que "se iluminaban todos").
        if (charactersContainer) {
            charactersContainer.classList.add('has-speaker');
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
            let timeoutId = null;
            let finished = false;
            let cursorMoveFrame = null;
            const printAnchor = document.createElement('span');
            printAnchor.className = 'dialog-print-anchor';

            // Escribir por grafemas evita partir emojis o caracteres compuestos.
            const segmenter = typeof Intl.Segmenter === 'function'
                ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
                : null;
            const splitText = (value) => segmenter
                ? Array.from(segmenter.segment(value), part => part.segment)
                : Array.from(value);
            let textOffset = 0;
            const typingUnits = splitText(text).map(value => {
                textOffset += value.length;
                return { value, end: textOffset };
            });

            // Marcas con color dentro del diálogo. Se construyen con nodos de
            // texto (no innerHTML) para que el contenido de los capítulos siga
            // siendo seguro y compatible con el efecto de escritura.
            const brandRanges = [];
            const brandPattern = /\b(OMG|CLos|Incel|Simsong)\b/g;
            let brandMatch;
            while ((brandMatch = brandPattern.exec(text)) !== null) {
                brandRanges.push({
                    start: brandMatch.index,
                    end: brandMatch.index + brandMatch[0].length,
                    className: brandMatch[0] === 'OMG'
                        ? 'dialog-brand-omg'
                        : brandMatch[0] === 'CLos'
                        ? 'dialog-brand-clos'
                        : brandMatch[0] === 'Incel'
                        ? 'dialog-brand-incel'
                        : 'dialog-brand-simsong'
                });
            }

            // Se añade solo el fragmento nuevo. Reconstruir todos los spans en
            // cada pulsación reiniciaba sus animaciones con cada carácter.
            dialogText.replaceChildren();
            let renderedLength = 0;
            let letterIndex = 0;

            const followCursorToAnchor = () => {
                if (!speakerCursor || !speakerCursorSlot || !printAnchor.isConnected) return;
                if (cursorMoveFrame) cancelAnimationFrame(cursorMoveFrame);
                cursorMoveFrame = requestAnimationFrame(() => {
                    cursorMoveFrame = null;
                    if (!printAnchor.isConnected || finished) return;
                    const anchorRect = printAnchor.getBoundingClientRect();
                    // El hueco fijo del encabezado no se transforma con el marco:
                    // es una referencia estable incluso cuando el bocadillo crece
                    // hacia arriba o cambia de lÃ­nea durante la escritura.
                    const cursorHomeRect = speakerCursorSlot.getBoundingClientRect();
                    const layoutScaleX = cursorHomeRect.width / (speakerCursorSlot.offsetWidth || 58);
                    const layoutScaleY = cursorHomeRect.height / (speakerCursorSlot.offsetHeight || 58);
                    const targetX = anchorRect.left + 18;
                    const targetY = anchorRect.top + (anchorRect.height / 2);
                    const homeX = cursorHomeRect.left + (cursorHomeRect.width / 2);
                    const homeY = cursorHomeRect.top + (cursorHomeRect.height / 2);
                    speakerCursor.style.setProperty(
                        '--cursor-follow-x',
                        `${(targetX - homeX) / (layoutScaleX || 1)}px`
                    );
                    speakerCursor.style.setProperty(
                        '--cursor-follow-y',
                        `${(targetY - homeY) / (layoutScaleY || 1)}px`
                    );
                    speakerCursor.classList.remove('is-returning', 'is-waiting');
                    speakerCursor.classList.add('is-following-text');
                });
            };

            const returnCursorHome = () => {
                if (!speakerCursor) return;
                if (cursorMoveFrame) {
                    cancelAnimationFrame(cursorMoveFrame);
                    cursorMoveFrame = null;
                }
                printAnchor.remove();
                speakerCursor.classList.remove('is-following-text', 'is-typing', 'is-waiting');
                speakerCursor.classList.add('is-returning');
                if (speakerCursor._returnTimer) clearTimeout(speakerCursor._returnTimer);
                speakerCursor._returnTimer = setTimeout(() => {
                    speakerCursor._returnTimer = null;
                    if (!speakerCursor.classList.contains('is-typing')) {
                        speakerCursor.classList.remove('is-returning');
                        speakerCursor.classList.add('is-waiting');
                        speakerCursor.style.removeProperty('--cursor-follow-x');
                        speakerCursor.style.removeProperty('--cursor-follow-y');
                    }
                }, 280);
            };

            const appendText = (parent, value) => {
                if (!dialogEmotion) {
                    const last = parent.lastChild;
                    if (last && last.nodeType === 3) last.textContent += value;
                    else parent.append(document.createTextNode(value));
                    return parent;
                }
                for (const character of splitText(value)) {
                    if (/^\s+$/u.test(character)) {
                        const last = parent.lastChild;
                        if (last && last.nodeType === 3) last.textContent += character;
                        else parent.append(document.createTextNode(character));
                    } else {
                        const letter = document.createElement('span');
                        letter.className = 'dialog-letter';
                        letter.style.setProperty('--letter-delay', `${-(letterIndex % 14) * 0.035}s`);
                        if (dialogEmotion === 'scream') {
                            const progress = typingUnits.length > 1
                                ? letterIndex / (typingUnits.length - 1)
                                : 1;
                            // Crecimiento en curva: el inicio permanece pequeño y
                            // el final explota hasta casi llenar la caja de diálogo.
                            const fontSize = 12 + 56 * Math.pow(progress, 2.05);
                            letter.style.setProperty('--scream-font-size', `${fontSize.toFixed(2)}px`);
                        }
                        letter.textContent = character;
                        parent.append(letter);
                    }
                    letterIndex++;
                }
                return parent;
            };

            const appendUntil = (length) => {
                printAnchor.remove();
                let cursor = renderedLength;
                let cursorParent = dialogText;
                while (cursor < length) {
                    const brand = brandRanges.find(range =>
                        cursor >= range.start && cursor < range.end
                    );
                    if (brand) {
                        if (!brand.element) {
                            brand.element = document.createElement('span');
                            brand.element.className = brand.className;
                            dialogText.append(brand.element);
                        }
                        const end = Math.min(length, brand.end);
                        cursorParent = appendText(brand.element, text.slice(cursor, end));
                        cursor = end;
                        continue;
                    }

                    const nextBrand = brandRanges.find(range => range.start > cursor);
                    const end = Math.min(length, nextBrand ? nextBrand.start : length);
                    cursorParent = appendText(dialogText, text.slice(cursor, end));
                    cursor = end;
                }
                renderedLength = length;
                if (!finished && length > 0) {
                    cursorParent.append(printAnchor);
                    followCursorToAnchor();
                }
            };

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                if (cursorMoveFrame) {
                    cancelAnimationFrame(cursorMoveFrame);
                    cursorMoveFrame = null;
                }
                document.removeEventListener('click', skipHandler);
                if (this._finishTyping === finishTyping) {
                    this._finishTyping = null;
                }
            };

            const finishTyping = () => {
                if (finished) return;
                finished = true;
                cleanup();
                appendUntil(text.length);
                returnCursorHome();
                this.isWaitingForInput = true;
                resolve();
            };

            const typeChar = () => {
                if (this.fastForward) {
                    finishTyping();
                    return;
                }

                if (charIndex < typingUnits.length) {
                    const unit = typingUnits[charIndex];
                    const ch = unit.value;
                    charIndex++;
                    appendUntil(unit.end);
                    // Blip por letra (tono según el que habla) y pausa extra en la
                    // puntuación para dar ritmo al texto.
                    let delay = this.typingSpeed * speedMult;
                    if (window.Juice) {
                        if (localStorage.getItem('illo_text_blip') !== '0') {
                            window.Juice.blip(ch, speakerName);
                        }
                        delay += window.Juice.punctuationPause(ch);
                    }
                    timeoutId = setTimeout(typeChar, delay);
                } else {
                    finishTyping();
                }
            };

            const skipHandler = (event) => {
                // Clic derecho alterna el HUD y no debe completar el tecleo.
                if (event && event.button !== 0) return;
                finishTyping();
            };

            document.addEventListener('click', skipHandler);
            this._finishTyping = finishTyping;
            speakerCursor?.classList.add('is-typing');

            if (this.fastForward) {
                finishTyping();
            } else {
                typeChar();
            }
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
            // Se guarda el resolvedor para poder ABORTAR la elección desde fuera
            // (menú de escenas / retroceder). Sin esto, una pantalla de elección
            // deja el bucle esperando para siempre y no hay manera de salir de
            // ella salvo eligiendo.
            this._abortarEleccion = () => {
                this._abortarEleccion = null;
                choicesContainer.classList.remove('active');
                choicesContainer.innerHTML = '';
                resolve(null);
            };
            availableChoices.forEach((choice, index) => {
                const button = document.createElement('button');
                button.className = 'choice-btn';
                button.innerHTML = `
                    <span>${choice.text}</span>
                `;
                button.style.animationDelay = `${index * 0.1}s`;
                button.onclick = () => {
                    this._abortarEleccion = null;
                    choicesContainer.classList.remove('active');
                    // Vaciar YA: si no, los botones quedan invisibles (opacity 0)
                    // pero vivos con z-index 101 robando el cursor.
                    choicesContainer.innerHTML = '';
                    resolve(choice);
                };
                choicesContainer.appendChild(button);
            });
        });
    }

    // ¿Hay una elección esperando respuesta? La usa el menú de escenas para
    // saber si tiene que abortarla antes de saltar.
    hayEleccionAbierta() {
        return typeof this._abortarEleccion === 'function';
    }

    abortarEleccion() {
        if (this._abortarEleccion) this._abortarEleccion();
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
        // Los efectos declarados «hasta avanzar» sobreviven al tipeo y a la
        // espera del jugador, pero desaparecen antes de ejecutar la línea nueva.
        this.clearAdvanceBoundCharacterEffects();
        const scene = this.getCurrentScene();
        if (!scene || !scene.lines) return false;

        // Guardar el progreso al pisar una escena nueva (para poder retroceder)
        this.recordSceneEntry();

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

        // A estas alturas cualquier salto de escena ya está aplicado; si el flag
        // quedara colgado (p. ej. un jumpToScene externo), abortaría la cadena
        // de acciones de ESTA línea tras la primera acción. Limpiarlo siempre.
        this.pendingSceneJump = false;

        // Ejecutar acciones previas al diálogo. Un goToScene puede convivir con
        // texto en la misma línea: el destino queda preparado, pero la frase
        // actual todavía debe mostrarse antes de entrar en él.
        let jumpedDuringActions = false;
        if (line.actions) {
            for (let action of line.actions) {
                await this.executeAction(action);
                // Si una acción solicitó saltar de escena, detener el
                // procesamiento de esta línea y continuar en el nuevo destino.
                if (this.pendingSceneJump) {
                    this.pendingSceneJump = false;
                    jumpedDuringActions = true;
                    break;
                }
            }
        }

        // Mostrar diálogo si existe (con posible variante por consecuencia)
        if (line.text) {
            await this.displayDialog(this.resolveConsequenceLine(line));
        }

        // jumpToScene ya dejó currentScene/currentLine apuntando al destino. Si
        // además había diálogo, el bucle esperará el clic normal antes de pedir
        // la línea 0 de la escena nueva; si no lo había, continuará al instante.
        if (jumpedDuringActions) return true;

        // Acciones que deben ocurrir justo cuando termina de escribirse el
        // diálogo. A diferencia de un `delay` fijo, también quedan sincronizadas
        // si el jugador completa la frase con un clic o usa avance rápido.
        if (line.afterActions) {
            for (let action of line.afterActions) {
                await this.executeAction(action);
                if (this.pendingSceneJump) {
                    this.pendingSceneJump = false;
                    return true;
                }
            }
        }

        // Si hay elecciones, mostrarlas
        if (line.choices) {
            const selectedChoice = await this.displayChoices(line.choices);
            // null = la elección se abortó desde fuera (se pidió ir a otra
            // escena). No se elige nada ni se avanza: se devuelve el control al
            // bucle, que atenderá el salto que hay pendiente.
            if (!selectedChoice) return true;
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
        const speakerCursor = document.getElementById('speaker-cursor');

        dialogBox.classList.remove('active');
        if (characterName) characterName.textContent = '';
        if (dialogText) dialogText.textContent = '';
        if (speakerCursor) {
            if (speakerCursor._returnTimer) {
                clearTimeout(speakerCursor._returnTimer);
                speakerCursor._returnTimer = null;
            }
            speakerCursor.classList.remove(
                'is-typing', 'is-waiting', 'is-following-text', 'is-returning'
            );
            speakerCursor.style.removeProperty('--cursor-follow-x');
            speakerCursor.style.removeProperty('--cursor-follow-y');
        }
        this.isWaitingForInput = false;
    }

    // ============================================================
    // RETROCEDER a la escena anterior (pedido en la demo del 25-jul-2026)
    // ------------------------------------------------------------
    // La escena es la unidad narrativa, así que se retrocede al PRINCIPIO de la
    // escena anterior y se la deja volver a ejecutarse entera: sus acciones
    // vuelven a poner el fondo, los personajes, la música y los efectos. Por eso
    // hay que limpiar antes el escenario (si no, se quedan encima los restos de
    // la escena de la que venimos) y devolver el progreso al estado que tenía al
    // entrar en aquella escena (si no, cosas como "rescatado" o el inventario se
    // contarían dos veces al repetirla).
    // ============================================================

    // Foto del progreso al entrar en una escena. Se llama desde nextLine().
    captureSceneStageState() {
        const audio = Object.entries(this.audioInstances || {})
            .filter(([, instance]) => instance && !instance._stopping && !instance.ended)
            .map(([id, instance]) => ({
                id,
                path: instance._srcPath,
                volume: instance._baseVol != null ? instance._baseVol : 1,
                loop: !!instance.loop
            }))
            .filter(item => item.path);
        return {
            background: this.currentBackgroundPath,
            characters: JSON.parse(JSON.stringify(this.stageCharacters || {})),
            audio,
            juice: window.Juice && typeof window.Juice.snapshot === 'function'
                ? window.Juice.snapshot()
                : null
        };
    }

    restoreSceneStageState(snapshot) {
        if (!snapshot) return;
        if (snapshot.background) this.setBackground(snapshot.background, { cut: true });
        for (const [position, visual] of Object.entries(snapshot.characters || {})) {
            if (!visual || !visual.character) continue;
            this.showCharacter(
                visual.character,
                position,
                visual.pose || 'neutral',
                !!visual.flipped
            );
        }
        for (const sound of snapshot.audio || []) {
            this.playSound(sound.path, {
                id: sound.id,
                volume: sound.volume,
                loop: sound.loop,
                fadeIn: 180
            });
        }
        if (snapshot.juice && window.Juice && typeof window.Juice.restore === 'function') {
            window.Juice.restore(snapshot.juice);
        }
    }

    recordSceneEntry() {
        if (!this.currentChapter) return;
        if (this._lastSeenScene === this.currentScene) return;
        this._lastSeenScene = this.currentScene;
        this.sceneHistory = this.sceneHistory || [];
        this.sceneHistory.push({
            chapter: this.lastChapterName,
            scene: this.currentScene,
            gameState: JSON.parse(JSON.stringify(this.gameState || {})),
            rescued: [...this.rescued],
            completedCalls: [...this.completedCalls],
            inventory: [...this.inventory],
            storyDelay: this.storyDelay,
            storyPressure: this.storyPressure,
            stage: this.captureSceneStageState(),
            nextChapter: this.nextChapter
        });
        // No hace falta guardar el capítulo entero: con 40 escenas vamos sobrados
        if (this.sceneHistory.length > 60) this.sceneHistory.shift();
    }

    // ¿Hay algo a lo que volver? (el botón se oculta si no)
    canRewind() {
        return !!(this.currentChapter && this.sceneHistory && this.sceneHistory.length > 1);
    }

    // Deja el escenario en blanco sin tocar el progreso de la partida.
    clearStage() {
        this.stopAllSounds();
        this.hideDialog();

        ['character-left', 'character-right', 'character-center'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                this.resetCharacterSlotElement(el, id.replace('character-', ''));
            }
        });
        for (const [position, entry] of this._characterPoseAnimations) {
            clearTimeout(entry.timer);
            this._characterPoseAnimations.delete(position);
        }
        for (const position of [...this._characterFrameAnimations.keys()]) {
            this.stopCharacterFrameAnimation(position, false);
        }
        const cont = document.getElementById('characters-container');
        if (cont) cont.classList.remove('has-speaker');
        this.characterPositions = {};
        this.stageCharacters = {};
        this.speakingCharacter = null;
        this.speakingPosition = null;

        if (window.Juice) window.Juice.reset();
        this.hideCG?.();

        const bg = document.getElementById('background');
        if (bg) bg.style.backgroundImage = '';
        this.currentBackgroundPath = null;

        // El fondo se cambia con CROSSFADE usando una segunda capa: se pinta en
        // `background-b`, se sube su opacidad y 460 ms después un temporizador
        // copia la imagen a la capa A y vuelve a esconder la B. Si se limpia el
        // escenario en mitad de ese fundido (saltar de escena, retroceder), la
        // capa B se quedaba ENCIMA con la imagen vieja y, peor aún, el
        // temporizador pendiente disparaba después y reescribía en la capa A el
        // fondo de la escena anterior: a partir de ahí ninguna escena parecía
        // cargar su fondo. Hay que cortar las dos cosas.
        clearTimeout(this._bgSwapTimer);
        this._bgSwapTimer = null;
        const bgB = document.getElementById('background-b');
        if (bgB) {
            bgB.style.transition = 'none';
            bgB.style.opacity = '0';
            bgB.style.backgroundImage = '';
        }

        // Y el telón negro de los fundidos. Va en z-index 60: tapa fondo y
        // personajes pero deja ver el diálogo. Si se sale de una escena entre un
        // "fade to black" y su "fade from black", se queda BAJADO para siempre:
        // la escena siguiente carga bien —fondo, personajes, música— pero no se
        // ve nada, solo la caja de diálogo sobre negro. Era esto lo que hacía
        // que a partir de cierto salto todo pareciera no cargar.
        const fader = document.getElementById('scene-fader');
        if (fader) {
            fader.style.transition = 'none';
            fader.style.opacity = '0';
            fader.style.pointerEvents = 'none';
        }

        const choices = document.getElementById('choices-container');
        if (choices) { choices.classList.remove('active'); choices.innerHTML = ''; }
    }

    // Vuelve al principio de la escena anterior dejándolo todo como estaba.
    rewindToPreviousScene() {
        if (!this.canRewind()) return false;

        this.sceneHistory.pop();                       // la escena en la que estamos
        const destino = this.sceneHistory[this.sceneHistory.length - 1];
        if (!destino) return false;

        this.gameState = JSON.parse(JSON.stringify(destino.gameState || {}));
        this.rescued = [...destino.rescued];
        this.completedCalls = [...destino.completedCalls];
        this.inventory = [...destino.inventory];
        this.storyDelay = destino.storyDelay;
        this.storyPressure = destino.storyPressure != null
            ? destino.storyPressure
            : destino.storyDelay;
        this.nextChapter = destino.nextChapter;

        this.clearStage();
        this.restoreSceneStageState(destino.stage);

        this.currentScene = destino.scene;
        this.currentLine = 0;
        this.sceneEndedByChoice = false;
        this.pendingSceneJump = false;
        // Volver a marcarla como "no vista" para que recordSceneEntry la
        // registre otra vez al reproducirla.
        this._lastSeenScene = null;
        this.sceneHistory.pop();

        this.updateDebugPanel();
        return true;
    }

    // Escenas del capítulo actual, para pintar el menú de selección.
    sceneList() {
        if (!this.currentChapter) return [];
        const hist = this.sceneHistory || [];
        return (this.currentChapter.scenes || [])
            .map((s, i) => ({
                index: i,
                title: s.title || `Escena ${i + 1}`,
                actual: i === this.currentScene,
                visitada: hist.some(h => h.scene === i)
            }))
            .filter(scene => this.debugMode || scene.actual || scene.visitada);
    }

    chapterTitle() {
        return (this.currentChapter && this.currentChapter.title) || this.lastChapterName || '';
    }

    // Salta directo al principio de cualquier escena del capítulo (menú de
    // escenas pedido por José). Si ya habíamos pasado por ella se recupera la
    // foto de progreso de aquel momento, igual que al retroceder; si es una a
    // la que todavía no habíamos llegado se conserva el progreso actual y solo
    // cambiamos de sitio. El repintado lo hacen las propias acciones de la
    // escena: por eso TODAS declaran su fondo y su música en la primera línea.
    // OJO CON EL NOMBRE: `jumpToScene` YA EXISTE arriba en esta misma clase
    // (es el que atiende la acción `goToScene` de los capítulos). Llamando
    // igual a los dos, el segundo pisaba al primero y TODAS las transiciones
    // entre escenas del juego acababan aquí: limpiaban el escenario, no
    // marcaban `pendingSceneJump` y se saltaban la línea 0 de la escena
    // destino, que es justo la que pone el fondo. De ahí las pantallas negras.
    saltarAEscena(destino) {
        if (!this.currentChapter) return false;
        const escenas = this.currentChapter.scenes || [];
        const i = (typeof destino === 'string')
            ? escenas.findIndex(s => s.title === destino)
            : destino;
        if (!(i >= 0 && i < escenas.length)) {
            console.warn('saltarAEscena: escena no encontrada:', destino);
            return false;
        }

        const hist = this.sceneHistory || [];
        let restoredStage = null;
        for (let k = hist.length - 1; k >= 0; k--) {
            if (hist[k].scene !== i) continue;
            const d = hist[k];
            this.gameState = JSON.parse(JSON.stringify(d.gameState || {}));
            this.rescued = [...d.rescued];
            this.completedCalls = [...d.completedCalls];
            this.inventory = [...d.inventory];
            this.storyDelay = d.storyDelay;
            this.storyPressure = d.storyPressure != null ? d.storyPressure : d.storyDelay;
            this.nextChapter = d.nextChapter;
            restoredStage = d.stage || null;
            // Se recorta el historial hasta ahí: la escena se vuelve a registrar
            // sola al entrar, y así retroceder sigue teniendo sentido después.
            this.sceneHistory = hist.slice(0, k);
            break;
        }

        this.clearStage();
        this.restoreSceneStageState(restoredStage);
        this.currentScene = i;
        this.currentLine = 0;
        this.sceneEndedByChoice = false;
        this.pendingSceneJump = false;
        this._lastSeenScene = null;
        this.updateDebugPanel();
        return true;
    }

    reset() {
        this.currentScene = 0;
        this.currentLine = 0;
        this.gameState = {};
        this.history = [];
        this.sceneHistory = [];
        this._lastSeenScene = null;
        this.lastChapterName = null;
        this.speakingCharacter = null;
        this.speakingPosition = null;
        this.characterPositions = {};
        this.stageCharacters = {};
        this.currentBackgroundPath = null;
        this.sceneEndedByChoice = false;
        // Nota: completedCalls NO se limpia aquí; debe persistir entre capítulos
        // igual que rescued, para que la regla de llamadas funcione al final de
        // cada Capítulo 2. Se limpia solo al empezar una partida nueva.
        // storyDelay/storyPressure persisten entre capítulos. startNewGame es
        // quien los limpia; reset también se usa durante el encadenado normal.
        this.pendingSceneJump = false;

        // Detener todos los sonidos
        this.stopAllSounds();

        // Limpiar la interfaz visual
        this.hideDialog();

        // Limpiar personajes
        const leftChar = document.getElementById('character-left');
        const rightChar = document.getElementById('character-right');
        const centerChar = document.getElementById('character-center');

        for (const [position, entry] of this._characterPoseAnimations) {
            clearTimeout(entry.timer);
            this._characterPoseAnimations.delete(position);
        }
        for (const position of [...this._characterFrameAnimations.keys()]) {
            this.stopCharacterFrameAnimation(position, false);
        }

        if (leftChar) this.resetCharacterSlotElement(leftChar, 'left');
        if (rightChar) this.resetCharacterSlotElement(rightChar, 'right');
        if (centerChar) this.resetCharacterSlotElement(centerChar, 'center');
        const charactersContainer = document.getElementById('characters-container');
        if (charactersContainer) charactersContainer.classList.remove('has-speaker');

        // Limpiar efectos de juice (tinte, viñeta, shake)
        if (window.Juice) window.Juice.reset();

        // Limpiar fondo
        const bg = document.getElementById('background');
        if (bg) bg.style.backgroundImage = '';

        if (this._bgSwapTimer) {
            clearTimeout(this._bgSwapTimer);
            this._bgSwapTimer = null;
        }

        const secondaryBg = document.getElementById('background-b');
        if (secondaryBg) {
            secondaryBg.style.transition = 'none';
            secondaryBg.style.opacity = '0';
            secondaryBg.style.backgroundImage = '';
        }

        const cgLayer = document.getElementById('cg-layer');
        if (cgLayer) {
            cgLayer.style.transition = 'none';
            cgLayer.style.opacity = '0';
            cgLayer.style.backgroundImage = '';
            cgLayer.style.boxShadow = '';
            cgLayer.classList.remove('cg-visible');
        }

        const sceneFader = document.getElementById('scene-fader');
        if (sceneFader) {
            sceneFader.style.transition = 'none';
            sceneFader.style.opacity = '0';
        }

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
                continueBtn.disabled = true;
                endOverlay.classList.add('is-transition-curtain');
                endOverlay.replaceChildren();
                resolve(endOverlay);
            });
        });
    }
}
