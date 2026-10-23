import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import LoanProductsManager from "./LoanProductsManager";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import { fetchWithCache } from "../../hooks/useCachedFetch";

jest.mock("../../api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }));
jest.mock("../../hooks/useCachedFetch", () => ({
  __esModule: true,
  default: () => ({ data: [] }),
  fetchWithCache: jest.fn(),
}));

const catalogFor = async (url) => {
    if (url === "/api/conami/catalogs") {
      return {
        tiposAgrupacionCredito: [{ id: 1, name: "Microcrédito" }, { id: 2, name: "Personales" }],
        tiposCredito: [{ id: 1, name: "Empresarial" }, { id: 2, name: "Personal" }],
        monedas: [{ id: 2, name: "Nacional sin Mantenimiento de Valor." }],
      };
    }
    if (url === "/api/frecuencies") return [{ id: 4, tag: "M", name: "Mensual" }];
    if (url === "/api/branches") return [{ id: 1, name: "Managua" }];
    if (url === "/api/credit-policies") return [{ policy_key: "max_interest_rate", policy_value: "36" }];
    return [];
};

const PRODUCTS = [
  {
    id: 1, code: "MIC", name: "Microcrédito", status: "ACTIVE", is_default: 1, loan_group_id: 1, loan_group_name: "Microcrédito",
    min_amount: null, max_amount: null, min_term_months: null, max_term_months: null, min_interest_rate: null, max_interest_rate: null,
    default_interest_rate: null, allowed_frequencies: [], branch_ids: [], loans_count: 334, active_loans_count: 230, aml_assessment: null,
  },
  {
    id: 5, code: "PER", name: "Personal nómina", status: "ACTIVE", is_default: 0, loan_group_id: 2, loan_group_name: "Personales",
    min_amount: "5000.00", max_amount: "50000.00", min_term_months: "3.00", max_term_months: "18.00", min_interest_rate: "2.00",
    max_interest_rate: "3.00", default_interest_rate: "2.50", allowed_frequencies: ["M"], branch_ids: [1], loans_count: 0,
    active_loans_count: 0, aml_assessment: { id: 3, status: "APPROVED" },
  },
];

const renderAs = (permissions, role = 2) =>
  render(
    <UserContext.Provider value={{ permissions, role }}>
      <LoanProductsManager />
    </UserContext.Provider>,
  );

const mockGet = (regulated = true) =>
  API.get.mockImplementation(async (url) => {
    if (url === "/api/loan-products") return { data: { regulated, data: PRODUCTS } };
    if (url === "/api/loan-products/report") return { data: { data: [] } };
    return { data: [] };
  });

describe("Configuración → Productos financieros", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchWithCache.mockImplementation(catalogFor);
  });

  test("lista los productos con límites, uso y evaluación LA/FT", async () => {
    mockGet(true);
    renderAs(["configuracion.productos.ver"]);
    expect(await screen.findByText("Personal nómina")).toBeTruthy();
    expect(screen.getByText(/está normada por la CONAMI/)).toBeTruthy();
    expect(screen.getByText("Predeterminado")).toBeTruthy();
    expect(screen.getByText("Aprobada")).toBeTruthy();
    expect(screen.getByText("334")).toBeTruthy();
    // Solo lectura: sin botones de gestión.
    expect(screen.queryByRole("button", { name: /Nuevo producto/ })).toBeNull();
    expect(screen.queryByLabelText("Editar PER")).toBeNull();
  });

  test("crear: envía el producto y muestra los errores del backend", async () => {
    mockGet(true);
    API.post.mockRejectedValueOnce({
      response: { data: { message: "Su empresa está normada por la CONAMI", errors: ["La tasa máxima supera la política."] } },
    });
    renderAs(["configuracion.productos.gestionar"]);
    fireEvent.click(await screen.findByRole("button", { name: /Nuevo producto/ }));
    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "AGR" } });
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Agrícola" } });
    fireEvent.change(screen.getByLabelText("Tasa máxima mensual"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("La tasa máxima supera la política.")).toBeTruthy();
    const body = API.post.mock.calls[0][1];
    expect(body).toMatchObject({ code: "AGR", name: "Agrícola", max_interest_rate: "4", is_default: 0 });
  });

  test("desactivar llama al endpoint de estado (nunca borra)", async () => {
    mockGet(false);
    API.put.mockResolvedValueOnce({ data: { message: "Producto desactivado." } });
    renderAs([], 1);
    expect(await screen.findByText(/no está normada por la CONAMI/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Desactivar PER"));
    await waitFor(() => expect(API.put).toHaveBeenCalledWith("/api/loan-products/5/status", { status: "INACTIVE" }));
  });

  test("editar precarga los valores del producto", async () => {
    mockGet(true);
    renderAs(["configuracion.productos.gestionar"]);
    fireEvent.click(await screen.findByLabelText("Editar PER"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Monto máximo").value).toBe("50000.00");
    expect(within(dialog).getByLabelText("Tasa sugerida mensual").value).toBe("2.50");
  });
});
