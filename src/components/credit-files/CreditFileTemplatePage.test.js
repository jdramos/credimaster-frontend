import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import CreditFileTemplatePage from "./CreditFileTemplatePage";
import { getCreditFileTemplates, updateCreditFileTemplate } from "../../api/creditFileTemplates";

// La DataGrid real no pinta filas en jsdom (virtualización): se reemplaza por
// una tabla simple que usa los mismos renderCell de las columnas.
jest.mock("@mui/x-data-grid", () => ({
  DataGrid: ({ rows, columns }) => (
    <div>
      {rows.map((r) => (
        <div role="row" key={r.id}>
          {columns.map((c) => (
            <div key={c.field}>{c.renderCell ? c.renderCell({ value: r[c.field], row: r }) : String(r[c.field] ?? "")}</div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

jest.mock("../../api/creditFileTemplates", () => ({
  getCreditFileTemplates: jest.fn(),
  updateCreditFileTemplate: jest.fn(),
  createCreditFileTemplate: jest.fn(),
}));

const row = (over = {}) => ({
  id: 2, sort_order: 2, code: "ID_DOC", section: "IDENTIDAD", title: "Documento de identidad",
  is_mandatory: true, is_active: true, applies_to_new_loans: true, applies_to_renewals: true, applies_to_refinancing: true, ...over,
});

describe("Plantilla de expediente: desactivar un documento lo vuelve opcional", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    updateCreditFileTemplate.mockResolvedValue({});
  });

  test("al apagar Activo se guarda como opcional y la columna Tipo cambia", async () => {
    getCreditFileTemplates.mockResolvedValue({ data: [row()] });
    render(<CreditFileTemplatePage />);
    const title = await screen.findByText("Documento de identidad");
    const gridRow = title.closest('[role="row"]');
    expect(gridRow.textContent).toContain("Obligatorio");

    fireEvent.click(within(gridRow).getByRole("checkbox"));

    await waitFor(() => expect(updateCreditFileTemplate).toHaveBeenCalledTimes(1));
    const [, payload] = updateCreditFileTemplate.mock.calls[0];
    expect(payload.is_active).toBe(false);
    expect(payload.is_mandatory).toBe(false);
    await waitFor(() => expect(screen.getByText("Documento de identidad").closest('[role="row"]').textContent).toContain("Opcional"));
  });

  test("un documento inactivo que venía marcado obligatorio se muestra como opcional", async () => {
    getCreditFileTemplates.mockResolvedValue({ data: [row({ is_active: false, is_mandatory: true })] });
    render(<CreditFileTemplatePage />);
    const gridRow = (await screen.findByText("Documento de identidad")).closest('[role="row"]');
    expect(gridRow.textContent).toContain("Opcional");
    expect(gridRow.textContent).not.toContain("Obligatorio");
  });
});
