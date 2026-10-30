import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import LoanBatchDisbursementDialog from "./LoanBatchDisbursementDialog";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";

jest.mock("../../api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock("../../api/loanApi", () => ({
  loanApi: { createBatchRemittance: jest.fn(), listDisbursableLoans: () => Promise.resolve({ ok: true, data: global.LOANS_FOR_MOCK }) },
}));
jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: 1 }, tenant: { enabled_modules: null } }) }));
jest.mock("../../reports/checkDisbursementDetailReport", () => ({ printCheckDisbursementDetail: jest.fn() }));
jest.mock("../accounting/simulation/AccountingSimulationButton", () => () => null);

const LOANS = (global.LOANS_FOR_MOCK = [
  { id: 1020, credit_code: "1020", customer_name: "Jose Daniel Ramos Duarte", branch_name: "Sucursal Estelí", amount: "10000.00", deduction: "0.00", net_amount: "10000.00" },
  { id: 1021, credit_code: "1021", customer_name: "Gabriela Renee Reyes Portocarrero", branch_name: "Sucursal Estelí", amount: "20000.00", deduction: "500.00", net_amount: "19500.00" },
]);

const renderDialog = () => {
  API.get.mockImplementation((url) =>
    Promise.resolve({ data: /disbursable/.test(url) ? { ok: true, data: LOANS } : { ok: true, data: [] } }),
  );
  return render(
    <UserContext.Provider value={{ user: 1 }}>
      <LoanBatchDisbursementDialog open onClose={() => {}} onSuccess={() => {}} />
    </UserContext.Provider>,
  );
};

describe("Desembolso por lote con deducción", () => {
  beforeEach(() => API.get.mockReset());

  test("muestra la deducción y el neto, y el total es lo que se entrega", async () => {
    renderDialog();
    const row = (await screen.findByText("Gabriela Renee Reyes Portocarrero")).closest("tr");
    expect(row.textContent).toContain("C$ 20,000.00");
    expect(row.textContent).toContain("- C$ 500.00");
    expect(row.textContent).toContain("C$ 19,500.00");

    fireEvent.click(row);
    fireEvent.click(screen.getByText("Jose Daniel Ramos Duarte").closest("tr"));
    expect(screen.getByText(/Total a entregar/).textContent).toContain("C$ 29,500.00");
  });
});

describe("Responsable de entrega", () => {
  beforeEach(() => API.get.mockReset());

  test("solo ofrece usuarios con permiso de entregar desembolsos", async () => {
    const AGENTS = [{ id: 7, user_name: "dhernandez", full_name: "David Hernandez" }];
    API.get.mockImplementation((url) =>
      Promise.resolve({
        data: /disbursable/.test(url)
          ? { ok: true, data: LOANS }
          : /delivery-agents/.test(url)
          ? { ok: true, data: AGENTS }
          : /\/api\/users/.test(url)
          ? [{ id: 18, full_name: "Cajero Ventanilla Managua", user_status: 1 }]
          : { ok: true, data: [] },
      }),
    );
    render(
      <UserContext.Provider value={{ user: 1 }}>
        <LoanBatchDisbursementDialog open onClose={() => {}} onSuccess={() => {}} />
      </UserContext.Provider>,
    );
    await screen.findByText("Gabriela Renee Reyes Portocarrero");
    expect(API.get).toHaveBeenCalledWith("/api/loans/remittances/delivery-agents");
    fireEvent.mouseDown(screen.getByLabelText(/Quién le va a entregar/));
    expect(await screen.findByText("David Hernandez (dhernandez)")).toBeTruthy();
    expect(screen.queryByText(/Cajero Ventanilla Managua/)).toBeNull();
  });
});
