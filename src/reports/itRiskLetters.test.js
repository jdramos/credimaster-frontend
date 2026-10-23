import { buildAssessmentReportHtml, buildDetailNoticeHtml, buildInitialNoticeHtml, longDateTime, wordDocumentFromHtml } from "./itRiskLetters";

jest.mock("./reportHeader", () => ({ buildHeader: ({ title, subtitle }) => `<header>${title} | ${subtitle}</header>` }));
jest.mock("./reportStyles", () => ({ reportStyles: "" }));
jest.mock("./reportViewer", () => ({ openReport: jest.fn() }));

const catalog = {
  incident_types: {
    SECURITY_INCIDENT: { label: "Incidente de seguridad (confidencialidad, integridad o disponibilidad de datos de clientes)", short: "Incidente de seguridad", article: "Art. 28 num. 1", reportable: true },
  },
  causes: { ATAQUE: "Ataque, malware o acceso no autorizado" },
  incident_statuses: { RESUELTO: "Resuelto" },
};

const incident = {
  id: 4,
  incident_number: "RT-2026-00004",
  incident_type: "SECURITY_INCIDENT",
  title: "Acceso no autorizado",
  description: "Se detectó un acceso con credenciales robadas.\nSe bloqueó la cuenta.",
  occurred_at: "2026-10-20 22:15:00",
  detected_at: "2026-10-21 07:40:00",
  ended_at: "2026-10-21 09:10:00",
  affected_systems: "Portal de clientes",
  affected_customers_count: 35,
  affected_customers_detail: "Clientes de la sucursal Masaya",
  affects_confidentiality: 1,
  affects_integrity: 0,
  affects_availability: 0,
  economic_loss: "1200.00",
  lost_profit: "300.50",
  cause_category: "ATAQUE",
  cause: "Phishing a un usuario",
  corrective_actions: "Cambio de contraseñas y 2FA obligatorio.",
  responsible_name: "Jefe de TI",
  status: "RESUELTO",
  notices: [{ id: 1, notice_type: "INICIAL", sent_at: "2026-10-21 08:05:00", reference: "GG-045-2026", voided_at: null }],
};

const settings = {
  recipient_name: "",
  recipient_title: "Presidente Ejecutivo",
  recipient_entity: "Comisión Nacional de Microfinanzas (CONAMI)",
  signer_name: "Ana Pérez",
  signer_title: "Gerente General",
  city: "Managua",
};
const company = { legal_name: "Microfinanciera Demo, S.A.", tax_id: "J0310000000001" };

describe("Escritos del Art. 28 a CONAMI", () => {
  test("aviso inicial: dirigido al Presidente Ejecutivo, con los datos del evento y la promesa de detalle en 24 h", () => {
    const html = buildInitialNoticeHtml({ incident, settings, company, catalog, reference: "GG-045-2026", letterDate: "2026-10-21" });
    expect(html).toContain("Managua, 21 de octubre de 2026");
    expect(html).toContain("Ref.: GG-045-2026");
    expect(html).toContain("Presidente Ejecutivo");
    expect(html).toContain("Comisión Nacional de Microfinanzas (CONAMI)");
    expect(html).toContain("artículo 28");
    expect(html).toContain("CD-CONAMI-017-01AGO21-2014");
    expect(html).toContain("RT-2026-00004");
    expect(html).toContain("21 de octubre de 2026, 07:40 h");
    expect(html).toContain("confidencialidad de la información de clientes");
    expect(html).toContain("veinticuatro (24) horas");
    expect(html).toContain("Ana Pérez");
    expect(html).toContain("Microfinanciera Demo, S.A.");
    expect(html).not.toMatch(/undefined|NaN/);
  });

  test("detalle a 24 h: cita el aviso inicial y trae causa, impacto y acciones", () => {
    const html = buildDetailNoticeHtml({ incident, settings, company, catalog, letterDate: "2026-10-22" });
    expect(html).toContain("En seguimiento a nuestro aviso del 21 de octubre de 2026, 08:05 h (ref. GG-045-2026), y en cumplimiento");
    expect(html).toContain("Ataque, malware o acceso no autorizado.");
    expect(html).toContain("Phishing a un usuario");
    expect(html).toContain("duración 10 h 55 min");
    expect(html).toContain("C$ 1,500.50");
    expect(html).toContain("<p>Se bloqueó la cuenta.</p>");
    expect(html).toContain("Cambio de contraseñas y 2FA obligatorio.");
    ["1. Descripción", "2. Sistemas", "3. Causa", "4. Resultado", "5. Acciones", "6. Responsable"].forEach((s) => expect(html).toContain(s));
    expect(html).not.toMatch(/undefined|NaN/);
  });

  test("escapa el texto que escribe el usuario", () => {
    const html = buildInitialNoticeHtml({ incident: { ...incident, title: "<script>x</script>", description: "a < b" }, settings, company, catalog });
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("a &lt; b");
  });

  test("Word: agrega los espacios de nombres de Office", () => {
    expect(wordDocumentFromHtml("<html><body>x</body></html>")).toContain('xmlns:w="urn:schemas-microsoft-com:office:word"');
    expect(longDateTime("2026-01-05T09:03")).toBe("5 de enero de 2026, 09:03 h");
  });
});

