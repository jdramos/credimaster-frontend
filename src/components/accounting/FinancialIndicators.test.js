import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import FinancialIndicators from "./FinancialIndicators";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import fixture from "./__fixtures__/financialIndicators.tn01.json";
import compareFixture from "./__fixtures__/financialIndicators.tn01.compare.json";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock("../help/HelpButton", () => () => null);
// recharts usa ResizeObserver, que jsdom no trae.
jest.mock("recharts", () => {
  const Mock = ({ children }) => <div>{children}</div>;
  return { LineChart: Mock, Line: () => null, ResponsiveContainer: Mock, Tooltip: () => null, ReferenceLine: () => null, XAxis: () => null, YAxis: () => null };
});

const renderAs = (user = { role: 2, permissions: ["contabilidad.ver"] }) =>
  render(
    <UserContext.Provider value={user}>
      <FinancialIndicators />
    </UserContext.Provider>,
  );

describe("FinancialIndicators", () => {
  beforeEach(() => {
    API.get.mockReset();
    API.post.mockReset();
    API.get.mockImplementation((url, { params }) => Promise.resolve({ data: params.compare ? compareFixture : fixture }));
  });

  test("muestra los indicadores del tenant: resumen ejecutivo, los 7 grupos y los 28 indicadores", async () => {
    renderAs();
    expect(await screen.findByText(/Resumen ejecutivo/)).toBeTruthy();
    expect(screen.getByText(/Sector: reporte CONAMI de agosto 2026 · 80 instituciones/)).toBeTruthy();
    for (const g of fixture.data.groups) expect(screen.getAllByText(g.label).length).toBeGreaterThan(0);
    expect(screen.getByText("Cartera En Mora / Cartera Bruta")).toBeTruthy();
    expect(screen.getAllByText(/Mes ant\./).length).toBe(28);
    expect(screen.getByText(fixture.data.summary.paragraphs[0].text)).toBeTruthy();
    // Sin IMF elegida no hay columna de comparación.
    expect(screen.queryByText("AFODENIC")).toBeNull();
  });

  test("al abrir pide el corte del último reporte de la CONAMI (sin período) y lo muestra", async () => {
    renderAs();
    await screen.findByText(/Resumen ejecutivo/);
    expect(API.get).toHaveBeenCalledWith("/api/accounting/financial-indicators", { params: {} });
    expect(screen.getByLabelText("Período").textContent).toMatch(/agosto 2026/);
  });

  test("al hacer clic en un indicador muestra su análisis y fórmula", async () => {
    renderAs();
    const row = await screen.findByText("Cartera En Mora / Cartera Bruta");
    fireEvent.click(row);
    const ind = fixture.data.indicators.find((i) => i.key === "mora_cb");
    expect(await screen.findByText(ind.text)).toBeTruthy();
    expect(screen.getByText(`Fórmula: ${ind.formula}`)).toBeTruthy();
  });

  test("el detalle muestra los montos de la fórmula, no solo la fórmula", async () => {
    renderAs();
    fireEvent.click(await screen.findByText("Fondos Disponibles / Activos Totales"));
    const calc = await screen.findByRole("table", { name: "Cálculo de Fondos Disponibles / Activos Totales" });
    expect(within(calc).getByText("Fondos disponibles (11)")).toBeTruthy();
    expect(within(calc).getByText("C$ 465,001.00")).toBeTruthy();
    expect(within(calc).getByText("Activos totales (1)")).toBeTruthy();
    expect(within(calc).getByText("C$ 500,323.30")).toBeTruthy();
    expect(within(calc).getByText("92.94%")).toBeTruthy();
  });

  test("el selector solo compara: pide la IMF elegida y agrega su columna con la diferencia", async () => {
    renderAs();
    await screen.findByText(/Resumen ejecutivo/);
    const input = screen.getByLabelText("Comparar con (IMF del reporte CONAMI)");
    fireEvent.change(input, { target: { value: "AFODENIC" } });
    fireEvent.click(await screen.findByRole("option", { name: "AFODENIC" }));
    await waitFor(() =>
      expect(API.get).toHaveBeenLastCalledWith("/api/accounting/financial-indicators", { params: { compare: "AFODENIC" } }),
    );
    expect((await screen.findAllByRole("columnheader", { name: "AFODENIC" })).length).toBe(7);
    const row = screen.getAllByRole("row").find((r) => within(r).queryByText("Cartera En Mora / Cartera Bruta"));
    expect(within(row).getByText("13.03%")).toBeTruthy();
    expect(within(row).getByText("Usted: −13.03 pp")).toBeTruthy();
    // Los valores del tenant no cambian.
    expect(within(row).getByText("0.00%")).toBeTruthy();
    // No se guarda nada.
    expect(API.post).not.toHaveBeenCalled();
  });

  test("sin permiso de contabilidad no aparece el botón para cargar el reporte", async () => {
    renderAs();
    await screen.findByText(/Resumen ejecutivo/);
    expect(screen.queryByText("Actualizar con reporte CONAMI")).toBeNull();
  });

  test("carga el reporte de la CONAMI y vuelve a calcular", async () => {
    API.post.mockResolvedValue({ data: { ok: true, message: "Reporte de 2026-08-31 cargado: 80 instituciones.", period: "2026-08-31" } });
    renderAs({ role: 2, permissions: ["contabilidad.ver", "contabilidad.cuentas.gestionar"] });
    await screen.findByText(/Resumen ejecutivo/);
    expect(screen.getByText("Actualizar con reporte CONAMI")).toBeTruthy();
    const file = new File(["x"], "reporte_18.xls", { type: "application/vnd.ms-excel" });
    fireEvent.change(screen.getByTestId("conami-report-input"), { target: { files: [file] } });
    await waitFor(() => expect(API.post).toHaveBeenCalledTimes(1));
    const [url, body, config] = API.post.mock.calls[0];
    expect(url).toBe("/api/accounting/financial-indicators/sector-report");
    expect(config.headers["Content-Type"]).toBe("multipart/form-data");
    expect(body.get("file").name).toBe("reporte_18.xls");
    expect(await screen.findByText(/Reporte de 2026-08-31 cargado/)).toBeTruthy();
    await waitFor(() => expect(API.get.mock.calls.length).toBeGreaterThan(1));
  });

  test("avisa cuando el reporte del sector es de otro mes que el consultado", async () => {
    const mismatch = { ...fixture, data: { ...fixture.data, period: "2026-09", sector_period_mismatch: true } };
    API.get.mockResolvedValue({ data: mismatch });
    renderAs();
    expect(await screen.findByText(/Para septiembre 2026 no hay reporte de la CONAMI cargado: la comparación usa el de agosto 2026/)).toBeTruthy();
  });
});
