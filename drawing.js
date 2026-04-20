const STORAGE_KEY = 'hvac_projects_v1';
const params = new URLSearchParams(window.location.search);
const projectId = Number(params.get('projectId'));

const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const saveBtn = document.getElementById('saveDrawingBtn');
const undoBtn = document.getElementById('undoBtn');
const clearBtn = document.getElementById('clearBtn');
const backBtn = document.getElementById('backBtn');
const colorPicker = document.getElementById('colorPicker');
const sizePicker = document.getElementById('sizePicker');
const scalePx = document.getElementById('scalePx');
const meterLength = document.getElementById('meterLength');
const directionSelect = document.getElementById('directionSelect');
const textInput = document.getElementById('textInput');
const projectMeta = document.getElementById('projectMeta');
const drawingTitle = document.getElementById('drawingTitle');
const toolButtons = document.querySelectorAll('.tool-btn');

if (!projectId) {
  alert('Mungon projectId.');
  window.location.href = 'index.html';
}

let currentTool = 'pen';
let drawing = false;
let startX = 0;
let startY = 0;
let dragBaseImage = null;
const history = [];

const symbolTools = ['radiator', 'boiler', 'dush', 'wc', 'lavabo', 'klima'];
const dragTools = ['arrow', 'line', 'wall', 'supply', 'return', 'room'];

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

function setupCanvas() {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  pushHistory();
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = '#eef2f6';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 25) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 25) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function pushHistory() {
  history.push(canvas.toDataURL('image/png'));
  if (history.length > 80) history.shift();
}

function restoreFromDataURL(dataUrl) {
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = dataUrl;
}

function getPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleXRatio = canvas.width / rect.width;
  const scaleYRatio = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleXRatio,
    y: (e.clientY - rect.top) * scaleYRatio,
  };
}

function setTool(tool) {
  currentTool = tool;
  toolButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tool === tool);
  });
}

function applyStrokeStyle(tool) {
  if (tool === 'supply') {
    ctx.strokeStyle = '#d8222a';
    ctx.lineWidth = Math.max(3, Number(sizePicker.value));
    return;
  }

  if (tool === 'return') {
    ctx.strokeStyle = '#1f63cc';
    ctx.lineWidth = Math.max(3, Number(sizePicker.value));
    return;
  }

  if (tool === 'wall') {
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = Math.max(6, Number(sizePicker.value) + 3);
    return;
  }

  if (tool === 'erase') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Number(sizePicker.value) * 3;
    return;
  }

  ctx.strokeStyle = colorPicker.value;
  ctx.lineWidth = Number(sizePicker.value);
}

function drawLengthLabel(x1, y1, x2, y2, overrideMeters) {
  const pxPerMeter = Math.max(1, Number(scalePx.value) || 20);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distPx = Math.sqrt(dx * dx + dy * dy);
  const meters = overrideMeters || (distPx / pxPerMeter);

  ctx.save();
  ctx.fillStyle = '#0f1720';
  ctx.font = '12px Segoe UI';
  ctx.fillText(`${meters.toFixed(1)} m`, (x1 + x2) / 2 + 6, (y1 + y2) / 2 - 6);
  ctx.restore();
}

function drawArrow(x1, y1, x2, y2) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLength = 12;

  applyStrokeStyle('line');
  ctx.fillStyle = ctx.strokeStyle;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawLine(x1, y1, x2, y2, tool) {
  ctx.save();
  applyStrokeStyle(tool);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();

  if (tool !== 'erase') {
    drawLengthLabel(x1, y1, x2, y2);
  }
}

function drawRoomRect(x1, y1, x2, y2) {
  const width = x2 - x1;
  const height = y2 - y1;
  const pxPerMeter = Math.max(1, Number(scalePx.value) || 20);
  const wMeters = Math.abs(width) / pxPerMeter;
  const hMeters = Math.abs(height) / pxPerMeter;

  ctx.save();
  ctx.fillStyle = 'rgba(111, 168, 220, 0.08)';
  ctx.strokeStyle = '#2b5876';
  ctx.lineWidth = 2;
  ctx.fillRect(x1, y1, width, height);
  ctx.strokeRect(x1, y1, width, height);
  ctx.fillStyle = '#1f2d3d';
  ctx.font = '12px Segoe UI';
  ctx.fillText(`${wMeters.toFixed(1)}m x ${hMeters.toFixed(1)}m`, x1 + 6, y1 + 16);
  ctx.restore();
}

function drawSymbol(type, x, y) {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1f2d3d';
  ctx.fillStyle = '#ffffff';

  if (type === 'radiator') {
    ctx.fillRect(x - 35, y - 12, 70, 24);
    ctx.strokeRect(x - 35, y - 12, 70, 24);
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x - 28 + i * 10, y - 10);
      ctx.lineTo(x - 28 + i * 10, y + 10);
      ctx.stroke();
    }
    ctx.fillStyle = '#1f2d3d';
    ctx.font = '12px Segoe UI';
    ctx.fillText('RAD', x - 14, y + 30);
  }

  if (type === 'boiler') {
    ctx.fillRect(x - 22, y - 28, 44, 56);
    ctx.strokeRect(x - 22, y - 28, 44, 56);
    ctx.beginPath();
    ctx.arc(x, y + 10, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#1f2d3d';
    ctx.font = '12px Segoe UI';
    ctx.fillText('BOILER', x - 24, y + 42);
  }

  if (type === 'dush') {
    ctx.strokeRect(x - 24, y - 24, 48, 48);
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(x - 12 + i * 8, y - 8, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1f2d3d';
      ctx.fill();
    }
    ctx.fillText('DUSH', x - 18, y + 38);
  }

  if (type === 'wc') {
    ctx.beginPath();
    ctx.ellipse(x, y, 14, 20, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillText('WC', x - 8, y + 36);
  }

  if (type === 'lavabo') {
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 18);
    ctx.lineTo(x + 7, y - 18);
    ctx.stroke();
    ctx.fillText('LAV', x - 10, y + 36);
  }

  if (type === 'klima') {
    ctx.fillRect(x - 34, y - 14, 68, 28);
    ctx.strokeRect(x - 34, y - 14, 68, 28);
    ctx.beginPath();
    ctx.moveTo(x - 26, y + 6);
    ctx.lineTo(x + 26, y + 6);
    ctx.stroke();
    ctx.fillStyle = '#1f2d3d';
    ctx.font = '12px Segoe UI';
    ctx.fillText('KLIMA', x - 20, y + 34);
  }

  ctx.restore();
}

