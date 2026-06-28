// ── Config ───────────────────────────────────────────────────────
const MATERIAL_META = {
  flashcards: { label: 'Flashcards', emoji: '🃏' },
  matching:   { label: 'Matching',   emoji: '🔗' },
  story:      { label: 'Story',      emoji: '📖' },
  game:       { label: 'Game',       emoji: '🎮' },
  project:    { label: 'Project',    emoji: '🛠️' },
  guide:      { label: 'Guide',      emoji: '📋' },
  quiz:       { label: 'Quiz',       emoji: '🧠' },
  clase:      { label: 'Ver clase',  emoji: '▶️' },
};

const CLASS_TYPE_LABEL = {
  'solo-imprime':     { label: 'Solo imprime', color: '#0891b2', bg: '#cffafe' },
  'diseña-e-imprime': { label: 'Diseña e imprime', color: '#7c3aed', bg: '#f5f3ff' },
  'diseña-avanzado':  { label: 'Avanzado', color: '#c2410c', bg: '#fff7ed' },
};

const GRADE_EMOJI = { '2do': '🐣', '5to': '🎓' };
const SUBJECTS    = ['english', 'workshops'];

// ── State ─────────────────────────────────────────────────────────
let allUnits       = [];
let currentSubject = 'english';
let currentGrade   = '2do';
let openPanels     = new Set();

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
    return `materials/${unit.subject}/labs/${unit.lab}/${unit.unit}/${ver}${matId}.html`;
  }
  return `materials/${unit.subject}/${unit.type}/${unit.grade}/unit${unit.unit}/${ver}${matId}.html`;
}

function filteredUnits() {
  return allUnits.filter(u => {
    if (u.subject !== currentSubject) return false;
    return u.grade === currentGrade;
  });
}

// ── Templates ─────────────────────────────────────────────────────

// Tarjeta estándar (inglés, talleres genéricos)
function standardCardHTML(unit, panelId) {
  const mats    = (unit.materials || []).map(id => ({ id, ...(MATERIAL_META[id] ?? { label: id, emoji: '📄' }) }));
  const icon    = unit.emoji || GRADE_EMOJI[unit.grade] || '📚';
  const isOpen  = openPanels.has(panelId);
  const unitNum = unit.unit && !unit.unit.startsWith('clase') ? `Unidad ${unit.unit} — ` : '';

  return `
    <div class="unit-card">
      <div class="unit-header" data-panel="${panelId}">
        <span class="unit-icon">${icon}</span>
        <div class="unit-info">
          <div class="unit-name">${unitNum}${unit.name}</div>
          <div class="unit-meta">${mats.length} actividades</div>
        </div>
        <span class="chevron ${isOpen ? 'open' : ''}">›</span>
      </div>
      <div class="unit-materials" id="${panelId}" style="display:${isOpen ? 'grid' : 'none'}">
        ${mats.map(mat => `
          <a class="mat-link" href="${matPath(unit, mat.id)}" target="_blank">
            <span class="mat-emoji">${mat.emoji}</span>${mat.label}
          </a>`).join('')}
      </div>
    </div>`;
}

// Card único para todo un lab (ej: Studio 3D)
function labCardHTML(lab, byModule, panelId) {
  const isOpen    = openPanels.has(panelId);
  const totalClases = Object.values(byModule).flat().length;
  const totalMods   = Object.keys(byModule).length;
  const LAB_META  = {
    studio3d: { name: 'Studio 3D', emoji: '🖨️', desc: `${totalMods} módulos · ${totalClases} clases` },
  };
  const meta = LAB_META[lab] || { name: lab, emoji: '🔬', desc: `${totalClases} clases` };

  const innerHTML = Object.entries(byModule).map(([modName, classes]) => `
    <div class="mod-section">
      <div class="mod-section-title">${modName}</div>
      ${classes.map((unit, i) => claseRowHTML(unit, i)).join('')}
    </div>`).join('');

  return `
    <div class="unit-card">
      <div class="unit-header" data-panel="${panelId}">
        <span class="unit-icon">${meta.emoji}</span>
        <div class="unit-info">
          <div class="unit-name">${meta.name}</div>
          <div class="unit-meta">${meta.desc}</div>
        </div>
        <span class="chevron ${isOpen ? 'open' : ''}">›</span>
      </div>
      <div class="lab-inner" id="${panelId}" style="display:${isOpen ? 'block' : 'none'}">
        ${innerHTML}
      </div>
    </div>`;
}

