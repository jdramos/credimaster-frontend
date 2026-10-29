import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import ReportExportButtons from "./ReportExportButtons";
import { buildReportSheetData, safeFileName } from "../accounting/exportReportToExcel";
import { reportMoney, reportPeriod, reportFilters } from "./reportFormat";
import API from "../../api";

jest.mock("../../api", () => ({ get: jest.fn() }));
jest.mock("file-saver", () => ({ saveAs: jest.fn() }));
jest.mock("xlsx", () => ({
  utils: {
    aoa_to_sheet: jest.fn(() => ({})),
    json_to_sheet: jest.fn(() => ({})),
    book_new: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
  },
  write: jest.fn(() => new ArrayBuffer(1)),
}));

const CONTEXT = { companyName: "Financiera Demo", legalName: "Financiera Demo, S.A.", taxId: "J0310000000001", emittedAt: "29/10/26 10:00", emittedBy: "Ana" };

const REPORT = {
  title: "Pagos recibidos",
  subtitle: "Sucursal: Central",
  period: "Del 2026-10-01 al 2026-10-31",
  columns: [
    { field: "customer", label: "Cliente" },
    { field: "amount", label: "Monto", numeric: true, format: reportMoney },
    { field: "date", label: "Fecha", format: (v) => v.slice(0, 10) },
    { label: "Estado", value: (row) => (row.voided ? "Anulado" : "Vigente") },
  ],
  rows: [
    { customer: "Juan Pérez", amount: "1500.5", date: "2026-10-02T00:00:00", voided: false },
    { customer: "María López", amount: 250, date: "2026-10-03T00:00:00", voided: true },
  ],
  totals: [{ value: "Total", colspan: 1 }, { value: "1,750.50", numeric: true }, { value: "", colspan: 2 }],
};

describe("buildReportSheetData", () => {
  it("arma encabezado institucional, títulos, filas y totales con números sin formato", () => {
    const { aoa, headerRows } = buildReportSheetData(REPORT, CONTEXT);
    expect(aoa.slice(0, headerRows).map((r) => r[0])).toEqual([
      "Financiera Demo",
      "Financiera Demo, S.A.",
      "RUC: J0310000000001",
      "Pagos recibidos",
      "Sucursal: Central",
      "Período: Del 2026-10-01 al 2026-10-31",
      "Fecha: 29/10/26 10:00 · Usuario: Ana",
      undefined,
    ]);
    expect(aoa[headerRows]).toEqual(["Cliente", "Monto", "Fecha", "Estado"]);
    expect(aoa[headerRows + 1]).toEqual(["Juan Pérez", 1500.5, "2026-10-02", "Vigente"]);
    expect(aoa[headerRows + 2]).toEqual(["María López", 250, "2026-10-03", "Anulado"]);
    // colspan rellena celdas; el total formateado vuelve a número.
    expect(aoa[headerRows + 3]).toEqual(["Total", 1750.5, "", ""]);
  });

  it("usa `raw` del total cuando viene y omite subtítulo/período vacíos", () => {
    const { aoa, headerRows } = buildReportSheetData(
      { title: "X", columns: [{ field: "a", label: "A", numeric: true }], rows: [{ a: null }], totals: [{ value: "C$ 10.00", raw: 10, numeric: true }] },
      { companyName: "Empresa", emittedAt: "hoy" },
    );
    expect(aoa.slice(0, headerRows).map((r) => r[0])).toEqual(["Empresa", "X", "Fecha: hoy", undefined]);
    expect(aoa[headerRows + 1]).toEqual([""]);
    expect(aoa[headerRows + 2]).toEqual([10]);
  });

  it("toma la empresa de la sesión cuando no se le pasa contexto", () => {
    localStorage.setItem("session", JSON.stringify({ tenant: { commercial_name: "Crédito Fácil", tax_id: "J001" } }));
    const { aoa } = buildReportSheetData({ title: "T", columns: [], rows: [] });
    expect(aoa[0][0]).toBe("Crédito Fácil");
    expect(aoa[1][0]).toBe("RUC: J001");
    localStorage.removeItem("session");
  });
});

