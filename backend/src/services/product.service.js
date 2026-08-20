import { ProductModel } from "../models/product.model.js";
import { StockModificationModel } from "../models/stockModification.model.js";

const VALID_ICONS = ["BookOpen", "Notebook", "PenSquare", "BookCopy", "Package"];

function normalizeCodbarra(value) {
  if (value === undefined || value === null || value === "") return null;
  const str = String(value).trim();
  if (!/^\d+$/.test(str)) {
    throw { status: 400, message: "El código de barras debe contener solo números." };
  }
  return str;
}

async function assertUniqueCodbarra(codbarra, excludeId = null) {
  if (!codbarra) return;
  const existing = await ProductModel.findByCodbarra(codbarra);
  if (existing && existing.id !== excludeId) {
    throw { status: 409, message: `Ya existe un producto con el código de barras ${codbarra}.` };
  }
}

export const ProductService = {
  async getAll() {
    return ProductModel.findAll();
  },

  async getByCodbarra(codbarra) {
    const normalized = normalizeCodbarra(codbarra);
    if (!normalized) throw { status: 400, message: "Código de barras inválido." };

    const product = await ProductModel.findByCodbarra(normalized);
    if (!product) throw { status: 404, message: "Producto no encontrado con ese código de barras." };
    return product;
  },

  async create({ name, codbarra, categoryId, cost, price, suggestedPricePercent, stock, minStock, icon, isAvailable }) {
    if (!name || price === undefined) {
      throw { status: 400, message: "Nombre y precio son requeridos." };
    }
    if (icon && !VALID_ICONS.includes(icon)) {
      throw { status: 400, message: `Ícono inválido. Válidos: ${VALID_ICONS.join(", ")}` };
    }

    const normalizedCodbarra = normalizeCodbarra(codbarra);
    await assertUniqueCodbarra(normalizedCodbarra);

    const [created] = await ProductModel.create({
      name,
      codbarra: normalizedCodbarra,
      categoryId: categoryId || null,
      cost: cost ?? 0,
      price,
      suggestedPricePercent: suggestedPricePercent != null ? Number(suggestedPricePercent) : null,
      stock: stock ?? 0,
      minStock: minStock ?? 5,
      icon: icon || "Package",
      isAvailable: isAvailable !== false,
    });
    return created;
  },

  async update(id, updates) {
    const product = await ProductModel.findById(id);
    if (!product) throw { status: 404, message: "Producto no encontrado." };

    if (updates.icon && !VALID_ICONS.includes(updates.icon)) {
      throw { status: 400, message: `Ícono inválido. Válidos: ${VALID_ICONS.join(", ")}` };
    }

    if ("codbarra" in updates) {
      updates.codbarra = normalizeCodbarra(updates.codbarra);
      await assertUniqueCodbarra(updates.codbarra, Number(id));
    }

    const [updated] = await ProductModel.update(id, updates);
    return updated;
  },

  async remove(id) {
    const product = await ProductModel.findById(id);
    if (!product) throw { status: 404, message: "Producto no encontrado." };
    await ProductModel.remove(id);
    return { message: "Producto eliminado." };
  },

  async decrementStock(productId, quantity) {
    const product = await ProductModel.findById(productId);
    if (!product) return;
    if (product.stock < quantity) {
      throw { status: 400, message: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, solicitado: ${quantity}.` };
    }
    await ProductModel.update(productId, { stock: product.stock - quantity });
  },
};
