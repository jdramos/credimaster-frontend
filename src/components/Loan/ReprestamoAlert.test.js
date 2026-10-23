import React from "react";
import { render, screen } from "@testing-library/react";
import ReprestamoAlert from "./ReprestamoAlert";

describe("ReprestamoAlert (política de represtamo en la solicitud)", () => {
  test("no muestra nada para un cliente apto o sin evaluar", () => {
    const { container, rerender } = render(<ReprestamoAlert eligibility={{ eligible: true, reasons: [] }} />);
    expect(container.textContent).toBe("");
    rerender(<ReprestamoAlert eligibility={null} />);
    expect(container.textContent).toBe("");
  });

  test("no apto: muestra el motivo y avisa que irá a Comité de Crédito, sin bloquear", () => {
    render(<ReprestamoAlert eligibility={{ eligible: false, reasons: ["peor atraso 71 d > 30 d", "tiene crédito saneado en la institución"] }} />);
    expect(screen.getByText("Cliente no apto para represtamo según la política de crédito")).toBeTruthy();
    expect(screen.getByText("Motivo: peor atraso 71 d > 30 d; tiene crédito saneado en la institución.")).toBeTruthy();
    expect(screen.getByText(/se enviará obligatoriamente a Comité de Crédito/)).toBeTruthy();
  });
});
