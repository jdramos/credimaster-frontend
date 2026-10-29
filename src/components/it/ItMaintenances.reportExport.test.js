import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import ItMaintenances from "./ItMaintenances";
import { resetItCatalogCache } from "./itShared";
import { exportReportToExcel } from "../accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "../accounting/printAccountingReport";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("../help/HelpButton", () => () => null);
jest.mock("../accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("../accounting/printAccountingReport", () => ({ printAccountingReport: jest.fn(), openReportPopup: jest.fn() }));

const catalog = {
  asset_categories: { LAPTOP: "Laptop", SERVIDOR: "Servidor" },
  maintenance_types: { PREVENTIVO: "Preventivo", CORRECTIVO: "Correctivo" },
};
const schedule = {
  assets_without_plan: 0,
  items: [
    {
      id: 3, asset_code: "TI-00003", name: "Servidor core", category: "SERVIDOR", branch_name: "Casa matriz", maintenance_frequency_months: 6,
      maintenance: { status: "VENCIDO", last_preventive: "2026-01-10", due_date: "2026-07-10", days_left: -110 },
    },
  ],
};
const log = [
  { id: 9, performed_at: "2026-10-01", asset_code: "TI-00003", asset_name: "Servidor core", maintenance_type: "CORRECTIVO", description: "Cambio de disco", performed_by: "Proveedor X", cost: "1500.5", currency: "NIO" },
  { id: 10, performed_at: "2026-09-15", asset_code: "TI-00004", asset_name: "Laptop caja", maintenance_type: "PREVENTIVO", description: "Limpieza", performed_by: "TI", cost: null, currency: "NIO" },
];
const routes = {
  "/api/it/catalog": catalog,
  "/api/it/lookups": { users: [], branches: [], fixed_assets: [], providers: [], assets: [], contracts: [] },
  "/api/it/maintenances/schedule": schedule,
  "/api/it/maintenances": log,
};

const cell = (def, label, row) => {
  const col = def.columns.find((c) => c.label === label);
  const raw = col.value ? col.value(row) : row[col.field];
  return col.format ? col.format(raw) : raw;
};

const renderPage = () => render(<UserContext.Provider value={{ role: 1, permissions: [] }}><ItMaintenances /></UserContext.Provider>);

describe("ItMaintenances — Imprimir / Excel por pestaña", () => {
  let popup;
  beforeEach(() => {
    resetItCatalogCache();
    popup = { document: { write: jest.fn() }, close: jest.fn() };
    openReportPopup.mockImplementation(() => popup);
    printAccountingReport.mockResolvedValue(undefined);
    API.get.mockImplementation((url) => (routes[url] !== undefined ? Promise.resolve({ data: routes[url] }) : Promise.reject(new Error(url))));
  });

  it("en Plan preventivo exporta el plan con sus estados", async () => {
    renderPage();
    await screen.findByText("TI-00003 · Servidor core");
    await screen.findByText("Servidor");
    fireEvent.click(screen.getByText("Excel"));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    const def = exportReportToExcel.mock.calls[0][0];
    expect(def.title).toBe("Plan de mantenimiento preventivo");
    expect(def.columns.map((c) => c.label)).toEqual(["Código", "Equipo", "Categoría", "Sucursal", "Frecuencia", "Último preventivo", "Próximo", "Estado"]);
    expect(def.rows).toHaveLength(1);
    expect(cell(def, "Categoría", def.rows[0])).toBe("Servidor");
    expect(cell(def, "Frecuencia", def.rows[0])).toBe("Cada 6 meses");
    expect(cell(def, "Próximo", def.rows[0])).toBe("10/07/2026 (hace 110 días)");
    expect(cell(def, "Estado", def.rows[0])).toBe("Vencido");
  });

  it("en Registro imprime los mantenimientos del filtro con el costo como número", async () => {
    renderPage();
    await screen.findByText("TI-00003 · Servidor core");
    fireEvent.click(screen.getByRole("tab", { name: "Registro" }));
    await screen.findByText("Cambio de disco");
    fireEvent.click(screen.getByText("Imprimir"));
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalledTimes(1));
    const def = printAccountingReport.mock.calls[0][0];
    expect(def.popup).toBe(popup);
    expect(def.title).toBe("Registro de mantenimientos");
    expect(def.columns.map((c) => c.label)).toEqual(["Fecha", "Equipo", "Tipo", "Trabajo realizado", "Por", "Costo", "Moneda"]);
    expect(def.rows.map((r) => r.id)).toEqual([9, 10]);
    expect(cell(def, "Equipo", def.rows[0])).toBe("TI-00003 · Servidor core");
    expect(cell(def, "Tipo", def.rows[0])).toBe("Correctivo");
    expect(cell(def, "Costo", def.rows[0])).toBe("1,500.50");
    expect(cell(def, "Costo", def.rows[1])).toBe("—");
    expect(def.columns.find((c) => c.label === "Costo").numeric).toBe(true);
  });
});
