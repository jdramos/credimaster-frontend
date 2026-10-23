import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import * as XLSX from "xlsx";
import InactiveCustomers from "./InactiveCustomers";
import { whatsappUrl } from "./inactiveCustomersShared";
import { UserContext } from "../../contexts/UserContext";
import API from "../../api";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("xlsx", () => ({
  utils: { json_to_sheet: jest.fn(() => ({})), book_new: jest.fn(() => ({})), book_append_sheet: jest.fn() },
  writeFile: jest.fn(),
}));
// El historial crediticio tiene sus propias pruebas.
jest.mock("./CustomerCreditHistoryTab", () => () => <div>Historial crediticio (mock)</div>);

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ ...jest.requireActual("react-router-dom"), useNavigate: () => mockNavigate }));

const CATALOGS = {
  stages: [
    { key: "POR_CONTACTAR", label: "Por contactar", closes: false },
    { key: "CONTACTADO", label: "Contactado", closes: false },
    { key: "INTERESADO", label: "Interesado", closes: false },
    { key: "NO_INTERESADO", label: "No interesado", closes: true },
    { key: "RENOVO", label: "Renovó", closes: true, automatic: true },
    { key: "DESCARTADO", label: "No contactable / descartado", closes: true },
  ],
  channels: [{ key: "LLAMADA", label: "Llamada" }, { key: "WHATSAPP", label: "WhatsApp" }, { key: "VISITA", label: "Visita" }],
  results: [
    { key: "CONTACTADO", label: "Contactado", stage: "CONTACTADO" },
    { key: "INTERESADO", label: "Interesado en un nuevo crédito", stage: "INTERESADO" },
    { key: "NO_CONTESTA", label: "No contesta", stage: null },
  ],
  ratings: ["EXCELENTE", "BUENO", "REGULAR", "MALO", "SIN_HISTORIAL"],
  users: [{ id: 7, name: "Olga Promotora" }],
  promoters: [{ id: 34, name: "Eveling Galeano" }],
  collectors: [{ id: 27, name: "Douglas Palacios" }],
  branches: [{ id: 1, name: "Sucursal Central Managua" }],
};

const row = (over) => ({
  customer_id: 47, customer_name: "Alexander Cerda", identification: "0010000000332", phone: "85638659", cellphone: "85638659",
  branch_id: 1, branch_name: "Sucursal Central Managua", promoter_name: "Eveling Galeano", collector_name: "Douglas Palacios",
  loans_count: 2, last_loan_id: 704, last_loan_code: "704", last_loan_status: "CANCELLED", last_amount: 15000,
  last_disbursement_date: "2026-01-14", last_end_date: "2026-09-30", days_inactive: 20, last_max_days_late: 4,
  last_rating: "EXCELENTE", best_max_days_late: 0, worst_max_days_late: 12, stage: "POR_CONTACTAR", followup_id: null,
  followup_status: "OPEN", responsible_user_id: null, responsible_name: null, next_action_date: null, next_action_note: null,
  actions_count: 0, pending_request_id: null, eligible: true, eligibility_reasons: [], ...over,
});

const LIST = {
  as_of: "2026-10-20",
  tracking_available: true,
  total_inactive: 2,
  by_stage: { POR_CONTACTAR: 1, CONTACTADO: 0, INTERESADO: 1, NO_INTERESADO: 0, RENOVO: 0, DESCARTADO: 0 },
  by_eligibility: { apto: 1, no_apto: 1 },
  rows: [
    row(),
    row({
      customer_id: 158, customer_name: "Beatriz Cortez", phone: "22228404", cellphone: null, last_loan_code: "693",
      last_loan_status: "WRITTEN_OFF", last_amount: 98072, days_inactive: 3, last_rating: "MALO", last_max_days_late: 120,
      stage: "INTERESADO", followup_id: 5, responsible_user_id: 7, responsible_name: "Olga Promotora",
      next_action_date: "2026-10-20", next_action_note: "Llevar solicitud", pending_request_id: 1020,
      eligible: false, eligibility_reasons: ["peor atraso 120 d > 30 d", "tiene crédito saneado en la institución"],
    }),
  ],
};

const DETAIL = {
  customer: { id: 47, customer_name: "Alexander Cerda", identification: "0010000000332", cellphone: "85638659", telephone: "22228968" },
  inactive: LIST.rows[0],
  eligibility: { eligible: true, applies: true, reasons: [] },
  tracking_available: true,
  followups: [{ id: 9, customer_id: 47, last_loan_id: 500, last_loan_code: "500", stage: "RENOVO", close_reason: "Renovó: crédito #704 desembolsado el 2026-01-14" }],
  actions: [
    { id: 31, followup_id: 9, action_date: "2025-12-20", channel: "LLAMADA", result: "INTERESADO", note: "Quiere renovar", stage_before: "POR_CONTACTAR", stage_after: "INTERESADO", status: "ACTIVE", created_by_name: "Olga Promotora" },
  ],
};

