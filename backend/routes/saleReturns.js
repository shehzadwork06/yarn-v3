// const router = require('express').Router();
// const { authenticate } = require('../middlewares/auth');
// const { generateNumber } = require('../utils/helpers');

// router.use(authenticate);

// // GET /api/sale-returns
// router.get('/', (req, res) => {
//   const db = req.app.locals.db;
//   const { customer_id, status, from_date, to_date } = req.query;
//   let query = `
//     SELECT sr.*, c.name as customer_name, s.sale_number
//     FROM sale_returns sr
//     JOIN sales s ON sr.sale_id = s.id
//     JOIN customers c ON s.customer_id = c.id
//     WHERE 1=1
//   `;
//   const params = [];
//   if (customer_id) { query += ' AND s.customer_id = ?'; params.push(customer_id); }
//   if (status) { query += ' AND sr.status = ?'; params.push(status); }
//   if (from_date) { query += ' AND sr.date >= ?'; params.push(from_date); }
//   if (to_date) { query += ' AND sr.date <= ?'; params.push(to_date); }
//   query += ' ORDER BY sr.created_at DESC';
//   res.json(db.prepare(query).all(...params));
// });

// // GET /api/sale-returns/:id
// router.get('/:id', (req, res) => {
//   const db = req.app.locals.db;
//   const ret = db.prepare(`
//     SELECT sr.*, c.name as customer_name, s.sale_number, s.customer_id
//     FROM sale_returns sr
//     JOIN sales s ON sr.sale_id = s.id
//     JOIN customers c ON s.customer_id = c.id
//     WHERE sr.id = ?
//   `).get(req.params.id);
//   if (!ret) return res.status(404).json({ error: 'Sale return not found' });

//   const items = db.prepare(`
//     SELECT sri.*, p.name as product_name, p.type as product_type, l.lot_number, l.location as lot_location
//     FROM sale_return_items sri
//     JOIN products p ON sri.product_id = p.id
//     JOIN lots l ON sri.lot_id = l.id
//     WHERE sri.return_id = ?
//   `).all(ret.id);

//   res.json({ ...ret, items });
// });

// // POST /api/sale-returns — Create a sale return (customer returns goods)
// // Body: { sale_id, date, reason, notes, restock_location, items: [{ lot_id, product_id, quantity, rate }] }
// router.post('/', (req, res) => {
//   const db = req.app.locals.db;
//   const { sale_id, date, reason, notes, restock_location, items } = req.body;

//   if (!sale_id || !items || !items.length) {
//     return res.status(400).json({ error: 'sale_id and items required' });
//   }
//   if (!reason) {
//     return res.status(400).json({ error: 'reason is required' });
//   }

//   // Default restock location
//   const stockLocation = restock_location || 'FINISHED_STORE';
//   const validLocations = ['STORE', 'FINISHED_STORE', 'CHEMICAL_STORE'];
//   if (!validLocations.includes(stockLocation)) {
//     return res.status(400).json({ error: `restock_location must be one of: ${validLocations.join(', ')}` });
//   }

//   const txn = db.transaction(() => {
//     // Validate sale
//     const sale = db.prepare(`
//       SELECT s.*, c.name as customer_name
//       FROM sales s JOIN customers c ON s.customer_id = c.id
//       WHERE s.id = ?
//     `).get(sale_id);
//     if (!sale) throw new Error('Sale not found');
//     if (sale.status === 'CANCELLED') throw new Error('Cannot return a cancelled sale');

//     const returnNumber = generateNumber('SRN');
//     let totalAmount = 0;

//     // Validate items and get sale item data for rate reference
//     for (const item of items) {
//       const saleItem = db.prepare(`
//         SELECT * FROM sale_items WHERE sale_id = ? AND lot_id = ? AND product_id = ?
//       `).get(sale_id, item.lot_id, item.product_id);
//       if (!saleItem) throw new Error(`Item with lot_id ${item.lot_id} was not part of this sale`);

//       if (item.quantity > saleItem.quantity) {
//         throw new Error(`Return quantity (${item.quantity}) cannot exceed original sold quantity (${saleItem.quantity})`);
//       }

//       // Check if already returned more than sold
//       const alreadyReturned = db.prepare(`
//         SELECT COALESCE(SUM(sri.quantity), 0) as total
//         FROM sale_return_items sri
//         JOIN sale_returns sr ON sri.return_id = sr.id
//         WHERE sr.sale_id = ? AND sri.lot_id = ? AND sr.status != 'CANCELLED'
//       `).get(sale_id, item.lot_id);

//       const maxReturnable = saleItem.quantity - (alreadyReturned?.total || 0);
//       if (item.quantity > maxReturnable) {
//         throw new Error(`Can only return ${maxReturnable} No Of Cones more for this lot (already returned ${alreadyReturned?.total || 0} No Of Cones)`);
//       }

//       item._rate = item.rate || saleItem.rate; // use original sale rate if not specified
//       item._amount = item.quantity * item._rate;
//       totalAmount += item._amount;
//     }

