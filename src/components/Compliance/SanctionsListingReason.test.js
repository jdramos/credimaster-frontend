import React from "react";
import { render, screen } from "@testing-library/react";
import SanctionsListingReason from "./SanctionsListingReason";
import API from "../../api";

jest.mock("../../api", () => ({ get: jest.fn() }));

const OFAC_ENTRY = {
  id: 7,
  source: "OFAC SDN",
  listed_on: "2018-11-27",
  programs: "NICARAGUA",
  programs_info: [{ code: "NICARAGUA", name_es: "Sanciones relacionadas con Nicaragua", definition_en: "Executive Order 13851" }],
  listed_legal_basis: "Executive Order 13851 (Nicaragua)",
  remarks: "(Linked To: X)",
  remarks_es: "Vinculado a: X.",
};

const UN_ENTRY = {
  id: 9,
  source: "ONU Consolidada",
  listed_on: "2015-04-14",
  programs: "Yemen",
  programs_info: [{ code: "Yemen", name_es: "Régimen de sanciones relativo a: Yemen" }],
  listed_decided_by: "Incluida por decisión del Comité del Consejo de Seguridad establecido en virtud de la resolución 2140 (2014) (régimen de sanciones: Yemen).",
  remarks: "Leader of Yemen's Houthi Movement.",
  remarks_es: "Líder del movimiento hutí de Yemen.",
};

describe("SanctionsListingReason", () => {
  beforeEach(() => API.get.mockReset());

  test("OFAC: programa en español, base legal, información y la acción publicada el día de la designación", async () => {
    API.get.mockResolvedValue({
      data: {
        action: {
          found: true,
          url: "https://ofac.treasury.gov/recent-actions/20181127",
          title_en: "Nicaragua-related Designations",
          title_es: "Designaciones relacionadas con Nicaragua",
          press_releases: [
            { url: "https://home.treasury.gov/news/press-releases/sm553", title: "Treasury Sanctions Nicaraguan Officials", title_es: "El Tesoro sanciona a funcionarios nicaragüenses" },
          ],
        },
      },
    });
    render(<SanctionsListingReason entry={OFAC_ENTRY} />);
    expect(screen.getByText(/NICARAGUA — Sanciones relacionadas con Nicaragua/)).toBeTruthy();
    expect(screen.getByText("Executive Order 13851 (Nicaragua)")).toBeTruthy();
    expect(screen.getByText("Vinculado a: X.")).toBeTruthy();
    expect(screen.getByText(/Consultando la acción publicada por la OFAC/)).toBeTruthy();
    expect(await screen.findByText("Designaciones relacionadas con Nicaragua")).toBeTruthy();
    const link = screen.getByRole("link", { name: "El Tesoro sanciona a funcionarios nicaragüenses" });
    expect(link.getAttribute("href")).toBe("https://home.treasury.gov/news/press-releases/sm553");
    expect(screen.getByText(/Texto oficial: Treasury Sanctions Nicaraguan Officials/)).toBeTruthy();
    expect(API.get).toHaveBeenCalledWith("/api/aml/watchlists/browse/7/designation-action");
  });

  test("OFAC: si no hay página de acciones para esa fecha, lo dice", async () => {
    API.get.mockResolvedValue({ data: { action: { found: false } } });
    render(<SanctionsListingReason entry={OFAC_ENTRY} />);
    expect(await screen.findByText(/La OFAC no tiene una página de acciones para esa fecha/)).toBeTruthy();
  });

  test("ONU: Comité que decidió la inclusión e información traducida, sin consultar a la OFAC", () => {
    render(<SanctionsListingReason entry={UN_ENTRY} />);
    expect(screen.getByText(/resolución 2140 \(2014\)/)).toBeTruthy();
    expect(screen.getByText("Líder del movimiento hutí de Yemen.")).toBeTruthy();
    expect(screen.getByText(/Texto oficial: Leader of Yemen's Houthi Movement\./)).toBeTruthy();
    expect(screen.getByText(/Información publicada por la ONU \(traducción automática\)/)).toBeTruthy();
    expect(API.get).not.toHaveBeenCalled();
  });
});
