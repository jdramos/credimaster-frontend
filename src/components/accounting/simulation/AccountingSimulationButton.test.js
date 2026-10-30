import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AccountingSimulationButton from "./AccountingSimulationButton";
import { buildSimulationReport, canSimulateAccounting, SIMULATION_HEADER } from "./accountingSimulation";
import { UserContext } from "../../../contexts/UserContext";
import { useAuth } from "../../../contexts/AuthContext";
import API from "../../../api";

jest.mock("../../../api", () => ({ request: jest.fn(), get: jest.fn() }));
jest.mock("../../../contexts/AuthContext", () => ({ useAuth: jest.fn() }));

// Pago de C$ 1,123 en oficina: su parte del comprobante del cierre del día.
const SIMULATION = {
  simulation: true,
  operation: "Pago",
  entries: [
    {
      timing: "DAY_CLOSE",
      entry_date: "2026-10-30",
      branch_name: "León",
      description: "Contabilización de pagos 2026-10-30 al 2026-10-30",
      source_type: "POSTING_RUN",
      lines: [
        { account_id: 4, account_code: "1101.01", account_name: "Caja general", debit: 1123, credit: 0, description: "Cobro" },
        { account_id: 171, account_code: "1401.01.01", account_name: "Cartera vigente", debit: 0, credit: 1000, description: "Capital" },
        { account_id: 238, account_code: "1406.01.01", account_name: "Intereses por cobrar", debit: 0, credit: 123, description: "Interés" },
      ],
      total_debit: 1123,
      total_credit: 1123,
      balanced: true,
    },
  ],
  totals: { debit: 1123, credit: 1123, balanced: true },
  notes: ["Los pagos no se contabilizan al confirmar: entran al comprobante resumen del cierre del día 2026-10-30 de la sucursal."],
};

const REQUEST = { method: "post", url: "/api/payments", data: { params: { loan_id: 460, payment_amount: 1123 } } };

const renderButton = ({ role = 4, permissions = ["contabilidad.simulacion.ver"], enabledModules = null, request = () => REQUEST } = {}) => {
  useAuth.mockReturnValue({ tenant: { enabled_modules: enabledModules } });
  return render(
    <UserContext.Provider value={{ role, permissions }}>
      <AccountingSimulationButton request={request} />
    </UserContext.Provider>,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Ver simulación contable", () => {
  it("no aparece sin el permiso contabilidad.simulacion.ver", () => {
    renderButton({ permissions: ["contabilidad.ver", "pagos.insertar"] });
    expect(screen.queryByText("Ver simulación contable")).toBeNull();
  });

  it("no aparece si la empresa no tiene el módulo de contabilidad", () => {
    renderButton({ enabledModules: ["caja", "banks"] });
    expect(screen.queryByText("Ver simulación contable")).toBeNull();
  });

  it("el administrador la ve sin el permiso explícito", () => {
    renderButton({ role: 1, permissions: [] });
    expect(screen.getByText("Ver simulación contable")).toBeTruthy();
  });

  it("manda la misma ruta y cuerpo de la operación con la cabecera de simulación y muestra el asiento", async () => {
    API.request.mockResolvedValue({ data: SIMULATION });
    renderButton();
    fireEvent.click(screen.getByText("Ver simulación contable"));

    expect(await screen.findByText("Cartera vigente")).toBeTruthy();
    expect(API.request).toHaveBeenCalledWith({
      method: "post",
      url: "/api/payments",
      data: REQUEST.data,
      params: undefined,
      headers: { [SIMULATION_HEADER]: "1" },
    });
    expect(screen.getByText("1401.01.01")).toBeTruthy();
    expect(screen.getByText("Caja general")).toBeTruthy();
    expect(screen.getByText("En el cierre del día")).toBeTruthy();
    expect(screen.getByText("Débito = Crédito")).toBeTruthy();
    expect(screen.getByText("Cuadrado")).toBeTruthy();
    expect(screen.getByText(/comprobante resumen del cierre del día/)).toBeTruthy();
    // Imprimir y Excel con el helper compartido.
    expect(screen.getByText("Imprimir")).toBeTruthy();
    expect(screen.getByText("Excel")).toBeTruthy();
  });

  it("muestra el mensaje del backend si la operación no procede o no hay permiso", async () => {
    API.request.mockRejectedValue({ response: { status: 403, data: { message: "No tiene permiso para ver la simulación contable." } } });
    renderButton();
    fireEvent.click(screen.getByText("Ver simulación contable"));
    expect(await screen.findByText("No tiene permiso para ver la simulación contable.")).toBeTruthy();
  });

  it("si faltan datos de la operación no llama al backend", async () => {
    renderButton({ request: () => null });
    fireEvent.click(screen.getByText("Ver simulación contable"));
    expect(await screen.findByText(/Complete los datos de la operación/)).toBeTruthy();
    expect(API.request).not.toHaveBeenCalled();
  });
});

describe("Simulación contable: reglas y reporte", () => {
  it("permiso y módulo", () => {
    expect(canSimulateAccounting({ role: 4, permissions: ["contabilidad.simulacion.ver"], enabledModules: null })).toBe(true);
    expect(canSimulateAccounting({ role: 4, permissions: ["contabilidad.simulacion.ver"], enabledModules: ["accounting"] })).toBe(true);
    expect(canSimulateAccounting({ role: 4, permissions: ["contabilidad.simulacion.ver"], enabledModules: ["caja"] })).toBe(false);
    expect(canSimulateAccounting({ role: 1, permissions: [], enabledModules: ["caja"] })).toBe(false);
    expect(canSimulateAccounting({ role: 4, permissions: [], enabledModules: null })).toBe(false);
  });

  it("el reporte de Imprimir/Excel trae una fila por línea con su comprobante y los totales", () => {
    const report = buildSimulationReport(SIMULATION, { title: "Simulación contable — Pago" });
    expect(report.title).toBe("Simulación contable — Pago");
    const lines = report.rows.filter((r) => !r.section && !r.total);
    expect(lines.map((r) => r.account_code)).toEqual(["1101.01", "1401.01.01", "1406.01.01"]);
    expect(lines[0]).toMatchObject({ timing: "En el cierre del día", debit: 1123, credit: 0 });
    expect(report.rows.find((r) => r.total)).toMatchObject({ debit: 1123, credit: 1123 });
    expect(report.totals[0].value).toBe("Totales (cuadrado)");
    expect(report.totals[1]).toMatchObject({ raw: 1123, numeric: true });
  });
});
