/**
 * Efectos visuales y sonoros estilo Persona 5
 */

class Persona5Effects {
    constructor() {
        this.isInitialized = false;
        this.soundEnabled = true;
    }

    initialize() {
        if (this.isInitialized) return;
        this.createStyleSheet();
        this.isInitialized = true;
    }

    createStyleSheet() {
        const style = document.createElement('style');
        style.textContent = `
            /* Efectos de selección */
            @keyframes p5-selection-pulse {
                0%, 100% {
                    box-shadow: 0 0 10px rgba(255, 204, 0, 0.6);
                }
                50% {
                    box-shadow: 0 0 20px rgba(255, 204, 0, 1), 0 0 30px rgba(255, 23, 68, 0.5);
                }
            }

            .p5-selected {
                animation: p5-selection-pulse 0.4s infinite !important;
            }

            /* Efecto de desvanecimiento */
            @keyframes p5-fade-blur {
                0% { opacity: 1; filter: blur(0); }
                100% { opacity: 0; filter: blur(5px); }
            }

            .p5-fade-out {
                animation: p5-fade-blur 0.4s ease-out forwards;
            }

            /* Efecto de entrada */
            @keyframes p5-slide-in {
                from {
                    opacity: 0;
                    transform: translateX(-30px) skewY(2deg);
                }
                to {
                    opacity: 1;
                    transform: translateX(0) skewY(0deg);
                }
            }

            .p5-slide-in {
                animation: p5-slide-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }

            /* Efecto de impacto */
            @keyframes p5-impact {
                0% { transform: scale(0.95); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }

            .p5-impact {
                animation: p5-impact 0.3s ease-out;
            }

            /* Efecto de brillo */
            @keyframes p5-glow {
                0%, 100% {
                    text-shadow: 0 0 5px rgba(255, 204, 0, 0.4);
                }
                50% {
                    text-shadow: 0 0 15px rgba(255, 204, 0, 0.9), 0 0 25px rgba(255, 23, 68, 0.6);
                }
            }

            .p5-glow {
                animation: p5-glow 0.6s ease-in-out infinite;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Efecto de selección en un botón
     */
    highlightChoice(element) {
        element.classList.add('p5-selected');
    }

    /**
     * Remover efecto de selección
     */
    unhighlightChoice(element) {
        element.classList.remove('p5-selected');
    }

    /**
     * Efecto de aparición de texto con destellos
     */
    spanText(text) {
        const spans = text.split('').map(char => {
            const span = document.createElement('span');
            span.textContent = char;
            span.style.display = 'inline-block';
            span.style.opacity = '0';
            span.style.animation = `fadeIn 0.1s ease-out forwards`;
            return span;
        });
        return spans;
    }

    /**
     * Efecto de cambio de escena con transición
     */
    async transitionScene(duration = 600) {
        const container = document.getElementById('game-container');
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            opacity: 0;
            z-index: 999;
            transition: opacity ${duration / 2}ms ease;
        `;
        container.appendChild(overlay);

        return new Promise(resolve => {
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                setTimeout(() => {
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        overlay.remove();
                        resolve();
                    }, duration / 2);
                }, duration / 2);
            });
        });
    }

    /**
     * Efecto de impacto visual al presionar un botón
     */
    buttonPress(element) {
        element.classList.add('p5-impact');
        this.playSound('impact');
        setTimeout(() => {
            element.classList.remove('p5-impact');
        }, 300);
    }

    /**
     * Efecto de ondas de choque
     */
    shockwave(x, y) {
        const container = document.getElementById('game-container');
        const wave = document.createElement('div');
        wave.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: 20px;
            height: 20px;
            border: 2px solid #ffcc00;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            animation: p5-shockwave 0.6s ease-out forwards;
            box-shadow: 0 0 10px rgba(255, 204, 0, 0.6);
        `;
        container.appendChild(wave);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes p5-shockwave {
                0% {
                    width: 20px;
                    height: 20px;
                    opacity: 1;
                }
                100% {
                    width: 200px;
                    height: 200px;
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        setTimeout(() => wave.remove(), 600);
    }

    /**
     * Animación de líneas de enfoque
     */
    focusLines() {
        const container = document.getElementById('game-container');
        const lines = document.createElement('div');
        lines.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            opacity: 0;
            z-index: 50;
        `;

        for (let i = 0; i < 4; i++) {
            const line = document.createElement('div');
            line.style.cssText = `
                position: absolute;
                background: linear-gradient(90deg, transparent, #ffcc00, transparent);
                opacity: 0.6;
            `;
            if (i % 2 === 0) {
                line.style.width = '100%';
                line.style.height = '2px';
                line.style.top = `${i * 25}%`;
            } else {
                line.style.width = '2px';
                line.style.height = '100%';
                line.style.left = `${i * 25}%`;
            }
            lines.appendChild(line);
        }

        container.appendChild(lines);
        lines.style.animation = 'p5-focus-flash 0.4s ease-out forwards';

        const style = document.createElement('style');
        style.textContent = `
            @keyframes p5-focus-flash {
                0% { opacity: 0; }
                50% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        setTimeout(() => lines.remove(), 400);
    }

    /**
     * Crear partículas de efecto
     */
    createParticles(x, y, count = 8, color = '#ffcc00') {
        const container = document.getElementById('game-container');

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            const angle = (i / count) * Math.PI * 2;
            const velocity = 3 + Math.random() * 3;

            particle.style.cssText = `
                position: absolute;
                width: 8px;
                height: 8px;
                background: ${color};
                border-radius: 50%;
                left: ${x}px;
                top: ${y}px;
                pointer-events: none;
                box-shadow: 0 0 8px ${color};
            `;

            container.appendChild(particle);

            let px = x, py = y;
            let vx = Math.cos(angle) * velocity;
            let vy = Math.sin(angle) * velocity;
            let life = 1;

            const animate = () => {
                px += vx;
                py += vy;
                life -= 0.02;

                particle.style.left = `${px}px`;
                particle.style.top = `${py}px`;
                particle.style.opacity = `${life}`;

                if (life > 0) {
                    requestAnimationFrame(animate);
                } else {
                    particle.remove();
                }
            };

            animate();
        }
    }

    /**
     * Reproducir sonido (requiere archivos de audio)
     */
    playSound(soundType = 'select') {
        if (!this.soundEnabled) return;

        const soundMap = {
            'select': 'sounds/select.mp3',
            'impact': 'sounds/impact.mp3',
            'transition': 'sounds/transition.mp3',
            'confirm': 'sounds/confirm.mp3',
        };

        const soundPath = soundMap[soundType];
        if (soundPath) {
            try {
                const audio = new Audio(soundPath);
                audio.volume = 0.5;
                audio.play().catch(e => {
                    // Audio no disponible, ignorar silenciosamente
                });
            } catch (e) {
                // Ignorar errores de audio
            }
        }
    }

    /**
     * Efectos de teclado visible (menú)
     */
    keyboardEffect(keyName) {
        const overlay = document.createElement('div');
        overlay.textContent = keyName;
        overlay.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 20px;
            padding: 10px 15px;
            background: rgba(255, 204, 0, 0.2);
            border: 2px solid #ffcc00;
            color: #ffcc00;
            border-radius: 5px;
            font-weight: bold;
            opacity: 0;
            animation: p5-key-flash 0.5s ease-out forwards;
            pointer-events: none;
            z-index: 1000;
        `;

        document.body.appendChild(overlay);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes p5-key-flash {
                0% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-20px); }
            }
        `;
        document.head.appendChild(style);

        setTimeout(() => overlay.remove(), 500);
    }

    /**
     * Efecto de movimiento de cámara (screen shake)
     */
    shakeScreen(intensity = 5, duration = 200) {
        const container = document.getElementById('game-container');
        const originalTransform = container.style.transform;

        let startTime = Date.now();
        const shake = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress < 1) {
                const x = (Math.random() - 0.5) * intensity * (1 - progress);
                const y = (Math.random() - 0.5) * intensity * (1 - progress);
                container.style.transform = `translate(${x}px, ${y}px)`;
                requestAnimationFrame(shake);
            } else {
                container.style.transform = originalTransform;
            }
        };

        shake();
    }

    /**
     * Desactivar/activar sonido
     */
    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
    }
}

// Crear instancia global
const p5Effects = new Persona5Effects();
p5Effects.initialize();
