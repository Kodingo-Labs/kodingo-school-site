#!/usr/bin/env python3
"""
preprocess.py — Extrae texto de los 3 PDFs de una unidad de inglés Innova Schools
y genera un archivo .md limpio listo para la app de generación de material.

Uso:
    python3 preprocess.py --grado 2do --unidad 4 \
        --keyring "VOCABULARY - key ring - MY BEST CITY EVER -.pdf" \
        --vocab   "Vocabulary - Unit 4.pdf" \
        --temario "TEMARIO - UNIT 4.pdf" \
        --output  "unidades/unit4_2do.md"

Dependencias:
    pip install pdfplumber
"""

import argparse
import re
import sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("ERROR: Instala pdfplumber: pip install pdfplumber")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Correcciones OCR
# ---------------------------------------------------------------------------
OCR_FIXES = {
    "ATLETE":        "ATHLETE",
    "TAEATLCEHTEER": "TEACHER",
    "TEATLCHER":     "TEACHER",
    "ATLHETE":       "ATHLETE",
    "SHOPPPING":     "SHOPPING",
    "SHOPING":       "SHOPPING",
}

# Líneas / tokens que son ruido (encabezados, logos)
NOISE_TOKENS = {
    "unit", "unit4", "vocabulary", "grade", "2nd", "5th",
    "places", "in", "town", "occupations", "key", "ring",
    "innova", "schools", "canva", "my", "best", "city", "ever",
    "vocabulary2ndgrade", "vocabulary5thgrade",
}

# Patrones de lugares de DOS palabras conocidos.
# El script intenta reconstruirlos a partir de palabras adyacentes.
TWO_WORD_PLACES = [
    "Movie Theater", "Gas Station", "Bus Stop", "Train Station",
    "Post Office", "Computer Store", "Music Store", "Pet Shop",
    "Shopping Mall", "Parking Lot", "Police Station", "Fire Station",
    "Town Hall", "Swimming Pool", "Food Court",
]
# Índice en minúsculas para matching rápido
TWO_WORD_INDEX = {p.lower(): p for p in TWO_WORD_PLACES}


def fix_ocr(text: str) -> str:
    for bad, good in OCR_FIXES.items():
        text = text.replace(bad, good)
    return text


def is_noise(token: str) -> bool:
    return token.lower().strip(".:,") in NOISE_TOKENS or not token.strip()


# ---------------------------------------------------------------------------
# Parser: PDF de vocabulario principal
# Estrategia: extraer texto completo página por página, segmentar en secciones
# (Places, Occupations), luego parsear cada token con bigram matching.
# ---------------------------------------------------------------------------

def parse_vocabulary(pdf_path: str) -> tuple[list[str], list[str]]:
    """Extrae lugares y profesiones del PDF de vocabulario principal."""

    raw_lines: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            text = fix_ocr(text)
            raw_lines.extend(text.splitlines())

    in_occupations = False
    place_tokens: list[str] = []
    occ_tokens: list[str] = []

    for line in raw_lines:
        line = line.strip()
        line_up = line.upper()

        # Detectar cambio de sección
        if "OCCUPATION" in line_up:
            in_occupations = True
            continue
        if "PLACES" in line_up or "TOWN" in line_up:
            in_occupations = False
            continue

        # Saltar encabezados de página
        if any(n in line_up for n in ["UNIT", "VOCABULARY", "GRADE", "2ND", "5TH"]):
            continue

        # Tomar solo palabras en MAYÚSCULAS (ignora frases mixtas / pie de página)
        for word in line.split():
            word = fix_ocr(word.strip(".,;:"))
            if word.isupper() and len(word) > 1 and not is_noise(word):
                if in_occupations:
                    occ_tokens.append(word.title())
                else:
                    place_tokens.append(word.title())

    # Reconstruir frases de 2 palabras para lugares
    places = reconstruct_multiword(place_tokens)
    occupations = dedup(occ_tokens)
    return places, occupations


def reconstruct_multiword(tokens: list[str]) -> list[str]:
    """
    Recorre la lista de tokens y une pares que forman un lugar de 2 palabras conocido.
    El resto quedan como lugares de 1 palabra.
    """
    result = []
    i = 0
    while i < len(tokens):
        if i + 1 < len(tokens):
            bigram = (tokens[i] + " " + tokens[i + 1]).lower()
            if bigram in TWO_WORD_INDEX:
                result.append(TWO_WORD_INDEX[bigram])
                i += 2
                continue
        result.append(tokens[i])
        i += 1
    return dedup(result)


def dedup(lst: list[str]) -> list[str]:
    seen = set()
    result = []
    for item in lst:
        k = item.lower()
        if k not in seen:
            seen.add(k)
            result.append(item)
    return sorted(result)


