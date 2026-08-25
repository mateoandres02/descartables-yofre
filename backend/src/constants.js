// Método de pago especial: no se registra en la tabla payment_methods ni se
// ofrece como método de cobro normal. Representa el saldo que queda fiado.
export const ACCOUNT_METHOD_NAME = "Cuenta corriente";

export function isAccountMethod(methodName) {
  return String(methodName || "").trim().toLowerCase() === ACCOUNT_METHOD_NAME.toLowerCase();
}

export function isCashMethod(methodName) {
  return String(methodName || "").trim().toLowerCase().includes("efectivo");
}

export function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}
