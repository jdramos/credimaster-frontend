import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import LoanComplianceSection from "./LoanComplianceSection";
import useLoanDetailsData from "./useLoanDetailsData";
import API from "../../../api";
import { useAuth } from "../../../contexts/AuthContext";

jest.mock("../../../api", () => ({ get: jest.fn() }));
jest.mock("../../../contexts/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../RiskBureauQueryPanel", () => () => null);
jest.mock("../DebtorMinInfoPanel", () => () => null);

// Cumplimiento con todo pendiente, como un crédito migrado sin expediente.
const PENDING = {
  evaluation_completed: false,
  central_risk_checked: false,
  documents_complete: false,
  summary: { missing_items: ["No existe evaluación financiera vigente"] },
};

const Probe = () => {
  const { isComplianceValid, complianceMissingItems } = useLoanDetailsData({ open: true, loan: { id: 7 }, clientId: 3 });
  return <div data-testid="probe">{`${isComplianceValid}|${complianceMissingItems.length}`}</div>;
};

describe("Requisitos para aprobar en empresa no normada", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get.mockImplementation((url) =>
      Promise.resolve({ data: url.startsWith("/api/loans/compliance") ? PENDING : [] }),
    );
  });

  it("no normada: el panel no se muestra", () => {
    const { container } = render(
      <LoanComplianceSection compliance={PENDING} isComplianceValid={false} conamiRegulated={false} />,
    );
    expect(container.textContent).toBe("");
  });

  it("normada: el panel se muestra con el título CONAMI", () => {
    render(<LoanComplianceSection compliance={PENDING} isComplianceValid={false} conamiRegulated />);
    expect(screen.getByText("Cumplimiento Normativo (CONAMI)")).toBeTruthy();
  });

  it("no normada: el crédito queda listo para aprobar aunque falten requisitos", async () => {
    useAuth.mockReturnValue({ tenant: { conami_regulated: false } });
    render(<Probe />);
    await waitFor(() => expect(API.get).toHaveBeenCalledWith("/api/loans/compliance/customer/3/7"));
    expect(screen.getByTestId("probe").textContent).toBe("true|0");
  });

  it("normada: los mismos requisitos pendientes bloquean", async () => {
    useAuth.mockReturnValue({ tenant: { conami_regulated: true } });
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("false|1"));
  });
});
