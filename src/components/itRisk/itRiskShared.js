// Utilidades compartidas del módulo Riesgo Tecnológico (backend /api/it_risk).
import { useContext } from "react";
import { UserContext } from "../../contexts/UserContext";
import { useAuth } from "../../contexts/AuthContext";

export const BASE = "/api/it_risk";

// role 1 = Administrador: pasa todos los permisos (igual que el backend).
export const useItRiskPermissions = () => {
  const { role, permissions = [] } = useContext(UserContext) || {};
  const can = (tag) => Number(role) === 1 || permissions.includes(tag);
  return {
    canManageIncidents: can("riesgo_tecnologico.incidentes.gestionar"),
    canManageAssessment: can("riesgo_tecnologico.autoevaluacion.gestionar"),
    canVoid: can("riesgo_tecnologico.anular"),
    canConfigure: can("riesgo_tecnologico.configurar"),
  };
};

export const useCompany = () => {
  const { tenant } = useAuth() || {};
  return {
    commercial_name: tenant?.commercial_name || "",
    legal_name: tenant?.legal_name || tenant?.company_name || "",
    tax_id: tenant?.tax_id || "",
    address: tenant?.address || "",
    phone: tenant?.phone || "",
    logo_url: tenant?.logo_url || "",
  };
};

export const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

// "2026-10-21 08:00:00" -> "21/10/2026 08:00"
export const fmtDateTime = (value) => {
  if (!value) return "—";
  const s = String(value).replace("T", " ");
  return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)} ${s.slice(11, 16)}`;
};

export const fmtDate = (value) => {
  if (!value) return "—";
  const s = String(value);
  return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
};

// Valor para <input type="datetime-local">.
export const toInputDateTime = (value) => (value ? String(value).replace(" ", "T").slice(0, 16) : "");

export const nio = (v) =>
  `C$ ${Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const hoursText = (h) => {
  if (h == null) return "";
  const abs = Math.abs(h);
  if (abs < 1) return `${Math.round(abs * 60)} min`;
  if (abs < 48) return `${Math.round(abs * 10) / 10} h`;
  return `${Math.round(abs / 24)} días`;
};

export const ALERTS = {
  VENCIDO: { label: "Informe de 24 h vencido", color: "error" },
  AVISO_INICIAL_PENDIENTE: { label: "Aviso inicial pendiente (inmediato)", color: "error" },
  POR_VENCER: { label: "Informe de 24 h por vencer", color: "warning" },
  DETALLE_PENDIENTE: { label: "Informe de 24 h pendiente", color: "info" },
};

export const NOTICE_STATUS = {
  ENVIADO: { label: "Enviado", color: "success" },
  ENVIADO_TARDE: { label: "Enviado fuera de plazo", color: "warning" },
  PENDIENTE_INMEDIATO: { label: "Pendiente: inmediato", color: "error" },
  PENDIENTE: { label: "Pendiente", color: "info" },
  POR_VENCER: { label: "Por vencer", color: "warning" },
  VENCIDO: { label: "Vencido", color: "error" },
};

export const INCIDENT_STATUS_COLORS = {
  ABIERTO: "error",
  EN_ATENCION: "warning",
  RESUELTO: "info",
  CERRADO: "success",
  ANULADO: "default",
};

export const ITEM_STATUS_COLORS = {
  PENDIENTE: "default",
  CUMPLE: "success",
  PARCIAL: "warning",
  NO_CUMPLE: "error",
  NO_APLICA: "default",
};

export const CATEGORY_COLORS = { GRAVE: "error", MODERADA: "warning", LEVE: "info" };
