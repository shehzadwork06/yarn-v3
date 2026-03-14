// const router = require('express').Router();
// const { authenticate } = require('../middlewares/auth');
// const { generateLotNumber, generateNumber } = require('../utils/helpers');

// router.use(authenticate);

// // GET /api/manufacturing
// router.get('/', (req, res) => {
//   const db = req.app.locals.db;
//   const { process_type, status } = req.query;
//   let query = `SELECT m.*, l.lot_number, p.name as product_name
//     FROM manufacturing_processes m JOIN lots l ON m.lot_id = l.id JOIN products p ON l.product_id = p.id WHERE 1=1`;
//   const params = [];
//   if (process_type) { query += ' AND m.process_type = ?'; params.push(process_type); }
//   if (status) { query += ' AND m.status = ?'; params.push(status); }
//   query += ' ORDER BY m.created_at DESC';
//   res.json(db.prepare(query).all(...params));
// });

// // GET /api/manufacturing/:id
// router.get('/:id', (req, res) => {
//   const db = req.app.locals.db;
//   const process = db.prepare(`
//     SELECT m.*, l.lot_number, p.name as product_name, p.type as product_type
//     FROM manufacturing_processes m JOIN lots l ON m.lot_id = l.id JOIN products p ON l.product_id = p.id WHERE m.id = ?
//   `).get(req.params.id);
//   if (!process) return res.status(404).json({ error: 'Manufacturing process not found' });
//   const wastage = db.prepare('SELECT * FROM wastage WHERE manufacturing_id = ?').all(process.id);
//   res.json({ ...process, wastage });
// });

// // POST /api/manufacturing/start-dyeing — Issue lot to dye house
// router.post('/start-dyeing', (req, res) => {
//   const db = req.app.locals.db;
//   const { lot_id, input_weight, expected_output, notes } = req.body;
//   if (!lot_id || !input_weight || !expected_output) {
//     return res.status(400).json({ error: 'lot_id, input_weight, expected_output required' });
//   }

//   const txn = db.transaction(() => {
//     const lot = db.prepare('SELECT l.*, p.type as product_type FROM lots l JOIN products p ON l.product_id = p.id WHERE l.id = ?').get(lot_id);
//     if (!lot) throw new Error('Lot not found');
//     if (lot.product_type !== 'RAW_YARN') throw new Error('Only raw yarn can be sent for dyeing');
//     if (lot.status !== 'IN_STORE') throw new Error('Lot must be IN_STORE to start dyeing');
//     if (input_weight > lot.current_quantity) throw new Error('Input weight exceeds available quantity');

//     // Update lot status and location
//     db.prepare('UPDATE lots SET status = ?, location = ?, updated_at = datetime(\'now\') WHERE id = ?').run('DYEING', 'DYEING', lot_id);
//     // Update inventory location
//     db.prepare('UPDATE inventory SET location = ?, updated_at = datetime(\'now\') WHERE lot_id = ? AND location = ?').run('DYEING', lot_id, 'STORE');

//     const result = db.prepare(
//       'INSERT INTO manufacturing_processes (lot_id, process_type, status, input_weight, expected_output, notes) VALUES (?,?,?,?,?,?)'
//     ).run(lot_id, 'DYEING', 'IN_PROGRESS', input_weight, expected_output, notes);

//     return db.prepare('SELECT m.*, l.lot_number FROM manufacturing_processes m JOIN lots l ON m.lot_id = l.id WHERE m.id = ?').get(result.lastInsertRowid);
//   });

//   try {
//     res.status(201).json(txn());
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// // POST /api/manufacturing/complete-dyeing — Complete dyeing, calculate wastage, create finished product
// router.post('/complete-dyeing', (req, res) => {
//   const db = req.app.locals.db;
//   const { manufacturing_id, actual_output, shade_code, notes } = req.body;
//   if (!manufacturing_id || actual_output === undefined || !shade_code) {
//     return res.status(400).json({ error: 'manufacturing_id, actual_output, shade_code required' });
//   }

//   const txn = db.transaction(() => {
//     const mfg = db.prepare('SELECT * FROM manufacturing_processes WHERE id = ? AND status = ?').get(manufacturing_id, 'IN_PROGRESS');
//     if (!mfg) throw new Error('Manufacturing process not found or not in progress');
//     if (mfg.process_type !== 'DYEING') throw new Error('This is not a dyeing process');

