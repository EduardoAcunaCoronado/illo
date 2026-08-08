import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

class FakeClassList {
  constructor(...values) {
    this.values = new Set(values);
  }

  add(...values) {
    values.forEach((value) => this.values.add(value));
  }

  remove(...values) {
    values.forEach((value) => this.values.delete(value));
  }

  contains(value) {
    return this.values.has(value);
  }

  [Symbol.iterator]() {
    return this.values[Symbol.iterator]();
  }
}

class FakeStyle {
  removeProperty(name) {
    delete this[name];
  }
}

class FakeElement {
  constructor(position) {
    this.classList = new FakeClassList("character", position);
    this.className = "";
    this.style = new FakeStyle();
    this.dataset = {};
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.offsetWidth = 500;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter(
      (child) => child !== this,
    );
    this.parentNode = null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    if (selector.includes(".character-pose-ghost")) {
      return this.children.filter((child) =>
        String(child.className).includes("character-pose-ghost"),
      );
    }
    if (selector.includes(".character-eye-layer")) {
      return this.children.filter((child) =>
        String(child.className).includes("character-eye-layer"),
      );
    }
    return [];
  }
}

const slots = Object.fromEntries(
  ["left", "center", "right"].map((position) => [
    `character-${position}`,
    new FakeElement(position),
  ]),
);
const scheduledTimers = new Map();
let nextTimer = 1;
const context = {
  console,
  document: {
    getElementById(id) {
      return slots[id] || null;
    },
    createElement() {
      return new FakeElement("");
    },
  },
  getComputedStyle() {
    return {
      backgroundSize: "contain",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "bottom center",
    };
  },
  setTimeout(callback) {
    const id = nextTimer++;
    scheduledTimers.set(id, callback);
    return id;
  },
  clearTimeout(id) {
    scheduledTimers.delete(id);
  },
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
const engineSource = fs.readFileSync(
  new URL("../engine.js", import.meta.url),
  "utf8",
);
vm.runInContext(
  `${engineSource}\n;globalThis.__VisualNovelEngine = VisualNovelEngine;`,
  context,
  { filename: "engine.js" },
);

const engine = new context.__VisualNovelEngine();
const realApplyCharacterPoseImage = engine.applyCharacterPoseImage.bind(engine);
engine.characters = {
  samu: { poses: { neutral: "samu.webp", happy: "samu-happy.webp" } },
  edu: { poses: { neutral: "edu.webp" } },
  tony: { poses: { neutral: "tony.webp" } },
};
engine.clearCharacterAnimeFall = () => {};
engine.preloadImages = async () => [];
const poseApplications = [];
engine.applyCharacterPoseImage = (element, poseImage, options = {}) => {
  poseApplications.push({ poseImage, options });
  element.style.backgroundImage = "fake";
  element.dataset.poseSrc = poseImage;
};
engine.applyPoseClass = (element, pose) => {
  element.dataset.pose = pose;
};
engine.updateCharacterVideo = () => {};
engine.startCharacterFrameAnimation = () => {};
engine.stopCharacterFrameAnimation = () => {};
engine.stopCharacterPoseAnimation = () => {};

const transitionSlot = new FakeElement("left");
const originalPoseSrc = engine.cacheBustAsset("samu.webp");
transitionSlot.dataset.poseSrc = originalPoseSrc;
transitionSlot.style.backgroundImage = `url('${originalPoseSrc}')`;
realApplyCharacterPoseImage(transitionSlot, "samu-happy.webp", { fade: true });
assert.equal(
  transitionSlot.classList.contains("pose-transitioning"),
  true,
  "el fundido real debe marcar el hueco como transición de pose",
);
assert.equal(
  transitionSlot.querySelectorAll(":scope > .character-pose-ghost").length,
  2,
  "el fundido real debe crear sólo las capas temporales anterior y nueva",
);
assert.equal(transitionSlot.dataset.poseTransitionMode, "fade");
engine.finishCharacterPoseTransition(transitionSlot);
assert.equal(
  transitionSlot.querySelectorAll(":scope > .character-pose-ghost").length,
  0,
  "al terminar el fundido no debe quedar ninguna capa fantasma",
);
assert.match(transitionSlot.style.backgroundImage, /samu-happy\.webp/);

realApplyCharacterPoseImage(transitionSlot, "samu.webp", { fade: false });
assert.equal(transitionSlot.dataset.poseTransitionMode, "instant");
assert.equal(
  transitionSlot.querySelectorAll(":scope > .character-pose-ghost").length,
  0,
  "fade false no debe crear capas temporales",
);

await engine.showCharacter("samu", "left", "neutral");
assert.equal(
  slots["character-left"].classList.contains("char-enter-fade"),
  true,
  "showCharacter debe usar fade cuando enter no está especificado",
);
assert.equal(
  slots["character-left"].classList.contains("character-entering"),
  true,
  "la entrada fade predeterminada debe bloquear el desplazamiento horizontal del layout",
);
await engine.showCharacter("samu", "left", "happy", false, "bottom");
assert.equal(
  slots["character-left"].classList.contains("char-enter-bottom"),
  false,
  "showCharacter no debe repetir enter para un personaje que ya está visible",
);
assert.equal(
  poseApplications.at(-1)?.options?.fade,
  true,
  "showCharacter debe fundir por defecto al cambiar la pose del mismo personaje",
);

await engine.setPose("samu", "left", "neutral");
assert.equal(
  poseApplications.at(-1)?.options?.fade,
  true,
  "setPose debe fundir por defecto entre dos poses",
);
await engine.setPose("samu", "left", "happy", { fade: false });
assert.equal(
  poseApplications.at(-1)?.options?.fade,
  false,
  "setPose debe permitir desactivar el fundido con fade false",
);

engine.hideCharacter("samu", "left");
await engine.showCharacter("samu", "left", "happy", false, "bottom");
assert.equal(
  slots["character-left"].classList.contains("char-enter-bottom"),
  true,
  "un personaje oculto sí debe ejecutar enter al volver a mostrarse",
);

engine.removeCharacter(null, "left");
await engine.showCharacter("samu", "left", "neutral");
await engine.showCharacter("tony", "center", "neutral");
await engine.showCharacter("edu", "right", "neutral");
for (const position of ["left", "center", "right"]) {
  assert.equal(
    slots[`character-${position}`].classList.contains("char-enter-fade"),
    true,
    `la entrada predeterminada de ${position} debe ser fade`,
  );
  assert.equal(
    slots[`character-${position}`].classList.contains("character-entering"),
    true,
    `el fade predeterminado de ${position} debe aislar la recolocación del grupo`,
  );
}
engine.removeCharacter(null, "left");
engine.removeCharacter(null, "center");
engine.removeCharacter(null, "right");

await engine.showCharacter("samu", "left", "neutral", false, null);
assert.equal(
  slots["character-left"].classList.contains("char-enter-fade"),
  false,
  "un enter null explícito debe conservar la aparición instantánea",
);
assert.equal(
  slots["character-left"].classList.contains("character-entering"),
  false,
  "la aparición instantánea no debe activar el aislamiento de una animación",
);
engine.removeCharacter(null, "left");

await engine.showCharacter("samu", "left", "neutral", false, "bottom");
await engine.showCharacter("tony", "center", "neutral", false, "bottom");
await engine.showCharacter("edu", "right", "neutral", false, "bottom");

for (const position of ["left", "center", "right"]) {
  assert.equal(
    slots[`character-${position}`].classList.contains("character-entering"),
    true,
    `la entrada de ${position} debe bloquear el desplazamiento horizontal del layout`,
  );
}
assert.equal(slots["character-left"].style.left, `${(1 / 6) * 100}%`);
assert.equal(slots["character-center"].style.left, "50%");
assert.equal(slots["character-right"].style.left, `${(5 / 6) * 100}%`);

let historicalReplay = null;
engine.dialoguePlayback = true;
engine.dialogueTimeline = [{ kind: "dialog" }, { kind: "dialog" }];
engine.dialogueTimelineCursor = 0;
engine.showRewoundTimelineEntry = async (index, options) => {
  historicalReplay = { index, options };
  return true;
};
await engine.nextLine();
assert.equal(historicalReplay?.index, 1);
assert.equal(
  historicalReplay?.options?.recreateActions,
  true,
  "al avanzar después de Retroceder deben repetirse los enter originales",
);

let actionFade = null;
engine.setPose = async (...args) => {
  actionFade = args[3]?.fade;
};
await engine.executeAction({
  type: "setPose",
  character: "samu",
  position: "left",
  pose: "neutral",
});
assert.equal(
  actionFade,
  true,
  "la acción setPose debe activar fade por defecto",
);
await engine.executeAction({
  type: "setPose",
  character: "samu",
  position: "left",
  pose: "happy",
  fade: false,
});
assert.equal(actionFade, false, "la acción setPose debe respetar fade false");

engine.showCharacter = async (...args) => {
  actionFade = args[7];
};
await engine.executeAction({
  type: "showCharacter",
  character: "samu",
  position: "left",
  pose: "neutral",
});
assert.equal(
  actionFade,
  true,
  "la acción showCharacter debe activar el fundido de pose por defecto",
);
await engine.executeAction({
  type: "showCharacter",
  character: "samu",
  position: "left",
  pose: "happy",
  fade: false,
});
assert.equal(
  actionFade,
  false,
  "la acción showCharacter debe respetar fade false",
);

console.log("Transiciones de personajes: 6 regresiones verificadas.");
