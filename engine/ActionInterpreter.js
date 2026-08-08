const ACTION_ALIASES = Object.freeze({
    show: 'showCharacter',
    hide: 'hideCharacter',
    remove: 'removeCharacter',
    pose: 'setPose',
    background: 'setBackground',
    sound: 'playSound',
    volume: 'setVolume',
    click: 'waitForClick',
    goto: 'goToScene',
    nextChapter: 'setNextChapter',
    video: 'playVideo',
    cg: 'showCG',
    item: 'giveItem',
    dialogOff: 'hideDialog',
    delay: 'setDelay',
});

export const ACTION_TYPES = Object.freeze([
    'clearBackground',
    'removeBackground',
    'setBackground',
    'showCharacter',
    'hideCharacter',
    'removeCharacter',
    'quitarPersonaje',
    'setPose',
    'animateCharacter',
    'characterAnimation',
    'poseSequence',
    'stopCharacterAnimation',
    'stopPoseSequence',
    'characterGlitch',
    'glitchCharacter',
    'characterFullGlitch',
    'fullCharacterGlitch',
    'characterGlitchUntilAdvance',
    'glitchUntilAdvance',
    'characterAnimeFall',
    'animeFall',
    'hideDialog',
    'hideText',
    'ocultarTexto',
    'setVariable',
    'giveItem',
    'addItem',
    'playSound',
    'stopSound',
    'stopAllSounds',
    'pauseSound',
    'resumeSound',
    'setVolume',
    'wait',
    'setTextDuration',
    'textDuration',
    'waitForClick',
    'waitClick',
    'esperarClick',
    'minigame',
    'stopMinigame',
    'rescue',
    'setDelay',
    'addDelay',
    'goToScene',
    'setNextChapter',
    'playVideo',
    'cutscene',
    'shake',
    'screenShake',
    'flash',
    'grade',
    'colorGrade',
    'tinte',
    'vignette',
    'vigneta',
    'fade',
    'bgPan',
    'showCG',
    'hideCG',
    'sfx',
]);

const ACTION_TYPE_SET = new Set(ACTION_TYPES);
const POSITIONS = new Set(['left', 'right', 'center']);
const NO_POSITIONAL_ARGS = new Set([
    'clearBackground',
    'removeBackground',
    'stopAllSounds',
    'waitForClick',
    'waitClick',
    'esperarClick',
    'hideDialog',
    'hideText',
    'ocultarTexto',
    'hideCG',
    'stopMinigame',
]);

const POSITIONAL_FIELDS = Object.freeze({
    setBackground: ['value'],
    showCharacter: ['character', 'position', 'pose'],
    setPose: ['character', 'position', 'pose'],
    playSound: ['path'],
    stopSound: ['id'],
    pauseSound: ['id'],
    resumeSound: ['id'],
    setVolume: ['id', 'volume'],
    wait: ['ms'],
    setTextDuration: ['duration'],
    textDuration: ['duration'],
    minigame: ['game'],
    rescue: ['character'],
    setDelay: ['value'],
    addDelay: ['value'],
    goToScene: ['value'],
    setNextChapter: ['value'],
    playVideo: ['path'],
    cutscene: ['path'],
    shake: ['intensity', 'duration'],
    screenShake: ['intensity', 'duration'],
    flash: ['color', 'duration'],
    grade: ['value', 'duration'],
    colorGrade: ['value', 'duration'],
    tinte: ['value', 'duration'],
    vignette: ['value', 'duration'],
    vigneta: ['value', 'duration'],
    bgPan: ['zoomFrom', 'zoomTo', 'duration'],
    showCG: ['path', 'duration'],
    sfx: ['name', 'on'],
    giveItem: ['item'],
    addItem: ['item'],
});

function tokenize(source) {
    const tokens = [];
    let token = '';
    let quote = null;
    let escaped = false;

    for (const character of source.trim()) {
        if (escaped) {
            token += character;
            escaped = false;
        } else if (character === '\\') {
            escaped = true;
        } else if (quote) {
            if (character === quote) quote = null;
            else token += character;
        } else if (character === '"' || character === "'") {
            quote = character;
        } else if (/\s/.test(character)) {
            if (token) {
                tokens.push(token);
                token = '';
            }
        } else {
            token += character;
        }
    }

    if (escaped) token += '\\';
    if (quote) throw new SyntaxError(`Comillas sin cerrar en la acción: ${source}`);
    if (token) tokens.push(token);
    return tokens;
}

function parseScalar(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value !== '' && Number.isFinite(Number(value))) return Number(value);
    return value;
}

