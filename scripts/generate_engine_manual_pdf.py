#!/usr/bin/env python3
"""Genera el manual PDF del motor y del juego desde el repositorio actual.

DOCUMENTACION.md sigue siendo la fuente canonica. Este PDF es una edicion
maquetada, fechada y orientada a consulta que incorpora inventarios obtenidos
directamente del codigo para evitar listas de API obsoletas.
"""

from __future__ import annotations

import html
import json
import re
import subprocess
from collections import Counter
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
    CondPageBreak,
    Flowable,
    Frame,
    HRFlowable,
    Image,
    KeepTogether,
    LongTable,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    XPreformatted,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "manual_engine_y_juego_transfurmados.pdf"
SCREENSHOTS = ROOT / "output" / "pdf" / "manual_engine_assets"
VERIFIED_DATE = "8 de agosto de 2026"

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
GOLD = colors.HexColor("#d99b22")
PALE = colors.HexColor("#f5f1fb")
PALE_BLUE = colors.HexColor("#eef8fc")
LINE = colors.HexColor("#ded6eb")
WHITE = colors.white
BLACK = colors.black


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
        "ManualMonoBold": Path("C:/Windows/Fonts/consolab.ttf"),
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
    "body": ParagraphStyle(
        "BodyManual",
        parent=BASE["BodyText"],
        fontName="Manual",
        fontSize=9.35,
        leading=13.2,
        textColor=INK,
        spaceAfter=6,
    ),
    "small": ParagraphStyle(
        "SmallManual",
        parent=BASE["BodyText"],
        fontName="Manual",
        fontSize=7.7,
        leading=10.2,
        textColor=MUTED,
    ),
    "caption": ParagraphStyle(
        "CaptionManual",
        parent=BASE["BodyText"],
        fontName="Manual",
        fontSize=7.6,
        leading=10,
        textColor=MUTED,
        alignment=TA_CENTER,
        spaceBefore=4,
        spaceAfter=10,
    ),
    "h1": ParagraphStyle(
        "Heading1",
        parent=BASE["Heading1"],
        fontName="ManualBold",
        fontSize=21,
        leading=24,
        textColor=PINK,
        spaceBefore=4,
        spaceAfter=10,
        keepWithNext=True,
    ),
    "h2": ParagraphStyle(
        "Heading2",
        parent=BASE["Heading2"],
        fontName="ManualSemi",
        fontSize=14.2,
        leading=17.2,
        textColor=PURPLE,
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True,
    ),
    "h3": ParagraphStyle(
        "Heading3",
        parent=BASE["Heading3"],
        fontName="ManualSemi",
        fontSize=10.8,
        leading=13.4,
        textColor=CYAN,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True,
    ),
    "cover_title": ParagraphStyle(
        "CoverTitle",
        parent=BASE["Title"],
        fontName="ManualBold",
        fontSize=31,
        leading=34,
        textColor=WHITE,
        alignment=TA_LEFT,
        spaceAfter=10,
    ),
    "cover_sub": ParagraphStyle(
        "CoverSub",
        parent=BASE["BodyText"],
        fontName="Manual",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#ddd4f0"),
        spaceAfter=8,
    ),
    "toc": ParagraphStyle(
        "TOCEntry",
        parent=BASE["BodyText"],
        fontName="Manual",
        fontSize=9,
        leading=12,
        leftIndent=12,
        firstLineIndent=-8,
        textColor=INK,
    ),
    "toc2": ParagraphStyle(
        "TOCEntry2",
        parent=BASE["BodyText"],
        fontName="Manual",
        fontSize=8,
        leading=10,
        leftIndent=28,
        firstLineIndent=-8,
        textColor=MUTED,
    ),
    "table": ParagraphStyle(
        "TableCell",
        parent=BASE["BodyText"],
        fontName="Manual",
        fontSize=7.35,
        leading=9.5,
        textColor=INK,
    ),
    "table_head": ParagraphStyle(
        "TableHead",
        parent=BASE["BodyText"],
        fontName="ManualSemi",
        fontSize=7.5,
        leading=9.5,
        textColor=WHITE,
    ),
    "code": ParagraphStyle(
        "CodeManual",
        parent=BASE["Code"],
        fontName="ManualMono",
        fontSize=7.15,
        leading=9.1,
        textColor=colors.HexColor("#f7f2ff"),
        leftIndent=0,
        rightIndent=0,
    ),
    "callout": ParagraphStyle(
        "CalloutManual",
        parent=BASE["BodyText"],
        fontName="Manual",
        fontSize=8.6,
        leading=12,
        textColor=INK,
    ),
}


class ManualDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=MARGIN_X,
            rightMargin=MARGIN_X,
            topMargin=MARGIN_TOP,
            bottomMargin=MARGIN_BOTTOM,
            title="Manual completo del motor y del juego - Transfurmados",
            author="WildSoft / documentación generada desde el repositorio",
            subject="Uso del juego, arquitectura, capítulos, DSL y referencia de API",
        )
        frame = Frame(
            MARGIN_X,
            MARGIN_BOTTOM,
            CONTENT_W,
            PAGE_H - MARGIN_TOP - MARGIN_BOTTOM,
            id="normal",
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
        )
        self.addPageTemplates(PageTemplate(id="Manual", frames=[frame], onPage=draw_page))
        self._heading_seq = 0

    def beforeDocument(self):
        self._heading_seq = 0
        return super().beforeDocument()

    def afterFlowable(self, flowable):
        if not isinstance(flowable, Paragraph):
            return
        name = flowable.style.name
        if name not in ("Heading1", "Heading2", "Heading3"):
            return
        level = {"Heading1": 0, "Heading2": 1, "Heading3": 2}[name]
        self._heading_seq += 1
        key = f"heading-{self._heading_seq}"
        text = flowable.getPlainText()
        self.canv.bookmarkPage(key)
        if level < 2:
            self.canv.addOutlineEntry(text, key, level=level, closed=False)
            self.notify("TOCEntry", (level, text, self.page, key))


def draw_page(canvas, doc) -> None:
    canvas.saveState()
    if doc.page == 1:
        canvas.setFillColor(colors.HexColor("#080312"))
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        canvas.setFillColor(PINK)
        canvas.rect(0, PAGE_H - 0.18 * cm, PAGE_W * 0.62, 0.18 * cm, fill=1, stroke=0)
        canvas.setFillColor(CYAN)
        canvas.rect(PAGE_W * 0.62, PAGE_H - 0.18 * cm, PAGE_W * 0.38, 0.18 * cm, fill=1, stroke=0)
    else:
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN_X, 1.15 * cm, PAGE_W - MARGIN_X, 1.15 * cm)
        canvas.setFont("Manual", 7.1)
        canvas.setFillColor(MUTED)
        canvas.drawString(MARGIN_X, 0.72 * cm, "Project AI.ri: Transfurmados - Manual de motor y juego")
        canvas.drawRightString(PAGE_W - MARGIN_X, 0.72 * cm, f"Página {doc.page}")
        canvas.setFillColor(PINK if doc.page % 2 else CYAN)
        canvas.rect(0, 0, 0.15 * cm, PAGE_H, fill=1, stroke=0)
    canvas.restoreState()


def P(text: object, style: str = "body") -> Paragraph:
    return Paragraph(esc(text).replace("\n", "<br/>"), STYLES[style])


def R(text: str, style: str = "body") -> Paragraph:
    return Paragraph(safe_text(text), STYLES[style])


def H1(text: str) -> Paragraph:
    return Paragraph(esc(text), STYLES["h1"])


def H2(text: str) -> Paragraph:
    return Paragraph(esc(text), STYLES["h2"])


def H3(text: str) -> Paragraph:
    return Paragraph(esc(text), STYLES["h3"])


