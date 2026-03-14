
// const router = require('express').Router();
// const { authenticate } = require('../middlewares/auth');
// const { generateLotNumber, generateNumber } = require('../utils/helpers');

// router.use(authenticate);

// // GET /api/purchases
// router.get('/', (req, res) => {
//   const db = req.app.locals.db;
//   const { supplier_id, status, from_date, to_date, category_id } = req.query;
//   let query = `SELECT p.*, s.name as supplier_name FROM purchases p JOIN suppliers s ON p.supplier_id = s.id WHERE 1=1`;
//   const params = [];
//   if (supplier_id) { query += ' AND p.supplier_id = ?'; params.push(supplier_id); }
//   if (status)      { query += ' AND p.status = ?';      params.push(status); }
//   if (from_date)   { query += ' AND p.date >= ?';       params.push(from_date); }
//   if (to_date)     { query += ' AND p.date <= ?';       params.push(to_date); }
//   if (category_id) {
//     // Filter to purchases that contain at least one item whose product belongs to this category
//     query += ` AND p.id IN (
//       SELECT pi.purchase_id FROM purchase_items pi
//       JOIN products pr ON pi.product_id = pr.id
//       WHERE pr.category_id = ?)`;
//     params.push(category_id);
//   }
//   query += ' ORDER BY p.created_at DESC';
//   res.json(db.prepare(query).all(...params));
// });

// // GET /api/purchases/:id
// router.get('/:id', (req, res) => {
//   const db = req.app.locals.db;
//   const purchase = db.prepare(`SELECT p.*, s.name as supplier_name FROM purchases p JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?`).get(req.params.id);
//   if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
//   const items = db.prepare(`SELECT pi.*, pr.name as product_name, pr.type as product_type, l.lot_number
//     FROM purchase_items pi JOIN products pr ON pi.product_id = pr.id LEFT JOIN lots l ON pi.lot_id = l.id
//     WHERE pi.purchase_id = ?`).all(purchase.id);
//   res.json({ ...purchase, items });
// });

// // POST /api/purchases — Create purchase with items, generate lots, update inventory & supplier ledger
// router.post('/', (req, res) => {
//   const db = req.app.locals.db;
//   const { supplier_id, date, items, notes } = req.body;
//   if (!supplier_id || !items || !items.length) return res.status(400).json({ error: 'Supplier and items required' });

//   const txn = db.transaction(() => {
//     const purchaseNumber = generateNumber('PO');
//     let totalAmount = 0;
//     items.forEach(i => { totalAmount += i.quantity * i.rate; });

//     const purchaseResult = db.prepare(
//       'INSERT INTO purchases (purchase_number, supplier_id, date, total_amount, status, notes) VALUES (?,?,?,?,?,?)'
//     ).run(purchaseNumber, supplier_id, date || new Date().toISOString().split('T')[0], totalAmount, 'RECEIVED', notes);
//     const purchaseId = purchaseResult.lastInsertRowid;

//     const createdLots = [];
//     for (const item of items) {
//       const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
//       if (!product) throw new Error(`Product ${item.product_id} not found`);

//       // Chemical raw cannot be sold directly, so location is CHEMICAL_STORE
//       const location = product.type === 'CHEMICAL_RAW' ? 'CHEMICAL_STORE' : 'STORE';
//       const lotStatus = product.type === 'DYED_YARN' ? 'READY_FOR_SALE' : 'IN_STORE';
//       const lotNumber = generateLotNumber(product.type);
//       const costPerUnit = item.rate;

//       const lotResult = db.prepare(
//         'INSERT INTO lots (lot_number, product_id, purchase_id, status, location, initial_quantity, current_quantity, shade_code, cost_per_unit) VALUES (?,?,?,?,?,?,?,?,?)'
//       ).run(lotNumber, item.product_id, purchaseId, lotStatus, location, item.quantity, item.quantity, item.shade_code || null, costPerUnit);
//       const lotId = lotResult.lastInsertRowid;

//       db.prepare('INSERT INTO purchase_items (purchase_id, product_id, lot_id, quantity, rate, amount) VALUES (?,?,?,?,?,?)')
//         .run(purchaseId, item.product_id, lotId, item.quantity, item.rate, item.quantity * item.rate);

//       db.prepare('INSERT INTO inventory (product_id, lot_id, location, quantity, unit) VALUES (?,?,?,?,?)')
//         .run(item.product_id, lotId, location, item.quantity, product.unit || 'No Of Cones');

//       // If dyed yarn purchase, assign shade code to lot
//       if (item.shade_code) {
//         db.prepare('UPDATE lots SET shade_code = ? WHERE id = ?').run(item.shade_code, lotId);
//       }

//       createdLots.push({ lotId, lotNumber, productName: product.name });
//     }

//     // Update supplier ledger
//     const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplier_id);
//     const newBalance = supplier.current_balance + totalAmount;
//     db.prepare('UPDATE suppliers SET current_balance = ? WHERE id = ?').run(newBalance, supplier_id);
//     db.prepare('INSERT INTO supplier_ledger (supplier_id, date, type, reference_id, description, debit, balance) VALUES (?,?,?,?,?,?,?)')
//       .run(supplier_id, date || new Date().toISOString().split('T')[0], 'PURCHASE', purchaseId, `Purchase ${purchaseNumber}`, totalAmount, newBalance);

//     const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseId);
//     return { ...purchase, lots: createdLots };
//   });

