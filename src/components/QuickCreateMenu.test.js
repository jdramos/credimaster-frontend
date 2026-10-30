import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import QuickCreateMenu, { visibleQuickCreateGroups } from "./QuickCreateMenu";
import useOpenOnNuevo from "../hooks/useOpenOnNuevo";

const ALL_PATHS = new Set(["/pagos", "/creditos", "/clientes", "/cobranza", "/caja/movimientos", "/cuentas-por-pagar", "/contabilidad/libro-diario", "/creditos/notas", "/rrhh/empleados"]);
const allow = () => true;
const labels = (groups) => groups.flatMap((g) => g.items.map((i) => i.label));

const Where = () => {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search}</div>;
};

describe("Acceso rápido + Nuevo", () => {
  test("solo muestra lo que el usuario ve en el menú y tiene permiso de crear", () => {
    // Cartera y Cobranza sin contabilidad, caja, CxP ni RRHH: no aparecen.
    const cartera = new Set(["/pagos", "/creditos", "/clientes", "/cobranza", "/creditos/notas"]);
    expect(labels(visibleQuickCreateGroups(cartera, allow))).toEqual(
      ["Registrar pago", "Solicitud de crédito", "Cliente", "Gestión de cobro", "Nota de crédito o débito"],
    );
    // Cajero: ve Pagos y Clientes pero solo puede registrar pagos.
    const cajero = (p) => p === "pagos.insertar";
    expect(labels(visibleQuickCreateGroups(ALL_PATHS, cajero))).toEqual(["Registrar pago"]);
    // Sin nada que crear, no hay botón.
    const { container } = render(<MemoryRouter><QuickCreateMenu visiblePaths={new Set()} hasPermission={allow} /></MemoryRouter>);
    expect(container.textContent).toBe("");
  });

  test("abre el menú agrupado y navega a la pantalla elegida", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <QuickCreateMenu visiblePaths={ALL_PATHS} hasPermission={allow} />
        <Where />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Nuevo/ }));
    const menu = screen.getByRole("menu");
    expect(menu.textContent).toContain("Operación diaria");
    expect(menu.textContent).toContain("Caja y finanzas");
    expect(menu.textContent).toContain("Administración");
    fireEvent.click(within(menu).getByText("Registrar pago"));
    expect(screen.getByTestId("where").textContent).toBe("/pagos?nuevo=1");
  });

  test("Alt+Shift+N abre el menú", () => {
    render(<MemoryRouter><QuickCreateMenu visiblePaths={ALL_PATHS} hasPermission={allow} /></MemoryRouter>);
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.keyDown(window, { code: "KeyN", altKey: true, shiftKey: true });
    expect(screen.getByRole("menu")).toBeTruthy();
  });

  test("?nuevo=1 abre el formulario una vez y se quita de la URL", () => {
    const open = jest.fn();
    const Page = () => {
      useOpenOnNuevo(open);
      return <Where />;
    };
    render(
      <MemoryRouter initialEntries={["/pagos?nuevo=1"]}>
        <Routes><Route path="/pagos" element={<Page />} /></Routes>
      </MemoryRouter>,
    );
    expect(open).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("where").textContent).toBe("/pagos");
  });
});