def code(text: str) -> Table:
    block = XPreformatted(safe_text(text).strip(), STYLES["code"])
    table = Table([[block]], colWidths=[CONTENT_W], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#171126")),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#4b3a69")),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def callout(title: str, text: str, color=PINK) -> Table:
    data = [
        [Paragraph(f"<b>{esc(title)}</b>", STYLES["callout"])],
        [P(text, "callout")],
    ]
    table = Table(data, colWidths=[CONTENT_W], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#faf7fd")),
                ("BOX", (0, 0), (-1, -1), 0.8, color),
                ("LINEBEFORE", (0, 0), (0, -1), 4, color),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def bullet(items: list[str], level: int = 0) -> list[Paragraph]:
    result = []
    for item in items:
        style = ParagraphStyle(
            f"Bullet{level}",
            parent=STYLES["body"],
            leftIndent=(13 + level * 12),
            firstLineIndent=-9,
            bulletIndent=(3 + level * 12),
            spaceAfter=3,
        )
        result.append(Paragraph(f"<bullet>•</bullet>{esc(item)}", style))
    return result


def table(data: list[list[object]], widths: list[float], header=True, compact=False) -> LongTable:
    rows = []
    for row_index, row in enumerate(data):
        rows.append(
            [
                value
                if isinstance(value, Flowable)
                else Paragraph(esc(value), STYLES["table_head" if header and row_index == 0 else "table"])
                for value in row
            ]
        )
    result = LongTable(rows, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), PURPLE if header else PALE),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE if header else INK),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3 if compact else 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3 if compact else 5),
    ]
    if header:
        for index in range(1, len(rows)):
            if index % 2 == 0:
                commands.append(("BACKGROUND", (0, index), (-1, index), PALE))
    result.setStyle(TableStyle(commands))
    return result


def figure(filename: str, caption: str, max_height=9.2 * cm) -> list[Flowable]:
    path = SCREENSHOTS / filename
    if not path.exists():
        return [callout("Captura no disponible", f"No se encontró {path.relative_to(ROOT)}.", GOLD)]
    reader = ImageReader(str(path))
    width, height = reader.getSize()
    scale = min(CONTENT_W / width, max_height / height)
    image = Image(str(path), width=width * scale, height=height * scale)
    image.hAlign = "CENTER"
    return [image, P(caption, "caption")]


def section_page(title: str, subtitle: str) -> list[Flowable]:
    return [
        PageBreak(),
        Spacer(1, 1.2 * cm),
        H1(title),
        HRFlowable(width="42%", thickness=3, color=PINK, spaceBefore=2, spaceAfter=12, hAlign="LEFT"),
        P(subtitle),
        Spacer(1, 0.4 * cm),
    ]


def load_chapter_stats(loader) -> dict[str, int]:
    stats = Counter()
    for index in range(7):
        chapter = json.loads(loader(index))
        stats["chapters"] += 1
        stats["scenes"] += len(chapter.get("scenes", []))
        for scene in chapter.get("scenes", []):
            stats["lines"] += len(scene.get("lines", []))
            for line in scene.get("lines", []):
                stats["choices"] += len(line.get("choices", []))
                for action in line.get("actions", []):
                    stats["actions"] += 1
                    stats["strings" if isinstance(action, str) else "objects"] += 1
    return dict(stats)


def current_chapter(index: int) -> str:
    return (ROOT / "chapters" / f"chapter{index}.json").read_text(encoding="utf-8")


def head_chapter(index: int) -> str:
    return subprocess.check_output(
        ["git", "show", f"HEAD:chapters/chapter{index}.json"], cwd=ROOT, text=True, encoding="utf-8"
    )


def extract_comment(lines: list[str], line_index: int) -> str:
    comments = []
    cursor = line_index - 1
    skipped_blank = False
    while cursor >= 0 and len(comments) < 8:
        stripped = lines[cursor].strip()
        if stripped.startswith("//"):
            comments.append(stripped[2:].strip())
        elif not stripped and not skipped_blank:
            skipped_blank = True
        else:
            break
        cursor -= 1
    comments.reverse()
    text = " ".join(comments)
    text = re.sub(r"\s+", " ", text)
    return safe_text(text[:240])


VERBS = {
    "get": "Obtiene",
    "set": "Establece",
    "load": "Carga",
    "preload": "Precarga",
    "apply": "Aplica",
    "resolve": "Resuelve",
    "normalize": "Normaliza",
    "start": "Inicia",
    "stop": "Detiene",
    "show": "Muestra",
    "hide": "Oculta",
    "play": "Reproduce o ejecuta",
    "run": "Ejecuta",
    "clear": "Limpia",
    "remove": "Retira",
    "update": "Actualiza",
    "capture": "Captura",
    "restore": "Restaura",
    "record": "Registra",
    "trigger": "Dispara",
    "calculate": "Calcula",
    "can": "Comprueba si se puede",
    "is": "Comprueba si está",
    "has": "Comprueba si existe",
    "hay": "Indica si hay",
    "abortar": "Cancela",
    "replay": "Reproduce de nuevo",
    "rewind": "Retrocede",
    "reset": "Restablece",
    "wait": "Espera",
    "go": "Navega a",
    "jump": "Salta a",
    "focus": "Enfoca",
    "unfocus": "Desenfoca",
    "save": "Guarda",
    "open": "Abre",
    "close": "Cierra",
    "render": "Renderiza",
    "wire": "Conecta controles de",
    "toggle": "Alterna",
    "fit": "Ajusta",
    "unlock": "Desbloquea",
    "monitor": "Vigila",
    "finish": "Finaliza",
    "create": "Crea",
    "arm": "Programa",
    "invoke": "Invoca",
    "cancel": "Cancela",
    "listen": "Registra un listener para",
    "own": "Declara como recurso propio",
    "attach": "Asocia",
}


SPECIAL_DESCRIPTIONS = {
    "constructor": "Inicializa la instancia y sus dependencias internas.",
    "executeAction": "Normaliza una acción objeto o DSL y la delega al intérprete.",
    "nextLine": "Ejecuta la siguiente línea, sus acciones, condiciones, diálogo y decisiones; devuelve si queda contenido.",
    "displayDialog": "Pinta hablante y texto, calcula el ritmo del typewriter, gestiona emociones y deja la línea lista para avanzar.",
    "displayChoices": "Construye las opciones, bloquea el avance de fondo y resuelve la elección seleccionada o cancelada.",
    "playMinigame": "Despacha el minijuego solicitado y coordina cancelación, reintento, audio y limpieza global.",
    "limpiarMinijuegosActivos": "Cancela instancias activas y elimina overlays, audio y depuración residual.",
    "clearStage": "Limpia escenario, personajes, fondos, CG, efectos y audio según las opciones recibidas.",
    "reset": "Devuelve el motor a un estado inicial sin borrar el progreso que debe persistir entre capítulos.",
    "loadChapter": "Lee y valida el JSON del capítulo, reinicia cursores y prepara la primera escena.",
    "loadCharacter": "Carga la ficha JSON de personaje y aplica capas limpias, parpadeos y animaciones disponibles.",
    "setBackground": "Cambia el fondo con corte o transición y mantiene sincronizadas las dos capas visuales.",
    "showCharacter": "Coloca un sprite con pose, entrada, escala, orientación y desplazamiento vertical.",
    "playSound": "Crea o reutiliza audio, aplica volumen, loop, fundido e identificador de control.",
    "stopAllSounds": "Detiene y libera todas las instancias de audio para evitar conexiones y reproducción residual.",
    "recordSceneEntry": "Guarda una fotografía del progreso y del escenario para retroceso y menú de escenas.",
    "rewindToPreviousScene": "Restaura la fotografía anterior y reinicia su reproducción desde la primera línea.",
    "setGamePaused": "Congela o reanuda reloj virtual, multimedia y contextos de audio de la partida.",
    "volverAlMenuPrincipal": "Abandona la partida en curso, limpia el motor y devuelve un menú interactivo.",
    "playGame": "Mantiene el bucle principal y atiende salida, retroceso, salto de escena y avance de líneas.",
    "desbloquearBucle": "Libera de forma segura una espera de diálogo, elección o minijuego para atender navegación global.",
    "parseAction": "Convierte una cadena DSL en el objeto de acción equivalente y valida sus argumentos.",
    "serializeAction": "Convierte un objeto de acción plano a DSL cuando el round-trip puede conservar todos sus datos.",
    "cleanupAll": "Cancela todas las instancias de minijuego registradas y devuelve cuántas se limpiaron.",
}