function drawFixedLengthLine(x, y) {
  const pxPerMeter = Math.max(1, Number(scalePx.value) || 20);
  const meters = Math.max(1, Number(meterLength.value) || 10);
  const lengthPx = meters * pxPerMeter;
  const direction = directionSelect.value;

  let x2 = x;
  let y2 = y;

  if (direction === 'right') x2 = x + lengthPx;
  if (direction === 'left') x2 = x - lengthPx;
  if (direction === 'up') y2 = y - lengthPx;
  if (direction === 'down') y2 = y + lengthPx;

  drawLine(x, y, x2, y2, 'line');
  drawLengthLabel(x, y, x2, y2, meters);
}

canvas.addEventListener('mousedown', (e) => {
  const p = getPoint(e);
  startX = p.x;
  startY = p.y;

  if (symbolTools.includes(currentTool)) {
    drawSymbol(currentTool, p.x, p.y);
    pushHistory();
    return;
  }

  if (currentTool === 'text') {
    const value = textInput.value.trim() || 'Tekst';
    ctx.save();
    ctx.fillStyle = colorPicker.value;
    ctx.font = `${Math.max(12, Number(sizePicker.value) * 4)}px Segoe UI`;
    ctx.fillText(value, p.x, p.y);
    ctx.restore();
    pushHistory();
    return;
  }

  if (currentTool === 'fixedLine') {
    drawFixedLengthLine(p.x, p.y);
    pushHistory();
    return;
  }

  drawing = true;

  if (dragTools.includes(currentTool)) {
    dragBaseImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return;
  }

  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
});

canvas.addEventListener('mousemove', (e) => {
  if (!drawing) return;
  const p = getPoint(e);

  if (currentTool === 'pen' || currentTool === 'erase') {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    applyStrokeStyle(currentTool);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    return;
  }

  if (dragTools.includes(currentTool) && dragBaseImage) {
    ctx.putImageData(dragBaseImage, 0, 0);

    if (currentTool === 'arrow') {
      drawArrow(startX, startY, p.x, p.y);
      drawLengthLabel(startX, startY, p.x, p.y);
      return;
    }

    if (currentTool === 'room') {
      drawRoomRect(startX, startY, p.x, p.y);
      return;
    }

    drawLine(startX, startY, p.x, p.y, currentTool);
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (!drawing) return;
  drawing = false;

  const p = getPoint(e);
  if (dragTools.includes(currentTool) && dragBaseImage) {
    ctx.putImageData(dragBaseImage, 0, 0);

    if (currentTool === 'arrow') {
      drawArrow(startX, startY, p.x, p.y);
      drawLengthLabel(startX, startY, p.x, p.y);
    } else if (currentTool === 'room') {
      drawRoomRect(startX, startY, p.x, p.y);
    } else {
      drawLine(startX, startY, p.x, p.y, currentTool);
    }

    dragBaseImage = null;
  }

  pushHistory();
});

canvas.addEventListener('mouseleave', () => {
  if (!drawing) return;
  drawing = false;
  dragBaseImage = null;
  pushHistory();
});

toolButtons.forEach((btn) => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});

undoBtn.addEventListener('click', () => {
  if (history.length <= 1) return;
  history.pop();
  restoreFromDataURL(history[history.length - 1]);
});

clearBtn.addEventListener('click', () => {
  const ok = confirm('A je i sigurt qe do ta pastrosh vizatimin?');
  if (!ok) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  pushHistory();
});

saveBtn.addEventListener('click', () => {
  const drawingData = canvas.toDataURL('image/png');
  const projects = getProjects();
  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    alert('Projekti nuk u gjet.');
    return;
  }

  project.drawing_data = drawingData;
  saveProjects(projects);
  alert('Vizatimi u ruajt me sukses (ne kete PC/browser).');
});

backBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

function loadProject() {
  const project = getProjects().find((p) => p.id === projectId);

  if (!project) {
    alert('Projekti nuk u gjet.');
    window.location.href = 'index.html';
    return;
  }

  drawingTitle.textContent = `Vizatimi: ${project.name}`;
  projectMeta.innerHTML = `<strong>Pronari/Projekti:</strong> ${project.name} | <strong>Siperfaqja:</strong> ${project.area}m² | <strong>Dhoma:</strong> ${project.rooms}`;

  if (project.drawing_data) {
    restoreFromDataURL(project.drawing_data);
    history.length = 0;
    history.push(project.drawing_data);
  }
}

setupCanvas();
loadProject();
