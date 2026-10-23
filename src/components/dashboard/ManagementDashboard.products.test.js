import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ManagementDashboard from "./ManagementDashboard";
import { getManagementDashboard } from "../../api/dashboardBalances";
import fixture from "./__fixtures__/management.demo.2026-09.json";

jest.mock("../../api/dashboardBalances", () => ({ getManagementDashboard: jest.fn() }));
jest.mock("recharts", () => {
  const Mock = ({ children }) => <div>{children}</div>;
  return { BarChart: Mock, Bar: () => null, CartesianGrid: () => null, Legend: () => null, ResponsiveContainer: Mock, Tooltip: () => null, XAxis: () => null, YAxis: () => null };
});

const PARAMS = { date_from: "2026-10-01", date_to: "2026-10-22" };
const PRODUCTS = [
  { id: 1, code: "MIC", name: "Microcrédito", status: "ACTIVE" },
  { id: 2, code: "PER", name: "Personales", status: "ACTIVE" },
];
const row = (id, code, name, capital, share, overdue, placement, prevCapital) => ({
  product_id: id,
  code,
  name,
  status: "ACTIVE",
  portfolio: { loans: 10, customers: 10, capital, share, overdue_capital: (capital * overdue) / 100, overdue_pct: overdue, par30_capital: 0, par30_pct: 1.5, provision: 1200, cut_date: "2026-10-22" },
  placement: { loans: 2, amount: placement, new_customers: 1 },
  collections: { principal: 9000, interest: 1000, total: 10000 },
  previous: { capital: prevCapital, overdue_pct: 0, par30_pct: 0, placement_amount: 50000, placement_loans: 1, collections_total: 0 },
});
const withProducts = () => {
  const data = JSON.parse(JSON.stringify(fixture));
  data.data.by_product = {
    cut_date: "2026-10-22",
    rows: [row(1, "MIC", "Microcrédito", 11771070.41, 98, 22.45, 728770, 11528204.08), row(2, "PER", "Personales", 240000, 2, 0, 0, 0)],
    totals: {
      portfolio: { loans: 20, capital: 12011070.41, overdue_capital: 2642764.75, par30_capital: 0, provision: 2400, overdue_pct: 22.0, par30_pct: 2.22 },
      placement: { loans: 4, amount: 728770, new_customers: 2 },
      collections: { total: 20000 },
      previous: { capital: 11528204.08, placement_amount: 100000 },
    },
  };
  return data;
};

describe("Tablero gerencial: productos financieros", () => {
  beforeEach(() => {
    getManagementDashboard.mockReset();
    localStorage.clear();
  });

  test("muestra el desempeño por producto con participación, mora y variación", async () => {
    getManagementDashboard.mockResolvedValue(withProducts());
    render(<ManagementDashboard params={PARAMS} reloadKey={1} products={PRODUCTS} />);
    const section = await screen.findByTestId("product-performance");
    expect(screen.getByText("Desempeño por producto")).toBeTruthy();
    const t = within(section);
    expect(t.getByText("Microcrédito")).toBeTruthy();
    expect(t.getByText("98.00%")).toBeTruthy();
    expect(t.getByText("22.45%")).toBeTruthy();
    expect(t.getByText(/▲ 2\.1%/)).toBeTruthy(); // 11.77 M vs 11.53 M
    expect(t.getByText("Total")).toBeTruthy();
  });

  test("sin productos financieros no muestra la sección ni el filtro", async () => {
    getManagementDashboard.mockResolvedValue(fixture);
    render(<ManagementDashboard params={PARAMS} reloadKey={1} />);
    await screen.findByText("Indicadores gerenciales");
    expect(screen.queryByTestId("product-performance")).toBeNull();
    expect(screen.queryByLabelText("Producto")).toBeNull();
  });

  test("el filtro de producto vuelve a consultar con product_id y avisa que las metas no se desglosan", async () => {
    const data = withProducts();
    data.data.placement_goal = null;
    getManagementDashboard.mockResolvedValue(data);
    render(<ManagementDashboard params={PARAMS} reloadKey={1} products={PRODUCTS} />);
    await screen.findByTestId("product-performance");
    fireEvent.mouseDown(screen.getByLabelText("Producto"));
    fireEvent.click(await screen.findByRole("option", { name: "PER — Personales" }));
    await waitFor(() => expect(getManagementDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ product_id: "2" })));
    expect(await screen.findByText(/Indicadores gerenciales del producto PER — Personales/)).toBeTruthy();
    expect(screen.getByText("las metas del presupuesto no se desglosan por producto")).toBeTruthy();
  });
});
