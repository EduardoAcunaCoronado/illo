(() => {
  // engine/TimeManager.js
  var MediaRegistry = class {
    constructor(browserWindow = window) {
      this.window = browserWindow;
      this.audios = /* @__PURE__ */ new Set();
      this.contexts = /* @__PURE__ */ new Set();
      this.install();
    }
    install() {
      const browserWindow = this.window;
      const NativeAudio = browserWindow.Audio;
      if (NativeAudio && !NativeAudio.__illoTracked) {
        const registry = this;
        const TrackedAudio = function(...args) {
          const audio = new NativeAudio(...args);
          registry.audios.add(audio);
          audio.addEventListener("ended", () => registry.audios.delete(audio), { once: true });
          return audio;
        };
        TrackedAudio.prototype = NativeAudio.prototype;
        Object.setPrototypeOf(TrackedAudio, NativeAudio);
        TrackedAudio.__illoTracked = true;
        browserWindow.Audio = TrackedAudio;
      }
      ["AudioContext", "webkitAudioContext"].forEach((name) => {
        const NativeContext = browserWindow[name];
        if (!NativeContext || NativeContext.__illoTracked) return;
        const registry = this;
        const TrackedContext = function(...args) {
          const context = new NativeContext(...args);
          registry.contexts.add(context);
          return context;
        };
        TrackedContext.prototype = NativeContext.prototype;
        Object.setPrototypeOf(TrackedContext, NativeContext);
        TrackedContext.__illoTracked = true;
        browserWindow[name] = TrackedContext;
      });
    }
  };
  var TimeManager = class {
    constructor(browserWindow = window) {
      this.window = browserWindow;
      this.paused = false;
      this.pausedAt = 0;
      this.pausedDateAt = 0;
      this.totalPaused = 0;
      this.totalDatePaused = 0;
      this.nextId = 1e6;
      this.timers = /* @__PURE__ */ new Map();
      this.frames = /* @__PURE__ */ new Map();
      this.native = {
        setTimeout: browserWindow.setTimeout.bind(browserWindow),
        clearTimeout: browserWindow.clearTimeout.bind(browserWindow),
        setInterval: browserWindow.setInterval.bind(browserWindow),
        clearInterval: browserWindow.clearInterval.bind(browserWindow),
        requestAnimationFrame: browserWindow.requestAnimationFrame.bind(browserWindow),
        cancelAnimationFrame: browserWindow.cancelAnimationFrame.bind(browserWindow),
        performanceNow: browserWindow.performance.now.bind(browserWindow.performance),
        dateNow: browserWindow.Date.now.bind(browserWindow.Date)
      };
      this.install();
    }
    performanceNow = () => {
      const now = this.native.performanceNow();
      return now - this.totalPaused - (this.paused ? now - this.pausedAt : 0);
    };
    dateNow = () => {
      const now = this.native.dateNow();
      return now - this.totalDatePaused - (this.paused ? now - this.pausedDateAt : 0);
    };
    install() {
      const browserWindow = this.window;
      try {
        Object.defineProperty(browserWindow.performance, "now", {
          configurable: true,
          value: this.performanceNow
        });
      } catch (_) {
      }
      browserWindow.Date.now = this.dateNow;
      browserWindow.setTimeout = (callback, delay, ...args) => this.createTimer(callback, delay, args, false);
      browserWindow.setInterval = (callback, delay, ...args) => this.createTimer(callback, delay, args, true);
      browserWindow.clearTimeout = (id) => this.clearTimer(id);
      browserWindow.clearInterval = (id) => this.clearTimer(id);
      browserWindow.requestAnimationFrame = (callback) => this.createFrame(callback);
      browserWindow.cancelAnimationFrame = (id) => this.cancelFrame(id);
    }
    invoke(callback, args) {
      if (typeof callback === "function") callback(...args);
    }
    armTimer(record) {
      if (this.paused || !this.timers.has(record.id)) return;
      record.startedAt = this.native.performanceNow();
      record.nativeId = this.native.setTimeout(
        () => {
          record.nativeId = null;
          if (!this.timers.has(record.id)) return;
          if (record.interval) {
            record.remaining = record.delay;
            this.invoke(record.callback, record.args);
            if (this.timers.has(record.id)) this.armTimer(record);
          } else {
            this.timers.delete(record.id);
            this.invoke(record.callback, record.args);
          }
        },
        Math.max(0, record.remaining)
      );
    }
    createTimer(callback, delay, args, interval) {
      if (this.paused) {
        return interval ? this.native.setInterval(callback, delay, ...args) : this.native.setTimeout(callback, delay, ...args);
      }
      const normalizedDelay = Math.max(0, Number(delay) || 0);
      const record = {
        id: this.nextId++,
        callback,
        args,
        interval,
        delay: normalizedDelay,
        remaining: normalizedDelay,
        startedAt: 0,
        nativeId: null
      };
      this.timers.set(record.id, record);
      this.armTimer(record);
      return record.id;
    }
    clearTimer(id) {
      const record = this.timers.get(id);
      if (!record) {
        this.native.clearTimeout(id);
        this.native.clearInterval(id);
        return;
      }
      if (record.nativeId !== null) this.native.clearTimeout(record.nativeId);
      this.timers.delete(id);
    }
    armFrame(record) {
      if (this.paused || !this.frames.has(record.id)) return;
      record.nativeId = this.native.requestAnimationFrame(() => {
        this.frames.delete(record.id);
        record.callback(this.performanceNow());
      });
    }
    createFrame(callback) {
      if (this.paused) return this.native.requestAnimationFrame(callback);
      const record = { id: this.nextId++, callback, nativeId: null };
      this.frames.set(record.id, record);
      this.armFrame(record);
      return record.id;
    }
    cancelFrame(id) {
      const record = this.frames.get(id);
      if (!record) {
        this.native.cancelAnimationFrame(id);
        return;
      }
      if (record.nativeId !== null) this.native.cancelAnimationFrame(record.nativeId);
      this.frames.delete(id);
    }
    setPaused(value) {
      const next = Boolean(value);
      if (next === this.paused) return;
      if (next) {
        this.paused = true;
        this.pausedAt = this.native.performanceNow();
        this.pausedDateAt = this.native.dateNow();
        for (const record of this.timers.values()) {
          if (record.nativeId === null) continue;
          this.native.clearTimeout(record.nativeId);
          record.nativeId = null;
          record.remaining = Math.max(0, record.remaining - (this.pausedAt - record.startedAt));
        }
        for (const record of this.frames.values()) {
          if (record.nativeId !== null) this.native.cancelAnimationFrame(record.nativeId);
          record.nativeId = null;
        }
        return;
      }
      this.totalPaused += this.native.performanceNow() - this.pausedAt;
      this.totalDatePaused += this.native.dateNow() - this.pausedDateAt;
      this.paused = false;
      for (const record of this.timers.values()) this.armTimer(record);
      for (const record of this.frames.values()) this.armFrame(record);
    }
    isPaused() {
      return this.paused;
    }
    diagnostics() {
      return { paused: this.paused, timers: this.timers.size, frames: this.frames.size };
    }
  };
  function installTimeManager(browserWindow = window) {
    if (browserWindow.__illoTimeManager) return browserWindow.__illoTimeManager;
    const media2 = new MediaRegistry(browserWindow);
    const clock2 = new TimeManager(browserWindow);
    const installed = { media: media2, clock: clock2 };
    browserWindow.__illoTimeManager = installed;
    return installed;
  }

  // engine/ActionInterpreter.js
  var ACTION_ALIASES = Object.freeze({
    show: "showCharacter",
    hide: "hideCharacter",
    remove: "removeCharacter",
    pose: "setPose",
    background: "setBackground",
    sound: "playSound",
    volume: "setVolume",
    click: "waitForClick",
    goto: "goToScene",
    nextChapter: "setNextChapter",
    video: "playVideo",
    cg: "showCG",
    item: "giveItem",
    dialogOff: "hideDialog",
    delay: "setDelay"
  });
  var ACTION_TYPES = Object.freeze([
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
    "characterAnimeFall",
    "animeFall",
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
    "setTextDuration",
    "textDuration",
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
    "sfx"
  ]);
  var ACTION_TYPE_SET = new Set(ACTION_TYPES);
  var POSITIONS = /* @__PURE__ */ new Set(["left", "right", "center"]);
  var NO_POSITIONAL_ARGS = /* @__PURE__ */ new Set([
    "clearBackground",
    "removeBackground",
    "stopAllSounds",
    "waitForClick",
    "waitClick",
    "esperarClick",
    "hideDialog",
    "hideText",
    "ocultarTexto",
    "hideCG"
  ]);
  var POSITIONAL_FIELDS = Object.freeze({
    setBackground: ["value"],
    showCharacter: ["character", "position", "pose"],
    setPose: ["character", "position", "pose"],
    playSound: ["path"],
    stopSound: ["id"],
    pauseSound: ["id"],
    resumeSound: ["id"],
    setVolume: ["id", "volume"],
    wait: ["ms"],
    setTextDuration: ["duration"],
    textDuration: ["duration"],
    minigame: ["game"],
    rescue: ["character"],
    setDelay: ["value"],
    addDelay: ["value"],
    goToScene: ["value"],
    setNextChapter: ["value"],
    playVideo: ["path"],
    cutscene: ["path"],
    shake: ["intensity", "duration"],
    screenShake: ["intensity", "duration"],
    flash: ["color", "duration"],
    grade: ["value", "duration"],
    colorGrade: ["value", "duration"],
    tinte: ["value", "duration"],
    vignette: ["value", "duration"],
    vigneta: ["value", "duration"],
    bgPan: ["zoomFrom", "zoomTo", "duration"],
    showCG: ["path", "duration"],
    sfx: ["name", "on"],
    giveItem: ["item"],
    addItem: ["item"]
  });
  function tokenize(source) {
    const tokens = [];
    let token = "";
    let quote = null;
    let escaped = false;
    for (const character of source.trim()) {
      if (escaped) {
        token += character;
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (quote) {
        if (character === quote) quote = null;
        else token += character;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (/\s/.test(character)) {
        if (token) {
          tokens.push(token);
          token = "";
        }
      } else {
        token += character;
      }
    }
    if (escaped) token += "\\";
    if (quote) throw new SyntaxError(`Comillas sin cerrar en la acci\xF3n: ${source}`);
    if (token) tokens.push(token);
    return tokens;
  }
  function parseScalar(value) {
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "null") return null;
    if (value !== "" && Number.isFinite(Number(value))) return Number(value);
    return value;
  }
  function assignOptions(action, tokens) {
    const positional = [];
    for (const token of tokens) {
      const separator = token.indexOf("=");
      if (separator > 0) {
        const key = token.slice(0, separator);
        const value = token.slice(separator + 1);
        action[key] = parseScalar(value);
      } else {
        positional.push(parseScalar(token));
      }
    }
    return positional;
  }
  function parseMacro(command, tokens) {
    if (command !== "sceneStart") return null;
    const options = {};
    const positional = assignOptions(options, tokens);
    const background = positional[0] || options.background || null;
    const duration = Math.max(0, Number(options.duration) || 350);
    const actions = [{ type: "fade", to: "black", duration }];
    if (background) actions.push({ type: "setBackground", value: background });
    else actions.push({ type: "clearBackground" });
    actions.push({ type: "fade", from: "black", duration });
    return actions;
  }
  function parseAction(action) {
    if (!action || typeof action === "object") return action;
    if (typeof action !== "string") {
      throw new TypeError(`Acci\xF3n no compatible: ${String(action)}`);
    }
    const tokens = tokenize(action);
    const command = tokens.shift();
    if (!command) return null;
    const macro = parseMacro(command, tokens);
    if (macro) return macro;
    const type = ACTION_ALIASES[command] || command;
    if (!ACTION_TYPE_SET.has(type)) throw new SyntaxError(`Acci\xF3n DSL desconocida: ${command}`);
    const parsed = { type };
    const positional = assignOptions(parsed, tokens);
    if (type === "hideCharacter" || type === "removeCharacter" || type === "quitarPersonaje") {
      const target = positional.shift();
      if (target != null) parsed[POSITIONS.has(String(target)) ? "position" : "character"] = target;
    } else if (type === "fade") {
      const direction = positional.shift();
      if (direction === "to" || direction === "from") parsed[direction] = positional.shift() || "black";
      if (positional.length && parsed.duration == null) parsed.duration = positional.shift();
    } else if (!NO_POSITIONAL_ARGS.has(type)) {
      const fields = POSITIONAL_FIELDS[type] || [];
      fields.forEach((field, index) => {
        if (positional[index] !== void 0 && parsed[field] === void 0) parsed[field] = positional[index];
      });
    }
    if (positional.length > (POSITIONAL_FIELDS[type]?.length || 0) && !["fade"].includes(type)) {
      throw new SyntaxError(`Demasiados argumentos en la acci\xF3n DSL: ${action}`);
    }
    return parsed;
  }
  var ActionInterpreter = class {
    constructor(engine) {
      this.engine = engine;
    }
    normalize(action) {
      return parseAction(action);
    }
    async execute(action) {
      const normalized = this.normalize(action);
      if (Array.isArray(normalized)) {
        for (const step of normalized) await this.execute(step);
        return;
      }
      if (!normalized) return;
      await this.executeObject(normalized);
    }
    async executeObject(action) {
      const engine = this.engine;
      switch (action.type) {
        case "clearBackground":
        case "removeBackground":
          engine.clearBackground();
          break;
        case "setBackground":
          engine.setBackground(action.value, action);
          break;
        case "showCharacter":
          await engine.showCharacter(
            action.character,
            action.position,
            action.pose,
            action.flipped,
            action.enter,
            action.offsetY,
            action.scale
          );
          break;
        case "hideCharacter":
          engine.hideCharacter(action.character, action.position, action.exit);
          break;
        case "removeCharacter":
        case "quitarPersonaje":
          engine.removeCharacter(action.character, action.position, action.exit);
          break;
        case "setPose":
          engine.setPose(action.character, action.position, action.pose);
          break;
        case "animateCharacter":
        case "characterAnimation":
        case "poseSequence":
          engine.startCharacterPoseAnimation(action);
          break;
        case "stopCharacterAnimation":
        case "stopPoseSequence":
          engine.stopCharacterPoseAnimation(action.character, action.position);
          break;
        case "characterGlitch":
        case "glitchCharacter":
          engine.triggerCharacterGlitch(action.character, action.position, action.duration);
          break;
        case "characterFullGlitch":
        case "fullCharacterGlitch":
          engine.triggerCharacterFullGlitch(action.character, action.position, action.duration);
          break;
        case "characterGlitchUntilAdvance":
        case "glitchUntilAdvance":
          engine.startCharacterGlitchUntilAdvance(action.character, action.position);
          break;
        case "characterAnimeFall":
        case "animeFall":
          engine.triggerCharacterAnimeFall(action.character, action.position, action);
          break;
        case "hideDialog":
        case "hideText":
        case "ocultarTexto":
          engine.hideDialog();
          break;
        case "setVariable":
          engine.gameState[action.variable] = action.value;
          break;
        case "giveItem":
        case "addItem":
          engine.addItem(action.item || action.value);
          break;
        case "playSound": {
          const soundPath = action.path || action.value;
          engine.audioController.play(soundPath, {
            volume: action.volume !== void 0 ? action.volume : 1,
            loop: action.loop || false,
            autoPlay: action.autoPlay !== false,
            id: action.id,
            fadeIn: action.fadeIn || 0
          });
          break;
        }
        case "stopSound":
          engine.audioController.stop(action.id || action.audio, action.fadeOut || 0);
          break;
        case "stopAllSounds":
          engine.audioController.stopAll();
          break;
        case "pauseSound":
          engine.audioController.pause(action.id || action.audio);
          break;
        case "resumeSound":
          engine.audioController.resume(action.id || action.audio);
          break;
        case "setVolume":
          engine.audioController.setVolume(action.id || action.audio, action.volume);
          break;
        case "wait":
          await engine.wait(action.ms != null ? action.ms : action.value);
          break;
        case "setTextDuration":
        case "textDuration":
          engine.setLineTextDuration(
            action.duration != null ? action.duration : action.ms != null ? action.ms : action.value
          );
          break;
        case "waitForClick":
        case "waitClick":
        case "esperarClick":
          await engine.waitForActionClick();
          break;
        case "minigame":
          await engine.playMinigame(action);
          break;
        case "rescue":
          engine.rescueCharacter(action.character);
          break;
        case "setDelay":
          engine.storyDelay = action.value || 0;
          engine.storyPressure = engine.storyDelay;
          break;
        case "addDelay":
          engine.storyDelay += action.value || 0;
          engine.storyPressure = engine.storyDelay;
          break;
        case "goToScene":
          engine.historyManager.jump(action.value);
          break;
        case "setNextChapter":
          engine.nextChapter = action.value;
          break;
        case "playVideo":
        case "cutscene":
          await engine.playVideo(action);
          break;
        case "shake":
        case "screenShake":
          if (window.Juice) window.Juice.shake(action.intensity || action.value || 8, action.duration || 350);
          break;
        case "flash":
          if (window.Juice) window.Juice.flash(action.color || action.value, action.duration);
          break;
        case "grade":
        case "colorGrade":
        case "tinte":
          if (window.Juice) window.Juice.grade(action.value || action.filter || "none", action.duration);
          break;
        case "vignette":
        case "vigneta":
          if (window.Juice) {
            const strength = action.value != null ? action.value : action.strength;
            window.Juice.vignette(strength, action.duration);
          }
          break;
        case "fade":
          await engine.fadeScene(action);
          break;
        case "bgPan":
          engine.bgPan(action);
          break;
        case "showCG":
          await engine.showCG(action.path || action.value, action.duration, action);
          break;
        case "hideCG":
          engine.hideCG(action.duration);
          break;
        case "sfx":
          if (window.Juice?.sfx) window.Juice.sfx(action.name, action.on !== false, action);
          break;
      }
    }
  };

  // engine/AudioController.js
  var AudioController = class {
    constructor(engine) {
      this.engine = engine;
    }
    play(path, options) {
      return this.engine.playSound(path, options);
    }
    stop(id, fadeOut = 0) {
      return this.engine.stopSound(id, fadeOut);
    }
    stopAll() {
      return this.engine.stopAllSounds();
    }
    pause(id) {
      return this.engine.pauseSound(id);
    }
    resume(id) {
      return this.engine.resumeSound(id);
    }
    setVolume(id, volume) {
      return this.engine.setVolume(id, volume);
    }
    snapshot() {
      return Object.entries(this.engine.audioInstances || {}).filter(([, audio]) => audio && !audio.paused).map(([id, audio]) => ({
        id,
        src: audio._sourcePath || audio.src,
        volume: audio.volume,
        loop: audio.loop
      }));
    }
  };

  // engine/DOMRenderer.js
  var DOMRenderer = class {
    constructor(root = document) {
      this.root = root;
      this.cache = /* @__PURE__ */ new Map();
    }
    get(id) {
      const cached = this.cache.get(id);
      if (cached?.isConnected) return cached;
      const element = this.root.getElementById(id);
      if (element) this.cache.set(id, element);
      return element;
    }
    getBackgroundElement() {
      return this.get("background");
    }
    appendToGame(element) {
      const container = this.get("game-container");
      if (!container) throw new Error("No existe #game-container");
      container.appendChild(element);
      return element;
    }
    removeAll(selector) {
      this.root.querySelectorAll(selector).forEach((element) => element.remove());
    }
  };

  // engine/HistoryManager.js
  var HistoryManager = class {
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
  };

  // engine/VisualNovelEngine.js
  window.MinigameLifeDisplay = Object.freeze({
    normalize(value) {
      return Math.max(0, Math.floor(Number(value) || 0));
    },
    prepare(element, remaining, maximum) {
      const current = this.normalize(remaining);
      const max = Math.max(current, this.normalize(maximum));
      const condensed = current > 5;
      element.classList.toggle("is-condensed", condensed);
      element.setAttribute("aria-label", `${current} de ${max} vidas`);
      return { current, max, condensed };
    },
    renderRepeated(element, remaining, maximum, heart = "\u2764") {
      const state = this.prepare(element, remaining, maximum);
      element.textContent = state.condensed ? `${heart} \xD7 ${state.current}` : heart.repeat(state.current);
    },
    renderSlots(element, remaining, maximum, heart = "\u2764") {
      const state = this.prepare(element, remaining, maximum);
      if (state.condensed) {
        element.innerHTML = `<span class="ss-heart">${heart}</span><span class="minigame-life-count">\xD7 ${state.current}</span>`;
        return;
      }
      const slots = state.max > 5 ? state.current : state.max;
      const lost = Math.max(0, slots - state.current);
      element.innerHTML = Array.from(
        { length: slots },
        (_, index) => `<span class="ss-heart${index < lost ? " ss-lost" : ""}">${heart}</span>`
      ).join("");
    }
  });
  var VisualNovelEngine = class _VisualNovelEngine {
    constructor() {
      this.actionInterpreter = new ActionInterpreter(this);
      this.audioController = new AudioController(this);
      this.domRenderer = new DOMRenderer();
      this.historyManager = new HistoryManager(this);
      this.currentChapter = null;
      this.currentScene = 0;
      this.currentLine = 0;
      this.characters = {};
      this.chapters = {};
      this.gameState = {};
      this.history = [];
      this.isWaitingForInput = false;
      this.fastForward = false;
      this.textPaused = false;
      this._finishTyping = null;
      this._setTypingPaused = null;
      this._lastDialogEmotionKey = null;
      this._lineTextDurationOverride = null;
      this._textSegmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(void 0, { granularity: "grapheme" }) : null;
      this.textSpeedPreset = 2;
      this.typingSpeed = 50;
      this.lastChapterName = null;
      this.speakingCharacter = null;
      this.speakingPosition = null;
      this.characterPositions = {};
      this.stageCharacters = {};
      this.currentBackgroundPath = null;
      this._charColorMissing = /* @__PURE__ */ new Set();
      this.audioInstances = {};
      this.currentMusic = null;
      this.sceneEndedByChoice = false;
      this.sceneHistory = [];
      this._lastSeenScene = null;
      this.sceneAdvances = 0;
      this.completedCalls = [];
      this.nextChapter = null;
      this.rescued = [];
      this.inventory = [];
      this.storyDelay = 0;
      this.storyPressure = 0;
      this._characterPoseAnimations = /* @__PURE__ */ new Map();
      this._characterFrameAnimations = /* @__PURE__ */ new Map();
      this.debugMode = false;
      this.assetStamp = Date.now();
      this.assetUrlCache = /* @__PURE__ */ new Map();
      this.fetchJsonCache = /* @__PURE__ */ new Map();
      this.fetchJsonInFlight = /* @__PURE__ */ new Map();
      this.chapterLoadPromises = /* @__PURE__ */ new Map();
      this.characterLoadPromises = /* @__PURE__ */ new Map();
      this.chapterLinePrefetchPromises = /* @__PURE__ */ new Map();
      this.imagePreloadCache = /* @__PURE__ */ new Map();
      this.preloadedImages = /* @__PURE__ */ new Map();
      this.audioPreloadCache = /* @__PURE__ */ new Map();
      this.loopedAudioByPath = /* @__PURE__ */ new Map();
      this.audioShortPool = /* @__PURE__ */ new Map();
      this.maxAudioPoolPerSource = 3;
      this.characterKeyCache = /* @__PURE__ */ new Map();
      this.blinkIntermediateManifest = null;
      this.blinkIntermediatePromise = null;
      this.layerBlinkManifest = null;
      this.layerBlinkPromise = null;
      this.whiteHaloManifest = null;
      this.whiteHaloPromise = null;
      this._backgroundElement = null;
    }
    _getBackgroundElement() {
      return this.domRenderer.getBackgroundElement();
    }
    // Añade un objeto al inventario (sin duplicar). Persiste entre capítulos.
    addItem(name) {
      if (name && !this.inventory.includes(name)) this.inventory.push(name);
    }
    // Indica si el jugador tiene un objeto en el inventario.
    hasItem(name) {
      return this.inventory.includes(name);
    }
    setFastForward(active) {
      this.fastForward = !!active && !this.textPaused;
      if (this.fastForward && this._finishTyping) {
        this._finishTyping();
      }
    }
    // Pausa exclusivamente el escritor de diálogo. Los minijuegos, vídeos y
    // animaciones siguen su curso cuando el jugador oculta el HUD con H o clic
    // derecho; al mostrarlo de nuevo, el texto continúa por el mismo grafema.
    setTextPaused(paused) {
      this.textPaused = !!paused;
      if (this.textPaused) this.fastForward = false;
      if (this._setTypingPaused) this._setTypingPaused(this.textPaused);
    }
    async fetchJson(path, options = {}) {
      const { allow404 = false, fallback } = options;
      const requestPath = this.cacheBustAsset(path);
      if (this.fetchJsonCache.has(requestPath)) {
        return this.fetchJsonCache.get(requestPath);
      }
      const inFlight = this.fetchJsonInFlight.get(requestPath);
      if (inFlight) {
        return inFlight;
      }
      const request = (async () => {
        const response = await fetch(requestPath, { cache: "no-store" });
        if (!response.ok) {
          if (allow404 && response.status === 404) return null;
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })();
      this.fetchJsonInFlight.set(requestPath, request);
      try {
        const data = await request;
        const resolved = data === void 0 ? fallback : data;
        if (data !== void 0 || fallback !== void 0) {
          this.fetchJsonCache.set(requestPath, resolved);
        }
        return resolved;
      } catch (error) {
        if (fallback === void 0) throw error;
        return fallback;
      } finally {
        this.fetchJsonInFlight.delete(requestPath);
      }
    }
    async loadChapter(chapterName) {
      const normalizedChapterName = String(chapterName);
      const inFlight = this.chapterLoadPromises.get(normalizedChapterName);
      if (inFlight) return inFlight;
      const request = (async () => {
        const chapter = await this.fetchJson(`chapters/${normalizedChapterName}.json`, {
          allow404: true,
          fallback: null
        });
        if (!chapter) return null;
        const isNewChapter = this.lastChapterName !== normalizedChapterName;
        this.lastChapterName = normalizedChapterName;
        this.currentChapter = chapter;
        this.currentScene = 0;
        this.currentLine = 0;
        this._lastDialogEmotionKey = null;
        this.sceneHistory = [];
        this._lastSeenScene = null;
        this.sceneAdvances = 0;
        this.nextChapter = null;
        this.storyDelay = this.storyPressure;
        this.prefetchLineAssets(chapter, 0, 0);
        if (isNewChapter) {
          await this.playChapterIntro(chapter);
        }
        return chapter;
      })();
      this.chapterLoadPromises.set(normalizedChapterName, request);
      try {
        return await request;
      } catch (error) {
        console.error(`Error cargando cap\xEDtulo ${normalizedChapterName}:`, error);
        return null;
      } finally {
        this.chapterLoadPromises.delete(normalizedChapterName);
      }
    }
    _extractLinePrefetchTargets(line) {
      const targets = {
        characters: /* @__PURE__ */ new Set(),
        images: /* @__PURE__ */ new Set(),
        audios: /* @__PURE__ */ new Set()
      };
      if (!line || typeof line !== "object") return targets;
      const addCharacter = (value) => {
        if (!value || typeof value !== "string") return;
        const key = this.getCharacterKey(value);
        if (!key || !/[a-z0-9]/i.test(key)) return;
        targets.characters.add(key);
      };
      const addImage = (value) => {
        if (typeof value !== "string" || !value.trim()) return;
        targets.images.add(value.trim());
      };
      const addAudio = (value) => {
        if (typeof value !== "string" || !value.trim()) return;
        targets.audios.add(value.trim());
      };
      addCharacter(line.character);
      addCharacter(line.speakingAs);
      addImage(line.portrait);
      addImage(line.background);
      const inspectAction = (action) => {
        action = this.actionInterpreter.normalize(action);
        if (Array.isArray(action)) {
          action.forEach(inspectAction);
          return;
        }
        if (!action || typeof action !== "object") return;
        const value = action.value;
        const path = action.path;
        switch (action.type) {
          case "setBackground":
            addImage(value);
            break;
          case "showCG":
            addImage(path || value);
            break;
          case "showCharacter":
            addCharacter(action.character);
            break;
          case "playSound":
            addAudio(path || value);
            break;
          default:
            break;
        }
      };
      for (const action of line.actions || []) {
        inspectAction(action);
      }
      for (const action of line.afterActions || []) {
        inspectAction(action);
      }
      return targets;
    }
    async _prefetchLineAssetsFromTargets(targets) {
      const loads = [];
      for (const key of targets.characters) {
        loads.push(this.loadCharacter(key).catch(() => null));
      }
      if (targets.images.size > 0) {
        loads.push(this.preloadImages([...targets.images]));
      }
      for (const path of targets.audios) {
        loads.push(this.preloadAudio(path).catch(() => null));
      }
      await Promise.allSettled(loads);
    }
    prefetchLineAssets(chapter, sceneIndex = 0, lineIndex = 0) {
      const activeChapter = chapter || this.currentChapter;
      if (!activeChapter?.scenes) return Promise.resolve();
      const scenes = activeChapter.scenes;
      const normalizedSceneIndex = Number(sceneIndex);
      const normalizedLineIndex = Number(lineIndex);
      if (!Number.isInteger(normalizedSceneIndex) || !Number.isInteger(normalizedLineIndex) || normalizedSceneIndex < 0 || normalizedLineIndex < 0) {
        return Promise.resolve();
      }
      const scene = scenes[normalizedSceneIndex];
      if (!scene || !scene.lines) return Promise.resolve();
      const line = scene.lines[normalizedLineIndex];
      if (!line) return Promise.resolve();
      const chapterName = activeChapter.id || this.lastChapterName || `chapter-${normalizedSceneIndex}`;
      const prefetchKey = `line:${chapterName}:${normalizedSceneIndex}:${normalizedLineIndex}`;
      const inFlight = this.chapterLinePrefetchPromises.get(prefetchKey);
      if (inFlight) return inFlight;
      const targets = this._extractLinePrefetchTargets(line);
      const request = this._prefetchLineAssetsFromTargets(targets);
      this.chapterLinePrefetchPromises.set(prefetchKey, request);
      const clean = () => {
        const current = this.chapterLinePrefetchPromises.get(prefetchKey);
        if (current === request) this.chapterLinePrefetchPromises.delete(prefetchKey);
      };
      request.then(clean).catch(clean);
      return request;
    }
    prefetchNextLineAssets() {
      if (!this.currentChapter?.scenes) return Promise.resolve();
      let sceneIndex = Number(this.currentScene);
      let lineIndex = Number(this.currentLine);
      if (!Number.isInteger(sceneIndex) || !Number.isInteger(lineIndex)) return Promise.resolve();
      const scenes = this.currentChapter.scenes;
      let scene = scenes[sceneIndex];
      if (!scene?.lines) return Promise.resolve();
      if (lineIndex >= scene.lines.length) {
        sceneIndex += 1;
        lineIndex = 0;
        scene = scenes[sceneIndex];
      }
      if (!scene?.lines || lineIndex >= scene.lines.length) return Promise.resolve();
      return this.prefetchLineAssets(this.currentChapter, sceneIndex, lineIndex);
    }
    async loadCharacter(characterName) {
      const characterKey = this.getCharacterKey(characterName);
      if (this.characters[characterKey]) return this.characters[characterKey];
      const inFlight = this.characterLoadPromises.get(characterKey);
      if (inFlight) return inFlight;
      const request = (async () => {
        const character = await this.fetchJson(`characters/${characterKey}.json`, {
          allow404: true,
          fallback: null
        });
        if (!character) return null;
        const [intermediates, layerBlinks, whiteHaloCopies] = await Promise.all([
          this.loadBlinkIntermediateManifest(),
          this.loadLayerBlinkManifest(),
          this.loadWhiteHaloManifest()
        ]);
        this.applyWhiteHaloCopies(characterKey, character, whiteHaloCopies);
        this.applyBlinkIntermediateFrames(characterKey, character, intermediates);
        this.applyWhiteHaloAnimationFrames(characterKey, character, whiteHaloCopies);
        this.applyLayerBlinkFrames(characterKey, character, layerBlinks);
        this.characters[characterKey] = character;
        this.characterKeyCache.set(characterKey, characterKey);
        if (character?.name) {
          this.characterKeyCache.set(this._normalizeLookupKey(character.name), characterKey);
        }
        if (Array.isArray(character?.aliases)) {
          character.aliases.forEach((alias) => {
            this.characterKeyCache.set(this._normalizeLookupKey(alias), characterKey);
          });
        }
        return character;
      })();
      this.characterLoadPromises.set(characterKey, request);
      try {
        return await request;
      } catch (error) {
        console.error(`Error cargando personaje ${characterName}:`, error);
        return null;
      } finally {
        this.characterLoadPromises.delete(characterKey);
      }
    }
    async loadBlinkIntermediateManifest() {
      if (this.blinkIntermediateManifest) return this.blinkIntermediateManifest;
      if (!this.blinkIntermediatePromise) {
        this.blinkIntermediatePromise = this.fetchJson("assets/metadata/blink_eye_intermediates.json", {
          fallback: { poses: {} }
        }).catch((error) => {
          console.warn("No se pudieron cargar los intermedios oculares:", error);
          return { poses: {} };
        });
      }
      this.blinkIntermediateManifest = await this.blinkIntermediatePromise;
      return this.blinkIntermediateManifest;
    }
    async loadWhiteHaloManifest() {
      if (this.whiteHaloManifest) return this.whiteHaloManifest;
      if (!this.whiteHaloPromise) {
        this.whiteHaloPromise = this.fetchJson("assets/metadata/sprite_white_halo_cleaned.json", {
          fallback: { sprites: {} }
        }).catch((error) => {
          console.warn("No se pudo cargar el \xEDndice de sprites limpios:", error);
          return { sprites: {} };
        });
      }
      this.whiteHaloManifest = await this.whiteHaloPromise;
      return this.whiteHaloManifest;
    }
    applyWhiteHaloCopies(characterKey, character, manifest) {
      if (!character?.poses || !manifest?.sprites) return;
      Object.keys(character.poses).forEach((pose) => {
        const entry = manifest.sprites[`${characterKey}.${pose}`];
        if (!entry?.cleaned) return;
        const current = character.poses[pose];
        character.poses[pose] = current && typeof current === "object" ? { ...current, src: entry.cleaned } : entry.cleaned;
      });
    }
    applyWhiteHaloAnimationFrames(characterKey, character, manifest) {
      const animations = character?.animations || character?.poseAnimations;
      if (!animations || !manifest?.sprites) return;
      Object.entries(animations).forEach(([pose, config]) => {
        const replacements = manifest.sprites[`${characterKey}.${pose}`]?.animationFrames;
        if (!replacements || typeof replacements !== "object") return;
        const frames = Array.isArray(config) ? config : config?.frames;
        if (!Array.isArray(frames)) return;
        const replaceFrame = (frame) => {
          const source = this.animationFramePath(character, frame);
          const cleaned = replacements[source];
          if (!cleaned) return frame;
          return frame && typeof frame === "object" ? { ...frame, src: cleaned } : cleaned;
        };
        if (Array.isArray(config)) animations[pose] = frames.map(replaceFrame);
        else config.frames = frames.map(replaceFrame);
      });
    }
    async loadLayerBlinkManifest() {
      if (this.layerBlinkManifest) return this.layerBlinkManifest;
      if (!this.layerBlinkPromise) {
        const load = (path) => this.fetchJson(path, { fallback: {} });
        this.layerBlinkPromise = Promise.all([
          load("assets/metadata/blink_eye_region_previews.json"),
          load("assets/metadata/blink_eye_clean_offsets_manual.json"),
          load("assets/metadata/blink_eye_pixel_edits.json")
        ]).then(([previews, offsets, edits]) => {
          const poses = {};
          Object.entries(previews.poses || {}).forEach(([id, pose]) => {
            const half = edits.edits?.saved?.[id]?.half || pose.half;
            const closed = edits.edits?.saved?.[id]?.closed || pose.closed || pose.blinks?.[0];
            const crop = pose.crop;
            const canvas = pose.sourceCanvas;
            if (!pose.sourceBase || !half || !closed || !crop || !canvas) return;
            const transform = offsets.offsets?.[id] || {};
            poses[id] = {
              base: pose.sourceBase,
              crop,
              canvas,
              half,
              closed,
              offsets: {
                half: transform.half || [0, 0],
                closed: transform.closed || [0, 0],
                halfScale: transform.halfScale || [1, 1],
                closedScale: transform.closedScale || [1, 1]
              },
              frames: [
                { state: "half", src: half, duration: 65 },
                { state: "closed", src: closed, duration: 95 },
                { state: "half", src: half, duration: 65 }
              ]
            };
          });
          return { poses };
        }).catch((error) => {
          console.warn("No se pudieron cargar las capas oculares runtime:", error);
          return { poses: {} };
        });
      }
      this.layerBlinkManifest = await this.layerBlinkPromise;
      return this.layerBlinkManifest;
    }
    applyLayerBlinkFrames(characterKey, character, manifest) {
      if (!manifest?.poses || !character?.poses) return;
      character.layerBlinks = character.layerBlinks || {};
      Object.keys(character.poses).forEach((pose) => {
        const config = manifest.poses[`${characterKey}.${pose}`];
        if (config) character.layerBlinks[pose] = config;
      });
    }
    getLayerBlinkConfig(characterKey, pose) {
      return this.layerBlinkManifest?.poses?.[`${characterKey}.${pose}`] || null;
    }
    applyBlinkIntermediateFrames(characterKey, character, manifest) {
      const animations = character?.animations || character?.poseAnimations;
      if (!animations || !manifest?.poses) return;
      Object.entries(animations).forEach(([pose, config]) => {
        const half = manifest.poses[`${characterKey}.${pose}`]?.half;
        if (!half) return;
        const frames = Array.isArray(config) ? config : config?.frames;
        if (!Array.isArray(frames) || !frames.length) return;
        const sources = frames.map((frame) => this.animationFramePath(character, frame));
        if (sources.some((source) => source === half) || sources.some((source) => /blink[_-]half/i.test(source || ""))) {
          return;
        }
        const sequence = [{ src: half, duration: 65 }, ...frames, { src: half, duration: 65 }];
        if (Array.isArray(config)) animations[pose] = sequence;
        else config.frames = sequence;
      });
    }
    getCurrentScene() {
      if (!this.currentChapter || !this.currentChapter.scenes) {
        return null;
      }
      return this.currentChapter.scenes[this.currentScene];
    }
    getCurrentLine() {
      const scene = this.getCurrentScene();
      if (!scene || !scene.lines) {
        return null;
      }
      return scene.lines[this.currentLine];
    }
    // Si la línea define una variante por consecuencia, devuelve una copia con
    // el texto alternativo. Soporta (en orden de prioridad):
    // - byRescueCount: mapa "nº de rescatados" -> texto. Permite revelar la
    //   historia por etapas según el ORDEN de rescate. Al entrar a un Capítulo 2
    //   la acción "rescue" ya se ejecutó, así que rescued.length vale 1, 2 o 3
    //   según si este amigo es el 1º, 2º o 3º/último rescate. Se elige la entrada
    //   cuya clave sea el mayor umbral <= rescued.length (así "3" cubre el último
    //   rescate aunque en el futuro hubiera más amigos).
    // - allRescuedText: se usa cuando ya se ha rescatado a todos (3).
    // - consequence.delayAtLeast: se usa según el retraso acumulado.
    // Si no aplica ninguna, devuelve la línea tal cual.
    resolveConsequenceLine(line) {
      if (line.byRescueCount && typeof line.byRescueCount === "object") {
        const count = this.rescued.length;
        let best = null;
        for (const key of Object.keys(line.byRescueCount)) {
          const threshold = parseInt(key, 10);
          if (!isNaN(threshold) && threshold <= count && (best === null || threshold > best)) {
            best = threshold;
          }
        }
        if (best !== null) {
          return Object.assign({}, line, { text: line.byRescueCount[String(best)] });
        }
      }
      if (line.allRescuedText && this.rescued.length >= 3) {
        return Object.assign({}, line, { text: line.allRescuedText });
      }
      const c = line.consequence;
      if (c && typeof c.delayAtLeast === "number" && this.storyDelay >= c.delayAtLeast && c.text) {
        return Object.assign({}, line, { text: c.text });
      }
      return line;
    }
    async executeAction(action) {
      return this.actionInterpreter.execute(action);
    }
    // Reproduce un vídeo/cutscene a pantalla completa (p. ej. el opening de Tony).
    // El vídeo trae su propio audio; se pausa la música del juego mientras dura y
    // se reanuda al terminar. Se puede saltar con clic / Esc / Enter / Espacio.
    playVideo(action = {}) {
      const src = action.path || action.value || action.src;
      if (!src) {
        console.warn("playVideo: falta la ruta del v\xEDdeo");
        return Promise.resolve();
      }
      const audioCrossfade = Math.max(0, Number(action.audioCrossfade) || 0);
      const holdLastFrame = Math.max(0, Number(action.holdLastFrame) || 0);
      const visualFadeOut = Math.max(0, Number(action.visualFadeOut) || 0);
      const endBackground = action.endBackground || action.finalBackground || null;
      document.body.classList.add("cutscene-active");
      this.clearStage({ preserveAudio: true, immediate: true });
      const paused = [];
      const pausedSet = /* @__PURE__ */ new Set();
      const tryPause = (audio) => {
        if (!audio || audio.paused || pausedSet.has(audio)) return;
        try {
          audio.pause();
          pausedSet.add(audio);
          paused.push(audio);
        } catch (e) {
        }
      };
      tryPause(this.currentMusic);
      for (const a of Object.values(this.audioInstances || {})) tryPause(a);
      this.isWaitingForInput = false;
      return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "cutscene-overlay";
        const video = document.createElement("video");
        video.className = "cutscene-video";
        video.src = this.cacheBustAsset(src);
        video.setAttribute("playsinline", "");
        video.autoplay = true;
        video.controls = false;
        video.muted = !!action.muted;
        const skipHint = document.createElement("div");
        skipHint.className = "cutscene-skip";
        skipHint.textContent = "Clic para saltar \u25B6\u25B6";
        overlay.appendChild(video);
        overlay.appendChild(skipHint);
        document.getElementById("game-container").appendChild(overlay);
        let done = false;
        let crossfadeStarted = false;
        let videoFadeInterval = null;
        const resumeAudio = (audio, duration) => {
          if (!audio || audio._stopping) return;
          if (audio._fadeInterval) {
            clearInterval(audio._fadeInterval);
            audio._fadeInterval = null;
          }
          const kind = audio._volKind || "music";
          const base = audio._baseVol != null ? audio._baseVol : 1;
          const target = Math.max(0, Math.min(1, base * this.volFactor(kind)));
          if (duration <= 0) {
            audio.volume = target;
            try {
              audio.play().catch(() => {
              });
            } catch (e) {
            }
            return;
          }
          audio.volume = 0;
          try {
            audio.play().catch(() => {
            });
          } catch (e) {
          }
          const startedAt = Date.now();
          audio._fadeInterval = setInterval(() => {
            const progress = Math.min((Date.now() - startedAt) / duration, 1);
            audio.volume = target * progress;
            if (progress >= 1) {
              clearInterval(audio._fadeInterval);
              audio._fadeInterval = null;
            }
          }, 20);
        };
        const beginAudioCrossfade = (duration = audioCrossfade) => {
          if (crossfadeStarted) return;
          crossfadeStarted = true;
          const fadeDuration = Math.max(0, duration);
          for (const audio of paused) resumeAudio(audio, fadeDuration);
          if (fadeDuration <= 0 || video.muted || video.volume <= 0) return;
          const initialVolume = video.volume;
          const startedAt = Date.now();
          videoFadeInterval = setInterval(() => {
            const progress = Math.min((Date.now() - startedAt) / fadeDuration, 1);
            video.volume = initialVolume * (1 - progress);
            if (progress >= 1) {
              clearInterval(videoFadeInterval);
              videoFadeInterval = null;
            }
          }, 20);
        };
        const onTimeUpdate = () => {
          if (audioCrossfade <= 0 || crossfadeStarted || !Number.isFinite(video.duration)) return;
          const remainingMs = Math.max(0, (video.duration - video.currentTime) * 1e3);
          if (remainingMs <= audioCrossfade + 140) {
            beginAudioCrossfade(Math.max(250, Math.min(audioCrossfade, remainingMs)));
          }
        };
        const cleanup = () => {
          document.body.classList.remove("cutscene-active");
          overlay.remove();
          resolve();
        };
        const finish = (naturalEnd = false) => {
          if (done) return;
          done = true;
          document.removeEventListener("keydown", onKey);
          video.removeEventListener("timeupdate", onTimeUpdate);
          if (videoFadeInterval) {
            clearInterval(videoFadeInterval);
            videoFadeInterval = null;
          }
          if (endBackground) this.setBackground(endBackground, { cut: true });
          if (!crossfadeStarted) {
            const resumeFade = naturalEnd ? audioCrossfade : Math.min(audioCrossfade, 350);
            beginAudioCrossfade(resumeFade);
          }
          try {
            video.pause();
          } catch (e) {
          }
          const hold = naturalEnd ? holdLastFrame : 0;
          const fade = naturalEnd ? visualFadeOut : Math.min(visualFadeOut, 150);
          setTimeout(() => {
            if (fade <= 0) {
              cleanup();
              return;
            }
            overlay.style.transition = `opacity ${fade}ms ease`;
            overlay.style.opacity = "0";
            setTimeout(cleanup, fade + 30);
          }, hold);
        };
        const onKey = (e) => {
          if (["Escape", "Enter", " ", "Spacebar"].includes(e.key)) {
            e.preventDefault();
            finish(false);
          }
        };
        video.addEventListener("timeupdate", onTimeUpdate);
        video.addEventListener("ended", () => finish(true), { once: true });
        video.addEventListener("error", () => finish(false), { once: true });
        overlay.addEventListener("click", () => finish(false), { once: true });
        document.addEventListener("keydown", onKey);
        const p = video.play();
        if (p && p.catch) {
          p.catch(() => {
            skipHint.textContent = "Clic para reproducir \u25B6";
          });
        }
      });
    }
    // Salta a una escena por título (o índice) dentro del capítulo actual.
    // Marca un salto pendiente para que nextLine detenga el procesamiento
    // normal de la línea y no avance automáticamente.
    // Vaciar el fondo del todo (lo usa el final del compi en cap. 6/créditos)
    clearBackground() {
      if (this.currentBackgroundPath !== null) {
        this.removeAllCharacters();
      }
      this.bgPan({ reset: true });
      clearTimeout(this._bgSwapTimer);
      this._bgSwapTimer = null;
      this.currentBackgroundPath = null;
      const bg = this._getBackgroundElement();
      const bgB = document.getElementById("background-b");
      if (bg) bg.style.backgroundImage = "";
      if (bgB) {
        bgB.style.transition = "none";
        bgB.style.opacity = "0";
        bgB.style.backgroundImage = "";
      }
    }
    jumpToScene(target) {
      let sceneIndex;
      if (typeof target === "string") {
        sceneIndex = this.currentChapter.scenes.findIndex((scene) => scene.title === target);
      } else {
        sceneIndex = target;
      }
      if (sceneIndex === void 0 || sceneIndex === -1) {
        console.warn(`goToScene: escena no encontrada: ${target}`);
        return;
      }
      this.currentScene = sceneIndex;
      this.currentLine = 0;
      this.pendingSceneJump = true;
      this.recordSceneEntry();
      this.hideCG(250);
    }
    // Registrar un personaje como rescatado (mantiene el orden de rescate)
    rescueCharacter(name) {
      if (name && !this.rescued.includes(name)) {
        this.rescued.push(name);
      }
    }
    async playMinigame(action) {
      for (const prop of Object.keys(action)) {
        if (!prop.endsWith("ByDelay")) continue;
        const base = prop.slice(0, -"ByDelay".length);
        const map = action[prop];
        const thresholds = Object.keys(map).map(Number).filter((n) => n <= this.storyDelay).sort((a, b) => a - b);
        if (thresholds.length > 0) {
          const key = thresholds[thresholds.length - 1];
          action = Object.assign({}, action, { [base]: map[key] });
        }
      }
      const cancelacion = new Promise((_, reject) => {
        this._abortarMinijuego = () => {
          this._abortarMinijuego = null;
          const e = new Error("minijuego-cancelado");
          e.minijuegoCancelado = true;
          reject(e);
        };
      });
      try {
        await Promise.race([
          cancelacion,
          (async () => {
            switch (action.game) {
              case "furrielvaExplore":
                await this.playFurrielvaExploreMinigame(action);
                break;
              case "chiliHarvest":
              case "guindillas":
                await this.playChiliHarvestMinigame(action);
                break;
              case "ketchupBoss":
              case "ketchup":
                await this.playKetchupBossMinigame(action);
                break;
              case "ecchi":
                await this.playEcchiMinigame(action);
                break;
              case "paloma":
                await this.playPalomaMinigame(action);
                break;
              case "runa":
                await this.playRunaMinigame(action);
                break;
              case "runeChanneling":
              case "rune_channeling":
              case "canalizacionRunas":
                await this.playRuneChannelingMinigame(action);
                break;
              case "gatos":
                await this.playGatosMinigame(action);
                break;
              case "vocalecho":
                await this.playVocalEchoMinigame(action);
                break;
              case "rhythm":
                await this.playRhythmMinigame(action);
                break;
              case "battle":
                await this.playBattleMinigame(action);
                break;
              case "credits":
              case "creditos":
                await this.playCreditsMinigame(action);
                break;
              case "chase":
                await this.playChaseMinigame(action);
                break;
              case "eduvuelo":
                await this.playEduVueloMinigame(action);
                break;
              default:
                console.warn(`Minijuego desconocido: ${action.game}`);
            }
          })()
        ]);
      } catch (e) {
        if (!e || !e.minijuegoCancelado) throw e;
        this.limpiarMinijuegosActivos();
      } finally {
        this._abortarMinijuego = null;
      }
    }
    // ¿Hay un minijuego en marcha que se pueda abortar? Lo usan los botones de
    // arriba, que ahora se ven también durante los minijuegos.
    hayMinijuegoAbierto() {
      return typeof this._abortarMinijuego === "function";
    }
    abortarMinijuego() {
      const abortar = this._abortarMinijuego;
      if (abortar) abortar();
      this.limpiarMinijuegosActivos();
    }
    // Quitar solo el overlay no basta: un minijuego externo puede conservar
    // RAF, timers, audio o listeners. La base cancela primero esos recursos;
    // los integrados detectan después que su overlay ya no está conectado.
    limpiarMinijuegosActivos({ stopAudio = true } = {}) {
      window.MinigameBase?.cleanupAll?.();
      document.querySelectorAll(".minigame-overlay, .battle-minigame, .credits-minigame").forEach((overlay) => {
        overlay.remove();
      });
      window.HitboxDebugger?.clear?.();
      if (stopAudio) this.stopAllSounds();
    }
    // Investigación narrativa de Furrielva. Furry Maps presenta las zonas como
    // áreas reales del mapa: Samu las introduce, el jugador confirma cada ruta
    // y un Samu diminuto recorre el trayecto desde su última ubicación. Solo el
    // primer desplazamiento parte de la Iglesia del Rocío.
    playFurrielvaExploreMinigame(options = {}) {
      this.isWaitingForInput = false;
      const background = options.background || "assets/images/backgrounds/chapter2/furrielva/mapa_furrielva_furry_maps_v2_4k.webp";
      const samuPortrait = "assets/images/characters/samu/samu_thinking.webp";
      const samuFrames = [1, 2, 3, 4, 5, 7].map((n) => `assets/images/characters/samu/ketchup/${n}.webp`);
      const church = {
        id: "iglesia",
        label: "Iglesia del Roc\xEDo",
        destination: [50, 55.2]
      };
      const locations = [
        {
          id: "plaza",
          label: "Plaza del Roc\xEDo",
          area: "zone-plaza",
          route: "M500 276 C420 230 340 155 220 135",
          destination: [22, 27],
          background: "assets/images/backgrounds/chapter2/furrielva/furrielva_plaza_investigacion_v1_4k.webp",
          npc: "TADEO TRUFA",
          color: "#e98245",
          portrait: "assets/images/characters/furrielva/tadeo_trufa_v1.webp",
          opening: [
            {
              speaker: "TADEO TRUFA",
              text: "Genial... otra entrega tarde. Como vuelvan a cortarme la avenida esos camiones rojos, el jefe me descuenta el viaje."
            },
            {
              speaker: "SAMU",
              text: "Perdona, no quer\xEDa meterme, pero \xBFhas dicho camiones rojos? Me he encontrado esta botella. \xBFReconoces la etiqueta de Kingdom Ketchup?"
            },
            {
              speaker: "TADEO TRUFA",
              text: "No conozco ese nombre. Pero si es una f\xE1brica, esos camiones son lo m\xE1s raro que ha pasado por aqu\xED. \xBFQu\xE9 necesitas saber?"
            }
          ],
          choices: [
            {
              label: "Preguntar por los camiones rojos",
              dialogue: [
                { speaker: "SAMU", text: "\xBFHacia d\xF3nde van cuando salen de la plaza?" },
                {
                  speaker: "TADEO TRUFA",
                  text: "Al anochecer toman la carretera industrial. Sin matr\xEDcula, sin empresa; s\xF3lo una corona encima de un tomate."
                },
                // La plaza tampoco tiene por qué ser la primera parada.
                {
                  speaker: "SAMU",
                  text: ({ clues }) => clues <= 1 ? "Edu mencion\xF3 ketchup. Esa corona puede ser la primera pista de verdad." : `Edu mencion\xF3 ketchup. Esa corona encaja con ${clues === 2 ? "la pista que ya llevo" : "todo lo que ya llevo apuntado"}.`
                }
              ],
              lore: "Los camiones rojos sin matr\xEDcula siguen la carretera industrial y llevan una corona sobre un tomate."
            },
            {
              label: "Preguntar por sus rutas",
              dialogue: [
                { speaker: "SAMU", text: "\xBFTus mapas de reparto no se\xF1alan de d\xF3nde vienen?" },
                {
                  speaker: "TADEO TRUFA",
                  text: "Los nuevos no. Lo extra\xF1o es que mi libreta antigua s\xED marca una nave al final de esa carretera, aunque ahora la calle tiene otro nombre."
                },
                {
                  speaker: "SAMU",
                  text: "O sea, el sitio estaba antes de que el mapa decidiera olvidarlo."
                }
              ],
              lore: "La libreta antigua de Tadeo conserva una nave al final de la carretera industrial, aunque la calle haya cambiado de nombre."
            }
          ]
        },
        {
          id: "comercio",
          label: "Zona comercial",
          area: "zone-commerce",
          route: "M500 276 C430 330 350 375 245 360",
          destination: [25, 72],
          background: "assets/images/backgrounds/chapter2/furrielva/furrielva_zona_comercial_v1_4k.webp",
          npc: "L\xCDA LINCE",
          color: "#c878dc",
          portrait: "assets/images/characters/furrielva/lia_lince_v1.webp",
          opening: [
            {
              speaker: "L\xCDA LINCE",
              text: "Fant\xE1stico. Seis cajas que nadie ha pedido, un proveedor sin direcci\xF3n y una promoci\xF3n que no existe. \xBFD\xF3nde se supone que meto yo todo esto?"
            },
            {
              speaker: "SAMU",
              text: "Eh... perdona. No quer\xEDa escuchar, pero \xBFhas dicho que el proveedor no tiene direcci\xF3n?"
            },
            {
              speaker: "L\xCDA LINCE",
              text: "\xA1Ah! No te hab\xEDa visto. S\xED, han aparecido esta ma\xF1ana. \xBFT\xFA tambi\xE9n vienes a reclamarme algo?"
            },
            {
              speaker: "SAMU",
              text: "Al contrario. Busco Kingdom Ketchup y Furry Maps se niega a mostrarme d\xF3nde est\xE1."
            },
            {
              speaker: "L\xCDA LINCE",
              text: "Pues las cajas llevan una corona con tomate y las palabras \xABKingdom Ketchup\xBB. Parece que los dos buscamos al mismo fantasma."
            }
          ],
          choices: [
            {
              label: "Examinar las cajas",
              dialogue: [
                { speaker: "SAMU", text: "\xBFPuedo mirar la etiqueta de env\xEDo?" },
                {
                  speaker: "L\xCDA LINCE",
                  text: "Adelante. S\xF3lo trae un lote, K-K/03, y una ruta de recogida hacia la salida industrial."
                },
                { speaker: "SAMU", text: "K-K. No es precisamente una firma discreta." }
              ],
              lore: "Las cajas de Kingdom Ketchup usan el lote K-K/03 y regresan por una ruta hacia la salida industrial."
            },
            {
              label: "Revisar el albar\xE1n",
              dialogue: [
                {
                  speaker: "SAMU",
                  text: "\xBFY el albar\xE1n? A veces queda una direcci\xF3n en la letra peque\xF1a."
                },
                {
                  speaker: "L\xCDA LINCE",
                  text: "Direcci\xF3n, ninguna. Pero mira los comercios: El Jarr\xF3n, Noche y Mercaguasa. Ayer ten\xEDan otros nombres; hoy hasta los recibos antiguos aparecen corregidos."
                },
                { speaker: "SAMU", text: "Vale... esto ya no es una campa\xF1a publicitaria normal." }
              ],
              lore: "Los nombres de las tiendas y hasta sus recibos antiguos han cambiado sin que L\xEDa los modificara."
            }
          ]
        },
        {
          id: "callejon",
          label: "Callej\xF3n de servicio",
          area: "zone-alley",
          route: "M500 276 C565 215 635 150 730 135",
          destination: [73, 27],
          background: "assets/images/backgrounds/chapter2/furrielva/furrielva_callejon_tuberias_v1_4k.webp",
          npc: "RULO MAPACHE",
          color: "#55b9c8",
          portrait: "assets/images/characters/furrielva/rulo_mapache_v1.webp",
          opening: [
            {
              speaker: "RULO MAPACHE",
              text: "Presi\xF3n en la l\xEDnea siete, calor en la acometida... y el plano insiste en que aqu\xED no hay ninguna nave. Claro que s\xED, plano. Lo que t\xFA digas."
            },
            { speaker: "SAMU", text: "Perdona... \xBFest\xE1s discutiendo con un mapa?" },
            {
              speaker: "RULO MAPACHE",
              text: "Con un mapa no. Con el gracioso que lo actualiz\xF3. Hay una instalaci\xF3n consumiendo media red y, seg\xFAn esto, s\xF3lo existe un solar vac\xEDo."
            },
            {
              speaker: "SAMU",
              text: "Estoy buscando una f\xE1brica que tampoco aparece en Furry Maps. Kingdom Ketchup."
            },
            {
              speaker: "RULO MAPACHE",
              text: "Entonces puede que tu f\xE1brica y mi tuber\xEDa fantasma sean el mismo problema."
            }
          ],
          choices: [
            {
              label: "Seguir la tuber\xEDa marcada",
              dialogue: [
                { speaker: "SAMU", text: "\xBFPuedes saber ad\xF3nde llega por la presi\xF3n?" },
                {
                  speaker: "RULO MAPACHE",
                  text: "Sale bajo tierra y reaparece en el l\xEDmite industrial, justo debajo del solar que el mapa deja en blanco."
                },
                // El callejón puede ser la primera, segunda o tercera zona visitada,
                // así que la frase se ajusta a las pistas reunidas hasta ese momento.
                {
                  speaker: "SAMU",
                  text: ({ clues }) => clues <= 1 ? "Primera pista y ya apunta a ese solar. A ver si las dem\xE1s coinciden." : `${clues === 2 ? "Dos pistas, el mismo lugar. Ya no parece una casualidad." : "Tres pistas, el mismo lugar. Demasiada casualidad."} `
                }
              ],
              lore: "La conducci\xF3n reaparece bajo el solar vac\xEDo del l\xEDmite industrial."
            },
            {
              label: "Preguntar por el fallo del mapa",
              dialogue: [
                { speaker: "SAMU", text: "\xBFQu\xE9 ocurre cuando acercas el mapa a esa parcela?" },
                {
                  speaker: "RULO MAPACHE",
                  text: "Ruido, bandas de colores y vuelta al solar vac\xEDo. Siempre la misma zona, incluso sin conexi\xF3n."
                },
                {
                  speaker: "SAMU",
                  text: "Entonces no es cobertura. Hay algo ah\xED y el mapa no consigue ense\xF1arlo."
                }
              ],
              lore: "El mapa falla siempre sobre la misma parcela, incluso sin conexi\xF3n a la red."
            }
          ]
        }
      ];
      this.preloadImages([
        background,
        samuPortrait,
        ...samuFrames,
        ...locations.flatMap((location) => [location.background, location.portrait])
      ]);
      return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "minigame-overlay furrielva-explore";
        overlay.innerHTML = `
                <div class="furrielva-device" role="application" aria-label="Furry Maps">
                    <i class="furrielva-side-button furrielva-side-button-a" aria-hidden="true"></i>
                    <i class="furrielva-side-button furrielva-side-button-b" aria-hidden="true"></i>
                    <div class="furrielva-screen">
                        <div class="furrielva-statusbar"><span>09:41</span><span>FURRIELVA \xB7 5G&nbsp;&nbsp;\u25C9</span></div>
                        <div class="furrielva-head">
                            <div class="furrielva-brand"><span aria-hidden="true">\u{1F43E}</span><div><strong>Furry Maps</strong><small>Modo investigaci\xF3n</small></div></div>
                            <div class="furrielva-search"><span aria-hidden="true">\u2315</span><div><b>Explorar Furrielva</b><small>Pregunta en tres zonas para localizar Kingdom Ketchup</small></div></div>
                            <span class="furrielva-counter">0 / ${locations.length}</span>
                        </div>
                        <div class="furrielva-map" style="--furrielva-bg:url('${this.cacheBustAsset(background)}')">
                            <svg class="furrielva-route" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
                                <path></path>
                            </svg>
                            <div class="furrielva-landmark"><span aria-hidden="true">\u25C6</span>Iglesia del Roc\xEDo</div>
                            ${locations.map((location) => `<button class="furrielva-zone ${location.area}" data-location="${location.id}" disabled><b>${location.label}</b><small>Seleccionar zona</small></button>`).join("")}
                            <div class="furrielva-kingdom-lock" aria-label="Zona no disponible"><span>UBICACI\xD3N INESTABLE</span><i></i><i></i><i></i></div>
                            <img class="furrielva-mini-samu" alt="Samu recorriendo la ruta" src="${this.cacheBustAsset(samuFrames[0])}">
                            <div class="furrielva-tour" aria-live="polite">
                                <img src="${this.cacheBustAsset(samuPortrait)}" alt="Samu">
                                <div><strong>SAMU</strong><p></p><button type="button">Siguiente</button></div>
                            </div>
                            <div class="furrielva-card" aria-live="polite">Primero voy a ordenar las posibilidades.</div>
                            <div class="furrielva-confirm" role="dialog" aria-modal="true" aria-labelledby="furrielva-confirm-title" hidden>
                                <div><small>FURRY MAPS</small><h3 id="furrielva-confirm-title">\xBFMarcar como ruta?</h3><p></p><span><button type="button" data-confirm="no">Seguir mirando</button><button type="button" data-confirm="yes">Marcar ruta</button></span></div>
                            </div>
                            <div class="furrielva-location-scene" hidden>
                                <div class="furrielva-npc-portrait" role="img"></div>
                                <div class="furrielva-location-dialogue"><strong></strong><p></p><div class="furrielva-location-choices"></div></div>
                            </div>
                            <div class="furrielva-blackout" aria-hidden="true"></div>
                        </div>
                        <div class="furrielva-appnav" aria-hidden="true"><span class="is-active">\u2316<small>Mapa</small></span><span>\u2667<small>Lugares</small></span><span>\u25CF<small>Perfil</small></span></div>
                    </div>
                </div>
                <div class="minigame-instructions">Explora las zonas resaltadas \xB7 Tambi\xE9n puedes usar Tab y Enter</div>`;
        document.getElementById("game-container").appendChild(overlay);
        const visited = /* @__PURE__ */ new Set();
        const lore = [];
        let currentLocation = church;
        const map = overlay.querySelector(".furrielva-map");
        const card = overlay.querySelector(".furrielva-card");
        const counter = overlay.querySelector(".furrielva-counter");
        const tour = overlay.querySelector(".furrielva-tour");
        const tourText = tour.querySelector("p");
        const tourButton = tour.querySelector("button");
        const confirm = overlay.querySelector(".furrielva-confirm");
        const locationScene = overlay.querySelector(".furrielva-location-scene");
        const routeSvg = overlay.querySelector(".furrielva-route");
        const routePath = routeSvg.querySelector("path");
        const miniSamu = overlay.querySelector(".furrielva-mini-samu");
        const kingdomLock = overlay.querySelector(".furrielva-kingdom-lock");
        const swallow = (e) => e.stopPropagation();
        overlay.addEventListener("click", swallow);
        let tourIndex = 0;
        let pendingLocation = null;
        const tourLines = [
          {
            id: "plaza",
            text: "Esta botella vac\xEDa lleva el nombre de Kingdom Ketchup. La plaza est\xE1 llena de repartidores; alguno reconocer\xE1 la etiqueta o sabr\xE1 de d\xF3nde ha salido."
          },
          {
            id: "comercio",
            text: "Si nadie reconoce el nombre, probar\xE9 en la zona comercial. Los comercios conocen a casi todos los repartidores y proveedores de la ciudad."
          },
          {
            id: "callejon",
            text: "Y ese callej\xF3n de servicio parece comunicar con las instalaciones de la ciudad. Quiz\xE1 alg\xFAn trabajador municipal sepa qu\xE9 hay detr\xE1s del fallo del mapa."
          }
        ];
        const zoneButton = (id) => overlay.querySelector(`[data-location="${id}"]`);
        const setTourStep = () => {
          overlay.querySelectorAll(".furrielva-zone").forEach((zone) => zone.classList.remove("is-tour-focus"));
          const step = tourLines[tourIndex];
          zoneButton(step.id)?.classList.add("is-tour-focus");
          tourText.textContent = step.text;
          tourButton.textContent = tourIndex === tourLines.length - 1 ? "Empezar a investigar" : "Siguiente zona";
        };
        const finishTour = () => {
          overlay.querySelectorAll(".furrielva-zone").forEach((zone) => {
            zone.classList.remove("is-tour-focus");
            zone.disabled = false;
          });
          tour.classList.add("is-leaving");
          setTimeout(() => {
            tour.hidden = true;
          }, 280);
          card.textContent = "Pasa el cursor por una zona y elige por d\xF3nde empezar.";
        };
        tourButton.addEventListener("click", () => {
          if (tourIndex < tourLines.length - 1) {
            tourIndex += 1;
            setTourStep();
          } else {
            finishTour();
          }
        });
        setTourStep();
        const resetRoute = () => {
          routeSvg.classList.remove("is-active");
          routePath.setAttribute("d", "");
          miniSamu.className = "furrielva-mini-samu";
          miniSamu.style.left = "";
          miniSamu.style.top = "";
          map.classList.remove("is-travelling");
        };
        const renderLocation = (location) => {
          locationScene.hidden = false;
          locationScene.style.setProperty("--location-bg", `url('${this.cacheBustAsset(location.background)}')`);
          const portrait = locationScene.querySelector(".furrielva-npc-portrait");
          portrait.style.setProperty("--npc-portrait", `url('${this.cacheBustAsset(location.portrait)}')`);
          portrait.setAttribute("aria-label", location.npc);
          const speaker = locationScene.querySelector("strong");
          const text = locationScene.querySelector("p");
          const choices = locationScene.querySelector(".furrielva-location-choices");
          const setSpeaker = (name) => {
            speaker.textContent = name;
            const color = name === "SAMU" ? this.characters.samu && this.characters.samu.color || "red" : name === location.npc ? location.color : "#55d8c6";
            speaker.style.color = this.readableNameColor(color);
          };
          const returnToMap = () => {
            visited.add(location.id);
            currentLocation = location;
            const zone = zoneButton(location.id);
            zone.classList.add("is-found");
            zone.disabled = true;
            counter.textContent = `${visited.size} / ${locations.length}`;
            locationScene.classList.add("is-leaving");
            setTimeout(() => {
              locationScene.hidden = true;
              locationScene.classList.remove("is-leaving");
              resetRoute();
              if (visited.size === locations.length) revealKingdom();
              else
                card.textContent = `Pista conseguida en ${location.label}. Quedan ${locations.length - visited.size}.`;
            }, 420);
          };
          const showDialogue = (lines, onComplete) => {
            let index = 0;
            const showCurrent = () => {
              const line = lines[index];
              setSpeaker(line.speaker);
              text.textContent = typeof line.text === "function" ? line.text({ clues: visited.size + 1, total: locations.length }) : line.text;
              choices.innerHTML = `<button type="button" data-continue>${index === lines.length - 1 ? "Continuar" : "Siguiente"}</button>`;
              choices.querySelector("[data-continue]").addEventListener(
                "click",
                () => {
                  index += 1;
                  if (index < lines.length) showCurrent();
                  else onComplete();
                },
                { once: true }
              );
            };
            showCurrent();
          };
          const showChoices = () => {
            choices.innerHTML = location.choices.map((choice, index) => `<button type="button" data-choice="${index}">${choice.label}</button>`).join("");
            choices.querySelectorAll("[data-choice]").forEach((button) => {
              button.addEventListener(
                "click",
                () => {
                  const choice = location.choices[Number(button.dataset.choice)];
                  lore.push({ location: location.id, text: choice.lore });
                  showDialogue(choice.dialogue, () => {
                    setSpeaker("PISTA REGISTRADA");
                    text.textContent = choice.lore;
                    choices.innerHTML = '<button type="button" data-return-map>Volver a Furry Maps</button>';
                    choices.querySelector("[data-return-map]").addEventListener("click", returnToMap, { once: true });
                  });
                },
                { once: true }
              );
            });
          };
          showDialogue(location.opening, showChoices);
        };
        const routeBetween = (from, to) => {
          if (!from || from.id === church.id) return to.route;
          const [fromXPercent, fromYPercent] = from.destination;
          const [toXPercent, toYPercent] = to.destination;
          const startX = fromXPercent * 10;
          const startY = fromYPercent * 5;
          const endX = toXPercent * 10;
          const endY = toYPercent * 5;
          const deltaX = endX - startX;
          const deltaY = endY - startY;
          const distance = Math.max(1, Math.hypot(deltaX, deltaY));
          const side = from.id.localeCompare(to.id) < 0 ? 1 : -1;
          const bend = Math.min(70, Math.max(28, distance * 0.14)) * side;
          const normalX = -deltaY / distance;
          const normalY = deltaX / distance;
          const point = (value) => Math.round(value * 10) / 10;
          const control1X = startX + deltaX * 0.33 + normalX * bend;
          const control1Y = startY + deltaY * 0.33 + normalY * bend;
          const control2X = startX + deltaX * 0.67 + normalX * bend;
          const control2Y = startY + deltaY * 0.67 + normalY * bend;
          return `M${point(startX)} ${point(startY)} C${point(control1X)} ${point(control1Y)} ${point(control2X)} ${point(control2Y)} ${point(endX)} ${point(endY)}`;
        };
        const animateRoute = (location) => {
          confirm.hidden = true;
          const departure = currentLocation;
          routePath.setAttribute("d", routeBetween(departure, location));
          routeSvg.classList.add("is-active");
          const length = routePath.getTotalLength();
          const startPoint = routePath.getPointAtLength(0);
          miniSamu.style.left = `${startPoint.x / 10}%`;
          miniSamu.style.top = `${startPoint.y / 5}%`;
          miniSamu.classList.add("is-walking");
          miniSamu.hidden = false;
          card.textContent = `Ruta: ${departure.label} \u2192 ${location.label}`;
          const duration = 2600;
          const started = performance.now();
          let currentFrame = -1;
          const move = (now) => {
            if (!overlay.isConnected) return;
            const progress = Math.min(1, (now - started) / duration);
            const point = routePath.getPointAtLength(length * progress);
            miniSamu.style.left = `${point.x / 10}%`;
            miniSamu.style.top = `${point.y / 5}%`;
            const frame = Math.floor((now - started) / 120) % 4;
            if (frame !== currentFrame) {
              currentFrame = frame;
              miniSamu.src = this.cacheBustAsset(samuFrames[frame]);
            }
            if (progress < 1) {
              requestAnimationFrame(move);
              return;
            }
            miniSamu.src = this.cacheBustAsset(samuFrames[4]);
            miniSamu.classList.remove("is-walking");
            miniSamu.classList.add("is-celebrating");
            card.textContent = `\xA1Destino alcanzado: ${location.label}!`;
            setTimeout(() => {
              map.classList.add("is-travelling");
              setTimeout(() => renderLocation(location), 650);
            }, 720);
          };
          requestAnimationFrame(move);
        };
        const askForRoute = (location) => {
          pendingLocation = location;
          confirm.querySelector("p").textContent = `La ruta partir\xE1 desde ${currentLocation.label} hasta ${location.label}.`;
          confirm.hidden = false;
          confirm.querySelector('[data-confirm="yes"]').focus();
        };
        confirm.querySelector('[data-confirm="no"]').addEventListener("click", () => {
          confirm.hidden = true;
          pendingLocation = null;
        });
        confirm.querySelector('[data-confirm="yes"]').addEventListener("click", () => {
          if (!pendingLocation) return;
          const location = pendingLocation;
          pendingLocation = null;
          animateRoute(location);
        });
        locations.forEach((location) => {
          const button = zoneButton(location.id);
          button.addEventListener("mouseenter", () => {
            if (!button.disabled) card.textContent = `${location.label}: pulsa para consultar la ruta.`;
          });
          button.addEventListener("focus", () => {
            if (!button.disabled) card.textContent = `${location.label}: pulsa para consultar la ruta.`;
          });
          button.addEventListener("click", () => askForRoute(location));
        });
        const revealKingdom = () => {
          card.textContent = "Las tres pistas se\xF1alan el mismo vac\xEDo. El mapa est\xE1 intentando ocultar algo.";
          kingdomLock.classList.add("is-revealing");
          setTimeout(() => {
            kingdomLock.classList.add("is-revealed");
            card.innerHTML = "<strong>SAMU:</strong> Ah\xED est\xE1s. La f\xE1brica s\xED estaba aqu\xED; alguna interferencia la borraba del mapa. Kingdom Ketchup\u2026 voy para all\xE1.";
            const finish = document.createElement("button");
            finish.type = "button";
            finish.className = "furrielva-finish";
            finish.textContent = "Marcar Kingdom Ketchup como destino";
            card.appendChild(finish);
            finish.addEventListener(
              "click",
              () => {
                map.classList.add("is-final-route");
                finish.disabled = true;
                setTimeout(() => {
                  overlay.removeEventListener("click", swallow);
                  overlay.remove();
                  this.lastMinigameResult = { explored: true, clues: visited.size, lore };
                  resolve(true);
                }, 1050);
              },
              { once: true }
            );
          }, 1700);
        };
      });
    }
    // Créditos finales del compi (credits-minigame.js). Solo tras cerrar el núcleo.
    async playCreditsMinigame(options = {}) {
      this.isWaitingForInput = false;
      if (!window.CreditsMinigame) {
        console.warn("CreditsMinigame no est\xE1 cargado.");
        return false;
      }
      return await window.CreditsMinigame.play(options);
    }
    async playBattleMinigame(options = {}) {
      this.isWaitingForInput = false;
      if (!window.BattleMinigame) {
        console.warn("BattleMinigame no est\xE1 cargado.");
        return false;
      }
      for (const prop of Object.keys(options)) {
        if (!prop.endsWith("ByDelay")) continue;
        const base = prop.slice(0, -"ByDelay".length);
        const map = options[prop];
        const thresholds = Object.keys(map).map(Number).filter((n) => n <= this.storyDelay).sort((a, b) => a - b);
        if (thresholds.length > 0) {
          const key = thresholds[thresholds.length - 1];
          options = Object.assign({}, options, { [base]: map[key] });
        }
      }
      const diapason = window.BattleMinigame.items?.diapason;
      if (diapason && this.hasItem("diapason") && options.useInventory !== false) {
        const previos = Array.isArray(options.startItems) ? options.startItems : [];
        options = Object.assign({}, options, {
          startItems: [...previos, diapason]
        });
      }
      let won = await window.BattleMinigame.play(options);
      while (!won && options.retryOnDefeat) {
        await this.showMinigameRetry(options.retryText || "\xA1La marea os ha arrollado! \u{1F30A}");
        won = await window.BattleMinigame.play(options);
      }
      return won;
    }
    async playRuneChannelingMinigame(options = {}) {
      this.isWaitingForInput = false;
      if (!window.RuneChannelingMinigame) {
        console.warn("RuneChannelingMinigame no est\xE1 cargado.");
        return false;
      }
      let won = false;
      while (!won) {
        won = await window.RuneChannelingMinigame.play(options);
        if (!won) {
          await this.showMinigameRetry("\xA1El santuario ha rechazado la canalizaci\xF3n!");
        }
      }
      return won;
    }
    // Primera parte del combate de Kingdom Ketchup: durante un tiempo fijo,
    // Samu reúne tantas guindillas como pueda. No se pierde la historia si se
    // recogen pocas; el resultado regula la dificultad de la batalla contra Zip.
    async playChiliHarvestMinigame(options = {}) {
      this.isWaitingForInput = false;
      const collected = await this.runChiliHarvestRound(options);
      const hasChiliBox = this.hasItem("caja_guindillas");
      const boxBonus = hasChiliBox ? Number(options.boxBonus) || 12 : 0;
      this.gameState.chiliCollected = collected;
      this.gameState.neitChiliBonus = boxBonus;
      this.gameState.chiliPower = collected + boxBonus;
      this.gameState.chiliPowerMax = Number(options.maxSpicePower) || 40;
      return collected;
    }
    runChiliHarvestRound(options = {}) {
      if (window.ChiliHarvestMinigame) {
        return window.ChiliHarvestMinigame.play(options);
      }
      console.warn("ChiliHarvestMinigame no est\xE1 cargado.");
      return Promise.resolve(0);
    }
    runLegacyChiliHarvestRound(options = {}) {
      const rawDuration = Number(options.duration) || 22e3;
      const duration = rawDuration <= 120 ? rawDuration * 1e3 : rawDuration;
      const powerGoal = Number(options.powerGoal) || 28;
      const spawnRate = Number(options.spawnRate) || 1.35;
      const speedMult = Number(options.speedMult) || 1.25;
      const chiliChance = options.chiliChance !== void 0 ? Number(options.chiliChance) : 0.72;
      const chiliIcon = this.cacheBustAsset("assets/images/minigames/chapter2/ketchup/chili_v2.webp");
      const ketchupIcon = this.cacheBustAsset(
        "assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_gold.webp"
      );
      const corruptIcon = this.cacheBustAsset(
        "assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_corrupted.webp"
      );
      const playerIcon = this.cacheBustAsset("assets/images/minigames/chapter2/common/samu_player.webp");
      const factoryBackground = this.cacheBustAsset(
        "assets/images/backgrounds/chapter2/kingdom_ketchup/kingdom_ketchup_production_floor_corrupted_v2_4k.webp"
      );
      this.preloadImages([
        "assets/images/minigames/chapter2/ketchup/chili_v2.webp",
        "assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_gold.webp",
        "assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_corrupted.webp",
        "assets/images/minigames/chapter2/common/samu_player.webp",
        "assets/images/characters/edu/edu_picante_wide_transparent.webp",
        "assets/images/characters/samu/samu_charred_closed.webp",
        "assets/images/characters/samu/samu_charred_whiteeyes.webp",
        "assets/images/backgrounds/chapter2/kingdom_ketchup/kingdom_ketchup_production_floor_corrupted_v2_4k.webp"
      ]);
      return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "minigame-overlay chili-harvest-minigame";
        overlay.innerHTML = `
                <div class="minigame-hud chili-harvest-hud">
                    <span class="mg-score"><img class="mg-hud-icon" src="${chiliIcon}" alt="guindilla"><span class="mg-score-text">0</span></span>
                    <span class="chili-power-wrap"><span>PODER PICANTE</span><span class="chili-power-bar"><i></i></span></span>
                    <span class="mg-timer">${Math.ceil(duration / 1e3)} s</span>
                </div>
                <div class="minigame-field" id="mg-field" style="--ketchup-factory:url('${factoryBackground}')">
                    <div class="mg-player" id="mg-player"><img src="${playerIcon}" alt="Samu" draggable="false"></div>
                    <div class="mg-phase-banner is-showing">\xA1Re\xFAne picante para debilitar a Zip!</div>
                </div>
                <div class="minigame-instructions">Mueve con \u2190 \u2192 / A D o el rat\xF3n. Recoge guindillas; el k\xE9tchup normal resta 1 y el negro resta 2.</div>
            `;
        document.getElementById("game-container").appendChild(overlay);
        const field = overlay.querySelector("#mg-field");
        const player = overlay.querySelector("#mg-player");
        const scoreEl = overlay.querySelector(".mg-score-text");
        const timerEl = overlay.querySelector(".mg-timer");
        const powerFill = overlay.querySelector(".chili-power-bar i");
        const fieldRect = () => field.getBoundingClientRect();
        let score = 0;
        let playerX = 0.5;
        let items = [];
        let running = true;
        let spawnTimer = 0;
        let lastTime = null;
        const startTime = performance.now();
        const updateHud = (remaining) => {
          scoreEl.textContent = String(score);
          timerEl.textContent = `${Math.max(0, Math.ceil(remaining / 1e3))} s`;
          powerFill.style.width = `${Math.min(100, score / powerGoal * 100)}%`;
        };
        const updatePlayer = () => {
          player.style.left = `${playerX * 100}%`;
        };
        updatePlayer();
        updateHud(duration);
        let moveLeft = false;
        let moveRight = false;
        const keyDown = (event) => {
          const key = event.key.toLowerCase();
          if (key === "arrowleft" || key === "a") moveLeft = true;
          if (key === "arrowright" || key === "d") moveRight = true;
          if (key.startsWith("arrow")) event.preventDefault();
        };
        const keyUp = (event) => {
          const key = event.key.toLowerCase();
          if (key === "arrowleft" || key === "a") moveLeft = false;
          if (key === "arrowright" || key === "d") moveRight = false;
        };
        const mouseMove = (event) => {
          const rect = fieldRect();
          playerX = Math.max(0.04, Math.min(0.96, (event.clientX - rect.left) / rect.width));
          updatePlayer();
        };
        const swallowClick = (event) => event.stopPropagation();
        document.addEventListener("keydown", keyDown);
        document.addEventListener("keyup", keyUp);
        field.addEventListener("mousemove", mouseMove);
        overlay.addEventListener("click", swallowClick, true);
        const detachControls = () => {
          document.removeEventListener("keydown", keyDown);
          document.removeEventListener("keyup", keyUp);
          field.removeEventListener("mousemove", mouseMove);
          overlay.removeEventListener("click", swallowClick, true);
        };
        const spawnItem = () => {
          const good = Math.random() < chiliChance;
          const corrupt = !good && Math.random() < 0.45;
          const type = good ? "chili" : corrupt ? "corrupt" : "ketchup";
          const icon = good ? chiliIcon : corrupt ? corruptIcon : ketchupIcon;
          const el = document.createElement("div");
          el.className = `mg-item mg-item-${type}`;
          el.innerHTML = `<img src="${icon}" alt="${good ? "guindilla" : "botella de ketchup"}" draggable="false">`;
          const x = 0.05 + Math.random() * 0.9;
          el.style.left = `${x * 100}%`;
          el.style.top = "-10%";
          field.appendChild(el);
          items.push({
            el,
            x,
            y: -0.1,
            speed: (0.28 + Math.random() * 0.22) * speedMult,
            good,
            type
          });
        };
        const cleanup = () => {
          if (!running) return;
          running = false;
          detachControls();
          items.forEach((item) => item.el.remove());
          items = [];
          const result = document.createElement("div");
          result.className = "minigame-result";
          result.textContent = `\xA1${score} guindillas reunidas!`;
          overlay.appendChild(result);
          setTimeout(() => {
            overlay.remove();
            resolve(score);
          }, 1200);
        };
        const loop = (time) => {
          if (!running || !overlay.isConnected) {
            running = false;
            detachControls();
            items.forEach((item) => item.el.remove());
            items = [];
            return;
          }
          const elapsed = time - startTime;
          const remaining = duration - elapsed;
          if (remaining <= 0) return cleanup();
          if (lastTime === null) lastTime = time;
          const dt = Math.min((time - lastTime) / 1e3, 0.05);
          lastTime = time;
          if (moveLeft) playerX = Math.max(0.04, playerX - 1.2 * dt);
          if (moveRight) playerX = Math.min(0.96, playerX + 1.2 * dt);
          updatePlayer();
          updateHud(remaining);
          spawnTimer -= dt;
          if (spawnTimer <= 0) {
            spawnItem();
            spawnTimer = (0.34 + Math.random() * 0.32) / spawnRate;
          }
          for (let index = items.length - 1; index >= 0; index--) {
            const item = items[index];
            item.y += item.speed * dt;
            item.el.style.top = `${item.y * 100}%`;
            const caught = item.y >= 0.8 && item.y <= 0.98 && Math.abs(item.x - playerX) < 0.075;
            if (caught) {
              if (item.good) {
                score++;
                player.classList.add("chili-caught");
                setTimeout(() => player.classList.remove("chili-caught"), 120);
              } else {
                const penalty = item.type === "corrupt" ? 2 : 1;
                score = Math.max(0, score - penalty);
                field.classList.add("mg-hit");
                setTimeout(() => field.classList.remove("mg-hit"), 200);
              }
              updateHud(remaining);
              item.el.remove();
              items.splice(index, 1);
            } else if (item.y > 1.1) {
              item.el.remove();
              items.splice(index, 1);
            }
          }
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      });
    }
    // Bullet hell de José Manuel, conectado a la reserva de guindillas obtenida
    // en la ronda anterior y al posible regalo de Neit.
    async playKetchupBossMinigame(options = {}) {
      this.isWaitingForInput = false;
      const bossGame = window.KetchupMinigame || window.KetchupBossMinigame;
      if (!bossGame) {
        console.warn("KetchupMinigame no est\xE1 cargado.");
        return false;
      }
      const bossOptions = Object.assign({}, options, {
        spicePower: Number(this.gameState.chiliPower) || 0,
        maxSpicePower: Number(this.gameState.chiliPowerMax) || Number(options.maxSpicePower) || 40,
        hasChiliBox: this.hasItem("caja_guindillas")
      });
      let won = false;
      while (!won) {
        won = await bossGame.play(bossOptions);
        if (!won) {
          await this.showMinigameRetry("\xA1Samu ha acabado cubierto de ketchup!");
        }
      }
      return won;
    }
    // Alias para herramientas y escenas antiguas que invocaban este nombre.
    async playKetchupMinigame(options = {}) {
      return this.playKetchupBossMinigame(options);
    }
    // Implementación histórica del recolector, conservada temporalmente para
    // compatibilidad con pruebas antiguas; la historia usa chiliHarvest.
    runKetchupRound(options = {}) {
      const goal = options.goal || 10;
      const maxHits = options.maxHits || 3;
      const duration = options.duration || 0;
      const spawnRate = options.spawnRate || 1;
      const speedMult = options.speedMult || 1;
      const chiliChance = options.chiliChance !== void 0 ? options.chiliChance : 0.6;
      const showExtraInfo = options.showExtraInfo || false;
      const phase1Goal = Math.min(goal - 2, options.phase1Goal || Math.ceil(goal * 0.3));
      const phase2Goal = Math.min(goal - 1, options.phase2Goal || Math.ceil(goal * 0.68));
      const ketchupIcon = this.cacheBustAsset(
        "assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_gold.webp"
      );
      const corruptIcon = this.cacheBustAsset(
        "assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_corrupted.webp"
      );
      const capIcon = this.cacheBustAsset("assets/images/minigames/chapter2/ketchup/golden_cap.webp");
      const chiliIcon = this.cacheBustAsset("assets/images/minigames/chapter2/ketchup/chili_v2.webp");
      this.preloadImages([
        "assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_gold.webp",
        "assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_corrupted.webp",
        "assets/images/minigames/chapter2/ketchup/golden_cap.webp",
        "assets/images/minigames/chapter2/ketchup/chili_v2.webp",
        "assets/images/backgrounds/chapter2/kingdom_ketchup/kingdom_ketchup_production_floor_corrupted_v2_4k.webp",
        "assets/images/minigames/chapter2/common/samu_player.webp"
      ]);
      const musicTrack = options.music;
      return new Promise((resolve) => {
        let musicAudio = null;
        if (musicTrack) {
          musicAudio = new Audio(musicTrack);
          musicAudio.loop = true;
          musicAudio.volume = 0.6;
          musicAudio.play().catch(() => {
          });
        }
        const overlay = document.createElement("div");
        overlay.className = "minigame-overlay ketchup-minigame ketchup-phase-1";
        overlay.innerHTML = `
                <div class="minigame-hud">
                    <span class="mg-score"><img class="mg-hud-icon" src="${ketchupIcon}" alt="ketchup"><span class="mg-score-text">0 / ${goal}</span></span>
                    <span class="mg-phase">FASE 1 \xB7 REACTIVA LA L\xCDNEA</span>
                    <span class="mg-lives"></span>
                    ${showExtraInfo ? `<span class="mg-extra-info" style="margin-left:20px; font-size:0.8em; color:#ffb4b4">\u{1F336}\uFE0F Vel: ${(speedMult * 1.5).toFixed(2)}x</span>` : ""}
                </div>
                <div class="minigame-field" id="mg-field" style="--ketchup-factory:url('${this.cacheBustAsset("assets/images/backgrounds/chapter2/kingdom_ketchup/kingdom_ketchup_production_floor_corrupted_v2_4k.webp")}')">
                    <div class="mg-player" id="mg-player"><img src="${this.cacheBustAsset("assets/images/minigames/chapter2/common/samu_player.webp")}" alt="Samu" draggable="false"></div>
                    <div class="mg-phase-banner">Reactiva la l\xEDnea de embotellado</div>
                </div>
                <div class="minigame-instructions">Mueve con \u2190 \u2192 / A D o el rat\xF3n. Recoge producto limpio y tapones; esquiva corrupci\xF3n y guindillas.</div>
            `;
        document.getElementById("game-container").appendChild(overlay);
        const field = overlay.querySelector("#mg-field");
        const player = overlay.querySelector("#mg-player");
        const scoreEl = overlay.querySelector(".mg-score-text");
        const livesEl = overlay.querySelector(".mg-lives");
        const phaseEl = overlay.querySelector(".mg-phase");
        const phaseBanner = overlay.querySelector(".mg-phase-banner");
        const fieldRect = () => field.getBoundingClientRect();
        let score = 0;
        let lives = maxHits;
        const renderLives = () => {
          window.MinigameLifeDisplay.renderRepeated(livesEl, lives, maxHits, "\u2764\uFE0F");
        };
        renderLives();
        let playerX = 0.5;
        const playerW = 0.12;
        let items = [];
        let running = true;
        let spawnTimer = 0;
        let lastTime = null;
        let phase = 1;
        const setPhase = (next) => {
          if (next === phase) return;
          phase = next;
          overlay.classList.remove("ketchup-phase-1", "ketchup-phase-2", "ketchup-phase-3");
          overlay.classList.add(`ketchup-phase-${phase}`);
          const labels = {
            1: ["FASE 1 \xB7 REACTIVA LA L\xCDNEA", "Reactiva la l\xEDnea de embotellado"],
            2: ["FASE 2 \xB7 DESCOMPRIME", "Separa las botellas limpias de la corrupci\xF3n"],
            3: ["FASE 3 \xB7 LIBERA A EDU", "\xA1Los Ketchlings lanzan tapones dorados!"]
          };
          phaseEl.textContent = labels[phase][0];
          phaseBanner.textContent = labels[phase][1];
          phaseBanner.classList.remove("is-showing");
          void phaseBanner.offsetWidth;
          phaseBanner.classList.add("is-showing");
        };
        const updatePlayerPos = () => {
          player.style.left = `${playerX * 100}%`;
        };
        updatePlayerPos();
        let moveLeft = false;
        let moveRight = false;
        const keyDown = (e) => {
          if (e.key === "ArrowLeft" || e.key === "a") moveLeft = true;
          if (e.key === "ArrowRight" || e.key === "d") moveRight = true;
        };
        const keyUp = (e) => {
          if (e.key === "ArrowLeft" || e.key === "a") moveLeft = false;
          if (e.key === "ArrowRight" || e.key === "d") moveRight = false;
        };
        const mouseMove = (e) => {
          const r = fieldRect();
          playerX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
          updatePlayerPos();
        };
        const swallowClick = (e) => e.stopPropagation();
        document.addEventListener("keydown", keyDown);
        document.addEventListener("keyup", keyUp);
        field.addEventListener("mousemove", mouseMove);
        overlay.addEventListener("click", swallowClick, true);
        const spawnItem = () => {
          const roll = Math.random();
          let type;
          if (phase === 2 && roll < 0.18) type = "corrupt";
          else if (phase === 3 && roll < 0.28) type = "cap";
          else type = roll < chiliChance ? "chili" : "ketchup";
          const el = document.createElement("div");
          el.className = `mg-item mg-item-${type}`;
          const img = document.createElement("img");
          const icons = { chili: chiliIcon, ketchup: ketchupIcon, corrupt: corruptIcon, cap: capIcon };
          const labels = {
            chili: "guindilla",
            ketchup: "botella limpia",
            corrupt: "botella corrupta",
            cap: "tap\xF3n dorado"
          };
          img.src = icons[type];
          img.alt = labels[type];
          img.draggable = false;
          el.appendChild(img);
          const x = Math.random() * 0.9 + 0.05;
          el.style.left = `${x * 100}%`;
          el.style.top = "-10%";
          field.appendChild(el);
          const speedBase = (0.25 + Math.random() * 0.25) * speedMult;
          items.push({
            el,
            x,
            y: -0.1,
            speed: speedBase,
            type
          });
        };
        const cleanup = (won) => {
          running = false;
          document.removeEventListener("keydown", keyDown);
          document.removeEventListener("keyup", keyUp);
          field.removeEventListener("mousemove", mouseMove);
          if (musicAudio) {
            musicAudio.pause();
            musicAudio.currentTime = 0;
          }
          const result = document.createElement("div");
          result.className = "minigame-result";
          result.textContent = won ? "\xA1Banquete de ketchup!" : "\xA1Demasiado picante!";
          overlay.appendChild(result);
          setTimeout(
            () => {
              overlay.removeEventListener("click", swallowClick, true);
              overlay.remove();
              resolve(won);
            },
            won ? 1500 : 800
          );
        };
        const startTime = performance.now();
        const loop = (time) => {
          if (!running || !overlay.isConnected) {
            running = false;
            return;
          }
          if (duration > 0 && time - startTime >= duration) {
            return cleanup(score >= goal);
          }
          if (lastTime === null) lastTime = time;
          const dt = (time - lastTime) / 1e3;
          lastTime = time;
          const moveSpeed = 1.2;
          if (moveLeft) playerX = Math.max(0, playerX - moveSpeed * dt);
          if (moveRight) playerX = Math.min(1, playerX + moveSpeed * dt);
          updatePlayerPos();
          spawnTimer -= dt;
          if (spawnTimer <= 0) {
            spawnItem();
            spawnTimer = (0.7 + Math.random() * 0.6) / spawnRate;
          }
          for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i];
            it.y += it.speed * dt;
            it.el.style.top = `${it.y * 100}%`;
            const hitboxWidth = it.type === "chili" || it.type === "corrupt" ? 0.045 : playerW;
            const caught = it.y >= 0.82 && it.y <= 0.98 && Math.abs(it.x - playerX) < hitboxWidth;
            if (caught) {
              if (it.type === "ketchup" || it.type === "cap") {
                score++;
                scoreEl.textContent = `${score} / ${goal}`;
                if (score >= phase2Goal) setPhase(3);
                else if (score >= phase1Goal) setPhase(2);
              } else {
                const damage = it.type === "corrupt" ? 2 : 1;
                lives = Math.max(0, lives - damage);
                renderLives();
                field.classList.add("mg-hit");
                setTimeout(() => field.classList.remove("mg-hit"), 200);
              }
              it.el.remove();
              items.splice(i, 1);
              continue;
            }
            if (it.y > 1.1) {
              it.el.remove();
              items.splice(i, 1);
            }
          }
          if (score >= goal) return cleanup(true);
          if (lives <= 0) return cleanup(false);
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      });
    }
    // Pantalla de derrota: ofrece reintentar el minijuego.
    // Pantalla de "has perdido, ¿reintentas?". Se puede ABORTAR desde fuera
    // (menú de escenas / retroceder): si no, quien llegue aquí desde el selector
    // se queda encerrado, porque la única salida es ganar el minijuego. Al
    // abortar se rechaza con un error etiquetado que playMinigame recoge y
    // deshace toda la cadena del minijuego de una vez.
    showMinigameRetry(message = "\xA1No ha salido bien!") {
      return new Promise((resolve, reject) => {
        const overlay = document.createElement("div");
        overlay.className = "minigame-overlay minigame-retry";
        overlay.innerHTML = `
                <div class="minigame-result">
                    <div class="mg-retry-title">${message}</div>
                    <div class="mg-retry-buttons">
                        <button id="mg-retry-btn">Reintentar</button>
                    </div>
                </div>
            `;
        document.getElementById("game-container").appendChild(overlay);
        const swallowClick = (e) => {
          if (!e.target.closest("#mg-retry-btn")) {
            e.stopPropagation();
          }
        };
        overlay.addEventListener("click", swallowClick, true);
        const cerrar = () => {
          this._abortarRetry = null;
          overlay.removeEventListener("click", swallowClick, true);
          overlay.remove();
        };
        this._abortarRetry = () => {
          cerrar();
          const e = new Error("minijuego-cancelado");
          e.minijuegoCancelado = true;
          reject(e);
        };
        const retryBtn = overlay.querySelector("#mg-retry-btn");
        retryBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          cerrar();
          resolve(true);
        });
      });
    }
    // ¿Hay una pantalla de reintento esperando? La usan los botones de escenas
    // y de retroceder para saber si tienen que sacarnos de ahí.
    hayRetryAbierto() {
      return typeof this._abortarRetry === "function";
    }
    abortarRetry() {
      if (this._abortarRetry) this._abortarRetry();
    }
    // Minijuego: Micaela Michis (El Jarrón). Estilo Pac-Man: Samu se mueve
    // libremente por el campo y debe SOBREVIVIR huyendo de los gatos que le
    // persiguen durante un tiempo (por defecto 60 s). Si un gato lo alcanza,
    // pierde y puede reintentar.
    async playGatosMinigame(options = {}) {
      this.isWaitingForInput = false;
      let won = false;
      while (!won) {
        won = await this.runGatosRound(options);
        if (!won) {
          await this.showMinigameRetry("\xA1Un gato te ha pillado!");
        }
      }
      return won;
    }
    // Laberinto fijo de "calles de la ciudad" para el minijuego de gatos.
    // '#' = manzana (pared), ' ' = calle transitable. Diseñado en cuadrícula
    // urbana con avenidas horizontales/verticales, sin callejones sin salida
    // y con múltiples rutas de escape. Samu empieza en el centro (S) y los
    // gatos en las esquinas (C). El borde exterior es todo calle (ronda).
    static get GATOS_MAZE() {
      return [
        "                     ",
        " ### ### ### ### ### ",
        " ### ### ### ### ### ",
        "                     ",
        " ### ### ### ### ### ",
        " ### ### ### ### ### ",
        "                     ",
        " ### ### ### ### ### ",
        " ### ### ### ### ### ",
        "                     ",
        " ### ### ### ### ### ",
        " ### ### ### ### ### ",
        "                     ",
        " ### ### ### ### ### ",
        "                     "
      ];
    }
    // Una ronda del minijuego de gatos, estilo Pac-Man por REJILLA. Samu y los
    // gatos recorren las calles del laberinto (giran en las intersecciones).
    // Los gatos persiguen a Samu con búsqueda de camino (BFS) por las calles.
    // Resuelve con true (sobreviviste 'survive' s) o false (te pillaron).
    runGatosRound(options = {}) {
      const surviveMs = (options.survive || 60) * 1e3;
      const catCount = options.cats || 3;
      const catIcon = this.cacheBustAsset("assets/images/minigames/chapter2/common/gato.webp");
      const playerSpeed = options.playerSpeed || 5;
      const catSpeed = options.catSpeed || 3.6;
      const map = _VisualNovelEngine.GATOS_MAZE;
      const rows = map.length;
      const cols = Math.max(...map.map((r) => r.length));
      const isWall = (c, r) => {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return true;
        const row = map[r];
        return c >= row.length ? true : row[c] === "#";
      };
      const isStreet = (c, r) => !isWall(c, r);
      return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "minigame-overlay gatos-minigame";
        overlay.innerHTML = `
                <div class="minigame-hud">
                    <span class="mg-timer">\u23F1\uFE0F ${Math.ceil(surviveMs / 1e3)}s</span>
                    <span class="mg-cats"><img class="mg-hud-icon" src="${catIcon}" alt="gato"> ${catCount}</span>
                </div>
                <div class="minigame-field" id="mg-field-gatos">
                    <div class="mg-maze" id="mg-maze"></div>
                    <div class="mg-player" id="mg-player-gatos"><img src="${this.cacheBustAsset("assets/images/minigames/chapter2/common/samu_player.webp")}" alt="Samu" draggable="false"></div>
                </div>
                <div class="minigame-instructions">\xA1Recorre las calles con \u2190 \u2191 \u2192 \u2193 (o WASD) y aguanta sin que te pillen los gatos!</div>
            `;
        document.getElementById("game-container").appendChild(overlay);
        const field = overlay.querySelector("#mg-field-gatos");
        const maze = overlay.querySelector("#mg-maze");
        const player = overlay.querySelector("#mg-player-gatos");
        const timerEl = overlay.querySelector(".mg-timer");
        maze.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        maze.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const cell = document.createElement("div");
            cell.className = isWall(c, r) ? "mg-wall" : "mg-street";
            maze.appendChild(cell);
          }
        }
        const centerStreet = () => {
          const cc = Math.floor(cols / 2), cr = Math.floor(rows / 2);
          for (let rad = 0; rad < Math.max(rows, cols); rad++) {
            for (let dr = -rad; dr <= rad; dr++) {
              for (let dc = -rad; dc <= rad; dc++) {
                if (isStreet(cc + dc, cr + dr)) return { c: cc + dc, r: cr + dr };
              }
            }
          }
          return { c: 1, r: 1 };
        };
        const start = centerStreet();
        let pcx = start.c + 0.5, pcy = start.r + 0.5;
        let pdir = { x: 0, y: 0 };
        let wantDir = { x: 0, y: 0 };
        const toPct = (cx, cy) => ({ left: cx / cols * 100, top: cy / rows * 100 });
        const placeEntity = (el, cx, cy) => {
          const p = toPct(cx, cy);
          el.style.left = `${p.left}%`;
          el.style.top = `${p.top}%`;
        };
        player.style.bottom = "auto";
        placeEntity(player, pcx, pcy);
        const snapStreet = (c, r) => {
          if (isStreet(c, r)) return { c, r };
          const dirs = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1]
          ];
          for (const [dc, dr] of dirs) if (isStreet(c + dc, r + dr)) return { c: c + dc, r: r + dr };
          return { c, r };
        };
        const catStarts = [
          { c: 1, r: 1 },
          { c: cols - 2, r: rows - 2 },
          { c: cols - 2, r: 1 },
          { c: 1, r: rows - 2 },
          { c: Math.floor(cols / 2), r: 1 },
          { c: Math.floor(cols / 2), r: rows - 2 }
        ].map((p) => snapStreet(p.c, p.r));
        const catImages = [
          this.cacheBustAsset("assets/images/minigames/shared/choices/me-perdonas.webp"),
          this.cacheBustAsset("assets/images/minigames/shared/choices/te-perdono.webp"),
          this.cacheBustAsset("assets/images/minigames/shared/choices/no-te-perdono.webp")
        ];
        const cats = [];
        for (let i = 0; i < catCount; i++) {
          const s = catStarts[i % catStarts.length];
          const el = document.createElement("div");
          el.className = "mg-cat";
          const catImg = document.createElement("img");
          catImg.src = catImages[i % catImages.length];
          catImg.alt = "gato";
          catImg.draggable = false;
          el.appendChild(catImg);
          placeEntity(el, s.c + 0.5, s.r + 0.5);
          field.appendChild(el);
          cats.push({
            el,
            cx: s.c + 0.5,
            cy: s.r + 0.5,
            dir: { x: 0, y: 0 },
            wantDir: { x: 0, y: 0 },
            lastCell: null,
            home: s,
            role: i
          });
        }
        const clampCell = (c, r) => snapStreet(Math.max(0, Math.min(cols - 1, c)), Math.max(0, Math.min(rows - 1, r)));
        const bfsStep = (from, to) => {
          if (from.c === to.c && from.r === to.r) return { x: 0, y: 0 };
          const key = (c, r) => `${c},${r}`;
          const q = [[from.c, from.r]];
          const prev = /* @__PURE__ */ new Map();
          prev.set(key(from.c, from.r), null);
          const dirs = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1]
          ];
          let found = false;
          while (q.length) {
            const [c, r] = q.shift();
            if (c === to.c && r === to.r) {
              found = true;
              break;
            }
            for (const [dc, dr] of dirs) {
              const nc = c + dc, nr = r + dr;
              if (isWall(nc, nr)) continue;
              const k = key(nc, nr);
              if (prev.has(k)) continue;
              prev.set(k, [c, r]);
              q.push([nc, nr]);
            }
          }
          if (!found) return { x: 0, y: 0 };
          let cur = [to.c, to.r];
          let step = cur;
          while (true) {
            const p = prev.get(key(cur[0], cur[1]));
            if (!p) break;
            if (p[0] === from.c && p[1] === from.r) {
              step = cur;
              break;
            }
            cur = p;
          }
          return { x: Math.sign(step[0] - from.c), y: Math.sign(step[1] - from.r) };
        };
        const keyDown = (e) => {
          if (e.key === "ArrowUp" || e.key === "w") wantDir = { x: 0, y: -1 };
          else if (e.key === "ArrowDown" || e.key === "s") wantDir = { x: 0, y: 1 };
          else if (e.key === "ArrowLeft" || e.key === "a") wantDir = { x: -1, y: 0 };
          else if (e.key === "ArrowRight" || e.key === "d") wantDir = { x: 1, y: 0 };
          if (e.key.startsWith("Arrow")) e.preventDefault();
        };
        const swallowClick = (e) => e.stopPropagation();
        document.addEventListener("keydown", keyDown);
        overlay.addEventListener("click", swallowClick, true);
        let running = true;
        let lastTime = null;
        const startTime = performance.now();
        const cleanup = (won) => {
          running = false;
          document.removeEventListener("keydown", keyDown);
          const result = document.createElement("div");
          result.className = "minigame-result";
          result.textContent = won ? "\xA1Escapaste de Micaela Michis!" : "\xA1Un gato te ha pillado!";
          overlay.appendChild(result);
          setTimeout(
            () => {
              overlay.removeEventListener("click", swallowClick, true);
              overlay.remove();
              resolve(won);
            },
            won ? 1500 : 800
          );
        };
        const atCenter = (v) => Math.abs(v - (Math.floor(v) + 0.5)) < 0.08;
        const canGo = (cc, cr, dir) => dir.x === 0 && dir.y === 0 ? false : isStreet(Math.floor(cc) + dir.x, Math.floor(cr) + dir.y);
        const moveGrid = (cx, cy, dir, want, speed, dt) => {
          const cCol = Math.floor(cx), cRow = Math.floor(cy);
          if (want && (want.x !== dir.x || want.y !== dir.y)) {
            if (atCenter(cx) && atCenter(cy) && canGo(cx, cy, want)) {
              cx = cCol + 0.5;
              cy = cRow + 0.5;
              dir = { ...want };
            }
          }
          if (atCenter(cx) && atCenter(cy) && !canGo(cx, cy, dir)) {
            dir = { x: 0, y: 0 };
          }
          let step = speed * dt;
          if (dir.x !== 0 || dir.y !== 0) {
            const nextIsWall = isWall(cCol + dir.x, cRow + dir.y);
            cx += dir.x * step;
            cy += dir.y * step;
            if (nextIsWall) {
              if (dir.x > 0) cx = Math.min(cx, cCol + 0.5);
              if (dir.x < 0) cx = Math.max(cx, cCol + 0.5);
              if (dir.y > 0) cy = Math.min(cy, cRow + 0.5);
              if (dir.y < 0) cy = Math.max(cy, cRow + 0.5);
            }
          }
          return { cx, cy, dir };
        };
        const loop = (time) => {
          if (!running || !overlay.isConnected) {
            running = false;
            return;
          }
          if (lastTime === null) lastTime = time;
          const dt = Math.min((time - lastTime) / 1e3, 0.05);
          lastTime = time;
          const pr = moveGrid(pcx, pcy, pdir, wantDir, playerSpeed, dt);
          pcx = pr.cx;
          pcy = pr.cy;
          pdir = pr.dir;
          placeEntity(player, pcx, pcy);
          const elapsed = time - startTime;
          const scatter = Math.floor(elapsed / 1e3) % 8 < 3;
          const playerCell = { c: Math.floor(pcx), r: Math.floor(pcy) };
          for (const cat of cats) {
            const cellC = Math.floor(cat.cx), cellR = Math.floor(cat.cy);
            const centered = atCenter(cat.cx) && atCenter(cat.cy);
            const newCell = !cat.lastCell || cellC !== cat.lastCell.c || cellR !== cat.lastCell.r;
            const stopped = cat.dir.x === 0 && cat.dir.y === 0;
            if (centered && (newCell || stopped)) {
              let target;
              if (scatter) {
                target = cat.home;
              } else if (cat.role === 0) {
                target = playerCell;
              } else if (cat.role === 1) {
                target = clampCell(playerCell.c + pdir.x * 4, playerCell.r + pdir.y * 4);
              } else {
                const manhattan = Math.abs(cellC - playerCell.c) + Math.abs(cellR - playerCell.r);
                target = manhattan > 6 ? playerCell : cat.home;
              }
              cat.wantDir = bfsStep({ c: cellC, r: cellR }, target);
              cat.lastCell = { c: cellC, r: cellR };
            }
            const cr = moveGrid(cat.cx, cat.cy, cat.dir, cat.wantDir, catSpeed, dt);
            cat.cx = cr.cx;
            cat.cy = cr.cy;
            cat.dir = cr.dir;
            placeEntity(cat.el, cat.cx, cat.cy);
            if (Math.hypot(cat.cx - pcx, cat.cy - pcy) < 0.6) {
              return cleanup(false);
            }
          }
          const remaining = Math.max(0, surviveMs - elapsed);
          timerEl.textContent = `\u23F1\uFE0F ${Math.ceil(remaining / 1e3)}s`;
          if (remaining <= 0) return cleanup(true);
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      });
    }
    // Minijuego: reacción rápida en Ecchi Land.
    // Orquesta las rondas y permite reintentar si pierdes.
    async playEcchiMinigame(options = {}) {
      this.isWaitingForInput = false;
      let won = false;
      while (!won) {
        won = await this.runEcchiRound(options);
        if (!won) {
          await this.showMinigameRetry("\xA1Te dejaste llevar! \u{1F494}");
        }
      }
      return won;
    }
    // Una ronda del minijuego de reacción. Resuelve true (ganada) o false (perdida).
    // Clica 🍑 antes de que desaparezcan; NO cliques 💋 (trampas).
    runEcchiRound(options = {}) {
      const goal = options.goal || 12;
      const maxMisses = options.maxMisses || 3;
      const lifetime = options.lifetime || 1100;
      this.isWaitingForInput = false;
      return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "minigame-overlay ecchi-minigame";
        overlay.innerHTML = `
                <div class="minigame-hud">
                    <span class="mg-score">\u{1F351} 0 / ${goal}</span>
                    <span class="mg-lives"></span>
                </div>
                <div class="minigame-field" id="mg-field-ecchi"></div>
                <div class="minigame-instructions">\xA1Clica los \u{1F351} a tiempo! No toques los \u{1F48B}</div>
            `;
        document.getElementById("game-container").appendChild(overlay);
        const field = overlay.querySelector("#mg-field-ecchi");
        const scoreEl = overlay.querySelector(".mg-score");
        const livesEl = overlay.querySelector(".mg-lives");
        let score = 0;
        let misses = 0;
        const renderLives = () => {
          window.MinigameLifeDisplay.renderRepeated(livesEl, Math.max(0, maxMisses - misses), maxMisses, "\u{1F494}");
        };
        renderLives();
        let running = true;
        let spawnTimeout = null;
        const activeTargets = /* @__PURE__ */ new Set();
        const swallowClick = (e) => {
          if (!e.target.closest(".mg-target")) {
            e.stopPropagation();
          }
        };
        overlay.addEventListener("click", swallowClick, true);
        const registerMiss = () => {
          misses++;
          renderLives();
          field.classList.add("mg-hit");
          setTimeout(() => field.classList.remove("mg-hit"), 200);
          if (misses >= maxMisses) endRound(false);
        };
        const registerHit = () => {
          score++;
          scoreEl.textContent = `\u{1F351} ${score} / ${goal}`;
          if (score >= goal) endRound(true);
        };
        const spawnTarget = () => {
          if (!running || !overlay.isConnected) {
            running = false;
            return;
          }
          const isTrap = Math.random() < 0.35;
          const target = document.createElement("div");
          target.className = "mg-target" + (isTrap ? " mg-trap" : "");
          target.textContent = isTrap ? "\u{1F48B}" : "\u{1F351}";
          target.style.left = `${Math.random() * 80 + 5}%`;
          target.style.top = `${Math.random() * 70 + 10}%`;
          field.appendChild(target);
          activeTargets.add(target);
          const ttl = setTimeout(() => {
            if (!running) return;
            activeTargets.delete(target);
            target.remove();
            if (!isTrap) registerMiss();
          }, lifetime);
          target.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!running) return;
            clearTimeout(ttl);
            activeTargets.delete(target);
            target.remove();
            if (isTrap) {
              registerMiss();
            } else {
              registerHit();
            }
          });
          spawnTimeout = setTimeout(spawnTarget, 550 + Math.random() * 450);
        };
        const endRound = (won) => {
          if (!running) return;
          running = false;
          clearTimeout(spawnTimeout);
          activeTargets.forEach((t) => t.remove());
          activeTargets.clear();
          overlay.removeEventListener("click", swallowClick, true);
          const result = document.createElement("div");
          result.className = "minigame-result";
          result.textContent = won ? "\xA1Resististe la tentaci\xF3n! \u{1F60E}" : "\xA1Ca\xEDste! \u{1F494}";
          overlay.appendChild(result);
          setTimeout(
            () => {
              overlay.remove();
              resolve(won);
            },
            won ? 1500 : 800
          );
        };
        spawnTarget();
      });
    }
    // Minijuego: memoria de palomas (estilo Simon) en Ciudad Paloma.
    // Orquesta las rondas y permite reintentar si pierdes.
    async playPalomaMinigame(options = {}) {
      this.isWaitingForInput = false;
      if (this.hasItem("diapason")) {
        options = Object.assign({}, options, {
          flashMs: Math.round((options.flashMs || 600) * 1.4),
          gapMs: Math.round((options.gapMs || 250) * 1.25),
          rounds: Math.max(1, (options.rounds || 5) - 1),
          diapason: true
        });
      }
      let won = false;
      while (!won) {
        won = await this.runPalomaRound(options);
        if (!won) {
          await this.showMinigameRetry("\xA1Las palomas te confundieron! \u{1F54A}\uFE0F");
        }
      }
      return won;
    }
    // Una partida de memoria: repite la secuencia de palomas que se ilumina.
    // La secuencia crece cada nivel hasta completar `rounds`. Resuelve true/false.
    runPalomaRound(options = {}) {
      const rounds = options.rounds || 5;
      const flashMs = options.flashMs || 600;
      const gapMs = options.gapMs || 250;
      const palomas = ["\u{1F54A}\uFE0F", "\u{1F426}", "\u{1F9A4}", "\u{1F986}"];
      this.isWaitingForInput = false;
      return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "minigame-overlay paloma-minigame";
        overlay.innerHTML = `
                <div class="minigame-hud">
                    <span class="mg-score">Nivel 1 / ${rounds}</span>
                    <span class="mg-status">Observa...</span>
                </div>
                <div class="paloma-grid" id="paloma-grid">
                    ${palomas.map(
          (p, i) => `
                        <button class="paloma-pad" data-index="${i}">${p}</button>
                    `
        ).join("")}
                </div>
                <div class="minigame-instructions">${options.diapason ? "\u{1F509} El Diapas\xF3n de Plata afina las palomas: van m\xE1s lentas. " : ""}Memoriza la secuencia de palomas y rep\xEDtela.</div>
            `;
        document.getElementById("game-container").appendChild(overlay);
        const grid = overlay.querySelector("#paloma-grid");
        const scoreEl = overlay.querySelector(".mg-score");
        const statusEl = overlay.querySelector(".mg-status");
        const pads = Array.from(overlay.querySelectorAll(".paloma-pad"));
        const swallowClick = (e) => {
          if (!e.target.closest(".paloma-pad")) e.stopPropagation();
        };
        overlay.addEventListener("click", swallowClick, true);
        let sequence = [];
        let inputIndex = 0;
        let acceptingInput = false;
        let level = 0;
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const flashPad = async (idx) => {
          pads[idx].classList.add("paloma-active");
          await wait(flashMs);
          pads[idx].classList.remove("paloma-active");
          await wait(gapMs);
        };
        const finish = (won) => {
          acceptingInput = false;
          overlay.removeEventListener("click", swallowClick, true);
          const result = document.createElement("div");
          result.className = "minigame-result";
          result.textContent = won ? "\xA1Memoria de paloma! \u{1F54A}\uFE0F\u{1F389}" : "\xA1Secuencia incorrecta! \u{1F426}";
          overlay.appendChild(result);
          setTimeout(
            () => {
              overlay.remove();
              resolve(won);
            },
            won ? 1500 : 800
          );
        };
        const playSequence = async () => {
          acceptingInput = false;
          statusEl.textContent = "Observa...";
          grid.classList.add("paloma-locked");
          await wait(500);
          for (const idx of sequence) {
            await flashPad(idx);
          }
          grid.classList.remove("paloma-locked");
          statusEl.textContent = "\xA1Tu turno!";
          inputIndex = 0;
          acceptingInput = true;
        };
        const nextLevel = async () => {
          level++;
          scoreEl.textContent = `Nivel ${level} / ${rounds}`;
          sequence.push(Math.floor(Math.random() * pads.length));
          await playSequence();
        };
        pads.forEach((pad, idx) => {
          pad.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (!acceptingInput) return;
            pad.classList.add("paloma-active");
            setTimeout(() => pad.classList.remove("paloma-active"), 180);
            if (idx === sequence[inputIndex]) {
              inputIndex++;
              if (inputIndex >= sequence.length) {
                acceptingInput = false;
                if (level >= rounds) {
                  finish(true);
                } else {
                  statusEl.textContent = "\xA1Bien!";
                  await wait(600);
                  await nextLevel();
                }
              }
            } else {
              finish(false);
            }
          });
        });
        nextLevel();
      });
    }
    // Minijuego: memoria de runas (estilo Simon).
    async playRunaMinigame(options = {}) {
      this.isWaitingForInput = false;
      let won = false;
      while (!won) {
        won = await this.runRunaRound(options);
        if (!won) {
          await this.showMinigameRetry("\xA1La barrera ha rechazado la secuencia!");
        }
      }
      return won;
    }
    // Una partida de memoria: repite la secuencia de runas que se ilumina.
    // La secuencia crece cada nivel hasta completar `rounds`. Resuelve true/false.
    runRunaRound(options = {}) {
      const rounds = options.rounds || 5;
      const flashMs = options.flashMs || 600;
      const gapMs = options.gapMs || 250;
      const runas = [
        { image: "assets/images/minigames/shared/runes/runa_samu.webp", label: "Magia de Samu" },
        { image: "assets/images/minigames/shared/runes/runa_edu.webp", label: "Prisa de Edu" },
        { image: "assets/images/minigames/shared/runes/runa_tony.webp", label: "Purificaci\xF3n de Seraphyna" },
        { image: "assets/images/minigames/shared/runes/runa_jose.webp", label: "Fuerza de Jos\xE9" }
      ];
      this.isWaitingForInput = false;
      return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "minigame-overlay runa-minigame";
        overlay.innerHTML = `
                <div class="minigame-hud">
                    <span class="mg-score">Nivel 1 / ${rounds}</span>
                    <span class="mg-status">Observa...</span>
                </div>
                <div class="runa-grid" id="runa-grid">
                    ${runas.map(
          (runa, i) => `
                        <button class="runa-pad" data-index="${i}" aria-label="${runa.label}">
                            <img class="runa-icon" src="${this.cacheBustAsset(runa.image)}" alt="${runa.label}">
                            <span class="runa-label">${runa.label}</span>
                        </button>
                    `
        ).join("")}
                </div>
                <div class="minigame-instructions">Memoriza la secuencia de runas y rep\xEDtela en el mismo orden.</div>
            `;
        document.getElementById("game-container").appendChild(overlay);
        const grid = overlay.querySelector("#runa-grid");
        const scoreEl = overlay.querySelector(".mg-score");
        const statusEl = overlay.querySelector(".mg-status");
        const pads = Array.from(overlay.querySelectorAll(".runa-pad"));
        const swallowClick = (e) => {
          if (!e.target.closest(".runa-pad")) e.stopPropagation();
        };
        overlay.addEventListener("click", swallowClick, true);
        let sequence = [];
        let requiredRunes = Array.from({ length: pads.length }, (_, i) => i).sort(() => Math.random() - 0.5);
        let inputIndex = 0;
        let acceptingInput = false;
        let level = 0;
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const flashPad = async (idx) => {
          pads[idx].classList.add("runa-active");
          await wait(flashMs);
          pads[idx].classList.remove("runa-active");
          await wait(gapMs);
        };
        const finish = (won) => {
          acceptingInput = false;
          overlay.removeEventListener("click", swallowClick, true);
          const result = document.createElement("div");
          result.className = "minigame-result";
          result.textContent = won ? "\xA1Las runas aceptan la secuencia!" : "\xA1Secuencia incorrecta!";
          overlay.appendChild(result);
          setTimeout(
            () => {
              overlay.remove();
              resolve(won);
            },
            won ? 1500 : 800
          );
        };
        const playSequence = async () => {
          acceptingInput = false;
          statusEl.textContent = "Observa...";
          grid.classList.add("runa-locked");
          await wait(500);
          for (const idx of sequence) {
            await flashPad(idx);
          }
          grid.classList.remove("runa-locked");
          statusEl.textContent = "\xA1Tu turno!";
          inputIndex = 0;
          acceptingInput = true;
        };
        const nextLevel = async () => {
          level++;
          scoreEl.textContent = `Nivel ${level} / ${rounds}`;
          const nextRune = requiredRunes.length > 0 ? requiredRunes.pop() : Math.floor(Math.random() * pads.length);
          sequence.push(nextRune);
          await playSequence();
        };
        pads.forEach((pad, idx) => {
          pad.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (!acceptingInput) return;
            pad.classList.add("runa-active");
            setTimeout(() => pad.classList.remove("runa-active"), 180);
            if (idx === sequence[inputIndex]) {
              inputIndex++;
              if (inputIndex >= sequence.length) {
                acceptingInput = false;
                if (level >= rounds) {
                  finish(true);
                } else {
                  statusEl.textContent = "\xA1Bien!";
                  await wait(600);
                  await nextLevel();
                }
              }
            } else {
              finish(false);
            }
          });
        });
        nextLevel();
      });
    }
    // ============================================================
    // Minijuego: "Vocal Echo / Dúo" (Simon musical) — capítulo de Tony.
    // Tony canta una secuencia de notas (pads que se iluminan y suenan con
    // Web Audio); el jugador la repite. Arranca con `startLength` notas y
    // crece cada estrofa hasta completar `rounds`. Escala con speed/strictTempo.
    // ============================================================
    async playVocalEchoMinigame(options = {}) {
      this.isWaitingForInput = false;
      let won = false;
      while (!won) {
        won = await this.runVocalEchoRound(options);
        if (!won) {
          await this.showMinigameRetry("\xA1Desafinaste! \u{1F3A4} Escucha otra vez a Tony.");
        }
      }
      return won;
    }
    runVocalEchoRound(options = {}) {
      const rounds = options.rounds || 4;
      const startLength = options.startLength || 3;
      const speed = options.speed || 1;
      const strictTempo = !!options.strictTempo;
      const flashMs = Math.max(170, Math.round(520 / speed));
      const gapMs = Math.max(80, Math.round(240 / speed));
      const pads = [
        { freq: 523.25, label: "\u{1F3B5}", color: "#ff4fa3" },
        // C5 magenta
        { freq: 587.33, label: "\u{1F3B6}", color: "#4fd0ff" },
        // D5 cian
        { freq: 659.25, label: "\u{1F3B5}", color: "#b04fff" },
        // E5 morado
        { freq: 783.99, label: "\u{1F3B6}", color: "#ff8cf0" }
        // G5 rosa
      ];
      this.isWaitingForInput = false;
      return new Promise((resolve) => {
        let audioCtx = null;
        const ensureAudio = () => {
          if (!audioCtx) {
            try {
              audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
              audioCtx = null;
            }
          }
          if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
          return audioCtx;
        };
        const playTone = (freq, dur = 0.3) => {
          const ctx = ensureAudio();
          if (!ctx) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(1e-4, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + dur + 0.03);
        };
        const overlay = document.createElement("div");
        overlay.className = "minigame-overlay vocalecho-minigame";
        overlay.innerHTML = `
                <div class="minigame-hud">
                    <span class="mg-score">Estrofa 1 / ${rounds}</span>
                    <span class="mg-status">Escucha a Tony...</span>
                </div>
                <div class="vocalecho-grid" id="vocalecho-grid">
                    ${pads.map(
          (p, i) => `
                        <button class="vocalecho-pad" data-index="${i}" style="--pad-color:${p.color}">${p.label}</button>
                    `
        ).join("")}
                </div>
                <div class="minigame-instructions">\u{1F3A4} Repite la melod\xEDa de Tony: pulsa las notas en el mismo orden.</div>
            `;
        document.getElementById("game-container").appendChild(overlay);
        const grid = overlay.querySelector("#vocalecho-grid");
        const scoreEl = overlay.querySelector(".mg-score");
        const statusEl = overlay.querySelector(".mg-status");
        const padEls = Array.from(overlay.querySelectorAll(".vocalecho-pad"));
        const swallowClick = (e) => {
          if (!e.target.closest(".vocalecho-pad")) e.stopPropagation();
        };
        overlay.addEventListener("click", swallowClick, true);
        let sequence = [];
        let inputIndex = 0;
        let acceptingInput = false;
        let level = 0;
        let turnStart = 0;
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const flashPad = async (idx, withSound = true) => {
          padEls[idx].classList.add("vocalecho-active");
          if (withSound) playTone(pads[idx].freq, flashMs / 1e3);
          await wait(flashMs);
          padEls[idx].classList.remove("vocalecho-active");
          await wait(gapMs);
        };
        const finish = (won) => {
          acceptingInput = false;
          overlay.removeEventListener("click", swallowClick, true);
          const result = document.createElement("div");
          result.className = "minigame-result";
          result.textContent = won ? "\xA1D\xFAo perfecto! \u{1F3A4}\u2728" : "\xA1Se rompi\xF3 la melod\xEDa! \u{1F3B6}\u{1F494}";
          overlay.appendChild(result);
          setTimeout(
            () => {
              overlay.remove();
              resolve(won);
            },
            won ? 1500 : 800
          );
        };
        const playSequence = async () => {
          acceptingInput = false;
          statusEl.textContent = "Escucha a Tony...";
          grid.classList.add("vocalecho-locked");
          await wait(450);
          for (const idx of sequence) {
            await flashPad(idx, true);
          }
          grid.classList.remove("vocalecho-locked");
          statusEl.textContent = strictTempo ? "\xA1Tu turno! (a tiempo)" : "\xA1Tu turno!";
          inputIndex = 0;
          acceptingInput = true;
          turnStart = performance.now();
        };
        const nextLevel = async () => {
          level++;
          scoreEl.textContent = `Estrofa ${level} / ${rounds}`;
          const target = startLength + (level - 1);
          while (sequence.length < target) {
            sequence.push(Math.floor(Math.random() * padEls.length));
          }
          await playSequence();
        };
        padEls.forEach((pad, idx) => {
          pad.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (!acceptingInput) return;
            pad.classList.add("vocalecho-active");
            playTone(pads[idx].freq, 0.26);
            setTimeout(() => pad.classList.remove("vocalecho-active"), 150);
            if (idx === sequence[inputIndex]) {
              inputIndex++;
              if (inputIndex >= sequence.length) {
                acceptingInput = false;
                if (strictTempo) {
                  const budget = sequence.length * (flashMs + gapMs) * 1.8 + 1200;
                  if (performance.now() - turnStart > budget) {
                    finish(false);
                    return;
                  }
                }
                if (level >= rounds) {
                  finish(true);
                } else {
                  statusEl.textContent = "\xA1Afinad\xEDsimo!";
                  await wait(520);
                  await nextLevel();
                }
              }
            } else {
              finish(false);
            }
          });
        });
        nextLevel();
      });
    }
    // ============================================================
    // Minijuego: "Neon Runner" (ritmo tipo DDR) — capítulo de Tony.
    // Caen notas por varios carriles; hay que pulsar la tecla del carril
    // (o clicar el carril) cuando la nota cruza la línea de acierto. Se gana
    // completando la tanda con una precisión >= minAccuracy. Escala con
    // bpm/lanes/hitWindowMs/minAccuracy (resueltos por playMinigame vía ByDelay).
    // ============================================================
    async playRhythmMinigame(options = {}) {
      this.isWaitingForInput = false;
      const avKey = this.getCharacterKey(options.avatar || "samu");
      if (!this.characters[avKey]) {
        await this.loadCharacter(avKey);
      }
      let won = false;
      while (!won) {
        won = await this.runRhythmRound(options);
        if (!won) {
          await this.showMinigameRetry("\xA1Perdiste el ritmo! \u{1F3A7} La multitud casi te absorbe.");
        }
      }
      return won;
    }
    runRhythmRound(options = {}) {
      const bpm = options.bpm || 150;
      const lanes = Math.max(3, Math.min(6, options.lanes || 4));
      const hitWindowMs = options.hitWindowMs || 140;
      const minAccuracy = options.minAccuracy || 0.6;
      const totalNotes = options.totalNotes || 40;
      const travelMs = options.travelMs || 1500;
      const perfectWindowMs = options.perfectWindowMs || hitWindowMs * 0.45;
      const beatMs = 6e4 / bpm;
      const beatOffsetMs = options.beatOffsetMs || 0;
      const beatStep = options.beatStep || 1;
      const audioEl = options.audio || (options.audioId ? this.audioInstances && this.audioInstances[options.audioId] : null);
      const sfxOn = options.sfx !== false;
      const sfxVol = options.sfxVolume !== void 0 ? options.sfxVolume : 1;
      const avatarKey = this.getCharacterKey(options.avatar || "samu");
      const avatarChar = this.characters[avatarKey] || {};
      const aPose = (name, fallback) => this.cacheBustAsset(avatarChar.poses && avatarChar.poses[name] || fallback);
      const avatarPoses = {
        idle: aPose("neutral", `assets/images/characters/${avatarKey}/${avatarKey}.png`),
        perfect: aPose("happy", `assets/images/characters/${avatarKey}/${avatarKey}_happy.png`),
        good: aPose("determined", `assets/images/characters/${avatarKey}/${avatarKey}_determined.png`),
        miss: aPose("worried", `assets/images/characters/${avatarKey}/${avatarKey}_worried.png`)
      };
      const keySets = {
        3: ["D", "F", "J"],
        4: ["D", "F", "J", "K"],
        5: ["D", "F", "G", "J", "K"],
        6: ["S", "D", "F", "J", "K", "L"]
      };
      const keys = keySets[lanes];
      const laneColors = ["#ff4fa3", "#4fd0ff", "#b04fff", "#ff8cf0", "#7cffb2", "#ffd166"];
      const sliderChance = options.sliderChance || 0;
      const sliderBeats = options.sliderBeats || 2;
      const spinnerCount = options.spinnerCount || 0;
      const spinnerTaps = options.spinnerTaps || 14;
      const spinnerBeats = options.spinnerBeats || 3;
      const schedule = [];
      const spinnerAt = /* @__PURE__ */ new Set();
      for (let s = 1; s <= spinnerCount; s++) {
        spinnerAt.add(Math.floor(totalNotes * s / (spinnerCount + 1)));
      }
      let beatCursor = 0;
      for (let i = 0; i < totalNotes; i++) {
        const hitMs = beatOffsetMs + beatCursor * beatMs;
        if (spinnerAt.has(i)) {
          const durMs = spinnerBeats * beatMs;
          schedule.push({ type: "spinner", hitMs, endMs: hitMs + durMs, required: spinnerTaps });
          beatCursor += spinnerBeats + beatStep * 2;
        } else if (Math.random() < sliderChance) {
          const durMs = sliderBeats * beatMs;
          schedule.push({
            type: "slider",
            hitMs,
            endMs: hitMs + durMs,
            durMs,
            lane: Math.floor(Math.random() * lanes)
          });
          beatCursor += sliderBeats + beatStep;
        } else {
          schedule.push({ type: "tap", hitMs, lane: Math.floor(Math.random() * lanes) });
          beatCursor += beatStep;
        }
      }
      this.isWaitingForInput = false;
      return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "minigame-overlay rhythm-minigame";
        overlay.innerHTML = `
                <div class="rhythm-bg"></div>
                <div class="rhythm-avatar" id="rhythm-avatar">
                    <img id="rhythm-avatar-img" src="${avatarPoses.idle}" alt="Samu">
                </div>
                <div class="minigame-hud neon-font">
                    <span class="mg-score">0 / ${totalNotes}</span>
                    <span class="mg-combo">Combo 0</span>
                    <span class="mg-status">Precisi\xF3n objetivo: ${Math.round(minAccuracy * 100)}%</span>
                </div>
                <div class="rhythm-stage">
                    <div class="rhythm-field" id="rhythm-field">
                        <div class="rhythm-grid"></div>
                        ${Array.from({ length: lanes }).map(
          (_, i) => `
                            <div class="rhythm-lane" data-lane="${i}" style="--lane-color:${laneColors[i]}"></div>
                        `
        ).join("")}
                        <div class="rhythm-hitline" id="rhythm-hitline"></div>
                    </div>
                </div>
                <div class="rhythm-keys">
                    ${Array.from({ length: lanes }).map(
          (_, i) => `
                        <button class="rhythm-key" data-lane="${i}" style="--lane-color:${laneColors[i]}">${keys[i]}</button>
                    `
        ).join("")}
                </div>
                <div class="minigame-instructions">\u{1F3A7} Pulsa ${keys.join(" \xB7 ")} (o toca las teclas) cuando la nota llegue a la l\xEDnea.</div>
            `;
        document.getElementById("game-container").appendChild(overlay);
        const field = overlay.querySelector("#rhythm-field");
        const hitlineEl = overlay.querySelector("#rhythm-hitline");
        const scoreEl = overlay.querySelector(".mg-score");
        const comboEl = overlay.querySelector(".mg-combo");
        const statusEl = overlay.querySelector(".mg-status");
        const avatarBox = overlay.querySelector("#rhythm-avatar");
        const avatarImg = overlay.querySelector("#rhythm-avatar-img");
        const laneEls = Array.from(overlay.querySelectorAll(".rhythm-lane"));
        const keyEls = Array.from(overlay.querySelectorAll(".rhythm-key"));
        const swallow = (e) => {
          e.stopPropagation();
        };
        overlay.addEventListener("click", swallow, true);
        const fieldH = () => field.clientHeight;
        const hitY = () => fieldH() * 0.82;
        overlay.querySelector("#rhythm-hitline").style.top = "82%";
        let notes = [];
        let spawnedIdx = 0;
        let judged = 0;
        let hits = 0;
        let combo = 0;
        let running = true;
        let ticker = null;
        let activeSpinner = null;
        let startTime = performance.now();
        let cuentaTimer = null;
        const nowMs = () => {
          if (audioEl && !audioEl.paused && audioEl.currentTime > 0.02) {
            return audioEl.currentTime * 1e3;
          }
          return performance.now() - startTime;
        };
        let sfxCtx = null;
        const ensureSfx = () => {
          if (!sfxOn) return null;
          if (!sfxCtx) {
            try {
              sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
              sfxCtx = null;
            }
          }
          if (sfxCtx && sfxCtx.state === "suspended") sfxCtx.resume();
          return sfxCtx;
        };
        const beep = (freq, dur, delay, type, vol) => {
          const ctx = ensureSfx();
          if (!ctx) return;
          const t = ctx.currentTime + (delay || 0);
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = type || "sine";
          osc.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(1e-4, t);
          g.gain.exponentialRampToValueAtTime((vol || 0.1) * sfxVol, t + 8e-3);
          g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + dur + 0.02);
        };
        const sfx = {
          perfect: () => {
            beep(1046, 0.09, 0, "triangle", 0.12);
            beep(1568, 0.1, 0.05, "triangle", 0.1);
          },
          good: () => {
            beep(784, 0.1, 0, "triangle", 0.1);
          },
          miss: () => {
            beep(196, 0.14, 0, "sawtooth", 0.08);
          },
          break: () => {
            beep(392, 0.09, 0, "square", 0.08);
            beep(174, 0.16, 0.06, "square", 0.08);
          }
        };
        const updateHud = () => {
          scoreEl.textContent = `${hits} / ${totalNotes}`;
          comboEl.textContent = `Combo ${combo}`;
        };
        const flashLane = (lane, cls) => {
          laneEls[lane].classList.add(cls);
          setTimeout(() => laneEls[lane].classList.remove(cls), 140);
        };
        const flashKey = (lane) => {
          const k = keyEls[lane];
          if (!k) return;
          k.classList.add("rhythm-key-press");
          setTimeout(() => k.classList.remove("rhythm-key-press"), 130);
        };
        const burst = (lane, count = 9) => {
          const laneEl = laneEls[lane];
          for (let p = 0; p < count; p++) {
            const s = document.createElement("div");
            s.className = "rhythm-spark";
            s.style.background = laneColors[lane];
            s.style.setProperty("--dx", `${Math.random() * 150 - 75}px`);
            s.style.setProperty("--dy", `${-Math.random() * 100 - 15}px`);
            laneEl.appendChild(s);
            setTimeout(() => s.remove(), 540);
          }
        };
        const JUDGE = {
          perfect: { t: "PERFECT", c: "#4fe8ff" },
          good: { t: "GOOD", c: "#7cffb2" },
          miss: { t: "\u2715", c: "#ff466b" }
        };
        const showJudgment = (lane, kind) => {
          const info = JUDGE[kind];
          if (!info) return;
          const j = document.createElement("div");
          j.className = "rhythm-judge neon-font rj-" + kind;
          j.textContent = info.t;
          j.style.color = info.c;
          overlay.appendChild(j);
          setTimeout(() => j.remove(), 620);
        };
        let avatarTimer = null;
        const setAvatar = (kind) => {
          if (!avatarImg) return;
          avatarImg.src = avatarPoses[kind] || avatarPoses.idle;
          avatarBox.classList.remove("av-perfect", "av-good", "av-miss");
          avatarBox.classList.add("av-" + kind);
          if (avatarTimer) clearTimeout(avatarTimer);
          avatarTimer = setTimeout(() => {
            avatarImg.src = avatarPoses.idle;
            avatarBox.classList.remove("av-perfect", "av-good", "av-miss");
          }, 680);
        };
        const showComboMilestone = () => {
          const b = document.createElement("div");
          b.className = "rhythm-combo-banner neon-font";
          b.textContent = `\u{1F525} COMBO ${combo}`;
          overlay.appendChild(b);
          setTimeout(() => b.remove(), 850);
        };
        const pulseCombo = () => {
          comboEl.classList.remove("mg-combo-pulse");
          void comboEl.offsetWidth;
          comboEl.classList.add("mg-combo-pulse");
          comboEl.style.setProperty("--combo-glow", `${Math.min(1, 0.3 + combo * 0.06)}`);
        };
        const pulseHitline = (good) => {
          hitlineEl.classList.remove("rhythm-hitline-hit", "rhythm-hitline-miss");
          void hitlineEl.offsetWidth;
          hitlineEl.classList.add(good ? "rhythm-hitline-hit" : "rhythm-hitline-miss");
        };
        const finish = (won) => {
          if (!running) return;
          running = false;
          if (ticker) clearInterval(ticker);
          if (cuentaTimer) {
            clearTimeout(cuentaTimer);
            cuentaTimer = null;
          }
          overlay.removeEventListener("click", swallow, true);
          document.removeEventListener("keydown", onKey);
          notes.forEach((n) => n.el.remove());
          notes = [];
          const acc = totalNotes ? Math.round(hits / totalNotes * 100) : 0;
          this.lastMinigameResult = { accuracy: totalNotes ? hits / totalNotes : 0 };
          const result = document.createElement("div");
          result.className = "minigame-result";
          result.textContent = won ? `\xA1Abriste paso! \u{1F389} Precisi\xF3n ${acc}%` : `\xA1Te absorbi\xF3 el trance! \u{1F300} Precisi\xF3n ${acc}%`;
          overlay.appendChild(result);
          setTimeout(
            () => {
              overlay.remove();
              resolve(won);
            },
            won ? 1600 : 900
          );
        };
        const resolveHit = (lane, perfect) => {
          hits++;
          judged++;
          combo++;
          sfx[perfect ? "perfect" : "good"]();
          flashLane(lane, "rhythm-lane-good");
          burst(lane, perfect ? 15 : 8);
          showJudgment(lane, perfect ? "perfect" : "good");
          setAvatar(perfect ? "perfect" : "good");
          pulseCombo();
          pulseHitline(true);
          if (combo > 0 && combo % 10 === 0) showComboMilestone();
          updateHud();
        };
        const spinnerTap = () => {
          const sp = activeSpinner;
          if (!sp) return;
          sp.taps++;
          if (sp.ring) sp.ring.style.transform = `rotate(${sp.taps * 45}deg)`;
          const frac = Math.min(1, sp.taps / sp.required);
          if (sp.fill) sp.fill.style.width = `${frac * 100}%`;
          if (sp.count) sp.count.textContent = `${sp.taps} / ${sp.required}`;
          if (frac >= 1) sp.el.classList.add("rhythm-spinner-full");
        };
        const releaseLane = (lane) => {
          if (keyEls[lane]) keyEls[lane].classList.remove("rhythm-key-hold");
          for (const n of notes) {
            if (n.type === "slider" && n.lane === lane && n.headHit && n.holding && !n.hit) {
              n.holding = false;
              n.el.classList.remove("rhythm-slider-holding");
            }
          }
        };
        const judgeHit = (lane) => {
          if (!running) return;
          if (activeSpinner) {
            spinnerTap();
            flashKey(lane);
            return;
          }
          flashLane(lane, "rhythm-lane-press");
          flashKey(lane);
          const now = nowMs();
          let best = null, bestDt = Infinity;
          for (const n of notes) {
            if (n.lane !== lane || n.hit || n.type === "spinner") continue;
            if (n.type === "slider" && n.headHit) continue;
            const dt = Math.abs(now - n.hitMs);
            if (dt < bestDt) {
              bestDt = dt;
              best = n;
            }
          }
          if (best && bestDt <= hitWindowMs) {
            const perfect = bestDt <= perfectWindowMs;
            if (best.type === "slider") {
              best.headHit = true;
              best.holding = true;
              best.headPerfect = perfect;
              best.el.classList.add("rhythm-slider-holding");
              if (keyEls[lane]) keyEls[lane].classList.add("rhythm-key-hold");
              burst(lane, 6);
              pulseHitline(true);
            } else {
              best.hit = true;
              best.el.classList.add("rhythm-note-hit");
              resolveHit(lane, perfect);
            }
          } else {
            if (combo > 0) sfx.break();
            combo = 0;
            pulseHitline(false);
            updateHud();
          }
        };
        const checkEnd = () => {
          if (judged >= totalNotes) {
            const acc = hits / totalNotes;
            finish(acc >= minAccuracy);
          }
        };
        const soltarTeclas = () => {
          document.removeEventListener("keydown", onKey);
          document.removeEventListener("keyup", onKeyUp);
        };
        const onKey = (e) => {
          if (!overlay.isConnected) return soltarTeclas();
          const lane = keys.indexOf((e.key || "").toUpperCase());
          if (lane === -1) return;
          e.preventDefault();
          if (activeSpinner) {
            spinnerTap();
            flashKey(lane);
            return;
          }
          if (!e.repeat) judgeHit(lane);
        };
        const onKeyUp = (e) => {
          if (!overlay.isConnected) return soltarTeclas();
          const lane = keys.indexOf((e.key || "").toUpperCase());
          if (lane !== -1) releaseLane(lane);
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("keyup", onKeyUp);
        laneEls.forEach((laneEl, i) => {
          laneEl.addEventListener("click", (e) => {
            e.stopPropagation();
            judgeHit(i);
          });
        });
        keyEls.forEach((keyEl, i) => {
          keyEl.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            judgeHit(i);
          });
          keyEl.addEventListener("pointerup", (e) => {
            e.stopPropagation();
            releaseLane(i);
          });
        });
        const spawnEntry = (s) => {
          if (s.type === "spinner") {
            const el = document.createElement("div");
            el.className = "rhythm-spinner neon-font";
            el.innerHTML = '<div class="rhythm-spinner-ring"></div><div class="rhythm-spinner-label">\xA1MACHACA!</div><div class="rhythm-spinner-count">0 / ' + s.required + '</div><div class="rhythm-spinner-bar"><div class="rhythm-spinner-fill"></div></div><div class="rhythm-spinner-timerbar"><div class="rhythm-spinner-timer"></div></div>';
            overlay.appendChild(el);
            notes.push({
              el,
              type: "spinner",
              hitMs: s.hitMs,
              endMs: s.endMs,
              required: s.required,
              taps: 0,
              hit: false,
              active: false,
              ring: el.querySelector(".rhythm-spinner-ring"),
              fill: el.querySelector(".rhythm-spinner-fill"),
              count: el.querySelector(".rhythm-spinner-count"),
              timer: el.querySelector(".rhythm-spinner-timer")
            });
          } else if (s.type === "slider") {
            const el = document.createElement("div");
            el.className = "rhythm-note rhythm-slider";
            el.style.background = laneColors[s.lane];
            laneEls[s.lane].appendChild(el);
            notes.push({
              el,
              type: "slider",
              lane: s.lane,
              hitMs: s.hitMs,
              endMs: s.endMs,
              durMs: s.durMs,
              hit: false,
              headHit: false,
              holding: false,
              headPerfect: false
            });
          } else {
            const el = document.createElement("div");
            el.className = "rhythm-note";
            el.style.background = laneColors[s.lane];
            laneEls[s.lane].appendChild(el);
            notes.push({ el, type: "tap", lane: s.lane, hitMs: s.hitMs, hit: false });
          }
        };
        const tick = () => {
          if (!running || !overlay.isConnected) {
            running = false;
            if (ticker) {
              clearInterval(ticker);
              ticker = null;
            }
            return;
          }
          const now = nowMs();
          while (spawnedIdx < schedule.length && now >= schedule[spawnedIdx].hitMs - travelMs) {
            spawnEntry(schedule[spawnedIdx]);
            spawnedIdx++;
          }
          const y = hitY();
          for (const n of notes) {
            if (n.hit) continue;
            if (n.type === "spinner") {
              if (!n.active && now >= n.hitMs) {
                n.active = true;
                activeSpinner = n;
                n.el.classList.add("rhythm-spinner-active");
              }
              if (n.active) {
                const total = n.endMs - n.hitMs;
                if (n.timer) n.timer.style.width = `${Math.max(0, (n.endMs - now) / total) * 100}%`;
                if (now >= n.endMs) {
                  n.hit = true;
                  if (activeSpinner === n) activeSpinner = null;
                  judged++;
                  if (n.taps >= n.required) {
                    const pf = n.taps >= n.required * 1.4;
                    hits++;
                    combo++;
                    sfx[pf ? "perfect" : "good"]();
                    showJudgment(0, pf ? "perfect" : "good");
                    setAvatar(pf ? "perfect" : "good");
                    pulseCombo();
                    if (combo > 0 && combo % 10 === 0) showComboMilestone();
                  } else {
                    sfx.miss();
                    combo = 0;
                    showJudgment(0, "miss");
                    setAvatar("miss");
                  }
                  n.el.classList.add("rhythm-spinner-done");
                  const sEl = n.el;
                  setTimeout(() => sEl.remove(), 260);
                  updateHud();
                }
              }
            } else if (n.type === "slider") {
              const barLen = n.durMs / travelMs * y;
              const headTop = (1 - (n.hitMs - now) / travelMs) * y;
              n.el.style.height = `${barLen}px`;
              n.el.style.top = `${headTop - barLen}px`;
              if (now >= n.endMs) {
                n.hit = true;
                judged++;
                const success = n.headHit && n.holding;
                if (success) {
                  hits++;
                  combo++;
                  sfx[n.headPerfect ? "perfect" : "good"]();
                  showJudgment(n.lane, n.headPerfect ? "perfect" : "good");
                  setAvatar(n.headPerfect ? "perfect" : "good");
                  burst(n.lane, n.headPerfect ? 15 : 8);
                  flashLane(n.lane, "rhythm-lane-good");
                  pulseCombo();
                  pulseHitline(true);
                  if (combo > 0 && combo % 10 === 0) showComboMilestone();
                } else {
                  sfx.miss();
                  combo = 0;
                  showJudgment(n.lane, "miss");
                  setAvatar("miss");
                  flashLane(n.lane, "rhythm-lane-miss");
                }
                if (keyEls[n.lane]) keyEls[n.lane].classList.remove("rhythm-key-hold");
                n.el.remove();
                updateHud();
              } else if (!n.headHit && now > n.hitMs + hitWindowMs) {
                n.el.classList.add("rhythm-slider-missed");
              }
            } else {
              const prog = Math.min(1.15, 1 - (n.hitMs - now) / travelMs);
              n.el.style.top = `${prog * y}px`;
              if (now > n.hitMs + hitWindowMs) {
                n.hit = true;
                n.el.classList.add("rhythm-note-miss");
                n.el.remove();
                judged++;
                combo = 0;
                sfx.miss();
                flashLane(n.lane, "rhythm-lane-miss");
                showJudgment(n.lane, "miss");
                setAvatar("miss");
                updateHud();
              }
            }
          }
          notes = notes.filter((n) => !n.hit);
          checkEnd();
        };
        updateHud();
        const arrancar = () => {
          startTime = performance.now();
          if (audioEl) {
            try {
              audioEl.currentTime = 0;
            } catch (e) {
            }
            const _p = audioEl.play();
            if (_p && _p.catch) _p.catch(() => {
            });
          }
          ticker = setInterval(tick, 16);
        };
        const cartel = document.createElement("div");
        cartel.className = "rhythm-countdown neon-font";
        cartel.innerHTML = '<div class="rhythm-countdown-num"></div><div class="rhythm-countdown-hint">Prepara los dedos: <b>' + keys.join(" \xB7 ") + "</b></div>";
        overlay.appendChild(cartel);
        keyEls.forEach((k) => k.classList.add("rhythm-key-ready"));
        const pasos = ["5", "4", "3", "2", "1", "\xA1YA!"];
        let paso = 0;
        const numEl = cartel.querySelector(".rhythm-countdown-num");
        const tictac = () => {
          if (!running || !overlay.isConnected) {
            running = false;
            return;
          }
          if (paso < pasos.length) {
            numEl.textContent = pasos[paso];
            numEl.classList.remove("rhythm-countdown-pop");
            void numEl.offsetWidth;
            numEl.classList.add("rhythm-countdown-pop");
            const ultimo = paso === pasos.length - 1;
            beep(ultimo ? 880 : 440, ultimo ? 0.18 : 0.09, 0, "triangle", 0.5);
            paso++;
            cuentaTimer = setTimeout(tictac, ultimo ? 500 : 900);
          } else {
            cartel.remove();
            keyEls.forEach((k) => k.classList.remove("rhythm-key-ready"));
            cuentaTimer = null;
            arrancar();
          }
        };
        tictac();
      });
    }
    // ============================================================
    // Minijuego "chase" (persecución en coche): esquiva obstáculos y a los memes
    // en moto durante una distancia. Reutiliza el motor side-scroller.
    // ============================================================
    async playChaseMinigame(options = {}) {
      this.isWaitingForInput = false;
      let won = false;
      while (!won) {
        won = await this.runSideScroller({
          mode: "chase",
          goal: options.distance || 60,
          speed: options.speed || 6,
          maxHits: options.maxHits || 3,
          playerFrames: ["coche_v2_0", "coche_v2_1", "coche_v2_2", "coche_v2_3", "coche_v2_4", "coche_v2_5"],
          playerHeight: 0.19,
          playerRatio: 1.55,
          // Huella sobre el asfalto (centro y radios relativos al sprite).
          // La imagen puede solaparse con otra por perspectiva sin chocar.
          playerFootprint: { x: 0.5, y: 0.83, rx: 0.39, ry: 0.07 },
          xMin: 0.03,
          xMax: 0.8,
          yMin: 0.65,
          yMax: 0.92,
          bgFar: "carretera_loop_fondo_sin_luna_v2",
          bgNear: "carretera_loop_v2",
          moon: "carretera_luna_v2",
          moonStartX: 0.82,
          moonEndX: 0.2,
          moonStartY: 0.22,
          moonEndY: 0.12,
          obstacles: [
            {
              name: "obs_bidon_v2_0",
              frames: ["obs_bidon_v2_0", "obs_bidon_v2_1", "obs_bidon_v2_2", "obs_bidon_v2_3"],
              frameMs: 0.11,
              h: 0.105,
              ratio: 0.691,
              footprint: { x: 0.5, y: 0.89, rx: 0.3, ry: 0.08 }
            },
            {
              name: "obs_valla_v2_0",
              frames: ["obs_valla_v2_0", "obs_valla_v2_1", "obs_valla_v2_2", "obs_valla_v2_3"],
              frameMs: 0.16,
              h: 0.29,
              ratio: 0.976,
              yMin: 0.68,
              yMax: 0.79,
              // Tres apoyos a distinta profundidad: la valla serpentea
              // hacia el fondo y corta buena parte del ancho de la vía.
              footprints: [
                { x: 0.47, y: 0.82, rx: 0.39, ry: 0.035 },
                { x: 0.51, y: 0.49, rx: 0.22, ry: 0.03 },
                { x: 0.51, y: 0.25, rx: 0.15, ry: 0.025 }
              ]
            },
            {
              name: "obs_rocas_v2_0",
              frames: ["obs_rocas_v2_0", "obs_rocas_v2_1", "obs_rocas_v2_2", "obs_rocas_v2_3"],
              frameMs: 0.12,
              h: 0.095,
              ratio: 2,
              footprint: { x: 0.5, y: 0.73, rx: 0.44, ry: 0.09 }
            },
            {
              name: "obs_cable_v2_0",
              frames: ["obs_cable_v2_0", "obs_cable_v2_1", "obs_cable_v2_2", "obs_cable_v2_3"],
              frameMs: 0.085,
              h: 0.085,
              ratio: 1.946,
              footprint: { x: 0.5, y: 0.62, rx: 0.44, ry: 0.2 }
            }
          ],
          enemies: [
            ["meme_bob_v2_0", "meme_bob_v2_1", "meme_bob_v2_2", "meme_bob_v2_3"],
            ["meme_knucles_v2_0", "meme_knucles_v2_1", "meme_knucles_v2_2", "meme_knucles_v2_3"],
            ["meme_pepe_v2_0", "meme_pepe_v2_1", "meme_pepe_v2_2", "meme_pepe_v2_3"],
            ["meme_troll_v2_0", "meme_troll_v2_1", "meme_troll_v2_2", "meme_troll_v2_3"]
          ],
          collectible: null,
          // Knobs de dificultad/QA con passthrough (igual que en eduvuelo:
          // si no se reenvían, los valores del JSON se ignoran en silencio)
          spawnMs: options.spawnMs,
          graceMs: options.graceMs,
          hitGraceMs: options.hitGraceMs,
          debugHitboxes: !!options.debugHitboxes,
          title: "\u{1F3CE}\uFE0F Conduce con el RAT\xD3N o WASD/FLECHAS. Mu\xE9vete por toda la carretera y esquiva las embestidas.",
          winMsg: "\xA1Los hab\xE9is perd\xEDo en la rotonda! \u{1F3C1}",
          loseMsg: "\xA1Os han embestido! \u{1F3CD}\uFE0F"
        });
        if (!won) {
          await this.showMinigameRetry("\xA1Os han pillado los memes! \u{1F3CD}\uFE0F");
        }
      }
      return won;
    }
    // ============================================================
    // Minijuego "eduvuelo" (Edu volando): recupera las partituras entre el
    // entramado del concierto. Desde agosto de 2026 usa un motor propio para
    // poder tener impulso, energía, combos y patrones sin tocar la persecución.
    // ============================================================
    async playEduVueloMinigame(options = {}) {
      this.isWaitingForInput = false;
      let won = false;
      while (!won) {
        won = await this.runEduFlight({
          goal: options.goal || 16,
          speed: options.speed || 6.4,
          maxHits: options.maxHits || 3,
          spawnMs: options.spawnMs != null ? options.spawnMs : 620,
          hangChance: options.hangChance != null ? options.hangChance : 0.26,
          riserChance: options.riserChance != null ? options.riserChance : 0.2,
          hangMin: options.hangMin != null ? options.hangMin : 0.28,
          hangMax: options.hangMax != null ? options.hangMax : 0.62,
          fallerChance: options.fallerChance != null ? options.fallerChance : 0.28,
          fallerVy: options.fallerVy != null ? options.fallerVy : 0.3,
          speakerChance: options.speakerChance != null ? options.speakerChance : 0.19,
          gustChance: options.gustChance != null ? options.gustChance : 0.11,
          collectChance: options.collectChance != null ? options.collectChance : 0.29,
          collectEvery: options.collectEvery != null ? options.collectEvery : 3,
          phraseMin: options.phraseMin != null ? options.phraseMin : 1,
          phraseMax: options.phraseMax != null ? options.phraseMax : 2,
          energyRegen: options.energyRegen != null ? options.energyRegen : 8,
          dashCost: options.dashCost != null ? options.dashCost : 52,
          dashDuration: options.dashDuration != null ? options.dashDuration : 0.36,
          difficultyRamp: options.difficultyRamp != null ? options.difficultyRamp : 0.32,
          corridorMin: options.corridorMin != null ? options.corridorMin : 0.2,
          graceMs: options.graceMs != null ? options.graceMs : 900,
          hitGraceMs: options.hitGraceMs != null ? options.hitGraceMs : 900,
          debugHitboxes: !!options.debugHitboxes
        });
        if (!won) {
          await this.showMinigameRetry("\xA1Se te han escapado las partituras! \u26A1");
        }
      }
      return won;
    }
    // Motor dedicado al vuelo. La progresión alterna frases de partituras con
    // patrones de peligro, de modo que una mala tirada aleatoria nunca alarga la
    // partida ni genera una pared sin salida.
    async runEduFlight(cfg = {}) {
      this.isWaitingForInput = false;
      const SP = "assets/images/minigames/chapter3/sprites/";
      const CAP = "assets/images/minigames/chapter3/";
      const FLIGHT_FRAMES = [
        "assets/images/minigames/chapter3/sprites/edu_fly_v3_0.webp",
        "assets/images/minigames/chapter3/sprites/edu_fly_v3_1.webp",
        "assets/images/minigames/chapter3/sprites/edu_fly_v3_2.webp",
        "assets/images/minigames/chapter3/sprites/edu_fly_v3_3.webp",
        "assets/images/minigames/chapter3/sprites/edu_fly_v3_4.webp",
        "assets/images/minigames/chapter3/sprites/edu_fly_v3_5.webp",
        "assets/images/minigames/chapter3/sprites/edu_fly_v3_6.webp",
        "assets/images/minigames/chapter3/sprites/edu_fly_v3_7.webp"
      ];
      const DASH_FRAMES = [
        "assets/images/minigames/chapter3/sprites/edu_fly_v3_dash_0.webp",
        "assets/images/minigames/chapter3/sprites/edu_fly_v3_dash_1.webp"
      ];
      const PLAYER_FRAMES = [...FLIGHT_FRAMES, ...DASH_FRAMES];
      const asset = (path) => `url('${this.cacheBustAsset(path)}')`;
      const playerFrameAsset = (path) => asset(path);
      await this.preloadImages([
        ...PLAYER_FRAMES,
        CAP + "aire_fondo_v2.webp",
        SP + "aire_foco_v2.webp",
        SP + "aire_altavoz_v2.webp",
        SP + "partitura_v2.webp",
        SP + "aire_cable_v3.webp"
      ]);
      const goal = Math.max(1, cfg.goal || 16);
      const maxHits = Math.max(1, cfg.maxHits || 3);
      const baseSpeed = Math.max(2, cfg.speed || 6);
      return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "minigame-overlay edu-flight-minigame";
        overlay.innerHTML = `
                <div class="fly-hud">
                    <div class="fly-hud-block fly-score">
                        <small>PARTITURAS</small><strong>0 / ${goal}</strong>
                    </div>
                    <div class="fly-hud-block fly-combo">
                        <small>CADENA</small><strong>x1</strong>
                    </div>
                    <div class="fly-energy" aria-label="Energ\xEDa de impulso">
                        <span>IMPULSO</span>
                        <div class="fly-energy-track"><i></i></div>
                        <kbd>ESPACIO</kbd>
                    </div>
                    <div class="fly-lives" aria-label="Resistencia"></div>
                    <button class="ss-pause-btn" type="button" aria-label="Pausar">\u2161</button>
                </div>
                <div class="fly-stage">
                    <div class="fly-backdrop" aria-hidden="true"></div>
                    <div class="fly-haze" aria-hidden="true"></div>
                    <div class="fly-speed-lines" aria-hidden="true"></div>
                    <div class="fly-player" aria-label="Edu"></div>
                    <div class="fly-player-hitbox is-ellipse" aria-hidden="true"><span>EDU</span></div>
                    <div class="ss-progress-wrap"><div class="ss-progress-fill"></div></div>
                    <div class="fly-callout" aria-live="polite"></div>
                    <div class="ss-countdown active" aria-live="polite">3</div>
                    <div class="ss-pause-panel" hidden>
                        <strong>PAUSA</strong>
                        <span>Rat\xF3n o W/S para volar \xB7 ESPACIO/clic para impulsar.</span>
                        <button class="ss-resume-btn" type="button">CONTINUAR</button>
                    </div>
                </div>
                <div class="minigame-instructions">
                    <b>RECUPERA LAS PARTITURAS</b>
                    <span>Rat\xF3n / W S: altura</span>
                    <span>ESPACIO o clic: impulso</span>
                    <small>P / ESC: pausa</small>
                </div>
            `;
        document.getElementById("game-container").appendChild(overlay);
        const stage = overlay.querySelector(".fly-stage");
        const backdrop = overlay.querySelector(".fly-backdrop");
        const playerEl = overlay.querySelector(".fly-player");
        const playerDebugEl = overlay.querySelector(".fly-player-hitbox");
        const scoreEl = overlay.querySelector(".fly-score strong");
        const comboEl = overlay.querySelector(".fly-combo strong");
        const energyEl = overlay.querySelector(".fly-energy-track i");
        const energyWrap = overlay.querySelector(".fly-energy");
        const livesEl = overlay.querySelector(".fly-lives");
        const progressEl = overlay.querySelector(".ss-progress-fill");
        const calloutEl = overlay.querySelector(".fly-callout");
        const countdownEl = overlay.querySelector(".ss-countdown");
        const pauseBtn = overlay.querySelector(".ss-pause-btn");
        const pausePanel = overlay.querySelector(".ss-pause-panel");
        const resumeBtn = overlay.querySelector(".ss-resume-btn");
        backdrop.style.backgroundImage = asset(CAP + "aire_fondo_v2.webp");
        playerEl.style.backgroundImage = playerFrameAsset(PLAYER_FRAMES[0]);
        playerDebugEl.hidden = !cfg.debugHitboxes;
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const fieldW = () => stage.clientWidth || 1;
        const fieldH = () => stage.clientHeight || 1;
        const yMin = 0.1;
        const yMax = 0.88;
        const homeX = 0.115;
        const dashX = 0.245;
        let running = true;
        let paused = false;
        let started = false;
        let last = performance.now();
        let countdownTime = 0;
        let countdownIndex = -1;
        let spawnClock = 0;
        let spawnNumber = 0;
        let hazardsSincePhrase = 0;
        let lastCableSide = Math.random() < 0.5 ? "top" : "bottom";
        let objects = [];
        let frameIndex = 0;
        let dashFrameIndex = 0;
        let frameClock = 0;
        let wasDashing = false;
        let playerX = homeX;
        let playerY = 0.5;
        let previousPlayerY = playerY;
        let collisionPreviousPlayerX = playerX;
        let collisionPreviousPlayerY = playerY;
        let targetY = playerY;
        let energy = 100;
        let hits = 0;
        let collected = 0;
        let combo = 0;
        let maxCombo = 0;
        let nearMisses = 0;
        let flightScore = 0;
        let dashUntil = 0;
        let dashCooldownUntil = 0;
        let invulnerableUntil = performance.now() + (cfg.graceMs || 0);
        let blinkUntil = invulnerableUntil;
        let calloutUntil = 0;
        let calloutPriority = 0;
        let finaleAnnounced = false;
        let raf = null;
        let resultTimer = null;
        let audioContext = null;
        const beep = (frequency, duration, options = {}) => {
          try {
            if (!audioContext) {
              audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContext.state === "suspended") audioContext.resume();
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            const when = audioContext.currentTime + (options.delay || 0);
            oscillator.type = options.type || "sine";
            oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(1e-4, when);
            gain.gain.exponentialRampToValueAtTime(options.volume || 0.06, when + 0.01);
            gain.gain.exponentialRampToValueAtTime(1e-4, when + duration);
            oscillator.connect(gain).connect(audioContext.destination);
            oscillator.start(when);
            oscillator.stop(when + duration + 0.02);
          } catch (error) {
          }
        };
        const showCallout = (text, tone = "good", duration = 720, priority = 0) => {
          const now = performance.now();
          if (now < calloutUntil && priority < calloutPriority) return;
          calloutEl.textContent = text;
          calloutEl.dataset.tone = tone;
          calloutEl.classList.remove("is-visible");
          void calloutEl.offsetWidth;
          calloutEl.classList.add("is-visible");
          calloutUntil = now + duration;
          calloutPriority = priority;
        };
        const playerRect = (y = playerY, x = playerX) => {
          const width = fieldH() * 0.245 * 0.78;
          const height = fieldH() * 0.245;
          return {
            left: x * fieldW() + width * 0.3,
            right: x * fieldW() + width * 1.1,
            top: y * fieldH() - height * 0.12,
            bottom: y * fieldH() + height * 0.38
          };
        };
        const rectsOverlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const playerShapeAt = (y = playerY, x = playerX) => {
          const rect = playerRect(y, x);
          return {
            kind: "ellipse",
            cx: (rect.left + rect.right) / 2,
            cy: (rect.top + rect.bottom) / 2,
            rx: (rect.right - rect.left) / 2,
            ry: (rect.bottom - rect.top) / 2
          };
        };
        const objectRect = (object, previous = false) => {
          const x = (previous ? object.previousX : object.x) * fieldW();
          const y = (previous ? object.previousY : object.y) * fieldH();
          const width = object.el.offsetWidth;
          const height = object.el.offsetHeight;
          const sx = object.hitScaleX != null ? object.hitScaleX : 0.58;
          const sy = object.hitScaleY != null ? object.hitScaleY : 0.58;
          return {
            left: x - width * sx / 2,
            right: x + width * sx / 2,
            top: y - height * sy / 2,
            bottom: y + height * sy / 2
          };
        };
        const objectShapeAt = (object, x, y) => {
          const width = object.el.offsetWidth * (object.hitScaleX != null ? object.hitScaleX : 0.58);
          const height = object.el.offsetHeight * (object.hitScaleY != null ? object.hitScaleY : 0.58);
          const cx = x * fieldW();
          const cy = y * fieldH();
          if (object.type === "cable") {
            return {
              kind: "rect",
              left: cx - width / 2,
              right: cx + width / 2,
              top: cy - height / 2,
              bottom: cy + height / 2
            };
          }
          return {
            kind: "ellipse",
            cx,
            cy,
            rx: width / 2,
            ry: height / 2
          };
        };
        const ellipseRectOverlap = (ellipse, rect, forgiveness = 1) => {
          const closestX = clamp(ellipse.cx, rect.left, rect.right);
          const closestY = clamp(ellipse.cy, rect.top, rect.bottom);
          const dx = (ellipse.cx - closestX) / Math.max(1, ellipse.rx * forgiveness);
          const dy = (ellipse.cy - closestY) / Math.max(1, ellipse.ry * forgiveness);
          return dx * dx + dy * dy < 1;
        };
        const shapesOverlap = (a, b, forgiveness = 1) => {
          if (a.kind === "rect" && b.kind === "rect") return rectsOverlap(a, b);
          if (a.kind === "ellipse" && b.kind === "rect") {
            return ellipseRectOverlap(a, b, forgiveness);
          }
          if (a.kind === "rect" && b.kind === "ellipse") {
            return ellipseRectOverlap(b, a, forgiveness);
          }
          const dx = (a.cx - b.cx) / Math.max(1, (a.rx + b.rx) * forgiveness);
          const dy = (a.cy - b.cy) / Math.max(1, (a.ry + b.ry) * forgiveness);
          return dx * dx + dy * dy < 1;
        };
        const sweptObjectCollision = (object) => {
          const objectTravelX = (object.x - object.previousX) * fieldW();
          const objectTravelY = (object.y - object.previousY) * fieldH();
          const playerTravelX = (playerX - collisionPreviousPlayerX) * fieldW();
          const playerTravelY = (playerY - collisionPreviousPlayerY) * fieldH();
          const relativeTravel = Math.hypot(objectTravelX - playerTravelX, objectTravelY - playerTravelY);
          const currentPlayer = playerShapeAt();
          const stepSize = Math.max(8, Math.min(currentPlayer.rx, currentPlayer.ry) * 0.45);
          const steps = clamp(Math.ceil(relativeTravel / stepSize), 1, 8);
          const forgiveness = object.type === "score" ? 1.06 : object.type === "gust" ? 0.96 : 0.8;
          for (let step = 0; step <= steps; step++) {
            const t = step / steps;
            const objectX = object.previousX + (object.x - object.previousX) * t;
            const objectY = object.previousY + (object.y - object.previousY) * t;
            const sampledPlayerX = collisionPreviousPlayerX + (playerX - collisionPreviousPlayerX) * t;
            const sampledPlayerY = collisionPreviousPlayerY + (playerY - collisionPreviousPlayerY) * t;
            const sampledPlayer = playerShapeAt(sampledPlayerY, sampledPlayerX);
            const sampledObject = objectShapeAt(object, objectX, objectY);
            if (shapesOverlap(sampledPlayer, sampledObject, forgiveness)) {
              return {
                t,
                player: sampledPlayer,
                object: sampledObject
              };
            }
          }
          return null;
        };
        const updatePlayerPosition = (now) => {
          const dashing = now < dashUntil;
          const wantedX = dashing ? dashX : homeX;
          playerX += (wantedX - playerX) * 0.24;
          const verticalDelta = playerY - previousPlayerY;
          const bank = clamp(verticalDelta * 620, -13, 13);
          playerEl.style.left = playerX * 100 + "%";
          playerEl.style.top = playerY * 100 + "%";
          playerEl.style.setProperty("--fly-bank", bank.toFixed(2) + "deg");
          playerEl.classList.toggle("is-dashing", dashing);
          playerDebugEl.style.left = playerRect().left / fieldW() * 100 + "%";
          playerDebugEl.style.top = playerRect().top / fieldH() * 100 + "%";
          playerDebugEl.style.width = (playerRect().right - playerRect().left) / fieldW() * 100 + "%";
          playerDebugEl.style.height = (playerRect().bottom - playerRect().top) / fieldH() * 100 + "%";
          previousPlayerY = playerY;
        };
        const updateHud = () => {
          const multiplier = Math.min(5, 1 + Math.floor(combo / 4));
          scoreEl.textContent = `${collected} / ${goal}`;
          comboEl.textContent = `x${multiplier}`;
          comboEl.parentElement.classList.toggle("is-hot", multiplier >= 3);
          energyEl.style.width = clamp(energy, 0, 100) + "%";
          energyWrap.classList.toggle("is-ready", energy >= (cfg.dashCost || 42));
          progressEl.style.width = clamp(collected / goal * 100, 0, 100) + "%";
          window.MinigameLifeDisplay.renderSlots(livesEl, Math.max(0, maxHits - hits), maxHits);
        };
        const addParticleBurst = (x, y, color = "#4fd0ff", amount = 8) => {
          for (let index = 0; index < amount; index++) {
            const particle = document.createElement("i");
            particle.className = "fly-particle";
            particle.style.left = x * 100 + "%";
            particle.style.top = y * 100 + "%";
            particle.style.color = color;
            particle.style.setProperty("--px", `${(Math.random() - 0.5) * 110}px`);
            particle.style.setProperty("--py", `${(Math.random() - 0.5) * 90}px`);
            stage.appendChild(particle);
            setTimeout(() => particle.remove(), 620);
          }
        };
        const removeObject = (object) => {
          object.taken = true;
          if (object.warning) object.warning.remove();
          object.el.remove();
        };
        const shapeBounds = (shape) => shape.kind === "rect" ? shape : {
          left: shape.cx - shape.rx,
          right: shape.cx + shape.rx,
          top: shape.cy - shape.ry,
          bottom: shape.cy + shape.ry
        };
        const visibleShapeFraction = (shape) => {
          const bounds = shapeBounds(shape);
          const width = Math.max(1, bounds.right - bounds.left);
          const height = Math.max(1, bounds.bottom - bounds.top);
          const visibleWidth = Math.max(0, Math.min(bounds.right, fieldW()) - Math.max(bounds.left, 0));
          const visibleHeight = Math.max(0, Math.min(bounds.bottom, fieldH()) - Math.max(bounds.top, 0));
          return visibleWidth * visibleHeight / (width * height);
        };
        const showImpactDebug = (object, collision) => {
          if (!cfg.debugHitboxes) return;
          const rect = shapeBounds(collision?.object || objectShapeAt(object, object.x, object.y));
          const marker = document.createElement("div");
          marker.className = "fly-impact-debug";
          marker.classList.toggle("is-ellipse", object.type !== "cable");
          marker.textContent = object.type.toUpperCase();
          marker.style.left = rect.left / fieldW() * 100 + "%";
          marker.style.top = rect.top / fieldH() * 100 + "%";
          marker.style.width = (rect.right - rect.left) / fieldW() * 100 + "%";
          marker.style.height = (rect.bottom - rect.top) / fieldH() * 100 + "%";
          stage.appendChild(marker);
          setTimeout(() => marker.remove(), 8e3);
        };
        const keepImpactObjectVisible = (object, collision) => {
          object.taken = true;
          if (object.warning) {
            object.warning.remove();
            object.warning = null;
          }
          const bounds = shapeBounds(collision?.object || objectShapeAt(object, object.x, object.y));
          object.el.style.left = (bounds.left + bounds.right) / 2 / fieldW() * 100 + "%";
          object.el.style.top = (bounds.top + bounds.bottom) / 2 / fieldH() * 100 + "%";
          object.el.classList.add("is-impacting");
          setTimeout(() => object.el.classList.add("is-impact-fading"), 160);
          setTimeout(() => object.el.remove(), 650);
        };
        const makeDebugBox = (object, label) => {
          if (!cfg.debugHitboxes) return;
          const debug = document.createElement("div");
          debug.className = "fly-object-hitbox";
          debug.classList.toggle("is-ellipse", object.type !== "cable");
          debug.innerHTML = `<span>${label}</span>`;
          const sx = object.hitScaleX != null ? object.hitScaleX : 0.58;
          const sy = object.hitScaleY != null ? object.hitScaleY : 0.58;
          debug.style.left = (1 - sx) * 50 + "%";
          debug.style.top = (1 - sy) * 50 + "%";
          debug.style.width = sx * 100 + "%";
          debug.style.height = sy * 100 + "%";
          object.el.appendChild(debug);
        };
        const makeObject = (spec) => {
          const el = document.createElement("div");
          el.className = `fly-object fly-${spec.type}`;
          if (spec.image) el.style.backgroundImage = asset(spec.image);
          el.style.width = spec.width * 100 + "%";
          el.style.height = spec.height * 100 + "%";
          stage.appendChild(el);
          const object = {
            el,
            type: spec.type,
            x: spec.x,
            y: spec.y,
            previousX: spec.x,
            previousY: spec.y,
            vx: spec.vx || 1,
            vy: spec.vy || 0,
            baseY: spec.y,
            age: 0,
            taken: false,
            passed: false,
            enteredViewport: false,
            hitScaleX: spec.hitScaleX,
            hitScaleY: spec.hitScaleY,
            warning: spec.warning || null,
            push: spec.push || 0
          };
          el.style.left = object.x * 100 + "%";
          el.style.top = object.y * 100 + "%";
          makeDebugBox(object, spec.type === "score" ? "PARTITURA" : spec.type === "gust" ? "R\xC1FAGA" : "PELIGRO");
          objects.push(object);
          return object;
        };
        const createCable = (side, progress) => {
          const min = cfg.hangMin != null ? cfg.hangMin : 0.25;
          const max = cfg.hangMax != null ? cfg.hangMax : 0.58;
          const requested = min + Math.random() * Math.max(0, max - min);
          const corridor = cfg.corridorMin != null ? cfg.corridorMin : 0.2;
          const length = Math.min(requested, 1 - corridor - 0.12);
          const el = document.createElement("div");
          el.className = `fly-object fly-cable fly-cable-${side}`;
          const cableAspect = 222 / 1477;
          const width = clamp(length * fieldH() / fieldW() * cableAspect * 1.45, 0.032, 0.06);
          el.style.width = width * 100 + "%";
          el.style.height = length * 100 + "%";
          const cableSprite = document.createElement("img");
          cableSprite.className = "fly-cable-sprite";
          cableSprite.alt = "";
          cableSprite.draggable = false;
          cableSprite.setAttribute("aria-hidden", "true");
          el.appendChild(cableSprite);
          stage.appendChild(el);
          const y = side === "top" ? length / 2 : 1 - length / 2;
          const object = {
            el,
            type: "cable",
            x: 1.08,
            y,
            previousX: 1.08,
            previousY: y,
            vx: 0.98 + progress * 0.08,
            vy: 0,
            baseY: y,
            age: 0,
            taken: false,
            passed: false,
            enteredViewport: false,
            visualReady: false,
            hitScaleX: 0.62,
            hitScaleY: 0.92,
            warning: null,
            push: 0
          };
          el.style.left = "108%";
          el.style.top = y * 100 + "%";
          makeDebugBox(object, "CABLE");
          objects.push(object);
          cableSprite.onload = () => {
            if (object.taken) return;
            object.visualReady = true;
            el.classList.add("is-visual-ready");
          };
          cableSprite.onerror = () => {
            if (!object.taken) removeObject(object);
          };
          cableSprite.src = this.cacheBustAsset(SP + "aire_cable_v3.webp");
          setTimeout(() => {
            if (!object.taken && !object.visualReady) removeObject(object);
          }, 1600);
        };
        const createSpotlight = (progress) => {
          const targetY2 = 0.2 + Math.random() * 0.52;
          const warning = document.createElement("div");
          warning.className = "fly-warning fly-warning-focus";
          warning.style.top = targetY2 * 100 + "%";
          warning.textContent = "FOCO";
          stage.appendChild(warning);
          makeObject({
            type: "spotlight",
            image: SP + "aire_foco_v2.webp",
            width: 0.085,
            height: 0.2,
            x: 1.1,
            y: -0.08,
            vx: 0.88 + progress * 0.12,
            vy: (cfg.fallerVy != null ? cfg.fallerVy : 0.28) + 0.08 + progress * 0.1,
            hitScaleX: 0.52,
            hitScaleY: 0.64,
            warning
          });
        };
        const createSpeaker = (progress) => {
          const y = 0.18 + Math.random() * 0.64;
          const warning = document.createElement("div");
          warning.className = "fly-warning fly-warning-speaker";
          warning.style.top = y * 100 + "%";
          warning.textContent = "PULSO";
          stage.appendChild(warning);
          const speaker = makeObject({
            type: "speaker",
            image: SP + "aire_altavoz_v2.webp",
            width: 0.125,
            height: 0.19,
            x: 1.12,
            y,
            vx: 1.08 + progress * 0.14,
            hitScaleX: 0.63,
            hitScaleY: 0.64,
            warning
          });
          const ring = document.createElement("i");
          ring.className = "fly-sonic-ring";
          speaker.el.appendChild(ring);
        };
        const createGust = () => {
          const y = 0.24 + Math.random() * 0.52;
          const push = y < 0.5 ? 0.18 : -0.18;
          const gust = makeObject({
            type: "gust",
            width: 0.16,
            height: 0.28,
            x: 1.12,
            y,
            vx: 0.76,
            hitScaleX: 0.78,
            hitScaleY: 0.82,
            push
          });
          gust.el.dataset.direction = push > 0 ? "down" : "up";
          gust.el.innerHTML += "<i></i><i></i><i></i>";
        };
        const createPhrase = (progress) => {
          const min = Math.max(1, cfg.phraseMin || 1);
          const max = Math.max(min, cfg.phraseMax || 2);
          const remaining = goal - collected;
          const count = Math.min(remaining, min + Math.floor(Math.random() * (max - min + 1)));
          const center = 0.2 + Math.random() * 0.6;
          const arc = Math.random() < 0.5 ? -1 : 1;
          for (let index = 0; index < count; index++) {
            const offset = count === 1 ? 0 : (index - (count - 1) / 2) * 0.12 * arc;
            makeObject({
              type: "score",
              image: SP + "partitura_v2.webp",
              width: 0.082,
              height: 0.125,
              x: 1.08 + index * 0.12,
              y: clamp(center + offset, yMin + 0.03, yMax - 0.03),
              vx: 0.94 + progress * 0.08,
              hitScaleX: 0.76,
              hitScaleY: 0.72
            });
          }
          hazardsSincePhrase = 0;
        };
        const spawnPattern = () => {
          const progress = clamp(collected / goal, 0, 1);
          spawnNumber++;
          const collectEvery = Math.max(1, cfg.collectEvery || 3);
          const needsPhrase = hazardsSincePhrase >= collectEvery || Math.random() < (cfg.collectChance != null ? cfg.collectChance : 0.34);
          if (needsPhrase) {
            createPhrase(progress);
            return;
          }
          hazardsSincePhrase++;
          const hang = Math.max(0, cfg.hangChance || 0) * (lastCableSide === "top" ? 0.55 : 1.15);
          const rise = Math.max(0, cfg.riserChance || 0) * (lastCableSide === "bottom" ? 0.55 : 1.15);
          const focus = Math.max(0, cfg.fallerChance || 0);
          const speaker = Math.max(0, cfg.speakerChance || 0);
          const gust = Math.max(0, cfg.gustChance || 0);
          const total = Math.max(1e-3, hang + rise + focus + speaker + gust);
          const roll = Math.random() * total;
          if (roll < hang) {
            lastCableSide = "top";
            createCable("top", progress);
          } else if (roll < hang + rise) {
            lastCableSide = "bottom";
            createCable("bottom", progress);
          } else if (roll < hang + rise + focus) {
            createSpotlight(progress);
          } else if (roll < hang + rise + focus + speaker) {
            createSpeaker(progress);
          } else {
            createGust();
          }
          if (progress > 0.72 && spawnNumber % 3 === 0) {
            hazardsSincePhrase = Math.max(hazardsSincePhrase, collectEvery);
          }
        };
        const collectScore = (object) => {
          collected++;
          combo++;
          maxCombo = Math.max(maxCombo, combo);
          const multiplier = Math.min(5, 1 + Math.floor(combo / 4));
          flightScore += 100 * multiplier;
          energy = Math.min(100, energy + 13);
          addParticleBurst(object.x, object.y, "#ffd166", 10);
          removeObject(object);
          beep(880 + multiplier * 70, 0.08, { type: "triangle", volume: 0.065 });
          beep(1320 + multiplier * 90, 0.08, { type: "triangle", volume: 0.045, delay: 0.045 });
          showCallout(multiplier >= 3 ? `\xA1CADENA x${multiplier}!` : "PARTITURA", "good");
          updateHud();
          if (collected >= goal) finish(true);
        };
        const destroyWithDash = (object) => {
          flightScore += object.type === "speaker" ? 220 : 120;
          energy = Math.min(100, energy + 5);
          addParticleBurst(object.x, object.y, object.type === "speaker" ? "#ff4fa3" : "#4fd0ff", 12);
          showCallout(object.type === "speaker" ? "\xA1CONTRAPULSO!" : "\xA1ATRAVESADO!", "dash");
          beep(220, 0.11, { type: "square", volume: 0.055 });
          beep(740, 0.1, { type: "sawtooth", volume: 0.045, delay: 0.03 });
          removeObject(object);
        };
        const hitPlayer = (object, collision) => {
          hits++;
          combo = 0;
          energy = Math.max(0, energy - 24);
          invulnerableUntil = performance.now() + (cfg.hitGraceMs || 900);
          blinkUntil = invulnerableUntil;
          playerEl.classList.remove("is-hurt");
          void playerEl.offsetWidth;
          playerEl.classList.add("is-hurt");
          stage.classList.remove("is-hit");
          void stage.offsetWidth;
          stage.classList.add("is-hit");
          showImpactDebug(object, collision);
          addParticleBurst(playerX + 0.05, playerY, "#ff466b", 12);
          const debugNames = {
            cable: "CABLE",
            spotlight: "FOCO",
            speaker: "ALTAVOZ"
          };
          showCallout(`\xA1IMPACTO: ${debugNames[object.type] || object.type.toUpperCase()}!`, "bad", 1100, 3);
          beep(145, 0.19, { type: "sawtooth", volume: 0.085 });
          keepImpactObjectVisible(object, collision);
          updateHud();
          if (hits >= maxHits) finish(false);
        };
        const nearMiss = (object) => {
          if (object.passed || object.type === "score" || object.type === "gust") return;
          const rect = objectRect(object);
          const player = playerRect();
          const verticalGap = Math.max(0, Math.max(rect.top - player.bottom, player.top - rect.bottom));
          if (verticalGap <= fieldH() * 0.055) {
            object.passed = true;
            nearMisses++;
            combo++;
            maxCombo = Math.max(maxCombo, combo);
            flightScore += 80;
            energy = Math.min(100, energy + 9);
            showCallout("\xA1CASI! +IMPULSO", "near");
            beep(620, 0.06, { type: "triangle", volume: 0.035 });
            updateHud();
          }
        };
        const tryDash = () => {
          const now = performance.now();
          const cost = cfg.dashCost || 42;
          if (!started || paused || now < dashCooldownUntil || now < dashUntil) return;
          if (energy < cost) {
            showCallout("SIN ENERG\xCDA", "bad", 480);
            energyWrap.classList.remove("is-denied");
            void energyWrap.offsetWidth;
            energyWrap.classList.add("is-denied");
            return;
          }
          energy -= cost;
          dashUntil = now + (cfg.dashDuration || 0.46) * 1e3;
          dashCooldownUntil = dashUntil + 180;
          invulnerableUntil = Math.max(invulnerableUntil, dashUntil);
          dashFrameIndex = 0;
          frameClock = 0;
          playerEl.style.backgroundImage = playerFrameAsset(DASH_FRAMES[0]);
          playerEl.classList.remove("dash-pop");
          void playerEl.offsetWidth;
          playerEl.classList.add("dash-pop");
          addParticleBurst(playerX + 0.02, playerY, "#4fd0ff", 10);
          showCallout("\xA1IMPULSO!", "dash", 420);
          beep(360, 0.12, { type: "sawtooth", volume: 0.055 });
          beep(760, 0.1, { type: "triangle", volume: 0.045, delay: 0.04 });
          updateHud();
        };
        const setPaused = (value) => {
          paused = !!value;
          pausePanel.hidden = !paused;
          pauseBtn.textContent = paused ? "\u25B6" : "\u2161";
          pauseBtn.setAttribute("aria-label", paused ? "Continuar" : "Pausar");
          if (!paused) last = performance.now();
        };
        const onPointerMove = (event) => {
          if (paused) return;
          const rect = stage.getBoundingClientRect();
          if (!rect.height) return;
          targetY = clamp((event.clientY - rect.top) / rect.height, yMin, yMax);
        };
        const onPointerDown = (event) => {
          if (event.target.closest(".ss-pause-btn, .ss-resume-btn")) return;
          event.preventDefault();
          onPointerMove(event);
          tryDash();
        };
        const keys = {};
        const onKey = (event) => {
          const key = (event.key || "").toLowerCase();
          if ((key === "p" || key === "escape") && event.type === "keydown" && !event.repeat) {
            event.preventDefault();
            setPaused(!paused);
            return;
          }
          if (key === " " && event.type === "keydown" && !event.repeat) {
            event.preventDefault();
            tryDash();
            return;
          }
          if (["arrowup", "w", "arrowdown", "s"].includes(key)) {
            event.preventDefault();
            keys[key] = event.type === "keydown";
          }
        };
        const swallow = (event) => {
          if (!event.target.closest(".ss-pause-btn, .ss-resume-btn")) {
            event.stopPropagation();
          }
        };
        window.addEventListener("pointermove", onPointerMove);
        stage.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKey);
        document.addEventListener("keyup", onKey);
        overlay.addEventListener("click", swallow, true);
        pauseBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          setPaused(!paused);
        });
        resumeBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          setPaused(false);
        });
        const cleanup = () => {
          window.removeEventListener("pointermove", onPointerMove);
          stage.removeEventListener("pointerdown", onPointerDown);
          document.removeEventListener("keydown", onKey);
          document.removeEventListener("keyup", onKey);
          overlay.removeEventListener("click", swallow, true);
          if (raf) cancelAnimationFrame(raf);
          if (resultTimer) clearTimeout(resultTimer);
        };
        const finish = (won) => {
          if (!running) return;
          running = false;
          cleanup();
          const rank = won ? hits === 0 && maxCombo >= 8 ? "S" : hits <= 1 ? "A" : hits < maxHits - 1 ? "B" : "C" : "\u2014";
          this.lastMinigameResult = {
            hits,
            maxHits,
            collected,
            goal,
            comboMax: maxCombo,
            nearMisses,
            score: flightScore,
            rank
          };
          const result = document.createElement("div");
          result.className = "minigame-result fly-result";
          result.innerHTML = won ? `<span>\xA1PARTITURAS COMPLETAS!</span><strong>RANGO ${rank}</strong><small>${flightScore.toLocaleString("es-ES")} pts \xB7 cadena ${maxCombo}</small>` : `<span>\xA1EDU HA CA\xCDDO!</span><strong>INT\xC9NTALO DE NUEVO</strong>`;
          overlay.appendChild(result);
          resultTimer = setTimeout(
            () => {
              overlay.remove();
              resolve(won);
            },
            won ? 1700 : 1050
          );
        };
        const updateCountdown = (dt) => {
          countdownTime += dt;
          const steps = ["3", "2", "1", "\xA1VUELA!"];
          const index = Math.min(steps.length - 1, Math.floor(countdownTime / 0.48));
          if (index !== countdownIndex) {
            countdownIndex = index;
            countdownEl.textContent = steps[index];
            countdownEl.classList.remove("ss-count-pop");
            void countdownEl.offsetWidth;
            countdownEl.classList.add("ss-count-pop");
            beep(index === steps.length - 1 ? 980 : 520, 0.08, { type: "square", volume: 0.04 });
          }
          if (countdownTime >= steps.length * 0.48) {
            started = true;
            countdownEl.classList.remove("active");
            countdownEl.textContent = "";
            last = performance.now();
          }
        };
        const tick = () => {
          if (!running) return;
          const now = performance.now();
          const dt = Math.min(0.05, (now - last) / 1e3);
          last = now;
          if (paused) return;
          collisionPreviousPlayerX = playerX;
          collisionPreviousPlayerY = playerY;
          if (!started) {
            updateCountdown(dt);
            updatePlayerPosition(now);
            return;
          }
          if (keys.arrowup || keys.w) targetY -= dt * 0.95;
          if (keys.arrowdown || keys.s) targetY += dt * 0.95;
          targetY = clamp(targetY, yMin, yMax);
          playerY += (targetY - playerY) * Math.min(1, dt * 10.5);
          updatePlayerPosition(now);
          const dashing = now < dashUntil;
          if (wasDashing && !dashing) {
            frameIndex = (frameIndex + 1) % FLIGHT_FRAMES.length;
            playerEl.style.backgroundImage = playerFrameAsset(FLIGHT_FRAMES[frameIndex]);
            frameClock = 0;
          }
          wasDashing = dashing;
          frameClock += dt;
          const frameDuration = dashing ? 0.07 : 0.08;
          if (frameClock >= frameDuration) {
            frameClock = 0;
            if (dashing) {
              dashFrameIndex = (dashFrameIndex + 1) % DASH_FRAMES.length;
              playerEl.style.backgroundImage = playerFrameAsset(DASH_FRAMES[dashFrameIndex]);
            } else {
              frameIndex = (frameIndex + 1) % FLIGHT_FRAMES.length;
              playerEl.style.backgroundImage = playerFrameAsset(FLIGHT_FRAMES[frameIndex]);
            }
          }
          energy = Math.min(100, energy + (cfg.energyRegen || 10) * dt);
          const progress = clamp(collected / goal, 0, 1);
          const ramp = 1 + progress * (cfg.difficultyRamp || 0.24);
          const velocity = (0.3 + baseSpeed * 0.035) * ramp;
          const spawnDelay = Math.max(330, (cfg.spawnMs || 680) * (1 - progress * 0.2));
          spawnClock += dt * 1e3;
          if (spawnClock >= spawnDelay) {
            spawnClock -= spawnDelay;
            spawnPattern();
          }
          if (progress >= 0.72 && !finaleAnnounced) {
            finaleAnnounced = true;
            stage.classList.add("is-finale");
            showCallout("\xA1\xDALTIMO COMP\xC1S!", "dash", 1100);
            beep(740, 0.12, { type: "square", volume: 0.045 });
            beep(1040, 0.14, { type: "triangle", volume: 0.045, delay: 0.08 });
          }
          for (const object of objects) {
            if (object.taken) continue;
            object.previousX = object.x;
            object.previousY = object.y;
            object.age += dt;
            object.x -= velocity * object.vx * dt;
            if (object.type === "spotlight") {
              object.y += object.vy * dt;
            } else if (object.type === "speaker") {
              object.y = object.baseY + Math.sin(object.age * 5.4) * 0.026;
            }
            object.el.style.left = object.x * 100 + "%";
            object.el.style.top = object.y * 100 + "%";
            if (object.warning && object.x <= 0.99) {
              object.warning.remove();
              object.warning = null;
            }
            const visibleFraction = visibleShapeFraction(objectShapeAt(object, object.x, object.y));
            if (object.visualReady !== false && visibleFraction >= 0.18) object.enteredViewport = true;
            const collision = object.visualReady !== false && object.enteredViewport && visibleFraction >= 0.1 ? sweptObjectCollision(object) : null;
            const collided = !!collision;
            if (object.type === "score" && collided) {
              collectScore(object);
              if (!running) return;
              continue;
            }
            if (object.type === "gust" && collided && !object.passed) {
              object.passed = true;
              targetY = clamp(targetY + object.push, yMin, yMax);
              showCallout(object.push > 0 ? "R\xC1FAGA \u2193" : "R\xC1FAGA \u2191", "near");
              beep(300, 0.1, { type: "sine", volume: 0.03 });
              continue;
            }
            if (object.type !== "score" && object.type !== "gust" && collided) {
              if (dashing) {
                destroyWithDash(object);
              } else if (now >= invulnerableUntil) {
                hitPlayer(object, collision);
                if (!running) return;
              }
              continue;
            }
            if (!object.passed && object.x < playerX - 0.02) nearMiss(object);
            if (object.y > 1.22 || object.x < -0.22) removeObject(object);
          }
          objects = objects.filter((object) => !object.taken);
          playerEl.style.opacity = now < blinkUntil && Math.floor(now / 105) % 2 === 0 ? "0.30" : "1";
          if (calloutUntil && now >= calloutUntil) {
            calloutEl.classList.remove("is-visible");
            calloutUntil = 0;
            calloutPriority = 0;
          }
          updateHud();
        };
        const loop = () => {
          if (!running) return;
          tick();
          if (running) raf = requestAnimationFrame(loop);
        };
        updateHud();
        updatePlayerPosition(performance.now());
        raf = requestAnimationFrame(loop);
      });
    }
    // Motor común de los side-scrollers. Devuelve Promise<boolean> (ganado).
    async runSideScroller(cfg) {
      this.isWaitingForInput = false;
      const SP = "assets/images/minigames/chapter3/sprites/";
      const CAP = "assets/images/minigames/chapter3/";
      const url = (n, base = SP) => `url('${this.cacheBustAsset(base + n + ".webp")}')`;
      const spriteNames = (entry) => {
        if (typeof entry === "string") return [entry];
        if (entry && entry.frames && entry.frames.length) return entry.frames;
        return entry && entry.name ? [entry.name] : [];
      };
      const spriteName = (entry) => spriteNames(entry)[0];
      const isFly = cfg.mode === "fly";
      await this.preloadImages([
        ...(cfg.playerFrames || []).map((n) => SP + n + ".webp"),
        ...(cfg.obstacles || []).flatMap(spriteNames).map((n) => SP + n + ".webp"),
        ...(cfg.enemies || []).flat().map((n) => SP + n + ".webp"),
        ...(cfg.collectible || []).map((n) => SP + n + ".webp"),
        ...(isFly ? cfg.fallerFrames || ["aire_foco", "aire_foco_on"] : []).map((n) => SP + n + ".webp"),
        ...(isFly ? ["aire_cable_cap", "aire_cable_body", "aire_cable_tip"] : []).map((n) => SP + n + ".webp"),
        ...[cfg.bgFar, cfg.bgNear, cfg.backdrop, cfg.moon].filter(Boolean).map((n) => CAP + n + ".webp")
      ]);
      const speed = cfg.speed || 6;
      const maxHits = cfg.maxHits || 3;
      const goal = cfg.goal || 60;
      return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "minigame-overlay sidescroller-minigame " + (isFly ? "ss-fly" : "ss-chase");
        overlay.innerHTML = `
                <div class="minigame-hud neon-font">
                    <span class="mg-score"></span>
                    <span class="ss-lives"></span>
                    <span class="mg-status"></span>
                    <button class="ss-pause-btn" type="button" aria-label="Pausar">\u2161</button>
                </div>
                <div class="ss-stage" id="ss-stage">
                    ${cfg.bgFar ? '<div class="ss-bg ss-bg-far"></div>' : ""}
                    ${cfg.moon ? '<div class="ss-moon" aria-hidden="true"></div>' : ""}
                    ${cfg.bgNear ? '<div class="ss-bg ss-bg-near"></div>' : ""}
                    <div class="ss-player" id="ss-player"></div>
                    <div class="ss-progress-wrap"><div class="ss-progress-fill" id="ss-progress"></div></div>
                    <div class="ss-countdown" aria-live="polite"></div>
                    <div class="ss-pause-panel" hidden>
                        <strong>PAUSA</strong>
                        <span>${isFly ? "Mueve a Edu con el rat\xF3n o \u2191/\u2193." : "Conduce con el rat\xF3n o WASD/FLECHAS."}</span>
                        <button class="ss-resume-btn" type="button">CONTINUAR</button>
                    </div>
                </div>
                <div class="minigame-instructions">${cfg.title} <small>P / ESC: pausa</small></div>
            `;
        document.getElementById("game-container").appendChild(overlay);
        const swallow = (e) => {
          if (e.target.closest(".ss-pause-btn, .ss-resume-btn")) return;
          e.stopPropagation();
        };
        overlay.addEventListener("click", swallow, true);
        const stage = overlay.querySelector("#ss-stage");
        const playerEl = overlay.querySelector("#ss-player");
        const scoreEl = overlay.querySelector(".mg-score");
        const livesEl = overlay.querySelector(".ss-lives");
        const statusEl = overlay.querySelector(".mg-status");
        const progressEl = overlay.querySelector("#ss-progress");
        const bgFarEl = overlay.querySelector(".ss-bg-far");
        const bgNearEl = overlay.querySelector(".ss-bg-near");
        const moonEl = overlay.querySelector(".ss-moon");
        const pauseBtn = overlay.querySelector(".ss-pause-btn");
        const pausePanel = overlay.querySelector(".ss-pause-panel");
        const resumeBtn = overlay.querySelector(".ss-resume-btn");
        const countdownEl = overlay.querySelector(".ss-countdown");
        if (bgFarEl && cfg.bgFar) bgFarEl.style.backgroundImage = url(cfg.bgFar, CAP);
        if (bgNearEl && cfg.bgNear) bgNearEl.style.backgroundImage = url(cfg.bgNear, CAP);
        if (moonEl && cfg.moon) {
          moonEl.style.backgroundImage = url(cfg.moon, CAP);
          moonEl.style.left = (cfg.moonStartX != null ? cfg.moonStartX : 0.82) * 100 + "%";
          moonEl.style.top = (cfg.moonStartY != null ? cfg.moonStartY : 0.22) * 100 + "%";
        }
        if (cfg.backdrop) {
          stage.style.backgroundImage = url(cfg.backdrop, CAP);
          stage.style.backgroundSize = "cover";
          stage.style.backgroundPosition = "center";
        }
        const fieldW = () => stage.clientWidth || 1;
        const fieldH = () => stage.clientHeight || 1;
        const xMin = cfg.xMin != null ? cfg.xMin : 0.03;
        const xMax = cfg.xMax != null ? cfg.xMax : 0.8;
        const yMin = cfg.yMin != null ? cfg.yMin : 0.09;
        const yMax = cfg.yMax != null ? cfg.yMax : 0.91;
        const pRatio = cfg.playerRatio || 1.5;
        const pFrac = cfg.playerHeight || 0.26;
        const sizePlayer = () => {
          const h = fieldH() * pFrac;
          playerEl.style.height = h + "px";
          playerEl.style.width = h * pRatio + "px";
        };
        playerEl.style.backgroundImage = url(cfg.playerFrames[0]);
        sizePlayer();
        let playerX = isFly ? 0.12 : Math.max(xMin, Math.min(xMax, 0.12));
        let targetX = playerX;
        let playerY = (yMin + yMax) / 2, targetY = playerY;
        const playerFootprint = !isFly ? cfg.playerFootprint : null;
        const playerHitboxes = cfg.playerHitboxes || [{ x: 0.25, y: 0.25, w: 0.5, h: 0.5 }];
        const createDebugBoxes = (count, type, label, footprint = false) => {
          if (!cfg.debugHitboxes) return [];
          return Array.from({ length: count }, (_, index) => {
            const box = document.createElement("div");
            box.className = `ss-debug-hitbox ss-debug-${type}` + (footprint ? " ss-debug-footprint" : "");
            box.innerHTML = `<span>${label}${count > 1 ? ` ${index + 1}` : ""}</span>`;
            stage.appendChild(box);
            return box;
          });
        };
        const playerDebugBoxes = createDebugBoxes(
          playerFootprint ? 1 : playerHitboxes.length,
          "player-hitbox",
          playerFootprint ? "HUELLA COCHE" : "EDU",
          !!playerFootprint
        );
        const paintDebugRect = (el, left, top, right, bottom) => {
          if (!el) return;
          el.style.left = left + "px";
          el.style.top = top + "px";
          el.style.width = Math.max(0, right - left) + "px";
          el.style.height = Math.max(0, bottom - top) + "px";
        };
        const rectsFromDefs = (defs, left, top, width, height) => defs.map((def) => ({
          left: left + def.x * width,
          top: top + def.y * height,
          right: left + (def.x + def.w) * width,
          bottom: top + (def.y + def.h) * height
        }));
        const footprintFromDef = (def, left, top, width, height) => ({
          cx: left + def.x * width,
          cy: top + def.y * height,
          rx: def.rx * width,
          ry: def.ry * height
        });
        const paintDebugFootprint = (el, footprint) => {
          if (!el || !footprint) return;
          paintDebugRect(
            el,
            footprint.cx - footprint.rx,
            footprint.cy - footprint.ry,
            footprint.cx + footprint.rx,
            footprint.cy + footprint.ry
          );
        };
        const paintDebugRects = (elements, rects) => {
          elements.forEach((el, index) => {
            const rect = rects[index];
            if (rect) paintDebugRect(el, rect.left, rect.top, rect.right, rect.bottom);
          });
        };
        const removeDebugBoxes = (elements) => {
          (elements || []).forEach((el) => el.remove());
        };
        const rectsOverlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const anyRectsOverlap = (first, second) => first.some((a) => second.some((b) => rectsOverlap(a, b)));
        const sweptFootprintsOverlap = (aPrev, aNow, bPrev, bNow) => {
          const sumRx = Math.max(1, aNow.rx + bNow.rx);
          const sumRy = Math.max(1, aNow.ry + bNow.ry);
          const startX = (aPrev.cx - bPrev.cx) / sumRx;
          const startY = (aPrev.cy - bPrev.cy) / sumRy;
          const endX = (aNow.cx - bNow.cx) / sumRx;
          const endY = (aNow.cy - bNow.cy) / sumRy;
          const dx = endX - startX, dy = endY - startY;
          const lengthSq = dx * dx + dy * dy;
          const t = lengthSq > 0 ? Math.max(0, Math.min(1, -(startX * dx + startY * dy) / lengthSq)) : 0;
          const nearestX = startX + dx * t;
          const nearestY = startY + dy * t;
          return nearestX * nearestX + nearestY * nearestY <= 1;
        };
        const getPlayerRects = () => {
          const fw = fieldW(), fh = fieldH();
          const pw = playerEl.offsetWidth, ph = playerEl.offsetHeight;
          return rectsFromDefs(playerHitboxes, playerX * fw, playerY * fh - ph / 2, pw, ph);
        };
        const getPlayerFootprint = () => {
          if (!playerFootprint) return null;
          const fw = fieldW(), fh = fieldH();
          const pw = playerEl.offsetWidth, ph = playerEl.offsetHeight;
          return footprintFromDef(playerFootprint, playerX * fw, playerY * fh - ph / 2, pw, ph);
        };
        const updatePlayerDebug = () => {
          if (!playerDebugBoxes.length) return;
          if (playerFootprint) {
            paintDebugFootprint(playerDebugBoxes[0], getPlayerFootprint());
          } else {
            paintDebugRects(playerDebugBoxes, getPlayerRects());
          }
        };
        const zByY = (y) => Math.round(y * 100) + 10;
        const setPlayerPosition = () => {
          playerEl.style.left = playerX * 100 + "%";
          playerEl.style.top = playerY * 100 + "%";
          const footprint = getPlayerFootprint();
          playerEl.style.zIndex = zByY(footprint ? footprint.cy / fieldH() : playerY);
          updatePlayerDebug();
        };
        setPlayerPosition();
        let frameIdx = 0, frameT = 0;
        const animatePlayer = (dt) => {
          frameT += dt;
          if (frameT >= (isFly ? 0.11 : 0.085)) {
            frameT = 0;
            frameIdx = (frameIdx + 1) % cfg.playerFrames.length;
            playerEl.style.backgroundImage = url(cfg.playerFrames[frameIdx]);
          }
        };
        let paused = false;
        let last = performance.now();
        const setPaused = (value) => {
          paused = !!value;
          pausePanel.hidden = !paused;
          pauseBtn.textContent = paused ? "\u25B6" : "\u2161";
          pauseBtn.setAttribute("aria-label", paused ? "Continuar" : "Pausar");
          if (!paused) last = performance.now();
        };
        pauseBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          setPaused(!paused);
        });
        resumeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          setPaused(false);
        });
        const onMove = (e) => {
          if (paused) return;
          const r = stage.getBoundingClientRect();
          if (!r.height) return;
          targetY = Math.max(yMin, Math.min(yMax, (e.clientY - r.top) / r.height));
          if (!isFly && r.width) {
            const wantedLeft = (e.clientX - r.left - playerEl.offsetWidth / 2) / r.width;
            targetX = Math.max(xMin, Math.min(xMax, wantedLeft));
          }
        };
        window.addEventListener("pointermove", onMove);
        stage.addEventListener("pointerdown", onMove);
        const keys = {};
        const onKey = (e) => {
          if (!overlay.isConnected) {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("keyup", onKey);
            window.removeEventListener("pointermove", onMove);
            return;
          }
          const k = (e.key || "").toLowerCase();
          if (["p", "escape"].includes(k) && e.type === "keydown" && !e.repeat) {
            e.preventDefault();
            setPaused(!paused);
            return;
          }
          if (["arrowup", "w", "arrowdown", "s", "arrowleft", "a", "arrowright", "d"].includes(k)) {
            e.preventDefault();
            keys[k] = e.type === "keydown";
          }
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("keyup", onKey);
        let objs = [];
        let ultimoCable = null;
        let ultimoModo = null;
        let ultimoRoadY = null;
        let ultimoEnemigoMs = -Infinity;
        let nextEnemySide = Math.random() < 0.5 ? "rear" : "front";
        const spawnObj = () => {
          if (!running) return;
          const el = document.createElement("div");
          el.className = "ss-obj";
          let name, kind, hFrac, wRatio, hitX = null, hitY = null, hitboxes = null;
          let footprint = null, footprints = null, frameDuration = null;
          let y = yMin + Math.random() * (yMax - yMin);
          let vy = 0, isHang = false, largoCable = 0;
          let spawnX = 1.08, direction = -1, phase = null, warning = null;
          let enemySide = null;
          const roll = Math.random();
          const hangC = isFly ? cfg.hangChance || 0 : 0;
          const riseC = isFly ? cfg.riserChance || 0 : 0;
          const fallC = isFly ? cfg.fallerChance || 0 : 0;
          const collC = cfg.collectible ? cfg.collectChance != null ? cfg.collectChance : 0.55 : 0;
          const enemyC = cfg.enemies && cfg.enemies.length ? 0.2 : 0;
          let mode;
          if (isFly && roll < hangC) mode = "hang";
          else if (isFly && roll < hangC + riseC) mode = "riser";
          else if (isFly && roll < hangC + riseC + fallC) mode = "faller";
          else if (cfg.collectible && roll < hangC + riseC + fallC + collC) mode = "collect";
          else if (enemyC && roll < hangC + riseC + fallC + collC + enemyC) mode = "enemy";
          else if (cfg.obstacles && cfg.obstacles.length) mode = "static";
          else mode = ["hang", "riser", "faller"][Math.floor(Math.random() * 3)];
          if (!isFly && mode === "enemy" && (ultimoModo === "enemy" || performance.now() - ultimoEnemigoMs < 1350)) {
            mode = cfg.obstacles && cfg.obstacles.length ? "static" : "enemy";
          }
          if (mode === "collect" && ultimoModo === "collect") {
            mode = isFly ? ["hang", "riser", "faller"][Math.floor(Math.random() * 3)] : cfg.obstacles && cfg.obstacles.length ? "static" : "enemy";
          }
          ultimoModo = mode;
          if (mode === "hang" || mode === "riser") {
            kind = "obstacle";
            isHang = true;
            const hMin = cfg.hangMin != null ? cfg.hangMin : 0.25;
            const hMax = cfg.hangMax != null ? cfg.hangMax : 0.6;
            let largo = hMin + Math.random() * (hMax - hMin);
            const CORREDOR = cfg.corridorMin != null ? cfg.corridorMin : 0.18;
            const CERCA = 0.2;
            let ocupadoEnfrente = 0;
            objs.forEach((o) => {
              if (!o.isHang || o.hangMode === mode) return;
              if (Math.abs(o.x - 1.05) > CERCA) return;
              ocupadoEnfrente = Math.max(ocupadoEnfrente, o.hangLargo || 0);
            });
            if (ocupadoEnfrente > 0) {
              largo = Math.min(largo, Math.max(0.12, 1 - CORREDOR - ocupadoEnfrente));
            }
            largoCable = largo;
            const h = fieldH() * largo;
            const w = Math.max(62, h * 0.22);
            el.style.height = h + "px";
            el.style.width = w + "px";
            el.style.filter = "drop-shadow(0 0 7px rgba(130,200,255,0.45))";
            y = mode === "hang" ? largo / 2 : 1 - largo / 2;
            el.style.top = y * 100 + "%";
            const tramo = document.createElement("div");
            tramo.style.cssText = "width:100%;height:100%;display:flex;flex-direction:column;";
            if (mode === "riser") tramo.style.transform = "scaleY(-1)";
            const capH = w * (160 / 200), tipH = w * (221 / 200);
            [
              ["aire_cable_cap", capH + "px", "0 0 auto"],
              ["aire_cable_body", "auto", "1 1 auto"],
              ["aire_cable_tip", tipH + "px", "0 0 auto"]
            ].forEach(([piece, ph, flex]) => {
              const seg = document.createElement("div");
              seg.style.cssText = `width:100%;height:${ph};flex:${flex};background-image:${url(piece)};background-size:100% 100%;background-repeat:no-repeat;`;
              tramo.appendChild(seg);
            });
            el.appendChild(tramo);
          } else if (mode === "faller") {
            kind = "obstacle";
            el._frames = cfg.fallerFrames || ["aire_foco", "aire_foco_on"];
            name = el._frames[0];
            hFrac = 0.16;
            wRatio = 0.7;
            y = 0.02;
            vy = (cfg.fallerVy != null ? cfg.fallerVy : 0.26) + Math.random() * 0.16;
          } else if (mode === "collect") {
            kind = "collect";
            name = cfg.collectible[0];
            el.classList.add("ss-collect");
            hFrac = 0.12;
            wRatio = 1.05;
          } else if (mode === "enemy") {
            kind = "enemy";
            const en = cfg.enemies[Math.floor(Math.random() * cfg.enemies.length)];
            el._frames = en;
            name = en[0];
            hFrac = 0.18;
            wRatio = 1.75;
            footprint = { x: 0.5, y: 0.82, rx: 0.44, ry: 0.07 };
            const fromRear = nextEnemySide === "rear";
            nextEnemySide = fromRear ? "front" : "rear";
            if (fromRear) {
              enemySide = "rear";
              el.classList.add("ss-enemy", "ss-enemy-rear", "ss-enemy-stalk");
              y = Math.max(yMin, Math.min(yMax, playerY + (Math.random() - 0.5) * 0.1));
              spawnX = -0.16;
              direction = 1;
              phase = "stalk";
            } else {
              enemySide = "front";
              el.classList.add("ss-enemy", "ss-enemy-front", "ss-enemy-approach");
              spawnX = 1.16;
              direction = -1;
              phase = "front";
            }
            ultimoEnemigoMs = performance.now();
          } else {
            kind = "obstacle";
            const spec = cfg.obstacles[Math.floor(Math.random() * cfg.obstacles.length)];
            name = spriteName(spec);
            if (typeof spec !== "string" && spec.frames && spec.frames.length) {
              el._frames = spec.frames;
              frameDuration = spec.frameMs || null;
            }
            hFrac = typeof spec === "string" ? 0.14 : spec.h || 0.14;
            wRatio = typeof spec === "string" ? 1.1 : spec.ratio || 1.1;
            hitX = typeof spec === "string" ? 0.52 : spec.hitX || 0.52;
            hitY = typeof spec === "string" ? 0.52 : spec.hitY || 0.52;
            hitboxes = typeof spec === "string" ? null : spec.hitboxes || null;
            footprint = typeof spec === "string" ? { x: 0.5, y: 0.78, rx: 0.3, ry: 0.09 } : spec.footprint || null;
            footprints = typeof spec === "string" ? null : spec.footprints || null;
            if (typeof spec !== "string" && spec.yMin != null && spec.yMax != null) {
              y = spec.yMin + Math.random() * (spec.yMax - spec.yMin);
            }
            if (!isFly && ultimoRoadY != null && Math.abs(y - ultimoRoadY) > 0.15) {
              y = (y + ultimoRoadY) / 2;
            }
            if (typeof spec !== "string" && spec.yMin != null && spec.yMax != null) {
              y = Math.max(spec.yMin, Math.min(spec.yMax, y));
            }
            ultimoRoadY = y;
          }
          if (name) el.style.backgroundImage = url(name);
          if (hFrac) {
            const h = fieldH() * hFrac;
            el.style.height = h + "px";
            el.style.width = h * wRatio + "px";
          }
          if (!isHang) el.style.top = y * 100 + "%";
          el.style.left = spawnX * 100 + "%";
          stage.appendChild(el);
          const footprintDefs = footprints || (footprint ? [footprint] : null);
          if (footprintDefs && footprintDefs.length) {
            const initialFootprints = footprintDefs.map(
              (def) => footprintFromDef(
                def,
                spawnX * fieldW() - el.offsetWidth / 2,
                y * fieldH() - el.offsetHeight / 2,
                el.offsetWidth,
                el.offsetHeight
              )
            );
            const nearestFootprint = initialFootprints.reduce(
              (nearest, current) => current.cy > nearest.cy ? current : nearest
            );
            el.style.zIndex = zByY(nearestFootprint.cy / fieldH());
          } else {
            el.style.zIndex = zByY(y);
          }
          if (kind === "enemy" && !isFly) {
            warning = document.createElement("div");
            warning.className = "ss-threat-indicator" + (enemySide === "front" ? " ss-threat-front" : "");
            warning.textContent = enemySide === "front" ? "MOTO \u26A0" : "\u26A0 MOTO";
            warning.style.top = y * 100 + "%";
            stage.appendChild(warning);
          }
          const fallbackHitbox = {
            x: (1 - (hitX != null ? hitX : kind === "collect" ? 0.75 : isHang ? 0.42 : 0.52)) / 2,
            y: (1 - (hitY != null ? hitY : kind === "collect" ? 0.75 : isHang ? 0.86 : 0.52)) / 2,
            w: hitX != null ? hitX : kind === "collect" ? 0.75 : isHang ? 0.42 : 0.52,
            h: hitY != null ? hitY : kind === "collect" ? 0.75 : isHang ? 0.86 : 0.52
          };
          const collisionDefs = hitboxes || [fallbackHitbox];
          const usesFootprint = !isFly && !!(footprintDefs && footprintDefs.length);
          const debugLabel = kind === "enemy" ? enemySide === "front" ? "HUELLA MOTO FRENTE" : "HUELLA MOTO DETR\xC1S" : kind === "collect" ? "COLECCIONABLE" : usesFootprint ? "HUELLA OBST\xC1CULO" : "OBST\xC1CULO";
          const debugBoxes = createDebugBoxes(
            usesFootprint ? footprintDefs.length : collisionDefs.length,
            kind,
            debugLabel,
            usesFootprint
          );
          objs.push({
            el,
            x: spawnX,
            y,
            kind,
            vy,
            isHang,
            taken: false,
            frameT: 0,
            frameIdx: 0,
            direction,
            phase,
            age: 0,
            warning,
            hitX,
            hitY,
            hitboxes: collisionDefs,
            footprints: footprintDefs,
            prevFootprints: null,
            frameDuration,
            enemySide,
            debugBoxes,
            hangMode: isHang ? mode : null,
            hangLargo: isHang ? largoCable : 0
          });
        };
        let hits = 0, collected = 0, dist = 0, running = true;
        const updateHud = () => {
          if (isFly) {
            scoreEl.textContent = `\u{1F3BC} ${collected} / ${goal}`;
            statusEl.textContent = "Recoge";
          } else {
            const pct = Math.max(0, Math.min(100, Math.round(dist / goal * 100)));
            scoreEl.textContent = `\u{1F3C1} ${pct}%`;
            statusEl.textContent = `${Math.max(0, Math.ceil(goal - dist))} m`;
          }
          const progress = Math.max(0, Math.min(1, isFly ? collected / goal : dist / goal));
          progressEl.style.width = progress * 100 + "%";
          window.MinigameLifeDisplay.renderSlots(livesEl, Math.max(0, maxHits - hits), maxHits);
        };
        updateHud();
        let sctx = null;
        const beep = (f, d, t, v) => {
          try {
            if (!sctx) sctx = new (window.AudioContext || window.webkitAudioContext)();
            if (sctx.state === "suspended") sctx.resume();
            const o = sctx.createOscillator(), g = sctx.createGain(), n = sctx.currentTime + (t || 0);
            o.type = v && v.type || "sine";
            o.frequency.value = f;
            g.gain.setValueAtTime(1e-4, n);
            g.gain.exponentialRampToValueAtTime(v && v.vol || 0.07, n + 0.01);
            g.gain.exponentialRampToValueAtTime(1e-4, n + d);
            o.connect(g).connect(sctx.destination);
            o.start(n);
            o.stop(n + d + 0.02);
          } catch (e) {
          }
        };
        let spawnTimer = null, raf = null, countdownTimers = [];
        const finish = (won) => {
          if (!running) return;
          running = false;
          if (spawnTimer) clearTimeout(spawnTimer);
          countdownTimers.forEach(clearTimeout);
          if (raf) cancelAnimationFrame(raf);
          window.removeEventListener("pointermove", onMove);
          stage.removeEventListener("pointerdown", onMove);
          document.removeEventListener("keydown", onKey);
          document.removeEventListener("keyup", onKey);
          overlay.removeEventListener("click", swallow, true);
          objs.forEach((o) => {
            o.el.remove();
            if (o.warning) o.warning.remove();
            removeDebugBoxes(o.debugBoxes);
          });
          removeDebugBoxes(playerDebugBoxes);
          objs = [];
          const result = document.createElement("div");
          result.className = "minigame-result";
          result.textContent = won ? cfg.winMsg : cfg.loseMsg;
          overlay.appendChild(result);
          this.lastMinigameResult = { hits, maxHits, collected, goal };
          setTimeout(
            () => {
              overlay.remove();
              resolve(won);
            },
            won ? 1500 : 950
          );
        };
        let invulnUntil = performance.now() + (isFly ? cfg.graceMs != null ? cfg.graceMs : 1200 : 0);
        let blinkUntil = isFly ? invulnUntil : 0;
        const hitPlayer = () => {
          hits++;
          updateHud();
          invulnUntil = performance.now() + (cfg.hitGraceMs != null ? cfg.hitGraceMs : 800);
          blinkUntil = invulnUntil;
          playerEl.classList.remove("ss-hurt");
          void playerEl.offsetWidth;
          playerEl.classList.add("ss-hurt");
          stage.classList.remove("ss-hit");
          void stage.offsetWidth;
          stage.classList.add("ss-hit");
          beep(150, 0.18, 0, { type: "sawtooth", vol: 0.08 });
          if (hits >= maxHits) finish(false);
        };
        const grab = (o) => {
          collected++;
          o.taken = true;
          o.el.classList.add("ss-taken");
          if (o.warning) o.warning.remove();
          removeDebugBoxes(o.debugBoxes);
          if (cfg.collectible && cfg.collectible[1]) o.el.style.backgroundImage = url(cfg.collectible[1]);
          beep(880, 0.09, 0, { type: "triangle", vol: 0.08 });
          beep(1320, 0.09, 0.05, { type: "triangle", vol: 0.06 });
          updateHud();
          const el = o.el;
          setTimeout(() => el.remove(), 320);
          if (collected >= goal) finish(true);
        };
        let bgX = 0, prevPlayerFootprint = null;
        const roadPxPerSec = speed * 55;
        const objSpeed = 0.12 + speed * 0.055;
        const distRate = speed * 0.62;
        const baseSpawnMs = cfg.spawnMs != null ? cfg.spawnMs : Math.max(480, 1150 - speed * 75);
        let started = isFly;
        const scheduleSpawn = () => {
          if (!running) return;
          const runProgress = isFly ? 0 : Math.max(0, Math.min(1, dist / goal));
          const roadSpeed = roadPxPerSec / fieldW();
          const spacingFactor = isFly ? 1 : Math.max(1, objSpeed / roadSpeed);
          const delay = isFly ? baseSpawnMs : baseSpawnMs * spacingFactor * (1.18 - runProgress * 0.18);
          spawnTimer = setTimeout(
            () => {
              if (!running) return;
              if (started && !paused) spawnObj();
              scheduleSpawn();
            },
            paused ? 120 : delay
          );
        };
        if (isFly) {
          scheduleSpawn();
        } else {
          countdownEl.classList.add("active");
          const countdownSteps = ["3", "2", "1", "\xA1YA!"];
          const runCountdownStep = (index) => {
            if (!running) return;
            if (paused) {
              countdownTimers.push(setTimeout(() => runCountdownStep(index), 100));
              return;
            }
            if (index >= countdownSteps.length) {
              countdownEl.classList.remove("active");
              countdownEl.textContent = "";
              started = true;
              last = performance.now();
              scheduleSpawn();
              return;
            }
            countdownEl.textContent = countdownSteps[index];
            countdownEl.classList.remove("ss-count-pop");
            void countdownEl.offsetWidth;
            countdownEl.classList.add("ss-count-pop");
            beep(index === countdownSteps.length - 1 ? 980 : 520, 0.08, 0, { type: "square", vol: 0.045 });
            countdownTimers.push(setTimeout(() => runCountdownStep(index + 1), 430));
          };
          runCountdownStep(0);
        }
        const tick = () => {
          if (!running) return;
          const now = performance.now();
          const dt = Math.min(0.05, (now - last) / 1e3);
          last = now;
          if (paused) {
            playerEl.style.setProperty("--ss-steer", "0deg");
            return;
          }
          if (keys["arrowup"] || keys["w"]) targetY -= dt * 1.15;
          if (keys["arrowdown"] || keys["s"]) targetY += dt * 1.15;
          if (!isFly && (keys["arrowleft"] || keys["a"])) targetX -= dt * 0.95;
          if (!isFly && (keys["arrowright"] || keys["d"])) targetX += dt * 0.95;
          targetX = Math.max(xMin, Math.min(xMax, targetX));
          targetY = Math.max(yMin, Math.min(yMax, targetY));
          playerX += (targetX - playerX) * Math.min(1, dt * 8);
          playerY += (targetY - playerY) * Math.min(1, dt * 10);
          setPlayerPosition();
          if (!isFly) {
            const steer = Math.max(-2.6, Math.min(2.6, (targetY - playerY) * 24));
            playerEl.style.setProperty("--ss-steer", steer.toFixed(2) + "deg");
          }
          animatePlayer(dt);
          if (!started) {
            updateHud();
            return;
          }
          bgX -= roadPxPerSec * dt;
          if (bgFarEl) bgFarEl.style.backgroundPositionX = bgX * 0.22 + "px";
          if (bgNearEl) bgNearEl.style.backgroundPositionX = bgX + "px";
          if (!isFly) {
            dist += distRate * dt;
            if (dist >= goal) {
              finish(true);
              return;
            }
          }
          if (moonEl && !isFly) {
            const moonProgress = Math.max(0, Math.min(1, dist / goal));
            const easedMoonProgress = moonProgress * moonProgress * (3 - 2 * moonProgress);
            const startX = cfg.moonStartX != null ? cfg.moonStartX : 0.82;
            const endX = cfg.moonEndX != null ? cfg.moonEndX : 0.2;
            const startY = cfg.moonStartY != null ? cfg.moonStartY : 0.22;
            const endY = cfg.moonEndY != null ? cfg.moonEndY : 0.12;
            moonEl.style.left = (startX + (endX - startX) * easedMoonProgress) * 100 + "%";
            moonEl.style.top = (startY + (endY - startY) * easedMoonProgress) * 100 + "%";
          }
          const fw = fieldW(), fh = fieldH();
          const currentPlayerFootprint = getPlayerFootprint();
          const playerRects = isFly ? getPlayerRects() : [];
          if (currentPlayerFootprint) {
            paintDebugFootprint(playerDebugBoxes[0], currentPlayerFootprint);
          } else {
            paintDebugRects(playerDebugBoxes, playerRects);
          }
          for (const o of objs) {
            if (o.taken) continue;
            if (!isFly && o.kind === "enemy") {
              o.age += dt;
              if (o.phase === "stalk") {
                o.x += (0.1 + speed * 8e-3) * dt;
                o.y += (playerY - o.y) * Math.min(1, dt * 2.8);
                o.y = Math.max(yMin, Math.min(yMax, o.y));
                o.el.style.top = o.y * 100 + "%";
                if (o.warning) o.warning.style.top = o.y * 100 + "%";
                if (o.age >= 0.85) {
                  o.phase = "charge";
                  o.el.classList.remove("ss-enemy-stalk");
                  o.el.classList.add("ss-enemy-charge");
                  if (o.warning) {
                    o.warning.remove();
                    o.warning = null;
                  }
                  beep(720, 0.09, 0, { type: "sawtooth", vol: 0.045 });
                }
              } else if (o.phase === "charge") {
                o.x += (0.34 + speed * 0.03) * dt;
              } else {
                o.x -= (roadPxPerSec / fw + 0.14 + speed * 0.012) * dt;
                if (o.warning && o.x <= 1.01) {
                  o.warning.remove();
                  o.warning = null;
                  o.el.classList.remove("ss-enemy-approach");
                }
              }
            } else if (!isFly && o.kind === "obstacle") {
              o.x -= roadPxPerSec / fw * dt;
            } else {
              o.x -= objSpeed * dt;
            }
            o.el.style.left = o.x * 100 + "%";
            if (o.vy) {
              o.y += o.vy * dt;
              o.el.style.top = o.y * 100 + "%";
              o.el.style.zIndex = zByY(o.y);
              if (o.y > 1.15) {
                o.taken = true;
                o.el.remove();
                if (o.warning) o.warning.remove();
                removeDebugBoxes(o.debugBoxes);
                continue;
              }
            }
            if (o.el._frames && o.el._frames.length > 1) {
              o.frameT += dt;
              const frameDuration = o.frameDuration || (o.kind === "enemy" ? 0.095 : 0.14);
              if (o.frameT >= frameDuration) {
                o.frameT = 0;
                o.frameIdx = (o.frameIdx + 1) % o.el._frames.length;
                o.el.style.backgroundImage = url(o.el._frames[o.frameIdx]);
              }
            }
            const ow = o.el.offsetWidth, oh = o.el.offsetHeight;
            const ocx = o.x * fw, ocy = o.y * fh;
            let collided = false;
            if (!isFly && currentPlayerFootprint && o.footprints && o.footprints.length) {
              const currentObjectFootprints = o.footprints.map(
                (def) => footprintFromDef(def, ocx - ow / 2, ocy - oh / 2, ow, oh)
              );
              const nearestFootprint = currentObjectFootprints.reduce(
                (nearest, current) => current.cy > nearest.cy ? current : nearest
              );
              o.el.style.zIndex = zByY(nearestFootprint.cy / fh);
              currentObjectFootprints.forEach(
                (current, index) => paintDebugFootprint(o.debugBoxes[index], current)
              );
              collided = currentObjectFootprints.some(
                (current, index) => sweptFootprintsOverlap(
                  prevPlayerFootprint || currentPlayerFootprint,
                  currentPlayerFootprint,
                  o.prevFootprints && o.prevFootprints[index] || current,
                  current
                )
              );
              o.prevFootprints = currentObjectFootprints;
            } else {
              const objectRects = rectsFromDefs(o.hitboxes, ocx - ow / 2, ocy - oh / 2, ow, oh);
              paintDebugRects(o.debugBoxes, objectRects);
              collided = anyRectsOverlap(playerRects, objectRects);
            }
            const dangerous = o.kind !== "enemy" || o.phase === "charge" || o.phase === "front" || isFly;
            if (dangerous && collided) {
              if (o.kind === "collect") {
                grab(o);
                if (!running) return;
              } else if (now >= invulnUntil) {
                o.taken = true;
                o.el.remove();
                if (o.warning) o.warning.remove();
                removeDebugBoxes(o.debugBoxes);
                hitPlayer();
                if (!running) return;
              }
            }
          }
          prevPlayerFootprint = currentPlayerFootprint;
          objs = objs.filter((o) => {
            const inBounds = o.direction > 0 ? o.x < 1.28 : o.x > -0.25;
            if (!inBounds && o.warning) o.warning.remove();
            if (!inBounds) removeDebugBoxes(o.debugBoxes);
            return !o.taken && inBounds;
          });
          playerEl.style.opacity = now < blinkUntil && Math.floor(now / 120) % 2 === 0 ? "0.35" : "1";
          updateHud();
        };
        const loop = () => {
          if (!running || !overlay.isConnected) {
            running = false;
            return;
          }
          tick();
          if (running) raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      });
    }
    // Capas de dirección de escena (crossfade de fondo, fundido a negro y CG).
    // Se crean perezosamente colgando de #game-container (regla del stage escalado).
    ensureSceneLayers() {
      const gc = document.getElementById("game-container");
      if (!gc) return {};
      const bg = this._getBackgroundElement();
      let bgB = document.getElementById("background-b");
      if (!bgB) {
        bgB = document.createElement("div");
        bgB.id = "background-b";
        bgB.className = "background background-b";
        if (bg) {
          bgB.style.filter = window.Juice && typeof window.Juice.currentGrade === "function" ? window.Juice.currentGrade() : bg.style.filter || getComputedStyle(bg).filter || "none";
        }
        if (bg && bg.nextSibling) gc.insertBefore(bgB, bg.nextSibling);
        else gc.appendChild(bgB);
      }
      let fader = document.getElementById("scene-fader");
      if (!fader) {
        fader = document.createElement("div");
        fader.id = "scene-fader";
        fader.className = "scene-fader";
        gc.appendChild(fader);
      }
      let cg = document.getElementById("cg-layer");
      if (!cg) {
        cg = document.createElement("div");
        cg.id = "cg-layer";
        cg.className = "cg-layer";
        gc.appendChild(cg);
      }
      return { bgB, fader, cg };
    }
    // Cambia el fondo con CROSSFADE suave (400 ms) usando una segunda capa.
    // Con { cut: true } se comporta como antes (corte seco intencionado).
    setBackground(imagePath, opts = {}) {
      const nextBackgroundPath = imagePath || null;
      if (imagePath) {
        this.preloadImages([imagePath]);
      }
      const bg = this._getBackgroundElement();
      if (!bg) return;
      if (this.currentBackgroundPath !== nextBackgroundPath) {
        this.removeAllCharacters();
      }
      this.currentBackgroundPath = nextBackgroundPath;
      const url = `url('${this.cacheBustAsset(imagePath)}')`;
      this.bgPan({ reset: true });
      if (opts.cut || !document.getElementById("game-container")) {
        clearTimeout(this._bgSwapTimer);
        this._bgSwapTimer = null;
        const bPrev = document.getElementById("background-b");
        if (bPrev) {
          bPrev.style.transition = "none";
          bPrev.style.opacity = "0";
        }
        bg.style.backgroundImage = url;
        return;
      }
      const { bgB } = this.ensureSceneLayers();
      if (!bgB) {
        bg.style.backgroundImage = url;
        return;
      }
      bgB.style.transition = "none";
      bgB.style.opacity = "0";
      bgB.style.filter = window.Juice && typeof window.Juice.currentGrade === "function" ? window.Juice.currentGrade() : bg.style.filter || getComputedStyle(bg).filter || "none";
      bgB.style.backgroundImage = url;
      void bgB.offsetWidth;
      const dur = opts.fadeMs != null ? opts.fadeMs : 400;
      bgB.style.transition = `opacity ${dur}ms ease`;
      bgB.style.opacity = "1";
      clearTimeout(this._bgSwapTimer);
      this._bgSwapTimer = setTimeout(() => {
        bg.style.backgroundImage = url;
        bgB.style.transition = "none";
        bgB.style.opacity = "0";
      }, dur + 60);
    }
    fadeScene(action = {}) {
      const { fader } = this.ensureSceneLayers();
      if (!fader) return Promise.resolve();
      const dur = action.duration != null ? action.duration : 800;
      const color = typeof action.to === "string" && action.to !== "black" ? action.to : typeof action.from === "string" && action.from !== "black" ? action.from : "#000";
      fader.style.background = color;
      const goingDark = action.from == null;
      fader.style.transition = "none";
      fader.style.opacity = goingDark ? "0" : "1";
      void fader.offsetWidth;
      fader.style.transition = `opacity ${dur}ms ease`;
      fader.style.opacity = goingDark ? "1" : "0";
      fader.style.pointerEvents = goingDark ? "auto" : "none";
      return new Promise((r) => setTimeout(r, dur + 40));
    }
    // Ken Burns del fondo: zoom/paneo lento. Se resetea al cambiar de fondo.
    bgPan(action = {}) {
      const bg = this._getBackgroundElement();
      if (!bg) return;
      if (action.reset) {
        bg.style.transition = "none";
        bg.style.transform = "";
        return;
      }
      const zf = action.zoomFrom != null ? action.zoomFrom : 1.05;
      const zt = action.zoomTo != null ? action.zoomTo : 1;
      const xf = action.xFrom || 0, xt = action.xTo || 0;
      const yf = action.yFrom || 0, yt = action.yTo || 0;
      const dur = action.duration != null ? action.duration : 6e3;
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      bg.style.transition = "none";
      bg.style.transform = `scale(${zf}) translate(${xf}%, ${yf}%)`;
      void bg.offsetWidth;
      bg.style.transition = `transform ${dur}ms ease-out`;
      bg.style.transform = `scale(${zt}) translate(${xt}%, ${yt}%)`;
    }
    // Lámina CG a pantalla (por encima de personajes, por debajo del diálogo).
    // Muestra una ilustración a pantalla completa. Con `size` se puede mostrar
    // un OBJETO en vez de una escena: las CGs normales son apaisadas y llenan la
    // pantalla (cover), pero una imagen vertical como el diapasón se ampliaba
    // hasta 1280x1382 y salía enorme y recortada. Con `size: "auto 55%"` se
    // dibuja centrada y a su tamaño. Se asigna SIEMPRE para que no se cuele el
    // tamaño de una CG en la siguiente.
    async showCG(path, duration = 600, opts = {}) {
      const { cg } = this.ensureSceneLayers();
      if (!cg || !path) return;
      await this.preloadImages([path]);
      cg.style.backgroundImage = `url('${this.cacheBustAsset(path)}')`;
      cg.style.backgroundSize = opts.size || "cover";
      cg.style.backgroundPosition = opts.position || "center";
      cg.style.boxShadow = opts.size ? "none" : "";
      cg.style.transition = `opacity ${duration}ms ease`;
      cg.style.opacity = "1";
      cg.classList.add("cg-visible");
      await new Promise((r) => setTimeout(r, duration + 40));
    }
    hideCG(duration = 500) {
      const cg = document.getElementById("cg-layer");
      if (!cg) return;
      cg.style.transition = `opacity ${duration}ms ease`;
      cg.style.opacity = "0";
      cg.classList.remove("cg-visible");
    }
    // Rompe la caché UNA VEZ POR CARGA DE PÁGINA, no en cada llamada. Antes esto
    // devolvía `?v=${Date.now()}`, así que cada cambio de fotograma de un sprite
    // generaba una URL nueva y el navegador se volvía a descargar el PNG entero:
    // el hueco se quedaba en blanco mientras tanto y el minijuego parpadeaba sin
    // parar (medido: 17 URLs distintas del coche en 2,5 s y 500 MB de descargas).
    // Con un sello fijo por sesión seguimos viendo los assets recién editados al
    // recargar, pero dentro de la partida la caché del navegador hace su trabajo.
    cacheBustAsset(path) {
      if (!path || path.startsWith("data:") || /^https?:\/\//.test(path)) {
        return path;
      }
      const cached = this.assetUrlCache.get(path);
      if (cached) return cached;
      if (path.includes("?v=")) {
        this.assetUrlCache.set(path, path);
        return path;
      }
      const separator = path.includes("?") ? "&" : "?";
      const resolved = `${path}${separator}v=${this.assetStamp}`;
      this.assetUrlCache.set(path, resolved);
      return resolved;
    }
    // Precarga una lista de imágenes y conserva tanto la promesa como el Image.
    // Si se repite un minijuego o dos motores comparten un sprite, se reutiliza
    // exactamente la misma descarga y la misma decodificación en memoria.
    preloadImages(paths) {
      const uniquePaths = [...new Set((paths || []).filter(Boolean))];
      return Promise.all(
        uniquePaths.map((path) => {
          const src = this.cacheBustAsset(path);
          const preloaded = this.preloadedImages.get(src);
          if (preloaded) return Promise.resolve(preloaded);
          const cached = this.imagePreloadCache.get(src);
          if (cached) return cached;
          const img = new Image();
          img.decoding = "async";
          const pending = new Promise((resolve) => {
            img.onload = async () => {
              try {
                if (img.decode) await img.decode();
              } catch (error) {
              }
              this.preloadedImages.set(src, img);
              resolve(img);
            };
            img.onerror = () => {
              this.imagePreloadCache.delete(src);
              resolve(null);
            };
            img.src = src;
          });
          this.imagePreloadCache.set(src, pending);
          return pending;
        })
      );
    }
    _normalizeLookupKey(value) {
      return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }
    getCharacterKey(characterName) {
      const key = this._normalizeLookupKey(characterName);
      if (!key) return key;
      const cachedKey = this.characterKeyCache.get(key);
      if (cachedKey) return cachedKey;
      if (this.characters[key]) {
        this.characterKeyCache.set(key, key);
        return key;
      }
      for (const k in this.characters) {
        const c = this.characters[k];
        if (!c) continue;
        if (this._normalizeLookupKey(c.name) === key) {
          this.characterKeyCache.set(key, k);
          return k;
        }
        if (Array.isArray(c.aliases) && c.aliases.some((a) => this._normalizeLookupKey(a) === key)) {
          this.characterKeyCache.set(key, k);
          return k;
        }
      }
      return key;
    }
    getCharacterPoseImage(character, pose) {
      if (!character) return null;
      const selected = character.poses && character.poses[pose] != null ? character.poses[pose] : character.poses && character.poses[character.defaultPose] != null ? character.poses[character.defaultPose] : character.image || character.poses?.neutral;
      if (typeof selected === "string") return selected;
      if (selected && typeof selected === "object") {
        return selected.src || selected.image || selected.frames?.[0]?.src || selected.frames?.[0] || null;
      }
      return null;
    }
    // Un cambio de pose es un reemplazo limpio. La versión anterior creaba una
    // segunda capa con el sprite viejo; si la clase de animación se retiraba
    // antes de tiempo, esa copia quedaba visible detrás del personaje nuevo.
    // Las animaciones reales se reproducen ahora con sprites consecutivos.
    applyCharacterPoseImage(charElement, poseImage) {
      if (!charElement || !poseImage) return;
      const nextPoseSrc = this.cacheBustAsset(poseImage);
      const nextImage = `url('${nextPoseSrc}')`;
      clearTimeout(charElement._poseTransitionTimer);
      charElement._poseTransitionTimer = null;
      charElement.querySelectorAll(":scope > .character-pose-ghost").forEach((ghost) => ghost.remove());
      charElement.classList.remove("pose-transitioning");
      delete charElement.dataset.poseTransition;
      charElement.style.backgroundImage = nextImage;
      charElement.dataset.poseSrc = nextPoseSrc;
      delete charElement.dataset.frameSrc;
      this.hideCharacterEyeLayer(charElement);
    }
    applyCharacterAnimationFrame(charElement, framePath) {
      if (!charElement || !framePath) return;
      const src = this.cacheBustAsset(framePath);
      charElement.style.backgroundImage = `url('${src}')`;
      charElement.dataset.frameSrc = src;
    }
    hideCharacterEyeLayer(charElement) {
      const layer = charElement?.querySelector(":scope > .character-eye-layer");
      if (layer) {
        layer.hidden = true;
        layer.removeAttribute("src");
      }
      if (charElement) delete charElement.dataset.eyeLayerState;
    }
    applyCharacterEyeLayerFrame(charElement, config, frame) {
      if (!charElement || !config || !frame?.src) return;
      let layer = charElement.querySelector(":scope > .character-eye-layer");
      if (!layer) {
        layer = document.createElement("img");
        layer.className = "character-eye-layer";
        layer.alt = "";
        layer.setAttribute("aria-hidden", "true");
        layer.draggable = false;
        charElement.appendChild(layer);
      }
      const state = frame.state === "closed" ? "closed" : "half";
      const offset = config.offsets?.[state] || [0, 0];
      const stretch = config.offsets?.[`${state}Scale`] || [1, 1];
      const crop = config.crop;
      const canvas = config.canvas;
      const width = charElement.clientWidth;
      const height = charElement.clientHeight;
      const contain = Math.min(width / canvas.width, height / canvas.height) || 1;
      const imageLeft = (width - canvas.width * contain) / 2;
      const imageTop = height - canvas.height * contain;
      const targetWidth = crop.width * stretch[0];
      const targetHeight = crop.height * stretch[1];
      const targetLeft = crop.x + crop.width / 2 + offset[0] - targetWidth / 2;
      const targetTop = crop.y + crop.height / 2 + offset[1] - targetHeight / 2;
      layer.style.left = `${imageLeft + targetLeft * contain}px`;
      layer.style.top = `${imageTop + targetTop * contain}px`;
      layer.style.width = `${targetWidth * contain}px`;
      layer.style.height = `${targetHeight * contain}px`;
      layer.src = this.cacheBustAsset(frame.src);
      layer.hidden = false;
      charElement.dataset.eyeLayerState = state;
    }
    animationFramePath(character, frame) {
      const value = frame && typeof frame === "object" ? frame.src || frame.image || frame.pose : frame;
      if (!value) return null;
      return character.poses?.[value] ? this.getCharacterPoseImage(character, value) : value;
    }
    animationDelay(value, fallback = 2400) {
      if (Array.isArray(value) && value.length) {
        const min = Math.max(0, Number(value[0]) || 0);
        const max = Math.max(min, Number(value[1]) || min);
        return min + Math.random() * (max - min);
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
    }
    // Reproduce fotogramas pertenecientes a UNA misma pose. Cuando existen
    // recortes oculares, la base permanece inmóvil y sólo cambia el parche de
    // ojos (medio/cerrado/medio); el resto conserva el fallback de sprite completo.
    startCharacterFrameAnimation(characterKey, position, pose) {
      this.stopCharacterFrameAnimation(position, false);
      const character = this.characters[characterKey];
      const config = character?.animations?.[pose] || character?.poseAnimations?.[pose];
      const layerConfig = character?.layerBlinks?.[pose];
      const reducedMotion = window.Juice && typeof window.Juice.isReduced === "function" && window.Juice.isReduced() || window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!config && !layerConfig || reducedMotion) return;
      const sourceFrames = layerConfig?.frames || (Array.isArray(config) ? config : config.frames);
      if (!Array.isArray(sourceFrames) || !sourceFrames.length) return;
      const frames = sourceFrames.map((frame) => ({
        src: this.animationFramePath(character, frame),
        duration: frame && typeof frame === "object" ? Number(frame.duration) : NaN,
        state: frame && typeof frame === "object" ? frame.state : null
      })).filter((frame) => frame.src);
      if (!frames.length) return;
      const basePoseImage = this.getCharacterPoseImage(character, pose);
      const entry = {
        character: characterKey,
        position,
        pose,
        basePoseImage,
        frames,
        layerConfig,
        timer: null,
        cancelled: false
      };
      this._characterFrameAnimations.set(position, entry);
      const stillOwnsSlot = () => {
        const element = document.getElementById(`character-${position}`);
        return element && element.classList.contains("active") && element.getAttribute("data-character") === characterKey && element.dataset.pose === String(pose).toLowerCase().replace(/[^a-z0-9_-]/g, "") && this._characterFrameAnimations.get(position) === entry;
      };
      const scheduleBurst = () => {
        if (!stillOwnsSlot()) {
          this.stopCharacterFrameAnimation(position, false);
          return;
        }
        const wait = this.animationDelay(
          config?.delayRange || config?.idleRange || config?.loopDelay || [1800, 4200],
          Number(config?.delayMs) || 2400
        );
        entry.timer = setTimeout(playFrame, wait);
      };
      let index = 0;
      const playFrame = () => {
        if (!stillOwnsSlot()) {
          this.stopCharacterFrameAnimation(position, false);
          return;
        }
        const element = document.getElementById(`character-${position}`);
        const frame = frames[index];
        if (layerConfig) this.applyCharacterEyeLayerFrame(element, layerConfig, frame);
        else this.applyCharacterAnimationFrame(element, frame.src);
        const duration = Number.isFinite(frame.duration) && frame.duration > 0 ? frame.duration : Math.max(40, Number(config?.frameMs) || 85);
        index += 1;
        if (index < frames.length) {
          entry.timer = setTimeout(playFrame, duration);
          return;
        }
        entry.timer = setTimeout(() => {
          if (!stillOwnsSlot()) return;
          if (layerConfig) this.hideCharacterEyeLayer(element);
          else this.applyCharacterAnimationFrame(element, basePoseImage);
          delete element.dataset.frameSrc;
          index = 0;
          if (config?.loop === false) {
            this._characterFrameAnimations.delete(position);
          } else {
            scheduleBurst();
          }
        }, duration);
      };
      this.preloadImages(frames.map((frame) => frame.src)).then(() => {
        if (this._characterFrameAnimations.get(position) === entry) scheduleBurst();
      });
    }
    stopCharacterFrameAnimation(position, restoreBase = true) {
      if (!position) return;
      const entry = this._characterFrameAnimations.get(position);
      if (!entry) return;
      clearTimeout(entry.timer);
      entry.cancelled = true;
      this._characterFrameAnimations.delete(position);
      const element = document.getElementById(`character-${position}`);
      if (restoreBase && element && element.classList.contains("active") && entry.basePoseImage) {
        if (entry.layerConfig) this.hideCharacterEyeLayer(element);
        else this.applyCharacterAnimationFrame(element, entry.basePoseImage);
      }
      if (entry.layerConfig && element) this.hideCharacterEyeLayer(element);
      if (element) delete element.dataset.frameSrc;
    }
    // Edu, Tony y José conservan su retrato humano en el cursor hasta
    // el instante narrativo en que el juego revela su forma transformada. Los
    // umbrales por escena/línea permiten también saltar desde el menú de escenas
    // sin depender de una variable que solo se hubiera activado al jugar antes.
    humanDialogPortrait(characterKey) {
      const portraits = {
        edu: "assets/images/characters/humans/edu_humano_sprite.webp",
        tony: "assets/images/characters/humans/tony_humano_sprite.webp",
        jose: "assets/images/characters/humans/jose_humano_sprite.webp"
      };
      return portraits[characterKey] || null;
    }
    isFurryIdentityRevealed(characterKey) {
      const revealAt = {
        edu: { chapter: 2, scene: 16, line: 4 },
        tony: { chapter: 3, scene: 13, line: 5 },
        jose: { chapter: 4, scene: 2, line: 4 }
      };
      const reveal = revealAt[characterKey];
      if (!reveal) return true;
      const chapterMatch = String(this.lastChapterName || "").match(/^chapter(\d+)/);
      const chapter = chapterMatch ? Number(chapterMatch[1]) : 0;
      if (chapter !== reveal.chapter) return chapter > reveal.chapter;
      if (this.currentScene !== reveal.scene) return this.currentScene > reveal.scene;
      return this.currentLine >= reveal.line;
    }
    async showCharacter(characterName, position = "left", pose = "neutral", flipped = false, enter = null, offsetY = null, scale = null) {
      const characterKey = this.getCharacterKey(characterName);
      let character = this.characters[characterKey];
      if (!character) {
        character = await this.loadCharacter(characterKey);
      }
      if (!character) return;
      const previousPosition = this.characterPositions[characterKey];
      if (previousPosition && previousPosition !== position) {
        this.removeCharacter(characterKey, previousPosition);
      }
      const charElement = document.getElementById(`character-${position}`);
      if (charElement) {
        this.clearCharacterAnimeFall(charElement);
        const currentOccupant = charElement.getAttribute("data-character");
        if (currentOccupant !== characterKey) {
          this.resetCharacterSlotElement(charElement, position);
        } else {
          clearTimeout(charElement._exitTimer);
          charElement._exitTimer = null;
          charElement.classList.remove("char-exit-fade");
          this.stopCharacterPoseAnimation(null, position);
          this.stopCharacterFrameAnimation(position, false);
        }
        for (const key of Object.keys(this.characterPositions)) {
          if (this.characterPositions[key] === position) {
            delete this.characterPositions[key];
          }
        }
        const poseImage = this.getCharacterPoseImage(character, pose);
        this.applyCharacterPoseImage(charElement, poseImage);
        this.applyPoseClass(charElement, pose);
        charElement.classList.remove("character-hidden");
        charElement.classList.add("active");
        charElement.setAttribute("data-character", characterKey);
        const videoPath = character.poses && character.poses[`${pose}_video`];
        this.updateCharacterVideo(charElement, videoPath);
        const characterScale = this.resolveScale(scale);
        const characterVerticalOffset = this.resolveVerticalOffset(offsetY);
        charElement.style.transform = `${flipped ? "scaleX(-1)" : "scaleX(1)"} translateY(${characterVerticalOffset}) scale(${characterScale})`;
        if (enter) {
          const cls = `char-enter-${["right", "left", "bottom", "fade"].includes(enter) ? enter : "fade"}`;
          charElement.classList.remove(
            "char-enter-right",
            "char-enter-left",
            "char-enter-bottom",
            "char-enter-fade"
          );
          void charElement.offsetWidth;
          charElement.classList.add(cls);
          clearTimeout(charElement._enterTimer);
          charElement._enterTimer = setTimeout(() => {
            charElement.classList.remove(cls);
            charElement._enterTimer = null;
          }, 550);
        }
        this.characterPositions[characterKey] = position;
        this.stageCharacters[position] = {
          character: characterKey,
          pose,
          flipped: !!flipped,
          hidden: false
        };
        this.startCharacterFrameAnimation(characterKey, position, pose);
      }
      this.layoutCharacters();
    }
    // El guión manda el encuadre de cada aparición: `offsetY` baja (o sube, en
    // negativo) al personaje esa fracción de su propia altura, para escenas donde
    // la estatura es parte de la narración (los Ketchlings miden cuarenta
    // centímetros y solo asoman la cabeza sobre el cuadro de diálogo; Tung, con
    // su 1.5 de escala, baja para no salirse por arriba). Admite "40%" o 40.
    resolveVerticalOffset(offsetY) {
      if (offsetY == null || offsetY === "") return "0%";
      return typeof offsetY === "number" ? `${offsetY}%` : String(offsetY);
    }
    // `scale` en showCharacter dibuja al personaje más grande o más pequeño sin
    // tocar su sprite (José un 18% más grande, Airi de niña un 30% más pequeña).
    resolveScale(scale) {
      const value = Number(scale);
      return Number.isFinite(value) && value > 0 ? value : 1;
    }
    // Reparte a los personajes ACTIVOS en franjas horizontales iguales.
    // IMPORTANTE: el ancho es FIJO (no depende de cuántos haya), así con 3
    // personajes NO se encogen; solo se separan. Como los sprites son verticales
    // y usan background-size: contain, a tamaño completo apenas se solapan, y el
    // foco lo da el iluminado del que habla. Posiciona con left + margin-left
    // (el transform se reserva para el flip scaleX y el escalado por personaje).
    layoutCharacters() {
      const order = ["left", "center", "right"];
      const active = [];
      order.forEach((p) => {
        const el = document.getElementById(`character-${p}`);
        if (el && el.classList.contains("active") && !el.classList.contains("character-hidden")) {
          active.push({ position: p, element: el });
        }
      });
      const N = active.length;
      if (N === 0) return;
      const W = 50;
      active.forEach(({ element }, i) => {
        const cx = (2 * i + 1) / (2 * N) * 100;
        element.style.left = `${cx}%`;
        element.style.right = "auto";
        element.style.width = `${W}%`;
        element.style.marginLeft = `${-W / 2}%`;
      });
    }
    setPose(characterName, position, pose = "neutral", options = {}) {
      const characterKey = this.getCharacterKey(characterName);
      const character = this.characters[characterKey];
      if (!character) return;
      const charElement = document.getElementById(`character-${position}`);
      if (charElement && charElement.classList.contains("active")) {
        this.stopCharacterFrameAnimation(position, false);
        const poseImage = this.getCharacterPoseImage(character, pose);
        this.applyCharacterPoseImage(charElement, poseImage);
        this.applyPoseClass(charElement, pose);
        const videoPath = character.poses && character.poses[`${pose}_video`];
        this.updateCharacterVideo(charElement, videoPath);
        const visual = this.stageCharacters[position];
        if (visual) visual.pose = pose;
        if (options.animateFrames !== false) {
          this.startCharacterFrameAnimation(characterKey, position, pose);
        }
      }
    }
    // Secuencia declarativa de poses. Permite pequeños acting loops usando los
    // sprites ya disponibles: parpadeos, respiración, nervios o sacudidas. Por
    // defecto vive hasta que el jugador avanza la línea; también admite una
    // secuencia finita con loop:false.
    startCharacterPoseAnimation(action = {}) {
      const characterName = action.character;
      const characterKey = this.getCharacterKey(characterName);
      const position = action.position || this.characterPositions[characterKey];
      const poses = (action.poses || action.frames || []).filter(Boolean);
      if (!position || !poses.length) return;
      this.stopCharacterPoseAnimation(characterKey, position);
      const reducedMotion = window.Juice && typeof window.Juice.isReduced === "function" && window.Juice.isReduced() || window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) {
        this.setPose(characterKey, position, poses[0], { animateFrames: false });
        return;
      }
      this.stopCharacterFrameAnimation(position, false);
      const frameMs = Math.max(90, Number(action.frameMs || action.duration) || 360);
      const loop = action.loop !== false;
      const pingPong = !!action.pingPong && poses.length > 2;
      const sequence = pingPong ? [...poses, ...poses.slice(1, -1).reverse()] : [...poses];
      let index = 0;
      const entry = {
        character: characterKey,
        position,
        untilAdvance: action.untilAdvance !== false,
        timer: null
      };
      const tick = () => {
        const element = document.getElementById(`character-${position}`);
        if (!element || !element.classList.contains("active")) {
          this.stopCharacterPoseAnimation(characterKey, position);
          return;
        }
        this.setPose(characterKey, position, sequence[index], { animateFrames: false });
        index += 1;
        if (index >= sequence.length) {
          if (!loop) {
            this._characterPoseAnimations.delete(position);
            return;
          }
          index = 0;
        }
        entry.timer = setTimeout(tick, frameMs);
      };
      this._characterPoseAnimations.set(position, entry);
      if (action.immediate === false) entry.timer = setTimeout(tick, frameMs);
      else tick();
    }
    stopCharacterPoseAnimation(characterName, position) {
      const key = characterName ? this.getCharacterKey(characterName) : null;
      const trackedPosition = position || key && this.characterPositions[key];
      if (!trackedPosition) return;
      const entry = this._characterPoseAnimations.get(trackedPosition);
      if (!entry) return;
      clearTimeout(entry.timer);
      this._characterPoseAnimations.delete(trackedPosition);
    }
    // Marca la pose activa en el elemento (clase "pose-<nombre>") para que el CSS
    // pueda tratar poses concretas de forma distinta. Se usa, por ejemplo, con los
    // primerísimos planos de llanto ("bua"), que en vez de centrarse se pegan a la
    // esquina inferior para que la cara encaje con el borde del escenario.
    applyPoseClass(charElement, pose) {
      const previousPose = charElement.dataset.pose;
      if (previousPose) charElement.classList.remove(`pose-${previousPose}`);
      if (pose) {
        const limpia = String(pose).toLowerCase().replace(/[^a-z0-9_-]/g, "");
        if (limpia) {
          charElement.classList.add(`pose-${limpia}`);
          charElement.dataset.pose = limpia;
        }
      } else {
        delete charElement.dataset.pose;
      }
    }
    // Glitch visual puntual para llamadas o señales comprimidas. La clase se
    // reinicia siempre para que una segunda interrupción vuelva a animarse y se
    // retira al acabar, garantizando que el sprite recupere su forma normal.
    playCharacterGlitchSound() {
      const now = Date.now();
      if (now - (this._lastCharacterGlitchSoundAt || 0) < 160) return;
      this._lastCharacterGlitchSoundAt = now;
      this.playSound("assets/audio/sfx/sfx_estatica.mp3", { volume: 0.72 });
    }
    // Reacción cómica de anime: anticipación, desplome vertical, golpe, pausa y
    // reincorporación. Se programa sin bloquear el diálogo para que el personaje
    // reaccione mientras se escribe la frase que provoca la caída.
    triggerCharacterAnimeFall(characterName, position, options = {}) {
      const characterKey = this.getCharacterKey(characterName);
      const trackedPosition = position || this.characterPositions[characterKey];
      if (!trackedPosition) return;
      const charElement = document.getElementById(`character-${trackedPosition}`);
      if (!charElement || !charElement.classList.contains("active")) return;
      this.clearCharacterAnimeFall(charElement);
      const delay = Math.max(0, Number(options.delay) || 0);
      const duration = Math.max(900, Number(options.duration) || 1800);
      const startFall = () => {
        if (!charElement.classList.contains("active") || charElement.dataset.character !== characterKey) return;
        charElement.style.setProperty("--anime-fall-duration", `${duration}ms`);
        void charElement.offsetWidth;
        charElement.classList.add("character-anime-fall");
        this.playSound(options.sound || "assets/audio/sfx/sfx_caida_anime_edu.mp3", {
          volume: options.volume !== void 0 ? options.volume : 0.82
        });
        charElement._animeFallImpactTimer = setTimeout(() => {
          if (window.Juice) window.Juice.shake(4, 170);
        }, duration * 0.37);
        charElement._animeFallEndTimer = setTimeout(() => {
          this.clearCharacterAnimeFall(charElement);
        }, duration + 80);
      };
      charElement._animeFallStartTimer = setTimeout(startFall, delay);
    }
    clearCharacterAnimeFall(charElement) {
      if (!charElement) return;
      clearTimeout(charElement._animeFallStartTimer);
      clearTimeout(charElement._animeFallImpactTimer);
      clearTimeout(charElement._animeFallEndTimer);
      charElement._animeFallStartTimer = null;
      charElement._animeFallImpactTimer = null;
      charElement._animeFallEndTimer = null;
      charElement.classList.remove("character-anime-fall");
      ["--anime-fall-duration"].forEach((property) => charElement.style.removeProperty(property));
    }
    triggerCharacterGlitch(characterName, position, duration = 1350) {
      const characterKey = this.getCharacterKey(characterName);
      const trackedPosition = position || this.characterPositions[characterKey];
      if (!trackedPosition) return;
      const charElement = document.getElementById(`character-${trackedPosition}`);
      if (!charElement || !charElement.classList.contains("active")) return;
      this.playCharacterGlitchSound();
      charElement.style.setProperty("--contact-glitch-duration", `${duration}ms`);
      charElement.classList.remove("contact-glitch");
      void charElement.offsetWidth;
      charElement.classList.add("contact-glitch");
      clearTimeout(charElement._contactGlitchTimer);
      charElement._contactGlitchTimer = setTimeout(() => {
        charElement.classList.remove("contact-glitch");
        charElement.style.removeProperty("--contact-glitch-duration");
      }, duration + 80);
    }
    // Segundo golpe de interferencia para el cierre de una llamada: afecta al
    // sprite completo sin sustituir el glitch independiente del retrato.
    triggerCharacterFullGlitch(characterName, position, duration = 1050) {
      const characterKey = this.getCharacterKey(characterName);
      const trackedPosition = position || this.characterPositions[characterKey];
      if (!trackedPosition) return;
      const charElement = document.getElementById(`character-${trackedPosition}`);
      if (!charElement || !charElement.classList.contains("active")) return;
      this.playCharacterGlitchSound();
      charElement.style.setProperty("--full-glitch-duration", `${duration}ms`);
      charElement.classList.remove("full-signal-glitch");
      void charElement.offsetWidth;
      charElement.classList.add("full-signal-glitch");
      clearTimeout(charElement._fullSignalGlitchTimer);
      charElement._fullSignalGlitchTimer = setTimeout(() => {
        charElement.classList.remove("full-signal-glitch");
        charElement.style.removeProperty("--full-glitch-duration");
      }, duration + 80);
    }
    // Interferencia persistente ligada a una sola línea de diálogo. No deforma
    // la escala del personaje: el movimiento y la separación RGB los resuelve
    // CSS mediante capas recortadas. nextLine() la retira justo al avanzar.
    startCharacterGlitchUntilAdvance(characterName, position) {
      const characterKey = this.getCharacterKey(characterName);
      const trackedPosition = position || this.characterPositions[characterKey];
      if (!trackedPosition) return;
      const charElement = document.getElementById(`character-${trackedPosition}`);
      if (!charElement || !charElement.classList.contains("active")) return;
      this.clearAdvanceBoundCharacterEffects();
      this.playCharacterGlitchSound();
      charElement.classList.add("dialogue-glitch-loop");
    }
    clearAdvanceBoundCharacterEffects() {
      document.querySelectorAll(".dialogue-glitch-loop").forEach((element) => {
        element.classList.remove("dialogue-glitch-loop");
      });
      for (const [position, entry] of this._characterPoseAnimations) {
        if (entry.untilAdvance) this.stopCharacterPoseAnimation(entry.character, position);
      }
    }
    updateCharacterVideo(charElement, videoPath) {
      let videoContainer = charElement.querySelector(".character-video-container");
      if (!videoPath) {
        if (videoContainer) videoContainer.remove();
        return;
      }
      if (!videoContainer) {
        videoContainer = document.createElement("div");
        videoContainer.className = "character-video-container";
        charElement.appendChild(videoContainer);
      }
      let video = videoContainer.querySelector("video");
      if (!video) {
        video = document.createElement("video");
        video.className = "character-video";
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.setAttribute("playsinline", "");
        videoContainer.appendChild(video);
      }
      const fullPath = this.cacheBustAsset(videoPath);
      if (video.src !== fullPath && !video.src.endsWith(videoPath)) {
        video.src = fullPath;
        video.play().catch((e) => console.warn("Error auto-playing character video:", e));
      }
    }
    // Limpieza integral de un hueco de personaje. Centralizarla evita que un
    // temporizador de salida/glitch o un vídeo de una escena anterior sobreviva
    // a Retroceder, al selector de escenas o a la reutilización del mismo hueco.
    resetCharacterSlotElement(charElement, position) {
      if (!charElement) return;
      const occupant = charElement.getAttribute("data-character");
      this.clearCharacterAnimeFall(charElement);
      this.stopCharacterPoseAnimation(null, position);
      this.stopCharacterFrameAnimation(position, false);
      if (this.stageCharacters) delete this.stageCharacters[position];
      ["_exitTimer", "_enterTimer", "_poseTransitionTimer", "_contactGlitchTimer", "_fullSignalGlitchTimer"].forEach(
        (timerKey) => {
          clearTimeout(charElement[timerKey]);
          charElement[timerKey] = null;
        }
      );
      [...charElement.classList].filter(
        (className) => className.startsWith("pose-") || className.startsWith("char-enter-") || [
          "active",
          "speaking",
          "char-exit-fade",
          "contact-glitch",
          "full-signal-glitch",
          "dialogue-glitch-loop",
          "character-hidden"
        ].includes(className)
      ).forEach((className) => charElement.classList.remove(className));
      charElement.style.backgroundImage = "";
      charElement.style.removeProperty("--contact-glitch-duration");
      charElement.style.removeProperty("--full-glitch-duration");
      charElement.removeAttribute("data-character");
      delete charElement.dataset.pose;
      delete charElement.dataset.poseSrc;
      delete charElement.dataset.frameSrc;
      delete charElement.dataset.poseTransition;
      charElement.querySelectorAll(":scope > .character-pose-ghost").forEach((ghost) => ghost.remove());
      charElement.querySelectorAll(":scope > .character-eye-layer").forEach((layer) => layer.remove());
      const videoContainer = charElement.querySelector(".character-video-container");
      if (videoContainer) {
        const video = videoContainer.querySelector("video");
        if (video) {
          video.pause();
          video.removeAttribute("src");
          video.load();
        }
        videoContainer.remove();
      }
      if (occupant && this.characterPositions?.[occupant] === position) {
        delete this.characterPositions[occupant];
      }
    }
    // Oculta solo la representación del personaje. Mantiene pose, sprite,
    // posición y ficha en memoria para que el cursor-retrato pueda reutilizar
    // exactamente la pose declarada por showCharacter. removeCharacter es la
    // operación destructiva que vacía el hueco.
    hideCharacter(characterName, position, exit = null) {
      const hideSlot = (pos) => {
        const el = document.getElementById(`character-${pos}`);
        if (!el || !el.classList.contains("active")) return;
        const doHide = () => {
          clearTimeout(el._exitTimer);
          el._exitTimer = null;
          el.classList.remove("char-exit-fade", "speaking");
          el.classList.add("character-hidden");
          this.stopCharacterPoseAnimation(null, pos);
          this.stopCharacterFrameAnimation(pos, true);
          const visual = this.stageCharacters?.[pos];
          if (visual) visual.hidden = true;
          if (this.speakingPosition === pos) {
            this.speakingCharacter = null;
            this.speakingPosition = null;
          }
          this.layoutCharacters();
        };
        clearTimeout(el._exitTimer);
        if (exit) {
          el.classList.add("char-exit-fade");
          el._exitTimer = setTimeout(doHide, 320);
        } else {
          doHide();
        }
      };
      if (characterName) {
        const key = this.getCharacterKey(characterName);
        const target = position || this.characterPositions[key];
        if (target) hideSlot(target);
      } else if (position) {
        hideSlot(position);
      }
      this.layoutCharacters();
    }
    // Quita a un personaje de la escena. Se puede indicar:
    // - characterName: quita al personaje (usando la posición rastreada en la
    //   que se mostró; si además se da position, solo quita si coincide).
    // - position (sin characterName): vacía directamente ese hueco (left/right/center).
    // Si no se indica ninguno, no hace nada.
    removeCharacter(characterName, position, exit = null, suppressLayout = false) {
      const clearSlot = (pos) => {
        const el = document.getElementById(`character-${pos}`);
        if (!el) return;
        const doClear = () => {
          this.resetCharacterSlotElement(el, pos);
        };
        clearTimeout(el._exitTimer);
        if (exit) {
          el.classList.add("char-exit-fade");
          el._exitTimer = setTimeout(doClear, 320);
        } else {
          doClear();
        }
      };
      if (characterName) {
        const key = this.getCharacterKey(characterName);
        const tracked = this.characterPositions[key];
        const target = position || tracked;
        if (target) {
          clearSlot(target);
          if (this.characterPositions[key] === target) {
            delete this.characterPositions[key];
          }
        }
      } else if (position) {
        clearSlot(position);
        for (const k of Object.keys(this.characterPositions)) {
          if (this.characterPositions[k] === position) delete this.characterPositions[k];
        }
      }
      if (!suppressLayout) {
        this.layoutCharacters();
      }
    }
    // Todo cambio real de fondo inaugura una composición nueva. Vaciar los
    // tres huecos mediante removeCharacter evita que un sprite, una animación
    // o una pose oculta sobrevivan accidentalmente desde el fondo anterior.
    removeAllCharacters() {
      ["left", "center", "right"].forEach((position) => {
        this.removeCharacter(null, position, null, true);
      });
      this.layoutCharacters();
      this.speakingCharacter = null;
      this.speakingPosition = null;
    }
    focusCharacter(characterName, position) {
      const charElement = document.getElementById(`character-${position}`);
      if (charElement && charElement.classList.contains("active") && !charElement.classList.contains("character-hidden")) {
        charElement.classList.add("speaking");
      }
    }
    unfocusCharacter(position) {
      const charElement = document.getElementById(`character-${position}`);
      if (charElement) {
        charElement.classList.remove("speaking");
      }
    }
    // Devuelve el color del personaje asegurando un mínimo de luminosidad para
    // que el nombre se lea sobre la caja oscura (aclara los colores oscuros
    // mezclándolos hacia el blanco, conservando el tono). Acepta cualquier
    // formato CSS (hex, nombre como "gray", rgb()). Sin color -> dorado.
    readableNameColor(color) {
      if (!color || typeof color !== "string") return "#ffcc00";
      const readableNamedColors = {
        blue: "#4da3ff"
      };
      const inputColor = readableNamedColors[color.trim().toLowerCase()] || color;
      if (!this._colorParser) {
        this._colorParser = document.createElement("canvas").getContext("2d");
      }
      const ctx = this._colorParser;
      ctx.fillStyle = "#000";
      ctx.fillStyle = inputColor;
      const resolved = ctx.fillStyle;
      let r, g, b;
      if (resolved[0] === "#") {
        r = parseInt(resolved.slice(1, 3), 16);
        g = parseInt(resolved.slice(3, 5), 16);
        b = parseInt(resolved.slice(5, 7), 16);
      } else {
        const m = resolved.match(/\d+/g);
        if (!m || m.length < 3) return "#ffcc00";
        r = +m[0];
        g = +m[1];
        b = +m[2];
      }
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      if (lum < 0.55) {
        const k = (0.55 - lum) / 0.55 * 0.75;
        r = Math.round(r + (255 - r) * k);
        g = Math.round(g + (255 - g) * k);
        b = Math.round(b + (255 - b) * k);
      }
      return `rgb(${r}, ${g}, ${b})`;
    }
    // Preload suave de un path de audio. Sirve para deducir decodificación y
    // URL antes del primer play; la promesa queda en caché y reutiliza esa
    // precarga para siguientes llamadas del mismo source.
    preloadAudio(path) {
      const src = this.cacheBustAsset(path);
      const cached = this.audioPreloadCache.get(src);
      if (cached) return cached;
      const audio = new Audio();
      audio.preload = "auto";
      const ready = new Promise((resolve) => {
        const done = () => {
          audio.removeEventListener("canplaythrough", done);
          audio.removeEventListener("loadeddata", done);
          audio.removeEventListener("error", fail);
          resolve();
        };
        const fail = () => {
          this.audioPreloadCache.delete(src);
          audio.removeEventListener("canplaythrough", done);
          audio.removeEventListener("loadeddata", done);
          audio.removeEventListener("error", fail);
          resolve();
        };
        audio.addEventListener("canplaythrough", done);
        audio.addEventListener("loadeddata", done);
        audio.addEventListener("error", fail);
        audio.src = src;
        if (audio.readyState >= 2) {
          done();
        }
      });
      this.audioPreloadCache.set(src, ready);
      return ready;
    }
    _audioPoolKey(soundPath) {
      const normalized = String(soundPath || "").replace(/\\/g, "/").toLowerCase();
      return `__short_by_path:${normalized}`;
    }
    _acquireShortAudioFromPool(poolKey) {
      const pool = this.audioShortPool.get(poolKey);
      if (!pool || pool.length === 0) return null;
      while (pool.length > 0) {
        const candidate = pool.pop();
        if (!candidate) continue;
        if (!candidate.paused || candidate._stopping) continue;
        return candidate;
      }
      if (pool.length === 0) this.audioShortPool.delete(poolKey);
      return null;
    }
    _releaseShortAudioToPool(audio, poolKey) {
      if (!audio || !poolKey) return;
      if (audio._fadeInterval) {
        clearInterval(audio._fadeInterval);
        audio._fadeInterval = null;
      }
      try {
        audio.pause();
      } catch (error) {
      }
      try {
        audio.currentTime = 0;
      } catch (error) {
      }
      audio.volume = 0;
      const pool = this.audioShortPool.get(poolKey) || [];
      const maxPoolSize = Number.isFinite(this.maxAudioPoolPerSource) ? Math.max(0, Math.floor(this.maxAudioPoolPerSource)) : 3;
      if (pool.length >= maxPoolSize) {
        try {
          audio.removeAttribute("src");
        } catch (error) {
        }
        try {
          audio.load();
        } catch (error) {
        }
        return;
      }
      audio._poolKey = poolKey;
      audio._pooled = true;
      pool.push(audio);
      this.audioShortPool.set(poolKey, pool);
    }
    _drainAudioShortPool() {
      for (const pool of this.audioShortPool.values()) {
        for (const audio of pool) {
          try {
            if (audio._fadeInterval) {
              clearInterval(audio._fadeInterval);
              audio._fadeInterval = null;
            }
            audio.pause();
            audio.currentTime = 0;
            audio.removeAttribute("src");
            audio.load();
          } catch (error) {
          }
        }
      }
      this.audioShortPool.clear();
    }
    _snapshotForHistory(value) {
      if (value === void 0 || value === null) return value;
      if (typeof structuredClone === "function") {
        try {
          return structuredClone(value);
        } catch (error) {
        }
      }
      try {
        return JSON.parse(JSON.stringify(value));
      } catch (error) {
        return value;
      }
    }
    // Factor de volumen del panel de Configuración (0..1, persistido).
    volFactor(kind) {
      const raw = localStorage.getItem(kind === "music" ? "illo_vol_music" : "illo_vol_sfx");
      const v = parseFloat(raw);
      return isNaN(v) ? 1 : Math.max(0, Math.min(1, v));
    }
    // Reaplicar los ajustes de volumen a todo lo que esté sonando (los fades
    // en curso se dejan terminar con su objetivo antiguo; caso raro y breve).
    applyVolumeSettings() {
      const apply = (a) => {
        if (!a || a._baseVol == null || a._fadeInterval) return;
        a.volume = Math.max(0, Math.min(1, a._baseVol * this.volFactor(a._volKind || "sfx")));
      };
      apply(this.currentMusic);
      for (const id in this.audioInstances) apply(this.audioInstances[id]);
      for (const audio of this.loopedAudioByPath.values()) apply(audio);
    }
    playSound(soundPath, options = {}) {
      const { volume = 1, loop = false, autoPlay = true, id = null, fadeIn = 0 } = options;
      const resolvedSoundPath = this.cacheBustAsset(soundPath);
      const explicitSoundId = id != null ? String(id) : null;
      const explicitSoundIdKey = explicitSoundId ? explicitSoundId.toLowerCase() : null;
      const normalizedSoundPath = String(resolvedSoundPath || "").replace(/\\/g, "/").toLowerCase();
      const soundId = explicitSoundIdKey || "";
      const isMusic = loop || normalizedSoundPath.includes("/audio/music/") || ["bg_music", "music"].includes(soundId) || soundId.startsWith("menu");
      const loopPoolKey = !explicitSoundIdKey && loop ? `__looped_by_path:${normalizedSoundPath}` : null;
      const loopPool = loopPoolKey ? this.loopedAudioByPath.get(loopPoolKey) : null;
      const shortPoolKey = !explicitSoundIdKey && !loop && !isMusic && normalizedSoundPath ? this._audioPoolKey(normalizedSoundPath) : null;
      if (explicitSoundIdKey) {
        const sonando = this.audioInstances[explicitSoundIdKey];
        if (sonando && sonando._srcPath === resolvedSoundPath && !sonando._stopping && !sonando.ended) {
          sonando._baseVol = volume;
          sonando.loop = loop;
          if (!sonando._fadeInterval) {
            const f = this.volFactor(sonando._volKind || "music");
            sonando.volume = Math.max(0, Math.min(1, volume * f));
          }
          if (autoPlay && sonando.paused) {
            sonando.play().catch(() => {
            });
          }
          return sonando;
        }
      } else if (loopPoolKey && loopPool && loopPool._srcPath === resolvedSoundPath && !loopPool._stopping && !loopPool.ended) {
        loopPool._baseVol = volume;
        if (!loopPool._fadeInterval) {
          const f = this.volFactor(loopPool._volKind || "music");
          loopPool.volume = Math.max(0, Math.min(1, volume * f));
        }
        if (autoPlay && loopPool.paused) {
          loopPool.play().catch(() => {
          });
        }
        return loopPool;
      }
      this.preloadAudio(resolvedSoundPath).catch(() => {
      });
      const pooledAudio = this._acquireShortAudioFromPool(shortPoolKey);
      const audio = pooledAudio || (shortPoolKey ? new Audio() : new Audio(resolvedSoundPath));
      if (shortPoolKey) {
        audio._pooled = true;
        audio._poolKey = shortPoolKey;
        audio._stopping = false;
        try {
          audio.src = resolvedSoundPath;
        } catch (_) {
        }
        if (audio._fadeInterval) {
          clearInterval(audio._fadeInterval);
          audio._fadeInterval = null;
        }
        audio._ended = false;
      }
      audio._srcPath = resolvedSoundPath;
      audio.preload = "auto";
      const volKind = isMusic ? "music" : "sfx";
      audio._baseVol = volume;
      audio._volKind = volKind;
      const factor = this.volFactor(volKind);
      audio.volume = Math.max(0, Math.min(1, volume * factor));
      audio.loop = loop;
      audio._poolKey = shortPoolKey || null;
      if (loop) {
        this.currentMusic = audio;
      }
      if (explicitSoundIdKey) {
        const prev = this.audioInstances[explicitSoundIdKey];
        if (prev && prev !== audio) {
          this.fadeOutAndStop(prev, 350);
        }
        this.audioInstances[explicitSoundIdKey] = audio;
      } else if (loopPoolKey) {
        if (loopPool) this.loopedAudioByPath.delete(loopPoolKey);
        this.loopedAudioByPath.set(loopPoolKey, audio);
      }
      audio.addEventListener(
        "error",
        () => {
          console.error(`No se pudo cargar el audio: ${soundPath}`, audio.error || "error desconocido");
          this.forgetAudio(audio);
          if (audio._poolKey) {
            this._releaseShortAudioToPool(audio, audio._poolKey);
          }
        },
        { once: true }
      );
      if (!loop) {
        audio.addEventListener(
          "ended",
          () => {
            if (audio._poolKey) {
              this._releaseShortAudioToPool(audio, audio._poolKey);
              return;
            }
            this.forgetAudio(audio);
          },
          { once: true }
        );
      }
      if (fadeIn > 0) {
        if (audio._fadeInterval) clearInterval(audio._fadeInterval);
        audio.volume = 0;
        const startTime = Date.now();
        const targetVolume = Math.max(0, Math.min(1, volume * factor));
        audio._fadeInterval = setInterval(() => {
          const progress = Math.min((Date.now() - startTime) / fadeIn, 1);
          audio.volume = targetVolume * progress;
          if (progress >= 1) {
            clearInterval(audio._fadeInterval);
            audio._fadeInterval = null;
          }
        }, 20);
      }
      if (autoPlay) {
        audio.play().catch((e) => console.log("Error reproduciendo sonido:", e));
      }
      return audio;
    }
    // Elimina únicamente las referencias que todavía apuntan a este elemento.
    // El audio puede continuar su fade con una referencia local, pero una nueva
    // acción con el mismo ID debe poder crear y arrancar otra pista enseguida.
    forgetAudio(audio) {
      if (!audio) return;
      if (this.currentMusic === audio) this.currentMusic = null;
      for (const [id, instance] of Object.entries(this.audioInstances || {})) {
        if (instance === audio) delete this.audioInstances[id];
      }
      for (const [path, instance] of this.loopedAudioByPath.entries()) {
        if (instance === audio) this.loopedAudioByPath.delete(path);
      }
    }
    // Desvanece el volumen a 0 en `ms` y luego pausa y rebobina. Cancela
    // cualquier fade anterior sobre el mismo audio (evita intervalos compitiendo
    // por el volumen). Con ms<=0, o si ya está pausado, para de inmediato.
    fadeOutAndStop(audio, ms = 300) {
      if (!audio) return;
      audio._stopping = true;
      this.forgetAudio(audio);
      const release = (a) => {
        try {
          a.removeAttribute("src");
          a.load();
        } catch (e) {
        }
      };
      if (audio._fadeInterval) {
        clearInterval(audio._fadeInterval);
        audio._fadeInterval = null;
      }
      if (ms <= 0 || audio.paused) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {
        }
        release(audio);
        return;
      }
      const startTime = Date.now();
      const initialVolume = audio.volume;
      audio._fadeInterval = setInterval(() => {
        const progress = Math.min((Date.now() - startTime) / ms, 1);
        audio.volume = initialVolume * (1 - progress);
        if (progress >= 1) {
          clearInterval(audio._fadeInterval);
          audio._fadeInterval = null;
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch (e) {
          }
          release(audio);
        }
      }, 20);
    }
    stopSound(audioOrId, fadeOut = 0) {
      let audio = audioOrId;
      const soundKey = typeof audioOrId === "string" ? audioOrId.toLowerCase() : null;
      if (typeof audioOrId === "string") {
        audio = soundKey ? this.audioInstances[soundKey] : null;
        if (!audio) return;
      }
      this.fadeOutAndStop(audio, fadeOut);
    }
    stopAllSounds() {
      const kill = (a) => {
        if (!a) return;
        if (a._fadeInterval) {
          clearInterval(a._fadeInterval);
          a._fadeInterval = null;
        }
        try {
          a.pause();
          a.currentTime = 0;
        } catch (e) {
        }
        try {
          a.removeAttribute("src");
          a.load();
        } catch (e) {
        }
      };
      kill(this.currentMusic);
      this.currentMusic = null;
      for (const id in this.audioInstances) kill(this.audioInstances[id]);
      this.audioInstances = {};
      for (const audio of this.loopedAudioByPath.values()) kill(audio);
      this.loopedAudioByPath.clear();
      this._drainAudioShortPool();
      if (window.Juice && Juice.stopAllSfx) Juice.stopAllSfx();
    }
    pauseSound(audioOrId) {
      let audio = audioOrId;
      const soundKey = typeof audioOrId === "string" ? audioOrId.toLowerCase() : null;
      if (typeof audioOrId === "string") {
        audio = soundKey ? this.audioInstances[soundKey] : null;
      }
      if (audio) {
        audio.pause();
      }
    }
    resumeSound(audioOrId) {
      let audio = audioOrId;
      const soundKey = typeof audioOrId === "string" ? audioOrId.toLowerCase() : null;
      if (typeof audioOrId === "string") {
        audio = soundKey ? this.audioInstances[soundKey] : null;
      }
      if (audio) {
        audio.play().catch((e) => console.log("Error reanudando sonido:", e));
      }
    }
    setVolume(audioOrId, volume) {
      let audio = audioOrId;
      const soundKey = typeof audioOrId === "string" ? audioOrId.toLowerCase() : null;
      if (typeof audioOrId === "string") {
        audio = soundKey ? this.audioInstances[soundKey] : null;
      }
      if (audio) {
        audio._baseVol = volume;
        const factor = this.volFactor(audio._volKind || "sfx");
        audio.volume = Math.max(0, Math.min(1, volume * factor));
      }
    }
    wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    waitForActionClick() {
      return new Promise((resolve) => {
        const clickHandler = () => {
          document.removeEventListener("click", clickHandler);
          resolve();
        };
        document.addEventListener("click", clickHandler);
      });
    }
    // Traduce emociones declaradas en una línea (o poses del personaje) a un
    // conjunto pequeño y estable de efectos tipográficos. Los capítulos pueden
    // usar nombres en español o inglés sin acentos ni diferencias de mayúsculas.
    normalizeDialogEmotion(value) {
      if (value === false || value == null) return null;
      const key = String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const aliases = {
        fear: "fear",
        miedo: "fear",
        scared: "fear",
        afraid: "fear",
        terrified: "fear",
        anger: "anger",
        angry: "anger",
        agresividad: "anger",
        aggressive: "anger",
        enfado: "anger",
        enfadado: "anger",
        furia: "anger",
        furious: "anger",
        sadness: "sadness",
        sad: "sadness",
        tristeza: "sadness",
        triste: "sadness",
        joy: "joy",
        alegria: "joy",
        alegre: "joy",
        felicidad: "joy",
        surprise: "surprise",
        surprised: "surprise",
        sorpresa: "surprise",
        sorprendido: "surprise",
        nervous: "nervous",
        nervousness: "nervous",
        nervios: "nervous",
        nervioso: "nervous",
        whisper: "whisper",
        susurro: "whisper",
        susurrando: "whisper",
        scream: "scream",
        grito: "scream",
        alarido: "scream",
        shout: "scream",
        estridente: "scream"
      };
      return aliases[key] || null;
    }
    resolveDialogEmotion(line, speakerName) {
      const hasExplicitEmotion = line.emotion !== void 0 || line.emocion !== void 0 || line.textEffect !== void 0;
      if (line.textAnimation === void 0 && !hasExplicitEmotion) {
        return null;
      }
      if (line.textAnimation !== void 0) {
        const animation = line.textAnimation;
        const normalized = String(animation ?? "").toLowerCase().trim();
        if (animation === false || ["none", "normal", "neutral", "ninguna"].includes(normalized)) {
          return null;
        }
        if (animation !== true && normalized !== "auto") {
          return this.normalizeDialogEmotion(animation);
        }
      }
      if (hasExplicitEmotion) {
        const value = line.emotion ?? line.emocion ?? line.textEffect;
        const normalized = String(value ?? "").toLowerCase().trim();
        if (value === false || ["none", "normal", "neutral", "ninguna"].includes(normalized)) {
          return null;
        }
        return this.normalizeDialogEmotion(value);
      }
      const position = this.characterPositions[speakerName];
      const speaker = position && document.getElementById(`character-${position}`);
      if (!speaker || !speaker.classList.contains("active")) return null;
      const pose = speaker.dataset.pose || "";
      const poseEmotions = {
        alarmed: "fear",
        worried: "fear",
        preocupado: "fear",
        scared: "fear",
        terrified: "fear",
        error: "fear",
        sospecha: "fear",
        angry: "anger",
        enfadado: "anger",
        crazy: "anger",
        picado: "anger",
        aggressive: "anger",
        furious: "anger",
        sad: "sadness",
        bua: "sadness",
        derrumbe: "sadness",
        herido: "sadness",
        crying: "sadness",
        contento: "joy",
        riendo: "joy",
        giggle: "joy",
        clapping: "joy",
        saludando: "joy",
        surprised: "surprise",
        shocked: "surprise",
        curious: "surprise",
        embarrassed: "nervous"
      };
      return poseEmotions[pose] || null;
    }
    limitRepeatedDialogEmotion(line, requestedEmotion) {
      const emotionCharacter = this.getCharacterKey(line.character);
      const emotionKey = requestedEmotion ? `${emotionCharacter}:${requestedEmotion}` : null;
      const effectiveEmotion = emotionKey === this._lastDialogEmotionKey ? null : requestedEmotion;
      this._lastDialogEmotionKey = emotionKey;
      return effectiveEmotion;
    }
    // La velocidad y la duración del typewriter se calculan en un único lugar.
    // Así la partida, la vista previa de Configuración y las herramientas de
    // autoría usan exactamente los mismos grafemas y pausas de puntuación.
    splitTextGraphemes(value = "") {
      const text = String(value || "");
      return this._textSegmenter ? Array.from(this._textSegmenter.segment(text), (part) => part.segment) : Array.from(text);
    }
    getTextSpeedMultiplier(line = {}) {
      return line.textSpeed === "slow" ? 2.2 : line.textSpeed === "fast" ? 0.45 : typeof line.textSpeed === "number" && Number.isFinite(line.textSpeed) ? Math.max(0, line.textSpeed) : 1;
    }
    getTextPunctuationPause(character) {
      if (typeof window !== "undefined" && window.Juice?.punctuationPause) {
        return window.Juice.punctuationPause(character);
      }
      if (".!?\u2026".includes(character)) return 240;
      if (",;:\u2014".includes(character)) return 90;
      return 0;
    }
    getTextCharacterDelay(character, line = {}, baseDelay = this.typingSpeed) {
      const safeBase = Math.max(0, Number(baseDelay) || 0);
      const speedMultiplier = this.getTextSpeedMultiplier(line);
      return (safeBase + this.getTextPunctuationPause(character) * (safeBase / 50)) * speedMultiplier;
    }
    getExplicitTextDuration(line = {}) {
      if (line.textDuration === void 0 || line.textDuration === null) return null;
      const duration = Number(line.textDuration);
      if (!Number.isFinite(duration) || duration < 0) {
        console.warn("textDuration debe ser un n\xFAmero de milisegundos mayor o igual que 0");
        return null;
      }
      return duration;
    }
    // Devuelve la estimación completa con el preset seleccionado actualmente.
    // `visibleDurationMs` mide hasta que aparece el último grafema y `durationMs`
    // incluye además la pausa final con la que el motor cierra una línea normal.
    // Si hay textDuration, ambos valores coinciden exactamente con ese override.
    calculateTextTiming(line = {}) {
      const graphemes = this.splitTextGraphemes(line.text || "");
      const exactDurationMs = this.getExplicitTextDuration(line);
      const speedMultiplier = this.getTextSpeedMultiplier(line);
      if (exactDurationMs !== null) {
        if (graphemes.length === 0) {
          return {
            graphemes,
            delaysAfter: [],
            initialDelayMs: exactDurationMs,
            visibleDurationMs: exactDurationMs,
            durationMs: exactDurationMs,
            exactDurationMs,
            speedMultiplier,
            typingSpeedMs: this.typingSpeed,
            isInstant: exactDurationMs === 0,
            finishOnLastCharacter: true
          };
        }
        if (graphemes.length === 1) {
          return {
            graphemes,
            delaysAfter: [0],
            initialDelayMs: exactDurationMs,
            visibleDurationMs: exactDurationMs,
            durationMs: exactDurationMs,
            exactDurationMs,
            speedMultiplier,
            typingSpeedMs: this.typingSpeed,
            isInstant: exactDurationMs === 0,
            finishOnLastCharacter: true
          };
        }
        const rhythmWeights = graphemes.slice(0, -1).map((character) => 50 + this.getTextPunctuationPause(character));
        const totalWeight = rhythmWeights.reduce((sum, weight) => sum + weight, 0);
        const scale = totalWeight > 0 ? exactDurationMs / totalWeight : 0;
        const delaysAfter2 = rhythmWeights.map((weight) => weight * scale);
        delaysAfter2.push(0);
        return {
          graphemes,
          delaysAfter: delaysAfter2,
          initialDelayMs: 0,
          visibleDurationMs: exactDurationMs,
          durationMs: exactDurationMs,
          exactDurationMs,
          speedMultiplier,
          typingSpeedMs: this.typingSpeed,
          isInstant: exactDurationMs === 0,
          finishOnLastCharacter: true
        };
      }
      const delaysAfter = graphemes.map((character) => this.getTextCharacterDelay(character, line));
      const visibleDurationMs = delaysAfter.slice(0, Math.max(0, delaysAfter.length - 1)).reduce((sum, delay) => sum + delay, 0);
      const durationMs = delaysAfter.reduce((sum, delay) => sum + delay, 0);
      return {
        graphemes,
        delaysAfter,
        initialDelayMs: 0,
        visibleDurationMs,
        durationMs,
        exactDurationMs: null,
        speedMultiplier,
        typingSpeedMs: this.typingSpeed,
        isInstant: this.typingSpeed <= 0 || speedMultiplier <= 0,
        finishOnLastCharacter: false
      };
    }
    calculateTextDuration(line = {}, untilVisible = false) {
      const timing = this.calculateTextTiming(line);
      return untilVisible ? timing.visibleDurationMs : timing.durationMs;
    }
    // Acción JSON: { "type": "setTextDuration", "value": 4000 }.
    // Se reinicia al comenzar cada línea para que nunca se filtre a la siguiente.
    setLineTextDuration(duration) {
      const parsed = Number(duration);
      this._lineTextDurationOverride = Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
      if (this._lineTextDurationOverride === null) {
        console.warn("setTextDuration requiere milisegundos mayores o iguales que 0");
      }
    }
    async displayDialog(line) {
      if (this.debugMode) {
        this.updateDebugPanel();
      }
      const characterName = document.getElementById("character-name");
      const dialogText = document.getElementById("dialog-text");
      const dialogBox = document.getElementById("dialog-box");
      const speakerCursorSlot = document.getElementById("speaker-cursor-slot");
      const speakerCursor = document.getElementById("speaker-cursor");
      const speakerCursorPortrait = document.getElementById("speaker-cursor-portrait");
      characterName.textContent = line.character || "";
      dialogText.textContent = "";
      dialogBox.classList.add("active");
      const identityName = this.getCharacterKey(line.character);
      const speakerName = this.getCharacterKey(line.speakingAs || line.character);
      const speakerPosition = this.characterPositions[speakerName];
      const speakerElement = speakerPosition ? document.getElementById(`character-${speakerPosition}`) : null;
      const identityPosition = this.characterPositions[identityName];
      const portraitElement = identityPosition ? document.getElementById(`character-${identityPosition}`) : null;
      const humanPortrait = this.humanDialogPortrait(identityName);
      const useHumanPortrait = Boolean(humanPortrait && !this.isFurryIdentityRevealed(identityName));
      const requestedDialogEmotion = this.resolveDialogEmotion(line, speakerName);
      const dialogEmotion = this.limitRepeatedDialogEmotion(line, requestedDialogEmotion);
      const emotionClasses = ["fear", "anger", "sadness", "joy", "surprise", "nervous", "whisper", "scream"].map(
        (emotion) => `dialog-emotion-${emotion}`
      );
      dialogText.classList.remove(...emotionClasses);
      if (dialogEmotion) dialogText.classList.add(`dialog-emotion-${dialogEmotion}`);
      if (speakerCursor) {
        if (speakerCursor._returnTimer) {
          clearTimeout(speakerCursor._returnTimer);
          speakerCursor._returnTimer = null;
        }
        speakerCursor.classList.remove(
          "is-typing",
          "is-waiting",
          "is-following-text",
          "is-returning",
          "has-portrait",
          "uses-human-portrait"
        );
        speakerCursor.style.removeProperty("--cursor-follow-x");
        speakerCursor.style.removeProperty("--cursor-follow-y");
        speakerCursor.dataset.character = identityName || "unknown";
        delete speakerCursor.dataset.pose;
      }
      if (speakerCursorPortrait) speakerCursorPortrait.style.backgroundImage = "";
      const applySpeakerIdentity = (data) => {
        const speakerColor = this.readableNameColor(data && data.color);
        characterName.style.color = speakerColor;
        dialogText.style.setProperty("--dialog-emotion-color", speakerColor);
        if (speakerCursor) speakerCursor.style.setProperty("--speaker-color", speakerColor);
        if (!speakerCursorPortrait) return;
        if (speakerCursor) {
          speakerCursor.dataset.pose = portraitElement?.dataset.pose || data && data.defaultPose || "neutral";
        }
        let portraitImage = useHumanPortrait ? `url('${this.cacheBustAsset(humanPortrait)}')` : portraitElement?.style.backgroundImage || "";
        if (!portraitImage || portraitImage === "none") {
          const poses = data && data.poses;
          const defaultPose = data && data.defaultPose;
          const fallbackPose = poses && (defaultPose && poses[defaultPose] && defaultPose || poses.neutral && "neutral" || Object.keys(poses)[0]);
          const portraitPath = fallbackPose ? this.getCharacterPoseImage(data, fallbackPose) : null;
          if (portraitPath) {
            portraitImage = `url('${this.cacheBustAsset(portraitPath)}')`;
          }
        }
        speakerCursorPortrait.style.backgroundImage = portraitImage;
        speakerCursor?.classList.toggle("has-portrait", !!portraitImage);
        speakerCursor?.classList.toggle("uses-human-portrait", useHumanPortrait);
      };
      const spData = this.characters[identityName];
      if (spData) {
        applySpeakerIdentity(spData);
      } else if (this._charColorMissing.has(identityName) || !/[a-z0-9]/.test(identityName)) {
        applySpeakerIdentity(null);
      } else {
        applySpeakerIdentity(null);
        const nm = line.character;
        this.loadCharacter(identityName).then((d) => {
          if (d) {
            if (characterName.textContent === nm) applySpeakerIdentity(d);
          } else {
            this._charColorMissing.add(identityName);
          }
        }).catch(() => {
          this._charColorMissing.add(identityName);
        });
      }
      ["left", "center", "right"].forEach((pos) => {
        const elem = document.getElementById(`character-${pos}`);
        if (elem) elem.classList.remove("speaking");
      });
      const charactersContainer = document.getElementById("characters-container");
      let speakerOnScreen = false;
      if (speakerPosition) {
        if (speakerElement && !speakerElement.classList.contains("character-hidden")) {
          speakerElement.classList.add("speaking");
          this.speakingCharacter = speakerName;
          this.speakingPosition = speakerPosition;
          speakerOnScreen = true;
        }
      }
      if (charactersContainer) {
        charactersContainer.classList.add("has-speaker");
      }
      if (!speakerOnScreen) {
        this.speakingCharacter = null;
        this.speakingPosition = null;
      }
      this.isWaitingForInput = false;
      const text = line.text;
      const textTiming = this.calculateTextTiming(line);
      return new Promise((resolve) => {
        let charIndex = 0;
        let timeoutId = null;
        let finished = false;
        let cursorMoveFrame = null;
        let typingPaused = this.textPaused;
        let nextCharacterAt = 0;
        let remainingDelay = textTiming.initialDelayMs;
        let exactTimelineStartedAt = null;
        let exactNextOffsetMs = 0;
        let exactPausedDurationMs = 0;
        let exactTimelinePausedAt = null;
        const printAnchor = document.createElement("span");
        printAnchor.className = "dialog-print-anchor";
        const splitText = (value) => this.splitTextGraphemes(value);
        let textOffset = 0;
        const typingUnits = textTiming.graphemes.map((value) => {
          textOffset += value.length;
          return { value, end: textOffset };
        });
        const brandRanges = [];
        const brandPattern = /\b(OMG|CLos|Incel|Simsong)\b/g;
        let brandMatch;
        while ((brandMatch = brandPattern.exec(text)) !== null) {
          brandRanges.push({
            start: brandMatch.index,
            end: brandMatch.index + brandMatch[0].length,
            className: brandMatch[0] === "OMG" ? "dialog-brand-omg" : brandMatch[0] === "CLos" ? "dialog-brand-clos" : brandMatch[0] === "Incel" ? "dialog-brand-incel" : "dialog-brand-simsong"
          });
        }
        dialogText.replaceChildren();
        let renderedLength = 0;
        let letterIndex = 0;
        const ghost = document.createElement("span");
        ghost.className = "dialog-ghost";
        ghost.setAttribute("aria-hidden", "true");
        let pendingLetters = [];
        let currentWord = null;
        const followCursorToAnchor = () => {
          if (!speakerCursor || !speakerCursorSlot || !printAnchor.isConnected) return;
          if (cursorMoveFrame) cancelAnimationFrame(cursorMoveFrame);
          cursorMoveFrame = requestAnimationFrame(() => {
            cursorMoveFrame = null;
            if (!printAnchor.isConnected || finished) return;
            const anchorRect = printAnchor.getBoundingClientRect();
            const cursorHomeRect = speakerCursorSlot.getBoundingClientRect();
            const layoutScaleX = cursorHomeRect.width / (speakerCursorSlot.offsetWidth || 58);
            const layoutScaleY = cursorHomeRect.height / (speakerCursorSlot.offsetHeight || 58);
            const targetX = anchorRect.left + 18;
            const targetY = anchorRect.top + anchorRect.height / 2;
            const homeX = cursorHomeRect.left + cursorHomeRect.width / 2;
            const homeY = cursorHomeRect.top + cursorHomeRect.height / 2;
            speakerCursor.style.setProperty(
              "--cursor-follow-x",
              `${(targetX - homeX) / (layoutScaleX || 1)}px`
            );
            speakerCursor.style.setProperty(
              "--cursor-follow-y",
              `${(targetY - homeY) / (layoutScaleY || 1)}px`
            );
            speakerCursor.classList.remove("is-returning", "is-waiting");
            speakerCursor.classList.add("is-following-text");
          });
        };
        const returnCursorHome = () => {
          if (!speakerCursor) return;
          if (cursorMoveFrame) {
            cancelAnimationFrame(cursorMoveFrame);
            cursorMoveFrame = null;
          }
          printAnchor.remove();
          speakerCursor.classList.remove("is-following-text", "is-typing", "is-waiting");
          speakerCursor.classList.add("is-returning");
          if (speakerCursor._returnTimer) clearTimeout(speakerCursor._returnTimer);
          speakerCursor._returnTimer = setTimeout(() => {
            speakerCursor._returnTimer = null;
            if (!speakerCursor.classList.contains("is-typing")) {
              speakerCursor.classList.remove("is-returning");
              speakerCursor.classList.add("is-waiting");
              speakerCursor.style.removeProperty("--cursor-follow-x");
              speakerCursor.style.removeProperty("--cursor-follow-y");
            }
          }, 280);
        };
        const createLetter = (character, index) => {
          const letter = document.createElement("span");
          letter.className = "dialog-letter";
          const waveProgress = typingUnits.length > 1 ? index / (typingUnits.length - 1) : 0;
          const letterDelay = dialogEmotion === "surprise" ? (
            // Una sola ola recorre la frase completa. El desfase
            // antiguo reiniciaba el ciclo cada 14 caracteres y
            // dividía visualmente el diálogo en bloques.
            -(waveProgress * 0.95)
          ) : -(index % 14 * 0.035);
          letter.style.setProperty("--letter-delay", `${letterDelay}s`);
          if (dialogEmotion === "scream") {
            const progress = typingUnits.length > 1 ? index / (typingUnits.length - 1) : 1;
            const fontSize = 12 + 56 * Math.pow(progress, 2.05);
            letter.style.setProperty("--scream-font-size", `${fontSize.toFixed(2)}px`);
          }
          letter.textContent = character;
          return letter;
        };
        const appendText = (parent, value) => {
          if (!dialogEmotion) {
            const last = parent.lastChild;
            if (last && last.nodeType === 3) last.textContent += value;
            else parent.append(document.createTextNode(value));
            return parent;
          }
          for (const character of splitText(value)) {
            if (/^\s+$/u.test(character)) {
              currentWord = null;
              const last = parent.lastChild;
              if (last && last.nodeType === 3) last.textContent += character;
              else parent.append(document.createTextNode(character));
            } else {
              if (!currentWord || currentWord.parentNode !== parent) {
                currentWord = document.createElement("span");
                currentWord.className = "dialog-word";
                parent.append(currentWord);
              }
              currentWord.append(createLetter(character, letterIndex));
            }
            letterIndex++;
          }
          return parent;
        };
        const clearPending = () => {
          for (const letter of pendingLetters) letter.remove();
          pendingLetters = [];
          ghost.remove();
        };
        const renderPending = (length) => {
          if (finished || length >= text.length) return;
          if (!dialogEmotion) {
            ghost.textContent = text.slice(length);
            dialogText.append(ghost);
            return;
          }
          let index = letterIndex;
          let inCurrentWord = Boolean(currentWord);
          let ghostWord = null;
          ghost.replaceChildren();
          for (const character of splitText(text.slice(length))) {
            const isSpace = /^\s+$/u.test(character);
            if (inCurrentWord && !isSpace) {
              const letter = createLetter(character, index++);
              letter.classList.add("is-pending");
              currentWord.append(letter);
              pendingLetters.push(letter);
              continue;
            }
            inCurrentWord = false;
            if (isSpace) {
              ghostWord = null;
              ghost.append(document.createTextNode(character));
            } else {
              if (!ghostWord) {
                ghostWord = document.createElement("span");
                ghostWord.className = "dialog-word";
                ghost.append(ghostWord);
              }
              ghostWord.append(createLetter(character, index));
            }
            index++;
          }
          if (ghost.hasChildNodes()) dialogText.append(ghost);
          if (pendingLetters.length) pendingLetters[0].before(printAnchor);
        };
        const appendUntil = (length) => {
          printAnchor.remove();
          clearPending();
          let cursor = renderedLength;
          let cursorParent = dialogText;
          while (cursor < length) {
            const brand = brandRanges.find((range) => cursor >= range.start && cursor < range.end);
            if (brand) {
              if (!brand.element) {
                brand.element = document.createElement("span");
                brand.element.className = brand.className;
                dialogText.append(brand.element);
              }
              const end2 = Math.min(length, brand.end);
              cursorParent = appendText(brand.element, text.slice(cursor, end2));
              cursor = end2;
              continue;
            }
            const nextBrand = brandRanges.find((range) => range.start > cursor);
            const end = Math.min(length, nextBrand ? nextBrand.start : length);
            cursorParent = appendText(dialogText, text.slice(cursor, end));
            cursor = end;
          }
          renderedLength = length;
          if (!finished && length > 0) {
            cursorParent.append(printAnchor);
          }
          renderPending(length);
          if (!finished && length > 0) {
            followCursorToAnchor();
          }
        };
        const cleanup = () => {
          if (timeoutId !== null) clearTimeout(timeoutId);
          if (cursorMoveFrame) {
            cancelAnimationFrame(cursorMoveFrame);
            cursorMoveFrame = null;
          }
          document.removeEventListener("click", skipHandler);
          if (this._finishTyping === finishTyping) {
            this._finishTyping = null;
          }
          if (this._setTypingPaused === setTypingPaused) {
            this._setTypingPaused = null;
          }
        };
        const finishTyping = () => {
          if (finished) return;
          finished = true;
          cleanup();
          appendUntil(text.length);
          returnCursorHome();
          this.isWaitingForInput = true;
          resolve();
        };
        const scheduleTypeChar = (delay = 0, resumeExistingDeadline = false) => {
          const requestedDelay = Math.max(0, Number(delay) || 0);
          if (textTiming.exactDurationMs !== null) {
            const now = performance.now();
            if (exactTimelineStartedAt === null) exactTimelineStartedAt = now;
            if (!resumeExistingDeadline) exactNextOffsetMs += requestedDelay;
            const activeElapsed = now - exactTimelineStartedAt - exactPausedDurationMs;
            remainingDelay = Math.max(0, exactNextOffsetMs - activeElapsed);
          } else {
            remainingDelay = requestedDelay;
          }
          if (typingPaused || finished) return;
          nextCharacterAt = performance.now() + remainingDelay;
          timeoutId = setTimeout(() => {
            timeoutId = null;
            remainingDelay = 0;
            typeChar();
          }, remainingDelay);
        };
        const setTypingPaused = (paused) => {
          const next = !!paused;
          if (next === typingPaused || finished) return;
          typingPaused = next;
          if (typingPaused) {
            if (textTiming.exactDurationMs !== null && exactTimelineStartedAt !== null) {
              exactTimelinePausedAt = performance.now();
            }
            if (timeoutId !== null) {
              clearTimeout(timeoutId);
              timeoutId = null;
              remainingDelay = Math.max(0, nextCharacterAt - performance.now());
            }
            return;
          }
          if (exactTimelinePausedAt !== null) {
            exactPausedDurationMs += performance.now() - exactTimelinePausedAt;
            exactTimelinePausedAt = null;
          }
          scheduleTypeChar(remainingDelay, exactTimelineStartedAt !== null);
        };
        const typeChar = () => {
          if (typingPaused) return;
          if (this.fastForward || textTiming.exactDurationMs === null && (this.typingSpeed <= 0 || this.getTextSpeedMultiplier(line) <= 0)) {
            finishTyping();
            return;
          }
          if (textTiming.exactDurationMs !== null && exactTimelineStartedAt === null) {
            exactTimelineStartedAt = performance.now();
          }
          if (charIndex < typingUnits.length) {
            const unitIndex = charIndex;
            const unit = typingUnits[unitIndex];
            const ch = unit.value;
            charIndex++;
            appendUntil(unit.end);
            if (window.Juice) {
              if (localStorage.getItem("illo_text_blip") !== "0") {
                window.Juice.blip(ch, speakerName);
              }
            }
            if (charIndex >= typingUnits.length && textTiming.finishOnLastCharacter) {
              finishTyping();
              return;
            }
            const delay = textTiming.exactDurationMs !== null ? textTiming.delaysAfter[unitIndex] || 0 : this.getTextCharacterDelay(ch, line);
            scheduleTypeChar(delay);
          } else {
            finishTyping();
          }
        };
        const skipHandler = (event) => {
          if (event && event.button !== 0) return;
          finishTyping();
        };
        document.addEventListener("click", skipHandler);
        this._finishTyping = finishTyping;
        this._setTypingPaused = setTypingPaused;
        speakerCursor?.classList.add("is-typing");
        if (this.fastForward || textTiming.isInstant) {
          finishTyping();
        } else if (!typingPaused) {
          if (textTiming.initialDelayMs > 0) {
            scheduleTypeChar(textTiming.initialDelayMs);
          } else {
            typeChar();
          }
        }
      });
    }
    // Registrar que se ha completado una llamada según el título de la escena
    registerCall(scene) {
      if (!scene || !scene.title) return;
      const title = scene.title;
      if (title.includes("Llamada a Edu") && !this.completedCalls.includes("edu")) {
        this.completedCalls.push("edu");
      } else if (title.includes("Llamada a Tony") && !this.completedCalls.includes("tony")) {
        this.completedCalls.push("tony");
      } else if (title.includes("Llamada a Jos\xE9") && !this.completedCalls.includes("jose")) {
        this.completedCalls.push("jose");
      }
    }
    // Devuelve true si la escena de destino de una llamada ya fue completada
    isCallChoiceCompleted(choice) {
      if (!choice.nextScene || typeof choice.nextScene !== "string") return false;
      const target = choice.nextScene;
      if (target.includes("Llamada a Edu")) return this.completedCalls.includes("edu");
      if (target.includes("Llamada a Tony")) return this.completedCalls.includes("tony");
      if (target.includes("Llamada a Jos\xE9")) return this.completedCalls.includes("jose");
      return false;
    }
    // Indica si una opción es una llamada a un amigo (destino de escena de llamada)
    isCallChoice(choice) {
      if (!choice || !choice.nextScene || typeof choice.nextScene !== "string") return false;
      return choice.nextScene.includes("Llamada a");
    }
    // Regla del teléfono: Samu solo puede completar una llamada "real" por cada
    // amigo rescatado (más la primera del principio). Es decir, tras llamar a
    // uno, el resto queda "fuera de cobertura" hasta que rescate a alguien.
    // Así, tanto en el Capítulo 1 como al final de cada Capítulo 2, solo puede
    // llamar a UN amigo antes de tener que ponerse en marcha.
    canMakeRealCall() {
      return this.completedCalls.length < this.rescued.length + 1;
    }
    async displayChoices(choices) {
      const choicesContainer = document.getElementById("choices-container");
      choicesContainer.innerHTML = "";
      choicesContainer.classList.add("active");
      const availableChoices = choices.filter((choice) => {
        if (this.isCallChoiceCompleted(choice)) return false;
        if (choice.requireAllCalls && this.completedCalls.length < 3) return false;
        if (choice.rescueTarget && this.rescued.includes(choice.rescueTarget)) return false;
        if (choice.requireAllRescued && this.rescued.length < 3) return false;
        return true;
      });
      return new Promise((resolve) => {
        this._abortarEleccion = () => {
          this._abortarEleccion = null;
          choicesContainer.classList.remove("active");
          choicesContainer.innerHTML = "";
          resolve(null);
        };
        availableChoices.forEach((choice, index) => {
          const button = document.createElement("button");
          button.className = "choice-btn";
          button.innerHTML = `
                    <span>${choice.text}</span>
                `;
          button.style.animationDelay = `${index * 0.1}s`;
          button.onclick = () => {
            this._abortarEleccion = null;
            choicesContainer.classList.remove("active");
            choicesContainer.innerHTML = "";
            resolve(choice);
          };
          choicesContainer.appendChild(button);
        });
      });
    }
    // ¿Hay una elección esperando respuesta? La usa el menú de escenas para
    // saber si tiene que abortarla antes de saltar.
    hayEleccionAbierta() {
      return typeof this._abortarEleccion === "function";
    }
    abortarEleccion() {
      if (this._abortarEleccion) this._abortarEleccion();
    }
    // ¿Cumple la línea su condición "showIf"? Soporta:
    // { result: "clean" | "close" } (resultado del último minijuego),
    // { hasItem: "x" } y { delayAtLeast: n }.
    lineConditionMet(cond) {
      if (!cond) return true;
      if (cond.result) {
        const r = this.lastMinigameResult;
        if (!r) return false;
        const hits = r.hits != null ? r.hits : 0;
        const maxHits = r.maxHits != null ? r.maxHits : 3;
        const acc = r.accuracy != null ? r.accuracy : null;
        const clean = acc != null ? acc >= 0.9 : hits === 0;
        const close = acc != null ? false : hits >= maxHits - 1;
        if (cond.result === "clean" && !clean) return false;
        if (cond.result === "close" && !(close && !clean)) return false;
        if (cond.result === "normal" && (clean || hits >= maxHits - 1)) return false;
      }
      if (cond.hasItem && !(this.inventory || []).includes(cond.hasItem)) return false;
      if (typeof cond.delayAtLeast === "number" && this.storyDelay < cond.delayAtLeast) return false;
      return true;
    }
    async nextLine() {
      this.clearAdvanceBoundCharacterEffects();
      const scene = this.getCurrentScene();
      if (!scene || !scene.lines) return false;
      this.recordSceneEntry();
      let line = this.getCurrentLine();
      if (!line) return false;
      while (line && line.showIf && !this.lineConditionMet(line.showIf)) {
        this.currentLine++;
        line = this.getCurrentLine();
      }
      if (!line) return false;
      void this.prefetchLineAssets(this.currentChapter, this.currentScene, this.currentLine);
      this._lineTextDurationOverride = null;
      this.isWaitingForInput = false;
      this.pendingSceneJump = false;
      let jumpedDuringActions = false;
      if (line.actions) {
        for (let action of line.actions) {
          await this.executeAction(action);
          if (this.pendingSceneJump) {
            this.pendingSceneJump = false;
            jumpedDuringActions = true;
            break;
          }
        }
      }
      if (line.text) {
        this.sceneAdvances++;
        const resolvedLine = this.resolveConsequenceLine(line);
        const durationOverride = resolvedLine.textDuration != null ? resolvedLine.textDuration : this._lineTextDurationOverride;
        await this.displayDialog(
          durationOverride == null ? resolvedLine : Object.assign({}, resolvedLine, { textDuration: durationOverride })
        );
      }
      if (jumpedDuringActions) {
        void this.prefetchNextLineAssets();
        return true;
      }
      if (line.afterActions) {
        for (let action of line.afterActions) {
          await this.executeAction(action);
          if (this.pendingSceneJump) {
            this.pendingSceneJump = false;
            void this.prefetchNextLineAssets();
            return true;
          }
        }
      }
      if (line.choices) {
        const selectedChoice = await this.displayChoices(line.choices);
        if (!selectedChoice) return true;
        this.history.push({
          scene: this.currentScene,
          line: this.currentLine,
          choice: selectedChoice.text
        });
        if (selectedChoice.nextChapter !== void 0) {
          this.nextChapter = selectedChoice.nextChapter;
        }
        if (selectedChoice.chapter3ByFirst && this.rescued.length > 0) {
          this.nextChapter = `chapter3-${this.rescued[0]}`;
        }
        if (selectedChoice.chapter2ByFirstCalled && this.completedCalls.length > 0) {
          this.nextChapter = `chapter2-${this.completedCalls[0]}`;
        }
        if (selectedChoice.chapter2ByLastCalled && this.completedCalls.length > 0) {
          this.nextChapter = `chapter2-${this.completedCalls[this.completedCalls.length - 1]}`;
        }
        if (selectedChoice.nextScene !== void 0) {
          let targetTitle = selectedChoice.nextScene;
          if (this.isCallChoice(selectedChoice) && !this.canMakeRealCall()) {
            targetTitle = selectedChoice.offCoverageScene || "Escena: Fuera de cobertura";
          }
          if (typeof targetTitle === "string") {
            const sceneIndex = this.currentChapter.scenes.findIndex((scene2) => scene2.title === targetTitle);
            this.currentScene = sceneIndex !== -1 ? sceneIndex : 0;
          } else {
            this.currentScene = targetTitle;
          }
          this.currentLine = 0;
          this.sceneEndedByChoice = true;
          this.registerCall(this.getCurrentScene());
          this.recordSceneEntry();
          this.prefetchLineAssets(this.currentChapter, this.currentScene, this.currentLine);
          void this.prefetchNextLineAssets();
          return true;
        } else if (selectedChoice.nextLine !== void 0) {
          this.currentLine = selectedChoice.nextLine;
        } else {
          this.currentLine++;
        }
      } else {
        this.currentLine++;
      }
      void this.prefetchNextLineAssets();
      if (this.currentLine >= scene.lines.length) {
        if (this.sceneEndedByChoice) {
          this.sceneEndedByChoice = false;
          return false;
        }
        this.currentScene++;
        this.currentLine = 0;
        if (this.currentScene >= this.currentChapter.scenes.length) {
          return false;
        }
        this.recordSceneEntry();
      }
      return true;
    }
    hideDialog() {
      const dialogBox = document.getElementById("dialog-box");
      const characterName = document.getElementById("character-name");
      const dialogText = document.getElementById("dialog-text");
      const speakerCursor = document.getElementById("speaker-cursor");
      dialogBox.classList.remove("active");
      if (characterName) characterName.textContent = "";
      if (dialogText) dialogText.textContent = "";
      if (speakerCursor) {
        if (speakerCursor._returnTimer) {
          clearTimeout(speakerCursor._returnTimer);
          speakerCursor._returnTimer = null;
        }
        speakerCursor.classList.remove("is-typing", "is-waiting", "is-following-text", "is-returning");
        speakerCursor.style.removeProperty("--cursor-follow-x");
        speakerCursor.style.removeProperty("--cursor-follow-y");
      }
      this.isWaitingForInput = false;
    }
    // ============================================================
    // RETROCEDER (pedido en la demo del 25-jul-2026)
    // ------------------------------------------------------------
    // La escena es la unidad narrativa, así que siempre se retrocede al PRINCIPIO
    // de una escena y se la deja volver a ejecutarse entera: sus acciones vuelven
    // a poner el fondo, los personajes, la música y los efectos. Por eso hay que
    // limpiar antes el escenario (si no, se quedan encima los restos de la escena
    // de la que venimos) y devolver el progreso al estado que tenía al entrar en
    // aquella escena (si no, cosas como "rescatado" o el inventario se contarían
    // dos veces al repetirla).
    //
    // A QUÉ ESCENA SE VUELVE (dos casos, pedido el 3-ago-2026):
    //   - Si ya se ha avanzado algún diálogo dentro de la escena actual, se
    //     vuelve al principio de ESTA escena. Es lo que espera quien se ha
    //     pasado de clic: repetir lo que se acaba de leer, no salir de la escena.
    //   - Si estamos recién entrados (en su primer diálogo), se sale a la escena
    //     ANTERIOR, la que dejamos justo antes de esta.
    //
    // El "de dónde vengo" es la pila `sceneHistory`: cada vez que se pisa una
    // escena nueva se apila su índice junto a la foto del progreso. Retroceder
    // desapila la escena actual y se queda en la de debajo, que SIGUE en la pila
    // con su foto original; así el siguiente retroceso baja otro escalón en vez
    // de caer siempre a la primera escena del capítulo.
    //
    // La escena se apila EN EL MISMO MOMENTO en que se cambia de escena (elección,
    // goToScene o final de escena), no cuando se pinta su primera línea. Entre las
    // dos cosas hay una espera: al elegir una opción o al leer la última línea de
    // una escena, `currentScene` ya apunta a la escena nueva pero el bucle sigue
    // parado esperando el clic del jugador. Si en ese hueco se apilaba tarde, el
    // historial acababa en la escena ANTERIOR y retroceder se volvía loco: creía
    // estar "avanzado" en la escena nueva (los diálogos contados eran los de la
    // vieja) y reiniciaba una escena que aún no se había visto, o desapilaba la
    // entrada equivocada y caía en la primera escena del capítulo.
    // ============================================================
    // Foto del progreso al entrar en una escena. Se llama desde nextLine().
    captureSceneStageState() {
      const audio = [];
      const seen = /* @__PURE__ */ new Set();
      const addAudio = (id, instance) => {
        if (!instance || !instance._srcPath || instance._stopping || instance.ended) return;
        if (seen.has(instance)) return;
        seen.add(instance);
        audio.push({
          id,
          path: instance._srcPath,
          volume: instance._baseVol != null ? instance._baseVol : 1,
          loop: !!instance.loop
        });
      };
      Object.entries(this.audioInstances || {}).forEach(([id, instance]) => addAudio(id, instance));
      for (const instance of this.loopedAudioByPath.values()) {
        addAudio(null, instance);
      }
      const characters = {};
      for (const [position, visual] of Object.entries(this.stageCharacters || {})) {
        if (!visual || !visual.character) continue;
        characters[position] = {
          character: visual.character,
          pose: visual.pose || "neutral",
          flipped: !!visual.flipped,
          hidden: !!visual.hidden
        };
      }
      return {
        background: this.currentBackgroundPath,
        characters,
        audio,
        juice: window.Juice && typeof window.Juice.snapshot === "function" ? window.Juice.snapshot() : null
      };
    }
    restoreSceneStageState(snapshot) {
      if (!snapshot) return;
      if (snapshot.background) this.setBackground(snapshot.background, { cut: true });
      for (const [position, visual] of Object.entries(snapshot.characters || {})) {
        if (!visual || !visual.character) continue;
        const restoredCharacter = this.showCharacter(
          visual.character,
          position,
          visual.pose || "neutral",
          !!visual.flipped
        );
        if (visual.hidden) {
          Promise.resolve(restoredCharacter).then(() => {
            this.hideCharacter(visual.character, position);
          });
        }
      }
      for (const sound of snapshot.audio || []) {
        this.playSound(sound.path, {
          id: sound.id,
          volume: sound.volume,
          loop: sound.loop,
          fadeIn: 180
        });
      }
      if (snapshot.juice && window.Juice && typeof window.Juice.restore === "function") {
        window.Juice.restore(snapshot.juice);
      }
    }
    recordSceneEntry() {
      if (!this.currentChapter) return;
      if (this._lastSeenScene === this.currentScene) return;
      this._lastSeenScene = this.currentScene;
      this.sceneAdvances = 0;
      this.sceneHistory = this.sceneHistory || [];
      this.sceneHistory.push({
        chapter: this.lastChapterName,
        scene: this.currentScene,
        gameState: this._snapshotForHistory(this.gameState || {}),
        rescued: [...this.rescued],
        completedCalls: [...this.completedCalls],
        inventory: [...this.inventory],
        storyDelay: this.storyDelay,
        storyPressure: this.storyPressure,
        stage: this.captureSceneStageState(),
        nextChapter: this.nextChapter
      });
      if (this.sceneHistory.length > 60) this.sceneHistory.shift();
    }
    // ¿Hay algo a lo que volver? (el botón se oculta si no). Hay dos motivos:
    // queda alguna escena por debajo en la pila, o se ha avanzado dentro de la
    // escena actual y se puede volver a su principio (esto último vale también
    // en la primera escena del capítulo, donde antes el botón no aparecía).
    canRewind() {
      if (!this.currentChapter) return false;
      const hist = this.sceneHistory || [];
      return hist.length > 1 || hist.length === 1 && this.sceneAdvances > 1;
    }
    // Deja el escenario en blanco sin tocar el progreso de la partida.
    // Las cinemáticas preservan el audio para que playVideo gestione su fundido.
    clearStage(options = {}) {
      const preserveAudio = options.preserveAudio === true;
      const immediate = options.immediate === true;
      if (!preserveAudio) this.stopAllSounds();
      this.hideDialog();
      this.clearAdvanceBoundCharacterEffects();
      ["character-left", "character-right", "character-center"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          this.clearCharacterAnimeFall(el);
          clearTimeout(el._contactGlitchTimer);
          clearTimeout(el._fullSignalGlitchTimer);
          el._contactGlitchTimer = null;
          el._fullSignalGlitchTimer = null;
          el.classList.remove(
            "active",
            "speaking",
            "character-hidden",
            "char-exit-fade",
            "contact-glitch",
            "full-signal-glitch"
          );
          el.style.removeProperty("--contact-glitch-duration");
          el.style.removeProperty("--full-glitch-duration");
          el.style.backgroundImage = "";
          const videoContainer = el.querySelector(".character-video-container");
          if (videoContainer) {
            videoContainer.querySelectorAll("video").forEach((video) => {
              try {
                video.pause();
              } catch (e) {
              }
            });
            videoContainer.remove();
          }
        }
      });
      for (const [position, entry] of this._characterPoseAnimations) {
        clearTimeout(entry.timer);
        this._characterPoseAnimations.delete(position);
      }
      for (const position of [...this._characterFrameAnimations.keys()]) {
        this.stopCharacterFrameAnimation(position, false);
      }
      const cont = document.getElementById("characters-container");
      if (cont) cont.classList.remove("has-speaker");
      this.characterPositions = {};
      this.stageCharacters = {};
      this.speakingCharacter = null;
      this.speakingPosition = null;
      if (window.Juice) window.Juice.reset();
      this.hideCG?.(immediate ? 0 : void 0);
      if (immediate) {
        const cg = document.getElementById("cg-layer");
        if (cg) {
          cg.style.transition = "none";
          cg.style.opacity = "0";
          cg.classList.remove("cg-visible");
          cg.style.backgroundImage = "";
          cg.style.backgroundSize = "";
          cg.style.backgroundPosition = "";
          cg.style.boxShadow = "";
        }
      }
      const bg = this._getBackgroundElement();
      if (bg) bg.style.backgroundImage = "";
      this.currentBackgroundPath = null;
      clearTimeout(this._bgSwapTimer);
      this._bgSwapTimer = null;
      const bgB = document.getElementById("background-b");
      if (bgB) {
        bgB.style.transition = "none";
        bgB.style.opacity = "0";
        bgB.style.backgroundImage = "";
      }
      const fader = document.getElementById("scene-fader");
      if (fader) {
        fader.style.transition = "none";
        fader.style.opacity = "0";
        fader.style.pointerEvents = "none";
      }
      const choices = document.getElementById("choices-container");
      if (choices) {
        choices.classList.remove("active");
        choices.innerHTML = "";
      }
    }
    // Devuelve el progreso a la foto guardada al entrar en una escena.
    restoreSceneSnapshot(foto) {
      if (!foto) return;
      this.gameState = this._snapshotForHistory(foto.gameState || {});
      this.rescued = [...foto.rescued];
      this.completedCalls = [...foto.completedCalls];
      this.inventory = [...foto.inventory];
      this.storyDelay = foto.storyDelay;
      this.storyPressure = foto.storyPressure != null ? foto.storyPressure : foto.storyDelay;
      this.nextChapter = foto.nextChapter;
    }
    // Deja el motor listo para reproducir una escena desde su primera línea.
    // La escena ya está en `sceneHistory` con su foto de progreso, así que se
    // marca como vista para que recordSceneEntry no vuelva a apilarla.
    replayScene(indiceEscena) {
      this.clearStage();
      this.currentScene = indiceEscena;
      this.currentLine = 0;
      this.sceneAdvances = 0;
      this.sceneEndedByChoice = false;
      this.pendingSceneJump = false;
      this._lastSeenScene = indiceEscena;
      this.updateDebugPanel();
    }
    // Retrocede al principio de la escena actual o de la anterior, según se haya
    // avanzado ya por esta escena o no (ver el bloque de arriba).
    rewindToPreviousScene() {
      if (!this.canRewind()) return false;
      const hist = this.sceneHistory;
      const actual = hist[hist.length - 1];
      const esLaActual = !!actual && actual.scene === this.currentScene;
      if (esLaActual && this.sceneAdvances > 1) {
        this.restoreSceneSnapshot(actual);
        this.replayScene(this.currentScene);
        return true;
      }
      if (esLaActual) hist.pop();
      const destino = hist[hist.length - 1];
      if (!destino) {
        if (esLaActual) hist.push(actual);
        return false;
      }
      this.restoreSceneSnapshot(destino);
      this.replayScene(destino.scene);
      return true;
    }
    // Escenas del capítulo actual, para pintar el menú de selección.
    sceneList() {
      if (!this.currentChapter) return [];
      const hist = this.sceneHistory || [];
      return (this.currentChapter.scenes || []).map((s, i) => ({
        index: i,
        title: s.title || `Escena ${i + 1}`,
        actual: i === this.currentScene,
        visitada: hist.some((h) => h.scene === i)
      }));
    }
    chapterTitle() {
      return this.currentChapter && this.currentChapter.title || this.lastChapterName || "";
    }
    // Salta directo al principio de cualquier escena del capítulo (menú de
    // escenas pedido por José). Si ya habíamos pasado por ella se recupera la
    // foto de progreso de aquel momento, igual que al retroceder; si es una a
    // la que todavía no habíamos llegado se conserva el progreso actual y solo
    // cambiamos de sitio. El repintado lo hacen las propias acciones de la
    // escena: por eso TODAS declaran su fondo y su música en la primera línea.
    // OJO CON EL NOMBRE: `jumpToScene` YA EXISTE arriba en esta misma clase
    // (es el que atiende la acción `goToScene` de los capítulos). Llamando
    // igual a los dos, el segundo pisaba al primero y TODAS las transiciones
    // entre escenas del juego acababan aquí: limpiaban el escenario, no
    // marcaban `pendingSceneJump` y se saltaban la línea 0 de la escena
    // destino, que es justo la que pone el fondo. De ahí las pantallas negras.
    saltarAEscena(destino) {
      if (!this.currentChapter) return false;
      const escenas = this.currentChapter.scenes || [];
      const i = typeof destino === "string" ? escenas.findIndex((s) => s.title === destino) : destino;
      if (!(i >= 0 && i < escenas.length)) {
        console.warn("saltarAEscena: escena no encontrada:", destino);
        return false;
      }
      const hist = this.sceneHistory || [];
      let visitada = false;
      let restoredStage = null;
      for (let k = hist.length - 1; k >= 0; k--) {
        if (hist[k].scene !== i) continue;
        const d = hist[k];
        this.restoreSceneSnapshot(d);
        restoredStage = d.stage || null;
        this.sceneHistory = hist.slice(0, k + 1);
        visitada = true;
        break;
      }
      this.clearStage();
      this.restoreSceneStageState(restoredStage);
      this.currentScene = i;
      this.currentLine = 0;
      this.sceneAdvances = 0;
      this.sceneEndedByChoice = false;
      this.pendingSceneJump = false;
      this._lastSeenScene = visitada ? i : null;
      this.updateDebugPanel();
      return true;
    }
    reset() {
      this.limpiarMinijuegosActivos();
      this.currentScene = 0;
      this.currentLine = 0;
      this.gameState = {};
      this.history = [];
      this.sceneHistory = [];
      this._lastSeenScene = null;
      this.sceneAdvances = 0;
      this.lastChapterName = null;
      this.speakingCharacter = null;
      this.speakingPosition = null;
      this.characterPositions = {};
      this.stageCharacters = {};
      this.currentBackgroundPath = null;
      this.sceneEndedByChoice = false;
      this.pendingSceneJump = false;
      this.stopAllSounds();
      this.hideDialog();
      const leftChar = document.getElementById("character-left");
      const rightChar = document.getElementById("character-right");
      const centerChar = document.getElementById("character-center");
      for (const [position, entry] of this._characterPoseAnimations) {
        clearTimeout(entry.timer);
        this._characterPoseAnimations.delete(position);
      }
      for (const position of [...this._characterFrameAnimations.keys()]) {
        this.stopCharacterFrameAnimation(position, false);
      }
      if (leftChar) this.resetCharacterSlotElement(leftChar, "left");
      if (rightChar) this.resetCharacterSlotElement(rightChar, "right");
      if (centerChar) this.resetCharacterSlotElement(centerChar, "center");
      const charactersContainer = document.getElementById("characters-container");
      if (charactersContainer) charactersContainer.classList.remove("has-speaker");
      if (window.Juice) window.Juice.reset();
      const bg = this._getBackgroundElement();
      if (bg) bg.style.backgroundImage = "";
      if (this._bgSwapTimer) {
        clearTimeout(this._bgSwapTimer);
        this._bgSwapTimer = null;
      }
      const secondaryBg = document.getElementById("background-b");
      if (secondaryBg) {
        secondaryBg.style.transition = "none";
        secondaryBg.style.opacity = "0";
        secondaryBg.style.backgroundImage = "";
      }
      const cgLayer = document.getElementById("cg-layer");
      if (cgLayer) {
        cgLayer.style.transition = "none";
        cgLayer.style.opacity = "0";
        cgLayer.style.backgroundImage = "";
        cgLayer.style.boxShadow = "";
        cgLayer.classList.remove("cg-visible");
      }
      const sceneFader = document.getElementById("scene-fader");
      if (sceneFader) {
        sceneFader.style.transition = "none";
        sceneFader.style.opacity = "0";
      }
      const choicesContainer = document.getElementById("choices-container");
      if (choicesContainer) {
        choicesContainer.classList.remove("active");
        choicesContainer.innerHTML = "";
      }
    }
    updateDebugPanel() {
      const panel = document.getElementById("debug-panel");
      if (!panel) return;
      const chapterSpan = document.getElementById("debug-chapter");
      const sceneSpan = document.getElementById("debug-scene");
      const lineSpan = document.getElementById("debug-line");
      if (this.currentChapter) {
        const sceneName = this.currentChapter.scenes[this.currentScene]?.title || "-";
        const totalLines = this.currentChapter.scenes[this.currentScene]?.lines.length || 0;
        if (chapterSpan) chapterSpan.textContent = this.lastChapterName || "-";
        if (sceneSpan) sceneSpan.textContent = sceneName;
        if (lineSpan) lineSpan.textContent = `${this.currentLine} / ${totalLines}`;
      }
    }
    goToLine(lineNumber) {
      if (!this.currentChapter) return false;
      const scene = this.currentChapter.scenes[this.currentScene];
      if (!scene || lineNumber < 0 || lineNumber >= scene.lines.length) return false;
      this.currentLine = lineNumber;
      this.updateDebugPanel();
      return true;
    }
    async playChapterIntro(chapter) {
      const gameContainer = document.getElementById("game-container");
      const chapterTitle = chapter.title || "Cap\xEDtulo Sin T\xEDtulo";
      const chapterOverlay = document.createElement("div");
      chapterOverlay.className = "chapter-intro-overlay";
      chapterOverlay.innerHTML = `
            <div class="chapter-intro-content">
                <div class="chapter-intro-line chapter-intro-line-top"></div>
                <div class="chapter-intro-text">
                    <h2 class="chapter-intro-title">${chapterTitle}</h2>
                </div>
                <div class="chapter-intro-line chapter-intro-line-bottom"></div>
            </div>
        `;
      gameContainer.appendChild(chapterOverlay);
      return new Promise((resolve) => {
        setTimeout(() => {
          chapterOverlay.classList.add("fade-out");
          setTimeout(() => {
            chapterOverlay.remove();
            resolve();
          }, 500);
        }, 2e3);
      });
    }
    async showChapterEnd(chapterTitle) {
      const gameContainer = document.getElementById("game-container");
      const endOverlay = document.createElement("div");
      endOverlay.className = "chapter-end-overlay";
      endOverlay.innerHTML = `
            <div class="chapter-end-content">
                <div class="chapter-end-line chapter-end-line-top"></div>
                <div class="chapter-end-text">
                    <h2 class="chapter-end-title">Fin del Cap\xEDtulo</h2>
                    <p class="chapter-end-subtitle">${chapterTitle}</p>
                </div>
                <div class="chapter-end-line chapter-end-line-bottom"></div>
                <button class="chapter-end-btn" id="continue-btn">Continuar</button>
            </div>
        `;
      gameContainer.appendChild(endOverlay);
      return new Promise((resolve) => {
        const continueBtn = document.getElementById("continue-btn");
        continueBtn.addEventListener("click", () => {
          continueBtn.disabled = true;
          endOverlay.classList.add("is-transition-curtain");
          endOverlay.replaceChildren();
          resolve(endOverlay);
        });
      });
    }
  };

  // minigames/MinigameBase.js
  var MinigameBase = class _MinigameBase {
    static activeInstances = /* @__PURE__ */ new Set();
    constructor(options = {}) {
      this.options = options;
      this.state = "idle";
      this.cleanups = /* @__PURE__ */ new Set();
      this.pausedAt = 0;
    }
    start() {
      throw new Error(`${this.constructor.name}.start() debe implementarse`);
    }
    play() {
      return this.start();
    }
    listen(target, type, listener, options) {
      target.addEventListener(type, listener, options);
      return this.own(() => target.removeEventListener(type, listener, options));
    }
    own(cleanup) {
      if (typeof cleanup === "function") this.cleanups.add(cleanup);
      return cleanup;
    }
    ownElement(element) {
      this.own(() => element.remove());
      return element;
    }
    attachOverlay(element) {
      this.overlay = element;
      _MinigameBase.activeInstances.add(this);
      if (typeof MutationObserver === "function") {
        const observer = new MutationObserver(() => {
          if (!element.isConnected) this.cleanup();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        this.own(() => observer.disconnect());
      }
      return element;
    }
    timeout(callback, delay = 0, ...args) {
      let timer = null;
      const cancel = () => clearTimeout(timer);
      timer = setTimeout(() => {
        this.cleanups.delete(cancel);
        if (this.state !== "cleaned") callback(...args);
      }, delay);
      this.own(cancel);
      return timer;
    }
    animationFrame(callback) {
      let frame = null;
      const cancel = () => cancelAnimationFrame(frame);
      frame = requestAnimationFrame((time) => {
        this.cleanups.delete(cancel);
        if (this.state !== "cleaned") callback(time);
      });
      this.own(cancel);
      return frame;
    }
    pause() {
      if (this.state !== "running") return;
      this.state = "paused";
      this.pausedAt = performance.now();
    }
    resume() {
      if (this.state !== "paused") return;
      this.state = "running";
    }
    cleanup() {
      if (this.state === "cleaned") return;
      this.state = "cleaned";
      _MinigameBase.activeInstances.delete(this);
      for (const cleanup of [...this.cleanups].reverse()) {
        try {
          cleanup();
        } catch (error) {
          console.warn(`${this.constructor.name}: fallo durante cleanup`, error);
        }
      }
      this.cleanups.clear();
    }
    cancel() {
      if (this.state === "cleaned") return false;
      this.overlay?.remove();
      this.cleanup();
      if (typeof this.resolve === "function") {
        const resolve = this.resolve;
        this.resolve = null;
        resolve(false);
      }
      return true;
    }
    static cleanupAll() {
      let cancelled = 0;
      for (const minigame of [..._MinigameBase.activeInstances]) {
        if (minigame.cancel()) cancelled += 1;
      }
      return cancelled;
    }
  };
  if (typeof window !== "undefined") window.MinigameBase = MinigameBase;

  // engine/index.js
  var { media, clock } = installTimeManager(window);
  window.VisualNovelEngine = VisualNovelEngine;
  window.MinigameBase = MinigameBase;
  window.gamePauseMedia = media;
  window.gamePauseClock = clock;
})();
