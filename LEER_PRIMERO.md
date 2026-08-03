# Project AI.RI: Transfurmados — Empieza aquí

Este archivo es la portada del proyecto. Los dos manuales canónicos viven en
[`DOCUMENTACION.md`](DOCUMENTACION.md):

- [Manual de usuario](DOCUMENTACION.md#manual-de-usuario): instalación, menús,
  controles, minijuegos, progreso y problemas habituales.
- [Manual de desarrollo](DOCUMENTACION.md#manual-de-desarrollo): arquitectura,
  formatos JSON, assets, herramientas, recetas de cambio, validación y build.
- [Herramientas gráficas locales](DOCUMENTACION.md#herramientas-gráficas-locales):
  marcado y alineación ocular, limpieza de bases y halos.

## Quiero jugar

Si tienes una versión instalada, abre **Transfurmados**, pulsa **Entrar con
sonido** y sigue el opening hasta el menú principal. También puedes saltarlo.

Desde el repositorio, la opción recomendada es la app de escritorio:

```powershell
npm install
npm start
```

Alternativa en navegador:

```powershell
python -m http.server 8000
```

Después abre <http://localhost:8000/>. No abras `index.html` directamente con
`file://`: los capítulos, personajes, audio y vídeo necesitan un servidor.

Controles esenciales:

- Clic o toque: completar el texto actual y avanzar.
- Mantener `Ctrl`: avance rápido; las decisiones y minijuegos no se saltan.
- `Esc` o **Opciones**: pausa y configuración.
- **Escenas**: volver a escenas ya visitadas del capítulo.
- **Retroceder**: regresar al comienzo de la escena anterior.
- Una cinemática se puede saltar con clic, `Esc`, `Enter` o `Espacio`.

Importante: la versión actual conserva los ajustes, pero todavía no guarda una
partida para continuarla tras cerrar el juego. **Capítulos** inicia el capítulo
elegido con estado limpio; no es una ranura de carga.

## Quiero desarrollar

Preparación y comprobación mínima:

```powershell
npm install
npm run validate:content
npm run audit:assets
npm start
```

Puntos de entrada:

- Historia: `chapters/chapter0.json` a `chapters/chapter6.json`.
- Personajes y poses: `characters/*.json`.
- Runtime multimedia: `assets/`.
- Fuentes, originales y archivo: `workbench/`.
- Orquestación y menús: `game.js`.
- Motor y acciones: `engine.js`.
- Interfaz: `index.html`, `styles.css` y `battle-styles.css`.
- App de escritorio: `electron/` y `package.json`.

Para las herramientas oculares y de limpieza, ejecuta
`ABRIR_EDITOR_OJOS.bat` o:

```powershell
npm run tools:eyes
```

Abre <http://localhost:8011/tools>.

## Antes de entregar un cambio

```powershell
npm run validate:content
npm run audit:assets
npm run check:js
```

El chequeo de formato aún informa de deuda histórica en varios JavaScript;
consulta el Manual de desarrollo antes de aplicar un formateo masivo.

Revisa además si el cambio obliga a actualizar el Manual de usuario, el Manual
de desarrollo o ambos. Esta comprobación es parte de la definición de terminado
y aparece también en `AGENTS.md` y en la plantilla de pull request.