//     const lot = db.prepare('SELECT l.*, p.name as product_name FROM lots l JOIN products p ON l.product_id = p.id WHERE l.id = ?').get(mfg.lot_id);

//     // Calculate wastage
//     let wastageAmount = 0;
//     if (actual_output < mfg.expected_output) {
//       wastageAmount = mfg.expected_output - actual_output;
//     }
//     const wastagePercentage = mfg.input_weight > 0 ? (wastageAmount / mfg.input_weight) * 100 : 0;
//     const wastageCost = wastageAmount * lot.cost_per_unit;

//     // Update manufacturing process
//     db.prepare('UPDATE manufacturing_processes SET status = ?, actual_output = ?, shade_code = ?, end_date = date(\'now\'), notes = COALESCE(?, notes) WHERE id = ?')
//       .run('COMPLETED', actual_output, shade_code, notes, manufacturing_id);

//     // Record wastage if any
//     if (wastageAmount > 0) {
//       db.prepare('INSERT INTO wastage (lot_id, manufacturing_id, process_stage, input_weight, expected_output, actual_output, wastage_amount, wastage_percentage, cost_per_unit, wastage_cost, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
//         .run(mfg.lot_id, manufacturing_id, 'DYEING', mfg.input_weight, mfg.expected_output, actual_output, wastageAmount, wastagePercentage, lot.cost_per_unit, wastageCost, notes);
//     }

//     // Create or find DYED_YARN product
//     let dyedProduct = db.prepare('SELECT * FROM products WHERE type = ? AND shade_code = ?').get('DYED_YARN', shade_code);
//     if (!dyedProduct) {
//       const r = db.prepare('INSERT INTO products (name, type, shade_code, unit) VALUES (?,?,?,?)').run(`${lot.product_name} - ${shade_code}`, 'DYED_YARN', shade_code, 'No Of Cones');
//       dyedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(r.lastInsertRowid);
//     }

//     // Update lot: move to FINISHED_STORE with actual output
//     const newCostPerUnit = lot.cost_per_unit > 0 ? (mfg.input_weight * lot.cost_per_unit) / actual_output : 0;
//     db.prepare('UPDATE lots SET status = ?, location = ?, current_quantity = ?, shade_code = ?, cost_per_unit = ?, updated_at = datetime(\'now\') WHERE id = ?')
//       .run('READY_FOR_SALE', 'FINISHED_STORE', actual_output, shade_code, newCostPerUnit, mfg.lot_id);

//     // Update inventory
//     db.prepare('DELETE FROM inventory WHERE lot_id = ?').run(mfg.lot_id);
//     db.prepare('INSERT INTO inventory (product_id, lot_id, location, quantity, unit) VALUES (?,?,?,?,?)')
//       .run(dyedProduct.id, mfg.lot_id, 'FINISHED_STORE', actual_output, 'No Of Cones');

//     // Update manufacturing with output product ref
//     db.prepare('UPDATE manufacturing_processes SET output_product_id = ? WHERE id = ?').run(dyedProduct.id, manufacturing_id);

//     return {
//       manufacturing: db.prepare('SELECT * FROM manufacturing_processes WHERE id = ?').get(manufacturing_id),
//       lot: db.prepare('SELECT * FROM lots WHERE id = ?').get(mfg.lot_id),
//       wastage: wastageAmount > 0 ? { wastageAmount, wastagePercentage: wastagePercentage.toFixed(2), wastageCost } : null
//     };
//   });

//   try {
//     res.json(txn());
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// // POST /api/manufacturing/start-chemical — Start chemical manufacturing
// router.post('/start-chemical', (req, res) => {
//   const db = req.app.locals.db;
//   const { lot_id, input_weight, expected_output, notes } = req.body;
//   if (!lot_id || !input_weight || !expected_output) {
//     return res.status(400).json({ error: 'lot_id, input_weight, expected_output required' });
//   }

//   const txn = db.transaction(() => {
//     const lot = db.prepare('SELECT l.*, p.type as product_type FROM lots l JOIN products p ON l.product_id = p.id WHERE l.id = ?').get(lot_id);
//     if (!lot) throw new Error('Lot not found');
//     if (lot.product_type !== 'CHEMICAL_RAW') throw new Error('Only chemical raw material can be manufactured');
//     if (lot.status !== 'IN_STORE') throw new Error('Lot must be IN_STORE');
//     if (input_weight > lot.current_quantity) throw new Error('Input weight exceeds available quantity');

