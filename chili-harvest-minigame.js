(function () {
  const ASSET_VERSION = '20260802-chili-harvest-1';
  const cacheBust = (path) => `${path}?v=${ASSET_VERSION}`;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
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

  class ChiliHarvestMinigame {
    constructor(options = {}) {
      this.options = options;
    }

    static play(options = {}) {
      return new ChiliHarvestMinigame(options).play();
    }

    async play() {
      const rawDuration = Number(this.options.duration) || 22000;
      const duration = rawDuration <= 120 ? rawDuration * 1000 : rawDuration;
      const powerGoal = Number(this.options.powerGoal) || 28;
      const spawnRate = Number(this.options.spawnRate) || 1.35;
      const speedMult = Number(this.options.speedMult) || 1.25;
      const chiliChance = this.options.chiliChance !== undefined ? Number(this.options.chiliChance) : 0.72;
      const allowMouse = this.options.allowMouse !== false;
      const chiliIcon = cacheBust('assets/images/minigames/chapter2/ketchup/chili_v2.png');
      const ketchupIcon = cacheBust('assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_gold.png');
      const corruptIcon = cacheBust('assets/images/minigames/chapter2/ketchup/kingdom_ketchup_bottle_corrupted.png');
      const playerIcon = cacheBust('assets/images/minigames/chapter2/common/samu_player.png');
      const factoryBackground = cacheBust(
        'assets/images/backgrounds/chapter2/kingdom_ketchup/kingdom_ketchup_production_floor_corrupted_v2_4k.png',
      );

      await preloadImages([
        chiliIcon,
        ketchupIcon,
        corruptIcon,
        playerIcon,
        cacheBust('assets/images/characters/edu/edu_picante_wide_transparent.png'),
        cacheBust('assets/images/characters/samu/samu_charred_closed.png'),
        cacheBust('assets/images/characters/samu/samu_charred_whiteeyes.png'),
        factoryBackground,
      ]);

      return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'minigame-overlay chili-harvest-minigame';
        overlay.innerHTML = `
          <div class="minigame-hud chili-harvest-hud">
            <span class="mg-score"><img class="mg-hud-icon" src="${chiliIcon}" alt="guindilla"><span class="mg-score-text">0</span></span>
            <span class="chili-power-wrap"><span>PODER PICANTE</span><span class="chili-power-bar"><i></i></span></span>
            <span class="mg-timer">${Math.ceil(duration / 1000)} s</span>
          </div>
          <div class="minigame-field" id="mg-field" style="--ketchup-factory:url('${factoryBackground}')">
            <div class="mg-player" id="mg-player"><img src="${playerIcon}" alt="Samu" draggable="false"></div>
            <div class="mg-phase-banner is-showing">¡Reúne picante para debilitar a Zip!</div>
          </div>
          <div class="minigame-instructions">Mueve con ← → / A D${allowMouse ? ' o el ratón' : ''}. Recoge guindillas; las botellas te hacen perder una.</div>
        `;
        document.getElementById('game-container').appendChild(overlay);

        const field = overlay.querySelector('#mg-field');
        const player = overlay.querySelector('#mg-player');
        const scoreEl = overlay.querySelector('.mg-score-text');
        const timerEl = overlay.querySelector('.mg-timer');
        const powerFill = overlay.querySelector('.chili-power-bar i');
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
          timerEl.textContent = `${Math.max(0, Math.ceil(remaining / 1000))} s`;
          powerFill.style.width = `${clamp((score / powerGoal) * 100, 0, 100)}%`;
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
          if (key === 'arrowleft' || key === 'a') moveLeft = true;
          if (key === 'arrowright' || key === 'd') moveRight = true;
          if (key.startsWith('arrow')) event.preventDefault();
        };
        const keyUp = (event) => {
          const key = event.key.toLowerCase();
          if (key === 'arrowleft' || key === 'a') moveLeft = false;
          if (key === 'arrowright' || key === 'd') moveRight = false;
        };
        const mouseMove = (event) => {
          const rect = fieldRect();
          playerX = clamp((event.clientX - rect.left) / rect.width, 0.04, 0.96);
          updatePlayer();
        };
        const swallowClick = (event) => event.stopPropagation();
        document.addEventListener('keydown', keyDown);
        document.addEventListener('keyup', keyUp);
        if (allowMouse) field.addEventListener('mousemove', mouseMove);
        overlay.addEventListener('click', swallowClick, true);

        const detachControls = () => {
          document.removeEventListener('keydown', keyDown);
          document.removeEventListener('keyup', keyUp);
          if (allowMouse) field.removeEventListener('mousemove', mouseMove);
          overlay.removeEventListener('click', swallowClick, true);
        };

        const spawnItem = () => {
          const good = Math.random() < chiliChance;
          const corrupt = !good && Math.random() < 0.45;
          const type = good ? 'chili' : (corrupt ? 'corrupt' : 'ketchup');
          const icon = good ? chiliIcon : (corrupt ? corruptIcon : ketchupIcon);
          const el = document.createElement('div');
          el.className = `mg-item mg-item-${type}`;
          el.innerHTML = `<img src="${icon}" alt="${good ? 'guindilla' : 'botella de ketchup'}" draggable="false">`;
          const x = 0.05 + Math.random() * 0.9;
          el.style.left = `${x * 100}%`;
          el.style.top = '-10%';
          field.appendChild(el);
          items.push({
            el,
            x,
            y: -0.1,
            speed: (0.28 + Math.random() * 0.22) * speedMult,
            good,
          });
        };

        const cleanup = () => {
          if (!running) return;
          running = false;
          detachControls();
          items.forEach((item) => item.el.remove());
          items = [];
          const result = document.createElement('div');
          result.className = 'minigame-result';
          result.textContent = `¡${score} guindillas reunidas!`;
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
          const dt = Math.min((time - lastTime) / 1000, 0.05);
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
            const caught = item.y >= 0.80 && item.y <= 0.98 && Math.abs(item.x - playerX) < 0.075;
            if (caught) {
              if (item.good) {
                score++;
                player.classList.add('chili-caught');
                setTimeout(() => player.classList.remove('chili-caught'), 120);
              } else {
                score = Math.max(0, score - 1);
                field.classList.add('mg-hit');
                setTimeout(() => field.classList.remove('mg-hit'), 200);
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
  }

  window.ChiliHarvestMinigame = {
    play(options = {}) {
      return ChiliHarvestMinigame.play(options);
    },
  };
})();
