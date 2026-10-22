const AGENT_URL = localStorage.getItem("yofre.printAgentUrl") || "http://127.0.0.1:9108";
const PRINTER_KEY = "yofre.thermalPrinter";
let queue = Promise.resolve();

export class ThermalPrinterError extends Error {}

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${AGENT_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  }).catch(() => { throw new ThermalPrinterError("El agente local de impresión no está activo en esta computadora."); });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ThermalPrinterError(body.message || "El agente local rechazó el trabajo de impresión.");
  return body;
}

export function getSelectedPrinter() { return localStorage.getItem(PRINTER_KEY) || ""; }
export function setSelectedPrinter(name) { localStorage.setItem(PRINTER_KEY, name); }

export async function getPrinterStatus() {
  try {
    const result = await request("/printers");
    const selected = getSelectedPrinter();
    return { connected: true, printers: result.printers || [], selected, selectedAvailable: !!selected && result.printers?.includes(selected) };
  } catch (error) {
    return { connected: false, printers: [], selected: getSelectedPrinter(), selectedAvailable: false, error: error.message };
  }
}

function ticketPayload(transaction) {
  return { ...transaction, logoUrl: new URL("../img/logo-descartables.jpeg", import.meta.url).href };
}

export function enqueuePrint(transaction) {
  const task = async () => {
    const printer = getSelectedPrinter();
    if (!printer) throw new ThermalPrinterError("Elegí una impresora térmica en Configuración antes de imprimir.");
    await request("/print", { method: "POST", body: JSON.stringify({ printer, ticket: ticketPayload(transaction) }) });
  };
  const result = queue.then(task, task);
  queue = result.catch(() => undefined);
  return result;
}

export function printTest() {
  return enqueuePrint({ id: "PRUEBA", date: new Date().toLocaleDateString("es-AR"), time: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }), items: [{ productName: "Impresión de prueba", quantity: 1, price: 0, total: 0 }], payments: [], total: 0 });
}