//     db.prepare('UPDATE lots SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run('CHEMICAL_MANUFACTURING', lot_id);

//     const result = db.prepare(
//       'INSERT INTO manufacturing_processes (lot_id, process_type, status, input_weight, expected_output, notes) VALUES (?,?,?,?,?,?)'
//     ).run(lot_id, 'CHEMICAL_MANUFACTURING', 'IN_PROGRESS', input_weight, expected_output, notes);

//     return db.prepare('SELECT m.*, l.lot_number FROM manufacturing_processes m JOIN lots l ON m.lot_id = l.id WHERE m.id = ?').get(result.lastInsertRowid);
//   });

//   try {
//     res.status(201).json(txn());
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// // POST /api/manufacturing/complete-chemical — Complete chemical manufacturing
// router.post('/complete-chemical', (req, res) => {
//   const db = req.app.locals.db;
//   const { manufacturing_id, actual_output, chemical_code, drum_count, notes } = req.body;
//   if (!manufacturing_id || actual_output === undefined || !chemical_code) {
//     return res.status(400).json({ error: 'manufacturing_id, actual_output, chemical_code required' });
//   }

//   const txn = db.transaction(() => {
//     const mfg = db.prepare('SELECT * FROM manufacturing_processes WHERE id = ? AND status = ?').get(manufacturing_id, 'IN_PROGRESS');
//     if (!mfg) throw new Error('Manufacturing process not found or not in progress');
//     if (mfg.process_type !== 'CHEMICAL_MANUFACTURING') throw new Error('This is not a chemical manufacturing process');

//     const lot = db.prepare('SELECT l.*, p.name as product_name FROM lots l JOIN products p ON l.product_id = p.id WHERE l.id = ?').get(mfg.lot_id);

//     // Calculate wastage
//     let wastageAmount = 0;
//     if (actual_output < mfg.expected_output) {
//       wastageAmount = mfg.expected_output - actual_output;
//     }
//     const wastagePercentage = mfg.input_weight > 0 ? (wastageAmount / mfg.input_weight) * 100 : 0;
//     const wastageCost = wastageAmount * lot.cost_per_unit;

//     db.prepare('UPDATE manufacturing_processes SET status = ?, actual_output = ?, chemical_code = ?, end_date = date(\'now\'), notes = COALESCE(?, notes) WHERE id = ?')
//       .run('COMPLETED', actual_output, chemical_code, notes, manufacturing_id);

//     if (wastageAmount > 0) {
//       db.prepare('INSERT INTO wastage (lot_id, manufacturing_id, process_stage, input_weight, expected_output, actual_output, wastage_amount, wastage_percentage, cost_per_unit, wastage_cost, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
//         .run(mfg.lot_id, manufacturing_id, 'CHEMICAL_MANUFACTURING', mfg.input_weight, mfg.expected_output, actual_output, wastageAmount, wastagePercentage, lot.cost_per_unit, wastageCost, notes);
//     }

//     // Create finished chemical product
//     let finishedProduct = db.prepare('SELECT * FROM products WHERE type = ? AND chemical_code = ?').get('CHEMICAL_FINISHED', chemical_code);
//     if (!finishedProduct) {
//       const r = db.prepare('INSERT INTO products (name, type, chemical_code, unit, description) VALUES (?,?,?,?,?)').run(`Chemical ${chemical_code}`, 'CHEMICAL_FINISHED', chemical_code, 'No Of Cones', `Drums: ${drum_count || 0}`);
//       finishedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(r.lastInsertRowid);
//     }

//     // Create new lot for finished chemical
//     const newLotNumber = generateLotNumber('CHEMICAL_FINISHED');
//     const newCostPerUnit = lot.cost_per_unit > 0 ? (mfg.input_weight * lot.cost_per_unit) / actual_output : 0;
//     const newLotResult = db.prepare(
//       'INSERT INTO lots (lot_number, product_id, status, location, initial_quantity, current_quantity, chemical_code, cost_per_unit) VALUES (?,?,?,?,?,?,?,?)'
//     ).run(newLotNumber, finishedProduct.id, 'READY_FOR_SALE', 'CHEMICAL_STORE', actual_output, actual_output, chemical_code, newCostPerUnit);
//     const newLotId = newLotResult.lastInsertRowid;

