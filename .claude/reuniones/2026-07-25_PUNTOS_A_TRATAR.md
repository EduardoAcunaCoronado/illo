# Reunión de demo — 25 julio 2026 (3 h 24 min)

**Formato:** playtest en directo por Discord, Betanzos compartiendo pantalla (localhost:8000),
partida completa del capítulo 2 al 5 + créditos + post-créditos.
**Presentes:** Tony (Seraphyna, cap. 3), Betanzos/José (cap. 4 y 5), Edu (cap. 2), Samu.
**Transcripción completa:** `2026-07-25_demo_transcripcion.txt` (con marcas de tiempo).

> Aviso de Tony al inicio de la sesión: *"mañana por la mañana no voy a estar y no voy a poder ayudar"*.

---

## 1. Decisiones de lore (afectan a TODOS los capítulos)

| # | Decisión | Timestamp |
|---|----------|-----------|
| L1 | **Prohibida la palabra "virus"**. Nadie sabe qué causó la transformación. Fórmula acordada: *"lo que sea que nos transformara"*. Tony ya lo cambió; **José lo tiene puesto en su capítulo y hay que cambiarlo** | 0:50:35 |
| L2 | **Todos estaban ya contaminados por los memes**. El canto de Seraphyna los cura/mantiene serenos → por eso ella no puede irse de Echiland. Conservar su dualidad: diva egoísta + salvadora | 0:05:28 · 0:06:15 |
| L3 | **Zip emerge de la sombra de Edu** y lo consume. Edu NO es el malo, es víctima (estaba en su mood de fantasía) | 0:04:28 |
| L4 | **Zip no quiere destruir Kingdom Ketchup**: quiere dominar el mundo con los memes. KK fue creado para corromper | 0:07:49 |
| L5 | **El lugar también corrompe**: distorsiona la percepción, te encapsulas en tus deseos. Moraleja del juego y enlace directo con la decisión final del cap. 6 | 0:11:39 |
| L6 | Estructura confirmada: cap. 1 = Samu · 2 = Edu · 3 = Tony/Seraphyna · 4 = José · 5 = Airi | 2:21:26 |
| L7 | Se quedan **abiertos a propósito**: los "40 años" de Santi, la cara familiar de Airi (*"se explica en el segundo juego"*), y el guano | 0:56:54 · 2:12:09 |

---

## 2. Motor / interfaz (transversal — nos toca a nosotros)

| # | Punto | Estado | Timestamp |
|---|-------|--------|-----------|
| M1 | **Botón de retroceder** arriba a la derecha, icono unicode de rebobinar, texto "Clic para retroceder". Vuelve a la **escena anterior** (no al diálogo, porque hay escenas con combate) | Betanzos lo implementó EN VIVO con IA y lo commiteó | 0:37:14 – 0:44:11 |
| M2 | 🐛 **BUG del retroceder: solo funciona UNA vez** y **no restaura fondos, personajes ni assets modificados**. Betanzos: *"os lo paso y ya os peleáis vosotros"* | **PENDIENTE — NUESTRO** | 0:53:42 – 0:55:02 |
| M3 | **Clic derecho = ocultar la interfaz** para ver la escena (típico de novelas visuales). Decisión final: ocultar **la interfaz en general**, no solo el diálogo | Pendiente | 0:26:59 – 0:28:28 |
| M4 | 🐛 Escala de personajes: Santi/la rata se ven muy pequeños. Usar el campo de escala por personaje (0.7 etc.) | Pendiente | 0:29:00 |
| M5 | Los assets pesan **~777-800 MB** (mencionado como dato, posible optimización) | Info | 1:40:44 |

---

## 3. Capítulo 2 — Kingdom Ketchup (Edu)

- **C2.1 Desarrollar el mundo de Kingdom Ketchup**: qué es, por qué está ahí, a qué se dedica. Dar contexto ANTES de lanzar la trama. `0:02:44`
- **C2.2 La negativa de Edu es demasiado brusca.** Hacerla progresiva: Samu insiste con el cumpleaños, Edu se va cerrando poco a poco. `0:01:53`
- **C2.3** Aplicar L3 (Zip sale de su sombra) y L4 (diálogo de Zip). `0:04:28 · 0:07:49`
- **C2.4 Minijuego del ketchup demasiado fácil y largo** (67 tomates y no penaliza fallar; *"puede estar aquí una hora"*). Opciones: tomates en grupos de 3-5, un tomate más gordo, o subir la velocidad. `0:09:47`
- **C2.5** Falta explicar quién es Seraphyna: Samu **sí** sabe que Tony se llama así → añadir *"¿Seraphyna? ¿El avatar de Tony?"*. `0:20:03`
- **C2.6** *"Debemos ir a salvarle"* → no dar por hecho el peligro: *"¿Estará bien? ¿Y si le está pasando como a ti, Edu?"*. `0:21:00`
- **C2.7 Geografía**: Echiland no está "en la otra punta de la ciudad" sino **a las afueras / lejos de Furrielba (provincia)**. Chistes con Punta Umbría / Isla Cristina / Ayamonte, y *"eso no existía antes en el mapa"* / *"Calle de Lentay, no me suena"*. `0:21:54 – 0:25:25`
- **C2.8 Reducir los "Uff, no sé"** y que el personaje de Edu **tome más iniciativa** (es lanzado, no dubitativo). `1:49:58`
- **C2.9** 🐛 **Parpadeo constante** en el minijuego de las motos (lo ven varios, no es la retransmisión). `0:31:38`
- **C2.10** 🐛 *"Le falta un frame a cada cacharrito"* (animación del minijuego del coche). `0:45:50`
- **C2.11** Cambiar el diálogo según cuántas motos te comen (0/1/2). `0:30:16`
- **C2.12** Falta el "si pierdes muchas veces" (facilitar tras varios fallos). `0:31:29`
- **C2.13 Idea para la versión pública**: bullet hell donde **Samu lanza picante y Zip lanza ketchup**; ganar libera a Edu de la corrupción. `0:08:41`

