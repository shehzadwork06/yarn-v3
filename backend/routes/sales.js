
// const router = require('express').Router();
// const { authenticate } = require('../middlewares/auth');
// const { generateNumber } = require('../utils/helpers');

// router.use(authenticate);

// // GET /api/sales
// router.get('/', (req, res) => {
//   const db = req.app.locals.db;
//   const { customer_id, status, from_date, to_date, category_id } = req.query;

//   // Subquery gets the first category_id from this sale's items (via lot -> product)
//   let query = `
//     SELECT s.*, c.name as customer_name,
//       (SELECT p.category_id FROM sale_items si
//        JOIN lots l ON si.lot_id = l.id
//        JOIN products p ON l.product_id = p.id
//        WHERE si.sale_id = s.id LIMIT 1) as category_id
//     FROM sales s
//     JOIN customers c ON s.customer_id = c.id
//     WHERE 1=1`;

//   const params = [];
//   if (customer_id) { query += ' AND s.customer_id = ?'; params.push(customer_id); }
//   if (status) { query += ' AND s.status = ?'; params.push(status); }
//   if (from_date) { query += ' AND s.date >= ?'; params.push(from_date); }
//   if (to_date) { query += ' AND s.date <= ?'; params.push(to_date); }
//   if (category_id) {
//     query += ` AND s.id IN (
//       SELECT si.sale_id FROM sale_items si
//       JOIN lots l ON si.lot_id = l.id
//       JOIN products p ON l.product_id = p.id
//       WHERE p.category_id = ?)`;
//     params.push(category_id);
//   }
//   query += ' ORDER BY s.created_at DESC';
//   res.json(db.prepare(query).all(...params));
// });

// // GET /api/sales/:id
// router.get('/:id', (req, res) => {
//   const db = req.app.locals.db;
//   const sale = db.prepare('SELECT s.*, c.name as customer_name FROM sales s JOIN customers c ON s.customer_id = c.id WHERE s.id = ?').get(req.params.id);
//   if (!sale) return res.status(404).json({ error: 'Sale not found' });
//   const items = db.prepare(`SELECT si.*, p.name as product_name, p.type as product_type, l.lot_number
//     FROM sale_items si JOIN products p ON si.product_id = p.id JOIN lots l ON si.lot_id = l.id WHERE si.sale_id = ?`).all(sale.id);
//   const gatePass = sale.gate_pass_id ? db.prepare('SELECT * FROM gate_passes WHERE id = ?').get(sale.gate_pass_id) : null;
//   res.json({ ...sale, items, gate_pass: gatePass });
// });

// // POST /api/sales — Create sale with items, generate gate pass, update inventory & customer ledger
// router.post('/', (req, res) => {
//   const db = req.app.locals.db;
//   const { customer_id, date, items, target_price, discount_percentage, notes } = req.body;
//   if (!customer_id || !items || !items.length) return res.status(400).json({ error: 'Customer and items required' });

//   const txn = db.transaction(() => {
//     const saleNumber = generateNumber('SL');
//     let totalAmount = 0;

//     for (const item of items) {
//       const lot = db.prepare('SELECT l.*, p.type as product_type FROM lots l JOIN products p ON l.product_id = p.id WHERE l.id = ?').get(item.lot_id);
//       if (!lot) throw new Error(`Lot ${item.lot_id} not found`);
//       if (!['IN_STORE', 'READY_FOR_SALE', 'PARTIALLY_SOLD'].includes(lot.status)) throw new Error(`Lot ${lot.lot_number} not available for sale (status: ${lot.status})`);
//       if (lot.product_type === 'CHEMICAL_RAW') throw new Error('Chemical raw material cannot be sold directly');
//       const inv = db.prepare('SELECT SUM(quantity) as qty FROM inventory WHERE lot_id = ? AND quantity > 0').get(item.lot_id);
//       if (!inv || inv.qty < item.quantity) throw new Error(`Insufficient stock for lot ${lot.lot_number}. Available: ${inv ? inv.qty : 0}`);
//       item._amount = item.quantity * item.rate;
//       totalAmount += item._amount;
//     }

//     let discountPct = discount_percentage || 0;
//     let discountAmt = 0;
//     let netAmount = totalAmount;

//     if (target_price && target_price < totalAmount) {
//       discountAmt = totalAmount - target_price;
//       discountPct = (discountAmt / totalAmount) * 100;
//       netAmount = target_price;
//     } else if (discountPct > 0) {
//       discountAmt = totalAmount * (discountPct / 100);
//       netAmount = totalAmount - discountAmt;
//     }

