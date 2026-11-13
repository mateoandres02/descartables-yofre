import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api.js";

function normalize(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function CustomerSelect({ value, onChange, disabled = false }) {
  const id = useId();
  const listRef = useRef(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api.get("/customers")
      .then(({ data }) => {
        if (!cancelled) setCustomers(data.filter((customer) => customer.id && customer.isActive !== false && customer.isActive !== 0));
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err.response?.data?.message || "No se pudieron cargar las cuentas corrientes";
        setError(message);
        toast.error(message);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  const term = normalize(query);
  const filtered = customers.filter((customer) =>
    normalize(`${customer.name} ${customer.lastName}`).includes(term)
  );

  useEffect(() => {
    if (open && activeIndex >= 0) {
      listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [open, activeIndex]);

  const showOptions = () => {
    setQuery("");
    setActiveIndex(-1);
    setOpen(true);
  };

  const select = (customer) => {
    onChange(customer);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => {
        if (!filtered.length) return -1;
        if (index < 0) return direction === 1 ? 0 : filtered.length - 1;
        return (index + direction + filtered.length) % filtered.length;
      });
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      event.stopPropagation();
      if (!loading && !error && filtered[activeIndex]) select(filtered[activeIndex]);
    }
  };

  return (
    <div onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <label htmlFor={id} className="text-foreground/80 font-bold text-sm block mb-2">Cliente</label>
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60 pointer-events-none" />
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={open && !loading && !error && filtered[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
          aria-describedby={`${id}-status`}
          disabled={disabled}
          value={value ? `${value.name} ${value.lastName}` : query}
          placeholder="Buscar cliente por nombre..."
          onFocus={showOptions}
          onClick={() => { if (!open) showOptions(); }}
          onChange={(event) => {
            onChange(null);
            setQuery(event.target.value);
            setActiveIndex(-1);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full min-w-0 bg-background text-foreground placeholder-foreground/50 font-bold rounded-lg pl-10 pr-4 py-3 border border-foreground/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
      </div>

      {open && (
        <div className="mt-2 bg-background border border-foreground/15 rounded-lg overflow-hidden shadow-sm">
          {loading ? (
            <p role="status" className="p-3 text-foreground/70 text-sm">Cargando cuentas corrientes...</p>
          ) : error ? (
            <div className="p-3 space-y-2">
              <p role="alert" className="text-foreground/80 text-sm">{error}</p>
              <button type="button" onClick={() => setAttempt((previous) => previous + 1)} className="text-primary font-bold text-sm">Reintentar</button>
            </div>
          ) : filtered.length === 0 ? (
            <p role="status" className="p-3 text-foreground/70 text-sm">
              {customers.length === 0 ? "No hay cuentas corrientes habilitadas." : "No se encontraron clientes con esa búsqueda."}
            </p>
          ) : null}
          <ul id={`${id}-list`} role="listbox" aria-label="Cuentas corrientes" ref={listRef} className="max-h-48 overflow-y-auto overscroll-contain">
            {!loading && !error && filtered.map((customer, index) => (
              <li key={customer.id} role="presentation">
                <button
                  id={`${id}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={value?.id === customer.id}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(customer)}
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-primary/10 ${activeIndex === index ? "bg-primary/10" : ""}`}
                >
                  <span className="block text-foreground font-bold break-words">{customer.name} {customer.lastName}</span>
                  {customer.document && <span className="block text-foreground/70 text-sm">DNI {customer.document}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p id={`${id}-status`} aria-live="polite" className="text-foreground/60 font-medium text-xs mt-2">
        {value ? `Cuenta seleccionada${value.document ? ` · DNI ${value.document}` : ""} · deuda previa $${Number(value.debt || 0).toFixed(2)}` : "Elegí una cuenta del listado para cargar la venta."}
      </p>
    </div>
  );
}
