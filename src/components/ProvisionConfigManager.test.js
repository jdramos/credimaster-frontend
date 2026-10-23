import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ProvisionConfigManager from "./ProvisionConfigManager";
import API from "../api";

jest.mock("../api", () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn() } }));
jest.mock("./help/HelpButton", () => () => null);

const NORM = { A: [15, 1], B: [30, 5], C: [60, 20], D: [90, 50], E: [99999, 100] };
const rows = (overrides = {}) =>
  Object.entries(NORM).map(([classification, [max_days, pct]]) => ({
    classification,
    description: `Categoría ${classification}`,
    min_days: 0,
    max_days,
    provision_percentage: overrides[classification] ?? pct,
    ngrc: { max_days, provision_percentage: pct },
  }));
const response = (regulated, groupRows = rows()) => ({ data: { regulated, groups: [{ id: 1, name: "Microcrédito", rows: groupRows }] } });

describe("Provisión de cartera según si la empresa está normada", () => {
  beforeEach(() => jest.resetAllMocks());

  test("normada: la tabla no se puede editar ni guardar", async () => {
    API.get.mockResolvedValue(response(true));
    const { container } = render(<ProvisionConfigManager />);
    await screen.findByText("Categoría A");
    expect(screen.getByText(/está normada por la CONAMI/)).toBeTruthy();
    const inputs = [...container.querySelectorAll("input[type=number]")];
    expect(inputs.length).toBeGreaterThan(0);
    inputs.forEach((i) => expect(i.disabled).toBe(true));
    expect(screen.queryByRole("button", { name: /Guardar/ })).toBeNull();
    expect(screen.queryByText(/Aplicar valores de la norma/)).toBeNull();
  });

  test("normada con valores distintos de la norma: ofrece aplicar los de la norma", async () => {
    API.get.mockResolvedValue(response(true, rows({ B: 3 })));
    API.put.mockResolvedValue({ data: { message: "ok" } });
    render(<ProvisionConfigManager />);
    fireEvent.click(await screen.findByRole("button", { name: "Aplicar valores de la norma" }));
    await screen.findByText("ok");
    const sent = API.put.mock.calls[0][1].rows.find((r) => r.classification === "B");
    expect(sent.provision_percentage).toBe(5);
  });

  test("no normada: se puede editar por debajo de la norma y guardar", async () => {
    API.get.mockResolvedValue(response(false));
    API.put.mockResolvedValue({ data: { message: "guardado" } });
    render(<ProvisionConfigManager />);
    expect(await screen.findByText(/no está normada por la CONAMI/)).toBeTruthy();
    const pctB = screen.getAllByRole("spinbutton").filter((i) => i.value === "5")[0];
    fireEvent.change(pctB, { target: { value: "3" } });
    const save = screen.getByRole("button", { name: /Guardar Microcrédito/ });
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    await screen.findByText("guardado");
    expect(API.put.mock.calls[0][1].rows.find((r) => r.classification === "B").provision_percentage).toBe(3);
  });
});
