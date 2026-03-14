const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

// GET /api/payroll
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { month, year, status } = req.query;
  let query = `SELECT p.*, e.name as employee_name, e.employee_code
    FROM payroll p JOIN employees e ON p.employee_id = e.id WHERE 1=1`;
  const params = [];
  if (month) { query += ' AND p.month = ?'; params.push(month); }
  if (year) { query += ' AND p.year = ?'; params.push(parseInt(year)); }
  if (status) { query += ' AND p.status = ?'; params.push(status); }
  query += ' ORDER BY p.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// POST /api/payroll/generate — Generate payroll for a month
router.post('/generate', (req, res) => {
  const db = req.app.locals.db;
  const { month, year } = req.body;
  if (!month || !year) return res.status(400).json({ error: 'Month and year required' });

  const txn = db.transaction(() => {
    const prefix = `${year}-${month.toString().padStart(2, '0')}`;
    const settings = {};
    db.prepare('SELECT * FROM settings').all().forEach(s => { settings[s.key] = parseFloat(s.value); });
    const overtimeMultiplier = settings.overtime_rate_multiplier || 1.5;
    const standardHours = settings.standard_hours || 8;

    const employees = db.prepare('SELECT * FROM employees WHERE is_active = 1').all();
    const results = [];

    // Count working days in month (Mon-Sat)
    const daysInMonth = new Date(year, parseInt(month), 0).getDate();
    let workingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, parseInt(month) - 1, d).getDay();
      if (day !== 0) workingDays++; // Exclude Sunday
    }

    for (const emp of employees) {
      // Check if already generated
      const existing = db.prepare('SELECT * FROM payroll WHERE employee_id = ? AND month = ? AND year = ?').get(emp.id, month, parseInt(year));
      if (existing) { results.push(existing); continue; }

      // Get attendance data
      const att = db.prepare(`
        SELECT 
          COUNT(CASE WHEN status IN ('PRESENT','OVERTIME') THEN 1 END) as present,
          COUNT(CASE WHEN status = 'HALF_DAY' THEN 1 END) as half_days,
          COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as absent,
          COALESCE(SUM(overtime_hours), 0) as total_overtime
        FROM attendance WHERE employee_id = ? AND date LIKE ?
      `).get(emp.id, prefix + '%');

      const presentDays = att.present + (att.half_days * 0.5);
      const absentDays = att.absent;
      const perDaySalary = emp.basic_salary / workingDays;
      const absentDeduction = absentDays * perDaySalary;
      const halfDayDeduction = att.half_days * (perDaySalary * 0.5);
      const totalAbsentDeduction = Math.round((absentDeduction + halfDayDeduction) * 100) / 100;

      // Overtime calculation
      const hourlyRate = perDaySalary / standardHours;
      const overtimeAmount = Math.round(att.total_overtime * hourlyRate * overtimeMultiplier * 100) / 100;

      // Loan deduction
      let loanDeduction = 0;
      const activeLoans = db.prepare('SELECT * FROM loans WHERE employee_id = ? AND status = ?').all(emp.id, 'ACTIVE');
      for (const loan of activeLoans) {
        const deduction = Math.min(loan.monthly_deduction, loan.remaining);
        loanDeduction += deduction;
        const newPaid = loan.total_paid + deduction;
        const newRemaining = loan.remaining - deduction;
        const newStatus = newRemaining <= 0 ? 'COMPLETED' : 'ACTIVE';
        db.prepare('UPDATE loans SET total_paid = ?, remaining = ?, status = ? WHERE id = ?').run(newPaid, Math.max(0, newRemaining), newStatus, loan.id);
      }

      const netSalary = Math.round((emp.basic_salary - totalAbsentDeduction + overtimeAmount - loanDeduction) * 100) / 100;

      const result = db.prepare(`
        INSERT INTO payroll (employee_id, month, year, basic_salary, working_days, present_days, absent_days, half_days,
          overtime_hours, overtime_amount, absent_deduction, loan_deduction, net_salary, status) 
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(emp.id, month, parseInt(year), emp.basic_salary, workingDays, presentDays, absentDays, att.half_days,
        att.total_overtime, overtimeAmount, totalAbsentDeduction, loanDeduction, netSalary, 'DRAFT');

      results.push(db.prepare('SELECT * FROM payroll WHERE id = ?').get(result.lastInsertRowid));
    }
    return results;
  });

  try {
    res.json(txn());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/payroll/:id/confirm
router.put('/:id/confirm', (req, res) => {
  const db = req.app.locals.db;
  db.prepare('UPDATE payroll SET status = ? WHERE id = ? AND status = ?').run('CONFIRMED', req.params.id, 'DRAFT');
  res.json(db.prepare('SELECT p.*, e.name as employee_name FROM payroll p JOIN employees e ON p.employee_id = e.id WHERE p.id = ?').get(req.params.id));
});

// PUT /api/payroll/:id/pay
router.put('/:id/pay', (req, res) => {
  const db = req.app.locals.db;
  db.prepare('UPDATE payroll SET status = ?, paid_date = date(\'now\') WHERE id = ? AND status = ?').run('PAID', req.params.id, 'CONFIRMED');
  res.json(db.prepare('SELECT p.*, e.name as employee_name FROM payroll p JOIN employees e ON p.employee_id = e.id WHERE p.id = ?').get(req.params.id));
});

module.exports = router;
