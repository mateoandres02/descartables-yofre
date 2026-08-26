import { ProductModel } from "../models/product.model.js";
import { ProductPriceTierModel } from "../models/productPriceTier.model.js";
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

function normalizePackFields({ unitsPerPack, packPrice }) {
  let size = parseInt(unitsPerPack, 10);
  if (!Number.isFinite(size) || size < 1) size = 1;

  if (size === 1) {
    return { unitsPerPack: 1, packPrice: null };
  }

  const parsedPrice = packPrice === null || packPrice === undefined || packPrice === ""
    ? null
    : Number(packPrice);

    if (parsedPrice == null || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
    throw { status: 400, message: "Si el producto se vende por bulto, indicá cuántas unidades trae y el precio de ese bulto." };
  }

  return { unitsPerPack: size, packPrice: parsedPrice };
}

function normalizePriceTiers(priceTiers) {
  if (priceTiers == null) return null;
  if (!Array.isArray(priceTiers)) {
    throw { status: 400, message: "Las cantidades personalizadas no son válidas." };
  }
  const seen = new Set();
  const list = [];
  for (const row of priceTiers) {
    const quantity = parseInt(row?.quantity, 10);
    const price = Number(row?.price);
    if (!Number.isFinite(quantity) || quantity < 2) continue;
    if (!Number.isFinite(price) || price < 0) {
      throw { status: 400, message: `El precio de la venta por ${quantity} no es válido.` };
    }
    if (seen.has(quantity)) {
      throw { status: 400, message: `Hay dos precios para la misma cantidad (${quantity}).` };
    }
    seen.add(quantity);
    list.push({ quantity, price });
  }
  return list.sort((a, b) => a.quantity - b.quantity);
}

async function attachTiers(products) {
  const list = Array.isArray(products) ? products.filter(Boolean) : (products ? [products] : []);
  if (list.length === 0) return products;
  const tiers = await ProductPriceTierModel.findByProductIds(list.map((p) => p.id));
  const map = {};
  for (const t of tiers) {
    (map[t.productId] ||= []).push({ quantity: t.quantity, price: t.price });
  }
  for (const p of list) {
    p.priceTiers = (map[p.id] || []).sort((a, b) => a.quantity - b.quantity);
  }
  return Array.isArray(products) ? products : list[0];
}

export const ProductService = {
  async getAll() {
    return attachTiers(await ProductModel.findAll());
  },

  async getByCodbarra(codbarra) {
    const normalized = normalizeCodbarra(codbarra);
    if (!normalized) throw { status: 400, message: "Código de barras inválido." };

    const product = await ProductModel.findByCodbarra(normalized);
    if (!product) throw { status: 404, message: "Producto no encontrado con ese código de barras." };
    return attachTiers(product);
  },

  async create({ name, codbarra, categoryId, priceGroupId, packTypeId, cost, price, stock, minStock, icon, isAvailable, unitsPerPack, packPrice, priceTiers }) {
    if (!name || price === undefined) {
      throw { status: 400, message: "Nombre y precio son requeridos." };
    }
    if (icon && !VALID_ICONS.includes(icon)) {
      throw { status: 400, message: `Ícono inválido. Válidos: ${VALID_ICONS.join(", ")}` };
    }

    const normalizedCodbarra = normalizeCodbarra(codbarra);
    await assertUniqueCodbarra(normalizedCodbarra);
    const pack = normalizePackFields({ unitsPerPack, packPrice });
    const tiers = normalizePriceTiers(priceTiers) || [];

    const [created] = await ProductModel.create({
      name,
      codbarra: normalizedCodbarra,
      categoryId: categoryId || null,
      priceGroupId: priceGroupId || null,
      packTypeId: packTypeId || null,
      cost: cost ?? 0,
      price,
      stock: stock ?? 0,
      minStock: minStock ?? 5,
      icon: icon || "Package",
      isAvailable: isAvailable !== false,
      unitsPerPack: pack.unitsPerPack,
      packPrice: pack.packPrice,
    });
    if (tiers.length) await ProductPriceTierModel.replaceForProduct(created.id, tiers);
    return attachTiers(await ProductModel.findById(created.id));
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

    delete updates.suggestedPricePercent;
    delete updates.useSuggestedPrice;

    if ("priceGroupId" in updates) {
      updates.priceGroupId = updates.priceGroupId || null;
    }

    if ("packTypeId" in updates) {
      updates.packTypeId = updates.packTypeId || null;
    }

    const nextTiers = "priceTiers" in updates ? normalizePriceTiers(updates.priceTiers) : null;
    delete updates.priceTiers;
    delete updates.packTypeName;
    delete updates.priceGroupName;
    delete updates.priceGroupType;
    delete updates.category;

    if ("unitsPerPack" in updates || "packPrice" in updates) {
      const pack = normalizePackFields({
        unitsPerPack: "unitsPerPack" in updates ? updates.unitsPerPack : product.unitsPerPack,
        packPrice: "packPrice" in updates ? updates.packPrice : product.packPrice,
      });
      updates.unitsPerPack = pack.unitsPerPack;
      updates.packPrice = pack.packPrice;
    }

    if (Object.keys(updates).length > 0) {
      await ProductModel.update(id, updates);
    }
    if (nextTiers) await ProductPriceTierModel.replaceForProduct(Number(id), nextTiers);
    return attachTiers(await ProductModel.findById(id));
  },

  async bulkAssign({ productIds, priceGroupId }) {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw { status: 400, message: "Seleccioná al menos un producto." };
    }
    const groupId = priceGroupId || null;
    for (const id of productIds) {
      await ProductModel.update(id, { priceGroupId: groupId });
    }
    return { updated: productIds.length };
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
