import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BrowseSanctionsListsPanel from "./BrowseSanctionsListsPanel";
import API from "../../api";
import { openReportPopup, printAccountingReport } from "../accounting/printAccountingReport";

jest.mock("../../api", () => ({ get: jest.fn() }));
jest.mock("./SanctionsEntryDetailDialog", () => () => null);
jest.mock("../accounting/printAccountingReport", () => ({ printAccountingReport: jest.fn(), openReportPopup: jest.fn() }));
jest.mock("@mui/x-data-grid", () => ({
  DataGrid: ({ rows }) => <table><tbody>{rows.map((r) => <tr key={r.id}><td>{r.full_name}</td></tr>)}</tbody></table>,
}));

const entry = (id) => ({
  id, full_name: `Persona ${id}`, entry_type: "PERSONA", programs: "NICARAGUA", source: "OFAC SDN", active: 1, listed_on: "2019-07-17",
  remarks_es: "Vinculado a: X.", listed_legal_basis: "Executive Order 13851 (Nicaragua)",
});
const ALL = Array.from({ length: 450 }, (_, i) => entry(i + 1));

const browsePrintCalls = () => API.get.mock.calls.filter(([url, config]) => url === "/api/aml/watchlists/browse" && config.params.pageSize === 200);

describe("BrowseSanctionsListsPanel — Imprimir", () => {
  let popup;
  beforeEach(() => {
    popup = { document: { write: jest.fn() }, close: jest.fn() };
    openReportPopup.mockImplementation(() => popup);
    printAccountingReport.mockResolvedValue(undefined);
    window.alert = jest.fn();
    window.confirm = jest.fn(() => true);
    API.get.mockImplementation((url, config) => {
      if (url.endsWith("/summary")) return Promise.resolve({ data: { sources: [], programs: [] } });
      const { page, pageSize } = config.params;
      return Promise.resolve({ data: { rows: ALL.slice((page - 1) * pageSize, page * pageSize), total: ALL.length } });
    });
  });

  it("imprime todas las entradas con los filtros, no solo la página", async () => {
    render(<MemoryRouter><BrowseSanctionsListsPanel fullPage /></MemoryRouter>);
    await screen.findByText("Persona 1");
    fireEvent.click(screen.getByText("Imprimir"));
    await waitFor(() => expect(printAccountingReport).toHaveBeenCalledTimes(1));

    expect(browsePrintCalls().map(([, c]) => c.params.page)).toEqual([1, 2, 3]);
    expect(browsePrintCalls()[0][1].params.status).toBe("active");
    const def = printAccountingReport.mock.calls[0][0];
    expect(def.popup).toBe(popup);
    expect(def.title).toBe("Listas OFAC / ONU");
    expect(def.subtitle).toBe("Estado: Vigentes");
    expect(def.orientation).toBe("landscape");
    expect(def.columns.map((c) => c.label)).toEqual([
      "Nombre", "Tipo", "Programa(s)", "Motivo de inclusión", "Nacionalidad", "Fecha de nacimiento", "Identificación", "Fecha de inclusión", "Lista",
    ]);
    expect(def.rows).toHaveLength(450);
    expect(def.columns[3].value(def.rows[0])).toBe("Vinculado a: X. — Executive Order 13851 (Nicaragua)");
    expect(def.totals[0].value).toBe("450 entrada(s)");
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it("pide confirmación para listas muy grandes y cancela sin imprimir", async () => {
    window.confirm = jest.fn(() => false);
    API.get.mockImplementation((url) => Promise.resolve({
      data: url.endsWith("/summary") ? { sources: [], programs: [] } : { rows: [entry(1)], total: 18522 },
    }));
    render(<MemoryRouter><BrowseSanctionsListsPanel fullPage /></MemoryRouter>);
    await screen.findByText("Persona 1");
    fireEvent.click(screen.getByText("Imprimir"));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Impresión cancelada."));
    expect(window.confirm.mock.calls[0][0]).toContain("18,522");
    expect(popup.close).toHaveBeenCalled();
    expect(printAccountingReport).not.toHaveBeenCalled();
  });
});
