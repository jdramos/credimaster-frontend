import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import MucFormTable from "./MucFormTable";
import BalanceSheet from "./BalanceSheet";
import API from "../../api";

jest.mock("../../api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("../help/HelpButton", () => () => null);
jest.mock("./ReportBranchFilter", () => () => null);
jest.mock("./ReportSignaturesDialog", () => () => null);
jest.mock("./printAccountingReport", () => ({ printAccountingReport: jest.fn() }));
jest.mock("@mui/x-data-grid", () => ({ DataGrid: ({ rows }) => <div data-testid="detail-grid">{rows.length} cuentas</div> }));

const movement = (muc_code, account_name, account_type, nature, debit, credit) => ({
  account_id: muc_code,
  muc_code,
  account_name,
  account_type,
  nature,
  is_movement: 1,
  total_debit: debit,
  total_credit: credit,
  balance: nature === "DEBIT" ? debit - credit : credit - debit,
});

// Balanza mínima que cuadra: activo 1,000 = pasivo 300 + capital 600 + resultado 100.
const TRIAL = [
  movement("1102.01.01", "Depósitos en cuenta corriente", "ACTIVO", "DEBIT", 400, 0),
  movement("1401.01.01", "Créditos vigentes", "ACTIVO", "DEBIT", 650, 0),
  movement("1408.01.01", "Provisión cartera vigente", "ACTIVO", "CREDIT", 0, 50),
  movement("2202.08", "Préstamos de fondeadores", "PASIVO", "CREDIT", 0, 300),
  movement("3101.01.01", "Capital ordinario", "PATRIMONIO", "CREDIT", 0, 600),
  movement("4106.01.01", "Intereses de cartera", "INGRESO", "CREDIT", 0, 180),
  movement("5401.01.01", "Sueldos", "GASTO", "DEBIT", 80, 0),
];

describe("Estados financieros en pantalla con el modelo de la CONAMI", () => {
  test("MucFormTable resalta secciones y totales y formatea montos", () => {
    render(
      <MucFormTable
        columns={[{ field: "label", label: "Concepto" }, { field: "current", label: "2026", numeric: true }]}
        rows={[{ label: "ACTIVO", current: "", section: true }, { label: "Fondos disponibles", current: 1234.5 }, { label: "Total Activos", current: 1234.5, total: true }]}
      />,
    );
    expect(screen.getByText("ACTIVO").closest("tr").dataset.rowKind).toBe("section");
    expect(screen.getByText("Total Activos").closest("tr").dataset.rowKind).toBe("total");
    expect(screen.getAllByText("1,234.50").length).toBe(2);
  });

  test("el Balance General muestra la Forma A en pantalla y el detalle por cuenta en otra pestaña", async () => {
    API.get.mockResolvedValue({ data: { data: TRIAL } });
    render(<BalanceSheet />);
    expect(screen.getByText("Elija la fecha de corte y presione Generar.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Generar" }));
    const fondos = await screen.findByText("Fondos disponibles");
    expect(within(fondos.closest("tr")).getAllByText("400.00").length).toBeGreaterThan(0);
    expect(within(screen.getByText("Cartera de créditos, neto").closest("tr")).getAllByText("600.00").length).toBeGreaterThan(0);
    expect(within(screen.getByText("Total Activos").closest("tr")).getAllByText("1,000.00").length).toBeGreaterThan(0);
    expect(within(screen.getByText("Resultado del ejercicio").closest("tr")).getAllByText("100.00").length).toBeGreaterThan(0);
    expect(within(screen.getByText("Total Pasivo y Patrimonio").closest("tr")).getAllByText("1,000.00").length).toBeGreaterThan(0);
    // La columna del año usa la fecha de corte (hoy por omisión).
    expect(screen.getByRole("columnheader", { name: String(new Date().getFullYear()) })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Detalle por cuenta" }));
    expect(screen.getByTestId("detail-grid").textContent).toBe("6 cuentas");
    expect(screen.getByText("Solo cuentas con saldo")).toBeTruthy();
  });
});
