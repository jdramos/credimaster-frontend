import React from "react";
import { render, screen } from "@testing-library/react";
import API from "../api";
import { useAuth } from "../contexts/AuthContext";
import InstitutionalLegalDataManager from "./InstitutionalLegalDataManager";

jest.mock("../api", () => ({ get: jest.fn(), put: jest.fn() }));
jest.mock("../contexts/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("./help/HelpButton", () => () => null);

beforeEach(() => {
  API.get.mockResolvedValue({ data: { representative_name: "Ana", conami_resolution_number: "CD-CONAMI-1" } });
});

describe("Datos legales según la regulación de la empresa", () => {
  it("empresa normada: muestra la resolución CONAMI", async () => {
    useAuth.mockReturnValue({ tenant: { conami_regulated: true } });
    render(<InstitutionalLegalDataManager />);
    expect(await screen.findByLabelText("Número de resolución")).toBeTruthy();
    expect(screen.getByLabelText("Gaceta Diario Oficial")).toBeTruthy();
  });

  it("empresa no normada: oculta la resolución CONAMI y deja el resto", async () => {
    useAuth.mockReturnValue({ tenant: { conami_regulated: false } });
    render(<InstitutionalLegalDataManager />);
    expect(await screen.findByLabelText("Nombre completo")).toBeTruthy();
    expect(screen.queryByLabelText("Número de resolución")).toBeNull();
    expect(screen.queryByLabelText("Gaceta Diario Oficial")).toBeNull();
  });
});
