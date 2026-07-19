# 🎤 BIBLIA DE PRODUCCIÓN — Capítulo de Tony (Ecchi Land)

> Documento vivo. Aquí va TODO lo del capítulo de Tony para que no se pierda si se
> compacta la conversación: concepto, voz del personaje, estructura, opening,
> minijuegos musicales, objeto clave, prompts de Suno (música) y prompts de Gemini
> (imágenes/frames). Marcado con estado: ✅ hecho · 🟡 pendiente · 💡 idea.

---

## 0. CAMBIOS CLAVE respecto a la versión anterior (IMPORTANTE)

La versión actual de `chapters/chapter2-tony.json` y la llamada de `chapter1.json`
están escritas en clave **andaluza cómica** y con Ecchi Land como "furros mazados".
**TODO ESO SE REESCRIBE** con la nueva dirección de abajo. Estado: 🟡 pendiente de reescribir.

Cosas que cambian:
- **Orden forzado del juego:** primero **Edu**, luego **Tony**, luego **José Manuel**.
  Cuando Samu llega al capítulo de Tony, **Edu ya está rescatado y viaja CON Samu**.
- **Género / cómo hablan a Tony:** Samu y Edu conocen a Tony **como HOMBRE** (su
  amigo de toda la vida). Le hablan **en masculino** ("Tony, tío", "colega",
  "¿estás bien?"). El virus lo ha convertido en su **versión loba femenina**, pero
  ellos NO lo saben hasta que la VEN en el opening. El shock es visual.
- **Voz de Tony:** sigue seductora pero **MENOS andaluza**. Es una **ex cantante**
  que encandila a las masas con su voz. Sensual, magnética, teatral, de diva/idol.
  (Ver §2.)
- **Ecchi Land:** deja de ser "furros mazados". Ahora es una **megaciudad musical
  futurista, estética K-pop / japonesa**, mezcla de **pasión, depravación y música**.
  Todo gira en torno a la música: **tu habilidad musical lo es todo**. (Ver §3.)
- **Opening animado** cuando Samu y Edu ven por fin a Tony cantando (frame a frame
  con Gemini + música de Suno). (Ver §5.)
- **Dos minijuegos musicales** currados. (Ver §6.)
- **Objeto clave** que Samu encuentra aquí y le sirve en el capítulo de José. (Ver §7.)

---

## 1. CONCEPTO GENERAL — Ecchi Land

- **Qué es:** una megaciudad-arena futurista de neón, hologramas y cultura idol
  (K-pop / J-pop / hyperpop). Nació y gira **alrededor de la voz de Tony**. Es un
  sitio de **pasión y depravación** donde la moneda de cambio es el talento musical:
  aquí no se lucha con espadas, se lucha con ritmo, voz y baile.
- **Cómo encaja con el lore:** el virus (IA Biológica, cap. 2) convirtió a los que
  tenían avatar en furros. A Tony lo convirtió en una **loba súcubo-idol**: su voz
  hipnotiza. En torno a ese poder se formó Ecchi Land, una ciudad de **NPCs fans
  hechizados** que la adoran. Su poder es también su jaula: es el centro de todas
  las miradas y no puede salir sin que la multitud enloquezca.
- **Tono:** sensual y magnético, con humor por el contraste (Tony por dentro sigue
  siendo el colega de siempre). Depravación **sugerida y estilizada**, nunca
  explícita — glamour de club nocturno futurista, no guarrería.
- **Paleta / estética:** magenta, cian, morado neón, negro laca; hologramas,
  pantallas gigantes, corazones flotantes, luces de escenario, láseres, kanji y
  hangul de decoración, plataformas flotantes, lluvia de purpurina.

---

## 2. VOZ Y PERSONAJE DE TONY (guía de diálogo)

**Base física (ya definida en los prompts de sprites):** loba de plata, melena
gris larga y ondulada, ojos ámbar de párpados caídos (seductores), dos piercings
de aro en la oreja izquierda, gargantilla/choker negra con anilla, top rojo con
panel negro, vientre al aire, cola crema con punta negra. Expresiva, coqueta.