//     const saleResult = db.prepare(
//       'INSERT INTO sales (sale_number, customer_id, date, total_amount, discount_percentage, discount_amount, net_amount, status, notes) VALUES (?,?,?,?,?,?,?,?,?)'
//     ).run(saleNumber, customer_id, date || new Date().toISOString().split('T')[0], totalAmount, discountPct, discountAmt, netAmount, 'CONFIRMED', notes);
//     const saleId = saleResult.lastInsertRowid;

//     const lotIds = [];
//     let totalQty = 0;
//     for (const item of items) {
//       db.prepare('INSERT INTO sale_items (sale_id, product_id, lot_id, quantity, rate, amount, target_price) VALUES (?,?,?,?,?,?,?)')
//         .run(saleId, item.product_id, item.lot_id, item.quantity, item.rate, item._amount, item.target_price || null);

//       const inv = db.prepare('SELECT * FROM inventory WHERE lot_id = ? AND quantity > 0').get(item.lot_id);
//       const newQty = inv.quantity - item.quantity;
//       db.prepare('UPDATE inventory SET quantity = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newQty, inv.id);

//       const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(item.lot_id);
//       const lotNewQty = lot.current_quantity - item.quantity;
//       const lotStatus = lotNewQty <= 0 ? 'SOLD' : 'PARTIALLY_SOLD';
//       db.prepare('UPDATE lots SET current_quantity = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(Math.max(0, lotNewQty), lotStatus, item.lot_id);

//       lotIds.push(lot.lot_number);
//       totalQty += item.quantity;
//     }

//     const gpNumber = generateNumber('GP');
//     const gpResult = db.prepare(
//       'INSERT INTO gate_passes (gate_pass_number, sale_id, date, lot_ids, total_quantity) VALUES (?,?,?,?,?)'
//     ).run(gpNumber, saleId, date || new Date().toISOString().split('T')[0], JSON.stringify(lotIds), totalQty);
//     db.prepare('UPDATE sales SET gate_pass_id = ? WHERE id = ?').run(gpResult.lastInsertRowid, saleId);

//     const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
//     const newBalance = customer.current_balance + netAmount;
//     db.prepare('UPDATE customers SET current_balance = ? WHERE id = ?').run(newBalance, customer_id);
//     db.prepare('INSERT INTO customer_ledger (customer_id, date, type, reference_id, description, debit, balance) VALUES (?,?,?,?,?,?,?)')
//       .run(customer_id, date || new Date().toISOString().split('T')[0], 'SALE', saleId, `Sale ${saleNumber}`, netAmount, newBalance);

//     return db.prepare('SELECT s.*, c.name as customer_name FROM sales s JOIN customers c ON s.customer_id = c.id WHERE s.id = ?').get(saleId);
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
const { generateNumber } = require('../utils/helpers');
router.use(authenticate);

router.get('/', (req, res) => {
  const db = req.app.locals.db; const T = req.T;
  const { customer_id, status, from_date, to_date } = req.query;
  let sql = `SELECT s.*, c.name as customer_name FROM ${T.sales} s
    JOIN ${T.customers} c ON s.customer_id = c.id WHERE 1=1`;
  const params = [];
  if (customer_id) { sql += ' AND s.customer_id = ?'; params.push(customer_id); }
  if (status)      { sql += ' AND s.status = ?';       params.push(status); }
  if (from_date)   { sql += ' AND s.date >= ?';        params.push(from_date); }
  if (to_date)     { sql += ' AND s.date <= ?';        params.push(to_date); }
  sql += ' ORDER BY s.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const db = req.app.locals.db; const T = req.T;
  const sale = db.prepare(`SELECT s.*, c.name as customer_name FROM ${T.sales} s
    JOIN ${T.customers} c ON s.customer_id = c.id WHERE s.id = ?`).get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Sale not found' });
  const items = db.prepare(`SELECT si.*, p.name as product_name, p.type as product_type,
    l.lot_number, l.shade_code FROM ${T.sale_items} si
    JOIN ${T.products} p ON si.product_id = p.id JOIN ${T.lots} l ON si.lot_id = l.id
    WHERE si.sale_id = ?`).all(sale.id);
  const gp = sale.gate_pass_id
    ? db.prepare(`SELECT * FROM ${T.gate_passes} WHERE id = ?`).get(sale.gate_pass_id)
    : null;
  res.json({ ...sale, items, gate_pass: gp });
});

