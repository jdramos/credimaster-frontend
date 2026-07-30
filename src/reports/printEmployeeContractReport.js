import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { date, money } from "./reportUtils";

const CONTRACT_TYPE_LABELS = {
  INDEFINIDO: "Tiempo indefinido",
  PLAZO_FIJO: "Plazo fijo",
  OBRA_DETERMINADA: "Obra o servicio determinado",
};

// Plantilla de contrato individual de trabajo (Código del Trabajo de
// Nicaragua, Arts. 19-24) — cláusulas estándar armadas con los datos ya
// capturados del empleado. Es una plantilla de referencia, no un documento
// legal certificado por el sistema (mismo criterio que los reportes DGI/
// ICC: respaldo/plantilla para que el usuario/su asesoría legal lo revise
// antes de usarlo como documento firmado).
export const printEmployeeContractReport = ({ company = {}, user = {}, employee = {} }) => {
  const fmtMoney = (value) => money(value, "C$");
  const empresa = company.commercial_name || company.legal_name || "la empresa";
  const contractTypeLabel = CONTRACT_TYPE_LABELS[employee.contract_type] || "Tiempo indefinido";

  const clauseHtml = `
    <div class="report-fields" style="margin-bottom: 12px;">
      <div style="background:#FFF8E1;border:1px solid #F5D68A;border-radius:6px;padding:8px 12px;font-size:11px;color:#7A5B00;">
        Plantilla de referencia generada automáticamente con los datos capturados en el sistema.
        Debe revisarse con asesoría legal antes de usarse como contrato firmado.
      </div>
    </div>

    <p><strong>Entre</strong> ${company.legal_name || empresa}${company.tax_id ? `, RUC ${company.tax_id}` : ""},
    en adelante "EL EMPLEADOR", <strong>y</strong> ${employee.full_name || ""}${employee.id_card ? `, cédula ${employee.id_card}` : ""},
    en adelante "EL TRABAJADOR", se celebra el presente Contrato Individual de Trabajo, sujeto a las
    siguientes cláusulas:</p>

    <p><strong>PRIMERA — Objeto.</strong> EL TRABAJADOR se compromete a prestar sus servicios personales
    para EL EMPLEADOR en el cargo de <strong>${employee.position || "-"}</strong>${employee.branch_name ? `, en la sucursal ${employee.branch_name}` : ""}.</p>

    <p><strong>SEGUNDA — Duración.</strong> El presente contrato es de <strong>${contractTypeLabel}</strong>${
      employee.contract_type === "PLAZO_FIJO" && employee.contract_end_date
        ? `, con vigencia hasta el ${date(employee.contract_end_date)}`
        : ""
    }, iniciando el <strong>${date(employee.hire_date)}</strong>.</p>

    <p><strong>TERCERA — Salario.</strong> EL EMPLEADOR pagará a EL TRABAJADOR un salario mensual de
    <strong>${fmtMoney(employee.base_salary)}</strong>, pagadero conforme a la política de planilla vigente
    de la empresa${employee.bank_name ? `, mediante depósito a la cuenta ${employee.bank_account_number || ""} del banco ${employee.bank_name}` : ""}.</p>

    <p><strong>CUARTA — Jornada.</strong> EL TRABAJADOR cumplirá la jornada laboral ordinaria establecida
    por EL EMPLEADOR, conforme al Código del Trabajo de la República de Nicaragua.</p>

    <p><strong>QUINTA — Obligaciones generales.</strong> Ambas partes se sujetan a los derechos y
    obligaciones establecidos en el Código del Trabajo (Ley No. 185) y demás legislación laboral
    vigente en Nicaragua, incluyendo lo relativo a vacaciones, aguinaldo, seguridad social e
    indemnización por antigüedad.</p>

    <p>En fe de lo anterior, ambas partes firman el presente contrato.</p>

    <div class="signatures" style="margin-top: 48px;">
      <div class="signature">EL EMPLEADOR</div>
      <div class="signature">EL TRABAJADOR — ${employee.full_name || ""}</div>
    </div>
  `;

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
      { html: clauseHtml },
    ],
  });

  openReport(html);
};

export default printEmployeeContractReport;
