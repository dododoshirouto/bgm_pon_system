import { play, stop, isPlaying, unlockAudio, preloadAll, getProgress } from './audio.js';

// カラープリセット（id → CSS背景色）パステルカラーテーマ
export const COLOR_PRESETS = {
  default: { bg: '#3d3347', accent: '#f0e6f6' },
  blue:    { bg: '#2d3a4f', accent: '#a0c4f1' },
  green:   { bg: '#2d3f35', accent: '#a8d8b9' },
  orange:  { bg: '#3f3530', accent: '#f0c8a0' },
  red:     { bg: '#3f2d2d', accent: '#f4a0a0' },
  purple:  { bg: '#352d42', accent: '#b39ddb' },
  pink:    { bg: '#3f2d38', accent: '#f0a0c8' },
  teal:    { bg: '#2d3a3f', accent: '#a0d8e8' },
};

let buttons = [];
let pollTimer = null;
let lastButtonsJson = '';

async function loadButtons() {
  const res = await fetch('/api/buttons');
  const data = await res.json();
  buttons = data.buttons;
  lastButtonsJson = JSON.stringify(data.buttons);
}

async function init() {
  await loadButtons();
  renderGrid();
  const files = [...new Set(buttons.filter(b => b.file).map(b => b.file))];
  preloadAll(files);
  startPolling();
  requestAnimationFrame(updateProgress);
}

// 設定変更を100msごとに監視して自動更新
function startPolling() {
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch('/api/buttons');
      const data = await res.json();
      const json = JSON.stringify(data.buttons);
      if (json !== lastButtonsJson) {
        lastButtonsJson = json;
        buttons = data.buttons;
        renderGrid();
        const files = [...new Set(buttons.filter(b => b.file).map(b => b.file))];
        preloadAll(files);
      }
    } catch (_) {}
  }, 100);
}

// 設定モーダルを閉じたときに使う（ポーリングが拾うので不要だが念のため即時反映）
window.__reloadButtons = async () => {
  await loadButtons();
  renderGrid();
  const files = [...new Set(buttons.filter(b => b.file).map(b => b.file))];
  preloadAll(files);
};

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// RAF: プログレスバーと残り時間を更新
function updateProgress() {
  document.querySelectorAll('.pad[data-id]').forEach(el => {
    const id = parseInt(el.dataset.id, 10);
    const prog = getProgress(id);
    const bar = el.querySelector('.pad-progress');
    const timeEl = el.querySelector('.pad-time');

    if (!prog || !bar || !timeEl) return;

    const pct = (prog.elapsed / prog.duration) * 100;
    bar.style.width = pct + '%';
    timeEl.textContent = prog.loop ? `↻ ${formatTime(prog.remaining)}` : formatTime(prog.remaining);
  });
  requestAnimationFrame(updateProgress);
}

function padColor(btn) {
  const preset = COLOR_PRESETS[btn.color] || COLOR_PRESETS.default;
  return preset;
}

function renderGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  buttons.forEach(btn => {
    const { bg, accent } = padColor(btn);
    const el = document.createElement('button');
    el.className = 'pad' + (!btn.file ? ' disabled' : '');
    el.dataset.id = btn.id;
    el.style.setProperty('--pad-bg', bg);
    el.style.setProperty('--pad-accent', accent);

    const icon = document.createElement('span');
    icon.className = 'pad-icon';
    icon.textContent = btn.file ? '▶' : '－';

    const label = document.createElement('span');
    label.className = 'pad-label';
    const displayLabel = btn.label || (btn.file ? btn.file.replace(/\.[^.]+$/, '') : `PAD ${btn.id + 1}`);
    label.textContent = btn.loop ? `↻ ${displayLabel}` : displayLabel;

    // プログレスバー
    const progressWrap = document.createElement('div');
    progressWrap.className = 'pad-progress-wrap';
    const progressBar = document.createElement('div');
    progressBar.className = 'pad-progress';
    progressWrap.appendChild(progressBar);

    // 残り時間
    const timeEl = document.createElement('span');
    timeEl.className = 'pad-time';

    el.appendChild(icon);
    el.appendChild(label);
    el.appendChild(progressWrap);
    el.appendChild(timeEl);
    grid.appendChild(el);

    if (!btn.file) return;

    if (btn.mode === '2btn') {
      el.addEventListener('click', () => handleToggle(btn.id));
    } else {
      el.addEventListener('pointerdown', () => handlePlay(btn.id));
      el.addEventListener('pointerup', () => handleStop(btn.id));
      el.addEventListener('pointerleave', () => handleStop(btn.id));
      el.addEventListener('pointercancel', () => handleStop(btn.id));
    }
  });
}

async function handleToggle(id) {
  unlockAudio();
  const btn = buttons.find(b => b.id === id);
  if (!btn || !btn.file) return;

  if (isPlaying(id)) {
    stop(id, btn.fadeOut);
    updatePadState(id, false);
  } else {
    await play(id, btn.file, btn.fadeIn, btn.loop);
    updatePadState(id, true);
  }
}

async function handlePlay(id) {
  unlockAudio();
  const btn = buttons.find(b => b.id === id);
  if (!btn || !btn.file) return;
  await play(id, btn.file, btn.fadeIn, btn.loop);
  updatePadState(id, true);
}

function handleStop(id) {
  const btn = buttons.find(b => b.id === id);
  if (!btn) return;
  stop(id, btn.fadeOut);
  updatePadState(id, false);
}

function updatePadState(id, playing) {
  const el = document.querySelector(`.pad[data-id="${id}"]`);
  if (!el) return;
  el.classList.toggle('playing', playing);
  const icon = el.querySelector('.pad-icon');
  if (icon) icon.textContent = playing ? '■' : '▶';
  const timeEl = el.querySelector('.pad-time');
  if (timeEl && !playing) timeEl.textContent = '';
  const bar = el.querySelector('.pad-progress');
  if (bar && !playing) bar.style.width = '0%';
}

init();
