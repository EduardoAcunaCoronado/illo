import { installTimeManager } from './TimeManager.js';
import { VisualNovelEngine } from './VisualNovelEngine.js';
import { MinigameBase } from '../minigames/MinigameBase.js';

const { media, clock } = installTimeManager(window);

window.VisualNovelEngine = VisualNovelEngine;
window.MinigameBase = MinigameBase;
window.gamePauseMedia = media;
window.gamePauseClock = clock;
