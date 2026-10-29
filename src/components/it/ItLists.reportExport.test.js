import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import ItAssets from "./ItAssets";
import ItHelpdesk from "./ItHelpdesk";
import ItLicenses from "./ItLicenses";
import ItBackups from "./ItBackups";
import ItContracts from "./ItContracts";
import { resetItCatalogCache } from "./itShared";
import { exportReportToExcel } from "../accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "../accounting/printAccountingReport";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("../help/HelpButton", () => () => null);
jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ tenant: { enabled_modules: null }, user: { id: 10 } }) }));
jest.mock("../accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("../accounting/printAccountingReport", () => ({ printAccountingReport: jest.fn(), openReportPopup: jest.fn() }));

const catalog = {
  asset_categories: { LAPTOP: "Laptop" },
  asset_statuses: { EN_USO: "En uso" },
  criticality: { ALTA: "Alta" },
  sensitivity: { INTERNA: "Interna" },
  license_types: { SUSCRIPCION: "Suscripción" },
  backup_frequencies: { DIARIO: "Diario" },
  backup_storage: { NUBE: "Nube" },
  ticket_categories: { RED_INTERNET: "Red o internet" },
  ticket_priorities: { ALTA: "Alta" },
  ticket_statuses: { ABIERTO: "Abierto" },
  contract_types: { COMUNICACIONES: "Internet y comunicaciones" },
};
const routes = {
  "/api/it/catalog": catalog,
  "/api/it/lookups": { users: [], branches: [], fixed_assets: [], providers: [], assets: [], contracts: [] },
  "/api/it/my-assets": [],
  "/api/it/assets": [{
    id: 3, asset_code: "TI-00003", name: "Laptop caja", category: "LAPTOP", serial_number: "S1", assigned_user_name: "Ana", branch_name: "Casa matriz",
    criticality: "ALTA", sensitivity: "INTERNA", status: "EN_USO", warranty: { status: "POR_VENCER", days_left: 20 }, maintenance: { status: "VENCIDO", due_date: "2026-06-01" },
  }],
  "/api/it/tickets": {
    can_attend: true,
    items: [{ id: 5, ticket_number: "MA-2026-00005", title: "No hay internet", category: "RED_INTERNET", priority: "ALTA", status: "ABIERTO", requester_name: "Ana", opened_at: "2026-10-21 08:00:00", sla: { status: "VENCIDO", hours_left: -2 } }],
  },
  "/api/it/licenses": [{ id: 1, software_name: "Office 365", publisher: "Microsoft", license_type: "SUSCRIPCION", expires_at: "2026-12-31", cost: "1200", currency: "USD", state: { used: 6, seats: 5, over: true, days_left: 63, status: "VIGENTE" } }],
  "/api/it/backups": [{ id: 2, name: "Base de datos", scope: "MySQL", frequency: "DIARIO", storage: "NUBE", encrypted: 1, responsible: "TI", is_active: 1, state: { backup: "ATRASADO", restore: "SIN_PRUEBAS", last_backup_at: "2026-10-20 23:00:00" } }],
  "/api/it/contracts": [{ id: 4, provider_name: "Claro", contract_number: "C-1", contract_type: "COMUNICACIONES", criticality: "ALTA", end_date: null, amount: "300", currency: "USD", state: { status: "SIN_VENCIMIENTO", clause_gaps: 2 } }],
};

const renderAs = (ui) => render(<MemoryRouter><UserContext.Provider value={{ role: 1, permissions: [] }}>{ui}</UserContext.Provider></MemoryRouter>);
const cell = (def, label, row) => {
  const col = def.columns.find((c) => c.label === label);
  const raw = col.value ? col.value(row) : row[col.field];
  return col.format ? col.format(raw) : raw;
};

beforeEach(() => {
  resetItCatalogCache();
  openReportPopup.mockImplementation(() => ({ document: { write: jest.fn() }, close: jest.fn() }));
  printAccountingReport.mockResolvedValue(undefined);
  API.get.mockImplementation((url) => (routes[url] !== undefined ? Promise.resolve({ data: routes[url] }) : Promise.reject(new Error(url))));
});

const clickAndGet = async (name, mock) => {
  fireEvent.click(screen.getByRole("button", { name }));
  await waitFor(() => expect(mock).toHaveBeenCalledTimes(1));
  return mock.mock.calls[0][0];
};

describe("Listas de TI — Imprimir / Excel", () => {
  test("inventario: Imprimir (el Excel propio se conserva)", async () => {
    renderAs(<ItAssets />);
    await screen.findByText("TI-00003");
    const def = await clickAndGet("Imprimir", printAccountingReport);
    expect(def.subtitle).toBe("Estado: Vigentes");
    expect(cell(def, "Garantía", def.rows[0])).toBe("Por vencer (en 20 días)");
    expect(cell(def, "Mantenimiento", def.rows[0])).toBe("Vencido · 01/06/2026");
    expect(screen.getAllByRole("button", { name: "Excel" })).toHaveLength(1);
  });

  test("mesa de ayuda: incluye quién reportó y el tiempo de atención", async () => {
    renderAs(<ItHelpdesk />);
    await screen.findByText("No hay internet");
    const def = await clickAndGet("Excel", exportReportToExcel);
    expect(def.subtitle).toBe("Todos · Estado: Pendientes");
    expect(def.columns.map((c) => c.label)).toContain("Reportó");
    expect(cell(def, "Tiempo", def.rows[0])).toBe("Fuera de tiempo (2 h)");
    expect(cell(def, "Prioridad", def.rows[0])).toBe("Alta");
  });

  test("licencias, respaldos y contratos", async () => {
    const { unmount } = renderAs(<ItLicenses />);
    await screen.findByText("Office 365");
    let def = await clickAndGet("Excel", exportReportToExcel);
    expect(cell(def, "Puestos (usados / comprados)", def.rows[0])).toBe("6 / 5");
    expect(cell(def, "Estado", def.rows[0])).toBe("Vigente");
    unmount();

    exportReportToExcel.mockClear();
    const view = renderAs(<ItBackups />);
    await screen.findByText("Base de datos");
    def = await clickAndGet("Excel", exportReportToExcel);
    expect(cell(def, "Dónde", def.rows[0])).toBe("Nube · cifrado");
    expect(cell(def, "Último respaldo", def.rows[0])).toBe("Respaldo atrasado · 20/10/2026 23:00");
    expect(cell(def, "Restauración", def.rows[0])).toBe("Restauración nunca probada");
    view.unmount();

    exportReportToExcel.mockClear();
    renderAs(<ItContracts />);
    await screen.findByText("Claro");
    def = await clickAndGet("Excel", exportReportToExcel);
    expect(cell(def, "Vence", def.rows[0])).toBe("Indefinido");
    expect(cell(def, "Cláusulas Art. 13", def.rows[0])).toBe("2 por confirmar");
    expect(cell(def, "Monto", def.rows[0])).toBe("300.00");
  });
});
