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

---

## 🚀 Inicio Rápido

### Paso 1: Abre el Proyecto

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
│   └── chapter2.json
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
    "neutral": "assets/characters/miPersonaje.png",
    "happy": "assets/characters/miPersonaje_happy.png",
    "sad": "assets/characters/miPersonaje_sad.png",
    "angry": "assets/characters/miPersonaje_angry.png",
    "surprised": "assets/characters/miPersonaje_surprised.png"
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
              "value": "assets/backgrounds/cafe.png"
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
    mainMenu.classList.add('hidden');
    isGameRunning = true;

    await engine.loadChapter('chapter1');
    await engine.loadCharacter('luna');

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
```

### Elementos de una Línea

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `_line` | número | No* | Número de línea (para referencia) |
| `character` | string | Sí | Nombre del personaje |
| `text` | string | Sí | Texto del diálogo |
| `actions` | array | No | Acciones a ejecutar |
| `choices` | array | No | Opciones para el usuario |

*No es obligatorio, pero se recomienda para debugging.

---

## ⚙️ Acciones

### setBackground
Cambia el fondo de la escena.

```json
{
  "type": "setBackground",
  "value": "assets/backgrounds/cafe.png"
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

### hideCharacter
Oculta un personaje.

```json
{
  "type": "hideCharacter",
  "character": "luna"
}
```

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

### playSound
Reproduce un archivo de audio con opciones avanzadas.

**Formato Simple:**
```json
{
  "type": "playSound",
  "value": "assets/sounds/bell.mp3"
}
```

**Formato Avanzado:**
```json
{
  "type": "playSound",
  "path": "assets/sounds/music.mp3",
  "volume": 0.8,
  "loop": true
}
```

**Parámetros:**
- `path` o `value`: Ruta del archivo de audio
- `volume`: Volumen (0.0 a 1.0, por defecto 1.0)
- `loop`: Si se repite en bucle (por defecto false)
- `autoPlay`: Si se inicia automáticamente (por defecto true)

**Ejemplos:**

Música de fondo (baja, en bucle):
```json
{
  "type": "playSound",
  "path": "assets/sounds/ambient.mp3",
  "volume": 0.5,
  "loop": true
}
```

Efecto de sonido (volumen máximo):
```json
{
  "type": "playSound",
  "path": "assets/sounds/sword.mp3",
  "volume": 1.0
}
```

Sonido silencioso:
```json
{
  "type": "playSound",
  "path": "assets/sounds/whisper.mp3",
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

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `text` | string | Texto del botón |
| `nextLine` | número | Línea dentro de la misma escena |
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
    "neutral": "assets/characters/luna.png",
    "happy": "assets/characters/luna_happy.png",
    "sad": "assets/characters/luna_sad.png",
    "angry": "assets/characters/luna_angry.png",
    "surprised": "assets/characters/luna_surprised.png"
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

Coloca tus archivos de audio en `assets/sounds/`:

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
  "value": "assets/sounds/effects/bell.mp3"
}
```

#### 2. Música de Fondo (En Bucle)
```json
{
  "type": "playSound",
  "path": "assets/sounds/music/ambient.mp3",
  "volume": 0.5,
  "loop": true
}
```

#### 3. Efecto de Sonido (Volumen Alto)
```json
{
  "type": "playSound",
  "path": "assets/sounds/effects/sword.mp3",
  "volume": 1.0
}
```

#### 4. Sonido Silencioso (Whisper)
```json
{
  "type": "playSound",
  "path": "assets/sounds/voices/whisper.mp3",
  "volume": 0.3
}
```

### Ejemplo Completo en Capítulo

```json
{
  "_line": 1,
  "character": "Narrador",
  "text": "Una mañana tranquila en el café...",
  "actions": [
    {
      "type": "setBackground",
      "value": "assets/backgrounds/cafe.png"
    },
    {
      "type": "playSound",
      "path": "assets/sounds/music/ambient.mp3",
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
      "path": "assets/sounds/effects/bell.mp3",
      "volume": 1.0
    }
  ]
}
```

### Parámetros de Sonido

| Parámetro | Descripción | Rango | Por Defecto |
|-----------|-------------|-------|------------|
| `path` o `value` | Ruta del archivo de audio | string | requerido |
| `volume` | Volumen del sonido | 0.0 - 1.0 | 1.0 |
| `loop` | Repetir en bucle | boolean | false |
| `autoPlay` | Iniciar automáticamente | boolean | true |
| `id` | ID único para controlar después | string | null |
| `fadeIn` | Fade in en milisegundos | number | 0 |

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
{
  "_line": 1,
  "character": "Narrador",
  "text": "Una mañana tranquila...",
  "actions": [
    {
      "type": "playSound",
      "path": "assets/sounds/music/ambient.mp3",
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
      "path": "assets/sounds/effects/alarm.mp3",
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
    dialogText.textContent = text;  // Mostrar todo al instante
    document.removeEventListener('click', skipHandler);
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

**Personalización:**
```javascript
// En engine.js - playChapterIntro()
setTimeout(() => {
    chapterOverlay.classList.add('fade-out');
}, 2000);  // Cambiar duración aquí
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
p5Effects.playSound('select');
p5Effects.playSound('confirm');
```

**Acceso desde game.js:**
```javascript
// Después de una elección importante
p5Effects.shockwave(400, 300);
p5Effects.createParticles(400, 300, 12, '#ff1744');
```

### 5. Tamaños de Personaje Optimizados

**Cambio de Dimensiones:**
- Antes: 300x600px (pequeños)
- Después: **100vh (altura completa de pantalla)**

Los personajes ahora ocupan toda la altura de la pantalla para máximo impacto visual.

**Posiciones Disponibles:**

Solo hay dos posiciones válidas:

```json
// Personaje a la izquierda
{
  "type": "showCharacter",
  "character": "2b",
  "position": "left",
  "pose": "neutral"
}

// Personaje a la derecha
{
  "type": "showCharacter",
  "character": "pod",
  "position": "right",
  "pose": "neutral"
}
```

**Uso en Capítulos:**
```json
// Dos personajes (lado a lado, altura completa)
{
  "type": "showCharacter",
  "character": "2b",
  "position": "left"
},
{
  "type": "showCharacter",
  "character": "pod",
  "position": "right"
}

// Un personaje
{
  "type": "showCharacter",
  "character": "emil",
  "position": "left"  // o "right"
}
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
    font-size: 48px;  /* Tamaño del título */
    color: #ffcc00;   /* Color */
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
    0%, 100% {
        filter: drop-shadow(0 0 20px rgba(255, 204, 0, 0.8));  /* Cambiar #ffcc00 */
    }
    50% {
        filter: drop-shadow(0 0 30px rgba(255, 204, 0, 1));
    }
}
```

Para cambiar la velocidad (más rápido/lento):
```css
.character.speaking {
    animation: speaking-glow 0.6s ease-in-out infinite;  /* Cambiar 0.6s */
}
```

### 8. Carga Automática de Personajes

Se cargan todos los personajes disponibles al inicio:

```javascript
// En game.js - startNewGame()
const characters = ['luna', 'alex', '2b', 'pod', 'emil'];
for (const character of characters) {
    await engine.loadCharacter(character);
}
```

**Para agregar nuevo personaje:**
1. Crea `characters/nuevo.json`
2. Agrega imagen: `assets/characters/nuevo.png`
3. Agrega a array en game.js

---

## 🎨 Personalización

### Cambiar Colores Persona 5

Los colores principales del sistema Persona 5 son:

```css
/* Color Amarillo Primario */
--color-primary: #ffcc00;

/* Color Rojo Secundario */
--color-secondary: #ff1744;

/* Color Fondo */
--color-dark: #000000;
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
this.typingSpeed = 50;  // Milisegundos por carácter
// Más rápido: 20
// Normal: 50 (por defecto)
// Más lento: 100
```

**Nota:** Los usuarios pueden saltarse el texto completo haciendo clic durante el typing, así que esta velocidad solo afecta a quienes esperen el efecto completo.

### Tamaño de Personajes

En `styles.css`, los personajes ahora ocupan toda la altura:

```css
.character {
    height: 100vh;  ← Altura completa de pantalla
    width: auto;    ← Ancho automático según proporción
}
```

**Tamaños actuales:**
- Altura: 100vh (altura completa de ventana)
- Ancho: automático (mantiene proporción)
- Posición: left (0) o right (0)

**Posiciones disponibles:**

| Posición | CSS | Uso |
|----------|-----|-----|
| `left` | Esquina inferior izquierda | Personaje izquierdo |
| `right` | Esquina inferior derecha | Personaje derecho |
| `center` | Centro inferior | Personaje solo |

**Ejemplo en JSON:**
```json
{
  "type": "showCharacter",
  "character": "luna",
  "position": "center"  // Nueva opción
}
```

### Tamaño de Fondos

Los fondos se ajustan automáticamente al viewport, pero si quieres cambiar las dimensiones esperadas:

```css
.background {
    background-size: cover;  ← Cubre toda la pantalla
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
2. Verifica: assets/characters/luna.png existe
3. En JSON: "character": "luna" (minúscula)
```

### Los fondos no cambian

**Causas:**
1. Ruta incorrecta
2. Imagen no existe
3. JSON mal formado

**Solución:**
```json
❌ "value": "backgrounds/cafe.png"
✅ "value": "assets/backgrounds/cafe.png"
```

### Las elecciones no funcionan

**Causas:**
1. `nextLine` o `nextScene` incorrecto
2. Línea/escena no existe
3. JSON inválido (falta coma)

**Solución:**
```javascript
// En DevTools:
engine.currentScene  // Escena actual
engine.currentLine   // Línea actual
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
border: 3px solid #ffcc00;
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
engine.gameState.luna_relationship  // 10
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
  "nextScene": 1  // Va a escena 2 (0-indexed)
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
```

Los números se reinician por escena y facilitan debugging.

---

## 🛠️ API de Engine

```javascript
// Cargar recursos
engine.loadChapter(name)      // Carga un capítulo
engine.loadCharacter(name)    // Carga un personaje

// Información actual
engine.currentScene           // Escena actual (número)
engine.currentLine            // Línea actual (número)
engine.gameState              // Variables del juego

// Control manual
engine.setBackground(path)    // Cambiar fondo
engine.showCharacter(name, pos, pose)  // Mostrar personaje
engine.hideCharacter(name)    // Ocultar personaje
engine.setPose(name, pos, pose)  // Cambiar pose
engine.playSound(path)        // Reproducir audio

// Estado
engine.isWaitingForInput      // Esperando click
engine.history                // Historial de opciones
```

---

## 📊 Ejemplo Completo

### Character: `characters/luna.json`

```json
{
  "name": "Luna",
  "color": "#ff69b4",
  "poses": {
    "neutral": "assets/characters/luna.png",
    "happy": "assets/characters/luna_happy.png",
    "sad": "assets/characters/luna_sad.png"
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
              "value": "assets/backgrounds/cafe.png"
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
    mainMenu.classList.add('hidden');
    isGameRunning = true;

    await engine.loadChapter('chapter1');
    await engine.loadCharacter('luna');

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
```javascript
// Cuando termina un capítulo:
1. Muestra pantalla "Fin del Capítulo"
2. Espera a que hagas click en "Continuar"
3. Llamadas a engine.reset()
4. Vuelve al menú principal
5. Estado completamente limpio para nuevo capítulo
```

### Método reset() - Detalles Técnicos

```javascript
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
                await waitForClick();  // Espera confirmación del usuario
            }
            endGame();  // Luego aparece pantalla de fin
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
    mainMenu.classList.remove('hidden');
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
localStorage.setItem('persistentState', JSON.stringify(engine.gameState));

// Al empezar nuevo capítulo:
const saved = localStorage.getItem('persistentState');
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
├── chapter0.json    ← Prólogo (opcional)
├── chapter1.json    ← Capítulo principal
├── chapter2.json    ← Continuación
├── chapter3.json    ← Nuevo capítulo
└── chapter99.json   ← Puedes tener muchos
```

### Flujo de Progresión

```
1. Usuario hace clic en "Comenzar"
2. Se carga chapter0 (prólogo)
3. Al terminar → Opción: "Siguiente Capítulo" o "Menú"
4. Si elige continuar → Se carga chapter1
5. Repite hasta no encontrar siguiente capítulo
6. Muestra "Fin del Juego" → Menú Principal
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
const persistedVariables = localStorage.getItem('persistentState');
if (persistedVariables) {
    engine.gameState = JSON.parse(persistedVariables);
}

// Después de endGame():
localStorage.setItem('persistentState', JSON.stringify(engine.gameState));
```

### Ejemplo Práctico: 3 Capítulos

**chapter0.json - Prólogo (1-2 minutos):**
```json
{
  "title": "Prólogo: El Principio",
  "scenes": [{
    "title": "Introducción",
    "lines": [
      {
        "_line": 0,
        "character": "Narrador",
        "text": "Hace mucho tiempo..."
      }
    ]
  }]
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
- [ ] Fondos en `assets/backgrounds/` (1920x1080)
- [ ] Personajes en `assets/characters/` (300x600)
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

| Error | Causa | Solución |
|-------|-------|----------|
| `Failed to fetch` | Archivo no existe | Verifica rutas |
| `JSON.parse error` | JSON inválido | Usa jsonlint.com |
| `Cannot read property` | Recurso no cargado | Verifica game.js |
| `Uncaught TypeError` | Error en código | Revisa engine.js |

### Monitorear Estado

```javascript
// En Console (F12):
console.log(engine.currentScene)    // Escena actual
console.log(engine.currentLine)     // Línea actual
console.log(engine.gameState)       // Todas las variables
console.log(engine.history)         // Opciones seleccionadas
```

---

## 📝 Licencia

Este proyecto está disponible para uso educativo y comercial.

---

## ¡Comienza Ahora! 🚀

1. Abre `index.html` en tu navegador
2. Haz clic en "Comenzar"
3. Juega con los ejemplos
4. Crea tu primer capítulo
5. ¡Comparte tu historia!

**¿Preguntas?** Revisa esta documentación o abre DevTools (F12) para debugging.

---

*Última actualización: 2026-06-24*

---

## 📚 Documentación Consolidada

Toda la información de características está integrada en este documento. 
No existen archivos MD separados por característica.

**Secciones principales:**
- ✅ Características Avanzadas - Persona 5
- ✅ Personalización de estilos P5
- ✅ Troubleshooting actualizado
- ✅ Ejemplos de uso
