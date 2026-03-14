
// const Database = require('better-sqlite3');
// const path = require('path');
// const bcrypt = require('bcryptjs');

// const DB_PATH = path.join(__dirname, '..', 'data', 'yarnchem.db');

// function initializeDatabase() {
//   const db = new Database(DB_PATH);
//   db.pragma('journal_mode = WAL');
//   db.pragma('foreign_keys = ON');
//   db.pragma('busy_timeout = 5000');

//   // ─────────────────────────────────────────────────────────────
//   // SHARED TABLES  (same data for both workspaces)
//   // ─────────────────────────────────────────────────────────────
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS users (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       username TEXT UNIQUE NOT NULL,
//       password TEXT NOT NULL,
//       full_name TEXT NOT NULL,
//       role TEXT NOT NULL DEFAULT 'admin',
//       is_active INTEGER DEFAULT 1,
//       created_at TEXT DEFAULT (datetime('now'))
//     );

//     CREATE TABLE IF NOT EXISTS product_categories (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT UNIQUE NOT NULL,
//       description TEXT,
//       is_active INTEGER DEFAULT 1,
//       created_at TEXT DEFAULT (datetime('now'))
//     );

//     /* NOTE: suppliers/customers are now workspace-specific (yarn_ and chem_ tables below) */

//     CREATE TABLE IF NOT EXISTS employees (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       employee_code TEXT UNIQUE NOT NULL,
//       name TEXT NOT NULL,
//       phone TEXT,
//       address TEXT,
//       designation TEXT,
//       department TEXT,
//       basic_salary REAL DEFAULT 0,
//       joining_date TEXT,
//       is_active INTEGER DEFAULT 1,
//       created_at TEXT DEFAULT (datetime('now'))
//     );

//     CREATE TABLE IF NOT EXISTS attendance (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       employee_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       time_in TEXT,
//       time_out TEXT,
//       working_hours REAL DEFAULT 0,
//       overtime_hours REAL DEFAULT 0,
//       status TEXT DEFAULT 'PRESENT' CHECK(status IN ('PRESENT','HALF_DAY','ABSENT','LEAVE','OVERTIME')),
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (employee_id) REFERENCES employees(id),
//       UNIQUE(employee_id, date)
//     );

//     CREATE TABLE IF NOT EXISTS loans (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       employee_id INTEGER NOT NULL,
//       amount REAL NOT NULL,
//       monthly_deduction REAL NOT NULL,
//       total_paid REAL DEFAULT 0,
//       remaining REAL NOT NULL,
//       status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','COMPLETED','CANCELLED')),
//       date TEXT DEFAULT (date('now')),
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (employee_id) REFERENCES employees(id)
//     );

//     CREATE TABLE IF NOT EXISTS payroll (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       employee_id INTEGER NOT NULL,
//       month TEXT NOT NULL,
//       year INTEGER NOT NULL,
//       basic_salary REAL DEFAULT 0,
//       working_days INTEGER DEFAULT 0,
//       present_days INTEGER DEFAULT 0,
//       absent_days INTEGER DEFAULT 0,
//       half_days INTEGER DEFAULT 0,
//       overtime_hours REAL DEFAULT 0,
//       overtime_amount REAL DEFAULT 0,
//       absent_deduction REAL DEFAULT 0,
//       loan_deduction REAL DEFAULT 0,
//       other_deductions REAL DEFAULT 0,
//       other_additions REAL DEFAULT 0,
//       net_salary REAL DEFAULT 0,
//       status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','CONFIRMED','PAID')),
//       paid_date TEXT,
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (employee_id) REFERENCES employees(id),
//       UNIQUE(employee_id, month, year)
//     );

//     CREATE TABLE IF NOT EXISTS expenses (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       category TEXT NOT NULL,
//       description TEXT,
//       amount REAL NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       reference TEXT,
//       created_at TEXT DEFAULT (datetime('now'))
//     );

//     CREATE TABLE IF NOT EXISTS settings (
//       key TEXT PRIMARY KEY,
//       value TEXT NOT NULL
//     );

//     CREATE TABLE IF NOT EXISTS audit_logs (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       timestamp TEXT NOT NULL DEFAULT (datetime('now')),
//       user_id INTEGER,
//       username TEXT,
//       action TEXT NOT NULL,
//       module TEXT NOT NULL,
//       entity_type TEXT,
//       entity_id INTEGER,
//       description TEXT NOT NULL,
//       details TEXT,
//       ip_address TEXT,
//       created_at TEXT NOT NULL DEFAULT (datetime('now'))
//     );
//   `);

//   db.exec(`
//     CREATE TRIGGER IF NOT EXISTS prevent_audit_delete
//     BEFORE DELETE ON audit_logs
//     BEGIN SELECT RAISE(ABORT, 'AUDIT LOGS CANNOT BE DELETED'); END;
//   `);
//   db.exec(`
//     CREATE TRIGGER IF NOT EXISTS prevent_audit_update
//     BEFORE UPDATE ON audit_logs
//     BEGIN SELECT RAISE(ABORT, 'AUDIT LOGS CANNOT BE MODIFIED'); END;
//   `);

//   // ─────────────────────────────────────────────────────────────
//   // YARN WORKSPACE TABLES  (RAW_YARN, DYED_YARN only)
//   // Prefix: yarn_
//   // Locations: STORE, DYEING, FINISHED_STORE
//   // ─────────────────────────────────────────────────────────────
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS yarn_products (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT NOT NULL,
//       category_id INTEGER NOT NULL,
//       type TEXT NOT NULL CHECK(type IN ('RAW_YARN','DYED_YARN')),
//       unit TEXT DEFAULT 'No Of Cones',
//       conversion_factor REAL DEFAULT 1.0,
//       min_stock_level REAL DEFAULT 0,
//       shade_code TEXT,
//       description TEXT,
//       is_active INTEGER DEFAULT 1,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (category_id) REFERENCES product_categories(id)
//     );

//     CREATE TABLE IF NOT EXISTS yarn_lots (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       lot_number TEXT UNIQUE NOT NULL,
//       product_id INTEGER NOT NULL,
//       purchase_id INTEGER,
//       status TEXT DEFAULT 'IN_STORE' CHECK(status IN ('IN_STORE','DYEING','FINISHED','READY_FOR_SALE','SOLD','PARTIALLY_SOLD')),
//       location TEXT DEFAULT 'STORE' CHECK(location IN ('STORE','DYEING','FINISHED_STORE')),
//       initial_quantity REAL NOT NULL,
//       current_quantity REAL NOT NULL,
//       shade_code TEXT,
//       cost_per_unit REAL DEFAULT 0,
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       updated_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (product_id) REFERENCES yarn_products(id)
//     );

//     CREATE TABLE IF NOT EXISTS yarn_inventory (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       product_id INTEGER NOT NULL,
//       lot_id INTEGER NOT NULL,
//       location TEXT NOT NULL CHECK(location IN ('STORE','DYEING','FINISHED_STORE')),
//       quantity REAL NOT NULL DEFAULT 0,
//       unit TEXT DEFAULT 'No Of Cones',
//       updated_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (product_id) REFERENCES yarn_products(id),
//       FOREIGN KEY (lot_id) REFERENCES yarn_lots(id)
//     );

//     CREATE TABLE IF NOT EXISTS yarn_purchases (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       purchase_number TEXT UNIQUE NOT NULL,
//       supplier_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       total_amount REAL DEFAULT 0,
//       paid_amount REAL DEFAULT 0,
//       status TEXT DEFAULT 'RECEIVED' CHECK(status IN ('PENDING','RECEIVED','CANCELLED')),
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
//     );

//     CREATE TABLE IF NOT EXISTS yarn_purchase_items (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       purchase_id INTEGER NOT NULL,
//       product_id INTEGER NOT NULL,
//       lot_id INTEGER,
//       quantity REAL NOT NULL,
//       rate REAL NOT NULL,
//       amount REAL NOT NULL,
//       FOREIGN KEY (purchase_id) REFERENCES yarn_purchases(id),
//       FOREIGN KEY (product_id) REFERENCES yarn_products(id),
//       FOREIGN KEY (lot_id) REFERENCES yarn_lots(id)
//     );

//     CREATE TABLE IF NOT EXISTS yarn_sales (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       sale_number TEXT UNIQUE NOT NULL,
//       customer_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       total_amount REAL DEFAULT 0,
//       discount_percentage REAL DEFAULT 0,
//       discount_amount REAL DEFAULT 0,
//       net_amount REAL DEFAULT 0,
//       paid_amount REAL DEFAULT 0,
//       status TEXT DEFAULT 'CONFIRMED' CHECK(status IN ('DRAFT','CONFIRMED','DISPATCHED','CANCELLED')),
//       gate_pass_id INTEGER,
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (customer_id) REFERENCES customers(id)
//     );

//     CREATE TABLE IF NOT EXISTS yarn_sale_items (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       sale_id INTEGER NOT NULL,
//       product_id INTEGER NOT NULL,
//       lot_id INTEGER NOT NULL,
//       quantity REAL NOT NULL,
//       rate REAL NOT NULL,
//       amount REAL NOT NULL,
//       target_price REAL,
//       FOREIGN KEY (sale_id) REFERENCES yarn_sales(id),
//       FOREIGN KEY (product_id) REFERENCES yarn_products(id),
//       FOREIGN KEY (lot_id) REFERENCES yarn_lots(id)
//     );

//     CREATE TABLE IF NOT EXISTS yarn_gate_passes (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       gate_pass_number TEXT UNIQUE NOT NULL,
//       sale_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       lot_ids TEXT NOT NULL,
//       total_quantity REAL NOT NULL,
//       verified_by TEXT,
//       vehicle_number TEXT,
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (sale_id) REFERENCES yarn_sales(id)
//     );

//     CREATE TABLE IF NOT EXISTS yarn_manufacturing (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       lot_id INTEGER NOT NULL,
//       process_type TEXT NOT NULL DEFAULT 'DYEING' CHECK(process_type IN ('DYEING')),
//       status TEXT DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS','COMPLETED','CANCELLED')),
//       input_weight REAL NOT NULL,
//       expected_output REAL NOT NULL,
//       actual_output REAL,
//       shade_code TEXT,
//       output_product_id INTEGER,
//       output_lot_id INTEGER,
//       start_date TEXT DEFAULT (date('now')),
//       end_date TEXT,
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (lot_id) REFERENCES yarn_lots(id),
//       FOREIGN KEY (output_product_id) REFERENCES yarn_products(id)
//     );

//     CREATE TABLE IF NOT EXISTS yarn_wastage (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       lot_id INTEGER NOT NULL,
//       manufacturing_id INTEGER NOT NULL,
//       process_stage TEXT NOT NULL DEFAULT 'DYEING' CHECK(process_stage IN ('DYEING')),
//       input_weight REAL NOT NULL,
//       expected_output REAL NOT NULL,
//       actual_output REAL NOT NULL,
//       wastage_amount REAL NOT NULL,
//       wastage_percentage REAL NOT NULL,
//       cost_per_unit REAL DEFAULT 0,
//       wastage_cost REAL DEFAULT 0,
//       date TEXT DEFAULT (date('now')),
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (lot_id) REFERENCES yarn_lots(id),
//       FOREIGN KEY (manufacturing_id) REFERENCES yarn_manufacturing(id)
//     );

//     CREATE TABLE IF NOT EXISTS yarn_purchase_returns (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       return_number TEXT UNIQUE NOT NULL,
//       purchase_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       reason TEXT NOT NULL,
//       notes TEXT,
//       total_amount REAL DEFAULT 0,
//       status TEXT DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED','CANCELLED')),
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (purchase_id) REFERENCES yarn_purchases(id)
//     );

//     CREATE TABLE IF NOT EXISTS yarn_purchase_return_items (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       return_id INTEGER NOT NULL,
//       lot_id INTEGER NOT NULL,
//       product_id INTEGER NOT NULL,
//       quantity REAL NOT NULL,
//       rate REAL NOT NULL,
//       amount REAL NOT NULL,
//       FOREIGN KEY (return_id) REFERENCES yarn_purchase_returns(id),
//       FOREIGN KEY (lot_id) REFERENCES yarn_lots(id),
//       FOREIGN KEY (product_id) REFERENCES yarn_products(id)
//     );

//     CREATE TABLE IF NOT EXISTS yarn_sale_returns (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       return_number TEXT UNIQUE NOT NULL,
//       sale_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       reason TEXT NOT NULL,
//       notes TEXT,
//       restock_location TEXT DEFAULT 'FINISHED_STORE' CHECK(restock_location IN ('STORE','FINISHED_STORE')),
//       total_amount REAL DEFAULT 0,
//       status TEXT DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED','CANCELLED')),
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (sale_id) REFERENCES yarn_sales(id)
//     );

//     CREATE TABLE IF NOT EXISTS yarn_sale_return_items (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       return_id INTEGER NOT NULL,
//       lot_id INTEGER NOT NULL,
//       product_id INTEGER NOT NULL,
//       quantity REAL NOT NULL,
//       rate REAL NOT NULL,
//       amount REAL NOT NULL,
//       restock_location TEXT DEFAULT 'FINISHED_STORE',
//       FOREIGN KEY (return_id) REFERENCES yarn_sale_returns(id),
//       FOREIGN KEY (lot_id) REFERENCES yarn_lots(id),
//       FOREIGN KEY (product_id) REFERENCES yarn_products(id)
//     );

//     CREATE TABLE IF NOT EXISTS yarn_suppliers (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT NOT NULL,
//       phone TEXT,
//       address TEXT,
//       credit_terms TEXT,
//       opening_balance REAL DEFAULT 0,
//       current_balance REAL DEFAULT 0,
//       is_active INTEGER DEFAULT 1,
//       created_at TEXT DEFAULT (datetime('now'))
//     );

//     CREATE TABLE IF NOT EXISTS yarn_supplier_ledger (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       supplier_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       type TEXT NOT NULL CHECK(type IN ('PURCHASE','PAYMENT','OPENING','ADJUSTMENT')),
//       reference_id INTEGER,
//       description TEXT,
//       debit REAL DEFAULT 0,
//       credit REAL DEFAULT 0,
//       balance REAL DEFAULT 0,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (supplier_id) REFERENCES yarn_suppliers(id)
//     );

//     CREATE TABLE IF NOT EXISTS yarn_customers (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT NOT NULL,
//       phone TEXT,
//       address TEXT,
//       credit_limit REAL DEFAULT 0,
//       opening_balance REAL DEFAULT 0,
//       current_balance REAL DEFAULT 0,
//       is_active INTEGER DEFAULT 1,
//       created_at TEXT DEFAULT (datetime('now'))
//     );

//     CREATE TABLE IF NOT EXISTS yarn_customer_ledger (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       customer_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       type TEXT NOT NULL CHECK(type IN ('SALE','PAYMENT','OPENING','ADJUSTMENT')),
//       reference_id INTEGER,
//       description TEXT,
//       debit REAL DEFAULT 0,
//       credit REAL DEFAULT 0,
//       balance REAL DEFAULT 0,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (customer_id) REFERENCES yarn_customers(id)
//     );
//   `);

//   // ─────────────────────────────────────────────────────────────
//   // CHEMICAL WORKSPACE TABLES  (CHEMICAL_RAW, CHEMICAL_FINISHED)
//   // Prefix: chem_
//   // Locations: CHEMICAL_STORE
//   // Note: category_id is optional for chemicals (NULL allowed)
//   // ─────────────────────────────────────────────────────────────
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS chem_products (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT NOT NULL,
//       category_id INTEGER,
//       type TEXT NOT NULL CHECK(type IN ('CHEMICAL_RAW','CHEMICAL_FINISHED')),
//       unit TEXT DEFAULT 'KG',
//       conversion_factor REAL DEFAULT 1.0,
//       min_stock_level REAL DEFAULT 0,
//       chemical_code TEXT,
//       description TEXT,
//       is_active INTEGER DEFAULT 1,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (category_id) REFERENCES product_categories(id)
//     );

//     CREATE TABLE IF NOT EXISTS chem_lots (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       lot_number TEXT UNIQUE NOT NULL,
//       product_id INTEGER NOT NULL,
//       purchase_id INTEGER,
//       status TEXT DEFAULT 'IN_STORE' CHECK(status IN ('IN_STORE','CHEMICAL_MANUFACTURING','READY_FOR_SALE','SOLD','PARTIALLY_SOLD')),
//       location TEXT DEFAULT 'CHEMICAL_STORE' CHECK(location IN ('CHEMICAL_STORE')),
//       initial_quantity REAL NOT NULL,
//       current_quantity REAL NOT NULL,
//       chemical_code TEXT,
//       cost_per_unit REAL DEFAULT 0,
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       updated_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (product_id) REFERENCES chem_products(id)
//     );

//     CREATE TABLE IF NOT EXISTS chem_inventory (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       product_id INTEGER NOT NULL,
//       lot_id INTEGER NOT NULL,
//       location TEXT NOT NULL DEFAULT 'CHEMICAL_STORE',
//       quantity REAL NOT NULL DEFAULT 0,
//       unit TEXT DEFAULT 'KG',
//       updated_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (product_id) REFERENCES chem_products(id),
//       FOREIGN KEY (lot_id) REFERENCES chem_lots(id)
//     );

//     CREATE TABLE IF NOT EXISTS chem_purchases (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       purchase_number TEXT UNIQUE NOT NULL,
//       supplier_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       total_amount REAL DEFAULT 0,
//       paid_amount REAL DEFAULT 0,
//       status TEXT DEFAULT 'RECEIVED' CHECK(status IN ('PENDING','RECEIVED','CANCELLED')),
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
//     );

//     CREATE TABLE IF NOT EXISTS chem_purchase_items (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       purchase_id INTEGER NOT NULL,
//       product_id INTEGER NOT NULL,
//       lot_id INTEGER,
//       quantity REAL NOT NULL,
//       rate REAL NOT NULL,
//       amount REAL NOT NULL,
//       FOREIGN KEY (purchase_id) REFERENCES chem_purchases(id),
//       FOREIGN KEY (product_id) REFERENCES chem_products(id),
//       FOREIGN KEY (lot_id) REFERENCES chem_lots(id)
//     );

//     CREATE TABLE IF NOT EXISTS chem_sales (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       sale_number TEXT UNIQUE NOT NULL,
//       customer_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       total_amount REAL DEFAULT 0,
//       discount_percentage REAL DEFAULT 0,
//       discount_amount REAL DEFAULT 0,
//       net_amount REAL DEFAULT 0,
//       paid_amount REAL DEFAULT 0,
//       status TEXT DEFAULT 'CONFIRMED' CHECK(status IN ('DRAFT','CONFIRMED','DISPATCHED','CANCELLED')),
//       gate_pass_id INTEGER,
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (customer_id) REFERENCES customers(id)
//     );

//     CREATE TABLE IF NOT EXISTS chem_sale_items (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       sale_id INTEGER NOT NULL,
//       product_id INTEGER NOT NULL,
//       lot_id INTEGER NOT NULL,
//       quantity REAL NOT NULL,
//       rate REAL NOT NULL,
//       amount REAL NOT NULL,
//       target_price REAL,
//       FOREIGN KEY (sale_id) REFERENCES chem_sales(id),
//       FOREIGN KEY (product_id) REFERENCES chem_products(id),
//       FOREIGN KEY (lot_id) REFERENCES chem_lots(id)
//     );

//     CREATE TABLE IF NOT EXISTS chem_gate_passes (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       gate_pass_number TEXT UNIQUE NOT NULL,
//       sale_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       lot_ids TEXT NOT NULL,
//       total_quantity REAL NOT NULL,
//       verified_by TEXT,
//       vehicle_number TEXT,
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (sale_id) REFERENCES chem_sales(id)
//     );

//     CREATE TABLE IF NOT EXISTS chem_manufacturing (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       lot_id INTEGER NOT NULL,
//       process_type TEXT NOT NULL DEFAULT 'CHEMICAL_MANUFACTURING',
//       status TEXT DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS','COMPLETED','CANCELLED')),
//       input_weight REAL NOT NULL,
//       expected_output REAL NOT NULL,
//       actual_output REAL,
//       chemical_code TEXT,
//       output_product_id INTEGER,
//       output_lot_id INTEGER,
//       start_date TEXT DEFAULT (date('now')),
//       end_date TEXT,
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (lot_id) REFERENCES chem_lots(id),
//       FOREIGN KEY (output_product_id) REFERENCES chem_products(id)
//     );

//     CREATE TABLE IF NOT EXISTS chem_wastage (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       lot_id INTEGER NOT NULL,
//       manufacturing_id INTEGER NOT NULL,
//       process_stage TEXT NOT NULL DEFAULT 'CHEMICAL_MANUFACTURING',
//       input_weight REAL NOT NULL,
//       expected_output REAL NOT NULL,
//       actual_output REAL NOT NULL,
//       wastage_amount REAL NOT NULL,
//       wastage_percentage REAL NOT NULL,
//       cost_per_unit REAL DEFAULT 0,
//       wastage_cost REAL DEFAULT 0,
//       date TEXT DEFAULT (date('now')),
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (lot_id) REFERENCES chem_lots(id),
//       FOREIGN KEY (manufacturing_id) REFERENCES chem_manufacturing(id)
//     );

//     CREATE TABLE IF NOT EXISTS chem_purchase_returns (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       return_number TEXT UNIQUE NOT NULL,
//       purchase_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       reason TEXT NOT NULL,
//       notes TEXT,
//       total_amount REAL DEFAULT 0,
//       status TEXT DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED','CANCELLED')),
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (purchase_id) REFERENCES chem_purchases(id)
//     );

//     CREATE TABLE IF NOT EXISTS chem_purchase_return_items (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       return_id INTEGER NOT NULL,
//       lot_id INTEGER NOT NULL,
//       product_id INTEGER NOT NULL,
//       quantity REAL NOT NULL,
//       rate REAL NOT NULL,
//       amount REAL NOT NULL,
//       FOREIGN KEY (return_id) REFERENCES chem_purchase_returns(id),
//       FOREIGN KEY (lot_id) REFERENCES chem_lots(id),
//       FOREIGN KEY (product_id) REFERENCES chem_products(id)
//     );

//     CREATE TABLE IF NOT EXISTS chem_sale_returns (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       return_number TEXT UNIQUE NOT NULL,
//       sale_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       reason TEXT NOT NULL,
//       notes TEXT,
//       restock_location TEXT DEFAULT 'CHEMICAL_STORE',
//       total_amount REAL DEFAULT 0,
//       status TEXT DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED','CANCELLED')),
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (sale_id) REFERENCES chem_sales(id)
//     );

//     CREATE TABLE IF NOT EXISTS chem_sale_return_items (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       return_id INTEGER NOT NULL,
//       lot_id INTEGER NOT NULL,
//       product_id INTEGER NOT NULL,
//       quantity REAL NOT NULL,
//       rate REAL NOT NULL,
//       amount REAL NOT NULL,
//       restock_location TEXT DEFAULT 'CHEMICAL_STORE',
//       FOREIGN KEY (return_id) REFERENCES chem_sale_returns(id),
//       FOREIGN KEY (lot_id) REFERENCES chem_lots(id),
//       FOREIGN KEY (product_id) REFERENCES chem_products(id)
//     );

//     CREATE TABLE IF NOT EXISTS chem_suppliers (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT NOT NULL,
//       phone TEXT,
//       address TEXT,
//       credit_terms TEXT,
//       opening_balance REAL DEFAULT 0,
//       current_balance REAL DEFAULT 0,
//       is_active INTEGER DEFAULT 1,
//       created_at TEXT DEFAULT (datetime('now'))
//     );

//     CREATE TABLE IF NOT EXISTS chem_supplier_ledger (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       supplier_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       type TEXT NOT NULL CHECK(type IN ('PURCHASE','PAYMENT','OPENING','ADJUSTMENT')),
//       reference_id INTEGER,
//       description TEXT,
//       debit REAL DEFAULT 0,
//       credit REAL DEFAULT 0,
//       balance REAL DEFAULT 0,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (supplier_id) REFERENCES chem_suppliers(id)
//     );

//     CREATE TABLE IF NOT EXISTS chem_customers (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT NOT NULL,
//       phone TEXT,
//       address TEXT,
//       credit_limit REAL DEFAULT 0,
//       opening_balance REAL DEFAULT 0,
//       current_balance REAL DEFAULT 0,
//       is_active INTEGER DEFAULT 1,
//       created_at TEXT DEFAULT (datetime('now'))
//     );

//     CREATE TABLE IF NOT EXISTS chem_customer_ledger (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       customer_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       type TEXT NOT NULL CHECK(type IN ('SALE','PAYMENT','OPENING','ADJUSTMENT')),
//       reference_id INTEGER,
//       description TEXT,
//       debit REAL DEFAULT 0,
//       credit REAL DEFAULT 0,
//       balance REAL DEFAULT 0,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (customer_id) REFERENCES chem_customers(id)
//     );
//   `);

//   // ─────────────────────────────────────────────────────────────
//   // Default data
//   // ─────────────────────────────────────────────────────────────
//   const s = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
//   s.run('company_name', 'GH & Sons Enterprises');
//   s.run('half_day_threshold', '4');
//   s.run('full_day_threshold', '8');
//   s.run('standard_hours', '8');
//   s.run('overtime_rate_multiplier', '1.5');

//   const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
//   if (!existing) {
//     const hash = bcrypt.hashSync('admin123', 10);
//     db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?,?,?,?)')
//       .run('admin', hash, 'System Administrator', 'admin');
//   }

//   console.log('✅  Database ready — yarn_ and chem_ tables are fully separate');
//   return db;
// }

// module.exports = { initializeDatabase, DB_PATH };
// const Database = require('better-sqlite3');
// const path = require('path');
// const bcrypt = require('bcryptjs');

// const DB_PATH = path.join(__dirname, '..', 'data', 'yarnchem.db');

// function initializeDatabase() {
//   const db = new Database(DB_PATH);
//   db.pragma('journal_mode = WAL');
//   db.pragma('foreign_keys = ON');
//   db.pragma('busy_timeout = 5000');

//   // Users
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS users (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       username TEXT UNIQUE NOT NULL,
//       password TEXT NOT NULL,
//       full_name TEXT NOT NULL,
//       role TEXT NOT NULL DEFAULT 'admin',
//       is_active INTEGER DEFAULT 1,
//       created_at TEXT DEFAULT (datetime('now'))
//     );
//   `);
// // Product Categories
// db.exec(`
//   CREATE TABLE IF NOT EXISTS product_categories (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     name TEXT UNIQUE NOT NULL,
//     description TEXT,
//     is_active INTEGER DEFAULT 1,
//     created_at TEXT DEFAULT (datetime('now'))
//   );
// `);
//   // Products
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS products (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT NOT NULL,
//       category_id INTEGER NOT NULL,
//       type TEXT NOT NULL CHECK(type IN ('RAW_YARN','DYED_YARN','CHEMICAL_RAW','CHEMICAL_FINISHED')),
//       unit TEXT DEFAULT 'KG',
//       conversion_factor REAL DEFAULT 1.0,
//       min_stock_level REAL DEFAULT 0,
//       shade_code TEXT,
//       chemical_code TEXT,
//       description TEXT,
//       is_active INTEGER DEFAULT 1,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (category_id) REFERENCES product_categories(id)
//     );
//   `);

//   // Lots
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS lots (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       lot_number TEXT UNIQUE NOT NULL,
//       product_id INTEGER NOT NULL,
//       purchase_id INTEGER,
//       status TEXT DEFAULT 'IN_STORE' CHECK(status IN ('IN_STORE','DYEING','FINISHED','CHEMICAL_MANUFACTURING','READY_FOR_SALE','SOLD','PARTIALLY_SOLD')),
//       location TEXT DEFAULT 'STORE' CHECK(location IN ('STORE','DYEING','FINISHED_STORE','CHEMICAL_STORE')),
//       initial_quantity REAL NOT NULL,
//       current_quantity REAL NOT NULL,
//       shade_code TEXT,
//       chemical_code TEXT,
//       cost_per_unit REAL DEFAULT 0,
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       updated_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (product_id) REFERENCES products(id)
//     );
//   `);

//   // Inventory
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS inventory (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       product_id INTEGER NOT NULL,
//       lot_id INTEGER NOT NULL,
//       location TEXT NOT NULL CHECK(location IN ('STORE','DYEING','FINISHED_STORE','CHEMICAL_STORE')),
//       quantity REAL NOT NULL DEFAULT 0,
//       unit TEXT DEFAULT 'KG',
//       updated_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (product_id) REFERENCES products(id),
//       FOREIGN KEY (lot_id) REFERENCES lots(id)
//     );
//   `);

//   // Suppliers
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS suppliers (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT NOT NULL,
//       phone TEXT,
//       address TEXT,
//       credit_terms TEXT,
//       opening_balance REAL DEFAULT 0,
//       current_balance REAL DEFAULT 0,
//       is_active INTEGER DEFAULT 1,
//       created_at TEXT DEFAULT (datetime('now'))
//     );
//   `);

//   // Supplier Ledger
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS supplier_ledger (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       supplier_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       type TEXT NOT NULL CHECK(type IN ('PURCHASE','PAYMENT','OPENING','ADJUSTMENT')),
//       reference_id INTEGER,
//       description TEXT,
//       debit REAL DEFAULT 0,
//       credit REAL DEFAULT 0,
//       balance REAL DEFAULT 0,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
//     );
//   `);

//   // Customers
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS customers (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT NOT NULL,
//       phone TEXT,
//       address TEXT,
//       credit_limit REAL DEFAULT 0,
//       opening_balance REAL DEFAULT 0,
//       current_balance REAL DEFAULT 0,
//       is_active INTEGER DEFAULT 1,
//       created_at TEXT DEFAULT (datetime('now'))
//     );
//   `);

//   // Customer Ledger
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS customer_ledger (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       customer_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       type TEXT NOT NULL CHECK(type IN ('SALE','PAYMENT','OPENING','ADJUSTMENT')),
//       reference_id INTEGER,
//       description TEXT,
//       debit REAL DEFAULT 0,
//       credit REAL DEFAULT 0,
//       balance REAL DEFAULT 0,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (customer_id) REFERENCES customers(id)
//     );
//   `);

//   // Purchases
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS purchases (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       purchase_number TEXT UNIQUE NOT NULL,
//       supplier_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       total_amount REAL DEFAULT 0,
//       paid_amount REAL DEFAULT 0,
//       status TEXT DEFAULT 'RECEIVED' CHECK(status IN ('PENDING','RECEIVED','CANCELLED')),
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
//     );
//   `);

//   // Purchase Items
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS purchase_items (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       purchase_id INTEGER NOT NULL,
//       product_id INTEGER NOT NULL,
//       lot_id INTEGER,
//       quantity REAL NOT NULL,
//       rate REAL NOT NULL,
//       amount REAL NOT NULL,
//       FOREIGN KEY (purchase_id) REFERENCES purchases(id),
//       FOREIGN KEY (product_id) REFERENCES products(id),
//       FOREIGN KEY (lot_id) REFERENCES lots(id)
//     );
//   `);

//   // Manufacturing Processes
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS manufacturing_processes (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       lot_id INTEGER NOT NULL,
//       process_type TEXT NOT NULL CHECK(process_type IN ('DYEING','CHEMICAL_MANUFACTURING')),
//       status TEXT DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS','COMPLETED','CANCELLED')),
//       input_weight REAL NOT NULL,
//       expected_output REAL NOT NULL,
//       actual_output REAL,
//       shade_code TEXT,
//       chemical_code TEXT,
//       output_product_id INTEGER,
//       output_lot_id INTEGER,
//       start_date TEXT DEFAULT (date('now')),
//       end_date TEXT,
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (lot_id) REFERENCES lots(id),
//       FOREIGN KEY (output_product_id) REFERENCES products(id)
//     );
//   `);

//   // Wastage
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS wastage (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       lot_id INTEGER NOT NULL,
//       manufacturing_id INTEGER NOT NULL,
//       process_stage TEXT NOT NULL CHECK(process_stage IN ('DYEING','CHEMICAL_MANUFACTURING')),
//       input_weight REAL NOT NULL,
//       expected_output REAL NOT NULL,
//       actual_output REAL NOT NULL,
//       wastage_amount REAL NOT NULL,
//       wastage_percentage REAL NOT NULL,
//       cost_per_unit REAL DEFAULT 0,
//       wastage_cost REAL DEFAULT 0,
//       date TEXT DEFAULT (date('now')),
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (lot_id) REFERENCES lots(id),
//       FOREIGN KEY (manufacturing_id) REFERENCES manufacturing_processes(id)
//     );
//   `);

//   // Sales
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS sales (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       sale_number TEXT UNIQUE NOT NULL,
//       customer_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       total_amount REAL DEFAULT 0,
//       discount_percentage REAL DEFAULT 0,
//       discount_amount REAL DEFAULT 0,
//       net_amount REAL DEFAULT 0,
//       paid_amount REAL DEFAULT 0,
//       status TEXT DEFAULT 'CONFIRMED' CHECK(status IN ('DRAFT','CONFIRMED','DISPATCHED','CANCELLED')),
//       gate_pass_id INTEGER,
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (customer_id) REFERENCES customers(id)
//     );
//   `);

//   // Sale Items
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS sale_items (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       sale_id INTEGER NOT NULL,
//       product_id INTEGER NOT NULL,
//       lot_id INTEGER NOT NULL,
//       quantity REAL NOT NULL,
//       rate REAL NOT NULL,
//       amount REAL NOT NULL,
//       target_price REAL,
//       FOREIGN KEY (sale_id) REFERENCES sales(id),
//       FOREIGN KEY (product_id) REFERENCES products(id),
//       FOREIGN KEY (lot_id) REFERENCES lots(id)
//     );
//   `);

//   // Gate Passes
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS gate_passes (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       gate_pass_number TEXT UNIQUE NOT NULL,
//       sale_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       lot_ids TEXT NOT NULL,
//       total_quantity REAL NOT NULL,
//       verified_by TEXT,
//       vehicle_number TEXT,
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (sale_id) REFERENCES sales(id)
//     );
//   `);

//   // Employees
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS employees (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       employee_code TEXT UNIQUE NOT NULL,
//       name TEXT NOT NULL,
//       phone TEXT,
//       address TEXT,
//       designation TEXT,
//       department TEXT,
//       basic_salary REAL DEFAULT 0,
//       joining_date TEXT,
//       is_active INTEGER DEFAULT 1,
//       created_at TEXT DEFAULT (datetime('now'))
//     );
//   `);

//   // Attendance
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS attendance (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       employee_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       time_in TEXT,
//       time_out TEXT,
//       working_hours REAL DEFAULT 0,
//       overtime_hours REAL DEFAULT 0,
//       status TEXT DEFAULT 'PRESENT' CHECK(status IN ('PRESENT','HALF_DAY','ABSENT','LEAVE','OVERTIME')),
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (employee_id) REFERENCES employees(id),
//       UNIQUE(employee_id, date)
//     );
//   `);

//   // Loans
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS loans (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       employee_id INTEGER NOT NULL,
//       amount REAL NOT NULL,
//       monthly_deduction REAL NOT NULL,
//       total_paid REAL DEFAULT 0,
//       remaining REAL NOT NULL,
//       status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','COMPLETED','CANCELLED')),
//       date TEXT DEFAULT (date('now')),
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (employee_id) REFERENCES employees(id)
//     );
//   `);

//   // Payroll
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS payroll (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       employee_id INTEGER NOT NULL,
//       month TEXT NOT NULL,
//       year INTEGER NOT NULL,
//       basic_salary REAL DEFAULT 0,
//       working_days INTEGER DEFAULT 0,
//       present_days INTEGER DEFAULT 0,
//       absent_days INTEGER DEFAULT 0,
//       half_days INTEGER DEFAULT 0,
//       overtime_hours REAL DEFAULT 0,
//       overtime_amount REAL DEFAULT 0,
//       absent_deduction REAL DEFAULT 0,
//       loan_deduction REAL DEFAULT 0,
//       other_deductions REAL DEFAULT 0,
//       other_additions REAL DEFAULT 0,
//       net_salary REAL DEFAULT 0,
//       status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','CONFIRMED','PAID')),
//       paid_date TEXT,
//       notes TEXT,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (employee_id) REFERENCES employees(id),
//       UNIQUE(employee_id, month, year)
//     );
//   `);

//   // Expenses
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS expenses (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       category TEXT NOT NULL,
//       description TEXT,
//       amount REAL NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       reference TEXT,
//       created_at TEXT DEFAULT (datetime('now'))
//     );
//   `);

//   // Purchase Returns
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS purchase_returns (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       return_number TEXT UNIQUE NOT NULL,
//       purchase_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       reason TEXT NOT NULL,
//       notes TEXT,
//       total_amount REAL DEFAULT 0,
//       status TEXT DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED','CANCELLED')),
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (purchase_id) REFERENCES purchases(id)
//     );
//   `);

//   db.exec(`
//     CREATE TABLE IF NOT EXISTS purchase_return_items (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       return_id INTEGER NOT NULL,
//       lot_id INTEGER NOT NULL,
//       product_id INTEGER NOT NULL,
//       quantity REAL NOT NULL,
//       rate REAL NOT NULL,
//       amount REAL NOT NULL,
//       FOREIGN KEY (return_id) REFERENCES purchase_returns(id),
//       FOREIGN KEY (lot_id) REFERENCES lots(id),
//       FOREIGN KEY (product_id) REFERENCES products(id)
//     );
//   `);

//   // Sale Returns
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS sale_returns (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       return_number TEXT UNIQUE NOT NULL,
//       sale_id INTEGER NOT NULL,
//       date TEXT NOT NULL DEFAULT (date('now')),
//       reason TEXT NOT NULL,
//       notes TEXT,
//       restock_location TEXT DEFAULT 'FINISHED_STORE' CHECK(restock_location IN ('STORE','FINISHED_STORE','CHEMICAL_STORE')),
//       total_amount REAL DEFAULT 0,
//       status TEXT DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED','CANCELLED')),
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (sale_id) REFERENCES sales(id)
//     );
//   `);

//   db.exec(`
//     CREATE TABLE IF NOT EXISTS sale_return_items (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       return_id INTEGER NOT NULL,
//       lot_id INTEGER NOT NULL,
//       product_id INTEGER NOT NULL,
//       quantity REAL NOT NULL,
//       rate REAL NOT NULL,
//       amount REAL NOT NULL,
//       restock_location TEXT DEFAULT 'FINISHED_STORE',
//       FOREIGN KEY (return_id) REFERENCES sale_returns(id),
//       FOREIGN KEY (lot_id) REFERENCES lots(id),
//       FOREIGN KEY (product_id) REFERENCES products(id)
//     );
//   `);

//   // Audit Logs (IMMUTABLE — no UPDATE or DELETE allowed)
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS audit_logs (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       timestamp TEXT NOT NULL DEFAULT (datetime('now')),
//       user_id INTEGER,
//       username TEXT,
//       action TEXT NOT NULL,
//       module TEXT NOT NULL,
//       entity_type TEXT,
//       entity_id INTEGER,
//       description TEXT NOT NULL,
//       details TEXT,
//       ip_address TEXT,
//       created_at TEXT NOT NULL DEFAULT (datetime('now'))
//     );
//   `);

//   // Trigger: prevent DELETE on audit_logs
//   db.exec(`
//     CREATE TRIGGER IF NOT EXISTS prevent_audit_delete
//     BEFORE DELETE ON audit_logs
//     BEGIN
//       SELECT RAISE(ABORT, 'AUDIT LOGS CANNOT BE DELETED');
//     END;
//   `);

//   // Trigger: prevent UPDATE on audit_logs
//   db.exec(`
//     CREATE TRIGGER IF NOT EXISTS prevent_audit_update
//     BEFORE UPDATE ON audit_logs
//     BEGIN
//       SELECT RAISE(ABORT, 'AUDIT LOGS CANNOT BE MODIFIED');
//     END;
//   `);

//   // Settings
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS settings (
//       key TEXT PRIMARY KEY,
//       value TEXT NOT NULL
//     );
//   `);

//   // Insert default settings
//   const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
//   insertSetting.run('half_day_threshold', '4');
//   insertSetting.run('full_day_threshold', '8');
//   insertSetting.run('standard_hours', '8');
//   insertSetting.run('overtime_rate_multiplier', '1.5');
//   insertSetting.run('company_name', 'YarnChem Industries');

//   // Seed admin user
//   const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
//   if (!existingAdmin) {
//     const hash = bcrypt.hashSync('admin123', 10);
//     db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)').run('admin', hash, 'System Administrator', 'admin');
//   }

//   console.log('Database initialized successfully');
//   return db;
// }

// module.exports = { initializeDatabase, DB_PATH };
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'yarnchem.db');

function initializeDatabase() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  // ─────────────────────────────────────────────────────────────
  // SHARED TABLES  (same data for both workspaces)
  // ─────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    /* NOTE: suppliers/customers are now workspace-specific (yarn_ and chem_ tables below) */

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      designation TEXT,
      department TEXT,
      basic_salary REAL DEFAULT 0,
      joining_date TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      time_in TEXT,
      time_out TEXT,
      working_hours REAL DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      status TEXT DEFAULT 'PRESENT' CHECK(status IN ('PRESENT','HALF_DAY','ABSENT','LEAVE','OVERTIME')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      UNIQUE(employee_id, date)
    );

    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      monthly_deduction REAL NOT NULL,
      total_paid REAL DEFAULT 0,
      remaining REAL NOT NULL,
      status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','COMPLETED','CANCELLED')),
      date TEXT DEFAULT (date('now')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      year INTEGER NOT NULL,
      basic_salary REAL DEFAULT 0,
      working_days INTEGER DEFAULT 0,
      present_days INTEGER DEFAULT 0,
      absent_days INTEGER DEFAULT 0,
      half_days INTEGER DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      overtime_amount REAL DEFAULT 0,
      absent_deduction REAL DEFAULT 0,
      loan_deduction REAL DEFAULT 0,
      other_deductions REAL DEFAULT 0,
      other_additions REAL DEFAULT 0,
      net_salary REAL DEFAULT 0,
      status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','CONFIRMED','PAID')),
      paid_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      UNIQUE(employee_id, month, year)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      reference TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      description TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS prevent_audit_delete
    BEFORE DELETE ON audit_logs
    BEGIN SELECT RAISE(ABORT, 'AUDIT LOGS CANNOT BE DELETED'); END;
  `);
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS prevent_audit_update
    BEFORE UPDATE ON audit_logs
    BEGIN SELECT RAISE(ABORT, 'AUDIT LOGS CANNOT BE MODIFIED'); END;
  `);

  // ─────────────────────────────────────────────────────────────
  // YARN WORKSPACE TABLES  (RAW_YARN, DYED_YARN only)
  // Prefix: yarn_
  // Locations: STORE, DYEING, FINISHED_STORE
  // ─────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS yarn_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('RAW_YARN','DYED_YARN')),
      unit TEXT DEFAULT 'No Of Cones',
      conversion_factor REAL DEFAULT 1.0,
      min_stock_level REAL DEFAULT 0,
      shade_code TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES product_categories(id)
    );

    CREATE TABLE IF NOT EXISTS yarn_lots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_number TEXT UNIQUE NOT NULL,
      product_id INTEGER NOT NULL,
      purchase_id INTEGER,
      status TEXT DEFAULT 'IN_STORE' CHECK(status IN ('IN_STORE','DYEING','FINISHED','READY_FOR_SALE','SOLD','PARTIALLY_SOLD')),
      location TEXT DEFAULT 'STORE' CHECK(location IN ('STORE','DYEING','FINISHED_STORE')),
      initial_quantity REAL NOT NULL,
      current_quantity REAL NOT NULL,
      shade_code TEXT,
      cost_per_unit REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES yarn_products(id)
    );

    CREATE TABLE IF NOT EXISTS yarn_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      lot_id INTEGER NOT NULL,
      location TEXT NOT NULL CHECK(location IN ('STORE','DYEING','FINISHED_STORE')),
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'No Of Cones',
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES yarn_products(id),
      FOREIGN KEY (lot_id) REFERENCES yarn_lots(id)
    );

    CREATE TABLE IF NOT EXISTS yarn_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      total_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'RECEIVED' CHECK(status IN ('PENDING','RECEIVED','CANCELLED')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES yarn_suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS yarn_purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      lot_id INTEGER,
      quantity REAL NOT NULL,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES yarn_purchases(id),
      FOREIGN KEY (product_id) REFERENCES yarn_products(id),
      FOREIGN KEY (lot_id) REFERENCES yarn_lots(id)
    );

    CREATE TABLE IF NOT EXISTS yarn_sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      total_amount REAL DEFAULT 0,
      discount_percentage REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'CONFIRMED' CHECK(status IN ('DRAFT','CONFIRMED','DISPATCHED','CANCELLED')),
      gate_pass_id INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES yarn_customers(id)
    );

    CREATE TABLE IF NOT EXISTS yarn_sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      lot_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      target_price REAL,
      FOREIGN KEY (sale_id) REFERENCES yarn_sales(id),
      FOREIGN KEY (product_id) REFERENCES yarn_products(id),
      FOREIGN KEY (lot_id) REFERENCES yarn_lots(id)
    );

    CREATE TABLE IF NOT EXISTS yarn_gate_passes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gate_pass_number TEXT UNIQUE NOT NULL,
      sale_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      lot_ids TEXT NOT NULL,
      total_quantity REAL NOT NULL,
      verified_by TEXT,
      vehicle_number TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sale_id) REFERENCES yarn_sales(id)
    );

    CREATE TABLE IF NOT EXISTS yarn_manufacturing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_id INTEGER NOT NULL,
      process_type TEXT NOT NULL DEFAULT 'DYEING' CHECK(process_type IN ('DYEING')),
      status TEXT DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS','COMPLETED','CANCELLED')),
      input_weight REAL NOT NULL,
      expected_output REAL NOT NULL,
      actual_output REAL,
      shade_code TEXT,
      output_product_id INTEGER,
      output_lot_id INTEGER,
      start_date TEXT DEFAULT (date('now')),
      end_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lot_id) REFERENCES yarn_lots(id),
      FOREIGN KEY (output_product_id) REFERENCES yarn_products(id)
    );

    CREATE TABLE IF NOT EXISTS yarn_wastage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_id INTEGER NOT NULL,
      manufacturing_id INTEGER NOT NULL,
      process_stage TEXT NOT NULL DEFAULT 'DYEING' CHECK(process_stage IN ('DYEING')),
      input_weight REAL NOT NULL,
      expected_output REAL NOT NULL,
      actual_output REAL NOT NULL,
      wastage_amount REAL NOT NULL,
      wastage_percentage REAL NOT NULL,
      cost_per_unit REAL DEFAULT 0,
      wastage_cost REAL DEFAULT 0,
      date TEXT DEFAULT (date('now')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lot_id) REFERENCES yarn_lots(id),
      FOREIGN KEY (manufacturing_id) REFERENCES yarn_manufacturing(id)
    );

    CREATE TABLE IF NOT EXISTS yarn_purchase_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_number TEXT UNIQUE NOT NULL,
      purchase_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      reason TEXT NOT NULL,
      notes TEXT,
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED','CANCELLED')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (purchase_id) REFERENCES yarn_purchases(id)
    );

    CREATE TABLE IF NOT EXISTS yarn_purchase_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      lot_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (return_id) REFERENCES yarn_purchase_returns(id),
      FOREIGN KEY (lot_id) REFERENCES yarn_lots(id),
      FOREIGN KEY (product_id) REFERENCES yarn_products(id)
    );

    CREATE TABLE IF NOT EXISTS yarn_sale_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_number TEXT UNIQUE NOT NULL,
      sale_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      reason TEXT NOT NULL,
      notes TEXT,
      restock_location TEXT DEFAULT 'FINISHED_STORE' CHECK(restock_location IN ('STORE','FINISHED_STORE')),
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED','CANCELLED')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sale_id) REFERENCES yarn_sales(id)
    );

    CREATE TABLE IF NOT EXISTS yarn_sale_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      lot_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      restock_location TEXT DEFAULT 'FINISHED_STORE',
      FOREIGN KEY (return_id) REFERENCES yarn_sale_returns(id),
      FOREIGN KEY (lot_id) REFERENCES yarn_lots(id),
      FOREIGN KEY (product_id) REFERENCES yarn_products(id)
    );

    CREATE TABLE IF NOT EXISTS yarn_suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      credit_terms TEXT,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS yarn_supplier_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      type TEXT NOT NULL CHECK(type IN ('PURCHASE','PAYMENT','OPENING','ADJUSTMENT')),
      reference_id INTEGER,
      description TEXT,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES yarn_suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS yarn_customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      credit_limit REAL DEFAULT 0,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS yarn_customer_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      type TEXT NOT NULL CHECK(type IN ('SALE','PAYMENT','OPENING','ADJUSTMENT')),
      reference_id INTEGER,
      description TEXT,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES yarn_customers(id)
    );
  `);

  // ─────────────────────────────────────────────────────────────
  // CHEMICAL WORKSPACE TABLES  (CHEMICAL_RAW, CHEMICAL_FINISHED)
  // Prefix: chem_
  // Locations: CHEMICAL_STORE
  // Note: category_id is optional for chemicals (NULL allowed)
  // ─────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS chem_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER,
      type TEXT NOT NULL CHECK(type IN ('CHEMICAL_RAW','CHEMICAL_FINISHED')),
      unit TEXT DEFAULT 'KG',
      conversion_factor REAL DEFAULT 1.0,
      min_stock_level REAL DEFAULT 0,
      chemical_code TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES product_categories(id)
    );

    CREATE TABLE IF NOT EXISTS chem_lots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_number TEXT UNIQUE NOT NULL,
      product_id INTEGER NOT NULL,
      purchase_id INTEGER,
      status TEXT DEFAULT 'IN_STORE' CHECK(status IN ('IN_STORE','CHEMICAL_MANUFACTURING','READY_FOR_SALE','SOLD','PARTIALLY_SOLD')),
      location TEXT DEFAULT 'CHEMICAL_STORE' CHECK(location IN ('CHEMICAL_STORE')),
      initial_quantity REAL NOT NULL,
      current_quantity REAL NOT NULL,
      chemical_code TEXT,
      cost_per_unit REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES chem_products(id)
    );

    CREATE TABLE IF NOT EXISTS chem_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      lot_id INTEGER NOT NULL,
      location TEXT NOT NULL DEFAULT 'CHEMICAL_STORE',
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'KG',
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES chem_products(id),
      FOREIGN KEY (lot_id) REFERENCES chem_lots(id)
    );

    CREATE TABLE IF NOT EXISTS chem_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      total_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'RECEIVED' CHECK(status IN ('PENDING','RECEIVED','CANCELLED')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES chem_suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS chem_purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      lot_id INTEGER,
      quantity REAL NOT NULL,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES chem_purchases(id),
      FOREIGN KEY (product_id) REFERENCES chem_products(id),
      FOREIGN KEY (lot_id) REFERENCES chem_lots(id)
    );

    CREATE TABLE IF NOT EXISTS chem_sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      total_amount REAL DEFAULT 0,
      discount_percentage REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'CONFIRMED' CHECK(status IN ('DRAFT','CONFIRMED','DISPATCHED','CANCELLED')),
      gate_pass_id INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES chem_customers(id)
    );

    CREATE TABLE IF NOT EXISTS chem_sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      lot_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      target_price REAL,
      FOREIGN KEY (sale_id) REFERENCES chem_sales(id),
      FOREIGN KEY (product_id) REFERENCES chem_products(id),
      FOREIGN KEY (lot_id) REFERENCES chem_lots(id)
    );

    CREATE TABLE IF NOT EXISTS chem_gate_passes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gate_pass_number TEXT UNIQUE NOT NULL,
      sale_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      lot_ids TEXT NOT NULL,
      total_quantity REAL NOT NULL,
      verified_by TEXT,
      vehicle_number TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sale_id) REFERENCES chem_sales(id)
    );

    CREATE TABLE IF NOT EXISTS chem_manufacturing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_id INTEGER NOT NULL,
      process_type TEXT NOT NULL DEFAULT 'CHEMICAL_MANUFACTURING',
      status TEXT DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS','COMPLETED','CANCELLED')),
      input_weight REAL NOT NULL,
      expected_output REAL NOT NULL,
      actual_output REAL,
      chemical_code TEXT,
      output_product_id INTEGER,
      output_lot_id INTEGER,
      start_date TEXT DEFAULT (date('now')),
      end_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lot_id) REFERENCES chem_lots(id),
      FOREIGN KEY (output_product_id) REFERENCES chem_products(id)
    );

    CREATE TABLE IF NOT EXISTS chem_wastage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_id INTEGER NOT NULL,
      manufacturing_id INTEGER NOT NULL,
      process_stage TEXT NOT NULL DEFAULT 'CHEMICAL_MANUFACTURING',
      input_weight REAL NOT NULL,
      expected_output REAL NOT NULL,
      actual_output REAL NOT NULL,
      wastage_amount REAL NOT NULL,
      wastage_percentage REAL NOT NULL,
      cost_per_unit REAL DEFAULT 0,
      wastage_cost REAL DEFAULT 0,
      date TEXT DEFAULT (date('now')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lot_id) REFERENCES chem_lots(id),
      FOREIGN KEY (manufacturing_id) REFERENCES chem_manufacturing(id)
    );

    CREATE TABLE IF NOT EXISTS chem_purchase_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_number TEXT UNIQUE NOT NULL,
      purchase_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      reason TEXT NOT NULL,
      notes TEXT,
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED','CANCELLED')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (purchase_id) REFERENCES chem_purchases(id)
    );

    CREATE TABLE IF NOT EXISTS chem_purchase_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      lot_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (return_id) REFERENCES chem_purchase_returns(id),
      FOREIGN KEY (lot_id) REFERENCES chem_lots(id),
      FOREIGN KEY (product_id) REFERENCES chem_products(id)
    );

    CREATE TABLE IF NOT EXISTS chem_sale_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_number TEXT UNIQUE NOT NULL,
      sale_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      reason TEXT NOT NULL,
      notes TEXT,
      restock_location TEXT DEFAULT 'CHEMICAL_STORE',
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED','CANCELLED')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sale_id) REFERENCES chem_sales(id)
    );

    CREATE TABLE IF NOT EXISTS chem_sale_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      lot_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      restock_location TEXT DEFAULT 'CHEMICAL_STORE',
      FOREIGN KEY (return_id) REFERENCES chem_sale_returns(id),
      FOREIGN KEY (lot_id) REFERENCES chem_lots(id),
      FOREIGN KEY (product_id) REFERENCES chem_products(id)
    );

    CREATE TABLE IF NOT EXISTS chem_suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      credit_terms TEXT,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chem_supplier_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      type TEXT NOT NULL CHECK(type IN ('PURCHASE','PAYMENT','OPENING','ADJUSTMENT')),
      reference_id INTEGER,
      description TEXT,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES chem_suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS chem_customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      credit_limit REAL DEFAULT 0,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chem_customer_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      type TEXT NOT NULL CHECK(type IN ('SALE','PAYMENT','OPENING','ADJUSTMENT')),
      reference_id INTEGER,
      description TEXT,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES chem_customers(id)
    );
  `);

  // ─────────────────────────────────────────────────────────────
  // Default data
  // ─────────────────────────────────────────────────────────────
  const s = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  s.run('company_name', 'GH & Sons Enterprises');
  s.run('half_day_threshold', '4');
  s.run('full_day_threshold', '8');
  s.run('standard_hours', '8');
  s.run('overtime_rate_multiplier', '1.5');

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existing) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?,?,?,?)')
      .run('admin', hash, 'System Administrator', 'admin');
  }

  console.log('✅  Database ready — yarn_ and chem_ tables are fully separate');
  return db;
}

module.exports = { initializeDatabase, DB_PATH };