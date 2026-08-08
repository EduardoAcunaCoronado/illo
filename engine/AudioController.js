export class AudioController {
    constructor(engine) {
        this.engine = engine;
    }

    play(path, options) {
        return this.engine.playSound(path, options);
    }

    stop(id, fadeOut = 0) {
        return this.engine.stopSound(id, fadeOut);
    }

    stopAll() {
        return this.engine.stopAllSounds();
    }

    pause(id) {
        return this.engine.pauseSound(id);
    }

    resume(id) {
        return this.engine.resumeSound(id);
    }

    setVolume(id, volume) {
        return this.engine.setVolume(id, volume);
    }

    snapshot() {
        return Object.entries(this.engine.audioInstances || {})
            .filter(([, audio]) => audio && !audio.paused)
            .map(([id, audio]) => ({
                id,
                src: audio._sourcePath || audio.src,
                volume: audio.volume,
                loop: audio.loop,
            }));
    }
}