describe("Informe de autoevaluación para la Junta Directiva", () => {
  const report = {
    assessment: { year: 2026, assessment_date: "2026-10-21", coordinator: "Unidad de Riesgos", status: "PRESENTADA", presented_to_board_at: "2026-10-30", board_minutes_ref: "Acta 12-2026", exposure_level: "MODERADO", conclusions: "Priorizar el plan de contingencia." },
    items: [
      { id: 1, item_code: "15.0", article: "Art. 15", requirement: "Plan de contingencias aprobado.", infraction_category: "GRAVE", status: "NO_CUMPLE", evidence: [] },
      { id: 2, item_code: "11.3", article: "Art. 11", requirement: "Control de software sin licencia.", infraction_category: "LEVE", status: "CUMPLE", evidence_notes: "Política TI-03", evidence: [{ file_name: "politica.pdf", voided_at: null }, { file_name: "vieja.pdf", voided_at: "x" }] },
    ],
    summary: {
      compliance_pct: 50, counts: { NO_CUMPLE: 1, PARCIAL: 0 },
      by_category: [{ key: "GRAVE", total: 1, CUMPLE: 0, PARCIAL: 0, NO_CUMPLE: 1, NO_APLICA: 0, PENDIENTE: 0, compliance_pct: 0 }, { key: "LEVE", total: 1, CUMPLE: 1, PARCIAL: 0, NO_CUMPLE: 0, NO_APLICA: 0, PENDIENTE: 0, compliance_pct: 100 }],
      by_article: [{ article: "Art. 15", total: 1, CUMPLE: 0, PARCIAL: 0, NO_CUMPLE: 1, NO_APLICA: 0, PENDIENTE: 0, compliance_pct: 0 }],
      gaps: [{ item_code: "15.0", requirement: "Plan de contingencias aprobado.", infraction_category: "GRAVE", infraction_ref: "Art. 21 num. 3.8", status: "NO_CUMPLE", improvement_plan: "Aprobar el plan", responsible: "Gerencia", due_date: "2026-12-15" }],
    },
    losses: { from: "2026-01-01", to: "2026-10-21", total: { count: 2, total_impact: 1500.5, economic_loss: 1200, lost_profit: 300.5, annual_frequency: 2.4 }, by_type: [{ label: "Incidente de seguridad", count: 2, economic_loss: 1200, lost_profit: 300.5, total_impact: 1500.5, max_impact: 1500.5 }] },
  };

  test("resumen, brechas priorizadas con plan, eventos de pérdida y anexo", () => {
    const html = buildAssessmentReportHtml({ company, report });
    expect(html).toContain("AUTOEVALUACIÓN DE RIESGO TECNOLÓGICO | Año 2026");
    expect(html).toContain("acta Acta 12-2026");
    expect(html).toContain("Moderado");
    expect(html).toContain("50%");
    expect(html).toContain("Art. 21 num. 3.8");
    expect(html).toContain("Aprobar el plan");
    expect(html).toContain("15/12/2026");
    expect(html).toContain("frecuencia anualizada 2.4");
    expect(html).toContain("Adjuntos: politica.pdf");
    expect(html).not.toContain("vieja.pdf");
    expect(html).toContain("Priorizar el plan de contingencia.");
    expect(html).not.toMatch(/undefined|NaN/);
  });
});
