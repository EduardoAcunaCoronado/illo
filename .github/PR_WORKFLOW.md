# Workflow Para Crear Pull Requests

Usa este workflow cuando se pida preparar o crear una Pull Request a partir de la conversación, la rama actual, los commits y las modificaciones del repositorio.

## 🎯 Objetivos

Extraer de la conversación el motivo principal de la PR.

Debe responder a:

- Qué problema se quería resolver.
- Qué comportamiento se quería conseguir.
- Qué parte del juego, capítulo, minijuego o interfaz se ha tocado.

Formato recomendado:

```md
## 🎯 Objetivos

- Ajustar la dificultad del minijuego de equilibrio de runas.
- Hacer que el reto sea más preciso sin volverlo pesado.
- Evitar que el jugador supere el minijuego simplemente manteniendo pulsadas las teclas.
```

## 🛠️ Cambios

Revisar la información real del repositorio antes de redactar esta sección.

Comandos útiles:

```bash
git branch --show-current
git log --oneline origin/master..HEAD
git status --short
git diff --stat origin/master...HEAD
git diff --name-only origin/master...HEAD
```

Debe incluir:

- Rama actual.
- Commit o commits relevantes.
- Archivos modificados.
- Resumen funcional de los cambios.

Formato recomendado:

```md
## 🛠️ Cambios

- Rama: `feature/ajuste-dificultad-minijuego-rune-channeling`
- Commit principal: `Minor - Ajuste dificultad minijuego rune channeling`

Resumen:

- Se reduce el espacio necesario para considerar una runa equilibrada.
- La zona de equilibrio se estrecha progresivamente por nivel.
- Se ajusta la caída de las barras al soltar las teclas.
- Se actualiza el cachebuster del minijuego.
```

## 🧪 Cómo Probar

Definir pruebas según los archivos modificados.

Pruebas habituales:

- Para JavaScript:

```bash
node --check archivo.js
```

- Para capítulos JSON:

```bash
node -e "JSON.parse(require('fs').readFileSync('chapters/chapterX.json','utf8')); console.log('chapterX OK')"
```

- Para cambios visuales o de minijuegos:

```md
- Abrir `minijuegos_test.html`.
- Lanzar el minijuego afectado.
- Comprobar el comportamiento esperado.
```

Formato recomendado:

```md
## 🧪 Cómo Probar

- Ejecutar `node --check rune-channeling-minigame.js`.
- Abrir `minijuegos_test.html`.
- Lanzar el minijuego `Rune Channeling`.
- Comprobar que:
  - La zona de equilibrio es más estrecha.
  - La dificultad aumenta por nivel.
  - Las barras bajan más rápido al soltar.
  - El nivel 7 requiere más precisión.
```

## 🚀 Publicar PR

Antes de publicar, comprobar:

- Que los cambios correctos están commiteados.
- Que la rama actual tiene el nombre esperado.
- Que no hay cambios sin revisar en `git status --short`.
- Que la PR se crea como lista para revisar, no como draft.

Comandos recomendados:

```bash
git branch --show-current
git status --short
git push -u origin HEAD
gh pr create --base master --head "$(git branch --show-current)" --title "TITULO_DE_LA_PR" --body-file /tmp/pr-body.md
```

No usar `--draft` salvo que se pida explícitamente. El comando `gh pr create` devuelve la URL de la Pull Request. Al terminar, hay que responder al usuario con ese enlace.

Formato de respuesta recomendado:

```md
PR creada:

https://github.com/OWNER/REPO/pull/NUMERO
```

## Plantilla Final

```md
## 🎯 Objetivos

- 

## 🛠️ Cambios

- Rama: ``
- Commit principal: ``

Resumen:

- 

## 🧪 Cómo Probar

- 

## 🚀 Publicar PR

```bash
git push -u origin HEAD
gh pr create --base master --head "$(git branch --show-current)" --title "TITULO_DE_LA_PR" --body-file /tmp/pr-body.md
```
```