//     // Reduce raw material lot
//     const remainingQty = lot.current_quantity - mfg.input_weight;
//     if (remainingQty <= 0) {
//       db.prepare('UPDATE lots SET current_quantity = 0, status = ?, updated_at = datetime(\'now\') WHERE id = ?').run('SOLD', mfg.lot_id);
//       db.prepare('UPDATE inventory SET quantity = 0, updated_at = datetime(\'now\') WHERE lot_id = ?').run(mfg.lot_id);
//     } else {
//       db.prepare('UPDATE lots SET current_quantity = ?, updated_at = datetime(\'now\') WHERE id = ?').run(remainingQty, mfg.lot_id);
//       db.prepare('UPDATE inventory SET quantity = ?, updated_at = datetime(\'now\') WHERE lot_id = ?').run(remainingQty, mfg.lot_id);
//     }

//     // Add finished chemical to inventory
//     db.prepare('INSERT INTO inventory (product_id, lot_id, location, quantity, unit) VALUES (?,?,?,?,?)')
//       .run(finishedProduct.id, newLotId, 'CHEMICAL_STORE', actual_output, 'No Of Cones');

//     db.prepare('UPDATE manufacturing_processes SET output_product_id = ?, output_lot_id = ? WHERE id = ?').run(finishedProduct.id, newLotId, manufacturing_id);

