const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const { calcWorkingHours } = require('../utils/helpers');

router.use(authenticate);

// GET /api/attendance
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { employee_id, date, from_date, to_date, status } = req.query;
  let query = `SELECT a.*, e.name as employee_name, e.employee_code
    FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE 1=1`;
  const params = [];
  if (employee_id) { query += ' AND a.employee_id = ?'; params.push(employee_id); }
  if (date) { query += ' AND a.date = ?'; params.push(date); }
  if (from_date) { query += ' AND a.date >= ?'; params.push(from_date); }
  if (to_date) { query += ' AND a.date <= ?'; params.push(to_date); }
  if (status) { query += ' AND a.status = ?'; params.push(status); }
  query += ' ORDER BY a.date DESC, e.name';
  res.json(db.prepare(query).all(...params));
});

// POST /api/attendance/time-in
router.post('/time-in', (req, res) => {
  const db = req.app.locals.db;
  const { employee_id, date, time_in } = req.body;
  if (!employee_id || !time_in) return res.status(400).json({ error: 'employee_id and time_in required' });
  const d = date || new Date().toISOString().split('T')[0];
  const existing = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(employee_id, d);
  if (existing) return res.status(400).json({ error: 'Attendance already recorded for this date' });

  const result = db.prepare('INSERT INTO attendance (employee_id, date, time_in, status) VALUES (?,?,?,?)').run(employee_id, d, time_in, 'PRESENT');
  res.status(201).json(db.prepare('SELECT a.*, e.name as employee_name FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.id = ?').get(result.lastInsertRowid));
});

// POST /api/attendance/time-out
router.post('/time-out', (req, res) => {
  const db = req.app.locals.db;
  const { employee_id, date, time_out } = req.body;
  if (!employee_id || !time_out) return res.status(400).json({ error: 'employee_id and time_out required' });
  const d = date || new Date().toISOString().split('T')[0];

  const settings = {};
  db.prepare('SELECT * FROM settings').all().forEach(s => { settings[s.key] = parseFloat(s.value); });

  const attendance = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(employee_id, d);
  if (!attendance) return res.status(400).json({ error: 'No time-in recorded for this date' });
  if (attendance.time_out) return res.status(400).json({ error: 'Time-out already recorded' });

  const hours = calcWorkingHours(attendance.time_in, time_out);
  let status = 'PRESENT';
  let overtime = 0;

  if (hours < (settings.half_day_threshold || 4)) {
    status = 'HALF_DAY';
  } else if (hours >= (settings.full_day_threshold || 8)) {
    status = 'PRESENT';
    if (hours > (settings.standard_hours || 8)) {
      overtime = hours - (settings.standard_hours || 8);
      status = 'OVERTIME';
    }
  }

  db.prepare('UPDATE attendance SET time_out = ?, working_hours = ?, overtime_hours = ?, status = ? WHERE id = ?')
    .run(time_out, Math.round(hours * 100) / 100, Math.round(overtime * 100) / 100, status, attendance.id);

  res.json(db.prepare('SELECT a.*, e.name as employee_name FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.id = ?').get(attendance.id));
});

// POST /api/attendance/mark-absent
router.post('/mark-absent', (req, res) => {
  const db = req.app.locals.db;
  const { employee_id, date } = req.body;
  if (!employee_id) return res.status(400).json({ error: 'employee_id required' });
  const d = date || new Date().toISOString().split('T')[0];
  const existing = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(employee_id, d);
  if (existing) return res.status(400).json({ error: 'Attendance already exists for this date' });
  const result = db.prepare('INSERT INTO attendance (employee_id, date, status) VALUES (?,?,?)').run(employee_id, d, 'ABSENT');
  res.status(201).json(db.prepare('SELECT a.*, e.name as employee_name FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.id = ?').get(result.lastInsertRowid));
});

// GET /api/attendance/summary — Monthly summary for all employees
router.get('/summary', (req, res) => {
  const db = req.app.locals.db;
  const { month, year } = req.query;
  const m = month || (new Date().getMonth() + 1).toString().padStart(2, '0');
  const y = year || new Date().getFullYear();
  const prefix = `${y}-${m.padStart(2, '0')}`;

  const summary = db.prepare(`
    SELECT e.id, e.name, e.employee_code, e.basic_salary,
      COUNT(CASE WHEN a.status IN ('PRESENT','OVERTIME') THEN 1 END) as present_days,
      COUNT(CASE WHEN a.status = 'HALF_DAY' THEN 1 END) as half_days,
      COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as absent_days,
      COALESCE(SUM(a.overtime_hours), 0) as total_overtime
    FROM employees e
    LEFT JOIN attendance a ON e.id = a.employee_id AND a.date LIKE ?
    WHERE e.is_active = 1
    GROUP BY e.id ORDER BY e.name
  `).all(prefix + '%');

  res.json(summary);
});

module.exports = router;
