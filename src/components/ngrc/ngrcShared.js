// Utilidades del cumplimiento NGRC (backend /api/ngrc).
import { useContext } from "react";
import { UserContext } from "../../contexts/UserContext";

export const BASE = "/api/ngrc";
export const PAGE_PATH = "/ngrc/cumplimiento";

// role 1 = Administrador: pasa todos los permisos (igual que el backend).
export const useNgrcPermissions = () => {
  const { role, permissions = [] } = useContext(UserContext) || {};
  const can = (tag) => Number(role) === 1 || permissions.includes(tag);
  return {
    canManage: can("ngrc.cumplimiento.gestionar"),
    canVoid: can("ngrc.cumplimiento.anular"),
    canConfigure: can("ngrc.cumplimiento.configurar"),
  };
};

export const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Último día del mes anterior a hoy (corte por omisión de los reportes).
export const lastMonthEnd = () => {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth(), 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
};

export const daysText = (days) => {
  if (days == null) return "";
  if (days === 0) return "vence hoy";
  if (days > 0) return `faltan ${days} día${days === 1 ? "" : "s"}`;
  return `vencido hace ${-days} día${days === -1 ? "" : "s"}`;
};

// Opciones de período para registrar una obligación de calendario: los
// últimos cortes cerrados según la frecuencia.
const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const STEP = { MONTHLY: 1, QUARTERLY: 3, SEMIANNUAL: 6, ANNUAL: 12 };

export const periodOptions = (frequency, today = todayISO(), count = 6) => {
  const step = STEP[frequency];
  if (!step) return [];
  let y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const lastDay = new Date(y, m, 0).getDate();
  let month = Math.floor(m / step) * step;
  if (month === m && Number(today.slice(8, 10)) < lastDay) month -= step;
  if (month <= 0) {
    month += 12;
    y -= 1;
  }
  const out = [];
  for (let i = 0; i < count; i += 1) {
    let cm = month - i * step;
    let cy = y;
    while (cm <= 0) {
      cm += 12;
      cy -= 1;
    }
    let key;
    let label;
    if (frequency === "MONTHLY") {
      key = `${cy}-${String(cm).padStart(2, "0")}`;
      label = `${MONTH_NAMES[cm - 1]} ${cy}`;
    } else if (frequency === "QUARTERLY") {
      key = `${cy}-T${cm / 3}`;
      label = `${["Primer", "Segundo", "Tercer", "Cuarto"][cm / 3 - 1]} trimestre ${cy}`;
    } else if (frequency === "SEMIANNUAL") {
      key = `${cy}-S${cm / 6}`;
      label = `${cm === 6 ? "Primer" : "Segundo"} semestre ${cy}`;
    } else {
      key = String(cy);
      label = `Año ${cy}`;
    }
    out.push({ key, label });
  }
  return out;
};

export const FREQUENCY_LABELS = {
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
};

export const frequencyLabel = (o) => {
  if (o.kind === "ROTATIVA") return o.months === 24 ? "Cada 2 años" : "Anual";
  if (o.kind === "POR_ELEMENTO") return "Por cliente / bien";
  return FREQUENCY_LABELS[o.frequency] || "";
};