//   try {
//     res.status(201).json(txn());
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// module.exports = router;
const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const { generateNumber, generateLotNumber } = require('../utils/helpers');
router.use(authenticate);

// GET /api/purchases
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const T  = req.T;
  const { supplier_id, status, from_date, to_date } = req.query;

  let sql = `SELECT p.*, s.name as supplier_name
    FROM ${T.purchases} p
    JOIN ${T.suppliers} s ON p.supplier_id = s.id WHERE 1=1`;
  const params = [];
  if (supplier_id) { sql += ' AND p.supplier_id = ?'; params.push(supplier_id); }
  if (status)      { sql += ' AND p.status = ?';      params.push(status); }
  if (from_date)   { sql += ' AND p.date >= ?';       params.push(from_date); }
  if (to_date)     { sql += ' AND p.date <= ?';       params.push(to_date); }
  sql += ' ORDER BY p.created_at DESC';

  res.json(db.prepare(sql).all(...params));
});

// GET /api/purchases/:id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const T  = req.T;
  const purchase = db.prepare(
    `SELECT p.*, s.name as supplier_name FROM ${T.purchases} p
     JOIN ${T.suppliers} s ON p.supplier_id = s.id WHERE p.id = ?`
  ).get(req.params.id);
  if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

  const items = db.prepare(
    `SELECT pi.*, pr.name as product_name, pr.type as product_type, l.lot_number
     FROM ${T.pur_items} pi
     JOIN ${T.products} pr ON pi.product_id = pr.id
     LEFT JOIN ${T.lots} l ON pi.lot_id = l.id
     WHERE pi.purchase_id = ?`
  ).all(purchase.id);

  res.json({ ...purchase, items });
});

// POST /api/purchases
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const T  = req.T;
  const { supplier_id, date, items, notes } = req.body;

  if (!supplier_id || !items || !items.length)
    return res.status(400).json({ error: 'supplier_id and items are required' });

  // Validate every product belongs to this workspace
  for (const item of items) {
    const prod = db.prepare(`SELECT type FROM ${T.products} WHERE id = ?`).get(item.product_id);
    if (!prod)
      return res.status(400).json({ error: `Product ${item.product_id} not found in ${req.businessMode} workspace` });
    if (!T.validTypes.includes(prod.type))
      return res.status(400).json({
        error: `Product type "${prod.type}" does not belong to ${req.businessMode} workspace. ` +
               `Allowed: ${T.validTypes.join(', ')}`
      });
  }

  const txn = db.transaction(() => {
    const poNumber = generateNumber(T.poPrefix);
    let total = 0;
    items.forEach(i => { total += i.quantity * i.rate; });

    const poResult = db.prepare(
      `INSERT INTO ${T.purchases} (purchase_number, supplier_id, date, total_amount, status, notes)
       VALUES (?,?,?,?,?,?)`
    ).run(poNumber, supplier_id, date || new Date().toISOString().split('T')[0], total, 'RECEIVED', notes || null);
    const purchaseId = poResult.lastInsertRowid;

    const createdLots = [];
    for (const item of items) {
      const prod   = db.prepare(`SELECT * FROM ${T.products} WHERE id = ?`).get(item.product_id);
      const isYarn = req.businessMode === 'YARN';

      // Location & status based on type
      let location = T.defaultLocation;
      if (isYarn && prod.type === 'DYED_YARN') location = 'FINISHED_STORE';

      const lotStatus = prod.type === 'DYED_YARN' ? 'READY_FOR_SALE' : 'IN_STORE';
      // Generate numeric auto-increment lot number
      const lotNumber = generateLotNumber(db, T.lots);

      const lotResult = db.prepare(
        `INSERT INTO ${T.lots}
          (lot_number, product_id, purchase_id, status, location,
           initial_quantity, current_quantity, shade_code, cost_per_unit)
         VALUES (?,?,?,?,?,?,?,?,?)`
      ).run(lotNumber, item.product_id, purchaseId, lotStatus, location,
            item.quantity, item.quantity, item.shade_code || null, item.rate);
      const lotId = lotResult.lastInsertRowid;

      db.prepare(
        `INSERT INTO ${T.pur_items} (purchase_id, product_id, lot_id, quantity, rate, amount)
         VALUES (?,?,?,?,?,?)`
      ).run(purchaseId, item.product_id, lotId, item.quantity, item.rate, item.quantity * item.rate);

      db.prepare(
        `INSERT INTO ${T.inventory} (product_id, lot_id, location, quantity, unit)
         VALUES (?,?,?,?,?)`
      ).run(item.product_id, lotId, location, item.quantity, prod.unit || T.defaultUnit);

      createdLots.push({ lotId, lotNumber, productName: prod.name });
    }

    // Supplier ledger
    const sup = db.prepare(`SELECT * FROM ${T.suppliers} WHERE id = ?`).get(supplier_id);
    const newBal = sup.current_balance + total;
    db.prepare(`UPDATE ${T.suppliers} SET current_balance = ? WHERE id = ?`).run(newBal, supplier_id);
    db.prepare(
      `INSERT INTO ${T.supplier_ledger} (supplier_id, date, type, reference_id, description, debit, balance)
       VALUES (?,?,?,?,?,?,?)`
    ).run(supplier_id, date || new Date().toISOString().split('T')[0],
          'PURCHASE', purchaseId, `Purchase ${poNumber}`, total, newBal);

    return { ...db.prepare(`SELECT * FROM ${T.purchases} WHERE id = ?`).get(purchaseId), lots: createdLots };
  });

  try   { res.status(201).json(txn()); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;