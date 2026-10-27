import React from "react";
import { render, screen } from "@testing-library/react";
import CustomerFinancialEvaluationTab from "./CustomerFinancialEvaluationTab";
import API from "../../api";

jest.mock("../../api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock("../../services/financialEvaluationConfig", () => ({ getFinancialEvaluationConfig: () => Promise.resolve(null) }));
jest.mock("../../services/financialEvaluationConcepts", () => ({ getFinancialEvaluationConcepts: () => Promise.resolve([]) }));

const renderTab = (props = {}) =>
  render(<CustomerFinancialEvaluationTab form={{}} setForm={() => {}} {...props} />);

describe("Evaluación financiera en la ficha del cliente", () => {
  beforeEach(() => {
    API.get.mockReset();
    API.post.mockReset();
    API.get.mockResolvedValue({ data: null });
  });

  test("cliente nuevo: no ofrece guardar la evaluación sola (no hay customer_id), se guarda con el cliente", () => {
    renderTab();
    expect(screen.getByText(/se guardará junto con el cliente/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Guardar evaluación/ })).toBeNull();
    expect(API.post).not.toHaveBeenCalled();
  });

  test("cliente ya guardado: se puede guardar la evaluación desde la pestaña", async () => {
    renderTab({ customerId: 4 });
    expect(await screen.findByRole("button", { name: /Guardar evaluación/ })).toBeTruthy();
    expect(screen.queryByText(/se guardará junto con el cliente/)).toBeNull();
  });
});
