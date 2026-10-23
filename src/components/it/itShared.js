// Utilidades del módulo Gestión de TI (backend /api/it).
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../contexts/UserContext";
import API from "../../api";

export const BASE = "/api/it";

export { errorMessage, fmtDate, fmtDateTime, toInputDateTime } from "../itRisk/itRiskShared";

// role 1 = Administrador: pasa todos los permisos (igual que el backend).
export const useItPermissions = () => {
  const { role, permissions = [] } = useContext(UserContext) || {};
  const can = (tag) => Number(role) === 1 || permissions.includes(tag);
  return {
    canView: can("ti.ver"),
    canManage: can("ti.gestionar"),
    canAttend: can("ti.soporte.atender"),
    canVoid: can("ti.anular"),
  };
};

// Catálogo y listas de apoyo, una sola vez por sesión de pantalla.
let catalogPromise = null;
export const useItCatalog = () => {
  const [catalog, setCatalog] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!catalogPromise) catalogPromise = API.get(`${BASE}/catalog`).then((r) => r.data).catch((e) => { catalogPromise = null; throw e; });
    catalogPromise.then((c) => alive && setCatalog(c)).catch(() => {});
    return () => { alive = false; };
  }, []);
  return catalog;
};
export const resetItCatalogCache = () => { catalogPromise = null; };

export const useItLookups = (enabled = true) => {
  const [lookups, setLookups] = useState({ users: [], branches: [], fixed_assets: [], providers: [], assets: [], contracts: [] });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    API.get(`${BASE}/lookups`).then(({ data }) => alive && setLookups(data)).catch(() => {});
    return () => { alive = false; };
  }, [enabled, tick]);
  return { ...lookups, reload: () => setTick((t) => t + 1) };
};

export const money = (v, currency = "NIO") =>
  v == null || v === ""
    ? "—"
    : `${currency === "USD" ? "US$" : "C$"} ${Number(v).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const options = (map = {}) => Object.entries(map).map(([value, label]) => ({ value, label }));

export const daysText = (d) => {
  if (d == null) return "";
  if (d === 0) return "hoy";
  return d > 0 ? `en ${d} día${d === 1 ? "" : "s"}` : `hace ${-d} día${d === -1 ? "" : "s"}`;
};

// Colores de los estados calculados por el backend.
export const STATE_CHIP = {
  VENCIDA: { label: "Vencida", color: "error" },
  VENCIDO: { label: "Vencido", color: "error" },
  POR_VENCER: { label: "Por vencer", color: "warning" },
  PROXIMO: { label: "Próximo", color: "warning" },
  VIGENTE: { label: "Vigente", color: "success" },
  AL_DIA: { label: "Al día", color: "success" },
  SIN_VENCIMIENTO: { label: "Sin vencimiento", color: "default" },
  RENOVACION_AUTOMATICA: { label: "Renovación automática", color: "info" },
  ANULADA: { label: "Anulada", color: "default" },
  ANULADO: { label: "Anulado", color: "default" },
  ATRASADO: { label: "Atrasado", color: "error" },
  SIN_REGISTROS: { label: "Sin registros", color: "error" },
  SIN_PRUEBAS: { label: "Nunca probada", color: "warning" },
  INACTIVO: { label: "Inactivo", color: "default" },
  EN_PLAZO: { label: "En plazo", color: "success" },
  CUMPLIDO: { label: "Cumplido", color: "success" },
  INCUMPLIDO: { label: "Fuera de plazo", color: "warning" },
};

export const ASSET_STATUS_COLORS = { EN_USO: "success", DISPONIBLE: "info", EN_REPARACION: "warning", DE_BAJA: "default" };
export const CRITICALITY_COLORS = { BAJA: "default", MEDIA: "info", ALTA: "warning", CRITICA: "error" };
export const PRIORITY_COLORS = { BAJA: "default", MEDIA: "info", ALTA: "warning", URGENTE: "error" };
export const TICKET_STATUS_COLORS = { ABIERTO: "error", EN_PROCESO: "warning", EN_ESPERA: "info", RESUELTO: "success", CERRADO: "default", ANULADO: "default" };

export const openSignedFile = async (url) => {
  const { data } = await API.get(url);
  window.open(data.url, "_blank", "noopener");
};
