# Proyecto: Sistema de Refuerzo de Vocabulario — Inglés Primaria

## Qué es esto
App web que genera material de refuerzo de inglés para dos hijos a partir de los PDFs oficiales de Innova Schools. El padre sube los PDFs por unidad, la app llama a Claude API y genera 4 materiales interactivos en HTML.

## Hijos / niveles
| Hijo | Grado | Nivel |
|------|-------|-------|
| Hijo 1 | 2do grado | Principiante |
| Hijo 2 | 5to grado | Intermedio |

## PDFs de entrada (3 por grado por unidad)
| Archivo | Contenido |
|---------|-----------|
| `VOCABULARY - key ring - [nombre unidad].pdf` | Flashcards en grilla (vocabulario visual) |
| `Vocabulary - Unit X.pdf` | Vocabulario con contexto peruano + profesiones |
| `TEMARIO - UNIT X.pdf` | Sesiones y objetivos de aprendizaje |

> Los PDFs son principalmente imágenes. `preprocess.py` extrae solo el texto relevante.

## Flujo de trabajo
```
PDFs  →  preprocess.py  →  unit{N}_{grado}.md  →  index.html (app)  →  4 HTMLs generados
```

1. **Preprocesar** (una vez por unidad): `python3 preprocess.py --grado 2do --unidad 4 ...`
2. **Generar material**: abrir `index.html`, seleccionar unidad y grado, presionar "Generar"
3. **Usar**: los HTMLs generados se abren en navegador (tablet, celular, PC) o se imprimen

## Estructura de archivos del proyecto
```
proyecto/
├── CLAUDE.md               ← este archivo
├── index.html              ← app principal (React CDN + Claude API)
├── assets/
│   ├── app.js
│   └── styles.css
├── unidades/               ← MDs preprocesados (NO se suben al repo)
│   ├── unit4_2do.md
│   └── unit4_5to.md
└── generado/               ← HTMLs generados (sí se suben al repo)
    ├── unit4_2do_flashcards.html
    ├── unit4_2do_matching.html
    ├── unit4_2do_story.html
    ├── unit4_2do_game.html
    └── ...
```

## Stack tecnológico
| Capa | Tecnología |
|------|-----------|
| Preprocesamiento | Python 3 + pdfplumber |
| Frontend | HTML + React (CDN) + Tailwind (CDN) |
| IA | Claude API — modelo `claude-sonnet-4-6` |
| Hosting | GitHub Pages |

## Componente: preprocess.py
- **Fuente de lugares y profesiones:** `Vocabulary - Unit X.pdf` (texto más limpio)
- **Fuente de acciones (place → action):** última página del key ring
- **Fuente de sesiones:** `TEMARIO - UNIT X.pdf`
- **Gramática:** hardcodeada por defecto; editar manualmente en el MD si cambia
- Los lugares de 2 palabras se reconstruyen con `TWO_WORD_PLACES` (lista en el script)
- Correcciones OCR conocidas en `OCR_FIXES` (ej: ATLETE → ATHLETE)

Uso:
```bash
pip install pdfplumber
python3 preprocess.py \
  --grado "2do" --unidad "4" --unit-name "My Best City Ever" \
  --keyring  "VOCABULARY - key ring - MY BEST CITY EVER -.pdf" \
  --vocab    "Vocabulary - Unit 4.pdf" \
  --temario  "TEMARIO - UNIT 4.pdf" \
  --output   "unidades/unit4_2do.md"
```

## Componente: app principal (index.html)
- Selector de unidad + grado
- Carga el `.md` correspondiente de `/unidades/`
- Llama a Claude API 4 veces en secuencia (una por material)
- Muestra barra de progreso y links a cada HTML generado

## Los 4 materiales generados
| Material | 2do grado | 5to grado |
|----------|-----------|-----------|
| Flashcards | Palabra + emoji + traducción grande | Palabra + oración de ejemplo |
| Matching | Palabra ↔ emoji/imagen | Definición en inglés ↔ palabra |
| Mini historia | 3-4 oraciones simples, palabras resaltadas | 8-10 oraciones, diálogo |
| Juego interactivo | Arrastrar y soltar / memorama | Quiz / completar oraciones |

Orden de generación: Flashcards → Matching → Mini historia → Juego

## Claude API
- Modelo: `claude-sonnet-4-6`
- 4 llamadas en secuencia por sesión de generación
- Cada llamada recibe: contenido del `.md` + grado + tipo de material + instrucciones de formato HTML
- La API key la ingresa el usuario en la app (no se almacena en el repo)

## Hosting: GitHub Pages
- Los MDs en `/unidades/` son locales (no se suben — contienen datos del colegio)
- Los HTMLs en `/generado/` sí se suben al repo y GitHub Pages los sirve
- URL final: `https://[usuario].github.io/[repo]/`

## Estado actual del proyecto (Junio 2026)
- [x] Script de preprocesamiento (`preprocess.py`)
- [x] MD de prueba generado (`unit4_2do.md` — Unit 4, 2do grado)
- [ ] App principal (`index.html`)
- [ ] Integración Claude API
- [ ] Plantillas HTML de cada material
- [ ] Deploy en GitHub Pages
- [ ] PDFs de 5to grado (pendiente subir)

## Notas
- El colegio es **Innova Schools** (Perú)
- Los PDFs cambian por unidad pero mantienen la misma estructura de 3 archivos
- Si aparecen nuevos lugares de 2 palabras en futuras unidades, agregarlos a `TWO_WORD_PLACES` en `preprocess.py`
- La sección `## Grammar` del MD se edita manualmente si la gramática de la unidad es diferente
