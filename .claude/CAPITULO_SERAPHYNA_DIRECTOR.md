# 🎬 CAPÍTULO 3 «SERAPHYNA» — BIBLIA DIRECTOR'S CUT

> **Qué es esto:** análisis exhaustivo del capítulo 3 (Ecchi Land) tal y como está HOY —
> guión, arte, poses, sonido, efectos y minijuegos, **jugado entero en navegador** — y el
> plan completo para convertirlo en el mejor capítulo del juego: más dramático, más épico,
> con más comedia y con verdadera tensión de supervivencia.
>
> **Cómo usarlo:** primero lee el *Diagnóstico* y los *Pilares*. Después cada escena tiene
> su ficha: QUÉ HAY → QUÉ FALLA → QUÉ HACER (con guión nuevo, acciones JSON y assets).
> Al final: specs de engine, prompts de producción listos para copiar y el plan por fases
> con checkboxes para ejecutarlo en orden. Documento hermano de `CAPITULO_TONY.md`
> (aquella biblia cuenta lo YA producido; esta manda sobre CÓMO elevarlo).
>
> Fecha: 22-jul-2026 · Basado en playtest completo (rama verdad+foto, delay 0) + lectura
> de chapter3.json (18 escenas), engine.js, inventario de assets y hoja de poses.

---

# 1 · DIAGNÓSTICO EJECUTIVO

## 1.1 Lo que YA brilla (no tocar, apoyarse en ello)
- **El arte de fondos es de primera**: skyline de Ecchi Land, multitud con ojos-corazón,
  camerino glam, desmadre terrorífico, foco sobre Santi. Nivel profesional.
- **El guión tiene corazón**: el reveal cómico (fantasmitas), la lógica del "su voz los
  mantiene serenos" (¡la premisa de supervivencia ya existe!), el derrumbe de Seraphyna y
  el discurso de Samu son ORO. La estructura de 15 pasos es sólida.
- **El sistema de iluminado del hablante** vende cada plano de diálogo él solo.
- **Los cimientos técnicos existen**: juice (grade/vignette/shake/flash), playVideo,
  minijuegos con dificultad por delay, bad ending con reintento, choices.
- **La música compuesta cubre casi todo** (10 pistas) y el opening es una cinemática real.

## 1.2 Los problemas (numerados — se citan por código en todo el documento)

| # | Problema | Gravedad |
|---|----------|----------|
| **B1** | **El Diapasón de Plata NO se entrega** en esta versión del capítulo. El minijuego `paloma` del cap. 4 lee `hasItem('diapason')` para dar ventaja. Rompe la recompensa del orden Edu→Tony→José. | 🔴 Continuidad |
| **B2** | **`disco-rayado.mp3` suena 4 veces** (Santi llega, motos, foco, llamada José). En el FOCO es un gag encima del beat más serio del acto 2; en la llamada de José tampoco pega. El chiste se gasta. | 🔴 Tono |
| **B3** | **Música huérfana**: `rotura_hechizo.mp3` (M5, el clímax) y `ecchiland_oscuro.mp3` (M6) no suenan nunca. | 🟠 |
| **B4** | **El payoff de supervivencia no se VE**: tras el opening se corta directo al camerino con la multitud "ya serena" contada en pasado. El momento en que su voz doma a la turba es EL clímax del capítulo y ocurre fuera de cámara. | 🔴 Drama |
| **B5** | **Los minijuegos no reaccionan al resultado**: ganes perfecto o por los pelos, la línea posterior es idéntica. Sin variantes no hay sensación de "he sobrevivido". | 🟠 |
| **B6** | **El fondo del foco SPOILEA el accidente**: la Escena 9 abre con `foco_cae_santi.png` (foco cayendo + Santi aplastado) mientras el sprite de Santi dice de pie "dame dos segundos" → **Santi sale DOS VECES en pantalla**. | 🔴 Visual |
| **B7** | **El fondo de la calle spoilea a Santi**: el coche tuneado está aparcado en `calle_coche.png` desde la línea 0, pero "llega con un frenazo" en la línea 3. | 🟠 Visual |
| **B8** | `samu_worried.png` tiene un **parche de píxeles basura** (verde/arcoíris) en el hueco del brazo. | 🟡 Sprite |
| **B9** | **El cielo del minijuego chase es un DAMERO gris** horneado en el PNG del fondo (artefacto de IA). Parece un muro de ajedrez gigante. | 🔴 Visual |
| **B10** | **Todas las transiciones de escena son CORTE SECO** (setBackground cambia el estilo sin fundido) y los personajes aparecen/desaparecen a pelo. Cada cambio da un golpe visual gratuito. | 🔴 Engine |
| **B11** | El **chase golpea nada más empezar** (sin invulnerabilidad de spawn ni tras recibir daño visible). | 🟠 Game feel |
| **B12** | **Las escenas clímax son demasiado cortas**: llegada a Ecchi Land (3 líneas), desmadre (2 líneas), reveal instantáneo. Los momentos gordos no respiran. | 🔴 Ritmo |
| **B13** | El texto describe SONIDOS (gruñidos, golpes, chillidos, crujidos) que **nunca suenan**: no hay SFX de multitud, crash, latido, ring de móvil, chispas… | 🔴 Sonido |
| **B14** | En el derrumbe, 2B narra que Seraphyna "cae de rodillas" y que "los tres se abrazan" pero **no existen ni pose arrodillada ni CG del abrazo**: los sprites siguen de pie, separados. | 🔴 Drama |
| **B15** | Poses compradas y sin usar: `santi_conduciendo` (¡en las 3 escenas de coche!), `gorila_contento` (cuando lo camelas), `tony_giggle/alarmed/worried`, `samu_angry/sad/thinking`, `edu_facepalm/sad`. | 🟡 |
| **B16** | Los no-hablantes se quedan CONGELADOS en su última pose (Samu con las manos en la cabeza durante 4 escenas). | 🟡 Dirección |
| **B17** | En el desmadre, los 3 sprites TAPAN el fondo de terror: el arte más impactante del capítulo apenas se ve. | 🟠 Composición |

## 1.3 Veredicto
El capítulo es un 7/10 sólido con cimientos de 10: guión con alma, arte top y sistemas
listos. Lo que lo separa del "mejor capítulo de todos" **no es contenido nuevo masivo**,
sino: (1) tres primitivas de engine (fundidos, beats temporizados, capa de SFX),
(2) sonido de verdad en el giro a terror, (3) dejar RESPIRAR los 4 momentazos
(llegada, reveal, desmadre→foco, concierto→calma), (4) dos assets emocionales
(pose derrumbe + CG abrazo) y (5) coser los cabos (Diapasón, variantes de victoria).

---

# 2 · PILARES DE DIRECCIÓN (la brújula del capítulo)

**P1 — La montaña rusa tonal es el capítulo.** Comedia (acto 1: Santi, Gorila) →
glamour+comedia (reveal) → TERROR (desmadre, foco) → supervivencia (minijuegos con la
turba de fondo) → éxtasis (opening) → lágrima (derrumbe/abrazo) → amanecer (cierre).
Cada tramo debe COMPROMETERSE con su tono: los gags nunca dentro del terror (B2), el
terror nunca diluido por gags. El contraste es lo que hace grande cada extremo.

