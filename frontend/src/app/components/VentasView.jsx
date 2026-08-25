import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Lock, Wallet, ShoppingCart, Unlock, X, ScanBarcode } from "lucide-react";
import { ProductCard } from "./ProductCard.jsx";
import { CartSidebar } from "./CartSidebar.jsx";
import { PaymentModal } from "./PaymentModal.jsx";
import { DailyExpenseModal } from "./DailyExpenseModal.jsx";
import { Loader } from "./Loader.jsx";
import { toast } from "sonner";
import api from "../../services/api.js";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner.js";
import { hasPackSale, lineIdFor, packSizeOf, unitsInCartForProduct } from "../../utils/pack.js";
import { ACCOUNT_METHOD_NAME } from "../constants.js";

export function VentasView({ isCajaOpen, onAddTransaction, onSyncCaja, onOpenCaja, role }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [cartItems, setCartItems] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [products, setProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [openingCaja, setOpeningCaja] = useState(false);
  const cartRef = useRef(cartItems);
  cartRef.current = cartItems;

  const fetchProducts = useCallback(() => {
    return api.get("/products").then((pRes) => setProducts(pRes.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/products"),
      api.get("/payment-methods"),
      api.get("/categories"),
    ]).then(([pRes, mRes, cRes]) => {
      setProducts(pRes.data);
      setPaymentMethods(mRes.data);
      setCategories(cRes.data.map((c) => c.name));
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  const allCategories = ["Todos", ...categories];

  const filteredProducts = products.filter((product) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (product.name || "").toLowerCase().includes(term) ||
      (product.codbarra && String(product.codbarra).includes(searchTerm.trim()));
    const matchesCategory = selectedCategory === "Todos" || product.category === selectedCategory;
    return matchesSearch && matchesCategory && product.isAvailable;
  });

  const handleAddToCart = (product, saleMode = "unidad") => {
    const canPack = hasPackSale(product);
    const mode = saleMode === "paquete" && canPack ? "paquete" : "unidad";
    const packSize = packSizeOf(product);
    const unitsEach = mode === "paquete" ? packSize : 1;
    const lineId = lineIdFor(product.id, mode);
    const price = mode === "paquete" ? Number(product.packPrice) : Number(product.price);
    const prev = cartRef.current;
    const remaining = Number(product.stock) - unitsInCartForProduct(prev, product.id);

    if (remaining < unitsEach) {
      toast.error("Sin stock suficiente", {
        description: remaining < packSize && mode === "paquete"
          ? `Quedan ${Math.max(0, remaining)} u. de ${product.name}; un paquete son ${packSize} u.`
          : `Solo hay ${product.stock} unidad${product.stock === 1 ? "" : "es"} de ${product.name}`,
      });
      return;
    }

    const existing = prev.find((item) => item.lineId === lineId);
    const next = existing
      ? prev.map((item) => item.lineId === lineId
        ? { ...item, quantity: item.quantity + 1, stock: product.stock }
        : item)
      : [...prev, {
        lineId,
        id: product.id,
        productId: product.id,
        name: product.name,
        saleMode: mode,
        price,
        unitsPerPack: packSize,
        stock: product.stock,
        quantity: 1,
      }];
    cartRef.current = next;
    setCartItems(next);
    toast.success(mode === "paquete"
      ? `${product.name} (paquete x${packSize}) agregado`
      : `${product.name} agregado al carrito`);
  };

  const handleBarcodeScan = useCallback((code) => {
    const product = products.find(
      (p) => p.codbarra && String(p.codbarra) === String(code) && p.isAvailable
    );
    if (!product) {
      toast.error("Producto no encontrado", { description: `No hay producto con código ${code}` });
      return;
    }
    handleAddToCart(product, "unidad");
  }, [products]);

  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: isCajaOpen && !showPaymentModal && !showExpenseModal && !showOpenModal && !showMobileCart,
  });

  const handleSearchKeyDown = (e) => {
    if (e.key !== "Enter" || !searchTerm.trim()) return;
    const code = searchTerm.trim();
    if (!/^\d+$/.test(code)) return;

    const product = products.find(
      (p) => p.codbarra && String(p.codbarra) === code && p.isAvailable
    );
    if (product) {
      e.preventDefault();
      handleAddToCart(product, "unidad");
      setSearchTerm("");
    }
  };

  const handleUpdateQuantity = (lineId, quantity) => {
    if (quantity <= 0) { handleRemoveItem(lineId); return; }
    const item = cartItems.find((i) => i.lineId === lineId);
    if (!item) return;
    const others = unitsInCartForProduct(cartItems, item.productId ?? item.id, lineId);
    const unitsEach = item.saleMode === "paquete" ? packSizeOf(item) : 1;
    if (others + quantity * unitsEach > item.stock) {
      toast.error("Sin stock suficiente", { description: `Solo hay ${item.stock} unidad${item.stock === 1 ? "" : "es"} de ${item.name}` });
      return;
    }
    setCartItems((prev) => prev.map((i) => i.lineId === lineId ? { ...i, quantity } : i));
  };

  const handleRemoveItem = (lineId) => {
    setCartItems((prev) => prev.filter((item) => item.lineId !== lineId));
    toast.info("Producto eliminado del carrito");
  };

  const handleConfirmPayment = async (payments, meta = {}) => {
    const finalTotal = payments.reduce((sum, p) => sum + p.finalAmount, 0);
    const accountTotal = payments
      .filter((p) => p.type === ACCOUNT_METHOD_NAME)
      .reduce((sum, p) => sum + p.finalAmount, 0);
    const transaction = {
      total: finalTotal,
      customerId: meta.customerId ?? null,
      payments: payments.map((p) => ({
        type: p.type,
        amount: p.finalAmount,
        baseAmount: p.baseAmount,
        surchargePercent: p.surchargePercent,
      })),
      items: cartItems.map((item) => ({
        productId: item.productId ?? item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity,
        saleMode: item.saleMode || "unidad",
        unitsPerPack: item.unitsPerPack || 1,
      })),
    };

    try {
      await onAddTransaction(transaction);
      toast.success("Venta procesada exitosamente", {
        description: accountTotal > 0
          ? `Cobrado ahora: $${(finalTotal - accountTotal).toFixed(2)} · A cuenta: $${accountTotal.toFixed(2)}`
          : `Total cobrado: $${finalTotal.toFixed(2)}`,
      });
      setCartItems([]);
      setShowPaymentModal(false);
      fetchProducts();
    } catch (err) {
      toast.error("No se pudo registrar la venta", { description: err.response?.data?.message || err.message });
      throw err;
    }
  };

  const handleConfirmOpen = async () => {
    if (openingCaja) return;
    setOpeningCaja(true);
    try {
      await onOpenCaja(Number(openingAmount) || 0);
      setShowOpenModal(false);
      setOpeningAmount("");
      toast.success("Caja abierta exitosamente");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al abrir la caja");
    } finally {
      setOpeningCaja(false);
    }
  };

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleOpenCheckout = () => {
    setShowMobileCart(false);
    setShowPaymentModal(true);
  };

  const handleDailyExpense = async (expenseData) => {
    try {
      await api.post("/daily-expenses", expenseData);
      toast.success("Gasto registrado correctamente");
      setShowExpenseModal(false);
    } catch (err) {
      toast.error("Error al registrar el gasto", { description: err.response?.data?.message || err.message });
      throw err;
    }
  };

  return (
    <div className="flex-1 flex relative overflow-hidden">
      {loading && <Loader />}
      {!isCajaOpen && (
        <div className="absolute inset-0 z-50 backdrop-blur-md bg-background/60 flex items-center justify-center p-4">
          <div className="bg-surface p-6 md:p-8 rounded-2xl border border-foreground/15 text-center max-w-sm md:max-w-md shadow-2xl w-full">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={28} />
            </div>
            <h2 className="text-primary text-xl md:text-2xl font-bold mb-2">Caja Cerrada</h2>
            {role === "admin" ? (
              <>
                <p className="text-foreground/80 text-sm md:text-base mb-4">Abrí la caja para comenzar a registrar ventas.</p>
                <button
                  onClick={() => setShowOpenModal(true)}
                  className="w-full bg-success hover:bg-foreground text-background font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Unlock size={18} /> Abrir Caja
                </button>
              </>
            ) : (
              <p className="text-foreground/80 text-sm md:text-base">Pedile al administrador que abra la caja.</p>
            )}
          </div>
        </div>
      )}

      {/* Área principal de productos */}
      <div className="flex-1 p-4 pb-24 md:p-8 md:pb-8 overflow-y-auto">
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6 gap-3">
            <h1 className="text-foreground font-bold text-2xl md:text-4xl">Punto de Venta</h1>
            {isCajaOpen && (
              <button
                onClick={() => setShowExpenseModal(true)}
                className="bg-primary hover:bg-secondary text-background font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors text-sm md:text-base self-start sm:self-auto shadow-sm"
              >
                <Wallet size={18} />
                Gastos / Extracción
              </button>
            )}
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/60" size={20} />
            <input
              type="text"
              placeholder="Buscar o escanear código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-surface text-foreground placeholder-foreground/60 rounded-xl pl-12 pr-12 py-3 md:py-4 border border-foreground/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
            />
            <ScanBarcode className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40" size={20} title="Pistola lectora activa" />
          </div>
          {isCajaOpen && (
            <p className="text-foreground/60 text-xs font-medium mb-4 -mt-2">
              Escaneá un código con la pistola o ingresalo y presioná Enter para agregar al carrito.
            </p>
          )}

          {/* Filtro de categorías — scroll horizontal en móvil */}
          <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 md:pb-0 md:flex-wrap scrollbar-hide">
            {allCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 md:px-6 py-2 md:py-3 rounded-lg transition-all text-sm whitespace-nowrap shrink-0 ${
                  selectedCategory === category ? "bg-secondary text-background shadow-md font-bold" : "bg-surface text-foreground/80 hover:bg-surface hover:text-foreground font-medium"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {filteredProducts.length === 0 && (
            <p className="text-foreground/60 font-medium text-center py-12">No hay productos disponibles</p>
          )}
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
          ))}
        </div>
      </div>

      {/* Botón flotante del carrito — solo móvil */}
      <div className="fixed bottom-20 right-4 md:hidden z-30">
        <button
          onClick={() => setShowMobileCart(true)}
          className="bg-secondary hover:bg-foreground text-background h-14 px-5 rounded-full flex items-center gap-2.5 shadow-xl shadow-foreground/30 transition-all active:scale-95"
        >
          <ShoppingCart size={20} />
          {totalCartItems > 0 && (
            <span className="bg-primary text-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold leading-none">
              {totalCartItems}
            </span>
          )}
          <span className="font-medium">${total.toFixed(2)}</span>
        </button>
      </div>

      <CartSidebar
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleOpenCheckout}
        isMobileOpen={showMobileCart}
        onMobileClose={() => setShowMobileCart(false)}
      />

      {showPaymentModal && paymentMethods.length > 0 && (
        <PaymentModal
          total={total}
          paymentMethods={paymentMethods}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={handleConfirmPayment}
        />
      )}
      {showPaymentModal && paymentMethods.length === 0 && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md border border-foreground/15 p-8 text-center shadow-2xl">
            <p className="text-foreground text-xl mb-4 font-bold">No hay métodos de pago configurados</p>
            <p className="text-foreground/70 mb-6 font-medium">Configurá al menos un método de pago en la sección Configuración.</p>
            <button onClick={() => setShowPaymentModal(false)} className="bg-secondary hover:bg-foreground text-background px-6 py-3 rounded-xl font-bold">Cerrar</button>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <DailyExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSubmit={handleDailyExpense}
        />
      )}

      {showOpenModal && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-background rounded-2xl w-full max-w-md border border-surface shadow-2xl">
            <div className="p-6 border-b border-surface flex items-center justify-between">
              <h2 className="text-primary font-bold text-2xl flex items-center gap-2">
                <Unlock size={24} className="text-success" /> Abrir Caja
              </h2>
              <button onClick={() => setShowOpenModal(false)} className="text-foreground/50 hover:text-foreground transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <label className="text-foreground/80 font-medium text-sm block">Monto inicial en caja (Cambio)</label>
              <input
                type="number"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-full bg-surface text-foreground rounded-xl px-4 py-4 border border-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-bold shadow-sm transition-all"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div className="p-6 border-t border-surface flex gap-4">
              <button onClick={() => setShowOpenModal(false)} className="flex-1 bg-surface hover:bg-surface text-foreground font-bold py-4 rounded-xl transition-all shadow-sm">
                Cancelar
              </button>
              <button onClick={handleConfirmOpen} disabled={openingCaja} className="flex-1 bg-success hover:bg-foreground disabled:bg-success/40 text-background font-bold py-4 rounded-xl transition-all shadow-md">
                {openingCaja ? "Abriendo..." : "Confirmar Apertura"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
