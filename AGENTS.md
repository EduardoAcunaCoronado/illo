# 📋 Instrucciones del Proyecto

## Documentación canónica

**REGLA PRINCIPAL:** no crear un MD para cada característica.

- `DOCUMENTACION.md` contiene los dos manuales canónicos: **Manual de usuario**
  y **Manual de desarrollo**.
- `LEER_PRIMERO.md` es sólo la portada y ruta de acceso rápida.
- Los Markdown exigidos por GitHub dentro de `.github/` son plantillas o flujos
  operativos y constituyen la única excepción.
- `memory/` aporta contexto auxiliar; nunca sustituye ni contradice los manuales.
- No crear documentación paralela, changelogs por característica ni resúmenes
  finales independientes. Sustituir la información obsoleta en su sección.

## Definición de terminado: revisión documental obligatoria

Todo cambio en código, guion o contenido JSON, assets, metadatos, herramientas,
scripts, configuración, dependencias, empaquetado o flujo de trabajo debe incluir
esta evaluación antes de considerarse terminado:

1. Actualizar el **Manual de usuario** si cambia algo que el jugador pueda ver,
   hacer o necesitar saber: instalación, inicio, controles, menús, reglas,
   dificultad, progreso, guardado, accesibilidad, contenido disponible o
   resolución de problemas.
2. Actualizar el **Manual de desarrollo** si cambia arquitectura, esquemas,
   acciones/API, rutas, convenciones, assets, scripts, herramientas, comandos,
   build, validaciones, canon o procedimientos de trabajo.
3. Actualizar ambos cuando exista impacto visible y técnico.
4. Si un manual no necesita cambios, el commit o la PR debe indicarlo y
   justificarlo brevemente.
5. La actualización documental debe viajar en el mismo cambio que la
   implementación. No añadir una nota cronológica duplicada al final.
6. Si cambia la forma de entrar, ejecutar o localizar información, actualizar
   también `LEER_PRIMERO.md`.
7. Antes de cerrar, comprobar comandos, rutas y cifras contra el repositorio.
   Las cifras variables deben generarse o indicar fecha de verificación.

Ningún cambio se considera completo sin esta revisión documental.

## Estructura de Proyecto

```
proyecto/
├── 📄 DOCUMENTACION.md        ← Referencia única
├── 📄 LEER_PRIMERO.md         ← Inicio rápido
├── 🔧 index.html
├── ⚙️  engine.bundle.js       ← Bundle generado; fuente en engine/
├── engine/                    ← Módulos ES del motor
├── 🎮 game.js
├── 🎨 styles.css
├── ✨ p5-effects.js
├── electron/                 ← App de escritorio (main.js + static-server.js)
├── characters/
├── chapters/
├── assets/                   ← Runtime y salidas de herramientas
└── workbench/                ← Espejo de la raíz para maestros y originales
```

## Convenciones

1. **Documentación:** Los manuales van en `DOCUMENTACION.md`
2. **No duplicar:** Una sola fuente de verdad
3. **Mantener limpio:** Eliminar archivos innecesarios
4. **Memoria:** Actualizar memory/ con cambios importantes
5. **Entrega:** Declarar impacto documental en cada PR
6. **Conservación:** `workbench/` se versiona completo con Git normal, replica
   rutas de la raíz (`workbench/assets/...`, `workbench/characters/...`) y no
   almacena QA, candidatos, rechazados ni archivos paralelos. Se excluye del
   paquete de Electron, pero nunca del repositorio.

Narradora es 3C. Nexo es su auxiliar de continuidad y sustituye a ePod en el
canon activo. Ambos deben tener voz propia y una forma original de romper la
cuarta pared; no deben copiar personalidad, frases ni dinámica de personajes
de otras obras.
