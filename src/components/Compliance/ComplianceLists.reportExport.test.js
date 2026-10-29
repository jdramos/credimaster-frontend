import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import PicReviewReminders from "./PicReviewReminders";
import AmlMonthlyReport from "./AmlMonthlyReport";
import ComplianceOfficerHistory from "./ComplianceOfficerHistory";
import WatchlistManagement from "./WatchlistManagement";
import { exportReportToExcel } from "../accounting/exportReportToExcel";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("../help/HelpButton", () => () => null);
jest.mock("./BrowseSanctionsListsPanel", () => () => null);
jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ tenant: {} }) }));
jest.mock("../accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("../accounting/printAccountingReport", () => ({ printAccountingReport: jest.fn(), openReportPopup: jest.fn() }));
jest.mock("@mui/x-data-grid", () => ({
  DataGrid: ({ rows }) => <table><tbody>{rows.map((r) => <tr key={r.id}><td>{r.customer_name}</td></tr>)}</tbody></table>,
}));

const cell = (def, label, row) => {
  const col = def.columns.find((c) => c.label === label);
  const raw = col.value ? col.value(row) : row[col.field];
  return col.format ? col.format(raw) : raw;
};
const renderWithUser = (ui) => render(<UserContext.Provider value={{ user: {} }}>{ui}</UserContext.Provider>);
const routes = {
  "/api/aml/pic-review-reminders": [{ id: 1, customer_code: "C-1", identification: "001", customer_name: "Juan Pérez", risk_level: "ALTO", next_pic_review_date: "2020-01-01" }],
  "/api/aml/monthly-report": {
    period: "2026-09", ros_sent_count: 1, raii_flag: false, onu_list_updates: [{ id: 1 }], onu_list_attended: true,
    apps_rejected_count: 2, ros_from_rejected_apps: 1, relationships_closed_count: 0, ros_from_closed_relationships: 0,
    ros_sent: [{ id: 5, case_number: "ROS-2026-0001", customer_name: "Ligia Urbina", ros_sent_at: "2026-09-10T15:30:00" }],
  },
  "/api/aml/annual-risk-report": { year: 2026, deadline: "04-30", por_nivel: { BAJO: 1, MEDIO: 0, ALTO: 0 }, total_evaluados: 1, customers: [{ customer_code: "C-1", customer_name: "Juan", identification: "001", risk_level: "BAJO", risk_score: 1.234, risk_calculated_at: "2026-03-01T00:00:00" }] },
  "/api/aml/compliance-officer/current": { officer: null, notify_days: 5 },
  "/api/aml/compliance-officer/history": [{ id: 1, full_name: "Rosa Díaz", appointed_at: "2025-01-10T00:00:00", ended_at: null, notified_conami_at: null, notes: null }],
  "/api/aml/watchlists": [{ id: 1, active: 1, list_name: "Interna", entry_name: "Fulano", entry_type: "PERSONA" }],
  "/api/aml/shareholders": [{ id: 2, is_active: 1, full_name: "Socio Uno", ownership_pct: 40 }],
  "/api/aml/business-allies": [],
};

beforeEach(() => {
  API.get.mockImplementation((url) => (url in routes ? Promise.resolve({ data: routes[url] }) : Promise.reject(new Error(url))));
});

describe("Cumplimiento — Excel", () => {
  test("PIC por vencer: días como número y nivel de riesgo en texto", async () => {
    renderWithUser(<PicReviewReminders />);
    await screen.findByText("Juan Pérez");
    fireEvent.click(screen.getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    const def = exportReportToExcel.mock.calls[0][0];
    expect(cell(def, "Nivel de riesgo", def.rows[0])).toBe("ALTO");
    const days = def.columns.find((c) => c.label === "Días restantes");
    expect(days.numeric).toBe(true);
    expect(days.value(def.rows[0])).toBeLessThan(0);
    expect(cell(def, "Días restantes", def.rows[0])).toMatch(/^Vencido hace \d+ días$/);
  });

  test("informe mensual y anual: Excel con el contenido del informe emitido", async () => {
    renderWithUser(<AmlMonthlyReport />);
    await screen.findByText("Detalle de ROS enviados");
    await screen.findByText("Total evaluados");
    const [monthly, annual] = screen.getAllByRole("button", { name: "Excel" });
    fireEvent.click(monthly);
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    let def = exportReportToExcel.mock.calls[0][0];
    expect(def.period).toBe("2026-09");
    expect(def.rows.slice(0, 2).map((r) => [r.ref, r.value])).toEqual([["42.1.1", 1], ["42.1.2", "NO"]]);
    expect(def.rows.at(-1)).toMatchObject({ ref: "ROS-2026-0001", concept: "Ligia Urbina", value: "2026-09-10 15:30" });

    fireEvent.click(annual);
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(2));
    def = exportReportToExcel.mock.calls[1][0];
    expect(def.period).toBe("Año 2026");
    expect(cell(def, "Puntaje", def.rows[0])).toBe("1.23");
    expect(def.totals[1].raw).toBe(1);
  });

  test("historial del oficial y listas internas", async () => {
    const { unmount } = render(<ComplianceOfficerHistory />);
    await screen.findByText("Rosa Díaz");
    fireEvent.click(screen.getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    const officer = exportReportToExcel.mock.calls[0][0];
    expect(cell(officer, "Fin", officer.rows[0])).toBe("Vigente");
    expect(cell(officer, "Notificado a CONAMI", officer.rows[0])).toBe("Pendiente");
    unmount();

    render(<WatchlistManagement />);
    await screen.findByText("Socio Uno");
    const buttons = screen.getAllByRole("button", { name: "Excel" });
    expect(buttons[2].disabled).toBe(true); // aliados de negocios sin filas
    fireEvent.click(buttons[1]);
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(2));
    const holders = exportReportToExcel.mock.calls[1][0];
    expect(holders.title).toBe("Socios y Accionistas");
    expect(cell(holders, "% participación", holders.rows[0])).toBe("40%");
  });
});
