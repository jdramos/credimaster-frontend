import React, { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Button, Dialog, DialogActions, DialogContent, TextField } from "@mui/material";
import UnsavedChangesGuard from "./UnsavedChangesGuard";
import useUnsavedChangesWarning from "../hooks/useUnsavedChangesWarning";
import API from "../api";

jest.mock("../api", () => {
  const axios = jest.requireActual("axios");
  return axios.create();
});

// Página con una ventana emergente de formulario, un buscador dentro de la
// ventana, un campo de página (filtro en listas / dato en formularios) y un
// "menú" para navegar.
function Page() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <main>
      <TextField label="Nombre de página" inputProps={{ "aria-label": "campo-pagina" }} />
      <Button onClick={() => setOpen(true)}>abrir</Button>
      <Button onClick={() => navigate("/otra")}>menu</Button>
      <span data-testid="open">{String(open)}</span>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogContent>
          <TextField label="Nombre" inputProps={{ "aria-label": "campo-dialogo" }} />
          <TextField label="Buscar cliente" inputProps={{ "aria-label": "buscador" }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={async () => {
              await API.post("/api/guardar", {});
              setOpen(false);
            }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </main>
  );
}

function ExplicitPage() {
  const [value, setValue] = useState("");
  const navigate = useNavigate();
  useUnsavedChangesWarning({ data: { value } });
  return (
    <main>
      <input aria-label="explicito" value={value} onChange={(e) => setValue(e.target.value)} />
      <button onClick={() => navigate("/otra")}>menu</button>
    </main>
  );
}

const setup = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <UnsavedChangesGuard />
      <Routes>
        <Route path="/lista" element={<Page />} />
        <Route path="/clientes/agregar" element={<Page />} />
        <Route path="/explicito/agregar" element={<ExplicitPage />} />
        <Route path="/otra" element={<p>otra pantalla</p>} />
      </Routes>
    </MemoryRouter>,
  );

const type = (label, text) => fireEvent.input(screen.getByLabelText(label), { target: { value: text } });

describe("UnsavedChangesGuard", () => {
  afterEach(() => jest.restoreAllMocks());

  test("ventana sin cambios: Cancelar cierra sin preguntar", async () => {
    const confirm = jest.spyOn(window, "confirm");
    setup("/lista");
    fireEvent.click(screen.getByText("abrir"));
    fireEvent.click(screen.getByText("Cancelar"));
    await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("false"));
    expect(confirm).not.toHaveBeenCalled();
  });

  test("ventana con cambios: Cancelar pregunta y se queda si el usuario dice que no", () => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
    setup("/lista");
    fireEvent.click(screen.getByText("abrir"));
    type("campo-dialogo", "Juan");
    fireEvent.click(screen.getByText("Cancelar"));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("open").textContent).toBe("true");
  });

  test("ventana con cambios: Escape también pregunta", () => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
    setup("/lista");
    fireEvent.click(screen.getByText("abrir"));
    type("campo-dialogo", "Juan");
    fireEvent.keyDown(screen.getByLabelText("campo-dialogo"), { key: "Escape" });
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("open").textContent).toBe("true");
  });

  test("ventana con cambios: si confirma, cierra", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    setup("/lista");
    fireEvent.click(screen.getByText("abrir"));
    type("campo-dialogo", "Juan");
    fireEvent.click(screen.getByText("Cancelar"));
    await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("false"));
  });

  test("escribir en un buscador dentro de la ventana no cuenta", async () => {
    const confirm = jest.spyOn(window, "confirm");
    setup("/lista");
    fireEvent.click(screen.getByText("abrir"));
    type("buscador", "Juan");
    fireEvent.click(screen.getByText("Cancelar"));
    await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("false"));
    expect(confirm).not.toHaveBeenCalled();
  });

  test("después de guardar con éxito no pregunta", async () => {
    const confirm = jest.spyOn(window, "confirm");
    API.defaults.adapter = async (config) => ({ data: {}, status: 200, statusText: "OK", headers: {}, config });
    setup("/lista");
    fireEvent.click(screen.getByText("abrir"));
    type("campo-dialogo", "Juan");
    fireEvent.click(screen.getByText("Guardar"));
    await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("false"));
    fireEvent.click(screen.getByText("menu"));
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByText("otra pantalla")).toBeTruthy();
  });

  test("en una lista, escribir en un campo de la página (filtro) no cuenta", () => {
    const confirm = jest.spyOn(window, "confirm");
    setup("/lista");
    type("campo-pagina", "abc");
    fireEvent.click(screen.getByText("menu"));
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByText("otra pantalla")).toBeTruthy();
  });

  test("en una página de captura (/agregar), salir con cambios pregunta", () => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
    setup("/clientes/agregar");
    type("campo-pagina", "abc");
    fireEvent.click(screen.getByText("menu"));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("otra pantalla")).toBeNull();
  });

  test("con el aviso propio de la pantalla activo, pregunta una sola vez", () => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
    setup("/explicito/agregar");
    const input = screen.getByLabelText("explicito");
    fireEvent.keyDown(input, { key: "a" });
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.click(screen.getByText("menu"));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(screen.getByText("otra pantalla")).toBeTruthy();
  });
});
