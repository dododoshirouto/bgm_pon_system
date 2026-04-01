import { play, stop, isPlaying, unlockAudio, preloadAll, getProgress } from './audio.js';

// カラープリセット（id → CSS背景色）
export const COLOR_PRESETS = {
  default: { bg: '#2c2c2e', accent: '#ffffff' },
  blue:    { bg: '#0a2a4a', accent: '#4da6ff' },
  green:   { bg: '#0d2e1a', accent: '#30d158' },
  orange:  { bg: '#2e1800', accent: '#ff9f0a' },
  red:     { bg: '#2e0a0a', accent: '#ff453a' },
  purple:  { bg: '#1e0a2e', accent: '#bf5af2' },
  pink:    { bg: '#2e0a1a', accent: '#ff375f' },
  teal:    { bg: '#001e26', accent: '#5ac8fa' },
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
    label.textContent = btn.label || (btn.file ? btn.file.replace(/\.[^.]+$/, '') : `PAD ${btn.id + 1}`);

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
