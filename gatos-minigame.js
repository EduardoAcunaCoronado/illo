(function () {
  const cacheBust = (path) => `${path}?v=${Date.now()}`;

  class GatosMinigame {
    constructor(options = {}) {
      this.options = options;
    }

    static play(options = {}) {
      return new GatosMinigame(options).play();
    }

    async play() {
      return this.runRound();
    }

    static get MAZE() {
      return [
        '                     ',
        ' ### ### ### ### ### ',
        ' ### ### ### ### ### ',
        '                     ',
        ' ### ### ### ### ### ',
        ' ### ### ### ### ### ',
        '                     ',
        ' ### ### ### ### ### ',
        ' ### ### ### ### ### ',
        '                     ',
        ' ### ### ### ### ### ',
        ' ### ### ### ### ### ',
        '                     ',
        ' ### ### ### ### ### ',
        '                     ',
      ];
    }

    static get DEFAULT_MAP_ID() {
      return 'gatos_supermercado_exterior';
    }

    static get DEFAULT_MAP_IMAGE() {
      return 'assets/images/minigames/chapter2/gatos/mapa_minijuego_gatos.png';
    }

    static get COLLISION_STORAGE_KEY() {
      return 'illo_collision_maps';
    }

    static get HITBOX_STORAGE_KEY() {
      return 'illo_hitbox_config';
    }

    static get DEFAULT_SAMU_HITBOX() {
      return { shape: 'circle', offsetX: 0, offsetY: 0, w: 0.028, h: 0.028, rotation: 0, coordinateSpace: 'stage1280x720' };
    }

    static loadCollisionMap(mapId) {
      if (!mapId || typeof localStorage === 'undefined') return null;
      try {
        const maps = JSON.parse(localStorage.getItem(GatosMinigame.COLLISION_STORAGE_KEY) || '{}');
        const map = maps?.[mapId];
        if (!map || !Array.isArray(map.zones)) return null;
        return {
          ...map,
          zones: map.zones
            .map((zone) => ({
              ...zone,
              x: Number(zone.x),
              y: Number(zone.y),
              w: Number(zone.w),
              h: Number(zone.h),
            }))
            .filter((zone) => Number.isFinite(zone.x) && Number.isFinite(zone.y) && Number.isFinite(zone.w) && Number.isFinite(zone.h)),
        };
      } catch (error) {
        console.warn('No se pudo leer el mapa de colisiones de gatos.', error);
        return null;
      }
    }

    static hasPlayableCollisionMap(map) {
      return !!map?.zones?.length;
    }

    static loadSamuHitbox() {
      try {
        const config = JSON.parse(localStorage.getItem(GatosMinigame.HITBOX_STORAGE_KEY) || '{}');
        const stored = config.gatos?.samu;
        const storedHitbox = stored?.parts?.base || stored || {};
        const hitbox = {
          ...GatosMinigame.DEFAULT_SAMU_HITBOX,
          ...storedHitbox,
        };
        if (stored && storedHitbox.coordinateSpace !== 'stage1280x720') {
          const scaleX = 1672 / 1280;
          const scaleY = 941 / 720;
          return {
            ...hitbox,
            offsetX: (Number(hitbox.offsetX) || 0) * scaleX,
            offsetY: (Number(hitbox.offsetY) || 0) * scaleY,
            w: (Number(hitbox.w) || GatosMinigame.DEFAULT_SAMU_HITBOX.w) * scaleX,
            h: (Number(hitbox.h) || GatosMinigame.DEFAULT_SAMU_HITBOX.h) * scaleY,
            coordinateSpace: 'stage1280x720',
          };
        }
        return {
          ...hitbox,
          coordinateSpace: 'stage1280x720',
        };
      } catch (error) {
        return { ...GatosMinigame.DEFAULT_SAMU_HITBOX };
      }
    }

    static renderCollisionDebugLayer(field, zones) {
      const debugLayer = document.createElement('div');
      debugLayer.className = 'mg-collision-debug-layer';
      zones.forEach((zone) => {
        const zoneEl = document.createElement('div');
        zoneEl.className = `mg-collision-debug-zone mg-collision-debug-${zone.type || 'zone'}`;
        zoneEl.style.left = `${zone.x * 100}%`;
        zoneEl.style.top = `${zone.y * 100}%`;
        if (zone.type !== 'spawn') {
          zoneEl.style.width = `${zone.w * 100}%`;
          zoneEl.style.height = `${zone.h * 100}%`;
        }
        zoneEl.innerHTML = `<span>${zone.label || zone.type || 'zone'}</span>`;
        debugLayer.appendChild(zoneEl);
      });
      field.appendChild(debugLayer);
    }

    static renderDebugPoint(field, point, label, className) {
      if (!point) return;
      const marker = document.createElement('div');
      marker.className = `mg-runtime-debug-point ${className || ''}`;
      marker.style.left = `${point.x * 100}%`;
      marker.style.top = `${point.y * 100}%`;
      marker.innerHTML = `<span>${label}</span>`;
      field.appendChild(marker);
    }

    static fitMapViewport(field, viewport) {
      const ratio = 1672 / 941;
      const fieldW = field.clientWidth || 1;
      const fieldH = field.clientHeight || 1;
      const widthByHeight = fieldH * ratio;
      let width = Math.min(fieldW, widthByHeight);
      let height = width / ratio;
      if (height > fieldH) {
        height = fieldH;
        width = height * ratio;
      }
      viewport.style.width = `${width}px`;
      viewport.style.height = `${height}px`;
    }

    runCollisionMapRound(collisionMap) {
      const surviveMs = (this.options.survive || 60) * 1000;
      const catCount = this.options.cats || 3;
      const mapBackground = cacheBust(this.options.background || collisionMap.image || GatosMinigame.DEFAULT_MAP_IMAGE);
      const catIcon = cacheBust('assets/images/minigames/chapter2/common/gato.webp');
      const playerFrame = (index) => cacheBust(`assets/images/characters/samu/run/samu_run_${index}.webp`);
      const playerFrames = {
        down: [playerFrame(1), playerFrame(2), playerFrame(3)],
        right: [playerFrame(4), playerFrame(5), playerFrame(6)],
        up: [playerFrame(7), playerFrame(8), playerFrame(9)],
        left: [playerFrame(4), playerFrame(5), playerFrame(6)],
      };
      const playerSpeed = this.options.freePlayerSpeed || (this.options.playerSpeed || 5.0) / 22;
      const catSpeed = this.options.freeCatSpeed || (this.options.catSpeed || 3.6) / 22;
      const playerCollisionRadius = this.options.playerCollisionRadius || 0.014;
      const catCollisionRadius = this.options.catCollisionRadius || 0.014;
      const catchDistance = this.options.catchDistance || 0.04;
      const samuHitbox = GatosMinigame.loadSamuHitbox();
      const wallZones = collisionMap.zones.filter((zone) => zone.type === 'wall');
      const spawnZones = collisionMap.zones.filter((zone) => zone.type === 'spawn');
      const zoneRect = (zone) => ({
        left: zone.x - zone.w / 2,
        right: zone.x + zone.w / 2,
        top: zone.y - zone.h / 2,
        bottom: zone.y + zone.h / 2,
      });
      const overlapsRect = (point, zone, radius) => {
        const rect = zoneRect(zone);
        const closestX = Math.max(rect.left, Math.min(point.x, rect.right));
        const closestY = Math.max(rect.top, Math.min(point.y, rect.bottom));
        return Math.hypot(point.x - closestX, point.y - closestY) < radius;
      };
      const isBlocked = (x, y, radius = 0.018) => {
        if (x < radius || x > 1 - radius || y < radius || y > 1 - radius) return true;
        return wallZones.some((zone) => overlapsRect({ x, y }, zone, radius));
      };
      const farFrom = (point, avoid, minDistance) =>
        avoid.every((other) => Math.hypot(point.x - other.x, point.y - other.y) >= minDistance);
      const spawnPoint = (zone) => zone ? {
        x: Math.max(0.001, Math.min(0.999, zone.x)),
        y: Math.max(0.001, Math.min(0.999, zone.y)),
      } : null;
      const findOpenPoint = (preferred, avoid = [], minDistance = 0.12) => {
        const candidates = [
          preferred,
          { x: 0.5, y: 0.5 },
          { x: 0.12, y: 0.82 },
          { x: 0.88, y: 0.18 },
          { x: 0.12, y: 0.18 },
          { x: 0.88, y: 0.82 },
          { x: 0.5, y: 0.12 },
          { x: 0.5, y: 0.88 },
        ].filter(Boolean);
        for (let gy = 1; gy <= 9; gy++) {
          for (let gx = 1; gx <= 13; gx++) {
            candidates.push({ x: gx / 14, y: gy / 10 });
          }
        }
        return (
          candidates.find((point) => !isBlocked(point.x, point.y) && farFrom(point, avoid, minDistance)) ||
          candidates.find((point) => !isBlocked(point.x, point.y) && farFrom(point, avoid, minDistance * 0.5)) ||
          candidates.find((point) => !isBlocked(point.x, point.y)) ||
          { x: 0.5, y: 0.5 }
        );
      };
      const playerSpawn = spawnZones.find((zone) => /samu|jugador|player/i.test(zone.label || '')) || spawnZones[0];
      const catSpawns = spawnZones.filter((zone) => /gato|cat|michi/i.test(zone.label || ''));
      const playerStart = spawnPoint(playerSpawn);

      return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = `minigame-overlay gatos-minigame gatos-collision-map${this.options.debugCollisions ? ' gatos-debug-collisions' : ''}`;
        overlay.innerHTML = `
          <div class="minigame-hud">
            <span class="mg-hud-pill mg-timer">⏱ ${Math.ceil(surviveMs / 1000)}s</span>
            <span class="mg-hud-objective">Escapa sin que te alcancen</span>
            <span class="mg-hud-pill mg-cats"><img class="mg-hud-icon" src="${catIcon}" alt="gato"> ${catCount}</span>
          </div>
          <div class="minigame-field" id="mg-field-gatos">
            <div class="mg-map-viewport" id="mg-map-viewport-gatos" style="--gatos-map: url('${mapBackground}')">
              <div class="mg-player" id="mg-player-gatos"><img src="${playerFrames.down[0]}" alt="Samu" draggable="false"></div>
            </div>
          </div>
          <div class="minigame-instructions">← ↑ → ↓ / WASD</div>
        `;
        document.getElementById('game-container').appendChild(overlay);

        const fieldShell = overlay.querySelector('#mg-field-gatos');
        const field = overlay.querySelector('#mg-map-viewport-gatos');
        const player = overlay.querySelector('#mg-player-gatos');
        const playerImg = player.querySelector('img');
        const timerEl = overlay.querySelector('.mg-timer');
        const fitViewport = () => GatosMinigame.fitMapViewport(fieldShell, field);
        fitViewport();
        window.addEventListener('resize', fitViewport);
        if (this.options.debugCollisions) {
          GatosMinigame.renderCollisionDebugLayer(field, collisionMap.zones);
        }
        const placeEntity = (el, x, y) => {
          el.style.left = `${x * 100}%`;
          el.style.top = `${y * 100}%`;
        };
        const playerCollisionPoint = () => ({
          x: playerX + (Number(samuHitbox.offsetX) || 0),
          y: playerY + (Number(samuHitbox.offsetY) || 0),
        });
        const renderHitboxDebugger = () => {
          if (!window.HitboxDebugger?.isEnabled?.()) return;
          const point = playerCollisionPoint();
          window.HitboxDebugger.render({
            gameId: 'gatos',
            label: 'Gatos · Samu',
            field,
            hitboxes: [
              {
                id: 'gatos-samu',
                label: 'Samu',
                kind: 'player',
                x: playerX,
                y: playerY,
                shape: samuHitbox.shape || 'circle',
                offsetX: Number(samuHitbox.offsetX) || 0,
                offsetY: Number(samuHitbox.offsetY) || 0,
                w: Number(samuHitbox.w) || GatosMinigame.DEFAULT_SAMU_HITBOX.w,
                h: Number(samuHitbox.h) || GatosMinigame.DEFAULT_SAMU_HITBOX.h,
                rotation: Number(samuHitbox.rotation) || 0,
              },
              {
                id: 'gatos-samu-point',
                label: 'Punto real',
                kind: 'shot',
                x: point.x,
                y: point.y,
                shape: 'circle',
                offsetX: 0,
                offsetY: 0,
                w: 0.012,
                h: 0.012,
                inactive: true,
              },
            ],
          });
        };
        const start = playerStart || findOpenPoint(null);
        let playerX = start.x;
        let playerY = start.y;
        placeEntity(player, playerX, playerY);
        if (this.options.debugCollisions) {
          GatosMinigame.renderDebugPoint(field, start, `Samu ${playerX.toFixed(3)}, ${playerY.toFixed(3)}`, 'mg-runtime-debug-player');
        }

        const catDefaults = [
          { x: 0.12, y: 0.12 },
          { x: 0.88, y: 0.88 },
          { x: 0.88, y: 0.12 },
          { x: 0.12, y: 0.88 },
          { x: 0.5, y: 0.12 },
          { x: 0.5, y: 0.88 },
        ];
        const cats = [];
        for (let i = 0; i < catCount; i++) {
          const spawn = catSpawns[i % catSpawns.length];
          const fallback = catDefaults[i % catDefaults.length];
          const point = findOpenPoint(spawnPoint(spawn) || fallback, [
            { x: playerX, y: playerY },
            ...cats,
          ], 0.18);
          const el = document.createElement('div');
          el.className = 'mg-cat';
          const catImg = document.createElement('img');
          catImg.src = catIcon;
          catImg.alt = 'gato';
          catImg.draggable = false;
          el.appendChild(catImg);
          field.appendChild(el);
          placeEntity(el, point.x, point.y);
          cats.push({ el, x: point.x, y: point.y, wanderAngle: Math.random() * Math.PI * 2, nextWander: 0 });
        }

        const pressedKeys = new Set();
        const directionByKey = {
          arrowup: { x: 0, y: -1 },
          w: { x: 0, y: -1 },
          arrowdown: { x: 0, y: 1 },
          s: { x: 0, y: 1 },
          arrowleft: { x: -1, y: 0 },
          a: { x: -1, y: 0 },
          arrowright: { x: 1, y: 0 },
          d: { x: 1, y: 0 },
        };
        const wantedDirection = () => {
          let x = 0;
          let y = 0;
          pressedKeys.forEach((key) => {
            x += directionByKey[key]?.x || 0;
            y += directionByKey[key]?.y || 0;
          });
          const len = Math.hypot(x, y) || 1;
          return { x: x / len, y: y / len };
        };
        const keyDown = (e) => {
          const key = e.key.toLowerCase();
          if (directionByKey[key]) pressedKeys.add(key);
          if (key.startsWith('arrow')) e.preventDefault();
        };
        const keyUp = (e) => {
          const key = e.key.toLowerCase();
          if (directionByKey[key]) pressedKeys.delete(key);
          if (key.startsWith('arrow')) e.preventDefault();
        };
        const blur = () => pressedKeys.clear();
        const swallowClick = (e) => e.stopPropagation();
        document.addEventListener('keydown', keyDown);
        document.addEventListener('keyup', keyUp);
        window.addEventListener('blur', blur);
        overlay.addEventListener('click', swallowClick, true);

        const tryMove = (entity, dx, dy, speed, dt, radius = 0.018) => {
          const nx = entity.x + dx * speed * dt;
          const ny = entity.y + dy * speed * dt;
          if (!isBlocked(nx, ny, radius)) return { x: nx, y: ny };
          if (!isBlocked(nx, entity.y, radius)) return { x: nx, y: entity.y };
          if (!isBlocked(entity.x, ny, radius)) return { x: entity.x, y: ny };
          return { x: entity.x, y: entity.y };
        };

        let running = true;
        let lastTime = null;
        let facing = 1;
        let playerDirection = 'down';
        const startTime = performance.now();
        const cleanup = (won) => {
          running = false;
          document.removeEventListener('keydown', keyDown);
          document.removeEventListener('keyup', keyUp);
          window.removeEventListener('blur', blur);
          window.removeEventListener('resize', fitViewport);
          window.HitboxDebugger?.clear?.();
          const result = document.createElement('div');
          result.className = 'minigame-result';
          result.textContent = won ? '¡Escapaste de la loca de los gatos!' : '¡Un gato te ha pillado!';
          overlay.appendChild(result);
          setTimeout(
            () => {
              overlay.removeEventListener('click', swallowClick, true);
              overlay.remove();
              resolve(won);
            },
            won ? 1500 : 800,
          );
        };

        const loop = (time) => {
          if (!running) return;
          if (lastTime === null) lastTime = time;
          const dt = Math.min((time - lastTime) / 1000, 0.05);
          lastTime = time;
          const dir = wantedDirection();
          const pointBeforeMove = playerCollisionPoint();
          const movedPoint = tryMove(pointBeforeMove, dir.x, dir.y, playerSpeed, dt, playerCollisionRadius);
          const moved = {
            x: movedPoint.x - (Number(samuHitbox.offsetX) || 0),
            y: movedPoint.y - (Number(samuHitbox.offsetY) || 0),
          };
          const isMoving = Math.hypot(moved.x - playerX, moved.y - playerY) > 0.0001;
          playerX = moved.x;
          playerY = moved.y;
          placeEntity(player, playerX, playerY);
          renderHitboxDebugger();
          if (isMoving) {
            if (Math.abs(dir.x) > Math.abs(dir.y)) {
              playerDirection = dir.x > 0 ? 'right' : 'left';
              facing = dir.x > 0 ? 1 : -1;
            } else {
              playerDirection = dir.y > 0 ? 'down' : 'up';
              facing = 1;
            }
          }
          const directionFrames = playerFrames[playerDirection];
          const frameIndex = isMoving ? Math.floor(time / 95) % directionFrames.length : 0;
          const frameKey = `${playerDirection}-${frameIndex}`;
          if (playerImg.dataset.frame !== frameKey) {
            playerImg.src = directionFrames[frameIndex];
            playerImg.dataset.frame = frameKey;
          }
          playerImg.style.transform = `scaleX(${facing})`;

          cats.forEach((cat, index) => {
            let dx = playerX - cat.x;
            let dy = playerY - cat.y;
            const distance = Math.hypot(dx, dy) || 1;
            const scatter = Math.floor((time - startTime) / 1000) % 8 < 2;
            if (scatter) {
              const angle = cat.wanderAngle + index * 0.7;
              dx = Math.cos(angle);
              dy = Math.sin(angle);
            } else {
              dx /= distance;
              dy /= distance;
            }
            const movedCat = tryMove(cat, dx, dy, catSpeed, dt, catCollisionRadius);
            if (movedCat.x === cat.x && movedCat.y === cat.y && time > cat.nextWander) {
              cat.wanderAngle = Math.random() * Math.PI * 2;
              cat.nextWander = time + 700;
            }
            cat.x = movedCat.x;
            cat.y = movedCat.y;
            placeEntity(cat.el, cat.x, cat.y);
            const playerPoint = playerCollisionPoint();
            if (time - startTime > 900 && Math.hypot(cat.x - playerPoint.x, cat.y - playerPoint.y) < catchDistance) cleanup(false);
          });
          if (!running) return;

          const elapsed = time - startTime;
          const remaining = Math.max(0, surviveMs - elapsed);
          timerEl.textContent = `⏱ ${Math.ceil(remaining / 1000)}s`;
          if (remaining <= 0) return cleanup(true);
          requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
      });
    }

    runRound() {
      const surviveMs = (this.options.survive || 60) * 1000;
      const catCount = this.options.cats || 3;
      const collisionMapId = this.options.collisionMapId || GatosMinigame.DEFAULT_MAP_ID;
      const collisionMap = GatosMinigame.loadCollisionMap(collisionMapId);
      if (GatosMinigame.hasPlayableCollisionMap(collisionMap)) {
        return this.runCollisionMapRound(collisionMap);
      }
      const mapBackground = cacheBust(this.options.background || GatosMinigame.DEFAULT_MAP_IMAGE);
      const catIcon = cacheBust('assets/images/minigames/chapter2/common/gato.webp');
      const playerFrame = (index) => cacheBust(`assets/images/characters/samu/run/samu_run_${index}.webp`);
      const playerFrames = {
        down: [playerFrame(1), playerFrame(2), playerFrame(3)],
        right: [playerFrame(4), playerFrame(5), playerFrame(6)],
        up: [playerFrame(7), playerFrame(8), playerFrame(9)],
        left: [playerFrame(4), playerFrame(5), playerFrame(6)],
      };
      const playerSpeed = this.options.playerSpeed || 5.0;
      const catSpeed = this.options.catSpeed || 3.6;

      const map = GatosMinigame.MAZE;
      const rows = map.length;
      const cols = Math.max(...map.map((r) => r.length));
      const isWall = (c, r) => {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return true;
        const row = map[r];
        return c >= row.length ? true : row[c] === '#';
      };
      const isStreet = (c, r) => !isWall(c, r);

      return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'minigame-overlay gatos-minigame';
        overlay.innerHTML = `
          <div class="minigame-hud">
            <span class="mg-hud-pill mg-timer">⏱ ${Math.ceil(surviveMs / 1000)}s</span>
            <span class="mg-hud-objective">Escapa sin que te alcancen</span>
            <span class="mg-hud-pill mg-cats"><img class="mg-hud-icon" src="${catIcon}" alt="gato"> ${catCount}</span>
          </div>
          <div class="minigame-field" id="mg-field-gatos">
            <div class="mg-map-viewport" id="mg-map-viewport-gatos" style="--gatos-map: url('${mapBackground}')">
              <div class="mg-maze" id="mg-maze"></div>
              <div class="mg-player" id="mg-player-gatos"><img src="${playerFrames.down[0]}" alt="Samu" draggable="false"></div>
            </div>
          </div>
          <div class="minigame-instructions">← ↑ → ↓ / WASD</div>
        `;
        document.getElementById('game-container').appendChild(overlay);

        const fieldShell = overlay.querySelector('#mg-field-gatos');
        const field = overlay.querySelector('#mg-map-viewport-gatos');
        const maze = overlay.querySelector('#mg-maze');
        const player = overlay.querySelector('#mg-player-gatos');
        const playerImg = player.querySelector('img');
        const timerEl = overlay.querySelector('.mg-timer');
        const fitViewport = () => GatosMinigame.fitMapViewport(fieldShell, field);
        fitViewport();
        window.addEventListener('resize', fitViewport);

        maze.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        maze.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = isWall(c, r) ? 'mg-wall' : 'mg-street';
            maze.appendChild(cell);
          }
        }

        const centerStreet = () => {
          const cc = Math.floor(cols / 2);
          const cr = Math.floor(rows / 2);
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
        let pcx = start.c + 0.5;
        let pcy = start.r + 0.5;
        let pdir = { x: 0, y: 0 };
        let wantDir = { x: 0, y: 0 };

        const toPct = (cx, cy) => ({ left: (cx / cols) * 100, top: (cy / rows) * 100 });
        const placeEntity = (el, cx, cy) => {
          const p = toPct(cx, cy);
          el.style.left = `${p.left}%`;
          el.style.top = `${p.top}%`;
        };
        player.style.bottom = 'auto';
        placeEntity(player, pcx, pcy);

        const snapStreet = (c, r) => {
          if (isStreet(c, r)) return { c, r };
          const dirs = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ];
          for (const [dc, dr] of dirs) {
            if (isStreet(c + dc, r + dr)) return { c: c + dc, r: r + dr };
          }
          return { c, r };
        };

        const catStarts = [
          { c: 1, r: 1 },
          { c: cols - 2, r: rows - 2 },
          { c: cols - 2, r: 1 },
          { c: 1, r: rows - 2 },
          { c: Math.floor(cols / 2), r: 1 },
          { c: Math.floor(cols / 2), r: rows - 2 },
        ].map((p) => snapStreet(p.c, p.r));
        const catImages = [
          catIcon,
          catIcon,
          catIcon,
        ];
        const cats = [];
        for (let i = 0; i < catCount; i++) {
          const s = catStarts[i % catStarts.length];
          const el = document.createElement('div');
          el.className = 'mg-cat';
          const catImg = document.createElement('img');
          catImg.src = catImages[i % catImages.length];
          catImg.alt = 'gato';
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
            role: i,
          });
        }

        const clampCell = (c, r) =>
          snapStreet(Math.max(0, Math.min(cols - 1, c)), Math.max(0, Math.min(rows - 1, r)));

        const bfsStep = (from, to) => {
          if (from.c === to.c && from.r === to.r) return { x: 0, y: 0 };
          const key = (c, r) => `${c},${r}`;
          const q = [[from.c, from.r]];
          const prev = new Map();
          prev.set(key(from.c, from.r), null);
          const dirs = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ];
          let found = false;
          while (q.length) {
            const [c, r] = q.shift();
            if (c === to.c && r === to.r) {
              found = true;
              break;
            }
            for (const [dc, dr] of dirs) {
              const nc = c + dc;
              const nr = r + dr;
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

        const pressedKeys = new Set();
        const directionByKey = {
          arrowup: { x: 0, y: -1 },
          w: { x: 0, y: -1 },
          arrowdown: { x: 0, y: 1 },
          s: { x: 0, y: 1 },
          arrowleft: { x: -1, y: 0 },
          a: { x: -1, y: 0 },
          arrowright: { x: 1, y: 0 },
          d: { x: 1, y: 0 },
        };
        const setWantedDirection = () => {
          const lastKey = Array.from(pressedKeys).pop();
          wantDir = lastKey ? { ...directionByKey[lastKey] } : { x: 0, y: 0 };
        };
        const keyDown = (e) => {
          const key = e.key.toLowerCase();
          if (directionByKey[key]) {
            pressedKeys.delete(key);
            pressedKeys.add(key);
            setWantedDirection();
          }
          if (key.startsWith('arrow')) e.preventDefault();
        };
        const keyUp = (e) => {
          const key = e.key.toLowerCase();
          if (directionByKey[key]) {
            pressedKeys.delete(key);
            setWantedDirection();
          }
          if (key.startsWith('arrow')) e.preventDefault();
        };
        const blur = () => {
          pressedKeys.clear();
          setWantedDirection();
        };
        const swallowClick = (e) => e.stopPropagation();
        document.addEventListener('keydown', keyDown);
        document.addEventListener('keyup', keyUp);
        window.addEventListener('blur', blur);
        overlay.addEventListener('click', swallowClick, true);

        let running = true;
        let lastTime = null;
        let facing = 1;
        let playerDirection = 'down';
        const startTime = performance.now();

        const cleanup = (won) => {
          running = false;
          document.removeEventListener('keydown', keyDown);
          document.removeEventListener('keyup', keyUp);
          window.removeEventListener('blur', blur);
          window.removeEventListener('resize', fitViewport);
          const result = document.createElement('div');
          result.className = 'minigame-result';
          result.textContent = won ? '¡Escapaste de la loca de los gatos!' : '¡Un gato te ha pillado!';
          overlay.appendChild(result);
          setTimeout(
            () => {
              overlay.removeEventListener('click', swallowClick, true);
              overlay.remove();
              resolve(won);
            },
            won ? 1500 : 800,
          );
        };

        const centerOf = (v) => Math.floor(v) + 0.5;
        const atCenter = (v, tolerance = 0.18) => Math.abs(v - centerOf(v)) < tolerance;
        const canGo = (cc, cr, dir) =>
          dir.x === 0 && dir.y === 0 ? false : isStreet(Math.floor(cc) + dir.x, Math.floor(cr) + dir.y);
        const canKeepGoing = (cc, cr, dir) => {
          if (dir.x === 0 && dir.y === 0) return false;
          const col = dir.x > 0 ? Math.floor(cc + 0.5) : dir.x < 0 ? Math.floor(cc - 0.5) : Math.floor(cc);
          const row = dir.y > 0 ? Math.floor(cr + 0.5) : dir.y < 0 ? Math.floor(cr - 0.5) : Math.floor(cr);
          return isStreet(col, row);
        };

        const moveGrid = (cx, cy, dir, want, speed, dt) => {
          if (!want || (want.x === 0 && want.y === 0)) {
            return { cx, cy, dir: { x: 0, y: 0 } };
          }

          let cCol = Math.floor(cx);
          let cRow = Math.floor(cy);
          const isStopped = dir.x === 0 && dir.y === 0;
          if (isStopped) {
            if (want.x !== 0) {
              cy = centerOf(cy);
            } else if (want.y !== 0) {
              cx = centerOf(cx);
            }
            cCol = Math.floor(cx);
            cRow = Math.floor(cy);
            if (canKeepGoing(cx, cy, want)) {
              dir = { ...want };
            }
          }

          if (want && (want.x !== dir.x || want.y !== dir.y)) {
            const canTurnHorizontally = want.x !== 0 && atCenter(cy) && canGo(cx, cy, want);
            const canTurnVertically = want.y !== 0 && atCenter(cx) && canGo(cx, cy, want);
            if (canTurnHorizontally || canTurnVertically) {
              cx = centerOf(cx);
              cy = centerOf(cy);
              dir = { ...want };
            }
          }
          if (atCenter(cx) && atCenter(cy) && !canGo(cx, cy, dir)) {
            dir = { x: 0, y: 0 };
          }
          if (dir.x !== 0 || dir.y !== 0) {
            const nextIsWall = isWall(cCol + dir.x, cRow + dir.y);
            cx += dir.x * speed * dt;
            cy += dir.y * speed * dt;
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
          if (!running) return;
          if (lastTime === null) lastTime = time;
          const dt = Math.min((time - lastTime) / 1000, 0.05);
          lastTime = time;

          const pr = moveGrid(pcx, pcy, pdir, wantDir, playerSpeed, dt);
          pcx = pr.cx;
          pcy = pr.cy;
          pdir = pr.dir;
          placeEntity(player, pcx, pcy);
          const isMoving = pdir.x !== 0 || pdir.y !== 0;
          if (pdir.x > 0) {
            playerDirection = 'right';
            facing = 1;
          } else if (pdir.x < 0) {
            playerDirection = 'left';
            facing = -1;
          } else if (pdir.y < 0) {
            playerDirection = 'up';
            facing = 1;
          } else if (pdir.y > 0) {
            playerDirection = 'down';
            facing = 1;
          }
          const directionFrames = playerFrames[playerDirection];
          const frameIndex = isMoving ? Math.floor(time / 95) % directionFrames.length : 0;
          const frameKey = `${playerDirection}-${frameIndex}`;
          if (playerImg.dataset.frame !== frameKey) {
            playerImg.src = directionFrames[frameIndex];
            playerImg.dataset.frame = frameKey;
          }
          playerImg.style.transform = `scaleX(${facing})`;

          const elapsed = time - startTime;
          const scatter = Math.floor(elapsed / 1000) % 8 < 3;
          const playerCell = { c: Math.floor(pcx), r: Math.floor(pcy) };
          for (const cat of cats) {
            const cellC = Math.floor(cat.cx);
            const cellR = Math.floor(cat.cy);
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
          timerEl.textContent = `⏱ ${Math.ceil(remaining / 1000)}s`;
          if (remaining <= 0) return cleanup(true);

          requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
      });
    }
  }

  window.GatosMinigame = {
    play(options = {}) {
      return GatosMinigame.play(options);
    },
  };
})();
