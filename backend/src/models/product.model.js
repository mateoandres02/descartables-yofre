import { eq, isNotNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { products, categories } from "../db/schema.js";

const SELECT_FIELDS = {
  id: products.id,
  name: products.name,
  codbarra: products.codbarra,
  categoryId: products.categoryId,
  category: categories.name,
  cost: products.cost,
  price: products.price,
  suggestedPricePercent: products.suggestedPricePercent,
  stock: products.stock,
  minStock: products.minStock,
  icon: products.icon,
  isAvailable: products.isAvailable,
  createdAt: products.createdAt,
};

export const ProductModel = {
  findAll() {
    return db.select(SELECT_FIELDS).from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id));
  },

  findById(id) {
    return db.select(SELECT_FIELDS).from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id))
      .then((r) => r[0]);
  },

  findByCodbarra(codbarra) {
    return db.select(SELECT_FIELDS).from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.codbarra, codbarra))
      .then((r) => r[0]);
  },

  // Productos que tienen porcentaje sugerido activo
  findWithSuggestedPercent(percent) {
    return db.select(SELECT_FIELDS).from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.suggestedPricePercent, percent));
  },

  findAllWithSuggestedPrice() {
    return db.select(SELECT_FIELDS).from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(isNotNull(products.suggestedPricePercent));
  },

  create(data) {
    return db.insert(products).values(data).returning();
  },

  update(id, data) {
    return db.update(products).set(data).where(eq(products.id, id)).returning();
  },

  remove(id) {
    return db.delete(products).where(eq(products.id, id));
  },
};