//     // Create return record
//     const returnResult = db.prepare(`
//       INSERT INTO sale_returns (return_number, sale_id, date, reason, notes, restock_location, total_amount, status)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//     `).run(returnNumber, sale_id, date || new Date().toISOString().split('T')[0], reason, notes || null, stockLocation, totalAmount, 'COMPLETED');
//     const returnId = returnResult.lastInsertRowid;

//     // Process each returned item
//     for (const item of items) {
//       const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(item.lot_id);

//       // Insert return item
//       db.prepare(`
//         INSERT INTO sale_return_items (return_id, lot_id, product_id, quantity, rate, amount, restock_location)
//         VALUES (?, ?, ?, ?, ?, ?, ?)
//       `).run(returnId, item.lot_id, item.product_id, item.quantity, item._rate, item._amount, stockLocation);

//       // Restore inventory — check if existing inventory record exists for this lot+location
//       const existingInv = db.prepare(
//         'SELECT * FROM inventory WHERE lot_id = ? AND location = ?'
//       ).get(item.lot_id, stockLocation);

//       if (existingInv) {
//         db.prepare('UPDATE inventory SET quantity = ?, updated_at = datetime(\'now\') WHERE id = ?')
//           .run(existingInv.quantity + item.quantity, existingInv.id);
//       } else {
//         // Inventory record may have been zeroed — restore it
//         db.prepare('INSERT INTO inventory (product_id, lot_id, location, quantity, unit) VALUES (?, ?, ?, ?, ?)')
//           .run(item.product_id, item.lot_id, stockLocation, item.quantity, 'No Of Cones');
//       }

//       // Restore lot quantity and update status
//       const newLotQty = lot.current_quantity + item.quantity;
//       let newLotStatus = 'PARTIALLY_SOLD';
//       if (newLotQty >= lot.initial_quantity) {
//         newLotStatus = 'READY_FOR_SALE'; // fully returned
//       }
//       db.prepare('UPDATE lots SET current_quantity = ?, status = ?, location = ?, updated_at = datetime(\'now\') WHERE id = ?')
//         .run(newLotQty, newLotStatus, stockLocation, item.lot_id);
//     }

//     // Update customer ledger — reduce what customer owes us
//     const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(sale.customer_id);
//     const newBalance = customer.current_balance - totalAmount;
//     db.prepare('UPDATE customers SET current_balance = ? WHERE id = ?').run(newBalance, sale.customer_id);
//     db.prepare(`
//       INSERT INTO customer_ledger (customer_id, date, type, reference_id, description, credit, balance)
//       VALUES (?, ?, ?, ?, ?, ?, ?)
//     `).run(
//       sale.customer_id,
//       date || new Date().toISOString().split('T')[0],
//       'ADJUSTMENT',
//       returnId,
//       `Sale Return ${returnNumber} against ${sale.sale_number}`,
//       totalAmount,
//       newBalance
//     );

//     return db.prepare(`
//       SELECT sr.*, c.name as customer_name, s.sale_number
//       FROM sale_returns sr
//       JOIN sales s ON sr.sale_id = s.id
//       JOIN customers c ON s.customer_id = c.id
//       WHERE sr.id = ?
//     `).get(returnId);
//   });

//   try {
//     res.status(201).json(txn());
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// // PUT /api/sale-returns/:id/cancel — Cancel a return (reverses all effects)
// router.put('/:id/cancel', (req, res) => {
//   const db = req.app.locals.db;

//   const txn = db.transaction(() => {
//     const ret = db.prepare(`
//       SELECT sr.*, s.customer_id, s.sale_number
//       FROM sale_returns sr JOIN sales s ON sr.sale_id = s.id
//       WHERE sr.id = ?
//     `).get(req.params.id);
//     if (!ret) throw new Error('Sale return not found');
//     if (ret.status === 'CANCELLED') throw new Error('Return is already cancelled');

//     const items = db.prepare('SELECT * FROM sale_return_items WHERE return_id = ?').all(ret.id);

//     // Reverse each item
//     for (const item of items) {
//       const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(item.lot_id);
//       const inv = db.prepare('SELECT * FROM inventory WHERE lot_id = ? AND location = ?').get(item.lot_id, item.restock_location);

//       // Remove from inventory
//       if (inv) {
//         const newQty = Math.max(0, inv.quantity - item.quantity);
//         db.prepare('UPDATE inventory SET quantity = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newQty, inv.id);
//       }

//       // Reduce lot quantity back
//       const newLotQty = Math.max(0, lot.current_quantity - item.quantity);
//       const newStatus = newLotQty <= 0 ? 'SOLD' : 'PARTIALLY_SOLD';
//       db.prepare('UPDATE lots SET current_quantity = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?')
//         .run(newLotQty, newStatus, item.lot_id);
//     }

