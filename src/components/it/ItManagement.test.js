import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import ItFormDialog from "./ItFormDialog";
import ItAssets from "./ItAssets";
import ItHelpdesk from "./ItHelpdesk";
import ItDashboard from "./ItDashboard";
import ItBackups from "./ItBackups";
import ItContracts from "./ItContracts";
import { resetItCatalogCache } from "./itShared";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("../help/HelpButton", () => () => null);
jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ tenant: { enabled_modules: null, legal_name: "Demo" }, user: { id: 10 } }) }));

const catalog = {
  asset_categories: { LAPTOP: "Laptop", SERVIDOR: "Servidor", SERVICIO: "Servicio en la nube" },
  asset_statuses: { EN_USO: "En uso", DISPONIBLE: "Disponible", EN_REPARACION: "En reparación", DE_BAJA: "Dado de baja" },
  criticality: { BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", CRITICA: "Crítica" },
  sensitivity: { PUBLICA: "Pública", INTERNA: "Interna", CONFIDENCIAL: "Confidencial", RESTRINGIDA: "Restringida" },
  currencies: { NIO: "C$", USD: "US$" },
  license_types: { SUSCRIPCION: "Suscripción" },
  maintenance_types: { PREVENTIVO: "Preventivo", CORRECTIVO: "Correctivo" },
  backup_frequencies: { DIARIO: "Diario", SEMANAL: "Semanal" },
  backup_storage: { EN_SITIO: "En sitio", NUBE: "Nube" },
  backup_event_types: { RESPALDO: "Respaldo", PRUEBA_RESTAURACION: "Prueba de restauración" },
  backup_results: { EXITOSO: "Exitoso", FALLIDO: "Fallido" },
  ticket_categories: { EQUIPO: "Equipo de cómputo", RED_INTERNET: "Red o internet" },
  ticket_priorities: { BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", URGENTE: "Urgente" },
  ticket_sla_hours: { BAJA: 72, MEDIA: 24, ALTA: 8, URGENTE: 4 },
  ticket_statuses: { ABIERTO: "Abierto", EN_PROCESO: "En proceso", EN_ESPERA: "En espera", RESUELTO: "Resuelto", CERRADO: "Cerrado", ANULADO: "Anulado" },
  contract_types: { COMUNICACIONES: "Internet y comunicaciones", CPD_TERCERO: "CPD de un tercero" },
  billing_frequencies: { MENSUAL: "Mensual" },
  contract_clauses: [{ code: "13.2", text: "Objeto y alcance" }, { code: "13.3", text: "Propiedad de la información" }],
  clause_statuses: { SI: "Incluida", NO: "No incluida", NA: "No aplica" },
  warranty_notice_days: 60,
};
const lookups = { users: [{ id: 10, full_name: "Ana Cajera" }], branches: [{ id: 1, name: "Casa matriz" }], fixed_assets: [], providers: [], assets: [{ id: 3, asset_code: "TI-00003", name: "Laptop caja" }], contracts: [] };

const renderAs = (ui, ctx = { role: 1, permissions: [] }) =>
  render(<MemoryRouter><UserContext.Provider value={ctx}>{ui}</UserContext.Provider></MemoryRouter>);

const routeGet = (routes) => (url) => (routes[url] !== undefined ? Promise.resolve({ data: routes[url] }) : Promise.reject(new Error(`sin mock: ${url}`)));

beforeEach(() => {
  resetItCatalogCache();
  API.get.mockReset();
  API.post.mockReset();
  API.put.mockReset();
});

describe("Formulario genérico de TI", () => {
  const fields = [
    { name: "category", label: "Categoría", type: "select", required: true, options: [{ value: "LAPTOP", label: "Laptop" }, { value: "SERVICIO", label: "Servicio" }] },
    { name: "name", label: "Nombre", required: true },
    { name: "hostname", label: "Nombre de equipo", show: (v) => v.category !== "SERVICIO" },
    { name: "encrypted", label: "Cifrado", type: "checkbox" },
  ];

  test("envía los valores, oculta campos condicionales y muestra el error del servidor", async () => {
    const onSubmit = jest.fn().mockRejectedValueOnce({ response: { data: { message: "Ya existe el activo TI-00001 con esa serie." } } });
    const { rerender } = render(<ItFormDialog open title="Nuevo" fields={fields} initial={{ category: "LAPTOP" }} onClose={() => {}} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Laptop caja" } });
    // Un render nuevo de la pantalla de fondo no borra lo escrito.
    rerender(<ItFormDialog open title="Nuevo" fields={fields} initial={{ category: "LAPTOP" }} onClose={() => {}} onSubmit={onSubmit} />);
    expect(screen.getByLabelText("Nombre").value).toBe("Laptop caja");
    expect(screen.getByLabelText("Nombre de equipo")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Cifrado"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Ya existe el activo TI-00001 con esa serie.")).toBeTruthy();
    expect(onSubmit).toHaveBeenCalledWith({ category: "LAPTOP", name: "Laptop caja", hostname: "", encrypted: true });
  });
});

describe("Inventario de activos", () => {
  const rows = [
    { id: 3, asset_code: "TI-00003", name: "Laptop caja", category: "LAPTOP", status: "EN_USO", criticality: "ALTA", assigned_to_name: "Ana Cajera", branch_name: "Casa matriz",
      warranty: { status: "POR_VENCER", days_left: 20, until: "2026-11-10" }, maintenance: { status: "VENCIDO", due_date: "2026-06-01" } },
  ];

  test("lista con garantía y mantenimiento; registrar un activo", async () => {
    API.get.mockImplementation(routeGet({ "/api/it/catalog": catalog, "/api/it/lookups": lookups, "/api/it/assets": rows, "/api/it/assets/9": { ...rows[0], id: 9, asset_code: "TI-00009", assignments: [], maintenances: [], licenses: [], tickets: [] }, "/api/it/attachments/ASSET/9": [] }));
    API.post.mockResolvedValueOnce({ data: { id: 9, asset_code: "TI-00009" } });
    renderAs(<ItAssets />);
    await screen.findByText("TI-00003");
    const row = screen.getAllByRole("row").find((r) => within(r).queryByText("TI-00003"));
    expect(within(row).getByText("Por vencer (en 20 días)")).toBeTruthy();
    expect(within(row).getByText("Vencido · 01/06/2026")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Nuevo activo/ }));
    fireEvent.change(screen.getByLabelText("Nombre o descripción"), { target: { value: "Servidor BD" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(API.post).toHaveBeenCalled());
    expect(API.post.mock.calls[0][0]).toBe("/api/it/assets");
    expect(API.post.mock.calls[0][1]).toEqual(expect.objectContaining({ name: "Servidor BD", status: "EN_USO", criticality: "MEDIA", sensitivity: "INTERNA" }));
    expect(await screen.findByText("Activo TI-00009 registrado.")).toBeTruthy();
  });

  test("sin ti.gestionar no ofrece registrar", async () => {
    API.get.mockImplementation(routeGet({ "/api/it/catalog": catalog, "/api/it/lookups": lookups, "/api/it/assets": rows }));
    renderAs(<ItAssets />, { role: 4, permissions: ["ti.ver"] });
    await screen.findByText("TI-00003");
    expect(screen.queryByRole("button", { name: /Nuevo activo/ })).toBeNull();
  });
});

describe("Mesa de ayuda", () => {
  const ticket = {
    id: 5, ticket_number: "MA-2026-00005", title: "No hay internet", description: "Caja 2 sin red", category: "RED_INTERNET", priority: "ALTA",
    status: "RESUELTO", requester_user_id: 10, requester_name: "Ana Cajera", opened_at: "2026-10-21 08:00:00", sla: { status: "CUMPLIDO", resolution_hours: 2 },
    resolution: "Se cambió el cable", comments: [{ id: 1, user_name: "Soporte", comment: "Revisando", is_internal: 0, created_at: "2026-10-21 08:30" }], can_attend: false,
  };

  test("un usuario común reporta un problema y confirma la solución", async () => {
    API.get.mockImplementation(routeGet({
      "/api/it/catalog": catalog, "/api/it/tickets": { can_attend: false, items: [ticket] }, "/api/it/my-assets": [{ id: 3, asset_code: "TI-00003", name: "Laptop caja" }],
      "/api/it/tickets/5": ticket, "/api/it/attachments/TICKET/5": [],
    }));
    API.post.mockResolvedValueOnce({ data: { ticket_number: "MA-2026-00006" } });
    renderAs(<ItHelpdesk />, { role: 7, permissions: [] });
    expect(await screen.findByText("No hay internet")).toBeTruthy();
    expect(screen.queryByText("Reportó")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Reportar un problema/ }));
    fireEvent.change(screen.getByLabelText("Asunto"), { target: { value: "La impresora no imprime" } });
    fireEvent.change(screen.getByLabelText("¿Qué está pasando?"), { target: { value: "Sale la hoja en blanco" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(API.post).toHaveBeenCalledWith("/api/it/tickets", expect.objectContaining({ title: "La impresora no imprime", priority: "MEDIA" })));
    expect(await screen.findByText("Ticket MA-2026-00006 enviado a TI.")).toBeTruthy();

    API.post.mockResolvedValueOnce({ data: {} });
    fireEvent.click(screen.getByText("No hay internet"));
    expect(await screen.findByText(/TI marcó este ticket como resuelto/)).toBeTruthy();
    expect(screen.queryByText("Atención (TI)")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(API.post).toHaveBeenCalledWith("/api/it/tickets/5/requester-action", { action: "CONFIRMAR" }));
  });

  test("TI ve el panel de atención y guarda el cambio de estado", async () => {
    const open = { ...ticket, status: "ABIERTO", requester_user_id: 22, can_attend: true, sla: { status: "VENCIDO", hours_left: -3, hours: 8 } };
    API.get.mockImplementation(routeGet({
      "/api/it/catalog": catalog, "/api/it/tickets": { can_attend: true, items: [open] }, "/api/it/my-assets": [],
      "/api/it/tickets/5": open, "/api/it/attachments/TICKET/5": [], "/api/it/support-agents": [{ id: 1, full_name: "Jefe de TI" }], "/api/it/lookups": lookups,
    }));
    API.put.mockResolvedValueOnce({ data: open });
    renderAs(<ItHelpdesk />, { role: 1, permissions: [] });
    expect(await screen.findByText("Fuera de tiempo (3 h)")).toBeTruthy();
    expect(screen.getByText("Reportó")).toBeTruthy();
    fireEvent.click(screen.getByText("No hay internet"));
    expect(await screen.findByText("Atención (TI)")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Registrar como incidente de TI/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guardar atención" }));
    await waitFor(() => expect(API.put).toHaveBeenCalledWith("/api/it/tickets/5", expect.objectContaining({ status: "ABIERTO", priority: "ALTA" })));
  });
});

describe("Tablero, respaldos y contratos", () => {
  const dashboard = {
    assets: { total: 12, by_status: {}, by_category: { LAPTOP: 8 }, critical: 3, warranty_expiring: 1, without_maintenance_plan: 4 },
    maintenance: { overdue: 2, upcoming: 1, planned: 6 },
    licenses: { total: 5, expired: 1, expiring: 1, over_assigned: 0 },
    backups: { jobs: 2, late: 1, restore_overdue: 1, offsite: true },
    tickets: { active: 4, by_priority: { URGENTE: 1, ALTA: 1, MEDIA: 2, BAJA: 0 }, sla_overdue: 1, opened_30d: 9, avg_resolution_hours_30d: 5.5, sla_met_pct_30d: 80 },
    contracts: { total: 3, expired: 0, expiring: 1, with_clause_gaps: 2 },
    attention: [{ kind: "RESPALDO", severity: "error", ref: "Base de datos", text: "Sin respaldo exitoso hace 3 días", link: "/ti/respaldos" }],
  };

  test("tablero: cifras y lista de atención con los avisos a CONAMI", async () => {
    API.get.mockImplementation(routeGet({
      "/api/it/catalog": catalog, "/api/it/dashboard": dashboard,
      "/api/it_risk/incidents/alerts": { total: 1, items: [{ incident_number: "RT-2026-00002", title: "Caída del core", alert: "VENCIDO" }] },
    }));
    renderAs(<ItDashboard />);
    expect(await screen.findByText("Activos vigentes")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(await screen.findByText("Aviso CONAMI · RT-2026-00002")).toBeTruthy();
    expect(screen.getByText("Respaldo · Base de datos")).toBeTruthy();
    expect(screen.getByText("80%")).toBeTruthy();
  });

  test("respaldos: alerta si ninguno se guarda fuera del sitio", async () => {
    API.get.mockImplementation(routeGet({
      "/api/it/catalog": catalog, "/api/it/lookups": lookups,
      "/api/it/backups": [{ id: 1, name: "Base de datos", scope: "MySQL", frequency: "DIARIO", storage: "EN_SITIO", is_active: 1, responsible: "TI", state: { backup: "ATRASADO", restore: "SIN_PRUEBAS", offsite_ok: false } }],
    }));
    renderAs(<ItBackups />);
    expect(await screen.findByText(/Ningún respaldo activo se guarda fuera del sitio/)).toBeTruthy();
    expect(screen.getByText("Respaldo atrasado")).toBeTruthy();
    expect(screen.getByText("Restauración nunca probada")).toBeTruthy();
  });

  test("contratos: las cláusulas del Art. 13 viajan como objeto", async () => {
    API.get.mockImplementation(routeGet({ "/api/it/catalog": catalog, "/api/it/lookups": lookups, "/api/it/contracts": [], "/api/it/contracts/4": { id: 4, provider_name: "Claro", status: "ACTIVO", clauses: {}, state: { status: "VIGENTE", clause_gaps: 1 }, licenses: [] }, "/api/it/attachments/CONTRACT/4": [] }));
    API.post.mockResolvedValueOnce({ data: { id: 4 } });
    renderAs(<ItContracts />);
    fireEvent.click(await screen.findByRole("button", { name: /Nuevo contrato/ }));
    expect(await screen.findByLabelText("13.2 · Objeto y alcance")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Proveedor"), { target: { value: "Claro" } });
    fireEvent.change(screen.getByLabelText("Objeto y alcance del servicio"), { target: { value: "Internet dedicado" } });
    fireEvent.change(screen.getByLabelText("Inicio"), { target: { value: "2026-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(API.post).toHaveBeenCalled());
    const body = API.post.mock.calls[0][1];
    expect(body.clauses).toEqual({ "13.2": null, "13.3": null });
    expect(body.clause_13_2).toBeUndefined();
    expect(body.provider_name).toBe("Claro");
  });
});
