import { getTableColumns, getTableName } from "drizzle-orm";
import * as schema from "./schema.js";
import { client } from "./client.js";

const MIGRATIONS_TABLE = "app_migrations";

const migrations = [
  {
    id: "20260903_001_customer_accounts",
    statements: [
      `CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        document TEXT NOT NULL,
        phone TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      "CREATE UNIQUE INDEX IF NOT EXISTS customers_document_unique ON customers (document)",
      `CREATE TABLE IF NOT EXISTS account_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
        method_name TEXT,
        detail TEXT,
        register_id INTEGER REFERENCES cash_registers(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      "CREATE INDEX IF NOT EXISTS account_movements_customer_created_idx ON account_movements (customer_id, created_at)",
      "CREATE INDEX IF NOT EXISTS account_movements_register_type_idx ON account_movements (register_id, type)",
      "CREATE INDEX IF NOT EXISTS account_movements_transaction_idx ON account_movements (transaction_id)",
    ],
  },
  {
    id: "20260903_002_round_product_prices_to_tens",
    statements: [
      `UPDATE products
       SET price = CASE
           WHEN price > 0 THEN CAST(price / 10 AS INTEGER) * 10
             + CASE WHEN price > CAST(price / 10 AS INTEGER) * 10 THEN 10 ELSE 0 END
           ELSE price
         END,
         pack_price = CASE
           WHEN pack_price > 0 THEN CAST(pack_price / 10 AS INTEGER) * 10
             + CASE WHEN pack_price > CAST(pack_price / 10 AS INTEGER) * 10 THEN 10 ELSE 0 END
           ELSE pack_price
         END`,
      `UPDATE product_price_tiers
       SET price = CASE
         WHEN price > 0 THEN CAST(price / 10 AS INTEGER) * 10
           + CASE WHEN price > CAST(price / 10 AS INTEGER) * 10 THEN 10 ELSE 0 END
         ELSE price
       END`,
    ],
  },
];

function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

function expectedSchema() {
  return Object.values(schema).map((table) => ({
    name: getTableName(table),
    columns: Object.values(getTableColumns(table)).map((column) => column.name),
  }));
}

export async function applyDatabaseMigrations() {
  await client.execute(`CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  const appliedResult = await client.execute(`SELECT id FROM ${MIGRATIONS_TABLE}`);
  const applied = new Set(appliedResult.rows.map((row) => String(row.id)));

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;

    await client.batch(
      [
        ...migration.statements,
        {
          sql: `INSERT OR IGNORE INTO ${MIGRATIONS_TABLE} (id) VALUES (?)`,
          args: [migration.id],
        },
      ],
      "write"
    );
    console.log(`✅ Migración aplicada: ${migration.id}`);
  }
}

export async function verifyDatabaseSchema() {
  const expected = expectedSchema();
  const results = await client.batch(
    expected.map(({ name }) => `PRAGMA table_info(${quoteIdentifier(name)})`),
    "read"
  );
  const issues = [];

  expected.forEach(({ name, columns }, index) => {
    const actualColumns = new Set(results[index].rows.map((row) => String(row.name)));
    if (actualColumns.size === 0) {
      issues.push(`falta la tabla ${name}`);
      return;
    }

    const missingColumns = columns.filter((column) => !actualColumns.has(column));
    if (missingColumns.length > 0) {
      issues.push(`faltan columnas en ${name}: ${missingColumns.join(", ")}`);
    }
  });

  if (issues.length > 0) {
    throw new Error(`Esquema de base de datos incompleto: ${issues.join("; ")}`);
  }

  return { tablesChecked: expected.length };
}

export async function initializeDatabase() {
  await applyDatabaseMigrations();
  return verifyDatabaseSchema();
}
