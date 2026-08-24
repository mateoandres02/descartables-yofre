export function packSizeOf(product) {
  const n = Number(product?.unitsPerPack);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

export function hasPackSale(product) {
  return packSizeOf(product) > 1 && product?.packPrice != null && Number(product.packPrice) > 0;
}

export function unitsOfLine(item) {
  const size = item.saleMode === "paquete" ? packSizeOf(item) : 1;
  return Number(item.quantity) * size;
}

export function unitsInCartForProduct(cart, productId, exceptLineId) {
  return cart
    .filter((i) => (i.productId ?? i.id) === productId && i.lineId !== exceptLineId)
    .reduce((sum, i) => sum + unitsOfLine(i), 0);
}

export function maxQuantityForLine(items, item) {
  const remaining = Number(item.stock) - unitsInCartForProduct(items, item.productId ?? item.id, item.lineId);
  if (item.saleMode === "paquete") {
    return Math.max(0, Math.floor(remaining / packSizeOf(item)));
  }
  return Math.max(0, remaining);
}

export function formatStock(stock, unitsPerPack) {
  const units = Number(stock) || 0;
  const size = Number(unitsPerPack);
  if (!Number.isFinite(size) || size <= 1) return `${units} u.`;
  const packs = Math.floor(units / size);
  const rest = units % size;
  if (rest) return `${units} u. · ${packs} paq. + ${rest} u.`;
  return `${units} u. · ${packs} paq.`;
}

export function lineIdFor(productId, saleMode) {
  return `${productId}-${saleMode}`;
}

export function saleLabel(item) {
  if (item.saleMode === "paquete") return `Paquete x${packSizeOf(item)}`;
  return "Unidad";
}
