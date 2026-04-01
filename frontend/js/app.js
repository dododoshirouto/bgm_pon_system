import { play, stop, isPlaying, unlockAudio, preloadAll } from './audio.js';

let buttons = [];

async function loadButtons() {
  const res = await fetch('/api/buttons');
  const data = await res.json();
  buttons = data.buttons;
}

async function init() {
  await loadButtons();
  renderGrid();
  // アサイン済みファイルをすべてプリロード
  const files = [...new Set(buttons.filter(b => b.file).map(b => b.file))];
  preloadAll(files); // await不要（バックグラウンドで進める）
}

// 設定モーダルを閉じたときにボタン設定を再読み込み
window.__reloadButtons = async () => {
  await loadButtons();
  renderGrid();
  const files = [...new Set(buttons.filter(b => b.file).map(b => b.file))];
  preloadAll(files);
};

function renderGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  buttons.forEach(btn => {
    const el = document.createElement('button');
    el.className = 'pad' + (!btn.file ? ' disabled' : '');
    el.dataset.id = btn.id;

    const icon = document.createElement('span');
    icon.className = 'pad-icon';
    icon.textContent = btn.file ? '▶' : '－';

    const label = document.createElement('span');
    label.textContent = btn.label || (btn.file ? btn.file.replace(/\.[^.]+$/, '') : `PAD ${btn.id + 1}`);

    el.appendChild(icon);
    el.appendChild(label);
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
    await play(id, btn.file, btn.fadeIn);
    updatePadState(id, true);
  }
}

async function handlePlay(id) {
  unlockAudio();
  const btn = buttons.find(b => b.id === id);
  if (!btn || !btn.file) return;
  await play(id, btn.file, btn.fadeIn);
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
}

init();
