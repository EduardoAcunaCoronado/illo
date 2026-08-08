import assert from "node:assert/strict";
import test from "node:test";
import { TimeManager } from "../../engine/TimeManager.js";

const nativeDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fakeWindow() {
  return {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame: (callback) =>
      setTimeout(() => callback(performance.now()), 1),
    cancelAnimationFrame: clearTimeout,
    performance: { now: performance.now.bind(performance) },
    Date: { now: Date.now.bind(Date) },
  };
}

test("la pausa congela timers ya armados y conserva el tiempo restante", async () => {
  const browserWindow = fakeWindow();
  const manager = new TimeManager(browserWindow);
  let fired = false;
  browserWindow.setTimeout(() => {
    fired = true;
  }, 35);
  await nativeDelay(8);
  manager.setPaused(true);
  await nativeDelay(45);
  assert.equal(fired, false);
  manager.setPaused(false);
  await nativeDelay(35);
  assert.equal(fired, true);
});

test("performance.now y Date.now virtuales no avanzan durante la pausa", async () => {
  const browserWindow = fakeWindow();
  const manager = new TimeManager(browserWindow);
  manager.setPaused(true);
  const performanceBefore = browserWindow.performance.now();
  const dateBefore = browserWindow.Date.now();
  await nativeDelay(25);
  assert.ok(Math.abs(browserWindow.performance.now() - performanceBefore) < 3);
  assert.ok(Math.abs(browserWindow.Date.now() - dateBefore) < 3);
  manager.setPaused(false);
});

test("los RAF de juego pendientes se rearman una sola vez", async () => {
  const browserWindow = fakeWindow();
  const manager = new TimeManager(browserWindow);
  let frames = 0;
  const record = {
    id: 1_500_000,
    callback: () => frames++,
    nativeId: null,
  };
  manager.frames.set(record.id, record);
  manager.setPaused(true);
  await nativeDelay(10);
  assert.equal(frames, 0);
  manager.setPaused(false);
  await nativeDelay(10);
  assert.equal(frames, 1);
  assert.equal(manager.frames.size, 0);
});
