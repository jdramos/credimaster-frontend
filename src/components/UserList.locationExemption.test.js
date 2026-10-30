import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import UsersList from "./UserList";
import { UserContext } from "../contexts/UserContext";
import API from "../api";

jest.mock("../api", () => ({ get: jest.fn(), put: jest.fn() }));
jest.mock("./help/HelpButton", () => () => null);
jest.mock("./UserAdd", () => () => null);
jest.mock("./common/ReportExportButtons", () => () => null);
// La grilla real no se pinta en jsdom: se renderizan las celdas de cada columna.
jest.mock("@mui/x-data-grid", () => ({
  DataGrid: ({ rows, columns }) => (
    <div>
      {rows.map((row) => (
        <div key={row.id} data-testid={`row-${row.user_name}`}>
          {columns.map((c) => (c.renderCell ? <span key={c.field}>{c.renderCell({ row, value: row[c.field] })}</span> : null))}
        </div>
      ))}
    </div>
  ),
}));

const user = (id, user_name) => ({
  id, user_name, user_status: 1, full_name: `Nombre ${user_name}`, email: `${user_name}@x.com`, role_name: "Cajero", branch_name: "Central",
});

const EXEMPTION = { user_id: 2, reason: "Gerente de zona", created_by_name: "Admin", created_at: "2026-10-30 16:45:04" };

const renderPage = (ctx = { permissions: [], role: 1 }) =>
  render(
    <UserContext.Provider value={ctx}>
      <UsersList />
    </UserContext.Provider>,
  );

describe("UserList: excepción de ubicación obligatoria en la app", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get.mockImplementation((url) => {
      if (url === "/api/users/location-exemptions") return Promise.resolve({ data: { ok: true, data: [EXEMPTION] } });
      return Promise.resolve({ data: [user(1, "ana"), user(2, "beto")] });
    });
    API.put.mockResolvedValue({ data: { ok: true } });
  });

  it("marca al exento y deja al resto como obligatoria", async () => {
    renderPage();
    const ana = await screen.findByTestId("row-ana");
    await waitFor(() => expect(within(screen.getByTestId("row-beto")).getByText("Exenta")).toBeTruthy());
    expect(within(ana).getByText("Obligatoria")).toBeTruthy();
  });

  it("crear la excepción exige el motivo y lo envía al servidor", async () => {
    renderPage();
    const ana = await screen.findByTestId("row-ana");
    fireEvent.click(within(ana).getByLabelText("Ubicación en la app (excepción)"));
    const dialog = await screen.findByRole("dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "Crear excepción" }));
    expect(await within(dialog).findByText(/Indique el motivo de la excepción/)).toBeTruthy();
    expect(API.put).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText("Motivo de la excepción"), { target: { value: "Trabaja en oficina sin GPS" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Crear excepción" }));
    await waitFor(() =>
      expect(API.put).toHaveBeenCalledWith("/api/users/1/location-exemption", { exempt: true, reason: "Trabaja en oficina sin GPS" }));
  });

  it("al usuario exento se le puede quitar la excepción", async () => {
    renderPage();
    const beto = await screen.findByTestId("row-beto");
    await waitFor(() => expect(within(beto).getByText("Exenta")).toBeTruthy());
    fireEvent.click(within(beto).getByLabelText("Ubicación en la app (excepción)"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Este usuario está exento/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Quitar excepción" }));
    await waitFor(() =>
      expect(API.put).toHaveBeenCalledWith("/api/users/2/location-exemption", { exempt: false, reason: "Gerente de zona" }));
  });

  it("sin permiso de editar usuarios no aparece el botón de la excepción", async () => {
    renderPage({ permissions: ["usuarios.ver"], role: 4 });
    const ana = await screen.findByTestId("row-ana");
    expect(within(ana).queryByLabelText("Ubicación en la app (excepción)")).toBeNull();
  });
});
