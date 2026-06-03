import express from 'express';
import fs from 'fs';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = './db.json';

// Create unpopulated DB if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({
    totalSeconds: 0,
    smokeBreaks: 0,
    dailyData: [
      { day: 'Mon', hoursWorked: 0, smokeBreaks: 0 },
      { day: 'Tue', hoursWorked: 0, smokeBreaks: 0 },
      { day: 'Wed', hoursWorked: 0, smokeBreaks: 0 },
      { day: 'Thu', hoursWorked: 0, smokeBreaks: 0 },
      { day: 'Fri', hoursWorked: 0, smokeBreaks: 0 },
      { day: 'Sat', hoursWorked: 0, smokeBreaks: 0 },
      { day: 'Sun', hoursWorked: 0, smokeBreaks: 0 }
    ]
  }, null, 2));
}

app.get('/api/data', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  res.json(data);
});

app.post('/api/data', (req, res) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
