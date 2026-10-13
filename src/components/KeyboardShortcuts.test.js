import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { Button, Dialog, DialogActions } from "@mui/material";
import { toast } from "react-toastify";
import KeyboardShortcuts, { SUPERADMIN_NAV_SHORTCUTS, SUPERADMIN_ACTION_SHORTCUTS } from "./KeyboardShortcuts";

jest.mock("react-toastify", () => ({ toast: { info: jest.fn() } }));

function Where() {
  const loc = useLocation();
  return <span data-testid="where">{loc.pathname}</span>;
}

function WhereWithSearch() {
  const loc = useLocation();
  return <span data-testid="where">{loc.pathname + loc.search}</span>;
}

const onSave = jest.fn();

function DialogPage() {
  const [open, setOpen] = useState(true);
  return (
    <main>
      <Button>Registrar algo de la lista</Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <input aria-label="campo" />
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={onSave}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </main>
  );
}

const setup = (path = "/", { visible = ["/clientes", "/creditos", "/pagos"], perms = [] } = {}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <KeyboardShortcuts
        visiblePaths={new Set(visible)}
        hasPermission={(t) => perms.includes(t)}
        pathname={path}
      />
      <Routes>
        <Route path="/lista-con-dialogo" element={<DialogPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

const press = (init) => fireEvent.keyDown(window, init);

describe("KeyboardShortcuts", () => {
  beforeEach(() => {
    onSave.mockReset();
    toast.info.mockReset();
  });

  test("Alt+C va a Clientes", () => {
    setup();
    press({ key: "c", code: "KeyC", altKey: true });
    expect(screen.getByTestId("where").textContent).toBe("/clientes");
  });

  test("AltGr (Ctrl+Alt) no dispara atajos -- no roba @ ni otros símbolos", () => {
    setup();
    press({ key: "@", code: "KeyQ", altKey: true, ctrlKey: true });
    press({ key: "c", code: "KeyC", altKey: true, ctrlKey: true });
    expect(screen.getByTestId("where").textContent).toBe("/");
  });

  test("sin acceso a la pantalla no navega y avisa", () => {
    setup("/", { visible: ["/clientes"] });
    press({ key: "b", code: "KeyB", altKey: true });
    expect(screen.getByTestId("where").textContent).toBe("/");
    expect(toast.info).toHaveBeenCalledWith('No tiene acceso a "Cobranza".');
  });

  test("Alt+N (nuevo cliente) exige el permiso de insertar clientes", () => {
    const { unmount } = setup("/", { visible: ["/clientes"], perms: [] });
    press({ key: "n", code: "KeyN", altKey: true });
    expect(screen.getByTestId("where").textContent).toBe("/");
    unmount();
    setup("/", { visible: ["/clientes"], perms: ["clientes.insertar"] });
    press({ key: "n", code: "KeyN", altKey: true });
    expect(screen.getByTestId("where").textContent).toBe("/clientes/agregar");
  });

  test("? abre la lista de atajos, solo con las pantallas permitidas", () => {
    setup("/", { visible: ["/clientes"] });
    press({ key: "?" });
    expect(screen.getByText("Atajos de teclado")).toBeTruthy();
    expect(screen.getByText("Clientes")).toBeTruthy();
    expect(screen.queryByText("Cobranza")).toBeNull();
  });

  test("? mientras se escribe en un campo no abre nada", () => {
    setup("/lista-con-dialogo");
    fireEvent.keyDown(screen.getByLabelText("campo"), { key: "?" });
    expect(screen.queryByText("Atajos de teclado")).toBeNull();
  });

  test("Ctrl+S presiona Guardar de la ventana abierta (no el botón de la lista)", () => {
    setup("/lista-con-dialogo");
    press({ key: "s", code: "KeyS", ctrlKey: true });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test("superadmin: Alt+número sigue el orden de la barra y Alt+N abre Nueva empresa", () => {
    render(
      <MemoryRouter initialEntries={["/superadmin"]}>
        <KeyboardShortcuts shortcuts={SUPERADMIN_NAV_SHORTCUTS} actions={SUPERADMIN_ACTION_SHORTCUTS} pathname="/superadmin" />
        <Routes>
          <Route path="*" element={<WhereWithSearch />} />
        </Routes>
      </MemoryRouter>,
    );
    press({ key: "3", code: "Digit3", altKey: true });
    expect(screen.getByTestId("where").textContent).toBe("/superadmin/soporte");
    press({ key: "2", code: "Digit2", altKey: true });
    expect(screen.getByTestId("where").textContent).toBe("/superadmin/facturas");
    press({ key: "n", code: "KeyN", altKey: true });
    expect(screen.getByTestId("where").textContent).toBe("/superadmin?nueva=1");
    // AltGr+2 (= @ en teclado español) no navega.
    press({ key: "@", code: "Digit2", altKey: true, ctrlKey: true });
    expect(screen.getByTestId("where").textContent).toBe("/superadmin?nueva=1");
    press({ key: "?" });
    expect(screen.getByText("Empresas")).toBeTruthy();
    expect(screen.queryByText(/Búsqueda general/)).toBeNull();
  });

  test("Ctrl+S en una lista sin ventana abierta no presiona nada", () => {
    setup("/clientes");
    press({ key: "s", code: "KeyS", ctrlKey: true });
    expect(toast.info).toHaveBeenCalledWith("No hay un formulario para guardar en esta pantalla.");
  });
});
