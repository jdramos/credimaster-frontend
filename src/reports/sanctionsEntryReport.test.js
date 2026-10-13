import { buildSanctionsEntryReportHtml, listingReasonSection } from "./sanctionsEntryReport";

jest.mock("./reportHeader", () => ({ buildHeader: () => "<header></header>" }));
jest.mock("./reportStyles", () => ({ reportStyles: "" }));
jest.mock("./reportViewer", () => ({ openReport: jest.fn() }));

const OFAC = {
  source: "OFAC SDN",
  full_name: "Rosario Maria MURILLO DE ORTEGA",
  programs: "NICARAGUA",
  listed_on: "2018-11-27",
  active: 1,
  programs_info: [{ code: "NICARAGUA", name_es: "Sanciones relacionadas con Nicaragua", definition_en: "Executive Order 13851" }],
  listed_legal_basis: "Executive Order 13851 (Nicaragua)",
};
const ACTION = {
  found: true,
  url: "https://ofac.treasury.gov/recent-actions/20181127",
  title_en: "Nicaragua-related Designations",
  title_es: "Designaciones relacionadas con Nicaragua",
  press_releases: [
    {
      url: "https://home.treasury.gov/news/press-releases/sm554",
      title: "Treasury Targets Nicaraguan Vice President and Key Advisor over Violent Response to Protests",
      title_es: "El Tesoro sanciona a la vicepresidenta de Nicaragua y a un asesor clave por la respuesta violenta a las protestas",
    },
  ],
};

describe("Impresión de la consulta OFAC/ONU: motivo de la inclusión", () => {
  test("OFAC: programa en español, base legal y la acción del día de la designación traducida, con el texto oficial", () => {
    const html = buildSanctionsEntryReportHtml({ entry: OFAC, designationAction: ACTION });
    expect(html).toContain("Motivo de la inclusión");
    expect(html).toContain("NICARAGUA — Sanciones relacionadas con Nicaragua");
    expect(html).toContain("Fundamento: Executive Order 13851");
    expect(html).toContain("Base legal de la designación");
    expect(html).toContain("Acción de la OFAC el día de la designación (traducción automática)");
    expect(html).toContain("Designaciones relacionadas con Nicaragua");
    expect(html).toContain("El Tesoro sanciona a la vicepresidenta de Nicaragua");
    expect(html).toContain("Texto oficial: Treasury Targets Nicaraguan Vice President");
    expect(html).toContain("https://home.treasury.gov/news/press-releases/sm554");
  });

  test("OFAC sin la acción (no se pudo consultar): imprime el resto del motivo", () => {
    const html = listingReasonSection(OFAC, null);
    expect(html).toContain("Executive Order 13851 (Nicaragua)");
    expect(html).not.toContain("Acción de la OFAC");
  });

  test("ONU: Comité que decidió e información traducida con el texto oficial", () => {
    const html = listingReasonSection({
      source: "ONU Consolidada",
      programs_info: [{ code: "Yemen", name_es: "Régimen de sanciones relativo a: Yemen" }],
      listed_decided_by: "Incluida por decisión del Comité del Consejo de Seguridad establecido en virtud de la resolución 2140 (2014) (régimen de sanciones: Yemen).",
      remarks: "Leader of Yemen's Houthi Movement.",
      remarks_es: "Líder del movimiento hutí de Yemen.",
    });
    expect(html).toContain("Decisión de la inclusión");
    expect(html).toContain("resolución 2140 (2014)");
    expect(html).toContain("Información publicada por la ONU (traducción automática)");
    expect(html).toContain("Líder del movimiento hutí de Yemen.");
    expect(html).toContain("Texto oficial: Leader of Yemen&#39;s Houthi Movement.");
    expect(html).toContain("resumen oficial de los motivos");
  });

  test("OFAC retirada: sección del motivo de la exclusión traducido, con texto oficial y fuente", () => {
    const html = buildSanctionsEntryReportHtml({
      entry: {
        source: "OFAC SDN",
        full_name: "Theint Win HTET",
        active: 0,
        listed_on: "2024-01-31",
        delisted_on: "2026-10-09",
        delisted_detected: 0,
        delisted_programs: "BURMA-EO14014",
        delisted_programs_info: [{ code: "BURMA-EO14014", name_es: "Sanciones relacionadas con Birmania" }],
        delisted_legal_basis: "Executive Order 14014",
        delisted_reason: "Burma-related Designation Removal",
        delisted_reason_es: "Retiro de designación relacionada con Birmania",
        delisted_reference_url: "https://ofac.treasury.gov/recent-actions/20261009",
      },
    });
    expect(html).toContain("Motivo de la exclusión");
    expect(html).toContain("9 de octubre de 2026");
    expect(html).toContain("BURMA-EO14014 — Sanciones relacionadas con Birmania");
    expect(html).toContain("Base legal de la designación retirada");
    expect(html).toContain("Motivo de la exclusión (traducción automática)");
    expect(html).toContain("Retiro de designación relacionada con Birmania");
    expect(html).toContain("Texto oficial: Burma-related Designation Removal");
    expect(html).toContain("Acción publicada por la OFAC");
    expect(html).not.toContain("Detectada por CrediMaster");
  });

  test("ONU retirada: quién decidió el retiro y que la ONU no publica el motivo", () => {
    const html = buildSanctionsEntryReportHtml({
      entry: {
        source: "ONU Consolidada",
        full_name: "LOGARCHEO S.A.",
        active: 0,
        delisted_on: "2026-10-05",
        delisted_detected: 0,
        delisted_programs: "Iraq",
        delisted_decided_by: "Retirada por decisión del Comité del Consejo de Seguridad establecido en virtud de la resolución 1518 (2003) (régimen de sanciones: Iraq).",
        delisted_reference_url: "https://assets.publishing.service.gov.uk/x.pdf",
      },
    });
    expect(html).toContain("Retiro decidido por");
    expect(html).toContain("resolución 1518 (2003)");
    expect(html).toContain("La ONU no publica el motivo del retiro, solo la decisión del Comité.");
    expect(html).toContain("Aviso oficial que confirma la decisión de la ONU");
  });

  test("vigente: sin sección de exclusión; fecha detectada se aclara", () => {
    expect(buildSanctionsEntryReportHtml({ entry: { ...OFAC } })).not.toContain("Motivo de la exclusión");
    const html = buildSanctionsEntryReportHtml({ entry: { source: "ONU Consolidada", active: 0, delisted_on: "2026-10-07", delisted_detected: 1 } });
    expect(html).toContain("Detectada por CrediMaster");
  });

  test("escapa el texto que viene de fuentes externas", () => {
    const html = listingReasonSection({ source: "OFAC SDN", remarks: "<script>x</script>" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
