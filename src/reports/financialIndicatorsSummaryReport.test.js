import { buildFinancialIndicatorsSummaryHtml } from "./financialIndicatorsSummaryReport";
import fixture from "../components/accounting/__fixtures__/financialIndicators.tn01.json";
import compareFixture from "../components/accounting/__fixtures__/financialIndicators.tn01.compare.json";

jest.mock("./reportHeader", () => ({ buildHeader: ({ title, subtitle }) => `<header>${title} | ${subtitle}</header>` }));
jest.mock("./reportStyles", () => ({ reportStyles: "" }));
jest.mock("./reportViewer", () => ({ openReport: jest.fn() }));

describe("Impresión del resumen ejecutivo de indicadores financieros", () => {
  test("incluye encabezado, conteo por nivel, párrafos, fortalezas/alertas y los 28 indicadores por grupo", () => {
    const data = fixture.data;
    const html = buildFinancialIndicatorsSummaryHtml({ data });
    expect(html).toContain("INDICADORES FINANCIEROS — RESUMEN EJECUTIVO | Período: agosto 2026");
    expect(html).toContain("reporte de Indicadores Financieros de la CONAMI de agosto 2026 (80 instituciones)");
    for (const p of data.summary.paragraphs) {
      expect(html).toContain(p.pillar);
    }
    expect(html).toContain("Fortalezas");
    expect(html).toContain("Alertas");
    for (const g of data.groups) expect(html).toContain(g.label);
    for (const i of data.indicators) expect(html).toContain(i.label);
    expect((html.match(/<tr>\s*<td>/g) || []).length).toBe(28);
    // Conteo por nivel coherente con los datos.
    const fuertes = data.indicators.filter((i) => i.level === "FUERTE").length;
    expect(html).toContain(`${fuertes} indicador${fuertes === 1 ? "" : "es"}`);
    // Sin IMF elegida no hay columna de comparación.
    expect(html).not.toContain("Comparación adicional");
  });

  test("con una IMF elegida agrega su columna y la menciona", () => {
    const html = buildFinancialIndicatorsSummaryHtml({ data: compareFixture.data });
    expect(html).toContain("Comparación adicional con: <strong>AFODENIC</strong>");
    expect(html).toContain("<th>AFODENIC</th>");
    expect(html).toContain("13.03%");
  });

  test("muestra las advertencias contables y escapa el texto", () => {
    const data = {
      ...fixture.data,
      summary: { ...fixture.data.summary, data_warnings: ["Fondos <negativos>"] },
    };
    const html = buildFinancialIndicatorsSummaryHtml({ data });
    expect(html).toContain("Revise la contabilidad antes de interpretar los indicadores");
    expect(html).toContain("Fondos &lt;negativos&gt;");
  });
});