//     // Reverse customer ledger
//     const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(ret.customer_id);
//     const newBalance = customer.current_balance + ret.total_amount;
//     db.prepare('UPDATE customers SET current_balance = ? WHERE id = ?').run(newBalance, ret.customer_id);
//     db.prepare(`
//       INSERT INTO customer_ledger (customer_id, date, type, reference_id, description, debit, balance)
//       VALUES (?, ?, ?, ?, ?, ?, ?)
//     `).run(
//       ret.customer_id,
//       new Date().toISOString().split('T')[0],
//       'ADJUSTMENT',
//       ret.id,
//       `Cancelled Sale Return ${ret.return_number}`,
//       ret.total_amount,
//       newBalance
//     );

//     // Mark return as cancelled
//     db.prepare('UPDATE sale_returns SET status = ? WHERE id = ?').run('CANCELLED', ret.id);

//     return db.prepare('SELECT * FROM sale_returns WHERE id = ?').get(ret.id);
//   });

//   try {
//     res.json(txn());
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
  res.json(db.prepare(`SELECT sr.*, s.sale_number, c.name as customer_name FROM ${T.sale_returns} sr
    JOIN ${T.sales} s ON sr.sale_id=s.id JOIN ${T.customers} c ON s.customer_id=c.id ORDER BY sr.created_at DESC`).all());
});

router.get('/:id', (req, res) => {
  const db = req.app.locals.db; const T = req.T;
  const ret = db.prepare(`SELECT sr.*, s.sale_number, c.name as customer_name FROM ${T.sale_returns} sr
    JOIN ${T.sales} s ON sr.sale_id=s.id JOIN ${T.customers} c ON s.customer_id=c.id WHERE sr.id=?`).get(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  const items = db.prepare(`SELECT ri.*, p.name as product_name, l.lot_number FROM ${T.sale_ret_items} ri
    JOIN ${T.products} p ON ri.product_id=p.id JOIN ${T.lots} l ON ri.lot_id=l.id WHERE ri.return_id=?`).all(ret.id);
  res.json({ ...ret, items });
});

router.post('/', (req, res) => {
  const db = req.app.locals.db; const T = req.T;
  const { sale_id, date, reason, notes, restock_location, items } = req.body;
  if (!sale_id || !reason || !items || !items.length)
    return res.status(400).json({ error: 'sale_id, reason and items required' });

  const defaultRestock = req.businessMode === 'CHEMICAL' ? 'CHEMICAL_STORE' : 'FINISHED_STORE';

  const txn = db.transaction(() => {
    const retNum = generateNumber(T.srPrefix);
    let total = 0;
    items.forEach(i => { total += i.quantity * i.rate; });
    const loc = restock_location || defaultRestock;

    const r = db.prepare(`INSERT INTO ${T.sale_returns} (return_number, sale_id, date, reason, notes, restock_location, total_amount) VALUES (?,?,?,?,?,?,?)`)
      .run(retNum, sale_id, date || new Date().toISOString().split('T')[0], reason, notes || null, loc, total);
    const returnId = r.lastInsertRowid;

    for (const item of items) {
      db.prepare(`INSERT INTO ${T.sale_ret_items} (return_id, lot_id, product_id, quantity, rate, amount, restock_location) VALUES (?,?,?,?,?,?,?)`)
        .run(returnId, item.lot_id, item.product_id, item.quantity, item.rate, item.quantity * item.rate, loc);
      db.prepare(`UPDATE ${T.lots} SET current_quantity=current_quantity+?, status='PARTIALLY_SOLD', location=?, updated_at=datetime('now') WHERE id=?`)
        .run(item.quantity, loc, item.lot_id);
      const inv = db.prepare(`SELECT * FROM ${T.inventory} WHERE lot_id=?`).get(item.lot_id);
      if (inv) {
        db.prepare(`UPDATE ${T.inventory} SET quantity=quantity+?, location=?, updated_at=datetime('now') WHERE id=?`).run(item.quantity, loc, inv.id);
      } else {
        db.prepare(`INSERT INTO ${T.inventory} (product_id, lot_id, location, quantity) VALUES (?,?,?,?)`).run(item.product_id, item.lot_id, loc, item.quantity);
      }
    }

    const sale = db.prepare(`SELECT * FROM ${T.sales} WHERE id=?`).get(sale_id);
    const cust = db.prepare(`SELECT * FROM ${T.customers} WHERE id=?`).get(sale.customer_id);
    const newBal = cust.current_balance - total;
    db.prepare(`UPDATE ${T.customers} SET current_balance=? WHERE id=?`).run(newBal, sale.customer_id);
    db.prepare(`INSERT INTO ${T.customer_ledger} (customer_id, date, type, reference_id, description, credit, balance) VALUES (?,?,?,?,?,?,?)`)
      .run(sale.customer_id, date || new Date().toISOString().split('T')[0], 'ADJUSTMENT', returnId, `Return ${retNum}`, total, newBal);

    return db.prepare(`SELECT * FROM ${T.sale_returns} WHERE id=?`).get(returnId);
  });
  try   { res.status(201).json(txn()); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id/cancel', (req, res) => {
  const db = req.app.locals.db; const T = req.T;
  db.prepare(`UPDATE ${T.sale_returns} SET status='CANCELLED' WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

module.exports = router;