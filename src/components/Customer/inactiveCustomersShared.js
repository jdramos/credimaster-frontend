// Formatos y catálogos de presentación compartidos por la lista de clientes
// inactivos y su detalle.
import dayjs from "dayjs";

export const money = (v) =>
  `C$ ${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const dmy = (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "—");

export const RATING = {
  EXCELENTE: { label: "Excelente", color: "success" },
  BUENO: { label: "Bueno", color: "info" },
  REGULAR: { label: "Regular", color: "warning" },
  MALO: { label: "Malo", color: "error" },
  SIN_HISTORIAL: { label: "Sin historial", color: "default" },
};
export const STAGE_COLOR = {
  POR_CONTACTAR: "default",
  CONTACTADO: "info",
  INTERESADO: "primary",
  NO_INTERESADO: "warning",
  RENOVO: "success",
  DESCARTADO: "default",
};

// Celular de Nicaragua (8 dígitos que empiezan en 5, 7 u 8) → enlace de WhatsApp.
export const whatsappUrl = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("505") ? digits.slice(3) : digits;
  return /^[578]\d{7}$/.test(local) ? `https://wa.me/505${local}` : null;
};
