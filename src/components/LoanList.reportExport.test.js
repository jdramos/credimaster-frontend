import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoanList from "./LoanList";
import { UserContext } from "../contexts/UserContext";
import API from "../api";
import { exportReportToExcel } from "./accounting/exportReportToExcel";

jest.mock("../api", () => ({ get: jest.fn() }));
jest.mock("./accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("./help/HelpButton", () => () => null);
jest.mock("./LoanListDataTable", () => ({ data }) => <div>filas en pantalla: {data.length}</div>);
jest.mock("./Loan/LoanModificationModal", () => () => null);
jest.mock("./BranchSelect", () => () => null);

const loan = (id) => ({
  id,
  customer_identification: `001-${id}`,
  customer_name: `Cliente ${id}`,
  date: "2026-10-01",
  amount: 1000,
  current_balance: 400,
  approval_status: "APROBADO",
});

// 620 créditos: la pantalla muestra una página; el Excel recorre páginas de 500.
const ALL = Array.from({ length: 620 }, (_, i) => loan(i + 1));

describe("LoanList: el Excel trae todas las páginas, no solo la visible", () => {
  beforeEach(() => {
    API.get.mockImplementation(async (url) => {
      const params = new URLSearchParams(url.split("?")[1]);
      const page = Number(params.get("page"));
      const limit = Number(params.get("limit"));
      return { data: { data: ALL.slice((page - 1) * limit, page * limit), total: ALL.length } };
    });
  });

  it("exporta los 620 créditos con totales y estados en español", async () => {
    render(
      <MemoryRouter>
        <UserContext.Provider value={{ permissions: [], role: 1, user: 1 }}>
          <LoanList />
        </UserContext.Provider>
      </MemoryRouter>,
    );
    await screen.findByText(/filas en pantalla: [1-9]/);
    await waitFor(() => expect(screen.getByRole("button", { name: "Excel" }).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Excel" }));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));

    const report = exportReportToExcel.mock.calls[0][0];
    expect(report.rows).toHaveLength(620);
    expect(report.columns.map((c) => c.label)).toEqual(["Crédito #", "Cédula", "Cliente", "Fecha solicitud", "Monto", "Saldo actual", "% Pago", "Estado"]);
    const estado = report.columns.find((c) => c.label === "Estado");
    expect(estado.format("APROBADO")).toBe("Aprobado");
    expect(report.totals[0].value).toContain("620");
    expect(report.fileName).toMatch(/^creditos_/);
    const reportPages = API.get.mock.calls.map(([url]) => url).filter((url) => url.includes("limit=500"));
    expect(reportPages).toHaveLength(2);
  });
});
