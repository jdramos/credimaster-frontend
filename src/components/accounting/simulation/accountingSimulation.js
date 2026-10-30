// "Ver simulación contable" de una operación (ver en el backend
// api/accounting/simulation/accountingSimulation.js): se llama a la MISMA
// ruta de la operación, con el mismo cuerpo, más la cabecera
// X-Accounting-Simulation. El backend corre la operación en una transacción
// que revierte y responde el asiento que generaría. Nada se graba.
import { useContext } from "react";
import API from "../../../api";
import { UserContext } from "../../../contexts/UserContext";
import { useAuth } from "../../../contexts/AuthContext";
import { isModuleEnabled } from "../../../utils/moduleAccess";
import { reportMoney } from "../../common/reportFormat";

export const SIMULATION_PERMISSION = "contabilidad.simulacion.ver";
export const SIMULATION_HEADER = "X-Accounting-Simulation";

// El botón solo aparece con el módulo de contabilidad y el permiso (el
// backend igual lo exige: 403).
export const canSimulateAccounting = ({ role, permissions, enabledModules }) =>
  isModuleEnabled(enabledModules, "accounting") && (role === 1 || (permissions || []).includes(SIMULATION_PERMISSION));

export const useCanSimulateAccounting = () => {
  const { role, permissions } = useContext(UserContext) || {};
  const { tenant } = useAuth() || {};
  return canSimulateAccounting({ role, permissions, enabledModules: tenant?.enabled_modules });
};

// request: { method, url, data, params } (lo mismo que se mandaría a
// confirmar). Devuelve la simulación o lanza un Error con el mensaje del
// backend (la operación no procede, sin permiso, etc.).
export const requestAccountingSimulation = async ({ method = "post", url, data, params }) => {
  try {
    const res = await API.request({
      method,
      url,
      data,
      params,
      headers: { [SIMULATION_HEADER]: "1" },
    });
    return res.data;
  } catch (error) {
    const message = error?.response?.data?.message || error?.response?.data?.error || error?.message || "No se pudo simular la operación.";
    throw Object.assign(new Error(message), { status: error?.response?.status });
  }
};

export const TIMING_LABELS = {
  IMMEDIATE: "Al confirmar",
  DAY_CLOSE: "En el cierre del día",
};

// Definición de printAccountingReport / exportReportToExcel: una fila por
// línea, con una fila de título por comprobante.
export const buildSimulationReport = (simulation, { title } = {}) => {
  const entries = simulation?.entries || [];
  const rows = [];
  entries.forEach((entry, index) => {
    rows.push({
      section: true,
      entry: `Comprobante ${index + 1}`,
      timing: TIMING_LABELS[entry.timing] || entry.timing,
      account_code: entry.entry_date,
      account_name: [entry.description, entry.branch_name].filter(Boolean).join(" · "),
    });
    entry.lines.forEach((line) => {
      rows.push({
        entry: `Comprobante ${index + 1}`,
        timing: TIMING_LABELS[entry.timing] || entry.timing,
        account_code: line.account_code,
        account_name: line.account_name,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
      });
    });
    rows.push({
      total: true,
      entry: `Comprobante ${index + 1}`,
      account_name: entry.balanced ? "Total del comprobante (cuadrado)" : "Total del comprobante (DESCUADRADO)",
      debit: entry.total_debit,
      credit: entry.total_credit,
    });
  });

  const totals = simulation?.totals || { debit: 0, credit: 0, balanced: true };
  return {
    title: title || `Simulación contable — ${simulation?.operation || "Operación"}`,
    subtitle: (simulation?.notes || []).join(" "),
    columns: [
      { field: "entry", label: "Comprobante" },
      { field: "timing", label: "Momento" },
      { field: "account_code", label: "Código MUC" },
      { field: "account_name", label: "Cuenta" },
      { field: "description", label: "Descripción" },
      { field: "debit", label: "Débito", numeric: true, format: (v) => (v === undefined || v === null || v === "" ? "" : reportMoney(v)) },
      { field: "credit", label: "Crédito", numeric: true, format: (v) => (v === undefined || v === null || v === "" ? "" : reportMoney(v)) },
    ],
    rows,
    totals: [
      { value: totals.balanced ? "Totales (cuadrado)" : "Totales (DESCUADRADO)", colspan: 5 },
      { value: reportMoney(totals.debit), numeric: true, raw: totals.debit },
      { value: reportMoney(totals.credit), numeric: true, raw: totals.credit },
    ],
    orientation: "landscape",
    fileName: "simulacion_contable",
  };
};
