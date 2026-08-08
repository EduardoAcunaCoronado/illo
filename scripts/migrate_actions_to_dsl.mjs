import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseAction, serializeAction } from "../engine/ActionInterpreter.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chaptersDirectory = path.join(root, "chapters");
const shouldWrite = process.argv.includes("--write");
let migrated = 0;
let retained = 0;

for (const filename of fs
  .readdirSync(chaptersDirectory)
  .filter((name) => name.endsWith(".json"))
  .sort()) {
  const absolutePath = path.join(chaptersDirectory, filename);
  const chapter = JSON.parse(fs.readFileSync(absolutePath, "utf8"));

  for (const scene of chapter.scenes || []) {
    for (const line of scene.lines || []) {
      for (const bucket of ["actions", "afterActions"]) {
        if (!Array.isArray(line[bucket])) continue;
        line[bucket] = line[bucket].map((action) => {
          if (!action || typeof action !== "object" || Array.isArray(action))
            return action;
          const serialized = serializeAction(action);
          if (!serialized) {
            retained += 1;
            return action;
          }
          try {
            assert.deepStrictEqual(parseAction(serialized), action);
          } catch (_) {
            retained += 1;
            return action;
          }
          migrated += 1;
          return serialized;
        });
      }
    }
  }

  if (shouldWrite)
    fs.writeFileSync(absolutePath, `${JSON.stringify(chapter, null, 2)}\n`);
}

console.log(
  `${shouldWrite ? "Migradas" : "Migrables"}: ${migrated}; conservadas como objeto: ${retained}.`,
);
