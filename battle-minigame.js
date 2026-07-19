(function () {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const cacheBust = (path) => `${path}?v=${Date.now()}`;

  const ALLIES = [
    {
      id: "samu",
      name: "Samu",
      role: "Mago",
      portrait: "assets/characters/samu/Samu.png",
      hp: 120,
      pm: 90,
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
          power: 32,
          target: "enemy",
          accuracy: 0.92,
          description: "Lanza una esfera de fuego contra el enemigo. Buen daño mágico por 8 PM."
        },
        {
          id: "escarcha",
          name: "Escarcha",
          pmCost: 6,
          type: "damage_speed_down",
          element: "ice",
          power: 22,
          speedModifier: -2,
          duration: 2,
          target: "enemy",
          accuracy: 0.9,
          description: "Inflige daño de hielo y reduce la velocidad del enemigo durante 2 turnos."
        },
        {
          id: "relampago",
          name: "Relámpago",
          pmCost: 10,
          type: "damage",
          element: "lightning",
          power: 38,
          target: "enemy",
          accuracy: 0.86,
          description: "Golpea al enemigo con un rayo potente. Alto daño por 10 PM."
        },
        {
          id: "rafaga_arcana",
          name: "Ráfaga arcana",
          pmCost: 0,
          type: "damage",
          element: "arcane",
          power: 18,
          target: "enemy",
          accuracy: 0.95,
          description: "Ataque mágico básico. Hace daño moderado y no consume PM."
        }
      ]
    },
    {
      id: "edu",
      name: "Edu",
      role: "Pícaro Arcano",
      portrait: "assets/characters/edu/Edu.png",
      hp: 105,
      pm: 70,
      speed: 14,
      evasion: 0.18,
      defense: 5,
      skills: [
        {
          id: "robar",
          name: "Robar",
          pmCost: 0,
          type: "mp_drain",
          element: "physical",
          power: 10,
          mpDamage: 10,
          mpRestore: 6,
          target: "enemy",
          accuracy: 0.95,
          description: "Ataca, reduce 10 PM del enemigo y Edu recupera hasta 6 PM."
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
          description: "Aumenta la velocidad del aliado elegido durante 2 turnos."
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
          description: "Aumenta mucho la evasión del aliado elegido durante 2 turnos."
        },
        {
          id: "corte_relampago",
          name: "Corte relámpago",
          pmCost: 0,
          type: "damage",
          element: "lightning",
          power: 20,
          target: "enemy",
          accuracy: 0.93,
          description: "Un corte eléctrico rápido. Hace 20 de poder y no consume PM."
        }
      ]
    },
    {
      id: "seraphyne",
      name: "Seraphyne",
      speakingAs: "Tony",
      role: "Maga Blanca / Cantora",
      portrait: "assets/characters/tony/Tony.png",
      hp: 95,
      pm: 110,
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
          power: 35,
          target: "ally",
          description: "Restaura 35 HP al aliado elegido por 8 PM."
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
          description: "Reduce un 40% el daño recibido por el aliado elegido durante 2 turnos."
        },
        {
          id: "canto_purificador",
          name: "Canto purificador",
          pmCost: 0,
          type: "party_heal",
          element: "holy_music",
          power: 10,
          target: "all_allies",
          description: "Cura 10 HP a cada miembro del equipo. No consume PM."
        },
        {
          id: "canto_debilitante",
          name: "Canto debilitante",
          pmCost: 0,
          type: "damage_attack_down",
          element: "music",
          power: 14,
          attackModifier: -3,
          duration: 2,
          target: "enemy",
          accuracy: 0.94,
          description: "Daña ligeramente al enemigo y reduce su poder ofensivo durante 2 turnos."
        }
      ]
    },
    {
      id: "jose",
      name: "Jose",
      role: "Guerrero",
      portrait: "assets/characters/others/Jose.png",
      hp: 165,
      pm: 45,
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
          power: 30,
          target: "enemy",
          accuracy: 0.9,
          description: "Golpe contundente con la gran espada. Buen daño y no consume PM."
        },
        {
          id: "guardia_ferrea",
          name: "Guardia férrea",
          pmCost: 8,
          type: "ally_shield",
          element: "physical",
          power: 0,
          damageReduction: 0.5,
          duration: 2,
          target: "ally",
          description: "Reduce un 50% el daño recibido por el aliado elegido durante 2 turnos."
        },
        {
          id: "provocar",
          name: "Provocar",
          pmCost: 6,
          type: "taunt",
          element: "physical",
          power: 0,
          duration: 1,
          target: "enemy",
          description: "Obliga al enemigo a atacar a Jose en su próximo turno."
        },
        {
          id: "embestida_de_piyon",
          name: "Embestida de Piyón",
          pmCost: 12,
          type: "damage",
          element: "physical",
          power: 45,
          target: "enemy",
          accuracy: 0.82,
          description: "Carga brutal de alto daño contra el enemigo por 12 PM."
        }
      ]
    }
  ];

  const ENEMIES = {
    ballerina_capuchina: {
      id: "ballerina_capuchina",
      name: "Ballerina Capuchina",
      role: "Jefa Brainrot",
      image: "assets/characters/ballerina_capuchina_battle_1.png",
      background: "assets/backgrounds/plaza_circular_brainrot_ataque.png",
      hp: 420,
      pm: 80,
      speed: 13,
      evasion: 0.16,
      defense: 6,
      finalAttackPattern: {
        normalTurnsBeforeCharge: 3,
        warningText: "Ballerina Capuchina se está preparando..."
      },
      skills: [
        {
          id: "arabesco_agresivo",
          name: "Arabesco agresivo",
          pmCost: 0,
          type: "damage",
          power: 24,
          target: "ally",
          accuracy: 0.9
        },
        {
          id: "pirueta_capuchina",
          name: "Pirueta capuchina",
          pmCost: 8,
          type: "multi_damage",
          power: 14,
          target: "all_allies",
          accuracy: 0.85
        },
        {
          id: "espresso_distorsionado",
          name: "Espresso distorsionado",
          pmCost: 10,
          type: "mp_damage",
          power: 8,
          mpDamage: 12,
          target: "ally",
          accuracy: 0.9
        },
        {
          id: "grand_jete_del_caos",
          name: "Grand jeté del caos",
          pmCost: 14,
          type: "damage",
          power: 36,
          target: "ally",
          accuracy: 0.75,
          isFinalAttack: true
        }
      ]
    },
    tralalelo_tralala: {
      id: "tralalelo_tralala",
      name: "Tralalero Tralala",
      role: "Jefe Brainrot",
      image: "assets/characters/tralalelo_tralala_battle_1.png",
      background: "assets/backgrounds/plaza_circular_brainrot_ataque.png",
      hp: 520,
      pm: 90,
      speed: 12,
      evasion: 0.12,
      defense: 8,
      finalAttackPattern: {
        normalTurnsBeforeCharge: 3,
        warningText: "Tralalero Tralala se está preparando..."
      },
      skills: [
        { id: "mordisco_tralala", name: "Mordisco Tralala", pmCost: 0, type: "damage", power: 28, target: "ally", accuracy: 0.88 },
        { id: "zapatillazo", name: "Zapatillazo", pmCost: 8, type: "damage_speed_down", power: 22, speedModifier: -2, duration: 2, target: "ally", accuracy: 0.86 },
        { id: "oleada_absurda", name: "Oleada absurda", pmCost: 12, type: "multi_damage", power: 16, target: "all_allies", accuracy: 0.84 },
        { id: "tralaleo_terminal", name: "Tralaleo terminal", pmCost: 18, type: "multi_damage", power: 32, target: "all_allies", accuracy: 0.78, isFinalAttack: true }
      ]
    },
    tung_tung_tung_sahur: {
      id: "tung_tung_tung_sahur",
      name: "Tung Tung Tung Sahur",
      role: "Lider Brainrot",
      image: "assets/characters/tung_tung_tung_sahur_battle_1.png",
      background: "assets/backgrounds/plaza_circular_brainrot_ataque.png",
      hp: 620,
      pm: 110,
      speed: 9,
      evasion: 0.08,
      defense: 10,
      finalAttackPattern: {
        normalTurnsBeforeCharge: 3,
        warningText: "Tung Tung Tung Sahur se está preparando..."
      },
      skills: [
        { id: "golpe_tung", name: "Golpe Tung", pmCost: 0, type: "damage", power: 32, target: "ally", accuracy: 0.9 },
        { id: "tambor_sahur", name: "Tambor Sahur", pmCost: 10, type: "multi_damage", power: 15, target: "all_allies", accuracy: 0.88 },
        { id: "mirada_madera", name: "Mirada de madera", pmCost: 12, type: "mp_damage", power: 10, mpDamage: 14, target: "ally", accuracy: 0.9 },
        { id: "tung_tung_apocaliptico", name: "Tung Tung apocalíptico", pmCost: 20, type: "multi_damage", power: 35, target: "all_allies", accuracy: 0.78, isFinalAttack: true }
      ]
    },
    amalgama: {
      id: "amalgama",
      name: "Amalgama",
      role: "Horror Brainrot",
      image: "assets/characters/amalgama_1.png",
      background: "assets/backgrounds/amalgama.png",
      hp: 760,
      pm: 140,
      speed: 8,
      evasion: 0.06,
      defense: 12,
      finalAttackPattern: {
        normalTurnsBeforeCharge: 3,
        warningText: "La Amalgama se está preparando..."
      },
      skills: [
        { id: "masa_inestable", name: "Masa inestable", pmCost: 0, type: "damage", power: 34, target: "ally", accuracy: 0.86 },
        { id: "ruido_de_internet", name: "Ruido de internet", pmCost: 14, type: "multi_damage", power: 18, target: "all_allies", accuracy: 0.84 },
        { id: "drenaje_glitch", name: "Drenaje glitch", pmCost: 16, type: "mp_damage", power: 12, mpDamage: 18, target: "ally", accuracy: 0.88 },
        { id: "colapso_memetico", name: "Colapso memético", pmCost: 24, type: "multi_damage", power: 42, target: "all_allies", accuracy: 0.76, isFinalAttack: true }
      ]
    }
  };

  class BattleMinigame {
    constructor(options = {}) {
      this.options = options;
      this.enemyTemplate = ENEMIES[options.enemy] || ENEMIES.ballerina_capuchina;
      const configuredEnemyHp = Number(options.enemyHp);
      const enemyHp = Number.isFinite(configuredEnemyHp) && configuredEnemyHp > 0
        ? configuredEnemyHp
        : this.enemyTemplate.hp;
      this.allies = ALLIES.map((ally) => this.createFighter(ally, "ally"));
      this.enemy = this.createFighter({
        ...this.enemyTemplate,
        hp: enemyHp,
        maxHp: enemyHp
      }, "enemy");
      this.fighters = [...this.allies, this.enemy];
      this.turnClock = new Map(this.fighters.map((fighter) => [fighter.id, 0]));
      this.activeFighter = null;
      this.selectedSkill = null;
      this.awaitingPlayer = false;
      this.awaitingTarget = false;
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
        preparingFinalAttack: false
      };
    }

    play() {
      return new Promise((resolve) => {
        this.resolve = resolve;
        this.render();
        this.message(`${this.enemy.name} bloquea el camino.`);
        setTimeout(() => this.nextTurn(), 800);
      });
    }

    render() {
      this.overlay = document.createElement("div");
      this.overlay.className = "battle-minigame";
      this.overlay.innerHTML = `
        <div class="battle-background"></div>
        <section class="battle-skill-panel" aria-label="Habilidades">
          <div class="battle-panel-title">Habilidades</div>
          <div class="battle-active-name">-</div>
          <div class="battle-skill-list"></div>
          <button class="battle-item-button" disabled>Objetos</button>
          <div class="battle-skill-description">Selecciona una habilidad para leer lo que hace.</div>
        </section>
        <section class="battle-order-panel" aria-label="Orden de turnos">
          <div class="battle-panel-title">ORDER</div>
          <div class="battle-order-list"></div>
        </section>
        <main class="battle-stage">
          <div class="battle-enemy-hp">
            <span class="battle-enemy-name">${this.enemy.name}</span>
            <div class="battle-bar"><span class="battle-hp-fill"></span></div>
            <span class="battle-enemy-numbers"></span>
          </div>
          <img class="battle-enemy" src="${cacheBust(this.enemy.image)}" alt="${this.enemy.name}">
          <div class="battle-message"></div>
        </main>
        <section class="battle-party" aria-label="Equipo"></section>
      `;

      const background = this.options.background || this.enemy.background;
      this.overlay.querySelector(".battle-background").style.backgroundImage = `url("${cacheBust(background)}")`;
      document.getElementById("game-container").appendChild(this.overlay);
      this.updateHud();
    }

    updateHud() {
      this.renderParty();
      this.renderEnemyHp();
      this.renderOrder();
    }

    renderParty() {
      const party = this.overlay.querySelector(".battle-party");
      party.innerHTML = this.allies.map((ally) => `
        <button class="battle-ally-card ${ally.currentHp <= 0 ? "is-ko" : ""} ${this.activeFighter?.id === ally.id ? "is-active" : ""}" data-ally="${ally.id}" ${ally.currentHp <= 0 ? "disabled" : ""}>
          <img src="${cacheBust(ally.portrait)}" alt="${ally.name}">
          <div class="battle-ally-info">
            <strong>${ally.name}</strong>
            <span>HP ${ally.currentHp}/${ally.maxHp}</span>
            <span>PM ${ally.currentPm}/${ally.maxPm}</span>
          </div>
        </button>
      `).join("");
    }

    renderEnemyHp() {
      const hpPercent = this.enemy.maxHp > 0 ? (this.enemy.currentHp / this.enemy.maxHp) * 100 : 0;
      this.overlay.querySelector(".battle-hp-fill").style.width = `${clamp(hpPercent, 0, 100)}%`;
      this.overlay.querySelector(".battle-enemy-numbers").textContent = `HP ${this.enemy.currentHp}/${this.enemy.maxHp} - PM ${this.enemy.currentPm}/${this.enemy.maxPm}`;
    }

    renderOrder() {
      const order = this.getUpcomingOrder(8);
      const list = this.overlay.querySelector(".battle-order-list");
      list.innerHTML = order.map((fighter) => `
        <div class="battle-order-entry ${fighter.team}">
          <span>${fighter.team === "enemy" ? "ENEMY" : "ALLY"}</span>
          <strong>${fighter.name}</strong>
        </div>
      `).join("");
    }

    renderSkills(fighter) {
      const activeName = this.overlay.querySelector(".battle-active-name");
      const skillList = this.overlay.querySelector(".battle-skill-list");
      const description = this.overlay.querySelector(".battle-skill-description");
      activeName.textContent = `${fighter.name} - ${fighter.role}`;
      skillList.innerHTML = fighter.skills.map((skill, index) => {
        const disabled = fighter.currentPm < skill.pmCost;
        return `
          <button class="battle-skill-button" data-skill="${index}" ${disabled ? "disabled" : ""}>
            <span>${skill.name}</span>
            <small>${skill.pmCost} PM</small>
          </button>
        `;
      }).join("");
      description.textContent = "Selecciona una habilidad para leer lo que hace.";

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
          clock: this.turnClock.get(fighter.id) || 0
        }));
      const order = [];

      for (let i = 0; i < count; i++) {
        snapshots.sort((a, b) => a.clock - b.clock || this.getSpeed(b.fighter) - this.getSpeed(a.fighter));
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
      this.turnClock.set(fighter.id, (this.turnClock.get(fighter.id) || 0) + this.getTurnDelay(fighter));
    }

    getTurnDelay(fighter) {
      return 100 / this.getSpeed(fighter);
    }

    getSpeed(fighter) {
      return Math.max(1, fighter.baseSpeed + this.getStatusTotal(fighter, "speed"));
    }

    getEvasion(fighter) {
      return clamp(fighter.evasion + this.getStatusTotal(fighter, "evasion"), 0, 0.75);
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
      if (skill.target === "ally") {
        this.awaitingPlayer = false;
        this.awaitingTarget = true;
        this.message(`Elige a quién aplicar ${skill.name}.`);
        this.enableAllyTargeting(actor, skill);
        return;
      }
      this.performPlayerSkill(actor, skill, this.enemy);
    }

    enableAllyTargeting(actor, skill) {
      const party = this.overlay.querySelector(".battle-party");
      party.classList.add("is-targeting");
      party.querySelectorAll(".battle-ally-card").forEach((card) => {
        card.addEventListener("click", () => {
          const target = this.allies.find((ally) => ally.id === card.dataset.ally);
          if (!target || target.currentHp <= 0 || !this.awaitingTarget) return;
          this.awaitingTarget = false;
          party.classList.remove("is-targeting");
          this.performPlayerSkill(actor, skill, target);
        }, { once: true });
      });
    }

    async performPlayerSkill(actor, skill, target) {
      this.awaitingPlayer = false;
      this.awaitingTarget = false;
      actor.currentPm = Math.max(0, actor.currentPm - skill.pmCost);
      this.clearSkills();
      const text = this.applySkill(actor, skill, target);
      this.message(text);
      this.endActorTurn(actor);
      this.updateHud();
      setTimeout(() => this.nextTurn(), 1000);
    }

    clearSkills() {
      this.overlay.querySelector(".battle-skill-list").innerHTML = "";
      this.overlay.querySelector(".battle-active-name").textContent = "-";
      this.overlay.querySelector(".battle-skill-description").textContent = "Espera al siguiente turno aliado.";
    }

    renderEnemyTurn() {
      this.clearSkills();
      this.message(`${this.enemy.name} actúa.`);
    }

    enemyAction() {
      const actor = this.enemy;
      const finalSkill = actor.skills.find((skill) => skill.isFinalAttack);

      if (actor.preparingFinalAttack) {
        actor.preparingFinalAttack = false;
        if (finalSkill && actor.currentPm >= finalSkill.pmCost) {
          actor.currentPm -= finalSkill.pmCost;
          const target = this.pickEnemyTarget(finalSkill);
          this.message(this.applySkill(actor, finalSkill, target));
          actor.normalTurnsSinceFinal = 0;
        } else {
          this.message(`${actor.name} pierde la concentración y vuelve a atacar normal.`);
          actor.normalTurnsSinceFinal = 0;
          this.useEnemyNormalSkill(actor);
        }
        this.endActorTurn(actor);
        this.updateHud();
        setTimeout(() => this.nextTurn(), 1100);
        return;
      }

      const pattern = actor.finalAttackPattern;
      if (finalSkill && pattern && actor.normalTurnsSinceFinal >= pattern.normalTurnsBeforeCharge) {
        if (actor.currentPm >= finalSkill.pmCost) {
          actor.preparingFinalAttack = true;
          this.message(pattern.warningText || `${actor.name} se está preparando...`);
        } else {
          actor.normalTurnsSinceFinal = 0;
          this.useEnemyNormalSkill(actor);
        }
        this.endActorTurn(actor);
        this.updateHud();
        setTimeout(() => this.nextTurn(), 1100);
        return;
      }

      this.useEnemyNormalSkill(actor);
      actor.normalTurnsSinceFinal += 1;
      this.endActorTurn(actor);
      this.updateHud();
      setTimeout(() => this.nextTurn(), 1100);
    }

    useEnemyNormalSkill(actor) {
      const available = actor.skills.filter((skill) => !skill.isFinalAttack && actor.currentPm >= skill.pmCost);
      const free = actor.skills.filter((skill) => !skill.isFinalAttack && skill.pmCost === 0);
      const skill = available.length > 0
        ? available[Math.floor(Math.random() * available.length)]
        : free[0];
      actor.currentPm = Math.max(0, actor.currentPm - skill.pmCost);
      const target = this.pickEnemyTarget(skill);
      this.message(this.applySkill(actor, skill, target));
    }

    pickEnemyTarget(skill) {
      if (skill.target === "all_allies") return this.allies.filter((ally) => ally.currentHp > 0);
      const tauntTarget = this.enemy.statuses.find((status) => status.type === "taunt" && status.turns > 0);
      if (tauntTarget) {
        const target = this.allies.find((ally) => ally.id === tauntTarget.targetId && ally.currentHp > 0);
        if (target) return target;
      }
      const alive = this.allies.filter((ally) => ally.currentHp > 0);
      return alive[Math.floor(Math.random() * alive.length)];
    }

    applySkill(actor, skill, target) {
      if (skill.target === "all_allies" || skill.type === "party_heal") {
        const targets = Array.isArray(target) ? target : this.allies.filter((ally) => ally.currentHp > 0);
        const results = targets.map((singleTarget) => this.applySingleTargetSkill(actor, skill, singleTarget));
        return `${actor.name} usa ${skill.name}. ${results.join(" ")}`;
      }

      return `${actor.name} usa ${skill.name}. ${this.applySingleTargetSkill(actor, skill, target)}`;
    }

    applySingleTargetSkill(actor, skill, target) {
      if (!target || target.currentHp <= 0) return "Pero no hay objetivo válido.";

      if (skill.type === "heal") {
        const amount = Math.min(skill.power, target.maxHp - target.currentHp);
        target.currentHp += amount;
        return `${target.name} recupera ${amount} HP.`;
      }

      if (skill.type === "party_heal") {
        const amount = Math.min(skill.power, target.maxHp - target.currentHp);
        target.currentHp += amount;
        return `${target.name} recupera ${amount} HP.`;
      }

      if (skill.type === "ally_shield") {
        this.addStatus(target, { type: "shield", stat: "shield", value: skill.damageReduction, turns: skill.duration });
        return `${target.name} queda protegido.`;
      }

      if (skill.type === "ally_speed_up") {
        this.addStatus(target, { type: "speed_up", stat: "speed", value: skill.speedModifier, turns: skill.duration });
        return `${target.name} gana velocidad.`;
      }

      if (skill.type === "ally_evasion_up") {
        this.addStatus(target, { type: "evasion_up", stat: "evasion", value: skill.evasionModifier, turns: skill.duration });
        return `${target.name} se vuelve mucho más difícil de acertar.`;
      }

      if (skill.type === "taunt") {
        this.addStatus(this.enemy, { type: "taunt", targetId: actor.id, turns: skill.duration });
        return `${this.enemy.name} fija su atención en ${actor.name}.`;
      }

      if (!this.rollHit(actor, skill, target)) {
        return `${target.name} esquiva el ataque.`;
      }

      let result = "";
      if (["damage", "damage_speed_down", "mp_drain", "mp_damage", "damage_attack_down", "multi_damage"].includes(skill.type)) {
        const damage = this.calculateDamage(actor, skill, target);
        target.currentHp = Math.max(0, target.currentHp - damage);
        result += `${target.name} recibe ${damage} de daño.`;
      }

      if (skill.type === "damage_speed_down" && target.currentHp > 0) {
        this.addStatus(target, { type: "speed_down", stat: "speed", value: skill.speedModifier, turns: skill.duration });
        result += ` Su velocidad baja.`;
      }

      if (skill.type === "mp_drain") {
        const drained = Math.min(skill.mpDamage, target.currentPm);
        target.currentPm -= drained;
        const restored = Math.min(skill.mpRestore, actor.maxPm - actor.currentPm);
        actor.currentPm += restored;
        result += ` Pierde ${drained} PM y ${actor.name} recupera ${restored} PM.`;
      }

      if (skill.type === "mp_damage") {
        const drained = Math.min(skill.mpDamage, target.currentPm);
        target.currentPm -= drained;
        result += ` También pierde ${drained} PM.`;
      }

      if (skill.type === "damage_attack_down" && target.currentHp > 0) {
        this.addStatus(target, { type: "attack_down", stat: "attack", value: skill.attackModifier, turns: skill.duration });
        result += ` Su ataque baja.`;
      }

      return result;
    }

    rollHit(actor, skill, target) {
      const baseAccuracy = skill.accuracy === undefined ? 0.9 : skill.accuracy;
      const hitChance = clamp(baseAccuracy - this.getEvasion(target), 0.15, 0.98);
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
      target.statuses = target.statuses.filter((active) => active.type !== status.type);
      target.statuses.push({ ...status });
    }

    endActorTurn(actor) {
      this.advanceFighterClock(actor);
      actor.statuses.forEach((status) => {
        if (status.turns !== undefined) status.turns -= 1;
      });
      actor.statuses = actor.statuses.filter((status) => status.turns === undefined || status.turns > 0);
    }

    message(text) {
      this.overlay.querySelector(".battle-message").textContent = text;
    }

    checkBattleEnd() {
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
      const result = document.createElement("div");
      result.className = `battle-result ${won ? "victory" : "game-over"}`;
      result.innerHTML = `
        <div class="battle-result-panel">
          <h2>${won ? "Victoria" : "Game Over"}</h2>
          <p>${won ? `${this.enemy.name} ha sido derrotada.` : "El equipo ha caído en combate."}</p>
          <button class="battle-result-button">Continuar</button>
        </div>
      `;
      this.overlay.appendChild(result);
      result.querySelector(".battle-result-button").addEventListener("click", () => {
        this.overlay.remove();
        this.resolve(won);
      });
    }
  }

  window.BattleMinigame = {
    play(options = {}) {
      const minigame = new BattleMinigame(options);
      return minigame.play();
    },
    allies: ALLIES,
    enemies: ENEMIES
  };
})();
