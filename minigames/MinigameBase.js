export class MinigameBase {
    static activeInstances = new Set();

    constructor(options = {}) {
        this.options = options;
        this.state = 'idle';
        this.cleanups = new Set();
        this.pausedAt = 0;
    }

    start() {
        throw new Error(`${this.constructor.name}.start() debe implementarse`);
    }

    play() {
        return this.start();
    }

    listen(target, type, listener, options) {
        target.addEventListener(type, listener, options);
        return this.own(() => target.removeEventListener(type, listener, options));
    }

    own(cleanup) {
        if (typeof cleanup === 'function') this.cleanups.add(cleanup);
        return cleanup;
    }

    ownElement(element) {
        this.own(() => element.remove());
        return element;
    }

    attachOverlay(element) {
        this.overlay = element;
        MinigameBase.activeInstances.add(this);
        if (typeof MutationObserver === 'function') {
            const observer = new MutationObserver(() => {
                if (!element.isConnected) this.cleanup();
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
            this.own(() => observer.disconnect());
        }
        return element;
    }

    timeout(callback, delay = 0, ...args) {
        let timer = null;
        const cancel = () => clearTimeout(timer);
        timer = setTimeout(() => {
            this.cleanups.delete(cancel);
            if (this.state !== 'cleaned') callback(...args);
        }, delay);
        this.own(cancel);
        return timer;
    }

    animationFrame(callback) {
        let frame = null;
        const cancel = () => cancelAnimationFrame(frame);
        frame = requestAnimationFrame((time) => {
            this.cleanups.delete(cancel);
            if (this.state !== 'cleaned') callback(time);
        });
        this.own(cancel);
        return frame;
    }

    pause() {
        if (this.state !== 'running') return;
        this.state = 'paused';
        this.pausedAt = performance.now();
    }

    resume() {
        if (this.state !== 'paused') return;
        this.state = 'running';
    }

    cleanup() {
        if (this.state === 'cleaned') return;
        this.state = 'cleaned';
        MinigameBase.activeInstances.delete(this);
        for (const cleanup of [...this.cleanups].reverse()) {
            try {
                cleanup();
            } catch (error) {
                console.warn(`${this.constructor.name}: fallo durante cleanup`, error);
            }
        }
        this.cleanups.clear();
    }

    cancel() {
        if (this.state === 'cleaned') return false;
        this.overlay?.remove();
        this.cleanup();
        if (typeof this.resolve === 'function') {
            const resolve = this.resolve;
            this.resolve = null;
            resolve(false);
        }
        return true;
    }

    static cleanupAll() {
        let cancelled = 0;
        for (const minigame of [...MinigameBase.activeInstances]) {
            if (minigame.cancel()) cancelled += 1;
        }
        return cancelled;
    }
}

if (typeof window !== 'undefined') window.MinigameBase = MinigameBase;
