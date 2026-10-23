import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PaymentForm from "./PaymentForm";
import CustomerSelect from "./Customer/CustomerSelect";
import API from "../api";

jest.mock("../api", () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock("./LoanInfo", () => () => null);
jest.mock("./BranchSelect", () => () => null);
jest.mock("./conami/FormaPagoSelect", () => () => null);
jest.mock("./help/HelpButton", () => () => null);

// Regresión: al borrar el cliente, CustomerSelect avisa { target: { value: "" } }
// y PaymentForm guardaba el evento completo como id ("[object Object] ()").
describe("Registrar pago: cambiar de cliente", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get.mockImplementation((url) => {
      if (url === "/api/customers/getCustomerList") {
        return Promise.resolve({ data: [{ id: 64, customer_name: "María López", identification: "001-1" }] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it("borrar el cliente deja el buscador vacío y permite elegir otro", async () => {
    render(<MemoryRouter><PaymentForm open onClose={jest.fn()} onSuccess={jest.fn()} /></MemoryRouter>);
    // El buscador de clientes es el único combobox con autocompletado.
    const input = screen.getAllByRole("combobox").find((el) => el.getAttribute("aria-autocomplete") === "list");

    fireEvent.change(input, { target: { value: "María" } });
    fireEvent.click(await screen.findByText(/María López/, {}, { timeout: 2000 }));
    await waitFor(() => expect(API.get).toHaveBeenCalledWith("/api/loans/customer/64"));

    // Borrar con la X del autocompletado.
    fireEvent.click(screen.getByTitle("Clear"));
    await waitFor(() => expect(input.value).toBe(""));
    expect(input.value).not.toContain("[object Object]");
    expect(API.get.mock.calls.some(([url]) => String(url).includes("[object"))).toBe(false);

    fireEvent.change(input, { target: { value: "Mar" } });
    expect(await screen.findByText(/María López/, {}, { timeout: 2000 })).toBeTruthy();
  });
});

describe("CustomerSelect", () => {
  it("un valor que no es un id se trata como vacío", () => {
    render(<CustomerSelect value={{ target: { value: "" } }} onChange={jest.fn()} />);
    expect(screen.getByRole("combobox").value).toBe("");
  });
});
