import { buildBoardReportHtml } from "./boardReport";
import data from "./__fixtures__/boardReport.demo.2026-09.json";

jest.mock("./reportHeader", () => ({ buildHeader: ({ title, subtitle }) => `<header>${title} | ${subtitle}</header>` }));
jest.mock("./reportStyles", () => ({ reportStyles: "" }));
jest.mock("./reportViewer", () => ({ openReport: jest.fn() }));

describe("Informe de gestión a la Junta Directiva (impresión)", () => {
  const build = (extra = {}) =>
    buildBoardReportHtml({
      company: { commercial_name: "Microfinanciera Demo" },
      data,
      signer: { name: "María López", title: "Gerente General" },
      reportDate: "2026-10-16",
      ...extra,
    });

  test("carta con encabezado de memorando, secciones, recomendaciones y firma", () => {
    const html = build();
    expect(html).toContain("INFORME DE GESTIÓN | Junta Directiva · septiembre de 2026");
    expect(html).toContain("Junta Directiva de Microfinanciera Demo");
    expect(html).toContain("María López, Gerente General");
    expect(html).toContain("16 de octubre de 2026");
    expect(html).toContain("Estimados miembros de la Junta Directiva:");
    for (const s of data.narrative.sections) expect(html).toContain(s.title);
    expect(html).toContain("Recomendaciones");
    expect((html.match(/<li>/g) || []).length).toBe(data.narrative.recommendations.length);
    expect(html).toContain("Atentamente,");
    expect(html).not.toMatch(/undefined|NaN/);
  });

  test("anexo de cifras: tabla principal, colocación por sucursal, resultados y presupuesto, indicadores", () => {
    const html = build();
    expect(html).toContain("Anexo: cifras del mes");
    expect(html).toContain("C$9,463,813");
    for (const b of data.placement.by_branch) expect(html).toContain(b.name);
    expect(html).toContain("Presupuesto acumulado");
    expect(html).toContain("Mediana del sector");
  });

  test("los comentarios de la gerencia se escapan y van en su propia sección", () => {
    const html = build({ comments: "Se aprobó el plan <b>2027</b>.\n\nSegundo párrafo." });
    expect(html).toContain("Comentarios adicionales de la Gerencia");
    expect(html).toContain("<p>Se aprobó el plan &lt;b&gt;2027&lt;/b&gt;.</p><p>Segundo párrafo.</p>");
    expect(build()).not.toContain("Comentarios adicionales");
  });
});
