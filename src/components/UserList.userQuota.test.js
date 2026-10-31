import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import UsersList, { accessLabel, UserQuotaIndicator } from "./UserList";
import UserAdd from "./UserAdd";
import { UserContext } from "../contexts/UserContext";
import API from "../api";
import { formatQuota } from "../pages/superadmin/TenantsPage";

jest.mock("../api", () => ({ get: jest.fn(), put: jest.fn(), post: jest.fn() }));
jest.mock("./help/HelpButton", () => () => null);
jest.mock("./common/ReportExportButtons", () => () => null);
jest.mock("./RoleSelect", () => () => null);
jest.mock("./BranchAllSelect", () => () => null);
jest.mock("../api/budget", () => ({ getDepartments: () => Promise.resolve({ data: [] }) }));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));
// La grilla real no se pinta en jsdom: se renderizan las celdas de cada columna.
jest.mock("@mui/x-data-grid", () => ({
  DataGrid: ({ rows, columns }) => (
    <div>
      {rows.map((row) => (
        <div key={row.id} data-testid={`row-${row.user_name}`}>
          {columns.map((c) => {
            if (c.renderCell) return <span key={c.field}>{c.renderCell({ row, value: row[c.field] })}</span>;
            if (c.valueGetter) return <span key={c.field}>{c.valueGetter({ row })}</span>;
            return null;
          })}
        </div>
      ))}
    </div>
  ),
}));

const user = (id, user_name, extra = {}) => ({
  id, user_name, user_status: 1, full_name: `Nombre ${user_name}`, email: `${user_name}@x.com`, role_name: "Cajero", branch_name: "Central",
  web_access: 1, app_access: 0, ...extra,
});

const QUOTA = { enabled: true, web: { used: 1, max: 2 }, app: { used: 1, max: 1 } };

const renderList = () =>
  render(
    <UserContext.Provider value={{ permissions: [], role: 1 }}>
      <UsersList />
    </UserContext.Provider>,
  );

describe("Usuarios contratados por canal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get.mockImplementation((url) => {
      if (url === "/api/users") return Promise.resolve({ data: [user(1, "ana"), user(2, "cobra", { web_access: 0, app_access: 1 }), user(3, "viejo", { user_status: 0, app_access: 1 })] });
      if (url === "/api/users/quota") return Promise.resolve({ data: QUOTA });
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it("accessLabel: web, app, ambos o sin acceso; vacío sin la migración", () => {
    expect(accessLabel({ web_access: 1, app_access: 0 })).toBe("Web");
    expect(accessLabel({ web_access: 1, app_access: 1 })).toBe("Web + App móvil");
    expect(accessLabel({ web_access: 0, app_access: 0 })).toBe("Sin acceso");
    expect(accessLabel({ user_name: "x" })).toBe("");
  });

  it("indicador: usados de contratados; sin límite; nada si la empresa no lo maneja", () => {
    const { rerender } = render(<UserQuotaIndicator quota={QUOTA} />);
    expect(screen.getByText("Web: 1 de 2")).toBeTruthy();
    expect(screen.getByText("App móvil: 1 de 1")).toBeTruthy();

    rerender(<UserQuotaIndicator quota={{ enabled: true, web: { used: 4, max: null }, app: { used: 0, max: 0 } }} />);
    expect(screen.getByText("Web: 4 (sin límite)")).toBeTruthy();
    expect(screen.getByText("App móvil: 0 de 0")).toBeTruthy();

    rerender(<UserQuotaIndicator quota={{ enabled: false }} />);
    expect(screen.queryByTestId("user-quota")).toBeNull();
  });

  it("la lista muestra el uso, el acceso de cada usuario y desactiva con confirmación", async () => {
    API.put.mockResolvedValue({ data: { message: "ok" } });
    renderList();

    expect(await screen.findByText("App móvil: 1 de 1")).toBeTruthy();
    const cobra = await screen.findByTestId("row-cobra");
    expect(within(cobra).getByText("App móvil")).toBeTruthy();

    fireEvent.click(within(cobra).getByLabelText("Desactivar"));
    expect(await screen.findByText(/Libera su cupo de usuarios contratados/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Desactivar" }));

    await waitFor(() => expect(API.put).toHaveBeenCalledWith("/api/users/2/status", { active: false }));
    // Se refresca el uso después del cambio.
    await waitFor(() => expect(API.get.mock.calls.filter(([u]) => u === "/api/users/quota").length).toBeGreaterThanOrEqual(2));
  });

  it("activar con el cupo lleno muestra el motivo del servidor", async () => {
    API.put.mockRejectedValue({
      response: { status: 409, data: { code: "USER_QUOTA_EXCEEDED", message: "Su empresa alcanzó el límite de usuarios contratados para la app móvil (1 de 1)." } },
    });
    renderList();

    const viejo = await screen.findByTestId("row-viejo");
    fireEvent.click(within(viejo).getByLabelText("Activar"));
    fireEvent.click(await screen.findByRole("button", { name: "Activar" }));

    expect(await screen.findByText(/límite de usuarios contratados para la app móvil/)).toBeTruthy();
    expect(API.put).toHaveBeenCalledWith("/api/users/3/status", { active: true });
  });

  it("formulario: casillas de acceso con el uso de cada canal", async () => {
    render(<UserAdd onClose={jest.fn()} />);

    const web = await screen.findByLabelText("Aplicación web (1 de 2 en uso)");
    const app = screen.getByLabelText("App móvil (1 de 1 en uso)");
    expect(web.checked).toBe(true);
    expect(app.checked).toBe(false);

    fireEvent.click(app);
    expect(app.checked).toBe(true);
  });

  it("formulario sin acceso por canal (empresa sin migración): no muestra las casillas", async () => {
    API.get.mockImplementation((url) =>
      Promise.resolve({ data: url === "/api/users/quota" ? { enabled: false } : [] }),
    );
    render(<UserAdd onClose={jest.fn()} />);
    await waitFor(() => expect(API.get).toHaveBeenCalledWith("/api/users/quota"));
    expect(screen.queryByText("Acceso a CrediMaster")).toBeNull();
  });

  it("superadmin: cantidad contratada vacía se muestra como sin límite", () => {
    expect(formatQuota(null)).toBe("Sin límite");
    expect(formatQuota("")).toBe("Sin límite");
    expect(formatQuota(0)).toBe("0");
    expect(formatQuota(5)).toBe("5");
  });
});
