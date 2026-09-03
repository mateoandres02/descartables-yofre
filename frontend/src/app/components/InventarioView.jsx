import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Plus, Edit2, Trash2, AlertTriangle, X, Package, BookOpen, Notebook, PenSquare, BookCopy, ScanBarcode } from "lucide-react";
import { Loader } from "./Loader.jsx";
import { toast } from "sonner";
import api from "../../services/api.js";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner.js";
import { formatStock, hasPackSale, packTypeLabel } from "../../utils/pack.js";
import { formatCatalogPrice, roundPriceInput } from "../../utils/price.js";
import { PaginationBar, paginate, byNameEs } from "./PaginationBar.jsx";

const ICON_OPTIONS = [
  { key: "BookOpen",  Icon: BookOpen,  label: "Libro"          },
  { key: "Notebook",  Icon: Notebook,  label: "Cuaderno"       },
  { key: "PenSquare", Icon: PenSquare, label: "Útil escolar"   },
  { key: "BookCopy",  Icon: BookCopy,  label: "Colección"      },
  { key: "Package", Icon: Package, label: "Genérico"       },
];

const EMPTY_PRODUCT = { name: "", codbarra: "", price: "", cost: "", categoryId: null, priceGroupId: null, stock: "", minStock: "", icon: "Package", unitsPerPack: "", packPrice: "", packTypeId: null, priceTiers: [] };

