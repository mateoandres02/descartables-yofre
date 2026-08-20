import { eq, ne } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

export const UserModel = {
  findAll() {
    return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
      .where(ne(users.role, "creador"));
  },

  findById(id) {
    return db.select().from(users).where(eq(users.id, id)).then((r) => r[0]);
  },

  findByEmail(email) {
    return db.select().from(users).where(eq(users.email, email)).then((r) => r[0]);
  },

  create(data) {
    return db.insert(users).values(data).returning({ id: users.id, name: users.name, email: users.email, role: users.role });
  },

  update(id, data) {
    return db.update(users).set(data).where(eq(users.id, id));
  },

  remove(id) {
    return db.delete(users).where(eq(users.id, id));
  },
};
