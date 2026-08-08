import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requested = Number(
  process.argv[2] || process.env.ILLO_TEST_REPETITIONS || 5,
);
const repetitions =
  Number.isInteger(requested) && requested > 0 ? requested : 5;
const testFiles = fs
  .readdirSync(path.join(root, "tests", "engine"))
  .filter((name) => name.endsWith(".test.mjs"))
  .map((name) => path.join("tests", "engine", name));
const esbuild = path.join(root, "node_modules", "esbuild", "bin", "esbuild");

function run(label, args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error(`${label} falló con código ${result.status}`);
  }
}

for (let iteration = 1; iteration <= repetitions; iteration += 1) {
  run("bundle", [
    esbuild,
    "engine/index.js",
    "--bundle",
    "--format=iife",
    "--platform=browser",
    "--target=chrome120,firefox120,safari17",
    "--outfile=engine.bundle.js",
  ]);
  run("contenido", ["scripts/validate_game_content.mjs"]);
  run("motor", ["--test", ...testFiles]);
  console.log(
    `Ronda ${iteration}/${repetitions}: bundle, contenido y motor OK.`,
  );
}

console.log(`Batería repetida completada: ${repetitions} rondas sin fallos.`);
