/**
 * Web Audio API ラッパー
 * フェードイン/アウト、ループ、プログレス取得対応
 * iPad Safari AudioContext unlock対応
 */

let ctx = null;
// buttonId -> { source, gainNode, startTime, buffer, loop, fadeOut }
const sources = {};
// buttonId -> Symbol (競合防止用)
const pendingTokens = {};

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
export async function play(buttonId, filename, fadeIn = { enabled: false, duration: 1 }, fadeOut = { enabled: false, duration: 1 }, loop = false) {
  const context = getContext();
  if (context.state === 'suspended') await context.resume();

  // 最新のリクエストであることを示すトークンを発行
  const token = Symbol();
  pendingTokens[buttonId] = token;

  // 既存の再生を即座に停止（競合回避のため0秒停止）
  stop(buttonId, { enabled: false, duration: 0 });

  const buffer = await loadBuffer(filename);

  // 非同期ロード中に新しいリクエストが来たら、自分はキャンセル
  if (pendingTokens[buttonId] !== token) return;

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
  sources[buttonId] = { source, gainNode, startTime: context.currentTime, buffer, loop, fadeOut };

  source.onended = () => {
    // ループ中は onended は発火しない。フェードアウト停止時も here に来ない（setTimeoutで自ら管理）
    if (sources[buttonId] && sources[buttonId].source === source) {
      delete sources[buttonId];
    }
  };
}

/**
 * 停止
 */
export function stop(buttonId, fadeOutOverride = null) {
  const entry = sources[buttonId];
  if (!entry) return;

  const fadeOut = fadeOutOverride || entry.fadeOut || { enabled: false, duration: 0 };
  const { source, gainNode } = entry;
  const context = getContext();

  if (fadeOut.enabled && fadeOut.duration > 0) {
    gainNode.gain.setValueAtTime(gainNode.gain.value, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + fadeOut.duration);
    setTimeout(() => {
      if (sources[buttonId] && sources[buttonId].source === source) {
        try { source.stop(); } catch (_) {}
        delete sources[buttonId];
      }
    }, fadeOut.duration * 1000);
  } else {
    try { source.stop(); } catch (_) {}
    delete sources[buttonId];
  }
}

/**
 * 全停止 (AllKill)
 * 各ボタンの設定を活かしつつ、最大フェード時間を制限
 */
export function stopAll(maxFadeDuration = 1) {
  Object.keys(sources).forEach(buttonId => {
    const entry = sources[buttonId];
    const fade = { ...entry.fadeOut };
    if (fade.enabled && fade.duration > maxFadeDuration) {
      fade.duration = maxFadeDuration;
    }
    stop(buttonId, fade);
  });
  // ロード待ちも全てキャンセル
  Object.keys(pendingTokens).forEach(id => delete pendingTokens[id]);
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
