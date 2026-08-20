import { Plus, BookOpen, Notebook, PenSquare, BookCopy, Package } from "lucide-react";

const ICON_MAP = { BookOpen, Notebook, PenSquare, BookCopy, Package };

export function ProductCard({ product, onAddToCart }) {
  const Icon = ICON_MAP[product.icon] || Package;
  const noStock = product.stock === 0;
  const lowStock = !noStock && product.stock <= product.minStock;

  return (
    <div className={`bg-[#f4f3f0] border rounded-xl p-3 md:p-4 flex items-center justify-between shadow-sm transition-all duration-300 ${noStock ? "border-red-200 opacity-70" : "border-[#e5e7eb] hover:border-[#cc679c]/50"}`}>
      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-[#eceae7] flex items-center justify-center shrink-0 shadow-inner">
          <Icon size={20} className="text-[#e3ac4d]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3 className="text-[#cc679c] font-bold text-base md:text-lg leading-tight truncate">{product.name}</h3>
            {noStock && (
              <span className="bg-red-500/15 text-red-600 px-2 py-0.5 rounded text-xs font-bold shrink-0 shadow-sm">
                Sin stock
              </span>
            )}
            {lowStock && (
              <span className="bg-[#e3ac4d] text-[#cc679c] px-2 py-0.5 rounded text-xs font-bold shrink-0 shadow-sm">
                Stock Bajo
              </span>
            )}
          </div>
          <p className="text-[#cc679c]/70 text-xs md:text-sm font-medium">{product.category} · {product.stock} en stock</p>
        </div>
      </div>
      <div className="flex items-center gap-3 md:gap-6 ml-2 shrink-0">
        <span className="text-[#cc679c] font-black text-base md:text-xl">${Number(product.price).toFixed(2)}</span>
        <button
          onClick={() => !noStock && onAddToCart(product)}
          disabled={noStock}
          className={`px-3 md:px-4 h-9 md:h-10 rounded-lg flex items-center gap-1.5 transition-all shadow-md ${noStock ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#cc679c] hover:bg-[#b85889] text-[#eceae7] hover:scale-105 active:scale-95 shadow-[#cc679c]/20"}`}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
