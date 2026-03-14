// const router = require('express').Router();
// const { authenticate } = require('../middlewares/auth');

// router.use(authenticate);

// // GET /api/lots
// router.get('/', (req, res) => {
//   const db = req.app.locals.db;
//   const { status, location, product_id, search } = req.query;
//   let query = `
//     SELECT l.*, 
//       p.name        AS product_name, 
//       p.type        AS product_type,
//       p.category_id,
//       p.shade_code  AS product_shade
//     FROM lots l
//     JOIN products p ON l.product_id = p.id
//     WHERE 1=1`;
//   const params = [];
//   if (status)     { query += ' AND l.status = ?';        params.push(status); }
//   if (location)   { query += ' AND l.location = ?';      params.push(location); }
//   if (product_id) { query += ' AND l.product_id = ?';    params.push(product_id); }
//   if (search)     { query += ' AND l.lot_number LIKE ?'; params.push(`%${search}%`); }
//   query += ' ORDER BY l.created_at DESC';
//   res.json(db.prepare(query).all(...params));
// });

// // GET /api/lots/:id
// router.get('/:id', (req, res) => {
//   const db = req.app.locals.db;
//   const lot = db.prepare(`
//     SELECT l.*, 
//       p.name        AS product_name, 
//       p.type        AS product_type,
//       p.category_id,
//       p.shade_code  AS product_shade
//     FROM lots l
//     JOIN products p ON l.product_id = p.id
//     WHERE l.id = ?
//   `).get(req.params.id);
//   if (!lot) return res.status(404).json({ error: 'Lot not found' });

//   const manufacturing = db.prepare('SELECT * FROM manufacturing_processes WHERE lot_id = ? ORDER BY created_at DESC').all(lot.id);
//   const wastage       = db.prepare('SELECT * FROM wastage WHERE lot_id = ? ORDER BY created_at DESC').all(lot.id);
//   const saleItems     = db.prepare(`
//     SELECT si.*, s.sale_number, s.date AS sale_date, c.name AS customer_name
//     FROM sale_items si
//     JOIN sales s     ON si.sale_id    = s.id
//     JOIN customers c ON s.customer_id = c.id
//     WHERE si.lot_id = ?
//   `).all(lot.id);

//   res.json({ ...lot, manufacturing, wastage, sales: saleItems });
// });

// // GET /api/lots/:id/history
// router.get('/:id/history', (req, res) => {
//   const db  = req.app.locals.db;
//   const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(req.params.id);
//   if (!lot) return res.status(404).json({ error: 'Lot not found' });

//   const history = [];
//   if (lot.purchase_id) {
//     const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(lot.purchase_id);
//     if (purchase) history.push({ type: 'PURCHASE', date: purchase.date, details: purchase });
//   }
//   const mfg   = db.prepare('SELECT * FROM manufacturing_processes WHERE lot_id = ? ORDER BY start_date').all(lot.id);
//   const waste = db.prepare('SELECT * FROM wastage WHERE lot_id = ? ORDER BY date').all(lot.id);
//   const sales = db.prepare(`
//     SELECT si.*, s.sale_number, s.date
//     FROM sale_items si JOIN sales s ON si.sale_id = s.id
//     WHERE si.lot_id = ?
//   `).all(lot.id);

//   mfg.forEach(m   => history.push({ type: 'MANUFACTURING', date: m.start_date, details: m }));
//   waste.forEach(w => history.push({ type: 'WASTAGE',       date: w.date,       details: w }));
//   sales.forEach(s => history.push({ type: 'SALE',          date: s.date,       details: s }));
//   history.sort((a, b) => new Date(a.date) - new Date(b.date));

//   res.json(history);
// });

// module.exports = router;
const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
router.use(authenticate);

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const T  = req.T;
  const { status, location, product_id } = req.query;
  // yarn_products has shade_code; chem_products has chemical_code
  const productCodeCol = req.businessMode === 'YARN' ? 'p.shade_code as product_shade' : 'p.chemical_code as product_shade';
  const lotCodeCol     = req.businessMode === 'YARN' ? 'l.shade_code'                  : 'l.chemical_code';
  let sql = `SELECT l.*, p.name as product_name, p.type as product_type,
      ${productCodeCol}, ${lotCodeCol} as lot_code, c.name as category_name
    FROM ${T.lots} l
    JOIN ${T.products} p ON l.product_id = p.id
    LEFT JOIN product_categories c ON p.category_id = c.id WHERE 1=1`;
  const params = [];
  if (status)     { sql += ' AND l.status = ?';     params.push(status); }
  if (location)   { sql += ' AND l.location = ?';   params.push(location); }
  if (product_id) { sql += ' AND l.product_id = ?'; params.push(product_id); }
  sql += ' ORDER BY l.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const T  = req.T;
  const productCodeCol = req.businessMode === 'YARN' ? 'p.shade_code as product_shade' : 'p.chemical_code as product_shade';
  const lotCodeCol     = req.businessMode === 'YARN' ? 'l.shade_code'                  : 'l.chemical_code';
  const lot = db.prepare(`SELECT l.*, p.name as product_name, p.type as product_type,
      ${productCodeCol}, ${lotCodeCol} as lot_code, c.name as category_name
    FROM ${T.lots} l JOIN ${T.products} p ON l.product_id = p.id
    LEFT JOIN product_categories c ON p.category_id = c.id WHERE l.id = ?`).get(req.params.id);
  if (!lot) return res.status(404).json({ error: 'Lot not found' });
  res.json(lot);
});

router.get('/:id/history', (req, res) => {
  const db = req.app.locals.db; const T = req.T;
  const history = [];
  const pur = db.prepare(`SELECT 'PURCHASE' as event_type, pu.date, pu.purchase_number as reference, pi.quantity
    FROM ${T.pur_items} pi JOIN ${T.purchases} pu ON pi.purchase_id = pu.id WHERE pi.lot_id = ?`).get(req.params.id);
  if (pur) history.push(pur);
  history.push(...db.prepare(`SELECT 'SALE' as event_type, s.date, s.sale_number as reference, si.quantity
    FROM ${T.sale_items} si JOIN ${T.sales} s ON si.sale_id = s.id WHERE si.lot_id = ?`).all(req.params.id));
  history.push(...db.prepare(`SELECT 'MANUFACTURING' as event_type, m.start_date as date, m.process_type as reference, m.input_weight as quantity
    FROM ${T.manufacturing} m WHERE m.lot_id = ?`).all(req.params.id));
  history.sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(history);
});
module.exports = router;