// Grupo de módulo Studio 3D (ya no se usa como card independiente)
function moduleGroupHTML(moduleName, classes, groupId) {
  const isOpen = openPanels.has(groupId);
  const emoji  = classes[0]?.emoji || '🖨️';

  return `
    <div class="module-card">
      <div class="module-header" data-panel="${groupId}">
        <span class="module-icon">${emoji}</span>
        <div class="module-info">
          <div class="module-name">${moduleName}</div>
          <div class="module-meta">${classes.length} clases</div>
        </div>
        <span class="chevron ${isOpen ? 'open' : ''}">›</span>
      </div>
      <div class="module-classes" id="${groupId}" style="display:${isOpen ? 'flex' : 'none'}">
        ${classes.map((unit, i) => claseRowHTML(unit, i)).join('')}
      </div>
    </div>`;
}

function claseRowHTML(unit, i) {
  const ct   = CLASS_TYPE_LABEL[unit.classType] || { label: unit.classType || '', color: '#64748b', bg: '#f1f5f9' };
  const mats = (unit.materials || []).map(id => ({ id, ...(MATERIAL_META[id] ?? { label: id, emoji: '📄' }) }));
  const num  = unit.unit?.replace('clase', '') || (i + 1);

  return `
    <div class="clase-row">
      <div class="clase-num">${num}</div>
      <div class="clase-body">
        <div class="clase-name">${unit.name}</div>
        <span class="clase-type" style="color:${ct.color};background:${ct.bg}">${ct.label}</span>
      </div>
      <div class="clase-actions">
        ${mats.map(mat => `
          <a class="clase-btn" href="${matPath(unit, mat.id)}" target="_blank">
            ${mat.emoji} ${mat.label}
          </a>`).join('')}
      </div>
    </div>`;
}

// Render principal
function render() {
  const units = filteredUnits();
  if (!units.length) {
    document.getElementById('units-list').innerHTML = emptyStateHTML();
    return;
  }

  const restUnits = units.filter(u => u.type !== 'labs');

  let html = '';

  if (currentSubject === 'workshops') {
    // Sessions: tarjetas estándar por taller genérico
    const sessions = units.filter(u => u.type === 'sessions');
    sessions.forEach((u, i) => {
      html += standardCardHTML(u, `panel-std-${i}`);
    });

    // Labs: un card por lab con módulos y clases
    const byLab = {};
    units.filter(u => u.type === 'labs').forEach(u => {
      const key = u.lab || 'general';
      if (!byLab[key]) byLab[key] = [];
      byLab[key].push(u);
    });
    Object.entries(byLab).forEach(([lab, classes]) => {
      const byModule = {};
      classes.forEach(u => {
        const mod = u.module || 'Clases';
        if (!byModule[mod]) byModule[mod] = [];
        byModule[mod].push(u);
      });
      html += labCardHTML(lab, byModule, `panel-lab-${lab}`);
    });
  } else {
    // Inglés u otros: tarjetas estándar
    restUnits.forEach((u, i) => {
      html += standardCardHTML(u, `panel-std-${i}`);
    });
  }

  document.getElementById('units-list').innerHTML = html;
}

function emptyStateHTML() {
  return `
    <div class="empty">
      <div class="icon">📭</div>
      <p>No hay materiales para esta sección todavía.</p>
    </div>`;
}

// ── Toggle panel ──────────────────────────────────────────────────
function togglePanel(panelId) {
  const el   = document.getElementById(panelId);
  const hdr  = document.querySelector(`[data-panel="${panelId}"]`);
  const chev = hdr?.querySelector('.chevron');
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  let display = 'grid';
  if (el.classList.contains('module-classes')) display = 'flex';
  if (el.classList.contains('lab-inner'))      display = 'block';
  el.style.display = isOpen ? 'none' : display;
  chev?.classList.toggle('open', !isOpen);
  isOpen ? openPanels.delete(panelId) : openPanels.add(panelId);
}

// ── Event wiring ──────────────────────────────────────────────────
document.querySelectorAll('.subj-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentSubject = btn.dataset.subject;
    document.querySelectorAll('.subj-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelector('.kids').style.display = 'flex';
    openPanels.clear();
    render();
  });
});

document.querySelectorAll('.kid-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentGrade = btn.dataset.grade;
    document.querySelectorAll('.kid-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    openPanels.clear();
    render();
  });
});

document.getElementById('units-list').addEventListener('click', e => {
  const hdr = e.target.closest('[data-panel]');
  if (hdr) togglePanel(hdr.dataset.panel);
});

// ── Init ──────────────────────────────────────────────────────────
document.getElementById('year').textContent = new Date().getFullYear();
loadAllUnits().then(units => { allUnits = units; render(); });
