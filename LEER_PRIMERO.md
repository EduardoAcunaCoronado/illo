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

Alternativa recomendada en navegador:

```powershell
start.bat
```

Abre automáticamente <http://127.0.0.1:8000/> y levanta también Tools en 8011;
`Ctrl+C` cierra los servicios iniciados por el lanzador. `npm run dev:web` hace
lo mismo sin abrir una pestaña. El supervisor comprueba que ambos servicios
pertenecen a esta misma copia del repositorio. `python -m http.server 8000`
sirve para probar sólo el juego; para usar Tools desde su icono emplea el
supervisor, o abre Tools directamente con `npm run tools:eyes`.
No abras `index.html` directamente con
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
npm run validate:workbench
npm run audit:assets
npm start
```

Puntos de entrada:

- Historia: `chapters/chapter0.json` a `chapters/chapter6.json`.
- Personajes y poses: `characters/*.json`.
- Runtime multimedia: `assets/`.
- Maestros y originales, con la misma estructura de la raíz: `workbench/`.
- Storyboards del opening de Samu: `workbench/assets/video/cutscenes/prologue/opening_samu/storyboard/`
  y `storyboardV2/`, conservados como fuentes independientes. La preparación UHD
  no destructiva está en `storyboardV2/4k/` y se regenera con
  `python scripts/prepare_samu_opening_storyboard_v2_4k.py --force`.
- Orquestación y menús: `game.js`.
- Motor y acciones: `engine.js`.
- Interfaz: `index.html`, `styles.css` y `battle-styles.css`.
- App de escritorio: `electron/` y `package.json`.

Para las herramientas oculares y de limpieza, ejecuta
`ABRIR_EDITOR_OJOS.bat` o:

```powershell
npm run tools:eyes
```

Abre <http://localhost:8011/tools>. También puedes entrar con el icono **Tools**
del menú principal; **Minijuegos** abre su lanzador y **Tests** abre el banco de
pruebas de rendimiento con parámetros y resultados PASS/FAIL. Estos tres accesos
son de desarrollo: sólo aparecen
en local o en Electron sin empaquetar. Ambas pantallas incluyen **Menú
principal** para volver directamente al menú sin repetir el opening, incluso
cuando Electron utiliza un puerto interno distinto de 8000.
El botón comprueba primero que el servicio correcto está vivo y que corresponde
a la misma carpeta del proyecto. Si 8011 está
apagado, mantiene abierto el menú y ofrece reintentar o copiar el comando; en
Electron de desarrollo intenta iniciar Tools automáticamente.
Dentro de **Juego y utilidades**, la tarjeta **Restaurador de frames de Samu**
abre o reutiliza el editor local de los 240 fotogramas. Sus fuentes originales y
cambiadas permanecen protegidas; las copias se guardan en la carpeta de revisados.
Los tres botones **Elegir** permiten seleccionar las carpetas de origen de
trabajo, originales de referencia y destino sin editar `config.json` a mano.
**Rectángulo global** (`G`) restaura la zona marcada desde cada original en todo
el lote, siempre sobre Revisados, y permite deshacer la última aplicación global.
**Cubo** (`F`) rellena una zona contigua con tolerancia y se integra en `Ctrl+Z`.
**Generar vídeo de prueba** monta los revisados guardados, completa los pendientes
con sus frames de trabajo y abre la previsualización con el audio fuente.
En **Eliminar halos blancos**, `Abrir cualquier imagen…` o el gesto de arrastrar
permiten limpiar un archivo ajeno a las poses del juego; el original no se modifica
y el resultado se entrega únicamente mediante `Descargar WebP actual`.

## Antes de entregar un cambio

```powershell
npm run validate:content
npm run validate:workbench
npm run audit:assets
npm run check:js
```

El chequeo de formato aún informa de deuda histórica en varios JavaScript;
consulta el Manual de desarrollo antes de aplicar un formateo masivo.

Revisa además si el cambio obliga a actualizar el Manual de usuario, el Manual
de desarrollo o ambos. Esta comprobación es parte de la definición de terminado
y aparece también en `AGENTS.md` y en la plantilla de pull request.
