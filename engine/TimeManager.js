export class MediaRegistry {
    constructor(browserWindow = window) {
        this.window = browserWindow;
        this.audios = new Set();
        this.contexts = new Set();
        this.install();
    }

    install() {
        const browserWindow = this.window;
        const NativeAudio = browserWindow.Audio;
        if (NativeAudio && !NativeAudio.__illoTracked) {
            const registry = this;
            const TrackedAudio = function (...args) {
                const audio = new NativeAudio(...args);
                registry.audios.add(audio);
                audio.addEventListener('ended', () => registry.audios.delete(audio), { once: true });
                return audio;
            };
            TrackedAudio.prototype = NativeAudio.prototype;
            Object.setPrototypeOf(TrackedAudio, NativeAudio);
            TrackedAudio.__illoTracked = true;
            browserWindow.Audio = TrackedAudio;
        }

        ['AudioContext', 'webkitAudioContext'].forEach((name) => {
            const NativeContext = browserWindow[name];
            if (!NativeContext || NativeContext.__illoTracked) return;
            const registry = this;
            const TrackedContext = function (...args) {
                const context = new NativeContext(...args);
                registry.contexts.add(context);
                return context;
            };
            TrackedContext.prototype = NativeContext.prototype;
            Object.setPrototypeOf(TrackedContext, NativeContext);
            TrackedContext.__illoTracked = true;
            browserWindow[name] = TrackedContext;
        });
    }
}

export class TimeManager {
    constructor(browserWindow = window) {
        this.window = browserWindow;
        this.paused = false;
        this.pausedAt = 0;
        this.pausedDateAt = 0;
        this.totalPaused = 0;
        this.totalDatePaused = 0;
        this.nextId = 1_000_000;
        this.timers = new Map();
        this.frames = new Map();
        this.native = {
            setTimeout: browserWindow.setTimeout.bind(browserWindow),
            clearTimeout: browserWindow.clearTimeout.bind(browserWindow),
            setInterval: browserWindow.setInterval.bind(browserWindow),
            clearInterval: browserWindow.clearInterval.bind(browserWindow),
            requestAnimationFrame: browserWindow.requestAnimationFrame.bind(browserWindow),
            cancelAnimationFrame: browserWindow.cancelAnimationFrame.bind(browserWindow),
            performanceNow: browserWindow.performance.now.bind(browserWindow.performance),
            dateNow: browserWindow.Date.now.bind(browserWindow.Date),
        };
        this.install();
    }

    performanceNow = () => {
        const now = this.native.performanceNow();
        return now - this.totalPaused - (this.paused ? now - this.pausedAt : 0);
    };

    dateNow = () => {
        const now = this.native.dateNow();
        return now - this.totalDatePaused - (this.paused ? now - this.pausedDateAt : 0);
    };

    install() {
        const browserWindow = this.window;
        try {
            Object.defineProperty(browserWindow.performance, 'now', {
                configurable: true,
                value: this.performanceNow,
            });
        } catch (_) {}
        browserWindow.Date.now = this.dateNow;
        browserWindow.setTimeout = (callback, delay, ...args) => this.createTimer(callback, delay, args, false);
        browserWindow.setInterval = (callback, delay, ...args) => this.createTimer(callback, delay, args, true);
        browserWindow.clearTimeout = (id) => this.clearTimer(id);
        browserWindow.clearInterval = (id) => this.clearTimer(id);
        browserWindow.requestAnimationFrame = (callback) => this.createFrame(callback);
        browserWindow.cancelAnimationFrame = (id) => this.cancelFrame(id);
    }

    invoke(callback, args) {
        if (typeof callback === 'function') callback(...args);
    }

    armTimer(record) {
        if (this.paused || !this.timers.has(record.id)) return;
        record.startedAt = this.native.performanceNow();
        record.nativeId = this.native.setTimeout(
            () => {
                record.nativeId = null;
                if (!this.timers.has(record.id)) return;
                if (record.interval) {
                    record.remaining = record.delay;
                    this.invoke(record.callback, record.args);
                    if (this.timers.has(record.id)) this.armTimer(record);
                } else {
                    this.timers.delete(record.id);
                    this.invoke(record.callback, record.args);
                }
            },
            Math.max(0, record.remaining),
        );
    }

    createTimer(callback, delay, args, interval) {
        if (this.paused) {
            return interval
                ? this.native.setInterval(callback, delay, ...args)
                : this.native.setTimeout(callback, delay, ...args);
        }
        const normalizedDelay = Math.max(0, Number(delay) || 0);
        const record = {
            id: this.nextId++,
            callback,
            args,
            interval,
            delay: normalizedDelay,
            remaining: normalizedDelay,
            startedAt: 0,
            nativeId: null,
        };
        this.timers.set(record.id, record);
        this.armTimer(record);
        return record.id;
    }

    clearTimer(id) {
        const record = this.timers.get(id);
        if (!record) {
            this.native.clearTimeout(id);
            this.native.clearInterval(id);
            return;
        }
        if (record.nativeId !== null) this.native.clearTimeout(record.nativeId);
        this.timers.delete(id);
    }

    armFrame(record) {
        if (this.paused || !this.frames.has(record.id)) return;
        record.nativeId = this.native.requestAnimationFrame(() => {
            this.frames.delete(record.id);
            record.callback(this.performanceNow());
        });
    }

    createFrame(callback) {
        if (this.paused) return this.native.requestAnimationFrame(callback);
        const record = { id: this.nextId++, callback, nativeId: null };
        this.frames.set(record.id, record);
        this.armFrame(record);
        return record.id;
    }

    cancelFrame(id) {
        const record = this.frames.get(id);
        if (!record) {
            this.native.cancelAnimationFrame(id);
            return;
        }
        if (record.nativeId !== null) this.native.cancelAnimationFrame(record.nativeId);
        this.frames.delete(id);
    }

    setPaused(value) {
        const next = Boolean(value);
        if (next === this.paused) return;
        if (next) {
            this.paused = true;
            this.pausedAt = this.native.performanceNow();
            this.pausedDateAt = this.native.dateNow();
            for (const record of this.timers.values()) {
                if (record.nativeId === null) continue;
                this.native.clearTimeout(record.nativeId);
                record.nativeId = null;
                record.remaining = Math.max(0, record.remaining - (this.pausedAt - record.startedAt));
            }
            for (const record of this.frames.values()) {
                if (record.nativeId !== null) this.native.cancelAnimationFrame(record.nativeId);
                record.nativeId = null;
            }
            return;
        }
        this.totalPaused += this.native.performanceNow() - this.pausedAt;
        this.totalDatePaused += this.native.dateNow() - this.pausedDateAt;
        this.paused = false;
        for (const record of this.timers.values()) this.armTimer(record);
        for (const record of this.frames.values()) this.armFrame(record);
    }

    isPaused() {
        return this.paused;
    }

    diagnostics() {
        return { paused: this.paused, timers: this.timers.size, frames: this.frames.size };
    }
}

export function installTimeManager(browserWindow = window) {
    if (browserWindow.__illoTimeManager) return browserWindow.__illoTimeManager;
    const media = new MediaRegistry(browserWindow);
    const clock = new TimeManager(browserWindow);
    const installed = { media, clock };
    browserWindow.__illoTimeManager = installed;
    return installed;
}
