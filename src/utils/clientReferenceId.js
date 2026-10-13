// Código único por intento de pago, para que el backend (PaymentController.
// create) reconozca un reintento y devuelva el pago ya grabado en vez de
// cobrar dos veces -- p. ej. si el usuario cierra la ventana justo después
// de "Registrar" y vuelve a registrarlo creyendo que falló. Se genera al
// abrir el formulario y se reutiliza en todos los reintentos mientras siga
// abierto. Máximo 64 caracteres (payments.client_reference_id).
export function newClientReferenceId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return `web-${crypto.randomUUID()}`;
    }
  } catch {
    // crypto.randomUUID solo existe en contextos seguros (https/localhost)
  }
  const rand = () => Math.random().toString(36).slice(2, 12);
  return `web-${Date.now().toString(36)}-${rand()}-${rand()}`;
}