function toModalItem(product) {
  return {
    ...product,
    codbarra: product.codbarra || "",
    price: String(product.price),
    cost: String(product.cost ?? ""),
    stock: String(product.stock),
    minStock: String(product.minStock),
    icon: product.icon || "Package",
    priceGroupId: product.priceGroupId ?? null,
    packTypeId: product.packTypeId ?? null,
    unitsPerPack: Number(product.unitsPerPack) > 1 ? String(product.unitsPerPack) : "",
    packPrice: product.packPrice != null && product.packPrice !== "" ? String(product.packPrice) : "",
    priceTiers: (product.priceTiers || []).map((t) => ({ quantity: String(t.quantity), price: String(t.price) })),
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAllLowStock, setShowAllLowStock] = useState(false);
  const [brands, setBrands] = useState([]);
  const [collections, setCollections] = useState([]);
  const [packTypes, setPackTypes] = useState([]);
  const [groupFilter, setGroupFilter] = useState("todos");
  const [selectedIds, setSelectedIds] = useState([]);
  const [assignModal, setAssignModal] = useState(null);
  const [page, setPage] = useState(1);

  async function fetchData() {
    try {
      const [pRes, cRes, bRes, colRes, packRes] = await Promise.all([
        api.get("/products"),
        api.get("/categories"),
        api.get("/price-groups", { params: { type: "proveedor" } }),
        api.get("/price-groups", { params: { type: "coleccion" } }),
        api.get("/pack-types"),
      ]);
      setInventory(pRes.data);
      setCategories(cRes.data);
      setBrands(bRes.data);
      setCollections(colRes.data);
      setPackTypes(packRes.data);
    } catch { toast.error("Error al cargar datos"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => byNameEs(a.name, b.name)),
    [categories]
  );
  const sortedBrands = useMemo(
    () => [...brands].sort((a, b) => byNameEs(a.name, b.name)),
    [brands]
  );
  const sortedCollections = useMemo(
    () => [...collections].sort((a, b) => byNameEs(a.name, b.name)),
    [collections]
  );

  const filteredInventory = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const code = searchTerm.trim();
    return inventory
      .filter((p) => {
        const matchesSearch =
          (p.name || "").toLowerCase().includes(term) ||
          (p.category || "").toLowerCase().includes(term) ||
          (p.codbarra && String(p.codbarra).includes(code)) ||
          (p.priceGroupName || "").toLowerCase().includes(term);
        const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
        const matchesGroup =
          groupFilter === "todos" ||
          (groupFilter === "sin-grupo" && !p.priceGroupId) ||
          (groupFilter === "proveedores" && p.priceGroupType === "proveedor") ||
          (groupFilter === "colecciones" && p.priceGroupType === "coleccion") ||
          String(p.priceGroupId) === String(groupFilter);
        return matchesSearch && matchesCategory && matchesGroup;
      })
      .sort((a, b) => byNameEs(a.name, b.name));
  }, [inventory, searchTerm, selectedCategory, groupFilter]);

  useEffect(() => { setPage(1); }, [searchTerm, selectedCategory, groupFilter]);

  const paged = paginate(filteredInventory, page);
  const lowStockItems = useMemo(
    () => inventory.filter((p) => p.stock <= p.minStock).sort((a, b) => byNameEs(a.name, b.name)),
    [inventory]
  );

  const handleAddProduct = () => {
    setProductModal({
      isOpen: true,
      item: { ...EMPTY_PRODUCT, categoryId: sortedCategories[0]?.id ?? null },
      isNew: true,
    });
  };

  const inventoryByBarcode = useMemo(() => {
    const map = new Map();
    for (const p of inventory) {
      const code = p.codbarra && String(p.codbarra);
      if (code && !map.has(code)) map.set(code, p);
    }
    return map;
  }, [inventory]);

  const openNewProductWithBarcode = useCallback((code) => {
    setProductModal({
      isOpen: true,
      item: { ...EMPTY_PRODUCT, codbarra: code, categoryId: sortedCategories[0]?.id ?? null },
      isNew: true,
    });
    setSearchTerm("");
    toast.info("Código no registrado", { description: "Completá los datos del nuevo producto" });
  }, [sortedCategories]);

  const openEditProduct = useCallback((product) => {
    setProductModal({ isOpen: true, item: toModalItem(product), isNew: false });
    setSearchTerm("");
    toast.success(`Producto encontrado: ${product.name}`);
  }, []);

  const findProductByBarcode = useCallback((code) => {
    return inventoryByBarcode.get(String(code));
  }, [inventoryByBarcode]);

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
        priceGroupId: productModal.item.priceGroupId || null,
        packTypeId: productModal.item.packTypeId || null,
        unitsPerPack: parseInt(productModal.item.unitsPerPack, 10) || 1,
        packPrice: productModal.item.packPrice === "" || productModal.item.packPrice == null
          ? null
          : parseFloat(productModal.item.packPrice),
        priceTiers: (productModal.item.priceTiers || [])
          .map((t) => ({ quantity: parseInt(t.quantity, 10), price: parseFloat(t.price) }))
          .filter((t) => t.quantity >= 2 && Number.isFinite(t.price) && t.price >= 0),
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

  const toggleSelected = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const allVisibleSelected = paged.slice.length > 0 && paged.slice.every((p) => selectedIds.includes(p.id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visible = new Set(paged.slice.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !visible.has(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...paged.slice.map((p) => p.id)])]);
    }
  };

  const handleBulkAssign = async (priceGroupId) => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      await api.post("/products/bulk-assign", { productIds: selectedIds, priceGroupId });
      toast.success(priceGroupId ? `Asignados ${selectedIds.length} productos` : "Grupo quitado");
      setSelectedIds([]);
      setAssignModal(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al asignar");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBrandId = brands.some((b) => b.id === Number(productModal.item?.priceGroupId))
    ? Number(productModal.item.priceGroupId)
    : "";
  const selectedCollectionId = collections.some((c) => c.id === Number(productModal.item?.priceGroupId))
    ? Number(productModal.item.priceGroupId)
    : "";

  const categoryNames = sortedCategories.map((c) => c.name);


  return (
    <div className="flex-1 p-4 pb-20 md:p-8 overflow-y-auto relative">
      {loading && <Loader />}
      <div className="mb-6 md:mb-8">
        <h1 className="text-foreground font-bold text-2xl md:text-4xl mb-1 md:mb-2">Gestión de Inventario</h1>
        <p className="text-foreground/80 font-medium text-sm">Controlá tu stock y productos</p>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-primary/20 border border-primary/40 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-foreground flex-shrink-0" size={24} />
            <div className="flex-1">
              <h3 className="text-foreground font-bold mb-2">Alerta de Stock Bajo</h3>
              <p className="text-foreground/80 font-medium text-sm mb-3">{lowStockItems.length} productos en su límite mínimo o por debajo.</p>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                {(showAllLowStock ? lowStockItems : lowStockItems.slice(0, 5)).map((item) => (
                  <span key={item.id} className="bg-primary text-foreground font-bold px-3 py-1 rounded-full text-sm shadow-sm">
                    {item.name}: {item.stock} unidades
                  </span>
                ))}
              </div>
              {lowStockItems.length > 5 && (
                <button
                  onClick={() => setShowAllLowStock((v) => !v)}
                  className="mt-3 text-foreground font-bold text-sm hover:underline"
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
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/60" size={20} />
          <input
            type="text"
            placeholder="Buscar o escanear código de barras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full bg-surface text-foreground placeholder-foreground/60 font-medium rounded-xl pl-12 pr-12 py-3 md:py-4 border border-foreground/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
          <ScanBarcode className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40" size={20} title="Escaneá para abrir edición" />
        </div>
        <button onClick={handleAddProduct} className="bg-secondary hover:brightness-125 text-foreground font-bold px-5 py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm md:text-base shrink-0 shadow-md shadow-secondary/20">
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div>
          <label className="text-foreground/80 font-bold text-sm block mb-2">Categoría</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-surface text-foreground font-bold rounded-xl px-4 py-3 border border-foreground/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
          >
            <option value="Todos">Todas las categorías</option>
            {categoryNames.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-foreground/80 font-bold text-sm block mb-2">Proveedor / Colección</label>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="w-full bg-surface text-foreground font-bold rounded-xl px-4 py-3 border border-foreground/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
          >
            <option value="todos">Todos los grupos</option>
            <option value="sin-grupo">Sin proveedor/colección</option>
            <option value="proveedores">Solo proveedores</option>
            <option value="colecciones">Solo colecciones</option>
            {sortedBrands.length > 0 && (
              <optgroup label="Proveedores">
                {sortedBrands.map((b) => (
                  <option key={b.id} value={String(b.id)}>{b.name}</option>
                ))}
              </optgroup>
            )}
            {sortedCollections.length > 0 && (
              <optgroup label="Colecciones">
                {sortedCollections.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 bg-secondary text-foreground rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 shadow-md">
          <span className="font-bold text-sm flex-1">{selectedIds.length} productos seleccionados</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setAssignModal("proveedor")} className="bg-foreground/15 hover:bg-foreground/25 font-bold text-xs px-3 py-2 rounded-lg">Asignar proveedor</button>
            <button onClick={() => setAssignModal("coleccion")} className="bg-foreground/15 hover:bg-foreground/25 font-bold text-xs px-3 py-2 rounded-lg">Asignar colección</button>
            <button onClick={() => handleBulkAssign(null)} className="bg-foreground/15 hover:bg-foreground/25 font-bold text-xs px-3 py-2 rounded-lg">Quitar grupo</button>
            <button onClick={() => setSelectedIds([])} className="bg-foreground/15 hover:bg-foreground/25 font-bold text-xs px-3 py-2 rounded-lg">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-xl overflow-hidden border border-foreground/15 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px]">
            <thead>
              <tr className="border-b border-foreground/15">
                <th className="p-4 w-10">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} className="accent-primary w-4 h-4" />
                </th>
                <th className="text-left text-foreground/80 font-bold p-4">Producto</th>
                <th className="text-center text-foreground/80 font-bold p-4 whitespace-nowrap">Acciones</th>
                <th className="text-left text-foreground/80 font-bold p-4 whitespace-nowrap">Cód. Barras</th>
                <th className="text-left text-foreground/80 font-bold p-4">Categoría</th>
                <th className="text-left text-foreground/80 font-bold p-4 whitespace-nowrap">Proveedor / Colección</th>
                <th className="text-left text-foreground/80 font-bold p-4">Costo</th>
                <th className="text-left text-foreground/80 font-bold p-4">Precio</th>
                <th className="text-left text-foreground/80 font-bold p-4">Stock</th>
                <th className="text-left text-foreground/80 font-bold p-4 whitespace-nowrap">Min. Stock</th>
                <th className="text-left text-foreground/80 font-bold p-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {paged.slice.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-foreground/60 font-medium">
                    No hay productos para mostrar
                  </td>
                </tr>
              )}
              {paged.slice.map((product) => {
                const noStock = product.stock === 0;
                const lowStock = !noStock && product.stock <= product.minStock;
                return (
                  <tr key={product.id} className="border-b border-foreground/15 hover:bg-background/50 transition-colors">
                    <td className="p-4">
                      <input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => toggleSelected(product.id)} className="accent-primary w-4 h-4" />
                    </td>
                    <td className="p-4 max-w-[220px]"><span className="text-foreground font-bold block truncate" title={product.name}>{product.name}</span></td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditProduct(product)}
                          className="text-primary hover:text-secondary transition-colors p-1"
                          title="Editar producto"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, product })}
                          className="text-foreground/60 hover:text-red-500 transition-colors p-1"
                          title="Eliminar producto"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="text-foreground/80 font-medium font-mono text-sm">
                        {product.codbarra || "—"}
                      </span>
                    </td>
                    <td className="p-4 max-w-[140px]"><span className="text-foreground/80 font-medium block truncate">{product.category}</span></td>
                    <td className="p-4 whitespace-nowrap">
                      {product.priceGroupName
                        ? <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${product.priceGroupType === "proveedor" ? "bg-primary/15 text-foreground" : "bg-primary/15 text-primary"}`}>{product.priceGroupName}</span>
                        : <span className="text-foreground/40 font-medium text-sm">Sin grupo</span>}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="text-foreground/80 font-medium">${Number(product.cost || 0).toFixed(2)}</span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="text-foreground font-black block">${formatCatalogPrice(product.price)}</span>
                      {hasPackSale(product) && (
                        <span className="text-foreground/60 font-medium text-xs">{packTypeLabel(product)} x{product.unitsPerPack} ${formatCatalogPrice(product.packPrice)}</span>
                      )}
                      {Array.isArray(product.priceTiers) && product.priceTiers.length > 0 && (
                        <span className="text-foreground/50 font-medium text-[11px] block">
                          {product.priceTiers.map((t) => `x${t.quantity}`).join(" · ")}
                        </span>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="text-foreground font-bold">{formatStock(product.stock, product.unitsPerPack, packTypeLabel(product))}</span>
                    </td>
                    <td className="p-4 whitespace-nowrap"><span className="text-foreground/80 font-medium">{product.minStock} u.</span></td>
                    <td className="p-3">
                      <span
                        title={noStock ? "Sin stock" : lowStock ? "Stock bajo" : "Stock OK"}
                        className={`inline-flex items-center justify-center whitespace-nowrap shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold leading-none ${noStock ? "bg-red-500/15 text-red-600" : lowStock ? "bg-primary/30 text-foreground" : "bg-success/10 text-success"}`}
                      >
                        {noStock ? "Sin stock" : lowStock ? "Bajo" : "OK"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {paged.total > 0 && (
          <div className="px-4 border-t border-foreground/15">
            <PaginationBar
              page={paged.page}
              pageCount={paged.pageCount}
              total={paged.total}
              start={paged.start}
              end={paged.end}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {productModal.isOpen && productModal.item && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl w-full max-w-md border border-surface max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-surface flex items-center justify-between shrink-0">
              <h2 className="text-primary font-bold text-2xl flex items-center gap-2">
                <Package size={24} className="text-foreground" />
                {productModal.isNew ? "Nuevo Producto" : "Editar Producto"}
              </h2>
              <button onClick={() => setProductModal({ isOpen: false, item: null, isNew: false })} className="text-foreground/60 hover:text-foreground transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {[
                { label: "Nombre del producto", field: "name", type: "text", placeholder: "Ej. El Aleph - J.L. Borges" },
                { label: "Código de barras", field: "codbarra", type: "text", placeholder: "Escaneá o ingresá solo números", numeric: true },
              ].map(({ label, field, type, placeholder, numeric }) => (
                <div key={field}>
                  <label className="text-foreground/80 font-bold text-sm block mb-2">{label}</label>
                  <input
                    type={type}
                    value={productModal.item[field] ?? ""}
                    onChange={(e) => {
                      const val = numeric ? e.target.value.replace(/[^0-9]/g, "") : e.target.value;
                      setProductModal((prev) => ({ ...prev, item: { ...prev.item, [field]: val } }));
                    }}
                    className="w-full bg-surface text-foreground placeholder-foreground/50 font-bold rounded-xl px-4 py-3 border border-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none shadow-sm transition-all font-mono"
                    placeholder={placeholder}
                    inputMode={numeric ? "numeric" : undefined}
                  />
                </div>
              ))}
              {/* Selector de ícono */}
              <div>
                <label className="text-foreground/80 font-bold text-sm block mb-2">Ícono del producto</label>
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
                            ? "bg-primary/10 border-primary text-foreground shadow-sm font-bold"
                            : "bg-surface border-surface text-foreground/60 font-medium hover:border-primary/50"
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
                <label className="text-foreground/80 font-bold text-sm block mb-2">Categoría</label>
                <select
                  value={productModal.item.categoryId ?? ""}
                  onChange={(e) => setProductModal((prev) => ({
                    ...prev,
                    item: { ...prev.item, categoryId: e.target.value ? Number(e.target.value) : null },
                  }))}
                  className="w-full bg-surface text-foreground font-bold rounded-xl px-4 py-3 border border-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none shadow-sm transition-all"
                >
                  {sortedCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-foreground/80 font-bold text-sm block mb-2">Proveedor</label>
                  <select
                    value={selectedBrandId}
                    onChange={(e) => setProductModal((prev) => ({
                      ...prev,
                      item: { ...prev.item, priceGroupId: e.target.value ? Number(e.target.value) : null },
                    }))}
                    className="w-full bg-surface text-foreground font-bold rounded-xl px-4 py-3 border border-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none shadow-sm transition-all"
                  >
                    <option value="">Sin proveedor</option>
                    {sortedBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-foreground/80 font-bold text-sm block mb-2">Colección</label>
                  <select
                    value={selectedCollectionId}
                    disabled={Boolean(selectedBrandId)}
                    onChange={(e) => setProductModal((prev) => ({
                      ...prev,
                      item: { ...prev.item, priceGroupId: e.target.value ? Number(e.target.value) : null },
                    }))}
                    className="w-full bg-surface text-foreground font-bold rounded-xl px-4 py-3 border border-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none shadow-sm transition-all disabled:opacity-50"
                  >
                    <option value="">{selectedBrandId ? "Usá proveedor o colección, no ambas" : "Sin colección"}</option>
                    {sortedCollections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-foreground/80 font-bold text-sm block mb-2">Costo ($)</label>
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
                    className="w-full bg-surface text-foreground font-bold rounded-xl px-4 py-3 border border-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none shadow-sm transition-all"
                  />
                </div>
                <div>
                  <label className="text-foreground/80 font-bold text-sm block mb-2">Precio unidad ($)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={productModal.item.price}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, "").replace(/^0+(?=\d)/, "");
                      setProductModal((prev) => ({ ...prev, item: { ...prev.item, price: val } }));
                    }}
                    onBlur={(e) => setProductModal((prev) => ({ ...prev, item: { ...prev.item, price: roundPriceInput(e.target.value) } }))}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    className="w-full bg-surface text-foreground font-bold rounded-xl px-4 py-3 border border-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none shadow-sm transition-all"
                  />
                </div>
                <p className="col-span-2 text-foreground/60 font-medium text-xs">
                  Los precios de venta se redondean hacia arriba a la próxima decena y se guardan sin centavos. El costo conserva el valor exacto ingresado.
                </p>
              </div>
              <div className="rounded-xl border border-foreground/15 bg-background/60 p-4 space-y-4">
                <div>
                  <p className="text-foreground font-bold text-sm">Venta por bulto</p>
                  <p className="text-foreground/60 font-medium text-xs mt-1">
                    El stock siempre se cuenta en unidades. Si vendés una caja de 100, elegí el tipo (caja, paquete, rollo...) y el precio de ese bulto.
                  </p>
                </div>
                <div>
                  <label className="text-foreground/80 font-bold text-sm block mb-2">Tipo de bulto</label>
                  <select
                    value={productModal.item.packTypeId ?? ""}
                    onChange={(e) => setProductModal((prev) => ({
                      ...prev,
                      item: { ...prev.item, packTypeId: e.target.value ? Number(e.target.value) : null },
                    }))}
                    className="w-full bg-surface text-foreground font-bold rounded-xl px-4 py-3 border border-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none shadow-sm transition-all"
                  >
                    <option value="">Sin tipo (se muestra como Paquete)</option>
                    {packTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-foreground/80 font-bold text-sm block mb-2">Unidades por bulto</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={productModal.item.unitsPerPack ?? ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
                        setProductModal((prev) => ({ ...prev, item: { ...prev.item, unitsPerPack: val } }));
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="1"
                      className="w-full bg-surface text-foreground font-bold rounded-xl px-4 py-3 border border-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none shadow-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-foreground/80 font-bold text-sm block mb-2">Precio bulto ($)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={productModal.item.packPrice ?? ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, "").replace(/^0+(?=\d)/, "");
                        setProductModal((prev) => ({ ...prev, item: { ...prev.item, packPrice: val } }));
                      }}
                      onBlur={(e) => setProductModal((prev) => ({ ...prev, item: { ...prev.item, packPrice: roundPriceInput(e.target.value) } }))}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      disabled={!(parseInt(productModal.item.unitsPerPack, 10) > 1)}
                      className="w-full bg-surface text-foreground font-bold rounded-xl px-4 py-3 border border-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none shadow-sm transition-all disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-foreground/15 bg-background/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-foreground font-bold text-sm">Precios por cantidad</p>
                    <p className="text-foreground/60 font-medium text-xs mt-1">
                      Como en la lista: venta por 10, 25, 100 o cualquier número.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProductModal((prev) => ({
                      ...prev,
                      item: { ...prev.item, priceTiers: [...(prev.item.priceTiers || []), { quantity: "", price: "" }] },
                    }))}
                    className="shrink-0 bg-secondary text-foreground font-bold text-xs px-3 py-2 rounded-lg"
                  >
                    + Cantidad
                  </button>
                </div>
                {(productModal.item.priceTiers || []).map((tier, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                    <div>
                      <label className="text-foreground/80 font-bold text-xs block mb-1">Cantidad</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={tier.quantity}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
                          setProductModal((prev) => {
                            const next = [...(prev.item.priceTiers || [])];
                            next[idx] = { ...next[idx], quantity: val };
                            return { ...prev, item: { ...prev.item, priceTiers: next } };
                          });
                        }}
                        placeholder="10"
                        className="w-full bg-surface text-foreground font-bold rounded-xl px-3 py-2.5 border border-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-foreground/80 font-bold text-xs block mb-1">Precio ($)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={tier.price}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, "").replace(/^0+(?=\d)/, "");
                          setProductModal((prev) => {
                            const next = [...(prev.item.priceTiers || [])];
                            next[idx] = { ...next[idx], price: val };
                            return { ...prev, item: { ...prev.item, priceTiers: next } };
                          });
                        }}
                        onBlur={(e) => setProductModal((prev) => {
                          const next = [...(prev.item.priceTiers || [])];
                          next[idx] = { ...next[idx], price: roundPriceInput(e.target.value) };
                          return { ...prev, item: { ...prev.item, priceTiers: next } };
                        })}
                        placeholder="0"
                        className="w-full bg-surface text-foreground font-bold rounded-xl px-3 py-2.5 border border-surface focus:border-primary outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setProductModal((prev) => ({
                        ...prev,
                        item: { ...prev.item, priceTiers: (prev.item.priceTiers || []).filter((_, i) => i !== idx) },
                      }))}
                      className="h-10 w-10 flex items-center justify-center text-foreground/50 hover:text-red-500"
                      title="Quitar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
              {[{ label: "Stock actual (unidades)", field: "stock" }, { label: "Stock mínimo (unidades)", field: "minStock" }].map(({ label, field }) => (
                <div key={field}>
                  <label className="text-foreground/80 font-bold text-sm block mb-2">{label}</label>
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
                    className="w-full bg-surface text-foreground font-bold rounded-xl px-4 py-3 border border-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none shadow-sm transition-all"
                  />
                </div>
              ))}
              </div>
              {parseInt(productModal.item.unitsPerPack, 10) > 1 && (
                <p className="text-foreground/60 font-medium text-xs -mt-2">
                  Con este stock: {formatStock(
                    productModal.item.stock,
                    productModal.item.unitsPerPack,
                    packTypes.find((t) => t.id === Number(productModal.item.packTypeId))?.name
                  )}
                </p>
              )}
            </div>
            <div className="p-6 border-t border-surface flex gap-4 shrink-0">
              <button onClick={() => setProductModal({ isOpen: false, item: null, isNew: false })} className="flex-1 bg-surface hover:bg-surface text-foreground font-bold py-4 rounded-xl transition-all shadow-sm">Cancelar</button>
              <button onClick={handleSaveProduct} disabled={submitting} className="flex-1 bg-secondary hover:brightness-125 disabled:bg-surface disabled:text-foreground/50 disabled:cursor-not-allowed text-foreground font-bold py-4 rounded-xl transition-all shadow-md">{submitting ? "Guardando..." : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteModal.isOpen && deleteModal.product && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl w-full max-w-sm border border-surface shadow-2xl">
            <div className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <div>
                <h2 className="text-primary text-xl font-bold mb-1">Eliminar producto</h2>
                <p className="text-foreground/80 font-medium text-sm">
                  ¿Estás seguro que querés eliminar{" "}
                  <span className="text-foreground font-bold">"{deleteModal.product.name}"</span>?
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, product: null })}
                disabled={deleting}
                className="flex-1 bg-surface hover:bg-surface text-foreground font-bold py-3 rounded-xl transition-all disabled:opacity-50 shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-foreground font-bold py-3 rounded-xl transition-all shadow-md"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {assignModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl w-full max-w-md border border-surface shadow-2xl">
            <div className="p-6 border-b border-surface flex items-center justify-between">
              <h2 className="text-primary font-bold text-xl">
                Asignar {assignModal === "proveedor" ? "proveedor" : "colección"}
              </h2>
              <button onClick={() => setAssignModal(null)} className="text-foreground/60 hover:text-foreground"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-2 max-h-72 overflow-y-auto">
              {(assignModal === "proveedor" ? sortedBrands : sortedCollections).length === 0 && (
                <p className="text-foreground/60 font-medium text-sm">Creá {assignModal === "proveedor" ? "proveedores" : "colecciones"} en Configuración.</p>
              )}
              {(assignModal === "proveedor" ? sortedBrands : sortedCollections).map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleBulkAssign(group.id)}
                  disabled={submitting}
                  className="w-full text-left bg-surface hover:bg-surface text-foreground font-bold px-4 py-3 rounded-xl border border-foreground/15 transition-colors"
                >
                  {group.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
