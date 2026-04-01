/**
 * Web Audio API ラッパー
 * フェードイン/アウト、ループ、プログレス取得対応
 * iPad Safari AudioContext unlock対応
 */

let ctx = null;
// buttonId -> { source, gainNode, startTime, buffer, loop }
const sources = {};

function getContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function unlockAudio() {
  const context = getContext();
  if (context.state === 'suspended') context.resume();
}

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
 */
export async function play(buttonId, filename, fadeIn = { enabled: false, duration: 1 }, loop = false) {
  const context = getContext();
  if (context.state === 'suspended') await context.resume();

  stop(buttonId, { enabled: false, duration: 0 });

  const buffer = await loadBuffer(filename);
  const source = context.createBufferSource();
  const gainNode = context.createGain();

  source.buffer = buffer;
  source.loop = loop;
  source.connect(gainNode);
  gainNode.connect(context.destination);

  if (fadeIn.enabled && fadeIn.duration > 0) {
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, context.currentTime + fadeIn.duration);
  } else {
    gainNode.gain.setValueAtTime(1, context.currentTime);
  }

  source.start(0);
  sources[buttonId] = { source, gainNode, startTime: context.currentTime, buffer, loop };

  source.onended = () => {
    // ループ中は onended は発火しない
    delete sources[buttonId];
  };
}

/**
 * 停止
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
 * 再生プログレス取得
 * @returns {{ elapsed: number, duration: number, remaining: number } | null}
 */
export function getProgress(buttonId) {
  const entry = sources[buttonId];
  if (!entry) return null;

  const context = getContext();
  const rawElapsed = context.currentTime - entry.startTime;
  const duration = entry.buffer.duration;

  // ループ中は duration 内での位置
  const elapsed = entry.loop ? rawElapsed % duration : Math.min(rawElapsed, duration);
  const remaining = Math.max(0, duration - elapsed);

  return { elapsed, duration, remaining, loop: entry.loop };
}

/**
 * 複数ファイルのプリロード
 */
export async function preloadAll(filenames) {
  await Promise.all(
    filenames.map(f => loadBuffer(f).catch(e => console.warn('preload failed:', f, e)))
  );
}
