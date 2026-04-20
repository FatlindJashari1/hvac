const STORAGE_KEY = 'hvac_projects_v1';

const form = document.getElementById('projectForm');
const projectList = document.getElementById('projectList');
const projectDetails = document.getElementById('projectDetails');
const refreshBtn = document.getElementById('refreshBtn');

function getProjects() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function gjeneroHVAC(area, rooms) {
  const roomLabels = ['Sallon', 'Kuzhine', 'Banjo'];
  const dhomat = [];

  for (let i = 1; i <= rooms; i += 1) {
    if (i === 1) {
      dhomat.push({ emri: roomLabels[0] });
    } else if (i === rooms) {
      dhomat.push({ emri: roomLabels[2] });
    } else if (i === 2) {
      dhomat.push({ emri: roomLabels[1] });
    } else {
      dhomat.push({ emri: `Dhoma gjumi ${i - 2}` });
    }
  }

  const areaPerRoom = Math.max(8, Math.round(area / rooms));
  const roomsData = dhomat.map((dhoma, index) => {
    const roomArea = index === dhomat.length - 1
      ? Math.max(6, area - areaPerRoom * (dhomat.length - 1))
      : areaPerRoom;

    return {
      emri: dhoma.emri,
      siperfaqe_m2: roomArea,
      radiatore: Math.max(1, Math.ceil(roomArea / 18)),
    };
  });

  let boilerKw = 24;
  if (area > 80 && area <= 120) boilerKw = 30;
  if (area > 120 && area <= 160) boilerKw = 36;
  if (area > 160) boilerKw = 42;

  return {
    dhomat: roomsData,
    radiatore_total: roomsData.reduce((sum, d) => sum + d.radiatore, 0),
    boiler: `${boilerKw}kW`,
    tuba: 'Sistem me dy tuba (supply/return loop): linja e furnizimit shkon te cdo radiator dhe kthehet ne boiler me linjen e kthimit.',
  };
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const area = Number(document.getElementById('area').value);
  const rooms = Number(document.getElementById('rooms').value);

  if (!name || area <= 0 || rooms <= 0) {
    alert('Ploteso te gjitha fushat sakte.');
    return;
  }

  const projects = getProjects();
  const nextId = projects.length ? Math.max(...projects.map((p) => p.id)) + 1 : 1;

  const project = {
    id: nextId,
    name,
    area,
    rooms,
    data: gjeneroHVAC(area, rooms),
    drawing_data: null,
    created_at: new Date().toISOString(),
  };

  projects.unshift(project);
  saveProjects(projects);
  window.location.href = `drawing.html?projectId=${project.id}`;
});

refreshBtn.addEventListener('click', loadProjects);

function loadProjects() {
  const projects = getProjects().sort((a, b) => b.id - a.id);

  if (projects.length === 0) {
    projectList.innerHTML = '<p>Nuk ka projekte ende.</p>';
    return;
  }

  projectList.innerHTML = projects
    .map(
      (p) => `
      <div class="project-item">
        <div>
          <strong>${escapeHtml(p.name)}</strong>
          <div class="small">${p.area}m² | ${p.rooms} dhoma | ID: ${p.id}</div>
        </div>
        <div class="project-actions">
          <button onclick="showProject(${p.id})">Shfaq</button>
          <button class="secondary" onclick="openDrawing(${p.id})">Vizato</button>
          <button class="danger" onclick="deleteProject(${p.id})">Fshij</button>
        </div>
      </div>
    `,
    )
    .join('');
}

function showProject(id) {
  const p = getProjects().find((item) => item.id === id);

  if (!p) {
    projectDetails.innerHTML = '<p>Projekti nuk u gjet.</p>';
    return;
  }

  const roomsHtml = p.data.dhomat
    .map((d) => `<li>${escapeHtml(d.emri)} - ${d.siperfaqe_m2}m² - ${d.radiatore} radiator(e)</li>`)
    .join('');

  projectDetails.innerHTML = `
    <h3>${escapeHtml(p.name)}</h3>
    <p><strong>Siperfaqe:</strong> ${p.area}m²</p>
    <p><strong>Dhoma:</strong> ${p.rooms}</p>
    <p><strong>Boiler i sugjeruar:</strong> ${p.data.boiler}</p>
    <p><strong>Radiatore total:</strong> ${p.data.radiatore_total}</p>
    <p><strong>Tubat:</strong> ${escapeHtml(p.data.tuba)}</p>
    <strong>Detajet per dhoma:</strong>
    <ul>${roomsHtml}</ul>
    <button onclick="openDrawing(${p.id})">Hap Vizatimin</button>
  `;
}

function openDrawing(id) {
  window.location.href = `drawing.html?projectId=${id}`;
}

function deleteProject(id) {
  const ok = confirm('A je i sigurt qe do ta fshish projektin?');
  if (!ok) return;

  const projects = getProjects().filter((p) => p.id !== id);
  saveProjects(projects);
  projectDetails.innerHTML = 'Zgjidh nje projekt nga lista.';
  loadProjects();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

window.showProject = showProject;
window.deleteProject = deleteProject;
window.openDrawing = openDrawing;

loadProjects();
