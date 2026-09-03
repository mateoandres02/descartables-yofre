import { memo } from "react";
import { Plus, BookOpen, Notebook, PenSquare, BookCopy, Package } from "lucide-react";
import { activeTiers, formatStock, hasPackSale, packTypeLabel } from "../../utils/pack.js";
import { formatCatalogPrice } from "../../utils/price.js";

const ICON_MAP = { BookOpen, Notebook, PenSquare, BookCopy, Package };

function SaleButton({ label, price, enabled, tone, onClick }) {
  const tones = {
    unit: enabled
      ? "bg-secondary hover:brightness-125 text-foreground shadow-secondary/20"
      : "bg-surface text-foreground/40 cursor-not-allowed",
    pack: enabled
      ? "bg-primary hover:brightness-125 text-foreground shadow-primary/20"
      : "bg-surface text-foreground/40 cursor-not-allowed",
    tier: enabled
      ? "bg-elevated hover:brightness-125 text-foreground border border-foreground/20 shadow-sm"
      : "bg-surface text-foreground/40 cursor-not-allowed",
  };
  return (
    <button
      onClick={() => enabled && onClick()}
      disabled={!enabled}
      className={`h-9 md:h-10 px-2.5 md:px-3 rounded-lg flex items-center justify-end gap-2 transition-all shadow-md min-w-[132px] ${tones[tone]}`}
    >
      <span className="text-left leading-tight">
        <span className="block text-[10px] font-bold uppercase opacity-80">{label}</span>
        <span className="block text-sm font-black">${formatCatalogPrice(price)}</span>
      </span>
      <Plus size={16} />
    </button>
  );
}

export const ProductCard = memo(function ProductCard({ product, onAddToCart }) {
  const Icon = ICON_MAP[product.icon] || Package;
  const noStock = product.stock === 0;
  const lowStock = !noStock && product.stock <= product.minStock;
  const sellPack = hasPackSale(product);
  const tiers = activeTiers(product);
  const canAddUnit = product.stock >= 1;
  const canAddPack = sellPack && product.stock >= Number(product.unitsPerPack);
  const multiSale = sellPack || tiers.length > 0;

  return (
    <div className={`bg-surface border rounded-xl p-3 md:p-4 flex items-center justify-between gap-3 shadow-sm transition-all duration-300 ${noStock ? "border-red-500/40 opacity-70" : "border-foreground/15 hover:border-primary/50"}`}>
      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-background flex items-center justify-center shrink-0 shadow-inner">
          <Icon size={20} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3 className="text-foreground font-bold text-base md:text-lg leading-tight truncate">{product.name}</h3>
            {noStock && (
              <span className="bg-red-500/15 text-red-600 px-2 py-0.5 rounded text-xs font-bold shrink-0 shadow-sm">
                Sin stock
              </span>
            )}
            {lowStock && (
              <span className="bg-primary text-foreground px-2 py-0.5 rounded text-xs font-bold shrink-0 shadow-sm">
                Stock Bajo
              </span>
            )}
          </div>
          <p className="text-foreground/70 text-xs md:text-sm font-medium">
            {product.category} · {formatStock(product.stock, product.unitsPerPack, packTypeLabel(product))}
          </p>
        </div>
      </div>
      {multiSale ? (
        <div className="flex flex-wrap justify-end gap-1.5 ml-2 shrink-0 max-w-[70%]">
          <SaleButton
            label="Unidad"
            price={product.price}
            enabled={canAddUnit}
            tone="unit"
            onClick={() => onAddToCart(product, "unidad")}
          />
          {sellPack && (
            <SaleButton
              label={`${packTypeLabel(product)} x${product.unitsPerPack}`}
              price={product.packPrice}
              enabled={canAddPack}
              tone="pack"
              onClick={() => onAddToCart(product, "paquete")}
            />
          )}
          {tiers.map((tier) => (
            <SaleButton
              key={tier.quantity}
              label={`x${tier.quantity}`}
              price={tier.price}
              enabled={product.stock >= Number(tier.quantity)}
              tone="tier"
              onClick={() => onAddToCart(product, "escala", { tier })}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 md:gap-6 ml-2 shrink-0">
          <span className="text-foreground font-black text-base md:text-xl">${formatCatalogPrice(product.price)}</span>
          <button
            onClick={() => canAddUnit && onAddToCart(product, "unidad")}
            disabled={!canAddUnit}
            className={`px-3 md:px-4 h-9 md:h-10 rounded-lg flex items-center gap-1.5 transition-all shadow-md ${canAddUnit ? "bg-secondary hover:brightness-125 text-foreground hover:scale-105 active:scale-95 shadow-secondary/20" : "bg-surface text-foreground/40 cursor-not-allowed"}`}
          >
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
});
