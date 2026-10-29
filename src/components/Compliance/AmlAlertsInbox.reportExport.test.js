import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AmlAlertsInbox from "./AmlAlertsInbox";
import API from "../../api";
import { exportReportToExcel } from "../accounting/exportReportToExcel";
import { openReportPopup, printAccountingReport } from "../accounting/printAccountingReport";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock("../help/HelpButton", () => () => null);
jest.mock("../accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("../accounting/printAccountingReport", () => ({ printAccountingReport: jest.fn(), openReportPopup: jest.fn() }));
jest.mock("@mui/x-data-grid", () => ({
  DataGrid: ({ rows }) => (
    <table><tbody>{rows.map((r) => <tr key={r.id}><td>{r.customer_name}</td></tr>)}</tbody></table>
  ),
}));

// Valor que imprime una columna de la definición del reporte.
const cell = (def, label, row) => {
  const col = def.columns.find((c) => c.label === label);
  const raw = col.value ? col.value(row) : row[col.field];
  return col.format ? col.format(raw) : raw;
};

const ALERT_1 = { id: 1, alert_type: "PAGO_EFECTIVO_ELEVADO", customer_name: "Juan Pérez", identification: "001-1", description: "Pago de C$ 90,000", triggered_at: "2026-10-20T09:15:00", status: "OPEN" };
const ALERT_2 = { id: 2, alert_type: "FRACCIONAMIENTO_EFECTIVO", customer_name: "María López", identification: "001-2", description: "3 pagos el mismo día", triggered_at: "2026-10-21T10:00:00", status: "OPEN" };
const FREQUENCY = [
  { customer_name: "Juan Pérez", customer_identification: "001-1", alert_type: "PAGO_EFECTIVO_ELEVADO", total: 3 },
  { customer_name: "María López", customer_identification: "001-2", alert_type: "FRACCIONAMIENTO_EFECTIVO", total: 2 },
];

describe("AmlAlertsInbox — Imprimir / Excel", () => {
  let popup;
  beforeEach(() => {
    popup = { document: { write: jest.fn() }, close: jest.fn() };
    openReportPopup.mockImplementation(() => popup);
    printAccountingReport.mockResolvedValue(undefined);
    API.get.mockImplementation((url, config) => {
      if (url === "/api/aml/alerts/frequency-report") return Promise.resolve({ data: FREQUENCY });
      // La bandeja pagina en el servidor (100 por página): página 1 y 2.
      const page = config?.params?.page || 1;
      return Promise.resolve({
        data: {
          data: page === 1 ? [ALERT_1] : [ALERT_2],
          summary: { OPEN: 2, UNDER_REVIEW: 0, DISMISSED: 0, ESCALATED: 0 },
          pagination: { page, limit: 100, total: 2, totalPages: 2 },
        },
      });
    });
  });

  it("Excel de la bandeja trae todas las páginas del estado filtrado", async () => {
    render(<AmlAlertsInbox />);
    await screen.findAllByText("Juan Pérez");
    fireEvent.click(screen.getAllByText("Excel")[0]);
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));

    const def = exportReportToExcel.mock.calls[0][0];
    expect(def.title).toBe("Alertas de Operaciones Inusuales");
    expect(def.subtitle).toBe("Estado: Abierta");
    expect(def.columns.map((c) => c.label)).toEqual(["Tipo", "Cliente", "Identificación", "Descripción", "Fecha", "Estado"]);
    expect(def.rows.map((r) => r.customer_name)).toEqual(["Juan Pérez", "María López"]);
    expect(cell(def, "Tipo", def.rows[1])).toBe("Fraccionamiento en efectivo");
    expect(cell(def, "Fecha", def.rows[0])).toBe("2026-10-20 09:15");
    expect(cell(def, "Estado", def.rows[0])).toBe("Abierta");
    expect(def.totals[0].value).toBe("2 alerta(s)");
    expect(API.get).toHaveBeenCalledWith("/api/aml/alerts", { params: { status: "OPEN", limit: 100, page: 2 } });
  });

  it("Imprimir la frecuencia por cliente lleva el total de veces", async () => {
    render(<AmlAlertsInbox />);
    await screen.findAllByText("María López");
    fireEvent.click(screen.getAllByText("Imprimir")[1]);
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalledTimes(1));

    const def = printAccountingReport.mock.calls[0][0];
    expect(def.popup).toBe(popup);
    expect(def.title).toBe("Frecuencia de alertas por cliente");
    expect(def.period).toMatch(/^Del \d{4}-\d{2}-\d{2} al \d{4}-\d{2}-\d{2}$/);
    expect(def.columns.map((c) => c.label)).toEqual(["Cliente", "Identificación", "Tipo de alerta", "Veces"]);
    expect(def.rows).toHaveLength(2);
    expect(cell(def, "Tipo de alerta", def.rows[0])).toBe("Pago en efectivo elevado");
    expect(def.totals).toEqual([{ value: "Total", colspan: 3 }, { value: "5", raw: 5, numeric: true }]);
  });

  it("los botones quedan deshabilitados sin filas", async () => {
    API.get.mockImplementation((url) => Promise.resolve({
      data: url === "/api/aml/alerts/frequency-report" ? [] : { data: [], summary: {}, pagination: { totalPages: 0 } },
    }));
    render(<AmlAlertsInbox />);
    await screen.findByText("Sin alertas en el período.");
    screen.getAllByRole("button", { name: "Excel" }).forEach((b) => expect(b.disabled).toBe(true));
    screen.getAllByRole("button", { name: "Imprimir" }).forEach((b) => expect(b.disabled).toBe(true));
  });
});
