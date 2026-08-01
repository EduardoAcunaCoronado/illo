(function () {
  const DEFAULT_IMAGES = [
    "assets/backgrounds/pisito.png",
    "assets/backgrounds/iglesia_furrielva_v2_4k.png",
    "assets/backgrounds/kingdom_ketchup_trono.png",
    "assets/backgrounds/coche_interior.png",
    "assets/backgrounds/skyline_eechi_land.png",
    "assets/backgrounds/multitud_entrada.png",
    "assets/backgrounds/camerino_seraphyna.png",
    "assets/backgrounds/foco_cae_santi.png",
    "assets/backgrounds/ciudad_paloma.png",
    "assets/backgrounds/entrada_epica_jose.png",
    "assets/backgrounds/plaza_circular.png",
    "assets/backgrounds/cielo_glitch_brainrot.png",
    "assets/backgrounds/plaza_cicular_meme_ataque_heroes.png",
    "assets/backgrounds/mazmorra_puerta_santuario_abierta.png",
    "assets/backgrounds/airi_sala_interior_santuario.png",
    "assets/backgrounds/fuente_ciudad_paloma.png",
    "assets/backgrounds/airi_protege_a_samu_de_ballerina.png",
    "assets/backgrounds/ataque_brainrot_airi_corrupcion.png",
    "assets/backgrounds/paseo_ciudad_paloma.png",
    "assets/backgrounds/ultimo_vistazo_ciudad_paloma.png",
    "assets/backgrounds/ultimo_vistazo_ciudad_paloma_mariposa.png",
  ];

  const DEFAULT_MUSIC = "assets/sounds/music/cae_a_mis_pies.wav";
  const cacheBust = (path) => `${path}?v=${Date.now()}`;

  function ensureStyles() {
    if (document.getElementById("credits-minigame-styles")) return;
    const style = document.createElement("style");
    style.id = "credits-minigame-styles";
    style.textContent = `
      .credits-minigame {
        position: fixed;
        inset: 0;
        z-index: 1500;
        overflow: hidden;
        background: #03020a;
        color: #fff;
        font-family: Arial, Helvetica, sans-serif;
      }
      .credits-bg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        opacity: 0;
        transform: scale(1);
        transition: opacity 1200ms ease;
        z-index: 0;
      }
      .credits-bg.is-visible {
        opacity: 1;
        transform: scale(1);
      }
      .credits-shade {
        position: absolute;
        inset: 0;
        z-index: 2;
        background:
          linear-gradient(180deg, rgba(0,0,0,0.5), transparent 35%, rgba(0,0,0,0.72)),
          radial-gradient(circle at 50% 45%, transparent 30%, rgba(0,0,0,0.62) 100%);
        pointer-events: none;
      }
      .credits-content {
        position: absolute;
        inset: auto 0 46px 0;
        display: grid;
        gap: 12px;
        justify-items: center;
        padding: 0 30px;
        text-align: center;
        text-shadow: 0 3px 18px rgba(0,0,0,0.9);
      }
      .credits-title {
        margin: 0;
        color: #9fdcff;
        font-size: clamp(24px, 5vw, 54px);
        letter-spacing: 0;
      }
      .credits-caption {
        max-width: 760px;
        margin: 0;
        color: #eef6ff;
        font-size: clamp(15px, 2vw, 22px);
        line-height: 1.45;
      }
      .credits-thanks {
        position: absolute;
        inset: 0;
        z-index: 3;
        display: grid;
        place-items: center;
        padding: 40px;
        background: rgba(2, 2, 10, 0.82);
        opacity: 0;
        pointer-events: none;
        transition: opacity 900ms ease;
        text-align: center;
      }
      .credits-thanks.is-visible {
        opacity: 1;
      }
      .credits-thanks h2 {
        margin: 0;
        color: #fff;
        font-size: clamp(34px, 7vw, 82px);
        letter-spacing: 0;
        text-shadow: 0 0 28px rgba(255,255,255,0.55);
      }
      .credits-skip {
        position: absolute;
        bottom: 22px;
        right: 26px;
        z-index: 4;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.45);
        color: rgba(255, 255, 255, 0.85);
        cursor: pointer;
        font-size: 14px;
        font-weight: 400;
        letter-spacing: 0.05em;
        padding: 6px 14px;
        user-select: none;
        animation: credits-skip-pulse 2.4s ease-in-out infinite;
      }
      .credits-skip:hover {
        opacity: 0.95;
      }
      @keyframes credits-skip-pulse {
        0%, 100% { opacity: 0.35; }
        50% { opacity: 0.9; }
      }
    `;
    document.head.appendChild(style);
  }

  class CreditsMinigame {
    constructor(options = {}) {
      this.options = options;
      this.images = Array.isArray(options.images) && options.images.length > 0
        ? options.images
        : DEFAULT_IMAGES;
      this.music = options.music || options.path || DEFAULT_MUSIC;
      this.message = options.message || "Gracias por jugar";
      this.overlay = null;
      this.audio = null;
      this.timers = [];
      this.resolve = null;
      this.finished = false;
      this.activeBgIndex = 0;
      this.hasActiveImage = false;
      this.transitionTimer = null;
    }

    play() {
      ensureStyles();
      return new Promise((resolve) => {
        this.resolve = resolve;
        this.render();
        this.startAudio();
        this.startSequence();
      });
    }

    render() {
      this.overlay = document.createElement("div");
      this.overlay.className = "credits-minigame";
      this.overlay.innerHTML = `
        <img class="credits-bg credits-bg-a" alt="">
        <img class="credits-bg credits-bg-b" alt="">
        <div class="credits-shade"></div>
        <button class="credits-skip" type="button">Clic para saltar ▶▶</button>
        <section class="credits-thanks">
          <h2>${this.escape(this.message)}</h2>
        </section>
      `;
      document.getElementById("game-container").appendChild(this.overlay);
      this.overlay
        .querySelector(".credits-skip")
        .addEventListener("click", () => this.finish());
    }

    startAudio() {
      this.audio = new Audio(this.music);
      this.audio.volume = this.options.volume == null ? 0.75 : this.options.volume;
      this.audio.addEventListener("ended", () => this.finish());
      this.audio.play().catch(() => {
        this.scheduleFallback();
      });
    }

    startSequence() {
      this.showImage(0);
      const begin = () => {
        if (this.finished) return;
        const durationMs = Number.isFinite(this.audio.duration)
          ? this.audio.duration * 1000
          : (this.options.duration || 90000);
        const thanksMs = this.options.thanksDuration || 6500;
        const imageWindow = Math.max(8000, durationMs - thanksMs);
        const step = Math.max(3500, imageWindow / this.images.length);

        this.images.forEach((_, index) => {
          if (index === 0) return;
          this.timers.push(setTimeout(() => this.showImage(index), step * index));
        });
        this.timers.push(setTimeout(() => this.showThanks(), imageWindow));
        this.timers.push(setTimeout(() => this.finish(), durationMs + 400));
      };

      if (this.audio.readyState >= 1) begin();
      else {
        this.audio.addEventListener("loadedmetadata", begin, { once: true });
        this.timers.push(setTimeout(begin, 1200));
      }
    }

    scheduleFallback() {
      if (this.finished) return;
      const durationMs = this.options.duration || 90000;
      this.timers.push(setTimeout(() => this.finish(), durationMs));
    }

    showImage(index) {
      if (!this.overlay || this.finished) return;
      const imagePath = cacheBust(this.images[index % this.images.length]);
      const image = new Image();
      image.onload = () => this.crossfadeTo(imagePath);
      image.onerror = () => this.crossfadeTo(imagePath);
      image.src = imagePath;
    }

    crossfadeTo(imagePath) {
      if (!this.overlay || this.finished) return;
      const backgrounds = this.overlay.querySelectorAll(".credits-bg");
      if (!this.hasActiveImage) {
        const firstBg = backgrounds[this.activeBgIndex];
        firstBg.src = imagePath;
        firstBg.style.zIndex = "1";
        requestAnimationFrame(() => firstBg.classList.add("is-visible"));
        this.hasActiveImage = true;
        return;
      }

      const nextIndex = this.activeBgIndex === 0 ? 1 : 0;
      const currentBg = backgrounds[this.activeBgIndex];
      const nextBg = backgrounds[nextIndex];

      nextBg.classList.remove("is-visible");
      nextBg.style.zIndex = "1";
      currentBg.style.zIndex = "0";
      nextBg.src = imagePath;
      nextBg.offsetHeight;
      requestAnimationFrame(() => nextBg.classList.add("is-visible"));
      if (this.transitionTimer) clearTimeout(this.transitionTimer);
      this.transitionTimer = setTimeout(() => {
        if (!this.overlay || this.finished) return;
        currentBg.classList.remove("is-visible");
        this.transitionTimer = null;
      }, 1250);
      this.activeBgIndex = nextIndex;
    }

    showThanks() {
      if (!this.overlay || this.finished) return;
      this.overlay.querySelector(".credits-thanks").classList.add("is-visible");
    }

    finish() {
      if (this.finished) return;
      this.finished = true;
      if (this.transitionTimer) clearTimeout(this.transitionTimer);
      this.timers.forEach((timer) => clearTimeout(timer));
      this.timers = [];
      if (this.audio) {
        try {
          this.audio.pause();
          this.audio.currentTime = 0;
        } catch (e) {}
      }
      if (this.overlay) this.overlay.remove();
      if (this.resolve) this.resolve(true);
    }

    escape(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }
  }

  window.CreditsMinigame = {
    play(options = {}) {
      return new CreditsMinigame(options).play();
    },
    defaultImages: DEFAULT_IMAGES,
  };
})();
