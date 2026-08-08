#!/usr/bin/env python3
"""Genera la Chuleta Rápida para Creadores de Capítulos en formato PDF.

Extrae información de acceso rápido pensada para los guionistas y
creadores de niveles, centrándose en el uso de la DSL.
"""

from __future__ import annotations

import html
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    XPreformatted,
    LongTable,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "chuleta_creadores_transfurmados.pdf"

PAGE_W, PAGE_H = A4
MARGIN_X = 1.65 * cm
MARGIN_TOP = 1.75 * cm
MARGIN_BOTTOM = 1.55 * cm
CONTENT_W = PAGE_W - 2 * MARGIN_X

INK = colors.HexColor("#151329")
MUTED = colors.HexColor("#625d78")
PINK = colors.HexColor("#ef3f9a")
PURPLE = colors.HexColor("#7b4ed8")
CYAN = colors.HexColor("#22a8d8")
PALE = colors.HexColor("#f5f1fb")
LINE = colors.HexColor("#ded6eb")
WHITE = colors.white

def safe_text(value: object) -> str:
    text = str(value)
    for mark in ("\u2010", "\u2011", "\u2012", "\u2013", "\u2014", "\u2212"):
        text = text.replace(mark, "-")
    return text.replace("\u2192", "->")

def esc(value: object) -> str:
    return html.escape(safe_text(value), quote=False)

def register_fonts() -> None:
    fonts = {
        "Manual": Path("C:/Windows/Fonts/segoeui.ttf"),
        "ManualBold": Path("C:/Windows/Fonts/segoeuib.ttf"),
        "ManualSemi": Path("C:/Windows/Fonts/seguisb.ttf"),
        "ManualMono": Path("C:/Windows/Fonts/consola.ttf"),
    }
    for name, path in fonts.items():
        if path.exists():
            pdfmetrics.registerFont(TTFont(name, str(path)))
    pdfmetrics.registerFontFamily(
        "Manual",
        normal="Manual",
        bold="ManualBold",
        italic="Manual",
        boldItalic="ManualBold",
    )

register_fonts()
BASE = getSampleStyleSheet()

STYLES = {
    "body": ParagraphStyle("Body", parent=BASE["BodyText"], fontName="Manual", fontSize=9.5, leading=13.5, textColor=INK, spaceAfter=8),
    "h1": ParagraphStyle("H1", parent=BASE["Heading1"], fontName="ManualBold", fontSize=22, leading=26, textColor=PINK, spaceBefore=10, spaceAfter=12),
    "h2": ParagraphStyle("H2", parent=BASE["Heading2"], fontName="ManualSemi", fontSize=15, leading=18, textColor=PURPLE, spaceBefore=12, spaceAfter=8),
    "h3": ParagraphStyle("H3", parent=BASE["Heading3"], fontName="ManualSemi", fontSize=12, leading=15, textColor=CYAN, spaceBefore=10, spaceAfter=6),
    "table": ParagraphStyle("TableCell", parent=BASE["BodyText"], fontName="Manual", fontSize=8, leading=10, textColor=INK),
    "table_head": ParagraphStyle("TableHead", parent=BASE["BodyText"], fontName="ManualSemi", fontSize=8.5, leading=10.5, textColor=WHITE),
    "code": ParagraphStyle("Code", parent=BASE["Code"], fontName="ManualMono", fontSize=7.5, leading=10, textColor=colors.HexColor("#f7f2ff")),
    "callout": ParagraphStyle("Callout", parent=BASE["BodyText"], fontName="Manual", fontSize=9, leading=13, textColor=INK),
}

class ChuletaDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str):
        super().__init__(
            filename, pagesize=A4,
            leftMargin=MARGIN_X, rightMargin=MARGIN_X, topMargin=MARGIN_TOP, bottomMargin=MARGIN_BOTTOM,
            title="Chuleta de Creadores - Transfurmados"
        )
        frame = Frame(MARGIN_X, MARGIN_BOTTOM, CONTENT_W, PAGE_H - MARGIN_TOP - MARGIN_BOTTOM, id="normal", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates(PageTemplate(id="Manual", frames=[frame], onPage=self.draw_page))

    def draw_page(self, canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN_X, 1.15 * cm, PAGE_W - MARGIN_X, 1.15 * cm)
        canvas.setFont("Manual", 7.1)
        canvas.setFillColor(MUTED)
        canvas.drawString(MARGIN_X, 0.72 * cm, "Project AI.ri: Transfurmados - Chuleta de Creadores")
        canvas.drawRightString(PAGE_W - MARGIN_X, 0.72 * cm, f"Página {doc.page}")
        canvas.setFillColor(CYAN if doc.page % 2 else PINK)
        canvas.rect(0, 0, 0.15 * cm, PAGE_H, fill=1, stroke=0)
        canvas.restoreState()

def P(text, style="body"): return Paragraph(esc(text).replace("\n", "<br/>"), STYLES[style])
def H1(text): return Paragraph(esc(text), STYLES["h1"])
def H2(text): return Paragraph(esc(text), STYLES["h2"])
def H3(text): return Paragraph(esc(text), STYLES["h3"])

def code(text: str) -> Table:
    block = XPreformatted(safe_text(text).strip(), STYLES["code"])
    table = Table([[block]], colWidths=[CONTENT_W], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#171126")),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#4b3a69")),
        ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table

def callout(title: str, text: str, color=PINK) -> Table:
    data = [[Paragraph(f"<b>{esc(title)}</b>", STYLES["callout"])], [P(text, "callout")]]
    table = Table(data, colWidths=[CONTENT_W], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#faf7fd")),
        ("BOX", (0, 0), (-1, -1), 0.8, color),
        ("LINEBEFORE", (0, 0), (0, -1), 4, color),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table

def table_dsl(data, widths) -> LongTable:
    rows = []
    for row_index, row in enumerate(data):
        rows.append([Paragraph(esc(value), STYLES["table_head" if row_index == 0 else "table"]) for value in row])
    result = LongTable(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), PURPLE),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for index in range(1, len(rows)):
        if index % 2 == 0: commands.append(("BACKGROUND", (0, index), (-1, index), PALE))
    result.setStyle(TableStyle(commands))
    return result

def build_pdf():
    story = []
    
    story.append(H1("Guía Rápida para Creadores de Capítulos"))
    story.append(P("¡Bienvenido al desarrollo de Project AI.ri: Transfurmados! Esta guía rápida te ayudará a ser productivo desde el minuto uno sin tener que leer todo el manual técnico de golpe."))
    story.append(callout("Documentación Oficial", "Recuerda que el manual exhaustivo y oficial lo tienes en el Menú de Tools. Allí encontrarás el diccionario completo de todas las acciones con sus detalles técnicos.", CYAN))
    
    story.append(H2("Tu Entorno de Trabajo Rápido"))
    story.append(P("1. Abre el juego en tu navegador: Ejecuta start.bat o npm run dev:web y entra en http://localhost:8000/"))
    story.append(P("2. Usa el Selector de Capítulos: En el menú principal, salta directamente al tuyo."))
    story.append(P("3. Panel de Debug: Durante una escena, arriba a la izquierda verás en qué línea exacta estás para editarla en el JSON."))
    story.append(P("4. Hot-Reload Manual: Guarda los cambios en tu .json y pulsa Retroceder en el juego para repetir la escena."))
    
    story.append(H2("Escribiendo Diálogos y DSL"))
    story.append(H3("¿Qué es la DSL?"))
    story.append(P("DSL significa Domain Specific Language (Lenguaje Específico de Dominio). Es un pequeño lenguaje inventado a medida para este proyecto que te permite escribir guiones súper rápido. En lugar de escribir cinco líneas de código JSON para que un personaje se ponga a sonreír, usas una sola cadena de texto."))
    
    story.append(P("[ANTES] Largo y tedioso"))
    story.append(code('''{
  "speaker": "tony",
  "text": "¡Hola! ¿Qué tal?",
  "actions": [
    {
      "type": "showCharacter",
      "character": "tony",
      "position": "center",
      "pose": "happy",
      "scale": 1.1
    }
  ]
}'''))
    
    story.append(Spacer(1, 0.4*cm))
    story.append(P("[AHORA] Limpio y directo con DSL"))
    story.append(code('''{
  "speaker": "tony",
  "text": "¡Hola! ¿Qué tal?",
  "actions": [
    "show tony center happy scale=1.1"
  ]
}'''))

    story.append(H2("Todas las acciones DSL (Orden Alfabético)"))
    dsl_data = [
        ["Acción", "Función", "Ejemplo"],
        ["addDelay", "Añade tiempo al reloj.", '"addDelay 10"'],
        ["animateCharacter", "Animación CSS en un sprite.", '"animateCharacter jose bounce"'],
        ["background", "Cambia el fondo.", '"background assets/.../pisito.webp"'],
        ["bgPan", "Desplaza el fondo (panorámica).", '"bgPan x=50 y=0 duration=2"'],
        ["cg / showCG", "Ilustración a pantalla completa.", '"cg assets/images/cgs/final.webp"'],
        ["characterAnimeFall", "Caída cómica fuera de plano.", '"characterAnimeFall edu"'],
        ["clearBackground", "Quita el fondo actual.", '"clearBackground"'],
        ["fade", "Transición de color sólido.", '"fade out black 1"'],
        ["flash", "Destello rápido.", '"flash white 0.5"'],
        ["glitchCharacter", "Corrupción visual momentánea.", '"glitchCharacter tony"'],
        ["goto / goToScene", "Salta a otra escena.", '"goto Escena_Final"'],
        ["grade", "Filtro de color global.", '"grade sepia 2"'],
        ["hide / hideCharacter", "Oculta a un personaje.", '"hide jose"'],
        ["hideCG", "Quita la ilustración.", '"hideCG"'],
        ["hideDialog", "Esconde la caja de texto.", '"hideDialog"'],
        ["item / giveItem", "Otorga un objeto al inventario.", '"item linterna"'],
        ["minigame", "Lanza un minijuego.", '"minigame battle-minigame"'],
        ["pauseSound", "Pausa un sonido.", '"pauseSound id=bg_music"'],
        ["playVideo / cutscene", "Vídeo a pantalla completa.", '"video assets/video/intro.mp4"'],
        ["pose / setPose", "Cambia la expresión/pose.", '"pose tony sad"'],
        ["poseSequence", "Secuencia de poses.", '"poseSequence jose idle_1,idle_2"'],
        ["remove", "Elimina personaje de memoria.", '"remove edu"'],
        ["rescue", "Marca rescatado.", '"rescue jose"'],
        ["resumeSound", "Reanuda sonido.", '"resumeSound id=bg_music"'],
        ["sceneStart", "Funde a negro, limpia y revela.", '"sceneStart"'],
        ["setDelay", "Tiempo de historia a valor fijo.", '"setDelay 60"'],
        ["setNextChapter", "Próximo capítulo.", '"setNextChapter chapter2"'],
        ["setTextDuration", "Velocidad del texto.", '"setTextDuration 20"'],
        ["setVariable", "Cambia estado del juego.", '"setVariable investigado=true"'],
        ["setVolume", "Volumen de un canal.", '"setVolume id=bg_music vol=0.5"'],
        ["sfx", "Sonido Juice.", '"sfx blip"'],
        ["shake", "Agita la pantalla.", '"shake 0.5"'],
        ["show / showCharacter", "Muestra/mueve personaje.", '"show jose left pose_sorpresa"'],
        ["sound / playSound", "Reproduce música/sfx.", '"sound assets/.../triste.mp3"'],
        ["stopAllSounds", "Corta todo el audio.", '"stopAllSounds"'],
        ["stopCharacterAnimation", "Detiene animación CSS.", '"stopCharacterAnimation jose"'],
        ["stopSound", "Detiene un audio.", '"stopSound id=bg_music"'],
        ["vignette", "Viñeteado oscuro.", '"vignette 0.8"'],
        ["wait", "Pausa el juego X tiempo.", '"wait 2"'],
        ["waitForClick", "Pausa hasta el clic.", '"waitForClick"']
    ]

    story.append(table_dsl(dsl_data, [4*cm, 5.5*cm, 7*cm]))
    
    story.append(Spacer(1, 0.4*cm))
    story.append(callout("Autocompletado de la DSL", "Los atajos compactos como show, hide, background o sound hacen el trabajo duro por ti y procesan argumentos extra como scale=1.1 o loop=true.", PINK))
    
    story.append(H2("Decisiones y Ramificaciones"))
    story.append(P("Para crear opciones interactivas, usa la propiedad choices dentro de una línea. Las acciones en afterActions sólo se ejecutan si el jugador elige esa ruta."))
    story.append(code('''{
  "speaker": "edu",
  "text": "¿Qué deberíamos hacer ahora?",
  "choices": [
    {
      "text": "Ir a investigar el ruido.",
      "nextLine": "escena_ruido",
      "afterActions": [
        "item linterna",
        "sound assets/audio/sfx/pasos.mp3"
      ]
    },
    {
      "text": "Quedarnos aquí quietos.",
      "nextLine": "escena_silencio",
      "afterActions": [
        "addDelay 10"
      ]
    }
  ]
}'''))

    story.append(H2("Minijuegos y Cinemáticas"))
    story.append(callout("Progreso Automático", "Puedes llamar a un minijuego directamente desde la historia usando la acción minigame. El jugador se quedará en él hasta que gane, y si pierde, el propio motor gestiona el botón de 'Reintentar'.", CYAN))
    story.append(P("Ejemplo para lanzar a Edu volando a recoger partituras:"))
    story.append(code('"actions": ["minigame edu-flight speed=6 goal=16"]'))
    story.append(P("Si quieres probar los minijuegos por separado para ajustar la dificultad, no tienes que jugar todo el capítulo. Ve a Tools en el menú principal o abre la prueba de minijuegos directamente."))

    story.append(H2("Resumen Visual de Capas de Ojos"))
    story.append(P("El proyecto utiliza un sistema especial para que los personajes parpadeen y tengan animaciones sin tener que redibujar el personaje entero."))
    story.append(P("Se usa el servidor ocular (http://localhost:8011/) para componer nuevos ojos sobre las bases limpias. El flujo es:"))
    story.append(P("1. Marcar: Define dónde están los ojos.\n2. Alinear: Ajusta las capas superpuestas.\n3. Limpiar: Extrae la base sin tocar los originales."))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = ChuletaDocTemplate(str(OUT))
    doc.build(story)

if __name__ == "__main__":
    build_pdf()
    print(f"PDF generado: {OUT}")
