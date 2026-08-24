import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ─── Usuarios ────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "cajero", "creador"] }).notNull().default("cajero"),
  createdAt: text("created_at").default(sql`(datetime('now','localtime'))`),
});

// ─── Categorías ──────────────────────────────────────────────────────────────

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

// ─── Métodos de pago ─────────────────────────────────────────────────────────

export const paymentMethods = sqliteTable("payment_methods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  surcharge: real("surcharge").notNull().default(0), // porcentaje, ej: 10.5
});

// ─── Marcas y colecciones (aumentos de precio) ───────────────────────────────

export const priceGroups = sqliteTable("price_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", { enum: ["marca", "coleccion"] }).notNull(),
  lastIncreasePercent: real("last_increase_percent").notNull().default(0),
}, (table) => [
  uniqueIndex("price_groups_name_type_unique").on(table.name, table.type),
]);

// ─── Productos ───────────────────────────────────────────────────────────────

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  codbarra: text("cod_barra").unique(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  priceGroupId: integer("price_group_id").references(() => priceGroups.id, { onDelete: "set null" }),
  cost: real("cost").notNull().default(0),
  price: real("price").notNull(),
  unitsPerPack: integer("units_per_pack").notNull().default(1),
  packPrice: real("pack_price"),
  useSuggestedPrice: integer("use_suggested_price", { mode: "boolean" }).notNull().default(false),
  suggestedPricePercent: real("suggested_price_percent"),
  stock: integer("stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(5),
  icon: text("icon").notNull().default("Package"),
  isAvailable: integer("is_available", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").default(sql`(datetime('now','localtime'))`),
});

// ─── Configuración global de la app ──────────────────────────────────────────

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// ─── Cajas registradoras ─────────────────────────────────────────────────────

export const cashRegisters = sqliteTable("cash_registers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openedBy: integer("opened_by").references(() => users.id),
  initialCash: real("initial_cash").notNull().default(0),
  isOpen: integer("is_open", { mode: "boolean" }).notNull().default(true),
  openedAt: text("opened_at").default(sql`(datetime('now','localtime'))`),
  closedAt: text("closed_at"),
});

// ─── Transacciones (ventas) ───────────────────────────────────────────────────

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  registerId: integer("register_id")
    .notNull()
    .references(() => cashRegisters.id),
  total: real("total").notNull(),
  date: text("date").notNull(), // "DD/MM/YYYY"
  time: text("time").notNull(), // "HH:MM"
  createdAt: text("created_at").default(sql`(datetime('now','localtime'))`),
});

// ─── Pagos de una transacción ─────────────────────────────────────────────────

export const transactionPayments = sqliteTable("transaction_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  paymentMethodId: integer("payment_method_id").references(() => paymentMethods.id, {
    onDelete: "set null",
  }),
  methodName: text("method_name").notNull(),
  baseAmount: real("base_amount").notNull(),
  surchargePercent: real("surcharge_percent").notNull().default(0),
  amount: real("amount").notNull(), // monto final con recargo
});

// ─── Ítems de una transacción ─────────────────────────────────────────────────

export const transactionItems = sqliteTable("transaction_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull(),
  price: real("price").notNull(),
  quantity: integer("quantity").notNull(),
  total: real("total").notNull(),
  saleMode: text("sale_mode", { enum: ["unidad", "paquete"] }).notNull().default("unidad"),
  packSize: integer("pack_size").notNull().default(1),
});

// ─── Gastos fijos ─────────────────────────────────────────────────────────────

export const fixedExpenses = sqliteTable("fixed_expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
});

// ─── Gastos diarios ───────────────────────────────────────────────────────────

export const dailyExpenses = sqliteTable("daily_expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reason: text("reason").notNull(),
  amount: real("amount").notNull(),
  method: text("method", { enum: ["efectivo", "transferencia"] })
    .notNull()
    .default("efectivo"),
  registerId: integer("register_id").references(() => cashRegisters.id, {
    onDelete: "set null",
  }),
  createdAt: text("created_at").default(sql`(datetime('now','localtime'))`),
});

// ─── Modificaciones de stock ──────────────────────────────────────────────────

export const stockModifications = sqliteTable("stock_modifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull(),
  oldStock: integer("old_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now','localtime'))`),
});

// ─── Retiros internos (consumo propio) ────────────────────────────────────────

export const internalWithdrawals = sqliteTable("internal_withdrawals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now','localtime'))`),
});

// ─── Configuración de suscripción (bomba lógica) ──────────────────────────────

export const subscriptionConfig = sqliteTable("subscription_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cutoffDay: integer("cutoff_day"),   // día del mes 1-31, null = sin restricción
  lastPaidAt: text("last_paid_at"),   // fecha de última reactivación "YYYY-MM-DD"
  updatedAt: text("updated_at").default(sql`(datetime('now','localtime'))`),
});