---

## 4. Capítulo 3 — Echiland (NUESTRO)

- **C3.1** Reescribir diálogos de Seraphyna para justificar que **no puede irse** (todos contaminados, ella los sostiene cantando), conservando el punto de diva. `0:06:15`
- **C3.2** 🔊 Rehacer el **audio del muro de fans** de la entrada — *"me lo cambió la IA y me lo machacó"*. `0:34:02`
- **C3.3** 🖼 Poner la **foto auténtica** de los tres (Mario Kart) en vez de la generada. `0:35:26`
- **C3.4** *"Clavadito a la jefa"* perdió sentido al quitar la parte de que el gorila los conocía de antes → **que hablen un poco más ahí**. `0:36:25`
- **C3.5** Cambiar el diálogo *"aparta mastodonte"*. `0:46:14`
- **C3.6** 🐛 **Final malo del segurata**: al reintentar debe volver al escenario y **resetearse la música**. `0:46:51`
- **C3.7** En el camerino, que Seraphyna diga que **no sabe qué narices es Kingdom Ketchup** + un chiste, antes de lo del negacionismo. `0:52:57`
- **C3.8** ⚔️ **Quitar el contador de embestidas** de la batalla de supervivencia: que no se sepa cuánto queda, solo que no le haces nada al boss. `1:04:02 · 1:07:26`
- **C3.9** 🔊 **Bajar el ruido de zombies** constante durante la batalla — es molesto. `1:04:13`
- **C3.10** ⚔️ **"Ráfaga de alas" se spamea**: bajarle estadísticas (no han despertado sus poderes). `1:03:14 – 1:05:42`
- **C3.11** Añadir momento dramático al final: ella avisa de que sin ella la ciudad se irá al garete, pero hay que avanzar igual. `1:13:19 · 1:17:21`
- **C3.12** 🎁 **Meter el diapasón como objeto consumible** en el combate final (recupera ~50% de vida). Decidido que sí. `3:02:56 – 3:03:16`
- **C3.13** Pasarle a Betanzos la **silueta oscurecida de Santi** para el chiste de los churros. `1:24:46`
- ✅ Gustó mucho: la música, los diálogos bajo la barra de vida del enemigo, el diseño de las amalgamas con forma de Seraphyna, el arco de Goyo (*"me encanta este capítulo"*).

---

## 5. Capítulo 4 — Ciudad Paloma (José)

- **C4.1** Unificar **"Paloma City" → "Ciudad Paloma"** en todos lados. `1:21:07`
- **C4.2** Era una **llamada**, no un mensaje. Redacción acordada: *"José decía que en Ciudad Paloma estaba pasando algo muy raro, que quería saber el porqué y que siguiéramos el camino de baldosas amarillas. Luego se cortó la llamada."* `1:25:07 – 1:27:50`
- **C4.3** 🐦 **Chiste de la paloma vendiendo churros** ("¡Churros, churros a un euro!") + silueta de Santi + "¡Achís!". Ubicación decidida: **justo después del cartel "Camino a Ciudad Paloma"**, antes de entrar (luego todo se pone serio). Betanzos lo hace esa misma noche. `1:14:03 · 1:34:04`
- **C4.4** **Reducir los "Uff, no sé"**: había 12 en un tramo, dejaron 9; ~20% de las 58 intervenciones es el objetivo. `1:51:41 – 2:07:12`
- **C4.5** El texto de la runa de Seraphyna (maga blanca) **no cabe**: partirlo en dos o acortarlo. `1:38:33`
- **C4.6** 🔊 `entrada_santuario.mp3` tiene **voz de narrador metida por Suno** (le coló los prompts cantados): cortarla con Audacity. `1:57:44 – 2:04:56`
- **C4.7** 🖼 La pose `serious` de José: Tony la creó porque estaba referenciada sin asset — falta **ajustarle el tamaño** al del resto. `2:07:55 – 2:10:30`
- **C4.8** 🖼 **El avatar de José (Piyón) no convence** — la cara y sobre todo los ojos; *"todos los demás se parecen a su personaje, el tuyo no"*. José ofrece que se lo editen. `1:41:56`
- **C4.9** ⚔️ Estadísticas de bosses ajustadas en vivo: velocidad Tragalelo 12→14, Ballerina 13→14, Tum Tum 11→16; defensa Ballerina 6→7, Tragalelo 8→9, Tum Tum →10. `2:16:17 – 2:20:08`
- **C4.10** Minijuego de los 4 poderes: se pasa rápido y la estabilidad solo baja cuando alguien cae del todo. Se decidió **dejarlo como está**. `2:00:14 – 2:03:44`

