import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ManagementDashboard from "./ManagementDashboard";
import { getManagementDashboard } from "../../api/dashboardBalances";
import fixture from "./__fixtures__/management.demo.2026-09.json";

jest.mock("../../api/dashboardBalances", () => ({ getManagementDashboard: jest.fn() }));
// recharts usa ResizeObserver, que jsdom no trae.
jest.mock("recharts", () => {
  const Mock = ({ children }) => <div>{children}</div>;
  return { BarChart: Mock, Bar: () => null, CartesianGrid: () => null, Legend: () => null, ResponsiveContainer: Mock, Tooltip: () => null, XAxis: () => null, YAxis: () => null };
});

const PARAMS = { date_from: "2026-09-01", date_to: "2026-09-30", branch_id: undefined, promoter_id: undefined, collector_id: undefined };

describe("ManagementDashboard (tablero gerencial)", () => {
  beforeEach(() => {
    getManagementDashboard.mockReset();
    getManagementDashboard.mockResolvedValue(fixture);
    localStorage.clear();
  });

  test("no consulta hasta que el dashboard termina su primera carga", () => {
    render(<ManagementDashboard params={PARAMS} reloadKey={0} />);
    expect(getManagementDashboard).not.toHaveBeenCalled();
  });

  test("muestra clientes, colocación, recuperación, saneados, tendencia y rankings con datos reales de DEMO", async () => {
    render(<ManagementDashboard params={PARAMS} reloadKey={1} />);
    expect(await screen.findByText("Indicadores gerenciales")).toBeTruthy();
    expect(getManagementDashboard).toHaveBeenCalledWith(expect.objectContaining({ date_from: "2026-09-01", date_to: "2026-09-30" }));
    const c = fixture.data.current;
    // Clientes
    expect(screen.getByText("Nuevos y recurrentes")).toBeTruthy();
    expect(screen.getByText(`${c.customers.recurrent} recurrentes (renovaron)`)).toBeTruthy();
    expect(screen.getAllByText(String(c.customers.new)).length).toBeGreaterThan(0);
    expect(screen.getByText(`${c.customers.became_inactive} se inactivaron en el período`)).toBeTruthy();
    expect(screen.getByText(`de ${c.customers.ended} que terminaron de pagar`)).toBeTruthy();
    // Colocación y recuperación
    // Monto y cantidad en la misma tarjeta.
    expect(screen.getByText(`${c.disbursements.loans} créditos`)).toBeTruthy();
    expect(screen.getByText(`${c.collections.payments} pagos`)).toBeTruthy();
    expect(screen.getByText(new RegExp(`^${c.disbursements.new_loans} nuevos · ${c.disbursements.recurrent_loans} renovaciones · promedio`))).toBeTruthy();
    expect(screen.getByText("Eficiencia de cobro")).toBeTruthy();
    expect(screen.getByText(`${c.collections.efficiency.toFixed(2)}%`)).toBeTruthy();
    // Sin presupuesto activo en DEMO
    expect(screen.getByText("sin presupuesto activo con metas para estos meses")).toBeTruthy();
    // Saneados: en septiembre no hubo recuperaciones de cartera saneada
    expect(screen.getByText("sin recuperaciones en el período")).toBeTruthy();
    // Rankings
    expect(screen.getByText(fixture.data.top_promoters[0].name)).toBeTruthy();
    expect(screen.getByText(fixture.data.top_collectors[0].name)).toBeTruthy();
    // Período con el que se compara (respuesta sin `comparison`: usa el rango anterior)
    expect(screen.getByTestId("compare-period").textContent).toBe("▲▼ vs. período anterior: 02/08/2026 – 31/08/2026");
  });

  test("compara por mes (por omisión) o por año, e indica el período anterior", async () => {
    const withComparison = (mode, label, from, to) => ({ ...fixture, data: { ...fixture.data, comparison: { mode, label, from, to } } });
    getManagementDashboard.mockResolvedValueOnce(withComparison("month", "mes anterior", "2026-08-01", "2026-08-31"));
    render(<ManagementDashboard params={PARAMS} reloadKey={1} />);
    expect(await screen.findByText("▲▼ vs. mes anterior: 01/08/2026 – 31/08/2026")).toBeTruthy();
    expect(getManagementDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ compare: "month" }));

    getManagementDashboard.mockResolvedValueOnce(withComparison("year", "año anterior", "2025-09-01", "2025-09-30"));
    fireEvent.click(screen.getByRole("button", { name: "Año anterior" }));
    expect(await screen.findByText("▲▼ vs. año anterior: 01/09/2025 – 30/09/2025")).toBeTruthy();
    await waitFor(() => expect(getManagementDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ compare: "year" })));
    expect(localStorage.getItem("dashboardCompare")).toBe("year");
  });

  test("avisa cuando el período de comparación no tiene movimientos", async () => {
    const empty = JSON.parse(JSON.stringify(fixture));
    Object.assign(empty.data.previous.disbursements, { loans: 0 });
    Object.assign(empty.data.previous.collections, { payments: 0 });
    Object.assign(empty.data.previous.customers, { active: 0 });
    empty.data.comparison = { mode: "year", label: "año anterior", from: "2025-09-01", to: "2025-09-30" };
    getManagementDashboard.mockResolvedValue(empty);
    render(<ManagementDashboard params={PARAMS} reloadKey={1} />);
    expect(await screen.findByText(/No hay movimientos en el período de comparación \(01\/09\/2025 – 30\/09\/2025\)/)).toBeTruthy();
  });

  test("con meta de colocación muestra el % de cumplimiento", async () => {
    getManagementDashboard.mockResolvedValue({
      ...fixture,
      data: { ...fixture.data, placement_goal: { target_amount: 2000000, target_loans: 30, months: 1, actual_amount: 1542972, actual_loans: 23, achievement: 77.15 } },
    });
    render(<ManagementDashboard params={PARAMS} reloadKey={1} />);
    expect(await screen.findByText("77.15%")).toBeTruthy();
    expect(screen.getByText(/de C\$\s?2,000,000/)).toBeTruthy();
  });

  test("muestra las recuperaciones de cartera saneada del período", async () => {
    const withRecoveries = JSON.parse(JSON.stringify(fixture));
    Object.assign(withRecoveries.data.current.write_offs, {
      recoveries: 3, recovered_loans: 2, recovered_amount: 5850, recovered_principal: 5773.88,
    });
    getManagementDashboard.mockResolvedValue(withRecoveries);
    render(<ManagementDashboard params={PARAMS} reloadKey={1} />);
    expect(await screen.findByText("3 cobros de 2 créditos")).toBeTruthy();
    expect(screen.getByText(/C\$\s?5,850/)).toBeTruthy();
  });

  test("si la base de datos no tiene el registro de recuperaciones, lo indica", async () => {
    const legacy = JSON.parse(JSON.stringify(fixture));
    legacy.data.current.write_offs = { ...legacy.data.current.write_offs, recoveries_available: false };
    getManagementDashboard.mockResolvedValue(legacy);
    render(<ManagementDashboard params={PARAMS} reloadKey={1} />);
    expect(await screen.findByText("no disponible")).toBeTruthy();
  });

  test("si el servidor falla, muestra el mensaje", async () => {
    getManagementDashboard.mockRejectedValue({ response: { data: { message: "No tiene acceso a la sucursal seleccionada." } } });
    render(<ManagementDashboard params={{ ...PARAMS, branch_id: 9 }} reloadKey={1} />);
    await screen.findByText("No tiene acceso a la sucursal seleccionada.");
  });
});
