import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SinRiesgoReportPage from "./SinRiesgoReportPage";
import API from "../../../../api";
import { exportReportToExcel } from "../../../../components/accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "../../../../components/accounting/printAccountingReport";

jest.mock("../../../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("../../../../components/accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn(), exportRowsToExcel: jest.fn() }));
jest.mock("../../../../components/accounting/printAccountingReport", () => ({ printAccountingReport: jest.fn(), openReportPopup: jest.fn() }));
jest.mock("./SinRiesgoConfigDialog", () => () => null);
jest.mock("@mui/x-data-grid", () => ({ DataGrid: () => <div /> }));

const RUNS = [
  { id: 3, report_month: "2026-09", cutoff_date: "2026-09-30T00:00:00", status: "GENERATED", total_errors: 0, total_warnings: 2, generated_at: "2026-10-05T10:20:30", zip_path: "x.zip" },
  { id: 2, report_month: "2026-08", cutoff_date: "2026-08-31T00:00:00", status: "WITH_ERRORS", total_errors: 4, total_warnings: 1, generated_at: null },
];

// Hay botones en dos secciones: el primero es el del historial y el segundo
// el de los hallazgos (aparece después de validar).
const buttons = (name) => screen.getAllByRole("button", { name });

describe("SinRiesgoReportPage — Imprimir y Excel", () => {
  let popup;
  beforeEach(() => {
    popup = { document: { write: jest.fn() }, close: jest.fn() };
    openReportPopup.mockImplementation(() => popup);
    printAccountingReport.mockResolvedValue(undefined);
    API.get.mockResolvedValue({ data: { data: RUNS } });
    API.post.mockResolvedValue({
      data: {
        data: {
          summary: { total_records: 10, errors: 1, warnings: 1, valid: false },
          errors: [{ fileCode: "SR_BASE_CREDITO", fieldName: "NumId", validationCode: "SR.REQ", errorMessage: "No puede ir vacío", recordKey: "C-001", severity: "ERROR" }],
          warnings: [{ fileCode: "SR_BASE_CREDITO", validationCode: "SR.8", errorMessage: "La Entidad no Reporta Fiadores. Revisar.", recordKey: null, severity: "WARNING" }],
        },
      },
    });
  });

  it("imprime el historial de corridas con estados en español", async () => {
    render(<SinRiesgoReportPage />);
    await waitFor(() => expect(buttons("Imprimir")[0].disabled).toBe(false));
    fireEvent.click(buttons("Imprimir")[0]);
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalled());
    const def = printAccountingReport.mock.calls[0][0];
    expect(def.columns.map((c) => c.label)).toEqual(["ID", "Mes", "Fecha corte", "Estado", "Errores", "Advertencias", "Generado"]);
    expect(def.rows).toHaveLength(2);
    const estado = def.columns.find((c) => c.label === "Estado");
    expect(def.rows.map((r) => estado.format(r.status))).toEqual(["Generado", "Con errores"]);
    expect(def.columns.find((c) => c.label === "Generado").format(RUNS[0].generated_at)).toBe("2026-10-05 10:20:30");
  });

  it("Excel de los hallazgos de la previsualización trae los campos y el conteo", async () => {
    render(<SinRiesgoReportPage />);
    fireEvent.click(screen.getByText("Validar"));
    await screen.findByText(/^Hallazgos/);
    expect(buttons("Excel")).toHaveLength(2);
    fireEvent.click(buttons("Excel")[1]);
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalled());
    const report = exportReportToExcel.mock.calls[0][0];
    expect(report.title).toBe("Reporte Sin Riesgo — hallazgos");
    expect(report.subtitle).toContain("Previsualización");
    expect(report.columns.map((c) => c.label)).toEqual(["Severidad", "Regla", "Campo", "Mensaje", "Crédito"]);
    // La previsualización llega en camelCase y se normaliza para la tabla.
    expect(report.rows[0]).toMatchObject({ validation_code: "SR.REQ", field_name: "NumId", error_message: "No puede ir vacío", record_key: "C-001" });
    expect(report.columns[0].format(report.rows[1].severity)).toBe("Advertencia");
    expect(report.totals[0].value).toBe("Errores: 1 · Advertencias: 1");
  });
});
