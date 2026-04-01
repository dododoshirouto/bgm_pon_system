const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const buttonsFile = path.join(__dirname, '../data/buttons.json');

const read = () => JSON.parse(fs.readFileSync(buttonsFile, 'utf-8'));
const write = (data) => fs.writeFileSync(buttonsFile, JSON.stringify(data, null, 2));

// 全ボタン設定取得
router.get('/', (req, res) => {
  res.json(read());
});

// 単一ボタン設定更新
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = read();
  const index = data.buttons.findIndex(b => b.id === id);
  if (index === -1) return res.status(404).json({ error: 'ボタンが見つかりません' });

  const allowed = ['label', 'file', 'mode', 'fadeIn', 'fadeOut'];
  allowed.forEach(key => {
    if (req.body[key] !== undefined) data.buttons[index][key] = req.body[key];
  });

  write(data);
  res.json(data.buttons[index]);
});

module.exports = router;
