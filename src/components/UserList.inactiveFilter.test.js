import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UsersList from "./UserList";
import { UserContext } from "../contexts/UserContext";
import API from "../api";

jest.mock("../api", () => ({ get: jest.fn() }));
jest.mock("./help/HelpButton", () => () => null);
jest.mock("./UserAdd", () => () => null);
jest.mock("@mui/x-data-grid", () => ({
  DataGrid: ({ rows }) => <div data-testid="grid">{rows.map((r) => r.user_name).join(",")}</div>,
}));

const user = (id, user_name, user_status) => ({
  id, user_name, user_status, full_name: user_name, email: `${user_name}@x.com`, role_name: "Cajero", branch_name: "Central",
});

describe("UserList: Mostrar usuarios inactivos", () => {
  beforeEach(() => {
    API.get.mockResolvedValue({ data: [user(1, "ana", 1), user(2, "beto", 0)] });
  });

  it("al desmarcar oculta los inactivos sin tener que cambiar la búsqueda", async () => {
    render(
      <UserContext.Provider value={{ permissions: [], role: 1 }}>
        <UsersList />
      </UserContext.Provider>,
    );
    await waitFor(() => expect(screen.getByTestId("grid").textContent).toBe("ana,beto"));

    fireEvent.click(screen.getByRole("checkbox", { name: "Mostrar usuarios inactivos" }));
    await waitFor(() => expect(screen.getByTestId("grid").textContent).toBe("ana"));

    fireEvent.click(screen.getByRole("checkbox", { name: "Mostrar usuarios inactivos" }));
    await waitFor(() => expect(screen.getByTestId("grid").textContent).toBe("ana,beto"));
  });
});