**Voz NUEVA (lo importante):**
- **Diva / idol sensual y refinada.** Magnética, teatral, juega con quien le habla.
  Sabe que es irresistible y lo disfruta. Habla como una **chanteuse** que domina
  el escenario.
- **Español neutro con clase**, NO andaluza cargada. Fuera "miarma / ozú / pisha /
  quillo". Puede quedar algún deje suave, pero el registro es sofisticado.
- **Metáforas musicales** por todas partes: "afinar", "el escenario", "el
  público", "sube el volumen", "esto es solo el estribillo", "nota", "tono",
  "dueto", "clímax", "off the record".
- **Doble capa cómica:** de vez en cuando **rompe el papel de diva** y suelta al
  Tony de siempre (bro, gamer, colega) — "…vale, sí, sigo siendo yo, el que te
  reventaba al Mario Kart. No me mires así". Ese contraste es oro.
- **Con Samu y Edu:** ellos le hablan en masculino; ella juega con la incomodidad
  de ellos ("¿demasiado para ti, Samu?"), pero con cariño real de amistad.

**Ejemplos de línea (tono objetivo):**
- "Mmm… tardáis. El público se impacienta, y yo también."
- "Bienvenidos a mi escenario, chicos. Intentad no perder el ritmo… ni la cabeza."
- "Sí, Samu, soy yo. Cierra la boca, que desafinas."
- "Aquí la única arma que sirve es esta —se toca la garganta—. Y yo tengo un
  arsenal."

---

## 3. GÉNERO Y EL SECRETO (manejo del reveal)