# ---------------------------------------------------------------------------
# Parser: Key ring — solo página de acciones (última página)
# Las acciones están en minúsculas y contienen verbos identificables.
# ---------------------------------------------------------------------------

ACTION_VERBS = {"see", "buy", "put", "take", "eat", "mail", "get", "visit", "read", "use", "play", "go"}

# Mapa de palabra clave → acción formateada place → action
ACTION_MAP = {
    "movie":     "Movie Theater → see a movie",
    "gas":       "Gas Station → put gas in the car",
    "fruits":    "Supermarket → buy fruits",
    "computer":  "Computer Store → buy a computer",
    "bus":       "Bus Stop → take the bus",
    "book":      "Bookstore → buy a book",
    "pizza":     "Restaurant → eat a pizza",
    "letter":    "Post Office → mail a letter",
    "pet":       "Pet Shop → buy pet food",
    "bank":      "Bank → get money",
    "park":      "Park → play outside",
    "hospital":  "Hospital → see a doctor",
    "school":    "School → study",
}


def parse_keyring_actions(pdf_path: str) -> list[str]:
    """
    Extrae las acciones de la última página del key ring.
    Devuelve lista de strings "Place → action".
    """
    all_text = ""
    with pdfplumber.open(pdf_path) as pdf:
        # La última página suele contener las acciones
        last_page = pdf.pages[-1]
        text = last_page.extract_text() or ""
        all_text = fix_ocr(text).lower()

    actions = []
    for keyword, formatted in ACTION_MAP.items():
        if keyword in all_text and formatted not in actions:
            actions.append(formatted)

    # Si no encontramos nada en la última página, revisar todas
    if not actions:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = fix_ocr(page.extract_text() or "").lower()
                for keyword, formatted in ACTION_MAP.items():
                    if keyword in text and formatted not in actions:
                        actions.append(formatted)

    return actions


# ---------------------------------------------------------------------------
# Parser: Temario
# ---------------------------------------------------------------------------

def parse_temario(pdf_path: str) -> list[str]:
    sessions = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = fix_ocr(page.extract_text() or "")
            for line in text.splitlines():
                line = line.strip()
                if re.match(r"SESSION\s+\d+", line, re.IGNORECASE):
                    sessions.append(line)
    return sessions


# ---------------------------------------------------------------------------
# Generador de MD
# ---------------------------------------------------------------------------

def generate_md(grado, unidad, unit_name, places, actions, occupations, sessions) -> str:
    lines = [
        f"# Unit {unidad} — {grado} Grado",
        f"**Nombre de la unidad:** {unit_name}",
        "",
        "## Places in Town",
    ]
    for p in places:
        lines.append(f"- {p}")
    lines.append("")

    if actions:
        lines.append("## Actions (place → action)")
        for a in actions:
            lines.append(f"- {a}")
        lines.append("")

    if occupations:
        lines.append("## Occupations")
        for o in occupations:
            lines.append(f"- {o}")
        lines.append("")

    lines += [
        "## Grammar",
        "<!-- Editar si la gramática de la unidad cambia -->",
        "- Want to + verb (I want to eat ice cream)",
        "- Where is + place? (Where is the bank?)",
        "- There is / There are",
        "",
    ]

    if sessions:
        lines.append("## Sessions")
        for s in sessions:
            lines.append(f"- {s}")
        lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Preprocesa PDFs Innova Schools → .md")
    parser.add_argument("--grado",     required=True)
    parser.add_argument("--unidad",    required=True)
    parser.add_argument("--keyring",   required=True)
    parser.add_argument("--vocab",     required=True)
    parser.add_argument("--temario",   required=True)
    parser.add_argument("--output",    required=True)
    parser.add_argument("--unit-name", default="")
    args = parser.parse_args()

    print(f"📄 Vocabulario: {args.vocab}")
    places, occupations = parse_vocabulary(args.vocab)

    print(f"📄 Key ring (acciones): {args.keyring}")
    actions = parse_keyring_actions(args.keyring)

    print(f"📄 Temario: {args.temario}")
    sessions = parse_temario(args.temario)

    unit_name = args.unit_name or f"Unit {args.unidad}"
    md = generate_md(args.grado, args.unidad, unit_name, places, actions, occupations, sessions)

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(md, encoding="utf-8")

    print(f"\n✅ {args.output}")
    print(f"   Lugares:     {len(places)}")
    print(f"   Acciones:    {len(actions)}")
    print(f"   Profesiones: {len(occupations)}")
    print(f"   Sesiones:    {len(sessions)}")
    print("\n--- Contenido generado ---")
    print(md)


if __name__ == "__main__":
    main()
