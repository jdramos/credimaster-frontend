import { createReport } from "./createReport";
import { openBlankReportWindow, writeReportToWindow } from "./reportViewer";
import { date, money, interpolate } from "./reportUtils";
import { buildContractTemplateData } from "./hrDocumentTemplateData";
import API from "../api";

const CONTRACT_TYPE_LABELS = {
  INDEFINIDO: "Tiempo indefinido",
  PLAZO_FIJO: "Plazo fijo",
  OBRA_DETERMINADA: "Obra o servicio determinado",
};

// Plantilla por defecto (Código del Trabajo de Nicaragua, Arts. 19-24) —
// se usa solo si la plantilla editable (hr_document_templates, tipo
// CONTRATO) no se pudo cargar desde el backend, para que imprimir nunca
// se rompa por un problema de red. La plantilla real y editable es HTML
// generado por el editor de texto enriquecido de HrConfigPanel.jsx
// (nunca se escribe HTML a mano).
const DEFAULT_BODY_TEMPLATE = `
  <p style="text-align: justify; line-height: 1.8;">Entre <strong>{{empresa}}</strong> (RUC {{ruc}}), en adelante "EL EMPLEADOR", y <strong>{{nombre}}</strong>, cédula {{cedula}}, en adelante "EL TRABAJADOR", se celebra el presente Contrato Individual de Trabajo, sujeto a las siguientes cláusulas:</p>

  <p style="text-align: justify; line-height: 1.8;"><strong>PRIMERA — Objeto.</strong> EL TRABAJADOR se compromete a prestar sus servicios personales para EL EMPLEADOR en el cargo de <strong>{{puesto}}</strong>.</p>

  <p style="text-align: justify; line-height: 1.8;"><strong>SEGUNDA — Duración.</strong> El presente contrato es de <strong>{{tipo_contrato}}</strong>, iniciando el {{fecha_ingreso}}. Fecha de finalización (si aplica): {{fecha_fin_contrato}}.</p>

  <p style="text-align: justify; line-height: 1.8;"><strong>TERCERA — Salario.</strong> EL EMPLEADOR pagará a EL TRABAJADOR un salario mensual de <strong>{{salario}}</strong>, pagadero conforme a la política de planilla vigente de la empresa.</p>

  <p style="text-align: justify; line-height: 1.8;"><strong>CUARTA — Jornada.</strong> EL TRABAJADOR cumplirá la jornada laboral ordinaria establecida por EL EMPLEADOR, conforme al Código del Trabajo de la República de Nicaragua.</p>

  <p style="text-align: justify; line-height: 1.8;"><strong>QUINTA — Obligaciones generales.</strong> Ambas partes se sujetan a los derechos y obligaciones establecidos en el Código del Trabajo (Ley No. 185) y demás legislación laboral vigente en Nicaragua, incluyendo lo relativo a vacaciones, aguinaldo, seguridad social e indemnización por antigüedad.</p>

  <p style="text-align: justify; line-height: 1.8;">En fe de lo anterior, ambas partes firman el presente contrato.</p>
`.trim();

const fetchTemplate = async () => {
  try {
    const res = await API.get("/api/hr/document-templates");
    return res.data?.data?.find((t) => t.template_type === "CONTRATO")?.body_html || DEFAULT_BODY_TEMPLATE;
  } catch {
    return DEFAULT_BODY_TEMPLATE;
  }
};

// El aviso legal y el bloque de firmas son fijos y no forman parte del
// texto editable — así el editor de plantillas solo muestra la prosa que
// un administrador de RRHH realmente necesita tocar.
const DISCLAIMER_HTML = `
  <div class="report-fields" style="margin-bottom: 12px;">
    <div style="background:#FFF8E1;border:1px solid #F5D68A;border-radius:6px;padding:8px 12px;font-size:11px;color:#7A5B00;">
      Plantilla de referencia generada automáticamente con los datos capturados en el sistema.
      Debe revisarse con asesoría legal antes de usarse como contrato firmado.
    </div>
  </div>
`;

const signaturesHtml = (employeeName) => `
  <div class="signatures" style="margin-top: 48px;">
    <div class="signature">EL EMPLEADOR</div>
    <div class="signature">EL TRABAJADOR — ${employeeName || ""}</div>
  </div>
`;

// Contrato individual de trabajo — la prosa/cláusulas viven en una
// plantilla editable en texto plano (hr_document_templates) para que el
// tenant pueda agregar o quitar texto sin depender de un desarrollador.
export const printEmployeeContractReport = async ({ company = {}, user = {}, employee = {} }) => {
  const reportWindow = openBlankReportWindow();
  const fmtMoney = (value) => money(value, "C$");
  const contractTypeLabel = CONTRACT_TYPE_LABELS[employee.contract_type] || "Tiempo indefinido";

  const bodyTemplate = await fetchTemplate();
  const bodyHtml = interpolate(bodyTemplate, buildContractTemplateData({ company, employee }));

  const html = createReport({
    company,
    user,
    title: "Contrato Individual de Trabajo",
    subtitle: employee.full_name,
    orientation: "portrait",

    sections: [
      {
        title: "Datos del trabajador",
        fields: {
          columns: 3,
          compact: true,
          items: [
            { label: "Nombre", value: employee.full_name, span: 2 },
            { label: "Cédula", value: employee.id_card || "-" },
            { label: "Cargo", value: employee.position || "-" },
            { label: "Fecha de ingreso", value: date(employee.hire_date) },
            { label: "Tipo de contrato", value: contractTypeLabel },
            { label: "INSS", value: employee.inss_number || "-" },
            { label: "Salario mensual", value: fmtMoney(employee.base_salary) },
          ],
        },
      },
      { html: DISCLAIMER_HTML },
      { html: bodyHtml },
      { html: signaturesHtml(employee.full_name) },
    ],
  });

  writeReportToWindow(reportWindow, html);
};

export default printEmployeeContractReport;
