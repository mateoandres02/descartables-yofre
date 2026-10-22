import logoUrl from "../img/logo-descartables.jpeg";

const DEFAULT_PRINTER = "Impresora predeterminada de Windows";
let queue = Promise.resolve();

export class ThermalPrinterError extends Error {}

export function getSelectedPrinter() { return DEFAULT_PRINTER; }
export function setSelectedPrinter() {}

export async function getPrinterStatus() {
  return { connected: typeof window.print === "function", printers: [DEFAULT_PRINTER], selected: DEFAULT_PRINTER, selectedAvailable: true };
}

const money = (value) => `$${Number(value || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

function row(label, value, className = "") {
  const node = element("div", `ticket-row ${className}`.trim());
  node.append(element("span", "", label), element("span", "", value));
  return node;
}

async function createTicket(transaction) {
  const ticket = element("section", "yofre-print-ticket");
  ticket.id = "yofre-print-ticket";
  const logo = element("img", "ticket-logo");
  logo.src = logoUrl;
  logo.alt = "Descartables Yofre";
  ticket.append(logo, element("h1", "ticket-title", "DESCARTABLES YOFRE"));
  ticket.append(element("p", "ticket-center", `Fecha: ${transaction.date || "-"}  ${transaction.time || ""}`));
  ticket.append(element("p", "ticket-center", `Venta #${transaction.id || "-"}`), element("div", "ticket-separator"));

  const items = transaction.items || [];
  for (const item of items) {
    const product = element("div", "ticket-product");
    product.append(element("div", "ticket-product-name", item.productName || item.name || "Producto"));
    product.append(row(`${item.quantity} x ${money(item.price)}`, money(item.total)));
    ticket.append(product);
  }

  ticket.append(element("div", "ticket-separator"));
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  ticket.append(row("Subtotal", money(subtotal)));
  const discount = Math.max(0, subtotal - Number(transaction.total || 0));
  if (discount > 0.005) ticket.append(row("Descuento / promoción", `-${money(discount)}`));
  for (const payment of transaction.payments || []) {
    if (Number(payment.surchargePercent) > 0) ticket.append(row(`Recargo ${payment.methodName}`, money(Number(payment.amount) - Number(payment.baseAmount))));
  }
  ticket.append(row("TOTAL FINAL", money(transaction.total), "ticket-total"));
  if (transaction.payments?.length) {
    ticket.append(element("div", "ticket-payment-title", "Forma de pago:"));
    for (const payment of transaction.payments) ticket.append(row(payment.methodName || payment.type, money(payment.amount)));
  }
  ticket.append(element("div", "ticket-separator"), element("p", "ticket-thanks", "¡Gracias por su compra!"));
  document.body.append(ticket);
  try { await logo.decode(); } catch { /* El texto se imprime aunque falle el logo. */ }
  return ticket;
}

async function printTicket(transaction) {
  if (typeof window.print !== "function") throw new ThermalPrinterError("Este navegador no permite imprimir.");
  document.getElementById("yofre-print-ticket")?.remove();
  const ticket = await createTicket(transaction);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  try {
    window.print();
    return { printer: DEFAULT_PRINTER, accepted: true };
  } finally {
    window.setTimeout(() => ticket.remove(), 500);
  }
}

export function enqueuePrint(transaction) {
  const result = queue.then(() => printTicket(transaction), () => printTicket(transaction));
  queue = result.catch(() => undefined);
  return result;
}

export function printTest() {
  return enqueuePrint({ id: "PRUEBA", date: new Date().toLocaleDateString("es-AR"), time: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }), items: [{ productName: "Impresión de prueba", quantity: 1, price: 0, total: 0 }], payments: [], total: 0 });
}