**P2 — La supervivencia se juega, no se cuenta.** La premisa ya existe ("sin mi voz se
descontrolan"): hacerla MECÁNICA. La turba es un reloj: cada tramo del acto 2 debe
sentirse como "la ciudad se nos muere en los brazos". Fallos en minijuegos = la turba
empeora A LA VISTA (medidor, sonido de fondo que crece, línea extra de pánico). Ganar
por los pelos debe NOTARSE (B5).

**P3 — Los momentazos respiran.** Regla: un momento gordo = mínimo 4-6 beats (llegada,
reveal, desmadre, calma post-opening). Usar silencio, beats temporizados (`wait`),
texto lento y planos "solo fondo" (sin sprites, B17) antes del golpe.

**P4 — El sonido cuenta la mitad de la historia.** Cada cosa que el texto diga que suena,
SUENA (B13). Jerarquía: música (emoción) + cama ambiental (multitud) + SFX puntuales
(golpes) + silencio (el arma secreta: cortar TODO 1-2 s antes de los sustos).

**P5 — Seraphyna es el personaje, la diva es el disfraz.** Toda la dirección empuja a un
arco visible en poses y voz: flirt/diva (armadura) → angry (grieta) → shocked (miedo real)
→ determined (artista profesional) → sad/derrumbe (verdad) → happy (amiga). El jugador
debe poder releer el capítulo y ver que la diva siempre fue una jaula.

---

# 3 · REDISEÑO ESCENA A ESCENA — ACTO 1 (comedia y carretera)

> Formato de cada ficha: **AHORA** (lo que hay) → **FALLA** → **HACER** (cambios concretos;
> las líneas de guión nuevas van en cursiva y las acciones en `código`). Los assets nuevos
> que se citan están en la lista de producción (§6) con su prompt listo.

## E1 · «El recogedor» (calle, aparece Santi)

**AHORA:** 2B sitúa (mensaje del concierto) → Edu sospecha que es Tony → Samu «no tenemos
coche» → frenazo (disco-rayado + shake + flash) → Santi saludando → chiste Kiikiaskel →
al coche. Música: `trayecto_coche.mp3` desde el inicio. Fondo: `calle_coche.png` con el
coche YA aparcado (B7).

**FALLA:** B7 (coche visible antes del frenazo). Santi aparece a pelo. La música de
«viaje» suena antes de subirse al coche. El mensaje parpadeante solo se cuenta.

**HACER (esfuerzo S, impacto alto):**
1. **Fondo nuevo `calle_espera.png`** (variante SIN coche de calle_coche — img2img §6.A1).
   La escena abre con él y con música expectante: reutilizar `ecchiland_oscuro.mp3` a
   vol 0.18 (B3 medio resuelto): la ciudad ya «llama» desde lejos.
2. Beat nuevo del móvil tras la línea de Edu (comedia + siembra):
   `playSound sfx_movil_vibra` (§6.C) — *2B: «El móvil de Edu vuelve a vibrar. El mismo
   mensaje, por tercera vez, ahora con corazones. A los mensajes normales no les salen
   corazones solos.»*
3. El frenazo, en 3 tiempos (en vez de 1):
   - `sfx_derrape` + `shake 7` → *2B: «Un chirrido de neumáticos dobla la esquina.»*
   - `setBackground calle_coche.png` (AHORA aparece el coche) + `flash blanco 160`.
   - `showCharacter santi saludando` con **entrada deslizante** (`enter: "right"`, §5.4)
     + disco-rayado. El gag del disco QUEDA aquí — y es su ÚNICA aparición (B2).
4. Chiste extra de personaje al final: *Santi: «Eso sí: el de atrás va con las rodillas en
   las orejas, que el maletero lo ocupa el ampli.»*
5. `trayecto_coche.mp3` NO empieza hasta el goToScene, con `sfx_motor_arranca` (§6.C).

## E2 · «El trayecto» (interior del coche, la advertencia)

**AHORA:** 5 líneas. Resplandor lejano → advertencia de Santi («la gente no vuelve a salir
igual… no miréis mucho al escenario») → chiste de Edu → «uy uy uy» motos. Santi de pie en
pose `preocupado`.

**FALLA:** La advertencia es LA semilla de terror del capítulo y pasa en 1 línea. Santi de
pie sobre el salpicadero (existe `conduciendo` sin usar, B15). Sin cama sonora.

**HACER (esfuerzo S-M, impacto alto):**
1. `showCharacter santi center conduciendo` toda la escena (B15). Samu/Edu con
   `neutral`/`thinking` (no arrastrar el susto de E1, B16).
2. Cama: `sfx_motor_loop` vol 0.10 bajo la música (§6.C).
3. **El beat de la radio** (nuevo — terror barato del bueno):
   - *2B: «Santi enciende la radio. Una voz femenina, dulce como el almíbar, canta un
     estribillo pegadizo. Samu se descubre tarareándolo sin saber de qué le suena.»*
   - `playSound cae_a_mis_pies.mp3 vol 0.12 id radio` (¡el tema del opening como siembra
     subliminal!)
   - *Edu: «Anda, qué bonita. ¿Quién canta?»*
   - `stopSound radio` EN SECO + *Santi: «Nadie. —La apaga de un manotazo—. En mi coche
     no se escucha a ESA. Norma de la casa.»*
   - *Samu: «…Vale. Eso no ha dado mal rollo ni nada, Santi.»*
4. La línea de Edu («Coleccionamos.») se queda: es perfecta.
5. En «agarraos a algo»: `sfx_moto_revving` LEJANO (vol 0.15) DOS segundos antes del shake
   — que el jugador lo oiga venir antes que los personajes (ironía dramática sonora).

## E3 · «Asalto en la carretera» (minijuego chase)

**AHORA:** Samu grita → aviso de dificultad → `chase` con `persecucion_carretera` ✓ →
Santi celebra → Ecchi Land. HUD corazones/progreso/toast ✓, modal de derrota con estilo ✓.

**FALLA:** B9 (cielo damero), B11 (golpe al empezar), B5 (victoria única), entrada sin rampa.

**HACER (esfuerzo M, impacto alto):**
1. **Regenerar `carretera_loop_fondo`** sin damero (§6.A2): cielo nocturno + skyline de
   neón lejano. 20 minutos que cambian el minijuego entero (B9).
2. **Spawn protection** en `runSideScroller` (§5.7): 1.2 s inicial + 0.8 s tras cada golpe
   con parpadeo del sprite (B11).
3. Rampa de entrada (1 línea): *Santi: «¡Primera moto en el retrovisor! ¡Ahí vienen TODAS!
   ¡AGARRAOS!»* + `sfx_moto_revving` fuerte → minigame.
4. **Salida con variantes** (B5, patrón §5.8):
   - 0 golpes → *Santi: «¡NI ME HAN ROZADO EL CACHARRO! Cuarenta años, chavales. CUARENTA.
     AÑOS.»* (riendo)
   - 1-2 golpes → línea actual de la rotonda.
   - Al límite → *Santi: «…El retrovisor lo pago yo, ¿no? Ya. Como siempre.»* (preocupado).
5. Tras ganar, antes de E4: `sfx_claxon_festivo` cortito — respiro cómico de fin de acto.

## E4 · «Ecchi Land» (LA LLEGADA — momentazo 1)

**AHORA:** corte seco a skyline + ambient + 3 líneas. El fondo es espectacular y dura
10 segundos en pantalla.

**FALLA:** B12: el póster del capítulo entra con corte seco, sin música-evento y con
3 líneas. Cero asombro. El cameo-gala de 2B (idea de la biblia vieja) sin usar.

**HACER (esfuerzo M, impacto MUY alto):**
1. **Secuencia de llegada** (sustituye al corte):
   - `fadeOut` a negro 800 ms (§5.1) con `stopSound bg_music fade 600`.
   - En negro: *Santi: «Última curva. Cerrad la boca, que entra purpurina.»*
   - `setBackground skyline` + `fadeIn 1200` + **Ken Burns** lento (`bgPan` zoom 1.06→1.0,
     §5.3) + `ecchiland_ambiente` fadeIn 2000 + `sfx_multitud_lejana` vol 0.15.
2. **2B en modo gala** (2 líneas nuevas):
   *2B: «Damas, caballeros y demás fauna: bienvenidos a ECCHI LAND. Población: enamorada.
   Tema del día: ella. Temas restantes: también ella.»*
   *2B: «En cada pantalla, la misma loba de plata. Sonríe como quien sabe algo que tú no.»*
3. La línea de Edu («¿No te recuerda a…?») con `textSpeed: slow` (§5.5) + `vignette 0.25`.
4. Samu cierra igual («Ni lo digas.») → fundido corto a E5 (B10).

## E5 · «La multitud» + E6 · «El Gorila» (comedia de tensión)

**AHORA:** multitud (1 línea) → sombra → Gorila center a pelo → susurro de Samu → E6 con
`gorila_camelo` + grade oscuro + choice de 3 → ramas 6a (verdad→foto/suplicar), 6b (trola,
+1 delay), 6c (suplicar, +1 delay), Bad Ending (chulo).

**FALLA:** El Gorila aparece sin peso (la «sombra enorme» se narra sin verse). Las ramas
ganadoras son 1 intercambio. `gorila_contento` sin usar (B15). La foto de los tres es un
Chekhov desaprovechado.

**HACER (esfuerzo M, impacto alto):**
1. Entrada del Gorila con peso: `sfx_pasos_pesados` ×2 con `shake 3` por paso →
   `showCharacter gorila` con `enter: "bottom"` (§5.4) + `vignette 0.45`.
   *2B: «La luz desaparece. No porque la hayan apagado: porque hay ALGUIEN delante de
   toda ella.»*
2. **Rama verdad ampliada** (la foto merece ceremonia):
   - *Edu (rebusca en el móvil): «Mira. Diciembre. Los tres en el sofá de Samu: yo palmando
     al Mario Kart, Tony robándome las patatas y este de árbitro. ¿Esto se inventa?»*
   - `showCG foto_trio.png` (§5.6 + asset §6.A3): LA FOTO a pantalla — y la RECUPERAMOS
     en E13 (Chekhov cerrado).
   - `showCharacter gorila contento` (B15): *Gorila: «…El del mando roto es clavadito a la
     jefa. Pasad antes de que me arrepienta. Y ni una foto ahí dentro, ¿eh?»*
3. **Rama trola con un beat más**: el Gorila pregunta algo técnico (*«¿Cuántos ohmios tiene
   la etapa del PA?»*) con mini-choice: farolear con estilo («Los que pida la señora») pasa
   con gracia; dudar suma el delay actual.
4. Bad Ending: se queda (funciona) + `sfx_portazo` + `wait 1000` en negro antes del texto
   del FINAL MALO (§5.2).
5. `gorila_camelo.mp3` se queda: el funk de atraco es PERFECTO aquí.

---

# 4 · REDISEÑO ESCENA A ESCENA — ACTOS 2 y 3 (terror, supervivencia y lágrima)

## E7 · «El camerino» (EL REVEAL — momentazo 2)

**AHORA:** corte al camerino → TODO entra de golpe (Seraphyna flirt + Samu/Edu shocked +
flash rosa) → «eres un TÍO» → réplicas de diva → interrupción (ruidos) → desmadre. La
composición cómica (fantasmitas) es oro.

**FALLA:** El reveal más esperado del juego dura 0 segundos: no hay descubrimiento, hay
foto fija. La interrupción de los gruñidos no SUENA (B13).

**HACER (esfuerzo M, impacto MUY alto) — el reveal en 5 tiempos:**
1. `fadeOut` → *2B: «El pasillo del backstage huele a laca, a flores nuevas y a secreto.»*
   → `fadeIn` camerino SIN nadie (el fondo glam se luce solo un beat, B17).
2. VOZ antes que cuerpo (la voz es su arma — que llegue primero):
   *??? (sin sprite, nombre «???»): «Está abierto. Si venís a por autógrafos, la cola
   empieza en Huelva.»* — con `sfx_pintalabios_click` sutil.
3. `showCharacter tony center flirt` con `enter: "fade"` lento + `flash rosa 260` +
   **sting musical**: `playSound rotura_hechizo.mp3 vol 0.35 loop:false` SOLO 3-4 s
   (B3: la fanfarria del clímax, usada como acorde de presentación) → *2B: «Y ahí está.
   La diva de plata, retocándose ante el espejo como quien afina un arma.»*
4. AHORA entran Samu y Edu (`enter: "left"/"right"`) → shocked + fantasmitas → la línea
   «¿T-Tony? …¡Y esto… esto es Seraphyna!» tal cual (es perfecta).
5. Del guión actual se mantiene todo lo demás (eyeroll «Tony era otra vida, cielo», el
   aviso de Edu, angry «no pienso volver a ser un don nadie»). Añadir solo:
   - Tras el «¿A eso venís, a estropeármelo?» un beat cómico que humanice YA:
     *Seraphyna (giggle, B15): «…Madre mía, vuestras CARAS. Vale, sí, soy yo. El que os
     reventaba al Mario Kart. No me miréis así, que se me corre el eyeliner.»*
   - La interrupción con SONIDO REAL (B13): `stopAllSounds` → `wait 700` de SILENCIO →
     `sfx_gruñidos_multitud` vol 0.3 + `shake 6` → la línea de 2B de los ruidos con
     `textSpeed: slow`. (El silencio previo es el 80 % del susto.)

## E8 · «El desmadre» (terror — momentazo 3)

**AHORA:** corte a `fans_desmadrandose` + música + grade rojo + shake, 2 líneas, y los
TRES SPRITES tapando el fondo (B17). El arte de terror apenas se ve.

**FALLA:** B12 (2 líneas para el giro de género), B17, y el terror entra sin construcción.

**HACER (esfuerzo M, impacto MUY alto):**
1. `hideCharacter` de los tres ANTES del cambio: que el fondo de terror se muestre SOLO,
   a pantalla completa, 2 beats (B17).
2. Secuencia: `fadeOut` corto → `setBackground fans_desmadrandose` + `fadeIn` +
   `fans_desmadre.mp3` + `sfx_gruñidos_multitud` en LOOP a 0.25 (cama constante hasta E12
   — la turba nunca deja de oírse: ESTO es la tensión de supervivencia sonora).
3. Guión ampliado (de 2 a 5 beats):
   - *2B: «Se asoman entre las cortinas. Ojalá no lo hubieran hecho.»* (textSpeed slow)
   - *2B: «El mar de fans hierve. Unos se retuercen mientras el glitch les come la cara;
     otros ya solo enseñan los dientes. Los corazones de neón siguen flotando encima,
     como si nadie les hubiera dicho nada.»* (la imagen del corazón sobre el horror = tono)
   - `showCharacter` de los tres YA en poses shocked/alarmed (vuelven al plano).
   - *Edu (facepalm→alarmed, B15): «Vale. Recuerda mi colección de sitios de los que la
     gente no vuelve igual. CRECE.»* (comedia de válvula, 1 línea y fuera)
   - Línea actual de Seraphyna («Sin la música se descontrolan… ¡Santi! ¡EL EQUIPO!») con
     `heartbeat` ON (§5.9: latido grave en loop — se queda hasta el opening).
4. Grade más agresivo al entrar: `saturate(0.85) contrast(1.3) brightness(0.75)
   hue-rotate(-25deg)` 900 ms + `vignette 0.55`.

## E9 · «El foco» (el accidente — pivote del acto)

**AHORA:** B6 EN TODO SU ESPLENDOR: la escena abre con el fondo del foco YA caído y Santi
aplastado detrás… mientras el sprite de Santi dice de pie «dame dos segundos». Santi sale
DOS VECES. El crash suena a disco-rayado (B2).

**HACER (esfuerzo M, impacto MUY alto) — el accidente en 4 tiempos:**
1. Abrir con **fondo nuevo `backstage_mesa.png`** (§6.A4: la mesa de sonido INTACTA,
   img2img del fondo actual) + `showCharacter santi center mesa` (¡pose mesa sin usar,
   B15!): Santi currando de espaldas a la desgracia.
2. Aviso arriba (ironía + pánico): `sfx_crujido_metal` + `shake 3` +
   *2B: «Algo cruje encima del escenario. Polvo de purpurina cae en espiral, casi bonito.»*
   *Seraphyna (alarmed, B15): «¡SANTI! ¡ARRIBA! ¡APÁRTATE!»* (textSpeed fast — el pánico
   se escribe rápido)
3. EL CRASH: `flash blanco 180` + `setBackground foco_cae_santi.png` (AHORA sí — el fondo
   ES el fotograma del impacto, usado en su momento exacto) + `sfx_crash_foco` (§6.C;
   mientras no exista: `sword_thud_rock` + `fast_whoosh_and_zaps` a la vez) + `shake 14` +
   `hideCharacter santi` (el sprite desaparece: el del fondo ES él) + `wait 900` sin texto.
4. `showCharacter santi center herido` + sus líneas actuales (que son buenas) + al
   repartir tareas, Seraphyna en `determined` con UNA línea nueva de capitana:
   *Seraphyna: «Miradme. Esto es un concierto: cada uno tiene su instrumento y su
   entrada. Si fallamos, el público nos come. LITERALMENTE. ¿Listos? Tres, dos…»*
   (te da la épica Y la regla de supervivencia en una línea)

## E10 · «Afinar el equipo» (Neon Runner) + E11 · «Las partituras» (vuelo)

**AHORA:** 1 línea de intro cada uno, minijuego, 1 línea de éxito. La cama de fans sigue
sonando de fondo tras cada victoria ✓ (bien pensado ya).

**FALLA:** B5 (sin variantes), falta el marco de supervivencia (qué pasa si fallo) y el
«mientras tanto» del otro (paralelo narrado que no se siente).

**HACER (esfuerzo S-M):**
1. Antes de cada minijuego, UNA línea de riesgo (no más):
   - Neon Runner: *Seraphyna: «Cada nota que falles, ahí fuera alguien deja de ser fan y
     pasa a ser fiera. Sin presión, cielo.»*
   - Vuelo: *Santi (herido): «Los focos sueltos caen sin avisar, chaval. Como yo. Vuela
     BAJO cuando dudes.»*
2. **Variantes de salida** (B5): victoria limpia / justa / al límite cambian la línea
   posterior (patrón §5.8). Ej. al límite en el vuelo: *Edu: «Las tengo… y me huele el
   flequillo a chamusquina. NO preguntes.»*
3. Entre ambos, un beat de paralelo (1 línea): *2B: «Dos pisos más arriba, un dragón azul
   respira hondo delante del vacío. Abajo, la turba corea algo que ya no es su nombre.»*
   + `sfx_gruñidos_multitud` sube a 0.35 un instante.
4. En el `rhythm`, plantear `spinnerCount: 2` con delay alto (ya soportado) — el «macháca»
   final vende el esfuerzo físico de afinar.

## E12 · «El concierto» (opening) + **E12-BIS · «La voz» (NUEVA — resuelve B4)**

**AHORA:** blackout limpio → `opening_tony.mp4` ✓ (funciona, saltable) → corte al camerino
con la calma YA contada en pasado. El payoff de TODO el capítulo ocurre fuera de cámara (B4).

**HACER (esfuerzo M-L, impacto MÁXIMO) — añadir escena tras el vídeo:**
1. Mantener el pre-video actual (blackout + «Y entonces… empieza.» es excelente).
2. **E12-BIS**, inmediatamente después del vídeo:
   - `setBackground fans_calmandose.png` (§6.A5: variante img2img del desmadre con la
     turba QUIETA mirando al escenario, luz cálida rosa) + `playSound rotura_hechizo.mp3`
     COMPLETA (B3: por fin su sitio) + `heartbeat` OFF + `sfx_gruñidos_multitud` fade out
     lento (el silencio que llega = victoria audible).
   - *2B: «Y entonces la voz hace lo que las vallas, los porteros y el miedo no pudieron:
     los DEVUELVE. Uno a uno, el glitch se apaga como quien despierta de una pesadilla.»*
   - *2B: «Delante del escenario ya no hay monstruos. Hay gente llorando de alegría sin
     saber por qué. Y encima del escenario, una loba de plata que canta como si le fuera
     la vida… porque le va.»* (textSpeed slow)
   - (Opcional de lujo, §6.D: clip Lumeflow de 6-8 s de la turba calmándose, con
     `playVideo` — si sale bien, es el plano más épico del juego.)
3. Tras E12-BIS → fundido al camerino (E13). Ahora el derrumbe cae sobre una victoria
   VISTA, no contada: la lágrima pesa el doble.

## E13 · «El derrumbe» (la lágrima — momentazo 4)

**AHORA:** música desde el segundo 0, diálogo excelente, sepia+viñeta bonitos, PERO:
«cae de rodillas» sin pose arrodillada, abrazo narrado sin verse (B14), y la foto de E6
nunca vuelve.

**HACER (esfuerzo M-L, impacto MÁXIMO):**
1. **Entrar en SILENCIO** (sin música): las dos primeras líneas (Samu «vente con
   nosotros», Seraphyna «no lo entendéis…») a palo seco. `abrazo_seraphyna.mp3` con
   `fadeIn 2000` ARRANCA exactamente en el «Escúchame bien, tío» de Samu (la música
   entra CON el discurso = efecto lágrima x2).
2. **Pose nueva `tony_derrumbe`** (§6.B1: de rodillas, melena tapando la cara) para la
   línea de 2B «se le doblan las rodillas» (B14). Es LA pose del capítulo.
3. **Callback de la foto** (Chekhov de E6 cerrado): tras el discurso de Samu:
   *Samu: «Y si no me crees a mí… créele a esto.»* + `showCG foto_trio.png` otra vez +
   *Seraphyna (derrumbe→sad): «…Seguís guardando esa foto horrible.»*
   *Samu: «Es mi favorita. Sales TÚ.»* ← (puñal directo. De nada.)
4. **CG del abrazo** (§6.A6): en la línea del abrazo, `showCG abrazo_trio.png` a pantalla
   completa (los tres en el suelo del camerino, ella en medio) + `sfx_llanto_suave` muy
   bajo. Mantener 2 líneas con el CG en pantalla. Es el money shot emocional del juego.
5. La línea final de Seraphyna («el nombre artístico me lo quedo») tal cual — remate
   cómico perfecto tras el llanto (P1). + `rescue tony` como ahora.
6. **AQUÍ el Diapasón (B1 RESUELTO)**, justo antes del goToScene:
   - *Seraphyna: «Espera. —Se quita algo del cuello del top y se lo pone a Samu en la
     pata—. Mi diapasón de plata. De mi otra vida. Cuando todo suene a caos… golpéalo y
     escucha. Siempre dice la verdad.»*
   - `giveItem diapason` + `sfx_diapason_ting` (§6.C: una nota pura cristalina).
   - *Samu: «¿Y esto para qué…?» / Seraphyna: «Tú hazme caso. Las divas SABEMOS.»*
   (Deja sembrado el uso en Paloma City sin explicarlo: elegancia.)

## E14 · «Rumbo a Paloma City» (cierre)

**AHORA:** skyline nocturno con hue-rotate haciendo de «amanecer», Santi despidiéndose
solo narrado, José con disco-rayado (B2), choice final → chapter4 ✓.

**HACER (esfuerzo S-M):**
1. **Fondo `skyline_amanecer.png`** (§6.A7: variante img2img con cielo de amanecer). El
   capítulo empezó al atardecer y acaba al alba: la noche entera cazando — que se VEA.
2. Cameo visual de Santi: `showCharacter santi right saludando` 2 líneas +
   *Santi: «¡Y si vais a Paloma City saludad de mi parte al del puesto de churros!
   ¡Me debe DINERO!»* → `hideCharacter` (despedida con cariño, no narrada).
3. La llamada de José: `sfx_movil_vibra` + `shake 3` (nada de disco-rayado, B2). Sus
   interferencias con `sfx_estatica` breve debajo.
4. Mantener `cierre_tony.mp3` y el choice final tal cual.
5. (Perla opcional) Tras elegir la opción, ANTES del salto: *Seraphyna: «¿Baldosas
   amarillas? Qué horterada. …Me encanta.»* — última palabra del capítulo para ella.

---

# 5 · MEJORAS DE ENGINE (specs implementables, en orden de valor)

> Convención: nuevos `case` en `executeAction` de engine.js + CSS en styles.css.
> **Regla del proyecto: NADA de vw/vh; todo en px/% del stage 1280×720; overlays
> colgando de `#game-container`.** Todas respetan `prefers-reduced-motion`.

## 5.1 `fade` — fundidos de escena (mata B10; el 80 % del salto de calidad visual)
- **Acción JSON:** `{ "type": "fade", "to": "black", "duration": 800 }` y
  `{ "type": "fade", "from": "black", "duration": 1000 }` (equivalentes `fadeOut`/`fadeIn`).
- **Implementación:** un overlay fijo `.scene-fader` (div negro, z-index entre fondo y
  UI de diálogo — p. ej. 850, por debajo de `.juice-flash`) con `transition: opacity`.
  `fadeOut` espera a que termine (promesa + `transitionend` con timeout de seguridad).
- **Y ADEMÁS, gratis:** `setBackground` con **crossfade automático**: segunda capa
  `#background-b`; al cambiar fondo, pintar en la capa oculta, `opacity 0→1` en 400 ms,
  y al terminar hacer swap. Si una escena quiere corte seco explícito:
  `{ "type": "setBackground", "value": "...", "cut": true }`.

## 5.2 `wait` — beats temporizados (terror y comedia dependen de esto)
- **JSON:** `{ "type": "wait", "ms": 900 }` — pausa el avance SIN input del jugador
  (bloquea el click durante la espera para que no se la salten sin querer).
- Trivial: `await new Promise(r => setTimeout(r, ms))` en el flujo de acciones, con
  guarda de skip (si el jugador mantiene Ctrl/skip, reducir a 150 ms).

## 5.3 `bgPan` — Ken Burns de fondos (reveals con vida)
- **JSON:** `{ "type": "bgPan", "zoomFrom": 1.06, "zoomTo": 1.0, "duration": 6000 }`
  (opcional `xFrom/xTo/yFrom/yTo` en %, para paneos).
- **Implementación:** animar `transform: scale/translate` del `#background` con
  `transition` larga; `transform-origin: center`. Al cambiar de fondo se resetea.
  (El fondo ya se pinta con `background-size: cover`; pasar a un `img` interno o animar
  `background-position/size` — más simple: envolver en `#background > .bg-img`.)

## 5.4 Entradas/salidas de personaje (`enter`/`exit` en show/hideCharacter)
- **JSON:** `{ "type": "showCharacter", ..., "enter": "right" | "left" | "bottom" | "fade" }`
  y `{ "type": "hideCharacter", ..., "exit": "fade" | "left" | ... }`.
- **Implementación:** clase CSS temporal (`.char-enter-right` = `transform: translateX(60px);
  opacity: 0` → transición a identidad 350 ms). El slot ya existe; es añadir la clase al
  poner el sprite y quitarla en el siguiente frame. Con reduced-motion: solo fade.

## 5.5 `textSpeed` por línea (el tempo del drama)
- **JSON (en la LÍNEA, no acción):** `"textSpeed": "slow" | "fast" | número` — multiplica
  el delay del typewriter (slow ≈ ×2.2, fast ≈ ×0.5). El blip de voz ya existe y lo hereda.
- Tocar `displayDialog`: leer `line.textSpeed` y ajustar el intervalo del typewriter.

## 5.6 `showCG` / `hideCG` — láminas a pantalla completa (foto, abrazo)
- **JSON:** `{ "type": "showCG", "path": "assets/backgrounds/cg/abrazo_trio.png",
  "duration": 600 }` / `{ "type": "hideCG" }`.
- **Implementación:** overlay `.cg-layer` (z-index por encima de personajes, por debajo
  del diálogo) con fade-in; los personajes siguen debajo y el diálogo sigue leyéndose.
  Auto-hide al cambiar de escena. Un borde/viñeta suave integrada queda de lujo.

## 5.7 Spawn protection en `runSideScroller` (B11)
- Config: `graceMs: 1200` al empezar y `hitGraceMs: 800` tras cada golpe.
- Durante la gracia: ignorar colisiones + parpadeo del sprite (`opacity` alterna con el
  ticker ya existente). Aplica a chase Y a eduvuelo sin duplicar código.

## 5.8 `minigameResult` — variantes según cómo ganaste (B5)
- Los play*Minigame ya saben los golpes/aciertos: guardarlos en
  `engine.lastMinigameResult = { hits, maxHits, accuracy }` al resolver.
- **JSON (línea condicional):** `"showIf": { "result": "clean" | "close" }` — `clean` =
  0 golpes (o accuracy ≥ 0.9), `close` = a 1 del límite. Las líneas sin `showIf` salen
  siempre. Implementación: filtrar en el bucle de líneas.

## 5.9 Capa de SFX + latido sintetizado (B13 sin esperar a ficheros)
- **JSON:** `{ "type": "sfx", "name": "heartbeat", "on": true }` — módulo Web Audio (como
  los blips del rhythm): latido = oscilador grave 55 Hz con envolvente ×2 pulsos (bum-bum)
  cada 900 ms, gain 0.12; `rumble` = ruido marrón filtrado a 60 Hz para el desmadre.
  Cero ficheros, control total del volumen, y se apaga con `{ "on": false }`.
- Los SFX de fichero (§6.C) van por `playSound` normal con `id` propio (p. ej. `sfx`).

## 5.10 (Opcional, si sobra energía) `crowdMeter` — el reloj de la turba visible
- Chip HUD arriba-dcha SOLO en E8→E12 («PÚBLICO: 🟢🟡🔴») que empeora con cada derrota
  en minijuegos y mejora al ganar limpio. Puramente presentacional (lee `storyDelay` +
  derrotas), pero convierte la supervivencia en algo que se VE. Esfuerzo M, impacto medio-alto.
- Si se hace: `{ "type": "crowdMeter", "value": "show" | "hide" | "worse" | "better" }`.

---

# 6 · PLAN DE PRODUCCIÓN DE ASSETS (con prompts listos para copiar)

> Herramientas: **[F-i2i]** = tu GeneradorPNG local, pestaña img2img (arrastras el fondo
> original, pegas el prompt, Denoising el indicado, LayerDiffuse OFF para fondos).
> **[F-txt]** = GeneradorPNG txt2img (LayerDiffuse ON para sprites transparentes).
> **[GEM]** = Gemini/ChatGPT imagen (para personajes con diseño exacto — luego pasa por
> tu QuitaFondos + escáner de marcas ✦ como siempre). **[LUME]** = Lumeflow i2v.
> Los fondos derivados conviene retocarlos a 2046×1152 (Real-ESRGAN si hace falta).

## 6.A — Fondos y CGs

**A1 · `calle_espera.png`** (E1, quita el coche) — [F-i2i] sobre `calle_coche.png`,
Denoising 0.45, prompt:
`empty spanish coastal town street at golden hour sunset, parked ordinary cars on the far side only, empty curb lane in the foreground where a car could stop, warm evening light, cartoon visual novel background, clean lineart, no people, no tuned car, high quality`
Negative: `neon car, tuned car, roof speaker, characters, text, watermark`

**A2 · `carretera_loop_fondo` SIN damero** (B9) — [F-i2i] sobre el actual, Denoising 0.55:
`seamless night sky above a coastal highway, deep purple starry sky with distant glowing neon city skyline on the horizon, small clouds, side-scrolling game parallax background strip, flat cartoon style, high quality`
Negative: `checkerboard, grid pattern, tiles, text, watermark`
(Comprobar que el borde inferior EMPALMA con la franja de carretera del loop cercano.)

**A3 · `cg/foto_trio.png`** (E6+E13, LA FOTO) — [GEM]:
`A cozy nostalgic home photo in cartoon visual-novel style: three young human friends from behind/three-quarter back view sitting squeezed on an old sofa playing a kart racing videogame on a TV, one holding a controller up celebrating, snack crumbs flying, warm lamp light, slightly grainy like a phone photo, white photo border like an instant print, NO faces clearly visible, no text, no watermark`
(Humanos DE ESPALDAS: enseña el «antes» sin inventar caras humanas canon.)

**A4 · `backstage_mesa.png`** (E9 pre-accidente, B6) — [F-i2i] sobre `foco_cae_santi.png`,
Denoising 0.5:
`backstage of a concert stage at night, an INTACT professional sound mixing console with glowing buttons, spotlights hanging SAFELY from the ceiling rig above, cables tidy, moody blue and purple stage lighting, cartoon visual novel background, nobody in the scene, no accident, no smoke, no sparks, high quality`
Negative: `falling spotlight, broken equipment, debris, smoke, sparks, rat, character, text`

**A5 · `fans_calmandose.png`** (E12-BIS, B4) — [F-i2i] sobre `fans_desmadrandose.png`,
Denoising 0.5:
`a huge concert crowd of anthropomorphic furry fans CALMING DOWN and returning to normal, standing still facing the stage in awe, soft warm pink and gold stage light washing over them, glitch effects fading away, tears of joy, gentle floating glitter, hopeful atmosphere, a silver-haired wolf idol singing on the distant stage with arms open, cartoon visual novel background, high quality`
Negative: `monsters, fangs, white horror eyes, aggression, dark red horror lighting, text`

**A6 · `cg/abrazo_trio.png`** (E13, MONEY SHOT) — [GEM] (fidelidad de diseño manda):
`Digital illustration, visual-novel anime/cartoon style, cel-shaded, clean black lineart, emotional group hug CG: on the floor of a glamorous pink dressing room, a glamorous anthropomorphic silver she-wolf pop idol (long wavy silver-grey mane, amber eyes closed with tears, black choker with silver ring, short red crop top) kneeling and crying while being embraced from both sides by a friendly anthropomorphic wolf with cream/beige fur and a fluffy mane with bright red-dyed tips (eyes shut tight, comforting) and a slim anthropomorphic light-blue Eastern dragon with messy brown hair, cream horns and long thin whiskers wearing a white t-shirt (joining the hug, teary), all three foreheads together, warm pink vanity lights bokeh background, tender bittersweet mood, soft rim light, no text, no watermark, 16:9`

**A7 · `skyline_amanecer.png`** (E14) — [F-i2i] sobre `skyline_eechi_land.png`,
Denoising 0.4:
`the same neon city by the sea at DAWN, soft orange and pink sunrise sky, neon lights still glowing but paler, morning haze over the sea, streets almost empty, peaceful after a long night, cartoon visual novel background, high quality`
Negative: `night sky, stars, crowd, text, watermark`

## 6.B — Sprites nuevos

**B1 · `tony_derrumbe.png`** (E13, B14) — [GEM] + QuitaFondos + normalizar a 1400px como
el resto del set de Tony:
`Digital illustration, visual-novel anime/cartoon style, cel-shaded, clean black lineart, full-body single character on plain white background, ready to cut out: a glamorous anthropomorphic silver she-wolf pop idol COLLAPSED ON HER KNEES on the floor, sitting back on her heels, shoulders sunken, long wavy silver-grey mane falling forward COVERING most of her face, one hoop-pierced ear visible, black choker with a silver ring, short red crop top with black side panel, bare midriff, cream tail with black tip curled around her, hands limp on her thighs, trembling, defeated heartbroken pose, no text, no watermark`
(Si sale bien, pedir 2ª variante con la cara medio visible entre la melena y lágrimas.)

**B2 · (Opcional) `santi_conduciendo` / `santi_mesa` re-encuadre** — ya existen; solo
normalizar el ancho si molestan los props (nota vieja de la biblia). No urgente.

## 6.C — SFX (efectos de sonido)

> Fuente recomendada: **freesound.org** (filtro licencia CC0) o pixabay.com/sound-effects
> (gratis sin atribución). Guardar en `assets/sounds/effects/` con estos nombres.
> Los marcados ⚙ pueden SINTETIZARSE con la capa Web Audio (§5.9) sin fichero.

| Archivo | Para | Búsqueda sugerida (EN) |
|---|---|---|
| `sfx_movil_vibra.mp3` | E1, E14 llamada José | "phone vibration buzz short" |
| `sfx_derrape.mp3` | E1 frenazo | "car tire screech skid stop" |
| `sfx_motor_arranca.mp3` | E1→E2 | "old car engine start sputter" |
| `sfx_motor_loop.mp3` | E2 cama | "car engine interior loop idle drive" |
| `sfx_moto_revving.mp3` | E2/E3 motos | "motorcycle rev aggressive approach" |
| `sfx_claxon_festivo.mp3` | E3 victoria | "car horn honk happy melody" |
| `sfx_multitud_lejana.mp3` | E4 llegada | "distant concert crowd cheering loop" |
| `sfx_pasos_pesados.mp3` | E5 Gorila | "heavy footstep thud single" |
| `sfx_portazo.mp3` | Bad Ending | "metal door slam heavy" |
| `sfx_pintalabios_click.mp3` | E7 camerino | "makeup lipstick click close" (o `drop_coin` bajito) |
| `sfx_gruñidos_multitud.mp3` | E7-E12 cama terror | "zombie crowd growling snarling loop" |
| `sfx_crujido_metal.mp3` | E9 aviso | "metal creak stress groan" |
| `sfx_crash_foco.mp3` | E9 impacto | "heavy metal crash debris electrical" (mientras: `sword_thud_rock`+`fast_whoosh_and_zaps` juntos) |
| `sfx_llanto_suave.mp3` | E13 | "soft sobbing quiet emotional" (opcional, con la música puede sobrar) |
| `sfx_diapason_ting.mp3` | E13 Diapasón | "tuning fork single pure tone ring" |
| `sfx_estatica.mp3` | E14 llamada | "radio static interference short" |
| ⚙ latido (`heartbeat`) | E8-E12 | Web Audio §5.9 — sin fichero |
| ⚙ rumble grave | E8 desmadre | Web Audio §5.9 — sin fichero |

## 6.D — Vídeo (Lumeflow, opcionales de lujo)

**D1 · Clip «la voz los calma»** (E12-BIS) — i2v sobre `fans_calmandose.png` (A5), 6-8 s:
`Static camera, seamless ambient shot of a huge furry concert crowd calming down: glitch distortions fading out of their bodies one by one, aggressive postures relaxing into awe, soft warm pink-gold stage light slowly washing over the crowd from the distant stage where a silver-haired wolf idol sings with open arms, gentle floating glitter, tears shining, hopeful and cathartic mood. Keep the composition and all details exactly as in the image, no camera movement, slow subtle motion only, perfect loop.`

**D2 · (Ya propuesto otro día) fondo animado del trono de Edu** — sin relación con este
capítulo; prompts ya entregados en la conversación de Lumeflow.

## 6.E — Música
**No hace falta componer nada nuevo.** Con recolocar lo que ya existe queda cubierto:
`rotura_hechizo` → sting del reveal (3 s) + E12-BIS completa (B3) · `ecchiland_oscuro` →
E1 lejanía + disponible para VIP/tensión (B3) · resto como está. Si algún día apetece un
extra: reprise acústica de «Cae a mis pies» a piano para E13 (Suno: `stripped acoustic
piano ballad reprise, tender female hum, 60 BPM, intimate, tearjerker`) — 100 % opcional.

---

# 7 · PLAN DE EJECUCIÓN POR FASES (el orden para llevarlo a cabo)

> **⭐ ESTADO 22-jul-2026 (tarde): EJECUTADO DE F0 A F4 EN UNA SESIÓN AUTÓNOMA.** Todo lo
> de abajo está HECHO salvo lo marcado 🟡. Detalle de lo implementado:
> - **Engine (F1)**: fade/crossfade automático de fondos, wait (ya existía, ampliado a ms),
>   textSpeed por línea, enter/exit de personajes (propiedad CSS translate, no pisa el flip),
>   showCG/hideCG (+auto-hide al saltar de escena), sfx WebAudio (heartbeat/rumble en juice.js),
>   spawn protection en side-scrollers (graceMs 1200/hitGraceMs 800 + parpadeo),
>   lastMinigameResult + showIf (clean/normal/close + hasItem/delayAtLeast), bgPan Ken Burns,
>   backdrop estático en side-scrollers, hablantes sin ficha ("???") sin fetch.
> - **Assets (F2)**: calle_espera (IOPaint+img2img), backstage_mesa (ídem), skyline_amanecer
>   y fans_calmandose (pre-grade manual + img2img), carretera_loop SIN damero (keying
>   estructural + conos de luz redibujados; ahora se ve la luna del fondo lejano),
>   aire_fondo (telón del vuelo), cg/foto_trio, cg/abrazo_trio (collage sprites + Animagine
>   + inpaint), tony_derrumbe (pose nueva registrada, lienzo anclado abajo), samu_worried
>   limpio, y 15 SFX SINTETIZADOS con numpy (vibra, derrape, motor×2, revving, claxon,
>   multitud, pasos, portazo, click, gruñidos-loop, crujido, crash, diapasón, estática).
> - **Guión (F3)**: chapter3.json reescrito entero → 22 escenas / 126 líneas con TODOS los
>   beats de §3-§4 (radio de Santi, 2B gala, foto-CG con Chekhov, trola con pregunta de
>   ohmios, reveal en 5 tiempos con sting, desmadre a pantalla llena, foco en 4 tiempos,
>   variantes de victoria, E12b «La voz» nueva, silencio→música en el discurso, derrumbe
>   + abrazo CG, Diapasón entregado, amanecer + cameo Santi). chapter4: 29× Seraphine→Seraphyna.
> - **QA (F4)**: playthrough completo rama verdad+foto en navegador SIN ERRORES; verificado
>   en juego: showIf clean (rhythm) y flujo close (vuelo), diapason en inventario, CGs,
>   pose derrumbe, fades/negro-narrado, E12b, amanecer. 🟡 Pendiente humano: jugar las ramas
>   trola/suplicar/bad-ending a mano (mecánica idéntica a la probada) y SENTIR los
>   minijuegos con la ventana visible (el bot no puede: la pestaña en 2º plano va a 1 Hz).
> - Backups de TODO lo sustituido en `Downloads/backup-capitulo-seraphyna/`.

> Cada fase deja el juego JUGABLE y mejor que la anterior. Dentro de cada fase, el orden
> listado es el recomendado. Marcar al completar.

## FASE 0 — Cirugía rápida (1 sesión corta; sin assets nuevos) 🩹
- [ ] **B1**: añadir la entrega del Diapasón en E13 (giveItem + 3 líneas §4-E13.6; sin el
      sfx de momento).
- [ ] **B2**: quitar disco-rayado del foco y de la llamada de José (foco: usar
      `sword_thud_rock`+`fast_whoosh_and_zaps`; José: shake solo, hasta tener sfx).
- [ ] **B15**: `santi_conduciendo` en E2/E3, `gorila_contento` en la rama verdad,
      relajar poses de no-hablantes en E7-E8 (B16).
- [ ] **B3-parcial**: sting de `rotura_hechizo` en el reveal (playSound loop:false).
- [ ] **B17**: hideCharacter de los 3 al entrar al desmadre; re-show tras 2 líneas.
- [ ] **B8**: limpiar el parche de píxeles de `samu_worried.png` (QuitaFondos o borrado
      manual del parche — 5 min).

## FASE 1 — Engine juice II (1-2 sesiones; desbloquea todo lo demás) ⚙️
- [ ] §5.1 `fade` + crossfade automático de `setBackground` (B10). ← EL más importante
- [ ] §5.2 `wait`
- [ ] §5.5 `textSpeed` por línea
- [ ] §5.4 `enter`/`exit` de personajes
- [ ] §5.9 capa SFX Web Audio (heartbeat/rumble) + verificación
- [ ] §5.7 spawn protection side-scrollers (B11)
- [ ] §5.3 `bgPan` (Ken Burns)
- [ ] §5.6 `showCG`/`hideCG`
- [ ] §5.8 `minigameResult` + `showIf` (B5)

## FASE 2 — Producción de assets (paralelizable con F1) 🎨
- [ ] A2 fondo chase sin damero (B9) ← el de mayor impacto/esfuerzo
- [ ] A4 backstage_mesa (B6)
- [ ] A1 calle_espera (B7)
- [ ] A5 fans_calmandose (B4)
- [ ] B1-sprite tony_derrumbe (B14)
- [ ] A6 CG abrazo_trio (B14) ← el money shot; darle 2-3 intentos hasta clavarlo
- [ ] A3 CG foto_trio
- [ ] A7 skyline_amanecer
- [ ] §6.C: bajar los 14-16 SFX de freesound/pixabay (una tarde de picoteo)
- [ ] (Opc.) D1 clip Lumeflow de la calma

## FASE 3 — Reescritura del guión (1-2 sesiones con la F1 lista) ✍️
- [ ] E1-E3 según §3 (radio de Santi incluida)
- [ ] E4 llegada + 2B gala
- [ ] E5-E6 Gorila ampliado (foto CG + rama trola con pregunta)
- [ ] E7 reveal en 5 tiempos
- [ ] E8 desmadre ampliado + cama de terror persistente
- [ ] E9 foco en 4 tiempos (con A4)
- [ ] E10-E11 líneas de riesgo + variantes de resultado
- [ ] **E12-BIS nueva** (B4) con A5 + rotura_hechizo
- [ ] E13 silencio→música en el discurso + derrumbe + foto callback + CG abrazo + Diapasón v2 (sfx)
- [ ] E14 amanecer + cameo Santi + llamada limpia
- [ ] Repasar TODAS las transiciones: fade entre escenas, cortes secos solo si son un golpe buscado

## FASE 4 — QA y pulido (1 sesión) ✅
- [ ] Playthrough completo rama verdad+foto (delay 0) — timing de waits y fades a ojo
- [ ] Playthrough rama trola + suplicar (delay 2) — dificultad de minijuegos alta
- [ ] Provocar el Bad Ending y reintentar — estado de músicas al volver
- [ ] Perder aposta cada minijuego 1 vez — reintentos, cama de terror intacta
- [ ] Ver el capítulo 4: el Diapasón funciona en `paloma` (ya implementado, solo verificar)
- [ ] Pasada de volúmenes: diálogo SIEMPRE por encima de música+SFX
- [ ] (Con público) enseñárselo a José/Edu/Samu reales y cronometrar risas 😄

## Estimación honesta de esfuerzo total
- F0: una tarde · F1: 1-2 sesiones de código · F2: 1-2 tardes de generación+retoque ·
  F3: 1-2 sesiones de JSON · F4: 1 sesión. **~5-7 sesiones** para el mejor capítulo del juego.

---

# 8 · APÉNDICES

## 8.1 Mapa de música definitivo (tras los cambios)
| Momento | Pista | Cambio |
|---|---|---|
| E1 calle (espera) | `ecchiland_oscuro` 0.18 | NUEVO uso (B3) |
| E1→E3 coche/chase | `trayecto_coche` → `persecucion_carretera` | igual (arranque retrasado) |
| E2 radio (beat) | `cae_a_mis_pies` 0.12 como diegética | NUEVO uso |
| E4-E5 ciudad | `ecchiland_ambiente` | igual (fadeIn más largo) |
| E6 gorila | `gorila_camelo` | igual |
| E7 reveal sting | `rotura_hechizo` (3-4 s, no loop) | NUEVO uso (B3) |
| E7 camerino | `ecchiland_ambiente` 0.3 | igual |
| E8-E11 terror | `fans_desmadre` + cama gruñidos + heartbeat | +capas nuevas |
| E10 rhythm | `neon_runner` | igual |
| E11 vuelo | `vuelo_edu` | igual |
| E12 opening | audio del vídeo | igual |
| **E12-BIS calma** | **`rotura_hechizo` completa** | **NUEVA escena (B4)** |
| E13 derrumbe | SILENCIO → `abrazo_seraphyna` en el discurso | timing nuevo |
| E14 cierre | `cierre_tony` | igual |

## 8.2 Poses por personaje (inventario para dirigir sin abrir carpetas)
- **tony (13+1):** neutral, flirt, giggle, eyeroll, angry, alarmed, worried, surprised,
  shocked, determined, embarrassed, sad, happy + **derrumbe (NUEVA §6.B1)**
- **samu (13):** neutral, happy, determined, thinking, worried, surprised, alarmed,
  shocked, angry, embarrassed, sad, bua, clapping (⚠ worried con parche B8)
- **edu (16):** neutral, happy, thinking, worried, surprised, alarmed, shocked, angry,
  determined, embarrassed, sad, bua, clapping, facepalm, epic, riku
- **santi (7):** neutral, saludando, conduciendo, preocupado, mesa, herido, riendo
- **gorila (4):** neutral, sospecha, contento, enfadado

## 8.3 Chuleta de acciones nuevas (cuando exista la F1)
```json
{ "type": "fade", "to": "black", "duration": 800 }
{ "type": "fade", "from": "black", "duration": 1000 }
{ "type": "setBackground", "value": "...", "cut": true }
{ "type": "wait", "ms": 900 }
{ "type": "bgPan", "zoomFrom": 1.06, "zoomTo": 1.0, "duration": 6000 }
{ "type": "showCharacter", "character": "santi", "position": "center", "pose": "saludando", "enter": "right" }
{ "type": "showCG", "path": "assets/backgrounds/cg/abrazo_trio.png" }
{ "type": "hideCG" }
{ "type": "sfx", "name": "heartbeat", "on": true }
```
En líneas: `"textSpeed": "slow"` · `"showIf": { "result": "clean" }`

## 8.4 Registro de decisiones (por qué así)
- El disco-rayado se CONSERVA una sola vez (E1): es marca de la casa; gastado pierde gracia.
- La foto del trío enseña HUMANOS DE ESPALDAS: da el «antes» sin canonizar caras humanas.
- E12-BIS es escena nueva y no líneas en E12: el opening debe terminar limpio (vídeo →
  fundido) y la calma merece su propio fondo, música y respiración.
- El Diapasón se entrega en E13 (no E14): dentro de la emoción del abrazo pesa como
  reliquia; en la despedida sería un trámite.
- No se añade minijuego nuevo: el capítulo ya tiene 3 y el problema es de PUESTA EN
  ESCENA, no de mecánicas. (El crowdMeter §5.10 queda como opcional si apetece más juego.)

---

*Fin de la biblia. Hecho con cariño tras jugarme el capítulo entero. — Claude, 22-jul-2026*
