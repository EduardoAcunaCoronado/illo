(function () {
  const cacheBust = (path) => `${path}?v=${Date.now()}`;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  class KetchupMinigame {
    constructor(options = {}) {
      this.options = options;
    }

    static play(options = {}) {
      return new KetchupMinigame(options).play();
    }

    play() {
      const enemyMaxHp = this.options.enemyHp || this.options.zipHp || 360;
      const playerMaxLives = this.options.maxHits || this.options.lives || 3;
      const ketchupIcon = cacheBust('assets/minigames/ketchup.png');
      const chiliIcon = cacheBust('assets/minigames/chili.png');
      const zipIcon = cacheBust('assets/characters/zip/ketchup/zip.png');
      const playerFrame = (index) => cacheBust(`assets/characters/samu/ketchup/${index}.png`);
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
          </div>
          <div class="minigame-field ketchup-boss-field" id="mg-field">
            <div class="ketchup-boss-enemy" id="ketchup-boss-enemy"><img src="${zipIcon}" alt="Zip" draggable="false"></div>
            <div class="mg-player ketchup-player" id="mg-player"><img src="${playerFrames.idle[0]}" alt="Samu" draggable="false"></div>
          </div>
          <div class="ketchup-player-hud">
            <span class="ketchup-player-lives"></span>
            <span class="ketchup-player-help">Mueve con ← ↑ ↓ → o WASD · Espacio dispara <img class="mg-inline-icon" src="${chiliIcon}" alt="guindilla"></span>
          </div>
        `;
        document.getElementById('game-container').appendChild(overlay);

        const field = overlay.querySelector('#mg-field');
        const player = overlay.querySelector('#mg-player');
        const playerImg = player.querySelector('img');
        const boss = overlay.querySelector('#ketchup-boss-enemy');
        const bossFill = overlay.querySelector('.ketchup-boss-fill');
        const livesEl = overlay.querySelector('.ketchup-player-lives');

        let enemyHp = enemyMaxHp;
        let playerLives = playerMaxLives;
        let playerX = 0.5;
        let playerY = 0.86;
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
        };
        const swallowClick = (e) => e.stopPropagation();

        document.addEventListener('keydown', keyDown);
        document.addEventListener('keyup', keyUp);
        window.addEventListener('blur', blur);
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
          shots.push({ el, x: playerX, y: playerY - 0.085, speed: 0.95, damage: 12 });
        };

        const fireEnemyBullet = (x, y, vx, vy, size = 34) => {
          const el = makeSprite('ketchup-enemy-shot', ketchupIcon, x, y, size);
          enemyBullets.push({ el, x, y, vx, vy, size });
        };

        const firePattern = () => {
          const pattern = patternIndex % 4;
          patternIndex++;
          if (pattern === 0) {
            for (let i = -2; i <= 2; i++) {
              fireEnemyBullet(enemyX + i * 0.055, enemyY + 0.09, i * 0.018, 0.36, 32);
            }
            patternTimer = 0.78;
            return;
          }
          if (pattern === 1) {
            const baseAngle = Math.atan2(playerY - enemyY, playerX - enemyX);
            for (let i = -2; i <= 2; i++) {
              const angle = baseAngle + i * 0.18;
              fireEnemyBullet(enemyX, enemyY + 0.08, Math.cos(angle) * 0.25, Math.sin(angle) * 0.25, 30);
            }
            patternTimer = 0.95;
            return;
          }
          if (pattern === 2) {
            const startX = patternIndex % 2 === 0 ? 0.16 : 0.84;
            const dir = startX < 0.5 ? 1 : -1;
            for (let i = 0; i < 7; i++) {
              fireEnemyBullet(startX + dir * i * 0.075, 0.08, dir * 0.035, 0.31 + i * 0.008, 28);
            }
            patternTimer = 0.86;
            return;
          }
          for (let i = 0; i < 8; i++) {
            const x = 0.12 + i * 0.11;
            if (Math.abs(x - playerX) < 0.06) continue;
            fireEnemyBullet(x, 0.04, 0, 0.34, 28);
          }
          patternTimer = 0.7;
        };

        const cleanup = (won) => {
          running = false;
          document.removeEventListener('keydown', keyDown);
          document.removeEventListener('keyup', keyUp);
          window.removeEventListener('blur', blur);

          if (musicAudio) {
            musicAudio.pause();
            musicAudio.currentTime = 0;
          }

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

          const moveSpeed = 0.58;
          let moveX = 0;
          let moveY = 0;
          if (state.moveLeft) moveX -= 1;
          if (state.moveRight) moveX += 1;
          if (state.moveUp) moveY -= 1;
          if (state.moveDown) moveY += 1;
          if (moveX !== 0 || moveY !== 0) {
            const moveLength = Math.hypot(moveX, moveY);
            playerX = clamp(playerX + (moveX / moveLength) * moveSpeed * dt, playerMinX, playerMaxX);
            playerY = clamp(playerY + (moveY / moveLength) * moveSpeed * dt, playerMinY, playerMaxY);
          }

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
          updateEnemyPos();

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
            shootCooldown = 0.28;
          }

          patternTimer -= dt;
          if (patternTimer <= 0) firePattern();

          for (let i = shots.length - 1; i >= 0; i--) {
            const shot = shots[i];
            shot.y -= shot.speed * dt;
            shot.el.style.top = `${shot.y * 100}%`;
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
              playerLives--;
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
})();
