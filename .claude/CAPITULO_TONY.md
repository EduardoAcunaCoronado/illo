# 🎤 BIBLIA DE PRODUCCIÓN — Capítulo 3: Seraphyna (Ecchi Land)

> Documento vivo. TODO lo del capítulo de Tony/**Seraphyna** (ahora **`chapter3.json`**
> en el esquema lineal 0-5). Marcado con estado: ✅ hecho · 🟡 pendiente · 💡 idea.
> **⬇️ La sección "VERSIÓN DEFINITIVA" (abajo, la primera) MANDA sobre las §0-§11
> antiguas.** Las §0-§11 quedan como referencia de lo YA PRODUCIDO (assets, minijuegos
> musicales, opening, fuente, etc.), que se reutiliza dentro del flujo nuevo.

---

# ⭐ VERSIÓN DEFINITIVA (jul 2026) — HISTORIA COMPLETA + CAPÍTULO 3 (SERAPHYNA)

## V.0 — Notas de versión IMPORTANTES
- **Seraphyna** = nombre artístico del avatar idol de **Tony**. Samu y Edu conocen a Tony
  como **hombre**; la diva del escenario es "Seraphyna"; el **reveal** es que Seraphyna ES Tony.
- Este capítulo es **`chapter3.json`**. Esquema lineal: `0` Prólogo · `1` (intro) ·
  `2` **Kingdom Ketchup (Edu)** · `3` **Ecchi Land (Tony/Seraphyna)** · `4` **Paloma City (José)** · `5` final.
- Enlace entre capítulos con la acción **`{ "type":"setNextChapter", "value":"chapter4" }`** (convención de upstream).
- **YA HECHO y reutilizable** (ver §5-§10): opening (`assets/cutscenes/opening_tony.mp4`),
  minijuego **Neon Runner** (`rhythm`), minijuego **Vocal Echo** (`vocalecho`), 8 músicas,
  fuente NeonSans, inventario/Diapasón, 13 sprites de Tony/Seraphyna, sprites de Edu/Samu.
- **NUEVO por producir:** NPC Santi, coche, memes-moto, minijuego **persecución** (coche
  side-scroll), minijuego **vuelo de Edu** (side-scroll), evento del **Gorila** (con
  BAD ENDING), fondos de Ecchi Land/carretera, música de esos momentos.

## V.1 — Historia completa del juego (para contexto)
1. **Prólogo/Cap.1 (Samu):** Samu se despierta tarde el día de su cumpleaños y descubre
   que se ha transformado en furro (su avatar). Le parece **genial**.
2. Llama a **Edu**, que está emocionadísimo: **Kingdom Ketchup** es su mundo ideal, e
   invita a Samu a verlo. Samu acepta e **elige ir a ver a Edu**.
3. Por la calle, todo el mundo está **encantado** con la nueva situación (son felices).
4. **Cap.2 (Edu / Kingdom Ketchup):** de camino, le ataca **la loca de los gatos de los
   Simpsons** → se evita con un **minijuego** → llega donde Edu.
5. Edu intenta convencer a Samu de **quedarse**; Samu dice que no debería quedarse para
   siempre, que habrá que moverse. Edu **se enfada**; Samu nota que el sitio le afecta.
6. Edu se transforma en **ZIP** (su versión oscura) y **desvela detalles de la trama**
   (ver la parte de Edu, ya avanzada). Tras **combate/minijuego**, Samu derrota a ZIP y
   Edu vuelve a la normalidad.
7. Se dan cuenta de que deben **salir** de Kingdom Ketchup. Al hacerlo, Edu recibe un
   mensaje: **gran concierto de Seraphyna en Ecchi Land**. Se extrañan y creen que **es
   cosa de Tony, que está en peligro**. → Fundido a negro → **CAP. 3 (nuestra parte)**.

## V.2 — CAPÍTULO 3 (Seraphyna) · flujo detallado escena a escena
> Esto SUSTITUYE a la §4 antigua (8 escenas). Estructura nueva:

1. **Encuentro con Santi (Kiikiaskel).** Un NPC rata (ver V.3) que va al concierto los
   **recoge en su coche**. Escenas: los recoge en la calle → interior del coche con Santi
   al volante → arranca el trayecto a Ecchi Land.
2. **Asalto en la carretera.** Memes IA en **moto** los asaltan. → **MINIJUEGO 1 (NUEVO):
   Persecución side-scroller** (coche de Santi esquivando motos-meme y obstáculos:
   barriles, baches, vallas…). Estilo *Cadillacs & Dinosaurs* (pocos frames). Música Suno nueva.
3. **Llegada a Ecchi Land.** Ciudad de **neón dentro de Huelva**, con un **gran edificio
   central** (la arena del concierto). 2B narra.
4. **La multitud.** Apenas pueden entrar por la marea de fans. Lo consiguen, pero les
   intercepta un **Gorila segurata**: "¿quiénes sois? No tenéis permiso".
5. **EVENTO DEL GORILA (decisiones).** Camelárselo para pasar:
   - **Rápido/bien** → los minijuegos posteriores serán **más FÁCILES**.
   - **Tardan** → más **DIFÍCILES**.
   - **Les echan** → **BAD ENDING** (Seraphyna acaba corrompida).
   (Implementación: acumula `storyDelay`; fallo total → `goToScene` a escena de bad ending.)
6. **Camerino de Seraphyna.** Se cuelan; ella se prepara para el concierto. Samu y Edu
   intentan convencerla de que algo malo pasa (y le cuentan todo lo vivido).
7. **Negación.** Seraphyna, negacionista: no piensa dejar esta vida de **DIVA** adorada.
   Cuando empieza a molestarse → se oyen **ruidos, gruñidos y golpes raros** desde la zona
   de fans frente al escenario.
8. **El desmadre.** Los 3 se asoman sigilosos: los **fans se están desmadrando**,
   convirtiéndose en **memes IA** / volviéndose **agresivos**. (Vira a terror.)
9. **Seraphyna reacciona.** Se da cuenta de que tiene que **actuar y cantar**. Va a pedirle
   a **Santi** (que resulta ser el **tramoyista/encargado de sonido**) que prepare el equipo
   y le dé las **letras** para repasarlas… justo le **cae un foco** encima: no lo mata, pero
   **le impide seguir**.
10. **Dos minijuegos en paralelo (narrativamente):**
    - Seraphyna pide a **Samu** que **afine el equipo de sonido** → **NEON RUNNER** (ya hecho, `rhythm`).
    - **Edu** (dragón volador) recoge las **partituras** → **MINIJUEGO 2 (NUEVO): Vuelo
      side-scroller** esquivando **focos que caen** y **cables eléctricos**, recogiendo hojas.
11. **El concierto.** Al completar ambos: **pantalla en negro** → se ejecuta el **OPENING**
    (ya hecho, `opening_tony.mp4`).
12. **Tras el opening.** Samu y Edu quieren que Seraphyna **se una a ellos y escapen**.
13. **Derrumbe emocional.** Seraphyna **cae de rodillas**, escena emotiva: no quiere
    abandonar todo esto porque **se siente importante** y **no quiere volver a sentirse
    como la nada ni estar sola**.
14. **Momento de amistad.** Samu, muy conmovedor, le dice que **nunca ha estado sola ni lo
    estará, porque les tiene a ellos** (Samu y Edu). Samu **abraza** a Seraphyna; luego Edu
    **se suma al abrazo** → los 3 unidos entre lágrimas. (Música tearjerker.)
15. **Cierre.** Abandonan Ecchi Land. Reciben **llamada de José Manuel**: necesita ayuda del
    grupo, algo raro pasa y cree saber por qué; sin tiempo de explicaciones, que sigan **el
    camino de baldosas amarillas**. → Fundido a negro → **CAP. 4 (José / Paloma City)**
    (`setNextChapter: chapter4`).

## V.3 — PERSONAJES nuevos / actualizados
- **Seraphyna (= Tony):** misma base física de loba idol de plata (ver §2). Como
  **Seraphyna** es la diva total del escenario; añade capa "estrella intocable / negación"
  y el arco emocional del derrumbe (soledad, miedo a "volver a ser nada"). Sigue el humor de
  romper el papel con el Tony gamer de siempre.
- **Santi / "Kiikiaskel" (NPC):** **rata anciana** estilo maestro Splinter (Tortugas Ninja)
  pero **más fea y accidentada**. Currante socarrón. **Doble rol:** primero el que los lleva
  en coche; luego resulta el **tramoyista/encargado de sonido** del concierto (el del foco).
- **Gorila segurata:** portero enorme e imponente de la puerta del concierto.

## V.4 — MINIJUEGOS NUEVOS (specs para implementar en el engine)
Convención: nuevo `case` en `playMinigame`; dificultad por `storyDelay` con props `<x>ByDelay`
(patrón ya existente); música por `audioId`/`playSound`; overlay HTML/JS.

### V.4.A — `chase` (Persecución side-scroller, coche de Santi) 🟡
- **Fantasía:** el coche de Santi huyendo de memes-moto por la carretera a Ecchi Land.
- **Mecánica (sencilla, tipo endless-runner por carriles):** el coche avanza automático
  (scroll de fondo parallax). El jugador **salta** (Espacio/↑) y/o **cambia de carril**
  (↑/↓ entre 2-3 carriles) para esquivar **obstáculos** (barril, valla, bache/roca) y
  **motos-meme** que embisten. Chocar = daño (X vidas). Recoger power-ups opcional.
- **Ganar:** aguantar `distancia`/`tiempo` sin quedarte sin vidas.
- **Animación:** *frame-based* básico (2-4 frames), no 60 fps. Sprites con hoja de frames;
  cambiar frame cada ~120 ms con `setInterval`/reloj (mismo patrón que el ticker del rhythm).
- **Escalado por delay:** `speed`, densidad de obstáculos, nº de motos, `maxHits`.

### V.4.B — `eduvuelo` (Vuelo de Edu side-scroller, recoger partituras) 🟡
- **Fantasía:** Edu dragón volando entre bambalinas para recoger las partituras.
- **Mecánica:** Edu se mueve **arriba/abajo** (↑/↓ o ratón) mientras el fondo hace scroll.
  **Recoge** hojas de partitura (suman) y **esquiva** **focos que caen** (verticales) y
  **cables eléctricos** (horizontales/colgantes). Chocar = daño.
- **Ganar:** recoger **N partituras** (o sobrevivir el tramo con ≥N recogidas).
- **Animación:** Edu con 3-4 frames de aleteo; focos/cables sprites simples.
- **Escalado por delay:** velocidad de scroll, frecuencia de focos/cables, N requerido.

### V.4.C — Evento del **Gorila** (decisiones + BAD ENDING) 🟡
- Árbol de diálogo para camelar al Gorila. Cada opción "lenta/mala" suma `addDelay`.
- 3 desenlaces: **rápido** (delay bajo → minijuegos fáciles) · **lento** (delay alto →
  difíciles) · **fallo** (`goToScene` a **"Escena: Bad Ending — Seraphyna corrompida"**).
- **Mecánica nueva de bad ending:** una escena final alternativa; se puede marcar con
  `setVariable`/`goToScene` y, al terminar, volver al menú (sin `setNextChapter`).

### V.4.D — Reutilizados
- **Neon Runner** (`rhythm`) = "afinar el equipo de sonido" (Samu). Música `neon_runner.mp3`. ✅
- **Opening** (`playVideo opening_tony.mp4`) al arrancar el concierto. ✅
- **Vocal Echo** (`vocalecho`) — si encaja como parte del concierto/afinado; opcional aquí.

## V.5 — PROMPTS GEMINI (NUEVOS) — EN INGLÉS Y AUTOCONTENIDOS 🟡
> **REGLA:** Gemini no conoce a "Samu", "Tony", "Seraphyna" ni ningún nombre. En CADA prompt
> hay que **describir físicamente** a quien salga. Prompts **en inglés**, detallados.

**Reusable STYLE block (paste at the start of every prompt):**
> *Digital illustration, visual-novel anime/cartoon style, anthropomorphic furry characters,
> clean black line art, flat vibrant cel-shaded colors, soft rim lighting. No text, no
> watermark, no signature.*
> - For CHARACTER SPRITES add: *full-body single character, T/A-pose or clean expressive pose,
>   plain solid white background, centered, no shadow on the ground, ready to cut out.*
> - For BACKGROUNDS add: *16:9 horizontal landscape, wide establishing shot, NO characters in
>   the foreground, keep the lower-center area open to place characters later.*

**Reusable CHARACTER descriptions (paste whenever they appear in a scene):**
- **WOLF (Samu):** *a friendly anthropomorphic wolf with cream/beige fur, a fluffy mane whose
  tips are dyed bright red, orange-amber eyes, an orange nose and a rounded muzzle.*
- **DRAGON (Edu):** *a slim anthropomorphic Eastern/Chinese dragon with light-blue scales,
  messy brown hair, two cream-colored horns, long thin whiskers, wearing a plain white t-shirt.*
- **SILVER IDOL WOLF (Seraphyna/Tony):** *a glamorous anthropomorphic silver she-wolf pop idol
  with a long wavy silver-grey mane, half-lidded amber seductive eyes, two hoop piercings on her
  left ear, a black choker with a silver ring, a short red crop top with a black side panel and
  bare midriff, and a cream tail with a black tip.*

### 5.1 — Santi / "Kiikiaskel" (character sprite + poses)
> **SANTI base** (paste before each pose): *an old, ugly, beaten-up anthropomorphic rat, in the
> style of Master Splinter from Teenage Mutant Ninja Turtles but uglier and more battered:
> patchy grey-brown matted fur with bald spots, long uneven whiskers, big ears (one torn and
> bitten), crooked yellow teeth, one eye more squinted than the other, small scars and a couple
> of sticking-plasters on his face. He wears a worn grey stagehand jumpsuit/overalls, a tool
> belt, and sound-engineer headphones around his neck. Weary, sly, sarcastic expression.* + POSE:
- `neutral`: *standing, hands in pockets, sly half-smile.*
- `driving`: *sitting behind a steering wheel, seen from a 3/4 side view, one paw on the wheel, talking.*
- `waving`: *one arm raised waving you over, mouth open shouting "get in".*
- `worried`: *frowning, looking off-screen with concern.*
- `working`: *leaning over a sound mixing console, focused, headphones on.*
- `hurt`: *lying on the floor after being hit, clutching his shoulder, pained grimace but alive.*
- `laughing`: *toothless open-mouthed cackle.*

### 5.2 — Santi's car
- **Exterior 3/4 (sprite, transparent bg):** *an old, run-down but characterful car, cheaply
  pimped with strips of neon LED lights, bumper stickers, a loudspeaker strapped to the roof and
  a smoking exhaust pipe; cartoon style; 3/4 front side view.*
- **Interior (background, 16:9):** *the inside of an old car at night seen from the dashboard
  toward the seats, glowing neon dashboard lights, empty seats — leave room to place a driver
  and two passengers.*

### 5.3 — Road / journey backgrounds (16:9)
- **Pickup street:** *a night street in a Spanish coastal town with a touch of neon, an old
  run-down car parked at the curb with a door open; "we'll give you a ride" vibe.*
- **Road to the neon city:** *a night highway leaving a coastal town toward a glowing NEON city
  skyline in the distance; lamp posts, guardrails, a billboard; purple starry sky; sense of a
  road trip and of something approaching.*

### 5.4 — AI-meme bikers (chase enemies, side view, transparent bg)
- *Several corrupted, aggressive internet-meme creatures riding beat-up futuristic motorcycles
  with glowing neon exhausts, chasing at speed; glitchy staring eyes, chaotic and menacing yet
  comical; strict LEFT-facing side/profile view for a side-scrolling game; plain transparent
  background.* (Generic deformed meme-monsters, do NOT copy any copyrighted meme.)

### 5.5 — The neon city "Ecchi Land" (backgrounds 16:9)
- **City skyline:** *a glowing NEON city built at night inside a Spanish coastal town, with one
  huge central concert ARENA building (a lit-up dome or idol-concert tower) in the middle, giant
  screens showing a silver she-wolf idol's face, streets full of light and floating glitter.*
- **Entrance + crowd:** *foreground: a packed SEA of furry fans crammed in front of the lit
  entrance of the concert building, glowsticks raised, posters of a silver she-wolf idol,
  floating neon hearts; euphoric atmosphere.*

### 5.6 — Gorilla bouncer (character sprite + poses)
> **GORILLA base:** *a huge, imposing anthropomorphic gorilla security bouncer in a tight black
> security suit, wearing sunglasses and an earpiece with a coiled cable, thick neck, grumpy
> unfriendly face.* + POSE:
- `neutral`: *arms crossed, blocking the way, stern.*
- `suspicious`: *one eyebrow raised, looking you up and down.*
- `pleased`: *a small smile, loosening up (if you charmed him).*
- `angry`: *pointing to the exit, shouting "get out".*

### 5.7 — Seraphyna's dressing room (background 16:9)
- *A pop-diva's backstage dressing room: a big vanity mirror framed with light bulbs, pink neon,
  a rack of glittery stage outfits, holographic flower bouquets, a purple velvet sofa, a bit of
  pre-show mess (makeup, wigs). Empty center to place characters.*

### 5.8 — Fans turning feral (scene/background 16:9)
- *The sea of fans in front of a concert stage TRANSFORMING: some morph into glitchy corrupted
  internet-meme monsters, others turn aggressive with blank white eyes and deformed mouths; the
  mood shifts from an idol concert to HORROR; flickering lights, digital glitches, writhing
  silhouettes; unsettling.*

### 5.9 — The falling spotlight hits Santi (scene 16:9)
- *Backstage, a large stage spotlight breaks loose from above and FALLS onto an old ugly
  anthropomorphic rat in worn overalls who was at the mixing console; shower of sparks, loose
  cables, smoke; the rat falling to the floor; dramatic but not gory.*

### 5.10 — SPRITE SHEETS for the minigames (basic animation, few frames)
> Ask Gemini for **a horizontal sprite sheet, frames in a single row, transparent background,
> LEFT/side view, identical size per frame, flat cel-shaded style** (easy to cut and animate),
> ~2-4 frames.
- **Santi's car (chase player):** *3-frame side-view sheet: rolling (suspension bounce) ×2 +
  jumping ×1, with a rat driver and a red-tipped-mane wolf and a blue dragon peeking out inside.*
- **Meme biker (enemy):** *2-frame side-view sheet of a deformed meme-monster on a neon
  motorcycle (spinning wheel / vibration).*
- **Obstacles:** *barrel, construction fence, pothole/rock, cable on the ground — 1-2 frames each,
  side view.*
- **Flying dragon (Edu, flight player):** *4-frame side-view sheet of a slim blue Eastern dragon
  with brown hair and cream horns flapping its wings (wings up → down).*
- **Flight hazards:** *falling stage spotlight (2 frames with a flash), hanging electrical cable
  (2 frames with a spark).*
- **Sheet-music collectible:** *a glowing sheet-music page/scroll, 2-frame blink/shine.*

## V.6 — PROMPTS SUNO (NUEVOS) 🟡
Poner los mp3 en `assets/sounds/music/`. Formato: campo *Style* + mood + voz. Volumen de
juego bajo-medio.
- **M8 — Persecución (chase):** `high-octane darksynth / synthwave chase, aggressive driving
  beat, distorted bass, arcade action, motorcycle pursuit, relentless, retro 80s action, 160 BPM`.
  Instrumental, muy marcado. Archivo sugerido: `persecucion_carretera.mp3`.
- **M9 — Trayecto en coche (opcional):** `chill retrowave night drive, laid-back but
  anticipatory, warm synths, 100 BPM, instrumental`. Archivo: `trayecto_coche.mp3`.
- **M10 — Evento del Gorila (tensión cómica):** `quirky tense heist funk, comedic suspense,
  sneaky wah guitar, bouncy bass, playful tension, 110 BPM, instrumental`. Archivo: `gorila_camelo.mp3`.
- **M11 — Desmadre de los fans (terror):** `horror synth, corrupted idol pop breaking down,
  glitchy distorted crowd, dread, unsettling, tempo falling apart`. Archivo: `fans_desmadre.mp3`.
  (Alternativa: reutilizar `ecchiland_oscuro.mp3`.)
- **M12 — Vuelo de Edu:** `soaring uplifting synth-orchestral, urgent but heroic, flight,
  dodging, fast arpeggios, driving, 150 BPM, instrumental`. Archivo: `vuelo_edu.mp3`.
- **M13 — Abrazo emotivo (tearjerker):** `emotional piano and strings, tender, bittersweet,
  hopeful, cathartic friendship moment, soft, slow build to warm resolution, minimal
  percussion`. Archivo: `abrazo_seraphyna.mp3`.

## V.7 — TODO del capítulo 3 (estado)
- [x] ✅ TODOS los assets generados por el usuario y organizados en el juego (jul 2026), origen en `Downloads/Proyecto/sprites`:
      fondos → `assets/backgrounds/` (calle_coche, coche_interior, skyline_eechi_land, multitud_entrada, camerino_seraphyna, fans_desmadrandose, foco_cae_santi);
      Santi → `assets/characters/santi/` (7 poses, keyout+trim+normalizado 1400px); Gorila → `assets/characters/gorila/` (4 poses, keyout);
      música → `assets/sounds/music/` (persecucion_carretera, trayecto_coche, gorila_camelo, fans_desmadre, vuelo_edu, abrazo_seraphyna);
      sheets minijuegos → `assets/minigames/cap3/` (carretera_loop, carretera_loop_fondo, coche_santi_sheet_buena [3 frames], edu_volando_sheet, obstaculos_sheets, obstaculos_aire_sheet, partituras_sheets, memes_*_sheet).
- [x] ✅ `characters/santi.json` y `characters/gorila.json` creados.
- [x] ✅ **`chapter3.json` REESCRITO** con el flujo de 15 pasos (18 escenas): Santi recoge → trayecto → chase → Ecchi Land → multitud → **evento Gorila (3 opciones: verdad/trola/chulo→BAD ENDING; delay ajusta dificultad)** → camerino/reveal Seraphyna → desmadre → foco sobre Santi → Neon Runner (Samu) → vuelo Edu → opening → derrumbe+abrazo → llamada José → chapter4. Verificado en navegador (carga, sprites y fondos OK, sin errores; escenas de Santi y del camerino se ven de lujo).
- [x] ✅ Diálogos con **Seraphyna** (nombre artístico) y reveal Tony↔Seraphyna.
- [x] ✅ **BAD ENDING** del Gorila (escena "Escena Bad Ending" con reintento).
- [ ] 🟡 **FASE 2 — Engine: minijuego `chase`** (persecución side-scroll, animación por frames con `coche_santi_sheet_buena` + memes sheets + `carretera_loop`/`_fondo` parallax). Ahora se salta con gracia.
- [ ] 🟡 **FASE 2 — Engine: minijuego `eduvuelo`** (vuelo side-scroll con `edu_volando_sheet` + `obstaculos_aire_sheet` + `partituras_sheets`). Ahora se salta con gracia.
- [ ] 🟡 (Opc.) normalizar/recortar Santi_mesa/conduciendo (salen anchos por los props).

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
