# 🎮 Visual Novel Engine - Comienza Aquí

Bienvenido. Este es un motor completo de visual novel con documentación única en `DOCUMENTACION.md`.

## 🚀 En 30 Segundos

1. **Abre un terminal** en esta carpeta
2. **Ejecuta:** `python -m http.server 8000`
3. **Abre:** http://localhost:8000
4. **Haz clic:** "Comenzar"
5. **Disfruta:** Los 3 capítulos de ejemplo

## 📚 Documentación

**TODO está en: [DOCUMENTACION.md](DOCUMENTACION.md)**

- Guía rápida
- Cómo crear personajes
- Cómo crear capítulos
- Sistema de poses (emociones)
- Todas las acciones disponibles
- Troubleshooting
- Funciones avanzadas

## 📁 Estructura

```
proyecto/
├── DOCUMENTACION.md        ← LEE ESTO
├── index.html              ← Abre en navegador
├── engine.js               ← Motor (NO TOQUES)
├── game.js                 ← Carga los capítulos
├── styles.css              ← Estilos
├── characters/             ← Define personajes aquí
├── chapters/               ← Crea historias aquí
└── assets/                 ← Imágenes y sonidos
```

## ✨ Características Principales

### Base
- ✅ Diálogos con animación de escritura
- ✅ Elecciones que ramifican la historia
- ✅ Personajes con 5 poses emocionales
- ✅ Fondos dinámicos
- ✅ Sonidos y efectos
- ✅ Guardado automático
- ✅ **TODO en JSON** (sin programación)

### Persona 5 Edition (Avanzadas)
- ✨ Estética Persona 5 Royal (menús, diálogos, colores)
- ⚡ Click para saltar/completar texto al instante
- 🎬 Animación cinematográfica al inicio de capítulo
- 🎨 Efectos visuales avanzados
- 👥 Personajes más grandes y visibles (400x700px)
- 🎭 Nuevo: Posición centro para personaje solo

## 🎯 Primeros Pasos

### 1. Ver los ejemplos
Abre `index.html` y juega los 3 capítulos incluidos.

### 2. Entender la estructura
Lee `DOCUMENTACION.md` - está completo y organizado por temas.

### 3. Crear tu primer capítulo
Copia `chapters/chapter1.json`, edita y carga en `game.js`.

### 4. Personalizar
Edita `styles.css` para colores y `engine.js` para velocidad de texto.

## 💡 Quick Reference

**Mostrar personaje con emoción:**
```json
{
  "type": "showCharacter",
  "character": "luna",
  "position": "left",
  "pose": "happy"
}
```

**Cambiar emoción:**
```json
{
  "type": "setPose",
  "character": "luna",
  "position": "left",
  "pose": "sad"
}
```

**Crear elección:**
```json
{
  "text": "Mi opción",
  "nextLine": 5
}
```

## 🔗 Navegación de Documentación

Todo está en **DOCUMENTACION.md**:
- Sección 1: Inicio Rápido
- Sección 2: Características
- Sección 3-9: Sistema de contenido
- Sección 10: Personalización
- Sección 11: Troubleshooting
- Sección 12: Funciones Avanzadas

## 🆘 Problemas?

1. Abre **DOCUMENTACION.md**
2. Busca tu problema en **Troubleshooting**
3. Sigue los pasos

## 📊 Ejemplos Incluidos

- **chapter0.json** - Prólogo (7 líneas)
- **chapter1.json** - Encuentro con elecciones (16 líneas)
- **chapter2.json** - Ramificaciones múltiples (13 líneas)
- **luna.json** - Personaje con 5 poses
- **alex.json** - Personaje con 5 poses

## ✅ Checklist Rápido

- [ ] Abrí `index.html` en navegador
- [ ] Vi los 3 capítulos de ejemplo
- [ ] Leí **DOCUMENTACION.md**
- [ ] Creé mi primer personaje
- [ ] Creé mi primer capítulo
- [ ] Cargué en `game.js`
- [ ] ¡Jugué mi historia!

---

## 🚀 ¿Listo?

→ **Abre [DOCUMENTACION.md](DOCUMENTACION.md) y comienza** 🎮
