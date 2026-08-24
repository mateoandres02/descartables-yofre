import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { priceGroups } from "../db/schema.js";

export const PriceGroupModel = {
  findAll(type) {
    const query = db.select().from(priceGroups);
    if (type) return query.where(eq(priceGroups.type, type));
    return query;
  },

  findById(id) {
    return db.select().from(priceGroups).where(eq(priceGroups.id, id)).then((r) => r[0]);
  },

  create(data) {
    return db.insert(priceGroups).values(data).returning();
  },

  update(id, data) {
    return db.update(priceGroups).set(data).where(eq(priceGroups.id, id)).returning();
  },

  remove(id) {
    return db.delete(priceGroups).where(eq(priceGroups.id, id));
  },
};
