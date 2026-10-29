import * as XLSX from "xlsx";
import fixture from "./__fixtures__/ngrcReports.demo.json";
import { REPORT_TYPES, reportSpec, buildNgrcReportHtml, buildNgrcWorkbook, obligationsSpec, formatCell } from "./ngrcReports";

// Fixture: salida real de /api/ngrc/reports/* en DEMO (filas recortadas y
// nombres anonimizados).

describe("Reportes NGRC", () => {
  it("cada tipo de reporte arma su especificación con la salida del backend", () => {
    for (const type of Object.keys(REPORT_TYPES)) {
      const spec = reportSpec(type, fixture[type]);
      expect(spec).toBeTruthy();
      expect(spec.title).toBe(REPORT_TYPES[type].title);
      expect(spec.sections.length).toBeGreaterThan(0);
      for (const s of spec.sections) {
        expect(Array.isArray(s.rows)).toBe(true);
        for (const c of s.columns) expect(c.label).toBeTruthy();
      }
    }
  });

  it("clasificación: totales por categoría cuadran con el total del reporte", () => {
    const spec = reportSpec("CLASIFICACION", fixture.CLASIFICACION);
    const resumen = spec.sections[0];
    expect(resumen.totals.portfolio).toBeCloseTo(fixture.CLASIFICACION.totals.portfolio, 2);
    expect(resumen.totals.provision_required).toBeCloseTo(fixture.CLASIFICACION.totals.provision_required, 2);
    expect(spec.kpis.some((k) => k.label.startsWith("Provisión contabilizada"))).toBe(true);
    expect(spec.sections.find((s) => s.annex)).toBeTruthy();
  });

  it("valuaciones: secciones de garantías y de inmuebles adjudicados con acciones por bien", () => {
    const spec = reportSpec("VALUACIONES", fixture.VALUACIONES);
    expect(spec.sections.map((s) => s.assetType)).toEqual(["GARANTIA", "ADJUDICACION"]);
    expect(spec.sections[0].rows[0].status_label).toBeTruthy();
  });

  it("judicial: deja en blanco las columnas que completa el abogado", () => {
    const spec = reportSpec("JUDICIAL", fixture.JUDICIAL);
    const row = spec.sections[0].rows[0];
    expect(row.lawyer_status).toBe("");
    expect(row.recovery_probability).toBe("");
  });

  it("la impresión escapa el contenido y lleva la referencia de la norma", () => {
    const data = { ...fixture.JUDICIAL, rows: [{ ...fixture.JUDICIAL.rows[0], customer_name: '<img src=x onerror="alert(1)">' }] };
    const html = buildNgrcReportHtml({ company: { commercial_name: "IMF Demo" }, user: {}, spec: reportSpec("JUDICIAL", data) });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("CD-CONAMI-019-02MAY25-2023");
  });

  it("el Excel trae una hoja de resumen y una por sección, con números como números", () => {
    const spec = reportSpec("EXPOSICION", fixture.EXPOSICION);
    const wb = buildNgrcWorkbook(spec, { companyName: "IMF Demo" });
    expect(wb.SheetNames[0]).toBe("Resumen");
    expect(wb.SheetNames.length).toBe(spec.sections.length + 1);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[2]], { header: 1 });
    expect(rows[0][0]).toBe("Categoría");
    expect(typeof rows[1][4]).toBe("number");
  });

  it("calendario de obligaciones: una fila por obligación", () => {
    const spec = obligationsSpec(fixture.OBLIGACIONES);
    expect(spec.sections[0].rows.length).toBe(fixture.OBLIGACIONES.obligations.length);
    expect(spec.kpis[0].value).toBe(fixture.OBLIGACIONES.alerts.overdue);
  });

  it("formatea celdas", () => {
    expect(formatCell(1234.5, "money")).toMatch(/^C\$ 1[,.]?234[.,]50$/);
    expect(formatCell("2026-09-30", "date")).toBe("30/09/2026");
    expect(formatCell(null, "pct")).toBe("—");
  });
});
