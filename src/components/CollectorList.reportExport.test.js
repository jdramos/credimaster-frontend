import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CollectorList from "./CollectorList";
import API from "../api";
import { exportReportToExcel } from "./accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "./accounting/printAccountingReport";

jest.mock("../api", () => ({ get: jest.fn() }));
jest.mock("./accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("./accounting/printAccountingReport", () => ({ openReportPopup: jest.fn(), printAccountingReport: jest.fn() }));
jest.mock("./CollectorModal", () => () => null);
jest.mock("./CollectorPortfolioDialog", () => () => null);
jest.mock("./help/HelpButton", () => () => null);

const COLLECTORS = [
  { id: 1, name: "Douglas Palacios", telephone: "85550001", branch_id: 1, branch_name: "Central", active: 1 },
  { id: 2, name: "María Ruiz", telephone: "", branch_id: 2, branch_name: "León", active: 1 },
  { id: 3, name: "Pedro Baja", telephone: "85550003", branch_id: 1, branch_name: "Central", active: 0, deactivation_reason: "Renuncia" },
];

const evalColumn = (column, row) => (typeof column.value === "function" ? column.value(row) : row[column.field]);

describe("CollectorList: imprimir y Excel", () => {
  let popup;
  beforeEach(() => {
    API.get.mockResolvedValue({ data: COLLECTORS });
    popup = { document: { write: jest.fn() }, close: jest.fn() };
    openReportPopup.mockReturnValue(popup);
    printAccountingReport.mockResolvedValue(undefined);
  });

  it("Excel exporta los colectores filtrados (por omisión solo activos) con encabezados en español", async () => {
    render(<CollectorList />);
    await screen.findByText("Douglas Palacios");
    fireEvent.click(screen.getByText("Excel"));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
    const report = exportReportToExcel.mock.calls[0][0];
    expect(report.title).toBe("Listado de colectores");
    expect(report.columns.map((c) => c.label)).toEqual(["ID", "Nombre", "Teléfono", "Sucursal", "Estado", "Motivo de baja"]);
    expect(report.rows.map((r) => r.id)).toEqual([1, 2]);
    expect(report.subtitle).toContain("Estado: Activos");
    const estado = report.columns.find((c) => c.label === "Estado");
    expect(evalColumn(estado, report.rows[0])).toBe("Activo");
    expect(report.totals[0].value).toBe("2 registros");
  });

  it("Imprimir respeta la búsqueda y el filtro de estado de la pantalla", async () => {
    render(<CollectorList />);
    await screen.findByText("Douglas Palacios");
    fireEvent.change(screen.getByPlaceholderText("Buscar por nombre, teléfono o ID"), { target: { value: "pedro" } });
    // Con estado "Activos" no queda nada: los botones se deshabilitan.
    expect(screen.getByRole("button", { name: "Imprimir" }).disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Buscar por nombre, teléfono o ID"), { target: { value: "palacios" } });
    fireEvent.click(screen.getByText("Imprimir"));
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalledTimes(1));
    const report = printAccountingReport.mock.calls[0][0];
    expect(report.popup).toBe(popup);
    expect(report.rows.map((r) => r.name)).toEqual(["Douglas Palacios"]);
    expect(report.subtitle).toContain("Búsqueda: palacios");
  });
});
