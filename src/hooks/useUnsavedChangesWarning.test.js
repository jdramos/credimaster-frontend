import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import useUnsavedChangesWarning from "./useUnsavedChangesWarning";

// Formulario mínimo en "diálogo" para ejercitar el hook: un campo, botón
// de cerrar (confirmDiscard), guardar (allowNavigation + navigate) y un
// enlace de "menú" (navigate sin permiso).
function Form({ initial = "" }) {
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const { isDirty, allowNavigation, confirmDiscard } = useUnsavedChangesWarning({
    data: { value },
    disabled: !open,
  });
  return (
    <div>
      <span data-testid="dirty">{String(isDirty)}</span>
      <span data-testid="open">{String(open)}</span>
      <input aria-label="campo" value={value} onChange={(e) => setValue(e.target.value)} />
      <button onClick={() => confirmDiscard() && setOpen(false)}>cerrar</button>
      <button onClick={() => setOpen(true)}>abrir</button>
      <button onClick={() => setValue("cargado")}>cargar</button>
      <button onClick={() => navigate("/otra")}>menu</button>
      <button
        onClick={() => {
          allowNavigation();
          navigate("/otra");
        }}
      >
        guardar
      </button>
    </div>
  );
}

const setup = () =>
  render(
    <MemoryRouter initialEntries={["/form"]}>
      <Routes>
        <Route path="/form" element={<Form />} />
        <Route path="/otra" element={<p>otra pantalla</p>} />
      </Routes>
    </MemoryRouter>,
  );

// Interacción de usuario: tecla + cambio de valor.
const type = (el, text) => {
  fireEvent.keyDown(el, { key: "a" });
  fireEvent.change(el, { target: { value: text } });
};

describe("useUnsavedChangesWarning", () => {
  afterEach(() => jest.restoreAllMocks());

  test("sin cambios no pregunta al navegar", () => {
    const confirm = jest.spyOn(window, "confirm");
    setup();
    fireEvent.click(screen.getByText("menu"));
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByText("otra pantalla")).toBeTruthy();
  });

  test("con cambios pregunta al navegar y se queda si cancela", () => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
    setup();
    type(screen.getByLabelText("campo"), "abc");
    expect(screen.getByTestId("dirty").textContent).toBe("true");
    fireEvent.click(screen.getByText("menu"));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("otra pantalla")).toBeNull();
  });

  test("con cambios navega si el usuario confirma", () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    setup();
    type(screen.getByLabelText("campo"), "abc");
    fireEvent.click(screen.getByText("menu"));
    expect(screen.getByText("otra pantalla")).toBeTruthy();
  });

  test("después de guardar (allowNavigation) no pregunta", () => {
    const confirm = jest.spyOn(window, "confirm");
    setup();
    type(screen.getByLabelText("campo"), "abc");
    fireEvent.click(screen.getByText("guardar"));
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByText("otra pantalla")).toBeTruthy();
  });

  test("volver al valor original ya no cuenta como cambio", () => {
    setup();
    const input = screen.getByLabelText("campo");
    type(input, "abc");
    type(input, "");
    expect(screen.getByTestId("dirty").textContent).toBe("false");
  });

  test("cerrar diálogo con cambios pregunta; al reabrir arranca limpio", () => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    setup();
    type(screen.getByLabelText("campo"), "abc");
    fireEvent.click(screen.getByText("cerrar"));
    expect(screen.getByTestId("open").textContent).toBe("true");
    fireEvent.click(screen.getByText("cerrar"));
    expect(screen.getByTestId("open").textContent).toBe("false");
    expect(confirm).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByText("abrir"));
    expect(screen.getByTestId("dirty").textContent).toBe("false");
  });

  test("cambios programáticos (sin interacción) no cuentan", () => {
    setup();
    fireEvent.click(screen.getByText("cargar"));
    expect(screen.getByTestId("dirty").textContent).toBe("false");
  });
});
