import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Edit2, Trash2, AlertTriangle, X, Package, BookOpen, Notebook, PenSquare, BookCopy, ScanBarcode, Eye, EyeOff, ChevronDown, TrendingUp } from "lucide-react";
import { Loader } from "./Loader.jsx";
import { toast } from "sonner";
import api from "../../services/api.js";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner.js";

const ICON_OPTIONS = [
  { key: "BookOpen",  Icon: BookOpen,  label: "Libro"          },
  { key: "Notebook",  Icon: Notebook,  label: "Cuaderno"       },
  { key: "PenSquare", Icon: PenSquare, label: "Útil escolar"   },
  { key: "BookCopy",  Icon: BookCopy,  label: "Colección"      },
  { key: "Package", Icon: Package, label: "Genérico"       },
];

const EMPTY_PRODUCT = { name: "", codbarra: "", price: "", cost: "", categoryId: null, stock: "", minStock: "", icon: "Package", suggestedPricePercent: null };

function toModalItem(product) {
  return {
    ...product,
    codbarra: product.codbarra || "",
    price: String(product.price),
    cost: String(product.cost ?? ""),
    stock: String(product.stock),
    minStock: String(product.minStock),
    icon: product.icon || "Package",
    suggestedPricePercent: product.suggestedPricePercent ?? null,
  };
}

