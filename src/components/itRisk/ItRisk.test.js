import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import ItRiskIncidents from "./ItRiskIncidents";
import ItRiskAssessments from "./ItRiskAssessments";
import ItRiskDeadlineAlert from "./ItRiskDeadlineAlert";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("../help/HelpButton", () => () => null);
jest.mock("../../reports/reportViewer", () => ({ openReport: jest.fn() }));

const catalog = {
  incident_types: {
    SECURITY_INCIDENT: { label: "Incidente de seguridad (datos de clientes)", short: "Incidente de seguridad", article: "Art. 28 num. 1", reportable: true },
    SERVICE_INTERRUPTION: { label: "Interrupción de sistemas que afecta el servicio", short: "Interrupción de sistemas", article: "Art. 28 num. 3", reportable: true },
    LOSS_EVENT: { label: "Otro evento de pérdida", short: "Otro evento de pérdida", article: "Art. 18 num. 1.1", reportable: false },
  },
  causes: { PROVEEDOR: "Proveedor de servicios de TI", ENERGIA: "Suministro eléctrico" },
  severities: { BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", CRITICA: "Crítica" },
  incident_statuses: { ABIERTO: "Abierto", EN_ATENCION: "En atención", RESUELTO: "Resuelto", CERRADO: "Cerrado", ANULADO: "Anulado" },
  notice_types: { INICIAL: "Aviso inicial", DETALLE: "Detalle" },
  item_statuses: { PENDIENTE: "Sin evaluar", CUMPLE: "Cumple", PARCIAL: "Cumple parcialmente", NO_CUMPLE: "No cumple", NO_APLICA: "No aplica" },
  infraction_categories: { LEVE: "Leve", MODERADA: "Moderada", GRAVE: "Grave" },
  exposure_levels: { BAJO: "Bajo", MODERADO: "Moderado", ALTO: "Alto", MUY_ALTO: "Muy alto" },
  detail_deadline_hours: 24,
};

const overdue = {
  id: 1,
  incident_number: "RT-2026-00001",
  incident_type: "SERVICE_INTERRUPTION",
  title: "Caída del core",
  description: "Sin servicio",
  occurred_at: "2026-10-19 07:30:00",
  detected_at: "2026-10-19 08:00:00",
  ended_at: null,
  affected_systems: "CrediMaster",
  affected_customers_count: 120,
  economic_loss: "1500.00",
  lost_profit: "0.00",
  cause_category: "PROVEEDOR",
  responsible_name: "Jefe de TI",
  severity: "ALTA",
  status: "ABIERTO",
  reportable: true,
  notices: [],
  deadlines: {
    applies: true,
    alert: "VENCIDO",
    initial: { status: "PENDIENTE_INMEDIATO", hours_since_detection: 50 },
    detail: { status: "VENCIDO", due_at: "2026-10-20 08:00:00", hours_left: -26 },
  },
};
const lossEvent = {
  ...overdue, id: 2, incident_number: "RT-2026-00002", incident_type: "LOSS_EVENT", title: "Reproceso de planilla", reportable: false,
  deadlines: { applies: false, alert: null }, status: "CERRADO",
};
const alerts = {
  total: 1, overdue: 1, initial_pending: 0, due_soon: 0, detail_pending: 0,
  items: [{ id: 1, incident_number: "RT-2026-00001", title: "Caída del core", alert: "VENCIDO", detail_due_at: "2026-10-20 08:00:00", hours_left: -26 }],
};
const settings = { recipient_title: "Presidente Ejecutivo", recipient_entity: "CONAMI", signer_name: "Ana Pérez", signer_title: "Gerente General", city: "Managua" };

const renderAs = (ui, ctx = { role: 1, permissions: [] }) =>
  render(
    <MemoryRouter>
      <UserContext.Provider value={ctx}>{ui}</UserContext.Provider>
    </MemoryRouter>,
  );

const incidentRoutes = (extra = {}) => (url) => {
  const routes = {
    "/api/it_risk/catalog": catalog,
    "/api/it_risk/settings": settings,
    "/api/it_risk/incidents": [overdue, lossEvent],
    "/api/it_risk/incidents/alerts": alerts,
    "/api/it_risk/incidents/1": overdue,
    ...extra,
  };
  return routes[url] !== undefined ? Promise.resolve({ data: routes[url] }) : Promise.reject(new Error(`sin mock: ${url}`));
};

beforeEach(() => {
  API.get.mockReset();
  API.post.mockReset();
  API.put.mockReset();
});

describe("Riesgo tecnológico: registro de incidentes", () => {
  test("muestra la alerta de plazo vencido y el estado del aviso de cada incidente", async () => {
    API.get.mockImplementation(incidentRoutes());
    renderAs(<ItRiskIncidents />);
    expect(await screen.findByText("1 incidente con aviso a CONAMI pendiente")).toBeTruthy();
    expect(screen.getByText(/venció el 20\/10\/2026 08:00/)).toBeTruthy();
    const rowWith = (txt) => screen.getAllByRole("row").find((r) => within(r).queryByText(txt));
    expect(within(rowWith("Caída del core")).getByText("Informe de 24 h vencido")).toBeTruthy();
    expect(within(rowWith("Reproceso de planilla")).getByText("No se informa")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Registrar incidente/ })).toBeTruthy();
  });

  test("sin permiso de gestión no ofrece registrar", async () => {
    API.get.mockImplementation(incidentRoutes());
    renderAs(<ItRiskIncidents />, { role: 5, permissions: ["riesgo_tecnologico.ver"] });
    await screen.findByText("1 incidente con aviso a CONAMI pendiente");
    expect(screen.queryByRole("button", { name: /Registrar incidente/ })).toBeNull();
  });

  test("registrar: envía el formulario y muestra el error de validación del servidor", async () => {
    API.get.mockImplementation(incidentRoutes());
    API.post.mockRejectedValueOnce({ response: { data: { message: "Indique los sistemas afectados." } } });
    renderAs(<ItRiskIncidents />);
    fireEvent.click(await screen.findByRole("button", { name: /Registrar incidente/ }));
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: "Falla eléctrica" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Indique los sistemas afectados.")).toBeTruthy();
    expect(API.post).toHaveBeenCalledWith("/api/it_risk/incidents", expect.objectContaining({ title: "Falla eléctrica", status: "ABIERTO", severity: "MEDIA" }));
  });

  test("ficha: plazos del Art. 28 y registro del aviso inicial con referencia", async () => {
    API.get.mockImplementation(incidentRoutes());
    API.post.mockResolvedValueOnce({ data: { id: 9 } });
    renderAs(<ItRiskIncidents />);
    fireEvent.click(await screen.findByRole("button", { name: "RT-2026-00001" }));
    expect(await screen.findByText("Aviso inicial (inmediato)")).toBeTruthy();
    expect(screen.getByText("Pendiente: inmediato")).toBeTruthy();
    expect(screen.getByText(/Debe enviarse de inmediato/)).toBeTruthy();
    expect(screen.getByText(/vencido hace 26 h/)).toBeTruthy();
    // El detalle no se puede registrar antes del aviso inicial.
    const buttons = screen.getAllByRole("button", { name: "Registrar envío" });
    expect(buttons[1].disabled).toBe(true);
    fireEvent.change(screen.getAllByLabelText(/Referencia del escrito/)[0], { target: { value: "GG-045-2026" } });
    fireEvent.click(buttons[0]);
    expect(screen.getByLabelText("Referencia de envío").value).toBe("GG-045-2026");
    fireEvent.click(screen.getByRole("button", { name: "Guardar envío" }));
    await waitFor(() => expect(API.post).toHaveBeenCalled());
    const [url, body] = API.post.mock.calls[0];
    expect(url).toBe("/api/it_risk/incidents/1/notices");
    expect(body.get("notice_type")).toBe("INICIAL");
    expect(body.get("reference")).toBe("GG-045-2026");
  });

  test("análisis de pérdidas (Art. 18)", async () => {
    API.get.mockImplementation(incidentRoutes({
      "/api/it_risk/incidents/loss-analysis": {
        from: "2025-11-01", to: "2026-10-21", months: 12,
        total: { count: 2, annual_frequency: 2, total_impact: 3000, annual_impact: 3000, affected_customers: 240 },
        by_type: [{ key: "SERVICE_INTERRUPTION", label: "Interrupción de sistemas", count: 2, annual_frequency: 2, economic_loss: 3000, lost_profit: 0, total_impact: 3000, avg_impact: 1500, max_impact: 1500 }],
        by_cause: [], by_severity: [], by_month: [],
      },
    }));
    renderAs(<ItRiskIncidents />);
    fireEvent.click(await screen.findByRole("tab", { name: /Análisis de pérdidas/ }));
    expect(await screen.findByText("Por tipo de evento")).toBeTruthy();
    expect(screen.getByText("240")).toBeTruthy();
    expect(screen.getAllByText("C$ 3,000.00").length).toBeGreaterThan(0);
  });
});

