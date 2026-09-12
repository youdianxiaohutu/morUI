const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = 3000;
const SAVES_DIR = path.join(__dirname, 'saves');

app.use(cors());
app.use(express.json());

async function ensureSavesDir() {
  try {
    await fs.access(SAVES_DIR);
  } catch {
    await fs.mkdir(SAVES_DIR, { recursive: true });
  }
}

// POST /api/save/:slot
app.post('/api/save/:slot', async (req, res) => {
  try {
    const { slot } = req.params;
    const data = req.body;
    await ensureSavesDir();
    const filePath = path.join(SAVES_DIR, slot + '.json');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ success: true, message: 'Saved ' + slot });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/load/:slot
app.get('/api/load/:slot', async (req, res) => {
  try {
    const { slot } = req.params;
    const filePath = path.join(SAVES_DIR, slot + '.json');
    await ensureSavesDir();
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(404).json({ success: false, error: 'Save ' + slot + ' not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/saves
app.get('/api/saves', async (req, res) => {
  try {
    await ensureSavesDir();
    const files = await fs.readdir(SAVES_DIR);
    const saves = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const slot = file.replace('.json', '');
        try {
          const data = await fs.readFile(path.join(SAVES_DIR, file), 'utf-8');
          const parsed = JSON.parse(data);
          saves.push({
            slot: slot,
            timestamp: parsed.timestamp || 'unknown',
            chatCount: (parsed.chatLog || "").split("\n\n").filter(function(l){return l.trim()}).length
          });
        } catch (e) {
          saves.push({ slot: slot, error: e.message });
        }
      }
    }
    res.json(saves);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/save/:slot
app.delete('/api/save/:slot', async (req, res) => {
  try {
    const { slot } = req.params;
    const filePath = path.join(SAVES_DIR, slot + '.json');
    await ensureSavesDir();
    try {
      await fs.unlink(filePath);
      res.json({ success: true, message: 'Deleted ' + slot });
    } catch (error) {
      res.status(404).json({ success: false, error: 'Save ' + slot + ' not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// POST /api/dice_log - append a dice roll result
app.post('/api/dice_log', async (req, res) => {
  try {
    await ensureSavesDir();
    const logPath = path.join(SAVES_DIR, 'dice_log.json');
    let logs = [];
    try {
      const data = await fs.readFile(logPath, 'utf-8');
      logs = JSON.parse(data);
    } catch(e) {}
    logs.push(req.body);
    await fs.writeFile(logPath, JSON.stringify(logs, null, 2), 'utf-8');
    res.json({ success: true, count: logs.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/dice_log - get all dice roll history
app.get('/api/dice_log', async (req, res) => {
  try {
    const logPath = path.join(SAVES_DIR, 'dice_log.json');
    try {
      const data = await fs.readFile(logPath, 'utf-8');
      res.json(JSON.parse(data));
    } catch(e) {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});app.listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT);
});
