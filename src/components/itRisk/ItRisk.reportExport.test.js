import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import ItRiskIncidents from "./ItRiskIncidents";
import ItRiskAssessments from "./ItRiskAssessments";
import ItDashboard from "../it/ItDashboard";
import { resetItCatalogCache } from "../it/itShared";
import { exportReportToExcel } from "../accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "../accounting/printAccountingReport";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("../help/HelpButton", () => () => null);
jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ tenant: { enabled_modules: null }, user: { id: 1 } }) }));
jest.mock("../accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("../accounting/printAccountingReport", () => ({ printAccountingReport: jest.fn(), openReportPopup: jest.fn() }));

const renderAs = (ui) => render(<MemoryRouter><UserContext.Provider value={{ role: 1, permissions: [] }}>{ui}</UserContext.Provider></MemoryRouter>);
const cell = (def, label, row) => {
  const col = def.columns.find((c) => c.label === label);
  const raw = col.value ? col.value(row) : row[col.field];
  return col.format ? col.format(raw) : raw;
};

const riskCatalog = {
  incident_types: { SERVICE_INTERRUPTION: { short: "Interrupción de sistemas" } },
  incident_statuses: { ABIERTO: "Abierto", RESUELTO: "Resuelto", ANULADO: "Anulado" },
  severities: { ALTA: "Alta" },
  causes: {},
  item_statuses: { PENDIENTE: "Sin evaluar", CUMPLE: "Cumple" },
  infraction_categories: { GRAVE: "Grave", LEVE: "Leve" },
};
const incident = {
  id: 1, incident_number: "RT-2026-00001", incident_type: "SERVICE_INTERRUPTION", title: "Caída del core", occurred_at: "2026-10-20 07:00:00",
  detected_at: "2026-10-20 07:30:00", affected_customers_count: 240, economic_loss: "2500", lost_profit: "500", severity: "ALTA", status: "RESUELTO",
  reportable: true, deadlines: { alert: "VENCIDO" }, notices: [],
};
const loss = {
  from: "2025-11-01", to: "2026-10-21", months: 12,
  total: { count: 2, annual_frequency: 2, total_impact: 3000, annual_impact: 3000, affected_customers: 240 },
  by_type: [{ key: "SERVICE_INTERRUPTION", label: "Interrupción de sistemas", count: 2, annual_frequency: 2, economic_loss: 3000, lost_profit: 0, total_impact: 3000, avg_impact: 1500, max_impact: 1500 }],
  by_cause: [], by_severity: [], by_month: [{ month: "2026-10", count: 2, annual_frequency: 2, economic_loss: 3000, lost_profit: 0, total_impact: 3000, avg_impact: 1500, max_impact: 1500 }],
};
const routes = {
  "/api/it_risk/catalog": riskCatalog,
  "/api/it_risk/settings": {},
  "/api/it_risk/incidents": [incident],
  "/api/it_risk/incidents/alerts": { total: 0, items: [] },
  "/api/it_risk/incidents/loss-analysis": loss,
  "/api/it_risk/assessments": [
    { id: 3, year: 2026, assessment_date: "2026-10-21", status: "PRESENTADA", presented_to_board_at: "2026-10-25", board_minutes_ref: "12-2026", summary: { compliance_pct: 87.5, evaluated: 7, total: 8, gaps_count: 1 } },
  ],
};

beforeEach(() => {
  resetItCatalogCache();
  openReportPopup.mockImplementation(() => ({ document: { write: jest.fn() }, close: jest.fn() }));
  printAccountingReport.mockResolvedValue(undefined);
  API.get.mockImplementation((url) => (routes[url] !== undefined ? Promise.resolve({ data: routes[url] }) : Promise.reject(new Error(url))));
});

describe("Riesgo tecnológico — Imprimir / Excel", () => {
  test("registro de incidentes: Imprimir con totales de clientes y pérdidas", async () => {
    renderAs(<ItRiskIncidents />);
    await screen.findByText("Caída del core");
    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalledTimes(1));
    const def = printAccountingReport.mock.calls[0][0];
    expect(def.subtitle).toBe("Estado: Vigentes");
    expect(cell(def, "Aviso CONAMI", def.rows[0])).toBe("Informe de 24 h vencido");
    expect(cell(def, "Detección", def.rows[0])).toBe("20/10/2026 07:30");
    expect(def.totals.slice(1, 4).map((t) => t.raw)).toEqual([240, 2500, 500]);
  });

  test("análisis de pérdidas: una sección por agrupación y totales en el encabezado", async () => {
    renderAs(<ItRiskIncidents />);
    fireEvent.click(await screen.findByRole("tab", { name: /Análisis de pérdidas/ }));
    await screen.findByText("Por tipo de evento");
    fireEvent.click(screen.getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    const def = exportReportToExcel.mock.calls[0][0];
    expect(def.period).toBe("Del 2025-11-01 al 2026-10-21");
    expect(def.subtitle).toContain("Clientes afectados: 240");
    expect(def.rows.filter((r) => r.section).map((r) => r.label)).toEqual(["Por tipo de evento", "Por causa", "Por severidad", "Por mes de ocurrencia"]);
    expect(cell(def, "Agrupación", def.rows.at(-1))).toBe("2026-10");
    expect(cell(def, "Impacto total", def.rows[1])).toBe("3,000.00");
  });

  test("autoevaluaciones: lista por año", async () => {
    renderAs(<ItRiskAssessments />);
    await screen.findByText("2026");
    fireEvent.click(screen.getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    const def = exportReportToExcel.mock.calls[0][0];
    expect(cell(def, "Estado", def.rows[0])).toBe("Presentada a la Junta");
    expect(cell(def, "Cumplimiento", def.rows[0])).toBe("87.5%");
    expect(cell(def, "Junta Directiva", def.rows[0])).toBe("25/10/2026 · acta 12-2026");
  });

  test("tablero de TI: indicadores y lista de atención como filas", async () => {
    API.get.mockImplementation((url) => Promise.resolve({
      data: {
        "/api/it/catalog": { asset_categories: { LAPTOP: "Laptop" }, ticket_priorities: { URGENTE: "Urgente" } },
        "/api/it/dashboard": {
          assets: { total: 12, by_category: { LAPTOP: 8 }, critical: 3, warranty_expiring: 0, without_maintenance_plan: 4 },
          maintenance: { overdue: 2, upcoming: 1 },
          licenses: { expired: 1, expiring: 1, over_assigned: 0 },
          backups: { late: 1, restore_overdue: 1 },
          tickets: { active: 4, by_priority: { URGENTE: 1 }, sla_overdue: 1, opened_30d: 9, avg_resolution_hours_30d: 5.5, sla_met_pct_30d: 80 },
          contracts: { expired: 0, expiring: 1, with_clause_gaps: 2 },
          attention: [{ kind: "RESPALDO", severity: "error", ref: "Base de datos", text: "Sin respaldo exitoso hace 3 días", link: "/ti/respaldos" }],
        },
        "/api/it_risk/incidents/alerts": { total: 0, items: [] },
      }[url],
    }));
    renderAs(<ItDashboard />);
    await screen.findByText("Activos vigentes");
    fireEvent.click(screen.getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    const def = exportReportToExcel.mock.calls[0][0];
    expect(def.columns.map((c) => c.label)).toEqual(["Concepto", "Valor", "Detalle"]);
    expect(def.rows.find((r) => r.concept === "Activos vigentes")).toMatchObject({ value: 12, detail: "3 de criticidad alta o crítica" });
    expect(def.rows.find((r) => r.concept === "Pendientes de prioridad Urgente").value).toBe(1);
    expect(def.rows.at(-1)).toMatchObject({ concept: "Respaldo · Base de datos", value: "Vencido / urgente", detail: "Sin respaldo exitoso hace 3 días" });
  });
});