export function InventarioView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productModal, setProductModal] = useState({ isOpen: false, item: null, isNew: false });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, product: null });
  const [deleting, setDeleting] = useState(false);
  const [showCosto, setShowCosto] = useState(false);
  const [showPrecio, setShowPrecio] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [suggestedPercents, setSuggestedPercents] = useState([]);
  const [priceAccordionOpen, setPriceAccordionOpen] = useState(false);
  const [showAllLowStock, setShowAllLowStock] = useState(false);
  const [showModalAmounts, setShowModalAmounts] = useState(false);

  async function fetchData() {
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        api.get("/products"),
        api.get("/categories"),
        api.get("/settings/suggested-prices").catch(() => ({ data: { percents: [] } })),
      ]);
      setInventory(pRes.data);
      setCategories(cRes.data);
      setSuggestedPercents(sRes.data.percents ?? []);
    } catch { toast.error("Error al cargar datos"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  // Recalcula el precio sugerido cada vez que cambia el porcentaje o el costo
  useEffect(() => {
    if (!productModal.isOpen || !productModal.item) return;
    const pct = productModal.item.suggestedPricePercent;
    if (pct == null) return;
    const cost = parseFloat(productModal.item.cost);
    if (!isFinite(cost) || cost <= 0) return;
    const suggestedPrice = String(Math.ceil((cost * (1 + pct / 100)) / 5) * 5);
    if (productModal.item.price === suggestedPrice) return;
    setProductModal((prev) => ({ ...prev, item: { ...prev.item, price: suggestedPrice } }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productModal.item?.suggestedPricePercent, productModal.item?.cost]);

  const filteredInventory = inventory
    .filter((p) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (p.name || "").toLowerCase().includes(term) ||
        (p.category || "").toLowerCase().includes(term) ||
        (p.codbarra && String(p.codbarra).includes(searchTerm.trim()));
      const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" }));
  const lowStockItems = inventory.filter((p) => p.stock <= p.minStock);

  const handleAddProduct = () => {
    setPriceAccordionOpen(false);
    setShowModalAmounts(false);
    setProductModal({
      isOpen: true,
      item: { ...EMPTY_PRODUCT, categoryId: categories[0]?.id ?? null },
      isNew: true,
    });
  };

  const openNewProductWithBarcode = useCallback((code) => {
    setProductModal({
      isOpen: true,
      item: { ...EMPTY_PRODUCT, codbarra: code, categoryId: categories[0]?.id ?? null },
      isNew: true,
    });
    setSearchTerm("");
    toast.info("Código no registrado", { description: "Completá los datos del nuevo producto" });
  }, [categories]);

  const openEditProduct = useCallback((product) => {
    setPriceAccordionOpen(false);
    setShowModalAmounts(false);
    setProductModal({ isOpen: true, item: toModalItem(product), isNew: false });
    setSearchTerm("");
    toast.success(`Producto encontrado: ${product.name}`);
  }, []);

  const findProductByBarcode = useCallback((code) => {
    return inventory.find((p) => p.codbarra && String(p.codbarra) === String(code));
  }, [inventory]);

  const handleBarcodeScan = useCallback((code) => {
    const product = findProductByBarcode(code);
    if (product) {
      openEditProduct(product);
    } else {
      openNewProductWithBarcode(code);
    }
  }, [findProductByBarcode, openEditProduct, openNewProductWithBarcode]);

  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: !productModal.isOpen && !deleteModal.isOpen,
  });

  const handleSearchKeyDown = (e) => {
    if (e.key !== "Enter" || !searchTerm.trim()) return;
    const code = searchTerm.trim();
    if (!/^\d+$/.test(code)) return;

    e.preventDefault();
    const product = findProductByBarcode(code);
    if (product) {
      openEditProduct(product);
    } else {
      openNewProductWithBarcode(code);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteModal.product || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${deleteModal.product.id}`);
      toast.success(`"${deleteModal.product.name}" eliminado`);
      setDeleteModal({ isOpen: false, product: null });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al eliminar el producto");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!productModal.item?.name) { toast.error("El nombre del producto es obligatorio"); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        name: productModal.item.name,
        codbarra: productModal.item.codbarra?.trim() || null,
        categoryId: productModal.item.categoryId ? Number(productModal.item.categoryId) : null,
        icon: productModal.item.icon || "Package",
        isAvailable: productModal.item.isAvailable !== false,
        price: parseFloat(productModal.item.price) || 0,
        cost: parseFloat(productModal.item.cost) || 0,
        stock: parseInt(productModal.item.stock, 10) || 0,
        minStock: parseInt(productModal.item.minStock, 10) || 0,
        suggestedPricePercent: productModal.item.suggestedPricePercent ?? null,
      };

      const originalProduct = inventory.find(p => p.id === productModal.item.id);
      const oldStock = originalProduct ? Number(originalProduct.stock) : 0;

      if (productModal.isNew) {
        await api.post("/products", payload);
        toast.success("Producto creado exitosamente");
      } else {
        await api.put(`/products/${productModal.item.id}`, payload);
        toast.success("Producto actualizado exitosamente");
        
        // Si el stock fue modificado manualmente, registramos el evento
        if (oldStock !== payload.stock) {
          await api.post("/stats/stock-modifications", {
            productId: productModal.item.id,
            productName: productModal.item.name,
            oldStock,
            newStock: payload.stock
          }).catch(() => {});
        }
      }
      setProductModal({ isOpen: false, item: null, isNew: false });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  const categoryNames = categories.map((c) => c.name);
  const allCategories = categoryNames.length > 0 ? categoryNames : ["Libros", "Cuadernos", "Útiles"];


  return (
    <div className="flex-1 p-4 pb-20 md:p-8 overflow-y-auto relative">
      {loading && <Loader />}
      <div className="mb-6 md:mb-8">
        <h1 className="text-[#cc679c] font-bold text-2xl md:text-4xl mb-1 md:mb-2">Gestión de Inventario</h1>
        <p className="text-[#cc679c]/80 font-medium text-sm">Controlá tu stock y productos</p>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-[#e3ac4d]/20 border border-[#e3ac4d]/40 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-[#cc679c] flex-shrink-0" size={24} />
            <div className="flex-1">
              <h3 className="text-[#cc679c] font-bold mb-2">Alerta de Stock Bajo</h3>
              <p className="text-[#cc679c]/80 font-medium text-sm mb-3">{lowStockItems.length} productos en su límite mínimo o por debajo.</p>
              <div className="flex flex-wrap gap-2">
                {(showAllLowStock ? lowStockItems : lowStockItems.slice(0, 5)).map((item) => (
                  <span key={item.id} className="bg-[#e3ac4d] text-white font-bold px-3 py-1 rounded-full text-sm shadow-sm">
                    {item.name}: {item.stock} unidades
                  </span>
                ))}
              </div>
              {lowStockItems.length > 5 && (
                <button
                  onClick={() => setShowAllLowStock((v) => !v)}
                  className="mt-3 text-[#cc679c] font-bold text-sm hover:underline"
                >
                  {showAllLowStock ? "Ver menos ▲" : `Ver más (${lowStockItems.length - 5} más) ▼`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cc679c]/60" size={20} />
          <input
            type="text"
            placeholder="Buscar o escanear código de barras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full bg-[#f4f3f0] text-[#cc679c] placeholder-[#cc679c]/60 font-medium rounded-xl pl-12 pr-12 py-3 md:py-4 border border-[#e5e7eb] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none transition-all"
          />
          <ScanBarcode className="absolute right-4 top-1/2 -translate-y-1/2 text-[#cc679c]/40" size={20} title="Escaneá para abrir edición" />
        </div>
        <button onClick={handleAddProduct} className="bg-[#cc679c] hover:bg-[#b85889] text-[#eceae7] font-bold px-5 py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm md:text-base shrink-0 shadow-md shadow-[#cc679c]/20">
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 md:pb-0 md:flex-wrap mb-6 scrollbar-hide">
        {["Todos", ...allCategories].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 md:px-5 py-2 rounded-lg text-sm transition-all whitespace-nowrap shrink-0 shadow-sm ${
              selectedCategory === cat
                ? "bg-[#cc679c] text-[#eceae7] font-bold"
                : "bg-[#f4f3f0] text-[#cc679c]/80 font-medium hover:bg-[#e5e7eb] hover:text-[#cc679c]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-[#f4f3f0] rounded-xl overflow-hidden border border-[#e5e7eb] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px]">
            <thead>
              <tr className="border-b border-[#e5e7eb]">
                <th className="text-left text-[#cc679c]/80 font-bold p-4">Producto</th>
                <th className="text-left text-[#cc679c]/80 font-bold p-4">Cód. Barras</th>
                <th className="text-left text-[#cc679c]/80 font-bold p-4">Categoría</th>
                <th className="text-left text-[#cc679c]/80 font-bold p-4">
                  <div className="flex items-center gap-2">
                    Costo
                    <button onClick={() => setShowCosto((v) => !v)} title={showCosto ? "Ocultar costo" : "Mostrar costo"} className="text-[#cc679c]/40 hover:text-[#cc679c] transition-colors">
                      {showCosto ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                  </div>
                </th>
                <th className="text-left text-[#cc679c]/80 font-bold p-4">
                  <div className="flex items-center gap-2">
                    Precio
                    <button onClick={() => setShowPrecio((v) => !v)} title={showPrecio ? "Ocultar precio" : "Mostrar precio"} className="text-[#cc679c]/40 hover:text-[#cc679c] transition-colors">
                      {showPrecio ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                  </div>
                </th>
                <th className="text-left text-[#cc679c]/80 font-bold p-4">Stock</th>
                <th className="text-left text-[#cc679c]/80 font-bold p-4">Min. Stock</th>
                <th className="text-left text-[#cc679c]/80 font-bold p-4">Estado</th>
                <th className="text-center text-[#cc679c]/80 font-bold p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((product) => {
                const noStock = product.stock === 0;
                const lowStock = !noStock && product.stock <= product.minStock;
                return (
                  <tr key={product.id} className="border-b border-[#e5e7eb] hover:bg-[#eceae7]/50 transition-colors">
                    <td className="p-4"><span className="text-[#cc679c] font-bold">{product.name}</span></td>
                    <td className="p-4">
                      <span className="text-[#cc679c]/80 font-medium font-mono text-sm">
                        {product.codbarra || "—"}
                      </span>
                    </td>
                    <td className="p-4"><span className="text-[#cc679c]/80 font-medium">{product.category}</span></td>
                    <td className="p-4">
                      {showCosto
                        ? <span className="text-[#cc679c]/80 font-medium">${Number(product.cost || 0).toFixed(2)}</span>
                        : <span className="text-[#cc679c]/30 font-black tracking-widest select-none">••••</span>}
                    </td>
                    <td className="p-4">
                      {showPrecio
                        ? <span className="text-[#cc679c] font-black">${Number(product.price).toFixed(2)}</span>
                        : <span className="text-[#cc679c]/30 font-black tracking-widest select-none">••••</span>}
                    </td>
                    <td className="p-4"><span className="text-[#cc679c] font-bold">{product.stock} unidades</span></td>
                    <td className="p-4"><span className="text-[#cc679c]/80 font-medium">{product.minStock} unid.</span></td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold shadow-sm ${noStock ? "bg-red-500/15 text-red-600" : lowStock ? "bg-[#e3ac4d]/30 text-[#cc679c]" : "bg-green-500/10 text-green-700"}`}>
                        {noStock ? "Sin stock" : lowStock ? "Stock Bajo" : "Stock OK"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => openEditProduct(product)}
                          className="text-[#5db8d1] hover:text-[#4a9bb8] transition-colors p-1"
                          title="Editar producto"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, product })}
                          className="text-[#cc679c]/60 hover:text-red-500 transition-colors p-1"
                          title="Eliminar producto"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {productModal.isOpen && productModal.item && (
        <div className="fixed inset-0 bg-[#cc679c]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#eceae7] rounded-2xl w-full max-w-md border border-[#f4f3f0] max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-[#f4f3f0] flex items-center justify-between shrink-0">
              <h2 className="text-[#5db8d1] font-bold text-2xl flex items-center gap-2">
                <Package size={24} className="text-[#cc679c]" />
                {productModal.isNew ? "Nuevo Producto" : "Editar Producto"}
              </h2>
              <button onClick={() => setProductModal({ isOpen: false, item: null, isNew: false })} className="text-[#cc679c]/60 hover:text-[#cc679c] transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {[
                { label: "Nombre del producto", field: "name", type: "text", placeholder: "Ej. El Aleph - J.L. Borges" },
                { label: "Código de barras", field: "codbarra", type: "text", placeholder: "Escaneá o ingresá solo números", numeric: true },
              ].map(({ label, field, type, placeholder, numeric }) => (
                <div key={field}>
                  <label className="text-[#cc679c]/80 font-bold text-sm block mb-2">{label}</label>
                  <input
                    type={type}
                    value={productModal.item[field] ?? ""}
                    onChange={(e) => {
                      const val = numeric ? e.target.value.replace(/[^0-9]/g, "") : e.target.value;
                      setProductModal((prev) => ({ ...prev, item: { ...prev.item, [field]: val } }));
                    }}
                    className="w-full bg-white text-[#cc679c] placeholder-[#cc679c]/50 font-bold rounded-xl px-4 py-3 border border-[#f4f3f0] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none shadow-sm transition-all font-mono"
                    placeholder={placeholder}
                    inputMode={numeric ? "numeric" : undefined}
                  />
                </div>
              ))}
              {/* Selector de ícono */}
              <div>
                <label className="text-[#cc679c]/80 font-bold text-sm block mb-2">Ícono del producto</label>
                <div className="flex gap-2">
                  {ICON_OPTIONS.map(({ key, Icon, label }) => {
                    const selected = (productModal.item.icon || "Package") === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        title={label}
                        onClick={() => setProductModal((prev) => ({ ...prev, item: { ...prev.item, icon: key } }))}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition-all ${
                          selected
                            ? "bg-[#cc679c]/10 border-[#cc679c] text-[#cc679c] shadow-sm font-bold"
                            : "bg-white border-[#f4f3f0] text-[#cc679c]/60 font-medium hover:border-[#cc679c]/50"
                        }`}
                      >
                        <Icon size={20} />
                        <span className="text-[10px] leading-tight text-center mt-1">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[#cc679c]/80 font-bold text-sm block mb-2">Categoría</label>
                <select
                  value={productModal.item.categoryId ?? ""}
                  onChange={(e) => setProductModal((prev) => ({
                    ...prev,
                    item: { ...prev.item, categoryId: e.target.value ? Number(e.target.value) : null },
                  }))}
                  className="w-full bg-white text-[#cc679c] font-bold rounded-xl px-4 py-3 border border-[#f4f3f0] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none shadow-sm transition-all"
                >
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[#cc679c]/80 font-bold text-sm">Costo ($)</label>
                    <button
                      type="button"
                      onClick={() => setShowModalAmounts((v) => !v)}
                      title={showModalAmounts ? "Ocultar montos" : "Mostrar montos"}
                      className="text-[#cc679c]/40 hover:text-[#cc679c] transition-colors"
                    >
                      {showModalAmounts ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  </div>
                  {showModalAmounts ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={productModal.item.cost}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, "").replace(/^0+(?=\d)/, "");
                        setProductModal((prev) => ({ ...prev, item: { ...prev.item, cost: val } }));
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      className="w-full bg-white text-[#cc679c] font-bold rounded-xl px-4 py-3 border border-[#f4f3f0] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none shadow-sm transition-all"
                    />
                  ) : (
                    <div
                      onClick={() => setShowModalAmounts(true)}
                      className="w-full bg-white rounded-xl px-4 py-3 border border-[#f4f3f0] shadow-sm cursor-pointer flex items-center"
                    >
                      <span className="text-[#cc679c]/30 tracking-widest font-black select-none">
                        {productModal.item.cost ? "••••" : ""}
                      </span>
                      {!productModal.item.cost && <span className="text-[#cc679c]/30 font-medium text-sm">0</span>}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[#cc679c]/80 font-bold text-sm block mb-2">Precio ($)</label>
                  {showModalAmounts ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={productModal.item.price}
                      readOnly={productModal.item.suggestedPricePercent != null}
                      onChange={(e) => {
                        if (productModal.item.suggestedPricePercent != null) return;
                        const val = e.target.value.replace(/[^0-9.]/g, "").replace(/^0+(?=\d)/, "");
                        setProductModal((prev) => ({ ...prev, item: { ...prev.item, price: val } }));
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      className={`w-full font-bold rounded-xl px-4 py-3 border focus:ring-2 outline-none shadow-sm transition-all ${
                        productModal.item.suggestedPricePercent != null
                          ? "bg-[#cc679c]/5 text-[#cc679c] border-[#cc679c]/30 cursor-not-allowed"
                          : "bg-white text-[#cc679c] border-[#f4f3f0] focus:border-[#cc679c] focus:ring-[#cc679c]/20"
                      }`}
                    />
                  ) : (
                    <div
                      onClick={() => setShowModalAmounts(true)}
                      className={`w-full rounded-xl px-4 py-3 border shadow-sm cursor-pointer flex items-center ${
                        productModal.item.suggestedPricePercent != null
                          ? "bg-[#cc679c]/5 border-[#cc679c]/30"
                          : "bg-white border-[#f4f3f0]"
                      }`}
                    >
                      <span className="text-[#cc679c]/30 tracking-widest font-black select-none">
                        {productModal.item.price ? "••••" : ""}
                      </span>
                      {!productModal.item.price && <span className="text-[#cc679c]/30 font-medium text-sm">0</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Precio sugerido: checkbox 80% fijo + acordeón para el resto */}
              <div className="space-y-2">
                {/* Checkbox fijo 80% */}
                <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all select-none ${
                  productModal.item.suggestedPricePercent === 80
                    ? "bg-[#cc679c]/10 border-[#cc679c]/40"
                    : "bg-[#eceae7] border-[#e5e7eb] hover:border-[#cc679c]/30"
                }`}>
                  <input
                    type="checkbox"
                    checked={productModal.item.suggestedPricePercent === 80}
                    onChange={() => {
                      const isChecked = productModal.item.suggestedPricePercent === 80;
                      setProductModal((prev) => ({
                        ...prev,
                        item: {
                          ...prev.item,
                          suggestedPricePercent: isChecked ? null : 80,
                          ...(isChecked && { price: "" }),
                        },
                      }));
                    }}
                    className="w-4 h-4 accent-[#cc679c] cursor-pointer"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <TrendingUp size={15} className="text-[#e3ac4d]" />
                    <span className="text-[#cc679c] font-bold text-sm">Precio sugerido 80%</span>
                  </div>
                  {productModal.item.suggestedPricePercent === 80 && (
                    <span className="text-[#cc679c]/60 font-bold text-xs">aplicado</span>
                  )}
                </label>

                {/* Acordeón para porcentajes adicionales (excluye 80%) */}
                {suggestedPercents.filter((p) => p !== 80).length > 0 && (
                  <div className="rounded-xl border border-[#e5e7eb] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setPriceAccordionOpen((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-[#eceae7] hover:bg-[#e5e3e0] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <TrendingUp size={16} className="text-[#e3ac4d]" />
                        <span className="text-[#cc679c] font-bold text-sm">
                          {productModal.item.suggestedPricePercent != null && productModal.item.suggestedPricePercent !== 80
                            ? `Precio sugerido: ${productModal.item.suggestedPricePercent}% aplicado`
                            : "Otros porcentajes sugeridos"}
                        </span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-[#cc679c]/60 transition-transform ${priceAccordionOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {priceAccordionOpen && (
                      <div className="px-4 py-3 bg-white flex flex-wrap gap-2">
                        {suggestedPercents.filter((p) => p !== 80).map((pct) => {
                          const isSelected = productModal.item.suggestedPricePercent === pct;
                          return (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => {
                                setProductModal((prev) => ({
                                  ...prev,
                                  item: {
                                    ...prev.item,
                                    suggestedPricePercent: isSelected ? null : pct,
                                    ...(isSelected && { price: "" }),
                                  },
                                }));
                                setPriceAccordionOpen(false);
                              }}
                              className={`px-4 py-1.5 rounded-full font-bold text-sm border transition-all ${
                                isSelected
                                  ? "bg-[#cc679c] text-white border-[#cc679c]"
                                  : "bg-[#f4f3f0] text-[#cc679c] border-[#e5e7eb] hover:border-[#cc679c]/50"
                              }`}
                            >
                              {pct}%{isSelected && " ✓"}
                            </button>
                          );
                        })}
                        {productModal.item.suggestedPricePercent != null && productModal.item.suggestedPricePercent !== 80 && (
                          <button
                            type="button"
                            onClick={() => {
                              setProductModal((prev) => ({
                                ...prev,
                                item: { ...prev.item, suggestedPricePercent: null, price: "" },
                              }));
                              setPriceAccordionOpen(false);
                            }}
                            className="px-4 py-1.5 rounded-full font-bold text-sm border border-red-200 text-red-400 hover:bg-red-50 transition-all"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
              {[{ label: "Stock Actual", field: "stock" }, { label: "Stock Mínimo", field: "minStock" }].map(({ label, field }) => (
                <div key={field}>
                  <label className="text-[#cc679c]/80 font-bold text-sm block mb-2">{label}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={productModal.item[field]}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
                      setProductModal((prev) => ({ ...prev, item: { ...prev.item, [field]: val } }));
                    }}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    className="w-full bg-white text-[#cc679c] font-bold rounded-xl px-4 py-3 border border-[#f4f3f0] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none shadow-sm transition-all"
                  />
                </div>
              ))}
              </div>
            </div>
            <div className="p-6 border-t border-[#f4f3f0] flex gap-4 shrink-0">
              <button onClick={() => setProductModal({ isOpen: false, item: null, isNew: false })} className="flex-1 bg-[#f4f3f0] hover:bg-[#e5e7eb] text-[#cc679c] font-bold py-4 rounded-xl transition-all shadow-sm">Cancelar</button>
              <button onClick={handleSaveProduct} disabled={submitting} className="flex-1 bg-[#cc679c] hover:bg-[#b85889] disabled:bg-[#f4f3f0] disabled:text-[#cc679c]/50 disabled:cursor-not-allowed text-[#eceae7] font-bold py-4 rounded-xl transition-all shadow-md">{submitting ? "Guardando..." : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteModal.isOpen && deleteModal.product && (
        <div className="fixed inset-0 bg-[#cc679c]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#eceae7] rounded-2xl w-full max-w-sm border border-[#f4f3f0] shadow-2xl">
            <div className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <div>
                <h2 className="text-[#5db8d1] text-xl font-bold mb-1">Eliminar producto</h2>
                <p className="text-[#cc679c]/80 font-medium text-sm">
                  ¿Estás seguro que querés eliminar{" "}
                  <span className="text-[#cc679c] font-bold">"{deleteModal.product.name}"</span>?
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, product: null })}
                disabled={deleting}
                className="flex-1 bg-[#f4f3f0] hover:bg-[#e5e7eb] text-[#cc679c] font-bold py-3 rounded-xl transition-all disabled:opacity-50 shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-md"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
