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
                this.hideCharacter(action.character);
                break;
            case 'setPose':
                this.setPose(action.character, action.position, action.pose);
                break;
            case 'setVariable':
                this.gameState[action.variable] = action.value;
                break;
            case 'playSound':
                this.playSound(action.value);
                break;
            case 'wait':
                await this.wait(action.value);
                break;
        }
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

    hideCharacter(characterName) {
        const leftChar = document.getElementById('character-left');
        const rightChar = document.getElementById('character-right');
        const centerChar = document.getElementById('character-center');

        if (leftChar && leftChar.style.backgroundImage.includes(this.characters[characterName]?.image)) {
            leftChar.classList.remove('active');
        }
        if (rightChar && rightChar.style.backgroundImage.includes(this.characters[characterName]?.image)) {
            rightChar.classList.remove('active');
        }
        if (centerChar && centerChar.style.backgroundImage.includes(this.characters[characterName]?.image)) {
            centerChar.classList.remove('active');
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

    playSound(soundPath) {
        const audio = new Audio(soundPath);
        audio.play().catch(e => console.log('Error reproduciendo sonido:', e));
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

        // Encontrar y aplicar efecto al personaje que habla
        const speakerName = line.character?.toLowerCase() || '';

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

    async displayChoices(choices) {
        const choicesContainer = document.getElementById('choices-container');
        choicesContainer.innerHTML = '';
        choicesContainer.classList.add('active');

        return new Promise(resolve => {
            choices.forEach((choice, index) => {
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
            }
        }

        // Mostrar diálogo si existe
        if (line.text) {
            await this.displayDialog(line);
        }

        // Si hay elecciones, mostrarlas
        if (line.choices) {
            const selectedChoice = await this.displayChoices(line.choices);
            this.history.push({
                scene: this.currentScene,
                line: this.currentLine,
                choice: selectedChoice.text
            });

            // Ir a la escena/línea correspondiente
            if (selectedChoice.nextScene !== undefined) {
                this.currentScene = selectedChoice.nextScene;
                this.currentLine = 0;
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
