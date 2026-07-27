(function () {
  const cacheBust = (path) => `${path}?v=${Date.now()}`;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const RUNES = [
    {
      id: "samu",
      key: "a",
      name: "Samu",
      role: "Magia",
      color: "#ff4f5f",
      image: "assets/minigames/runa_samu.png",
    },
    {
      id: "edu",
      key: "s",
      name: "Edu",
      role: "Velocidad",
      color: "#4fd0ff",
      image: "assets/minigames/runa_edu.png",
    },
    {
      id: "tony",
      key: "d",
      name: "Seraphyna",
      role: "Sanación",
      color: "#ff69b4",
      image: "assets/minigames/runa_tony.png",
    },
    {
      id: "jose",
      key: "f",
      name: "José",
      role: "Fuerza",
      color: "#7cff8b",
      image: "assets/minigames/runa_jose.png",
    },
  ];

  class RuneChannelingMinigame {
    constructor(options = {}) {
      this.options = options;
      this.levels = options.levels || 7;
      this.level = 1;
      this.holdRequired = options.holdRequired || 1.35;
      this.stableTime = 0;
      this.integrity = 100;
      this.keys = new Set();
      this.running = false;
      this.lastTime = 0;
      this.resolve = null;
      this.rafId = null;
      this.runes = [];
    }

    static play(options = {}) {
      return new RuneChannelingMinigame(options).play();
    }

    play() {
      return new Promise((resolve) => {
        this.resolve = resolve;
        this.render();
        this.startLevel(1);
        this.bindEvents();
        this.running = true;
        this.lastTime = performance.now();
        this.rafId = requestAnimationFrame((time) => this.tick(time));
      });
    }

    render() {
      this.overlay = document.createElement("div");
      this.overlay.className = "minigame-overlay rune-channeling-minigame";
      this.overlay.innerHTML = `
        <style>${RuneChannelingMinigame.styles()}</style>
        <div class="rc-hud">
          <span class="rc-level">Nivel 1 / ${this.levels}</span>
          <span class="rc-status">Equilibra los cuatro poderes</span>
          <span class="rc-integrity">Estabilidad 100%</span>
        </div>
        <div class="rc-board">
          ${RUNES.map(
            (rune) => `
              <section class="rc-rune" data-rune="${rune.id}" style="--rune-color: ${rune.color}">
                <div class="rc-rune-top">
                  <img class="rc-rune-icon" src="${cacheBust(rune.image)}" alt="">
                  <div>
                    <strong>${rune.name}</strong>
                    <span>${rune.role}</span>
                  </div>
                </div>
                <div class="rc-meter" aria-hidden="true">
                  <span class="rc-zone"></span>
                  <span class="rc-value"></span>
                </div>
                <button class="rc-key" type="button" data-key="${rune.key}">${rune.key.toUpperCase()}</button>
              </section>
            `,
          ).join("")}
        </div>
        <div class="minigame-instructions">
          Mantén A · S · D · F para accionar cada poder y suelta para dejarlo ceder. Magia, velocidad, sanación y fuerza deben quedar en equilibrio.
        </div>
      `;
      document.getElementById("game-container").appendChild(this.overlay);
    }

    bindEvents() {
      this.onKeyDown = (event) => {
        const key = event.key.toLowerCase();
        if (!RUNES.some((rune) => rune.key === key)) return;
        event.preventDefault();
        this.keys.add(key);
      };
      this.onKeyUp = (event) => {
        this.keys.delete(event.key.toLowerCase());
      };
      this.onBlur = () => this.keys.clear();
      this.onPointerDown = (event) => {
        const button = event.target.closest(".rc-key");
        if (!button) return;
        event.preventDefault();
        this.keys.add(button.dataset.key);
      };
      this.onPointerUp = () => this.keys.clear();
      this.swallowClick = (event) => event.stopPropagation();

      document.addEventListener("keydown", this.onKeyDown);
      document.addEventListener("keyup", this.onKeyUp);
      window.addEventListener("blur", this.onBlur);
      this.overlay.addEventListener("pointerdown", this.onPointerDown);
      document.addEventListener("pointerup", this.onPointerUp);
      this.overlay.addEventListener("click", this.swallowClick, true);
    }

    startLevel(level) {
      this.level = level;
      this.stableTime = 0;
      const progress = this.levels > 1 ? (level - 1) / (this.levels - 1) : 0;
      const startZoneHalfWidth = 8.5;
      const endZoneHalfWidth = 3.5;
      this.zoneHalfWidth =
        startZoneHalfWidth - (startZoneHalfWidth - endZoneHalfWidth) * progress;
      const speed = 11 + level * 2.2;
      this.runes = RUNES.map((rune, index) => ({
        ...rune,
        value: 18 + Math.random() * 64,
        velocity: 0,
        drift: speed * (0.78 + Math.random() * 0.42),
        target: 24 + Math.random() * 52,
      }));
      this.updateHud();
      this.updateVisuals();
      this.message(`Nivel ${level}: cada poder busca su propio equilibrio.`);
    }

    tick(time) {
      if (!this.running) return;
      const dt = Math.min((time - this.lastTime) / 1000, 0.04);
      this.lastTime = time;
      this.update(dt);
      this.updateVisuals();
      this.rafId = requestAnimationFrame((nextTime) => this.tick(nextTime));
    }

    update(dt) {
      let allStable = true;
      const push = 58 + this.level * 4.5;
      const gravity = 72 + this.level * 5.4;

      this.runes.forEach((rune) => {
        const pressing = this.keys.has(rune.key);
        const driftNoise = Math.sin(performance.now() / 520 + rune.value) * 3.2;
        const acceleration = pressing ? push : -gravity;
        rune.velocity += acceleration * dt;
        rune.velocity += driftNoise * dt;
        rune.velocity *= Math.pow(0.88, dt * 60);
        rune.value += (rune.velocity + rune.drift * 0.18) * dt;

        if (pressing) {
          this.integrity -= rune.value > 82 ? 8 * dt : 0;
        } else {
          this.integrity -= rune.value < 18 ? 8 * dt : 0;
        }

        if (rune.value <= 0 || rune.value >= 100) {
          rune.value = clamp(rune.value, 0, 100);
          rune.velocity *= -0.55;
          this.integrity -= 11 * dt;
        }

        const distance = Math.abs(rune.value - rune.target);
        if (distance > this.zoneHalfWidth) allStable = false;
        if (distance > 32) this.integrity -= (distance - 32) * 0.11 * dt;
      });

      this.integrity = clamp(this.integrity, 0, 100);

      if (allStable) {
        this.stableTime += dt;
        if (this.stableTime >= this.holdRequired) this.completeLevel();
      } else {
        this.stableTime = Math.max(0, this.stableTime - dt * 1.25);
      }

      if (this.integrity <= 0) this.finish(false);
      this.updateHud();
    }

    completeLevel() {
      if (this.level >= this.levels) {
        this.finish(true);
        return;
      }
      this.playTone(880, 0.08, "triangle", 0.08);
      this.startLevel(this.level + 1);
    }

    updateVisuals() {
      const stableHeight = this.zoneHalfWidth * 2;
      this.overlay.querySelectorAll(".rc-rune").forEach((card, index) => {
        const rune = this.runes[index];
        if (!rune) return;
        const stable = Math.abs(rune.value - rune.target) <= this.zoneHalfWidth;
        const stableMin = rune.target - this.zoneHalfWidth;
        card.classList.toggle("is-pressed", this.keys.has(rune.key));
        card.classList.toggle("is-stable", stable);
        card.classList.toggle("is-danger", Math.abs(rune.value - 50) > 34);
        card.querySelector(".rc-value").style.bottom = `${rune.value}%`;
        const zone = card.querySelector(".rc-zone");
        zone.style.bottom = `${stableMin}%`;
        zone.style.height = `${stableHeight}%`;
      });
    }

    updateHud() {
      this.overlay.querySelector(".rc-level").textContent =
        `Nivel ${this.level} / ${this.levels}`;
      this.overlay.querySelector(".rc-integrity").textContent =
        `Estabilidad ${Math.ceil(this.integrity)}%`;
      const progress = Math.round(
        clamp((this.stableTime / this.holdRequired) * 100, 0, 100),
      );
      this.overlay.querySelector(".rc-status").textContent =
        progress > 0
          ? `Sello alineado ${progress}%`
          : "Equilibra los cuatro poderes";
    }

    message(text) {
      const status = this.overlay.querySelector(".rc-status");
      status.textContent = text;
    }

    playTone(freq, dur, type, volume) {
      if (!window.AudioContext && !window.webkitAudioContext) return;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + dur + 0.02);
        setTimeout(() => ctx.close(), (dur + 0.08) * 1000);
      } catch (error) {}
    }

    finish(won) {
      if (!this.running) return;
      this.running = false;
      cancelAnimationFrame(this.rafId);
      this.cleanupEvents();
      const result = document.createElement("div");
      result.className = "minigame-result";
      result.textContent = won
        ? "¡Los mecanismos del santuario quedan en equilibrio!"
        : "¡Los poderes se descompensaron!";
      this.overlay.appendChild(result);
      this.playTone(won ? 1046 : 180, won ? 0.16 : 0.24, won ? "triangle" : "sawtooth", won ? 0.08 : 0.06);
      setTimeout(() => {
        this.overlay.remove();
        this.resolve(won);
      }, won ? 1500 : 900);
    }

    cleanupEvents() {
      document.removeEventListener("keydown", this.onKeyDown);
      document.removeEventListener("keyup", this.onKeyUp);
      window.removeEventListener("blur", this.onBlur);
      this.overlay.removeEventListener("pointerdown", this.onPointerDown);
      document.removeEventListener("pointerup", this.onPointerUp);
      this.overlay.removeEventListener("click", this.swallowClick, true);
    }

    static styles() {
      return `
        .rune-channeling-minigame {
          background:
            radial-gradient(circle at 50% 46%, rgba(95, 210, 255, 0.20), transparent 34%),
            radial-gradient(circle at 50% 78%, rgba(123, 255, 178, 0.16), transparent 42%),
            linear-gradient(180deg, rgba(6, 8, 24, 0.96), rgba(8, 5, 18, 0.98));
          color: #fff7df;
          font-family: 'Outfit', Arial, Helvetica, sans-serif;
        }
        .rc-hud {
          position: absolute;
          left: 42px;
          right: 42px;
          top: 26px;
          z-index: 2;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
          padding: 12px 16px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 12px;
          background: rgba(8, 7, 26, 0.80);
          box-shadow: 0 0 28px rgba(79, 208, 255, 0.18);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 900;
        }
        .rc-level { color: #ffd166; }
        .rc-status { color: #9fe6ff; text-align: center; }
        .rc-integrity { color: #7cffb2; }
        .rc-board {
          position: absolute;
          inset: 96px 42px 82px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }
        .rc-rune {
          --rune-color: #9fe6ff;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          gap: 14px;
          min-width: 0;
          padding: 16px;
          border: 1px solid color-mix(in srgb, var(--rune-color) 42%, transparent);
          border-radius: 14px;
          background: linear-gradient(180deg, rgba(18, 16, 44, 0.88), rgba(6, 6, 20, 0.90));
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05), 0 0 22px color-mix(in srgb, var(--rune-color) 16%, transparent);
          transition: filter 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
        }
        .rc-rune.is-pressed {
          filter: brightness(1.14);
          border-color: color-mix(in srgb, var(--rune-color) 80%, #ffffff);
        }
        .rc-rune.is-stable {
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 0 30px color-mix(in srgb, var(--rune-color) 38%, transparent);
        }
        .rc-rune.is-danger {
          border-color: rgba(255, 91, 103, 0.78);
        }
        .rc-rune-top {
          display: grid;
          grid-template-columns: 58px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          text-transform: uppercase;
        }
        .rc-rune-icon {
          width: 58px;
          height: 58px;
          object-fit: contain;
          filter: drop-shadow(0 0 10px color-mix(in srgb, var(--rune-color) 42%, transparent));
        }
        .rc-rune-top strong,
        .rc-rune-top span {
          display: block;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rc-rune-top strong { font-size: 18px; color: #fff7df; }
        .rc-rune-top span { margin-top: 3px; font-size: 12px; color: rgba(255, 247, 223, 0.72); }
        .rc-meter {
          position: relative;
          width: 70px;
          justify-self: center;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255, 91, 103, 0.20), rgba(255, 255, 255, 0.08) 50%, rgba(255, 91, 103, 0.20));
          overflow: hidden;
          box-shadow: inset 0 0 22px rgba(0, 0, 0, 0.55);
        }
        .rc-zone {
          position: absolute;
          left: 0;
          right: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.72);
          border-bottom: 1px solid rgba(255, 255, 255, 0.72);
          background: color-mix(in srgb, var(--rune-color) 34%, transparent);
          box-shadow: 0 0 22px color-mix(in srgb, var(--rune-color) 42%, transparent);
        }
        .rc-value {
          position: absolute;
          left: 50%;
          width: 56px;
          height: 10px;
          transform: translate(-50%, 50%);
          border-radius: 999px;
          background: #fff;
          box-shadow:
            0 0 10px #fff,
            0 0 20px var(--rune-color),
            0 0 34px var(--rune-color);
        }
        .rc-key {
          justify-self: center;
          width: 72px;
          height: 48px;
          border: 1px solid color-mix(in srgb, var(--rune-color) 52%, transparent);
          border-radius: 10px;
          background: color-mix(in srgb, var(--rune-color) 14%, rgba(0, 0, 0, 0.72));
          color: #fff;
          cursor: pointer;
          font: inherit;
          font-size: 20px;
          font-weight: 900;
          box-shadow: 0 0 14px color-mix(in srgb, var(--rune-color) 20%, transparent);
        }
        .rc-rune.is-pressed .rc-key {
          background: color-mix(in srgb, var(--rune-color) 44%, rgba(0, 0, 0, 0.42));
          transform: translateY(2px);
        }
        .rune-channeling-minigame .minigame-instructions {
          position: absolute;
          left: 42px;
          right: 42px;
          bottom: 24px;
        }
      `;
    }
  }

  window.RuneChannelingMinigame = RuneChannelingMinigame;
})();
