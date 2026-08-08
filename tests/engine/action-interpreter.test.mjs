import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  ActionInterpreter,
  parseAction,
  serializeAction,
} from "../../engine/ActionInterpreter.js";

test("acepta el ejemplo corto show y opciones tipadas", () => {
  assert.deepStrictEqual(
    parseAction("show nexo right happy scale=1.2 flipped=true"),
    {
      type: "showCharacter",
      character: "nexo",
      position: "right",
      pose: "happy",
      scale: 1.2,
      flipped: true,
    },
  );
});

test("conserva destinos y rutas con espacios mediante comillas", () => {
  assert.deepStrictEqual(parseAction('goto "Sala del trono"'), {
    type: "goToScene",
    value: "Sala del trono",
  });
  assert.deepStrictEqual(
    parseAction('sound "assets/audio/un tema.mp3" loop=true'),
    {
      type: "playSound",
      path: "assets/audio/un tema.mp3",
      loop: true,
    },
  );
});

test("sceneStart expande un fundido completo y secuencial", () => {
  assert.deepStrictEqual(
    parseAction("sceneStart assets/images/bg.webp duration=500"),
    [
      { type: "fade", to: "black", duration: 500 },
      { type: "setBackground", value: "assets/images/bg.webp" },
      { type: "fade", from: "black", duration: 500 },
    ],
  );
});

test("todas las acciones serializables de capítulos hacen round-trip exacto", () => {
  const chapters = path.resolve("chapters");
  let checked = 0;
  for (const filename of fs
    .readdirSync(chapters)
    .filter((name) => name.endsWith(".json"))) {
    const chapter = JSON.parse(
      fs.readFileSync(path.join(chapters, filename), "utf8"),
    );
    for (const scene of chapter.scenes || []) {
      for (const line of scene.lines || []) {
        for (const bucket of ["actions", "afterActions"]) {
          for (const sourceAction of line[bucket] || []) {
            const action = parseAction(sourceAction);
            if (!action || Array.isArray(action)) continue;
            const serialized = serializeAction(action);
            if (!serialized) continue;
            assert.deepStrictEqual(
              parseAction(serialized),
              action,
              `${filename}: ${serialized}`,
            );
            checked += 1;
          }
        }
      }
    }
  }
  assert.ok(
    checked > 1_000,
    `se esperaban más de 1.000 acciones comprobadas, recibidas ${checked}`,
  );
});

test("rechaza comandos desconocidos y comillas abiertas", () => {
  assert.throws(() => parseAction("teletransporta nexo"), /desconocida/);
  assert.throws(() => parseAction('goto "sin final'), /sin cerrar/);
});

test("mantiene objetos heredados y ejecuta macros en orden", async () => {
  const legacy = { type: "wait", ms: 25 };
  assert.equal(parseAction(legacy), legacy);
  const received = [];
  const interpreter = new ActionInterpreter({
    fadeScene: async (action) => received.push(action),
    setBackground: (value) => received.push({ type: "setBackground", value }),
    clearBackground: () => received.push({ type: "clearBackground" }),
  });
  await interpreter.execute("sceneStart assets/images/bg.webp duration=40");
  assert.deepStrictEqual(received, [
    { type: "fade", to: "black", duration: 40 },
    { type: "setBackground", value: "assets/images/bg.webp" },
    { type: "fade", from: "black", duration: 40 },
  ]);
});

test("despacha sin excepción todas las acciones reales de los siete capítulos", async () => {
  const calls = [];
  const state = {
    gameState: {},
    storyDelay: 0,
    storyPressure: 0,
    audioController: new Proxy(
      {},
      {
        get:
          (_, method) =>
          (...args) =>
            calls.push([method, ...args]),
      },
    ),
    historyManager: { jump: (...args) => calls.push(["jump", ...args]) },
  };
  const engine = new Proxy(state, {
    get(target, property) {
      if (property in target) return target[property];
      return (...args) => {
        calls.push([property, ...args]);
        return Promise.resolve();
      };
    },
  });
  const previousWindow = globalThis.window;
  globalThis.window = {
    Juice: new Proxy(
      {},
      {
        get:
          () =>
          (...args) =>
            calls.push(["juice", ...args]),
      },
    ),
  };

  try {
    const interpreter = new ActionInterpreter(engine);
    let executed = 0;
    for (const filename of fs
      .readdirSync(path.resolve("chapters"))
      .filter((name) => name.endsWith(".json"))) {
      const chapter = JSON.parse(
        fs.readFileSync(path.join("chapters", filename), "utf8"),
      );
      for (const scene of chapter.scenes || []) {
        for (const line of scene.lines || []) {
          for (const bucket of ["actions", "afterActions"]) {
            for (const action of line[bucket] || []) {
              await interpreter.execute(action);
              executed += 1;
            }
          }
        }
      }
    }
    assert.equal(executed, 1393);
    assert.ok(calls.length > 1300);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