def split_camel(name: str) -> str:
    spaced = re.sub(r"([a-záéíóúñ])([A-Z])", r"\1 \2", name.replace("_", " "))
    return spaced.lower()


def inferred_description(name: str) -> str:
    if name in SPECIAL_DESCRIPTIONS:
        return SPECIAL_DESCRIPTIONS[name]
    lowered = name.lower()
    for prefix, verb in sorted(VERBS.items(), key=lambda item: -len(item[0])):
        if lowered.startswith(prefix.lower()) and len(name) > len(prefix):
            rest = name[len(prefix) :]
            return f"{verb} {split_camel(rest)} dentro del flujo correspondiente."
    return f"Implementa la operación {split_camel(name)} del módulo."


def extract_entries(path: Path, kind: str) -> list[dict[str, object]]:
    lines = path.read_text(encoding="utf-8").splitlines()
    entries = []
    current_class = None
    for index, line in enumerate(lines):
        class_match = re.match(r"^(?:export\s+)?class\s+([A-Za-z_$][\w$]*)", line)
        if class_match:
            current_class = class_match.group(1)
            continue
        if kind == "game":
            match = re.match(r"^(async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\((.*)", line)
            owner = "game.js"
        else:
            # A method declaration lives at four spaces *inside* a class.  Top-level
            # helper bodies use the same indentation, so clear the active owner at
            # the class-closing brace and never catalogue lines outside a class.
            if re.match(r"^}\s*;?\s*$", line):
                current_class = None
                continue
            if current_class is None:
                continue
            match = re.match(r"^\s{4}(?:(static)\s+)?(async\s+)?([A-Za-z_$][\w$]*)\s*\((.*)", line)
            owner = current_class
        if not match:
            continue
        if kind == "game":
            async_mark, name, tail = match.groups()
            static_mark = None
        else:
            static_mark, async_mark, name, tail = match.groups()
        signature_lines = [line.strip()]
        cursor = index
        while ")" not in " ".join(signature_lines) and cursor + 1 < len(lines):
            cursor += 1
            signature_lines.append(lines[cursor].strip())
        signature = re.sub(r"\s+", " ", " ".join(signature_lines)).split("{")[0].strip()
        comment = extract_comment(lines, index)
        description = comment if len(comment) >= 18 else inferred_description(name)
        entries.append(
            {
                "name": name,
                "owner": owner,
                "line": index + 1,
                "signature": signature[:155],
                "description": description,
                "async": bool(async_mark),
                "static": bool(static_mark),
                "internal": name.startswith("_"),
                "file": path.relative_to(ROOT).as_posix(),
            }
        )
    return entries


def api_table(entries: list[dict[str, object]]) -> LongTable:
    rows = [["Función y firma", "Ubicación", "Responsabilidad"]]
    for entry in entries:
        tags = []
        if entry["async"]:
            tags.append("async")
        if entry["static"]:
            tags.append("static")
        if entry["internal"]:
            tags.append("interna")
        label = entry["signature"] + (f" [{', '.join(tags)}]" if tags else "")
        rows.append(
            [
                Paragraph(esc(label), STYLES["table"]),
                Paragraph(esc(f"{entry['file']}:{entry['line']}"), STYLES["table"]),
                Paragraph(esc(entry["description"]), STYLES["table"]),
            ]
        )
    return table(rows, [6.1 * cm, 3.2 * cm, 7.25 * cm], compact=True)


def chapter_titles() -> list[tuple[str, str, int, bool]]:
    result = []
    for index in range(7):
        payload = json.loads(current_chapter(index))
        result.append((f"chapter{index}", payload["title"], len(payload["scenes"]), bool(payload.get("isFinal"))))
    return result


def add_cover(story: list[Flowable]) -> None:
    story.extend(
        [
            Spacer(1, 0.65 * cm),
            Paragraph("MANUAL COMPLETO", STYLES["cover_sub"]),
            Paragraph("Motor, juego y construcción de capítulos", STYLES["cover_title"]),
            Paragraph(
                "Project AI.ri: Transfurmados<br/>Guía de usuario, arquitectura, DSL, recetas y referencia exhaustiva de API",
                STYLES["cover_sub"],
            ),
            Spacer(1, 0.35 * cm),
        ]
    )
    story.extend(figure("01_menu_principal.png", "", max_height=8.3 * cm)[:-1])
    story.extend(
        [
            Spacer(1, 0.5 * cm),
            Paragraph(
                f"Edición verificada: {VERIFIED_DATE}<br/>Versión del proyecto: 1.0.0<br/>Fuente: árbol de trabajo local y DOCUMENTACION.md",
                STYLES["cover_sub"],
            ),
            Spacer(1, 0.25 * cm),
            Paragraph(
                "Este PDF es una exportación de consulta. Si difiere del repositorio, prevalecen DOCUMENTACION.md y el código validado.",
                STYLES["cover_sub"],
            ),
            PageBreak(),
        ]
    )