- **Lo que saben Samu y Edu:** Tony es su amigo **hombre**. Punto.
- **Siembra (cap.1, llamada):** ya está puesta — voz aguda/femenina, interferencia,
  Samu extrañado ("qué voz más rara tienes, tío"), Tony esquivo ("no te asustes
  cuando me veas"). ➜ Reescribir para quitar andaluz y para que **Edu también
  esté** en escena reaccionando. (🟡)
- **El reveal ES visual y ocurre en el OPENING:** Samu y Edu entran en Ecchi Land,
  la ven en el escenario cantando, hechizando a la multitud, y **flipan**. Solo ahí
  entienden qué le pasó.
- **Después del reveal:** siguen llamándola Tony y en masculino por costumbre, con
  choque cómico; ella juega con ello. Poco a poco se adaptan.

---

## 4. ESTRUCTURA DEL CAPÍTULO (flujo propuesto)

> Estado global: 🟡 diseño. Implementar en `chapters/chapter2-tony.json` cuando
> existan los assets (frames del opening + mp3 de Suno).

1. **Escena 1 — La llamada (Samu + Edu ya juntos).**
   Edu, recién rescatado, va con Samu. Reciben/hacen la llamada a Tony. Voz rara
   femenina. Banter Samu–Edu ("¿ese es Tony? ¿qué le pasa en la voz?"). Deciden ir
   a Ecchi Land. (Reutiliza y adapta la siembra del cap.1.)

2. **Escena 2 — Entrada a Ecchi Land.**
   Llegan a la megaciudad neón. 2B narra la estética. NPCs fans por todas partes.
   Primera **decisión meme/musical** (afecta al `storyDelay` → dificultad).

3. **Escena 3 — MINIJUEGO MUSICAL 1: "Neon Runner" (rhythm/DDR).**
   Abrirse paso entre la multitud hechizada siguiendo el ritmo. (Ver §6.A)

4. **Escena 4 — OPENING / cinemática.**
   Llegan al gran escenario. Arranca el **opening animado**: Tony aparece cantando,
   centro de todas las miradas, aura de súcubo, el público en trance. Samu y Edu la
   ven por fin → **reveal**. (Ver §5.) Música: tema de Suno #1.

5. **Escena 5 — Reencuentro y diálogo.**
   Shock de Samu y Edu. Tony diva. Explica (con su voz nueva) qué es Ecchi Land y
   por qué no puede irse (la multitud enloquece si baja del escenario / rompe el
   hechizo). Segunda **decisión** (delay).

6. **Escena 6 — MINIJUEGO MUSICAL 2: "Vocal Echo / Dúo" (Simon musical).**
   Para romper el hechizo del público y sacar a Tony: un dueto call-and-response.
   (Ver §6.B) Reutiliza la base del minijuego "paloma".

7. **Escena 7 — El OBJETO CLAVE.**
   Al liberarse, Tony le entrega a Samu el **Diapasón de Plata** (ver §7). Servirá
   en el capítulo de José (Paloma City).

8. **Escena 8 — Cierre y continuación.**
   Rescate confirmado (`rescue tony`). Como el orden es forzado, la siguiente parada
   es **José Manuel**. Transición al capítulo de José.

---

## 5. OPENING ANIMADO (cinemática del reveal) 🟡

**Idea:** un opening estilo anime/idol de ~20-40 s: Tony emerge y canta, hechizando
a todos. Se genera **frame a frame con Gemini** (secuencia de imágenes) y se compila
a vídeo/secuencia, con **música de Suno (tema #1)**.

### Implementación técnica (a añadir al motor)
- El engine NO tiene vídeo nativo. Dos opciones:
  - **(Recomendada) Vídeo:** compilar los frames a `.webm/.mp4`, meter en
    `assets/cutscenes/opening_tony.webm`, y añadir una acción nueva `playVideo`
    (overlay `<video>` a pantalla completa que se salta con click al terminar).
  - **(Alternativa sin vídeo) Secuencia de frames:** precargar PNGs y cambiarlos con
    `requestAnimationFrame` sincronizados al audio (más trabajo, más control).
- Añadir al dispatcher de acciones un `case 'playVideo'` / `case 'cutscene'`.

### Guion de planos del opening (shot list para generar frames)
Estilo común a todos los frames (bloque base para Gemini, ver §9 para el detalle):
*idol loba de plata, escenario K-pop futurista de neón, estética anime cel-shaded,
línea limpia, colores planos vibrantes, luces de escenario, hologramas.*

1. **Negro → un foco.** Silueta de Tony de espaldas en un escenario a oscuras.
   Purpurina cayendo. Solo se ve la melena plateada.
2. **Primer acorde.** Estallan los focos y pantallas gigantes con su cara. La
   multitud (miles de NPCs) levanta glowsticks de golpe.
3. **Gira la cabeza** hacia cámara, ojo ámbar entreabierto, media sonrisa. Primer
   plano. Corazones de neón flotando.
4. **Plano general del público hechizado:** ojos en forma de corazón, en trance,
   moviéndose al unísono. Aura magenta de súcubo saliendo de Tony.
5. **Tony canta** con el micro, cuerpo entero, pose de idol, cola ondeando, el aura
   envolviendo a la multitud como hilos de energía rosa.
6. **Corte a Samu y Edu** entre la multitud, mirando boquiabiertos hacia el
   escenario, iluminados por el neón. (Reacción / reveal.)
7. **Contrapicado épico de Tony** en el clímax de la nota, brazos abiertos,
   explosión de luz y pétalos/purpurina, kanji y hangul flotando.
8. **Cierre:** título de la escena o logo, Tony guiñando un ojo a cámara con un
   corazón saliendo del guiño.

(Empezar con ~8-16 frames clave; interpolar más si se quiere fluidez. Se pueden
generar variaciones y montar un slideshow con cross-fades si no se anima del todo.)

### Música del opening → **Suno prompt #1** (ver §8).

---

## 6. LOS DOS MINIJUEGOS MUSICALES 🟡

Ambos: overlay HTML/JS nuevo en `playMinigame` (switch del engine). Dificultad
escala con `storyDelay` vía props `<x>ByDelay` (patrón ya existente). Música de Suno.

### 6.A — Minijuego 1: **"NEON RUNNER"** (ritmo tipo DDR / Guitar Hero)
- **Fantasía:** abrirse paso entre la multitud hechizada al ritmo de la música para
  llegar al escenario. Fallar = te absorbe el trance.
- **Mecánica:** notas/flechas caen por 4 carriles sincronizadas a un track de Suno
  (BPM fijo). Pulsar la tecla correcta (← ↓ ↑ → o D F J K) en la ventana de tiempo
  cuando la nota llega a la línea. Combos, precisión (Perfect/Good/Miss).
- **Ganar:** completar la canción con ≥ X% de aciertos (o < N fallos).
- **Escalado por delay:**
  - `bpm` / velocidad de caída: sube con delay.
  - `lanes` (4 → 5 → 6) o densidad de notas: sube con delay.
  - ventana de acierto (`hitWindowMs`): se estrecha con delay.
  - `minAccuracy` o `maxMisses`: más exigente con delay.
- **Notas técnicas:** requestAnimationFrame para la caída, `audio.currentTime` para
  sincronizar el chart con la música. El "chart" (timestamps de cada nota) se puede
  definir a mano o autogenerar por beat (BPM constante). Empezar con chart por beats.

### 6.B — Minijuego 2: **"VOCAL ECHO / DÚO"** (Simon musical, base = "paloma")
- **Fantasía:** para romper el hechizo y liberar a Tony, Samu tiene que **cantar a
  dúo con ella**: ella lanza una frase melódica, Samu la repite. Si aciertan varias
  seguidas, el hechizo del público se rompe.
- **Mecánica:** grid de pads de colores (cada uno una nota/sílaba con sonido).
  Tony ilumina una secuencia creciente (ronda 1 = 3 notas, ronda 2 = 4…); el
  jugador la repite clicando/pulsando. Reutiliza el motor de secuencia del
  minijuego **paloma** (`sequence`, líneas ~1001-1065 de engine.js).
- **Extra musical:** cada pad suena y hay un pulso/tempo; bonus si repites **a
  tiempo** (no solo el orden correcto, sino en el beat).
- **Ganar:** completar N rondas.
- **Escalado por delay:**
  - `rounds` o longitud máxima de secuencia: sube con delay.
  - `speed` (velocidad a la que Tony canta la secuencia): sube con delay.
  - modo estricto de tempo (tiene que ir a beat) se activa con delay alto.

---

## 7. EL OBJETO CLAVE — "El Diapasón de Plata" 🟡

- **Qué es:** un **diapasón de plata** (tuning fork), reliquia de la etapa de
  cantante de Tony. Al golpearlo, emite una nota pura que "afina" lo que resuene
  cerca. (Alternativa temática: un **auricular in-ear** de idol.)
- **Cómo lo consigue Samu:** Tony se lo entrega al liberarse, como agradecimiento /
  amuleto: "Toma. Cuando todo suene a caos… golpéalo y escucha. Te dirá el tono."
- **Para qué sirve en el capítulo de José (Paloma City):** el minijuego de José es
  **"paloma"** (memoria de secuencias tipo Simon con palomas). El Diapasón:
  - **Efecto propuesto:** permite **escuchar/previsualizar la secuencia una vez más**
    o **ralentiza** la secuencia de palomas (las "afina"), haciendo el minijuego más
    fácil. O da un **reintento gratis** sin penalización.
  - **Implementación:** un flag de inventario (`engine.hasItem('diapason')` o
    similar) que el minijuego paloma lee para bajar dificultad / dar pista.
  - Encaja temáticamente: **la música (Tony) ayuda a la memoria (José)**.
- **Narrativa:** refuerza que rescatar a Tony antes que a José tiene recompensa
  (premia el orden forzado Edu→Tony→José).

---

## 8. PROMPTS DE MÚSICA (SUNO AI) 🟡

Formato Suno: describir **estilo + mood + estructura + tipo de voz**. Todas en la
línea futurista **K-pop / J-pop / hyperpop / futurista**. Poner los mp3 resultantes
en `assets/sounds/music/` y cablear con `playSound`.

> Consejo: en Suno, el campo "Style of Music" son las etiquetas de estilo; la letra
> va aparte. Abajo doy estilo + una guía de letra opcional.

### MAPEO música ↔ momento del capítulo (juego completo, no solo el opening)

**TODAS GENERADAS ✅ y copiadas a `illo/assets/sounds/music/`** (jul 2026).

| Track | Momento | Archivo | Dur | Estado |
|---|---|---|---|---|
| M0 | Escena 1 — La llamada (voz rara, misterio) | `llamada_tony.mp3` | 179 s | ✅ |
| M1 | Escena 4 — Opening / reveal cantando | `cae_a_mis_pies.mp3` | 84 s | ✅ |
| M2 | Escena 2 — Ambiente Ecchi Land (loop calles) | `ecchiland_ambiente.mp3` | 177 s | ✅ |
| M3 | Escena 3 — Minijuego 1 Neon Runner (DDR) | `neon_runner.mp3` | 134 s | ✅ |
| M4 | Escena 6 — Minijuego 2 Vocal Echo / Dúo | `dueto_vocal_echo.mp3` | 172 s | ✅ |
| M5 | Escena 7 — Clímax / rotura del hechizo | `rotura_hechizo.mp3` | 136 s | ✅ |
| M6 | Opcional — VIP Lounge / tentación (oscuro) | `ecchiland_oscuro.mp3` | 214 s | ✅ |
| M7 | Escena 8 — Cierre / transición a José | `cierre_tony.mp3` | 52 s | ✅ |

**M0 — La llamada (Escena 1):** `dark ambient synth, glitchy phone interference,
eerie pads, distant hypnotic female humming, mysterious, unsettling, cinematic
tension, slow, 70 BPM`. Instrumental + tarareo femenino lejano/distorsionado. Loop
corto e inquietante bajo el diálogo del móvil.

**M7 — Cierre / transición (Escena 8):** `soft synthwave outro, bittersweet, warm
pads, gentle piano, reflective, short reprise of a hopeful melody, 90 BPM`.
Instrumental o tarareo suave. Reprise emotiva al despedirse de Tony rumbo a José.

**M4 — letra call-and-response (ejemplo para el dúo, huecos para repetir tipo Simon):**
> (Tony) "Escucha mi voz…" — (hueco) / (Tony) "…sígueme el compás" — (hueco) /
> (Tony) "Si suenas conmigo…" — (hueco) / (juntos) "…este hechizo caerá"

Prioridad de producción: **M2, M3, M4** (esenciales de escena/minijuego). M1 ✅.
M0/M5/M6/M7 de acompañamiento, para el final.

### Suno #1 — **Opening / Tema de Tony** (el reveal cantando) ⭐ ✅ GENERADA
- **Archivo:** `assets/sounds/music/cae_a_mis_pies.mp3` (título original "Cae a mis
  pies", duración **1:24 = 84 s**). Original en `Downloads/Tony poses/`.
- **Usar la duración (84 s) para cronometrar el opening.** El opening puede durar
  todo el tema o un recorte (p. ej. intro→primer estribillo).
- **Estilo usado:** `futuristic k-pop, seductive female idol vocal, hyperpop,
  synth-heavy, dramatic build, hypnotic, glossy, neon, cinematic drop, 124 BPM`.
- **Mood:** entrada triunfal de diva, hipnótica, sensual, "todos caen rendidos".

### Suno #2 — **Ambiente de Ecchi Land** (loop de fondo, calles/ciudad)
- **Estilo:** `futuristic city pop, neon nightlife, chillwave, japanese future funk,
  synthwave, laid-back groovy, instrumental loop, 100 BPM`
- **Mood:** deambular por la megaciudad de neón, sensual y ligeramente inquietante.
- **Instrumental** (sin voz) para que no compita con los diálogos.

### Suno #3 — **Minijuego 1 "Neon Runner"** (ritmo/DDR)
- **Estilo:** `high energy k-pop dance, hyperpop, EDM, fast 150-160 BPM, driving beat,
  arcade, adrenaline, four-on-the-floor, festival drop`
- **Mood:** energía máxima, arcade, correr entre la multitud. Beat MUY marcado
  (importante para sincronizar las notas).

### Suno #4 — **Minijuego 2 "Vocal Echo / Dúo"** (call-and-response)
- **Estilo:** `dramatic k-pop ballad-pop, call and response, female lead vocal with
  space for echo, building tension, emotional, powerful chorus, 110 BPM`
- **Mood:** dueto que rompe el hechizo; frases melódicas claras y separadas (para el
  Simon), que suban de intensidad por rondas.

### Suno #5 — **Clímax / Rotura del hechizo** (opcional, final de escena)
- **Estilo:** `epic k-pop orchestral hybrid, triumphant, key change, big finale,
  choir, explosive, cathartic, cinematic`
- **Mood:** el hechizo se rompe, catarsis, victoria.

### Suno #6 — **Undertone depravado / trampa** (opcional, para momentos oscuros)
- **Estilo:** `dark seductive electropop, sultry, slow, hypnotic, whispered vocals,
  eerie, trap-influenced, 90 BPM`
- **Mood:** el lado depravado/peligroso de Ecchi Land, la tentación.

---

## 9. PROMPTS DE IMAGEN (GEMINI) 🟡

Estilo común (pegar al inicio de cada uno): *ilustración digital estilo anime /
cartoon de novela visual, cel-shaded, línea negra limpia, colores planos vibrantes,
estética K-pop / japonesa futurista, neón magenta-cian-morado, hologramas, sin
texto ni marca de agua, formato horizontal 16:9 para fondos.*

### 9.1 — Escenarios (fondos, 16:9)
1. **Entrada a Ecchi Land:** puerta monumental de neón a una megaciudad idol
   nocturna, rascacielos con pantallas gigantes de caras cantando, hologramas de
   corazones, calle abarrotada de luces, purpurina en el aire.
2. **Calle principal / mercado de neón:** callejón futurista K-pop, tiendas de
   merch idol, karaokes, hologramas, farolillos japoneses mezclados con láseres,
   ambiente sensual de club.
3. **El Gran Escenario (arena):** enorme escenario de concierto futurista con
   pasarela, pantallas LED envolventes, focos, mar de público con glowsticks, humo,
   plataformas flotantes. (Escenario del opening.)
4. **Backstage / camerino de Tony:** camerino de diva, espejo con bombillas,
   neón rosa, ramos de flores holográficos, sofá de terciopelo, estética glam
   futurista.
5. **VIP Lounge (el lado depravado, estilizado):** club exclusivo de neón, sofás,
   siluetas bailando, luces bajas rojas y moradas, sensual pero elegante (nada
   explícito).

### 9.2 — NPCs de fondo (personajes secundarios / multitud)
1. **Fans hechizados:** furros variados con **ojos en forma de corazón**, en trance,
   glowsticks, moviéndose al unísono; hoja de expresiones (adoración, éxtasis).
2. **Bailarines holográficos:** siluetas de neón semitransparentes bailando
   coreografía detrás de Tony.
3. **Guardaespaldas / superfans mazados** (reinterpretación de los "mazados"):
   furros fornidos ahora convertidos en **fandom/seguridad** de la idol, con merch,
   carteles, brazos en alto. (Chiste: siguen mazados pero ahora son groupies.)
4. **Staff del escenario:** roadies/técnicos furros con auriculares y tablets
   holográficas.

### 9.3 — Frames del OPENING (ver shot list en §5)
Generar cada plano de la §5 como frame. Bloque base para los frames de Tony:
*Tony, loba idol de plata (melena gris larga ondulada, ojos ámbar seductores, dos
piercings de aro en oreja izquierda, choker negro con anilla, top rojo con panel
negro, vientre al aire, cola crema con punta negra), cantando con micrófono en un
escenario K-pop futurista de neón, aura de súcubo magenta, corazones flotantes,
cel-shaded, colores planos vibrantes.* + [descripción del plano concreto].

### 9.4 — El objeto clave
- **Diapasón de Plata:** un diapasón (tuning fork) de plata elegante, con grabados
  ornamentales, brillo/aura sonora sutil (ondas de sonido cian), sobre fondo neutro,
  estilo icono de objeto de videojuego, para mostrarlo cuando Tony lo entrega.

---

## 10. TAREAS / TODO (checklist)

- [x] ✅ Generar música con Suno (M0–M7, las 8) y copiar a `assets/sounds/music/`. (Ver tabla §8.)
- [x] ✅ Generar 12 frames del opening con Gemini → `Downloads/Tony opening/` (frame_01…frame_12, 2752x1536 salvo frame_02 1024x572 y frame_10 1376x768).
- [x] ✅ Compilar opening motion-comic (Ken Burns + xfades + audio) → `assets/cutscenes/opening_tony.mp4` (1080p, 84.6 s, sincronizado a `cae_a_mis_pies.mp3`). Script: `scratchpad/build_opening.py`.
- [x] ✅ Añadir acción `playVideo`/`cutscene` al engine (overlay `<video>` a pantalla completa, saltable con clic/Esc/Enter/Espacio, pausa/reanuda música). CSS `.cutscene-*` en styles.css. Verificado en navegador.
      Uso en JSON:  `{ "type": "playVideo", "path": "assets/cutscenes/opening_tony.mp4" }`
- [ ] 🟡 Generar fondos de Ecchi Land (§9.1) y NPCs (§9.2).
- [ ] 🟡 Generar imagen del Diapasón de Plata (§9.4).
- [x] ✅ Añadir al engine: acción `playVideo`/`cutscene` para el opening.
- [x] ✅ Minijuego `rhythm` (Neon Runner, DDR) en **3D**: autopista en perspectiva (CSS perspective + rotateX) que se aleja al horizonte, notas que crecen al acercarse, rejilla que corre (velocidad), fondo neón animado con hue-rotate, teclado plano flotante que se enciende al pulsar, chispas al acertar, línea de acierto que destella (hit/miss) y combo pulsante. Ticker por `setInterval`. **Sincronizado a la música**: las notas caen sobre la rejilla de beats de la canción y el reloj lo marca `audio.currentTime` (opción `audio`/`audioId`), así los toques van al ritmo; si el audio no avanza, usa reloj interno de respaldo. `neon_runner.mp3` detectado a **103.5 BPM, primer golpe 372 ms** (`beatOffsetMs`), densidad por `beatStep` (1=negra, 0.5=corchea). Ventanas de acierto en ms. Escala lanes/hitWindowMs/minAccuracy/beatStep por delay. Verificado: la nota cruza la línea justo en su beat y pulsar en el beat da PERFECT.
      **Objetos estilo osu! (jul 2026):** además de notas normales (tap), hay **sliders** (notas mantenidas: coges la cabeza en su beat, MANTIENES la tecla y sueltas al llegar la cola; soltar antes = fallo; se juzga en la cola) y **spinners** (aparecen en el centro, "¡MACHACA!", aporreas cualquier tecla para llenar el anillo antes de que acabe el tiempo). Opciones: `sliderChance`/`sliderBeats`, `spinnerCount`/`spinnerTaps`/`spinnerBeats`. El horario reserva hueco tras sliders/spinners. `keyup` maneja el soltar; auto-repetición de tecla ignorada. Verificado (slider hold=PERFECT, soltar antes=miss; spinner lleno=hit). El auto-jugador de la página de prueba mantiene sliders y machaca spinners.
      **SFX (jul 2026):** efectos de sonido cortitos y suaves sintetizados con Web Audio (sin archivos): acierto PERFECT (blip de 2 tonos brillante), GOOD (1 tono), fallo (tono grave), y rotura de combo por pulsar en vano (2 tonos descendentes). Volumen bajo; opciones `sfx:false` para desactivar y `sfxVolume` para ajustar. Verificado (osciladores disparados en acierto/fallo/break, sin errores).
      **Mejoras (jul 2026):** más largo (totalNotes por defecto 40); cada acierto se gradúa **PERFECT** (centro, ventana `perfectWindowMs`) / **GOOD** / **✕** con texto neón flotante; **cartel de hito de combo** "🔥 COMBO N" cada 10 seguidos; **tipografía neón** (`.neon-font`) en HUD y textos — fuente **NeonSans** incrustada (`@font-face`, `assets/fonts/NeonSans.ttf?v=2`, licencia OFL en la misma carpeta), con fallback a redondeada del sistema. La fuente original no traía acentos/Ñ/Ü/¿/¡/%; se **añadieron esos glifos** componiéndolos con fontTools (`scratchpad/fix_neon_font.py`, original en `NeonSans_original.ttf`): agudo desde `/`, tilde desde `~`, diéresis desde `.`, ¿/¡ girando ?/!, % con dos `O`+`/`. Como `.neon-font` va en mayúsculas, solo hicieron falta las versiones mayúsculas; **avatar de Samu** abajo-izquierda que cambia de expresión (`samu_happy` en PERFECT, `samu_determined` en GOOD, `samu_worried` en fallo) con marco que brilla del color del juicio. Opción `avatar` para cambiar de personaje. Verificado en navegador (PERFECT/GOOD/✕, 3 expresiones, combo 10 con cartel).
- [x] ✅ Página de prueba aislada `minijuegos_test.html` (raíz de illo): botones de dificultad Fácil/Medio/Difícil + Demo auto para `rhythm` y `vocalecho`, con música opcional y **casilla "Modo auto"** que se juega solo en CUALQUIER nivel (para comprobar el ritmo/sincronía). El auto-jugador lee la tecla real de cada carril (funciona con 4 o 5 carriles). Para calibrar sin jugar el capítulo entero.
- [x] ✅ Minijuego `vocalecho` (Dúo tipo Simon musical): 4 pads neón con tonos reales (Web Audio), Tony canta y el jugador repite. Escala rounds/startLength/speed/strictTempo. Verificado (victoria).
- [x] ✅ Inventario persistente en el engine: `addItem`/`hasItem`/`inventory` (persiste entre capítulos como `rescued`; se limpia en partida nueva y selector). Acción `giveItem`. Escena 7 usa `giveItem diapason`.
- [x] ✅ El `paloma` (cap. José) lee `hasItem('diapason')` → secuencia +40% más lenta y −1 ronda, con aviso temático. Verificado (con=4 rondas/aviso, sin=5 rondas).
- [x] ✅ `chapter1.json` (llamada a Tony): ya reescrita con misterio/voz femenina/de-andaluza (speaker "¿Tony?", "seas quien seas ahora"). Edu presente NO es imprescindible ahí; la siembra está.
- [x] ✅ Reescribir `chapter2-tony.json` entero con la nueva dirección (10 escenas: llamada→entrada→Neon Runner→OPENING→reencuentro→dúo→Diapasón→cierre a José). Voz diva, Edu con Samu, decisiones con delay, opening, 2 minijuegos, objeto. Verificado en navegador.
- [x] ✅ `characters/tony.json` (13 poses, color magenta) y `characters/edu.json` creados. `game.js` precarga edu+tony. Slot CENTRO habilitado en styles.css (estaba `display:none`) para mostrar a Tony al frente.
- [x] ✅ Colocar mp3 en `assets/sounds/music/` (8) y vídeo en `assets/cutscenes/opening_tony.mp4`.

---

## 11. NOTAS SUELTAS / IDEAS 💡

- El **orden forzado** (Edu→Tony→José) simplifica la lógica: se puede quitar el
  sistema de "llamar a quién quieras" en esta rama y encadenar directo a José.
- Chiste recurrente: Samu y Edu **sin saber dónde mirar** cada vez que Tony hace la
  diva; ella lo explota ("los ojitos arriba, caballeros").
- El objeto (Diapasón) es el hilo que **premia el orden**: rescatar a Tony antes que
  a José da ventaja en Paloma City. Reforzar en el diálogo.
- Posible **mini-cameo de 2B** presentando Ecchi Land como si fuera una gala/show
  ("En el escenario de esta noche…").
- Los sprites de Tony (13 poses) están en `Downloads/Tony poses/` — falta integrarlos
  a `illo/assets/characters/` y crear `characters/tony.json` para mostrarla en
  pantalla (ahora mismo solo aparece como nombre/audio vía `iphone5`).