function assignOptions(action, tokens) {
    const positional = [];
    for (const token of tokens) {
        const separator = token.indexOf('=');
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
    if (command !== 'sceneStart') return null;
    const options = {};
    const positional = assignOptions(options, tokens);
    const background = positional[0] || options.background || null;
    const duration = Math.max(0, Number(options.duration) || 350);
    const actions = [{ type: 'fade', to: 'black', duration }];
    if (background) actions.push({ type: 'setBackground', value: background });
    else actions.push({ type: 'clearBackground' });
    actions.push({ type: 'fade', from: 'black', duration });
    return actions;
}

export function parseAction(action) {
    if (!action || typeof action === 'object') return action;
    if (typeof action !== 'string') {
        throw new TypeError(`Acción no compatible: ${String(action)}`);
    }

    const tokens = tokenize(action);
    const command = tokens.shift();
    if (!command) return null;
    const macro = parseMacro(command, tokens);
    if (macro) return macro;

    const type = ACTION_ALIASES[command] || command;
    if (!ACTION_TYPE_SET.has(type)) throw new SyntaxError(`Acción DSL desconocida: ${command}`);
    const parsed = { type };
    const positional = assignOptions(parsed, tokens);

    if (type === 'hideCharacter' || type === 'removeCharacter' || type === 'quitarPersonaje') {
        const target = positional.shift();
        if (target != null) parsed[POSITIONS.has(String(target)) ? 'position' : 'character'] = target;
    } else if (type === 'fade') {
        const direction = positional.shift();
        if (direction === 'to' || direction === 'from') parsed[direction] = positional.shift() || 'black';
        if (positional.length && parsed.duration == null) parsed.duration = positional.shift();
    } else if (!NO_POSITIONAL_ARGS.has(type)) {
        const fields = POSITIONAL_FIELDS[type] || [];
        fields.forEach((field, index) => {
            if (positional[index] !== undefined && parsed[field] === undefined) parsed[field] = positional[index];
        });
    }

    if (positional.length > (POSITIONAL_FIELDS[type]?.length || 0) && !['fade'].includes(type)) {
        throw new SyntaxError(`Demasiados argumentos en la acción DSL: ${action}`);
    }
    return parsed;
}

function quote(value) {
    const text = String(value);
    return !text || /[\s'"\\=]/.test(text) ? JSON.stringify(text) : text;
}

function encodeOption(key, value) {
    if (typeof value === 'string') return `${key}=${quote(value)}`;
    return `${key}=${String(value)}`;
}

export function serializeAction(action) {
    if (!action || typeof action !== 'object' || Array.isArray(action) || !ACTION_TYPE_SET.has(action.type))
        return null;
    if (Object.values(action).some((value) => value != null && typeof value === 'object')) return null;

    let command = action.type;
    const fields = [];
    if (action.type === 'showCharacter') command = 'show';
    else if (action.type === 'hideCharacter') command = 'hide';
    else if (action.type === 'removeCharacter') command = 'remove';
    else if (action.type === 'setPose') command = 'pose';
    else if (action.type === 'setBackground') command = 'background';
    else if (action.type === 'playSound') command = 'sound';
    else if (action.type === 'goToScene') command = 'goto';
    else if (action.type === 'setNextChapter') command = 'nextChapter';
    else if (action.type === 'playVideo') command = 'video';
    else if (action.type === 'showCG') command = 'cg';
    else if (action.type === 'giveItem') command = 'item';
    else if (action.type === 'hideDialog') command = 'dialogOff';
    else if (action.type === 'setDelay') command = 'delay';

    if (['hideCharacter', 'removeCharacter', 'quitarPersonaje'].includes(action.type)) {
        const target = action.character ?? action.position;
        if (target != null)
            fields.push(
                action.character != null && action.position != null
                    ? `character=${quote(action.character)}`
                    : quote(target),
            );
    } else if (action.type === 'fade') {
        if (action.to != null) fields.push('to', quote(action.to));
        else if (action.from != null) fields.push('from', quote(action.from));
    } else {
        for (const field of POSITIONAL_FIELDS[action.type] || []) {
            if (action[field] !== undefined) fields.push(quote(action[field]));
        }
    }

    const consumed = new Set(['type']);
    if (['hideCharacter', 'removeCharacter', 'quitarPersonaje'].includes(action.type))
        consumed.add(action.character != null ? 'character' : 'position');
    else if (action.type === 'fade') {
        consumed.add(action.to != null ? 'to' : 'from');
    } else {
        for (const field of POSITIONAL_FIELDS[action.type] || []) if (action[field] !== undefined) consumed.add(field);
    }

    for (const [key, value] of Object.entries(action)) {
        if (consumed.has(key) || value === undefined) continue;
        fields.push(encodeOption(key, value));
    }
    return [command, ...fields].join(' ');
}

export class ActionInterpreter {
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
            case 'clearBackground':
            case 'removeBackground':
                engine.clearBackground();
                break;
            case 'setBackground':
                engine.setBackground(action.value, action);
                break;
            case 'showCharacter':
                await engine.showCharacter(
                    action.character,
                    action.position,
                    action.pose,
                    action.flipped,
                    action.enter,
                    action.offsetY,
                    action.scale,
                );
                break;
            case 'hideCharacter':
                engine.hideCharacter(action.character, action.position, action.exit);
                break;
            case 'removeCharacter':
            case 'quitarPersonaje':
                engine.removeCharacter(action.character, action.position, action.exit);
                break;
            case 'setPose':
                engine.setPose(action.character, action.position, action.pose);
                break;
            case 'animateCharacter':
            case 'characterAnimation':
            case 'poseSequence':
                engine.startCharacterPoseAnimation(action);
                break;
            case 'stopCharacterAnimation':
            case 'stopPoseSequence':
                engine.stopCharacterPoseAnimation(action.character, action.position);
                break;
            case 'characterGlitch':
            case 'glitchCharacter':
                engine.triggerCharacterGlitch(action.character, action.position, action.duration);
                break;
            case 'characterFullGlitch':
            case 'fullCharacterGlitch':
                engine.triggerCharacterFullGlitch(action.character, action.position, action.duration);
                break;
            case 'characterGlitchUntilAdvance':
            case 'glitchUntilAdvance':
                engine.startCharacterGlitchUntilAdvance(action.character, action.position);
                break;
            case 'characterAnimeFall':
            case 'animeFall':
                engine.triggerCharacterAnimeFall(action.character, action.position, action);
                break;
            case 'hideDialog':
            case 'hideText':
            case 'ocultarTexto':
                engine.hideDialog();
                break;
            case 'setVariable':
                engine.gameState[action.variable] = action.value;
                break;
            case 'giveItem':
            case 'addItem':
                engine.addItem(action.item || action.value);
                break;
            case 'playSound': {
                const soundPath = action.path || action.value;
                engine.audioController.play(soundPath, {
                    volume: action.volume !== undefined ? action.volume : 1,
                    loop: action.loop || false,
                    autoPlay: action.autoPlay !== false,
                    id: action.id,
                    fadeIn: action.fadeIn || 0,
                });
                break;
            }
            case 'stopSound':
                engine.audioController.stop(action.id || action.audio, action.fadeOut || 0);
                break;
            case 'stopAllSounds':
                engine.audioController.stopAll();
                break;
            case 'pauseSound':
                engine.audioController.pause(action.id || action.audio);
                break;
            case 'resumeSound':
                engine.audioController.resume(action.id || action.audio);
                break;
            case 'setVolume':
                engine.audioController.setVolume(action.id || action.audio, action.volume);
                break;
            case 'wait':
                await engine.wait(action.ms != null ? action.ms : action.value);
                break;
            case 'setTextDuration':
            case 'textDuration':
                engine.setLineTextDuration(
                    action.duration != null ? action.duration : action.ms != null ? action.ms : action.value,
                );
                break;
            case 'waitForClick':
            case 'waitClick':
            case 'esperarClick':
                await engine.waitForActionClick();
                break;
            case 'minigame':
                await engine.playMinigame(action);
                break;
            case 'stopMinigame':
                engine.abortarMinijuego();
                break;
            case 'rescue':
                engine.rescueCharacter(action.character);
                break;
            case 'setDelay':
                engine.storyDelay = action.value || 0;
                engine.storyPressure = engine.storyDelay;
                break;
            case 'addDelay':
                engine.storyDelay += action.value || 0;
                engine.storyPressure = engine.storyDelay;
                break;
            case 'goToScene':
                engine.historyManager.jump(action.value);
                break;
            case 'setNextChapter':
                engine.nextChapter = action.value;
                break;
            case 'playVideo':
            case 'cutscene':
                await engine.playVideo(action);
                break;
            case 'shake':
            case 'screenShake':
                if (window.Juice) window.Juice.shake(action.intensity || action.value || 8, action.duration || 350);
                break;
            case 'flash':
                if (window.Juice) window.Juice.flash(action.color || action.value, action.duration);
                break;
            case 'grade':
            case 'colorGrade':
            case 'tinte':
                if (window.Juice) window.Juice.grade(action.value || action.filter || 'none', action.duration);
                break;
            case 'vignette':
            case 'vigneta':
                if (window.Juice) {
                    const strength = action.value != null ? action.value : action.strength;
                    window.Juice.vignette(strength, action.duration);
                }
                break;
            case 'fade':
                await engine.fadeScene(action);
                break;
            case 'bgPan':
                engine.bgPan(action);
                break;
            case 'showCG':
                await engine.showCG(action.path || action.value, action.duration, action);
                break;
            case 'hideCG':
                engine.hideCG(action.duration);
                break;
            case 'sfx':
                if (window.Juice?.sfx) window.Juice.sfx(action.name, action.on !== false, action);
                break;
        }
    }
}