const DETAIL_NO_APTO = {
  ...DETAIL,
  customer: { id: 158, customer_name: "Beatriz Cortez", identification: "0010000001107", cellphone: null, telephone: "22228404" },
  inactive: LIST.rows[1],
  eligibility: { eligible: false, applies: true, reasons: ["peor atraso 120 d > 30 d", "tiene crédito saneado en la institución"] },
  followups: [],
  actions: [],
};

const mockGets = ({ list = LIST, mine = [] } = {}) => {
  API.get.mockImplementation((url) => {
    if (url === "/api/inactive-customers/catalogs") return Promise.resolve({ data: { ok: true, data: CATALOGS } });
    if (url === "/api/inactive-customers/my-actions") return Promise.resolve({ data: { ok: true, data: { rows: mine } } });
    if (url === "/api/inactive-customers") return Promise.resolve({ data: { ok: true, data: list } });
    if (url === "/api/inactive-customers/customers/47") return Promise.resolve({ data: { ok: true, data: DETAIL } });
    if (url === "/api/inactive-customers/customers/158") return Promise.resolve({ data: { ok: true, data: DETAIL_NO_APTO } });
    return Promise.resolve({ data: {} });
  });
};

const setup = (ctx = { role: 1, permissions: [] }) =>
  render(
    <MemoryRouter>
      <UserContext.Provider value={ctx}>
        <InactiveCustomers />
      </UserContext.Provider>
    </MemoryRouter>,
  );