router.post('/', (req, res) => {
  const db = req.app.locals.db; const T = req.T;
  const { customer_id, date, items, target_price, discount_percentage, notes } = req.body;
  if (!customer_id || !items || !items.length)
    return res.status(400).json({ error: 'customer_id and items required' });

  const txn = db.transaction(() => {
    const slNumber = generateNumber(T.slPrefix);
    let total = 0;

    for (const item of items) {
      const lot = db.prepare(`SELECT l.*, p.type as product_type FROM ${T.lots} l
        JOIN ${T.products} p ON l.product_id = p.id WHERE l.id = ?`).get(item.lot_id);
      if (!lot) throw new Error(`Lot ${item.lot_id} not found`);
      if (!['IN_STORE','READY_FOR_SALE','PARTIALLY_SOLD'].includes(lot.status))
        throw new Error(`Lot ${lot.lot_number} not available for sale (status: ${lot.status})`);
      if (lot.product_type === 'CHEMICAL_RAW')
        throw new Error('CHEMICAL_RAW cannot be sold directly');
      const inv = db.prepare(`SELECT SUM(quantity) as qty FROM ${T.inventory} WHERE lot_id = ? AND quantity > 0`).get(item.lot_id);
      if (!inv || inv.qty < item.quantity)
        throw new Error(`Insufficient stock for lot ${lot.lot_number}. Available: ${inv ? inv.qty : 0}`);
      item._amount = item.quantity * item.rate;
      total += item._amount;
    }

    let discPct = discount_percentage || 0, discAmt = 0, net = total;
    if (target_price && target_price < total) {
      discAmt = total - target_price; discPct = (discAmt / total) * 100; net = target_price;
    } else if (discPct > 0) {
      discAmt = total * (discPct / 100); net = total - discAmt;
    }

    const slResult = db.prepare(
      `INSERT INTO ${T.sales} (sale_number, customer_id, date, total_amount, discount_percentage, discount_amount, net_amount, status, notes)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(slNumber, customer_id, date || new Date().toISOString().split('T')[0],
          total, discPct, discAmt, net, 'CONFIRMED', notes || null);
    const saleId = slResult.lastInsertRowid;

    const lotIdArr = []; let totalQty = 0;
    for (const item of items) {
      const lot = db.prepare(`SELECT * FROM ${T.lots} WHERE id = ?`).get(item.lot_id);
      db.prepare(`INSERT INTO ${T.sale_items} (sale_id, product_id, lot_id, quantity, rate, amount, target_price) VALUES (?,?,?,?,?,?,?)`)
        .run(saleId, lot.product_id, item.lot_id, item.quantity, item.rate, item._amount, item.target_price || null);
      const inv = db.prepare(`SELECT * FROM ${T.inventory} WHERE lot_id = ? AND quantity > 0`).get(item.lot_id);
      db.prepare(`UPDATE ${T.inventory} SET quantity = ?, updated_at = datetime('now') WHERE id = ?`).run(inv.quantity - item.quantity, inv.id);
      const newQty = lot.current_quantity - item.quantity;
      db.prepare(`UPDATE ${T.lots} SET current_quantity = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(Math.max(0, newQty), newQty <= 0 ? 'SOLD' : 'PARTIALLY_SOLD', item.lot_id);
      lotIdArr.push(item.lot_id); totalQty += item.quantity;
    }

    // Gate pass
    const gpResult = db.prepare(`INSERT INTO ${T.gate_passes} (gate_pass_number, sale_id, date, lot_ids, total_quantity) VALUES (?,?,?,?,?)`)
      .run(generateNumber(T.gpPrefix), saleId, date || new Date().toISOString().split('T')[0], JSON.stringify(lotIdArr), totalQty);
    db.prepare(`UPDATE ${T.sales} SET gate_pass_id = ? WHERE id = ?`).run(gpResult.lastInsertRowid, saleId);

    // Customer ledger
    const cust = db.prepare(`SELECT * FROM ${T.customers} WHERE id = ?`).get(customer_id);
    const newBal = cust.current_balance + net;
    db.prepare(`UPDATE ${T.customers} SET current_balance = ? WHERE id = ?`).run(newBal, customer_id);
    db.prepare(`INSERT INTO ${T.customer_ledger} (customer_id, date, type, reference_id, description, debit, balance) VALUES (?,?,?,?,?,?,?)`)
      .run(customer_id, date || new Date().toISOString().split('T')[0], 'SALE', saleId, `Sale ${slNumber}`, net, newBal);

    return db.prepare(`SELECT s.*, c.name as customer_name FROM ${T.sales} s
      JOIN ${T.customers} c ON s.customer_id = c.id WHERE s.id = ?`).get(saleId);
  });

  try   { res.status(201).json(txn()); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;