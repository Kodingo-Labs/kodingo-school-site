# Proyecto: Portal de Materiales Educativos — kodingo-school-site

## Qué es esto
Repo de GitHub Pages que **distribuye** el material generado por los repos fuente. No genera nada — solo recibe archivos vía `rsync` desde los scripts de deploy y los sirve como sitio estático.

**URL pública:** https://kodingo-labs.github.io/kodingo-school-site/

## Repos fuente que publican aquí
| Repo | Deploy hacia | Contenido |
|------|-------------|-----------|
| `kodingo-school-english` | `materials/english/` | Flashcards, matching, story, game (vocabulario Innova) |
| `kodingo-school-workshops` | `materials/workshops/` | Talleres genéricos + clases Studio 3D |

## Flujo de datos
```
kodingo-school-english/materials/
  └─ bash deploy.sh → materials/english/ → git push → GitHub Pages

kodingo-school-workshops/materials/
  └─ bash deploy.sh → materials/workshops/ → git push → GitHub Pages
```
Este repo **no se edita a mano**. Todo llega vía los scripts de deploy de los repos fuente.

## Estructura de archivos
```
kodingo-school-site/
├── index.html               ← SPA: portal unificado de hijos
├── assets/
│   ├── app.js               ← carga ambos units.json, renderiza tarjetas
│   └── styles.css           ← diseño responsive (Nunito, tarjetas, gradientes)
└── materials/
    ├── english/             ← sincronizado desde kodingo-school-english
    │   ├── units.json
    │   └── courses/<grado>/unit<N>/v<V>/
    │       ├── flashcards.html
    │       ├── matching.html
    │       ├── story.html
    │       └── game.html
    └── workshops/           ← sincronizado desde kodingo-school-workshops
        ├── units.json
        ├── sessions/<grado>/unit<N>/v<V>/
        │   ├── project.html
        │   ├── guide.html
        │   └── quiz.html
        └── labs/studio3d/clase<N>/v<V>/
            └── clase.html
```

## Portal (index.html + assets/app.js)
- Tabs por materia: "📘 Inglés" y "🖨️ Talleres"
- Selector de grado: "🐣 2do" y "🎓 5to"
- Carga `materials/english/units.json` + `materials/workshops/units.json`
- Filtra por `subject` y `grade`, renderiza tarjetas expandibles
- Links construidos con `matPath()` según `type`:
  - `courses` → `materials/english/courses/<grade>/unit<N>/<version>/<material>.html`
  - `sessions` → `materials/workshops/sessions/<grade>/unit<N>/<version>/<material>.html`
  - `labs` → `materials/workshops/labs/<lab>/clase<N>/<version>/clase.html`

## units.json — formato esperado por el portal
El portal lee arrays JSON. Cada entry tiene al menos:
```json
{
  "subject": "english" | "workshops",
  "type": "courses" | "sessions" | "labs",
  "grade": "2do" | "5to",
  "unit": "4",
  "name": "My Best City Ever",
  "activeVersion": "v2",
  "versions": ["v1", "v2"],
  "materials": ["flashcards", "matching", "story", "game"]
}
```
Para labs, agrega: `"lab": "studio3d"`, `"unit": "clase1"`, `"classType": "..."`.

## Stack
| Capa | Tecnología |
|------|-----------|
| Hosting | GitHub Pages (rama main) |
| Frontend | HTML + Vanilla JS + CSS (sin frameworks) |
| Distribución | rsync desde repos fuente + git push |

## Estado actual (Junio 2026)
- [x] Portal publicado en `https://kodingo-labs.github.io/kodingo-school-site/`
- [x] English: Unit 4 2do grado (v1 legacy + v2 actual)
- [x] Workshops: estructura lista, sin clases publicadas aún
- [ ] Workshops: primer taller y clases Studio 3D pendientes de generar y publicar
- [ ] English: Unit 5 y unidades de 5to grado

## Notas
- No modificar `materials/` a mano — siempre usar `bash deploy.sh` desde el repo fuente
- Si se agrega un nuevo `subject` o `type`, actualizar `matPath()` en `assets/app.js`
- El remote de git apunta a `https://github.com/Kodingo-Labs/kodingo-school-site.git`
