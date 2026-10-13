import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as XLSX from "xlsx";
import UafReports from "./UafReports";
import RosCasesList from "./RosCasesList";
import { buildDossierWorkbook } from "./RosDossierDialog";
import API from "../../api";
import fx from "./__fixtures__/uaf.demo.json";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("../help/HelpButton", () => () => null);
jest.mock("@mui/x-data-grid", () => ({
  DataGrid: ({ rows, columns }) => (
    <table>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            {columns.map((c) => (
              <td key={c.field}>{c.renderCell ? c.renderCell({ value: r[c.field], row: r }) : String(r[c.field] ?? "")}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

const routes = {
  "/api/aml/uaf/control": fx.control,
  "/api/aml/uaf/rte": fx.rte,
  "/api/aml/uaf/inmovilizacion": fx.inmov,
  "/api/aml/uaf/ventas": fx.ventas,
  "/api/aml/uaf/submissions": fx.history,
  "/api/aml/ros-cases": fx.ros,
};

beforeEach(() => {
  API.get.mockReset();
  API.get.mockImplementation((url) => {
    if (url.endsWith("/dossier")) return Promise.resolve({ data: fx.dossier });
    return Promise.resolve({ data: routes[url] });
  });
});

describe("Reportes UAF", () => {
  test("control del mes: reportes que corresponden, plazo y RAII", async () => {
    render(<UafReports />);
    expect(await screen.findByText("Reporte de Transacciones en Efectivo (RTE)")).toBeTruthy();
    expect(screen.getByText(/Sujeto obligado: Microfinanciera/)).toBeTruthy();
    expect(screen.getByText("Reporte de Ausencia de Información de Interés (RAII)")).toBeTruthy();
    expect(screen.getByText(/Faltan tipos de cambio/)).toBeTruthy();
    // Una IMF no tiene Reporte de Ventas (solo casas de empeño y préstamo).
    expect(screen.queryByText("Reporte de Ventas (bienes no pagados)")).toBeNull();
  });

  test("pestaña RTE muestra los clientes sin tipo de cambio para que no se pierdan", async () => {
    render(<UafReports />);
    fireEvent.click(await screen.findByRole("tab", { name: /RTE/ }));
    expect(screen.getByText(/no se pudieron evaluar porque falta el tipo de cambio/)).toBeTruthy();
    expect(screen.getByText(fx.rte.undetermined[0].customer_name)).toBeTruthy();
  });

  test("registrar envío envía período, tipo y acuse", async () => {
    API.post.mockResolvedValue({ data: { id: 1 } });
    render(<UafReports />);
    await screen.findByText("Reporte de Transacciones en Efectivo (RTE)");
    fireEvent.click(screen.getAllByRole("button", { name: /Registrar envío/ })[0]);
    fireEvent.change(await screen.findByLabelText("Número de acuse de SIREL"), { target: { value: "SIREL-123" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Registrar envío" }).pop());
    await waitFor(() => expect(API.post).toHaveBeenCalled());
    const fd = API.post.mock.calls[0][1];
    expect(fd.get("sirel_receipt")).toBe("SIREL-123");
    expect(fd.get("period")).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("Casos ROS", () => {
  test("muestra el plazo de 30 días y abre el expediente con sus 5 anexos", async () => {
    render(<RosCasesList />);
    expect(await screen.findByText("Enviado en plazo")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Expediente" }));
    expect(await screen.findByText("1. Perfil Integral del Cliente")).toBeTruthy();
    expect(screen.getByText("5. Historial crediticio y de operaciones")).toBeTruthy();
  });

  test("el libro del expediente trae una hoja por anexo y el análisis", () => {
    const wb = buildDossierWorkbook(fx.dossier);
    expect(wb.SheetNames).toEqual(["Resumen", "1 PIC", "2 Estado de cuenta", "3 Documentos", "5 Historial crediticio", "Alertas y listas"]);
    const resumen = XLSX.utils.sheet_to_json(wb.Sheets.Resumen, { header: 1 });
    expect(resumen.some((r) => r[0] === "Caso" && r[1] === fx.dossier.ros_case.case_number)).toBe(true);
  });
});
