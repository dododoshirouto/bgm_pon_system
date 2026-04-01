/**
 * Web Audio API ラッパー
 * フェードイン/アウト対応、iPad Safari unlock対応
 */

let ctx = null;
const sources = {}; // buttonId -> { source, gainNode }

function getContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

// iPad Safari: ユーザータップで AudioContext を unlock
export function unlockAudio() {
  const context = getContext();
  if (context.state === 'suspended') {
    context.resume();
  }
}

// 音声バッファキャッシュ
const bufferCache = {};

async function loadBuffer(filename) {
  if (bufferCache[filename]) return bufferCache[filename];
  const res = await fetch(`/api/audio/file/${encodeURIComponent(filename)}`);
  const arrayBuffer = await res.arrayBuffer();
  const context = getContext();
  const buffer = await context.decodeAudioData(arrayBuffer);
  bufferCache[filename] = buffer;
  return buffer;
}

/**
 * 再生
 * @param {number} buttonId
 * @param {string} filename
 * @param {{ enabled: boolean, duration: number }} fadeIn
 */
export async function play(buttonId, filename, fadeIn = { enabled: false, duration: 1 }) {
  const context = getContext();
  if (context.state === 'suspended') await context.resume();

  // 既に再生中なら止める
  stop(buttonId, { enabled: false, duration: 0 });

  const buffer = await loadBuffer(filename);
  const source = context.createBufferSource();
  const gainNode = context.createGain();

  source.buffer = buffer;
  source.connect(gainNode);
  gainNode.connect(context.destination);

  if (fadeIn.enabled && fadeIn.duration > 0) {
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, context.currentTime + fadeIn.duration);
  } else {
    gainNode.gain.setValueAtTime(1, context.currentTime);
  }

  source.start(0);
  sources[buttonId] = { source, gainNode };

  source.onended = () => {
    delete sources[buttonId];
  };
}

/**
 * 停止
 * @param {number} buttonId
 * @param {{ enabled: boolean, duration: number }} fadeOut
 */
export function stop(buttonId, fadeOut = { enabled: false, duration: 1 }) {
  const entry = sources[buttonId];
  if (!entry) return;

  const { source, gainNode } = entry;
  const context = getContext();

  if (fadeOut.enabled && fadeOut.duration > 0) {
    gainNode.gain.setValueAtTime(gainNode.gain.value, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, context.currentTime + fadeOut.duration);
    setTimeout(() => {
      try { source.stop(); } catch (_) {}
      delete sources[buttonId];
    }, fadeOut.duration * 1000);
  } else {
    try { source.stop(); } catch (_) {}
    delete sources[buttonId];
  }
}

export function isPlaying(buttonId) {
  return !!sources[buttonId];
}

/**
 * 複数ファイルを事前にバッファへ読み込む
 * @param {string[]} filenames
 */
export async function preloadAll(filenames) {
  await Promise.all(
    filenames.map(f => loadBuffer(f).catch(e => console.warn('preload failed:', f, e)))
  );
}