---

## 6. Capítulo 5 — Airi, final y post-créditos

- **C5.1** ⚔️ HP de amalgamas: básica 760 → **840**; final 1200 → **1120**. `2:44:30 – 2:46:57`
- **C5.2** ⚔️ Maná de Seraphyna 86/150 → **130** (Samu tiene 120). `3:01:07 – 3:01:58`
- **C5.3** ⚔️ **Edu se queda sin PM demasiado pronto** → que **"Robar" robe también algo de maná**. `3:02:34 – 3:02:56`
- **C5.4** 🐛 El objeto **"Bendición de Airi"** recupera vida **y PM** si el personaje está muerto, pero **solo vida** si está vivo. Incoherente — probablemente bug. `3:09:14 – 3:09:47`
- **C5.5** ❓ Confirmar si **se puede curar a un personaje muerto** (intuyen que no, pero nadie lo sabe seguro). `3:06:34 – 3:06:57`
- **C5.6** Idea para la versión pública: que **el sprite cambie según la vida** (que se ponga triste). `2:56:16`
- **C5.7** Poner un **"FIN" con rúbrica** en el centro de la pantalla al terminar. `3:17:22`
- **C5.8** 🎬 **Créditos**: cada uno mete las imágenes que quiera, **por orden de aparición** (Tony y Edu tienen vía libre). Idea extra: que salgan las **líricas** de la canción. `0:23:28 · 3:17:46`
- **C5.9** Post-créditos ya montado con **Carlos, Andrés y Seba**. Mundos planeados para la 2ª parte: Carlos medieval, Andrés bosque, Seba **hipódromo con caballos** (minijuego de carreras). `3:22:15`

---

## 7. Balance de combate — cambio grande ya implementado en vivo

**La curación de Seraphyna ahora daña a los memes** (justificación de lore: su canto los purifica).

- **Canto sanador**: cura como siempre **y hace 10 de daño** al enemigo.
- **Cura**: puede lanzarse **sobre un enemigo** y le resta **la misma cantidad que curaría** (45 cura = 45 daño).
- **Progresión**: 8 PM → 40 · 10 PM → 50 · 12 PM → 60.
- ⚠️ **NO se indica en la interfaz ni en las descripciones**: el jugador lo tiene que descubrir solo. *"De repente se da cuenta Samu"*.

`0:12:59 – 0:19:09` (discusión) · `1:18:06 – 1:20:57` (implementación)

---

## 8. Bugs abiertos (resumen)

1. 🔴 Retroceder: funciona una sola vez y no restaura fondos/personajes/assets — **nos lo pasan a nosotros**
2. 🟠 Parpadeo constante en el minijuego de las motos (cap. 2)
3. 🟠 "Bendición de Airi" no recupera PM si el personaje está vivo
4. 🟡 La música no se resetea al reintentar el final malo del segurata (cap. 3)
5. 🟡 Falta un frame en la animación del "cacharrito" (cap. 2)
6. 🟡 Escala de Santi/la rata demasiado pequeña
7. 🟡 Pose `serious` de José con tamaño distinto al resto

---

## 9. Publicación

Tony quiere sacar una **versión pública en WildSoft** para que la juegue más gente (sin cobrar):
*"esto lo tiene que conocer el mundo"*. Todo lo que sea "nice to have" (bullet hell del ketchup,
sprites que cambian con la vida, etc.) se apunta para esa versión. `2:56:28`

**Duración de una partida completa: ~2-3 horas.** `3:08:01`

---

## 10. Reparto de tareas tal como quedó

| Quién | Qué |
|-------|-----|
| **Betanzos / José** | Chiste de los churros (esa misma noche) · reducir "Uff, no sé" · quitar "virus" de su capítulo · cortar `entrada_santuario.mp3` · subir el cambio de canto sanador/cura |
| **Tony (nosotros)** | Arreglar el botón de retroceder · puntos del cap. 3 · silueta de Santi para Betanzos · diapasón como objeto · imágenes para los créditos |
| **Edu** | Puntos del cap. 2 · imágenes para los créditos |
| **Sin dueño claro** | Ocultar interfaz con clic derecho · parpadeo del minijuego de motos · avatar de Piyón |
