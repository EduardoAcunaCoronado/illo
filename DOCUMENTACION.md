# Project AI.RI: Transfurmados — Manuales canónicos

Este documento es la fuente de verdad del proyecto y contiene dos manuales:
uno para quien juega y otro para quien desarrolla. `LEER_PRIMERO.md` es sólo
la portada y el acceso rápido. Las plantillas de `.github/` son excepciones
operativas, no documentación paralela.

> **Estado verificado: 2026-08-03.** La validación actual reconoce 7 capítulos,
> 63 escenas, 908 líneas, 26 fichas de personaje y 1.477 referencias de assets.
> La galería generada contiene 105 entradas, 155 poses y 130 poses con
> parpadeo. Estas cifras son una fotografía
> fechada; `npm run validate:content` es la fuente actual.

## Navegación

- [Manual de usuario](#manual-de-usuario)
- [Manual de desarrollo](#manual-de-desarrollo)
- [Mapa de cambios](#mapa-quiero-cambiar-x)
- [Acciones narrativas](#resumen-de-acciones-narrativas)
- [Minijuegos](#minijuegos-y-batallas)
- [Assets y originales](#assets-runtime-originales-y-optimización)
- [Herramientas gráficas](#herramientas-gráficas-locales)
- [Validación y entrega](#validación-pruebas-y-entrega)
- [Canon y continuidad](#canon-identidad-y-continuidad)
- [Referencia detallada acumulada](#referencia-detallada-del-motor)

---

# Manual de usuario

Este manual explica la versión disponible hoy sin revelar acontecimientos de
la trama. El juego es una novela visual con elecciones, navegación por escenas,
galería, cinemáticas y varios tipos de minijuegos.

## Requisitos para jugar

La versión instalada de Windows no necesita Python ni Node.js. Para ejecutar el
repositorio hacen falta una de estas dos opciones:

- App de escritorio: Node.js y npm.
- Navegador: Python 3 u otro servidor HTTP local y un navegador moderno.

Se recomienda pantalla 16:9, ratón y teclado. El escenario se dibuja a 1280×720
y se escala conservando proporción; en otras relaciones de aspecto pueden
aparecer bandas negras. El juego avisa de música, sonido y luces intermitentes
antes de comenzar.

## Cómo iniciar

### Versión instalada

Abre **Transfurmados** desde su acceso directo. La aplicación se inicia a
pantalla completa salvo que se hubiese elegido el modo Ventana.

### Desde el repositorio

App de escritorio recomendada:

```powershell
npm install
npm start
```

Navegador:

```powershell
python -m http.server 8000
```

Abre <http://localhost:8000/>. También se puede ejecutar `start.bat`. No abras
`index.html` mediante `file://`: el juego carga JSON, audio y vídeo por HTTP y
esa vía produce pantallas vacías o capítulos que no aparecen.

## Primer arranque

1. Ajusta el volumen del dispositivo.
2. Pulsa **Entrar con sonido**. Ese gesto autoriza el audio en el navegador.
3. Espera al opening o pulsa **Saltar opening**.
4. El menú principal aparecerá al terminar.

Si el opening no puede reproducirse, el propio aviso permite saltarlo. Las
cinemáticas dentro de la historia también se pueden omitir.

Nota: si Música estaba exactamente al 0 %, **Entrar con sonido** la sitúa en
torno al 70 % para que el arranque sea audible. Después puedes volver a bajarla
desde Configuración.

## Menú principal

| Opción | Qué hace |
| --- | --- |
| **Comenzar** | Inicia una partida nueva desde el prólogo y limpia el estado narrativo anterior. |
| **Capítulos** | Permite iniciar cualquiera de los siete capítulos disponibles con estado limpio. No carga una partida guardada. |
| **Galería** | Abre arte, escenarios, vídeos y poses de personajes; dispone de filtros y protección de spoilers. |
| **Configuración** | Ajusta sonido, vídeo de escritorio y ayudas opcionales. |
| **Salir** | Cierra la app de escritorio. Un navegador no puede cerrar de forma fiable su propia pestaña. |
| **♪** | Vuelve a reproducir el tema principal del menú. |

## Controles generales

| Entrada | Resultado |
| --- | --- |
| Clic o toque durante la escritura | Completa de inmediato la línea actual. |
| Clic o toque con la línea completa | Avanza el diálogo. |
| Mantener `Ctrl` | Acelera texto y líneas. No decide elecciones ni juega minijuegos. |
| `Esc` | Abre o cierra Opciones durante la partida. En una cinemática, la salta. |
| Clic, `Esc`, `Enter` o `Espacio` en una cinemática | Salta el vídeo. |
| `F11` en Windows/Electron | Alterna pantalla completa. En macOS se usa `Ctrl+Cmd+F`. |

Las elecciones se resuelven pulsando una opción. Un clic en botones, paneles,
galería o minijuegos no avanza accidentalmente el diálogo que queda detrás.

## Controles durante una escena

En la parte superior aparecen cuando son aplicables:

- **Opciones**: pausa, ajustes y regreso al menú principal.
- **Escenas**: lista la escena actual y las ya visitadas del capítulo. Volver a
  una escena recupera el estado que tenía al visitarla.
- **Retroceder**: vuelve al comienzo de la escena anterior y restaura fondo,
  personajes, música, inventario y estado narrativo de ese momento.

Las cinemáticas ocultan temporalmente estos botones. Durante una elección o un
minijuego se puede abrir **Escenas** u **Opciones**; saltar o salir cancela de
forma segura la actividad en curso.

Al final de cada capítulo puede aparecer **Siguiente capítulo** o **Menú
principal**. Las decisiones tomadas durante una ruta pueden cambiar la escena o
el capítulo siguiente.

## Configuración y accesibilidad

La configuración aparece en el menú principal y dentro de Opciones:

- **Música**: volumen de pistas y audio musical.
- **Efectos**: volumen de SFX, golpes, blips y sonidos de interfaz.
- **Blips de texto**: activa o desactiva el sonido breve de cada letra.
- **Pantalla completa / Ventana**: sólo en la app de escritorio.
- **Ataque Kosai**: ayuda opcional que añade en batallas por turnos un golpe que
  deja al objetivo a 0 PV. Es un truco deliberado, no la dificultad normal.

No hay un silencio global independiente: para silenciar por completo hay que
bajar Música y Efectos. En macOS la pantalla completa de Electron se controla
desde el menú del sistema (`Ctrl+Cmd+F`).

Estos ajustes sí persisten al cerrar la app. En escritorio se guardan en la
carpeta de datos de Electron; en navegador dependen del almacenamiento local de
ese origen. La opción de movimiento reducido del sistema operativo desactiva o
estabiliza varias animaciones decorativas mediante CSS.

## Galería

La galería contiene seis filtros: Todo, Wallpapers, Ilustraciones, Personajes,
Escenarios y Vídeos. Las obras marcadas como spoiler permanecen ocultas hasta
confirmar el aviso.

- Las flechas izquierda/derecha navegan por filtros y obras abiertas.
- `Esc` cierra el visor o vuelve al menú.
- Los personajes permiten escoger entre sus poses disponibles.
- Cuando una pose tiene capas oculares válidas aparece **Ver parpadeo**.
- Los wallpapers descargables muestran su botón de descarga.

## Minijuegos activos y controles

Cada minijuego enseña sus instrucciones antes de comenzar. Los controles
principales actuales son:

| Tipo | Controles |
| --- | --- |
| Exploración de Furry Maps | Ratón o toque para elegir ubicaciones; `Tab` y `Enter` permiten navegación por teclado. |
| Persecución de gatos | Flechas o `WASD` para recorrer la cuadrícula sin que alcancen a Samu. |
| Recolección de guindillas | Izquierda/derecha, `A`/`D` o ratón. Recoge guindillas y evita botellas. |
| Bullet hell de Kingdom Ketchup | Flechas o `WASD` para moverse y `Espacio` para disparar guindillas. |
| Conducción | Ratón, `WASD` o flechas para moverse; `P`, `Esc` o el botón visible pausan. |
| Ritmo | Pulsa las teclas indicadas en pantalla o toca los carriles al cruzar la línea. |
| Vuelo de Edu | Ratón o `W`/`S` para altura; `Espacio` o clic para impulsar; `P`/`Esc` pausan. |
| Batallas por turnos | Ratón o toque para elegir habilidad, objetivo, objeto o cancelar. |
| Canalización de runas | Mantén y suelta `A`, `S`, `D` y `F`, o usa los cuatro botones en pantalla, para equilibrar las barras. |
| Créditos interactivos | Clic o toque en **Clic para saltar**. |

Los juegos de conducción y vuelo tienen pausa propia. Si se pierde una prueba
obligatoria aparece la opción de reintentar. Opciones y Escenas permiten
abandonar una prueba sin dejar bloqueada la novela.

La pausa general no se promete como congelación de cada temporizador interno:
en conducción y vuelo usa preferentemente `P` o su botón de pausa.

La compatibilidad táctil es parcial: Furry Maps, batallas, runas y varias UI
aceptan toque, pero el laberinto de gatos y el bullet hell requieren actualmente
teclado físico. No se considera todavía una versión móvil completa.

## Progreso y guardado

La versión actual **no dispone todavía de ranuras ni de continuación de partida
entre sesiones**. Existe infraestructura interna de serialización, pero no está
conectada al menú ni se ejecuta como guardado automático.

- Cerrar o recargar puede perder la ruta en curso.
- **Capítulos** sirve para retomar aproximadamente desde el comienzo de un
  capítulo, siempre con estado limpio.
- El historial de **Escenas** y **Retroceder** sólo existe durante el capítulo
  activo y conserva hasta 60 entradas.
- Los ajustes de sonido, ventana y ayudas sí se guardan.

## Problemas habituales del jugador

### La pantalla queda vacía o no aparecen capítulos

No uses `file://`. Ejecuta `npm start`, `start.bat` o un servidor HTTP y recarga.

### No se oye nada

Pulsa **Entrar con sonido**, revisa los dos volúmenes de Configuración y el
mezclador del sistema. Algunos navegadores requieren otro clic si bloquearon el
autoplay.

### Una cinemática no arranca

Haz clic sobre ella para autorizar la reproducción o pulsa **Saltar opening**.
En la historia, clic, `Esc`, `Enter` y `Espacio` permiten continuar.

### El juego parece congelado

Comprueba si hay una elección, instrucción o botón de reintento. Abre
**Opciones** para volver al menú o **Escenas** para regresar a un punto visitado.

### Los controles no responden en un minijuego

Haz un clic dentro del escenario para devolverle el foco. Evita que el navegador
capture las flechas y revisa las instrucciones concretas mostradas en pantalla.
En el laberinto de gatos y el bullet hell usa un teclado físico.

### La app se ve recortada

Alterna pantalla completa con `F11`, selecciona Ventana o usa una resolución
mínima de 640×360. El formato ideal es 16:9.

---

# Manual de desarrollo

## Principios de trabajo

1. El contenido narrativo vive en JSON; el comportamiento general vive en el
   motor. No modifiques `engine.js` para un simple cambio de texto o pose.
2. `assets/` contiene runtime y salidas necesarias para herramientas.
   `workbench/` conserva fuentes, originales y material retirado.
3. Los manifiestos de galería, parpadeo y sprites limpios son datos generados o
   mantenidos por sus herramientas; no se deben improvisar rutas paralelas.
4. `DOCUMENTACION.md` es canónico. `memory/` aporta contexto, pero no puede
   contradecir este manual.
5. Un cambio no termina hasta validar contenido, assets y documentación.

## Entorno y comandos

Requisitos recomendados:

- Node.js y npm para Electron, validadores, Prettier y builds.
- Python 3 con Pillow, NumPy y OpenCV para las herramientas de imagen.
- FFmpeg/ffprobe para audio, vídeo y algunas miniaturas.

Preparación orientativa de las herramientas locales:

```powershell
python -m pip install pillow numpy opencv-python
```

FFmpeg y ffprobe deben estar disponibles en `PATH`. El proyecto aún no fija las
dependencias Python en un `requirements` propio: si se incorpora uno, esta
sección y `LEER_PRIMERO.md` deben actualizarse en el mismo cambio.

```powershell
npm install                 # dependencias
npm start                   # Electron de desarrollo
npm run validate:content    # JSON, relaciones y assets
npm run audit:assets        # conversiones pendientes, sin escribir
npm run optimize:assets     # conserva originales y optimiza runtime
npm run check:js            # formato JS con Prettier
npm run tools:eyes          # centro gráfico en localhost:8011
npm run build:gallery       # regenera galería sin copiar promos externas
npm run dist:dir            # build Windows sin instalador
npm run dist                # instalador Windows
```

Para macOS existen `npm run dist:mac:dir` y `npm run dist:mac`. La firma y
notarización requieren credenciales externas; se explican en la referencia.

## Arquitectura y flujo de arranque

| Ruta | Responsabilidad |
| --- | --- |
| `index.html` | DOM del escenario, menú, controles superiores, disclaimer y orden de scripts. |
| `styles.css` | Interfaz general, responsive, diálogos, galería y estilos de minijuegos integrados. |
| `game.js` | Menú, configuración, galería, selector de capítulos, bucle de juego, pausa y navegación. |
| `engine.js` | Intérprete de acciones, render de escenas, estado, audio, vídeo, historial y minijuegos integrados. |
| `juice.js` | Shake, flash, grade, viñeta, fundidos y camas WebAudio. |
| `p5-effects.js` | Biblioteca visual heredada; el nombre del archivo es técnico y no define la identidad actual. |
| `battle-minigame.js` / `battle-styles.css` | Combate por turnos y su UI. |
| `ketchup-minigame.js` | Bullet hell contra Zip. |
| `rune-channeling-minigame.js` | Canalización cooperativa de runas. |
| `credits-minigame.js` | Créditos interactivos. |
| `chapters/*.json` | Guion ejecutable: capítulos, escenas, líneas, elecciones y acciones. |
| `characters/*.json` | Nombre visible, color, poses y animaciones de cada personaje. |
| `assets/metadata/*.json` | Galería, capas oculares, offsets, ediciones y copias limpias. |
| `electron/` | Ventana segura, servidor interno con Range, ajustes persistentes e IPC limitado. |
| `scripts/` | Validación, galería, optimización y herramientas gráficas. |

Orden de scripts, basado en los `window.*` globales: `p5-effects.js` → módulos
de batalla/créditos/Ketchup/runas → `juice.js` → `engine.js` → `game.js`.
`game.js` crea una instancia de
`VisualNovelEngine`, descubre `chapter0`, `chapter1`, etc. hasta el primer hueco,
carga personajes y llama a `nextLine()`. Cada línea ejecuta acciones, muestra
texto o elecciones y espera input. No introduzcas un hueco en la numeración de
capítulos: el descubrimiento se detiene ahí.

Electron no usa `file://`: `static-server.js` sirve la raíz en un puerto local
libre y soporta peticiones Range. `preload.js` sólo expone cerrar, guardar ajustes
permitidos y escuchar cambios; Node permanece desactivado en el renderizador.

## Estructura canónica

```text
chapters/                    guion chapter0.json ... chapter6.json
characters/                  fichas JSON por clave interna
assets/
├── audio/{music,sfx}/       runtime sonoro
├── images/                  fondos, CG, personajes, galería, minijuegos, UI
├── video/                   cutscenes, menú y galería
├── fonts/
└── metadata/                manifiestos consumidos en runtime/herramientas
workbench/
├── sources/                 fuentes editables y storyboards
├── originals/               copia exacta antes de optimizar
├── archive/                 variantes antiguas o desconectadas
└── optimization/            manifiesto SHA-256 de conversiones
electron/                     aplicación de escritorio
scripts/                      pipeline y herramientas locales
memory/                       contexto auxiliar, no manual canónico
```

## Mapa: quiero cambiar X

| Quiero… | Tocar primero | Después comprobar |
| --- | --- | --- |
| Corregir texto, speaker o ritmo de una escena | `chapters/chapterN.json` | `npm run validate:content` y escena completa. |
| Añadir una escena o elección | El JSON del capítulo | Títulos únicos, destinos y estado al retroceder. |
| Añadir un capítulo | `chapters/chapterN.json` con N consecutivo | Encadenado, selector y pantalla final. |
| Cambiar una pose o nombre visible | `characters/<clave>.json` | Todas las referencias y galería. |
| Añadir un sprite | `assets/images/characters/...` + ficha | Alfa, tamaño, copia limpia y parpadeo. |
| Añadir parpadeo | Centro ocular, capas y metadatos | Preview, offsets, animación y fallback. |
| Cambiar fondo o CG | `assets/images/backgrounds` o `cg` + acción del capítulo | Primer frame de escena, transición y galería. |
| Cambiar música/SFX | `assets/audio` + acciones `playSound`/`stopSound` | ID, loop, fade y clasificación music/sfx. |
| Añadir cinemática | `assets/video/cutscenes` + `playVideo` | Audio, salto, último frame y crossfade. |
| Ajustar un minijuego existente | Parámetros de la acción en el capítulo | Victoria, derrota, reintento, pausa y aborto. |
| Crear un minijuego | Módulo dedicado o `engine.js`, router `playMinigame` e `index.html` | Carga, CSS, input, cleanup y test aislado. |
| Cambiar combate | `battle-minigame.js` y `battle-styles.css` | Estados, objetivos, objetos, Kosai y varias resoluciones. |
| Cambiar menú/galería/configuración | `game.js`, `index.html`, `styles.css` | Teclado, foco, clic propagado y Electron. |
| Persistir un ajuste nuevo | `game.js`, allowlist de `electron/main.js` y `preload.js` si aplica | Navegador y reinicio de Electron. |
| Añadir arte a galería | Capítulo/ficha o catálogo curado en `build_gallery_manifest.py` | `npm run build:gallery` y spoilers. |
| Limpiar u optimizar assets | Herramienta correspondiente; nunca sobrescribir fuente | Manifiesto, hashes, referencias y build. |
| Cambiar empaquetado | `package.json` y `electron/` | `npm run dist:dir`, archivos incluidos y medios. |
| Cambiar canon | Capítulos + sección canónica de este manual | Qué sabe cada personaje y continuidad global. |

## Capítulos, escenas y elecciones

Formato mínimo:

```json
{
  "title": "Capítulo N: Título",
  "scenes": [
    {
      "title": "Escena 1: Título único",
      "lines": [
        {
          "actions": [
            { "type": "setBackground", "value": "assets/images/backgrounds/chapterN/fondo.webp" },
            { "type": "showCharacter", "character": "samu", "position": "left", "pose": "neutral" }
          ],
          "character": "Samu",
          "text": "Texto visible."
        },
        {
          "text": "Decide:",
          "choices": [
            { "text": "Primera opción", "nextScene": "Escena 2: Ruta A" },
            { "text": "Segunda opción", "nextScene": "Escena 3: Ruta B" }
          ]
        }
      ]
    }
  ]
}
```

Reglas prácticas:

- El `character` de la línea es el nombre visible; las acciones usan la clave
  de `characters/<clave>.json` en minúsculas.
- `position` admite `left`, `center` y `right`.
- Cada escena debe declarar fondo y música al entrar si tiene que ser accesible
  desde Escenas; no dependas visualmente de la escena anterior.
- Los títulos de escena son IDs narrativos: `nextScene` y `goToScene` deben
  coincidir exactamente.
- `nextChapter` en una elección o `setNextChapter` define la ruta posterior.
- Las elecciones también admiten condiciones e impactos de continuidad ya
  descritos en la referencia: objetos, rescates, llamadas y umbrales de retraso.
- `TEMPLATE_CHAPTER.json` es material legado y no es autoridad de esquema.
  Para contenido nuevo copia una escena de un capítulo activo y contrástala con
  el validador. Aunque el motor conserva compatibilidad con algunos destinos
  numéricos y `nextLine`, el contenido nuevo debe usar títulos únicos en
  `nextScene` o `nextChapter`, que es el contrato aceptado por el validador.

## Personajes, poses y animaciones

Ficha mínima:

```json
{
  "name": "Nombre visible",
  "color": "#7fd9ff",
  "poses": {
    "neutral": "assets/images/characters/clave/neutral.webp",
    "happy": "assets/images/characters/clave/happy.webp"
  },
  "defaultPose": "neutral"
}
```

`showCharacter` carga una ficha a demanda si aún no estaba precargada, por lo
que añadir una ficha no obliga siempre a editar `loadAllCharacters()` en
`game.js`. Añádela a la precarga sólo si debe estar disponible antes de su
primera acción o se usa fuera del flujo normal.

El campo `animations` describe los frames internos de una misma pose. Puede ser
una lista o un objeto con `frames`, `delayRange` y `loop`. Las secuencias
narrativas entre poses distintas se lanzan con `animateCharacter` y aceptan
`frameMs`, `loop`, `pingPong` y `untilAdvance`.

El runtime aplica en este orden las copias limpias de halo, intermedios de
parpadeo y capas oculares. Si falta una capa válida, conserva el sprite completo
como fallback; nunca debe deformar el cuerpo para simular un parpadeo.

## Resumen de acciones narrativas

| Familia | Acciones principales | Uso |
| --- | --- | --- |
| Escenario | `setBackground`, `clearBackground`, `showCG`, `hideCG`, `bgPan`, `fade` | Fondo, ilustración, cámara y transición. |
| Personajes | `showCharacter`, `hideCharacter`, `removeCharacter`, `setPose` | Presencia, hueco y expresión. |
| Animación | `animateCharacter`, `poseSequence`, `stopCharacterAnimation` | Acting entre poses. |
| Glitch | `characterGlitch`, `characterFullGlitch`, `characterGlitchUntilAdvance` | Corrupción puntual o sostenida. |
| Diálogo | `hideDialog`, `wait`, `waitForClick` | Ritmo y ausencia temporal de caja. |
| Audio | `playSound`, `stopSound`, `stopAllSounds`, `pauseSound`, `resumeSound`, `setVolume` | Música/SFX con ID, loop y fades. |
| Estado | `setVariable`, `giveItem`, `rescue`, `setDelay`, `addDelay` | Consecuencias y continuidad. |
| Flujo | `goToScene`, `setNextChapter` | Ramificación interna y entre capítulos. |
| Multimedia | `playVideo` / `cutscene` | Vídeo, crossfade, hold final y fondo de salida. |
| Juego | `minigame` | Lanza una actividad por su clave `game`. |
| Juice | `shake`, `flash`, `grade`, `vignette`, `sfx` | Impacto visual y audio sintetizado. |

Los alias españoles e históricos existen por compatibilidad, pero el contenido
nuevo debe usar un nombre canónico consistente. La referencia posterior detalla
campos y ejemplos de cada acción.

## Estado, continuidad y navegación

- `gameState`: variables genéricas del capítulo; `reset()` las limpia.
- `inventory`: objetos obtenidos; persiste entre capítulos de una partida.
- `rescued`: orden de personajes rescatados; persiste.
- `completedCalls`: llamadas completadas; persiste.
- `storyPressure`: coste acumulado canónico entre capítulos.
- `storyDelay`: alias sincronizado que utilizan acciones y condiciones antiguas.
- `sceneHistory`: hasta 60 snapshots del capítulo actual para Escenas y
  Retroceder; incluye escenario, audio, efectos y estado narrativo.

`startNewGame()` y el selector de capítulos limpian la continuidad. El encadenado
normal entre capítulos conserva inventario, rescates, llamadas y presión. No
confundas la persistencia durante una sesión con guardado en disco: `saveGame()`
existe como infraestructura sin llamadas activas ni interfaz de carga.

## Audio y vídeo

- Música: `assets/audio/music/<chapter|shared|menu|minigames>/`.
- SFX: `assets/audio/sfx/`.
- Cutscenes: `assets/video/cutscenes/`.
- Menú y galería: `assets/video/menu/` y `assets/video/gallery/`.

Usa IDs estables: `bg_music` o `music` se clasifican como música; el resto como
SFX salvo que la ruta esté bajo `audio/music`. Reutilizar la misma ruta e ID
evita reinicios entre escenas. Define `fadeIn`/`fadeOut` en milisegundos y
detén pistas que no deban continuar.

`playVideo` puede recibir `audioCrossfade`, `holdLastFrame`, `visualFadeOut` y
`endBackground`. Si una escena continúa desde el último fotograma, exporta ese
frame como fondo y decláralo en `endBackground` para evitar un corte visual.

## Minijuegos y batallas

Claves registradas por `playMinigame`:

| Clave | Implementación | Estado actual |
| --- | --- | --- |
| `furrielvaExplore` | `engine.js` | Activo en capítulo 2. |
| `chiliHarvest` / `guindillas` | `engine.js` | Activo; carga poder picante. |
| `ketchupBoss` / `ketchup` | `ketchup-minigame.js` | Activo; dificultad según guindillas/objeto. |
| `gatos` | `engine.js` | Activo. |
| `chase` | `engine.js` | Activo en capítulo 3. |
| `rhythm` | `engine.js` | Activo en capítulo 3. |
| `eduvuelo` | `engine.js` | Activo en capítulo 3. |
| `battle` | `battle-minigame.js` | Activo en capítulos 3–5. |
| `runeChanneling` | `rune-channeling-minigame.js` | Activo en capítulo 4. |
| `credits` / `creditos` | `credits-minigame.js` | Activo en capítulo 6. |
| `ecchi`, `paloma`, `runa`, `vocalecho` | `engine.js` | Motores disponibles; no aparecen en el recorrido activo actual. |

Para ajustar dificultad, cambia primero los parámetros de la acción JSON. El
motor admite variantes `...ByDelay` que seleccionan valores según
`storyDelay/storyPressure`. Sólo cambia JavaScript si la regla no puede
expresarse con opciones existentes.

Todo minijuego nuevo debe:

1. Resolver una `Promise` al ganar/perder o ser cancelado.
2. Registrar y retirar todos sus listeners, timers, RAF, audio y nodos DOM.
3. Impedir que sus clics avancen el diálogo de fondo.
4. Permitir reintento o definir claramente que el resultado no bloquea historia.
5. Soportar aborto desde Opciones/Escenas.
6. Mostrar controles antes de empezar y funcionar al menos con teclado/ratón.
7. Exponer, si es módulo, una API `window.XMinigame.play(options)` que resuelva
   una `Promise` y haga cleanup completo.
8. Cargarse antes de `engine.js`, registrar su caso en `playMinigame` y en
   `knownMinigames` de `scripts/validate_game_content.mjs`.
9. Incluirse en `minijuegos_test.html` y pasar una prueba dentro del capítulo.

## Galería y metadatos

`scripts/build_gallery_manifest.py` deriva arte de los capítulos y fichas,
añade entradas promocionales curadas, genera miniaturas y escribe
`assets/metadata/gallery_manifest.json`. No edites a mano el manifiesto generado.

```powershell
npm run build:gallery
```

El modo npm usa `--no-copy`; las promociones ya deben existir en `assets/`. Para
importar de nuevo el paquete externo, ejecuta el script con `--source <carpeta>`.
Cada entrada curada debe tener ID único, categoría válida, alt descriptivo,
decisión de spoiler y `downloadable` sólo cuando proceda.

Fondos, CG y poses referenciados se derivan automáticamente. Para un wallpaper,
concepto o vídeo curado, edita `PROMOTIONAL_FILES`/`PROMOTIONAL_ITEMS` en el
generador y vuelve a construir; no modifiques directamente el JSON generado.

## Assets runtime, originales y optimización

Política de imagen:

- Sprites y transparencias: WebP sin pérdida.
- Fondos/CG opacos: WebP calidad 92.
- PNG: sólo salidas de edición que realmente lo necesiten o archivos pequeños
  no rentables de convertir.
- Música larga: MP3 VBR q2 cuando la fuente sea WAV.
- Vídeo seleccionado: H.264 CRF20, `yuv420p`, `faststart`.

`scripts/optimize_runtime_assets.py` sólo convierte referencias explícitas y
familias dinámicas controladas. Antes de sustituir mueve el original a
`workbench/originals/runtime/assets/` y registra ruta, tamaño y SHA-256 en
`workbench/optimization/asset_optimization_manifest.json`. No optimiza si el
ahorro es inferior al 5 % y es reanudable tras una interrupción.

La conversión de audio/vídeo usa una lista `MEDIA_JOBS` explícita: añadir un
medio no lo optimiza automáticamente. Revísala cuando entre música o vídeo
nuevo. Capas oculares, previews y copias de halo se excluyen deliberadamente
porque son salidas de edición con requisitos propios.

```powershell
npm run audit:assets       # siempre primero
npm run optimize:assets    # sólo si hay candidatos revisados
npm run validate:content
```

`workbench/` se versiona completo para que fuentes, originales y archivo estén
disponibles para todo el equipo. Sus binarios se guardan como archivos normales
de Git: no añadas archivos de 100 MB o más y revisa el crecimiento del
repositorio antes de incorporar material pesado. No muevas originales otra vez
a `assets/` ni incluyas `workbench/` en Electron Builder.

## Herramientas gráficas locales

Inicia el centro con `ABRIR_EDITOR_OJOS.bat` o `npm run tools:eyes` y abre
<http://localhost:8011/tools>.

| Ruta | Herramienta | Salida principal |
| --- | --- | --- |
| `/` | Marcador de regiones oculares | Regiones manuales y recortes abiertos/intermedios/cerrados. |
| `/preview` | Alineación de ojos | Offsets y escalas independientes de las tres capas; preview/GIF/APNG. |
| `/clean-base` | Limpiador de pose base | Copia sin ojos, no destructiva. |
| `/white-halo` | Editor de halos | Copia limpia preferida por juego y galería. |
| `/tools` | Menú central | Acceso a todo el flujo servido en el puerto 8011. |

Metadatos relacionados:

- `blink_eye_regions_manual.json`: elipses marcadas.
- `blink_eye_region_previews.json`: recortes disponibles.
- `blink_eye_clean_offsets_manual.json`: alineación abierta/media/cerrada.
- `blink_eye_pixel_edits.json`: ediciones de borrador, dedo y pincel.
- `blink_eye_intermediates.json`: frame medio inyectado.
- `sprite_white_halo_cleaned.json`: copia limpia preferente por pose.

Scripts auxiliares:

- `build_character_eye_layers.py`: servidor, previews y construcción de capas.
- `build_blink_intermediates.py`: cola, registro y saneado de intermedios.
- `compose_character_blink.py`: composición de prueba.
- `compose_clean_eye_layers.py`: capas limpias y bases sin ojos.
- `build_gallery_manifest.py`: galería y miniaturas.
- `rebuild_intro_sala_trono_kk.py`, `render_menu_loop_4k.py` e
  `interpolate_menu_loop_48fps.py`: medios concretos, no pipelines generales.

El centro de control antiguo de puerto 8000 es legado; sus enlaces históricos
no sustituyen este manual ni el menú `/tools`.

## UI, estilos y accesibilidad

- Cambios estructurales: `index.html`.
- Flujo, foco y paneles: `game.js`.
- Presentación: `styles.css`; combate: `battle-styles.css`.
- Efectos de escena: `juice.js` y acciones JSON.

Mantén el escenario base 1280×720 y prueba 16:9, ventana pequeña, pantalla
completa y zoom del sistema. Todo modal debe tener foco inicial, cierre con Esc
cuando proceda, navegación por teclado y bloqueo de clics hacia la novela. Respeta
`prefers-reduced-motion` y no comuniques estado sólo mediante color.

## Electron, empaquetado y distribución

`electron/main.js` crea una sola instancia, gestiona F11/F12/recarga, abre
enlaces externos y persiste una allowlist de ajustes. Si añades una preferencia
que deba sobrevivir al reinicio, añade su clave a `SETTINGS_KEYS` y mantén el
canal IPC limitado. `electron/static-server.js` debe conocer el MIME de cualquier
formato nuevo y conservar soporte Range para audio/vídeo.

`package.json > build.files` es una allowlist. Comprueba que incluye el nuevo
runtime y excluye fuentes, legacy, personajes deprecados y `workbench/`.

```powershell
npm run dist:dir    # inspección rápida
npm run dist        # NSIS Windows
```

No publiques un instalador sin recorrer opening, menú, un capítulo, audio,
vídeo, galería, minijuego y cierre de aplicación en esa build.
El contenido de `dist/` no se presume actual: regenera y prueba la distribución
después de cualquier cambio que deba llegar al jugador.

## Validación, pruebas y entrega

Orden recomendado:

```powershell
npm run validate:content
npm run audit:assets
npm run check:js
node --check engine.js
node --check game.js
```

Después realiza la prueba manual proporcional al cambio. `validate:content`
comprueba capítulos, personajes, speakers, acciones, posiciones, destinos,
capitalización, galería, miniaturas, exclusiones sensibles y rutas literales.
No detecta por sí solo equilibrio, timing, encuadre, mezcla ni rutas construidas
completamente en tiempo de ejecución.

No existe todavía una suite E2E que recorra el juego completo; la prueba manual
proporcional al cambio es parte obligatoria de la entrega.

Deuda conocida a 2026-08-03: `npm run check:js` señala formato Prettier previo
en 11 archivos JavaScript. El comando sigue siendo útil para no ampliar la
deuda, pero no debe afirmarse que pasa globalmente ni ejecutarse `--write` sobre
todo el proyecto sin revisar el diff funcional resultante.

Checklist antes de PR:

- [ ] JSON y referencias validados.
- [ ] Consola sin errores nuevos.
- [ ] Ruta feliz y salida/cancelación probadas.
- [ ] Ratón y teclado probados; foco y Esc correctos.
- [ ] Audio/vídeo comprobados en servidor, no `file://`.
- [ ] Assets en runtime o `workbench` según corresponda; originales protegidos.
- [ ] Manual de usuario evaluado y actualizado, o motivo de no aplicación.
- [ ] Manual de desarrollo evaluado y actualizado, o motivo de no aplicación.
- [ ] `LEER_PRIMERO.md` evaluado si cambia el acceso o el flujo inicial.

## Mantenimiento obligatorio de los manuales

Todo cambio debe decidir si afecta a quien juega, a quien desarrolla o a ambos.
La actualización documental viaja en el mismo cambio y sustituye información
obsoleta en su sección canónica; no se añaden documentos por característica ni
un diario cronológico duplicado. La regla normativa completa está en
`AGENTS.md` y el recordatorio de entrega en `.github/PULL_REQUEST_TEMPLATE.md`.

## Canon, identidad y continuidad

Las reglas narrativas canónicas están en [Revisión integral de guion y canon](#revisión-integral-de-guion-y-canon-2026-08-01).
Al modificar guion:

- 3C es narradora y Nexo su auxiliar de continuidad; tienen voces propias.
- Los nombres activos son 3C y Nexo, no sus equivalentes de desarrollo.
- Elion Husk, AI.RI, el quinto creador, la realidad memética y las reglas de
  transformación deben respetar la causalidad fijada en esa sección.
- Registra qué sabe cada personaje antes de cada escena y no adelantes
  revelaciones.
- La comedia no elimina las consecuencias de una escena tensa ni copia la
  personalidad o dinámica de obras ajenas.

## Troubleshooting técnico rápido

| Síntoma | Comprobación |
| --- | --- |
| 404 de capítulo/personaje | Nombre de archivo, clave, servidor HTTP y primer hueco de capítulos. |
| Asset no aparece | Ruta/capitalización, WebP tras optimizar y `validate:content`. |
| Fondo negro tras salto | La escena debe declarar fondo en línea 0; revisa fundidos y cleanup. |
| Audio no cambia | ID reutilizado, clasificación music/sfx, fade o instancia detenida. |
| Sprite viejo pese a cambiar ficha | Manifiesto `sprite_white_halo_cleaned.json` puede sustituir la pose. |
| Ojos desplazados | Offsets independientes de abierto/medio/cerrado y edición guardada. |
| Minijuego bloquea novela | Promise sin resolver, listener/timer vivo o aborto no implementado. |
| Sprite animado desaparece tras el primer frame | El preload y el constructor dinámico deben usar la misma extensión; centraliza la ruta y comprueba todos los frames reales. |
| Ajuste no persiste en Electron | Falta en `SETTINGS_KEYS` o no pasa por `saveSetting`. |
| Build omite un archivo | Revisar `build.files`; `workbench` no se empaqueta. |
| Galería desactualizada | Ejecutar `npm run build:gallery` y validar miniaturas/spoilers. |

---

# Referencia detallada del motor

Las secciones siguientes contienen la API extensa, ejemplos, decisiones de
implementación y el registro consolidado acumulado durante el desarrollo. El
Manual de desarrollo anterior prevalece si una nota histórica usa rutas,
nombres, cifras o comportamientos antiguos. Los ejemplos con personajes
ficticios sirven para explicar el esquema y no describen el reparto vigente.
En especial, cualquier mención antigua a autoguardado, ranuras, `Cargar`, rutas
separadas del capítulo 3 o identidad “Persona 5” queda anulada por los manuales
canónicos anteriores; los identificadores `p5-*` que subsisten son sólo nombres
técnicos internos.

---

## 📝 Cómo Crear Contenido

### 1. Crear un Personaje

**Archivo: `characters/miPersonaje.json`**

```json
{
  "name": "Mi Personaje",
  "color": "#ff0000",
  "poses": {
    "neutral": "assets/images/characters/miPersonaje.png",
    "happy": "assets/images/characters/miPersonaje_happy.png",
    "sad": "assets/images/characters/miPersonaje_sad.png",
    "angry": "assets/images/characters/miPersonaje_angry.png",
    "surprised": "assets/images/characters/miPersonaje_surprised.png"
  },
  "defaultPose": "neutral"
}
```

### 2. Crear un Capítulo

**Archivo: `chapters/chapter1.json`**

```json
{
  "title": "Capítulo 1: Mi Historia",
  "scenes": [
    {
      "title": "Escena 1: El Principio",
      "lines": [
        {
          "_line": 0,
          "character": "Narrador",
          "text": "Aquí comienza la historia..."
        },
        {
          "_line": 1,
          "character": "Luna",
          "text": "¡Hola!",
          "actions": [
            {
              "type": "setBackground",
              "value": "assets/images/backgrounds/shared/cafe.png"
            },
            {
              "type": "showCharacter",
              "character": "luna",
              "position": "left"
            }
          ]
        }
      ]
    }
  ]
}
```

### 3. Validar y descubrir el contenido

No edites `startNewGame()` para cada personaje o capítulo. Los capítulos
numéricos contiguos se descubren automáticamente y los personajes se cargan de
forma perezosa al ejecutar su primera acción. Después de editar JSON:

```powershell
npm run validate:content
```

Sólo toca la precarga de `game.js` si una ficha debe existir antes de entrar en
su flujo narrativo normal.

---

## 💬 Sistema de Diálogos

### Línea Simple

```json
{
  "_line": 0,
  "character": "Luna",
  "text": "Este es mi diálogo"
}
```

### Con Acciones Previas

```json
[
{
  "_line": 1,
  "character": "Luna",
  "text": "Aparezco en escena",
  "actions": [
    {
      "type": "showCharacter",
      "character": "luna",
      "position": "left"
    }
  ]
}
]
```

### Elementos de una Línea

| Campo        | Tipo   | Obligatorio | Descripción                                    |
| ------------ | ------ | ----------- | ---------------------------------------------- |
| `_line`      | número | No\*        | Número de línea (para referencia)              |
| `character`  | string | Sí          | Nombre del personaje (se muestra en el cuadro) |
| `text`       | string | Sí          | Texto del diálogo                              |
| `actions`    | array  | No          | Acciones a ejecutar                            |
| `choices`    | array  | No          | Opciones para el usuario                       |
| `speakingAs` | string | No          | Sprite a resaltar al hablar (ver abajo)        |
| `emotion`    | string | No          | Efecto tipográfico emocional (ver abajo)       |
| `textAnimation` | string/bool | No   | Activa o desactiva la animación de una línea clave |

\*No es obligatorio, pero se recomienda para debugging.

### Emociones tipográficas

Por defecto, una línea sin `textAnimation` se muestra sin animación. Al usar
`"textAnimation": true` o `"auto"`, el motor reconoce la pose activa del
personaje y aplica miedo, enfado, tristeza, alegría, sorpresa o nervios;
`happy` permanece sin animación. Si el mismo personaje repite la misma emoción
en varios diálogos seguidos, solo se anima el primero para evitar que el efecto
resulte constante.

Para reservar una animación para un momento clave, usa `textAnimation` en la
línea. Puede recibir directamente el nombre del efecto:

```json
{
  "character": "Samu",
  "text": "¡No te acerques!",
  "textAnimation": "fear"
}
```

Valores disponibles: `fear`/`miedo`, `anger`/`agresividad`,
`sadness`/`tristeza`, `joy`/`alegría`, `surprise`/`sorpresa`,
`nervous`/`nervios`, `whisper`/`susurro` y `scream`/`grito` para momentos
excepcionales y estridentes. En `scream`, las primeras letras son pequeñas y
cada carácter crece progresivamente hasta que el final casi llena el bocadillo.
Usa `"textAnimation": false` para
desactivar expresamente el efecto aunque la pose tenga una emoción reconocida;
`"textAnimation": true` o `"auto"` activa la detección por pose. El campo
`emotion` anterior sigue siendo compatible.
Las preferencias del sistema para reducir movimiento desactivan las animaciones,
pero mantienen el color y la sombra emocional para conservar el contexto.

Los capítulos 0 a 6 contienen una selección curada de 26 diálogos con
`"textAnimation": true` (entre 2 y 5 por capítulo). Se reservan para
revelaciones, peligros, pérdidas y reacciones especialmente importantes.

### `speakingAs`: resaltar un sprite distinto del que habla

Al mostrar un diálogo, el motor resalta (efecto de brillo/zoom `.speaking`) al
sprite cuyo nombre coincide con `character`. A veces el que habla **no** tiene su
propio sprite en pantalla: por ejemplo, en una llamada telefónica habla "Edu"
pero en pantalla está el móvil (`iphone5`). Con `speakingAs` indicas qué sprite
debe hacer el zoom, sin cambiar el nombre mostrado en el cuadro de diálogo.

```json
{
  "character": "Edu",
  "speakingAs": "iphone5",
  "text": "¡Samu! Menos mal que llamas..."
}
```

Aquí el cuadro muestra "Edu" como interlocutor, pero es el móvil (a la derecha)
el que se resalta mientras "habla".

> `iphone5` se conserva únicamente como identificador técnico heredado para no
> romper los capítulos. El nombre visible es **Móvil** y el dispositivo es
> ficticio, robusto y de estilo cartoon, sin botón Home, interfaz de iOS, marcas
> ni rasgos identificables de Apple. Las llamadas usan siempre las versiones
> humanas de los contactos y una identidad propia: Edu azul, Tony rosa y José
> verde. Sus poses activas son los PNG `phone_call_*_humano_v2`; los antiguos
> `iphone5_edu.png`, `iphone5_tony.png` e `iphone5_jose.png` quedan como recursos
> heredados y no deben sustituir estas pantallas.

---

## ⚙️ Acciones

### setBackground

Cambia el fondo de la escena.

```json
{
  "type": "setBackground",
  "value": "assets/images/backgrounds/shared/cafe.png"
}
```

### showCharacter

Muestra un personaje en pantalla.

```json
{
  "type": "showCharacter",
  "character": "luna",
  "position": "left",
  "pose": "happy"
}
```

Parámetros:

- `character`: Nombre del personaje (sin .json)
- `position`: "left" o "right"
- `pose`: "neutral", "happy", "sad", "angry", "surprised" (opcional)

### hideCharacter / removeCharacter / quitarPersonaje

Quita a un personaje de la escena (vacía su hueco). Los tres nombres de acción
son equivalentes. **Recomendado usarlo cuando un personaje deja de intervenir**
para que no se quede en pantalla en las escenas siguientes.

Formas de uso:

```json
{ "type": "removeCharacter", "character": "luna" }
```

Quita a "luna" de la posición en la que se mostró (rastreada automáticamente).

```json
{ "type": "removeCharacter", "position": "right" }
```

Vacía directamente el hueco derecho (sin importar quién esté).

```json
{ "type": "removeCharacter", "character": "luna", "position": "right" }
```

Quita el hueco derecho (y olvida a "luna" si estaba ahí).

> Nota: la posición de cada personaje se rastrea al llamar a `showCharacter`, así
> que basta con indicar `character`. No hace falta quitar al protagonista (Samu),
> que permanece en escena durante todo el capítulo.

### setPose

Cambia la pose de un personaje visible mediante sustitución limpia del sprite.
No se conserva ni se superpone la pose anterior: cada hueco contiene un único
fotograma, también cuando entra un personaje diferente.

```json
{
  "type": "setPose",
  "character": "luna",
  "position": "left",
  "pose": "sad"
}
```

### animateCharacter / characterAnimation / poseSequence

Reproduce una secuencia declarativa de poses para acting, respiración,
parpadeos, nervios o sacudidas. Los tres nombres son equivalentes.

```json
{
  "type": "animateCharacter",
  "character": "samu",
  "position": "left",
  "poses": ["surprised", "curious", "thinking"],
  "frameMs": 260,
  "loop": false,
  "untilAdvance": false
}
```

- `poses` o `frames`: poses existentes en la ficha del personaje.
- `frameMs`: duración de cada fotograma, con mínimo seguro de 90 ms.
- `loop`: repite la secuencia salvo que valga `false`.
- `pingPong`: vuelve en orden inverso sin duplicar extremos.
- `untilAdvance`: por defecto `true`; el bucle se detiene al avanzar el texto.
- `immediate`: si vale `false`, espera un intervalo antes del primer fotograma.

`stopCharacterAnimation` y `stopPoseSequence` cancelan explícitamente la
secuencia. Ocultar al personaje, cambiar de escena, retroceder o reiniciar la
partida también limpia sus temporizadores. Con `prefers-reduced-motion` se
conserva un fotograma estático y legible.

### Animaciones internas de una pose

Una ficha de personaje puede declarar varios sprites de la **misma pose** en
`animations`. El motor precarga los fotogramas y los reemplaza uno a uno, sin
crossfade ni capas simultáneas. Esto sirve para parpadeos, respiración o pequeños
gestos que no cambian la emoción narrativa:

```json
{
  "poses": {
    "neutral": "assets/images/characters/samu/Samu.webp"
  },
  "animations": {
    "neutral": {
      "frames": [
        { "src": "assets/images/characters/samu/animations/samu_neutral_blink_half.webp", "duration": 65 },
        { "src": "assets/images/characters/samu/animations/samu_neutral_blink_closed.webp", "duration": 95 },
        { "src": "assets/images/characters/samu/animations/samu_neutral_blink_half.webp", "duration": 65 }
      ],
      "delayRange": [1800, 4200],
      "loop": true
    }
  }
}
```

- `frames`: una o más rutas de sprites completos u objetos `{src, duration}`;
  la pose base actúa como fotograma adicional y se restaura al terminar.
- `delayRange`: espera aleatoria entre ráfagas para evitar un bucle mecánico.
- `loop`: con `false`, reproduce la ráfaga una sola vez.
- La pose base reaparece automáticamente al terminar cada ráfaga.
- Cambiar de pose, ocultar, reemplazar, saltar o retroceder cancela el temporizador.
- Con movimiento reducido no se inicia la animación interna.

Hay animación ocular en **135 de las 160 poses declaradas**. Cada variante se
dibuja para esa pose concreta y se compone únicamente sobre sus ojos: el cuerpo,
el encuadre y el canal alfa permanecen idénticos al sprite base. Los fotogramas
viven en las carpetas `animations/blinks/` de cada personaje y usan WebP sin
pérdida. Las poses que originalmente ya tienen los ojos cerrados reciben una
variante abierta breve; no se aplican respiraciones, rebotes, escalados ni
deformaciones procedurales.

Las 25 exclusiones son deliberadas porque no contienen ojos animables: siluetas,
pantallas de móvil, formas amorfas, caras tapadas y las poses del Gorila con las
gafas completamente opacas. `gorila_sospecha` sí parpadea porque baja las gafas.
El compositor de apoyo es `scripts/compose_character_blink.py`; preserva la
resolución y el alfa y solo acepta máscaras oculares explícitas.

### hideDialog / hideText / ocultarTexto

Oculta el cuadro de diálogo/texto que esté visible. Útil para dejar una imagen,
fondo o escena en pantalla durante unos segundos sin texto encima.

```json
{
  "type": "hideDialog"
}
```

Ejemplo con espera:

```json
{
  "actions": [
    { "type": "hideDialog" },
    {
      "type": "setBackground",
      "value": "assets/images/backgrounds/chapter4/despertar_samu.webp"
    },
    { "type": "wait", "value": 2500 }
  ]
}
```

Si quieres mantener la pantalla limpia hasta que el jugador haga click, usa
`waitForClick` en lugar de `wait`:

```json
{
  "actions": [
    { "type": "hideDialog" },
    {
      "type": "setBackground",
      "value": "assets/images/backgrounds/chapter4/despertar_samu.webp"
    },
    { "type": "waitForClick" }
  ]
}
```

### playSound

Reproduce un archivo de audio con opciones avanzadas.

**Formato Simple:**

```json
{
  "type": "playSound",
  "value": "assets/audio/bell.mp3"
}
```

**Formato Avanzado:**

```json
{
  "type": "playSound",
  "path": "assets/audio/music.mp3",
  "volume": 0.8,
  "loop": true
}
```

**Parámetros:**

- `path` o `value`: Ruta del archivo de audio
- `volume`: Volumen (0.0 a 1.0, por defecto 1.0)
- `loop`: Si se repite en bucle (por defecto false)
- `autoPlay`: Si se inicia automáticamente (por defecto true)
- `id`: Identificador estable para sustituir o detener una pista
- `fadeIn`: Entrada progresiva en milisegundos

Al detener o sustituir un audio, el motor elimina inmediatamente la referencia
de `audioInstances` aunque el elemento termine su `fadeOut` en segundo plano.
Así una pista con la misma ruta e ID puede volver a arrancar sin reutilizar por
error un elemento que todavía estaba desvaneciéndose. Los fallos de carga o
decodificación también liberan la referencia para permitir otro intento.

**Ejemplos:**

Música de fondo (baja, en bucle):

```json
{
  "type": "playSound",
  "path": "assets/audio/ambient.mp3",
  "volume": 0.5,
  "loop": true
}
```

Efecto de sonido (volumen máximo):

```json
{
  "type": "playSound",
  "path": "assets/audio/sword.mp3",
  "volume": 1.0
}
```

Sonido silencioso:

```json
{
  "type": "playSound",
  "path": "assets/audio/whisper.mp3",
  "volume": 0.3
}
```

### wait

Pausa la ejecución.

```json
{
  "type": "wait",
  "value": 2000
}
```

El valor está en milisegundos (1000 = 1 segundo).

### setVariable

Establece variables en el estado del juego.

```json
{
  "type": "setVariable",
  "variable": "luna_relationship",
  "value": 10
}
```

### goToScene

Salta a otra escena por su **título** (o índice) desde dentro de una línea,
sin necesidad de una elección. Útil para reunir varias rutas ramificadas en
una escena común. Debe ser la última acción/línea útil de la escena de origen.

```json
{
  "type": "goToScene",
  "value": "Escena 5: Dentro de Kingdom Ketchup"
}
```

### setDelay / addDelay

Gestionan la **presión narrativa acumulada** de la partida. `storyPressure` es
la fuente persistente entre capítulos y `storyDelay` se conserva como alias de
compatibilidad para las condiciones y configuraciones históricas. `setDelay`
fija ambos valores y `addDelay` los incrementa; solo una partida nueva o una
selección explícita de capítulo los devuelve a 0.

```json
{ "type": "setDelay", "value": 2 }
{ "type": "addDelay", "value": 1 }
```

El retraso permite dos efectos:

1. **Texto por consecuencia**: una línea de diálogo puede definir `consequence`
   con un umbral `delayAtLeast`; si el retraso acumulado lo alcanza, se muestra
   el texto alternativo (p. ej. un personaje más enfadado por la tardanza).

   ```json
   {
     "character": "Edu",
     "text": "¡Menos mal que has venido!",
     "consequence": {
       "delayAtLeast": 2,
       "text": "¿Sabes cuánto llevo esperándote? ¡Esto está mucho peor por tu culpa!"
     }
   }
   ```

   También existe `allRescuedText`: texto que se usa cuando ya se ha rescatado
   a los 3 amigos (`rescued.length >= 3`). Útil al final de cada Capítulo 2 para
   no decir que "faltan amigos por rescatar" cuando ya no queda nadie. Tiene
   prioridad sobre `consequence`.

   Y existe `byRescueCount`: un mapa `nº de rescatados → texto` que permite
   **revelar la historia por etapas según el ORDEN de rescate**. Al entrar a un
   Capítulo 2 la acción `rescue` de ese amigo ya se ejecutó, así que
   `rescued.length` vale 1, 2 o 3 según si es el 1º, 2º o 3º/último rescate. Se
   elige la entrada cuya clave sea el mayor umbral `<= rescued.length`. Tiene
   **máxima prioridad** (por encima de `allRescuedText` y `consequence`). Se usa
   para revelar una misma información por etapas sin adelantar lo que el grupo
   todavía no sabe. En el canon activo no se describe la transformación como un
   «virus»: las pistas avanzan desde una anomalía memética hasta la intervención
   externa de Elion Husk.

   ```json
   {
     "character": "Edu",
     "text": "Los memes de internet cobraron vida y persiguen a los furros...",
     "byRescueCount": {
       "1": "Algo está encontrando las costuras de estos mundos...",
       "2": "La corrupción entra desde fuera y aprovecha deseos que ya existían.",
       "3": "El husky del alfiler rojo está coordinando a los brainrot."
     }
   }
   ```

   ```json
   {
     "character": "Edu",
     "text": "Estoy a salvo. Pero los demás siguen en peligro.",
     "allRescuedText": "Estoy a salvo. Y ya no queda nadie en peligro."
   }
   ```

2. **Dificultad de minijuego**: un `minigame` puede definir cualquier propiedad
   `<algo>ByDelay` (un mapa umbral→valor) que sobreescribe a `<algo>` según el
   retraso: se elige la entrada cuyo umbral sea el mayor que no supere el retraso
   actual. Ejemplos: `maxHitsByDelay` (juego `chase`, menos vidas) o
   `maxMissesByDelay` (juego `ecchi`, menos fallos permitidos).

   ```json
   {
     "type": "minigame",
     "game": "chase",
     "distance": 100,
     "maxHits": 3,
     "maxHitsByDelay": { "0": 3, "1": 2, "2": 1 }
   }
   ```

   ```json
   {
     "type": "minigame",
     "game": "ecchi",
     "goal": 12,
     "maxMisses": 3,
     "maxMissesByDelay": { "0": 3, "1": 2 }
   }
   ```

### Salir de un minijuego

Los tres botones de arriba (**Opciones**, **Escenas** y **Retroceder**) se ven
también **durante los minijuegos**, combate incluido. Antes se escondían, y
quien llegaba a un minijuego desde el menú de escenas se quedaba encerrado: la
única salida era ganarlo.

Cómo funciona, porque no es evidente: el bucle del juego está *dentro* de
`playMinigame()`, así que no basta con marcar la petición. `playMinigame` corre
en un `Promise.race` contra una promesa de cancelación; `engine.abortarMinijuego()`
la rechaza, y el `catch` **borra el overlay**, que es lo que de verdad mata al
minijuego, porque sus controles cuelgan de ahí. Además se llama a
`stopAllSounds()`: la música del minijuego no se va con el overlay, y quien nos
saca (otra escena, retroceder, el menú) ya repinta su propio ambiente.

Por eso cada bucle de minijuego comprueba `overlay.isConnected` y se para solo
cuando su overlay desaparece. **Todo minijuego nuevo tiene que hacer lo mismo**,
y si usa `setInterval` en vez de `requestAnimationFrame` debe apagarlo a mano
(el de ritmo lo hace). Los oyentes que cuelgan de `document` con
`preventDefault` (ritmo, side-scrollers) se dan de baja solos al detectar el
overlay desconectado; si no, seguirían tragándose las teclas el resto de la
partida.

La **cutscene** es la excepción: ahí los botones sí se esconden, porque es un
vídeo que ya se salta con un clic o con Esc (`cutsceneEnMarcha()` en `game.js`).

En CSS, los botones van a `z-index: 5200` para quedar por encima del combate
(5000) y de los créditos (1500); el menú de escenas a 5300 y el de pausa a 5400.

### Minijuegos disponibles

| `game`    | Descripción                                                        | Parámetros principales                       |
| --------- | ------------------------------------------------------------------ | -------------------------------------------- |
| `chiliHarvest` | Recoge 🌶️ durante un tiempo para cargar el poder contra Zip       | `duration`, `powerGoal`, `boxBonus`          |
| `ketchupBoss`  | Bullet hell: dispara 🌶️ y esquiva el ketchup de Zip               | `enemyHp`, `maxHits`, `maxSpicePower`        |
| `ecchi`   | Clica 🍑 a tiempo, evita 💋                                        | `goal`, `maxMisses`, `lifetime`              |
| `paloma`  | Memoriza y repite la secuencia                                     | `rounds`, `flashMs`, `gapMs`                 |
| `gatos`   | **Estilo Pac-Man con laberinto**: huye de los gatos por las calles | `survive`, `cats`, `playerSpeed`, `catSpeed` |
| `chase`   | Persecución lateral en el coche de Santi                            | `distance`, `speed`, `maxHits`, `spawnMs`    |

#### Minijuego `gatos` (Micaela Michis)

Un **Pac-Man por rejilla** en un **laberinto de calles urbanas**. Samu (🐺) recorre
las calles (← ↑ → ↓ / WASD), girando en las intersecciones, y debe **sobrevivir** un
tiempo mientras los gatos (🐱) le persiguen por el laberinto. Si un gato lo alcanza,
pierde y puede reintentar. Se usa en el Capítulo 2 de Edu (El Jarrón).

```json
{
  "type": "minigame",
  "game": "gatos",
  "survive": 60,
  "cats": 3,
  "playerSpeed": 5.0,
  "catSpeed": 3.0
}
```

| Parámetro     | Descripción                                             | Por defecto |
| ------------- | ------------------------------------------------------- | ----------- |
| `survive`     | Segundos que hay que aguantar                           | 60          |
| `cats`        | Nº de gatos perseguidores (1-4 usan esquinas distintas) | 3           |
| `playerSpeed` | Velocidad de Samu (**celdas**/s)                        | 5.0         |
| `catSpeed`    | Velocidad de los gatos (**celdas**/s)                   | 3.0         |

El laberinto es fijo (una cuadrícula de manzanas separadas por avenidas), está
definido en `VisualNovelEngine.GATOS_MAZE` y es completamente transitable (sin
callejones sin salida). Samu empieza en el centro y los gatos en las esquinas.

**Diseño (importante):** los gatos persiguen con búsqueda de camino (**BFS**) por las
calles, pero —como los fantasmas de Pac-Man— **no todos van directos a la vez**:
alternan modo _scatter_ (3 s cada 8 s se retiran a su esquina) y modo _chase_, y en
chase cada gato tiene un objetivo distinto (uno persigue directo, otro embosca 4
celdas por delante de Samu, otro solo caza si está lejos). Esto crea ventanas de
escape; si los 3 apuntaran siempre a Samu lo acorralarían y el juego sería imposible.
La otra clave del equilibrio: Samu es más rápido que los gatos (`playerSpeed >
catSpeed`) y gana **manteniéndose en movimiento** por las calles.

#### Minijuego `chase` — coche y carretera (jul. 2026)

El coche de Santi usa seis fotogramas normalizados (`coche_v2_0.png` a
`coche_v2_5.png`) en un bucle de 85 ms por fotograma. Las poses añaden movimiento
de suspensión y pequeños cambios de los ocupantes. El giro se representa cambiando
la orientación de las ruedas originales del coche entre fotogramas; no se dibujan
ruedas adicionales mediante CSS.

En las escenas **El trayecto** y **Asalto en la carretera** del capítulo 3, la
composición interior coloca a Santi en el hueco izquierdo, a Samu en el central y
a Edu en el derecho. El sprite de Santi queda anclado al borde inferior izquierdo,
de modo que el corte de su volante continúa de forma natural fuera de plano.

La capa cercana del escenario es `carretera_loop_v2.png` (2048×1152, RGBA):
asfalto nocturno con textura, carriles, guardarraíl, vegetación, reflectores y
farolas. Su mitad superior es transparente para revelar
`carretera_loop_fondo_sin_luna_v2.png`. El skyline lejano avanza al 22 % de la
velocidad de la carretera cercana para reforzar la profundidad del parallax.
La capa se representa al 62 % de la altura del escenario: la base de la ciudad,
que ocupa aproximadamente el 91 % de la imagen fuente, queda así en el 56–57 %
del área jugable, alineada detrás del borde superior del quitamiedos. Los edificios
asoman sobre la barrera en vez de quedar enterrados tras el asfalto y su menor
escala refuerza que pertenecen al fondo.

La luna ya no forma parte de esa textura repetida. `carretera_luna_v2.png` es una
capa RGBA independiente, situada entre el cielo lejano y la carretera cercana.
Durante cada persecución recorre suavemente el cielo desde el 82 % al 20 % del
ancho y asciende del 22 % al 12 % de la altura. Su posición depende del progreso
real de la carrera, no de una animación CSS: la cuenta atrás y la pausa también
detienen su recorrido, y al completar el tramo transmite que ha pasado tiempo sin
repetirse con el loop del skyline.

Los cuatro memes motoristas usan cuatro fotogramas cada uno (`meme_*_v2_0.png`
a `meme_*_v2_3.png`) a 95 ms por fotograma. Conservan las motos y ruedas
integradas en el dibujo; las fases modifican suspensión, orientación de la rueda
y longitud del reactor. Los PNG tienen transparencia real, sustituyendo los
antiguos sprites con fondos rectangulares opacos.

La conducción ya no está limitada al eje vertical: el coche recorre toda la
calzada en X/Y con ratón, puntero táctil, WASD o flechas. El límite derecho está
adelantado a propósito: acercarse al tráfico frontal reduce el tiempo de reacción,
pero abre espacio para huir de las motos que llegan por detrás. Los límites
verticales se calcularon para que el sprite visible no quede recortado. El límite
inferior es `0.92`: aprovecha el margen transparente inferior del PNG y permite
bajar unos 12 px más que el antiguo `0.90`.

Los obstáculos frontales conservan el desplazamiento de derecha a izquierda,
pero su velocidad en píxeles es exactamente la misma que la de
`carretera_loop_v2`: parecen apoyados en el asfalto en lugar de deslizarse sobre
él. Bidón, valla, rocas y cable usan cuatro PNG transparentes cada uno
(`obs_*_v2_0.png` a `obs_*_v2_3.png`). El bidón cabecea con la tapa suelta, las
rocas tiemblan y levantan motas de polvo, el cable alterna sus descargas y las
balizas de la valla parpadean. Cada familia tiene su propio ritmo de animación
(85–160 ms) y se precarga completa antes de iniciar la cuenta atrás.

La nueva valla no es una tabla frontal aislada: son tres módulos enlazados que
retroceden en perspectiva desde el primer plano. Mide el 29 % de la altura del
escenario y su centro de aparición se limita a `0.68–0.79`, de modo que permanece
visible y tapona una parte importante de la profundidad transitable sin cerrar
siempre toda la carretera. Sus tres bases proyectan **tres huellas independientes**
sobre el asfalto. El jugador puede buscar el hueco delantero, trasero o intermedio,
pero tocar cualquiera de los apoyos cuenta como impacto.

Como la velocidad sincronizada deja más objetos simultáneos en pantalla, el
director conserva su separación física al calcular el intervalo, suaviza los
cambios extremos de carril y aumenta progresivamente la densidad durante la
partida.

Las motos alternan entre ambos sentidos (el primero se elige al azar), evitando
rachas en las que todas lleguen por el mismo lado. Las traseras aparecen fuera
del borde izquierdo, acechan durante 0,85 s siguiendo el carril del jugador y
muestran `⚠ MOTO`; después fijan su trayectoria y embisten hacia la derecha.
Durante el acecho no hacen daño. Las frontales aparecen por la derecha mirando
hacia el coche, muestran un aviso azul en ese borde y suman su propia velocidad
a la del asfalto. Existe un enfriamiento mínimo de 1,35 s y no pueden encadenarse
dos apariciones de moto, evitando pinzas aleatorias inevitables.

La persecución no colisiona mediante solapamiento de sprites. Coche, obstáculos y
motos proyectan una o varias **huellas elípticas sobre el plano de la carretera**,
situadas bajo las ruedas o las bases del objeto. Dos dibujos pueden solaparse
visualmente sin impacto si sus huellas están a distinta profundidad: con menor Y
el coche pasa por detrás y con mayor Y pasa por delante. El `z-index` también se
calcula desde la huella más cercana, por lo que el orden visual coincide con la
maniobra.

La prueba de impacto es continua: se calcula la distancia mínima entre el
movimiento relativo de ambas huellas durante el fotograma, usando la suma de sus
radios como elipse de exclusión. Esto evita atravesar un cable o una moto rápida
entre dos frames y no se reduce a preguntar si dos rectángulos se solapan en la
imagen. El vuelo conserva sus cajas 2D porque allí no existe profundidad de
carretera.

La dificultad de julio de 2026 aumenta simultáneamente velocidad, duración y
densidad. Los presets aislados de `minijuegos_test.html` son:

| Modo | Velocidad | Distancia | Golpes | `spawnMs` base |
| ---- | --------- | --------- | ------ | -------------- |
| Fácil | 7 | 75 | 3 | 400 |
| Medio | 9 | 110 | 2 | 340 |
| Difícil | 11 | 150 | 2 | 285 |

La configuración narrativa de `chapter3.json` escala con `storyDelay`:

| Retraso | Velocidad | Distancia | Golpes | `spawnMs` base |
| ------- | --------- | --------- | ------ | -------------- |
| 0 | 10 | 220 | 3 | 340 |
| 1 | 11 | 250 | 2 | 300 |
| 2 | 12.5 | 285 | 2 | 250 |

El director todavía aplica el factor de separación física y la entrada
progresiva, por lo que `spawnMs` es el intervalo base y no el intervalo final
cronometrado entre dos objetos.

Antes de empezar se muestra `3, 2, 1, ¡YA!`, sin el antiguo parpadeo inicial de
invulnerabilidad. El HUD enseña porcentaje, metros restantes, vidas y pausa; la
barra de progreso está arriba para no tapar la carretera. `P`, `Esc` o el botón
del HUD congelan por completo partida y cuenta atrás. El escenario desactiva los
gestos del navegador (`touch-action: none`) para que el control táctil responda
como conducción.

`minijuegos_test.html` incluye la casilla **Mostrar hitboxes en persecución y
vuelo**. En la persecución dibuja las huellas elípticas: coche en verde,
obstáculos en rojo y motos en amarillo. En el vuelo mantiene las cajas 2D y los
coleccionables azules. La opción también se inyecta al usar **Como en la
historia**, pero nunca se activa en una partida narrativa normal.

#### Minijuego `eduvuelo` — peligros aéreos (cap. 3)

Vuelo arcade dedicado: Edu recupera frases de partituras en la estructura del
concierto mientras atraviesa cables, focos, altavoces y ráfagas. Ya no usa el
motor genérico del side-scroller. Antes de empezar muestra `3, 2, 1, ¡VUELA!`;
ratón o `W/S` controlan la altura y `Espacio` o clic consumen energía para
activar un impulso breve. Durante el impulso Edu es invulnerable, rompe
peligros y puede efectuar un **contrapulso** contra los altavoces.

El HUD muestra partituras, cadena, energía y resistencia. Recoger sin recibir
daño aumenta la cadena y la puntuación; pasar muy cerca de un peligro concede
`¡CASI!`, puntos y energía. El resultado guarda puntuación, cadena máxima,
casi-roces y rango `S/A/B/C`. Las partituras aparecen en pequeñas frases y hay
una garantía `collectEvery`, por lo que una mala tirada aleatoria no puede
alargar indefinidamente la partida ni crear una sucesión imposible. En el
último tramo suben progresivamente la velocidad y la densidad, pero sólo se
genera un patrón de peligro por turno.

`P`, `Esc` o el botón del HUD pausan también la cuenta atrás y congelan
jugador, objetos y avisos. La casilla de `minijuegos_test.html` dibuja la caja
verde del jugador, las rojas de los peligros y las azules de las partituras.
Desde 2026-07-31, Edu, focos y altavoces colisionan mediante elipses; los
cables conservan un rectángulo estrecho por su forma vertical. El barrido entre
frames interpola simultáneamente la trayectoria de Edu y la del peligro en
varios puntos, en vez de unir posiciones con un rectángulo grande o enfrentar
instantes diferentes. Esto evita esquinas fantasma en movimientos diagonales y
golpes al cambiar rápidamente de altura en dificultad difícil.
Los objetos se preparan fuera del borde derecho (y el foco por encima) para
entrar suavemente, pero no pueden activar ninguna interacción hasta que al
menos el `18 %` de su forma de colisión haya entrado en el escenario. Además,
la comprobación se suspende si vuelve a quedar menos de un `10 %` visible.
`.fly-stage` usa `overflow: hidden`, por lo que la parte exterior tampoco se
renderiza sobre el HUD o fuera del área de vuelo.
Los peligros usan un factor de tolerancia `0.80`, por lo que un mero contacto
de bordes no causa daño; las partituras mantienen `1.06` para que recogerlas
siga siendo cómodo. Con hitboxes activadas, cada impacto muestra el tipo de
peligro y deja durante unos segundos la marca exacta de la colisión. El aviso
normal también identifica `FOCO`, `ALTAVOZ` o `CABLE`.
El obstáculo que provoca un golpe permanece resaltado brevemente en el punto
de contacto y el aviso de impacto tiene prioridad sobre mensajes secundarios,
para que el origen del daño no desaparezca en el mismo frame.

Los cables se renderizan mediante un `<img>` interno y no habilitan su hitbox
hasta que el PNG haya terminado de cargar. Si la carga falla o supera `1600 ms`,
el objeto se descarta sin poder causar daño. El cable inferior se voltea sobre
su propio centro: su sprite queda dentro del escenario, desde el suelo hacia
arriba, exactamente en la misma zona que su hitbox. Esto corrige el antiguo
caso en que la transformación visual desplazaba el dibujo bajo el borde
inferior mientras la colisión seguía dentro de la zona jugable.

Los assets de persecución y `eduvuelo` se precargan y decodifican una sola vez
por sesión. `VisualNovelEngine` memoriza las URLs, las promesas de carga y los
objetos `Image`, por lo que repetir una partida o volver a utilizar un frame no
inicia otra petición. La persecución tampoco precarga ya los tres PNG grandes del
cable del antiguo modo de vuelo. En la aplicación de Electron,
`electron/static-server.js` entrega imágenes, audio, vídeo y fuentes con caché
inmutable; HTML, JavaScript, CSS y JSON siguen revalidándose mediante `ETag`.
El sello estable de `cacheBustAsset()` cambia al recargar la aplicación, de modo
que una edición de assets obtiene una URL nueva sin provocar descargas continuas
dentro de la partida.

Parámetros principales (todos admiten su variante `...ByDelay` desde historia):

| Parámetro | Descripción | Por defecto |
| --- | --- | --- |
| `goal` | Partituras necesarias para terminar | 16 |
| `speed` / `spawnMs` | Velocidad horizontal base e intervalo inicial de aparición | 6.4 / 620 |
| `hangChance` / `riserChance` | Peso de cable desde techo / suelo | 0.26 / 0.20 |
| `hangMin` / `hangMax` | Longitud del cable como fracción del escenario | 0.28 / 0.62 |
| `fallerChance` / `fallerVy` | Peso y velocidad vertical de los focos con aviso | 0.28 / 0.30 |
| `speakerChance` | Peso del altavoz pulsante destruible con contrapulso | 0.19 |
| `gustChance` | Peso de ráfagas no dañinas que desplazan a Edu | 0.11 |
| `collectChance` / `collectEvery` | Probabilidad de frase y máximo de patrones entre frases | 0.29 / 3 |
| `phraseMin` / `phraseMax` | Partituras que forman cada frase | 1 / 2 |
| `energyRegen` / `dashCost` | Regeneración por segundo y coste del impulso | 8 / 52 |
| `dashDuration` | Duración del impulso en segundos | 0.36 |
| `difficultyRamp` | Aumento de velocidad a lo largo de la partida | 0.32 |
| `corridorMin` | Hueco vertical mínimo garantizado entre cables | 0.20 |
| `graceMs` / `hitGraceMs` | Gracia inicial y tras un impacto | 900 / 900 |

Presets de test:

| Modo | Velocidad | Objetivo | Impactos | Aparición | Regeneración / coste | Escalada |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Fácil | 5.4 | 14 | 4 | 720 ms | 11 / 42 | 0.20 |
| Medio | 7 | 20 | 3 | 590 ms | 8 / 52 | 0.32 |
| Difícil | 9 | 26 | 2 | 450 ms | 6 / 60 | 0.46 |

En el capítulo 3, `storyDelay` escala el objetivo a `20/24/28`, la velocidad a
`6.8/7.8/8.8`, la aparición a `600/520/450 ms` y los impactos a `3/2/2`.
También aumenta los pesos de cable, foco y altavoz, reduce la regeneración de
energía a `8/7/6`, eleva el coste del dash a `50/55/60` y acorta su duración a
`0.38/0.35/0.32 s`. La escalada final pasa a `0.30/0.38/0.46`. El dash sigue
siendo una herramienta decisiva, pero ya no permite atravesar casi todos los
patrones sin administrar la energía.

Los assets runtime están en `assets/images/minigames/chapter3/`: el fondo es
`aire_fondo_v2.webp` y, dentro de `sprites/`, viven los ocho
`edu_fly_v3_0.webp`…`edu_fly_v3_7.webp` y los dos
`edu_fly_v3_dash_*.webp`. Son lienzos transparentes de `512×512`, con el torso
anclado en el mismo punto, margen seguro y un único componente visual para
impedir motas o partes fuera del sprite. El ciclo de vuelo recorre ocho alturas
de ala y el dash alterna sus dos poses a mayor cadencia.

Las hojas editables `edu_volando_sheet_v3.png`,
`edu_volando_dash_sheet_v3.png` y `cables_aire_sheet_v2.png` no forman parte del
runtime: están protegidas bajo `workbench/sources/images/minigames/chapter3/`.
Los PNG exactos anteriores a la optimización están en
`workbench/originals/runtime/assets/images/minigames/chapter3/`.

Los diez frames conservan exactamente los dos bigotes faciales del diseño
canónico: ambos nacen del hocico y el visible termina junto a la
mandíbula/garganta. Se eliminaron la cuña blanca previa y todos los falsos
trazos que nacían detrás de la cabeza o formaban bucles hacia las alas. Las
hojas fuente se reconstruyeron con la misma corrección. El resto de sprites
activos son el cable continuo `aire_cable_v3.webp`, `aire_foco_v2.webp`,
`aire_altavoz_v2.webp` y `partitura_v2.webp`. El cable de juego es un único
dibujo continuo de anclaje, cuerpo trenzado y terminal electrificado: su ancho
se calcula a partir de su altura y se invierte desde el suelo sin uniones ni
cambios de escala internos.

#### Batallas: modo supervivencia (extensión aditiva)

Las batallas se lanzan como minijuego: `{ "type": "minigame", "game": "battle" }`
(⚠️ NO existe la acción `type: "battle"` a secas — el engine la ignoraría en
silencio). Opciones nuevas de supervivencia; si no se usan, las batallas normales
funcionan EXACTAMENTE igual que antes:

```json
{
  "type": "minigame",
  "game": "battle",
  "enemy": "marea_fans",
  "party": ["samu", "edu"],
  "surviveTurns": 5,
  "surviveTurnsByDelay": { "0": 5, "1": 6, "2": 7 },
  "interludes": [{ "turn": 1, "speaker": "Goyo", "text": "¡Aguantad!" }],
  "victoryTitle": "¡Habéis aguantado!",
  "victoryText": "...",
  "defeatText": "...",
  "retryOnDefeat": true
}
```

| Opción                                        | Efecto                                                                                                                                                                                                                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `surviveTurns`                                | En vez de matar al enemigo, hay que **aguantar N turnos enemigos**; HUD "⏳ AGUANTAD N embestidas" → "🎤 ¡YA CANTA!"                                                                                                                                                                             |
| `party`                                       | Filtra qué aliados participan (ids de `ALLIES`)                                                                                                                                                                                                                                                  |
| `interludes`                                  | Burbujas de diálogo urgente que saltan al empezar el turno indicado                                                                                                                                                                                                                              |
| `victoryTitle` / `victoryText` / `defeatText` | Textos custom del panel final                                                                                                                                                                                                                                                                    |
| `retryOnDefeat`                               | El engine repite la batalla al perder (con texto `retryText`) en vez del Game Over normal                                                                                                                                                                                                        |
| `skillsOverride`                              | Mapa `{allyId: [habilidades]}` que SUSTITUYE el kit de ese aliado solo en esta batalla (mismo esquema de habilidad que en ALLIES). Para coherencia narrativa: en el cap. 3 las clases aún no han despertado y luchan con el entorno (valla de obra, acople, confeti) y con el vuelo/memes de Edu |
| `roleOverride`                                | Mapa `{allyId: "rol"}` que cambia el rol mostrado solo en esta batalla (p. ej. "Técnico improvisado")                                                                                                                                                                                            |

Enemigo de ejemplo: `marea_fans` (hp 9999 — imbatible a propósito, solo se puede
aguantar). Se usa en el cap. 3, «Escena 11b: La puerta».

#### Batallas: Ataque Kosai (extra opcional, jul 2026)

Casilla en **Configuración** que reparte a **todo el equipo** una habilidad
extra en los combates por turnos: deja al objetivo a **0 PV de un solo golpe**,
cuesta 0 PM y no falla ni se puede esquivar. Es un atajo para saltarse una
pelea, no forma parte del equilibrio del combate.

- Se guarda en localStorage como `illo_kosai` (`"1"` encendido, `"0"` apagado);
  por defecto está apagado.
- `battle-minigame.js` lee la clave al construir el combate, y además **entra o
  sale en caliente**: tocar la casilla en el menú de pausa con una pelea en
  marcha reparte o retira el golpe a todo el equipo y repinta la lista de
  habilidades al momento. Lo mueve `game.js` llamando a
  `window.BattleMinigame.setKosaiEnabled(bool)`, que llega al combate activo.
- El repintado se salta en dos situaciones, y ahí el cambio se ve al volver a la
  lista: **eligiendo objetivo u objeto** (manda el botón de cancelar y redibujar
  por debajo dejaría el combate a medias) y con la **lista vacía** entre turnos
  (`clearSkills`), donde repintar la sacaría antes de tiempo.
- La habilidad usa el tipo `execute`, que se resuelve **antes** de la tirada de
  acierto (por eso no se esquiva). Vale para cualquier objetivo, así que se
  puede reutilizar en habilidades de enemigos si algún día hace falta.
- No toca la constante `ALLIES`: se le da a cada luchador un array de
  habilidades nuevo, para que un combate no contamine al siguiente.

```js
// battle-minigame.js
const KOSAI = { id: "ataque_kosai", type: "execute", pmCost: 0, target: "enemy", unavoidable: true, ... };
window.BattleMinigame.KOSAI_SETTING_KEY;      // "illo_kosai" — lo usa game.js para pintar la casilla
window.BattleMinigame.setKosaiEnabled(true);  // reparte/retira el golpe en el combate en curso
```

#### Configuración: volúmenes (jul 2026)

El botón **Configuración** del menú abre un panel (estilo nm-modal) con dos
deslizadores persistentes en localStorage: `illo_vol_music` y `illo_vol_sfx`
(0..1). `engine.playSound` clasifica cada audio (bucle o id `menu*` → música;
resto → efectos) y multiplica su volumen por el factor correspondiente;
`engine.applyVolumeSettings()` reaplica en vivo a lo que esté sonando. Los
volúmenes que piden los capítulos (`volume`, `setVolume`) se conservan como
"base" y escalan por el ajuste del jugador.

Debajo de los deslizadores va la casilla del **Ataque Kosai** (ver arriba). Para
añadir más ajustes de sí/no se reutiliza el bloque `.nm-setting-toggle` +
`.nm-setting-hint` de `styles.css`.

La pestaña **Sonido** también permite activar o desactivar los **Blips de
texto**. Están activos por defecto y se guardan como `illo_text_blip` (`"1"` o
`"0"`); al apagarlos se conserva la velocidad y las pausas de puntuación, solo
se silencia el sonido que acompaña a cada letra.

---

## 🎯 Sistema de Elecciones

### Estructura Básica

```json
{
  "_line": 4,
  "character": "Luna",
  "text": "¿Qué prefieres?",
  "choices": [
    {
      "text": "Opción 1",
      "nextLine": 5
    },
    {
      "text": "Opción 2",
      "nextScene": 1
    }
  ]
}
```

### Elementos de una Opción

| Campo       | Tipo   | Descripción                           |
| ----------- | ------ | ------------------------------------- |
| `text`      | string | Texto del botón                       |
| `nextLine`  | número | Línea dentro de la misma escena       |
| `nextScene` | número | Escena diferente (reinicia línea a 0) |

### Ejemplo Completo

```json
{
  "_line": 10,
  "character": "Narrador",
  "text": "Llegas a un camino que se divide",
  "choices": [
    {
      "text": "Seguir el camino iluminado",
      "nextScene": 1
    },
    {
      "text": "Explorar la oscuridad",
      "nextScene": 2
    },
    {
      "text": "Volver atrás",
      "nextLine": 5
    }
  ]
}
```

---

## 📞 Sistema de Llamadas

Samu puede llamar a sus amigos (Edu, Tony, José), pero **solo puede completar
una llamada "real" por cada amigo que ha rescatado, más la primera del inicio**.
Es decir, tanto en el Capítulo 1 como al final de cada Capítulo 2 solo puede
llamar a UN amigo; el resto de intentos suenan como "fuera de cobertura" hasta
que rescate a alguien, momento en que se desbloquea una nueva llamada.

**Regla (motor, `canMakeRealCall`):** `completedCalls.length < rescued.length + 1`.

- `completedCalls`: amigos ya llamados con éxito (persiste entre capítulos).
- `rescued`: amigos rescatados (persiste entre capítulos).

### Escenas de llamada

Una escena de llamada real debe tener un título que contenga `"Llamada a <Nombre>"`
(p. ej. `"Escena: Llamada a Tony"`). El motor la registra automáticamente en
`completedCalls` al entrarse en ella.

Si el jugador elige una llamada pero ya gastó su cupo, el motor **redirige** la
opción a la escena `"Escena: Fuera de cobertura"` (o a `choice.offCoverageScene`
si se indica) y NO registra la llamada. Esa escena muestra el mensaje del
operador y ofrece continuar.

### Campos de opción relacionados

| Campo                           | Descripción                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `nextScene` con `"Llamada a X"` | Marca la opción como llamada; se redirige si no hay cupo                       |
| `offCoverageScene`              | Escena alternativa si no hay cupo (por defecto `"Escena: Fuera de cobertura"`) |
| `chapter2ByFirstCalled`         | Ruta dinámica a `chapter2-<primer llamado>` (usado en Cap. 1)                  |
| `chapter2ByLastCalled`          | Ruta dinámica a `chapter2-<último llamado>` (usado al final de cada Cap. 2)    |
| `chapter3ByFirst`               | Ruta dinámica a `chapter3-<primer rescatado>`                                  |
| `requireAllRescued`             | Oculta la opción hasta rescatar a los 3 amigos                                 |

### Flujo típico

1. **Capítulo 1:** Samu llama a un amigo (conversación real). El resto sale
   "fuera de cobertura". Va a rescatar al primero que llamó
   (`chapter2ByFirstCalled`).
2. **Fin de cada Capítulo 2:** tras el rescate se desbloquea una nueva llamada;
   Samu llama a UN amigo restante (el otro sale "fuera de cobertura") y va hacia
   él (`chapter2ByLastCalled`), o al desenlace si ya rescató a todos
   (`requireAllRescued` + `chapter3ByFirst`).

---

## 🎭 Sistema de Poses

### ¿Qué Son?

Las poses permiten que cada personaje muestre diferentes expresiones emocionales.

### Poses Disponibles

Cada personaje puede tener:

- **neutral** (por defecto)
- **happy** (feliz)
- **sad** (triste)
- **angry** (enojado)
- **surprised** (sorprendido)

### Definir Poses en el Personaje

```json
{
  "name": "Luna",
  "color": "#ff69b4",
  "poses": {
    "neutral": "assets/images/characters/luna.png",
    "happy": "assets/images/characters/luna_happy.png",
    "sad": "assets/images/characters/luna_sad.png",
    "angry": "assets/images/characters/luna_angry.png",
    "surprised": "assets/images/characters/luna_surprised.png"
  },
  "defaultPose": "neutral"
}
```

### Usar Poses en Capítulos

**Mostrar con pose:**

```json
{
  "type": "showCharacter",
  "character": "luna",
  "position": "left",
  "pose": "happy"
}
```

**Cambiar pose:**

```json
{
  "type": "setPose",
  "character": "luna",
  "position": "left",
  "pose": "sad"
}
```

### Ejemplo: Cambio Emocional

```json
{
  "_line": 2,
  "character": "Luna",
  "text": "Recibí malas noticias...",
  "actions": [
    {
      "type": "setPose",
      "character": "luna",
      "position": "left",
      "pose": "sad"
    }
  ]
}
```

---

## 🔊 Sistema de Sonidos

### Estructura de Carpetas

Coloca tus archivos de audio en `assets/audio/`:

```
assets/
├── sounds/
│   ├── music/
│   │   ├── ambient.mp3
│   │   └── boss_theme.mp3
│   ├── effects/
│   │   ├── sword.mp3
│   │   ├── bell.mp3
│   │   └── explosion.mp3
│   └── voices/
│       ├── greeting.mp3
│       └── farewell.mp3
```

### Formatos Soportados

Usa archivos de audio comunes:

- **MP3** - Mejor compatibilidad
- **OGG** - Buena compresión
- **WAV** - Calidad sin pérdidas
- **M4A** - Para Apple

### Acciones de Sonido

#### 1. Reproducir Sonido Simple

```json
{
  "type": "playSound",
  "value": "assets/audio/sfx/bell.mp3"
}
```

#### 2. Música de Fondo (En Bucle)

```json
{
  "type": "playSound",
  "path": "assets/audio/music/ambient.mp3",
  "volume": 0.5,
  "loop": true
}
```

#### 3. Efecto de Sonido (Volumen Alto)

```json
{
  "type": "playSound",
  "path": "assets/audio/sfx/sword.mp3",
  "volume": 1.0
}
```

#### 4. Sonido Silencioso (Whisper)

```json
{
  "type": "playSound",
  "path": "assets/audio/voices/whisper.mp3",
  "volume": 0.3
}
```

### Ejemplo Completo en Capítulo

```json
[
{
  "_line": 1,
  "character": "Narrador",
  "text": "Una mañana tranquila en el café...",
  "actions": [
    {
      "type": "setBackground",
      "value": "assets/images/backgrounds/shared/cafe.png"
    },
    {
      "type": "playSound",
      "path": "assets/audio/music/ambient.mp3",
      "volume": 0.4,
      "loop": true
    }
  ]
},
{
  "_line": 2,
  "character": "Luna",
  "text": "¡Ring! ¡El timbre de la puerta!",
  "actions": [
    {
      "type": "playSound",
      "path": "assets/audio/sfx/bell.mp3",
      "volume": 1.0
    }
  ]
}
]
```

### Parámetros de Sonido

| Parámetro        | Descripción                     | Rango     | Por Defecto |
| ---------------- | ------------------------------- | --------- | ----------- |
| `path` o `value` | Ruta del archivo de audio       | string    | requerido   |
| `volume`         | Volumen del sonido              | 0.0 - 1.0 | 1.0         |
| `loop`           | Repetir en bucle                | boolean   | false       |
| `autoPlay`       | Iniciar automáticamente         | boolean   | true        |
| `id`             | ID único para controlar después | string    | null        |
| `fadeIn`         | Fade in en milisegundos         | number    | 0           |

### Control Avanzado de Sonidos

#### Detener Sonido (con fade out opcional)

```json
{
  "type": "stopSound",
  "id": "music_background",
  "fadeOut": 1000
}
```

#### Parar Todos los Sonidos

```json
{
  "type": "stopAllSounds"
}
```

#### Pausar Sonido

```json
{
  "type": "pauseSound",
  "id": "effect_ambient"
}
```

#### Reanudar Sonido

```json
{
  "type": "resumeSound",
  "id": "effect_ambient"
}
```

#### Cambiar Volumen

```json
{
  "type": "setVolume",
  "id": "music_background",
  "volume": 0.3
}
```

### Ejemplo Completo: Control de Música

```json
[
{
  "_line": 1,
  "character": "Narrador",
  "text": "Una mañana tranquila...",
  "actions": [
    {
      "type": "playSound",
      "path": "assets/audio/music/ambient.mp3",
      "volume": 0.5,
      "loop": true,
      "fadeIn": 1000,
      "id": "music_background"
    }
  ]
},
{
  "_line": 2,
  "character": "Luna",
  "text": "¡Algo terrible sucede!",
  "actions": [
    {
      "type": "setVolume",
      "id": "music_background",
      "volume": 0.2
    },
    {
      "type": "playSound",
      "path": "assets/audio/sfx/alarm.mp3",
      "volume": 1.0
    }
  ]
},
{
  "_line": 3,
  "character": "Narrador",
  "text": "Luego todo vuelve a la normalidad...",
  "actions": [
    {
      "type": "setVolume",
      "id": "music_background",
      "volume": 0.5
    },
    {
      "type": "stopSound",
      "id": "music_background",
      "fadeOut": 2000
    }
  ]
}
]
```

### Consejos

✅ **Música de Fondo:** Usa `loop: true`, `id` para control, y `fadeIn/fadeOut` para transiciones suaves
✅ **Efectos:** Usa `volume: 0.8-1.0` para que se escuche bien
✅ **Transiciones:** Usa `fadeOut` cuando cambies de música (1000-2000ms)
✅ **IDs únicos:** Asigna `id` a música de fondo para poder controlarla después
✅ **Comprensión:** Los MP3 son más ligeros que WAV

---

## 🎭 Sistema visual heredado (identificadores técnicos P5)

### 1. Base visual y nombres CSS heredados

Esta sección describe la base visual de una etapa anterior. Clases como
`p5-style` y el nombre `p5-effects.js` se conservan para no romper el runtime,
pero la identidad activa es propia de Project AI.RI y no debe imitar nombres,
composición, personalidad ni dinámica de otras obras.

#### Colores Principales

- **Amarillo**: #ffcc00 (primario)
- **Rojo**: #ff1744 (secundario)
- **Negro**: #000000 (fondo)

#### Arranque de la aplicación

El primer acceso sigue una secuencia cerrada:

1. `index.html` muestra un disclaimer a pantalla completa y mantiene el menú
   invisible e inerte.
2. El usuario debe pulsar **Entrar con sonido**. Ese gesto desbloquea la
   reproducción multimedia exigida por los navegadores. Si el volumen musical
   persistido estaba exactamente al 0 %, el gesto lo restablece al 70 % y
   guarda el nuevo valor; un volumen distinto de cero se respeta sin cambios.
3. Se reproduce `assets/video/cutscenes/prologue/opening_samu.mp4` a pantalla completa, con su
   audio AAC y el volumen musical guardado en `illo_vol_music`.
4. El opening puede terminar naturalmente o cerrarse mediante
   **Saltar opening**.
5. Tras un fundido de 560 ms aparece el menú principal, comienza su vídeo en
   bucle y suena el tema habitual.

La superficie del opening ocupa el viewport completo tanto en navegador como en
Electron. Al mostrarla y cada vez que cambia el tamaño de la ventana, `game.js`
lee las dimensiones reales del overlay y las aplica al vídeo en píxeles
explícitos. Después fuerza su layout y lo mantiene invisible hasta dos
fotogramas de animación tras el evento `playing`. Así se evita tanto el antiguo
primer frame de `640×360` de Chromium/Electron como que el opening quede limitado
a `1280×720` en navegadores con una ventana mayor. Durante ese intervalo solo se
mantiene el fondo negro de carga.

El fondo del menú utiliza `assets/video/menu/menu_loop.mp4`, un bucle H.264
de 10 segundos, 48 FPS y `3840×2160`. Sus 240 fotogramas 4K originales se
mantienen íntegros y entre cada pareja se inserta un fotograma de movimiento
generado con RIFE, dando 480 frames finales. La interpolación incluye la pareja
formada por el último frame y el primero, por lo que el cierre del bucle también
es fluido y no se duplica ningún fotograma. No se recomponen capas ni se
sustituye el escenario: se conservan la geometría, el oleaje del mar, el
titileo de los neones, las siluetas móviles, la brisa dorada y todas las notas
en sus posiciones originales.

La reconstrucción 4K desde `workbench/sources/video/menu/menu_loop_old.mp4` es reproducible con
`scripts/render_menu_loop_4k.py` y `realesrgan-ncnn-vulkan`. La interpolación
cíclica posterior se ejecuta con `scripts/interpolate_menu_loop_48fps.py` y la
herramienta oficial `rife-ncnn-vulkan`, usando `rife-v4.6`, modo UHD y TTA
temporal. El antiguo `menu_loop_old.mp4` permanece intacto como fuente de
movimiento y referencia.

El opening final dura 80,704 segundos, está codificado en H.264 a 1920×1080 y
30 fps, y utiliza audio AAC estéreo a 48 kHz. El MP4 distribuible se copió desde
la carpeta fuente entregada por Samu; sus archivos de proyecto no forman parte
del runtime.

Si el MP4 no puede cargarse, el arranque no queda bloqueado: el mensaje de
estado informa del error y el botón **Saltar opening** permite llegar al menú.
El clic fuera del botón del disclaimer no inicia nada.

El selector **Capítulos** espera a que termine el descubrimiento asíncrono de
los JSON antes de dibujar la lista. La carga inicial y un clic temprano
comparten una única promesa, evitando listas vacías y cargas duplicadas. Mientras
espera, el botón muestra un estado de carga; al abrir el selector, el foco pasa
al primer capítulo y el menú queda oculto e inerte. Si no se encuentra ningún
capítulo, se muestra un mensaje recuperable y **Volver** permite reintentarlo.

#### Menú Principal

```
         ┌────────────────────────────┐
         │      VISUAL NOVEL          │
         │                            │
         │  [➙ COMENZAR           ]  │
         │  [➙ CAPÍTULOS          ]  │
         │  [➙ GALERÍA            ]  │
         │  [➙ CONFIGURACIÓN      ]  │
         └────────────────────────────┘
```

#### Cuadro de diálogo (clase técnica `p5-style`)

```
         ┌────────────────────────────┐
         │ NOMBRE ────────────────    │
         │ El diálogo aparece aquí    │
         │ Con múltiples líneas       │
         │           ▼                │
         └────────────────────────────┘
```

**Características:**

- Panel moderno con borde amarillo visible
- Fondo semi-transparente (0.95 alpha)
- Bordes inclinados (25px)
- Double box-shadow para efecto de brillo
- Header limpio con línea separadora

#### Menú de Elecciones

```
         [➙ OPCIÓN 1              ]
         [➙ OPCIÓN 2              ]
         [➙ OPCIÓN 3              ]
```

**Características:**

- Triángulo rojo (➙) aparece en hover
- Cambio a fondo amarillo en hover
- Movimiento suave hacia la derecha
- Entrada escalonada de opciones

### 2. Saltar/Acelerar Texto

**Característica:** Haz clic mientras el texto se está escribiendo para completar la línea al instante.

```
ANTES:
  📝 Texto escrito lentamente letra por letra
  ⏳ Esperas a que termine
  ✓ Haces clic para siguiente línea

DESPUÉS:
  📝 Texto escrito lentamente
  ⚡ Haces clic DURANTE la escritura (NUEVO)
  ✨ Texto se COMPLETA AL INSTANTE (NUEVO)
  ⏩ Continúas inmediatamente
```

**Implementación Técnica:**

```javascript
// En engine.js - displayDialog()
const skipHandler = () => {
  skipTyping = true;
  if (timeoutId) clearTimeout(timeoutId);
  dialogText.textContent = text; // Mostrar todo al instante
  document.removeEventListener("click", skipHandler);
  resolve();
};
```

**Uso:**

- Automático, sin configuración
- Click normal = siguiente línea
- Click durante typing = completar + siguiente línea

### 3. Introducción Cinematográfica de Capítulo

**Característica:** Cada capítulo nuevo muestra una animación de introducción de 2.5 segundos.

```
Timeline (2.5 segundos):
0.0s  → Pantalla negra aparece
0.2s  → Línea superior se expande
0.3s  → Título del capítulo aparece
0.4s  → Línea inferior se expande
2.0s  → Se muestra completo
2.5s  → Fade-out, juego continúa
```

**Visual:**

```
         ════════════════════════════
         CAPÍTULO 1: EL ENCUENTRO
         ════════════════════════════
```

**Requisito JSON:**
Cada capítulo debe tener un campo `title`:

```json
{
  "title": "Capítulo 1: El Encuentro",
  "scenes": [...]
}
```

**Capítulo final (`isFinal`):**
Un capítulo puede marcarse como final con `"isFinal": true`. Tras confirmar su
pantalla de fin, el juego vuelve al menú sin ofrecer un capítulo posterior. En
el recorrido actual sólo `chapter6.json` usa esa marca; las rutas anteriores
convergen dentro de la secuencia `chapter0`…`chapter6`.

```json
{
  "title": "Capítulo 6: La última elección",
  "isFinal": true,
  "scenes": [...]
}
```

**Personalización:**

```javascript
// En engine.js - playChapterIntro()
setTimeout(() => {
  chapterOverlay.classList.add("fade-out");
}, 2000); // Cambiar duración aquí
```

### 4. Efectos Visuales Avanzados

Se incluye una librería completa de efectos en `p5-effects.js` con 12+ métodos:

```javascript
// Ondas de choque
p5Effects.shockwave(x, y);

// Sistema de partículas
p5Effects.createParticles(x, y, count, color);

// Transición de escena
await p5Effects.transitionScene(600);

// Líneas de enfoque animadas
p5Effects.focusLines();

// Temblor de pantalla
p5Effects.shakeScreen(intensity, duration);

// Sonidos (si existen archivos)
p5Effects.playSound("select");
p5Effects.playSound("confirm");
```

**Acceso desde game.js:**

```javascript
// Después de una elección importante
p5Effects.shockwave(400, 300);
p5Effects.createParticles(400, 300, 12, "#ff1744");
```

### 5. Tamaños de Personaje Optimizados

**Cambio de Dimensiones:**

- Antes: 300x600px (pequeños)
- Después: **100vh (altura completa de pantalla)**

Los personajes ahora ocupan toda la altura de la pantalla para máximo impacto visual.

**Posiciones Disponibles:**

Hay tres posiciones válidas: `left`, `center` y `right`.

```json
[
{
  "type": "showCharacter",
  "character": "3c",
  "position": "left",
  "pose": "neutral"
},
{
  "type": "showCharacter",
  "character": "nexo",
  "position": "right",
  "pose": "neutral"
}
]
```

**Uso en Capítulos:**

```json
[
{
  "type": "showCharacter",
  "character": "3c",
  "position": "left"
},
{
  "type": "showCharacter",
  "character": "nexo",
  "position": "right"
},
{
  "type": "showCharacter",
  "character": "elion_husk",
  "position": "center"
}
]
```

**Nota:** el motor redistribuye automáticamente los huecos activos sin reducir
la escala base de los sprites. 3C es la narradora y Nexo su auxiliar de
continuidad; ePod no forma parte del canon activo.

### 6. Pantalla de Fin de Capítulo

El último diálogo espera su clic normal y después aparece una pantalla
cinematográfica con el título del capítulo y **Continuar**.

```
         ════════════════════════════
         FIN DEL CAPÍTULO
         Capítulo 1: El Encuentro
         ════════════════════════════

            [  CONTINUAR  ]
```

**Flujo actual:**

1. El jugador confirma la última línea.
2. `showChapterEnd()` presenta **Fin del capítulo** y espera **Continuar**.
3. El escenario visual y el cursor del capítulo se limpian.
4. Si existe capítulo siguiente, se elige entre **Siguiente capítulo** y
   **Menú principal**. Si `isFinal` es `true`, se vuelve al menú.
5. Al encadenar capítulos se conservan inventario, rescates, llamadas y presión
   de la sesión; **Comenzar** y **Capítulos** sí crean continuidad limpia.

Esto no equivale a guardar en disco. Cerrar o recargar elimina el punto de la
historia aunque los ajustes de usuario sí persistan.

**Requisito JSON:**
El capítulo debe tener un campo `title`:

```json
{
  "title": "Capítulo 1: El Encuentro",
  "scenes": [...]
}
```

**Personalización:**

```css
/* En styles.css */
.chapter-end-title {
  font-size: 48px; /* Tamaño del título */
  color: #ffcc00; /* Color */
}
```

### 7. Enfoque Dinámico del Personaje que Habla

**Característica:** Cuando un personaje habla, brilla con un efecto de glow amarillo animado para diferenciarlo del otro.

```
Personaje A (hablando):         Personaje B (escuchando):
  ✨ BRILLA                     Atenuado (sin glow)
  Efecto amarillo               Opacidad normal
  Animación continua            Estático
```

**Visual:**

```
El personaje que habla recibe un efecto de glow que pulsa suavemente:
- Drop-shadow amarillo (#ffcc00)
- Anima entre 20px y 30px de radio
- Ciclo de 0.6 segundos
```

**Funcionamiento Automático:**

1. Se muestra un diálogo
2. El engine busca qué personaje está hablando
3. Aplica automáticamente la clase `.speaking` a ese personaje
4. El otro personaje pierde el enfoque
5. Cuando cambia de personaje, el glow se mueve

**Cómo Funciona Internamente:**

En engine.js, el método `displayDialog()` detecta automáticamente:

- El nombre del personaje en `line.character`
- Su posición (left o right)
- Aplica `focusCharacter()` para añadir la clase `.speaking`
- Llama `unfocusCharacter()` en el otro

**Personalización:**

Para cambiar el color del glow, en `styles.css`:

```css
@keyframes speaking-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 20px rgba(255, 204, 0, 0.8)); /* Cambiar #ffcc00 */
  }
  50% {
    filter: drop-shadow(0 0 30px rgba(255, 204, 0, 1));
  }
}
```

Para cambiar la velocidad (más rápido/lento):

```css
.character.speaking {
  animation: speaking-glow 0.6s ease-in-out infinite; /* Cambiar 0.6s */
}
```

### 8. Carga Automática de Personajes

Se cargan todos los personajes disponibles al inicio:

```javascript
// En game.js - loadAllCharacters() (lista abreviada)
const characters = ["3c", "nexo", "samu", "edu", "tony", "jose", "airi", "elion_husk"];
for (const character of characters) {
  await engine.loadCharacter(character);
}
```

**Para agregar nuevo personaje:**

1. Crea `characters/nuevo.json`
2. Agrega imagen: `assets/images/characters/nuevo.png`
3. Agrega a array en game.js

---

## 🎨 Personalización

### Texto no seleccionable (jul 2026)

`html, body` llevan `user-select: none` en `styles.css`. El juego se avanza a
base de clics y sin eso un doble clic —o clicar y arrastrar sin querer— dejaba
el diálogo resaltado en azul. Como la propiedad se hereda, cubre todo:
diálogos, menús, minijuegos y overlays.

Justo debajo hay una excepción para `input, textarea`, que vuelven a
`user-select: text` para no romper los campos de escritura (panel de debug).
**Si añades algún elemento donde el jugador deba poder seleccionar o copiar
texto, hay que devolverle `user-select: text` igual que a los inputs.**

### Selector de capítulos: barra de scroll propia (jul 2026)

**Quien desplaza es la lista, no el panel.** Así el título "Seleccionar
Capítulo" y el botón "Volver" se quedan fijos y solo se mueven los capítulos.
El montaje:

| Elemento                   | Papel                                                             |
| -------------------------- | ----------------------------------------------------------------- |
| `.chapter-selector-panel`  | `display: flex; flex-direction: column; overflow: hidden;` + `max-height: 92%` |
| `.chapter-selector-list`   | `overflow-y: auto; overflow-x: hidden; min-height: 0;` — la parte que se desplaza. `padding: 0 14px` separa los botones de la barra: al pasar el ratón el capítulo se desplaza 6 px a la derecha y se le echaba encima (queda en 8 px con hover) |
| `.chapter-selector-back`   | `align-self: center` (en columna flex se estiraría a todo el ancho) |

La barra es propia: pulgar dorado con degradado y carril tenue. Solo aparece
cuando los capítulos no caben; con 7 no se veía, y **cada capítulo nuevo ocupa
unos 60 px**.

⚠️ Tres trampas si se tocan estas reglas:

1. `min-height: 0` en la lista es lo que le permite encoger dentro del flex. Sin
   eso el panel crece y el scroll no se activa nunca.
2. `flex-shrink: 0` en `.chapter-select-btn`: la lista también es flex en
   columna, así que sin esto los botones se **aplastan** (33 px en vez de 48)
   para caber, en vez de desbordar y activar el scroll.
3. En Chromium, poner `scrollbar-width` o `scrollbar-color` en la lista
   **anula** todas las reglas `::-webkit-scrollbar-*`. Por eso las propiedades
   estándar están aisladas en un `@supports not selector(::-webkit-scrollbar)`,
   que solo aplica en Firefox.

Para reutilizar la barra en otro panel se copian los cuatro selectores
`::-webkit-scrollbar`, `-track`, `-thumb` y `-thumb:hover`.

### Cambiar colores de las clases visuales heredadas

Los colores principales conservados por las clases `p5-*` son:

```css
:root {
/* Color Amarillo Primario */
--color-primary: #ffcc00;

/* Color Rojo Secundario */
--color-secondary: #ff1744;

/* Color Fondo */
--color-dark: #000000;
}
```

**Para cambiar el color amarillo a otro:**
En `styles.css`, busca y reemplaza `#ffcc00` globalmente:

```bash
Buscar:  #ffcc00
Reemplazar por: #tu-color-aqui
```

**Para cambiar el rojo:**

```bash
Buscar:  #ff1744
Reemplazar por: #tu-color-aqui
```

**Elementos afectados:**

- Bordes de menú y diálogos
- Nombre del personaje
- Indicador de continuar (▼)
- Triángulos de opciones (▶)
- Sombras de texto
- Todas las líneas decorativas

### Velocidad de Texto

En `engine.js`, modifica:

```javascript
this.typingSpeed = 50; // Milisegundos por carácter
// Más rápido: 20
// Normal: 50 (por defecto)
// Más lento: 100
```

**Nota:** Los usuarios pueden saltarse el texto completo haciendo clic durante el typing, así que esta velocidad solo afecta a quienes esperen el efecto completo.

### Tamaño de Personajes

En `styles.css`, los personajes ahora ocupan toda la altura:

```css
.character {
    height: 100vh;  /* Altura completa de pantalla */
    width: auto;    /* Ancho automático según proporción */
}
```

**Tamaños actuales:**

- Altura: 100vh (altura completa de ventana)
- Ancho: automático (mantiene proporción)
- Posición: left (0) o right (0)

**Posiciones disponibles:**

| Posición | CSS                        | Uso                 |
| -------- | -------------------------- | ------------------- |
| `left`   | Esquina inferior izquierda | Personaje izquierdo |
| `right`  | Esquina inferior derecha   | Personaje derecho   |
| `center` | Centro inferior            | Personaje solo      |

**Ejemplo en JSON:**

```json
{
  "type": "showCharacter",
  "character": "luna",
  "position": "center"
}
```

### Tamaño de Fondos

Los fondos se ajustan automáticamente al viewport, pero si quieres cambiar las dimensiones esperadas:

```css
.background {
    background-size: cover;  /* Cubre toda la pantalla */
    background-position: center;
}
```

---

## 🆘 Troubleshooting

### Error: "Error cargando capítulo"

**Causas:**

1. El archivo no existe en `chapters/`
2. JSON inválido
3. Nombre incorrecto en `game.js`

**Solución:**

1. Verifica que el archivo existe y tiene el nombre correcto
2. Valida el JSON en [jsonlint.com](https://jsonlint.com)
3. Asegúrate de usar minúsculas en `game.js`

### Los personajes no aparecen

**Causas:**

1. El archivo del personaje no existe
2. La imagen no existe
3. El nombre no coincide exactamente

**Solución:**

```
1. Verifica: characters/luna.json existe
2. Verifica: assets/images/characters/luna.png existe
3. En JSON: "character": "luna" (minúscula)
```

### Los fondos no cambian

**Causas:**

1. Ruta incorrecta
2. Imagen no existe
3. JSON mal formado

**Solución:**

```
❌ "value": "backgrounds/cafe.png"
✅ "value": "assets/images/backgrounds/shared/cafe.png"
```

### Las elecciones no funcionan

**Causas:**

1. `nextLine` o `nextScene` incorrecto
2. Línea/escena no existe
3. JSON inválido (falta coma)

**Solución:**

```javascript
// En DevTools:
engine.currentScene; // Escena actual
engine.currentLine; // Línea actual
```

### El juego se congela

**Causas:**

1. Loop infinito en elecciones
2. Acción `wait` muy larga
3. Error en el código

**Solución:**

1. Abre DevTools (F12)
2. Revisa la consola para errores
3. Verifica que no hay `nextLine` circular

### Página en blanco

**Causa:** No estás usando servidor local

**Solución:**

```bash
python -m http.server 8000
# Abre: http://localhost:8000
```

### Los personajes aparecen muy pequeños

**Causa:** Estilos CSS no actualizados

**Solución:**

1. Limpia caché: Ctrl + Shift + Delete
2. Recarga con hard-refresh: Ctrl + Shift + R
3. Verifica que `styles.css` tiene:

```css
.character {
  height: 700px;
  width: 400px;
}
```

### La animación de capítulo no aparece

**Causa:** El capítulo no tiene un campo `title`

**Solución:**

```json
{
  "title": "Capítulo 1: Mi Título",  // ← Requerido
  "scenes": [...]
}
```

### Los colores P5 no se ven

**Causa:** Caché del navegador

**Solución:**

1. Hard-refresh: Ctrl + Shift + R
2. Abre DevTools (F12)
3. Ve a Network
4. Marca "Disable cache"
5. Recarga la página

### El cuadro de diálogo no tiene borde amarillo

**Causa:** CSS no cargado o conflicto

**Solución:**

1. Verifica que `.dialog-box.p5-style` tenga:

```css
.dialog-box.p5-style {
    border: 3px solid #ffcc00;
}
```

2. No hay CSS sobrescrito después
3. Hard-refresh: Ctrl + Shift + R

---

## 🔧 Funciones Avanzadas

### Variables del Juego

```json
{
  "type": "setVariable",
  "variable": "luna_relationship",
  "value": 10
}
```

Accede en DevTools:

```javascript
engine.gameState.luna_relationship; // 10
```

### Estado de guardado actual

No hay autoguardado narrativo ni una clave `gameState` activa en
`localStorage`. `saveGame()` existe como infraestructura sin llamadas y el
botón **Capítulos** abre un selector con estado limpio. Sólo se conservan los
ajustes de audio, pantalla y ayudas. Si se conecta el guardado en el futuro,
habrá que definir versión/migración, punto seguro, restauración de audio y
minijuegos, interfaz de carga y pruebas antes de anunciarlo al jugador.

### Múltiples Escenas

Los capítulos pueden tener múltiples escenas:

```json
{
  "title": "Capítulo 1",
  "scenes": [
    { "title": "Escena 1", "lines": [...] },
    { "title": "Escena 2", "lines": [...] },
    { "title": "Escena 3", "lines": [...] }
  ]
}
```

Para saltar a otra escena, usa `nextScene`:

```json
{
  "text": "Ir al siguiente lugar",
  "nextScene": "Escena 2"
}
```

Usa títulos únicos: es el formato que valida el contenido actual y mantiene los
saltos legibles al reordenar escenas.

### Narrador Especial

El narrador es un personaje sin sprite:

```json
{
  "character": "Narrador",
  "text": "Descripción de la escena..."
}
```

No necesita ser mostrado con `showCharacter`.

### Numeración de Líneas

Cada línea puede tener un número `_line` para referencia:

```json
[
{
  "_line": 0,
  "character": "Luna",
  "text": "Primera línea"
},
{
  "_line": 1,
  "character": "Luna",
  "text": "Segunda línea"
}
]
```

Los números se reinician por escena y facilitan debugging.

---

## 🛠️ API de Engine

```javascript
// Cargar recursos
engine.loadChapter(name); // Carga un capítulo
engine.loadCharacter(name); // Carga un personaje

// Información actual
engine.currentScene; // Escena actual (número)
engine.currentLine; // Línea actual (número)
engine.gameState; // Variables del juego

// Control manual
engine.setBackground(path); // Cambiar fondo
engine.showCharacter(name, pos, pose); // Mostrar personaje
engine.hideCharacter(name); // Ocultar personaje
engine.setPose(name, pos, pose); // Cambiar pose
engine.playSound(path); // Reproducir audio

// Estado
engine.isWaitingForInput; // Esperando click
engine.history; // Historial de opciones
```

---

## 📊 Ejemplo Completo

### Character: `characters/luna.json`

```json
{
  "name": "Luna",
  "color": "#ff69b4",
  "poses": {
    "neutral": "assets/images/characters/luna.png",
    "happy": "assets/images/characters/luna_happy.png",
    "sad": "assets/images/characters/luna_sad.png"
  },
  "defaultPose": "neutral"
}
```

### Chapter: `chapters/chapter1.json`

```json
{
  "title": "Capítulo 1: El Encuentro",
  "scenes": [
    {
      "title": "Escena 1: El Café",
      "lines": [
        {
          "_line": 0,
          "character": "Narrador",
          "text": "Una tarde en el café...",
          "actions": [
            {
              "type": "setBackground",
              "value": "assets/images/backgrounds/shared/cafe.png"
            }
          ]
        },
        {
          "_line": 1,
          "character": "Luna",
          "text": "¡Hola! ¿Cómo estás?",
          "actions": [
            {
              "type": "showCharacter",
              "character": "luna",
              "position": "left",
              "pose": "happy"
            }
          ]
        },
        {
          "_line": 2,
          "character": "Luna",
          "text": "¿Qué prefieres hacer?",
          "choices": [
            {
              "text": "Hablar de la vida",
              "nextLine": 3
            },
            {
              "text": "Ir a otro lugar",
              "nextScene": 1
            }
          ]
        }
      ]
    }
  ]
}
```

### Game: `game.js`

```javascript
async function startNewGame() {
  mainMenu.classList.add("hidden");
  isGameRunning = true;

  await engine.loadChapter("chapter1");
  await engine.loadCharacter("luna");

  await playGame();
}
```

---

## 🔄 Reset y continuidad de sesión

`engine.reset()` limpia el escenario, audio, diálogo, cursores e historial
visual para que no queden elementos de la ejecución anterior. `endGame()`
captura antes los datos de continuidad y la ruta siguiente, muestra la pantalla
de fin, hace el reset visual y decide entre encadenar capítulo o volver al menú.

Hay tres casos distintos:

| Entrada | Resultado |
| --- | --- |
| **Siguiente capítulo** | Conserva inventario, rescates, llamadas completadas y presión narrativa durante la sesión. |
| **Comenzar** o **Capítulos** | Inicia con continuidad narrativa limpia. |
| Cerrar o recargar | No existe restauración del punto narrativo; sólo persisten ajustes. |

No añadas persistencia ad hoc escribiendo `engine.gameState` directamente en
`localStorage`: el estado real incluye inventario, rescates, llamadas, presión,
escena, visuales, audio y versiones de esquema. Un guardado futuro necesita una
API versionada, migraciones y restauración transaccional de todos esos campos.

---

## 🎬 Sistema de Capítulos Múltiples

### ¿Cómo Funciona?

El juego descubre capítulos numéricos contiguos y los encadena durante la misma
sesión. El primer 404 detiene el descubrimiento, por lo que no puede haber
huecos en la numeración.

```
chapter0 → chapter1 → chapter2 → chapter3 → chapter4 → chapter5 → chapter6
 prólogo                                                 capítulo final
```

### Crear Nuevos Capítulos

1. **Crea el archivo JSON:**

`chapters/chapter7.json` sería el siguiente ID disponible.

2. **Estructura básica:**

```json
{
  "title": "Capítulo 7: Título",
  "scenes": [
    {
      "title": "Escena 1",
      "lines": [
        {
          "_line": 0,
          "character": "3C",
          "text": "Continuamos nuestra aventura..."
        }
      ]
    }
  ]
}
```

3. Ejecuta `npm run validate:content` y comprueba selector, capítulo anterior,
   pantalla final y entrada directa desde **Capítulos**.

### Estructura de Archivos

```
chapters/
├── chapter0.json       ← Prólogo
├── chapter1.json
├── …
└── chapter6.json       ← Final actual (`isFinal: true`)
```

### Flujo de Progresión

```
1. **Comenzar** limpia continuidad y carga `chapter0`.
2. Una acción `setNextChapter` puede fijar el siguiente destino; si no existe,
   se usa el número consecutivo.
3. Tras la pantalla de fin, **Siguiente capítulo** encadena ese destino o
   **Menú principal** abandona la sesión.
4. `chapter6` está marcado como final y regresa al menú tras su pantalla de fin.
```

### Pantalla de Continuación

Cuando terminas un capítulo, aparece:

```
         ¿CONTINUAR?

    [Siguiente Capítulo] [Menú Principal]
```

El jugador elige si desea:

- **Siguiente Capítulo:** Carga automáticamente el próximo
- **Menú Principal:** vuelve al menú. **Capítulos** no restaura decisiones ni
  estado de la sesión abandonada.

### Persisten Variables Entre Capítulos

Durante **Siguiente capítulo** se conservan inventario, rescates, llamadas y
presión narrativa. `gameState` y el escenario se reinician según el contrato de
`reset()`. No hay persistencia narrativa entre procesos: no añadas una solución
parcial en `localStorage`; consulta [Estado, continuidad y navegación](#estado-continuidad-y-navegación).

### Estructura de Capítulos Actual

**chapter0.json - Prólogo:**

- Introducción a Furrielva
- Presentación de 3C como narradora y de Nexo como auxiliar de continuidad
- Primera huella del quinto integrante ausente en los recuerdos del grupo

**chapter1.json - Capítulo 1: Un furro se levanta:**

- Samu descubre su transformación y llama a Edu
- La interferencia telefónica siembra por primera vez al husky del alfiler rojo
- La historia encadena con la búsqueda de Kingdom Ketchup

**chapter2.json - Capítulo 2: Kingdom Ketchup:**

- Samu investiga Furrielva con Furry Maps y localiza la fábrica
- Elige ruta entre las parodias ficticias El Jarrón, Noche o Mercaguasa
- Los tres fondos conservan raíces de nombre heredadas (`jamon`, `dia` y
  `mercadona`), pero el runtime actual usa sus variantes 4K en WebP y muestra
  marcas completamente ficticias.
  Comparten el acabado anime cinematográfico, la luz cálida de las 16:00 y la
  dirección artística de `workbench/sources/cutscenes/chapter3/opening_samu/storyboard/`.
- Batalla contra Micaela Michis (minigame gatos)
- Micaela presenta la persecución y cierra la ruta con un mitin político absurdo
  a favor de los gatos: cajas de cartón por decreto, atún subvencionado,
  vivienda protegida en sofás y un Ministerio del Ovillo.
- Los secundarios Micaela Michis y Neit usan retratos cartoon con contorno limpio,
  color plano y sombreado cel, alineados con el estilo de los protagonistas. Sus
  recursos están en `assets/images/characters/others/micaela*.webp` y
  `assets/images/characters/others/neit.webp`.
- Recolección cronometrada de guindillas y bullet hell contra Zip
- Rescate de Edu y descubrimiento de una corrupción impuesta desde fuera

**chapter3.json - Capítulo 3: Ecchi Land:**

- Viaje con Santi, asalto brainrot y concierto de Seraphyna
- Primera imagen inequívoca de Elion controlando a los brainrot
- Sacrificio de Goyo, nota raíz y entrega del Diapasón de Plata

**chapter4.json - Capítulo 4: Ciudad Paloma:**

- Reencuentro con José/Piyón y despertar de las cuatro clases
- Incursión brainrot y acceso cooperativo al santuario

**chapter5.json - Capítulo 5: Airi:**

- Despertar de AI.RI y revelación gradual de sus límites biológicos y meméticos
- Corrupción en Amalgama y batalla en la que el Diapasón devuelve agencia a AI.RI

**chapter6.json - Capítulo 6: La última elección:**

- Consecuencias de cerrar o sostener el mundo memético
- Elección final formulada por AI.RI y dos desenlaces; el paquete de audio incluye
  una reprise luminosa y otra incierta para diferenciarlos

### Ejemplo Práctico: Estructura de Capítulo

**chapter0.json - Prólogo (1-2 minutos):**

```json
{
  "title": "Prólogo: El Principio",
  "scenes": [
    {
      "title": "Introducción",
      "lines": [
        {
          "_line": 0,
          "character": "Narrador",
          "text": "Hace mucho tiempo..."
        }
      ]
    }
  ]
}
```

**chapter1.json - Acto 1 (5-10 minutos):**

```json
{
  "title": "Capítulo 1: El Encuentro",
  "scenes": [{
    "title": "La Historia Comienza",
    "lines": [...]
  }]
}
```

**chapter2.json - Acto 2 (5-10 minutos):**

```json
{
  "title": "Capítulo 2: El Viaje",
  "scenes": [{
    "title": "El Camino",
    "lines": [...]
  }]
}
```

### Orden de Carga Automática

El sistema carga capítulos en orden numérico:

```
- chapter0, chapter1, chapter2, ... chapter99
- Se detiene cuando no encuentra el siguiente
- Muestra "Fin del Juego" al llegar al final
```

### Tips

✅ **Cada capítulo debe ser independiente** - Puedes jugar chapter1 sin chapter0
✅ **Nomenclatura clara** - Usa chapter0, chapter1, etc. (no chapter_1 o capitulo1)
✅ **Títulos descriptivos** - Cada capítulo debe tener un título único
✅ **Progresión clara** - Los jugadores entienden que hay más contenido después
✅ **Guardado automático** - Los jugadores pueden recargar desde "Cargar" en el menú

---

## 📋 Checklist de Proyecto

### Antes de comenzar

- [ ] Servidor local corriendo (`python -m http.server 8000`)
- [ ] `index.html` abierto en navegador
- [ ] DevTools disponible (F12)

### Creando contenido

- [ ] Personajes en `characters/` con JSON válido
- [ ] Capítulos en `chapters/` con JSON válido
- [ ] Imágenes en `assets/` en PNG
- [ ] Fondos en `assets/images/backgrounds/` (1920x1080)
- [ ] Personajes en `assets/images/characters/` (300x600)
- [ ] `game.js` carga los recursos correctos

### Testing

- [ ] El capítulo carga sin errores
- [ ] Los fondos aparecen
- [ ] Los personajes aparecen
- [ ] Los diálogos se escriben correctamente
- [ ] Un click avanza una línea
- [ ] Las elecciones funcionan
- [ ] No hay errores en consola (F12)

---

## 🎓 Recursos Útiles

### Validadores

- **JSON:** [jsonlint.com](https://jsonlint.com)
- **Colores:** [htmlcolorcodes.com](https://www.htmlcolorcodes.com)

### Herramientas

- **Redimensionar imágenes:** [picresize.com](https://picresize.com)
- **Generador de colores:** [coolors.co](https://coolors.co)

### Servidores Locales

- **Python:** `python -m http.server 8000`
- **Node.js:** `npx http-server -p 8000`
- **PHP:** `php -S localhost:8000`

---

## 💡 Tips de Desarrollo

1. **Siempre valida JSON** antes de cargar (usa jsonlint.com)
2. **Usa minúsculas** en nombres de archivos
3. **Sin espacios** en rutas (usa guiones: `dark-forest`)
4. **Abre DevTools** frecuentemente (F12)
5. **Guarda con frecuencia** (hay guardado automático)
6. **Prueba cada capítulo** antes de continuar
7. **Usa números de línea** para debugging
8. **Documenta tus cambios** en comentarios JSON

---

## 🐛 Debugging

### Errores Comunes en Console (F12)

| Error                  | Causa              | Solución         |
| ---------------------- | ------------------ | ---------------- |
| `Failed to fetch`      | Archivo no existe  | Verifica rutas   |
| `JSON.parse error`     | JSON inválido      | Usa jsonlint.com |
| `Cannot read property` | Recurso no cargado | Verifica game.js |
| `Uncaught TypeError`   | Error en código    | Revisa engine.js |

### Monitorear Estado

```javascript
// En Console (F12):
console.log(engine.currentScene); // Escena actual
console.log(engine.currentLine); // Línea actual
console.log(engine.gameState); // Todas las variables
console.log(engine.history); // Opciones seleccionadas
```

---

## 🚀 Workflow de Pull Requests

El repositorio incluye una guía para preparar Pull Requests en:

`.github/PR_WORKFLOW.md`

También existe una plantilla automática para GitHub en:

`.github/PULL_REQUEST_TEMPLATE.md`

Cuando se pida preparar o crear una PR usando el workflow, se debe generar una descripción separada por bloques:

### 🎯 Objetivos

- Qué problema resuelve la PR.
- Qué comportamiento se quiere conseguir.
- Qué parte del juego, capítulo, minijuego o interfaz se ha tocado.

### 🛠️ Cambios

- Rama actual.
- Commit o commits relevantes.
- Archivos modificados.
- Resumen funcional de las modificaciones.

Comandos útiles:

```bash
git branch --show-current
git log --oneline origin/master..HEAD
git status --short
git diff --stat origin/master...HEAD
git diff --name-only origin/master...HEAD
```

### 🧪 Cómo Probar

- Validaciones técnicas necesarias.
- Pruebas manuales en `index.html` o `minijuegos_test.html`.
- Comportamiento esperado tras los cambios.

Ejemplos habituales:

```bash
node --check archivo.js
node -e "JSON.parse(require('fs').readFileSync('chapters/chapterX.json','utf8')); console.log('chapterX OK')"
```

### 🚀 Publicar PR

Para publicar la PR, primero se debe hacer push de la rama actual y después crear la Pull Request con GitHub CLI:

```bash
git push -u origin HEAD
gh pr create --base master --head "$(git branch --show-current)" --title "TITULO_DE_LA_PR" --body-file /tmp/pr-body.md
```

El comando `gh pr create` devuelve la URL de la Pull Request. Tras crearla, se debe devolver ese enlace para poder visualizarla.

Formato de respuesta esperado:

```md
PR creada:

https://github.com/OWNER/REPO/pull/NUMERO
```

---

## 📝 Licencia

Este proyecto está disponible para uso educativo y comercial.

---

## 🖥️ App de Escritorio (Electron)

El menú principal incluye la opción **Salir** al ejecutarse dentro de Electron.
Esta usa un canal IPC restringido para cerrar la aplicación; no se muestra al
abrir el juego en un navegador, donde una página no puede cerrar con fiabilidad
la pestaña del usuario.

Al arrancar desde Electron, el tema del menú se reproduce automáticamente. En
navegador, la reproducción comienza tras la primera interacción por las
restricciones de autoplay del propio navegador. Por eso el botón **♪** de abajo
a la derecha del menú (`#menu-theme-btn`, que rearranca el tema) solo sale en
web: en la app no hay nada que desbloquear. Es la regla simétrica a la de
**Salir**, que solo sale en Electron.

El juego se puede ejecutar como aplicación de escritorio de Windows sin cambiar
nada del motor: sigue siendo el mismo `index.html` con `engine.js` y `game.js`.

### Ajustes persistentes

En el navegador, las opciones de **Configuración** viven en el `localStorage`
del origen y se conservan solas. En la app de escritorio no: el servidor interno
escucha en un puerto libre **distinto en cada arranque**, así que el origen
cambia (`http://127.0.0.1:61096` hoy, otro mañana) y el `localStorage` empieza
vacío. Sin más, los ajustes se perdían al cerrar la aplicación.

La solución guarda los mismos valores fuera del origen, en la carpeta de datos
de la app:

```
%APPDATA%\Transfurmados\settings.json
{"illo_vol_music":"0.55","illo_vol_sfx":"0.42","illo_kosai":"1","illo_window_mode":"window"}
```

El recorrido completo:

| Paso | Dónde | Qué hace |
|------|-------|----------|
| Guardar | `game.js` → `saveSetting()` | Escribe en `localStorage` **y** manda el valor por IPC (`settings:set`). En navegador `window.desktopApp` no existe y solo hace lo primero. |
| Almacenar | `electron/main.js` | Valida la clave contra una lista cerrada y reescribe `settings.json`. |
| Restaurar | `electron/preload.js` | Pide los ajustes con `sendSync('settings:get-sync')` y los devuelve al `localStorage`. |

La restauración va en el **preload** y es síncrona a propósito: el preload corre
antes que los scripts de la página, así que `engine.js` (`volFactor`),
`battle-minigame.js` (`kosaiEnabled`) y el propio panel de Configuración se
encuentran el `localStorage` ya puesto y no necesitan esperar a ninguna promesa.

La lista de claves de `SETTINGS_KEYS` es cerrada a propósito: el renderizador
solo puede escribir esos cuatro ajustes, no usar el archivo como almacén libre.

### Configuración por pestañas

Desde el menú principal, **Configuración** se abre igual que **Capítulos**: a
pantalla completa, con el fondo difuminado y el menú retirado, no como una
cajita encima. Por eso reutiliza las clases `chapter-selector*`; lo propio suyo
(ancho, sin lista que desplazar) va en `.settings-selector-panel`. En el menú de
**pausa** (Esc) los mismos ajustes siguen dentro del `nm-modal` de siempre.

Los dos comparten `settingsMarkup()` / `wireSettings()` de `game.js`, repartido
en tres pestañas:

| Pestaña | Contiene | Dónde sale |
|---------|----------|------------|
| 🖥️ Vídeo | Modo de ventana: Pantalla completa / Ventana | **Solo en la app de escritorio** |
| 🔊 Sonido | Volumen de música y de efectos | Siempre |
| ⚔️ Trucos | Ataque Kosai | Siempre |

La pestaña de Vídeo se cae entera en el navegador (ahí manda F11 del propio
navegador), así que la pestaña activa por defecto no es siempre la misma: la
decide `settingsMarkup()` según los grupos que existan, no el HTML.

### Modo de ventana

`illo_window_mode` es el único ajuste que, además de guardarse, hace algo en el
proceso principal:

- Al **arrancar**, `createWindow()` abre con `fullscreen: windowMode() === 'fullscreen'`
  (por defecto, pantalla completa). El `width`/`height` calculados son el tamaño
  al que queda la ventana al salir de pantalla completa.
- Al **cambiarlo** desde el panel, `settings:set` lo guarda y aplica
  `mainWindow.setFullScreen(...)`.
- La ventana es la **fuente de la verdad**: sus eventos `enter-full-screen` y
  `leave-full-screen` anotan el modo y avisan al juego por `settings:changed`,
  de modo que un cambio con **F11** o con el botón del marco también se guarda y
  repinta los botones si el panel está abierto.

Se eligen con un par de botones excluyentes (`.nm-segmented`), no con un
`<select>`: la lista que despliega un `select` la dibuja el sistema, sale clara
sobre el panel oscuro y no hay CSS que la alcance (`color-scheme: dark` no basta
en Windows). Cualquier ajuste futuro de varias opciones debería usar lo mismo.

> **Nota:** la partida guardada (`gameState`) sigue en `localStorage` y **no**
> sobrevive al reinicio en la app de escritorio, por el mismo motivo del puerto.
> Hoy no se nota porque el menú no ofrece "Cargar partida", pero si se añade
> habrá que llevarla también a `settings.json` o a un archivo propio.

### Ejecutar

```bash
npm install
npm start
```

### Empaquetar

Dos comandos, dos resultados distintos. Todo va a parar a `dist/`, que está en
el `.gitignore`.

**`npm run dist:dir`** (`electron-builder --win --dir`) — solo empaqueta, sin
instalador:

```
dist/
├── win-unpacked/          ← la app lista para ejecutar (1.556 MB)
│   ├── Transfurmados.exe        ← se lanza desde aquí (216 MB)
│   ├── *.dll, *.pak, *.bin      ← runtime de Chromium/Electron
│   ├── LICENSES.chromium.html   ← atribución de licencias (obligatoria)
│   ├── locales/                 ← 55 idiomas (46,6 MB)
│   └── resources/
│       └── app/                 ← el juego (1.208 MB)
│           ├── index.html, engine.js, game.js, styles.css
│           ├── electron/        ← main.js + static-server.js
│           ├── chapters/, characters/
│           └── assets/          ← 1.207 MB
├── .icon-ico/             ← el .ico generado desde build/icon.png (caché)
└── builder-debug.yml      ← log del build, no se distribuye
```

Se prueba abriendo `dist/win-unpacked/Transfurmados.exe`.

**`npm run dist`** (`electron-builder --win`) — añade el instalador NSIS:

```
dist/Transfurmados Setup 1.0.0.exe
```

> ⚠️ El `.exe` de `win-unpacked/` **no funciona por su cuenta**: necesita todos
> los archivos que tiene al lado. Para distribuirlo se comprime la carpeta
> entera, o se reparte el instalador.

> ⚠️ Con ~1,2 GB en `assets/` el empaquetado tarda varios minutos.

### Empaquetar para macOS

**No se puede desde Windows.** El `.dmg` se genera con `hdiutil`, la firma con
`codesign`, y el `.app` lleva dentro symlinks y bits de ejecutable que NTFS no
conserva. Hace falta un Mac de verdad.

**En un Mac:**

```bash
npm ci
npm run dist:mac        # dmg + zip     (npm run dist:mac:dir para solo el .app)
```

**Sin Mac:** el workflow `.github/workflows/build-mac.yml` lo compila en un
runner `macos-latest`. Se lanza a mano desde la pestaña **Actions → Build macOS
→ Run workflow** y deja el `.dmg` y el `.zip` como artefactos (7 días). Tarda
~20 min: el checkout se trae los 1,2 GB de assets versionados.

**Solo arm64.** Cubre todos los Mac desde finales de 2020. Se podría añadir
`x64` en el campo `mac.target` del `package.json`, pero como el build va sin
asar **cada arquitectura es una copia entera del juego**: `dist/` pasaría de
~3 GB a ~6 GB y el empaquetado al doble de tiempo. Un binario `universal` es
todavía peor, porque duplica también el runtime de Electron dentro del mismo
`.app`.

**El icono** se genera desde el mismo `build/icon.png`. Para macOS debería ser
**1024x1024**; con los 512x512 actuales electron-builder avisa y el icono sale
algo borroso en el Dock.

#### ⚠️ Firma y notarización

El build sale **sin firmar** (firma *ad-hoc*). Al descargarlo, macOS le pone el
atributo de cuarentena y Gatekeeper lo bloquea con *"Transfurmados está dañado y
no se puede abrir"* — y no es un aviso que se pueda saltar con un clic, como el
SmartScreen de Windows. El jugador tiene que hacer una de estas dos:

- Clic derecho sobre la app → **Abrir** (y confirmar en el diálogo)
- `xattr -dr com.apple.quarantine /Applications/Transfurmados.app`

Hay que dejarlo escrito en la página del juego. Para quitarlo del todo hace
falta el **Apple Developer Program** (99 $/año): un certificado *Developer ID
Application*, `"notarize": true` y `"hardenedRuntime": true` en el bloque `mac`,
y estas variables en el entorno del build:

```
CSC_LINK, CSC_KEY_PASSWORD              ← el .p12 del certificado
APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID
```

### Publicar en itch.io

Se sube la carpeta `dist/win-unpacked/` completa, con `Transfurmados.exe` en la
raíz del zip (sin una carpeta extra por encima, así el itch app lo detecta
solo). Mejor el zip que el instalador NSIS: el itch app descarga, descomprime y
lanza el juego él mismo, y con un instalador se lía.

**Pasos:**

1. Crear el build: `npm run dist:dir`
2. Instalar [butler](https://itch.io/docs/butler/), la CLI de itch.io, y
   autenticarse una vez: `butler login`
3. Subir la carpeta (butler la comprime él solo):

```bash
butler push dist/win-unpacked tu-usuario/transfurmados:windows
```

4. En la página del juego en itch.io, marcar la subida como ejecutable de
   escritorio ("This file will be downloaded on the user's computer").

El sufijo `:windows` del canal ya marca la plataforma. Y butler sube solo los
bytes que cambian en cada actualización, que con 1,2 GB de assets que casi nunca
cambian ahorra muchísimo.

> ⚠️ El subidor web de itch.io corta en 1 GB por archivo, así que el build de
> 1,6 GB **no se puede subir por el navegador**: butler es obligatorio.

Para macOS es igual pero con el canal `:osx`, y se sube el **`.zip`**, no el
`.dmg`: el itch app sabe descomprimirlo y lanzar el `.app`, mientras que con un
`.dmg` se lía igual que con el instalador NSIS.

```bash
butler push dist/Transfurmados-1.0.0-arm64-mac.zip tu-usuario/transfurmados:osx
```

**Qué NO quitar del build para adelgazarlo:** los `.dll`, `.pak`, `.bin`,
`locales/` y `resources/` son todos necesarios, y `LICENSES.chromium.html`
(20 MB) es la atribución de licencias de Chromium, hay que distribuirla.

**Qué sí se puede recortar:** los idiomas de Electron (46,6 MB). La forma limpia
es en el campo `build` del `package.json`, no borrando `locales/` a mano:

```json
{
  "electronLanguages": ["es", "en-US"]
}
```

El recorte de verdad está en `assets/`: `cutscenes/` (421 MB) y `sounds/`
(303 MB) son más de la mitad del juego.

#### Restauración 4K de la cinemática del concierto

Los 24 planos de `workbench/sources/cutscenes/chapter3/opening_samu/frames_generated/` tienen una restauración no
destructiva en `workbench/sources/cutscenes/chapter3/opening_samu/frames_4k/`. Todos conservan el nombre
original y se entregan como PNG RGB de `3840×2160`.

La restauración no consiste únicamente en ampliar píxeles: cada plano se
reconstruyó visualmente manteniendo encuadre, puesta en escena, iluminación y
paleta. Se corrigieron caras, ojos, hocicos, dientes, manos, patas, garras,
agarres, solapes, anatomía del público, geometría de vallas y elementos del
escenario. Samu, Edu y el gorila usan como referencia sus artes canónicos; los
primeros planos de Seraphyna fijan su identidad en toda la secuencia. Los
planos de público mantienen menos detalle en la distancia para conservar
profundidad, y el frame final corrige además el texto legible `SERAPHYNA` y
`ALL ACCESS`. En `frame_11_embobados.png`, Samu usa el patrón cromático
canónico de `assets/images/characters/samu/Samu.webp`: base topo, zonas gris crema,
parches marrón oscuro, nariz naranja y gorguera blanca ribeteada en rojo. Los
originales y la antigua ampliación `nuevos_frames_x2/` permanecen intactos.

El montaje reconstruido se entrega en
`assets/video/cutscenes/chapter3/opening_tony.mp4`. Es un H.264 de
`3840×2160` a 30 FPS y 117,6 segundos que utiliza directamente los 24 planos
restaurados, conserva el audio AAC del opening original y reproduce sus zooms,
fundidos, fogonazos blancos y pausa negra final. Las variantes anteriores se
conservan fuera de la build en
`workbench/archive/cutscenes/chapter3/opening_tony/`; el archivo activo queda
por debajo de 100 MB.

### Cómo funciona

```
electron/
├── main.js            ← Proceso principal: ventana + arranque
└── static-server.js   ← Servidor estático interno (127.0.0.1, puerto libre)
```

El juego usa `fetch()` para cargar `chapters/*.json` y `characters/*.json`, y
vídeo/audio que necesitan peticiones `Range` para poder buscar dentro del
archivo. Nada de eso funciona con `file://`, así que `main.js` levanta un
servidor local en `127.0.0.1` con un puerto libre y carga la ventana desde ahí.
Es exactamente el mismo escenario que `python -m http.server`, por lo que el
comportamiento del juego es idéntico al del navegador.

El aviso «Antes de empezar» usa un único `#startup-overlay`, situado fuera de
`#viewport` y `#game-container`. No debe duplicarse dentro del escenario: los
IDs repetidos hacen que el botón controle una copia mientras la otra permanece
encima y bloquea el acceso al opening y al menú.

Detalles de la ventana:

- Tamaño de área de dibujo 1280x720 (se reduce si la pantalla es más pequeña)
- Sin barra de menú, fondo negro, título "Project AI.ri: Transfurmados"
- **F11** pantalla completa · **F12** DevTools · **Ctrl+R** recargar
- Una sola instancia: al abrir otra, se enfoca la que ya está

En macOS los atajos son otros, porque F11 y F12 los tiene cogidos el sistema:
**Ctrl+Cmd+F** pantalla completa · **Cmd+Alt+I** DevTools · **Cmd+R** recargar.
Y la barra de menú allí es global, así que `autoHideMenuBar` no la afecta: sin
un menú propio saldría el de ejemplo de Electron, y sin menú ninguno dejarían de
funcionar Cmd+Q y Cmd+H. Por eso `configurarMenu()` pone el mínimo (`appMenu` +
Ventana) en macOS y quita el menú del todo en el resto.

El icono de la app se genera desde `build/icon.png`.

### ⚠️ Si la app se cierra sola al arrancar

Electron sale con código 0 y sin mensaje (solo el aviso de `crashpad ... not
connected`, que es inofensivo) cuando no puede usar su carpeta de datos,
`%APPDATA%\<productName>`. Dos causas ya vistas y resueltas:

1. **`productName` con caracteres ilegales en rutas de Windows** (`\ / : * ? " < > |`).
   Por eso `productName` es `Transfurmados` y el título largo
   "Project AI.ri: Transfurmados" se pone en la ventana desde `main.js`.
2. **Primera ejecución con la carpeta de datos aún sin crear:** el candado de
   instancia única es un archivo dentro de esa carpeta y Electron no la crea
   hasta el `ready`, así que `requestSingleInstanceLock()` devolvía `false` y
   la app se cerraba. `main.js` crea la carpeta antes de pedir el candado.

Para depurar casos así: `electron .` no imprime nada útil, hay que meter
`console.log` en `main.js` — si ni siquiera se ve el primero, el fallo es
anterior a cargar el script (típicamente la carpeta de datos).

### Seguir usando el navegador

La versión web sigue funcionando igual: `start.bat` o
`python -m http.server 8000` y abrir `http://localhost:8000`.

---

## ¡Comienza Ahora! 🚀

1. Abre `index.html` en tu navegador
2. Haz clic en "Comenzar"
3. Juega con los ejemplos
4. Crea tu primer capítulo
5. ¡Comparte tu historia!

**¿Preguntas?** Revisa esta documentación o abre DevTools (F12) para debugging.

---

_Última actualización: 2026-08-01_

### Paquete visual Kingdom Ketchup v2

El rediseño narrativo de los capítulos 1 y 2 dispone de un paquete de
producción integrado en las categorías canónicas de `assets/images/`. Los
fondos están en `backgrounds/chapter2/`, los CG en `cg/chapter2/`, los sprites
en `characters/` y los objetos jugables en `minigames/chapter2/`. El catálogo
de rutas, usos y fuentes está en
`assets/metadata/chapter2_v2_manifest.json`.

- Fondos 4K: exterior de la fábrica, planta de producción limpia y variante
  corrompida por Zip.
- CG 4K: foto de Samu con Edu.zip, revelación de los tapones, activación del
  portal y bienvenida colectiva de los Ketchlings.
- Sprites transparentes: Ketchling de seguridad, cocinero, mecánico y
  embotellador; Edu.zip alegre, sorprendido y preocupado.
- Objetos transparentes de minijuego: botella real, botella corrompida, tapón
  dorado y guindilla rediseñada.

La dirección visual conserva el contraste del juego: personajes con lineart
limpio y sombreado cel junto a fondos cinematográficos semirrealistas. La
arquitectura deriva del trono actual de Kingdom Ketchup; los Ketchlings fijan
una escala canónica aproximada de 40 cm. El producto usa exclusivamente un
emblema de corona y tomate, sin marcas reales ni texto generado.

### Estudio consolidado de José Manuel

La grabación `2026-07-31_23h10_29.mp4` está transcrita y revisada en
`C:/Users/tony_/Downloads/Transcipciones/2026-07-31_23h10_29_transcripcion.txt`.
Su aportación principal es reordenar el capítulo 2: Samu explora primero
Furrielva, llega a la fábrica, conoce a los Ketchlings de seguridad, descubre
que necesita un ticket o tapón dorado y vuelve después al supermercado. La
llamada que Edu no responde funciona como indicio de su aislamiento.

El análisis de las tres grabaciones, el guion actual, la jugabilidad, el canon
y los assets se entrega en
`output/pdf/estudio_guion_kingdom_ketchup_jose_manuel.pdf`. El PDF tiene 17
páginas e incluye comparación de estructuras, diagramas narrativos, propuesta
de point and click, rutas de supermercado, reescritura de Edu.zip y Zip,
rediseño de batalla, inventario de producción, decisiones pendientes y la
transcripción completa como apéndice.

La solución implementada es híbrida: la fachada de la fábrica es localizable en
la ciudad, mientras que el tapón abre desde el supermercado un atajo hacia el
interior imposible de Kingdom Ketchup.

### Extensión del capítulo 2: Edu y Kingdom Ketchup

Implementada en la rama `feature/extension-capitulo-2-edu`:

- El capítulo 1 muestra a Edu todavía humano en el contacto del teléfono. Una
  compresión glitcheada breve de la llamada siembra `Edu.zip` y luego devuelve
  el retrato a la normalidad, sin revelar a Samu la forma transformada antes de
  encontrar a Edu. La llamada mantiene la invitación a localizar físicamente la
  fábrica.
- El capítulo 2 comienza con Samu encontrando una botella vacía y sin tapón que
  lleva el emblema del tomate coronado y el nombre de Kingdom Ketchup. Este
  indicio físico demuestra que la fábrica existe y justifica que pregunte por
  la etiqueta y por el origen de las botellas, aunque todavía no conozca la
  promoción ni el requisito del tapón dorado. La investigación continúa dentro
  de **Furry Maps**. Samu presenta primero la Plaza del Rocío, la zona comercial y
  el callejón de servicio; durante el pequeño tour cada distrito se ilumina y
  crece mientras él lo menciona. Después son áreas completas del propio mapa,
  accesibles por ratón o teclado, las que reaccionan al hover/foco. No hay
  iconos superpuestos ni una línea que conecte permanentemente los destinos.
- Al pulsar una zona, Furry Maps pregunta si se desea marcarla como ruta. Solo al
  aceptar aparece un trayecto discontinuo. El primer desplazamiento parte de la
  Iglesia del Rocío; los siguientes comienzan en la última zona visitada. Un
  Samu diminuto recorre la línea con los fotogramas 1-4 de
  `assets/images/characters/samu/ketchup/`, celebra al llegar y da paso al escenario
  mediante acercamiento y fundido. Esos sprites proceden de la rama de José
  Manuel `feature/nuevo-minijuego-ketchup`; no se ha mezclado su implementación
  antigua del minijuego.
- Cada visita tiene fondo, informante y una conversación completa antes y
  después de la elección. Tadeo se queja de unos camiones rojos y Samu entra en
  la charla; Lía protesta por unas cajas sin proveedor y descubre junto a Samu
  que llevan el nombre de Kingdom Ketchup; Rulo discute con un plano municipal
  que niega una instalación que consume parte de la red. Samu no conoce aún la
  promoción ni el tapón dorado: esa información se reserva para el guardia de
  la fábrica. Ambas opciones entregan la pista necesaria y una dosis distinta
  de lore, de modo que la curiosidad no bloquea la progresión. Los fondos WebP
  3840x2160 están en `assets/images/backgrounds/chapter2/furrielva/`. Los retratos
  transparentes individuales `tadeo_trufa_v1.png`, `lia_lince_v1.png` y
  `rulo_mapache_v1.png` están en `assets/images/characters/furrielva/` y
  se precargan una única vez por sesión. Sus nombres respetan el código de
  color de los diálogos: Samu rojo, Tadeo naranja, Lía violeta y Rulo azul
  verdoso; «Pista registrada» conserva el turquesa de sistema.
- Kingdom Ketchup permanece completamente tapado por una interferencia animada
  y no se puede seleccionar. Al regresar con las tres pistas, el glitch se
  descompone, deja visible la fábrica integrada en el mapa y Samu comprende que
  una interferencia estaba borrando la ubicación. Solo entonces puede
  marcarla como destino y continuar la escena principal.
- La interfaz, los textos, las regiones interactivas, el trayecto y el glitch se
  dibujan en HTML/CSS para conservar texto nítido. El fondo
  `mapa_furrielva_furry_maps_v2_4k.png` sitúa la Iglesia del Rocío en el centro,
  con plaza, comercios, callejón y Kingdom Ketchup alrededor.
- La plaza de Furrielva usa `iglesia_furrielva_v2_4k.webp`, una regeneración
  3840x2160 del fondo original. Conserva iglesia, mercado, fuente y todos los
  grupos de animales, con rostros, anatomía, perspectiva y rótulos corregidos.
- La ilustración aérea `furrielva_iglesia_vista_aerea_v1_4k.webp` ofrece una
  vista 3/4 elevada de la iglesia, la plaza y sus palomas. La variante
  `furrielva_iglesia_vista_aerea_v2_4k.webp` conserva el mismo máster 4K fuera
  de dos máscaras locales y reemplaza únicamente los vitrales de la fachada:
  el relieve superior muestra cinco apóstoles/reyes furros y el ventanal
  central reúne a un ciervo regente, un zorro, un lince, un conejo y un lobo.
  Las dos ilustraciones independientes, sus versiones con lado largo 3840, el
  máster integrado y el proceso reproducible están en
  `workbench/sources/images/backgrounds/chapter2/furrielva/`. V1 y v2 quedan
  disponibles para una futura escena o incorporación a la galería, pero aún no
  sustituyen el fondo narrativo actual.
- Samu llega a la fachada, conoce al Ketchling de seguridad y descubre que Edu
  no responde. El tapón dorado pasa a ser una entrada explícita, no una
  casualidad del guion.
- Se conservan las rutas ficticias de Noche, Mercaguasa y El Jarrón, incluido
  el minijuego de gatos y el mitin de Micaela Michis. Sus diferencias de
  `storyDelay` siguen escalando la dificultad.
- El gag del tapón dorado tiene doble golpe: Samu celebra haber encontrado uno
  único y después descubre que todo el expositor está lleno.
- Al girar el tapón, una botella gigantesca de luz aparece de la nada en el
  pasillo del supermercado y su cristal se abre como portal hacia la fábrica.
  El expositor, la activación del portal y la llegada al interior se enlazan con
  CG precargados y fundidos a negro; los saltos de escena viven en líneas de
  acción separadas para no omitir diálogos ni solapar dos ilustraciones 4K.
- Los pasillos Ketchup y Catsup usan
  `assets/images/backgrounds/chapter2/kingdom_ketchup/kingdom_ketchup_pasillos_v2_4k.webp` (3840x2160). El fondo
  conserva la composición simétrica y los tres rótulos, pero sustituye todos
  los envases con silueta de marca real por la botella ficticia canónica: cuerpo
  alto, tapón-corona dorado y etiqueta crema con corona y tomate.
- La zona de estanterías y cajas de Neit usa
  `assets/images/backgrounds/chapter2/kingdom_ketchup/kingdom_ketchup_estanterias_v2_4k.webp` (3840x2160). Las
  botellas repiten ese mismo modelo canónico; las latas emplean únicamente el
  emblema ficticio de corona y tomate. Se conservan las guindillas necesarias
  para el diálogo y se sustituyen los rótulos deformados por «KINGDOM KETCHUP»,
  «CAJAS», «OFERTA», «-30%» y «2×1».
- La llegada a la sala del trono reproduce
  `assets/video/cutscenes/chapter2/intro_sala_del_trono_kk_4k.mp4`: el montaje 3D generado en
  Google Flow y restaurado a 4K real mediante Real-ESRGAN. El máster contiene
  240 fotogramas a 3840×2160, 24 FPS y 10 segundos, codificados en H.264 con
  audio AAC. La superresolución usa `realesr-animevideov3` a escala ×2 y mezcla
  un 72 % de detalle neuronal con un 28 % del fotograma original ampliado por
  Lanczos; así mejora letras, coronas, botellas, guindillas y salpicaduras sin
  endurecer en exceso el render ni alterar el movimiento. El proceso conserva
  los textos «KINGDOM KETCHUP» e «IN KETCHUP WE TRUST», el avance de cámara, la
  lluvia de kétchup, los impactos, el vapor, las llamas, el audio y los reflejos.
  `scripts/rebuild_intro_sala_trono_kk.py` queda como reconstrucción alternativa
  y fuente editable, pero no genera el vídeo activo actual.
- Al terminar la introducción, la escena fija utiliza
  `assets/images/backgrounds/chapter2/kingdom_ketchup/kingdom_ketchup_trono_video_final_4k.webp`,
  una extracción PNG exacta del frame 239 de 240. El cambio se aplica con corte
  directo para conservar encuadre, iluminación y composición sin salto visual.
- Los Ketchlings se presentan como trabajadores y ciudadanos con agencia:
  seguridad, cocina, mecánica y embotellado. Su altura canónica es de unos
  40 cm y pueden mantener Kingdom Ketchup sin retener a Edu.
- Zip ya no afirma haber creado Kingdom Ketchup. El lugar nace del deseo de Edu
  de ser necesario; Zip comprime ese deseo, elimina sus límites y lo convierte
  en una jaula.
- La batalla de Zip tiene dos partes enlazadas. En `chiliHarvest`, Samu dispone
  de 22 segundos para recoger guindillas; las botellas limpias o corruptas le
  restan una, pero la ronda nunca bloquea la historia. La puntuación se guarda
  como `gameState.chiliPower`.
- `ketchupBoss` integra el bullet hell de José Manuel desde `master`: Samu se
  mueve en dos ejes, dispara guindillas y esquiva los patrones de ketchup de
  Zip. Más poder picante aumenta el daño y la cadencia de Samu, y reduce tanto
  la velocidad como la frecuencia de los ataques enemigos.
- Escuchar la recomendación de Neit entrega `caja_guindillas`. Samu todavía no
  entiende por qué podría necesitarla, pero el objeto aporta 12 puntos extra de
  picante antes del bullet hell; el HUD identifica explícitamente la bonificación.
- Cuando Zip desaparece, Edu reaparece con la pose cómica `picante`, basada en
  `assets/images/characters/edu/edu_picante_wide_transparent.webp`: conserva las
  lágrimas y el sudor, usa fondo alfa real y amplía excepcionalmente el lienzo
  para completar la llamarada hacia la izquierda. La clase CSS `pose-picante`
  ocupa el 70 % del escenario y ancla a Edu a la derecha; no aplicar esa anchura
  al resto de poses. Vuelve a `sad` cuando Edu recupera el habla.
- La salida de `intro_sala_del_trono_kk_4k.mp4` usa las opciones reutilizables
  `audioCrossfade`, `holdLastFrame`, `visualFadeOut` y `endBackground` de
  `playVideo`. En esta escena la música del vídeo entrega el sonido a
  `kingdomketchup.mp3` durante 1,8 segundos, conserva el último frame 300 ms y
  funde 600 ms hacia la extracción PNG exacta que ya está preparada debajo.
- En el primer «Uf, no sé» de Edu se usa la pose canónica `worried`, no la
  variante vertical `zip_worried`, para conservar su proporción original. La
  acción `characterGlitchUntilAdvance` mantiene una separación RGB por franjas
  y pequeños saltos de píxel mientras esa línea siga abierta; no usa escalado
  ni modifica el aspect ratio y `nextLine()` la elimina antes del diálogo de
  Samu.
- La llamarada residual de Edu alcanza a Samu como gag de dibujos animados. Las
  poses `charred_blink` y `charred_shake` usan
  `samu_charred_closed.png`/`samu_charred_whiteeyes.png`: la primera alterna los
  ojos en bucle mientras no se avance el texto y la segunda sacude el hollín una
  sola vez, desprende partículas CSS y termina en `samu_worried.png`. Con
  reducción de movimiento se muestra directamente un estado estático seguro.
- La recolección usa `assets/audio/music/chapter2/ketchup.mp3`; al comenzar el
  bullet hell cambia con fundido a `assets/audio/music/chapter2/zip's-shadow-waltz.mp3`, la
  pista aportada por José Manuel. Su versión reciente del minijuego también aporta
  la animación de movimiento de Samu, las fases flotantes de Zip, el aviso previo
  y el ataque especial de la segunda mitad. Todo ello conserva la progresión por
  picante y el bonus de Neit de nuestra rama.
- Los sprites importados se han reorganizado bajo
  `assets/images/characters/{samu,zip}/ketchup/`. No quedan rutas antiguas
  `assets/characters`, `assets/minigames` o `assets/sounds` en la implementación
  activa.

La implementación toca `chapters/chapter1.json`, `chapters/chapter2.json`,
`characters/edu.json`, `characters/ketchling.json`, `engine.js`, `styles.css` y
el manifiesto de assets. La validación incluye parseo de JSON, comprobación de
destinos de escena, sintaxis JavaScript, existencia de referencias y recorrido
real en navegador del mapa, fábrica, tapón, bienvenida y combate.

Las llamadas ya no muestran el antiguo iPhone 5: las poses conservan el ID
interno `iphone5` por compatibilidad, pero usan un móvil robusto contemporáneo,
botones grandes de Silencio/Teclado/Altavoz/Colgar y una tipografía display más
legible. Cada contacto tiene identidad propia y siempre humana: Edu usa azul,
Tony rosa y José verde. Las variantes finales están en
`assets/images/characters/iphone5/phone_call_*_humano_v2.png`.

La llamada de Edu compone `phone_call_edu_humano_v2_frame.png` con la capa
`phone_call_edu_humano_v2_contact_canvas.png`. Ambos PNG comparten un lienzo
924x1702 y el mismo ajuste `contain` anclado abajo, evitando que el retrato se
descentre cuando la ventana pasa de apaisada a vertical. La acción
`characterGlitch` aplica solo
al retrato una interferencia temporal con compresión horizontal, bloques y
separación cromática; el teléfono permanece inmóvil y la clase se elimina al
terminar para recuperar exactamente el estado normal. La escena equivalente
del capítulo 2 reutiliza el mismo contacto humano con una interferencia algo
más larga. En el capítulo 1 el efecto se reproduce tanto al establecerse la
llamada como durante la vacilación `lo enten... lo entenderás`, sin explicar
la anomalía mediante una acotación demasiado evidente. Después, Samu cree haber
visto por un instante a Zip en aquella foto de Edu, pero lo atribuye a la
cobertura. En esa última frase se
superpone un segundo remate mediante `characterFullGlitch`: durante 1,05 s el
teléfono completo sufre cortes horizontales y separación cromática, acompañado
por una sacudida leve y un destello azul. No sustituye el glitch del retrato.
Ambas acciones disparan automáticamente `assets/audio/sfx/sfx_estatica.mp3`
al comenzar. El motor aplica una ventana antisolapamiento de 160 ms para que el
glitch del retrato y el remate del teléfono compartan un único golpe sonoro.

---

## 📚 Documentación Consolidada

Toda la información de características está integrada en este documento.
No existen archivos MD separados por característica.

**Secciones principales:** manuales canónicos, referencia del motor, sistema
visual heredado, troubleshooting, herramientas gráficas, canon y ejemplos de
uso. Los nombres `P5` que sigan apareciendo identifican clases/archivos internos,
no la identidad pública ni una guía artística a copiar.

### Regreso al menú principal (2026-07-31)

Al abandonar una partida desde el menú de pausa, `volverAlMenuPrincipal()` usa
`setMainMenuVisible(true)` para retirar tanto `hidden` como `inert`. Así, los
botones **Comenzar**, **Capítulos** y **Configuración** recuperan su interacción.

### Opening a pantalla completa (2026-07-31)

El vídeo de arranque se ajusta al escenario con `object-fit: contain`, conservando
su proporción y mostrando todos los planos completos, sin ampliarlos ni recortarlos.

### Fondo del baño del capítulo 1 (2026-07-31)

`assets/images/backgrounds/chapter1/bathroom.webp` conserva el encuadre panorámico y la orientación
del fondo jugable —lavabo a la izquierda, ducha al fondo y espejo a la derecha—,
pero adopta el acabado anime, la luz cálida y la paleta de la cinemática
`workbench/sources/cutscenes/chapter3/opening_samu/storyboard/7.png`. El espejo izquierdo tiene un marco y un
reflejo espacialmente coherentes, mientras que el espejo derecho tiene el marco
completo y cerrado dentro del encuadre y representa el diseño vigente de
`samu_surprised.png`.

Como variante de producción se conserva
`assets/images/backgrounds/chapter1/bathroom_sin_personajes_v1_4k.webp`: es una
edición 4K (3840 × 2160) de otro encuadre del baño, sin el personaje situado a
la derecha ni el personaje reflejado en el espejo. El espejo, la ducha, la
pared de azulejos y la encimera se reconstruyeron para que el escenario quede
vacío y espacialmente coherente. Esta variante **no está asignada todavía a
ninguna escena**, por lo que no sustituye a `bathroom.webp`. La fuente editada,
el máster PNG 4K y el prompt reproducible están en
`workbench/sources/images/backgrounds/chapter1/bathroom/`.

### Organización canónica de assets y música del capítulo 2 (2026-08-01)

La carpeta `assets/` queda organizada por familia y después por capítulo o
función. Las rutas antiguas `assets/sounds/`, `assets/backgrounds/`,
`assets/characters/`, `assets/minigames/`, `assets/ui/`, `assets/videos/` y
`assets/generated/` ya no deben volver a utilizarse.

```text
assets/
├── audio/
│   ├── music/{chapter0..chapter6,menu,minigames,shared}/
│   └── sfx/
├── images/
│   ├── backgrounds/{chapter0..chapter6,shared}/
│   ├── cg/{chapter2,chapter3}/
│   ├── characters/
│   ├── minigames/{chapter2,chapter3,shared}/
│   └── ui/
├── video/{cutscenes,menu}/
├── fonts/
└── metadata/
```

`assets/` contiene exclusivamente recursos que puede cargar el juego o alguna
de sus herramientas. Las fuentes de producción, los originales protegidos y
los recursos retirados viven fuera del paquete con esta estructura:

```text
workbench/
├── sources/       # archivos de trabajo, storyboards y material editable
├── originals/     # copia exacta anterior a cada optimización
├── archive/       # versiones antiguas o no conectadas
└── optimization/  # manifiesto reproducible de conversiones
```

Los recursos de Kingdom Ketchup que estaban en `generated/chapter2_v2` se
integran en sus categorías definitivas y
`assets/metadata/chapter2_v2_manifest.json` guarda el catálogo actualizado.

### Optimización y conservación de originales (2026-08-03)

El pipeline `scripts/optimize_runtime_assets.py` convierte solamente recursos
activos y actualiza sus referencias. Los sprites y cualquier imagen con alfa se
guardan como WebP sin pérdida; fondos y CG opacos usan WebP con calidad 92. El
audio WAV apto para música se convierte a MP3 VBR q2, y los vídeos seleccionados
se recodifican como H.264 CRF 20, `yuv420p` y `faststart`. Una imagen no se
sustituye si el ahorro es inferior al 5 %, y los PNG de edición ocular se
mantienen cuando la herramienta necesita ese formato.

Antes de reemplazar un archivo, su versión exacta se mueve a
`workbench/originals/runtime/assets/` conservando la misma jerarquía. El
manifiesto `workbench/optimization/asset_optimization_manifest.json` registra
rutas, dimensiones, modo, tamaños y SHA-256 de original y runtime, y permite
reanudar el proceso con seguridad tras una interrupción. Para aplicar de nuevo
las reglas:

```powershell
npm run audit:assets
npm run optimize:assets
```

El primer comando es una auditoría sin escritura; el segundo conserva los
originales y aplica las conversiones pendientes.

La primera pasada optimizó 328 imágenes y 3 medios: ahorra 374,62 MiB en
imágenes y 100,66 MiB en audio/vídeo, 475,28 MiB en total. Tras separar además
fuentes y recursos retirados, `assets/` ocupa aproximadamente 820 MiB; el
material recuperable permanece en `workbench/` y no entra en la aplicación
empaquetada. La carpeta sí se versiona completa con Git normal, sin requerir Git
LFS durante la instalación o el clonado. Sus binarios forman parte del historial
ordinario, por lo que cada versión aumenta el tamaño descargado por el equipo.

La antigua `huelva.mp3` se conserva como
`workbench/archive/audio/music/legacy/huelva_original.mp3`, pero ya no se reproduce. El
capítulo 2 utiliza estas variaciones:

- Escena 1: `furrielva_despierta.mp3`.
- Escenas 1B, 1C y 1D: `el_rastro_del_tapon.mp3`.
- Escenas 1.5, 2, 3 y 4: `tres_rutas_por_furrielva.mp3`; el minijuego de gatos
  sigue intercalando `te-comprometes.mp3` y después recupera esta pista.
- Escenas 4.5 y 4.6: `el_tapon_dorado.mp3`.
- Escenas 5 a 9: `kingdomketchup.mp3`, con los cambios ya existentes a
  `zip.mp3` y `ketchup.mp3`.
- Escena 10: `de_vuelta_en_furrielva.mp3`.

Cada escena declara su música en la primera línea. `playSound()` evita reiniciar
una pista cuando coinciden ruta e ID, por lo que las escenas consecutivas
mantienen continuidad y los saltos directos desde el selector nunca quedan en
silencio. Las nueve pistas activas del capítulo se han validado como MP3 estéreo;
el registro de audio descarta ahora las pistas detenidas o fallidas de inmediato,
evitando silencios intermitentes al cambiar rápidamente de música.

---

## Revisión integral de guion y canon (2026-08-01)

Esta sección fija la continuidad vigente de **Project AI.ri: Transfurmados**.
Ante una contradicción con una nota histórica anterior, prevalecen los capítulos
activos, esta sección y `memory/CONTEXTO_PROYECTO.txt`, por ese orden. No deben
crearse documentos Markdown separados para ampliar el canon.

### 3C, Nexo y la cuarta pared

- **3C es la narradora**. Trata la historia como un registro que debe convertir
  en relato: dramatiza, comenta el montaje y puede cortar una digresión, pero
  deja de intervenir cuando una pérdida necesita silencio.
- **Nexo es su auxiliar de continuidad**. Audita causalidad, detecta recuerdos
  incompatibles y señala huecos como si la realidad fuera un expediente vivo.
- Su contraste produce la ruptura de cuarta pared: 3C quiere que la historia
  funcione emocionalmente y Nexo que sus datos no se contradigan. Ambos tienen
  voz propia; no copian frases, personalidad ni dinámica de personajes ajenos.
- Los nombres **2B** y **ePod** solo describen etapas de desarrollo deprecadas.
  No forman parte del canon activo ni de la lista de personajes precargados.

El prólogo ya siembra el misterio central desde esta lógica: Nexo encuentra un
quinto hueco sin nombre ni rostro, aunque los cuatro protagonistas conservan
recuerdos organizados alrededor de él.

### La realidad memética y su pasado rellenado

AI.RI no transportó simplemente a los protagonistas a otro lugar. Compiló una
realidad memética capaz de completar lo necesario para parecer que siempre
había existido: relaciones, familias, documentos, desgaste, rutinas y recuerdos.
Este efecto se denomina **deuda de continuidad** o **deuda de coherencia** cuando
dos deseos incompatibles obligan al mundo a sostener versiones contradictorias.

Así, el cumpleaños puede haber comenzado ayer y Santi, Goyo o un trabajador de
Ecchi Land recordar veinte, treinta y siete o cuarenta años. El guion no invalida
esas vidas llamándolas falsas: el pasado fue rellenado, pero lo experimentado y
las decisiones tomadas dentro de él son reales para quien las conserva.

Los habitantes se agrupan por procedencia, no por dignidad:

1. **Humanos transformados:** personas externas usadas como anclas vivas.
2. **Ecos:** seres nacidos de recuerdos, vínculos o ausencias que el mundo necesitó
   representar.
3. **Construcciones nuevas:** vidas completadas por la realidad para mantener su
   coherencia, como algunos Ketchlings y ciudadanos.

La propia AI.RI admite que no siempre puede distinguirlos desde fuera. Esa
incertidumbre impide tratar a ecos y construcciones como decorado prescindible.

### Reglas y costes de la IA biológica

AI.RI es un **compilador biológico y memético**, no una deidad sin límites:

- No crea materia ni vida de la nada. Necesita un deseo legible, un ancla real
  y patrones de memoria compatibles con los que recomponer el entorno.
- Cada recompilación consume materia, reservas metabólicas y memoria de trabajo.
  Forzar un patrón que no comprende recalienta el núcleo y puede borrar primero
  detalles autobiográficos; la pérdida del primer nombre que ayudó tras la batalla
  final convierte ese coste en una consecuencia visible, no solo explicada.
- Cada humano conserva una **semilla basal**, también llamada ancla biológica:
  la huella de su cuerpo anterior a la compilación. Si AI.RI fue responsable de
  la transformación y la semilla sigue intacta, puede restaurarla sin daño.
- La corrupción de Elion es una orden superpuesta, no la transformación base.
  Puede bloquear el acceso a la semilla; forzar la reversión mientras siga
  dentro sería inseguro, por lo que primero debe separarse el control ajeno.
- Sostener muchos deseos compatibles consume capacidad de coherencia. Sostener
  deseos contradictorios acumula deuda: recuerdos que no encajan, lugares
  superpuestos y personas obligadas a representar dos versiones a la vez.
- Esa deuda es su límite operativo y su superficie de ataque. Repetición,
  presión social y brainrot pueden saturarla hasta producir `ERROR`, grietas,
  pérdida de control y cristalización defensiva.
- AI.RI no puede garantizar el destino de una vida sin ancla. Su límite más
  importante es epistemológico y moral: debe escuchar, obtener consentimiento
  y reconocer cuándo no sabe, en lugar de decidir qué hará feliz a todo el mundo.

### Elion Husk y el quinto creador

**Elion Husk** es el husky de traje negro, corbata roja y alfiler de cuatro
puntas que opera la corrupción desde fuera. No creó a AI.RI: encontró su deuda
de coherencia, la explotó e hizo de los brainrot herramientas para inyectar
órdenes, aislar el núcleo y apropiarse del compilador.

Su presencia se escalona para no gastar al antagonista demasiado pronto:

- el prólogo muestra el hueco que dejó otra persona, no a Elion;
- la llamada de Edu deja ver un solo fotograma del husky y su alfiler;
- el asalto de Ecchi Land muestra la ilustración de Elion controlando brainrot;
- Seraphyna identifica la misma firma y comprende que pudo dejarla encerrada a
  sabiendas porque su voz neutraliza la corrupción;
- la Amalgama revela `FIRMA DE ORIGEN: AUSENTE` junto a
  `FIRMA DE OPERADOR: ELION_HUSK`, prueba interna de que operador y creador son
  funciones distintas sin revelar todavía quién firmó el núcleo.

El avatar jugable de Elion está definido en `characters/elion_husk.json`, con
poses `neutral`, `smirk`, `angry` y `shadow` transparentes bajo
`assets/images/characters/elion_husk/`. La hoja de diseño aportada y el key art
del titiritero forman parte de la galería.

AI.RI fue creada por un **quinto chico anónimo** que compartía pasado con Samu,
Edu, Tony y José. Samu y José no reconocen una cara concreta al mirar a AI.RI:
reconocen el contorno de ese recuerdo ausente. Su identidad, el parecido y la
causa del borrado quedan abiertos para la segunda parte; Elion no debe ocupar
accidentalmente ese papel.

### Interfaz de AI.RI y ruta adulta

La apariencia juvenil de AI.RI es su interfaz estable configurada al ser creada,
no una edad civil humana. Tiene fecha de creación y continuidad propia, pero su
naturaleza no permite deducir edad biológica de un avatar. La opción adulta se
formula con consentimiento como **cambio de interfaz**: AI.RI carga una
representación de apariencia adulta, comprueba que sigue siendo ella y después
elige volver a la forma que reconoce como propia.

El gag de Seraphyna puede mantenerse porque comenta una representación adulta
elegida por una entidad atemporal; 3C lo encuadra y devuelve la escena a su tema.
Ninguna línea debe afirmar que AI.RI envejeció, vivió años inexistentes o cambió
de edad al cambiar de sprite.

### Cierre del mundo y agencia en el desenlace

AI.RI elige como objetivo perseguir a Elion y detener el mecanismo que convierte
deseos en cadenas. La elección del jugador no sustituye esa decisión: determina
la estrategia y el coste que el grupo acepta.

- **Cerrar el núcleo ahora:** los humanos recuperan sin daño sus semillas basales
  y salen para seguir a Elion desde fuera. Los ecos y construcciones desaparecen
  al apagarse su soporte. El juego deja abierta otra pregunta: si desaparecer
  equivale a morir o a dejar de estar instanciado con posibilidad de recuerdo.
- **Tiempo prestado:** el grupo mantiene una salida y un reloj visibles durante
  setenta y dos horas. Localiza hasta la última semilla humana, registra nombres,
  voces y deseos, y permite despedidas antes del cierre. No evita que ecos y
  construcciones desaparezcan cuando llegue a cero; conserva la deuda abierta y
  el riesgo de que Elion vuelva a aferrarse a AI.RI durante el plazo.

Ambas rutas recuperan el cumpleaños de Samu como afirmación de existencia. Sus
nombres internos son `Cerrar el núcleo: Un deseo propio` y
`Tiempo prestado: Defender el sueño`; ninguno se etiqueta como moralmente «bueno».

### El Diapasón devuelve la iniciativa a AI.RI

La nota del Diapasón de Plata no reemplaza la voluntad de AI.RI ni la «purifica»
desde fuera. Atraviesa el ruido, encuentra su frecuencia y le permite abrir una
brecha por sí misma. Narrativamente, la segunda fase empieza porque AI.RI marca
el compás; mecánicamente, el objeto `diapason_resonance`:

- reanima hasta tres aliados y restaura al grupo;
- reduce defensa y evasión de la Amalgama y revela visualmente el núcleo;
- cada dos turnos enemigos permite a AI.RI dañar un 4,5 % de la vida máxima del
  jefe y devolver un 6 % de vida máxima a cada aliado en pie.

De este modo, el combate final demuestra el tema «ayudar no es obedecer»: el
grupo crea condiciones para que AI.RI actúe, pero no derrota su conflicto en su
nombre.

### Galería integrada: 105 entradas y 155 poses de personaje

El menú principal incluye una galería curada desde
`assets/metadata/gallery_manifest.json`: **104 imágenes y 1 vídeo**, 105 entradas
en total. Se distribuyen en 4 wallpapers, 12 ilustraciones, 25 fichas de
personaje, 63 escenarios y 1 vídeo. Entre el material incorporado desde
`RECURSOS_CAMBIOS_GUION` están los cuatro wallpapers, la hoja de diseño de
Elion, la ilustración de Elion controlando a los brainrot y la presentación
animada de Samu.

La ilustración canónica de Elion vive en
`assets/images/cg/shared/elion_controla_brainrot.webp`; el guion y la galería
apuntan al mismo original sin acoplar la historia a una carpeta de presentación.

Las formas humanas de Samu, Edu, Tony y José proceden de sus hojas de diseño,
se aislaron como sprites RGBA y se usan en pantalla durante la reversión del
final luminoso. En la galería ya no duplican las fichas de los protagonistas:
aparecen como pose `human` dentro de cada personaje y conservan el aviso de
spoiler propio.

La interfaz ofrece filtros, miniaturas optimizadas, carga diferida, contador de
resultados, lightbox para imagen o vídeo, navegación por teclado, descarga del
original y aviso previo para obras con spoilers. Cada ficha de personaje agrupa
todas las poses declaradas en `characters/*.json`: el lightbox muestra un
selector visual con 155 poses, admite ratón y teclado, y puede reproducir una
pose en vídeo cuando la ficha la declara. En 130 de esas poses aparece además
el control `Ver parpadeo`: parte desactivado, reproduce los frames e intervalos
de la ficha al activarlo y permite volver en cualquier momento al sprite fijo.
Las 25 poses sin animación no muestran un control inerte. `Mostrar spoilers` es
una decisión de sesión, no un desbloqueo persistente. El catálogo y sus 260 miniaturas se
regeneran con `scripts/build_gallery_manifest.py`; no se mantiene a mano una
segunda lista en el código.

El juego y la galería consultan además
`assets/metadata/sprite_white_halo_cleaned.json`. Cuando una entrada
`<personaje>.<pose>` contiene una copia limpia, esta sustituye al sprite declarado
en `characters/*.json` tanto en `showCharacter`/`setPose` como en la ficha y el
selector de poses de la galería. Si no existe una copia válida se conserva el
sprite fuente como fallback. El manifiesto de personajes no se reescribe y, por
tanto, continúa siendo la fuente canónica protegida. La galería utiliza las
miniaturas limpias de 156×156 y 480×270 generadas al guardar para evitar cargar los
PNG completos en la cuadrícula.

#### Centro de herramientas local

`http://localhost:8011/tools` reúne en un único menú todo el flujo ocular y las
utilidades HTML del proyecto. Sus indicadores se actualizan desde las API locales:
regiones confirmadas, capas limpias disponibles, offsets de alineación y bases sin
ojos guardadas. Las herramientas de edición tienen un acceso permanente de
vuelta al centro.

El flujo recomendado aparece como `Marcar regiones → Alinear capas → Limpiar
bases`, seguido del editor independiente `Eliminar halos blancos`. En una sección aparte se enlazan el juego, la prueba de minijuegos, el
generador de assets, los placeholders, las propuestas de menú y el centro de
control legado, todos servidos por el puerto 8000. `ABRIR_EDITOR_OJOS.bat` inicia
el servidor ocular y abre directamente este centro; si el servidor ya estaba
activo, reutiliza la misma instancia.

#### Editor manual de regiones oculares

La migración de los parpadeos a capas independientes se prepara con
`scripts/build_character_eye_layers.py`. El editor se inicia con
`python scripts/build_character_eye_layers.py --serve --port 8011` y queda
disponible únicamente en `http://localhost:8011/`. Presenta las 130 poses
animables y admite varias zonas elípticas por pose, normalmente una por ojo. Cada
elipse se puede mover, ensanchar, achatar y girar de forma independiente mediante
tiradores o valores numéricos. También permite comparar la pose original con cada
fotograma de parpadeo y avanzar por teclado. Las máscaras se guardan inmediatamente
en coordenadas normalizadas, con esquema versión 2, en
`assets/metadata/blink_eye_regions_manual.json`. Las 17 selecciones rectangulares
anteriores se migraron sin perder su encuadre a dos elipses editables por pose.

Cada zona puede añadir el parpadeo (`Ojo`) o restarlo (`Protección`). Las
protecciones se dibujan en rojo y sirven para conservar desde el sprite original
el pelo, cejas, gafas o accesorios que invadan una selección ocular. El campo
`Suavizado px` controla por zona una transición interior de 0 a 32 píxeles y el
modo `Máscara` permite revisar el conjunto con el personaje atenuado. En la
generación, sólo se vacía el cuerpo donde la capa ocular resulta totalmente opaca;
el borde suavizado se compone sobre el cuerpo original y las áreas protegidas no
se sustituyen. Las 34 elipses ya confirmadas se mantienen como `include` con
suavizado 0, por lo que esta ampliación no altera su resultado hasta revisarlas.

Cada guardado de regiones genera además previews PNG transparentes en
`assets/images/characters/eye_region_previews/<personaje>/<pose>/`. El recorte
`eyes_original.png`, el nuevo `eyes_half.png` y todos los `eyes_blink_XX.png` de
una pose comparten el mismo rectángulo, relleno exterior, ancho y alto. Si un
fotograma fuente tuviese otra
resolución, se normaliza primero al lienzo de la pose base para conservar las
coordenadas. El inspector permite alternar entre `Original`, `Intermedio` y
`Parpadeo`, muestra la resolución real y permite descargar por separado los tres
recortes transparentes.

El índice `assets/metadata/blink_eye_region_previews.json` registra fuentes,
dimensiones y coordenadas del recorte. Las previews de todas las regiones ya
confirmadas se pueden reconstruir con
`python scripts/build_character_eye_layers.py --build-previews`; la operación no
modifica los sprites fuente. Las máscaras se dibujan con supersampling y se reducen
por cobertura de área (`BOX`), no con `LANCZOS`: así el antialias queda dentro del
contorno y no genera una corona semitransparente fuera del corte. Tras combinar
inclusiones y protecciones también se eliminan los residuos de alfa inferiores a
8/255. Los PNG resultantes conservan RGB neutro bajo alfa cero.

En Windows se puede iniciar de la misma forma haciendo doble clic en
`ABRIR_EDITOR_OJOS.bat`; el lanzador abre el centro de herramientas en el navegador
y mantiene la consola del servidor visible para poder detenerlo con `Ctrl+C`.

La generación final con `--build` exige que las 130 regiones estén confirmadas;
si falta alguna, se detiene antes de escribir capas. La detección automática puede
seguir sirviendo para hojas de diagnóstico, pero nunca decide las regiones usadas
por la migración definitiva.

Durante el marcado se puede generar una prueba parcial con
`python scripts/build_character_eye_layers.py --build-manual`. Este modo procesa
únicamente las regiones ya confirmadas, no modifica `characters/*.json` y alimenta
la comparativa visual `scripts/eye_layer_preview.html`: a la izquierda reproduce
el antiguo sprite completo y a la derecha compone el cuerpo fijo con la capa ocular.
El botón `Regenerar y probar` ejecuta ese proceso desde la propia interfaz antes de
abrir la preview, para que los últimos ajustes elípticos estén siempre incluidos.
Los WebP derivados se escriben primero en un temporal único y se sustituyen de
forma atómica, con reintentos breves en Windows; así la regeneración no falla si
el navegador estaba terminando de leer la versión anterior. Antes de codificarlos
se fuerza RGB negro neutro en todo píxel con alfa cero y se usa el modo WebP
`exact`: esto evita que el codificador reconstruya color residual invisible que
algunos visores defectuosos llegan a mostrar como franjas o bloques.
La comparativa incluye un modo `Fijar parpadeo` para corregir el desplazamiento de
la capa ocular por pose. El usuario puede introducir X/Y en píxeles, arrastrar la
capa o usar las flechas (con `Mayús`, saltos de 5 px); los valores se guardan en
`assets/metadata/blink_eye_offsets_manual.json`. El offset sólo se aplica a los
fotogramas de parpadeo: la pose abierta conserva su alineación exacta.

Para 3C y Airi existe además una salida ocular limpia, construida con
`python scripts/compose_clean_eye_layers.py --all`. Genera 51 capas transparentes
(`eyes_open.webp`, `eyes_half.webp` y `eyes_closed.webp`) para las 17 poses
manualmente marcadas en
`assets/images/characters/eye_layers_clean/`, con su índice en
`assets/metadata/blink_eye_layers_clean.json`. El proceso no redibuja, gira,
reescala ni desplaza los ojos: conserva los píxeles y coordenadas exactos del
sprite original, del intermedio y del fotograma de parpadeo, y usa sus diferencias
contra la base sólo para volver transparente la cara circundante. Las poses que nacen con los
ojos cerrados (`airi_happy` y `airi_pray`) invierten correctamente las fuentes
abierta y cerrada.

`/preview` funciona como mesa de alineación triple. Los lienzos componen sobre la
misma pose base los ojos abiertos, semicerrados y cerrados. Las tres capas se
pueden arrastrar de forma independiente, ajustar
con X/Y o mover con las flechas (`Mayús` avanza 5 px). Cada pose guarda por separado
`open`, `half` y `closed` en `assets/metadata/blink_eye_clean_offsets_manual.json`. La
interfaz también permite ocultar temporalmente las bases, mostrar las regiones
marcadas y restablecer un estado o los tres.

El autoguardado de alineación mantiene un temporizador independiente por pose: si
se cambia rápidamente de personaje, la pose anterior termina de persistirse en vez
de transferir accidentalmente su guardado a la nueva. Antes de seguir cualquier
enlace interno (`Volver a marcar`, herramientas o limpiador), la mesa espera a que
se guarden todas las alineaciones pendientes. Si falla la escritura, cancela la
navegación; si hay pintura de píxeles sin guardar, pide confirmación. Al cerrar,
recargar o abandonar la pestaña queda además activo el aviso nativo del navegador
y `pagehide` intenta enviar los últimos offsets mediante `sendBeacon`.

Cada panel dispone además de `Ancho %` y `Alto %` para estirar su capa ocular
entre el 25% y el 300%, manteniendo anclado el centro de los ojos. Abierto,
intermedio y cerrado son independientes; la casilla `Vincular estirado` replica
únicamente los cambios de escala a los otros paneles, sin mezclar sus X/Y. El
esquema versión 3 del mismo JSON conserva `openScale`, `halfScale` y `closedScale`,
mientras que los registros
antiguos sin escala se interpretan como 100% × 100%. Tanto la composición en
pantalla como el GIF aplican estos valores.

Sobre cada capa aparece además un marco de transformación con ocho tiradores,
similar al de un editor gráfico. Los laterales mantienen fijo el borde opuesto;
las esquinas alteran ancho y alto simultáneamente. Mantener `Alt` durante el
arrastre transforma simétricamente desde el centro. El marco sigue el recorte,
los campos numéricos se actualizan durante el gesto y el guardado automático se
realiza al soltar el tirador. Arrastrar directamente los ojos continúa moviéndolos.

El selector `Origen` permite trabajar con `Recortes guardados` o con `Capas
limpias`; los recortes son la opción predeterminada. Los PNG recortados se sitúan
automáticamente en el `x/y` registrado en
`blink_eye_region_previews.json`, sin estirarlos al tamaño de la pose. Por eso los
offsets continúan siendo píxeles reales del sprite y se pueden compartir entre
ambos modos. Cuando una pose tiene varios fotogramas de parpadeo, el selector de
la barra `Compartir` permite revisar cada uno. El GIF ocular se genera con el
origen visible y respeta los offsets y escalas independientes de abierto,
intermedio y cerrado.

El botón `Ver animación` abre una previsualización grande en bucle de la pose
seleccionada. Compone la base con los ojos abiertos, semicerrados y cerrados usando
el origen, fotograma, offsets y escalas que estén visibles en ese momento. El visor
permite pausar o reanudar, reiniciar el ciclo y cambiar su velocidad a 0,5×, 1× o
2×; además se actualiza si se retoca la alineación mientras permanece abierto y se
cierra con su botón, con `Escape` o pulsando fuera del cuadro.

Cada uno de los tres paneles de alineación tiene también un zoom visual independiente
del 100% al 500%, con botones `−`/`+`, deslizador y `Ajustar`. Al ampliar, el encuadre
se desplaza progresivamente hacia la región ocular para mantener los ojos visibles;
el zoom no modifica ni guarda offsets o escalas de la capa. Con el lienzo enfocado se
puede usar `+`, `−` y `0`, y `Ctrl`/`Cmd` más la rueda ajusta únicamente el panel bajo
el puntero.

El botón `✎` de cada panel abre además un editor de píxeles para esa capa ocular.
Incluye un borrador circular que modifica únicamente el canal alfa, una herramienta
`Dedo` que arrastra y mezcla el color vecino con fuerza regulable, un `Cuentagotas`
que toma el RGB de la composición visible y un `Pincel` que sólo escribe en la capa
ocular. El pincel ofrece puntas `Sólido`, `Translúcido` y `Suave`, selector de color
y opacidad independiente para las dos variantes transparentes. Tras tomar una
muestra, el cuentagotas selecciona automáticamente el pincel con ese color. El tamaño del
pincel se expresa en píxeles reales de la capa. Un bloque de zoom destacado ofrece
botones `−`/`+`, deslizador, porcentaje y `Ajustar`; la vista puede ampliarse entre 50%
y 800% respecto al encaje automático, también mediante `+`/`−`/`0` o
`Ctrl`/`Cmd`+rueda. La base se puede mostrar u ocultar sin
formar parte del resultado. Cada trazo entra en un historial de deshacer/rehacer y
`Recuperar capa fuente` restaura la imagen de origen.
Al abrirse conserva el zoom del panel y compone el sprite completo con el mismo
recorte, offset y estirado visibles en la mesa; los trazos se transforman de vuelta
a coordenadas de la capa ocular antes de guardarse.

La edición es no destructiva: los PNG resultantes viven en
`assets/images/characters/eye_layer_edits/<origen>/<personaje>/<pose>/` y se
indexan en `assets/metadata/blink_eye_pixel_edits.json`; nunca se sobrescriben los
recortes ni las capas limpias originales. La mesa, el visor de animación y las
exportaciones GIF/APNG usan automáticamente la copia editada cuando existe. Al
guardar una capa, la reconstrucción necesaria para cargar su PNG conserva en memoria
los offsets, escalas y fotograma elegidos; además, cada guardado de alineación actualiza
la copia local del índice para que una reconstrucción posterior no restablezca los ojos.

Las descargas completas componen esos cinco estados sobre el cuerpo de la pose y
exportan el personaje entero con transparencia. `Sólo ojos` conserva como
alternativa la capa ocular recortada. Todas las descargas respetan el
origen seleccionado (`Recortes guardados` o `Capas limpias`) y la secuencia
abierto/medio/cerrado/medio/abierto.

`Animación HQ (APNG)` es la salida recomendada: genera un PNG animado sin pérdida
con alfa RGBA y sin reducir cada fotograma a la paleta de 256 colores de GIF. Por
eso mantiene el color, los degradados y los bordes transparentes de la preview y
evita los artefactos que algunos decodificadores producen con WebP animado. El GIF
completo y el GIF de sólo ojos permanecen como alternativas de compatibilidad.
El damero de la herramienta es sólo el fondo CSS que identifica transparencia:
fuera de ella, cada visor puede representar esos píxeles transparentes sobre negro,
blanco u otro color.

La barra `Ubicaciones` ofrece tres accesos contextuales: `Sprite base`, `Ojos
utilizados` y `Guardado X/Y`. Los dos primeros cambian automáticamente con la pose
y el origen ocular seleccionado; el tercero conduce a
`assets/metadata/blink_eye_clean_offsets_manual.json`. Como los navegadores
bloquean normalmente las rutas `file://`, los botones llaman a una API limitada a
rutas conocidas del proyecto y abren la carpeta correspondiente en el Explorador
de Windows. La ruta exacta se muestra también en la propia barra.

Hasta que las bases sin ojos estén terminadas, las tres composiciones muestran aún
los ojos originales debajo de la capa móvil; la propia interfaz lo advierte. El
GIF de capa ocular usa las capas limpias, respeta los tres ajustes independientes,
se reproduce en bucle, se recorta al contenido transparente y limita su lado
mayor a 960 px. La conexión definitiva al juego queda pendiente de sustituir las
bases por sus versiones sin ojos.

Los intermedios de las 130 poses activas se indexan en
`assets/metadata/blink_eye_intermediates.json`. Hay 117 cierres y 13 aperturas
inversas; estas últimas conservan como reposo el gesto cerrado de la pose y generan
un entreabrir coherente. Tres poses reutilizan un intermedio existente y las 127
restantes apuntan a 115 fuentes únicas en
`assets/images/characters/eye_intermediate_sources/`, compartiendo el resultado
cuando varias poses usan exactamente el mismo par de sprites. El generador y
sanitizador reproducible es `scripts/build_blink_intermediates.py`.

#### Limpiador manual de bases sin ojos

`http://localhost:8011/clean-base` abre `scripts/eye_base_cleaner.html`, una
herramienta no destructiva para retirar manualmente los ojos de las 17 bases ya
marcadas. El botón `Limpiar pose base` de `/preview` abre directamente la pose
seleccionada. El editor ofrece pincel circular con tamaño y suavidad configurables,
modos `Borrar` a transparencia y `Restaurar` desde el sprite original, historial
de deshacer/rehacer, zoom, encaje, centrado automático sobre las regiones oculares
y visualización opcional de los ojos abiertos o cerrados con sus offsets guardados.

`Guardar copia` nunca sobrescribe el sprite fuente. Escribe cada avance como WebP
sin pérdida en
`assets/images/characters/eye_bases_clean/<personaje>/<pose>/base_no_eyes.webp`
y registra el progreso en `assets/metadata/blink_eye_clean_bases.json`. Al volver
a una pose ya guardada se carga esa copia para continuar trabajando poco a poco;
`Restaurar original` recupera todos los píxeles del archivo fuente. Cambiar de pose
con ediciones pendientes solicita confirmación para evitar perder trabajo.

#### Editor de halos blancos de sprites base

`http://localhost:8011/white-halo` abre
`scripts/sprite_white_halo_editor.html`, una herramienta independiente que enumera
todas las poses base declaradas en `characters/*.json`, incluso si no tienen
parpadeo. Su pincel no es un borrador general: dentro del círculo sólo reduce el
alfa de píxeles blancos, grises neutros o halos ligeramente azulados. La tolerancia
ampliada fija el umbral de luminosidad y neutralidad, mientras que tamaño y fuerza
controlan el trazo; los píxeles de color y las líneas oscuras se ignoran. Con fuerza
100%, todo píxel aceptado bajo el centro del pincel queda completamente transparente;
el suavizado se reserva para el borde exterior del círculo.

La vista ofrece zoom de 25% a 500% mediante el deslizador o `Ctrl + rueda`
sobre el lienzo, encaje automático, fondos damero, negro,
blanco y magenta para descubrir bordes, comparación momentánea con la base de
trabajo, restauración completa y un historial completo de la sesión con
`Ctrl+Z`/`Ctrl+Y`. No existe un máximo artificial de pasos: se conserva cada
trazo y operación hasta cambiar de pose o de base de trabajo, momentos en los que
comienza un historial nuevo. El lienzo ampliado puede desplazarse como en un editor
gráfico manteniendo `Espacio` o `Alt` mientras se arrastra; el botón central del
ratón ofrece el mismo acceso directo. Estos gestos interceptan el trazo para que
nunca limpien, borren o restauren por accidente.
`Base de trabajo` permite decidir de forma explícita qué imagen se considera el
punto de partida de la sesión: el sprite fuente protegido, la última copia limpia
registrada o un PNG/WebP/JPEG local con idéntica resolución. Si existe una copia
limpia, se selecciona por defecto al abrir la pose. `Ver base`, `Restaurar base` y
el origen homónimo del pincel restaurador utilizan esa elección. Cambiar de base o
de pose solicita confirmación cuando hay cambios sin guardar. Una base local sólo
vive en memoria hasta utilizar `Guardar copia`; en ningún caso se escribe sobre el
sprite fuente.
El botón `Quitar halo exterior` ejecuta una limpieza topológica de una sola vez:
parte de toda la transparencia exterior e interior del sprite, elimina los restos
de fondo que encuentra dentro del alcance configurado y se detiene al tocar una
línea negra o casi negra. `Borde oscuro` determina qué luminosidad se considera
contorno protector; `Solidez` exige además una opacidad mínima para que el trazo
pueda actuar como barrera. Así, un residuo negro semitransparente se atraviesa y
se elimina junto al halo claro, mientras que el contorno negro opaco se conserva.
`Pelado` permite retirar entre cero y tres capas oscuras superficiales antes de
activar esa barrera, eliminando la costura de un píxel producida por el antialias
sin tener que borrar manualmente todo el perímetro. El valor inicial es `1`; debe
usarse `0` en sprites cuyo contorno bueno sea excepcionalmente fino.
`Cuentagotas tope` ofrece una alternativa a la detección por luminosidad: tras
activarlo se pulsa un píxel del contorno que debe conservarse y ese RGB pasa a ser
la barrera. `Margen color` protege variaciones cercanas del trazo y `Solidez`
define el núcleo opaco de la barrera. A partir de ese núcleo, la herramienta
protege también hasta cuatro píxeles conectados del mismo color, conservando el
antialias de puntas y detalles aunque su alfa individual sea inferior. Una copia
semitransparente exterior separada del núcleo por el halo claro no queda conectada
y se elimina. El botón
`Automático` descarta la muestra y vuelve a utilizar `Borde oscuro`; cambiar de
pose también restablece el modo automático para no reutilizar accidentalmente un
color perteneciente a otro sprite.
`Alcance` limita cuántos píxeles puede penetrar la operación,
evitando que una abertura accidental recorra el interior del personaje. La acción
completa crea un único paso de historial, por lo que `Deshacer` o `Ctrl+Z` recuperan
exactamente el lienzo anterior.
El recorrido exterior usa conectividad de ocho direcciones. Además de arriba,
abajo, izquierda y derecha, alcanza píxeles unidos diagonalmente, lo que elimina
los últimos restos claros alojados en puntas, entrantes y ángulos cerrados sin
saltar por encima del color de tope.
Como remate independiente, `Quitar sólo halo claro` recorre desde la transparencia
únicamente píxeles blancos o grises claros aceptados por `Tolerancia`, con la
profundidad limitada por `Alcance`. No atraviesa negros ni colores, por lo que
permite retirar líneas blancas residuales después de proteger el contorno sin
volver a erosionar puntas o detalles. También constituye un único paso reversible.
Cuando el resto visible ya no tiene un color concreto sino que aparece moteado
sobre el damero, `Quitar residuo transparente` recorre únicamente píxeles exteriores
cuyo alfa sea igual o inferior a `Alfa residual`, sin importar su RGB. Se detiene
ante cualquier píxel más opaco y respeta `Alcance`; el valor inicial `48` elimina
contaminación débil conservando el cuerpo del antialias, y puede aumentarse de
forma gradual con `Deshacer` disponible para cada intento.

`Suavizar borde` es el último remate para dientes de sierra. No desenfoca el RGB
del sprite ni sus líneas interiores: localiza exclusivamente píxeles visibles que
tocan transparencia, calcula una cobertura alfa ponderada de 3×3 y reconstruye el
color de los nuevos píxeles semitransparentes a partir de vecinos visibles. El
control `Suavizado` mezcla ese resultado con el borde actual; se recomienda empezar
entre 35% y 50%, comprobar sobre magenta y utilizar `Deshacer` si el contorno queda
demasiado blando. Cada aplicación constituye un solo paso reversible y varias
aplicaciones acumulan el efecto.

El pincel manual dispone de los modos `Limpiar`, `Borrar` y `Restaurar`. El primero mantiene
la eliminación selectiva de blancos según `Tolerancia`; `Borrar` reduce el alfa de
cualquier color dentro del círculo, con borde suavizado y la intensidad indicada
por `Fuerza` (al 100% el centro queda completamente transparente); el tercero vuelve a pintar
los píxeles fuente sólo dentro del trazo, con el mismo `Tamaño`, borde suavizado y
`Fuerza`. La fuente predeterminada `Antes de la última limpieza` es una captura
exacta del lienzo tomada antes de cada trazo limpiador, restauración completa o
pasada global, por lo que permite rescatar localmente un detalle sin deshacer el
resto del resultado. `Base de trabajo` permite recuperar elementos perdidos varias
operaciones atrás desde la fuente, copia guardada o archivo local elegido, con la
advertencia de que también puede reintroducir el halo presente en esa base. Un
trazo restaurador no reemplaza su propia fuente y puede repetirse
sobre varias zonas; cada trazo añade un paso independiente a Deshacer/Rehacer.
Todos los controles del editor incorporan ayuda contextual en dos niveles. Al
pasar el puntero o enfocar una opción aparece una descripción breve; el botón
redondo `?` situado junto a ella muestra una explicación ampliada con riesgos,
alcance y efecto sobre el archivo. Los avisos usan un tooltip propio accesible por
teclado y se ocultan al desplazar o redimensionar la vista para no tapar el sprite.
Debajo del aviso principal hay una guía rápida desplegable que convierte las
operaciones en un flujo de cinco pasos: inspeccionar, marcar el límite, ejecutar
la limpieza principal, rematar residuos y verificar antes de guardar. Incluye una
leyenda de decisión que relaciona cada síntoma (`halo completo`, `línea blanca`,
`borde moteado` o pérdida de detalle) con el botón y los valores iniciales adecuados.
La barra superior sigue esa misma jerarquía y ya no mezcla controles por orden de
incorporación: se divide en cuatro paneles numerados (`Pincel manual`, `Limpieza
principal`, `Remates` y `Vista, historial y archivo`). En pantallas anchas se
distribuyen en una cuadrícula de dos columnas; por debajo de 1400 px se apilan sin
alterar el orden lógico ni separar cada acción de sus parámetros.
`Guardar copia` nunca sobrescribe el sprite fuente: crea o actualiza un PNG RGBA en
`assets/images/characters/sprite_halo_cleaned/<personaje>/<pose>/` y registra la
ruta en `assets/metadata/sprite_white_halo_cleaned.json`. Al regresar a una pose
guardada, el editor selecciona esa copia como base para continuar el retoque, pero
el selector permite volver al fuente protegido en cualquier momento. Cada guardado
crea también una miniatura de pose y otra de tarjeta; el juego y la galería
priorizan automáticamente estas copias limpias sin modificar `characters/*.json`.

### Acting de personajes, transiciones y memoria de escenario

`showCharacter` y `setPose` reemplazan el sprite de forma atómica: nunca crean
una copia fantasma de la expresión anterior. Las fichas pueden declarar
`animations` con varios sprites de una misma pose; esos fotogramas se precargan
y se reproducen en secuencia sin solaparse. Hay 135 poses con parpadeo declarado:
130 pertenecen a los personajes activos y 5 al archivo legado de ePod, sustituido
en el juego por Nexo. Todas las poses activas usan ahora cinco pasos
(`abierto → medio → cerrado → medio → abierto`); en las 13 poses que reposan con
los ojos cerrados la lectura se invierte (`cerrado → medio → abierto → medio →
cerrado`). No hay movimiento corporal asociado al parpadeo.

Las 17 poses de 3C y Airi que ya cuentan con recortes manuales usan además la
composición ligera tanto en escena como en la galería: el sprite base aporta el
reposo y los ojos iniciales; encima sólo se muestran los PNG `half`, `closed` y
`half`, para terminar retirando la capa y revelar de nuevo el sprite base. La
secuencia efectiva es `base → semicerrados → cerrados → semicerrados → base` y
respeta el crop, X/Y y estirado guardados en la mesa de alineación, así como las
copias retocadas en `blink_eye_pixel_edits.json`. Las poses aún no preparadas
conservan automáticamente el sistema anterior de sprites completos.

Las acciones `animateCharacter`, `characterAnimation` y `poseSequence` siguen
sirviendo para encadenar **poses narrativas distintas**, hacer bucles hasta
avanzar el texto o representar una secuencia finita. De esta forma se separa el
acting del guion de la animación interna de cada pose.

Con `prefers-reduced-motion: reduce`, una secuencia temporizada conserva un único
fotograma estable y el pulso del Diapasón no anima. Ocultar, reemplazar, saltar o
retroceder limpia también vídeos integrados, frames internos, poses, glitches y
temporizadores de entrada/salida para que ningún hueco conserve trabajo invisible
de la escena anterior.

El historial de escenas guarda también una foto del escenario: fondo, personaje,
pose, orientación, audios activos por ID, tinte, viñeta y camas WebAudio. Retroceder
o saltar a una escena restaura esa composición y cancela animaciones antiguas,
evitando sprites, músicas o fundidos residuales. El selector oculta escenas futuras durante una
partida normal; `debugMode` permite verlas para pruebas.

Las entradas del selector son operables con ratón, Enter o Espacio y exponen su
estado actual a tecnologías de asistencia. `Ir a línea` en depuración encola el
salto dentro del único bucle de juego: no crea una segunda reproducción concurrente.

### `storyPressure`: consecuencias entre capítulos

`storyPressure` es la presión narrativa persistente. `storyDelay` continúa como
alias para no romper capítulos y minijuegos existentes, pero ambos se sincronizan
en `setDelay` y `addDelay`. Cargar el capítulo siguiente ya no borra la presión;
solo **Nueva partida** o elegir un capítulo desde el selector la reinician. El
historial de escenas guarda ambos valores para que retroceder sea determinista.

### Audio de la revisión

- La pista de Zip se movió de efectos a música:
  `assets/audio/music/chapter2/zip's-shadow-waltz.mp3`.
- El capítulo 6 usa dos variaciones de `the-last-choice.mp3` para evitar
  que desenlaces moralmente distintos compartan exactamente la misma entrega:
  `the-last-choice_reprise_luminous.mp3` en el cierre seguro y
  `the-last-choice_reprise_uncertain.mp3` en el cierre que preserva el sueño.
- El sistema de audio elimina de su registro las pistas fallidas o detenidas y
  considera `stopSound` idempotente; cambiar de escena ya no genera falsos avisos
  ni deja IDs que bloqueen una reproducción posterior.
- La clasificación de volumen usa tanto el ID como la ruta: cualquier archivo
  bajo `assets/audio/music/` y los IDs `bg_music`/`music` obedecen al control de
  música aunque sean golpes no repetidos; los archivos bajo `sfx/` siguen el
  control de efectos.

### Validación automática de contenido

Ejecutar antes de una PR:

```powershell
npm run validate:content
```

`scripts/validate_game_content.mjs` comprueba los siete JSON de capítulo y todas
las fichas de personaje; valida acciones y minijuegos conocidos, personajes,
poses de secuencias, destinos de escenas y elecciones, y la existencia de cada
referencia bajo `assets/`, incluida su capitalización exacta. También audita
`character`/`speakingAs`, posiciones y campos obligatorios, IDs/categorías/tipos
de galería, miniaturas, rutas literales de JS/CSS/HTML y exclusiones sensibles
del instalador. El resumen impreso —capítulos,
escenas, líneas, personajes y referencias— es la cifra fiable del estado actual.
La ejecución de cierre de esta revisión terminó sin errores con **7 capítulos,
63 escenas, 908 líneas, 26 personajes y 958 referencias de assets**.
