# 🎮 Visual Novel Engine - Documentación Completa

Un motor de visual novel moderno basado en HTML5, CSS y JavaScript que permite crear historias interactivas mediante archivos JSON simples.

---

## 📖 Tabla de Contenidos

1. [Inicio Rápido](#inicio-rápido)
2. [Características](#características)
3. [Instalación](#instalación)
4. [Estructura de Carpetas](#estructura-de-carpetas)
5. [Cómo Crear Contenido](#cómo-crear-contenido)
6. [Sistema de Diálogos](#sistema-de-diálogos)
7. [Acciones](#acciones)
8. [Sistema de Elecciones](#sistema-de-elecciones)
9. [Sistema de Poses](#sistema-de-poses)
10. [Características Avanzadas - Persona 5](#características-avanzadas---persona-5)
11. [Personalización](#personalización)
12. [Troubleshooting](#troubleshooting)
13. [Funciones Avanzadas](#funciones-avanzadas)
14. [Sistema de Reseteo](#sistema-de-reseteo)
15. [Workflow de Pull Requests](#workflow-de-pull-requests)
16. [App de Escritorio (Electron)](#app-de-escritorio-electron)
17. [Publicar en itch.io](#publicar-en-itchio)

---

## 🚀 Inicio Rápido

### Paso 1: Abre el Proyecto

Como app de escritorio (recomendado):

```bash
npm install
npm start
```

O en el navegador, con un servidor local:

```bash
# Windows
python -m http.server 8000
# Luego abre: http://localhost:8000

# macOS/Linux
python3 -m http.server 8000
```

### Paso 2: Revisa los Ejemplos

Abre `index.html` en tu navegador y haz clic en "Comenzar" para ver los capítulos de ejemplo.

### Paso 3: Crea Tu Primer Capítulo

1. Copia `chapters/chapter1.json`
2. Edita el contenido
3. Carga en `game.js`

---

## ✨ Características

### Motor Base

- ✅ **Diálogos Animados** - Texto que se escribe carácter por carácter
- ✅ **Sistema de Elecciones** - Ramificaciones de historia
- ✅ **Personajes Dinámicos** - Aparecen y desaparecen con poses
- ✅ **Cambio de Fondos** - Escenas con diferentes ambientes
- ✅ **Efectos de Sonido** - Reproducción de audio
- ✅ **Sistema de Guardado** - Partidas automáticas
- ✅ **Variables de Juego** - Seguimiento de estado

### Características Avanzadas (Persona 5 Edition)

- ✅ **Estética Persona 5** - Menús y diálogos estilo P5 Royal
- ✅ **Saltar Texto** - Click durante typing completa línea
- ✅ **Intro Cinematográfica** - Animación al inicio de capítulo
- ✅ **Efectos Visuales** - Partículas, ondas, transiciones
- ✅ **Personajes a Altura Completa** - Sprites 100vh (altura total de pantalla)
- ✅ **Enfoque Dinámico** - Brillo amarillo animado en personaje que habla

### General

- ✅ **Totalmente en JSON** - Sin necesidad de código
- ✅ **Completamente Personalizable** - Estilos y lógica
- ✅ **Ejemplos Incluidos** - Capítulos de demostración

---

## 📦 Instalación

### Requisitos

- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Un servidor local (Python, Node.js, etc.)

### Archivos Necesarios

El proyecto ya incluye todos los archivos necesarios:

```
proyecto/
├── index.html
├── engine.js
├── game.js
├── styles.css
├── characters/
├── chapters/
└── assets/
```

---

## 📁 Estructura de Carpetas

```
proyecto-visual-novel/
│
├── 📄 index.html                 ← Archivo principal
├── 📄 engine.js                  ← Motor (NO MODIFICAR)
├── 📄 game.js                    ← Lógica del juego
├── 📄 styles.css                 ← Estilos CSS
│
├── 📁 characters/                ← Definiciones de personajes
│   ├── luna.json
│   └── alex.json
│
├── 📁 chapters/                  ← Archivos de capítulos
│   ├── chapter0.json
│   ├── chapter1.json
│   ├── chapter2-edu.json
│   ├── chapter2-tony.json
│   ├── chapter2-jose.json
│   └── chapter3.json
│
├── 📁 assets/                    ← Recursos multimedia
│   ├── backgrounds/              ← Fondos (1920x1080 PNG)
│   ├── characters/               ← Sprites (300x600 PNG)
│   └── sounds/                   ← Audio
│
└── 📁 DOCUMENTACION.md           ← Esta documentación
```

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

### 3. Cargar en game.js

En `game.js`, modifica `startNewGame()`:

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
El efecto `surprise` genera una única ola continua repartiendo el desfase entre
la primera y la última letra de la frase, sin reiniciar el ciclo cada 14
caracteres ni formar bloques separados.
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

Cambia la pose de un personaje visible.

```json
{
  "type": "setPose",
  "character": "luna",
  "position": "left",
  "pose": "sad"
}
```

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
      "value": "assets/images/backgrounds/chapter4/despertar_samu.png"
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
      "value": "assets/images/backgrounds/chapter4/despertar_samu.png"
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

Gestionan el **retraso acumulado** (`storyDelay`) del capítulo, un contador que
mide cuánto tiempo ha perdido el jugador según las rutas que elige. `setDelay`
fija el valor; `addDelay` lo incrementa. Se reinicia a 0 al cargar cada capítulo.

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
   en los tres Capítulos 2 para que la trama del virus de IA se destape poco a
   poco: 1º = síntomas/misterio, 2º = es un virus deliberado, 3º = el culpable.

   ```json
   {
     "character": "Edu",
     "text": "Los memes de internet cobraron vida y persiguen a los furros...",
     "byRescueCount": {
       "1": "Los memes de internet cobraron vida y persiguen a los furros...",
       "2": "No es casualidad: es un virus que nos transforma según nuestro avatar.",
       "3": "Es una IA Biológica de Elon Musk. Él empezó todo esto."
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

Los assets del escenario siguen en `assets/images/minigames/chapter3/`:
`aire_fondo_v2.png` y `cables_aire_sheet_v2.png`. Edu usa la revisión V3,
construida a partir del modelo canónico de `assets/images/characters/edu/`: la hoja
`edu_volando_sheet_v3.png` contiene ocho poses de vuelo y
`edu_volando_dash_sheet_v3.png` contiene dos poses específicas de impulso.
Dentro de `sprites/` están los ocho `edu_fly_v3_0.png`…
`edu_fly_v3_7.png` y los dos `edu_fly_v3_dash_*.png`, todos normalizados sobre
lienzos transparentes de `512×512`, con el torso anclado en el mismo punto,
margen seguro y un único componente visual para impedir motas o partes fuera
del sprite. El ciclo de vuelo recorre ocho alturas de ala y el dash alterna sus
dos poses a mayor cadencia.

Los diez frames conservan exactamente los dos bigotes faciales del diseño
canónico: ambos nacen del hocico y el visible termina junto a la
mandíbula/garganta. Se eliminaron la cuña blanca previa y todos los falsos
trazos que nacían detrás de la cabeza o formaban bucles hacia las alas. Las
hojas fuente se reconstruyeron con la misma corrección. El resto de sprites
activos son el cable continuo `aire_cable_v3.png`, `aire_foco_v2.png`,
`aire_altavoz_v2.png` y `partitura_v2.png`. El cable de juego es un único
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

## 🎭 Características Avanzadas - Persona 5

### 1. Estética Persona 5 Royal

El juego incluye un completo rediseño visual inspirado en Persona 5 Royal.

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

La reconstrucción 4K desde `assets/video/menu/menu_loop_old.mp4` es reproducible con
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
         │  [➙ CARGAR             ]  │
         │  [➙ CONFIGURACIÓN      ]  │
         └────────────────────────────┘
```

#### Cuadro de Diálogo (Persona 5 Royal Style)

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
Un capítulo puede marcarse como el final del juego con `"isFinal": true`. Al
terminarlo, el juego vuelve **directamente al menú principal** sin ofrecer la
pantalla "¿Continuar? → Siguiente Capítulo". Los tres Capítulos 3 (rutas de Edu,
Tony y José) lo usan para cerrar la partida correctamente en lugar de saltar de
vuelta a un capítulo numérico anterior.

```json
{
  "title": "Capítulo 3: El Precio de la Lealtad",
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

Solo hay dos posiciones válidas:

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
  "character": "epod",
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
  "character": "epod",
  "position": "right"
},
{
  "type": "showCharacter",
  "character": "nexo",
  "position": "left"  // o "right"
}
]
```

**Nota:** La posición "center" ya no está disponible. Use "left" o "right" para un personaje solo.

### 6. Pantalla de Fin de Capítulo

**Característica:** El último diálogo del capítulo se pausa, esperando tu confirmación. Luego aparece una pantalla cinematográfica con un botón "Continuar" antes de volver al menú.

```
         ════════════════════════════
         FIN DEL CAPÍTULO
         Capítulo 1: El Encuentro
         ════════════════════════════

            [  CONTINUAR  ]
```

**Timeline (Con Pausa):**

1. Llega al último diálogo del capítulo
2. **El diálogo se PAUSA** (espera tu click)
3. Haces click → aparece pantalla de fin con animaciones
4. Título del capítulo se muestra
5. Botón "Continuar" aparece
6. Al hacer clic → vuelve al menú
7. Se resetea todo el estado

**Estados que se Resetean:**

- ✅ Personajes (desaparecen)
- ✅ Fondos (se limpian)
- ✅ Variables de juego
- ✅ Historial
- ✅ Líneas y escenas
- ✅ Tracking de capítulos

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
// En game.js - startNewGame()
const characters = ["luna", "alex", "3c", "epod", "nexo"];
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

### Cambiar Colores Persona 5

Los colores principales del sistema Persona 5 son:

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

### Guardado Automático

El juego guarda automáticamente cada 10 líneas. Para acceder:

1. Abre DevTools (F12)
2. Ve a Application → localStorage
3. Ve la clave `gameState`

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
  "nextScene": 1 // Va a escena 2 (0-indexed)
}
```

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

## 🔄 Sistema de Reseteo

### ¿Qué se Resetea?

Cuando terminas un capítulo y vuelves al menú, el motor limpia completamente el estado:

**Visual:**

- ❌ Todos los personajes desaparecen
- ❌ Fondo se limpia
- ❌ Diálogos y elecciones se ocultan

**Lógico:**

- ❌ Variables del juego se borran (`gameState`)
- ❌ Historial de elecciones se borra
- ❌ Posición de línea/escena se resetea
- ❌ Tracking de capítulos anterior se olvida

**Comportamiento:**

1. Muestra pantalla "Fin del Capítulo".
2. Espera a que hagas clic en "Continuar".
3. Llama a `engine.reset()`.
4. Vuelve al menú principal.
5. Deja el estado limpio para un nuevo capítulo.

### Método reset() - Detalles Técnicos

```javascript
class VisualNovelEngine {
reset() {
    // Variables de progreso
    this.currentScene = 0;        // Escena 1
    this.currentLine = 0;         // Primera línea
    this.gameState = {};          // Vaciar variables
    this.history = [];            // Vaciar historial
    this.lastChapterName = null;  // Olvidar capítulo anterior

    // Limpiar UI
    this.hideDialog();            // Ocultar cuadro de diálogo

    // Limpiar personajes
    document.getElementById('character-left').classList.remove('active');
    document.getElementById('character-right').classList.remove('active');
    document.getElementById('character-center').classList.remove('active');

    // Limpiar fondo
    document.getElementById('background').style.backgroundImage = '';

    // Limpiar elecciones
    document.getElementById('choices-container').innerHTML = '';
}
}
```

### Pantalla de Fin de Capítulo

```
ANTES (Automático):
└─ Fin del capítulo → Vuelve al menú (sin transición)

DESPUÉS (Mejorado):
└─ Último diálogo PAUSADO → Espera click → Pantalla de fin → Click "Continuar" → Vuelve al menú
```

**Flujo Completo en playGame():**

```javascript
async function playGame() {
  while (isGameRunning) {
    const hasMoreContent = await engine.nextLine();

    if (!hasMoreContent) {
      // ← AQUÍ: El último diálogo está mostrado y espera click
      if (engine.isWaitingForInput) {
        await waitForClick(); // Espera confirmación del usuario
      }
      endGame(); // Luego aparece pantalla de fin
      break;
    }

    if (!engine.isWaitingForInput) continue;
    await waitForClick();
  }
}
```

**Función endGame():**

```javascript
async function endGame() {
  // 1. Ocultar diálogo anterior
  engine.hideDialog();

  // 2. Mostrar pantalla de fin cinematográfica
  const chapterTitle = engine.currentChapter?.title;
  await engine.showChapterEnd(chapterTitle);

  // 3. Resetear todo
  engine.reset();

  // 4. Mostrar menú
  mainMenu.classList.remove("hidden");
}
```

### Ejemplo Práctico

**Capítulo 1 (No resetea variables):**

```
Línea 1: Hablas con Luna → relationship = 5
Línea 2: Eliges opción → relationship = 10
Fin del capítulo → showChapterEnd()
Click "Continuar" → engine.reset()
```

**Capítulo 2 (Comienza limpio):**

```
Línea 1: Luna no recuerda nada (relationship = 0)
Empieza de cero
```

### Por qué es Importante

✅ **Evita Bugs:** Cada capítulo es independiente
✅ **Limpio:** No se acumulan datos
✅ **Predecible:** Siempre el mismo punto de partida
✅ **Profesional:** Como los juegos reales
✅ **Mejor UX:** Pantalla de transición visual

### Para Preservar Estado Entre Capítulos

Si QUIERES que las variables persistan entre capítulos, guarda en `localStorage`:

```javascript
// Al final del capítulo, en endGame():
localStorage.setItem("persistentState", JSON.stringify(engine.gameState));

// Al empezar nuevo capítulo:
const saved = localStorage.getItem("persistentState");
if (saved) engine.gameState = JSON.parse(saved);
```

---

## 🎬 Sistema de Capítulos Múltiples

### ¿Cómo Funciona?

El juego soporta múltiples capítulos en secuencia. Cuando terminas un capítulo, el juego automáticamente detecta si existe el siguiente.

```
Chapter0 → Chapter1 → Chapter2 → (fin de juego)
  ↓          ↓          ↓
 Intro     Principal   Conclusión
```

### Crear Nuevos Capítulos

1. **Crea el archivo JSON:**

```
chapters/chapter3.json
```

2. **Estructura básica:**

```json
{
  "title": "Capítulo 3: El Viaje",
  "scenes": [
    {
      "title": "Escena 1",
      "lines": [
        {
          "_line": 0,
          "character": "Luna",
          "text": "Continuamos nuestra aventura..."
        }
      ]
    }
  ]
}
```

3. **El juego lo cargará automáticamente** cuando termine chapter2

### Estructura de Archivos

```
chapters/
├── chapter0.json       ← Prólogo (opcional)
├── chapter1.json       ← Capítulo 1: Decisiones
├── chapter2-edu.json   ← Capítulo 2: Kingdom Ketchup (ruta de Edu)
├── chapter2-tony.json  ← Capítulo 2: Ecchi Land (ruta de Tony)
├── chapter2-jose.json  ← Capítulo 2: Ciudad Paloma (ruta de José)
└── chapter3.json       ← Capítulo 3: El Precio de la Lealtad (desenlace)
└── chapter99.json   ← Puedes tener muchos
```

### Flujo de Progresión

```
1. Usuario hace clic en "Comenzar"
2. Se carga chapter0 (prólogo)
3. Al terminar → Se carga chapter1 (decisiones iniciales)
4. En chapter1 elige al primer rescatado → Se abre la ruta chapter2-<personaje>
5. Completa chapter2-edu, chapter2-tony o chapter2-jose según elección
6. Al terminar chapter2 → Se carga chapter3 (desenlace final)
7. Muestra "Fin del Juego" → Menú Principal
```

### Pantalla de Continuación

Cuando terminas un capítulo, aparece:

```
         ¿CONTINUAR?

    [Siguiente Capítulo] [Menú Principal]
```

El jugador elige si desea:

- **Siguiente Capítulo:** Carga automáticamente el próximo
- **Menú Principal:** Vuelve al menú (puede recargar desde "Cargar")

### Persisten Variables Entre Capítulos

**IMPORTANTE:** Por defecto, las variables se resetean entre capítulos. Si quieres que persistan:

```javascript
// En game.js, antes de playChapter():
const persistedVariables = localStorage.getItem("persistentState");
if (persistedVariables) {
  engine.gameState = JSON.parse(persistedVariables);
}

// Después de endGame():
localStorage.setItem("persistentState", JSON.stringify(engine.gameState));
```

### Estructura de Capítulos Actual

**chapter0.json - Prólogo:**

- Introducción a Furrielva
- Presentación de 3C como narrador

**chapter1.json - Capítulo 1: Decisiones:**

- Los amigos necesitan ayuda en Furrielva
- Samu decide a quién rescatar primero (elección dinámica)
- Rutas ramificadas según la decisión

**chapter2-edu.json - Capítulo 2: Kingdom Ketchup:**

- Samu busca a Edu en el supermercado
- Elige ruta entre las parodias ficticias El Jarrón, Noche o Mercaguasa
- Los tres fondos conservan sus nombres de archivo heredados (`jamon.png`,
  `dia.png` y `mercadona.png`), pero muestran marcas completamente ficticias.
  Comparten el acabado anime cinematográfico, la luz cálida de las 16:00 y la
  dirección artística de `assets/cutscenes/chapter3/opening_samu_sources/storyboard/`.
- Batalla contra Micaela Michis (minigame gatos)
- Micaela presenta la persecución y cierra la ruta con un mitin político absurdo
  a favor de los gatos: cajas de cartón por decreto, atún subvencionado,
  vivienda protegida en sofás y un Ministerio del Ovillo.
- Los secundarios Micaela Michis y Neit usan retratos cartoon con contorno limpio,
  color plano y sombreado cel, alineados con el estilo de los protagonistas. Sus
  recursos están en `assets/images/characters/others/micaela*.png` y
  `assets/images/characters/others/neit.png`.
- Rescate de Edu y batalla contra Zip (minigame ketchup)
- Descubrimiento del concierto de Seraphyna en Ecchi Land
- Llamadas telefónicas opcionales

**chapter2-tony.json - Capítulo 2: Ecchi Land:**

- Ruta paralela de Samu rescatando a Tony
- Aventuras en Ecchi Land

**chapter2-jose.json - Capítulo 2: Ciudad Paloma:**

- Ruta paralela de Samu rescatando a José
- Aventuras en Ciudad Paloma

**chapter3.json - Capítulo 3: El Precio de la Lealtad:**

- Desenlace final basado en quién fue rescatado primero
- Resolución de la trama principal con variantes según ruta

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

Los 24 planos de `assets/cutscenes/chapter3/opening_samu_sources/frames_generated/` tienen una restauración no
destructiva en `assets/cutscenes/chapter3/opening_samu_sources/frames_4k/`. Todos conservan el nombre
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
canónico de `assets/images/characters/samu/Samu.png`: base topo, zonas gris crema,
parches marrón oscuro, nariz naranja y gorguera blanca ribeteada en rojo. Los
originales y la antigua ampliación `nuevos_frames_x2/` permanecen intactos.

El montaje reconstruido se entrega en
`assets/cutscenes/chapter3/opening_tony/opening_tony.mp4`. Es un H.264 de
`3840×2160` a 30 FPS y 117,6 segundos que utiliza directamente los 24 planos
restaurados, conserva el audio AAC del opening original y reproduce sus zooms,
fundidos, fogonazos blancos y pausa negra final. Las variantes anteriores se
conservan en la misma carpeta como `opening_tony_old.mp4` y
`opening_tony_old_v2.mp4`; el archivo activo queda por debajo de 100 MB.

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

_Última actualización: 2026-08-02_

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
- La plaza de Furrielva usa `iglesia_furrielva_v2_4k.png`, una regeneración
  3840x2160 del fondo original. Conserva iglesia, mercado, fuente y todos los
  grupos de animales, con rostros, anatomía, perspectiva y rótulos corregidos.
- Samu llega a la fachada, conoce al Ketchling de seguridad y descubre que Edu
  no responde. El tapón dorado pasa a ser una entrada explícita, no una
  casualidad del guion.
- Se conservan las rutas ficticias de Noche, Mercaguasa y El Jarrón, incluido
  el minijuego de gatos y el mitin de Micaela Michis. Sus diferencias de
  `storyDelay` siguen escalando la dificultad.
- El gag del tapón dorado tiene tres golpes: Samu celebra haber encontrado uno
  único, descubre que todo el expositor está lleno y, al reaparecer ante la
  puerta, protesta porque todos los envases llevaban el mismo tapón. Los
  Ketchlings responden que nunca dijeron lo contrario y aclaran que todas las
  botellas oficiales cumplen el requisito.
- Al girar el tapón, una botella gigantesca de luz aparece de la nada en el
  pasillo del supermercado y su cristal se abre como portal hacia la fábrica.
  El expositor, la activación del portal y la llegada al interior se enlazan con
  CG precargados y fundidos a negro; los saltos de escena viven en líneas de
  acción separadas para no omitir diálogos ni solapar dos ilustraciones 4K.
- Los pasillos Ketchup y Catsup usan
  `assets/images/backgrounds/chapter2/kingdom_ketchup/kingdom_ketchup_pasillos_v2_4k.png` (3840x2160). El fondo
  conserva la composición simétrica y los tres rótulos, pero sustituye todos
  los envases con silueta de marca real por la botella ficticia canónica: cuerpo
  alto, tapón-corona dorado y etiqueta crema con corona y tomate.
- La zona de estanterías y cajas de Neit usa
  `assets/images/backgrounds/chapter2/kingdom_ketchup/kingdom_ketchup_estanterias_v2_4k.png` (3840x2160). Las
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
  `assets/images/backgrounds/chapter2/kingdom_ketchup/kingdom_ketchup_trono_video_final_4k.png`,
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
  `assets/images/characters/edu/edu_picante_wide_transparent.png`: conserva las
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
  bullet hell cambia con fundido a `assets/audio/sfx/zip's-shadow-waltz.mp3`, la
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

**Secciones principales:**

- ✅ Características Avanzadas - Persona 5
- ✅ Personalización de estilos P5
- ✅ Troubleshooting actualizado
- ✅ Ejemplos de uso

### Regreso al menú principal (2026-07-31)

Al abandonar una partida desde el menú de pausa, `volverAlMenuPrincipal()` usa
`setMainMenuVisible(true)` para retirar tanto `hidden` como `inert`. Así, los
botones **Comenzar**, **Capítulos** y **Configuración** recuperan su interacción.

### Opening a pantalla completa (2026-07-31)

El vídeo de arranque se ajusta al escenario con `object-fit: contain`, conservando
su proporción y mostrando todos los planos completos, sin ampliarlos ni recortarlos.

### Fondo del baño del capítulo 1 (2026-07-31)

`assets/images/backgrounds/chapter1/bathroom.png` conserva el encuadre panorámico y la orientación
del fondo jugable —lavabo a la izquierda, ducha al fondo y espejo a la derecha—,
pero adopta el acabado anime, la luz cálida y la paleta de la cinemática
`assets/cutscenes/chapter3/opening_samu_sources/storyboard/7.png`. El espejo izquierdo tiene un marco y un
reflejo espacialmente coherentes, mientras que el espejo derecho tiene el marco
completo y cerrado dentro del encuadre y representa el diseño vigente de
`samu_surprised.png`.

### Organización canónica de assets y música del capítulo 2 (2026-08-01)

La carpeta `assets/` queda organizada por familia y después por capítulo o
función. Las rutas antiguas `assets/sounds/`, `assets/backgrounds/`,
`assets/characters/`, `assets/minigames/`, `assets/ui/`, `assets/videos/` y
`assets/generated/` ya no deben volver a utilizarse.

```text
assets/
├── audio/
│   ├── music/{chapter0..chapter6,menu,minigames,shared,legacy}/
│   └── sfx/
├── images/
│   ├── backgrounds/{chapter0..chapter6,shared,legacy}/
│   ├── cg/{chapter2,chapter3}/
│   ├── characters/
│   ├── minigames/{chapter2,chapter3,shared}/
│   └── ui/
├── cutscenes/{chapter2,chapter3}/
├── video/{cutscenes,menu}/
├── fonts/
└── metadata/
```

Los ficheros no conectados se conservan bajo `legacy/` para evitar perder
material original, pero ninguna escena activa debe depender de ellos. Los
recursos de Kingdom Ketchup que estaban en `generated/chapter2_v2` se integran
en sus categorías definitivas y
`assets/metadata/chapter2_v2_manifest.json` guarda el catálogo actualizado.

La antigua `huelva.mp3` se conserva como
`assets/audio/music/legacy/huelva_original.mp3`, pero ya no se reproduce. El
capítulo 2 utiliza estas variaciones:

- Escena 1: `furrielva_despierta.mp3`.
- Escenas 1B, 1C y 1D: `el_rastro_del_tapon.mp3`.
- Escenas 1.5, 2, 3 y 4: `tres_rutas_por_furrielva.mp3`; el minijuego de gatos
  sigue intercalando `te-comprometes.mp3` y después recupera esta pista.
- Escenas 4.5, 4.6 y 4.7: `el_tapon_dorado.mp3`.
- Escenas 5 a 9: `kingdomketchup.mp3`, con los cambios ya existentes a
  `zip.mp3` y `ketchup.mp3`.
- Escena 10: `de_vuelta_en_furrielva.mp3`.

Cada escena declara su música en la primera línea. `playSound()` evita reiniciar
una pista cuando coinciden ruta e ID, por lo que las escenas consecutivas
mantienen continuidad y los saltos directos desde el selector nunca quedan en
silencio. Las nueve pistas activas del capítulo se han validado como MP3 estéreo;
el registro de audio descarta ahora las pistas detenidas o fallidas de inmediato,
evitando silencios intermitentes al cambiar rápidamente de música.

### Controles globales, HUD y pausa real (2026-08-01)

- **Clic izquierdo**, **Espacio** o **Intro** completan la escritura en curso o
  avanzan al diálogo siguiente. Espacio e Intro no actúan durante elecciones,
  minijuegos ni cinemáticas.
- **H** o **clic derecho** alternan todo el HUD: botones superiores,
  indicadores e instrucciones de minijuegos y el cuadro de diálogo. El clic
  derecho nunca completa ni avanza una línea.
- **Esc** abre una pausa global durante diálogos y minijuegos. Se congelan el
  reloj lógico, `setTimeout`, `setInterval`, `requestAnimationFrame`, las
  animaciones CSS, los elementos multimedia y los contextos Web Audio que
  estuvieran sonando. Al reanudar, cada recurso continúa desde el mismo punto.
- Mientras la pausa está abierta, los eventos de teclado, puntero, rueda y
  toque quedan bloqueados antes de llegar a la partida; solo el panel de pausa
  conserva interacción. En una cinemática, Esc mantiene su función de saltarla.
- El retrato de **Neit** tiene un anclaje vertical propio de `28px` hacia abajo,
  para que apoye visualmente sobre el escenario sin cambiar su escala.
- Las animaciones emocionales heredan el color legible del personaje que habla.
  Las marcas OMG, CLos, Incel y Simsong conservan sus colores corporativos dentro
  de las frases animadas.
- El nombre CSS `blue` se representa como `#4da3ff`: mantiene un azul saturado y
  legible sobre el bocadillo oscuro, sin el aclarado lavanda anterior.

### Cursor-retrato del hablante (2026-08-01)

El encabezado del bocadillo incluye `#speaker-cursor`, colocado inmediatamente a
la derecha del nombre. Su marco original vive en
`assets/images/ui/dialogue_speaker_cursor.png`; el centro utiliza la imagen de la
pose activa del personaje o su pose predeterminada cuando habla fuera de plano.
Durante la escritura, un `dialog-print-anchor` se inserta después de cada grafema:
el marco sale del encabezado, sigue la punta del texto incluso al cambiar de línea
y regresa a su hueco fijo en 280 ms cuando termina la frase. Al esperar avance
cambia a `speaker-cursor-wait`. `prefers-reduced-motion` conserva el retrato en
su posición de reposo. Los nombres misteriosos sin ficha muestran `?` y nunca
reutilizan el retrato anterior.

Samu utiliza siempre su retrato furry en el marco. Edu, Tony y José usan sus
ilustraciones de `characters/humans/` hasta la revelación narrativa de cada
identidad. Los umbrales son: capítulo 2, escena 16, línea 4 para Edu; capítulo 3,
escena 13, línea 5 para Tony; y capítulo 4, escena 2, línea 4 para José. Se
calculan desde capítulo/escena/línea para que también funcionen al entrar desde
el selector de escenas.
`speakingAs` solo decide qué elemento del escenario se ilumina: el color y el
cursor siguen la identidad escrita en `line.character`, de modo que una llamada
de Edu muestra a Edu y no al teléfono.

El recorte interno utiliza las variables CSS `--cursor-portrait-size` y
`--cursor-portrait-position`. El zoom general es `100% auto`, dejando margen
para mostrar completas orejas, pelo, cuernos y sombreros. Paloma,
Santi en su pose neutral, Tralalero Tralala, Tung Tung Tung Sahur, Gorila y Airi
adulta tienen encuadres propios porque sus lienzos sitúan la cabeza fuera del
centro. El cursor copia también `data-pose`, evitando aplicar la corrección
neutral de Santi a sus demás composiciones. Las versiones humanas conservan un
recorte independiente al `170%` sobre el primer plano de la derecha. Edu humano
tiene además un foco vertical propio (`100% 19%`) porque su hoja deja más espacio
superior y el encuadre compartido situaba su cara demasiado abajo.
José humano usa `100% 20%` por el mismo motivo, manteniendo su pelo completo y
centrando los ojos dentro del marco.
Tung Tung Tung Sahur usa el foco horizontal `80%` para centrar sus ojos y rostro
sin modificar su zoom de `145%`.
En el escenario usa una escala exclusiva del `150%` y un desplazamiento vertical
del `38%`. La compensación mantiene la cabeza dentro del encuadre mientras el
cuadro de diálogo cubre las piernas, de modo que en conversación se muestra como
un plano de cintura y no como una figura de cuerpo entero alejada.
El recurso `assets/images/characters/tung_tung_tung_sahur.png` conserva el cuerpo,
rostro, capa, brazos y bate completos; el medio plano se obtiene sin recortar el
PNG, únicamente mediante escala y posición en el motor.
Micaela Michis utiliza `145%` y `50% 4%` para mostrar el grupo completo y evitar que
las cabezas queden pegadas al borde superior del marco.
Su pose `crazy`, cuya cabeza aparece debajo del gato y de los brazos levantados,
usa un recorte independiente de `130%` y `50% 55%` centrado en su cara.

Las variantes de Ketchling se resuelven mediante alias hacia una sola ficha, y
las fichas secundarias se precargan al comenzar para evitar cambios tardíos de
color o retrato. En las marcas de hardware, Incel conserva `#4da3ff` y Simsong
usa el azul oscuro `#285bc4`, diferenciándose dentro del mismo diálogo.

### Emblema canónico de la camiseta de Edu (2026-08-02)

El icono oficial de la camiseta de Edu es
`assets/images/others/kingom-souls.png`: una corona dorada sobre un corazón azul
facetado. Se ha unificado en las imágenes activas donde la camiseta resulta
visible, incluidos fondos y CG de los capítulos 2, 3, 4 y 6, la ilustración
humana, los retratos del teléfono y Mario Kart, y los frames y hojas V3 de vuelo
de `assets/images/minigames/chapter3/`.

Las composiciones conservan el encuadre y la resolución. La CG 4K mantiene
`3840×2560`. Los diez frames activos de Eduvuelo V3 se regeneraron con un acabado
cel-shading coherente, el emblema integrado en perspectiva y las fases originales
de aleteo e impulso. Conservan sus nombres `edu_fly_v3_*`, sus lienzos PNG
transparentes de `512×512` y la oclusión natural del brazo sobre la camiseta. Las
hojas `edu_volando_sheet_v3.png` y `edu_volando_dash_sheet_v3.png` se reconstruyen
desde esos mismos frames en `1774×887`. Las variantes V1/V2 no forman parte del
motor activo de Eduvuelo y permanecen como legado.

### Selector de escenas sin desplazamiento del escenario (2026-08-02)

Al abrir **Escenas**, la entrada actual se centra desplazando solo
`.scenes-list`. No se usa `scrollIntoView()`, porque Chrome podía aplicarlo también
a los contenedores del escenario y mover hacia arriba todo el contenido del
juego. El selector conserva su desplazamiento interno sin alterar la posición
del escenario 16:9.

### Caída anime de Edu por la batería de Samu (2026-08-02)

En la escena final del capítulo 2, justo al terminar de mostrarse «¡Oh, no! Me he
quedado sin batería. Esto me pasa por actualizar las apps.», Edu reacciona con
una caída vertical de anime:
baja recto con líneas cinéticas hasta salir completamente por el borde inferior,
permanece un instante fuera del plano y regresa por la misma trayectoria. No hay
rotación, cambio de escala, compresión ni rebote. La acción reutilizable
`characterAnimeFall` se declara en `afterActions`, se ejecuta sin bloquear la
espera del diálogo y acepta `delay`, `duration`, `sound` y `volume`. Las acciones
de `afterActions` también se sincronizan si el jugador completa el texto con un
clic o utiliza el avance rápido.

El sonido original `assets/audio/sfx/sfx_caida_anime_edu.wav` sincroniza un
silbido descendente, un golpe grave fuera de plano y un aire ascendente suave
durante el regreso, sin sonido de rebote. La caída incluye una sacudida breve de
pantalla en el impacto y respeta
`prefers-reduced-motion` con una versión visual abreviada.

### Gag de Fisuras 2 en Kingdom Ketchup (2026-08-02)

Tras liberar a Edu y antes de abandonar Kingdom Ketchup, Samu le pregunta por
qué el reino utiliza portales. Edu explica que le gusta **Fisuras 2 de Stim**;
durante su respuesta Samu cambia a la pose `shocked` y, al recuperar la palabra,
corta el asunto con «Bueno, cambiando de tema...» antes de retomar la búsqueda de
Tony y José.

### Iconos neón del menú de Configuración (2026-08-03)

Las pestañas **Vídeo**, **Sonido** y **Trucos** ya no utilizan emojis del sistema.
`settingsMarkup()` carga iconos PNG RGBA propios desde
`assets/images/ui/settings/`: `video-neon.png`, `sound-neon.png` y
`cheats-neon.png`. Los tres recursos usan un lenguaje cyber-neón común en cian,
violeta y oro, tienen lienzo transparente de `128×128` y se muestran a `28×28`.

Los iconos son decorativos (`alt=""` y `aria-hidden="true"`), por lo que el nombre
de texto de cada pestaña continúa siendo su etiqueta accesible. Los estados
normal, hover y activo ajustan opacidad, saturación, escala y resplandor sin
alterar la lógica compartida entre Configuración y el menú de pausa.

### Retratos cartoon de la investigación de Furry Maps (2026-08-03)

Los tres informantes activos del minijuego `furrielvaExplore` se han redibujado
con el acabado cartoon 2D del resto del reparto: contorno negro limpio, formas de
pelaje simplificadas, colores planos y cel-shading de dos tonos. Se conservan
identidad, especie, expresión, vestuario, pose y utilería narrativa: el paquete
de Tadeo Trufa, el lector y portapapeles de Lía Lince, y la llave, el plano y el
cinturón de herramientas de Rulo Mapache.

Los archivos activos mantienen sus nombres, lienzo RGBA transparente y tamaño
`965×1630`: `assets/images/characters/furrielva/tadeo_trufa_v1.png`,
`lia_lince_v1.png` y `rulo_mapache_v1.png`. Al conservar rutas y dimensiones no
ha sido necesario modificar `engine.js`; las tres escenas siguen usando el mismo
encuadre, precarga y lógica de diálogo.

### Sprites de carrera de Samu sin halo blanco (2026-08-03)

Los nueve fotogramas de carrera y el atlas `todos.png` en
`assets/images/characters/samu/run/` conservan su transparencia y sus poses, con
el halo blanco semitransparente descontaminado y el canal alfa contraído un
píxel. Así se elimina también la última línea clara exterior y los sprites se
integran sobre fondos de cualquier color sin un perfil blanco.