describe("Riesgo tecnológico: aviso global", () => {
  test("chip en la barra cuando hay avisos vencidos; nada si no hay", async () => {
    API.get.mockResolvedValueOnce({ data: alerts });
    const { unmount } = renderAs(<ItRiskDeadlineAlert />);
    expect(await screen.findByText("Aviso CONAMI de TI vencido o pendiente (1)")).toBeTruthy();
    unmount();
    API.get.mockResolvedValueOnce({ data: { total: 0, items: [] } });
    renderAs(<ItRiskDeadlineAlert />);
    await waitFor(() => expect(API.get).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/Aviso CONAMI/)).toBeNull();
  });
});

describe("Riesgo tecnológico: autoevaluación anual", () => {
  const item = (over) => ({
    id: 1, item_code: "15.0", article: "Art. 15", requirement: "Plan de contingencias de TI aprobado por la Junta Directiva.",
    infraction_category: "GRAVE", infraction_ref: "Art. 21 num. 3.8", analog: 0, hint: null, status: "PENDIENTE",
    evidence_notes: null, responsible: null, improvement_plan: null, due_date: null, evidence: [], ...over,
  });
  const detail = {
    id: 3, year: 2026, assessment_date: "2026-10-21", status: "BORRADOR",
    items: [item(), item({ id: 2, item_code: "11.3", article: "Art. 11", requirement: "Control de software sin licencia.", infraction_category: "LEVE", infraction_ref: "Art. 21 num. 1.1", status: "CUMPLE" })],
    summary: {
      total: 2, applicable: 2, evaluated: 1, compliance_pct: 50, counts: { CUMPLE: 1, PENDIENTE: 1, PARCIAL: 0, NO_CUMPLE: 0, NO_APLICA: 0 },
      by_category: [
        { key: "GRAVE", total: 1, CUMPLE: 0, PARCIAL: 0, NO_CUMPLE: 0, NO_APLICA: 0, PENDIENTE: 1, compliance_pct: 0 },
        { key: "MODERADA", total: 0, CUMPLE: 0, PARCIAL: 0, NO_CUMPLE: 0, NO_APLICA: 0, PENDIENTE: 0, compliance_pct: null },
        { key: "LEVE", total: 1, CUMPLE: 1, PARCIAL: 0, NO_CUMPLE: 0, NO_APLICA: 0, PENDIENTE: 0, compliance_pct: 100 },
      ],
      by_article: [], gaps: [],
    },
  };
  const list = [{ id: 3, year: 2026, assessment_date: "2026-10-21", status: "BORRADOR", summary: { compliance_pct: 50, evaluated: 1, total: 2, gaps_count: 1 } }];

  test("lista por año y avisa cuando falta la del año en curso", async () => {
    API.get.mockImplementation((url) => Promise.resolve({ data: url.endsWith("/catalog") ? catalog : [] }));
    renderAs(<ItRiskAssessments />);
    expect(await screen.findByText(/No hay autoevaluación de \d{4}/)).toBeTruthy();
    expect(screen.getByText(/Aún no se ha presentado ninguna/)).toBeTruthy();
  });

  test("evaluar un requisito como no cumplido pide plan y lo guarda", async () => {
    API.get.mockImplementation((url) => {
      if (url.endsWith("/catalog")) return Promise.resolve({ data: catalog });
      if (url.endsWith("/assessments")) return Promise.resolve({ data: list });
      return Promise.resolve({ data: detail });
    });
    API.put.mockResolvedValueOnce({ data: {} });
    renderAs(<ItRiskAssessments />);
    fireEvent.click(await screen.findByText("2026"));
    expect(await screen.findByText("Autoevaluación 2026")).toBeTruthy();
    expect(screen.getByText("1 de 2 requisitos evaluados")).toBeTruthy();
    fireEvent.click(screen.getByText("Plan de contingencias de TI aprobado por la Junta Directiva."));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Grave · Art. 21 num. 3.8/)).toBeTruthy();
    fireEvent.mouseDown(within(dialog).getByLabelText("Estado"));
    fireEvent.click(await screen.findByRole("option", { name: "No cumple" }));
    fireEvent.change(within(dialog).getByLabelText(/Plan de mejora/), { target: { value: "Aprobar el plan en la sesión de noviembre" } });
    fireEvent.change(within(dialog).getByLabelText(/Responsable/), { target: { value: "Gerencia General" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(API.put).toHaveBeenCalled());
    expect(API.put).toHaveBeenCalledWith("/api/it_risk/assessments/3/items/1", expect.objectContaining({
      status: "NO_CUMPLE", improvement_plan: "Aprobar el plan en la sesión de noviembre", responsible: "Gerencia General",
    }));
    expect(await screen.findByText("Requisito guardado.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
