import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ManagementDashboard from "./ManagementDashboard";
import { getManagementDashboard } from "../../api/dashboardBalances";
import { exportReportToExcel } from "../accounting/exportReportToExcel";
import fixture from "./__fixtures__/management.demo.2026-09.json";

jest.mock("../../api/dashboardBalances", () => ({ getManagementDashboard: jest.fn() }));
jest.mock("../accounting/exportReportToExcel", () => ({ exportReportToExcel: jest.fn() }));
jest.mock("../accounting/printAccountingReport", () => ({ openReportPopup: jest.fn(), printAccountingReport: jest.fn() }));
jest.mock("recharts", () => {
  const Mock = ({ children }) => <div>{children}</div>;
  return { BarChart: Mock, Bar: () => null, CartesianGrid: () => null, Legend: () => null, ResponsiveContainer: Mock, Tooltip: () => null, XAxis: () => null, YAxis: () => null };
});

const PARAMS = { date_from: "2026-09-01", date_to: "2026-09-30" };

const withProducts = () => {
  const data = JSON.parse(JSON.stringify(fixture));
  const product = (id, code, name, capital) => ({
    product_id: id,
    code,
    name,
    status: "ACTIVE",
    portfolio: { loans: 10, capital, share: 50, overdue_capital: 100, overdue_pct: 5, par30_pct: 1.5, provision: 1200 },
    placement: { loans: 2, amount: 5000, new_customers: 1 },
    collections: { total: 10000 },
  });
  data.data.by_product = {
    rows: [product(1, "MIC", "Microcrédito", 60000), product(2, "PER", "Personales", 40000)],
    totals: {
      portfolio: { loans: 20, capital: 100000, overdue_capital: 200, provision: 2400, overdue_pct: 5, par30_pct: 1.5 },
      placement: { loans: 4, amount: 10000, new_customers: 2 },
      collections: { total: 20000 },
    },
  };
  return data;
};

describe("Tablero gerencial: imprimir / Excel", () => {
  beforeEach(() => {
    getManagementDashboard.mockResolvedValue(fixture);
    localStorage.clear();
  });

  test("Excel exporta las tarjetas, la tendencia y los rankings", async () => {
    render(<ManagementDashboard params={PARAMS} reloadKey={1} />);
    await screen.findByText("Indicadores gerenciales");
    fireEvent.click(screen.getByText("Excel"));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalled());
    const report = exportReportToExcel.mock.calls[0][0];
    const c = fixture.data.current;
    expect(report.title).toBe("Indicadores gerenciales");
    expect(report.period).toBe("Del 01/09/2026 al 30/09/2026");
    expect(report.subtitle).toBe("Variación vs. período anterior (02/08/2026 – 31/08/2026)");
    expect(report.columns.map((col) => col.label)).toEqual(["Concepto", "Monto (C$)", "Cantidad", "%", "Variación (%)", "Detalle"]);
    const byConcept = (concept) => report.rows.find((r) => r.concept === concept);
    expect(report.rows.filter((r) => r.section).map((r) => r.concept)).toEqual([
      "Clientes",
      "Colocación",
      "Recuperación",
      "Cartera saneada",
      "Colocación y recuperación, últimos 12 meses",
      "Promotores con más colocación",
      "Cobradores con más recuperación",
    ]);
    expect(byConcept("Clientes nuevos").count).toBe(c.customers.new);
    expect(byConcept("Desembolsado")).toEqual(expect.objectContaining({ amount: c.disbursements.amount, count: c.disbursements.loans }));
    expect(byConcept("Eficiencia de cobro").percent).toBeCloseTo(c.collections.efficiency, 2);
    expect(byConcept("Meta de colocación").detail).toBe("sin presupuesto activo con metas para estos meses");
    const top = fixture.data.top_promoters[0];
    expect(byConcept(`1. ${top.name}`)).toEqual(expect.objectContaining({ amount: top.amount, count: top.loans }));
    expect(report.rows.filter((r) => / · Desembolsado$/.test(r.concept))).toHaveLength(fixture.data.trend.length);
  });

  test("la tabla por producto exporta sus columnas y la fila de totales", async () => {
    getManagementDashboard.mockResolvedValue(withProducts());
    render(<ManagementDashboard params={PARAMS} reloadKey={1} products={[{ id: 1, code: "MIC", name: "Microcrédito" }]} />);
    const section = await screen.findByTestId("product-performance");
    fireEvent.click(within(section).getByText("Excel"));
    await waitFor(() => expect(exportReportToExcel).toHaveBeenCalled());
    const report = exportReportToExcel.mock.calls[0][0];
    expect(report.title).toBe("Desempeño por producto");
    expect(report.period).toBe("Del 01/09/2026 al 30/09/2026");
    expect(report.columns.map((col) => col.label)).toEqual([
      "Producto", "Cartera", "Créditos", "Particip. %", "En riesgo %", "Capital en riesgo", "PAR 30 %", "Provisión", "Colocado", "Créd. colocados", "Nuevos", "Recuperado",
    ]);
    expect(report.rows.map(report.columns[0].value)).toEqual(["MIC Microcrédito", "PER Personales"]);
    expect(report.totals[0].value).toBe("Total");
    expect(report.totals[1]).toEqual(expect.objectContaining({ raw: 100000, numeric: true }));
  });
});
