
const Database = require('better-sqlite3');
const path     = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'yarnchem.db');

// ── Data ──────────────────────────────────────────────────────────────────────

const YARN_CATEGORIES = ['Viscose', 'Polyester', 'Bobbin'];

const YARN_SHADES = [
  '0032','1001','1003','1012','1017','1019','1020','1021','1024','1025',
  '1026','1027','1028','1032','1043','1052','1054','1055','1056','1057',
  '1058','1060','1063','1065','1070','1074','1080','1084','1088','1089',
  '1100','1103','1105','1108','1110','1111','1116','1118','1119','1122',
  '1123','1126','1128','1140','1144','1145','1147','1154','1155','1156',
  '1157','1166','1181','1187','1188','1191','1226','1243','1278','1306',
  '1309','1311','1313','1321','1359','1380','1384','1386','1388','1510',
  '2071','2072','2150','2191','2226','3000','3012','3019','3053','3055',
  '3062','3071','3082','3084','3098','3100','3106','3126','3127','3128',
  '3133','3147','3181','3186','3190','3227','3243','3337','3363','3385',
  '3390','3394','3798','4071','4192','4197','4215','4242','4272','4288',
  '4298','4314','4346','4387','4441','4550','4589','5048','5089','5221',
  '5306','5390','5441','5792','6008','6011','6020','6108','7012','7065',
  '8012','8056','9024','9025','DM102',
];

const CHEMICAL_PRODUCTS = [
  'Acidic buffer',
  'Dispersing agent',
  'UMT Fininishing Agent',
  'Tamol NN',
  'SNF',
  'BTG',
];

// ── Seed ──────────────────────────────────────────────────────────────────────

function seed() {
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  console.log('\n🌱  Seeding GH & Sons ERP database...\n');

  // ── 1. Yarn categories ──────────────────────────────────────────────────────
  const insertCat = db.prepare(`INSERT OR IGNORE INTO product_categories (name) VALUES (?)`);
  for (const name of YARN_CATEGORIES) {
    insertCat.run(name);
    console.log(`  📁  Category: ${name}`);
  }

  // Fetch category IDs
  const catMap = {};
  for (const name of YARN_CATEGORIES) {
    const row = db.prepare(`SELECT id FROM product_categories WHERE name = ?`).get(name);
    if (row) catMap[name] = row.id;
  }

  // ── 2. Yarn products ────────────────────────────────────────────────────────
  // RAW_YARN: name = shade, shade_code = NULL  (undyed — shade field hidden in UI)
  // DYED_YARN: name = shade, shade_code = shade
  const insertYarn = db.prepare(`
    INSERT OR IGNORE INTO yarn_products
      (name, category_id, type, unit, shade_code, is_active)
    VALUES (?, ?, ?, 'No Of Cones', ?, 1)
  `);

  let yarnCount = 0;
  const seedYarn = db.transaction(() => {
    for (const cat of YARN_CATEGORIES) {
      const catId = catMap[cat];
      if (!catId) { console.warn(`  ⚠️  Category "${cat}" not found, skipping`); continue; }
      for (const shade of YARN_SHADES) {
        insertYarn.run(shade, catId, 'RAW_YARN',  null);   // undyed
        insertYarn.run(shade, catId, 'DYED_YARN', shade);  // dyed
        yarnCount += 2;
      }
    }
  });
  seedYarn();
  console.log(`\n  🧵  Yarn products: ${yarnCount} created`);
  console.log(`       (${YARN_SHADES.length} shades × ${YARN_CATEGORIES.length} categories × 2 types)`);

  // ── 3. Chemical products (no category) ─────────────────────────────────────
  const insertChem = db.prepare(`
    INSERT OR IGNORE INTO chem_products
      (name, category_id, type, unit, is_active)
    VALUES (?, NULL, 'CHEMICAL_RAW', 'Kg', 1)
  `);
  console.log('');
  for (const name of CHEMICAL_PRODUCTS) {
    insertChem.run(name);
    console.log(`  🧪  Chemical: ${name}`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const cats  = db.prepare(`SELECT COUNT(*) AS c FROM product_categories`).get().c;
  const yarns = db.prepare(`SELECT COUNT(*) AS c FROM yarn_products`).get().c;
  const chems = db.prepare(`SELECT COUNT(*) AS c FROM chem_products`).get().c;

  console.log('\n──────────────────────────────────────────');
  console.log(`  Categories     : ${cats}`);
  console.log(`  Yarn products  : ${yarns}`);
  console.log(`  Chem products  : ${chems}`);
  console.log('──────────────────────────────────────────');
  console.log('✅  Seed complete!\n');

  db.close();
}

seed();