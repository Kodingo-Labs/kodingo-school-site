// ── Config ───────────────────────────────────────────────────────
const MATERIAL_META = {
  flashcards: { label: 'Flashcards', emoji: '🃏' },
  matching:   { label: 'Matching',   emoji: '🔗' },
  story:      { label: 'Story',      emoji: '📖' },
  game:       { label: 'Game',       emoji: '🎮' },
  project:    { label: 'Project',    emoji: '🛠️' },
  guide:      { label: 'Guide',      emoji: '📋' },
  quiz:       { label: 'Quiz',       emoji: '🧠' },
  clase:      { label: 'Ver clase',  emoji: '📋' },
};

const GRADE_EMOJI = { '2do': '🐣', '5to': '🎓' };
const SUBJECTS    = ['english', 'workshops'];

// ── State ─────────────────────────────────────────────────────────
let allUnits      = [];
let currentSubject = 'english';
let currentGrade   = '2do';

// ── Data ──────────────────────────────────────────────────────────
async function fetchSubjectUnits(subject) {
  try {
    const res   = await fetch(`materials/${subject}/units.json?v=${Date.now()}`);
    const units = res.ok ? await res.json() : [];
    return units.map(u => ({ subject, ...u }));
  } catch {
    return [];
  }
}

async function loadAllUnits() {
  const results = await Promise.all(SUBJECTS.map(fetchSubjectUnits));
  return results.flat();
}

// ── Pure helpers ──────────────────────────────────────────────────
function matPath(unit, matId) {
  const ver = unit.activeVersion ? `${unit.activeVersion}/` : '';
  if (unit.lab) {
    // Labs: materials/<subject>/labs/<lab>/<unit>/<ver>/<matId>.html
    return `materials/${unit.subject}/labs/${unit.lab}/${unit.unit}/${ver}${matId}.html`;
  }
  // Courses/sessions: materials/<subject>/<type>/<grade>/unit<unit>/<ver>/<matId>.html
  return `materials/${unit.subject}/${unit.type}/${unit.grade}/unit${unit.unit}/${ver}${matId}.html`;
}

function resolveMaterials(unit) {
  return (unit.materials || []).map(id => ({
    id,
    ...(MATERIAL_META[id] ?? { label: id, emoji: '📄' }),
  }));
}

function filteredUnits() {
  return allUnits.filter(u => u.subject === currentSubject && u.grade === currentGrade);
}

// ── Templates ─────────────────────────────────────────────────────
function materialLinkHTML(unit, mat) {
  return `
    <a class="mat-link" href="${matPath(unit, mat.id)}" target="_blank">
      <span class="mat-emoji">${mat.emoji}</span>
      ${mat.label}
    </a>`;
}

function unitCardHTML(unit, idx) {
  const mats      = resolveMaterials(unit);
  const unitLabel = unit.unit ? `Unit ${unit.unit} — ` : '';
  const badge     = unit.subject === 'workshops' ? ' workshops' : '';
  const icon      = unit.emoji || GRADE_EMOJI[unit.grade] || '📚';

  return `
    <div class="unit-card">
      <div class="unit-header" data-panel="panel-${idx}">
        <span class="unit-icon">${icon}</span>
        <div class="unit-info">
          <div class="unit-name">${unitLabel}${unit.name}</div>
          <div class="unit-meta">${unit.grade} Grado · ${mats.length} actividades</div>
        </div>
        <span class="unit-badge${badge}">✓ Listo</span>
        <span class="chevron" id="chev-${idx}">›</span>
      </div>
      <div class="unit-materials" id="panel-${idx}" style="display:none">
        ${mats.map(mat => materialLinkHTML(unit, mat)).join('')}
      </div>
    </div>`;
}

function emptyStateHTML() {
  return `
    <div class="empty">
      <div class="icon">📭</div>
      <p>No hay materiales para esta sección todavía.<br>¡Volvé a checar después de la próxima unidad!</p>
    </div>`;
}

// ── Rendering ─────────────────────────────────────────────────────
function render() {
  const units = filteredUnits();
  document.getElementById('units-list').innerHTML = units.length
    ? units.map((u, i) => unitCardHTML(u, i)).join('')
    : emptyStateHTML();
}

// ── Event handlers ────────────────────────────────────────────────
function togglePanel(panelId) {
  const panel = document.getElementById(panelId);
  const idx   = panelId.replace('panel-', '');
  const chev  = document.getElementById(`chev-${idx}`);
  const open  = panel.style.display !== 'none';
  panel.style.display = open ? 'none' : 'grid';
  chev.classList.toggle('open', !open);
}

function activateButton(selector, btn) {
  document.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ── Event wiring ──────────────────────────────────────────────────
document.querySelectorAll('.subj-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentSubject = btn.dataset.subject;
    activateButton('.subj-btn', btn);
    render();
  });
});

document.querySelectorAll('.kid-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentGrade = btn.dataset.grade;
    activateButton('.kid-btn', btn);
    render();
  });
});

document.getElementById('units-list').addEventListener('click', e => {
  const header = e.target.closest('.unit-header');
  if (header) togglePanel(header.dataset.panel);
});

// ── Init ──────────────────────────────────────────────────────────
document.getElementById('year').textContent = new Date().getFullYear();

loadAllUnits().then(units => {
  allUnits = units;
  render();
});
