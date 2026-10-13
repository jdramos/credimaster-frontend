import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BrowseSanctionsListsPanel from "./BrowseSanctionsListsPanel";
import API from "../../api";

jest.mock("../../api", () => ({ get: jest.fn() }));
jest.mock("./SanctionsEntryDetailDialog", () => ({ id }) => <div>Detalle {id}</div>);
// La grilla real necesita medidas de layout que jsdom no da: se reemplaza por una tabla simple.
jest.mock("@mui/x-data-grid", () => ({
  DataGrid: ({ rows, columns, onRowClick }) => (
    <table>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} onClick={() => onRowClick({ row: r })}>
            {columns.map((c) => (
              <td key={c.field}>
                {c.renderCell
                  ? c.renderCell({ value: r[c.field], row: r })
                  : c.valueFormatter
                    ? c.valueFormatter(r[c.field])
                    : String(r[c.field] ?? "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

const SUMMARY = {
  sources: [
    { source: "OFAC SDN", active: 17514, inactive: 128, PERSONA: 7497, ENTIDAD: 10017, published_at: "2026-10-13 00:00:00", synced_at: "2026-10-13 03:00:00" },
    { source: "ONU Consolidada", active: 1008, inactive: 1, PERSONA: 736, ENTIDAD: 272, published_at: "2026-10-12 17:00:04", synced_at: "2026-10-13 03:00:00" },
  ],
  total_active: 18522,
  programs: [
    { code: "SDGT", source: "OFAC SDN", count: 3129 },
    { code: "NICARAGUA", source: "OFAC SDN", count: 80 },
  ],
  last_synced_at: "2026-10-13 03:00:00",
};
const ROW = {
  id: 7, full_name: "Aldo Martin SAENZ ULLOA", entry_type: "PERSONA", programs: "NICARAGUA", nationality: "Nicaragua",
  date_of_birth: "12 Nov 1958", primary_identification: "0861211580003G", source: "OFAC SDN", active: 1,
  listed_on: "2019-07-17",
  programs_info: [{ code: "NICARAGUA", name_es: "Sanciones relacionadas con Nicaragua" }],
  listed_legal_basis: "Executive Order 13851 (Nicaragua)",
  remarks: "(Linked To: X)",
  remarks_es: "Vinculado a: X.",
};
const DELISTED = [
  {
    ...ROW, id: 8, full_name: "Theint Win HTET", programs: "BURMA-EO14014", active: 0, listed_on: "2024-01-31", delisted_on: "2026-10-09", delisted_detected: 0,
    delisted_programs: "BURMA-EO14014", delisted_reason: "Burma-related Designation Removal",
    delisted_reason_es: "Retiro de designación relacionada con Birmania", delisted_reference_url: "https://ofac.treasury.gov/recent-actions/20261009",
  },
  {
    ...ROW, id: 9, full_name: "ENTIDAD ONU RETIRADA", source: "ONU Consolidada", active: 0, listed_on: "2010-05-01", delisted_on: "2026-10-07", delisted_detected: 1,
    delisted_programs: "Iraq", delisted_reason: null,
    delisted_decided_by: "Retirada por decisión del Comité del Consejo de Seguridad establecido en virtud de la resolución 1518 (2003) (régimen de sanciones: Iraq).",
  },
];

const renderPanel = (props) => render(<MemoryRouter><BrowseSanctionsListsPanel {...props} /></MemoryRouter>);
const browseCalls = () => API.get.mock.calls.filter(([url]) => url === "/api/aml/watchlists/browse");

describe("BrowseSanctionsListsPanel", () => {
  beforeEach(() => {
    API.get.mockReset();
    API.get.mockImplementation((url, config) => {
      if (url.endsWith("/summary")) return Promise.resolve({ data: SUMMARY });
      if (url.endsWith("/export")) return Promise.resolve({ data: new Blob(["x"]) });
      if (config?.params?.status === "inactive") return Promise.resolve({ data: { rows: DELISTED, total: 2 } });
      return Promise.resolve({ data: { rows: [ROW], total: 18522 } });
    });
  });

  test("muestra el resumen de ambas listas y las entradas vigentes", async () => {
    renderPanel({ fullPage: true });
    expect(await screen.findByText(/17,514 vigentes · 7,497 personas · 10,017 entidades · 128 retiradas/)).toBeTruthy();
    expect(screen.getByText(/1,008 vigentes · 736 personas · 272 entidades · 1 retiradas/)).toBeTruthy();
    // Fecha de la última actualización publicada por cada fuente.
    expect(screen.getByText(/Última actualización de la lista \(OFAC\)/)).toBeTruthy();
    expect(screen.getByText(/Última actualización de la lista \(ONU\)/)).toBeTruthy();
    expect(screen.getByText(/13 de octubre de 2026/)).toBeTruthy();
    expect(screen.getAllByText(/Sincronizada en CrediMaster/).length).toBe(2);
    expect(await screen.findByText("Aldo Martin SAENZ ULLOA")).toBeTruthy();
    expect(screen.getByText("Persona")).toBeTruthy();
    expect(screen.getByText(/18,522 entrada\(s\) con los filtros aplicados/)).toBeTruthy();
    // Programa con su nombre en español y motivo de inclusión.
    expect(screen.getByText("Sanciones relacionadas con Nicaragua")).toBeTruthy();
    expect(screen.getByText("Vinculado a: X.")).toBeTruthy();
    expect(screen.getByText("Executive Order 13851 (Nicaragua)")).toBeTruthy();
    expect(browseCalls()[0][1].params).toMatchObject({ status: "active", page: 1, pageSize: 50 });
  });

  test("filtra por programa (p. ej. NICARAGUA) y por país", async () => {
    renderPanel({ fullPage: true });
    await screen.findByText("Aldo Martin SAENZ ULLOA");
    const program = screen.getByLabelText("Programa / régimen");
    fireEvent.change(program, { target: { value: "NICA" } });
    fireEvent.click(await screen.findByText("NICARAGUA", { selector: "span" }));
    await waitFor(() => expect(browseCalls().at(-1)[1].params.program).toBe("NICARAGUA"));
    fireEvent.change(screen.getByLabelText("País (nacionalidad o dirección)"), { target: { value: "Nicaragua" } });
    await waitFor(() => expect(browseCalls().at(-1)[1].params.country).toBe("Nicaragua"), { timeout: 2000 });
  });

  test("muestra la fecha de inclusión, filtra por rango y ordena por las inclusiones más recientes", async () => {
    renderPanel({ fullPage: true });
    await screen.findByText("Aldo Martin SAENZ ULLOA");
    // 17 jul 2019 (sin correrse un día por la zona horaria).
    expect(screen.getByText(/17 jul\.? 2019/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Incluidas desde"), { target: { value: "2026-01-01" } });
    await waitFor(() => expect(browseCalls().at(-1)[1].params.listed_from).toBe("2026-01-01"));
    fireEvent.mouseDown(screen.getByLabelText("Ordenar por"));
    fireEvent.click(await screen.findByRole("option", { name: "Inclusión más reciente" }));
    await waitFor(() => expect(browseCalls().at(-1)[1].params.sort).toBe("listed_desc"));
  });

  test("las retiradas muestran su fecha de exclusión (oficial o detectada) y se pueden filtrar y ordenar por ella", async () => {
    renderPanel({ fullPage: true });
    await screen.findByText("Aldo Martin SAENZ ULLOA");
    // Con las vigentes no hay columna ni filtros de exclusión.
    expect(screen.queryByLabelText("Excluidas desde")).toBeNull();
    fireEvent.mouseDown(screen.getByLabelText("Estado"));
    fireEvent.click(await screen.findByRole("option", { name: "Retiradas de la lista" }));
    expect(await screen.findByText("Theint Win HTET")).toBeTruthy();
    expect(screen.getByText(/09 oct\.? 2026/i)).toBeTruthy();
    expect(screen.getByText(/07 oct\.? 2026/i)).toBeTruthy();
    // Solo la de la ONU es fecha detectada.
    expect(screen.getAllByText("detectada por CrediMaster").length).toBe(1);
    // Programa y motivo de la exclusión (la ONU no publica el motivo).
    expect(screen.getAllByText("BURMA-EO14014").length).toBeGreaterThan(0);
    // El motivo se muestra en español (el texto oficial queda en el tooltip).
    expect(screen.getByText("Retiro de designación relacionada con Birmania")).toBeTruthy();
    expect(screen.queryByText("Burma-related Designation Removal")).toBeNull();
    expect(screen.getAllByText("Iraq").length).toBeGreaterThan(0);
    // ONU: no publica el motivo; se muestra qué Comité decidió el retiro.
    expect(screen.getByText(/Retirada por decisión del Comité del Consejo de Seguridad establecido en virtud de la resolución 1518 \(2003\)/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Excluidas desde"), { target: { value: "2026-10-01" } });
    await waitFor(() => expect(browseCalls().at(-1)[1].params).toMatchObject({ status: "inactive", delisted_from: "2026-10-01" }));
    fireEvent.mouseDown(screen.getByLabelText("Ordenar por"));
    fireEvent.click(await screen.findByRole("option", { name: "Exclusión más reciente" }));
    await waitFor(() => expect(browseCalls().at(-1)[1].params.sort).toBe("delisted_desc"));
  });

  test("exporta a Excel la lista con los mismos filtros", async () => {
    global.URL.createObjectURL = jest.fn(() => "blob:x");
    global.URL.revokeObjectURL = jest.fn();
    renderPanel({ fullPage: true });
    await screen.findByText("Aldo Martin SAENZ ULLOA");
    fireEvent.click(screen.getByText("Exportar a Excel (18,522)"));
    await waitFor(() => expect(API.get).toHaveBeenCalledWith("/api/aml/watchlists/browse/export", expect.objectContaining({ responseType: "blob" })));
    const [, config] = API.get.mock.calls.find(([url]) => url.endsWith("/export"));
    expect(config.params.status).toBe("active");
  });

  test("embebido en Listas de Riesgo ofrece abrir la pantalla completa", async () => {
    renderPanel();
    await screen.findByText("Aldo Martin SAENZ ULLOA");
    expect(screen.getByRole("link", { name: /Pantalla completa/ }).getAttribute("href")).toBe("/cumplimiento/listas-ofac-onu");
  });

  test("clic en una fila abre el detalle completo", async () => {
    renderPanel({ fullPage: true });
    fireEvent.click(await screen.findByText("Aldo Martin SAENZ ULLOA"));
    expect(screen.getByText("Detalle 7")).toBeTruthy();
  });
});