def build_story() -> list[Flowable]:
    story: list[Flowable] = []
    add_cover(story)

    current = load_chapter_stats(current_chapter)
    try:
        previous = load_chapter_stats(head_chapter)
    except (subprocess.SubprocessError, FileNotFoundError):
        previous = {"actions": current["actions"], "strings": 0, "objects": current["actions"]}

    visual_entries = extract_entries(ROOT / "engine" / "VisualNovelEngine.js", "class")
    game_entries = extract_entries(ROOT / "game.js", "game")
    module_paths = [
        ROOT / "engine" / "ActionInterpreter.js",
        ROOT / "engine" / "AudioController.js",
        ROOT / "engine" / "DOMRenderer.js",
        ROOT / "engine" / "HistoryManager.js",
        ROOT / "engine" / "TimeManager.js",
        ROOT / "minigames" / "MinigameBase.js",
    ]
    module_entries = []
    for module_path in module_paths:
        module_entries.extend(extract_entries(module_path, "class"))
        # Funciones exportadas de nivel superior importantes.
        lines = module_path.read_text(encoding="utf-8").splitlines()
        for index, line in enumerate(lines):
            match = re.match(r"^export\s+(async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\((.*)", line)
            if not match:
                continue
            async_mark, name, _ = match.groups()
            signature = line.split("{")[0].strip()
            module_entries.append(
                {
                    "name": name,
                    "owner": module_path.stem,
                    "line": index + 1,
                    "signature": signature,
                    "description": SPECIAL_DESCRIPTIONS.get(name, inferred_description(name)),
                    "async": bool(async_mark),
                    "static": False,
                    "internal": name.startswith("_"),
                    "file": module_path.relative_to(ROOT).as_posix(),
                }
            )

    story += [H1("Cómo usar este manual")]
    story += [
        P(
            "El documento tiene dos recorridos. La primera parte explica cómo jugar y diagnosticar problemas. La segunda enseña cómo está construido el proyecto, cómo se escriben capítulos y cómo extender el motor. Los apéndices enumeran todas las funciones detectadas en el código actual."
        ),
        callout(
            "Regla de autoridad",
            "DOCUMENTACION.md conserva los manuales canónicos. Este PDF se vuelve a generar para ofrecer maquetación, capturas y una referencia de API fechada; no debe editarse a mano.",
            CYAN,
        ),
        Spacer(1, 0.2 * cm),
        table(
            [
                ["Dato verificado", "Valor"],
                ["Capítulos", current["chapters"]],
                ["Escenas", current["scenes"]],
                ["Líneas narrativas", current["lines"]],
                ["Acciones de línea", current["actions"]],
                ["Acciones DSL", current["strings"]],
                ["Objetos complejos conservados", current["objects"]],
                ["Métodos detectados en VisualNovelEngine", len([e for e in visual_entries if e["owner"] == "VisualNovelEngine"])],
                ["Funciones detectadas en game.js", len(game_entries)],
            ],
            [9.5 * cm, 7.05 * cm],
        ),
        Spacer(1, 0.25 * cm),
        H2("Índice"),
    ]
    toc = TableOfContents()
    toc.levelStyles = [STYLES["toc"], STYLES["toc2"]]
    story += [toc]

    story += section_page(
        "Parte I - Manual de usuario",
        "Arranque, controles, menús, capítulos, galería, minijuegos y resolución de problemas.",
    )
    story += [H1("1. Arranque e instalación")]
    story += [
        H2("1.1 Formas de abrir el juego"),
        table(
            [
                ["Entorno", "Procedimiento", "Cuándo usarlo"],
                ["Aplicación instalada", "Abrir Transfurmados desde el acceso directo.", "Jugador final."],
                ["Electron de desarrollo", "npm start", "Probar el escritorio con el bundle actual."],
                ["Navegador local", "start.bat o npm run dev:web", "Desarrollo, Tools, banco de minijuegos y tests."],
            ],
            [4.2 * cm, 6.2 * cm, 6.15 * cm],
        ),
        H2("1.2 Primer arranque"),
    ]
    story += bullet(
        [
            "Pulsa Entrar con sonido para autorizar audio en el navegador.",
            "Espera al opening o usa Saltar opening.",
            "El menú principal aparece al terminar. Si el vídeo falla, el aviso mantiene disponible el salto.",
            "La aplicación recuerda volumen y velocidad de texto, pero Capítulos inicia el capítulo elegido con estado narrativo limpio.",
        ]
    )
    story += [H1("2. Menú principal y navegación")]
    story += figure(
        "01_menu_principal.png",
        "Figura 1. Menú principal. Los accesos Tools, Minijuegos y Tests sólo aparecen en desarrollo local o Electron sin empaquetar.",
    )
    story += [
        table(
            [
                ["Opción", "Resultado"],
                ["Comenzar", "Inicia desde el prólogo y reinicia progreso narrativo de una partida nueva."],
                ["Capítulos", "Muestra los siete capítulos detectados y arranca el elegido desde un estado limpio."],
                ["Galería", "Abre arte canónico, filtros, poses, vídeo y protección de spoilers."],
                ["Configuración", "Ajusta texto, sonido, ventana y ayudas opcionales."],
                ["Salir", "Cierra Electron. No se muestra como cierre fiable en navegador."],
                ["Tools", "Abre las herramientas gráficas locales tras comprobar el servicio del puerto 8011."],
                ["Minijuegos", "Abre el catálogo de QA de minijuegos aislados."],
                ["Tests", "Abre el catálogo local de pruebas de carga y rendimiento."],
            ],
            [4.2 * cm, 12.35 * cm],
        ),
        H2("2.1 Selector de capítulos"),
    ]
    story += figure(
        "02_selector_capitulos.png",
        "Figura 2. Selector de capítulos. No es una pantalla de partidas guardadas: carga una entrada narrativa limpia.",
    )
    chapter_rows = [["Archivo", "Título", "Escenas", "Final"]]
    for file_id, title, scenes, is_final in chapter_titles():
        chapter_rows.append([file_id, title, scenes, "Sí" if is_final else "No"])
    story += [table(chapter_rows, [2.4 * cm, 9.0 * cm, 2.4 * cm, 2.75 * cm])]

    story += [H1("3. Controles y lectura")]
    story += [
        table(
            [
                ["Entrada", "Efecto"],
                ["Clic / toque", "Completa el texto en curso; con la línea completa, avanza."],
                ["Espacio / Enter", "Equivale al clic salvo cuando una elección, vídeo o minijuego captura la entrada."],
                ["Mantener Ctrl", "Acelera typewriter y líneas; nunca decide ni juega por ti."],
                ["Esc", "Abre o cierra pausa; en cinemática, salta el vídeo."],
                ["H / clic derecho", "Oculta o recupera todo el HUD sin avanzar el texto."],
                ["F11", "Alterna pantalla completa en Windows/Electron."],
            ],
            [4.0 * cm, 12.55 * cm],
        )
    ]
    story += figure(
        "05_dialogo_juego.png",
        "Figura 3. Escena narrativa: nombre, diálogo, cursor de avance y controles superiores contextuales.",
    )
    story += [
        H2("3.1 Controles superiores"),
        P(
            "Opciones pausa la partida y permite volver al menú. Escenas enumera el capítulo y distingue rutas visitadas. Retroceder restaura la fotografía de estado guardada al entrar en la escena anterior: fondo, personajes, inventario, variables y audio relevante."
        ),
    ]
    story += figure(
        "06_menu_escenas.png",
        "Figura 4. Menú de escenas. El salto reutiliza el bucle activo; no crea una segunda reproducción del capítulo.",
    )
    story += figure(
        "07_pausa_opciones.png",
        "Figura 5. Pausa global. El reloj virtual, la multimedia y los contextos de audio quedan congelados.",
    )

    story += [H1("4. Configuración, galería y accesibilidad")]
    story += figure(
        "03_configuracion.png",
        "Figura 6. Configuración. Juego contiene velocidad de texto; Sonido y Trucos reúnen sus ajustes específicos.",
    )
    story += bullet(
        [
            "La vista previa de texto usa el mismo cálculo temporal que el diálogo real.",
            "Los volúmenes se aplican por clase: música, voz y efectos.",
            "La pausa conserva la música ambiental cuando corresponde, pero detiene efectos en bucle y reanuda sólo lo que ella pausó.",
            "El modo de ventana se sincroniza con Electron y F11.",
            "Ocultar HUD y los ajustes de ayuda no alteran el JSON del capítulo.",
        ]
    )
    story += figure(
        "04_galeria.png",
        "Figura 7. Galería generada desde metadatos. El contenido con spoilers permanece oculto hasta confirmación.",
    )

    story += [H1("5. Minijuegos")]
    story += [
        P(
            "Los minijuegos narrativos se lanzan desde acciones de capítulo. Durante su ejecución se mantienen disponibles Opciones, Escenas y, cuando procede, Retroceder. Abandonar la actividad cancela listeners, timers, animaciones, audio y overlays antes de continuar o volver al menú."
        ),
        H2("5.1 Banco de QA"),
    ]
    story += figure(
        "08_banco_minijuegos.png",
        "Figura 8. Banco de minijuegos. Cada ficha muestra sólo sus opciones; Personalizado habilita valores numéricos y Como en la historia lee el JSON real.",
    )
    story += figure(
        "09_minijuego_zip.png",
        "Figura 9. Bullet Hell de Zip en ejecución aislada. El banco reutiliza exactamente el motor del juego.",
    )
    story += [
        table(
            [
                ["Grupo", "Pruebas incluidas"],
                ["Ritmo y audio", "Neon Runner, Vocal Echo."],
                ["Acción", "Persecución, Edu volando, Recolectar guindillas, Bullet Hell de Zip."],
                ["Combate", "Equilibrio de poderes, Battle."],
                ["Herramientas", "Investigación de Furrielva, Créditos."],
            ],
            [4.0 * cm, 12.55 * cm],
        ),
        callout(
            "Salida segura",
            "Si el menú parece no responder tras salir de un minijuego, confirma que el bundle se reconstruyó. La versión actual llama limpiarMinijuegosActivos() tanto al abortar como al resetear el motor.",
            CYAN,
        ),
    ]

    story += [H1("6. Resolución de problemas del jugador")]
    story += [
        table(
            [
                ["Síntoma", "Comprobación y solución"],
                ["No hay sonido", "Pulsa Entrar con sonido; revisa Sonido y el volumen del dispositivo."],
                ["Opening bloqueado", "Usa Saltar opening. Un error de vídeo no debe impedir llegar al menú."],
                ["Capítulo vacío", "Ejecuta desde servidor local o Electron; abrir index.html como file:// rompe fetch."],
                ["Botones del menú inertes", "Vuelve mediante el flujo del juego. setMainMenuVisible restaura hidden, inert y aria-hidden juntos."],
                ["Minijuego sigue detrás", "Reconstruye engine.bundle.js y verifica que MinigameBase.cleanupAll está incluido."],
                ["Tools no abre", "Ejecuta start.bat o npm run tools:eyes y comprueba el puerto 8011."],
                ["Sprites o fondos 404", "Ejecuta npm run validate:content y respeta rutas relativas a la raíz."],
            ],
            [4.2 * cm, 12.35 * cm],
        )
    ]

    story += section_page(
        "Parte II - Manual de desarrollo",
        "Arquitectura, ejecución, DSL, capítulos, personajes, audio, pausa, historial, minijuegos, build y decisiones de diseño.",
    )
    story += [H1("7. Modelo mental del runtime")]
    story += [
        P(
            "El navegador carga un bundle clásico porque index.html y Electron consumen scripts globales. La fuente se mantiene en módulos ES, esbuild genera engine.bundle.js y después se cargan los minijuegos externos y game.js. No se usa Vite."
        ),
        table(
            [
                ["Capa", "Responsabilidad", "Archivos principales"],
                ["Presentación", "DOM, CSS, menú, diálogo, galería y controles.", "index.html, styles.css, game.js"],
                ["Orquestación", "Bucle de capítulo, navegación, pausa y estado de UI.", "game.js"],
                ["Motor narrativo", "Capítulos, acciones, personajes, audio, diálogo e historial.", "engine/VisualNovelEngine.js"],
                ["Servicios", "Intérprete, audio, DOM, tiempo e historial.", "engine/*.js"],
                ["Contenido", "Guion, personajes y metadatos.", "chapters/, characters/, assets/metadata/"],
                ["Minijuegos", "Motores integrados y módulos externos con ciclo de vida común.", "*-minigame.js, minigames/"],
                ["Distribución", "Bundle web y aplicación Electron.", "engine.bundle.js, electron/, package.json"],
            ],
            [3.1 * cm, 7.0 * cm, 6.45 * cm],
        ),
        H2("7.1 Orden de carga"),
        code(
            "effects.js\n"
            "  -> engine.bundle.js\n"
            "  -> battle / hitboxes / créditos / guindillas / Ketchup / runas\n"
            "  -> juice.js\n"
            "  -> game.js"
        ),
        H2("7.2 Flujo de una línea"),
        code(
            "playGame()\n"
            "  -> engine.nextLine()\n"
            "     -> comprobar showIf y consecuencias\n"
            "     -> ejecutar actions en orden\n"
            "     -> displayDialog(line)\n"
            "     -> ejecutar afterActions\n"
            "     -> displayChoices() si existen\n"
            "  -> waitForClick()\n"
            "  -> repetir o endGame()"
        ),
    ]

    story += [H1("8. Por qué se cambió la arquitectura")]
    story += [
        table(
            [
                ["Cambio", "Problema anterior", "Razón y efecto actual"],
                ["DSL JSON", "Cada acción simple repetía type y nombres de propiedades.", "Reduce ruido y mantiene objetos para estructuras complejas."],
                ["ActionInterpreter", "El switch de acciones estaba mezclado con todo el motor.", "Centraliza parseo, aliases, macros y despacho."],
                ["TimeManager", "game.js parcheaba timers, Date.now, performance.now y RAF.", "La pausa se instala una vez y tiene pruebas deterministas."],
                ["Controladores", "Audio, DOM e historial dependían del monolito sin una frontera explícita.", "Ofrecen puntos de entrada pequeños y comprobables."],
                ["Bundle esbuild", "Los navegadores clásicos y Electron necesitaban globals.", "La fuente usa import/export sin cambiar la forma de arrancar."],
                ["MinigameBase", "Salir eliminaba el overlay, pero podían sobrevivir listeners y timers.", "Registra recursos e instancias y permite cleanupAll."],
                ["Variables CSS", "Colores y z-index mágicos se repetían.", "Centraliza identidad visual y capas globales."],
            ],
            [3.1 * cm, 6.4 * cm, 7.05 * cm],
        ),
        callout(
            "Compatibilidad primero",
            "La migración no obliga a reescribir todo de una vez: parseAction acepta objetos heredados, serializeAction sólo convierte cuando el round-trip es exacto y engine.bundle.js conserva los globals que ya espera el HTML.",
            GOLD,
        ),
    ]

    story += [H1("9. Intérprete de acciones y DSL")]
    story += [
        P(
            "ActionInterpreter.normalize acepta un objeto, una cadena o una macro. execute procesa arrays expandidos y executeObject despacha el tipo normalizado. Los escalares key=value reconocen números, true, false y null; los textos con espacios deben ir entre comillas."
        ),
        H2("9.1 Sintaxis básica"),
        code(
            "show nexo right happy\n"
            "background assets/images/backgrounds/chapter0/habitacion_neon.webp\n"
            "sound assets/audio/music/chapter0/nexo.mp3 volume=1 loop=true id=nexo fadeIn=600\n"
            "fade to black duration=350\n"
            "goto \"Escena 4: Mercaguasa\"\n"
            "minigame battle enemy=amalgama enemyHp=840 retryOnDefeat=true"
        ),
        H2("9.2 Macro sceneStart"),
        code(
            "sceneStart assets/images/backgrounds/chapter2/fabrica.webp duration=400\n\n"
            "# Expansión conceptual:\n"
            "fade to black duration=400\n"
            "background assets/images/backgrounds/chapter2/fabrica.webp\n"
            "fade from black duration=400"
        ),
        H2("9.3 Catálogo de acciones"),
    ]
    action_rows = [
        ["Comando / tipo", "Campos frecuentes", "Efecto"],
        ["background / setBackground", "ruta, cut, duration", "Cambia el fondo y cancela cruces pendientes incompatibles."],
        ["clearBackground / removeBackground", "-", "Vacía fondo y retira personajes al cambiar de escenario."],
        ["show / showCharacter", "character position pose; enter, flipped, scale, offsetY", "Muestra un personaje."],
        ["hide / hideCharacter", "character o position; exit", "Oculta sin olvidar necesariamente la composición."],
        ["remove / removeCharacter / quitarPersonaje", "character o position; exit", "Retira el sprite y su estado de escenario."],
        ["pose / setPose", "character position pose", "Cambia la pose actual."],
        ["animateCharacter / characterAnimation / poseSequence", "poses[], frameMs, loop, untilAdvance", "Anima una secuencia; suele conservarse como objeto."],
        ["stopCharacterAnimation / stopPoseSequence", "character, position", "Detiene la secuencia de pose."],
        ["characterGlitch / glitchCharacter", "character, position, duration", "Aplica glitch local temporal."],
        ["characterFullGlitch / fullCharacterGlitch", "character, position, duration", "Aplica glitch completo."],
        ["characterGlitchUntilAdvance / glitchUntilAdvance", "character, position", "Mantiene glitch hasta avanzar."],
        ["characterAnimeFall / animeFall", "character, position, opciones", "Dispara caída estilizada."],
        ["dialogOff / hideDialog / hideText / ocultarTexto", "-", "Oculta el cuadro de texto."],
        ["setVariable", "name/value o key/value", "Escribe estado narrativo."],
        ["item / giveItem / addItem", "item", "Añade inventario."],
        ["rescue", "character", "Registra rescate manteniendo orden."],
        ["delay / setDelay / addDelay", "value", "Establece o suma presión/retraso de historia."],
        ["sound / playSound", "path; id, volume, loop, fadeIn", "Reproduce audio controlable."],
        ["stopSound", "id, fadeOut", "Detiene un audio concreto."],
        ["stopAllSounds", "-", "Detiene y libera toda la mezcla."],
        ["pauseSound / resumeSound", "id", "Pausa o reanuda una instancia."],
        ["volume / setVolume", "id volume", "Cambia volumen base."],
        ["wait", "ms", "Espera tiempo del reloj pausable."],
        ["setTextDuration / textDuration", "duration", "Fija duración de la línea."],
        ["click / waitForClick / waitClick / esperarClick", "-", "Exige un gesto antes de continuar acciones."],
        ["minigame", "game y opciones", "Despacha una actividad y espera su resultado."],
        ["goto / goToScene", "título o índice", "Solicita salto de escena."],
        ["nextChapter / setNextChapter", "id", "Define la siguiente rama de capítulo."],
        ["video / playVideo / cutscene", "path y fundidos", "Reproduce cinemática saltable."],
        ["shake / screenShake", "intensity duration", "Agita el escenario."],
        ["flash", "color duration", "Destello de pantalla."],
        ["grade / colorGrade / tinte", "value duration", "Aplica corrección de color."],
        ["vignette / vigneta", "value duration", "Controla viñeta visual."],
        ["fade", "to/from color, duration", "Fundido de escena."],
        ["bgPan", "zoomFrom zoomTo duration", "Paneo o zoom del fondo."],
        ["cg / showCG", "path duration", "Muestra ilustración a pantalla."],
        ["hideCG", "duration", "Retira la ilustración."],
        ["sfx", "name on", "Activa un efecto Juice con nombre."],
    ]
    story += [table(action_rows, [5.0 * cm, 5.2 * cm, 6.35 * cm], compact=True)]
    story += [
        H2("9.4 Reglas de escritura segura"),
    ]
    story += bullet(
        [
            "Usa DSL para acciones planas con escalares.",
            "Conserva objeto si hay arrays, mapas anidados, startItems o secuencias de poses.",
            "Pon entre comillas títulos de escena y cualquier valor con espacios, comillas o signo igual.",
            "Las herramientas que inspeccionen capítulos deben llamar engine.actionInterpreter.normalize(action) antes de leer action.game o action.type.",
            "Ejecuta npm run validate:content y las pruebas del motor después de migrar.",
        ]
    )

    story += [H1("10. Construcción de capítulos")]
    story += [
        P(
            "Cada archivo chapters/chapterN.json declara título, escenas y líneas. La línea es la unidad ejecutable: puede tener acciones previas, hablante, texto, expresión, condiciones, decisiones y acciones posteriores."
        ),
        H2("10.1 Esquema actual"),
        table(
            [
                ["Nivel", "Campos observados", "Responsabilidad"],
                ["Capítulo", "title, scenes, isFinal", "Identidad, secuencia y terminación."],
                ["Escena", "title, lines", "Unidad de navegación e historial."],
                ["Línea", "actions, character, text, pose, position, emotion, speakingAs, textSpeed, textAnimation, showIf, choices, afterActions, type", "Diálogo y comportamiento ejecutable."],
                ["Elección", "text, nextScene, nextChapter", "Etiqueta y destino narrativo."],
            ],
            [2.5 * cm, 8.1 * cm, 5.95 * cm],
        ),
        H2("10.2 Plantilla completa"),
        code(
            '{\n'
            '  "title": "Capítulo X: Título",\n'
            '  "scenes": [\n'
            '    {\n'
            '      "title": "Escena 1: Llegada",\n'
            '      "lines": [\n'
            '        {\n'
            '          "actions": [\n'
            '            "sceneStart assets/images/backgrounds/chapterX/llegada.webp",\n'
            '            "show samu left surprised",\n'
            '            "sound assets/audio/music/chapterX/tema.mp3 id=bg_music loop=true"\n'
            '          ],\n'
            '          "character": "Samu",\n'
            '          "text": "Ya estamos aquí.",\n'
            '          "emotion": "surprise",\n'
            '          "afterActions": ["pose samu left determined"]\n'
            '        },\n'
            '        {\n'
            '          "character": "3C",\n'
            '          "text": "Elige con cuidado.",\n'
            '          "choices": [\n'
            '            {"text": "Entrar", "nextScene": "Escena 2: Interior"},\n'
            '            {"text": "Esperar", "nextChapter": "chapter_rama"}\n'
            '          ]\n'
            '        }\n'
            '      ]\n'
            '    }\n'
            '  ]\n'
            '}'
        ),
        H2("10.3 Orden exacto de una línea"),
    ]
    story += bullet(
        [
            "Evaluar showIf y condiciones de consecuencia.",
            "Precargar los assets detectables de la línea.",
            "Ejecutar actions en orden y esperar cada acción asíncrona.",
            "Mostrar texto, retrato, pose y emoción.",
            "Ejecutar afterActions cuando corresponda.",
            "Mostrar choices y aplicar nextScene o nextChapter.",
            "Marcar isWaitingForInput para que game.js espere clic sin crear otro bucle.",
        ]
    )
    story += [
        H2("10.4 Antes y ahora"),
        table(
            [
                ["Métrica", "Antes (HEAD)", "Ahora"],
                ["Acciones totales", previous.get("actions", 0), current.get("actions", 0)],
                ["Cadenas DSL", previous.get("strings", 0), current.get("strings", 0)],
                ["Objetos", previous.get("objects", 0), current.get("objects", 0)],
                ["Capítulos / escenas / líneas", f"{previous.get('chapters', 0)} / {previous.get('scenes', 0)} / {previous.get('lines', 0)}", f"{current.get('chapters', 0)} / {current.get('scenes', 0)} / {current.get('lines', 0)}"],
            ],
            [6.5 * cm, 5.0 * cm, 5.05 * cm],
        ),
        H3("Formato anterior"),
        code(
            '"actions": [\n'
            '  {\n'
            '    "type": "showCharacter",\n'
            '    "character": "samu",\n'
            '    "position": "left",\n'
            '    "pose": "surprised"\n'
            '  }\n'
            ']'
        ),
        H3("Formato actual equivalente"),
        code('"actions": ["show samu left surprised"]'),
        H3("Objeto complejo que debe conservarse"),
        code(
            '{\n'
            '  "type": "animateCharacter",\n'
            '  "character": "nexo",\n'
            '  "position": "right",\n'
            '  "poses": ["happy", "neutral", "happy"],\n'
            '  "frameMs": 220,\n'
            '  "loop": true,\n'
            '  "untilAdvance": true\n'
            '}'
        ),
        callout(
            "Por qué no convertirlo todo",
            "Una cadena es ideal cuando la acción es plana. Arrays y objetos anidados perderían estructura o exigirían una sintaxis difícil de leer; por eso el migrador sólo escribe si parseAction(serializeAction(objeto)) reproduce exactamente el original.",
            GOLD,
        ),
    ]

    story += [H1("11. Personajes, poses y assets")]
    story += [
        P(
            "characters/<id>.json contiene name, color, poses, defaultPose y animaciones. El motor normaliza el identificador, carga la ficha una vez y aplica manifiestos opcionales de limpieza, capas de ojos y parpadeos."
        ),
        code(
            '{\n'
            '  "name": "Nexo",\n'
            '  "color": "#1b8587",\n'
            '  "poses": {\n'
            '    "neutral": "assets/images/characters/others/nexo.webp",\n'
            '    "happy": "assets/images/characters/others/nexo.webp"\n'
            '  },\n'
            '  "defaultPose": "neutral",\n'
            '  "animations": {\n'
            '    "neutral": {"frames": [{"src": "...blink_closed.webp", "duration": 110}], "loop": true}\n'
            '  }\n'
            '}'
        ),
        H2("11.1 Convenciones"),
    ]
    story += bullet(
        [
            "El id del archivo es la clave técnica; name es la etiqueta visible.",
            "Cada pose referenciada por un capítulo debe existir o tener fallback explícito.",
            "Las rutas son relativas a la raíz del proyecto y deben usar barras /.",
            "Los masters y originales se conservan en el árbol workbench con la misma ruta relativa; QA y descartes no se guardan allí.",
            "Narradora es 3C y Nexo es su auxiliar de continuidad; ePod no forma parte del canon activo.",
        ]
    )

    story += [H1("12. Renderizado, diálogo y texto")]
    story += [
        P(
            "DOMRenderer ofrece una frontera pequeña para buscar nodos y añadir o retirar contenido. VisualNovelEngine mantiene todavía la composición detallada: dos fondos para crossfade, tres slots de personajes, CG, capas de ojos, cuadro de diálogo y efectos Juice."
        ),
        H2("12.1 Typewriter"),
    ]
    story += bullet(
        [
            "splitTextGraphemes evita cortar emojis o grafemas combinados.",
            "getTextCharacterDelay añade pausas por puntuación y aplica la velocidad elegida.",
            "calculateTextTiming produce duración visible y total.",
            "setLineTextDuration comparte la duración con efectos sincronizados.",
            "Un clic durante la escritura completa; el siguiente avanza.",
            "speakingAs permite que el nombre visible y el sprite enfocado no sean la misma identidad.",
        ]
    )
    story += [
        H2("12.2 Capas de fondo y CG"),
        P(
            "setBackground alterna background y background-b. clearBackground cancela el timer de intercambio para impedir que un crossfade antiguo restaure una imagen retirada. showCG e hideCG usan una capa independiente para ilustraciones narrativas."
        ),
    ]

    story += [H1("13. Audio")]
    story += [
        table(
            [
                ["Operación", "Uso"],
                ["playSound(path, options)", "Reproduce música, voz o efecto con id, loop, volumen y fadeIn."],
                ["stopSound(id, fadeOut)", "Detiene una instancia o id con fundido opcional."],
                ["pauseSound / resumeSound", "Control explícito sin perder posición."],
                ["setVolume", "Modifica el volumen base antes del factor global."],
                ["stopAllSounds", "Cancela fades, pausa, libera src y vacía pools/registro."],
                ["AudioController", "Fachada pequeña usada por el intérprete y pruebas."],
            ],
            [5.7 * cm, 10.85 * cm],
        ),
        callout(
            "Por qué se libera src",
            "Un audio pausado puede seguir reteniendo una conexión de streaming. stopAllSounds libera el recurso para no agotar el límite de conexiones del navegador durante sesiones largas.",
            CYAN,
        ),
    ]

    story += [H1("14. Tiempo y pausa")]
    story += [
        P(
            "TimeManager instala versiones pausables de setTimeout, setInterval, requestAnimationFrame, Date.now y performance.now. Al pausar, guarda el tiempo restante; al reanudar, arma cada trabajo una sola vez. PausableMediaRegistry mantiene audios y contextos WebAudio conocidos por el juego."
        ),
        code(
            "setGamePaused(true)\n"
            "  -> pausar multimedia y contextos no musicales\n"
            "  -> gamePauseClock.setPaused(true)\n"
            "  -> emitir illo:pausechange\n\n"
            "setGamePaused(false)\n"
            "  -> rearmar timers y RAF pendientes\n"
            "  -> reanudar sólo los medios pausados por el menú"
        ),
        H2("14.1 Regla para código nuevo"),
        P(
            "Usa los timers globales después de instalar engine.bundle.js: quedan interceptados por TimeManager. Dentro de MinigameBase usa timeout() y animationFrame() para que, además de pausables, sean cancelables al abandonar la actividad."
        ),
    ]

    story += [H1("15. Historial y navegación")]
    story += [
        P(
            "Cada entrada de escena conserva cursores, variables, inventario, personajes, fondo y otros datos necesarios para reconstruir la presentación. HistoryManager delega captureStage, restoreStage, rewind, jump y clear al motor sin duplicar el formato de la fotografía."
        ),
        table(
            [
                ["Ruta", "Qué ocurre"],
                ["Retroceder", "Restaura la fotografía anterior y reproduce la escena desde su línea 0."],
                ["Escena visitada", "Recupera la fotografía guardada de esa entrada."],
                ["Escena no visitada", "Salta conservando el progreso actual y deja que la escena registre su entrada."],
                ["Salto de línea de depuración", "Limpia escenario y cambia cursor dentro del mismo playGame."],
                ["Salida al menú", "Desbloquea cualquier espera, cancela actividad y resetea el motor."],
            ],
            [4.2 * cm, 12.35 * cm],
        ),
    ]

    story += [H1("16. Ciclo de vida de minijuegos")]
    story += [
        code(
            "class MiMinijuego extends window.MinigameBase {\n"
            "  start() {\n"
            "    this.state = 'running';\n"
            "    return new Promise(resolve => {\n"
            "      this.resolve = resolve;\n"
            "      const overlay = this.attachOverlay(document.createElement('div'));\n"
            "      this.listen(document, 'keydown', event => this.onKey(event));\n"
            "      this.timeout(() => this.finish(false), 30000);\n"
            "      this.animationFrame(time => this.tick(time));\n"
            "      document.querySelector('#game-container').appendChild(overlay);\n"
            "    });\n"
            "  }\n"
            "}"
        ),
        H2("16.1 Contrato obligatorio"),
    ]
    story += bullet(
        [
            "start devuelve una Promise que termina en victoria, derrota o cancelación.",
            "pause y resume cambian estado sin crear bucles adicionales.",
            "listen, timeout, animationFrame y own registran recursos que cleanup debe retirar.",
            "attachOverlay registra la instancia y observa la retirada externa del nodo.",
            "cancel elimina overlay, limpia recursos y resuelve false si hay una promesa pendiente.",
            "cleanupAll se usa antes de reset y al abortar desde Opciones o Escenas.",
        ]
    )
    story += [
        H2("16.2 Despacho"),
        P(
            "La acción minigame llega a VisualNovelEngine.playMinigame. El switch llama al motor correspondiente y compite contra una Promise de cancelación. La cancelación rechaza con la marca minijuegoCancelado, limpia sin ruido y permite que el bucle atienda salida, salto o retroceso."
        ),
    ]

    story += [H1("17. game.js: coordinación de la aplicación")]
    story += [
        P(
            "game.js no interpreta acciones. Su responsabilidad es unir DOM, menú, galería, configuración, pausa y el bucle de juego con una instancia de VisualNovelEngine. Mantiene banderas de navegación para que exista un solo playGame activo."
        ),
        table(
            [
                ["Subsistema", "Funciones clave"],
                ["Menú", "setMainMenuVisible, showMenuMedia, stopMenuMedia, startNewGame."],
                ["Capítulos", "ensureAvailableChapters, showChapterSelector, startChapterFromSelector."],
                ["Bucle", "playChapter, playGame, waitForClick, endGame."],
                ["Navegación", "desbloquearBucle, abrirMenuEscenas, volverAlMenuPrincipal."],
                ["Pausa", "setGamePaused, abrirMenuPausa, cerrarMenuPausa."],
                ["Galería", "loadGalleryManifest, renderGalleryPanel, closeGalleryPanel."],
                ["Arranque", "setupStartupSequence, startStartupOpening, showMainMenuAfterOpening."],
                ["Depuración", "initDebugMode, toggleDebugPanel, goToLine mediante engine."],
            ],
            [4.2 * cm, 12.35 * cm],
        ),
    ]

    story += [H1("18. Build, validación y distribución")]
    story += [
        table(
            [
                ["Comando", "Qué comprueba o produce"],
                ["npm run build:engine", "Genera engine.bundle.js con esbuild; no usa Vite."],
                ["npm run validate:content", "Capítulos, acciones DSL, personajes, poses y referencias de assets."],
                ["npm run check:modules", "Formato de módulos nuevos, scripts de DSL y tests."],
                ["npm run test:engine", "Intérprete, controladores, MinigameBase y TimeManager."],
                ["npm run test:repeat -- 10", "Repite bundle, contenido y motor para detectar inestabilidad."],
                ["npm run validate:workbench", "Espejo de masters y referencias de workbench."],
                ["npm run audit:assets", "Detecta assets candidatos a optimización."],
                ["npm run dist:dir", "Empaqueta Electron sin crear instalador."],
                ["npm run dist", "Construye el instalador de Windows."],
                ["python scripts/generate_engine_manual_pdf.py", "Regenera este PDF desde el estado actual."],
            ],
            [6.2 * cm, 10.35 * cm],
        ),
        H2("18.1 Checklist de cambio narrativo"),
    ]
    story += bullet(
        [
            "Editar chapters/chapterN.json y fichas de personaje necesarias.",
            "Usar DSL sólo para acciones planas; mantener objetos complejos.",
            "Ejecutar validate:content y test:engine.",
            "Abrir el capítulo desde Capítulos y probar rutas, elecciones, audio y minijuegos.",
            "Revisar salida a Opciones, Escenas y menú durante esperas largas.",
            "Actualizar Manual de usuario si cambia comportamiento visible y Manual de desarrollo si cambia esquema, API o procedimiento.",
            "Regenerar el bundle y, si se entrega documentación, este PDF.",
        ]
    )

    story += section_page(
        "Parte III - Referencia exhaustiva",
        "Inventarios generados desde las firmas y comentarios del código. Las líneas corresponden al árbol de trabajo verificado.",
    )
    story += [H1("19. Referencia de VisualNovelEngine")]
    story += [
        P(
            f"Se detectaron {len([e for e in visual_entries if e['owner'] == 'VisualNovelEngine'])} métodos de VisualNovelEngine. También se incluye MinigameLifeDisplay, definido en el mismo archivo. async indica Promise; interna señala nombres con prefijo _."
        )
    ]
    for owner in sorted({str(entry["owner"]) for entry in visual_entries}):
        entries = [entry for entry in visual_entries if entry["owner"] == owner]
        story += [H2(owner), api_table(entries)]

    story += [H1("20. Referencia de módulos del motor")]
    owner_order = [
        "ActionInterpreter",
        "AudioController",
        "DOMRenderer",
        "HistoryManager",
        "PausableMediaRegistry",
        "TimeManager",
        "MinigameBase",
    ]
    owners = {str(entry["owner"]) for entry in module_entries}
    for owner in owner_order + sorted(owners - set(owner_order)):
        entries = [entry for entry in module_entries if entry["owner"] == owner]
        if not entries:
            continue
        story += [H2(owner), api_table(entries)]

    story += [H1("21. Referencia completa de game.js")]
    game_groups = [
        ("Menú, Tools y navegación temprana", 1, 491),
        ("Configuración", 492, 805),
        ("Galería", 806, 1710),
        ("Pausa y entrada", 1711, 2006),
        ("Opening y multimedia del menú", 2007, 2481),
        ("Capítulos y bucle principal", 2482, 2939),
        ("Guardado y depuración", 2940, 99999),
    ]
    for title, start, end in game_groups:
        entries = [entry for entry in game_entries if start <= int(entry["line"]) <= end]
        if entries:
            story += [H2(title), api_table(entries)]

    story += [H1("22. Recetas rápidas")]
    recipes = [
        (
            "Añadir una línea con personaje",
            '"actions": ["show nexo right happy"],\n"character": "Nexo",\n"text": "Enlace establecido.",\n"emotion": "joy"',
        ),
        (
            "Cambiar de ambiente con fundido",
            '"actions": [\n  "sceneStart assets/images/backgrounds/chapterX/noche.webp duration=450",\n  "sound assets/audio/music/chapterX/noche.mp3 id=bg_music loop=true fadeIn=900"\n]',
        ),
        (
            "Lanzar un minijuego",
            '"actions": [\n  "minigame battle enemy=amalgama enemyHp=840 retryOnDefeat=true useInventory=false"\n]',
        ),
        (
            "Conservar una acción compleja",
            '"actions": [{\n  "type": "animateCharacter",\n  "character": "3c",\n  "position": "left",\n  "poses": ["neutral", "surprised", "neutral"],\n  "frameMs": 180\n}]',
        ),
        (
            "Añadir una ruta",
            '"choices": [\n  {"text": "Seguir", "nextScene": "Escena 3: Camino"},\n  {"text": "Llamar", "nextChapter": "chapter_ruta"}\n]',
        ),
    ]
    for title, snippet in recipes:
        story += [H2(title), code(snippet)]

    story += [H1("23. Glosario y fuentes internas")]
    story += [
        table(
            [
                ["Término", "Definición"],
                ["Acción", "Orden ejecutable previa o posterior a una línea."],
                ["DSL", "Sintaxis textual compacta que representa objetos de acción planos."],
                ["Round-trip", "Serializar y volver a parsear sin cambiar ningún dato."],
                ["Bundle", "engine.bundle.js generado desde los módulos ES para carga clásica."],
                ["Snapshot", "Fotografía de escena usada por historial y retroceso."],
                ["Overlay", "Capa DOM temporal de minijuego, vídeo, modal o pausa."],
                ["RAF", "requestAnimationFrame; bucle de actualización sincronizado con pintado."],
                ["Canon", "Contenido narrativo vigente; 3C y Nexo ocupan los roles activos documentados."],
                ["Workbench", "Espejo versionado de masters y originales, excluido del paquete Electron."],
            ],
            [3.2 * cm, 13.35 * cm],
        ),
        H2("23.1 Fuentes verificadas"),
    ]
    story += bullet(
        [
            "DOCUMENTACION.md y LEER_PRIMERO.md.",
            "engine/VisualNovelEngine.js y los módulos de engine/.",
            "game.js, index.html y styles.css.",
            "chapters/chapter0.json a chapter6.json y characters/*.json.",
            "minigames/MinigameBase.js y los módulos externos de minijuegos.",
            "package.json, scripts de validación y tests/engine/.",
            "Capturas del servidor local http://localhost:8000 realizadas el 8 de agosto de 2026.",
        ]
    )
    story += [
        Spacer(1, 0.5 * cm),
        callout(
            "Fin de la edición",
            f"Manual generado desde {current['chapters']} capítulos, {current['scenes']} escenas, {current['lines']} líneas y {current['actions']} acciones. Regenera el PDF después de cambios de API, esquema, controles o contenido visible.",
            PINK,
        ),
    ]
    return story


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = ManualDocTemplate(str(OUT))
    story = build_story()
    doc.multiBuild(story)
    print(f"PDF generado: {OUT}")


if __name__ == "__main__":
    main()
