import assert from "node:assert/strict";
import test from "node:test";
import { AudioController } from "../../engine/AudioController.js";
import { DOMRenderer } from "../../engine/DOMRenderer.js";
import { HistoryManager } from "../../engine/HistoryManager.js";

test("AudioController delega cada operación sin alterar argumentos", () => {
  const calls = [];
  const engine = {
    audioInstances: {},
    playSound: (...args) => calls.push(["play", ...args]),
    stopSound: (...args) => calls.push(["stop", ...args]),
    stopAllSounds: () => calls.push(["stopAll"]),
    pauseSound: (...args) => calls.push(["pause", ...args]),
    resumeSound: (...args) => calls.push(["resume", ...args]),
    setVolume: (...args) => calls.push(["volume", ...args]),
  };
  const audio = new AudioController(engine);
  audio.play("music.mp3", { loop: true });
  audio.stop("bg", 300);
  audio.stopAll();
  audio.pause("bg");
  audio.resume("bg");
  audio.setVolume("bg", 0.4);
  assert.deepStrictEqual(calls, [
    ["play", "music.mp3", { loop: true }],
    ["stop", "bg", 300],
    ["stopAll"],
    ["pause", "bg"],
    ["resume", "bg"],
    ["volume", "bg", 0.4],
  ]);
});

test("HistoryManager centraliza salto, retroceso y limpieza", () => {
  const calls = [];
  const engine = {
    sceneHistory: [1],
    _lastSeenScene: 2,
    jumpToScene: (target) => calls.push(["jump", target]),
    rewindToPreviousScene: () => calls.push(["rewind"]),
    captureSceneStageState: () => ({ stage: true }),
    restoreSceneStageState: (snapshot) => calls.push(["restore", snapshot]),
  };
  const history = new HistoryManager(engine);
  assert.deepStrictEqual(history.captureStage(), { stage: true });
  history.restoreStage({ stage: false });
  history.jump("Final");
  history.rewind();
  history.clear();
  assert.deepStrictEqual(calls, [
    ["restore", { stage: false }],
    ["jump", "Final"],
    ["rewind"],
  ]);
  assert.deepStrictEqual(engine.sceneHistory, []);
  assert.equal(engine._lastSeenScene, null);
});

test("DOMRenderer renueva nodos desconectados", () => {
  const first = { isConnected: true };
  const second = { isConnected: true };
  let reads = 0;
  const renderer = new DOMRenderer({
    getElementById() {
      reads += 1;
      return reads === 1 ? first : second;
    },
  });
  assert.equal(renderer.get("background"), first);
  assert.equal(renderer.get("background"), first);
  first.isConnected = false;
  assert.equal(renderer.get("background"), second);
  assert.equal(reads, 2);
});
