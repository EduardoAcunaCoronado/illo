import assert from "node:assert/strict";
import test from "node:test";
import { MinigameBase } from "../../minigames/MinigameBase.js";

test("cleanup elimina listeners registrados y solo se ejecuta una vez", () => {
  const target = new EventTarget();
  const minigame = new MinigameBase();
  let calls = 0;
  minigame.listen(target, "tick", () => calls++);
  target.dispatchEvent(new Event("tick"));
  minigame.cleanup();
  minigame.cleanup();
  target.dispatchEvent(new Event("tick"));
  assert.equal(calls, 1);
  assert.equal(minigame.state, "cleaned");
});

test("pause y resume mantienen un ciclo de vida predecible", () => {
  const minigame = new MinigameBase();
  minigame.state = "running";
  minigame.pause();
  assert.equal(minigame.state, "paused");
  minigame.resume();
  assert.equal(minigame.state, "running");
});

test("cleanupAll cancela instancias activas, temporizadores y promesas", async () => {
  const minigame = new MinigameBase();
  let timerCalls = 0;
  let resolved = null;
  minigame.state = "running";
  minigame.overlay = { remove() {} };
  MinigameBase.activeInstances.add(minigame);
  minigame.resolve = (value) => {
    resolved = value;
  };
  minigame.timeout(() => timerCalls++, 5);

  assert.equal(MinigameBase.cleanupAll(), 1);
  await new Promise((resolve) => setTimeout(resolve, 15));

  assert.equal(timerCalls, 0);
  assert.equal(resolved, false);
  assert.equal(minigame.state, "cleaned");
  assert.equal(MinigameBase.activeInstances.size, 0);
});