describe("InactiveCustomers (clientes inactivos + seguimiento)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGets();
  });

  test("lista los inactivos con último crédito, atrasos, etapa y próxima acción", async () => {
    setup();
    expect(await screen.findByText("Alexander Cerda")).toBeTruthy();
    expect(screen.getByText("2 cliente(s) inactivo(s) al 20/10/2026")).toBeTruthy();
    expect(screen.getByText("#704 · C$ 15,000.00")).toBeTruthy();
    expect(screen.getByText("Saneado 30/09/2026", { exact: false })).toBeTruthy();
    expect(screen.getByText("Solicitud en trámite")).toBeTruthy();
    expect(screen.getByText("Llevar solicitud")).toBeTruthy();
    expect(screen.getByText("Olga Promotora")).toBeTruthy();
    expect(screen.getByText("Por contactar (1)")).toBeTruthy();
    expect(screen.getByText("Interesado (1)")).toBeTruthy();
    // WhatsApp solo para celulares.
    expect(screen.getAllByLabelText("WhatsApp")).toHaveLength(1);
  });

  test("los filtros viajan al backend (etapa con el chip y responsable)", async () => {
    setup();
    await screen.findByText("Alexander Cerda");
    fireEvent.click(screen.getByText("Interesado (1)"));
    await waitFor(() =>
      expect(API.get).toHaveBeenCalledWith("/api/inactive-customers", { params: { stage: "INTERESADO", eligibility: "apto" } }),
    );
    fireEvent.mouseDown(screen.getByLabelText("Responsable"));
    fireEvent.click(await screen.findByText("Asignados a mí"));
    await waitFor(() =>
      expect(API.get).toHaveBeenCalledWith("/api/inactive-customers", { params: { stage: "INTERESADO", responsible: "me", eligibility: "apto" } }),
    );
  });

  test("muestra las próximas acciones del usuario", async () => {
    mockGets({ mine: [{ ...LIST.rows[1], overdue: true, next_action_date: "2026-10-18" }] });
    setup();
    expect(await screen.findByText("Mis próximas acciones de hoy (1)")).toBeTruthy();
    expect(screen.getByText("Atrasada 18/10/2026")).toBeTruthy();
  });

  test("exporta a Excel las filas filtradas", async () => {
    setup();
    await screen.findByText("Alexander Cerda");
    fireEvent.click(screen.getByText("Exportar a Excel"));
    expect(XLSX.writeFile.mock.calls[0][1]).toBe("clientes_inactivos_2026-10-20.xlsx");
    const rows = XLSX.utils.json_to_sheet.mock.calls[0][0];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      Cliente: "Beatriz Cortez", "Último crédito": "693", "Días inactivo": 3, Etapa: "Interesado", "Solicitud en trámite": "#1020",
      "Elegibilidad represtamo": "No apto", "Motivo no apto": "peor atraso 120 d > 30 d; tiene crédito saneado en la institución",
    });
    expect(rows[1]).toMatchObject({ Cliente: "Alexander Cerda", "Elegibilidad represtamo": "Apto", "Motivo no apto": "" });
  });

  test("detalle: registra una gestión con la etapa sugerida y muestra la bitácora", async () => {
    API.post.mockResolvedValue({ data: { ok: true, data: { id: 40 } } });
    setup();
    fireEvent.click(await screen.findByText("Alexander Cerda"));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Quiere renovar")).toBeTruthy();
    expect(within(dialog).getByText("tras crédito #500")).toBeTruthy();
    expect(within(dialog).getByText(/Seguimientos anteriores/)).toBeTruthy();

    fireEvent.mouseDown(within(dialog).getByLabelText("Resultado"));
    fireEvent.click(within(await screen.findByRole("listbox")).getByText("Interesado en un nuevo crédito"));
    fireEvent.change(within(dialog).getByLabelText("Nota"), { target: { value: "Pide C$ 20,000" } });
    fireEvent.change(within(dialog).getByLabelText("Próximo contacto"), { target: { value: "2099-01-05" } });
    fireEvent.click(within(dialog).getAllByText("Registrar gestión").find((el) => el.tagName === "BUTTON"));

    await waitFor(() => expect(API.post).toHaveBeenCalled());
    const [url, body] = API.post.mock.calls[0];
    expect(url).toBe("/api/inactive-customers/customers/47/actions");
    expect(body).toMatchObject({ channel: "LLAMADA", result: "INTERESADO", stage: "INTERESADO", note: "Pide C$ 20,000", next_contact_date: "2099-01-05" });
    expect(body.action_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(await within(dialog).findByText("Gestión registrada.")).toBeTruthy();
  });

  test("detalle: anula una gestión con motivo y lleva a una nueva solicitud", async () => {
    API.post.mockResolvedValue({ data: { ok: true } });
    setup();
    fireEvent.click(await screen.findByText("Alexander Cerda"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(await within(dialog).findByLabelText("Anular gestión"));
    const voidDialog = (await screen.findAllByRole("dialog")).pop();
    const anular = within(voidDialog).getByText("Anular");
    expect(anular.closest("button").disabled).toBe(true);
    fireEvent.change(within(voidDialog).getByLabelText("Motivo de la anulación"), { target: { value: "Registrada en el cliente equivocado" } });
    fireEvent.click(anular);
    await waitFor(() =>
      expect(API.post).toHaveBeenCalledWith("/api/inactive-customers/actions/31/void", { reason: "Registrada en el cliente equivocado" }),
    );

    fireEvent.click(within(dialog).getByText("Nueva solicitud de crédito"));
    expect(mockNavigate).toHaveBeenCalledWith("/creditos/agregar?customerId=47");
  });

  test("sin permiso de gestionar: solo consulta", async () => {
    setup({ role: 3, permissions: ["clientes.inactivos.ver"] });
    fireEvent.click(await screen.findByText("Alexander Cerda"));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Quiere renovar")).toBeTruthy();
    expect(within(dialog).queryByText("Registrar gestión")).toBeNull();
    expect(within(dialog).queryByLabelText("Anular gestión")).toBeNull();
    expect(within(dialog).queryByText("Nueva solicitud de crédito")).toBeNull();
  });

  test("elegibilidad: por omisión pide solo aptos; marca los no aptos con su motivo", async () => {
    setup();
    await screen.findByText("Alexander Cerda");
    expect(API.get).toHaveBeenCalledWith("/api/inactive-customers", { params: { eligibility: "apto" } });
    expect(screen.getByText("Apto")).toBeTruthy();
    expect(screen.getByText("No apto")).toBeTruthy();
    expect(screen.getByText("peor atraso 120 d > 30 d; tiene crédito saneado en la institución")).toBeTruthy();
    fireEvent.mouseDown(screen.getByLabelText("Elegibilidad represtamo"));
    fireEvent.click(within(await screen.findByRole("listbox")).getByText("Todos"));
    await waitFor(() => expect(API.get).toHaveBeenCalledWith("/api/inactive-customers", { params: {} }));
  });

  test("detalle de un no apto: alerta y solo permite continuar avisando que irá a comité", async () => {
    setup();
    fireEvent.click(await screen.findByText("Beatriz Cortez"));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText(/No apto para represtamo:/)).toBeTruthy();
    expect(within(dialog).queryByText("Nueva solicitud de crédito")).toBeNull();
    fireEvent.click(within(dialog).getByText("Continuar de todos modos (requerirá Comité de Crédito)"));
    expect(mockNavigate).toHaveBeenCalledWith("/creditos/agregar?customerId=158");
  });

  test("enlace de WhatsApp para celulares de Nicaragua", () => {
    expect(whatsappUrl("8563-8659")).toBe("https://wa.me/50585638659");
    expect(whatsappUrl("+505 7563 8659")).toBe("https://wa.me/50575638659");
    expect(whatsappUrl("22228968")).toBeNull();
    expect(whatsappUrl("")).toBeNull();
  });
});
