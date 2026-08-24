import { eq, count } from "drizzle-orm";
import { db } from "../db/client.js";
import { products, categories, priceGroups } from "../db/schema.js";

const SELECT_FIELDS = {
  id: products.id,
  name: products.name,
  codbarra: products.codbarra,
  categoryId: products.categoryId,
  category: categories.name,
  priceGroupId: products.priceGroupId,
  priceGroupName: priceGroups.name,
  priceGroupType: priceGroups.type,
  cost: products.cost,
  price: products.price,
  stock: products.stock,
  minStock: products.minStock,
  icon: products.icon,
  isAvailable: products.isAvailable,
  createdAt: products.createdAt,
};

function withJoins(query) {
  return query
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(priceGroups, eq(products.priceGroupId, priceGroups.id));
}

export const ProductModel = {
  findAll() {
    return withJoins(db.select(SELECT_FIELDS).from(products));
  },

  findById(id) {
    return withJoins(db.select(SELECT_FIELDS).from(products))
      .where(eq(products.id, id))
      .then((r) => r[0]);
  },

  findByCodbarra(codbarra) {
    return withJoins(db.select(SELECT_FIELDS).from(products))
      .where(eq(products.codbarra, codbarra))
      .then((r) => r[0]);
  },

  findByPriceGroupId(priceGroupId) {
    return db.select().from(products).where(eq(products.priceGroupId, priceGroupId));
  },

  countByPriceGroup() {
    return db
      .select({
        priceGroupId: products.priceGroupId,
        n: count(),
      })
      .from(products)
      .groupBy(products.priceGroupId);
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
