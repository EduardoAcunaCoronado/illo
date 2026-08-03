import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chaptersDir = path.join(root, "chapters");
const charactersDir = path.join(root, "characters");

const errors = [];
const warnings = [];
let sceneCount = 0;
let lineCount = 0;
let assetRefCount = 0;

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`${path.relative(root, file)}: JSON inválido (${error.message})`);
    return null;
  }
};

const filesIn = (dir, extension) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(dir, entry.name))
    .sort();

const characterByAlias = new Map();
const characters = new Map();

for (const file of filesIn(charactersDir, ".json")) {
  const data = readJson(file);
  if (!data) continue;
  const key = path.basename(file, ".json");
  characters.set(key, data);
  characterByAlias.set(normalize(key), key);
  characterByAlias.set(normalize(data.name), key);
  for (const alias of data.aliases || []) characterByAlias.set(normalize(alias), key);
}

const resolveCharacter = (name) => characterByAlias.get(normalize(name));
const assetPattern = /^assets[\\/]/i;
const validPositions = new Set(["left", "center", "right"]);

function exactCaseMismatch(relativePath) {
  const parts = relativePath.split(/[\\/]/).filter(Boolean);
  let cursor = root;
  const canonical = [];
  for (const part of parts) {
    if (!fs.existsSync(cursor) || !fs.statSync(cursor).isDirectory()) return null;
    const entries = fs.readdirSync(cursor);
    const exact = entries.find((entry) => entry === part);
    if (exact) {
      canonical.push(exact);
      cursor = path.join(cursor, exact);
      continue;
    }
    const insensitive = entries.find(
      (entry) => entry.toLowerCase() === part.toLowerCase(),
    );
    if (!insensitive) return null;
    canonical.push(insensitive);
    cursor = path.join(cursor, insensitive);
  }
  const actual = parts.join("/");
  const expected = canonical.join("/");
  return actual === expected ? null : expected;
}

