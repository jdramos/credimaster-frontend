import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import LoanModificationModal from "./LoanModificationModal";
import { UserContext } from "../../contexts/UserContext";

jest.mock("../../api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const LOAN = { id: 1014, current_balance: 116874.5, term: 12, interest_rate: 3.9, frequency: "B" };

const renderModal = () =>
  render(
    <UserContext.Provider value={{ role: 1, permissions: [] }}>
      <LoanModificationModal open onClose={() => {}} loan={LOAN} mode="create" />
    </UserContext.Provider>,
  );

const note = () => screen.getByTestId("modification-conditions");

describe("Nota de condiciones para modificar el crédito", () => {
  test("cambia según el tipo de modificación", () => {
    renderModal();

    expect(within(note()).getByText("Condiciones para una prórroga")).toBeTruthy();
    expect(within(note()).getByText("Plazo adicional de hasta 6 meses.")).toBeTruthy();

    fireEvent.mouseDown(screen.getAllByLabelText("Tipo de modificación")[0]);
    fireEvent.click(within(screen.getByRole("listbox")).getByText("Refinanciamiento"));
    expect(within(note()).getByText("Condiciones para un refinanciamiento")).toBeTruthy();
    expect(within(note()).getByText(/clasificación de riesgo A/)).toBeTruthy();

    fireEvent.mouseDown(screen.getAllByLabelText("Tipo de modificación")[0]);
    fireEvent.click(within(screen.getByRole("listbox")).getByText("Reestructuración"));
    expect(within(note()).getByText("Condiciones para una reestructuración")).toBeTruthy();
    expect(within(note()).getByText(/queda pendiente hasta que la aprueben/)).toBeTruthy();
  });
});
