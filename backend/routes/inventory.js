
const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
router.use(authenticate);

router.get('/', (req, res) => {
  const db = req.app.locals.db; const T = req.T;
  const { search, category_id, location } = req.query;
  // yarn_lots has shade_code but not chemical_code; chem_lots has chemical_code but not shade_code
  const shadeCol    = req.businessMode === 'YARN' ? 'l.shade_code'    : 'NULL as shade_code';
  const chemCol     = req.businessMode === 'CHEMICAL' ? 'l.chemical_code' : 'NULL as chemical_code';
  let sql = `SELECT i.*, p.name as product_name, p.type as product_type,
      p.min_stock_level, p.unit, c.name as category_name, l.lot_number, ${shadeCol}, ${chemCol}
    FROM ${T.inventory} i JOIN ${T.products} p ON i.product_id = p.id
    JOIN ${T.lots} l ON i.lot_id = l.id
    LEFT JOIN product_categories c ON p.category_id = c.id WHERE i.quantity > 0`;
  const params = [];
  if (search)      { sql += ' AND p.name LIKE ?';     params.push(`%${search}%`); }
  if (category_id) { sql += ' AND p.category_id = ?'; params.push(category_id); }
  if (location)    { sql += ' AND i.location = ?';    params.push(location); }
  sql += ' ORDER BY p.name, l.lot_number';
  res.json(db.prepare(sql).all(...params));
});

router.get('/summary', (req, res) => {
  const db = req.app.locals.db; const T = req.T;
  res.json(db.prepare(`SELECT p.id, p.name, p.type, p.unit, p.min_stock_level,
    COALESCE(SUM(i.quantity),0) as total_quantity, COALESCE(SUM(i.quantity * l.cost_per_unit),0) as total_value
    FROM ${T.products} p LEFT JOIN ${T.inventory} i ON p.id = i.product_id
    LEFT JOIN ${T.lots} l ON i.lot_id = l.id GROUP BY p.id ORDER BY p.name`).all());
});

router.get('/low-stock', (req, res) => {
  const db = req.app.locals.db; const T = req.T;
  res.json(db.prepare(`SELECT p.id, p.name, p.type, p.unit, p.min_stock_level,
    COALESCE(SUM(i.quantity),0) as total_quantity
    FROM ${T.products} p LEFT JOIN ${T.inventory} i ON p.id = i.product_id
    WHERE p.min_stock_level > 0 GROUP BY p.id HAVING total_quantity < p.min_stock_level
    ORDER BY total_quantity ASC`).all());
});

router.get('/by-location', (req, res) => {
  const db = req.app.locals.db; const T = req.T;
  const shadeCol = req.businessMode === 'YARN' ? 'l.shade_code' : 'NULL as shade_code';
  const chemCol  = req.businessMode === 'CHEMICAL' ? 'l.chemical_code' : 'NULL as chemical_code';
  res.json(db.prepare(`SELECT i.location, p.id as product_id, p.name as product_name,
    p.type, l.lot_number, ${shadeCol}, ${chemCol}, i.quantity, p.unit
    FROM ${T.inventory} i JOIN ${T.products} p ON i.product_id = p.id
    JOIN ${T.lots} l ON i.lot_id = l.id WHERE i.quantity > 0 ORDER BY i.location, p.name`).all());
});
module.exports = router;