describe("formatos", () => {
  it("safeFileName quita tildes y caracteres no válidos", () => {
    expect(safeFileName("Balance de Comprobación 2026/10")).toBe("Balance_de_Comprobacion_2026_10.xlsx");
    expect(safeFileName("ya.xlsx")).toBe("ya.xlsx");
  });
  it("reportPeriod y reportFilters", () => {
    expect(reportPeriod("2026-10-01", "2026-10-31")).toBe("Del 2026-10-01 al 2026-10-31");
    expect(reportPeriod("", "2026-10-31")).toBe("Al 2026-10-31");
    expect(reportPeriod()).toBe("");
    expect(reportFilters([["Sucursal", "Central"], ["Estado", ""], ["Cobrador", null]])).toBe("Sucursal: Central");
  });
});

describe("ReportExportButtons", () => {
  let popup;
  beforeEach(() => {
    jest.clearAllMocks();
    // CRA reinicia las implementaciones de los mocks antes de cada prueba.
    XLSX.utils.aoa_to_sheet.mockImplementation(() => ({}));
    XLSX.utils.book_new.mockImplementation(() => ({}));
    XLSX.write.mockImplementation(() => new ArrayBuffer(1));
    API.get.mockResolvedValue({ data: { data: {} } });
    popup = { document: { write: jest.fn(), open: jest.fn(), close: jest.fn() }, focus: jest.fn(), close: jest.fn() };
    window.open = jest.fn(() => popup);
    window.alert = jest.fn();
  });

  it("Excel exporta con títulos en español y el nombre de archivo del reporte", async () => {
    render(<ReportExportButtons report={{ ...REPORT, fileName: "pagos_octubre" }} />);
    fireEvent.click(screen.getByText("Excel"));
    await waitFor(() => expect(saveAs).toHaveBeenCalled());
    const aoa = XLSX.utils.aoa_to_sheet.mock.calls[0][0];
    expect(aoa.some((r) => r.join("|") === "Cliente|Monto|Fecha|Estado")).toBe(true);
    expect(saveAs.mock.calls[0][1]).toBe("pagos_octubre.xlsx");
    expect(XLSX.utils.book_append_sheet.mock.calls[0][2]).toBe("Pagos recibidos");
  });

  it("Imprimir abre la ventana en el clic y escribe el reporte con columnas y totales", async () => {
    render(<ReportExportButtons report={REPORT} />);
    fireEvent.click(screen.getByText("Imprimir"));
    expect(window.open).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(popup.document.close).toHaveBeenCalled());
    const html = popup.document.write.mock.calls.map((c) => c[0]).join("");
    expect(html).toContain("Pagos recibidos");
    expect(html).toContain("Período: Del 2026-10-01 al 2026-10-31");
    expect(html).toContain("Juan Pérez");
    expect(html).toContain("1,500.50");
    expect(html).toContain("1,750.50");
  });

  it("acepta un reporte async (trae todas las filas) sin abrir una segunda ventana", async () => {
    const load = jest.fn(async () => ({ ...REPORT, rows: [{ customer: "Fila del servidor", amount: 1, date: "2026-10-05", voided: false }] }));
    render(<ReportExportButtons report={load} />);
    fireEvent.click(screen.getByText("Imprimir"));
    await waitFor(() => expect(popup.document.close).toHaveBeenCalled());
    expect(window.open).toHaveBeenCalledTimes(1);
    expect(popup.document.write.mock.calls.map((c) => c[0]).join("")).toContain("Fila del servidor");
  });

  it("si la carga falla cierra la ventana y avisa", async () => {
    render(<ReportExportButtons report={async () => { throw new Error("Sin conexión"); }} />);
    fireEvent.click(screen.getByText("Imprimir"));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Sin conexión"));
    expect(popup.close).toHaveBeenCalled();
  });

  it("avisa si el navegador bloquea la ventana", () => {
    window.open = jest.fn(() => null);
    render(<ReportExportButtons report={REPORT} />);
    fireEvent.click(screen.getByText("Imprimir"));
    expect(window.alert.mock.calls[0][0]).toContain("bloqueó");
  });

  it("respeta disabled", () => {
    render(<ReportExportButtons report={REPORT} disabled />);
    expect(screen.getByRole("button", { name: "Excel" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Imprimir" }).disabled).toBe(true);
  });
});
