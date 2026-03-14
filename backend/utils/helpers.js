// const { v4: uuidv4 } = require('uuid');

// // Generate numeric auto-increment lot number (format: 000000001, 000000002, etc.)
// function generateLotNumber(db, lotsTable = 'yarn_lots') {
//   // Get the max lot number from the database
//   const result = db.prepare(`SELECT MAX(CAST(lot_number AS INTEGER)) as max_lot FROM ${lotsTable} WHERE lot_number GLOB '[0-9]*'`).get();
//   const nextLot = (result?.max_lot || 0) + 1;
//   return String(nextLot).padStart(9, '0');
// }

// function generateNumber(prefix) {
//   const ts = Date.now().toString(36).toUpperCase();
//   const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
//   return `${prefix}-${ts}-${rand}`;
// }

// function paginate(query, params, db, page = 1, limit = 50) {
//   const offset = (page - 1) * limit;
//   const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
//   const total = db.prepare(countQuery).get(...params).total;
//   const data = db.prepare(`${query} LIMIT ? OFFSET ?`).all(...params, limit, offset);
//   return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
// }

// function parseDate(dateStr) {
//   if (!dateStr) return new Date().toISOString().split('T')[0];
//   return dateStr;
// }

// function calcWorkingHours(timeIn, timeOut) {
//   if (!timeIn || !timeOut) return 0;
//   const [hIn, mIn] = timeIn.split(':').map(Number);
//   const [hOut, mOut] = timeOut.split(':').map(Number);
//   return Math.max(0, (hOut + mOut / 60) - (hIn + mIn / 60));
// }

// module.exports = { generateLotNumber, generateNumber, paginate, parseDate, calcWorkingHours };
/**
 * utils/helpers.js
 */

/**
 * Generate next numeric zero-padded lot number from the given lots table.
 * Format: 000000001, 000000002, ...
 * Safe: reads MAX and increments by 1 inside the same transaction.
 */
function generateLotNumber(db, lotsTable) {
  const row = db.prepare(`SELECT MAX(CAST(lot_number AS INTEGER)) AS mx FROM ${lotsTable}`).get();
  const next = ((row && row.mx) ? parseInt(row.mx) : 0) + 1;
  return String(next).padStart(9, '0');
}

/**
 * Generate a document/reference number (PO, SL, GP…).
 * e.g. generateNumber('PO') → 'PO-1716000000000'
 */
function generateNumber(prefix) {
  return `${prefix}-${Date.now()}`;
}

module.exports = { generateLotNumber, generateNumber };