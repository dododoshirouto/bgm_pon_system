let buttons = [];
let audioFiles = [];

// カラープリセット定義（app.jsと同期させる）パステルカラーテーマ
const COLOR_PRESETS = [
  { id: 'default', label: 'デフォルト', bg: '#3d3347', accent: '#f0e6f6' },
  { id: 'blue',    label: 'ブルー',     bg: '#2d3a4f', accent: '#a0c4f1' },
  { id: 'green',   label: 'グリーン',   bg: '#2d3f35', accent: '#a8d8b9' },
  { id: 'orange',  label: 'オレンジ',   bg: '#3f3530', accent: '#f0c8a0' },
  { id: 'red',     label: 'レッド',     bg: '#3f2d2d', accent: '#f4a0a0' },
  { id: 'purple',  label: 'パープル',   bg: '#352d42', accent: '#b39ddb' },
  { id: 'pink',    label: 'ピンク',     bg: '#3f2d38', accent: '#f0a0c8' },
  { id: 'teal',    label: 'ティール',   bg: '#2d3a3f', accent: '#a0d8e8' },
];

async function loadData() {
  const [btnRes, audioRes] = await Promise.all([
    fetch('/api/buttons'),
    fetch('/api/audio'),
  ]);
  buttons = (await btnRes.json()).buttons;
  audioFiles = (await audioRes.json()).files;
}

