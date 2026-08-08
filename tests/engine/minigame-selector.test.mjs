import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(
  new URL("../../minijuegos_test.html", import.meta.url),
  "utf8",
);
const expectedPanels = [
  "rhythm",
  "vocal",
  "chase",
  "eduvuelo",
  "chili",
  "ketchupBoss",
  "rune",
  "battle",
  "furrielva",
  "credits",
];

test("cada ficha del banco tiene exactamente un panel de opciones", () => {
  for (const id of expectedPanels) {
    const matches =
      html.match(new RegExp(`data-options-for=["']${id}["']`, "g")) || [];
    assert.equal(
      matches.length,
      1,
      `${id} debe tener un único data-options-for`,
    );
  }
  assert.equal(
    (html.match(/<div class="tp-options-panel" data-options-for=/g) || [])
      .length,
    expectedPanels.length,
  );
});

test("los modos narrativos normalizan las acciones DSL", () => {
  assert.match(
    html,
    /normalized = engine\.actionInterpreter\.normalize\(action\)/,
  );
  assert.match(
    html,
    /modes: \['facil', 'medio', 'dificil', 'custom', 'historia'\]/,
  );
});