function checkAsset(reference, where) {
  if (!assetPattern.test(reference)) return;
  assetRefCount += 1;
  const clean = reference.split(/[?#]/, 1)[0].replaceAll("/", path.sep);
  const absolute = path.join(root, clean);
  if (!fs.existsSync(absolute)) {
    errors.push(`${where}: asset ausente «${reference}»`);
    return;
  }
  const canonical = exactCaseMismatch(clean);
  if (canonical) {
    errors.push(`${where}: mayúsculas de asset incorrectas «${reference}»; usa «${canonical}»`);
  }
}

function walkAssets(value, where) {
  if (typeof value === "string") {
    checkAsset(value, where);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkAssets(item, `${where}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    walkAssets(item, `${where}.${key}`);
  }
}

for (const [key, character] of characters) {
  const poseAnimations = character.animations || character.poseAnimations || {};
  for (const [pose, reference] of Object.entries(character.poses || {})) {
    if (typeof reference === "string") {
      checkAsset(reference, `characters/${key}.json pose ${pose}`);
    } else {
      walkAssets(reference, `characters/${key}.json pose ${pose}`);
    }
  }
  for (const [pose, animation] of Object.entries(poseAnimations)) {
    const where = `characters/${key}.json animación ${pose}`;
    if (!character.poses?.[pose]) {
      errors.push(`${where}: la pose base no existe`);
    }
    const frames = Array.isArray(animation) ? animation : animation?.frames;
    if (!Array.isArray(frames) || frames.length < 1) {
      errors.push(`${where}: requiere al menos un fotograma además de la pose base`);
      continue;
    }
    walkAssets(frames, `${where}.frames`);
    for (const [index, frame] of frames.entries()) {
      const source = typeof frame === "string"
        ? frame
        : frame?.src || frame?.image || frame?.pose;
      if (!source) errors.push(`${where}.frames[${index}]: falta src`);
      if (frame && typeof frame === "object" && frame.duration != null &&
          (!Number.isFinite(Number(frame.duration)) || Number(frame.duration) <= 0)) {
        errors.push(`${where}.frames[${index}]: duration debe ser positiva`);
      }
    }
  }
}

const knownActions = new Set([
  "clearBackground",
  "removeBackground",
  "setBackground",
  "showCharacter",
  "hideCharacter",
  "removeCharacter",
  "quitarPersonaje",
  "setPose",
  "animateCharacter",
  "characterAnimation",
  "poseSequence",
  "stopCharacterAnimation",
  "stopPoseSequence",
  "characterGlitch",
  "glitchCharacter",
  "characterFullGlitch",
  "fullCharacterGlitch",
  "characterGlitchUntilAdvance",
  "glitchUntilAdvance",
  "hideDialog",
  "hideText",
  "ocultarTexto",
  "setVariable",
  "giveItem",
  "addItem",
  "playSound",
  "stopSound",
  "stopAllSounds",
  "pauseSound",
  "resumeSound",
  "setVolume",
  "wait",
  "waitForClick",
  "waitClick",
  "esperarClick",
  "minigame",
  "rescue",
  "setDelay",
  "addDelay",
  "goToScene",
  "setNextChapter",
  "playVideo",
  "cutscene",
  "shake",
  "screenShake",
  "flash",
  "grade",
  "colorGrade",
  "tinte",
  "vignette",
  "vigneta",
  "fade",
  "bgPan",
  "showCG",
  "hideCG",
  "sfx",
]);

const knownMinigames = new Set([
  "furrielvaExplore",
  "chiliHarvest",
  "guindillas",
  "ketchupBoss",
  "ketchup",
  "ecchi",
  "paloma",
  "runa",
  "runeChanneling",
  "rune_channeling",
  "canalizacionRunas",
  "gatos",
  "vocalecho",
  "rhythm",
  "battle",
  "credits",
  "creditos",
  "chase",
  "eduvuelo",
]);

function validateCharacterAction(action, where) {
  if (!action.character) {
    errors.push(`${where}: la acción ${action.type} requiere character`);
    return;
  }
  const key = resolveCharacter(action.character);
  if (!key) {
    errors.push(`${where}: personaje desconocido «${action.character}»`);
    return;
  }
  const character = characters.get(key);
  const poses = action.poses || action.frames || (action.pose ? [action.pose] : []);
  for (const pose of poses) {
    if (String(pose).endsWith("_video")) continue;
    if (!character.poses?.[pose] && pose !== character.defaultPose) {
      errors.push(`${where}: pose «${pose}» ausente en characters/${key}.json`);
    }
  }
}

function validateSpeaker(name, where, field) {
  if (!name || name === "???") return;
  if (!resolveCharacter(name)) {
    errors.push(`${where}: ${field} desconocido «${name}»`);
  }
}

for (const file of filesIn(chaptersDir, ".json")) {
  const chapter = readJson(file);
  if (!chapter) continue;
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  const scenes = chapter.scenes || [];
  const titles = new Set(scenes.map((scene) => scene.title));
  if (titles.size !== scenes.length) errors.push(`${rel}: títulos de escena duplicados`);
  sceneCount += scenes.length;

  scenes.forEach((scene, sceneIndex) => {
    const sceneLabel = scene?.title || sceneIndex + 1;
    if (!scene || typeof scene !== "object" || Array.isArray(scene)) {
      errors.push(`${rel} · escena ${sceneIndex + 1}: estructura inválida`);
      return;
    }
    if (typeof scene.title !== "string" || !scene.title.trim()) {
      errors.push(`${rel} · escena ${sceneIndex + 1}: falta un título válido`);
    }
    if (!Array.isArray(scene.lines)) {
      errors.push(`${rel} · ${sceneLabel}: lines debe ser un array`);
    }
    const lines = Array.isArray(scene.lines) ? scene.lines : [];
    lineCount += lines.length;
    const sceneWhere = `${rel} · ${sceneLabel}`;
    if (!lines.length) warnings.push(`${sceneWhere}: escena vacía`);

    lines.forEach((line, lineIndex) => {
      const where = `${sceneWhere} · línea ${lineIndex + 1}`;
      if (!line || typeof line !== "object" || Array.isArray(line)) {
        errors.push(`${where}: estructura de línea inválida`);
        return;
      }
      validateSpeaker(line.character, where, "character");
      validateSpeaker(line.speakingAs, where, "speakingAs");
      if (line.actions != null && !Array.isArray(line.actions)) {
        errors.push(`${where}: actions debe ser un array`);
      }
      if (line.choices != null && !Array.isArray(line.choices)) {
        errors.push(`${where}: choices debe ser un array`);
      }
      walkAssets(line, where);
      for (const action of line.actions || []) {
        if (!action || typeof action !== "object" || Array.isArray(action)) {
          errors.push(`${where}: acción con estructura inválida`);
          continue;
        }
        if (!knownActions.has(action.type)) {
          errors.push(`${where}: acción desconocida «${action.type}»`);
        }
        if (action.position && !validPositions.has(action.position)) {
          errors.push(`${where}: posición inválida «${action.position}»`);
        }
        if (action.type === "showCharacter" && !action.position) {
          errors.push(`${where}: showCharacter requiere position`);
        }
        if (
          [
            "showCharacter",
            "setPose",
            "animateCharacter",
            "characterAnimation",
            "poseSequence",
            "characterGlitch",
            "glitchCharacter",
            "characterFullGlitch",
            "fullCharacterGlitch",
            "characterGlitchUntilAdvance",
            "glitchUntilAdvance",
          ].includes(action.type)
        ) {
          validateCharacterAction(action, where);
        }
        if (
          ["hideCharacter", "removeCharacter", "quitarPersonaje"].includes(
            action.type,
          )
        ) {
          if (!action.character && !action.position) {
            errors.push(`${where}: ${action.type} requiere character o position`);
          }
          if (action.character) validateCharacterAction(action, where);
        }
        if (
          ["setBackground", "showCG"].includes(action.type) &&
          typeof (action.value || action.path) !== "string"
        ) {
          errors.push(`${where}: ${action.type} requiere una ruta`);
        }
        if (action.type === "playSound" && typeof action.path !== "string") {
          errors.push(`${where}: playSound requiere path`);
        }
        if (action.type === "goToScene" && !titles.has(action.value)) {
          errors.push(`${where}: destino de escena inexistente «${action.value}»`);
        }
        if (action.type === "minigame" && !knownMinigames.has(action.game)) {
          errors.push(`${where}: minijuego desconocido «${action.game}»`);
        }
      }

      for (const choice of line.choices || []) {
        if (!choice || typeof choice !== "object" || Array.isArray(choice)) {
          errors.push(`${where}: elección con estructura inválida`);
          continue;
        }
        if (typeof choice.text !== "string" || !choice.text.trim()) {
          errors.push(`${where}: elección sin texto`);
        }
        if (typeof choice.nextScene === "string" && !titles.has(choice.nextScene)) {
          errors.push(`${where}: elección apunta a escena inexistente «${choice.nextScene}»`);
        } else if (
          typeof choice.nextScene !== "string" &&
          typeof choice.nextChapter !== "string"
        ) {
          errors.push(`${where}: elección sin nextScene ni nextChapter`);
        }
        if (
          typeof choice.nextChapter === "string" &&
          !fs.existsSync(path.join(chaptersDir, `${choice.nextChapter}.json`))
        ) {
          errors.push(`${where}: elección apunta a capítulo inexistente «${choice.nextChapter}»`);
        }
      }
    });
  });
}

const galleryFile = path.join(root, "assets", "metadata", "gallery_manifest.json");
if (fs.existsSync(galleryFile)) {
  const gallery = readJson(galleryFile);
  if (gallery) {
    walkAssets(gallery, "gallery_manifest.json");
    const categories = Array.isArray(gallery.categories) ? gallery.categories : [];
    const categoryIds = categories.map((category) => category?.id).filter(Boolean);
    if (new Set(categoryIds).size !== categoryIds.length) {
      errors.push("gallery_manifest.json: categorías duplicadas");
    }
    const allowedCategories = new Set(categoryIds.filter((id) => id !== "all"));
    const items = Array.isArray(gallery.items) ? gallery.items : [];
    const itemIds = new Set();
    items.forEach((item, index) => {
      const where = `gallery_manifest.json · item ${index + 1}`;
      if (!item?.id || typeof item.id !== "string") {
        errors.push(`${where}: falta id`);
      } else if (itemIds.has(item.id)) {
        errors.push(`${where}: id duplicado «${item.id}»`);
      } else {
        itemIds.add(item.id);
      }
      if (!allowedCategories.has(item?.category)) {
        errors.push(`${where}: categoría desconocida «${item?.category}»`);
      }
      if (!new Set(["image", "video"]).has(item?.type)) {
        errors.push(`${where}: tipo inválido «${item?.type}»`);
      }
      for (const field of ["title", "src", "thumbnail"]) {
        if (typeof item?.[field] !== "string" || !item[field].trim()) {
          errors.push(`${where}: falta ${field}`);
        }
      }
      if (item?.spoiler && !String(item.spoilerReason || "").trim()) {
        warnings.push(`${where}: spoiler sin motivo explicado`);
      }
    });
  }
}

const cleanSpriteFile = path.join(
  root,
  "assets",
  "metadata",
  "sprite_white_halo_cleaned.json",
);
if (fs.existsSync(cleanSpriteFile)) {
  const cleanManifest = readJson(cleanSpriteFile);
  if (cleanManifest) {
    const sprites = cleanManifest.sprites || {};
    walkAssets(sprites, "sprite_white_halo_cleaned.json");
    for (const [id, entry] of Object.entries(sprites)) {
      const separator = id.indexOf(".");
      const characterKey = separator > 0 ? id.slice(0, separator) : "";
      const pose = separator > 0 ? id.slice(separator + 1) : "";
      const where = `sprite_white_halo_cleaned.json · ${id}`;
      if (!characters.get(characterKey)?.poses?.[pose]) {
        errors.push(`${where}: no corresponde a una pose declarada`);
      }
      if (typeof entry?.cleaned !== "string" || !entry.cleaned.trim()) {
        errors.push(`${where}: falta la ruta cleaned`);
      }
    }
  }
}

// Comprobar también rutas literales de las superficies ejecutables que no pasan
// por los JSON de capítulos. Se omiten deliberadamente plantillas dinámicas.
const literalAssetPattern = /assets[\\/][^"`)\s]+?\.(?:png|jpe?g|webp|gif|mp3|wav|ogg|m4a|aac|mp4|webm|json|woff2?|ttf|otf)/gi;
const executableFiles = fs
  .readdirSync(root, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isFile() && /\.(?:js|css|html)$/i.test(entry.name),
  )
  .map((entry) => path.join(root, entry.name));
for (const file of executableFiles) {
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(literalAssetPattern)) {
    const reference = match[0];
    if (/[${}]/.test(reference)) continue;
    const clean = reference.replaceAll("/", path.sep);
    if (!fs.existsSync(path.join(root, clean))) {
      errors.push(`${rel}: asset literal ausente «${reference}»`);
      continue;
    }
    const canonical = exactCaseMismatch(clean);
    if (canonical) {
      errors.push(`${rel}: mayúsculas de asset literal incorrectas «${reference}»; usa «${canonical}»`);
    }
  }
}

const packageFile = path.join(root, "package.json");
const packageData = readJson(packageFile);
if (packageData) {
  const packagedFiles = new Set(packageData.build?.files || []);
  for (const exclusion of [
    "!assets/**/_source/**/*",
    "!assets/images/characters/others/2b.webp",
    "!assets/images/characters/others/2b_happy.webp",
    "!assets/images/characters/others/epod.webp",
    "!characters/epod.json",
  ]) {
    if (!packagedFiles.has(exclusion)) {
      errors.push(`package.json: falta exclusión de build «${exclusion}»`);
    }
  }
}

if (warnings.length) {
  console.log(`\nAvisos (${warnings.length})`);
  warnings.forEach((warning) => console.log(`  - ${warning}`));
}

if (errors.length) {
  console.error(`\nErrores (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exitCode = 1;
} else {
  console.log(
    `Contenido válido: ${filesIn(chaptersDir, ".json").length} capítulos, ` +
      `${sceneCount} escenas, ${lineCount} líneas, ${characters.size} personajes y ` +
      `${assetRefCount} referencias de assets.`,
  );
}