async function patchButton(id, patch) {
  const btn = buttons.find(b => b.id === id);
  const body = { ...btn, ...patch };
  const res = await fetch(`/api/buttons/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `保存失敗 (${res.status})`);
  }
  const updated = await res.json();
  const idx = buttons.findIndex(b => b.id === id);
  buttons[idx] = updated;
}

// ---- ボタングリッド ----

function renderButtonGrid() {
  const grid = document.getElementById('button-grid');
  const openId = (() => {
    const open = grid.querySelector('.inline-panel[style*="block"]');
    return open ? parseInt(open.id.replace('panel-', ''), 10) : null;
  })();

  grid.innerHTML = '';

  buttons.forEach(btn => {
    const wrapper = document.createElement('div');
    wrapper.className = 'btn-wrapper';
    wrapper.dataset.id = btn.id;
    wrapper.appendChild(buildPad(btn));
    wrapper.appendChild(buildPanel(btn));
    grid.appendChild(wrapper);
  });

  if (openId !== null) {
    const panel = document.getElementById(`panel-${openId}`);
    if (panel) panel.style.display = 'block';
  }
}

function buildPad(btn) {
  const preset = COLOR_PRESETS.find(p => p.id === btn.color) || COLOR_PRESETS[0];
  const pad = document.createElement('div');
  pad.className = 'pad-setting' + (!btn.file ? ' disabled' : '');
  pad.style.setProperty('--pad-bg', preset.bg);
  pad.style.setProperty('--pad-accent', preset.accent);

  // PAD番号 + 詳細ボタン
  const header = document.createElement('div');
  header.className = 'pad-header';
  header.innerHTML = `<span class="pad-num">PAD ${btn.id + 1}</span><span class="pad-detail-btn">…</span>`;
  header.addEventListener('click', () => togglePanel(btn.id));

  // ラベル入力
  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.className = 'pad-label-input';
  labelInput.value = btn.label || '';
  labelInput.placeholder = btn.file ? btn.file.replace(/\.[^.]+$/, '') : `PAD ${btn.id + 1}`;
  labelInput.maxLength = 20;
  labelInput.addEventListener('click', e => e.stopPropagation());
  labelInput.addEventListener('blur', async () => {
    try {
      await patchButton(btn.id, { label: labelInput.value });
    } catch (e) { alert(e.message); }
  });

  // FI/FO/LOOP トグル
  const fadeRow = document.createElement('div');
  fadeRow.className = 'pad-fade-row';

  const fiToggle = buildMiniToggle('FI', btn.fadeIn?.enabled || false, async (checked) => {
    try {
      await patchButton(btn.id, { fadeIn: { ...buttons.find(b => b.id === btn.id).fadeIn, enabled: checked } });
    } catch (e) { alert(e.message); }
  });
  const foToggle = buildMiniToggle('FO', btn.fadeOut?.enabled || false, async (checked) => {
    try {
      await patchButton(btn.id, { fadeOut: { ...buttons.find(b => b.id === btn.id).fadeOut, enabled: checked } });
    } catch (e) { alert(e.message); }
  });
  const loopToggle = buildMiniToggle('↻', btn.loop || false, async (checked) => {
    try {
      await patchButton(btn.id, { loop: checked });
    } catch (e) { alert(e.message); }
  });

  fadeRow.appendChild(fiToggle);
  fadeRow.appendChild(foToggle);
  fadeRow.appendChild(loopToggle);

  pad.appendChild(header);
  pad.appendChild(labelInput);
  pad.appendChild(fadeRow);

  return pad;
}

function buildMiniToggle(labelText, checked, onChange) {
  const wrap = document.createElement('label');
  wrap.className = 'mini-toggle';
  wrap.addEventListener('click', e => e.stopPropagation());

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));

  wrap.innerHTML = `<span class="mini-toggle-label">${labelText}</span>`;
  wrap.insertBefore(input, wrap.firstChild);
  return wrap;
}

function buildPanel(btn) {
  const panel = document.createElement('div');
  panel.className = 'inline-panel';
  panel.id = `panel-${btn.id}`;
  panel.style.display = 'none';

  const fileOptions = audioFiles.map(f =>
    `<option value="${f}"${f === btn.file ? ' selected' : ''}>${f}</option>`
  ).join('');

  const colorSwatches = COLOR_PRESETS.map(p => `
    <div class="color-swatch${btn.color === p.id || (!btn.color && p.id === 'default') ? ' selected' : ''}"
         data-color="${p.id}"
         style="background:${p.bg};border-color:${p.accent}"
         title="${p.label}">
      <span style="color:${p.accent}">■</span>
    </div>
  `).join('');

  panel.innerHTML = `
    <div class="panel-field">
      <label>アサインする曲</label>
      <select class="select-file">
        <option value="">── なし ──</option>
        ${fileOptions}
      </select>
    </div>
    <div class="panel-field">
      <label>再生モード</label>
      <select class="select-mode">
        <option value="2btn"${btn.mode === '2btn' ? ' selected' : ''}>2btnモード（タップで再生/停止）</option>
        <option value="1btn"${btn.mode === '1btn' ? ' selected' : ''}>1btnモード（長押し中だけ再生）</option>
      </select>
    </div>
    <div class="panel-field">
      <label>フェードイン 秒数</label>
      <div class="field-row">
        <input type="number" class="input-fadein-sec" value="${btn.fadeIn?.duration ?? 1}" min="0.1" max="30" step="0.1">
        <span class="unit">秒</span>
      </div>
    </div>
    <div class="panel-field">
      <label>フェードアウト 秒数</label>
      <div class="field-row">
        <input type="number" class="input-fadeout-sec" value="${btn.fadeOut?.duration ?? 1}" min="0.1" max="30" step="0.1">
        <span class="unit">秒</span>
      </div>
    </div>
    <div class="panel-field">
      <label>カラー</label>
      <div class="color-swatch-row">${colorSwatches}</div>
    </div>
    <button class="btn-save">保存</button>
  `;

  // カラースウォッチ選択
  panel.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      panel.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
    });
  });

  panel.querySelector('.btn-save').addEventListener('click', () => savePanel(panel, btn.id));
  return panel;
}

function togglePanel(id) {
  const panel = document.getElementById(`panel-${id}`);
  const isOpen = panel.style.display !== 'none';
  document.querySelectorAll('.inline-panel').forEach(p => { p.style.display = 'none'; });
  if (!isOpen) {
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

async function savePanel(panel, id) {
  const btn = buttons.find(b => b.id === id);
  const labelInput = panel.previousElementSibling?.querySelector('.pad-label-input');
  const selectedColor = panel.querySelector('.color-swatch.selected')?.dataset.color || null;

  const patch = {
    label: labelInput ? labelInput.value : btn.label,
    file: panel.querySelector('.select-file').value || null,
    mode: panel.querySelector('.select-mode').value,
    color: selectedColor === 'default' ? null : selectedColor,
    fadeIn: {
      enabled: btn.fadeIn?.enabled || false,
      duration: parseFloat(panel.querySelector('.input-fadein-sec').value) || 1,
    },
    fadeOut: {
      enabled: btn.fadeOut?.enabled || false,
      duration: parseFloat(panel.querySelector('.input-fadeout-sec').value) || 1,
    },
  };

  const saveBtn = panel.querySelector('.btn-save');
  saveBtn.disabled = true;
  saveBtn.textContent = '保存中…';

  try {
    await patchButton(id, patch);
    saveBtn.textContent = '保存済み ✓';
    setTimeout(() => renderButtonGrid(), 800);
  } catch (e) {
    saveBtn.disabled = false;
    saveBtn.textContent = '保存';
    alert(e.message);
  }
}

// ---- ファイルアップロード ----

async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/audio/upload', { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json();
    alert(err.error || 'アップロード失敗');
    return;
  }
  await loadData();
  renderFileList();
  renderButtonGrid();
}

function renderFileList() {
  const list = document.getElementById('file-list');
  list.innerHTML = '';
  audioFiles.forEach(f => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `<span>${f}</span><button data-file="${f}" class="file-delete">×</button>`;
    list.appendChild(item);
  });
  list.querySelectorAll('.file-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteFile(btn.dataset.file));
  });
}

async function deleteFile(filename) {
  if (!confirm(`"${filename}" を削除しますか？`)) return;
  await fetch(`/api/audio/${encodeURIComponent(filename)}`, { method: 'DELETE' });
  await loadData();
  renderFileList();
  renderButtonGrid();
}

// ---- 初期化 ----

async function init() {
  await loadData();
  renderButtonGrid();
  renderFileList();

  const uploadBox = document.getElementById('upload-box');
  const fileInput = document.getElementById('file-input');

  uploadBox.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    [...e.target.files].forEach(uploadFile);
    fileInput.value = '';
  });

  uploadBox.addEventListener('dragover', e => { e.preventDefault(); uploadBox.style.borderColor = '#b39ddb'; });
  uploadBox.addEventListener('dragleave', () => { uploadBox.style.borderColor = '#5e4f70'; });
  uploadBox.addEventListener('drop', e => {
    e.preventDefault();
    uploadBox.style.borderColor = '#5e4f70';
    [...e.dataTransfer.files].forEach(uploadFile);
  });
}

init();
