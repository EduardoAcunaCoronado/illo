export class HistoryManager {
    constructor(engine) {
        this.engine = engine;
    }

    captureStage() {
        return this.engine.captureSceneStageState();
    }

    restoreStage(snapshot) {
        return this.engine.restoreSceneStageState(snapshot);
    }

    rewind() {
        return this.engine.rewindToPreviousScene();
    }

    jump(target) {
        return this.engine.jumpToScene(target);
    }

    clear() {
        this.engine.sceneHistory = [];
        this.engine._lastSeenScene = null;
    }
}
