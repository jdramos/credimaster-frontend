// Etiquetas y colores compartidos entre la vista de la empresa y la del
// administrador de la plataforma para los tickets de soporte.

export const STATUS_OPTIONS = [
  { value: "abierto", label: "Abierto", color: "info" },
  { value: "en_progreso", label: "En progreso", color: "primary" },
  { value: "en_espera", label: "En espera", color: "warning" },
  { value: "resuelto", label: "Resuelto", color: "success" },
  { value: "cerrado", label: "Cerrado", color: "default" },
];

export const PRIORITY_OPTIONS = [
  { value: "baja", label: "Baja", color: "default" },
  { value: "media", label: "Media", color: "info" },
  { value: "alta", label: "Alta", color: "warning" },
  { value: "urgente", label: "Urgente", color: "error" },
];

export const CATEGORY_OPTIONS = [
  { value: "error", label: "Error / falla" },
  { value: "duda", label: "Duda" },
  { value: "solicitud", label: "Solicitud" },
  { value: "otro", label: "Otro" },
];

const byValue = (list) =>
  list.reduce((acc, o) => {
    acc[o.value] = o;
    return acc;
  }, {});

export const STATUS_MAP = byValue(STATUS_OPTIONS);
export const PRIORITY_MAP = byValue(PRIORITY_OPTIONS);
export const CATEGORY_MAP = byValue(CATEGORY_OPTIONS);

export const statusLabel = (v) => STATUS_MAP[v]?.label || v || "-";
export const statusColor = (v) => STATUS_MAP[v]?.color || "default";
export const priorityLabel = (v) => PRIORITY_MAP[v]?.label || v || "-";
export const priorityColor = (v) => PRIORITY_MAP[v]?.color || "default";
export const categoryLabel = (v) => CATEGORY_MAP[v]?.label || v || "-";

export const formatDateTime = (v) => {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString("es-NI", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(v);
  }
};