//     return {
//       manufacturing: db.prepare('SELECT * FROM manufacturing_processes WHERE id = ?').get(manufacturing_id),
//       output_lot: db.prepare('SELECT * FROM lots WHERE id = ?').get(newLotId),
//       wastage: wastageAmount > 0 ? { wastageAmount, wastagePercentage: wastagePercentage.toFixed(2), wastageCost } : null
//     };
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
  const { status } = req.query;
  let sql = `SELECT m.*, l.lot_number, p.name as product_name FROM ${T.manufacturing} m
    JOIN ${T.lots} l ON m.lot_id = l.id JOIN ${T.products} p ON l.product_id = p.id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND m.status = ?'; params.push(status); }
  sql += ' ORDER BY m.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const db = req.app.locals.db; const T = req.T;
  const proc = db.prepare(`SELECT m.*, l.lot_number, p.name as product_name, p.type as product_type
    FROM ${T.manufacturing} m JOIN ${T.lots} l ON m.lot_id = l.id
    JOIN ${T.products} p ON l.product_id = p.id WHERE m.id = ?`).get(req.params.id);
  if (!proc) return res.status(404).json({ error: 'Process not found' });
  const wastage = db.prepare(`SELECT * FROM ${T.wastage} WHERE manufacturing_id = ?`).all(proc.id);
  res.json({ ...proc, wastage });
});

// ── YARN: Start Dyeing ────────────────────────────────────────────────────────
router.post('/start-dyeing', (req, res) => {
  if (req.businessMode !== 'YARN')
    return res.status(403).json({ error: 'start-dyeing only available in YARN workspace' });
  const db = req.app.locals.db; const T = req.T;
  const { lot_id, input_weight, expected_output, notes } = req.body;
  if (!lot_id || !input_weight || !expected_output)
    return res.status(400).json({ error: 'lot_id, input_weight, expected_output required' });

  const txn = db.transaction(() => {
    const lot = db.prepare(`SELECT l.*, p.type as product_type FROM ${T.lots} l
      JOIN ${T.products} p ON l.product_id = p.id WHERE l.id = ?`).get(lot_id);
    if (!lot)                           throw new Error('Lot not found');
    if (lot.product_type !== 'RAW_YARN') throw new Error('Only RAW_YARN lots can be sent for dyeing');
    if (lot.status !== 'IN_STORE')       throw new Error('Lot must be IN_STORE to start dyeing');
    if (input_weight > lot.current_quantity) throw new Error('Input weight exceeds available quantity');

    db.prepare(`UPDATE ${T.lots} SET status='DYEING', location='DYEING', updated_at=datetime('now') WHERE id=?`).run(lot_id);
    db.prepare(`UPDATE ${T.inventory} SET location='DYEING', updated_at=datetime('now') WHERE lot_id=? AND location='STORE'`).run(lot_id);

    const r = db.prepare(`INSERT INTO ${T.manufacturing} (lot_id, process_type, status, input_weight, expected_output, notes)
      VALUES (?,?,?,?,?,?)`).run(lot_id, 'DYEING', 'IN_PROGRESS', input_weight, expected_output, notes || null);
    return db.prepare(`SELECT m.*, l.lot_number FROM ${T.manufacturing} m JOIN ${T.lots} l ON m.lot_id=l.id WHERE m.id=?`)
             .get(r.lastInsertRowid);
  });
  try   { res.status(201).json(txn()); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

// ── YARN: Complete Dyeing ─────────────────────────────────────────────────────
router.post('/complete-dyeing', (req, res) => {
  if (req.businessMode !== 'YARN')
    return res.status(403).json({ error: 'complete-dyeing only available in YARN workspace' });
  const db = req.app.locals.db; const T = req.T;
  const { manufacturing_id, actual_output, shade_code, output_product_id, notes } = req.body;
  if (!manufacturing_id || actual_output === undefined)
    return res.status(400).json({ error: 'manufacturing_id and actual_output required' });

  const txn = db.transaction(() => {
    const mfg = db.prepare(`SELECT * FROM ${T.manufacturing} WHERE id=?`).get(manufacturing_id);
    if (!mfg)                        throw new Error('Process not found');
    if (mfg.status !== 'IN_PROGRESS') throw new Error('Process is not IN_PROGRESS');

    const inputLot = db.prepare(`SELECT * FROM ${T.lots} WHERE id=?`).get(mfg.lot_id);
    const wastageAmt = mfg.input_weight - actual_output;
    const wastagePct = (wastageAmt / mfg.input_weight) * 100;
    const outProdId  = output_product_id || inputLot.product_id;
    const outLotNum  = generateNumber(T.lotDyedPrefix);

    const outLot = db.prepare(`INSERT INTO ${T.lots}
      (lot_number, product_id, purchase_id, status, location, initial_quantity, current_quantity, shade_code, cost_per_unit)
      VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(outLotNum, outProdId, inputLot.purchase_id, 'READY_FOR_SALE', 'FINISHED_STORE',
          actual_output, actual_output, shade_code || inputLot.shade_code, inputLot.cost_per_unit);

    db.prepare(`INSERT INTO ${T.inventory} (product_id, lot_id, location, quantity, unit) VALUES (?,?,?,?,?)`)
      .run(outProdId, outLot.lastInsertRowid, 'FINISHED_STORE', actual_output, 'No Of Cones');

    db.prepare(`UPDATE ${T.lots} SET status='FINISHED', current_quantity=0, updated_at=datetime('now') WHERE id=?`).run(mfg.lot_id);
    db.prepare(`UPDATE ${T.inventory} SET quantity=0, updated_at=datetime('now') WHERE lot_id=?`).run(mfg.lot_id);
    db.prepare(`UPDATE ${T.manufacturing} SET status='COMPLETED', actual_output=?, shade_code=?, output_product_id=?, output_lot_id=?, end_date=date('now'), notes=COALESCE(?,notes) WHERE id=?`)
      .run(actual_output, shade_code, outProdId, outLot.lastInsertRowid, notes, manufacturing_id);

    if (wastageAmt > 0) {
      db.prepare(`INSERT INTO ${T.wastage}
        (lot_id, manufacturing_id, process_stage, input_weight, expected_output, actual_output, wastage_amount, wastage_percentage, cost_per_unit, wastage_cost)
        VALUES (?,?,?,?,?,?,?,?,?,?)`
      ).run(mfg.lot_id, manufacturing_id, 'DYEING', mfg.input_weight, mfg.expected_output,
            actual_output, wastageAmt, wastagePct, inputLot.cost_per_unit, wastageAmt * inputLot.cost_per_unit);
    }
    return db.prepare(`SELECT * FROM ${T.manufacturing} WHERE id=?`).get(manufacturing_id);
  });
  try   { res.status(200).json(txn()); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

// ── CHEMICAL: Start ───────────────────────────────────────────────────────────
router.post('/start-chemical', (req, res) => {
  if (req.businessMode !== 'CHEMICAL')
    return res.status(403).json({ error: 'start-chemical only available in CHEMICAL workspace' });
  const db = req.app.locals.db; const T = req.T;
  const { lot_id, input_weight, expected_output, notes } = req.body;
  if (!lot_id || !input_weight || !expected_output)
    return res.status(400).json({ error: 'lot_id, input_weight, expected_output required' });

  const txn = db.transaction(() => {
    const lot = db.prepare(`SELECT l.*, p.type as product_type FROM ${T.lots} l
      JOIN ${T.products} p ON l.product_id=p.id WHERE l.id=?`).get(lot_id);
    if (!lot)                                    throw new Error('Lot not found');
    if (lot.product_type !== 'CHEMICAL_RAW')     throw new Error('Only CHEMICAL_RAW lots can start chemical manufacturing');
    if (lot.status !== 'IN_STORE')               throw new Error('Lot must be IN_STORE');
    if (input_weight > lot.current_quantity)     throw new Error('Input weight exceeds available quantity');

    db.prepare(`UPDATE ${T.lots} SET status='CHEMICAL_MANUFACTURING', updated_at=datetime('now') WHERE id=?`).run(lot_id);

    const r = db.prepare(`INSERT INTO ${T.manufacturing} (lot_id, process_type, status, input_weight, expected_output, notes)
      VALUES (?,?,?,?,?,?)`).run(lot_id, 'CHEMICAL_MANUFACTURING', 'IN_PROGRESS', input_weight, expected_output, notes || null);
    return db.prepare(`SELECT m.*, l.lot_number FROM ${T.manufacturing} m JOIN ${T.lots} l ON m.lot_id=l.id WHERE m.id=?`)
             .get(r.lastInsertRowid);
  });
  try   { res.status(201).json(txn()); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

// ── CHEMICAL: Complete ────────────────────────────────────────────────────────
router.post('/complete-chemical', (req, res) => {
  if (req.businessMode !== 'CHEMICAL')
    return res.status(403).json({ error: 'complete-chemical only available in CHEMICAL workspace' });
  const db = req.app.locals.db; const T = req.T;
  const { manufacturing_id, actual_output, chemical_code, output_product_id, notes } = req.body;
  if (!manufacturing_id || actual_output === undefined)
    return res.status(400).json({ error: 'manufacturing_id and actual_output required' });

  const txn = db.transaction(() => {
    const mfg      = db.prepare(`SELECT * FROM ${T.manufacturing} WHERE id=?`).get(manufacturing_id);
    if (!mfg || mfg.status !== 'IN_PROGRESS') throw new Error('Process not found or not IN_PROGRESS');
    const inputLot = db.prepare(`SELECT * FROM ${T.lots} WHERE id=?`).get(mfg.lot_id);
    const wastageAmt = mfg.input_weight - actual_output;
    const wastagePct = (wastageAmt / mfg.input_weight) * 100;
    const outProdId  = output_product_id || inputLot.product_id;
    const outLotNum  = generateNumber(T.lotDyedPrefix);

    const outLot = db.prepare(`INSERT INTO ${T.lots}
      (lot_number, product_id, purchase_id, status, location, initial_quantity, current_quantity, chemical_code, cost_per_unit)
      VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(outLotNum, outProdId, inputLot.purchase_id, 'READY_FOR_SALE', 'CHEMICAL_STORE',
          actual_output, actual_output, chemical_code || inputLot.chemical_code, inputLot.cost_per_unit);

    db.prepare(`INSERT INTO ${T.inventory} (product_id, lot_id, location, quantity, unit) VALUES (?,?,?,?,?)`)
      .run(outProdId, outLot.lastInsertRowid, 'CHEMICAL_STORE', actual_output, 'KG');

    db.prepare(`UPDATE ${T.lots} SET status='FINISHED', current_quantity=0, updated_at=datetime('now') WHERE id=?`).run(mfg.lot_id);
    db.prepare(`UPDATE ${T.inventory} SET quantity=0, updated_at=datetime('now') WHERE lot_id=?`).run(mfg.lot_id);
    db.prepare(`UPDATE ${T.manufacturing} SET status='COMPLETED', actual_output=?, chemical_code=?, output_product_id=?, output_lot_id=?, end_date=date('now'), notes=COALESCE(?,notes) WHERE id=?`)
      .run(actual_output, chemical_code, outProdId, outLot.lastInsertRowid, notes, manufacturing_id);

    if (wastageAmt > 0) {
      db.prepare(`INSERT INTO ${T.wastage}
        (lot_id, manufacturing_id, process_stage, input_weight, expected_output, actual_output, wastage_amount, wastage_percentage, cost_per_unit, wastage_cost)
        VALUES (?,?,?,?,?,?,?,?,?,?)`
      ).run(mfg.lot_id, manufacturing_id, 'CHEMICAL_MANUFACTURING', mfg.input_weight, mfg.expected_output,
            actual_output, wastageAmt, wastagePct, inputLot.cost_per_unit, wastageAmt * inputLot.cost_per_unit);
    }
    return db.prepare(`SELECT * FROM ${T.manufacturing} WHERE id=?`).get(manufacturing_id);
  });
  try   { res.status(200).json(txn()); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;