import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import fixture from "../../reports/__fixtures__/ngrcReports.demo.json";
import NgrcCompliance from "./NgrcCompliance";
import NgrcDeadlineAlert from "./NgrcDeadlineAlert";
import NgrcReportView from "./NgrcReportView";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("../../reports/reportViewer", () => ({ openReport: jest.fn() }));

const renderWith = (ui, { role = 1, permissions = [], path = "/ngrc/cumplimiento" } = {}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <UserContext.Provider value={{ role, permissions }}>{ui}</UserContext.Provider>
    </MemoryRouter>,
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Aviso NGRC en la barra superior", () => {
  it("muestra las obligaciones vencidas", async () => {
    API.get.mockResolvedValue({
      data: { total: 2, overdue: 1, due_soon: 1, items: [{ article: "Art. 9", title: "Exposición", period_label: "tercer trimestre 2026", status: "VENCIDO", days_left: -2 }] },
    });
    renderWith(<NgrcDeadlineAlert />);
    expect(await screen.findByText("NGRC: 1 obligación vencida")).toBeTruthy();
  });

  it("no muestra nada sin pendientes", async () => {
    API.get.mockResolvedValue({ data: { total: 0, overdue: 0, due_soon: 0, items: [] } });
    const { container } = renderWith(<NgrcDeadlineAlert />);
    await waitFor(() => expect(API.get).toHaveBeenCalled());
    expect(container.innerHTML).toBe("");
  });
});

describe("Pantalla de cumplimiento NGRC", () => {
  it("lista las obligaciones y registra un cumplimiento con la fecha de Junta", async () => {
    API.get.mockResolvedValue({ data: fixture.OBLIGACIONES });
    API.post.mockResolvedValue({ data: { id: 1 } });
    renderWith(<NgrcCompliance />);
    expect(await screen.findByText(/Reporte de exposición al riesgo de crédito/)).toBeTruthy();
    expect(screen.getByText("Envíos a la CONAMI")).toBeTruthy();
    expect(screen.getByText(/Actualización y análisis de la información de los deudores/)).toBeTruthy();

    const row = screen.getByText(/Reporte de exposición al riesgo de crédito/).closest("tr");
    fireEvent.click(within(row).getByText("Registrar"));
    expect(await screen.findByText("Registrar cumplimiento")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Referencia"), { target: { value: "Acta 12" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
    await waitFor(() => expect(API.post).toHaveBeenCalled());
    const [url, body] = API.post.mock.calls[0];
    expect(url).toBe("/api/ngrc/records");
    expect(body.get("obligation_code")).toBe("EXPOSICION_TRIMESTRAL");
    expect(body.get("reference")).toBe("Acta 12");
    expect(body.get("period_key")).toMatch(/^\d{4}-T[1-4]$/);
  });

  it("sin permiso de gestión no ofrece registrar", async () => {
    API.get.mockResolvedValue({ data: fixture.OBLIGACIONES });
    renderWith(<NgrcCompliance />, { role: 5, permissions: ["ngrc.cumplimiento.ver"] });
    await screen.findByText(/Reporte de exposición al riesgo de crédito/);
    expect(screen.queryByRole("button", { name: "Registrar" })).toBeNull();
  });
});

describe("Reportes NGRC en pantalla", () => {
  it("muestra el reporte de valuaciones y clasifica garantías", async () => {
    API.get.mockResolvedValue({ data: fixture.VALUACIONES });
    API.put.mockResolvedValue({ data: {} });
    renderWith(<NgrcReportView initialType="VALUACIONES" />);
    expect((await screen.findAllByText("Inmuebles adjudicados")).length).toBeGreaterThan(0);
    expect(API.get).toHaveBeenCalledWith("/api/ngrc/reports/VALUACIONES", expect.anything());
    // [0] = «Incluir los que están al día», [1] = seleccionar todas, [2] = primera garantía.
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[2]);
    expect(await screen.findByText("1 seleccionada(s):")).toBeTruthy();
  });

  it("muestra la calificación por categoría", async () => {
    API.get.mockResolvedValue({ data: fixture.CLASIFICACION });
    renderWith(<NgrcReportView initialType="CLASIFICACION" initialCut="2026-09-30" />);
    expect(await screen.findByText("Resumen por categoría")).toBeTruthy();
    expect(screen.getByText("Anexo: detalle por crédito")).toBeTruthy();
    expect(API.get).toHaveBeenCalledWith("/api/ngrc/reports/CLASIFICACION", { params: { cut: "2026-09-30" } });
  });
});
