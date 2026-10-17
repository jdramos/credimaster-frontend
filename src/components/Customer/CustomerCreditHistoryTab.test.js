import React from "react";
import { render, screen, within } from "@testing-library/react";
import CustomerCreditHistoryTab from "./CustomerCreditHistoryTab";
import API from "../../api";
import fixture from "./__fixtures__/creditHistory.demo.json";

jest.mock("../../api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("../Loan/detail/LoanDetailsModal", () => () => null);

describe("Historial crediticio del cliente", () => {
  beforeEach(() => API.get.mockReset());

  test("muestra calificación, resumen, cuotas por crédito y la tabla de créditos", async () => {
    API.get.mockResolvedValue({ data: fixture });
    render(<CustomerCreditHistoryTab customerId={8} />);
    expect(API.get).toHaveBeenCalledWith("/api/customers/8/credit-history");

    const s = fixture.data.summary;
    expect((await screen.findByTestId("credit-rating")).textContent).toBe("Malo");
    expect(screen.getByText("Comportamiento crediticio")).toBeTruthy();
    expect(screen.getByText(`${s.max_days_late} días`)).toBeTruthy();

    // Una fila de cuotas por crédito desembolsado, con su tramo de atraso.
    for (const loan of fixture.data.loans.filter((l) => l.disbursement_date)) {
      expect(screen.getByText(`Crédito ${loan.credit_code}`)).toBeTruthy();
    }
    const total = fixture.data.loans.reduce((n, l) => n + l.installments.length, 0);
    expect(document.querySelectorAll("[data-bucket]").length).toBe(total);
    expect(document.querySelectorAll('[data-bucket="WRITTEN_OFF"]').length).toBeGreaterThan(0);

    // Tabla: el crédito saneado muestra su monto saneado y fecha.
    const wo = fixture.data.loans.find((l) => l.status === "WRITTEN_OFF");
    const row = screen.getAllByText(wo.credit_code).map((el) => el.closest("tr")).find(Boolean);
    expect(within(row).getByText("Saneado")).toBeTruthy();
    expect(within(row).getByText(/saneado$/)).toBeTruthy();
  });

  test("cliente sin créditos", async () => {
    API.get.mockResolvedValue({ data: { ok: true, data: { summary: { rating: "SIN_HISTORIAL" }, collections: {}, loans: [] } } });
    render(<CustomerCreditHistoryTab customerId={99} />);
    expect(await screen.findByText("El cliente todavía no tiene créditos registrados.")).toBeTruthy();
  });

  test("error del servidor", async () => {
    API.get.mockRejectedValue({ response: { data: { message: "No se pudo obtener el historial crediticio del cliente" } } });
    render(<CustomerCreditHistoryTab customerId={8} />);
    expect(await screen.findByText("No se pudo obtener el historial crediticio del cliente")).toBeTruthy();
  });
});
