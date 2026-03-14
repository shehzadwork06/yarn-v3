
// const router = require('express').Router();
// const { authenticate } = require('../middlewares/auth');
// const { generateNumber } = require('../utils/helpers');

// router.use(authenticate);

// // GET /api/purchase-returns
// router.get('/', (req, res) => {
//   const db = req.app.locals.db;
//   const { supplier_id, status, from_date, to_date } = req.query;
//   let query = `
//     SELECT pr.*, s.name as supplier_name, p.purchase_number
//     FROM purchase_returns pr
//     JOIN purchases p ON pr.purchase_id = p.id
//     JOIN suppliers s ON p.supplier_id = s.id
//     WHERE 1=1
//   `;
//   const params = [];
//   if (supplier_id) { query += ' AND p.supplier_id = ?'; params.push(supplier_id); }
//   if (status) { query += ' AND pr.status = ?'; params.push(status); }
//   if (from_date) { query += ' AND pr.date >= ?'; params.push(from_date); }
//   if (to_date) { query += ' AND pr.date <= ?'; params.push(to_date); }
//   query += ' ORDER BY pr.created_at DESC';
//   res.json(db.prepare(query).all(...params));
// });

// // GET /api/purchase-returns/:id
// router.get('/:id', (req, res) => {
//   const db = req.app.locals.db;
//   const ret = db.prepare(`
//     SELECT pr.*, s.name as supplier_name, p.purchase_number, p.supplier_id
//     FROM purchase_returns pr
//     JOIN purchases p ON pr.purchase_id = p.id
//     JOIN suppliers s ON p.supplier_id = s.id
//     WHERE pr.id = ?
//   `).get(req.params.id);
//   if (!ret) return res.status(404).json({ error: 'Purchase return not found' });

//   const items = db.prepare(`
//     SELECT pri.*, pr2.name as product_name, pr2.type as product_type, l.lot_number
//     FROM purchase_return_items pri
//     JOIN products pr2 ON pri.product_id = pr2.id
//     JOIN lots l ON pri.lot_id = l.id
//     WHERE pri.return_id = ?
//   `).all(ret.id);

//   res.json({ ...ret, items });
// });

// // POST /api/purchase-returns — Create a purchase return
// router.post('/', (req, res) => {
//   const db = req.app.locals.db;
//   const { purchase_id, date, reason, notes, items } = req.body;

//   if (!purchase_id || !items || !items.length) {
//     return res.status(400).json({ error: 'purchase_id and items required' });
//   }
//   if (!reason) {
//     return res.status(400).json({ error: 'reason is required' });
//   }

//   // FIX: Always coerce to integer — HTML select elements send strings
//   const purchaseIdInt = parseInt(purchase_id, 10);

//   const txn = db.transaction(() => {
//     const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseIdInt);
//     if (!purchase) throw new Error('Purchase not found');
//     if (purchase.status === 'CANCELLED') throw new Error('Cannot return a cancelled purchase');

//     const returnNumber = generateNumber('PRN');
//     let totalAmount = 0;

//     // Validate each item before making changes
//     for (const item of items) {
//       // FIX: Coerce lot_id and product_id to integers too
//       item.lot_id = parseInt(item.lot_id, 10);
//       item.product_id = parseInt(item.product_id, 10);

//       const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(item.lot_id);
//       if (!lot) throw new Error(`Lot ${item.lot_id} not found`);

//       // FIX: Compare as integers on both sides to avoid string vs number mismatch
//       if (parseInt(lot.purchase_id, 10) !== purchaseIdInt) {
//         throw new Error(`Lot ${lot.lot_number} does not belong to this purchase`);
//       }

//       if (['DYEING', 'CHEMICAL_MANUFACTURING', 'FINISHED', 'SOLD'].includes(lot.status)) {
//         throw new Error(`Lot ${lot.lot_number} cannot be returned — it has been processed or sold (status: ${lot.status})`);
//       }

//       const inv = db.prepare('SELECT * FROM inventory WHERE lot_id = ? AND quantity > 0').get(item.lot_id);
//       const availableQty = inv ? inv.quantity : 0;
//       if (item.quantity > availableQty) {
//         throw new Error(`Return quantity (${item.quantity}) exceeds available stock (${availableQty}) for lot ${lot.lot_number}`);
//       }

//       item._rate = item.rate || lot.cost_per_unit;
//       item._amount = item.quantity * item._rate;
//       totalAmount += item._amount;
//     }

//     // Create return record
//     const returnResult = db.prepare(`
//       INSERT INTO purchase_returns (return_number, purchase_id, date, reason, notes, total_amount, status)
//       VALUES (?, ?, ?, ?, ?, ?, ?)
//     `).run(returnNumber, purchaseIdInt, date || new Date().toISOString().split('T')[0], reason, notes || null, totalAmount, 'COMPLETED');
//     const returnId = returnResult.lastInsertRowid;

//     // Process each item
//     for (const item of items) {
//       const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(item.lot_id);
//       const inv = db.prepare('SELECT * FROM inventory WHERE lot_id = ?').get(item.lot_id);

//       db.prepare(`
//         INSERT INTO purchase_return_items (return_id, lot_id, product_id, quantity, rate, amount)
//         VALUES (?, ?, ?, ?, ?, ?)
//       `).run(returnId, item.lot_id, item.product_id, item.quantity, item._rate, item._amount);

