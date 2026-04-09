const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const router = express.Router();

const dataDir = path.join(__dirname, '../data');
const audioDir = path.join(dataDir, 'audio');
const tmpDir = path.join(dataDir, 'tmp');

if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// multer は originalname を latin1 で渡すため UTF-8 に変換する
function toUtf8(str) {
  return Buffer.from(str, 'latin1').toString('utf8');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => {
    cb(null, toUtf8(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.mp3', '.wav', '.ogg'];
  const ext = path.extname(toUtf8(file.originalname)).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('対応フォーマット: MP3 / WAV / OGG'), false);
  }
};

const upload = multer({ storage, fileFilter });

// 音声ファイル一覧
router.get('/', (req, res) => {
  const files = fs.readdirSync(audioDir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.mp3', '.wav', '.ogg'].includes(ext);
  });
  res.json({ files });
});

// 音声ファイルアップロード
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'ファイルがありません' });

  const tempPath = req.file.path;
  const originalName = req.file.filename;
  const baseName = path.parse(originalName).name;
  const finalName = `${baseName}.mp3`;
  const outputPath = path.join(audioDir, finalName);

  const bitrate = req.app.locals.bitrate || '128k';

  ffmpeg(tempPath)
    .audioChannels(2)
    .audioBitrate(bitrate)
    .toFormat('mp3')
    .on('end', () => {
      fs.unlink(tempPath, () => {});
      res.json({ filename: finalName });
    })
    .on('error', (err) => {
      console.error('FFmpeg Error:', err);
      fs.unlink(tempPath, () => {});
      res.status(500).json({ error: 'エンコードに失敗しました', details: err.message });
    })
    .save(outputPath);
});

// 音声ファイル削除
router.delete('/:filename', (req, res) => {
  const filepath = path.join(audioDir, path.basename(req.params.filename));
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'ファイルが見つかりません' });
  fs.unlinkSync(filepath);
  res.json({ ok: true });
});

// 音声ファイル配信
router.get('/file/:filename', (req, res) => {
  const filepath = path.join(audioDir, path.basename(req.params.filename));
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'ファイルが見つかりません' });
  res.sendFile(filepath);
});

module.exports = router;
