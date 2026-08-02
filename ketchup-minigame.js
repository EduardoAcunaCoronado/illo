(function () {
  const ASSET_VERSION = '20260803-ketchup-9';
  const REGULAR_KETCHUP_DAMAGE = 1;
  const CORRUPT_KETCHUP_DAMAGE = 2;
  const cacheBust = (path) => `${path}?v=${ASSET_VERSION}`;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (from, to, amount) => from + (to - from) * amount;
  const preloadImages = (sources) => Promise.all(
    [...new Set(sources)].map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.decoding = 'async';
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
          if (img.decode) img.decode().then(resolve).catch(resolve);
        }),
    ),
  );

  class KetchupMinigame {
    constructor(options = {}) {
      this.options = options;
    }

    static play(options = {}) {
      return new KetchupMinigame(options).play();
    }

    async play() {
      const enemyMaxHp = this.options.enemyHp || this.options.zipHp || 700;
      const startAtHpRatio = this.options.startAtHpRatio != null ? Number(this.options.startAtHpRatio) : null;
      const startEnemyHp = this.options.startEnemyHp != null
        ? Number(this.options.startEnemyHp)
        : (startAtHpRatio != null ? enemyMaxHp * startAtHpRatio : enemyMaxHp);
      const playerMaxLives = this.options.maxHits || this.options.lives || 3;
      const spicePower = Math.max(0, Number(this.options.spicePower) || 0);
      const maxSpicePower = Math.max(1, Number(this.options.maxSpicePower) || 40);
      const powerRatio = clamp(spicePower / maxSpicePower, 0, 1);
      const shotDamage = lerp(8, 19, powerRatio);
      const shotCooldownMax = lerp(0.34, 0.2, powerRatio);
      const enemyBulletSpeed = lerp(1.18, 0.82, powerRatio);
      const enemyAttackDelay = lerp(0.82, 1.42, powerRatio);
      const difficulty = powerRatio >= 0.72 ? 'SUAVE' : powerRatio >= 0.38 ? 'NORMAL' : 'INTENSA';
      const allowMouse = this.options.allowMouse !== false;
      const ketchupIcon = cacheBust('assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_gold.webp');
      const corruptKetchupIcon = cacheBust('assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_corrupted.webp');
      const chiliIcon = cacheBust('assets/images/minigames/chapter2/ketchup/chili_v2.webp');
      const zipIcon = cacheBust('assets/images/characters/zip/ketchup/zip_1.webp');
      const zipAngryIcon = cacheBust('assets/images/characters/others/zip_angry.webp');
      const zipPhaseFrame = (index) => cacheBust(`assets/images/characters/zip/ketchup/zip_${index}.webp`);
      const zipPhaseFrames = [
        zipPhaseFrame(1),
        zipPhaseFrame(2),
        zipPhaseFrame(3),
        zipPhaseFrame(4),
        zipPhaseFrame(5),
        zipPhaseFrame(4),
        zipPhaseFrame(5),
        zipPhaseFrame(4),
        zipPhaseFrame(5),
        zipPhaseFrame(1),
      ];
      const zipFloatingFrame = (index) => cacheBust(`assets/images/characters/zip/ketchup/zip_flotando_${index}.webp`);
      const zipFloatingFrames = [
        zipFloatingFrame(1),
        zipFloatingFrame(2),
        zipFloatingFrame(3),
        zipFloatingFrame(2),
        zipFloatingFrame(1),
      ];
      const playerFrame = (index) => cacheBust(`assets/images/characters/samu/ketchup/${index}.webp`);
      const playerFrames = {
        idle: [playerFrame(1), playerFrame(3)],
        right: [playerFrame(1), playerFrame(2), playerFrame(3), playerFrame(4)],
        left: [playerFrame(3), playerFrame(4), playerFrame(1), playerFrame(2)],
        up: [playerFrame(1), playerFrame(2), playerFrame(3), playerFrame(4)],
        down: [playerFrame(3), playerFrame(4), playerFrame(1), playerFrame(2)],
        shoot: [playerFrame(1), playerFrame(5), playerFrame(3), playerFrame(6)],
        shootIdle: [playerFrame(3), playerFrame(8), playerFrame(1), playerFrame(7)],
        default: [playerFrame(1), playerFrame(3)],
      };
      const musicTrack = this.options.music;
      const criticalAssetsToPreload = [
        ketchupIcon,
        corruptKetchupIcon,
        chiliIcon,
        zipIcon,
        zipAngryIcon,
        zipFloatingFrames[0],
        ...playerFrames.idle,
      ];
      const secondaryAssetsToPreload = [
        ...zipPhaseFrames,
        ...zipFloatingFrames.slice(1),
        ...Object.values(playerFrames).flat(),
      ];

      await preloadImages(criticalAssetsToPreload);
      const preloadSecondaryAssets = () => preloadImages(secondaryAssetsToPreload);
      if (window.requestIdleCallback) {
        window.requestIdleCallback(preloadSecondaryAssets, { timeout: 1200 });
      } else {
        window.setTimeout(preloadSecondaryAssets, 0);
      }

      return new Promise((resolve) => {
        let musicAudio = null;
        if (musicTrack) {
          musicAudio = new Audio(musicTrack);
          musicAudio.loop = true;
          musicAudio.volume = 0.6;
          musicAudio.play().catch(() => {});
        }

        const overlay = document.createElement('div');
        overlay.className = 'minigame-overlay ketchup-boss-minigame';
        overlay.innerHTML = `
          <div class="ketchup-boss-hud">
            <div class="ketchup-boss-name">Zip</div>
            <div class="ketchup-boss-bar"><span class="ketchup-boss-fill"></span></div>
            <div class="ketchup-spice-status">
              <span>Picante: <strong>${spicePower}</strong></span>
              <span class="ketchup-spice-meter"><i style="width:${powerRatio * 100}%"></i></span>
              <span>Dificultad: <strong>${difficulty}</strong></span>
              ${this.options.hasChiliBox ? '<span class="ketchup-neit-bonus">+ caja de Neit</span>' : ''}
            </div>
          </div>
          <div class="minigame-field ketchup-boss-field" id="mg-field">
            <div class="ketchup-special-warning" id="ketchup-special-warning">
              <img src="${zipAngryIcon}" alt="" draggable="false">
              <span>WARNING</span>
            </div>
            <div class="ketchup-boss-enemy" id="ketchup-boss-enemy">
              <img class="ketchup-boss-frame ketchup-boss-frame-primary" src="${zipFloatingFrames[0]}" alt="Zip" draggable="false">
              <img class="ketchup-boss-frame ketchup-boss-frame-next" src="${zipFloatingFrames[0]}" alt="" draggable="false">
            </div>
            <div class="mg-player ketchup-player" id="mg-player"><img src="${playerFrames.idle[0]}" alt="Samu" draggable="false"></div>
          </div>
          <div class="ketchup-player-hud">
            <span class="ketchup-player-lives"></span>
            <span class="ketchup-player-help">Mueve con ← ↑ ↓ → / WASD${allowMouse ? ' o ratón' : ''} · Espacio dispara <img class="mg-inline-icon" src="${chiliIcon}" alt="guindilla"></span>
          </div>
        `;
        document.getElementById('game-container').appendChild(overlay);

        const field = overlay.querySelector('#mg-field');
        const player = overlay.querySelector('#mg-player');
        const playerImg = player.querySelector('img');
        const boss = overlay.querySelector('#ketchup-boss-enemy');
        const bossImg = boss.querySelector('.ketchup-boss-frame-primary');
        const bossNextImg = boss.querySelector('.ketchup-boss-frame-next');
        const bossFill = overlay.querySelector('.ketchup-boss-fill');
        const livesEl = overlay.querySelector('.ketchup-player-lives');
        const specialWarning = overlay.querySelector('#ketchup-special-warning');

        let enemyHp = clamp(Number.isFinite(startEnemyHp) ? startEnemyHp : enemyMaxHp, 1, enemyMaxHp);
        let playerLives = playerMaxLives;
        let playerX = 0.5;
        let playerY = 0.86;
        let mouseTargetX = playerX;
        let mouseTargetY = playerY;
        let mouseActive = false;
        let enemyX = 0.5;
        let enemyY = 0.18;
        let enemyDir = 1;
        let enemyMoveTimer = 0;
        const playerW = 0.095;
        const playerH = 0.135;
        const playerHitW = 0.052;
        const playerHitH = 0.074;
        const playerMinX = playerW * 0.55;
        const playerMaxX = 1 - playerW * 0.55;
        const playerMinY = 0.52;
        const playerMaxY = 0.93;
        const shots = [];
        const enemyBullets = [];
        let running = true;
        let lastTime = null;
        let patternTimer = 0.35;
        let patternIndex = 0;
        let shootCooldown = 0;
        let playerInvuln = 0;
        let playerPattern = 'idle';
        let bossFrameIndex = 0;
        let bossFrameTimer = 0;
        let bossFrameKey = zipFloatingFrames[0];
        let bossCrossfadeTimer = null;
        let bossIsFloating = true;
        let specialAttackTimer = 2.2 * enemyAttackDelay;
        let specialWarningTimer = 0;
        let specialWarningActive = false;
        let phaseAnimationTimer = 1.6;
        let phaseAnimationFrameTimer = 0;
        let phaseAnimationIndex = 0;
        let phaseAnimationActive = false;
        let phaseAnimationQueued = false;
        let specialSequenceActive = false;
        let specialSequenceTimer = 0;
        let spiralSpawnTimer = 0;
        let spiralAngle = 0;
        let spiralWave = 0;

        const state = {
          moveLeft: false,
          moveRight: false,
          moveUp: false,
          moveDown: false,
          shooting: false,
          keyboardDirection: 0,
        };

        const updatePlayerPos = () => {
          player.style.left = `${playerX * 100}%`;
          player.style.top = `${playerY * 100}%`;
        };
        const updateEnemyPos = () => {
          boss.style.left = `${enemyX * 100}%`;
          boss.style.top = `${enemyY * 100}%`;
        };
        const updateHud = () => {
          bossFill.style.width = `${clamp(enemyHp / enemyMaxHp, 0, 1) * 100}%`;
          livesEl.textContent = '❤️'.repeat(Math.max(0, playerLives));
        };

        const setBossFrame = (frame) => {
          if (bossFrameKey === frame) return;
          bossFrameKey = frame;
          window.clearTimeout(bossCrossfadeTimer);
          bossNextImg.src = frame;
          boss.classList.add('is-crossfading');
          bossCrossfadeTimer = window.setTimeout(() => {
            bossImg.src = frame;
            boss.classList.remove('is-crossfading');
          }, 180);
        };

        updatePlayerPos();
        updateEnemyPos();
        updateHud();

        const keyDown = (e) => {
          const key = e.key.toLowerCase();
          if (key === 'arrowleft' || key === 'a') {
            state.moveLeft = true;
            state.keyboardDirection = -1;
          }
          if (key === 'arrowright' || key === 'd') {
            state.moveRight = true;
            state.keyboardDirection = 1;
          }
          if (key === 'arrowup' || key === 'w') state.moveUp = true;
          if (key === 'arrowdown' || key === 's') state.moveDown = true;
          if (key === ' ') {
            state.shooting = true;
            e.preventDefault();
          }
          if (key.startsWith('arrow')) e.preventDefault();
        };
        const keyUp = (e) => {
          const key = e.key.toLowerCase();
          if (key === 'arrowleft' || key === 'a') {
            state.moveLeft = false;
            if (state.keyboardDirection === -1) state.keyboardDirection = state.moveRight ? 1 : 0;
          }
          if (key === 'arrowright' || key === 'd') {
            state.moveRight = false;
            if (state.keyboardDirection === 1) state.keyboardDirection = state.moveLeft ? -1 : 0;
          }
          if (key === 'arrowup' || key === 'w') state.moveUp = false;
          if (key === 'arrowdown' || key === 's') state.moveDown = false;
          if (key === ' ') {
            state.shooting = false;
            e.preventDefault();
          }
          if (key.startsWith('arrow')) e.preventDefault();
        };
        const blur = () => {
          state.moveLeft = false;
          state.moveRight = false;
          state.moveUp = false;
          state.moveDown = false;
          state.shooting = false;
          state.keyboardDirection = 0;
          mouseActive = false;
        };
        const pointerMove = (e) => {
          if (!allowMouse) return;
          const rect = field.getBoundingClientRect();
          mouseTargetX = clamp((e.clientX - rect.left) / rect.width, playerMinX, playerMaxX);
          mouseTargetY = clamp((e.clientY - rect.top) / rect.height, playerMinY, playerMaxY);
          mouseActive = true;
        };
        const pointerLeave = () => {
          mouseActive = false;
        };
        const swallowClick = (e) => e.stopPropagation();

        document.addEventListener('keydown', keyDown);
        document.addEventListener('keyup', keyUp);
        window.addEventListener('blur', blur);
        if (allowMouse) {
          field.addEventListener('pointermove', pointerMove);
          field.addEventListener('pointerleave', pointerLeave);
        }
        overlay.addEventListener('click', swallowClick, true);

        const makeSprite = (className, icon, x, y, size = 34) => {
          const el = document.createElement('div');
          el.className = className;
          el.style.left = `${x * 100}%`;
          el.style.top = `${y * 100}%`;
          el.style.setProperty('--shot-size', `${size}px`);
          const img = document.createElement('img');
          img.src = icon;
          img.alt = '';
          img.draggable = false;
          el.appendChild(img);
          field.appendChild(el);
          return el;
        };

        const shoot = () => {
          const el = makeSprite('mg-shot', chiliIcon, playerX, playerY - 0.085, 32);
          shots.push({
            el,
            x: playerX,
            y: playerY - 0.085,
            speed: lerp(0.9, 1.18, powerRatio),
            damage: shotDamage,
          });
        };

        const fireEnemyBullet = (x, y, vx, vy, size = 34, options = {}) => {
          const corrupt = options.corrupt === true;
          const el = makeSprite(
            `ketchup-enemy-shot${corrupt ? ' is-corrupt' : ''}`,
            corrupt ? corruptKetchupIcon : ketchupIcon,
            x,
            y,
            size,
          );
          enemyBullets.push({
            el,
            x,
            y,
            vx: vx * enemyBulletSpeed,
            vy: vy * enemyBulletSpeed,
            size,
            damage: corrupt ? CORRUPT_KETCHUP_DAMAGE : REGULAR_KETCHUP_DAMAGE,
          });
        };

        const fireSpiralShieldBurst = () => {
          const centerX = enemyX;
          const centerY = enemyY + 0.08;
          const arms = 3;
          spiralWave++;
          for (let arm = 0; arm < arms; arm++) {
            const angle = spiralAngle + arm * ((Math.PI * 2) / arms) + spiralWave * 0.09;
            const radius = 0.025 + (spiralWave % 9) * 0.014;
            fireEnemyBullet(
              centerX + Math.cos(angle) * radius,
              centerY + Math.sin(angle) * radius,
              Math.cos(angle) * (0.17 + radius * 0.9),
              Math.sin(angle) * (0.17 + radius * 0.9),
              30,
              { corrupt: true, blocksShots: true },
            );
          }
          spiralAngle += 0.42;
        };

        const fireSpecialAttack = () => {
          const centerX = enemyX;
          const centerY = enemyY + 0.08;
          for (let i = 0; i < 24; i++) {
            const angle = (Math.PI * 2 * i) / 24;
            fireEnemyBullet(
              centerX,
              centerY,
              Math.cos(angle) * 0.34,
              Math.sin(angle) * 0.34,
              28,
              { corrupt: true },
            );
          }
          [
            { vx: 0, vy: 0.48 },
            { vx: -0.26, vy: 0.42 },
            { vx: 0.26, vy: 0.42 },
          ].forEach((ray) => {
            for (let i = 0; i < 10; i++) {
              fireEnemyBullet(
                centerX + ray.vx * i * 0.085,
                centerY + ray.vy * i * 0.085,
                ray.vx,
                ray.vy,
                i % 2 === 0 ? 34 : 26,
              );
            }
          });
          specialSequenceActive = true;
          specialSequenceTimer = 2.7;
          spiralSpawnTimer = 0.08;
          spiralAngle = Math.atan2(playerY - centerY, playerX - centerX) + Math.PI * 0.45;
          spiralWave = 0;
        };

        const updateSpecialSequence = (dt) => {
          if (!specialSequenceActive) return;
          specialSequenceTimer -= dt;
          spiralSpawnTimer -= dt;
          while (spiralSpawnTimer <= 0 && specialSequenceTimer > 0) {
            fireSpiralShieldBurst();
            spiralSpawnTimer += 0.085;
          }
          if (specialSequenceTimer <= 0) {
            specialSequenceActive = false;
            if (playerLives > 0) {
              phaseAnimationQueued = true;
              phaseAnimationTimer = 0.35;
            }
          }
        };

        const resetPhaseAnimation = () => {
          phaseAnimationActive = false;
          phaseAnimationQueued = false;
          phaseAnimationIndex = 0;
          phaseAnimationFrameTimer = 0;
          phaseAnimationTimer = 3.4;
          setBossFrame(zipIcon);
        };

        const updatePhaseAnimation = (dt) => {
          if (!phaseAnimationQueued && !phaseAnimationActive) return;
          if (playerLives <= 0) return;
          if (specialWarningActive) return;
          if (!phaseAnimationActive) {
            phaseAnimationTimer -= dt;
            if (phaseAnimationTimer > 0) return;
            phaseAnimationActive = true;
            phaseAnimationIndex = 0;
            phaseAnimationFrameTimer = 0;
          }

          phaseAnimationFrameTimer -= dt;
          if (phaseAnimationFrameTimer > 0) return;

          setBossFrame(zipPhaseFrames[phaseAnimationIndex]);
          phaseAnimationIndex++;
          phaseAnimationFrameTimer = 0.16;

          if (phaseAnimationIndex >= zipPhaseFrames.length) {
            phaseAnimationActive = false;
            phaseAnimationQueued = false;
            phaseAnimationIndex = 0;
            phaseAnimationTimer = 0;
          }
        };

        const startSpecialWarning = () => {
          resetPhaseAnimation();
          specialWarningActive = true;
          specialWarningTimer = 1;
          specialWarning.classList.add('is-visible');
        };

        const finishSpecialWarning = () => {
          specialWarningActive = false;
          specialWarning.classList.remove('is-visible');
          fireSpecialAttack();
          specialAttackTimer = 5.8 * enemyAttackDelay;
          patternTimer = 1.15 * enemyAttackDelay;
        };

        const firePattern = () => {
          const pattern = patternIndex % 6;
          patternIndex++;
          if (pattern === 0) {
            for (let i = -2; i <= 2; i++) {
              fireEnemyBullet(enemyX + i * 0.055, enemyY + 0.09, i * 0.018, 0.36, 32);
            }
            patternTimer = 0.78 * enemyAttackDelay;
            return;
          }
          if (pattern === 1) {
            const baseAngle = Math.atan2(playerY - enemyY, playerX - enemyX);
            for (let i = -2; i <= 2; i++) {
              const angle = baseAngle + i * 0.18;
              fireEnemyBullet(enemyX, enemyY + 0.08, Math.cos(angle) * 0.25, Math.sin(angle) * 0.25, 30);
            }
            patternTimer = 0.95 * enemyAttackDelay;
            return;
          }
          if (pattern === 2) {
            const centerX = enemyX;
            const centerY = enemyY + 0.08;
            const bullets = 16;
            const offset = (patternIndex % 2) * (Math.PI / bullets);
            for (let i = 0; i < bullets; i++) {
              const angle = offset + (Math.PI * 2 * i) / bullets;
              fireEnemyBullet(centerX, centerY, Math.cos(angle) * 0.28, Math.sin(angle) * 0.28, 26);
            }
            patternTimer = 1.05 * enemyAttackDelay;
            return;
          }
          if (pattern === 3) {
            const centerX = enemyX;
            const centerY = enemyY + 0.08;
            const rays = [
              { vx: 0, vy: 0.39 },
              { vx: -0.21, vy: 0.34 },
              { vx: 0.21, vy: 0.34 },
            ];
            rays.forEach((ray) => {
              for (let i = 0; i < 6; i++) {
                fireEnemyBullet(
                  centerX + ray.vx * i * 0.13,
                  centerY + ray.vy * i * 0.13,
                  ray.vx,
                  ray.vy,
                  i % 2 === 0 ? 30 : 24,
                );
              }
            });
            patternTimer = 1.12 * enemyAttackDelay;
            return;
          }
          if (pattern === 4) {
            const startX = patternIndex % 2 === 0 ? 0.16 : 0.84;
            const dir = startX < 0.5 ? 1 : -1;
            for (let i = 0; i < 7; i++) {
              fireEnemyBullet(startX + dir * i * 0.075, 0.08, dir * 0.035, 0.31 + i * 0.008, 28);
            }
            patternTimer = 0.86 * enemyAttackDelay;
            return;
          }
          for (let i = 0; i < 8; i++) {
            const x = 0.12 + i * 0.11;
            if (Math.abs(x - playerX) < 0.06) continue;
            fireEnemyBullet(x, 0.04, 0, 0.34, 28);
          }
          patternTimer = 0.7 * enemyAttackDelay;
        };

        const cleanup = (won) => {
          running = false;
          document.removeEventListener('keydown', keyDown);
          document.removeEventListener('keyup', keyUp);
          window.removeEventListener('blur', blur);
          if (allowMouse) {
            field.removeEventListener('pointermove', pointerMove);
            field.removeEventListener('pointerleave', pointerLeave);
          }

          if (musicAudio) {
            musicAudio.pause();
            musicAudio.currentTime = 0;
          }
          window.clearTimeout(bossCrossfadeTimer);
          specialWarning.classList.remove('is-visible');

          shots.forEach((shot) => shot.el.remove());
          enemyBullets.forEach((bullet) => bullet.el.remove());
          shots.length = 0;
          enemyBullets.length = 0;

          const result = document.createElement('div');
          result.className = 'minigame-result';
          result.textContent = won
            ? '¡Zip no soporta las guindillas de Samu!'
            : '¡Samu acaba cubierto de ketchup!';
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

          shootCooldown = Math.max(0, shootCooldown - dt);
          playerInvuln = Math.max(0, playerInvuln - dt);

          const moveSpeed = 0.42;
          let moveX = 0;
          let moveY = 0;
          if (state.moveLeft) moveX -= 1;
          if (state.moveRight) moveX += 1;
          if (state.moveUp) moveY -= 1;
          if (state.moveDown) moveY += 1;
          if (moveX !== 0 || moveY !== 0) {
            mouseActive = false;
            const moveLength = Math.hypot(moveX, moveY);
            playerX = clamp(playerX + (moveX / moveLength) * moveSpeed * dt, playerMinX, playerMaxX);
            playerY = clamp(playerY + (moveY / moveLength) * moveSpeed * dt, playerMinY, playerMaxY);
            mouseTargetX = playerX;
            mouseTargetY = playerY;
          } else if (mouseActive) {
            const mouseEase = 1 - Math.pow(0.02, dt);
            playerX = clamp(lerp(playerX, mouseTargetX, mouseEase), playerMinX, playerMaxX);
            playerY = clamp(lerp(playerY, mouseTargetY, mouseEase), playerMinY, playerMaxY);
          }

          const shouldFloat = enemyHp / enemyMaxHp > 0.6;
          if (shouldFloat) {
            enemyMoveTimer -= dt;
            if (enemyMoveTimer <= 0) {
              enemyMoveTimer = 0.9 + Math.random() * 1.1;
              enemyDir = Math.random() < 0.5 ? -1 : 1;
            }
            enemyX += enemyDir * (0.13 + Math.sin(time / 430) * 0.035) * dt;
            if (enemyX < 0.16 || enemyX > 0.84) {
              enemyX = clamp(enemyX, 0.16, 0.84);
              enemyDir *= -1;
            }
            bossIsFloating = true;
            bossFrameTimer -= dt;
            if (bossFrameTimer <= 0) {
              setBossFrame(zipFloatingFrames[bossFrameIndex]);
              bossFrameIndex = (bossFrameIndex + 1) % zipFloatingFrames.length;
              bossFrameTimer = 0.24;
            }
          } else if (bossIsFloating) {
            bossIsFloating = false;
            setBossFrame(zipIcon);
            phaseAnimationTimer = 1.6;
          }
          updateEnemyPos();

          if (!shouldFloat) {
            if (specialWarningActive) {
              specialWarningTimer -= dt;
              if (specialWarningTimer <= 0) finishSpecialWarning();
            } else {
              specialAttackTimer -= dt;
              if (specialAttackTimer <= 0) startSpecialWarning();
            }
            updateSpecialSequence(dt);
            updatePhaseAnimation(dt);
          }

          const isMoving = state.moveLeft || state.moveRight || state.moveUp || state.moveDown;
          if (state.shooting) playerPattern = isMoving ? 'shoot' : 'shootIdle';
          else if (state.keyboardDirection > 0) playerPattern = 'right';
          else if (state.keyboardDirection < 0) playerPattern = 'left';
          else if (state.moveUp) playerPattern = 'up';
          else if (state.moveDown) playerPattern = 'down';
          else playerPattern = 'idle';
          const animationFrames = playerFrames[playerPattern] || playerFrames.default;
          const movingPattern = ['left', 'right', 'up', 'down', 'shoot', 'shootIdle'].includes(playerPattern);
          const frameDuration = movingPattern ? 100 : 300;
          const frameIndex = Math.floor(time / frameDuration) % animationFrames.length;
          const frameKey = `${playerPattern}-${frameIndex}`;
          if (playerImg.dataset.frame !== frameKey) {
            playerImg.src = animationFrames[frameIndex];
            playerImg.dataset.frame = frameKey;
          }
          updatePlayerPos();

          if (state.shooting && shootCooldown <= 0) {
            shoot();
            shootCooldown = shotCooldownMax;
          }

          if (!specialWarningActive && !specialSequenceActive) {
            patternTimer -= dt;
            if (patternTimer <= 0) firePattern();
          }

          for (let i = shots.length - 1; i >= 0; i--) {
            const shot = shots[i];
            shot.y -= shot.speed * dt;
            shot.el.style.top = `${shot.y * 100}%`;
            let blocked = false;
            for (let j = enemyBullets.length - 1; j >= 0; j--) {
              const bullet = enemyBullets[j];
              if (!bullet.blocksShots) continue;
              const blockRange = Math.max(0.03, (bullet.size || 30) / 1280);
              if (Math.abs(shot.x - bullet.x) < blockRange && Math.abs(shot.y - bullet.y) < blockRange) {
                shot.el.remove();
                shots.splice(i, 1);
                blocked = true;
                break;
              }
            }
            if (blocked) continue;
            const hitBoss = Math.abs(shot.x - enemyX) < 0.1 && Math.abs(shot.y - enemyY) < 0.13;
            if (hitBoss) {
              enemyHp = Math.max(0, enemyHp - shot.damage);
              updateHud();
              boss.classList.add('is-hit');
              setTimeout(() => boss.classList.remove('is-hit'), 90);
              shot.el.remove();
              shots.splice(i, 1);
              continue;
            }
            if (shot.y < -0.1) {
              shot.el.remove();
              shots.splice(i, 1);
            }
          }

          for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const bullet = enemyBullets[i];
            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;
            bullet.el.style.left = `${bullet.x * 100}%`;
            bullet.el.style.top = `${bullet.y * 100}%`;
            const hitPlayer =
              playerInvuln <= 0 &&
              Math.abs(bullet.x - playerX) < playerHitW * 0.5 &&
              Math.abs(bullet.y - playerY) < playerHitH * 0.5;
            if (hitPlayer) {
              playerLives = Math.max(0, playerLives - bullet.damage);
              playerInvuln = 0.85;
              player.classList.add('is-hit');
              setTimeout(() => player.classList.remove('is-hit'), 220);
              updateHud();
              bullet.el.remove();
              enemyBullets.splice(i, 1);
              continue;
            }
            if (bullet.y > 1.12 || bullet.x < -0.1 || bullet.x > 1.1) {
              bullet.el.remove();
              enemyBullets.splice(i, 1);
            }
          }

          if (enemyHp <= 0) return cleanup(true);
          if (playerLives <= 0) return cleanup(false);

          requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
      });
    }
  }

  window.KetchupMinigame = {
    play(options = {}) {
      return KetchupMinigame.play(options);
    },
  };
  // Alias conservado para las escenas creadas antes de integrar la versión de master.
  window.KetchupBossMinigame = window.KetchupMinigame;
})();