//       // Reduce inventory
//       const newInvQty = inv.quantity - item.quantity;
//       db.prepare(`UPDATE inventory SET quantity = ?, updated_at = datetime('now') WHERE id = ?`)
//         .run(Math.max(0, newInvQty), inv.id);

//       // Reduce lot quantity
//       const newLotQty = lot.current_quantity - item.quantity;
//       let newLotStatus = lot.status;
//       if (newLotQty <= 0) {
//         newLotStatus = 'SOLD';
//         db.prepare(`UPDATE inventory SET quantity = 0, updated_at = datetime('now') WHERE lot_id = ?`).run(item.lot_id);
//       }
//       db.prepare(`UPDATE lots SET current_quantity = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
//         .run(Math.max(0, newLotQty), newLotStatus, item.lot_id);
//     }

//     // Update supplier ledger
//     const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(purchase.supplier_id);
//     const newBalance = supplier.current_balance - totalAmount;
//     db.prepare('UPDATE suppliers SET current_balance = ? WHERE id = ?').run(newBalance, purchase.supplier_id);
//     db.prepare(`
//       INSERT INTO supplier_ledger (supplier_id, date, type, reference_id, description, credit, balance)
//       VALUES (?, ?, ?, ?, ?, ?, ?)
//     `).run(
//       purchase.supplier_id,
//       date || new Date().toISOString().split('T')[0],
//       'ADJUSTMENT',
//       returnId,
//       `Purchase Return ${returnNumber} against ${purchase.purchase_number}`,
//       totalAmount,
//       newBalance
//     );

//     return db.prepare(`
//       SELECT pr.*, s.name as supplier_name, p.purchase_number
//       FROM purchase_returns pr
//       JOIN purchases p ON pr.purchase_id = p.id
//       JOIN suppliers s ON p.supplier_id = s.id
//       WHERE pr.id = ?
//     `).get(returnId);
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
  res.json(db.prepare(`SELECT pr.*, p.purchase_number, s.name as supplier_name FROM ${T.pur_returns} pr
    JOIN ${T.purchases} p ON pr.purchase_id=p.id JOIN ${T.suppliers} s ON p.supplier_id=s.id ORDER BY pr.created_at DESC`).all());
});

router.get('/:id', (req, res) => {
  const db = req.app.locals.db; const T = req.T;
  const ret = db.prepare(`SELECT pr.*, p.purchase_number, s.name as supplier_name FROM ${T.pur_returns} pr
    JOIN ${T.purchases} p ON pr.purchase_id=p.id JOIN ${T.suppliers} s ON p.supplier_id=s.id WHERE pr.id=?`).get(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  const items = db.prepare(`SELECT ri.*, pr.name as product_name, l.lot_number FROM ${T.pur_ret_items} ri
    JOIN ${T.products} pr ON ri.product_id=pr.id JOIN ${T.lots} l ON ri.lot_id=l.id WHERE ri.return_id=?`).all(ret.id);
  res.json({ ...ret, items });
});

router.post('/', (req, res) => {
  const db = req.app.locals.db; const T = req.T;
  const { purchase_id, date, reason, notes, items } = req.body;
  if (!purchase_id || !reason || !items || !items.length)
    return res.status(400).json({ error: 'purchase_id, reason and items required' });

  const txn = db.transaction(() => {
    const retNum = generateNumber(T.prPrefix);
    let total = 0;
    items.forEach(i => { total += i.quantity * i.rate; });

    const r = db.prepare(`INSERT INTO ${T.pur_returns} (return_number, purchase_id, date, reason, notes, total_amount) VALUES (?,?,?,?,?,?)`)
      .run(retNum, purchase_id, date || new Date().toISOString().split('T')[0], reason, notes || null, total);
    const returnId = r.lastInsertRowid;

    for (const item of items) {
      db.prepare(`INSERT INTO ${T.pur_ret_items} (return_id, lot_id, product_id, quantity, rate, amount) VALUES (?,?,?,?,?,?)`)
        .run(returnId, item.lot_id, item.product_id, item.quantity, item.rate, item.quantity * item.rate);
      db.prepare(`UPDATE ${T.lots} SET current_quantity=current_quantity-?, updated_at=datetime('now') WHERE id=?`).run(item.quantity, item.lot_id);
      db.prepare(`UPDATE ${T.inventory} SET quantity=quantity-?, updated_at=datetime('now') WHERE lot_id=?`).run(item.quantity, item.lot_id);
    }

    const purchase = db.prepare(`SELECT * FROM ${T.purchases} WHERE id=?`).get(purchase_id);
    const sup      = db.prepare(`SELECT * FROM ${T.suppliers} WHERE id=?`).get(purchase.supplier_id);
    const newBal   = sup.current_balance - total;
    db.prepare(`UPDATE ${T.suppliers} SET current_balance=? WHERE id=?`).run(newBal, purchase.supplier_id);
    db.prepare(`INSERT INTO ${T.supplier_ledger} (supplier_id, date, type, reference_id, description, credit, balance) VALUES (?,?,?,?,?,?,?)`)
      .run(purchase.supplier_id, date || new Date().toISOString().split('T')[0], 'ADJUSTMENT', returnId, `Return ${retNum}`, total, newBal);

    return db.prepare(`SELECT * FROM ${T.pur_returns} WHERE id=?`).get(returnId);
  });
  try   { res.status(201).json(txn()); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;