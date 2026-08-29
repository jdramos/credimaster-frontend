import { createReport } from "./createReport";
import { openBlankReportWindow, writeReportToWindow } from "./reportViewer";
import { interpolate } from "./reportUtils";
import { buildSalaryCertificateTemplateData } from "./hrDocumentTemplateData";
import API from "../api";

// Plantilla por defecto — se usa solo si la plantilla editable
// (hr_document_templates, tipo CARTA_SALARIAL) no se pudo cargar desde el
// backend. La plantilla real y editable es HTML generado por el editor
// de texto enriquecido de HrConfigPanel.jsx (nunca se escribe HTML a mano).
const DEFAULT_BODY_TEMPLATE = `
  <p style="text-align: justify; line-height: 1.8;">Quien suscribe, en representación de <strong>{{empresa}}</strong> (RUC {{ruc}}), hace constar que <strong>{{nombre}}</strong>, cédula {{cedula}}, {{verbo}} en esta empresa desde el {{fecha_ingreso}} {{periodo}}, desempeñando el cargo de <strong>{{puesto}}</strong>{{frase_salario}}.</p>

  <p style="text-align: justify; line-height: 1.8;">Se extiende la presente carta salarial a solicitud del interesado(a), en la ciudad de Managua, a los {{fecha_hoy}}.</p>
`.trim();

const fetchTemplate = async () => {
  try {
    const res = await API.get("/api/hr/document-templates");
    return res.data?.data?.find((t) => t.template_type === "CARTA_SALARIAL")?.body_html || DEFAULT_BODY_TEMPLATE;
  } catch {
    return DEFAULT_BODY_TEMPLATE;
  }
};

const SIGNATURES_HTML = `
  <div class="signatures" style="margin-top: 64px;">
    <div class="signature">Recursos Humanos</div>
  </div>
`;

// Carta salarial — certifica el salario mensual vigente del empleado, el
// documento que normalmente se pide para trámites de crédito bancario. La
// prosa vive en una plantilla editable (hr_document_templates) — ver
// printWorkCertificateReport.js para el mismo patrón. Si el empleado ya
// fue dado de baja, la carta habla en pasado ("laboró") y NO menciona el
// salario (ya no es un dato vigente que se pueda certificar).
export const printSalaryCertificateReport = async ({ company = {}, user = {}, employee = {} }) => {
  const reportWindow = openBlankReportWindow();

  const bodyTemplate = await fetchTemplate();
  const bodyHtml = interpolate(bodyTemplate, buildSalaryCertificateTemplateData({ company, employee }));

  const html = createReport({
    company,
    user,
    title: "Carta Salarial",
    orientation: "portrait",
    centerContent: true,

    sections: [{ html: bodyHtml }, { html: SIGNATURES_HTML }],
  });

  writeReportToWindow(reportWindow, html);
};

export default printSalaryCertificateReport;
