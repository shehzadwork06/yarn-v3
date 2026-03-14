// const router = require('express').Router();
// const { authenticate } = require('../middlewares/auth');

// router.use(authenticate);

// // GET /api/products
// router.get('/', (req, res) => {
//   const db = req.app.locals.db;
//   const { type, search, active } = req.query;
//   let query = 'SELECT * FROM products WHERE 1=1';
//   const params = [];
//   if (type) { query += ' AND type = ?'; params.push(type); }
//   if (active !== undefined) { query += ' AND is_active = ?'; params.push(active === 'true' ? 1 : 0); }
//   if (search) { query += ' AND name LIKE ?'; params.push(`%${search}%`); }
//   query += ' ORDER BY created_at DESC';
//   const products = db.prepare(query).all(...params);
//   res.json(products);
// });

// // GET /api/products/:id
// router.get('/:id', (req, res) => {
//   const db = req.app.locals.db;
//   const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
//   if (!product) return res.status(404).json({ error: 'Product not found' });
//   res.json(product);
// });

// // POST /api/products
// router.post('/', (req, res) => {
//   const db = req.app.locals.db;

//   const {
//     name,
//     category_id,
//     type,
//     unit,
//     conversion_factor,
//     min_stock_level,
//     shade_code,
//     chemical_code,
//     description
//   } = req.body;

//   if (!name || !type || !category_id)
//     return res.status(400).json({ error: 'Name, type and category are required' });

//   const validTypes = ['RAW_YARN', 'DYED_YARN', 'CHEMICAL_RAW', 'CHEMICAL_FINISHED'];
//   if (!validTypes.includes(type))
//     return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });

//   const result = db.prepare(`
//     INSERT INTO products
//     (name, category_id, type, unit, conversion_factor, min_stock_level, shade_code, chemical_code, description)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
//   `).run(
//     name,
//     category_id,
//     type,
//     unit || 'No Of Cones',
//     conversion_factor || 1.0,
//     min_stock_level || 0,
//     shade_code,
//     chemical_code,
//     description
//   );

//   const product = db.prepare(`
//     SELECT p.*, c.name as category_name
//     FROM products p
//     LEFT JOIN product_categories c ON p.category_id = c.id
//     WHERE p.id = ?
//   `).get(result.lastInsertRowid);

//   res.status(201).json(product);
// });

// // PUT /api/products/:id
// router.put('/:id', (req, res) => {
//   const db = req.app.locals.db;
//   const { name, type, unit, conversion_factor, min_stock_level, shade_code, chemical_code, description, is_active } = req.body;
//   db.prepare(`
//     UPDATE products SET name=COALESCE(?,name), type=COALESCE(?,type), unit=COALESCE(?,unit),
//     conversion_factor=COALESCE(?,conversion_factor), min_stock_level=COALESCE(?,min_stock_level),
//     shade_code=COALESCE(?,shade_code), chemical_code=COALESCE(?,chemical_code),
//     description=COALESCE(?,description), is_active=COALESCE(?,is_active) WHERE id=?
//   `).run(name, type, unit, conversion_factor, min_stock_level, shade_code, chemical_code, description, is_active, req.params.id);
//   const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
//   res.json(product);
// });

// module.exports = router;
const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
router.use(authenticate);

// GET /api/products
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const T  = req.T;
  const { type, search, active, category_id } = req.query;

  let sql = `SELECT p.*, c.name as category_name
    FROM ${T.products} p
    LEFT JOIN product_categories c ON p.category_id = c.id
    WHERE 1=1`;
  const params = [];

  // Only allow types valid for this workspace
  if (type) {
    if (!T.validTypes.includes(type))
      return res.status(400).json({ error: `Type "${type}" is not valid in the ${req.businessMode} workspace` });
    sql += ' AND p.type = ?'; params.push(type);
  }
  if (active !== undefined) { sql += ' AND p.is_active = ?'; params.push(active === 'true' ? 1 : 0); }
  if (search)      { sql += ' AND p.name LIKE ?';     params.push(`%${search}%`); }
  if (category_id) { sql += ' AND p.category_id = ?'; params.push(category_id); }
  sql += ' ORDER BY p.created_at DESC';

  res.json(db.prepare(sql).all(...params));
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const T  = req.T;
  const p  = db.prepare(
    `SELECT p.*, c.name as category_name FROM ${T.products} p
     LEFT JOIN product_categories c ON p.category_id = c.id WHERE p.id = ?`
  ).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
});

// POST /api/products
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const T  = req.T;
  const { name, category_id, type, unit, conversion_factor, min_stock_level,
          shade_code, chemical_code, description } = req.body;

  if (!name || !type || !category_id)
    return res.status(400).json({ error: 'name, type and category_id are required' });

  if (!T.validTypes.includes(type))
    return res.status(400).json({
      error: `In ${req.businessMode} workspace, type must be one of: ${T.validTypes.join(', ')}`
    });

  const r = db.prepare(
    `INSERT INTO ${T.products}
      (name, category_id, type, unit, conversion_factor, min_stock_level, shade_code, chemical_code, description)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(name, category_id, type,
        unit || T.defaultUnit,
        conversion_factor || 1.0,
        min_stock_level   || 0,
        shade_code    || null,
        chemical_code || null,
        description   || null);

  res.status(201).json(db.prepare(
    `SELECT p.*, c.name as category_name FROM ${T.products} p
     LEFT JOIN product_categories c ON p.category_id = c.id WHERE p.id = ?`
  ).get(r.lastInsertRowid));
});

// PUT /api/products/:id
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const T  = req.T;
  const { name, type, unit, conversion_factor, min_stock_level,
          shade_code, chemical_code, description, is_active } = req.body;

  if (!db.prepare(`SELECT id FROM ${T.products} WHERE id = ?`).get(req.params.id))
    return res.status(404).json({ error: 'Product not found' });

  if (type && !T.validTypes.includes(type))
    return res.status(400).json({ error: `Type "${type}" is not valid in the ${req.businessMode} workspace` });

  db.prepare(
    `UPDATE ${T.products} SET
      name              = COALESCE(?,name),
      type              = COALESCE(?,type),
      unit              = COALESCE(?,unit),
      conversion_factor = COALESCE(?,conversion_factor),
      min_stock_level   = COALESCE(?,min_stock_level),
      shade_code        = COALESCE(?,shade_code),
      chemical_code     = COALESCE(?,chemical_code),
      description       = COALESCE(?,description),
      is_active         = COALESCE(?,is_active)
     WHERE id = ?`
  ).run(name, type, unit, conversion_factor, min_stock_level,
        shade_code, chemical_code, description, is_active, req.params.id);

  res.json(db.prepare(
    `SELECT p.*, c.name as category_name FROM ${T.products} p
     LEFT JOIN product_categories c ON p.category_id = c.id WHERE p.id = ?`
  ).get(req.params.id));
});

module.exports = router;