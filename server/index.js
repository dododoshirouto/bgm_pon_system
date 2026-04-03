const express = require('express');
const path = require('path');
const fs = require('fs');

const audioRouter = require('./routes/audio');
const buttonsRouter = require('./routes/buttons');

const app = express();

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const argPort = (portIndex !== -1 && args[portIndex + 1]) ? parseInt(args[portIndex + 1], 10) : null;
const PORT = argPort || process.env.PORT || 3000;

// データディレクトリの初期化
const dataDir = path.join(__dirname, 'data');
const audioDir = path.join(dataDir, 'audio');
const buttonsFile = path.join(dataDir, 'buttons.json');

if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

// 既存の buttons.json に新フィールドを補完するマイグレーション
function migrateButtons(data) {
  let changed = false;
  data.buttons = data.buttons.map(b => {
    const defaults = { loop: false, color: null };
    const patched = { ...defaults, ...b };
    if (JSON.stringify(patched) !== JSON.stringify(b)) changed = true;
    return patched;
  });
  return { data, changed };
}

if (!fs.existsSync(buttonsFile)) {
  const initial = { buttons: Array.from({ length: 16 }, (_, i) => ({
    id: i,
    label: '',
    file: null,
    mode: '2btn',
    loop: false,
    color: null,
    fadeIn: { enabled: false, duration: 1 },
    fadeOut: { enabled: false, duration: 1 },
  }))};
  fs.writeFileSync(buttonsFile, JSON.stringify(initial, null, 2));
} else {
  const { data, changed } = migrateButtons(JSON.parse(fs.readFileSync(buttonsFile, 'utf-8')));
  if (changed) fs.writeFileSync(buttonsFile, JSON.stringify(data, null, 2));
}

app.use(express.json());

// 静的ファイル配信（フロントエンド）
app.use(express.static(path.join(__dirname, '../frontend')));

// API
app.use('/api/audio', audioRouter);
app.use('/api/buttons', buttonsRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`BGM PON SERVER running at http://0.0.0.0:${PORT}`);
  console.log(`iPad からは http://<このPCのIPアドレス>:${PORT} でアクセスしてください`);
});
