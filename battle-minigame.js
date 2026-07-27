(function () {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const cacheBust = (path) => `${path}?v=${Date.now()}`;
  const STATUS_ICONS = {
    shield: { icon: "🛡️", direction: "up" },
    speed_up: { icon: "⚡", direction: "up" },
    evasion_up: { icon: "💨", direction: "up" },
    attack_up: { icon: "⚔️", direction: "up" },
    speed_down: { icon: "⚡", direction: "down" },
    attack_down: { icon: "⚔️", direction: "down" },
    taunt: { icon: "🎯" },
  };

  // Objeto que Seraphyna le cuelga a Samu al final del capítulo 3. Se decidió en
  // la demo del 25-jul-2026 que entrara como consumible del combate final: el
  // engine lo añade a los objetos de partida cuando el jugador lo lleva encima.
  // Reutiliza el tipo "revive_three" (la misma mecánica que la Bendición de
  // Airi) pero con su propio nombre y su propio texto.
  const DIAPASON = {
    id: "diapason_de_plata",
    name: "Diapasón de plata",
    description:
      "El diapasón de Seraphyna. Golpéalo y escucha: la nota limpia devuelve al grupo la mitad de su HP y PM, y levanta a quien haya caído.",
    type: "revive_three",
    target: "auto",
  };

  // Extra opcional que se enciende desde Configuración (menú principal). No
  // entra en el equilibrio normal del combate: es un atajo para saltarse una
  // pelea, así que se reparte a to el equipo y no cuesta PM.
  const KOSAI_SETTING_KEY = "illo_kosai";
  const KOSAI = {
    id: "ataque_kosai",
    name: "Ataque Kosai",
    pmCost: 0,
    type: "execute",
    element: "physical",
    power: 0,
    target: "enemy",
    unavoidable: true,
    description: "Deja al objetivo a 0 PV de un solo golpe. No falla.",
  };
  const kosaiEnabled = () => {
    try {
      return localStorage.getItem(KOSAI_SETTING_KEY) === "1";
    } catch (error) {
      return false; // localStorage capado: el extra simplemente no aparece
    }
  };

  const ALLIES = [
    {
      id: "samu",
      name: "Samu",
      color: "red",
      role: "Mago",
      portrait: "assets/characters/samu/samu_hud_battle_1.png",
      hp: 120,
      pm: 120,
      speed: 8,
      evasion: 0.08,
      defense: 6,
      skills: [
        {
          id: "bola_de_fuego",
          name: "Bola de fuego",
          pmCost: 8,
          type: "damage",
          element: "fire",
          power: 40,
          target: "enemy",
          description:
            "Lanza una esfera de fuego contra el enemigo. Buen daño mágico por 8 PM.",
        },
        {
          id: "escarcha",
          name: "Escarcha",
          pmCost: 10,
          type: "damage_speed_down",
          element: "ice",
          power: 50,
          speedModifier: -2,
          duration: 2,
          target: "enemy",
          description:
            "Inflige daño de hielo y reduce la velocidad del enemigo durante 2 turnos.",
        },
        {
          id: "relampago",
          name: "Relámpago",
          pmCost: 12,
          type: "damage",
          element: "lightning",
          power: 60,
          target: "enemy",
          description:
            "Golpea al enemigo con un rayo potente. Alto daño por 10 PM.",
        },
        {
          id: "rafaga_arcana",
          name: "Ráfaga arcana",
          pmCost: 0,
          type: "damage",
          element: "arcane",
          power: 30,
          target: "enemy",
          description:
            "Ataque mágico básico. Hace daño moderado y no consume PM.",
        },
      ],
    },
    {
      id: "edu",
      name: "Edu",
      color: "blue",
      role: "Pícaro / Arcano",
      portrait: "assets/characters/edu/edu_hud_battle_1.png",
      hp: 105,
      pm: 80,
      speed: 14,
      evasion: 0.18,
      defense: 5,
      skills: [
        {
          id: "robar",
          name: "Robar",
          pmCost: 0,
          type: "steal",
          element: "physical",
          power: 0,
          target: "enemy",
          accuracy: 0.75,
          description:
            "Tiene un 75% de acierto antes de la evasión. Roba el objeto único del enemigo.",
        },
        {
          id: "prisa",
          name: "Prisa",
          pmCost: 10,
          type: "ally_speed_up",
          element: "lightning",
          power: 0,
          speedModifier: 4,
          duration: 2,
          target: "ally",
          description:
            "Aumenta la velocidad del aliado elegido durante 2 turnos.",
        },
        {
          id: "doble_ilusorio",
          name: "Doble ilusorio",
          pmCost: 12,
          type: "ally_evasion_up",
          element: "arcane",
          power: 0,
          evasionModifier: 0.35,
          duration: 2,
          target: "ally",
          description:
            "Aumenta mucho la evasión del aliado elegido durante 2 turnos.",
        },
        {
          id: "corte_relampago",
          name: "Corte relámpago",
          pmCost: 0,
          type: "damage",
          element: "lightning",
          power: 30,
          target: "enemy",
          description:
            "Un corte eléctrico rápido. Hace 30 de poder y no consume PM.",
        },
      ],
    },
    {
      id: "seraphyne",
      name: "Seraphyna",
      speakingAs: "Tony",
      color: "#ff69b4",
      role: "Maga Blanca / Cantora",
      portrait: "assets/characters/tony/tony_hud_battle_1.png",
      hp: 95,
      pm: 130,
      speed: 10,
      evasion: 0.1,
      defense: 4,
      skills: [
        {
          id: "cura",
          name: "Cura",
          pmCost: 8,
          type: "heal",
          element: "holy",
          power: 45,
          target: "ally",
          description: "Restaura 45 HP al aliado elegido por 8 PM.",
        },
        {
          id: "escudo",
          name: "Escudo",
          pmCost: 10,
          type: "ally_shield",
          element: "holy",
          power: 0,
          damageReduction: 0.4,
          duration: 2,
          target: "ally",
          description:
            "Reduce un 40% el daño recibido por el aliado elegido durante 2 turnos.",
        },
        {
          id: "canto_sanador",
          name: "Canto sanador",
          pmCost: 0,
          type: "party_heal",
          element: "holy_music",
          power: 10,
          target: "all_allies",
          description: "Cura 10 HP a cada miembro del equipo. No consume PM.",
        },
        {
          id: "canto_debilitante",
          name: "Canto debilitante",
          pmCost: 0,
          type: "attack_down",
          element: "music",
          power: 0,
          attackModifier: -3,
          duration: 2,
          target: "enemy",
          accuracy: 0.75,
          description:
            "Tiene un 75% de acierto antes de la evasión. Reduce el poder ofensivo del enemigo durante 2 turnos. No causa daño.",
        },
      ],
    },
    {
      id: "jose",
      name: "José",
      color: "green",
      role: "Guerrero",
      portrait: "assets/characters/jose/jose_hud_battle_1.png",
      hp: 170,
      pm: 60,
      speed: 6,
      evasion: 0.05,
      defense: 12,
      skills: [
        {
          id: "golpe_pesado",
          name: "Golpe pesado",
          pmCost: 0,
          type: "damage",
          element: "physical",
          power: 40,
          target: "enemy",
          description:
            "Golpe contundente con la gran espada. Buen daño y no consume PM.",
        },
        {
          id: "grito_alentador",
          name: "Grito alentador",
          pmCost: 6,
          type: "ally_attack_up",
          element: "physical",
          power: 0,
          attackModifier: 6,
          duration: 2,
          target: "ally",
          description:
            "Aumenta el ataque del aliado elegido durante 2 turnos por 6 PM.",
        },
        {
          id: "provocar",
          name: "Provocar",
          pmCost: 0,
          type: "taunt",
          element: "physical",
          power: 0,
          duration: 1,
          target: "enemy",
          description: "Obliga al enemigo a atacar a José en su próximo turno.",
        },
        {
          id: "embestida_de_piyon",
          name: "Embestida de Piyón",
          pmCost: 12,
          type: "damage",
          element: "physical",
          power: 70,
          target: "enemy",
          description: "Carga brutal de alto daño contra el enemigo por 12 PM.",
        },
      ],
    },
  ];

  const ENEMIES = {
    marea_fans: {
      id: "marea_fans",
      name: "Marea de Fans Coléricos",
      role: "Horda glitcheada",
      image: "assets/characters/marea_fans_battle_1.png",
      background: "assets/backgrounds/fans_desmadrandose.png",
      hp: 9999,
      pm: 999,
      speed: 14,
      evasion: 0.08,
      defense: 6,
      finalAttackPattern: {
        normalTurnsBeforeCharge: 2,
        warningText: "¡La marea entera se encabrita y coge carrerilla!",
      },
      skills: [
        {
          id: "zarpazo_glitch",
          name: "Zarpazo glitcheado",
          pmCost: 0,
          type: "damage",
          power: 27,
          target: "ally",
          accuracy: 0.88,
        },
        {
          id: "alarido_corrupto",
          name: "Alarido corrupto",
          pmCost: 0,
          type: "mp_damage",
          power: 11,
          mpDamage: 15,
          target: "ally",
          accuracy: 0.9,
        },
        {
          id: "oleada",
          name: "Oleada de cuerpos",
          pmCost: 0,
          type: "multi_damage",
          power: 18,
          target: "all_allies",
          accuracy: 0.85,
        },
        {
          id: "tsunami_de_fans",
          name: "Tsunami de fans",
          pmCost: 0,
          type: "multi_damage",
          power: 32,
          target: "all_allies",
          accuracy: 0.8,
          isFinalAttack: true,
        },
      ],
    },
    ballerina_capuchina: {
      id: "ballerina_capuchina",
      name: "Ballerina Capuchina",
      role: "Jefa Brainrot",
      image: "assets/characters/ballerina_capuchina_battle_1.png",
      background: "assets/backgrounds/plaza_circular_agujero.png",
      hp: 420,
      pm: 80,
      speed: 14,
      evasion: 0.16,
      defense: 7,
      stealItem: {
        id: "cafe_capuccino",
        name: "Café capuccino",
        description: "Recupera 40 HP y sube la velocidad durante 2 turnos.",
        type: "heal_speed_up",
        heal: 40,
        speedModifier: 3,
        duration: 2,
        target: "ally",
      },
      finalAttackPattern: {
        normalTurnsBeforeCharge: 3,
        warningText: "Ballerina Capuchina se está preparando...",
      },
      skills: [
        {
          id: "arabesco_agresivo",
          name: "Arabesco agresivo",
          pmCost: 0,
          type: "damage",
          power: 34,
          target: "ally",
        },
        {
          id: "pirueta_capuchina",
          name: "Pirueta capuchina",
          pmCost: 8,
          type: "multi_damage",
          power: 24,
          target: "all_allies",
        },
        {
          id: "espresso_distorsionado",
          name: "Espresso distorsionado",
          pmCost: 10,
          type: "mp_damage",
          power: 18,
          mpDamage: 16,
          target: "ally",
        },
        {
          id: "grand_jete_del_caos",
          name: "Grand jeté del caos",
          pmCost: 14,
          type: "damage",
          power: 52,
          target: "ally",
          isFinalAttack: true,
        },
      ],
    },
    tralalelo_tralala: {
      id: "tralalelo_tralala",
      name: "Tralalero Tralala",
      role: "Jefe Brainrot",
      image: "assets/characters/tralalelo_tralala_battle_1.png",
      background: "assets/backgrounds/airi_sala_interior_santuario.png",
      hp: 520,
      pm: 90,
      speed: 15,
      evasion: 0.12,
      defense: 9,
      stealItem: {
        id: "sushi_de_tiburon",
        name: "Sushi de tiburón",
        description: "Recupera 45 HP y sube el ataque durante 2 turnos.",
        type: "heal_attack_up",
        heal: 45,
        attackModifier: 5,
        duration: 2,
        target: "ally",
      },
      finalAttackPattern: {
        normalTurnsBeforeCharge: 3,
        warningText: "Tralalero Tralala se está preparando...",
      },
      skills: [
        {
          id: "mordisco_tralala",
          name: "Mordisco Tralala",
          pmCost: 0,
          type: "damage",
          power: 40,
          target: "ally",
        },
        {
          id: "zapatillazo",
          name: "Zapatillazo",
          pmCost: 8,
          type: "damage_speed_down",
          power: 34,
          speedModifier: -2,
          duration: 2,
          target: "ally",
        },
        {
          id: "oleada_absurda",
          name: "Oleada absurda",
          pmCost: 12,
          type: "multi_damage",
          power: 26,
          target: "all_allies",
        },
        {
          id: "tralaleo_terminal",
          name: "Tralalero terminal",
          pmCost: 18,
          type: "multi_damage",
          power: 46,
          target: "all_allies",
          isFinalAttack: true,
        },
      ],
    },
    tung_tung_tung_sahur: {
      id: "tung_tung_tung_sahur",
      name: "Tung Tung Tung Sahur",
      role: "Lider Brainrot",
      image: "assets/characters/tung_tung_tung_sahur_battle_1.png",
      background: "assets/backgrounds/fuente_ciudad_paloma.png",
      hp: 620,
      pm: 110,
      speed: 12,
      evasion: 0.08,
      defense: 10,
      stealItem: {
        id: "sirope_de_arce",
        name: "Sirope de arce",
        description: "Recupera 35 HP y 25 PM.",
        type: "heal_pm",
        heal: 35,
        pmRestore: 25,
        target: "ally",
      },
      finalAttackPattern: {
        normalTurnsBeforeCharge: 3,
        warningText: "Tung Tung Tung Sahur se está preparando...",
      },
      skills: [
        {
          id: "golpe_tung",
          name: "Golpe Tung",
          pmCost: 0,
          type: "damage",
          power: 44,
          target: "ally",
        },
        {
          id: "tambor_sahur",
          name: "Tambor Sahur",
          pmCost: 10,
          type: "multi_damage",
          power: 28,
          target: "all_allies",
        },
        {
          id: "mirada_madera",
          name: "Mirada de madera",
          pmCost: 12,
          type: "mp_damage",
          power: 26,
          mpDamage: 20,
          target: "ally",
        },
        {
          id: "tung_tung_apocaliptico",
          name: "Tung Tung apocalíptico",
          pmCost: 20,
          type: "multi_damage",
          power: 52,
          target: "all_allies",
          isFinalAttack: true,
        },
      ],
    },
    amalgama: {
      id: "amalgama",
      name: "Amalgama",
      role: "Horror Brainrot",
      image: "assets/characters/amalgama/amalgama_base.png",
      background: "assets/backgrounds/fuente_ciudad_paloma_corrupta.png",
      hp: 840,
      pm: 140,
      speed: 8,
      evasion: 0.06,
      defense: 12,
      stealItem: {
        id: "cura_de_airi",
        name: "Cura de Airi",
        description: "Recupera toda la vida y todo el PM de un personaje.",
        type: "full_restore",
        target: "ally",
      },
      finalAttackPattern: {
        normalTurnsBeforeCharge: 3,
        warningText: "La Amalgama se está preparando...",
      },
      skills: [
        {
          id: "masa_inestable",
          name: "Masa inestable",
          pmCost: 0,
          type: "damage",
          power: 48,
          target: "ally",
        },
        {
          id: "ruido_de_internet",
          name: "Ruido de internet",
          pmCost: 14,
          type: "multi_damage",
          power: 32,
          target: "all_allies",
        },
        {
          id: "drenaje_glitch",
          name: "Drenaje glitch",
          pmCost: 16,
          type: "mp_damage",
          power: 30,
          mpDamage: 24,
          target: "ally",
        },
        {
          id: "colapso_memetico",
          name: "Partición del Cielo Negro",
          pmCost: 24,
          type: "halve_party_hp",
          power: 0,
          target: "all_allies",
          unavoidable: true,
          isFinalAttack: true,
        },
      ],
    },
    amalgama_final: {
      id: "amalgama_final",
      name: "Amalgama forma final",
      role: "Nucleo final",
      image: "assets/characters/amalgama/amalgama_final.png",
      background: "assets/backgrounds/fuente_ciudad_paloma_corrupta_total.png",
      hp: 1120,
      pm: 260,
      speed: 11,
      evasion: 0.08,
      defense: 16,
      stealItem: {
        id: "bendicion_de_airi",
        name: "Bendición de Airi",
        description:
          "Revive hasta 3 aliados caídos con el 50% de HP y PM. Los aliados en pie recuperan la mitad de su HP y PM máximos.",
        type: "revive_three",
        target: "auto",
      },
      finalAttackPattern: {
        normalTurnsBeforeCharge: 3,
        warningText: "La Amalgama forma final concentra toda la corrupción digital...",
      },
      skills: [
        {
          id: "garra_de_pixeles_muertos",
          name: "Garra de píxeles muertos",
          pmCost: 0,
          type: "damage",
          power: 58,
          target: "ally",
        },
        {
          id: "lluvia_de_memes_rotos",
          name: "Lluvia de memes rotos",
          pmCost: 18,
          type: "multi_damage",
          power: 38,
          target: "all_allies",
        },
        {
          id: "silencio_del_santuario",
          name: "Silencio del santuario",
          pmCost: 22,
          type: "mp_damage",
          power: 34,
          mpDamage: 30,
          target: "ally",
        },
        {
          id: "pulso_negro_morado",
          name: "Pulso negro morado",
          pmCost: 24,
          type: "damage_attack_down",
          power: 42,
          attackModifier: -4,
          duration: 2,
          target: "ally",
        },
        {
          id: "veredicto_del_nucleo_absoluto",
          name: "Veredicto del Núcleo Absoluto",
          pmCost: 40,
          type: "random_ally_to_one_hp",
          power: 0,
          target: "ally",
          unavoidable: true,
          isFinalAttack: true,
        },
      ],
    },
  };

  class BattleMinigame {
    constructor(options = {}) {
      this.options = options;
      this.debugStats = options.debugStats === true;
      this.enemyTemplate =
        ENEMIES[options.enemy] || ENEMIES.ballerina_capuchina;
      const configuredEnemyHp = Number(options.enemyHp);
      const enemyHp =
        Number.isFinite(configuredEnemyHp) && configuredEnemyHp > 0
          ? configuredEnemyHp
          : this.enemyTemplate.hp;
      // Modo SUPERVIVENCIA (cap. 3): aguantar N turnos enemigos en vez de matar.
      // interludes = burbujas de urgencia entre turnos [{turn, speaker, text}].
      this.surviveTurns =
        Number(options.surviveTurns) > 0 ? Number(options.surviveTurns) : 0;
      this.turnsSurvived = 0;
      this.surviveWon = false;
      this.interludes = Array.isArray(options.interludes)
        ? options.interludes
        : [];
      // Grupo configurable: options.party = ["samu","edu"] limita los aliados.
      const partyIds =
        Array.isArray(options.party) && options.party.length
          ? options.party
          : null;
      const roster = partyIds
        ? ALLIES.filter((ally) => partyIds.includes(ally.id))
        : ALLIES;
      // Kits alternativos POR BATALLA (p. ej. cap. 3: las clases aún no han
      // despertado y luchan con el entorno, alas y memes). Aditivo: sin
      // skillsOverride/roleOverride las batallas normales no cambian nada.
      const conKit = (ally) => {
        const skills = options.skillsOverride && options.skillsOverride[ally.id];
        const role = options.roleOverride && options.roleOverride[ally.id];
        if (!skills && !role) return ally;
        const copia = Object.assign({}, ally);
        if (skills) copia.skills = skills;
        if (role) copia.role = role;
        return copia;
      };
      this.allies = (roster.length ? roster : ALLIES).map((ally) =>
        this.createFighter(conKit(ally), "ally"),
      );
      // Se reparte al construir el combate, y `aplicarKosai` lo añade o lo
      // quita si se toca la casilla a mitad de pelea. Array nuevo siempre, que
      // el de ALLIES es compartido entre combates.
      if (kosaiEnabled()) {
        this.allies.forEach((ally) => {
          ally.skills = [...ally.skills, KOSAI];
        });
      }
      this.enemy = this.createFighter(
        {
          ...this.enemyTemplate,
          hp: enemyHp,
          maxHp: enemyHp,
        },
        "enemy",
      );
      this.fighters = [...this.allies, this.enemy];
      this.turnClock = new Map(this.fighters.map((fighter) => [fighter.id, 0]));
      this.activeFighter = null;
      this.selectedSkill = null;
      this.awaitingPlayer = false;
      this.awaitingTarget = false;
      this.targetSelectionToken = null;
      this.awaitingItemTarget = false;
      // Objetos con los que se ENTRA al combate (además de los que se roben).
      // El engine mete aquí el diapasón de Seraphyna si el jugador lo lleva.
      this.battleInventory = Array.isArray(options.startItems)
        ? options.startItems.map((item) => ({ ...item }))
        : [];
      this.enemyItemStolen = false;
      this.messageToken = 0;
      this.resolve = null;
    }

    createFighter(template, team) {
      return {
        ...template,
        team,
        maxHp: template.maxHp || template.hp,
        maxPm: template.pm,
        currentHp: template.hp,
        currentPm: template.pm,
        baseSpeed: template.speed,
        statuses: [],
        normalTurnsSinceFinal: 0,
        preparingFinalAttack: false,
      };
    }

    play() {
      return new Promise((resolve) => {
        this.resolve = resolve;
        this.render();
        this.ensureSurviveUi();
        this.message(
          this.surviveTurns > 0
            ? `${this.enemy.name} embiste. ¡AGUANTAD hasta que cante!`
            : `${this.enemy.name} bloquea el camino.`,
        );
        setTimeout(() => this.nextTurn(), 800);
      });
    }

    render() {
      this.overlay = document.createElement("div");
      this.overlay.className = "battle-minigame";
      this.overlay.innerHTML = `
        <div class="battle-background"></div>
        <section class="battle-skill-panel" aria-label="Habilidades">
          <div class="battle-active-name">
            <span class="battle-active-character">-</span>
            <span class="battle-active-separator" aria-hidden="true"></span>
            <span class="battle-active-role">-</span>
          </div>
          <div class="battle-skill-list"></div>
          <button class="battle-target-cancel hidden" type="button">Cancelar</button>
          <button class="battle-item-button" type="button" disabled>Objetos</button>
          <div class="battle-skill-description">Selecciona una habilidad para leer lo que hace.</div>
        </section>
        <section class="battle-order-panel" aria-label="Orden de turnos">
          <div class="battle-panel-title">ORDER</div>
          <div class="battle-order-list"></div>
        </section>
        <main class="battle-stage">
          <div class="battle-enemy-hp">
            <span class="battle-enemy-name">
              <span class="battle-enemy-name-text">${this.enemy.name}</span>
              <span class="battle-status-icons enemy"></span>
            </span>
            <div class="battle-bar"><span class="battle-hp-fill"></span></div>
            <span class="battle-enemy-numbers ${this.debugStats ? "" : "hidden"}"></span>
          </div>
          <img class="battle-enemy battle-enemy-${this.enemy.id}" src="${cacheBust(this.enemy.image)}" alt="${this.enemy.name}">
          <div class="battle-message"></div>
        </main>
        <section class="battle-party" aria-label="Equipo"></section>
      `;

      const background = this.options.background || this.enemy.background;
      this.overlay.querySelector(".battle-background").style.backgroundImage =
        `url("${cacheBust(background)}")`;
      document.getElementById("game-container").appendChild(this.overlay);
      this.bindHoverSounds();
      this.updateHud();
    }

    bindHoverSounds() {
      this.overlay.addEventListener("mouseover", (event) => {
        const target = event.target.closest("button");
        if (!target || !this.overlay.contains(target) || target.disabled) return;
        if (event.relatedTarget && target.contains(event.relatedTarget)) return;
        if (!this.isClickableHoverTarget(target)) return;
        this.playHoverSound();
      });
    }

    isClickableHoverTarget(target) {
      if (target.classList.contains("battle-ally-card")) {
        return Boolean(target.closest(".battle-party.is-targeting"));
      }
      if (target.classList.contains("battle-target-cancel")) {
        return !target.classList.contains("hidden");
      }
      if (target.classList.contains("battle-item-button")) {
        return target.classList.contains("has-items");
      }
      return true;
    }

    updateHud() {
      this.renderParty();
      this.renderEnemyHp();
      this.renderOrder();
    }

    renderParty() {
      const party = this.overlay.querySelector(".battle-party");
      party.innerHTML = this.allies
        .map(
          (ally) => `
        <button class="battle-ally-card ${ally.currentHp <= 0 ? "is-ko" : ""} ${this.activeFighter?.id === ally.id ? "is-active" : ""}" data-ally="${ally.id}" style="--ally-color: ${ally.color || "var(--battle-gold)"};" ${ally.currentHp <= 0 ? "disabled" : ""}>
          <img src="${cacheBust(ally.portrait)}" alt="${ally.name}">
          <div class="battle-ally-info">
            <strong class="battle-ally-nameplate">
              <span class="battle-status-icons ally">${this.renderStatusIcons(ally)}</span>
              <span class="battle-ally-name-text">${ally.name}</span>
            </strong>
            <div class="battle-stat hp">
              <span class="battle-stat-label">HP</span>
              <div class="battle-stat-body">
                <span class="battle-stat-value">${ally.currentHp}/${ally.maxHp}</span>
                <span class="battle-stat-bar"><span style="width: ${this.getPercent(ally.currentHp, ally.maxHp)}%"></span></span>
              </div>
            </div>
            <div class="battle-stat pm">
              <span class="battle-stat-label">PM</span>
              <div class="battle-stat-body">
                <span class="battle-stat-value">${ally.currentPm}/${ally.maxPm}</span>
                <span class="battle-stat-bar"><span style="width: ${this.getPercent(ally.currentPm, ally.maxPm)}%"></span></span>
              </div>
            </div>
          </div>
        </button>
      `,
        )
        .join("");
    }

    getPercent(current, max) {
      return max > 0 ? clamp((current / max) * 100, 0, 100) : 0;
    }

    renderStatusIcons(fighter) {
      const visualStatuses = fighter.statuses.filter(
        (status) => status.type !== "taunt",
      );
      const isTauntTarget =
        fighter.team === "ally" &&
        this.enemy.statuses.some(
          (status) =>
            status.type === "taunt" &&
            status.targetId === fighter.id &&
            status.turns > 0,
        );
      if (isTauntTarget) {
        visualStatuses.push({ type: "taunt" });
      }

      const activeTypes = [
        ...new Set(visualStatuses.map((status) => status.type)),
      ];
      return activeTypes
        .map((type) => ({ type, config: STATUS_ICONS[type] }))
        .filter((status) => status.config)
        .map(({ type, config }) => {
          const directionClass = config.direction
            ? ` is-${config.direction}`
            : "";
          const arrow = config.direction
            ? `<span class="battle-status-arrow">${config.direction === "up" ? "▲" : "▼"}</span>`
            : "";
          return `<span class="battle-status-icon ${type}${directionClass}"><span class="battle-status-symbol">${config.icon}</span>${arrow}</span>`;
        })
        .join("");
    }

    renderEnemyHp() {
      const hpPercent =
        this.enemy.maxHp > 0
          ? (this.enemy.currentHp / this.enemy.maxHp) * 100
          : 0;
      this.overlay.querySelector(".battle-hp-fill").style.width =
        `${clamp(hpPercent, 0, 100)}%`;
      this.overlay.querySelector(".battle-status-icons.enemy").innerHTML =
        this.renderStatusIcons(this.enemy);
      if (this.debugStats) {
        this.overlay.querySelector(".battle-enemy-numbers").textContent =
          `HP ${this.enemy.currentHp}/${this.enemy.maxHp} - PM ${this.enemy.currentPm}/${this.enemy.maxPm}`;
      }
    }

    renderOrder() {
      const order = this.getUpcomingOrder(8);
      const list = this.overlay.querySelector(".battle-order-list");
      list.innerHTML = order
        .map(
          (fighter, index) => `
        <div class="battle-order-entry ${fighter.team} ${index === 0 ? "is-current" : ""}">
          ${
            fighter.team === "ally"
              ? `<img class="battle-order-portrait" src="${cacheBust(fighter.portrait)}" alt="${fighter.name}">`
              : `<span class="battle-order-boss">BOSS</span>`
          }
        </div>
      `,
        )
        .join("");
    }

    renderSkills(fighter) {
      const activeName = this.overlay.querySelector(".battle-active-name");
      const skillList = this.overlay.querySelector(".battle-skill-list");
      const description = this.overlay.querySelector(
        ".battle-skill-description",
      );
      const cancelButton = this.overlay.querySelector(".battle-target-cancel");
      const itemButton = this.overlay.querySelector(".battle-item-button");
      activeName.innerHTML = `
        <span class="battle-active-character">${fighter.name}</span>
        <span class="battle-active-separator" aria-hidden="true"></span>
        <span class="battle-active-role">${fighter.role}</span>
      `;
      activeName.style.setProperty(
        "--ally-color",
        fighter.color || "var(--battle-gold)",
      );
      cancelButton.classList.add("hidden");
      cancelButton.onclick = null;
      const hasItems = this.battleInventory.length > 0;
      itemButton.disabled = !hasItems;
      itemButton.classList.toggle("has-items", hasItems);
      itemButton.textContent = "Objetos";
      itemButton.onclick = hasItems ? () => this.renderItems(fighter) : null;
      skillList.innerHTML = fighter.skills
        .map((skill, index) => {
          const disabled = fighter.currentPm < skill.pmCost;
          return `
          <button class="battle-skill-button" data-skill="${index}" ${disabled ? "disabled" : ""}>
            <span>${skill.name}</span>
            <small>${skill.pmCost} PM</small>
          </button>
        `;
        })
        .join("");
      description.textContent =
        "Selecciona una habilidad para leer lo que hace.";

      skillList.querySelectorAll(".battle-skill-button").forEach((button) => {
        const skill = fighter.skills[Number(button.dataset.skill)];
        const setDescription = () => {
          description.textContent = `${skill.description} Objetivo: ${this.getTargetText(skill.target)}.`;
        };
        button.addEventListener("mouseenter", setDescription);
        button.addEventListener("focus", setDescription);
        button.addEventListener("click", () => {
          if (button.disabled || !this.awaitingPlayer) return;
          this.selectSkill(fighter, skill);
        });
      });
    }

    // Añade o quita el Ataque Kosai a to el equipo con el combate en marcha.
    // Lo llama game.js al tocar la casilla en el menú de pausa.
    aplicarKosai(activo) {
      if (!this.overlay?.isConnected) return;

      this.allies.forEach((ally) => {
        const loTiene = ally.skills.some((skill) => skill.id === KOSAI.id);
        if (activo && !loTiene) {
          ally.skills = [...ally.skills, KOSAI];
        } else if (!activo && loTiene) {
          ally.skills = ally.skills.filter((skill) => skill.id !== KOSAI.id);
        }
      });

      // Repintar solo si lo que se ve AHORA es la lista de habilidades de un
      // aliado, aunque no sea su turno de decidir (mientras se resuelve el
      // golpe la lista sigue en pantalla y se vería desfasada).
      //
      // Se descarta en dos casos: eligiendo objetivo u objeto manda el botón de
      // cancelar, y redibujar por debajo dejaría el combate a medias; y con la
      // lista vacía (clearSkills entre turnos) repintar la sacaría antes de
      // tiempo. En ambos, el cambio se nota al volver a la lista.
      const cancelar = this.overlay.querySelector(".battle-target-cancel");
      const listaALaVista =
        this.overlay.querySelectorAll(".battle-skill-list .battle-skill-button")
          .length > 0;
      const enLaLista =
        listaALaVista &&
        !this.awaitingTarget &&
        !this.awaitingItemTarget &&
        cancelar?.classList.contains("hidden");
      if (enLaLista && this.activeFighter?.team === "ally") {
        this.renderSkills(this.activeFighter);
      }
    }

    renderItems(actor) {
      const skillList = this.overlay.querySelector(".battle-skill-list");
      const description = this.overlay.querySelector(
        ".battle-skill-description",
      );
      const cancelButton = this.overlay.querySelector(".battle-target-cancel");
      const itemButton = this.overlay.querySelector(".battle-item-button");

      cancelButton.classList.remove("hidden");
      cancelButton.onclick = () => this.renderSkills(actor);
      itemButton.disabled = true;
      itemButton.classList.remove("has-items");
      itemButton.textContent = "Objetos";
      skillList.innerHTML = this.battleInventory
        .map(
          (item, index) => `
          <button class="battle-skill-button" data-item="${index}">
            <span>${item.name}</span>
            <small>Usar</small>
          </button>
        `,
        )
        .join("");
      description.textContent =
        this.battleInventory.length > 0
          ? "Selecciona un objeto para ver su efecto."
          : "No tienes objetos.";

      skillList.querySelectorAll(".battle-skill-button").forEach((button) => {
        const item = this.battleInventory[Number(button.dataset.item)];
        button.addEventListener("mouseenter", () => {
          description.textContent = item.description;
        });
        button.addEventListener("focus", () => {
          description.textContent = item.description;
        });
        button.addEventListener("click", () => this.selectItem(actor, item));
      });
    }

    selectItem(actor, item) {
      if (!item) return;
      if (item.target === "auto") {
        this.performItemUse(actor, item, null);
        return;
      }
      this.awaitingPlayer = false;
      this.awaitingItemTarget = true;
      this.message(`Elige a quién aplicar ${item.name}.`);
      this.enableItemTargeting(actor, item);
    }

    getTargetText(target) {
      if (target === "ally") return "un aliado";
      if (target === "all_allies") return "todo el equipo";
      if (target === "self") return "uno mismo";
      return "enemigo";
    }

    getUpcomingOrder(count) {
      const snapshots = this.fighters
        .filter((fighter) => fighter.currentHp > 0)
        .map((fighter) => ({
          fighter,
          clock: this.turnClock.get(fighter.id) || 0,
        }));
      const order = [];

      for (let i = 0; i < count; i++) {
        snapshots.sort(
          (a, b) =>
            a.clock - b.clock ||
            this.getSpeed(b.fighter) - this.getSpeed(a.fighter),
        );
        const next = snapshots[0];
        order.push(next.fighter);
        next.clock += this.getTurnDelay(next.fighter);
      }

      return order;
    }

    getNextFighter() {
      const alive = this.fighters.filter((fighter) => fighter.currentHp > 0);
      alive.sort((a, b) => {
        const aClock = this.turnClock.get(a.id) || 0;
        const bClock = this.turnClock.get(b.id) || 0;
        return aClock - bClock || this.getSpeed(b) - this.getSpeed(a);
      });
      return alive[0];
    }

    advanceFighterClock(fighter) {
      this.turnClock.set(
        fighter.id,
        (this.turnClock.get(fighter.id) || 0) + this.getTurnDelay(fighter),
      );
    }

    getTurnDelay(fighter) {
      return 100 / this.getSpeed(fighter);
    }

    getSpeed(fighter) {
      return Math.max(
        1,
        fighter.baseSpeed + this.getStatusTotal(fighter, "speed"),
      );
    }

    getEvasion(fighter) {
      return clamp(
        fighter.evasion + this.getStatusTotal(fighter, "evasion"),
        0,
        0.75,
      );
    }

    getStatusTotal(fighter, stat) {
      return fighter.statuses
        .filter((status) => status.stat === stat)
        .reduce((sum, status) => sum + status.value, 0);
    }

    nextTurn() {
      if (this.checkBattleEnd()) return;
      const fighter = this.getNextFighter();
      this.activeFighter = fighter;
      this.updateHud();

      if (fighter.team === "ally") {
        this.awaitingPlayer = true;
        this.renderSkills(fighter);
        this.message(`Turno de ${fighter.name}.`);
      } else {
        this.awaitingPlayer = false;
        this.renderEnemyTurn();
        setTimeout(() => this.enemyAction(), 900);
      }
    }

    selectSkill(actor, skill) {
      this.selectedSkill = skill;
      if (skill.id === "cura") {
        this.awaitingPlayer = false;
        this.awaitingTarget = true;
        this.message(`Elige a quién aplicar ${skill.name}.`);
        this.enableHealTargeting(actor, skill);
        return;
      }
      if (skill.target === "ally") {
        this.awaitingPlayer = false;
        this.awaitingTarget = true;
        this.message(`Elige a quién aplicar ${skill.name}.`);
        this.enableAllyTargeting(actor, skill);
        return;
      }
      this.performPlayerSkill(actor, skill, this.enemy);
    }

    enableHealTargeting(actor, skill) {
      const party = this.overlay.querySelector(".battle-party");
      const enemyEl = this.overlay.querySelector(".battle-enemy");
      const cancelButton = this.overlay.querySelector(".battle-target-cancel");
      const skillButtons = this.overlay.querySelectorAll(
        ".battle-skill-button",
      );
      const token = Symbol("heal-target-selection");
      this.targetSelectionToken = token;
      party.classList.add("is-targeting");
      enemyEl?.classList.add("is-targetable");
      skillButtons.forEach((button) => {
        button.disabled = true;
      });
      cancelButton.classList.remove("hidden");
      cancelButton.onclick = () => this.cancelTargetSelection(actor, token);

      const clearTargeting = () => {
        this.awaitingTarget = false;
        this.targetSelectionToken = null;
        party.classList.remove("is-targeting");
        enemyEl?.classList.remove("is-targetable");
        cancelButton.classList.add("hidden");
        cancelButton.onclick = null;
      };

      party.querySelectorAll(".battle-ally-card").forEach((card) => {
        card.addEventListener(
          "click",
          () => {
            const target = this.allies.find(
              (ally) => ally.id === card.dataset.ally,
            );
            if (
              !target ||
              target.currentHp <= 0 ||
              !this.awaitingTarget ||
              this.targetSelectionToken !== token
            )
              return;
            clearTargeting();
            this.performPlayerSkill(actor, skill, target);
          },
          { once: true },
        );
      });

      enemyEl?.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();
          if (
            this.enemy.currentHp <= 0 ||
            !this.awaitingTarget ||
            this.targetSelectionToken !== token
          )
            return;
          clearTargeting();
          this.performPlayerSkill(actor, skill, this.enemy);
        },
        { once: true },
      );
    }

    enableAllyTargeting(actor, skill) {
      const party = this.overlay.querySelector(".battle-party");
      const cancelButton = this.overlay.querySelector(".battle-target-cancel");
      const skillButtons = this.overlay.querySelectorAll(
        ".battle-skill-button",
      );
      const token = Symbol("target-selection");
      this.targetSelectionToken = token;
      party.classList.add("is-targeting");
      skillButtons.forEach((button) => {
        button.disabled = true;
      });
      cancelButton.classList.remove("hidden");
      cancelButton.onclick = () => this.cancelTargetSelection(actor, token);
      party.querySelectorAll(".battle-ally-card").forEach((card) => {
        card.addEventListener(
          "click",
          () => {
            const target = this.allies.find(
              (ally) => ally.id === card.dataset.ally,
            );
            if (
              !target ||
              target.currentHp <= 0 ||
              !this.awaitingTarget ||
              this.targetSelectionToken !== token
            )
              return;
            this.awaitingTarget = false;
            this.targetSelectionToken = null;
            party.classList.remove("is-targeting");
            cancelButton.classList.add("hidden");
            cancelButton.onclick = null;
            this.performPlayerSkill(actor, skill, target);
          },
          { once: true },
        );
      });
    }

    enableItemTargeting(actor, item) {
      const party = this.overlay.querySelector(".battle-party");
      const cancelButton = this.overlay.querySelector(".battle-target-cancel");
      const itemButtons = this.overlay.querySelectorAll(".battle-skill-button");
      const token = Symbol("item-target-selection");
      this.targetSelectionToken = token;
      party.classList.add("is-targeting");
      itemButtons.forEach((button) => {
        button.disabled = true;
      });
      cancelButton.classList.remove("hidden");
      cancelButton.onclick = () => this.cancelItemTargetSelection(actor, token);
      party.querySelectorAll(".battle-ally-card").forEach((card) => {
        card.addEventListener(
          "click",
          () => {
            const target = this.allies.find(
              (ally) => ally.id === card.dataset.ally,
            );
            if (
              !target ||
              target.currentHp <= 0 ||
              !this.awaitingItemTarget ||
              this.targetSelectionToken !== token
            )
              return;
            this.awaitingItemTarget = false;
            this.targetSelectionToken = null;
            party.classList.remove("is-targeting");
            cancelButton.classList.add("hidden");
            cancelButton.onclick = null;
            this.performItemUse(actor, item, target);
          },
          { once: true },
        );
      });
    }

    cancelTargetSelection(actor, token) {
      if (!this.awaitingTarget || this.targetSelectionToken !== token) return;
      this.awaitingTarget = false;
      this.awaitingPlayer = true;
      this.selectedSkill = null;
      this.targetSelectionToken = null;

      const party = this.overlay.querySelector(".battle-party");
      const cancelButton = this.overlay.querySelector(".battle-target-cancel");
      party.classList.remove("is-targeting");
      this.overlay.querySelector(".battle-enemy")?.classList.remove("is-targetable");
      cancelButton.classList.add("hidden");
      cancelButton.onclick = null;

      this.renderSkills(actor);
      this.message(`Turno de ${actor.name}.`);
    }

    cancelItemTargetSelection(actor, token) {
      if (!this.awaitingItemTarget || this.targetSelectionToken !== token) return;
      this.awaitingItemTarget = false;
      this.awaitingPlayer = true;
      this.targetSelectionToken = null;

      const party = this.overlay.querySelector(".battle-party");
      const cancelButton = this.overlay.querySelector(".battle-target-cancel");
      party.classList.remove("is-targeting");
      cancelButton.classList.add("hidden");
      cancelButton.onclick = null;

      this.renderItems(actor);
      this.message(`Turno de ${actor.name}.`);
    }

    async performPlayerSkill(actor, skill, target) {
      this.awaitingPlayer = false;
      this.awaitingTarget = false;
      this.targetSelectionToken = null;
      actor.currentPm = Math.max(0, actor.currentPm - skill.pmCost);
      this.lockSkillPanel();
      const result = this.applySkill(actor, skill, target);
      await this.actionMessage(result.text);
      if (result.hitEnemy) {
        this.playHitSound();
        this.flashEnemy();
        this.showEnemyDamageNumber(result.enemyDamage);
      }
      this.endActorTurn(actor);
      this.updateHud();
      setTimeout(() => this.nextTurn(), 2000);
    }

    async performItemUse(actor, item, target) {
      this.awaitingPlayer = false;
      this.awaitingItemTarget = false;
      this.targetSelectionToken = null;
      this.lockSkillPanel();

      const result = this.applyItem(item, target);
      if (result.consumed) this.consumeBattleItem(item);
      await this.actionMessage(`${actor.name} usa ${item.name}. ${result.text}`);
      if (!result.consumed) {
        this.awaitingPlayer = true;
        this.updateHud();
        this.renderItems(actor);
        this.message(`Turno de ${actor.name}.`);
        return;
      }
      this.endActorTurn(actor);
      this.updateHud();
      setTimeout(() => this.nextTurn(), 1600);
    }

    consumeBattleItem(item) {
      const index = this.battleInventory.findIndex(
        (inventoryItem) => inventoryItem.id === item.id,
      );
      if (index !== -1) this.battleInventory.splice(index, 1);
    }

    clearSkills() {
      const skillList = this.overlay.querySelector(".battle-skill-list");
      if (skillList.children.length > 0) {
        this.lockSkillPanel();
        return;
      }
      skillList.innerHTML = "";
      this.overlay.querySelector(".battle-active-name").innerHTML = `
        <span class="battle-active-character">-</span>
        <span class="battle-active-separator" aria-hidden="true"></span>
        <span class="battle-active-role">-</span>
      `;
      const cancelButton = this.overlay.querySelector(".battle-target-cancel");
      const itemButton = this.overlay.querySelector(".battle-item-button");
      cancelButton.classList.add("hidden");
      cancelButton.onclick = null;
      itemButton.disabled = true;
      itemButton.classList.remove("has-items");
      itemButton.textContent = "Objetos";
      itemButton.onclick = null;
      this.overlay.querySelector(".battle-skill-description").textContent =
        "Espera al siguiente turno aliado.";
    }

    lockSkillPanel() {
      const party = this.overlay.querySelector(".battle-party");
      const cancelButton = this.overlay.querySelector(".battle-target-cancel");
      const itemButton = this.overlay.querySelector(".battle-item-button");
      party.classList.remove("is-targeting");
      cancelButton.classList.add("hidden");
      cancelButton.onclick = null;
      itemButton.disabled = true;
      itemButton.classList.remove("has-items");
      itemButton.textContent = "Objetos";
      itemButton.onclick = null;
      this.overlay
        .querySelectorAll(".battle-skill-button")
        .forEach((button) => {
          button.disabled = true;
        });
      this.overlay.querySelector(".battle-skill-description").textContent =
        "Espera al siguiente turno aliado.";
    }

    renderEnemyTurn() {
      this.clearSkills();
      this.message(`${this.enemy.name} actúa.`);
    }

    async enemyAction() {
      const actor = this.enemy;
      const finalSkill = actor.skills.find((skill) => skill.isFinalAttack);

      if (actor.preparingFinalAttack) {
        actor.preparingFinalAttack = false;
        if (finalSkill && actor.currentPm >= finalSkill.pmCost) {
          actor.currentPm -= finalSkill.pmCost;
          const target = this.pickEnemyTarget(finalSkill);
          const result = this.applySkill(actor, finalSkill, target);
          await this.actionMessage(result.text);
          const hitSound = this.isAmalgamaFinalAttack(actor, finalSkill)
            ? "assets/sounds/effects/heavy_impact.mp3"
            : undefined;
          this.playHitSound(result.allyDamages?.length || 0, hitSound);
          this.flashAllies(result.hitAllies);
          this.showAllyDamageNumbers(result.allyDamages);
          actor.normalTurnsSinceFinal = 0;
        } else {
          await this.actionMessage(
            `${actor.name} pierde la concentración y vuelve a atacar normal.`,
          );
          actor.normalTurnsSinceFinal = 0;
          await this.useEnemyNormalSkill(actor);
        }
        this.endActorTurn(actor);
        this.updateHud();
        setTimeout(() => this.nextTurn(), 1100);
        return;
      }

      const pattern = actor.finalAttackPattern;
      if (
        finalSkill &&
        pattern &&
        actor.normalTurnsSinceFinal >= pattern.normalTurnsBeforeCharge
      ) {
        if (actor.currentPm >= finalSkill.pmCost) {
          actor.preparingFinalAttack = true;
          await this.actionMessage(
            pattern.warningText || `${actor.name} se está preparando...`,
          );
        } else {
          actor.normalTurnsSinceFinal = 0;
          await this.useEnemyNormalSkill(actor);
        }
        this.endActorTurn(actor);
        this.updateHud();
        setTimeout(() => this.nextTurn(), 1100);
        return;
      }

      await this.useEnemyNormalSkill(actor);
      actor.normalTurnsSinceFinal += 1;
      this.endActorTurn(actor);
      this.updateHud();
      setTimeout(() => this.nextTurn(), 1100);
    }

    async useEnemyNormalSkill(actor) {
      const available = actor.skills.filter(
        (skill) => !skill.isFinalAttack && actor.currentPm >= skill.pmCost,
      );
      const free = actor.skills.filter(
        (skill) => !skill.isFinalAttack && skill.pmCost === 0,
      );
      const skill =
        available.length > 0
          ? available[Math.floor(Math.random() * available.length)]
          : free[0];
      actor.currentPm = Math.max(0, actor.currentPm - skill.pmCost);
      const target = this.pickEnemyTarget(skill);
      const result = this.applySkill(actor, skill, target);
      await this.actionMessage(result.text);
      this.playHitSound(result.allyDamages?.length || 0);
      this.flashAllies(result.hitAllies);
      this.showAllyDamageNumbers(result.allyDamages);
    }

    pickEnemyTarget(skill) {
      if (skill.target === "all_allies")
        return this.allies.filter((ally) => ally.currentHp > 0);
      if (skill.type === "random_ally_to_one_hp") {
        const alive = this.allies.filter((ally) => ally.currentHp > 0);
        return alive[Math.floor(Math.random() * alive.length)];
      }
      const tauntTarget = this.enemy.statuses.find(
        (status) => status.type === "taunt" && status.turns > 0,
      );
      if (tauntTarget) {
        const target = this.allies.find(
          (ally) => ally.id === tauntTarget.targetId && ally.currentHp > 0,
        );
        if (target) return target;
      }
      const alive = this.allies.filter((ally) => ally.currentHp > 0);
      return alive[Math.floor(Math.random() * alive.length)];
    }

    applySkill(actor, skill, target) {
      if (skill.target === "all_allies" || skill.type === "party_heal") {
        const targets = Array.isArray(target)
          ? target
          : this.allies.filter((ally) => ally.currentHp > 0);
        const results = targets.map((singleTarget) =>
          this.applySingleTargetSkill(actor, skill, singleTarget),
        );
        let enemyDamage = results.reduce(
          (sum, result) => sum + (result.enemyDamage || 0),
          0,
        );
        let extraText = "";
        if (skill.id === "canto_sanador" && this.enemy.currentHp > 0) {
          const damage = Math.min(10, this.enemy.currentHp);
          this.enemy.currentHp -= damage;
          enemyDamage += damage;
          extraText = ` ${this.enemy.name} recibe ${damage} de daño.`;
        }
        return {
          text: `${actor.name} usa ${skill.name}. ${results.map((result) => result.text).join(" ")}${extraText}`,
          hitEnemy: results.some((result) => result.hitEnemy) || enemyDamage > 0,
          hitAllies: results.flatMap((result) => result.hitAllies),
          allyDamages: results.flatMap((result) => result.allyDamages || []),
          enemyDamage,
        };
      }

      const result = this.applySingleTargetSkill(actor, skill, target);
      return {
        text: `${actor.name} usa ${skill.name}. ${result.text}`,
        hitEnemy: result.hitEnemy,
        hitAllies: result.hitAllies,
        allyDamages: result.allyDamages || [],
        enemyDamage: result.enemyDamage || 0,
      };
    }

    applySingleTargetSkill(actor, skill, target) {
      if (!target || target.currentHp <= 0)
        return {
          text: "Pero no hay objetivo válido.",
          hitEnemy: false,
          hitAllies: [],
          enemyDamage: 0,
        };

      if (skill.type === "heal") {
        if (target.team === "enemy") {
          const damage = Math.min(skill.power, target.currentHp);
          target.currentHp = Math.max(0, target.currentHp - damage);
          return {
            text: `${target.name} recibe ${damage} de daño.`,
            hitEnemy: damage > 0,
            hitAllies: [],
            allyDamages: [],
            enemyDamage: damage,
          };
        }
        const amount = Math.min(skill.power, target.maxHp - target.currentHp);
        target.currentHp += amount;
        return {
          text: `${target.name} recupera ${amount} HP.`,
          hitEnemy: false,
          hitAllies: [],
          allyDamages: [],
          enemyDamage: 0,
        };
      }

      if (skill.type === "party_heal") {
        const amount = Math.min(skill.power, target.maxHp - target.currentHp);
        target.currentHp += amount;
        return {
          text: `${target.name} recupera ${amount} HP.`,
          hitEnemy: false,
          hitAllies: [],
          allyDamages: [],
          enemyDamage: 0,
        };
      }

      if (skill.type === "ally_shield") {
        this.addStatus(target, {
          type: "shield",
          stat: "shield",
          value: skill.damageReduction,
          turns: skill.duration,
        });
        return {
          text: `${target.name} queda protegido.`,
          hitEnemy: false,
          hitAllies: [],
          enemyDamage: 0,
        };
      }

      if (skill.type === "ally_speed_up") {
        this.addStatus(target, {
          type: "speed_up",
          stat: "speed",
          value: skill.speedModifier,
          turns: skill.duration,
        });
        return {
          text: `${target.name} gana velocidad.`,
          hitEnemy: false,
          hitAllies: [],
          enemyDamage: 0,
        };
      }

      if (skill.type === "ally_attack_up") {
        this.addStatus(target, {
          type: "attack_up",
          stat: "attack",
          value: skill.attackModifier,
          turns: skill.duration,
        });
        return {
          text: `${target.name} siente el ánimo de Piyón y su ataque sube.`,
          hitEnemy: false,
          hitAllies: [],
          enemyDamage: 0,
        };
      }

      if (skill.type === "ally_evasion_up") {
        this.addStatus(target, {
          type: "evasion_up",
          stat: "evasion",
          value: skill.evasionModifier,
          turns: skill.duration,
        });
        return {
          text: `${target.name} se vuelve mucho más difícil de acertar.`,
          hitEnemy: false,
          hitAllies: [],
          enemyDamage: 0,
        };
      }

      if (skill.type === "taunt") {
        this.addStatus(this.enemy, {
          type: "taunt",
          targetId: actor.id,
          turns: skill.duration,
        });
        return {
          text: `${this.enemy.name} fija su atención en ${actor.name}.`,
          hitEnemy: false,
          hitAllies: [],
          enemyDamage: 0,
        };
      }

      if (skill.type === "halve_party_hp") {
        const newHp = Math.max(1, Math.ceil(target.currentHp / 2));
        const damage = target.currentHp - newHp;
        target.currentHp = newHp;
        return {
          text: `${target.name} queda reducido al 50% de sus PV.`,
          hitEnemy: false,
          hitAllies: damage > 0 ? [target.id] : [],
          allyDamages: damage > 0 ? [{ id: target.id, damage }] : [],
          enemyDamage: 0,
        };
      }

      if (skill.type === "random_ally_to_one_hp") {
        const damage = Math.max(0, target.currentHp - 1);
        target.currentHp = 1;
        return {
          text: `${target.name} queda al borde del colapso con 1 PV.`,
          hitEnemy: false,
          hitAllies: damage > 0 ? [target.id] : [],
          allyDamages: damage > 0 ? [{ id: target.id, damage }] : [],
          enemyDamage: 0,
        };
      }

      // Antes de la tirada de acierto: el Ataque Kosai no falla ni se esquiva.
      if (skill.type === "execute") {
        const damage = target.currentHp;
        target.currentHp = 0;
        const hitEnemy = target.team === "enemy";
        return {
          text: `${target.name} cae de un solo golpe.`,
          hitEnemy,
          hitAllies: hitEnemy ? [] : [target.id],
          allyDamages: hitEnemy ? [] : [{ id: target.id, damage }],
          enemyDamage: hitEnemy ? damage : 0,
        };
      }

      if (!this.rollHit(actor, skill, target)) {
        return {
          text: `${target.name} esquiva el ataque.`,
          hitEnemy: false,
          hitAllies: [],
          enemyDamage: 0,
        };
      }

      let result = "";
      let hitEnemy = false;
      let hitAllies = [];
      let allyDamages = [];
      let enemyDamage = 0;

      if (skill.type === "steal") {
        return this.stealFromEnemy(actor);
      }

      if (skill.type === "attack_down") {
        this.addStatus(target, {
          type: "attack_down",
          stat: "attack",
          value: skill.attackModifier,
          turns: skill.duration,
        });
        return {
          text: `${target.name} pierde fuerza ofensiva.`,
          hitEnemy: false,
          hitAllies: [],
          enemyDamage: 0,
        };
      }

      if (
        [
          "damage",
          "damage_speed_down",
          "mp_drain",
          "mp_damage",
          "damage_attack_down",
          "multi_damage",
        ].includes(skill.type)
      ) {
        const damage = this.calculateDamage(actor, skill, target);
        target.currentHp = Math.max(0, target.currentHp - damage);
        hitEnemy = target.team === "enemy" && damage > 0;
        if (hitEnemy) enemyDamage += damage;
        if (target.team === "ally" && damage > 0) {
          hitAllies.push(target.id);
          allyDamages.push({ id: target.id, damage });
        }
        result += `${target.name} recibe ${damage} de daño.`;
      }

      if (skill.type === "damage_speed_down" && target.currentHp > 0) {
        this.addStatus(target, {
          type: "speed_down",
          stat: "speed",
          value: skill.speedModifier,
          turns: skill.duration,
        });
        result += ` Su velocidad baja.`;
      }

      if (skill.type === "mp_drain") {
        const drained = Math.min(skill.mpDamage, target.currentPm);
        target.currentPm -= drained;
        const restored = Math.min(
          skill.mpRestore,
          actor.maxPm - actor.currentPm,
        );
        actor.currentPm += restored;
        result += ` Pierde ${drained} PM y ${actor.name} recupera ${restored} PM.`;
      }

      if (skill.type === "mp_damage") {
        const drained = Math.min(skill.mpDamage, target.currentPm);
        target.currentPm -= drained;
        result += ` También pierde ${drained} PM.`;
      }

      if (skill.type === "damage_attack_down" && target.currentHp > 0) {
        this.addStatus(target, {
          type: "attack_down",
          stat: "attack",
          value: skill.attackModifier,
          turns: skill.duration,
        });
        result += ` Su ataque baja.`;
      }

      return { text: result, hitEnemy, hitAllies, allyDamages, enemyDamage };
    }

    stealFromEnemy(actor) {
      if (this.enemyItemStolen) {
        return {
          text: "No queda nada útil que robar.",
          hitEnemy: false,
          hitAllies: [],
        };
      }

      const item = this.enemy.stealItem;
      if (!item) {
        return {
          text: `${this.enemy.name} no lleva nada útil.`,
          hitEnemy: false,
          hitAllies: [],
        };
      }

      this.enemyItemStolen = true;
      this.battleInventory.push({ ...item });
      return {
        text: `${actor.name} roba ${item.name}.`,
        hitEnemy: false,
        hitAllies: [],
      };
    }

    applyItem(item, target) {
      if (item.type === "revive_three") {
        const fallen = this.allies
          .filter((ally) => ally.currentHp <= 0)
          .slice(0, 3);
        const standing = this.allies.filter((ally) => ally.currentHp > 0);
        if (fallen.length === 0 && standing.length === 0)
          return { text: "Pero no hay aliados a los que ayudar.", consumed: false };

        fallen.forEach((ally) => {
          ally.currentHp = Math.max(1, Math.ceil(ally.maxHp * 0.5));
          ally.currentPm = Math.ceil(ally.maxPm * 0.5);
          this.resetRevivedFighterTurn(ally);
        });

        // Sobre el MÁXIMO, no sobre lo que le queda al aliado. Antes era el 50%
        // del valor ACTUAL, así que a quien estaba sin PM le devolvía cero (el
        // caso de Piyón en la demo) y a quien estaba casi muerto, casi nada:
        // parecía que el objeto solo curaba vida. Los caídos ya revivían con el
        // 50% del máximo, así que ahora ambos casos son coherentes.
        let recoveredHp = 0;
        let recoveredPm = 0;
        standing.forEach((ally) => {
          recoveredHp += this.restoreHp(ally, Math.ceil(ally.maxHp * 0.5));
          recoveredPm += this.restorePm(ally, Math.ceil(ally.maxPm * 0.5));
        });

        const effects = [];
        if (fallen.length > 0) {
          effects.push(
            `${fallen.map((ally) => ally.name).join(", ")} vuelven al combate con HP y PM restaurados`,
          );
        }
        if (recoveredHp > 0 || recoveredPm > 0) {
          effects.push(
            `el grupo recupera ${recoveredHp} HP y ${recoveredPm} PM en total`,
          );
        }

        return {
          text: `${effects.join(". ")}.`,
          consumed: true,
        };
      }

      if (!target || target.currentHp <= 0) {
        return { text: "Pero no hay objetivo válido.", consumed: false };
      }

      if (item.type === "heal_speed_up") {
        const recovered = this.restoreHp(target, item.heal);
        this.addStatus(target, {
          type: "speed_up",
          stat: "speed",
          value: item.speedModifier,
          turns: item.duration,
        });
        return {
          text: `${target.name} recupera ${recovered} HP y gana velocidad.`,
          consumed: true,
        };
      }

      if (item.type === "heal_attack_up") {
        const recovered = this.restoreHp(target, item.heal);
        this.addStatus(target, {
          type: "attack_up",
          stat: "attack",
          value: item.attackModifier,
          turns: item.duration,
        });
        return {
          text: `${target.name} recupera ${recovered} HP y gana ataque.`,
          consumed: true,
        };
      }

      if (item.type === "heal_pm") {
        const recoveredHp = this.restoreHp(target, item.heal);
        const recoveredPm = this.restorePm(target, item.pmRestore);
        return {
          text: `${target.name} recupera ${recoveredHp} HP y ${recoveredPm} PM.`,
          consumed: true,
        };
      }

      if (item.type === "full_restore") {
        const recoveredHp = this.restoreHp(target, target.maxHp);
        const recoveredPm = this.restorePm(target, target.maxPm);
        return {
          text: `${target.name} recupera ${recoveredHp} HP y ${recoveredPm} PM.`,
          consumed: true,
        };
      }

      return { text: "Pero no ocurre nada.", consumed: false };
    }

    restoreHp(target, amount) {
      const recovered = Math.min(amount, target.maxHp - target.currentHp);
      target.currentHp += recovered;
      return recovered;
    }

    restorePm(target, amount) {
      const recovered = Math.min(amount, target.maxPm - target.currentPm);
      target.currentPm += recovered;
      return recovered;
    }

    resetRevivedFighterTurn(fighter) {
      const activeClocks = this.fighters
        .filter((candidate) => candidate.currentHp > 0 && candidate.id !== fighter.id)
        .map((candidate) => this.turnClock.get(candidate.id) || 0);
      const latestClock = activeClocks.length > 0 ? Math.max(...activeClocks) : 0;
      this.turnClock.set(fighter.id, latestClock + this.getTurnDelay(fighter));
    }

    flashEnemy() {
      const enemyEl = this.overlay.querySelector(".battle-enemy");
      if (!enemyEl) return;
      enemyEl.classList.remove("battle-enemy-hit");
      void enemyEl.offsetWidth;
      enemyEl.classList.add("battle-enemy-hit");
      setTimeout(() => enemyEl.classList.remove("battle-enemy-hit"), 420);
    }

    showEnemyDamageNumber(amount) {
      if (!amount || amount <= 0) return;
      const stage = this.overlay.querySelector(".battle-stage");
      if (!stage) return;
      const damageEl = document.createElement("div");
      damageEl.className = "battle-damage-number";
      damageEl.textContent = `-${amount} HP`;
      damageEl.style.left = `${48 + Math.random() * 8}%`;
      damageEl.style.top = `${30 + Math.random() * 10}%`;
      stage.appendChild(damageEl);
      setTimeout(() => damageEl.remove(), 1100);
    }

    showAllyDamageNumbers(damages = []) {
      damages.forEach(({ id, damage }) => {
        if (!id || !damage || damage <= 0) return;
        const allyEl = this.overlay.querySelector(
          `.battle-ally-card[data-ally="${id}"]`,
        );
        if (!allyEl) return;
        const portraitEl = allyEl.querySelector("img");
        const anchorEl = portraitEl || allyEl;
        const overlayRect = this.overlay.getBoundingClientRect();
        const anchorRect = anchorEl.getBoundingClientRect();
        const damageEl = document.createElement("div");
        damageEl.className = "battle-damage-number battle-ally-damage-number";
        damageEl.textContent = `-${damage} HP`;
        const left =
          anchorRect.left -
          overlayRect.left +
          anchorRect.width * (0.45 + Math.random() * 0.18);
        const top =
          anchorRect.top -
          overlayRect.top +
          anchorRect.height * (0.04 + Math.random() * 0.08);
        damageEl.style.left = `${left}px`;
        damageEl.style.top = `${top}px`;
        this.overlay.appendChild(damageEl);
        setTimeout(() => damageEl.remove(), 1100);
      });
    }

    isAmalgamaFinalAttack(actor, skill) {
      return (
        skill?.isFinalAttack &&
        ["amalgama", "amalgama_final"].includes(actor?.id)
      );
    }

    playHitSound(count = 1, path = "assets/sounds/effects/hit.mp3") {
      const hits = Math.max(0, Math.min(count || 0, 4));
      for (let index = 0; index < hits; index++) {
        setTimeout(() => {
          const audio = new Audio(path);
          audio.volume = 0.72;
          audio.play().catch(() => {});
        }, index * 70);
      }
    }

    playHoverSound() {
      const now = performance.now();
      if (this.lastHoverSoundAt && now - this.lastHoverSoundAt < 55) return;
      this.lastHoverSoundAt = now;
      const audio = new Audio("assets/sounds/effects/hover_button.mp3");
      audio.volume = 0.8;
      audio.play().catch(() => {});
    }

    flashAllies(allyIds = []) {
      setTimeout(() => {
        [...new Set(allyIds)].forEach((allyId) => {
          const allyEl = this.overlay.querySelector(
            `.battle-ally-card[data-ally="${allyId}"]`,
          );
          if (!allyEl) return;
          allyEl.classList.remove("battle-ally-hit");
          void allyEl.offsetWidth;
          allyEl.classList.add("battle-ally-hit");
          setTimeout(() => allyEl.classList.remove("battle-ally-hit"), 900);
        });
      }, 0);
    }

    rollHit(actor, skill, target) {
      const baseAccuracy = skill.accuracy === undefined ? 1 : skill.accuracy;
      const hitChance = clamp(
        baseAccuracy - this.getEvasion(target),
        0,
        1,
      );
      return Math.random() <= hitChance;
    }

    calculateDamage(actor, skill, target) {
      const attackMod = this.getStatusTotal(actor, "attack");
      const rawPower = Math.max(1, skill.power + attackMod);
      const baseDamage = Math.max(1, rawPower - target.defense);
      const shield = target.statuses
        .filter((status) => status.type === "shield")
        .reduce((best, status) => Math.max(best, status.value), 0);
      return Math.max(1, Math.round(baseDamage * (1 - shield)));
    }

    addStatus(target, status) {
      target.statuses = target.statuses.filter(
        (active) => active.type !== status.type,
      );
      target.statuses.push({ ...status });
    }

    endActorTurn(actor) {
      this.advanceFighterClock(actor);
      actor.statuses.forEach((status) => {
        if (status.turns !== undefined) status.turns -= 1;
      });
      actor.statuses = actor.statuses.filter(
        (status) => status.turns === undefined || status.turns > 0,
      );

      // Modo supervivencia: cada turno enemigo superado acerca la victoria
      if (this.surviveTurns > 0 && actor.team === "enemy") {
        this.turnsSurvived += 1;
        this.updateSurviveHud();
        this.fireInterludes(this.turnsSurvived);
        if (this.turnsSurvived >= this.surviveTurns) {
          this.surviveWon = true;
        }
      }
    }

    // ---- UI del modo supervivencia (contador + burbujas de urgencia) ----
    ensureSurviveUi() {
      if (this.surviveTurns <= 0 || !this.overlay) return;
      const chip = document.createElement("div");
      chip.className = "battle-survive-chip";
      this.overlay.appendChild(chip);
      this.surviveChip = chip;
      this.updateSurviveHud();
    }

    updateSurviveHud() {
      if (!this.surviveChip) return;
      const left = Math.max(0, this.surviveTurns - this.turnsSurvived);
      // Sin cuenta atrás a propósito (demo 25-jul-2026): el jugador NO debe
      // saber cuánto falta. Es un combate que no se puede ganar a base de daño;
      // que descubra por sí solo que al boss no le está haciendo nada y que lo
      // único que cabe es aguantar hasta que Seraphyna arranque a cantar.
      this.surviveChip.innerHTML =
        left > 0 ? "🛡️ AGUANTAD LA PUERTA" : "🎤 ¡YA CANTA!";
      this.surviveChip.classList.remove("survive-pulse");
      void this.surviveChip.offsetWidth;
      this.surviveChip.classList.add("survive-pulse");
    }

    fireInterludes(turn) {
      this.interludes
        .filter((item) => Number(item.turn) === turn && item.text)
        .forEach((item, index) => {
          setTimeout(
            () => this.showUrgentBubble(item.speaker, item.text),
            350 + index * 1900,
          );
        });
    }

    showUrgentBubble(speaker, text) {
      if (!this.overlay) return;
      const bubble = document.createElement("div");
      bubble.className = "battle-urgent-bubble";
      bubble.innerHTML = `${speaker ? `<span class="bub-speaker">${speaker}</span>` : ""}<span class="bub-text">${text}</span>`;
      this.overlay.appendChild(bubble);
      setTimeout(() => bubble.classList.add("bub-out"), 2600);
      setTimeout(() => bubble.remove(), 3100);
    }

    message(text) {
      this.messageToken += 1;
      this.overlay.querySelector(".battle-message").textContent = text;
    }

    async actionMessage(text) {
      const messageEl = this.overlay.querySelector(".battle-message");
      const token = this.messageToken + 1;
      this.messageToken = token;
      messageEl.textContent = "";

      for (const char of text) {
        if (this.messageToken !== token) return;
        messageEl.textContent += char;
        let delay = 28;
        if (window.Juice) {
          window.Juice.blip(char, "battle");
          delay += window.Juice.punctuationPause(char);
        }
        await this.wait(delay);
      }
    }

    wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    checkBattleEnd() {
      if (this.surviveWon) {
        this.finishBattle(true);
        return true;
      }
      if (this.enemy.currentHp <= 0) {
        this.finishBattle(true);
        return true;
      }
      if (this.allies.every((ally) => ally.currentHp <= 0)) {
        this.finishBattle(false);
        return true;
      }
      return false;
    }

    finishBattle(won) {
      this.awaitingPlayer = false;
      this.clearSkills();
      // En supervivencia el enemigo NO muere (la marea se calma con la voz):
      // saltar el efecto de derrota del enemigo y mostrar el panel directo.
      if (won && !this.surviveWon) {
        this.playEnemyDefeatEffect();
        setTimeout(() => this.showBattleResult(won), this.getEnemyDefeatDuration());
        return;
      }
      this.showBattleResult(won);
    }

    getEnemyDefeatDuration() {
      const durations = {
        amalgama: 1600,
        amalgama_final: 2400,
      };
      return durations[this.enemy.id] || 1200;
    }

    playEnemyDefeatEffect() {
      const enemyEl = this.overlay.querySelector(".battle-enemy");
      if (!enemyEl) return;
      enemyEl.classList.remove("battle-enemy-hit");
      void enemyEl.offsetWidth;
      enemyEl.classList.add("is-defeated");
    }

    showBattleResult(won) {
      const winTitle =
        this.options.victoryTitle ||
        (this.surviveTurns > 0 ? "¡Habéis aguantado!" : "Victoria");
      const winText =
        this.options.victoryText ||
        (this.surviveTurns > 0
          ? "El escenario se enciende a vuestra espalda."
          : `${this.enemy.name} ha sido derrotada.`);
      const loseText =
        this.options.defeatText || "El equipo ha caído en combate.";
      const result = document.createElement("div");
      result.className = `battle-result ${won ? "victory" : "game-over"}`;
      result.innerHTML = `
        <div class="battle-result-panel">
          <h2>${won ? winTitle : "Game Over"}</h2>
          <p>${won ? winText : loseText}</p>
          <button class="battle-result-button">Continuar</button>
        </div>
      `;
      this.overlay.appendChild(result);
      result
        .querySelector(".battle-result-button")
        .addEventListener("click", () => {
          this.overlay.remove();
          this.resolve(won);
        });
    }
  }

  // Combate en curso, si lo hay. Solo puede haber uno: el bucle del juego está
  // parado dentro de él mientras dura.
  let combateActivo = null;

  window.BattleMinigame = {
    play(options = {}) {
      const minigame = new BattleMinigame(options);
      combateActivo = minigame;
      return minigame.play().finally(() => {
        if (combateActivo === minigame) combateActivo = null;
      });
    },
    allies: ALLIES,
    enemies: ENEMIES,
    items: { diapason: DIAPASON },
    // Lo usa game.js para pintar la casilla en Configuración.
    KOSAI_SETTING_KEY,
    // Encender o apagar el Ataque Kosai desde el menú de pausa afecta al
    // combate que ya está en marcha: lo llama game.js al tocar la casilla.
    setKosaiEnabled(activo) {
      // Un combate abortado desde los botones de arriba no resuelve su promesa,
      // así que la referencia se suelta también aquí, mirando si su overlay
      // sigue en pie.
      if (combateActivo && !combateActivo.overlay?.isConnected) {
        combateActivo = null;
      }
      combateActivo?.aplicarKosai(!!activo);
    },
  };
})();
